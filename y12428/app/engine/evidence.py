from __future__ import annotations
from pydantic import BaseModel, Field
from app.models.enrollment import Enrollment
from app.models.agreement import Agreement, AgreementStatus


class EvidenceGap(BaseModel):
    code: str = Field(description="缺口编码")
    description: str = Field(description="人话描述：缺什么证据、对分账有什么影响")
    severity: str = Field(default="warning", description="blocking | warning | info")


def check_evidence_gaps(
    enrollment: Enrollment,
    agreement: Agreement,
) -> list[EvidenceGap]:
    gaps: list[EvidenceGap] = []

    if enrollment.agreement_version is not None and enrollment.agreement_version != agreement.version:
        gaps.append(
            EvidenceGap(
                code="AGREEMENT_VERSION_MISMATCH",
                description=(
                    f"选课记录绑定的协议版本是 v{enrollment.agreement_version}，"
                    f"但当前生效协议版本是 v{agreement.version}。"
                    f"这意味着选课时适用的费用规则可能已变更，"
                    f"需要确认本条选课究竟按哪个版本计费。"
                    f"缺少的证据：选课时的协议签署确认书或版本锁定记录。"
                ),
                severity="blocking",
            )
        )

    if agreement.status != AgreementStatus.ACTIVE:
        gaps.append(
            EvidenceGap(
                code="AGREEMENT_NOT_ACTIVE",
                description=(
                    f"协议 {agreement.id} 当前状态为 {agreement.status.value}，"
                    f"并非生效状态，无法作为分账依据。"
                    f"缺少的证据：协议生效审批记录或签约方确认函。"
                ),
                severity="blocking",
            )
        )

    credit_rules = [r for r in agreement.fee_rules if r.fee_type == "credit_fee"]
    if not credit_rules:
        gaps.append(
            EvidenceGap(
                code="MISSING_CREDIT_FEE_RULE",
                description=(
                    f"协议 {agreement.id} 中没有定义学分费拆分规则，"
                    f"学分费部分无法计算。"
                    f"缺少的证据：包含学分费条款的协议补充附件。"
                ),
                severity="blocking",
            )
        )

    resource_rules = [r for r in agreement.fee_rules if r.fee_type == "resource_fee"]
    if not resource_rules:
        gaps.append(
            EvidenceGap(
                code="MISSING_RESOURCE_FEE_RULE",
                description=(
                    f"协议 {agreement.id} 中没有定义资源费拆分规则，"
                    f"资源费部分将按 0 计算。"
                    f"如实际存在资源费，需补充协议条款。"
                ),
                severity="warning",
            )
        )

    total_ratio = sum(r.ratio for r in credit_rules)
    if credit_rules and abs(total_ratio - 1.0) > 0.001:
        gaps.append(
            EvidenceGap(
                code="CREDIT_FEE_RATIO_NOT_100",
                description=(
                    f"学分费拆分比例合计为 {total_ratio:.2%}，不等于 100%。"
                    f"可能导致费用有遗漏或多算。"
                    f"缺少的证据：确认各方承担比例的会议纪要或协议修正案。"
                ),
                severity="blocking",
            )
        )

    return gaps
