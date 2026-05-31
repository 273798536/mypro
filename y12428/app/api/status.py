from __future__ import annotations
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.store.memory import store
from app.models.enrollment import Enrollment, EnrollmentCreate, EnrollmentStatus
from app.models.agreement import Agreement, AgreementCreate, AgreementStatus, FeeRule
from app.models.split import SplitDetail, SplitStatus
from app.models.history import HistoryEntry
from app.engine.splitter import compute_split_for_enrollment, find_active_agreement
from app.engine.propagation import propagate_split_change
from app.engine.conflict import merge_enrollments_with_agreements


router = APIRouter(prefix="/status", tags=["状态变更"])


class EnrollmentCreateRequest(BaseModel):
    data: EnrollmentCreate


class AgreementCreateRequest(BaseModel):
    data: AgreementCreate


class SplitTriggerRequest(BaseModel):
    enrollment_id: str
    operator: str = "system"


class SplitStatusChangeRequest(BaseModel):
    new_status: SplitStatus
    operator: str = "system"
    remark: Optional[str] = None


class ConflictMergeRequest(BaseModel):
    operator: str = "system"


@router.post("/enrollments", summary="创建选课记录")
def create_enrollment(req: EnrollmentCreateRequest):
    eid = store.next_id("enrollment")
    agr = find_active_agreement(
        store.list_agreements(),
        req.data.home_school_id,
        req.data.host_school_id,
    )
    agreement_id = agr.id if agr else None
    agreement_version = agr.version if agr else None

    enr = Enrollment(
        id=eid,
        **req.data.model_dump(),
        agreement_id=agreement_id,
        agreement_version=agreement_version,
        enrolled_at=datetime.now(),
        status=EnrollmentStatus.ENROLLED,
    )
    store.add_enrollment(enr)

    store.add_history(
        HistoryEntry(
            id=store.next_id("history"),
            entity_type="enrollment",
            entity_id=eid,
            action="create",
            after=enr.model_dump(mode="json"),
            operator=req.data.student_id,
        )
    )
    return enr.model_dump(mode="json")


@router.post("/agreements", summary="创建协议")
def create_agreement(req: AgreementCreateRequest):
    aid = store.next_id("agreement")
    existing = [a for a in store.list_agreements() if set(a.school_ids) == set(req.data.school_ids) and a.status == AgreementStatus.ACTIVE]
    if existing:
        raise HTTPException(400, f"学校 {req.data.school_ids} 之间已有生效协议 {existing[0].id}，请先停用旧协议或创建新版本")

    agr = Agreement(
        id=aid,
        version=1,
        status=AgreementStatus.ACTIVE,
        **req.data.model_dump(),
    )
    store.add_agreement(agr)

    store.add_history(
        HistoryEntry(
            id=store.next_id("history"),
            entity_type="agreement",
            entity_id=aid,
            action="create",
            after=agr.model_dump(mode="json"),
            operator="admin",
        )
    )
    return agr.model_dump(mode="json")


@router.post("/splits/trigger", summary="触发费用分摊")
def trigger_split(req: SplitTriggerRequest):
    enr = store.get_enrollment(req.enrollment_id)
    if not enr:
        raise HTTPException(404, f"选课记录 {req.enrollment_id} 不存在")

    existing = [s for s in store.list_splits() if s.enrollment_id == req.enrollment_id]
    if existing:
        raise HTTPException(400, f"选课记录 {req.enrollment_id} 已有分账明细 {existing[0].id}，请勿重复触发")

    sid = store.next_id("split")
    agreements = store.list_agreements()
    split = compute_split_for_enrollment(enr, agreements, sid)
    store.add_split(split)

    prop = propagate_split_change(split, req.operator)

    store.add_history(
        HistoryEntry(
            id=store.next_id("history"),
            entity_type="split",
            entity_id=sid,
            action="split_trigger",
            after=split.model_dump(mode="json"),
            operator=req.operator,
            remark=f"费用分摊已触发，传播结果：{prop.model_dump(mode='json')}",
        )
    )

    return {
        "split": split.model_dump(mode="json"),
        "propagation": prop.model_dump(mode="json"),
    }


@router.patch("/splits/{split_id}/status", summary="变更分账状态")
def change_split_status(split_id: str, req: SplitStatusChangeRequest):
    sp = store.get_split(split_id)
    if not sp:
        raise HTTPException(404, f"分账明细 {split_id} 不存在")

    before = sp.model_dump(mode="json")
    old_status = sp.status
    sp.status = req.new_status
    sp.updated_at = datetime.now()
    store.update_split(split_id, sp)

    prop = propagate_split_change(sp, req.operator)

    store.add_history(
        HistoryEntry(
            id=store.next_id("history"),
            entity_type="split",
            entity_id=split_id,
            action="status_change",
            before=before,
            after=sp.model_dump(mode="json"),
            operator=req.operator,
            remark=req.remark or f"状态从 {old_status.value} 变更为 {req.new_status.value}",
        )
    )

    return {
        "split": sp.model_dump(mode="json"),
        "propagation": prop.model_dump(mode="json"),
    }


@router.post("/merge-check", summary="合并前冲突检测")
def merge_check(req: ConflictMergeRequest):
    enrollments = store.list_enrollments()
    agreements = store.list_agreements()
    result = merge_enrollments_with_agreements(enrollments, agreements)

    store.add_history(
        HistoryEntry(
            id=store.next_id("history"),
            entity_type="system",
            entity_id="merge-check",
            action="merge_check",
            after=result,
            operator=req.operator,
            remark="选课记录与协议合并前冲突检测",
        )
    )

    return result
