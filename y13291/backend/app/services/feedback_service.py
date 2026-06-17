from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from typing import List, Optional, Dict, Any
from datetime import datetime
import json

from app.models import Feedback, MergeRelation, Evidence, OperationLog
from app.schemas import (
    FeedbackCreate, FeedbackUpdate, FeedbackRead,
    MergeRelationCreate, MergeRelationRead,
    EvidenceCreate, EvidenceRead,
    OperationLogRead, DashboardStats, StatusTransition
)


def _log_operation(
    db: Session,
    feedback_id: int,
    action: str,
    operator: Optional[str] = None,
    field_changed: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    remark: Optional[str] = None
):
    log = OperationLog(
        feedback_id=feedback_id,
        operator=operator or "system",
        action=action,
        field_changed=field_changed,
        old_value=old_value,
        new_value=new_value,
        remark=remark
    )
    db.add(log)


def generate_feedback_no(db: Session) -> str:
    today = datetime.now().strftime("%Y%m%d")
    prefix = f"MXQ-{today}-"
    count = db.query(func.count(Feedback.id)).filter(
        Feedback.feedback_no.like(f"{prefix}%")
    ).scalar() or 0
    return f"{prefix}{count + 1:03d}"


def create_feedback(db: Session, data: FeedbackCreate) -> Feedback:
    obj = Feedback(**data.model_dump())
    db.add(obj)
    db.flush()
    _log_operation(db, obj.id, "create", operator=data.handler or "system",
                   remark=f"创建反馈记录 {obj.feedback_no}")
    db.commit()
    db.refresh(obj)
    return obj


def get_feedback(db: Session, feedback_id: int) -> Optional[Feedback]:
    return db.query(Feedback).filter(Feedback.id == feedback_id).first()


def get_feedback_by_no(db: Session, feedback_no: str) -> Optional[Feedback]:
    return db.query(Feedback).filter(Feedback.feedback_no == feedback_no).first()


def list_feedbacks(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    bridge_name: Optional[str] = None,
    source: Optional[str] = None
) -> tuple[int, List[Feedback]]:
    query = db.query(Feedback)
    if status:
        query = query.filter(Feedback.status == status)
    if source:
        query = query.filter(Feedback.original_source == source)
    if bridge_name:
        query = query.filter(Feedback.bridge_name.like(f"%{bridge_name}%"))
    if keyword:
        kw = f"%{keyword}%"
        query = query.filter(or_(
            Feedback.original_content.like(kw),
            Feedback.original_location.like(kw),
            Feedback.normalized_location.like(kw),
            Feedback.feedback_no.like(kw),
            Feedback.bridge_name.like(kw),
            Feedback.review_remark.like(kw)
        ))
    total = query.count()
    items = query.order_by(Feedback.created_at.desc()).offset(skip).limit(limit).all()
    return total, items


def update_feedback(db: Session, feedback_id: int, data: FeedbackUpdate) -> Optional[Feedback]:
    obj = get_feedback(db, feedback_id)
    if not obj:
        return None

    update_dict = data.model_dump(exclude_unset=True)
    operator = update_dict.pop("operator", None) or "system"

    for field, new_val in update_dict.items():
        old_val = getattr(obj, field)
        if old_val != new_val:
            old_str = str(old_val) if old_val is not None else ""
            new_str = str(new_val) if new_val is not None else ""
            _log_operation(
                db, feedback_id, "update", operator=operator,
                field_changed=field, old_value=old_str, new_value=new_str,
                remark=f"修改字段 {field}"
            )
            setattr(obj, field, new_val)

    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


def transition_status(db: Session, feedback_id: int, trans: StatusTransition) -> Optional[Feedback]:
    obj = get_feedback(db, feedback_id)
    if not obj:
        return None
    old_status = obj.status
    if old_status != trans.target_status:
        _log_operation(
            db, feedback_id, "status_change", operator=trans.operator or "system",
            field_changed="status", old_value=old_status, new_value=trans.target_status,
            remark=trans.remark or f"状态从 {old_status} 变更为 {trans.target_status}"
        )
        obj.status = trans.target_status
        obj.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(obj)
    return obj


def delete_feedback(db: Session, feedback_id: int) -> bool:
    obj = get_feedback(db, feedback_id)
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


def create_merge_relation(db: Session, data: MergeRelationCreate) -> Optional[MergeRelation]:
    from_obj = get_feedback(db, data.merged_from_id)
    to_obj = get_feedback(db, data.merged_to_id)
    if not from_obj or not to_obj:
        return None
    if from_obj.id == to_obj.id:
        return None

    relation = MergeRelation(**data.model_dump())
    db.add(relation)
    db.flush()

    _log_operation(
        db, from_obj.id, "merge_from", operator=data.merged_by or "system",
        old_value=from_obj.feedback_no, new_value=to_obj.feedback_no,
        remark=f"记录 {from_obj.feedback_no} 归并到 {to_obj.feedback_no}，理由：{data.merge_reason or ''}，证据：{data.merge_evidence or ''}"
    )
    _log_operation(
        db, to_obj.id, "merge_to", operator=data.merged_by or "system",
        old_value=to_obj.feedback_no, new_value=from_obj.feedback_no,
        remark=f"吸收归并记录 {from_obj.feedback_no}"
    )

    if from_obj.status != "merged":
        from_obj.status = "merged"
        from_obj.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(relation)
    return relation


def list_merge_relations(db: Session, feedback_id: Optional[int] = None) -> List[Dict[str, Any]]:
    query = db.query(MergeRelation)
    if feedback_id is not None:
        query = query.filter(
            or_(MergeRelation.merged_from_id == feedback_id, MergeRelation.merged_to_id == feedback_id)
        )
    rels = query.all()
    result = []
    for r in rels:
        from_fb = get_feedback(db, r.merged_from_id)
        to_fb = get_feedback(db, r.merged_to_id)
        result.append({
            "id": r.id,
            "merged_from_id": r.merged_from_id,
            "merged_to_id": r.merged_to_id,
            "from_feedback_no": from_fb.feedback_no if from_fb else None,
            "to_feedback_no": to_fb.feedback_no if to_fb else None,
            "merge_reason": r.merge_reason,
            "merge_evidence": r.merge_evidence,
            "merged_by": r.merged_by,
            "created_at": r.created_at
        })
    return result


def find_potential_duplicates(db: Session, feedback_id: Optional[int] = None) -> List[Dict[str, Any]]:
    all_fbs = db.query(Feedback).filter(Feedback.status != "merged").all()
    duplicates = []
    checked = set()
    for i, fb1 in enumerate(all_fbs):
        for fb2 in all_fbs[i + 1:]:
            key = tuple(sorted([fb1.id, fb2.id]))
            if key in checked:
                continue
            checked.add(key)
            score = 0
            reasons = []
            if fb1.bridge_name and fb2.bridge_name and fb1.bridge_name == fb2.bridge_name:
                score += 60
                reasons.append(f"同一桥名: {fb1.bridge_name}")
            loc1 = (fb1.normalized_location or fb1.original_location or "").strip()
            loc2 = (fb2.normalized_location or fb2.original_location or "").strip()
            if loc1 and loc2 and (loc1 in loc2 or loc2 in loc1):
                score += 30
                reasons.append(f"地点相似: {loc1[:30]} vs {loc2[:30]}")
            if loc1 and loc2:
                common = len(set(loc1) & set(loc2))
                min_len = min(len(loc1), len(loc2))
                if min_len > 5 and common / min_len > 0.5:
                    score += 25
                    reasons.append(f"地点文字重合度较高: {int(common/min_len*100)}%")
            if fb1.lng and fb2.lng and fb1.lat and fb2.lat:
                dist = ((fb1.lng - fb2.lng) ** 2 + (fb1.lat - fb2.lat) ** 2) ** 0.5
                if dist < 0.002:
                    score += 30
                    reasons.append(f"经纬度距离近: {dist:.5f}")
            if score >= 40:
                duplicates.append({
                    "score": score,
                    "reasons": reasons,
                    "feedback_a": {
                        "id": fb1.id, "feedback_no": fb1.feedback_no,
                        "bridge_name": fb1.bridge_name, "location": loc1,
                        "content": (fb1.original_content or "")[:80]
                    },
                    "feedback_b": {
                        "id": fb2.id, "feedback_no": fb2.feedback_no,
                        "bridge_name": fb2.bridge_name, "location": loc2,
                        "content": (fb2.original_content or "")[:80]
                    }
                })
    duplicates.sort(key=lambda x: x["score"], reverse=True)
    return duplicates


def add_evidence(db: Session, data: EvidenceCreate) -> Evidence:
    obj = Evidence(**data.model_dump())
    db.add(obj)
    db.flush()
    fb = get_feedback(db, data.feedback_id)
    if fb:
        _log_operation(
            db, data.feedback_id, "add_evidence", operator=data.uploaded_by or "system",
            field_changed="evidence", new_value=f"{data.evidence_type}: {data.evidence_desc}",
            remark=f"补充证据材料：{data.file_name or ''}"
        )
        fb.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


def list_evidences(db: Session, feedback_id: int) -> List[Evidence]:
    return db.query(Evidence).filter(Evidence.feedback_id == feedback_id).order_by(Evidence.created_at.desc()).all()


def list_operation_logs(db: Session, feedback_id: int) -> List[OperationLog]:
    return db.query(OperationLog).filter(OperationLog.feedback_id == feedback_id).order_by(OperationLog.created_at.desc()).all()


def get_dashboard_stats(db: Session) -> DashboardStats:
    total = db.query(func.count(Feedback.id)).scalar() or 0

    def _count(status_val):
        return db.query(func.count(Feedback.id)).filter(Feedback.status == status_val).scalar() or 0

    return DashboardStats(
        total=total,
        pending=_count("pending"),
        reviewing=_count("reviewing"),
        need_evidence=_count("need_evidence"),
        approved=_count("approved"),
        merged=_count("merged"),
        closed=_count("closed")
    )


STATUS_LABEL_MAP = {
    "pending": "待处理",
    "reviewing": "复核中",
    "need_evidence": "待补材料",
    "approved": "可放行",
    "merged": "已归并",
    "closed": "已结案"
}

STATUS_ACTION_HINTS = {
    "pending": "新导入记录，先核对地点和内容真实性",
    "reviewing": "正在进行容量复核，需补充坡道设计参数或现场照片",
    "need_evidence": "材料不齐，需要补充：设计图纸、现场测量数据、居民签字确认等",
    "approved": "材料齐全，容量复核通过，可纳入正式报告",
    "merged": "已并入其他记录，无需单独处理，溯源可见主记录",
    "closed": "处理完成，已归档"
}
