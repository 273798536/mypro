from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json

from models import (
    MaterialLedger, StatusHistory, ChangeHistory, AsyncTask, UserRole,
    MaterialStatus, SyncStrategy, TaskStatus, Role
)
from schemas import (
    MaterialLedgerCreate, MaterialLedgerUpdate, StatusTransition,
    SyncBatchRequest, SyncResult, AsyncTaskCreate
)
from config import get_settings

settings = get_settings()


class MaterialLedgerService:
    @staticmethod
    async def create_ledger(db: AsyncSession, ledger_data: MaterialLedgerCreate) -> MaterialLedger:
        db_ledger = MaterialLedger(**ledger_data.model_dump())
        db.add(db_ledger)
        await db.flush()

        status_history = StatusHistory(
            ledger_id=db_ledger.id,
            from_status=None,
            to_status=MaterialStatus.DRAFT.value,
            operator=ledger_data.operator,
            reason="创建草稿",
            role=Role.OPERATOR.value
        )
        db.add(status_history)
        await db.commit()
        await db.refresh(db_ledger)
        return db_ledger

    @staticmethod
    async def get_ledger(db: AsyncSession, ledger_id: int) -> Optional[MaterialLedger]:
        result = await db.execute(
            select(MaterialLedger)
            .options(selectinload(MaterialLedger.status_histories), selectinload(MaterialLedger.change_histories))
            .where(MaterialLedger.id == ledger_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_ledgers_by_batch(db: AsyncSession, batch_no: str) -> List[MaterialLedger]:
        result = await db.execute(
            select(MaterialLedger).where(MaterialLedger.batch_no == batch_no)
        )
        return result.scalars().all()

    @staticmethod
    def check_site_permission(ledger: MaterialLedger, user_role: str, user_site: Optional[str]) -> bool:
        if user_role == Role.ADMIN.value or user_role == Role.AUDITOR.value:
            return True
        if user_role == Role.SITE_MANAGER.value and user_site:
            return ledger.site_name == user_site
        return True

    @staticmethod
    def check_editable(ledger: MaterialLedger) -> bool:
        return ledger.status not in [
            MaterialStatus.AUDIT.value,
            MaterialStatus.EXPORTED.value
        ]

    @staticmethod
    async def update_ledger(
        db: AsyncSession,
        ledger_id: int,
        update_data: MaterialLedgerUpdate,
        user_role: Optional[str] = None,
        user_site: Optional[str] = None
    ) -> Optional[MaterialLedger]:
        ledger = await MaterialLedgerService.get_ledger(db, ledger_id)
        if not ledger:
            return None

        if not MaterialLedgerService.check_editable(ledger):
            raise PermissionError(f"台账处于{ledger.status}状态，不可修改")

        if user_role and not MaterialLedgerService.check_site_permission(ledger, user_role, user_site):
            raise PermissionError("无权修改其他站点数据")

        update_dict = update_data.model_dump(exclude_unset=True, exclude={"change_reason"})
        change_reason = update_data.change_reason

        for field, new_value in update_dict.items():
            old_value = getattr(ledger, field)
            if old_value != new_value:
                change_history = ChangeHistory(
                    ledger_id=ledger.id,
                    field_name=field,
                    old_value=str(old_value) if old_value is not None else None,
                    new_value=str(new_value) if new_value is not None else None,
                    operator=update_data.operator,
                    change_reason=change_reason
                )
                db.add(change_history)
                setattr(ledger, field, new_value)

        ledger.operator = update_data.operator
        await db.commit()
        await db.refresh(ledger)
        return ledger

    @staticmethod
    async def transition_status(
        db: AsyncSession,
        transition: StatusTransition,
        user_role: Optional[str] = None,
        user_site: Optional[str] = None
    ) -> Optional[MaterialLedger]:
        ledger = await MaterialLedgerService.get_ledger(db, transition.ledger_id)
        if not ledger:
            return None

        if user_role and not MaterialLedgerService.check_site_permission(ledger, user_role, user_site):
            raise PermissionError("无权修改其他站点数据")

        status_history = StatusHistory(
            ledger_id=ledger.id,
            from_status=ledger.status,
            to_status=transition.to_status.value,
            operator=transition.operator,
            reason=transition.reason,
            role=transition.role.value
        )
        db.add(status_history)
        ledger.status = transition.to_status.value
        ledger.operator = transition.operator
        await db.commit()
        await db.refresh(ledger)
        return ledger

    @staticmethod
    async def sync_batch(
        db: AsyncSession,
        request: SyncBatchRequest
    ) -> SyncResult:
        result = SyncResult(batch_no=request.batch_no, strategy=request.sync_strategy.value)
        existing_ledgers = await MaterialLedgerService.get_ledgers_by_batch(db, request.batch_no)
        existing_map = {l.material_code: l for l in existing_ledgers} if request.sync_strategy != SyncStrategy.APPEND else {}

        for material_data in request.materials:
            material_data.batch_no = request.batch_no
            try:
                if request.sync_strategy == SyncStrategy.IGNORE:
                    if material_data.material_code in existing_map:
                        result.ignored += 1
                        continue
                    await MaterialLedgerService.create_ledger(db, material_data)
                    result.created += 1
                elif request.sync_strategy == SyncStrategy.OVERWRITE:
                    if material_data.material_code in existing_map:
                        existing = existing_map[material_data.material_code]
                        update_data = MaterialLedgerUpdate(
                            **material_data.model_dump(exclude_unset=True),
                            change_reason=f"批次同步覆盖 - {request.batch_no}",
                            operator=request.operator
                        )
                        await MaterialLedgerService.update_ledger(
                            db, existing.id, update_data,
                            user_role=request.operator_role.value if hasattr(request, 'operator_role') else None,
                            user_site=request.operator_site if hasattr(request, 'operator_site') else None
                        )
                        result.updated += 1
                    else:
                        await MaterialLedgerService.create_ledger(db, material_data)
                        result.created += 1
                else:
                    await MaterialLedgerService.create_ledger(db, material_data)
                    result.created += 1
            except Exception as e:
                result.errors.append({
                    "material_code": material_data.material_code,
                    "error": str(e)
                })

        await db.commit()
        return result

    @staticmethod
    async def desensitize_ledger(ledger: MaterialLedger) -> Dict[str, Any]:
        data = {c.name: getattr(ledger, c.name) for c in ledger.__table__.columns}
        if ledger.sensitive_fields:
            for field, is_sensitive in ledger.sensitive_fields.items():
                if is_sensitive and field in data:
                    data[field] = "***" if isinstance(data[field], str) else None
        return data

    @staticmethod
    async def mark_ledgers_as_exported(
        db: AsyncSession,
        ledger_ids: List[int],
        operator: str
    ) -> int:
        from sqlalchemy import select, update

        result = await db.execute(
            select(MaterialLedger).where(MaterialLedger.id.in_(ledger_ids))
        )
        ledgers = result.scalars().all()

        count = 0
        for ledger in ledgers:
            if ledger.status != MaterialStatus.EXPORTED.value:
                status_history = StatusHistory(
                    ledger_id=ledger.id,
                    from_status=ledger.status,
                    to_status=MaterialStatus.EXPORTED.value,
                    operator=operator,
                    reason="数据导出完成",
                    role=Role.AUDITOR.value
                )
                db.add(status_history)
                ledger.status = MaterialStatus.EXPORTED.value
                ledger.operator = operator
                count += 1

        await db.commit()
        return count

    @staticmethod
    async def get_role_view(
        db: AsyncSession,
        role: Role,
        site_name: Optional[str] = None
    ) -> Dict[str, Any]:
        query = select(MaterialLedger)
        if site_name:
            query = query.where(MaterialLedger.site_name == site_name)

        result = await db.execute(query)
        ledgers = result.scalars().all()

        status_summary = {}
        source_summary = {}
        for ledger in ledgers:
            status_summary[ledger.status] = status_summary.get(ledger.status, 0) + 1
            source_summary[ledger.source] = source_summary.get(ledger.source, 0) + 1

        recent_changes_result = await db.execute(
            select(ChangeHistory)
            .order_by(ChangeHistory.operate_time.desc())
            .limit(10)
        )
        recent_changes = recent_changes_result.scalars().all()

        negative_inventory_count = sum(1 for l in ledgers if l.is_negative_inventory)

        return {
            "role": role.value,
            "site_name": site_name,
            "total_count": len(ledgers),
            "status_summary": status_summary,
            "source_summary": source_summary,
            "negative_inventory_count": negative_inventory_count,
            "recent_changes": [
                {
                    "field_name": c.field_name,
                    "operator": c.operator,
                    "operate_time": c.operate_time,
                    "change_reason": c.change_reason
                }
                for c in recent_changes
            ]
        }


class AsyncTaskService:
    @staticmethod
    async def create_task(db: AsyncSession, task_data: AsyncTaskCreate) -> AsyncTask:
        task = AsyncTask(**task_data.model_dump())
        db.add(task)
        await db.commit()
        await db.refresh(task)
        return task

    @staticmethod
    async def get_task(db: AsyncSession, task_id: int) -> Optional[AsyncTask]:
        result = await db.execute(select(AsyncTask).where(AsyncTask.id == task_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_tasks_by_status(db: AsyncSession, status: TaskStatus) -> List[AsyncTask]:
        result = await db.execute(select(AsyncTask).where(AsyncTask.status == status.value))
        return result.scalars().all()

    @staticmethod
    async def get_failed_tasks(db: AsyncSession) -> Dict[str, List[AsyncTask]]:
        result = await db.execute(
            select(AsyncTask)
            .where(AsyncTask.status.in_([
                TaskStatus.WAIT_RETRY.value,
                TaskStatus.WAIT_MANUAL.value,
                TaskStatus.PERMANENT_FAILED.value
            ]))
            .order_by(AsyncTask.created_at.desc())
        )
        tasks = result.scalars().all()
        return {
            "wait_retry": [t for t in tasks if t.status == TaskStatus.WAIT_RETRY.value],
            "wait_manual": [t for t in tasks if t.status == TaskStatus.WAIT_MANUAL.value],
            "permanent_failed": [t for t in tasks if t.status == TaskStatus.PERMANENT_FAILED.value]
        }

    @staticmethod
    async def process_task(db: AsyncSession, task_id: int) -> AsyncTask:
        task = await AsyncTaskService.get_task(db, task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found")

        task.status = TaskStatus.PROCESSING.value
        task.started_at = datetime.now()
        await db.commit()

        try:
            if task.task_type == "sync_batch" and task.payload:
                sync_request = SyncBatchRequest(**task.payload)
                sync_result = await MaterialLedgerService.sync_batch(db, sync_request)
                task.result = sync_result.model_dump()

            task.status = TaskStatus.COMPLETED.value
            task.completed_at = datetime.now()

        except Exception as e:
            task.retry_count += 1
            task.error_message = str(e)

            if task.retry_count >= task.max_retries:
                task.status = TaskStatus.PERMANENT_FAILED.value
            else:
                task.status = TaskStatus.WAIT_RETRY.value
                task.next_retry_at = datetime.now() + timedelta(seconds=settings.ASYNC_TASK_RETRY_INTERVAL)

        await db.commit()
        await db.refresh(task)
        return task

    @staticmethod
    async def retry_task(db: AsyncSession, task_id: int, force: bool = False) -> Optional[AsyncTask]:
        task = await AsyncTaskService.get_task(db, task_id)
        if not task:
            return None

        if task.status not in [TaskStatus.WAIT_RETRY.value, TaskStatus.PERMANENT_FAILED.value]:
            return None

        if task.status == TaskStatus.PERMANENT_FAILED.value and not force:
            return None

        task.status = TaskStatus.PENDING.value
        task.error_message = None
        if force:
            task.retry_count = 0
        await db.commit()
        return task

    @staticmethod
    async def mark_manual(db: AsyncSession, task_id: int) -> Optional[AsyncTask]:
        task = await AsyncTaskService.get_task(db, task_id)
        if not task:
            return None
        task.status = TaskStatus.WAIT_MANUAL.value
        await db.commit()
        return task

    @staticmethod
    async def get_pending_retry_tasks(db: AsyncSession) -> List[AsyncTask]:
        now = datetime.now()
        result = await db.execute(
            select(AsyncTask)
            .where(and_(
                AsyncTask.status == TaskStatus.WAIT_RETRY.value,
                AsyncTask.next_retry_at <= now
            ))
        )
        return result.scalars().all()


class UserRoleService:
    @staticmethod
    async def create_user_role(db: AsyncSession, username: str, role: Role, site_name: Optional[str] = None) -> UserRole:
        permissions = {
            Role.SITE_MANAGER: ["view_site_data", "view_changes", "view_sensitive"],
            Role.AUDITOR: ["view_all", "export", "view_history"],
            Role.OPERATOR: ["create_draft", "submit", "edit_own"],
            Role.ADMIN: ["all"]
        }
        user_role = UserRole(
            username=username,
            role=role.value,
            site_name=site_name,
            permissions=permissions.get(role, [])
        )
        db.add(user_role)
        await db.commit()
        await db.refresh(user_role)
        return user_role

    @staticmethod
    async def get_user_role(db: AsyncSession, username: str) -> Optional[UserRole]:
        result = await db.execute(select(UserRole).where(UserRole.username == username))
        return result.scalar_one_or_none()
