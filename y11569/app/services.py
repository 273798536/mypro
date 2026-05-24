from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models import (
    WorkOrder, WorkOrderStatus, StatusTransition, User, Role,
    RawRecord, ImportRecord, Judgment, Evidence, ExportLog, SourceType
)
from app.schemas import (
    WorkOrderCreate, WorkOrderUpdate, StatusChangeRequest,
    JudgmentCreate, EvidenceCreate, ImportRecordCreate,
    FreezeRequest, ExportRequest
)


class WorkOrderStateError(Exception):
    pass


class PermissionError(Exception):
    pass


class WorkOrderFrozenError(Exception):
    pass


class DuplicateSubmissionError(Exception):
    pass


STATE_TRANSITION_MAP = {
    WorkOrderStatus.DRAFT: [WorkOrderStatus.SUBMITTED, WorkOrderStatus.WITHDRAWN],
    WorkOrderStatus.SUBMITTED: [WorkOrderStatus.REJECTED, WorkOrderStatus.RECONFIRMED, WorkOrderStatus.WITHDRAWN],
    WorkOrderStatus.REJECTED: [WorkOrderStatus.RECONFIRMED, WorkOrderStatus.DRAFT, WorkOrderStatus.WITHDRAWN],
    WorkOrderStatus.RECONFIRMED: [WorkOrderStatus.AUDIT_ONLY, WorkOrderStatus.REJECTED],
    WorkOrderStatus.AUDIT_ONLY: [WorkOrderStatus.FROZEN, WorkOrderStatus.EXPORTED],
    WorkOrderStatus.FROZEN: [WorkOrderStatus.EXPORTED, WorkOrderStatus.AUDIT_ONLY],
    WorkOrderStatus.WITHDRAWN: [WorkOrderStatus.DRAFT],
    WorkOrderStatus.EXPORTED: [],
}


def can_transition(from_status: WorkOrderStatus, to_status: WorkOrderStatus) -> bool:
    return to_status in STATE_TRANSITION_MAP.get(from_status, [])


def has_permission(user_role: Role, action: str) -> bool:
    permissions = {
        Role.OPERATOR: ["create_draft", "submit", "withdraw", "edit_draft", "add_evidence", "reconfirm"],
        Role.SUPERVISOR: ["reject", "freeze", "view_all", "manual_judge"],
        Role.AUDITOR: ["view_all", "export", "view_evidence", "audit_only", "freeze"],
        Role.ADMIN: ["*"],
    }
    user_perms = permissions.get(user_role, [])
    return "*" in user_perms or action in user_perms


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()


def create_user(db: Session, username: str, real_name: str, role: Role, password: str) -> User:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed_password = pwd_context.hash(password)
    db_user = User(
        username=username,
        real_name=real_name,
        role=role,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def generate_work_order_no(db: Session, prefix: str = "WO") -> str:
    last_wo = db.query(WorkOrder).order_by(WorkOrder.id.desc()).first()
    next_id = (last_wo.id + 1) if last_wo else 1
    date_str = datetime.now().strftime("%Y%m%d")
    return f"{prefix}{date_str}{next_id:06d}"


def get_work_order(db: Session, work_order_id: int) -> Optional[WorkOrder]:
    return db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()


def get_work_order_by_no(db: Session, work_order_no: str) -> Optional[WorkOrder]:
    return db.query(WorkOrder).filter(WorkOrder.work_order_no == work_order_no).first()


def get_work_orders(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[WorkOrderStatus] = None,
    creator_id: Optional[int] = None
) -> List[WorkOrder]:
    query = db.query(WorkOrder)
    if status:
        query = query.filter(WorkOrder.status == status)
    if creator_id:
        query = query.filter(WorkOrder.creator_id == creator_id)
    return query.offset(skip).limit(limit).all()


def check_duplicate_submission(db: Session, location: str, title: str) -> bool:
    recent = db.query(WorkOrder).filter(
        and_(
            WorkOrder.location == location,
            WorkOrder.title == title,
            WorkOrder.status.in_([
                WorkOrderStatus.SUBMITTED,
                WorkOrderStatus.RECONFIRMED,
                WorkOrderStatus.AUDIT_ONLY
            ])
        )
    ).first()
    return recent is not None


def create_work_order(db: Session, wo_data: WorkOrderCreate) -> WorkOrder:
    if check_duplicate_submission(db, wo_data.location or "", wo_data.title):
        raise DuplicateSubmissionError("该地点存在类似未处理工单，请确认是否重复提交")
    
    db_wo = WorkOrder(**wo_data.model_dump())
    db.add(db_wo)
    db.commit()
    db.refresh(db_wo)
    
    db_transition = StatusTransition(
        work_order_id=db_wo.id,
        from_status=None,
        to_status=WorkOrderStatus.DRAFT,
        operator_id=wo_data.creator_id,
        reason="创建工单草稿"
    )
    db.add(db_transition)
    db.commit()
    
    return db_wo


def update_work_order(db: Session, work_order_id: int, wo_update: WorkOrderUpdate, operator_id: int) -> WorkOrder:
    db_wo = get_work_order(db, work_order_id)
    if not db_wo:
        raise ValueError("工单不存在")
    if db_wo.is_frozen:
        raise WorkOrderFrozenError("工单已冻结，无法修改")
    if db_wo.status != WorkOrderStatus.DRAFT:
        raise WorkOrderStateError("仅草稿状态可修改")
    
    operator = get_user_by_id(db, operator_id)
    if not operator:
        raise ValueError("操作者不存在")
    if not has_permission(operator.role, "edit_draft") and db_wo.creator_id != operator_id:
        raise PermissionError("无权限修改此工单")
    
    update_data = wo_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_wo, key, value)
    
    db.commit()
    db.refresh(db_wo)
    return db_wo


def change_work_order_status(
    db: Session,
    work_order_id: int,
    request: StatusChangeRequest
) -> Tuple[WorkOrder, StatusTransition]:
    db_wo = get_work_order(db, work_order_id)
    if not db_wo:
        raise ValueError("工单不存在")
    if db_wo.is_frozen and request.new_status != WorkOrderStatus.EXPORTED:
        raise WorkOrderFrozenError("工单已冻结，仅可导出")
    
    operator = get_user_by_id(db, request.operator_id)
    if not operator:
        raise ValueError("操作者不存在")
    
    if not can_transition(db_wo.status, request.new_status):
        raise WorkOrderStateError(
            f"无法从 {db_wo.status.value} 状态转换到 {request.new_status.value} 状态"
        )
    
    action_map = {
        WorkOrderStatus.SUBMITTED: "submit",
        WorkOrderStatus.WITHDRAWN: "withdraw",
        WorkOrderStatus.REJECTED: "reject",
        WorkOrderStatus.RECONFIRMED: "reconfirm",
        WorkOrderStatus.AUDIT_ONLY: "audit_only",
        WorkOrderStatus.FROZEN: "freeze",
        WorkOrderStatus.EXPORTED: "export",
        WorkOrderStatus.DRAFT: "edit_draft",
    }
    
    action = action_map.get(request.new_status)
    if action and not has_permission(operator.role, action):
        raise PermissionError(f"无权限执行此操作: {action}")
    
    if request.new_status == WorkOrderStatus.SUBMITTED:
        if check_duplicate_submission(db, db_wo.location or "", db_wo.title):
            raise DuplicateSubmissionError("该地点存在类似未处理工单，请确认是否重复提交")
    
    old_status = db_wo.status
    db_wo.status = request.new_status
    db_wo.updated_at = datetime.utcnow()
    
    db_transition = StatusTransition(
        work_order_id=db_wo.id,
        from_status=old_status,
        to_status=request.new_status,
        operator_id=request.operator_id,
        reason=request.reason
    )
    db.add(db_transition)
    db.commit()
    db.refresh(db_wo)
    db.refresh(db_transition)
    
    return db_wo, db_transition


def freeze_work_order(db: Session, work_order_id: int, request: FreezeRequest) -> WorkOrder:
    db_wo = get_work_order(db, work_order_id)
    if not db_wo:
        raise ValueError("工单不存在")
    if db_wo.is_frozen:
        raise WorkOrderStateError("工单已处于冻结状态")
    
    operator = get_user_by_id(db, request.operator_id)
    if not operator or not has_permission(operator.role, "freeze"):
        raise PermissionError("无权限冻结工单")
    
    db_wo.is_frozen = True
    db_wo.frozen_at = datetime.utcnow()
    db_wo.frozen_by = request.operator_id
    db_wo.status = WorkOrderStatus.FROZEN
    
    db_transition = StatusTransition(
        work_order_id=db_wo.id,
        from_status=db_wo.status,
        to_status=WorkOrderStatus.FROZEN,
        operator_id=request.operator_id,
        reason=f"冻结: {request.reason}"
    )
    db.add(db_transition)
    db.commit()
    db.refresh(db_wo)
    
    return db_wo


def add_evidence(db: Session, evidence_data: EvidenceCreate) -> Evidence:
    db_wo = get_work_order(db, evidence_data.work_order_id)
    if not db_wo:
        raise ValueError("工单不存在")
    if db_wo.is_frozen:
        raise WorkOrderFrozenError("工单已冻结，无法添加证据")
    
    db_evidence = Evidence(**evidence_data.model_dump())
    db.add(db_evidence)
    db.commit()
    db.refresh(db_evidence)
    return db_evidence


def add_judgment(db: Session, judgment_data: JudgmentCreate) -> Judgment:
    db_wo = get_work_order(db, judgment_data.work_order_id)
    if not db_wo:
        raise ValueError("工单不存在")
    if db_wo.is_frozen:
        raise WorkOrderFrozenError("工单已冻结，无法改判")
    
    judge = get_user_by_id(db, judgment_data.judge_id)
    if not judge or not has_permission(judge.role, "manual_judge"):
        raise PermissionError("无权限进行人工改判")
    
    if judgment_data.previous_data is None:
        judgment_data.previous_data = {
            "title": db_wo.title,
            "description": db_wo.description,
            "location": db_wo.location,
            "status": db_wo.status.value,
        }
    
    db_judgment = Judgment(**judgment_data.model_dump())
    db.add(db_judgment)
    
    if judgment_data.new_data:
        for key, value in judgment_data.new_data.items():
            if hasattr(db_wo, key):
                setattr(db_wo, key, value)
    
    db.commit()
    db.refresh(db_judgment)
    return db_judgment


def get_raw_record(db: Session, raw_id: int) -> Optional[RawRecord]:
    return db.query(RawRecord).filter(RawRecord.id == raw_id).first()


def create_import_record(db: Session, import_data: ImportRecordCreate) -> ImportRecord:
    db_import = ImportRecord(**import_data.model_dump())
    db.add(db_import)
    db.commit()
    db.refresh(db_import)
    return db_import


def create_raw_record(
    db: Session,
    import_record_id: int,
    line_number: int,
    original_data: Dict[str, Any],
    parsed_data: Optional[Dict[str, Any]] = None,
    parse_error: Optional[str] = None
) -> RawRecord:
    db_raw = RawRecord(
        import_record_id=import_record_id,
        original_line_number=line_number,
        original_data=original_data,
        parsed_data=parsed_data,
        parse_error=parse_error,
        is_parsed=parse_error is None and parsed_data is not None
    )
    db.add(db_raw)
    db.commit()
    db.refresh(db_raw)
    return db_raw


def mask_sensitive_data(data: Dict[str, Any], fields: List[str]) -> Dict[str, Any]:
    masked = data.copy()
    for field in fields:
        if field in masked and masked[field]:
            value = str(masked[field])
            if len(value) > 4:
                masked[field] = value[:2] + "*" * (len(value) - 4) + value[-2:]
            else:
                masked[field] = "*" * len(value)
    return masked


SENSITIVE_FIELDS = ["hotline_number", "creator_real_name", "operator_phone"]


def get_role_view_config(role: Role) -> Dict[str, Any]:
    configs = {
        Role.OPERATOR: {
            "visible_fields": [
                "work_order_no", "title", "description", "location", "status",
                "spare_part_batch", "hotline_number", "inspection_photo_ref",
                "created_at", "updated_at", "status_transitions", "evidences"
            ],
            "masked_fields": [],
        },
        Role.SUPERVISOR: {
            "visible_fields": ["*"],
            "masked_fields": [],
        },
        Role.AUDITOR: {
            "visible_fields": ["*"],
            "masked_fields": ["hotline_number"],
        },
        Role.ADMIN: {
            "visible_fields": ["*"],
            "masked_fields": [],
        },
    }
    return configs.get(role, configs[Role.OPERATOR])


def apply_role_view(data: Dict[str, Any], role: Role) -> Dict[str, Any]:
    config = get_role_view_config(role)
    visible = config["visible_fields"]
    masked = config["masked_fields"]
    
    result = {}
    for key, value in data.items():
        if "*" in visible or key in visible:
            if key in masked:
                if isinstance(value, str):
                    if len(value) > 4:
                        result[key] = value[:2] + "*" * (len(value) - 4) + value[-2:]
                    else:
                        result[key] = "*" * len(value)
                else:
                    result[key] = value
            else:
                result[key] = value
    return result


def export_work_orders(
    db: Session,
    request: ExportRequest
) -> Tuple[List[Dict[str, Any]], ExportLog]:
    if request.work_order_ids:
        work_orders = db.query(WorkOrder).filter(WorkOrder.id.in_(request.work_order_ids)).all()
    else:
        work_orders = db.query(WorkOrder).filter(
            WorkOrder.status.in_([WorkOrderStatus.FROZEN, WorkOrderStatus.AUDIT_ONLY])
        ).all()
    
    exported_by = get_user_by_id(db, request.exported_by)
    if not exported_by or not has_permission(exported_by.role, "export"):
        raise PermissionError("无权限导出")
    
    export_data = []
    for wo in work_orders:
        wo_dict = {
            "id": wo.id,
            "work_order_no": wo.work_order_no,
            "title": wo.title,
            "description": wo.description,
            "location": wo.location,
            "status": wo.status.value,
            "spare_part_batch": wo.spare_part_batch,
            "hotline_number": wo.hotline_number,
            "inspection_photo_ref": wo.inspection_photo_ref,
            "creator": wo.creator.real_name if wo.creator else None,
            "created_at": wo.created_at.isoformat(),
            "updated_at": wo.updated_at.isoformat(),
            "status_transitions": [
                {
                    "from": t.from_status.value if t.from_status else None,
                    "to": t.to_status.value,
                    "operator": t.operator.real_name if t.operator else None,
                    "time": t.occurred_at.isoformat(),
                    "reason": t.reason,
                }
                for t in wo.status_transitions
            ],
            "judgments": [
                {
                    "type": j.judgment_type,
                    "reason": j.reason,
                    "previous_data": j.previous_data,
                    "new_data": j.new_data,
                }
                for j in wo.judgments
            ],
            "evidence_count": len(wo.evidences),
        }
        
        if request.mask_sensitive:
            wo_dict = mask_sensitive_data(wo_dict, SENSITIVE_FIELDS)
        
        export_data.append(wo_dict)
    
    export_log = ExportLog(
        export_type=request.export_type,
        exported_by=request.exported_by,
        work_order_ids=[wo.id for wo in work_orders],
        is_sensitive_masked=request.mask_sensitive,
        parameters={"mask_sensitive": request.mask_sensitive},
    )
    db.add(export_log)
    
    for wo in work_orders:
        if wo.status != WorkOrderStatus.EXPORTED:
            db_transition = StatusTransition(
                work_order_id=wo.id,
                from_status=wo.status,
                to_status=WorkOrderStatus.EXPORTED,
                operator_id=request.exported_by,
                reason="导出台账"
            )
            db.add(db_transition)
            wo.status = WorkOrderStatus.EXPORTED
    
    db.commit()
    db.refresh(export_log)
    
    return export_data, export_log
