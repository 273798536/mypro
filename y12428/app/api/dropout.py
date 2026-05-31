from __future__ import annotations
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.store.memory import store
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.agreement import Agreement
from app.models.dropout import DropoutRecord, DropoutAuditResult, DropoutCreate
from app.models.split import SplitDetail, SplitStatus
from app.models.history import HistoryEntry
from app.engine.splitter import compute_split_for_dropout, find_active_agreement
from app.engine.propagation import propagate_split_change


router = APIRouter(prefix="/dropout", tags=["退课"])


class DropoutCreateRequest(BaseModel):
    data: DropoutCreate


@router.post("/", summary="提交退课申请")
def create_dropout(req: DropoutCreateRequest):
    enr = store.get_enrollment(req.data.enrollment_id)
    if not enr:
        raise HTTPException(404, f"选课记录 {req.data.enrollment_id} 不存在")
    if enr.status == EnrollmentStatus.DROPPED:
        raise HTTPException(400, f"选课记录 {req.data.enrollment_id} 已退课，请勿重复申请")

    did = store.next_id("dropout")

    agreements = store.list_agreements()
    agr = find_active_agreement(
        agreements, enr.home_school_id, enr.host_school_id
    )

    deadline = None
    audit_result = None
    audit_reason = None

    if agr and agr.dropout_deadline:
        deadline = agr.dropout_deadline

    if req.data.requested_at and deadline and req.data.requested_at > deadline:
        audit_result = DropoutAuditResult.REJECTED_LATE
        audit_reason = (
            f"退课申请时间（{req.data.requested_at.strftime('%Y-%m-%d')}）"
            f"已超过退课截止日期（{deadline.strftime('%Y-%m-%d')}），"
            f"根据联盟协议规定，超过截止日期的退课申请不予通过。"
            f"\n\n通俗解释：该学生退课太晚了。协议里写得很清楚，"
            f"在 {deadline.strftime('%Y年%m月%d日')} 之前可以退课并按比例退费，"
            f"但这位同学在 {req.data.requested_at.strftime('%Y年%m月%d日')} 才提交退课，"
            f"已经过了截止日期，所以退课费无法结算。"
            f"\n如果认为此判定有误，请提供："
            f"\n  1. 学校批准的延期退课特别许可；"
            f"\n  2. 协议中关于退课截止日期豁免的条款。"
        )
    elif agr is None:
        audit_result = DropoutAuditResult.REJECTED_NO_AGREEMENT
        audit_reason = (
            f"学生 {enr.student_name}（{enr.student_id}）的退课申请无法处理："
            f"学籍学校 {enr.home_school_id} 和开课学校 {enr.host_school_id} 之间"
            f"当前没有有效的分账协议，退课费无法按规则拆分。"
            f"\n\n通俗解释：两所学校之间没有正在执行的收费协议，"
            f"所以不知道退课之后钱应该怎么退、退给谁。"
            f"\n需要补充：两校签署的包含退课条款的有效协议。"
        )

    dropout = DropoutRecord(
        id=did,
        enrollment_id=req.data.enrollment_id,
        student_id=enr.student_id,
        requested_at=req.data.requested_at,
        deadline=deadline,
        audit_result=audit_result,
        audit_reason_human=audit_reason,
    )
    store.add_dropout(dropout)

    if audit_result in (None, DropoutAuditResult.APPROVED):
        enr.status = EnrollmentStatus.DROPPED
        enr.dropped_at = req.data.requested_at
        store.update_enrollment(enr.id, enr)

        sid = store.next_id("split")
        split = compute_split_for_dropout(enr, agr, dropout, sid)
        store.add_split(split)
        dropout.split_id = sid
        store.add_history(
            HistoryEntry(
                id=store.next_id("history"),
                entity_type="dropout",
                entity_id=did,
                action="dropout_audit",
                after=dropout.model_dump(mode="json"),
                remark="退课审核通过，已生成退课费分账明细",
            )
        )
        propagate_split_change(split)

    else:
        store.add_history(
            HistoryEntry(
                id=store.next_id("history"),
                entity_type="dropout",
                entity_id=did,
                action="dropout_audit",
                after=dropout.model_dump(mode="json"),
                remark=f"退课审核未通过：{audit_result.value}",
            )
        )

    return dropout.model_dump(mode="json")
