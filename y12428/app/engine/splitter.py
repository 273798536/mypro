from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.agreement import Agreement, AgreementStatus, FeeRule
from app.models.split import SplitDetail, SplitItem, SplitStatus
from app.models.dropout import DropoutRecord, DropoutAuditResult
from app.engine.evidence import check_evidence_gaps, EvidenceGap


def find_active_agreement(
    agreements: List[Agreement],
    home_school_id: str,
    host_school_id: str,
    at_time: Optional[datetime] = None,
) -> Optional[Agreement]:
    check_time = at_time or datetime.now()
    for agr in agreements:
        if agr.status != AgreementStatus.ACTIVE:
            continue
        if home_school_id not in agr.school_ids or host_school_id not in agr.school_ids:
            continue
        if agr.effective_from <= check_time:
            if agr.effective_to is None or agr.effective_to >= check_time:
                return agr
    return None


def split_credit_fee(
    enrollment: Enrollment,
    agreement: Agreement,
) -> List[SplitItem]:
    items: List[SplitItem] = []
    rules = [r for r in agreement.fee_rules if r.fee_type == "credit_fee"]
    if not rules:
        return items

    for rule in rules:
        if rule.per_unit_price is not None:
            amount = round(rule.per_unit_price * enrollment.credits * rule.ratio, 2)
        elif rule.fixed_amount is not None:
            amount = round(rule.fixed_amount * rule.ratio, 2)
        else:
            continue
        items.append(
            SplitItem(
                school_id=rule.payer_school_id,
                role="home_school" if rule.payer_school_id == enrollment.home_school_id else "host_school",
                fee_type="credit_fee",
                amount=amount,
                direction="pay" if rule.payer_school_id == enrollment.home_school_id else "receive",
                rule_source=f"{agreement.id}:v{agreement.version}",
            )
        )
    return items


def split_resource_fee(
    enrollment: Enrollment,
    agreement: Agreement,
) -> List[SplitItem]:
    items: List[SplitItem] = []
    rules = [r for r in agreement.fee_rules if r.fee_type == "resource_fee"]
    for rule in rules:
        amount = rule.fixed_amount * rule.ratio if rule.fixed_amount else 0
        items.append(
            SplitItem(
                school_id=rule.payer_school_id,
                role="home_school" if rule.payer_school_id == enrollment.home_school_id else "host_school",
                fee_type="resource_fee",
                amount=round(amount, 2),
                direction="pay" if rule.payer_school_id == enrollment.home_school_id else "receive",
                rule_source=f"{agreement.id}:v{agreement.version}",
            )
        )
    return items


def split_dropout_fee(
    enrollment: Enrollment,
    agreement: Agreement,
    dropout: DropoutRecord,
) -> List[SplitItem]:
    items: List[SplitItem] = []
    rules = [r for r in agreement.fee_rules if r.fee_type == "dropout_fee"]
    for rule in rules:
        amount = rule.fixed_amount * rule.ratio if rule.fixed_amount else 0
        items.append(
            SplitItem(
                school_id=rule.payer_school_id,
                role="home_school" if rule.payer_school_id == enrollment.home_school_id else "host_school",
                fee_type="dropout_fee",
                amount=round(amount, 2),
                direction="pay" if rule.payer_school_id == enrollment.home_school_id else "receive",
                rule_source=f"{agreement.id}:v{agreement.version}",
            )
        )
    return items


def compute_split_for_enrollment(
    enrollment: Enrollment,
    agreements: List[Agreement],
    split_id: str,
) -> SplitDetail:
    agreement = find_active_agreement(
        agreements,
        enrollment.home_school_id,
        enrollment.host_school_id,
        enrollment.enrolled_at,
    )

    items: List[SplitItem] = []
    evidence_gaps: List[str] = []

    if agreement is None:
        evidence_gaps.append(
            f"未找到 {enrollment.home_school_id} 与 {enrollment.host_school_id} 之间"
            f"在 {enrollment.enrolled_at.strftime('%Y-%m-%d')} 有效的分账协议，"
            f"无法计算学分费和资源费"
        )
        return SplitDetail(
            id=split_id,
            enrollment_id=enrollment.id,
            agreement_id="",
            agreement_version=0,
            items=[],
            total_amount=0,
            status=SplitStatus.DISPUTED,
            evidence_gaps=evidence_gaps,
        )

    gaps = check_evidence_gaps(enrollment, agreement)
    evidence_gaps.extend(g.description for g in gaps)

    items.extend(split_credit_fee(enrollment, agreement))
    items.extend(split_resource_fee(enrollment, agreement))

    total = round(sum(it.amount for it in items if it.direction == "pay"), 2)

    status = SplitStatus.PENDING
    if evidence_gaps:
        status = SplitStatus.DISPUTED

    return SplitDetail(
        id=split_id,
        enrollment_id=enrollment.id,
        agreement_id=agreement.id,
        agreement_version=agreement.version,
        items=items,
        total_amount=total,
        status=status,
        evidence_gaps=evidence_gaps,
    )


def compute_split_for_dropout(
    enrollment: Enrollment,
    agreement: Optional[Agreement],
    dropout: DropoutRecord,
    split_id: str,
) -> SplitDetail:
    items: List[SplitItem] = []
    evidence_gaps: List[str] = []

    if agreement is None:
        evidence_gaps.append(
            f"退课记录 {dropout.id} 无对应有效协议，退课费无法拆分"
        )
        return SplitDetail(
            id=split_id,
            enrollment_id=enrollment.id,
            agreement_id="",
            agreement_version=0,
            items=[],
            total_amount=0,
            status=SplitStatus.DISPUTED,
            evidence_gaps=evidence_gaps,
        )

    if enrollment.agreement_version is not None and enrollment.agreement_version != agreement.version:
        evidence_gaps.append(
            f"选课记录绑定的协议版本(v{enrollment.agreement_version})与当前生效版本(v{agreement.version})不一致，"
            f"请确认退课费应按哪个版本执行"
        )

    items.extend(split_dropout_fee(enrollment, agreement, dropout))
    total = round(sum(it.amount for it in items if it.direction == "pay"), 2)

    status = SplitStatus.PENDING
    if evidence_gaps:
        status = SplitStatus.DISPUTED

    return SplitDetail(
        id=split_id,
        enrollment_id=enrollment.id,
        agreement_id=agreement.id,
        agreement_version=agreement.version,
        items=items,
        total_amount=total,
        status=status,
        evidence_gaps=evidence_gaps,
    )
