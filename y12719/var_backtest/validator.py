from typing import List, Dict, Optional, Callable, Any
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
from sqlalchemy.orm import Session
from var_backtest.models import (
    VarResult, ValidationRule, ValidationRecord, AnomalyRecord
)


class ActionRequired(str, Enum):
    SUPPLEMENT_MATERIAL = "补材料"
    ADJUST_CALIBER = "改口径"
    REGENERATE_CHART = "重出图"
    RE_CHECK = "复核"
    NO_ACTION = "无需处理"


class AnomalySeverity(str, Enum):
    BLOCKER = "blocker"
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"


@dataclass
class ValidationOutcome:
    rule_code: str
    rule_name: str
    passed: bool
    detail: str
    severity: str
    action_required: ActionRequired
    anomaly_title: Optional[str] = None
    anomaly_detail: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)


class IncrementalValidator:
    def __init__(self, db: Session):
        self.db = db
        self._rule_handlers: Dict[str, Callable] = {}
        self._register_default_rules()

    def _register_default_rules(self):
        self._rule_handlers["R001"] = self._check_extrapolation_bounds
        self._rule_handlers["R002"] = self._check_answer_match
        self._rule_handlers["R003"] = self._check_chart_verification
        self._rule_handlers["R004"] = self._check_sample_sufficiency
        self._rule_handlers["R005"] = self._check_var_confidence_interval

    def ensure_rules_exist(self):
        default_rules = [
            {
                "rule_code": "R001",
                "rule_name": "外推越界校验",
                "category": "extrapolation",
                "description": "当样本不足需要外推时，校验结果是否在合理范围内",
                "severity": "critical",
                "params": {"max_ratio": 2.0, "tolerance_pct": 0.05},
            },
            {
                "rule_code": "R002",
                "rule_name": "历史答案一致性校验",
                "category": "consistency",
                "description": "校验计算结果与历史答案是否在容差范围内一致",
                "severity": "critical",
                "params": {"tolerance_pct": 0.05},
            },
            {
                "rule_code": "R003",
                "rule_name": "图表联动校验",
                "category": "chart",
                "description": "校验图表是否已生成且与结果一致",
                "severity": "warning",
                "params": {},
            },
            {
                "rule_code": "R004",
                "rule_name": "样本充足性校验",
                "category": "data",
                "description": "校验用于回测的样本数据是否充足",
                "severity": "warning",
                "params": {"min_samples": 30},
            },
            {
                "rule_code": "R005",
                "rule_name": "VaR 置信区间校验",
                "category": "statistical",
                "description": "校验 VaR 估计值是否在自助法置信区间内",
                "severity": "warning",
                "params": {},
            },
        ]
        for rule_data in default_rules:
            existing = self.db.query(ValidationRule).filter_by(rule_code=rule_data["rule_code"]).first()
            if not existing:
                self.db.add(ValidationRule(**rule_data))
        self.db.commit()

    def validate_result(
        self,
        var_result: VarResult,
        incremental: bool = True,
        context: Optional[Dict] = None,
    ) -> List[ValidationOutcome]:
        context = context or {}
        outcomes: List[ValidationOutcome] = []

        active_rules = self.db.query(ValidationRule).filter_by(is_active=True).all()

        for rule in active_rules:
            if incremental:
                last_check = (
                    self.db.query(ValidationRecord)
                    .filter_by(var_result_id=var_result.id, rule_id=rule.id)
                    .order_by(ValidationRecord.checked_at.desc())
                    .first()
                )
                if last_check and not self._should_revalidate(var_result, rule, last_check):
                    continue

            handler = self._rule_handlers.get(rule.rule_code)
            if handler is None:
                continue

            outcome = handler(var_result, rule, context)
            outcomes.append(outcome)

            self._persist_validation(var_result, rule, outcome)

        self.db.commit()
        return outcomes

    def _should_revalidate(
        self,
        var_result: VarResult,
        rule: ValidationRule,
        last_record: ValidationRecord,
    ) -> bool:
        if rule.category == "chart":
            return var_result.updated_at >= last_record.checked_at or not var_result.chart_verified
        if rule.category in ("extrapolation", "consistency", "data"):
            return var_result.updated_at >= last_record.checked_at
        return True

    def _persist_validation(
        self,
        var_result: VarResult,
        rule: ValidationRule,
        outcome: ValidationOutcome,
    ):
        record = ValidationRecord(
            var_result_id=var_result.id,
            rule_id=rule.id,
            passed=outcome.passed,
            detail=outcome.detail,
        )
        self.db.add(record)

        if not outcome.passed:
            anomaly = AnomalyRecord(
                var_result_id=var_result.id,
                anomaly_type=rule.category,
                severity=outcome.severity,
                action_required=outcome.action_required.value,
                title=outcome.anomaly_title or rule.rule_name,
                detail=outcome.anomaly_detail or outcome.detail,
                resolution_status="open",
            )
            self.db.add(anomaly)

    def _check_extrapolation_bounds(
        self, var_result: VarResult, rule: ValidationRule, context: Dict
    ) -> ValidationOutcome:
        if not var_result.is_extrapolation:
            return ValidationOutcome(
                rule_code=rule.rule_code,
                rule_name=rule.rule_name,
                passed=True,
                detail="样本充足，无需外推",
                severity=rule.severity,
                action_required=ActionRequired.NO_ACTION,
            )
        if not var_result.extrapolation_bounds_breached:
            return ValidationOutcome(
                rule_code=rule.rule_code,
                rule_name=rule.rule_name,
                passed=True,
                detail="外推结果在合理范围内",
                severity=rule.severity,
                action_required=ActionRequired.NO_ACTION,
            )

        max_ratio = rule.params.get("max_ratio", 2.0)
        detail = (
            f"外推越界：计算值 {var_result.var_value:.6f}，历史答案 "
            f"{var_result.historical_var_value:.6f}，超过最大允许比例 {max_ratio}x。"
            f"原因可能是样本不足或市场异常波动。"
        )
        anomaly_detail = (
            f"题目 {var_result.question_external_id} 使用外推法时超出合理边界。\n"
            f"计算 VaR = {var_result.var_value:.6f}\n"
            f"历史答案 VaR = {var_result.historical_var_value:.6f}\n"
            f"置信区间: [{var_result.var_lower:.6f}, {var_result.var_upper:.6f}]\n"
            f"建议：先补材料（扩充历史样本），如样本已足够则改口径（调整外推参数）"
        )
        return ValidationOutcome(
            rule_code=rule.rule_code,
            rule_name=rule.rule_name,
            passed=False,
            detail=detail,
            severity=AnomalySeverity.BLOCKER.value,
            action_required=ActionRequired.SUPPLEMENT_MATERIAL,
            anomaly_title=f"外推越界: 题目 {var_result.question_external_id}",
            anomaly_detail=anomaly_detail,
        )

    def _check_answer_match(
        self, var_result: VarResult, rule: ValidationRule, context: Dict
    ) -> ValidationOutcome:
        if var_result.historical_var_value is None:
            return ValidationOutcome(
                rule_code=rule.rule_code,
                rule_name=rule.rule_name,
                passed=True,
                detail="无历史答案，跳过一致性校验",
                severity=rule.severity,
                action_required=ActionRequired.NO_ACTION,
            )
        if var_result.answer_match:
            return ValidationOutcome(
                rule_code=rule.rule_code,
                rule_name=rule.rule_name,
                passed=True,
                detail=f"与历史答案一致（容差 {rule.params.get('tolerance_pct', 0.05)*100:.0f}%）",
                severity=rule.severity,
                action_required=ActionRequired.NO_ACTION,
            )

        tolerance = rule.params.get("tolerance_pct", 0.05)
        diff_pct = (
            abs(var_result.var_value - var_result.historical_var_value)
            / abs(var_result.historical_var_value)
            if var_result.historical_var_value != 0
            else float("inf")
        )
        detail = (
            f"与历史答案不一致：计算值 {var_result.var_value:.6f}，"
            f"历史值 {var_result.historical_var_value:.6f}，偏差 {diff_pct*100:.2f}%，"
            f"超过容差 {tolerance*100:.0f}%"
        )
        anomaly_detail = (
            f"题目 {var_result.question_external_id} 答案不匹配。\n"
            f"本次计算: {var_result.var_value:.6f}\n"
            f"历史答案: {var_result.historical_var_value:.6f}\n"
            f"偏差: {diff_pct*100:.2f}%\n"
            f"建议：先复核数据（补材料），如数据无误则需要改口径"
        )
        return ValidationOutcome(
            rule_code=rule.rule_code,
            rule_name=rule.rule_name,
            passed=False,
            detail=detail,
            severity=AnomalySeverity.CRITICAL.value,
            action_required=ActionRequired.RE_CHECK,
            anomaly_title=f"答案不匹配: 题目 {var_result.question_external_id}",
            anomaly_detail=anomaly_detail,
        )

    def _check_chart_verification(
        self, var_result: VarResult, rule: ValidationRule, context: Dict
    ) -> ValidationOutcome:
        if not var_result.chart_generated:
            return ValidationOutcome(
                rule_code=rule.rule_code,
                rule_name=rule.rule_name,
                passed=False,
                detail="图表未生成",
                severity=AnomalySeverity.WARNING.value,
                action_required=ActionRequired.REGENERATE_CHART,
                anomaly_title=f"图表缺失: 题目 {var_result.question_external_id}",
                anomaly_detail=f"题目 {var_result.question_external_id} 尚未生成图表，请重出图。",
            )
        if not var_result.chart_verified:
            return ValidationOutcome(
                rule_code=rule.rule_code,
                rule_name=rule.rule_name,
                passed=False,
                detail="图表已生成但未校验",
                severity=AnomalySeverity.WARNING.value,
                action_required=ActionRequired.RE_CHECK,
                anomaly_title=f"图表未校验: 题目 {var_result.question_external_id}",
                anomaly_detail=f"题目 {var_result.question_external_id} 的图表已生成但尚未与计算结果对齐校验。",
            )
        return ValidationOutcome(
            rule_code=rule.rule_code,
            rule_name=rule.rule_name,
            passed=True,
            detail="图表已生成并校验",
            severity=rule.severity,
            action_required=ActionRequired.NO_ACTION,
        )

    def _check_sample_sufficiency(
        self, var_result: VarResult, rule: ValidationRule, context: Dict
    ) -> ValidationOutcome:
        min_samples = rule.params.get("min_samples", 30)
        sample_size = context.get("sample_size")
        if sample_size is None:
            return ValidationOutcome(
                rule_code=rule.rule_code,
                rule_name=rule.rule_name,
                passed=True,
                detail="无样本信息，跳过",
                severity=rule.severity,
                action_required=ActionRequired.NO_ACTION,
            )
        if sample_size >= min_samples:
            return ValidationOutcome(
                rule_code=rule.rule_code,
                rule_name=rule.rule_name,
                passed=True,
                detail=f"样本充足（{sample_size} >= {min_samples}）",
                severity=rule.severity,
                action_required=ActionRequired.NO_ACTION,
            )
        detail = f"样本不足：{sample_size} < {min_samples}，建议扩充历史数据"
        return ValidationOutcome(
            rule_code=rule.rule_code,
            rule_name=rule.rule_name,
            passed=False,
            detail=detail,
            severity=AnomalySeverity.WARNING.value,
            action_required=ActionRequired.SUPPLEMENT_MATERIAL,
            anomaly_title=f"样本不足: 题目 {var_result.question_external_id}",
            anomaly_detail=(
                f"题目 {var_result.question_external_id} 的样本数仅 {sample_size}，"
                f"少于最小要求 {min_samples}。\n建议：补充更多历史数据（补材料）。"
            ),
        )

    def _check_var_confidence_interval(
        self, var_result: VarResult, rule: ValidationRule, context: Dict
    ) -> ValidationOutcome:
        if var_result.var_lower is None or var_result.var_upper is None:
            return ValidationOutcome(
                rule_code=rule.rule_code,
                rule_name=rule.rule_name,
                passed=True,
                detail="无置信区间数据，跳过",
                severity=rule.severity,
                action_required=ActionRequired.NO_ACTION,
            )
        ci_width = var_result.var_upper - var_result.var_lower
        relative_width = ci_width / var_result.var_value if var_result.var_value != 0 else float("inf")
        if relative_width <= 0.5:
            return ValidationOutcome(
                rule_code=rule.rule_code,
                rule_name=rule.rule_name,
                passed=True,
                detail=f"置信区间相对宽度 {relative_width*100:.1f}%，在合理范围内",
                severity=rule.severity,
                action_required=ActionRequired.NO_ACTION,
            )
        detail = f"置信区间过宽：相对宽度 {relative_width*100:.1f}%，估计不稳定"
        return ValidationOutcome(
            rule_code=rule.rule_code,
            rule_name=rule.rule_name,
            passed=False,
            detail=detail,
            severity=AnomalySeverity.WARNING.value,
            action_required=ActionRequired.SUPPLEMENT_MATERIAL,
            anomaly_title=f"估计不稳定: 题目 {var_result.question_external_id}",
            anomaly_detail=(
                f"题目 {var_result.question_external_id} 的 VaR 估计置信区间过宽。\n"
                f"VaR = {var_result.var_value:.6f}\n"
                f"95% CI = [{var_result.var_lower:.6f}, {var_result.var_upper:.6f}]\n"
                f"相对宽度 = {relative_width*100:.1f}%\n"
                f"建议：补充更多历史数据（补材料）以提升估计精度。"
            ),
        )
