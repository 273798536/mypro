import uuid
import json
import difflib
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from .models import (
    QualityBatch,
    BatchSource,
    BatchHistory,
    BatchAttachment,
    InspectionSheet,
    ReworkOrder,
    MachineShift,
    PriceAdjustment,
    AsyncTask,
    BatchStatus,
    SourceType,
    TaskStatus,
    DuplicateStrategy,
)
from .schemas import (
    QualityBatchCreate,
    QualityBatchUpdate,
    ReviewRequest,
    FreezeRequest,
    UnfreezeRequest,
    ArchiveRequest,
    DiffResponse,
    HistoryDiffResponse,
)
from .config import settings


def generate_batch_id() -> str:
    return f"BATCH-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"


def generate_task_id() -> str:
    return f"TASK-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"


def get_batch_state(batch: QualityBatch) -> Dict[str, Any]:
    return {
        "batch_id": batch.batch_id,
        "batch_no": batch.batch_no,
        "status": batch.status.value if batch.status else None,
        "product_code": batch.product_code,
        "product_name": batch.product_name,
        "total_defect_count": batch.total_defect_count,
        "rework_count": batch.rework_count,
        "final_pass_rate": batch.final_pass_rate,
        "responsible_shift": batch.responsible_shift,
        "responsible_machine": batch.responsible_machine,
        "initial_pass_rate": batch.initial_pass_rate,
        "best_pass_rate": batch.best_pass_rate,
        "worst_pass_rate": batch.worst_pass_rate,
        "review_opinion": batch.review_opinion,
        "reviewer": batch.reviewer,
        "freeze_reason": batch.freeze_reason,
        "frozen_by": batch.frozen_by,
        "remark": batch.remark,
    }


def calculate_diff(
    old_state: Dict[str, Any], new_state: Dict[str, Any]
) -> Dict[str, Any]:
    changes = {}
    for key in set(old_state.keys()) | set(new_state.keys()):
        old_val = old_state.get(key)
        new_val = new_state.get(key)
        if old_val != new_val:
            changes[key] = {"old": old_val, "new": new_val}
    return changes


class BatchService:
    def __init__(self, db: Session):
        self.db = db

    def _record_history(
        self,
        batch: QualityBatch,
        action: str,
        previous_state: Dict[str, Any],
        operator: Optional[str] = None,
        remark: Optional[str] = None,
    ):
        new_state = get_batch_state(batch)
        changes = calculate_diff(previous_state, new_state)

        history = BatchHistory(
            batch_id=batch.id,
            action=action,
            previous_state=previous_state,
            new_state=new_state,
            changes=changes,
            operator=operator,
            remark=remark,
        )
        self.db.add(history)

    def _calculate_batch_metrics(self, batch: QualityBatch):
        rework_count = 0
        pass_rates = []
        shifts = set()
        machines = set()
        total_defect = 0

        for source in batch.sources:
            if source.source_type == SourceType.INSPECTION and source.inspection:
                insp = source.inspection
                total_defect += insp.defective_quantity
                pass_rates.append(insp.pass_rate)
                if insp.shift_id:
                    shifts.add(insp.shift_id)
                if insp.machine_id:
                    machines.add(insp.machine_id)
            elif source.source_type == SourceType.REWORK and source.rework:
                rework = source.rework
                rework_count += 1
                pass_rates.append(rework.rework_pass_rate)
                if rework.shift_id:
                    shifts.add(rework.shift_id)
                if rework.machine_id:
                    machines.add(rework.machine_id)
            elif source.source_type == SourceType.MACHINE_SHIFT and source.machine_shift:
                shift = source.machine_shift
                pass_rates.append(shift.shift_pass_rate)
                if shift.shift_code:
                    shifts.add(shift.shift_code)
                if shift.machine_id:
                    machines.add(shift.machine_id)

        batch.rework_count = rework_count
        batch.total_defect_count = total_defect

        if pass_rates:
            batch.initial_pass_rate = pass_rates[0]
            batch.best_pass_rate = max(pass_rates)
            batch.worst_pass_rate = min(pass_rates)
            batch.final_pass_rate = pass_rates[-1]

        if shifts:
            batch.responsible_shift = ", ".join(sorted(shifts))
        if machines:
            batch.responsible_machine = ", ".join(sorted(machines))

    def get_batch(self, batch_id: str) -> Optional[QualityBatch]:
        return self.db.query(QualityBatch).filter(QualityBatch.batch_id == batch_id).first()

    def get_batch_by_no(self, batch_no: str) -> Optional[QualityBatch]:
        return self.db.query(QualityBatch).filter(QualityBatch.batch_no == batch_no).first()

    def list_batches(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[BatchStatus] = None,
        batch_no: Optional[str] = None,
    ) -> Tuple[int, List[QualityBatch]]:
        query = self.db.query(QualityBatch)

        if status:
            query = query.filter(QualityBatch.status == status)
        if batch_no:
            query = query.filter(QualityBatch.batch_no.contains(batch_no))

        total = query.count()
        batches = query.order_by(QualityBatch.created_at.desc()).offset(skip).limit(limit).all()
        return total, batches

    def create_batch(self, batch_data: QualityBatchCreate) -> QualityBatch:
        existing = self.get_batch_by_no(batch_data.batch_no)

        if existing:
            if batch_data.duplicate_strategy == DuplicateStrategy.IGNORE:
                return existing
            elif batch_data.duplicate_strategy == DuplicateStrategy.OVERWRITE:
                self.db.delete(existing)
                self.db.commit()
            elif batch_data.duplicate_strategy == DuplicateStrategy.APPEND:
                previous_state = get_batch_state(existing)

                if batch_data.inspection_ids:
                    for insp_id in batch_data.inspection_ids:
                        if not any(
                            s.source_type == SourceType.INSPECTION
                            and s.inspection_id == insp_id
                            for s in existing.sources
                        ):
                            insp = (
                                self.db.query(InspectionSheet)
                                .filter(InspectionSheet.id == insp_id)
                                .first()
                            )
                            if insp:
                                source = BatchSource(
                                    batch_id=existing.id,
                                    source_type=SourceType.INSPECTION,
                                    inspection_id=insp_id,
                                    source_data={
                                        "batch_no": insp.batch_no,
                                        "product_code": insp.product_code,
                                        "pass_rate": insp.pass_rate,
                                    },
                                )
                                self.db.add(source)

                if batch_data.rework_ids:
                    for rw_id in batch_data.rework_ids:
                        if not any(
                            s.source_type == SourceType.REWORK and s.rework_id == rw_id
                            for s in existing.sources
                        ):
                            rw = (
                                self.db.query(ReworkOrder)
                                .filter(ReworkOrder.id == rw_id)
                                .first()
                            )
                            if rw:
                                source = BatchSource(
                                    batch_id=existing.id,
                                    source_type=SourceType.REWORK,
                                    rework_id=rw_id,
                                    source_data={
                                        "rework_no": rw.rework_no,
                                        "rework_pass_rate": rw.rework_pass_rate,
                                    },
                                )
                                self.db.add(source)

                self.db.commit()
                self.db.refresh(existing)

                self._calculate_batch_metrics(existing)
                self.db.commit()

                self._record_history(
                    existing,
                    "append_sources",
                    previous_state,
                    batch_data.created_by,
                    "追加数据源",
                )
                self.db.commit()
                self.db.refresh(existing)
                return existing

        batch = QualityBatch(
            batch_id=generate_batch_id(),
            batch_no=batch_data.batch_no,
            product_code=batch_data.product_code,
            product_name=batch_data.product_name,
            remark=batch_data.remark,
            created_by=batch_data.created_by,
            status=BatchStatus.DRAFT,
        )
        self.db.add(batch)
        self.db.flush()

        if batch_data.inspection_ids:
            for insp_id in batch_data.inspection_ids:
                insp = (
                    self.db.query(InspectionSheet)
                    .filter(InspectionSheet.id == insp_id)
                    .first()
                )
                if insp:
                    source = BatchSource(
                        batch_id=batch.id,
                        source_type=SourceType.INSPECTION,
                        inspection_id=insp_id,
                        source_data={
                            "batch_no": insp.batch_no,
                            "product_code": insp.product_code,
                            "pass_rate": insp.pass_rate,
                        },
                    )
                    self.db.add(source)

        if batch_data.rework_ids:
            for rw_id in batch_data.rework_ids:
                rw = (
                    self.db.query(ReworkOrder).filter(ReworkOrder.id == rw_id).first()
                )
                if rw:
                    source = BatchSource(
                        batch_id=batch.id,
                        source_type=SourceType.REWORK,
                        rework_id=rw_id,
                        source_data={
                            "rework_no": rw.rework_no,
                            "rework_pass_rate": rw.rework_pass_rate,
                        },
                    )
                    self.db.add(source)

        if batch_data.machine_shift_ids:
            for shift_id in batch_data.machine_shift_ids:
                shift = (
                    self.db.query(MachineShift)
                    .filter(MachineShift.id == shift_id)
                    .first()
                )
                if shift:
                    source = BatchSource(
                        batch_id=batch.id,
                        source_type=SourceType.MACHINE_SHIFT,
                        machine_shift_id=shift_id,
                        source_data={
                            "shift_code": shift.shift_code,
                            "machine_id": shift.machine_id,
                            "shift_pass_rate": shift.shift_pass_rate,
                        },
                    )
                    self.db.add(source)

        if batch_data.price_adjustment_ids:
            for pa_id in batch_data.price_adjustment_ids:
                pa = (
                    self.db.query(PriceAdjustment)
                    .filter(PriceAdjustment.id == pa_id)
                    .first()
                )
                if pa:
                    source = BatchSource(
                        batch_id=batch.id,
                        source_type=SourceType.PRICE_ADJUSTMENT,
                        price_adjustment_id=pa_id,
                        source_data={
                            "adjustment_no": pa.adjustment_no,
                            "price_difference": pa.price_difference,
                        },
                    )
                    self.db.add(source)

        self.db.commit()
        self.db.refresh(batch)

        self._calculate_batch_metrics(batch)
        self.db.commit()

        previous_state = {}
        self._record_history(
            batch, "create", previous_state, batch_data.created_by, "创建批次"
        )
        self.db.commit()
        self.db.refresh(batch)

        return batch

    def submit_for_review(
        self, batch_id: str, operator: Optional[str] = None
    ) -> Optional[QualityBatch]:
        batch = self.get_batch(batch_id)
        if not batch or batch.status != BatchStatus.DRAFT:
            return None

        previous_state = get_batch_state(batch)
        batch.status = BatchStatus.PENDING_REVIEW
        batch.current_stage = "待复核"

        self._record_history(
            batch, "submit_review", previous_state, operator, "提交复核"
        )
        self.db.commit()
        self.db.refresh(batch)
        return batch

    def review_batch(
        self, batch_id: str, review_data: ReviewRequest
    ) -> Optional[QualityBatch]:
        batch = self.get_batch(batch_id)
        if not batch or batch.status != BatchStatus.PENDING_REVIEW:
            return None

        previous_state = get_batch_state(batch)
        batch.review_opinion = review_data.review_opinion
        batch.reviewer = review_data.reviewer
        batch.review_time = datetime.now()

        if review_data.is_approved:
            batch.status = BatchStatus.REVIEWED
            batch.current_stage = "已复核"
            action = "review_approve"
            remark = f"复核通过: {review_data.review_opinion}"
        else:
            batch.status = BatchStatus.REJECTED
            batch.current_stage = "已驳回"
            action = "review_reject"
            remark = f"复核驳回: {review_data.review_opinion}"

        if review_data.remark:
            remark += f" ({review_data.remark})"

        self._record_history(batch, action, previous_state, review_data.reviewer, remark)
        self.db.commit()
        self.db.refresh(batch)
        return batch

    def freeze_batch(
        self, batch_id: str, freeze_data: FreezeRequest
    ) -> Optional[QualityBatch]:
        batch = self.get_batch(batch_id)
        if not batch or batch.status == BatchStatus.FROZEN:
            return None
        if batch.status == BatchStatus.ARCHIVED:
            return None

        previous_state = get_batch_state(batch)
        batch.status_before_freeze = batch.status.value
        batch.status = BatchStatus.FROZEN
        batch.current_stage = "已冻结"
        batch.freeze_reason = freeze_data.freeze_reason
        batch.frozen_by = freeze_data.frozen_by
        batch.frozen_at = datetime.now()
        batch.freeze_snapshot = {
            "state": get_batch_state(batch),
            "sources_count": len(batch.sources),
            "attachments_count": len(batch.attachments),
            "timestamp": batch.frozen_at.isoformat(),
        }

        self._record_history(
            batch,
            "freeze",
            previous_state,
            freeze_data.frozen_by,
            f"冻结批次: {freeze_data.freeze_reason}",
        )
        self.db.commit()
        self.db.refresh(batch)
        return batch

    def unfreeze_batch(
        self, batch_id: str, unfreeze_data: UnfreezeRequest
    ) -> Optional[QualityBatch]:
        batch = self.get_batch(batch_id)
        if not batch or batch.status != BatchStatus.FROZEN:
            return None

        previous_state = get_batch_state(batch)

        if batch.status_before_freeze:
            batch.status = BatchStatus(batch.status_before_freeze)
            batch.current_stage = self._get_stage_name(batch.status)

        batch.freeze_reason = None
        batch.frozen_by = None
        batch.frozen_at = None

        self._record_history(
            batch,
            "unfreeze",
            previous_state,
            unfreeze_data.operator,
            f"解除冻结: {unfreeze_data.unfreeze_reason}",
        )
        self.db.commit()
        self.db.refresh(batch)
        return batch

    def _get_stage_name(self, status: BatchStatus) -> str:
        stage_map = {
            BatchStatus.DRAFT: "草稿",
            BatchStatus.PENDING_REVIEW: "待复核",
            BatchStatus.REVIEWED: "已复核",
            BatchStatus.FROZEN: "已冻结",
            BatchStatus.ARCHIVED: "已归档",
            BatchStatus.REJECTED: "已驳回",
        }
        return stage_map.get(status, "未知")

    def archive_batch(
        self, batch_id: str, archive_data: ArchiveRequest
    ) -> Optional[QualityBatch]:
        batch = self.get_batch(batch_id)
        if not batch or batch.status == BatchStatus.ARCHIVED:
            return None
        if batch.status not in [BatchStatus.REVIEWED, BatchStatus.REJECTED]:
            return None

        previous_state = get_batch_state(batch)
        batch.status = BatchStatus.ARCHIVED
        batch.current_stage = "已归档"
        batch.archive_reason = archive_data.archive_reason
        batch.archived_by = archive_data.archived_by
        batch.archived_at = datetime.now()

        self._record_history(
            batch,
            "archive",
            previous_state,
            archive_data.archived_by,
            f"归档批次: {archive_data.archive_reason}",
        )
        self.db.commit()
        self.db.refresh(batch)
        return batch

    def add_attachment(
        self, batch_id: str, attachment_data: Dict[str, Any]
    ) -> Optional[BatchAttachment]:
        batch = self.get_batch(batch_id)
        if not batch or batch.status == BatchStatus.ARCHIVED:
            return None

        attachment = BatchAttachment(
            batch_id=batch.id,
            file_name=attachment_data["file_name"],
            file_path=attachment_data.get("file_path"),
            file_type=attachment_data.get("file_type"),
            file_size=attachment_data.get("file_size"),
            description=attachment_data.get("description"),
            uploaded_by=attachment_data.get("uploaded_by"),
        )
        self.db.add(attachment)

        previous_state = get_batch_state(batch)
        self._record_history(
            batch,
            "add_attachment",
            previous_state,
            attachment_data.get("uploaded_by"),
            f"添加附件: {attachment_data['file_name']}",
        )

        self.db.commit()
        self.db.refresh(attachment)
        return attachment

    def get_history(
        self, batch_id: str, skip: int = 0, limit: int = 100
    ) -> List[BatchHistory]:
        batch = self.get_batch(batch_id)
        if not batch:
            return []

        return (
            self.db.query(BatchHistory)
            .filter(BatchHistory.batch_id == batch.id)
            .order_by(BatchHistory.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def compare_states(
        self, history_id_1: int, history_id_2: int
    ) -> Optional[List[DiffResponse]]:
        h1 = (
            self.db.query(BatchHistory).filter(BatchHistory.id == history_id_1).first()
        )
        h2 = (
            self.db.query(BatchHistory).filter(BatchHistory.id == history_id_2).first()
        )

        if not h1 or not h2:
            return None

        state1 = h1.previous_state or {}
        state2 = h2.new_state or {}
        differences = []

        all_keys = set(state1.keys()) | set(state2.keys())
        for key in sorted(all_keys):
            old_val = state1.get(key)
            new_val = state2.get(key)

            if old_val != new_val:
                change_type = "modified"
                if old_val is None:
                    change_type = "added"
                elif new_val is None:
                    change_type = "removed"

                differences.append(
                    DiffResponse(
                        field=key,
                        old_value=old_val,
                        new_value=new_val,
                        change_type=change_type,
                    )
                )

        return differences

    def get_history_with_diff(
        self, batch_id: str, skip: int = 0, limit: int = 100
    ) -> List[HistoryDiffResponse]:
        histories = self.get_history(batch_id, skip, limit)
        result = []

        for history in histories:
            differences = []
            if history.changes:
                for field, change in history.changes.items():
                    differences.append(
                        DiffResponse(
                            field=field,
                            old_value=change.get("old"),
                            new_value=change.get("new"),
                            change_type="modified",
                        )
                    )

            result.append(
                HistoryDiffResponse(
                    history_id=history.id,
                    action=history.action,
                    operator=history.operator,
                    created_at=history.created_at,
                    differences=differences,
                )
            )

        return result


class SourceDataService:
    def __init__(self, db: Session):
        self.db = db

    def create_inspection(self, data: Dict[str, Any]) -> InspectionSheet:
        insp = InspectionSheet(**data)
        self.db.add(insp)
        self.db.commit()
        self.db.refresh(insp)
        return insp

    def create_rework(self, data: Dict[str, Any]) -> ReworkOrder:
        rw = ReworkOrder(**data)
        self.db.add(rw)
        self.db.commit()
        self.db.refresh(rw)
        return rw

    def create_machine_shift(self, data: Dict[str, Any]) -> MachineShift:
        shift = MachineShift(**data)
        self.db.add(shift)
        self.db.commit()
        self.db.refresh(shift)
        return shift

    def create_price_adjustment(self, data: Dict[str, Any]) -> PriceAdjustment:
        pa = PriceAdjustment(**data)
        self.db.add(pa)
        self.db.commit()
        self.db.refresh(pa)
        return pa

    def list_inspections(
        self, batch_no: Optional[str] = None, skip: int = 0, limit: int = 100
    ) -> List[InspectionSheet]:
        query = self.db.query(InspectionSheet)
        if batch_no:
            query = query.filter(InspectionSheet.batch_no.contains(batch_no))
        return query.order_by(InspectionSheet.created_at.desc()).offset(skip).limit(limit).all()

    def list_reworks(
        self, batch_no: Optional[str] = None, skip: int = 0, limit: int = 100
    ) -> List[ReworkOrder]:
        query = self.db.query(ReworkOrder)
        if batch_no:
            query = query.filter(ReworkOrder.batch_no.contains(batch_no))
        return query.order_by(ReworkOrder.created_at.desc()).offset(skip).limit(limit).all()

    def list_shifts(
        self, machine_id: Optional[str] = None, skip: int = 0, limit: int = 100
    ) -> List[MachineShift]:
        query = self.db.query(MachineShift)
        if machine_id:
            query = query.filter(MachineShift.machine_id.contains(machine_id))
        return query.order_by(MachineShift.created_at.desc()).offset(skip).limit(limit).all()


class AsyncTaskService:
    def __init__(self, db: Session):
        self.db = db

    def create_task(self, data: Dict[str, Any]) -> AsyncTask:
        task = AsyncTask(
            task_id=generate_task_id(),
            task_type=data["task_type"],
            batch_id=data.get("batch_id"),
            parameters=data.get("parameters"),
            created_by=data.get("created_by"),
            status=TaskStatus.PENDING,
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def get_task(self, task_id: str) -> Optional[AsyncTask]:
        return (
            self.db.query(AsyncTask).filter(AsyncTask.task_id == task_id).first()
        )

    def start_task(self, task_id: str) -> Optional[AsyncTask]:
        task = self.get_task(task_id)
        if not task or task.status not in [
            TaskStatus.PENDING,
            TaskStatus.WAITING_RETRY,
        ]:
            return None

        task.status = TaskStatus.RUNNING
        task.started_at = datetime.now()
        self.db.commit()
        self.db.refresh(task)
        return task

    def complete_task(
        self, task_id: str, result: Optional[Dict[str, Any]] = None
    ) -> Optional[AsyncTask]:
        task = self.get_task(task_id)
        if not task:
            return None

        task.status = TaskStatus.COMPLETED
        task.result = result
        task.completed_at = datetime.now()
        self.db.commit()
        self.db.refresh(task)
        return task

    def fail_task(
        self,
        task_id: str,
        error_message: str,
        is_permanent: bool = False,
    ) -> Optional[AsyncTask]:
        task = self.get_task(task_id)
        if not task:
            return None

        task.error_message = error_message
        task.retry_count += 1

        if is_permanent or task.retry_count >= task.max_retries:
            task.status = TaskStatus.PERMANENT_FAILED
            task.completed_at = datetime.now()
        else:
            task.status = TaskStatus.WAITING_RETRY
            task.next_retry_at = datetime.now() + timedelta(
                seconds=settings.ASYNC_TASK_RETRY_DELAY
            )

        self.db.commit()
        self.db.refresh(task)
        return task

    def mark_for_manual(self, task_id: str, reason: str) -> Optional[AsyncTask]:
        task = self.get_task(task_id)
        if not task:
            return None

        task.status = TaskStatus.WAITING_MANUAL
        task.error_message = f"需要人工处理: {reason}"
        self.db.commit()
        self.db.refresh(task)
        return task

    def get_pending_tasks(self) -> List[AsyncTask]:
        now = datetime.now()
        return (
            self.db.query(AsyncTask)
            .filter(
                or_(
                    AsyncTask.status == TaskStatus.PENDING,
                    and_(
                        AsyncTask.status == TaskStatus.WAITING_RETRY,
                        AsyncTask.next_retry_at <= now,
                    ),
                )
            )
            .order_by(AsyncTask.created_at)
            .all()
        )

    def list_tasks(
        self,
        status: Optional[TaskStatus] = None,
        batch_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[AsyncTask]:
        query = self.db.query(AsyncTask)
        if status:
            query = query.filter(AsyncTask.status == status)
        if batch_id:
            query = query.filter(AsyncTask.batch_id == batch_id)
        return query.order_by(AsyncTask.created_at.desc()).offset(skip).limit(limit).all()


class ExportService:
    def __init__(self, db: Session):
        self.db = db
        self.export_dir = settings.EXPORT_DIR
        self.export_dir.mkdir(parents=True, exist_ok=True)

    def export_batches(
        self,
        batch_ids: Optional[List[str]] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        status: Optional[List[BatchStatus]] = None,
    ) -> Dict[str, Any]:
        import pandas as pd

        query = self.db.query(QualityBatch)

        if batch_ids:
            query = query.filter(QualityBatch.batch_id.in_(batch_ids))
        if start_date:
            query = query.filter(QualityBatch.created_at >= start_date)
        if end_date:
            query = query.filter(QualityBatch.created_at <= end_date)
        if status:
            query = query.filter(QualityBatch.status.in_(status))

        batches = query.order_by(QualityBatch.created_at.desc()).all()

        data = []
        for batch in batches:
            row = {
                "批次ID": batch.batch_id,
                "批次号": batch.batch_no,
                "产品编码": batch.product_code,
                "产品名称": batch.product_name,
                "状态": batch.current_stage,
                "状态码": batch.status.value if batch.status else None,
                "返工次数": batch.rework_count,
                "缺陷总数": batch.total_defect_count,
                "初始良率": batch.initial_pass_rate,
                "最终良率": batch.final_pass_rate,
                "最高良率": batch.best_pass_rate,
                "最低良率": batch.worst_pass_rate,
                "责任班次": batch.responsible_shift,
                "责任机台": batch.responsible_machine,
                "复核意见": batch.review_opinion,
                "复核人": batch.reviewer,
                "复核时间": batch.review_time,
                "冻结原因": batch.freeze_reason,
                "冻结人": batch.frozen_by,
                "冻结时间": batch.frozen_at,
                "冻结前状态": batch.status_before_freeze,
                "归档原因": batch.archive_reason,
                "归档人": batch.archived_by,
                "归档时间": batch.archived_at,
                "创建人": batch.created_by,
                "创建时间": batch.created_at,
                "备注": batch.remark,
            }
            data.append(row)

        df = pd.DataFrame(data)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"quality_batches_{timestamp}.xlsx"
        filepath = self.export_dir / filename

        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="批次汇总", index=False)

            history_data = []
            for batch in batches:
                for history in batch.histories:
                    history_data.append(
                        {
                            "批次ID": batch.batch_id,
                            "批次号": batch.batch_no,
                            "操作类型": history.action,
                            "操作人": history.operator,
                            "操作时间": history.created_at,
                            "备注": history.remark,
                            "变更详情": json.dumps(history.changes, ensure_ascii=False)
                            if history.changes
                            else None,
                        }
                    )

            if history_data:
                history_df = pd.DataFrame(history_data)
                history_df.to_excel(writer, sheet_name="操作历史", index=False)

        file_size = filepath.stat().st_size

        return {
            "file_path": str(filepath),
            "file_name": filename,
            "file_size": file_size,
            "record_count": len(data),
        }
