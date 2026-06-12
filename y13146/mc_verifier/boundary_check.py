from dataclasses import dataclass, field
from typing import List, Dict, Optional, Callable
from datetime import datetime

from .models import (
    ValidationResult,
    AnomalyPoint,
    ValidationStatus,
    ParameterVersion,
)


@dataclass
class ExtrapolationIssue:
    record_id: str
    param_name: str
    actual_value: float
    boundary_value: float
    direction: str
    severity: str
    reason: str
    next_step: str
    needs_manual_confirm: bool = True
    confirmed: bool = False
    confirmed_by: str = ""
    confirmed_at: Optional[datetime] = None
    confirm_note: str = ""

    def to_dict(self) -> Dict:
        return {
            "record_id": self.record_id,
            "param_name": self.param_name,
            "actual_value": self.actual_value,
            "boundary_value": self.boundary_value,
            "direction": self.direction,
            "severity": self.severity,
            "reason": self.reason,
            "next_step": self.next_step,
            "needs_manual_confirm": self.needs_manual_confirm,
            "confirmed": self.confirmed,
            "confirmed_by": self.confirmed_by,
            "confirmed_at": self.confirmed_at.isoformat() if self.confirmed_at else None,
            "confirm_note": self.confirm_note,
        }


class BoundaryChecker:
    def __init__(
        self,
        extrapolation_p95: bool = True,
        max_extrapolation_ratio: float = 0.5,
        block_on_extrapolation: bool = True,
    ):
        self.extrapolation_p95 = extrapolation_p95
        self.max_extrapolation_ratio = max_extrapolation_ratio
        self.block_on_extrapolation = block_on_extrapolation

    def check_extrapolation(
        self,
        validation_result: ValidationResult,
        version: ParameterVersion,
    ) -> List[ExtrapolationIssue]:
        issues = []

        for anomaly in validation_result.anomalies:
            if not anomaly.is_extrapolation:
                continue

            direction = anomaly.extrapolation_direction or "unknown"
            boundary_val = (
                anomaly.boundary_upper if direction == "upper" else anomaly.boundary_lower
            )

            severity = self._calc_severity(anomaly, direction)
            reason = self._build_reason(anomaly, direction)
            next_step = self._build_next_step(anomaly, direction, severity)

            issue = ExtrapolationIssue(
                record_id=anomaly.record_id,
                param_name=anomaly.param_name,
                actual_value=anomaly.actual_value,
                boundary_value=boundary_val,
                direction=direction,
                severity=severity,
                reason=reason,
                next_step=next_step,
                needs_manual_confirm=True,
            )
            issues.append(issue)

        validation_result.extrapolation_issues = issues

        if self.block_on_extrapolation and len(issues) > 0:
            validation_result.status = ValidationStatus.PENDING

        return issues

    def _calc_severity(self, anomaly: AnomalyPoint, direction: str) -> str:
        z_abs = abs(anomaly.z_score)
        if z_abs >= 5.0:
            return "critical"
        elif z_abs >= 4.0:
            return "high"
        elif z_abs >= 3.0:
            return "medium"
        else:
            return "low"

    def _build_reason(self, anomaly: AnomalyPoint, direction: str) -> str:
        dir_text = "上沿" if direction == "upper" else "下沿"
        return (
            f"参数 [{anomaly.param_name}] = {anomaly.actual_value:.4f}，"
            f"超出样本{dir_text}（P{95 if direction == 'upper' else 5}="
            f"{anomaly.boundary_upper if direction == 'upper' else anomaly.boundary_lower:.4f}），"
            f"偏离 {abs(anomaly.z_score):.2f}σ，属于外推区间，无法仅靠统计判断合理性。"
        )

    def _build_next_step(
        self, anomaly: AnomalyPoint, direction: str, severity: str
    ) -> str:
        if severity == "critical":
            return (
                "严重越界：建议立即冻结该条记录，核对原始明细数据来源，"
                "确认是否存在录入错误或极端异常事件。"
            )
        elif severity == "high":
            return (
                "高度越界：建议补充该记录的业务背景说明，"
                "由投研负责人人工确认后再纳入统计。"
            )
        elif severity == "medium":
            return (
                "中度越界：建议检查该记录的明细数据是否完整，"
                "或补充同期同类样本后重新校验。"
            )
        else:
            return (
                "轻度越界：可标注后继续校验，"
                "但需在下一轮复核中重点关注。"
            )

    def confirm_issue(
        self,
        issue: ExtrapolationIssue,
        confirmed_by: str,
        note: str,
        is_accepted: bool,
    ) -> ExtrapolationIssue:
        issue.confirmed = True
        issue.confirmed_by = confirmed_by
        issue.confirmed_at = datetime.now()
        issue.confirm_note = note
        issue.needs_manual_confirm = False
        return issue

    def apply_manual_override(
        self,
        validation_result: ValidationResult,
        override_note: str,
        override_by: str,
        accepted_record_ids: Optional[List[str]] = None,
    ) -> ValidationResult:
        previous = validation_result.status.value
        validation_result.previous_judgment = previous
        validation_result.status = ValidationStatus.MANUAL_OVERRIDDEN
        validation_result.manual_review_note = (
            f"[{override_by}] 人工改判：{override_note}"
        )

        if accepted_record_ids:
            for issue in validation_result.extrapolation_issues:
                if issue.record_id in accepted_record_ids:
                    self.confirm_issue(
                        issue,
                        confirmed_by=override_by,
                        note=override_note,
                        is_accepted=True,
                    )

        return validation_result

    def format_exit_summary(
        self, validation_result: ValidationResult
    ) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("蒙特卡洛误差边界校验 - 退出摘要")
        lines.append("=" * 60)

        total = validation_result.total_records
        anomaly_cnt = validation_result.anomaly_count
        extrap_cnt = len(validation_result.extrapolation_issues)

        lines.append(f"版本号        : v{validation_result.version}")
        lines.append(f"记录总数      : {total}")
        lines.append(f"异常点数量    : {anomaly_cnt}")
        lines.append(f"外推越界数量  : {extrap_cnt}")
        lines.append(f"当前状态      : {validation_result.status.value}")
        lines.append("-" * 60)

        if extrap_cnt > 0:
            lines.append("【外推越界卡点明细】")
            lines.append("-" * 60)
            for i, issue in enumerate(validation_result.extrapolation_issues, 1):
                dir_text = "上沿" if issue.direction == "upper" else "下沿"
                lines.append(
                    f"  {i}. 记录 [{issue.record_id}] 参数 [{issue.param_name}]"
                )
                lines.append(f"     实际值  : {issue.actual_value:.4f}")
                lines.append(f"     边界值  : {issue.boundary_value:.4f} ({dir_text})")
                lines.append(f"     严重度  : {issue.severity}")
                lines.append(f"     原因    : {issue.reason}")
                lines.append(f"     下一步  : {issue.next_step}")
                lines.append("")
        else:
            lines.append("无外推越界问题，校验通过。")

        if validation_result.status == ValidationStatus.PENDING:
            lines.append("-" * 60)
            lines.append("【校验未完成】存在外推越界，需人工确认后方可继续。")
            lines.append("  - 补充对应记录的明细数据或业务说明")
            lines.append("  - 或由负责人执行人工改判")
        elif validation_result.status == ValidationStatus.MANUAL_OVERRIDDEN:
            lines.append("-" * 60)
            lines.append(f"【已人工改判】{validation_result.manual_review_note}")
            lines.append(f"  原判断：{validation_result.previous_judgment}")

        lines.append("=" * 60)
        return "\n".join(lines)
