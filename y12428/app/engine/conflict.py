from __future__ import annotations
from enum import Enum
from pydantic import BaseModel, Field
from app.models.enrollment import Enrollment
from app.models.agreement import Agreement, AgreementStatus


class ConflictSeverity(str, Enum):
    BLOCKING = "blocking"
    WARNING = "warning"


class Conflict(BaseModel):
    conflict_type: str = Field(description="冲突类型编码")
    entity_a: str = Field(description="冲突方A的标识(如: enrollment:ENR001)")
    entity_b: str = Field(description="冲突方B的标识(如: agreement:AGR001)")
    field_name: str = Field(description="冲突字段名")
    value_a: str = Field(description="A方的值")
    value_b: str = Field(description="B方的值")
    severity: ConflictSeverity = Field(description="严重程度")
    description: str = Field(description="人话说明：为什么冲突、影响什么")
    resolution_hint: str = Field(description="解决提示：需要什么操作或证据来消除冲突")


def detect_enrollment_agreement_conflicts(
    enrollment: Enrollment,
    agreement: Agreement,
) -> list[Conflict]:
    conflicts: list[Conflict] = []

    if enrollment.agreement_id and enrollment.agreement_id != agreement.id:
        conflicts.append(
            Conflict(
                conflict_type="AGREEMENT_ID_MISMATCH",
                entity_a=f"enrollment:{enrollment.id}",
                entity_b=f"agreement:{agreement.id}",
                field_name="agreement_id",
                value_a=enrollment.agreement_id,
                value_b=agreement.id,
                severity=ConflictSeverity.BLOCKING,
                description=(
                    f"选课记录 {enrollment.id} 关联的协议是 {enrollment.agreement_id}，"
                    f"但系统找到的生效协议是 {agreement.id}。"
                    f"两者不一致，可能是因为协议已换版但选课记录未更新。"
                    f"这会直接影响学分费和资源费按哪个规则拆分。"
                ),
                resolution_hint=(
                    "请确认：(1) 选课发生时实际适用的是哪个协议；"
                    "(2) 如协议已换版，提供换版生效日期的书面通知；"
                    "(3) 补充选课时的协议版本锁定记录。"
                ),
            )
        )

    if (
        enrollment.agreement_version is not None
        and enrollment.agreement_version != agreement.version
    ):
        conflicts.append(
            Conflict(
                conflict_type="AGREEMENT_VERSION_MISMATCH",
                entity_a=f"enrollment:{enrollment.id}",
                entity_b=f"agreement:{agreement.id}",
                field_name="agreement_version",
                value_a=f"v{enrollment.agreement_version}",
                value_b=f"v{agreement.version}",
                severity=ConflictSeverity.BLOCKING,
                description=(
                    f"选课记录 {enrollment.id} 绑定协议版本 v{enrollment.agreement_version}，"
                    f"当前生效版本是 v{agreement.version}。"
                    f"版本差异意味着费用规则可能不同（比例、单价都可能变了），"
                    f"直接按新版算可能导致学校多付或少收。"
                ),
                resolution_hint=(
                    "请确认：(1) 该选课是否应受新版协议约束；"
                    "(2) 如按旧版执行，提供旧版协议文本存档；"
                    "(3) 确认换版过渡期的计费规则说明。"
                ),
            )
        )

    if agreement.status != AgreementStatus.ACTIVE:
        conflicts.append(
            Conflict(
                conflict_type="AGREEMENT_NOT_ACTIVE",
                entity_a=f"enrollment:{enrollment.id}",
                entity_b=f"agreement:{agreement.id}",
                field_name="status",
                value_a="enrolled",
                value_b=agreement.status.value,
                severity=ConflictSeverity.BLOCKING,
                description=(
                    f"选课记录 {enrollment.id} 对应的协议 {agreement.id} "
                    f"当前状态为「{agreement.status.value}」而非「生效」，"
                    f"无法作为费用拆分的合法依据。"
                    f"可能是协议尚未审批或已被新版本替代。"
                ),
                resolution_hint=(
                    "请确认：(1) 协议审批状态，如已审批则更新状态为 active；"
                    "(2) 如被替代，查新版本协议并重新关联选课记录；"
                    "(3) 补充协议生效的正式批文。"
                ),
            )
        )

    school_coverage = {enrollment.home_school_id, enrollment.host_school_id}
    agreement_schools = set(agreement.school_ids)
    missing_schools = school_coverage - agreement_schools
    if missing_schools:
        conflicts.append(
            Conflict(
                conflict_type="SCHOOL_NOT_IN_AGREEMENT",
                entity_a=f"enrollment:{enrollment.id}",
                entity_b=f"agreement:{agreement.id}",
                field_name="school_ids",
                value_a=','.join(sorted(school_coverage)),
                value_b=','.join(sorted(agreement_schools)),
                severity=ConflictSeverity.BLOCKING,
                description=(
                    f"选课涉及学校 {missing_schools} 未包含在协议 {agreement.id} 的签约方中，"
                    f"这些学校没有费用拆分规则，分账无法覆盖全部参与方。"
                ),
                resolution_hint=(
                    f"请确认学校 {missing_schools} 是否应加入当前协议，"
                    "或查找这些学校参与的其他有效协议进行关联。"
                ),
            )
        )

    return conflicts


def merge_enrollments_with_agreements(
    enrollments: list[Enrollment],
    agreements: list[Agreement],
) -> dict:
    from app.engine.splitter import find_active_agreement

    results: dict = {
        "matched": [],
        "conflicts": [],
        "no_agreement": [],
    }

    for enr in enrollments:
        agr = find_active_agreement(
            agreements, enr.home_school_id, enr.host_school_id, enr.enrolled_at
        )
        if agr is None:
            results["no_agreement"].append(
                {
                    "enrollment_id": enr.id,
                    "home_school_id": enr.home_school_id,
                    "host_school_id": enr.host_school_id,
                    "hint": (
                        f"选课记录 {enr.id} 没有匹配到有效协议。"
                        f"可能是：(1) 两校之间未签协议；(2) 协议已过期但未续签；"
                        f"(3) 选课时间不在协议有效期内。"
                        f"请补充协议签署记录或确认选课时间是否正确。"
                    ),
                }
            )
            continue

        conflicts = detect_enrollment_agreement_conflicts(enr, agr)
        if conflicts:
            results["conflicts"].append(
                {
                    "enrollment_id": enr.id,
                    "agreement_id": agr.id,
                    "agreement_version": agr.version,
                    "conflicts": conflicts,
                }
            )
        else:
            results["matched"].append(
                {
                    "enrollment_id": enr.id,
                    "agreement_id": agr.id,
                    "agreement_version": agr.version,
                }
            )

    return results
