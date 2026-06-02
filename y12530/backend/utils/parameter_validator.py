from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple, Callable
from enum import Enum
import re


class Severity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class ParameterRange:
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    unit: Optional[str] = None
    description: str = ""
    typical_range: Optional[Tuple[float, float]] = None


@dataclass
class ValidationIssue:
    field: str
    issue_type: str
    message: str
    severity: Severity
    current_value: Any = None
    expected_range: Optional[ParameterRange] = None
    suggestion: str = ""
    triggered_by: Optional[str] = None
    blocked_step: Optional[str] = None
    next_action: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "field": self.field,
            "issue_type": self.issue_type,
            "message": self.message,
            "severity": self.severity.value,
            "current_value": self.current_value,
            "expected_range": {
                "min": self.expected_range.min_value,
                "max": self.expected_range.max_value,
                "unit": self.expected_range.unit,
                "description": self.expected_range.description,
                "typical_range": self.expected_range.typical_range
            } if self.expected_range else None,
            "suggestion": self.suggestion,
            "triggered_by": self.triggered_by,
            "blocked_step": self.blocked_step,
            "next_action": self.next_action
        }


@dataclass
class ValidationResult:
    is_valid: bool
    issues: List[ValidationIssue] = field(default_factory=list)
    warnings: List[ValidationIssue] = field(default_factory=list)
    info: List[ValidationIssue] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "issues": [i.to_dict() for i in self.issues],
            "warnings": [w.to_dict() for w in self.warnings],
            "info": [i.to_dict() for i in self.info]
        }

    def has_errors(self) -> bool:
        return any(i.severity in [Severity.ERROR, Severity.CRITICAL] for i in self.issues)

    def has_warnings(self) -> bool:
        return len(self.warnings) > 0


class ParameterValidator:
    PARAMETER_RANGES = {
        "half_life": ParameterRange(
            min_value=0.01, max_value=1000, unit="hours",
            description="药物消除半衰期",
            typical_range=(1, 48)
        ),
        "vd": ParameterRange(
            min_value=0.05, max_value=20, unit="L/kg",
            description="表观分布容积",
            typical_range=(0.1, 10)
        ),
        "weight": ParameterRange(
            min_value=1, max_value=300, unit="kg",
            description="受试者体重",
            typical_range=(40, 120)
        ),
        "ka": ParameterRange(
            min_value=0.01, max_value=100, unit="1/hour",
            description="吸收速率常数",
            typical_range=(0.1, 5)
        ),
        "f": ParameterRange(
            min_value=0, max_value=1, unit="fraction",
            description="生物利用度",
            typical_range=(0.3, 1)
        ),
        "k12": ParameterRange(
            min_value=0.01, max_value=100, unit="1/hour",
            description="中央到周边室速率常数",
            typical_range=(0.1, 10)
        ),
        "k21": ParameterRange(
            min_value=0.01, max_value=100, unit="1/hour",
            description="周边到中央室速率常数",
            typical_range=(0.1, 5)
        ),
        "v1": ParameterRange(
            min_value=0.05, max_value=20, unit="L/kg",
            description="中央室分布容积",
            typical_range=(0.1, 5)
        ),
        "time_step": ParameterRange(
            min_value=0.001, max_value=24, unit="hours",
            description="模拟时间步长",
            typical_range=(0.05, 1)
        ),
        "total_duration": ParameterRange(
            min_value=0.1, max_value=720, unit="hours",
            description="总模拟时长",
            typical_range=(12, 168)
        ),
        "dose": ParameterRange(
            min_value=0.001, max_value=10000, unit="mg",
            description="给药剂量",
            typical_range=(1, 1000)
        ),
        "duration": ParameterRange(
            min_value=0.01, max_value=48, unit="hours",
            description="滴注持续时间",
            typical_range=(0.5, 24)
        )
    }

    MAX_TIME_STEP_RATIO = 0.1

    def __init__(self):
        self.custom_validators: Dict[str, Callable] = {}

    def add_validator(self, field: str, validator_func: Callable) -> None:
        self.custom_validators[field] = validator_func

    def validate_all(self, params: Dict[str, Any], dosing_plan: Dict[str, Any], 
                     time_step: float, triggered_by: Optional[str] = None) -> ValidationResult:
        issues: List[ValidationIssue] = []
        warnings: List[ValidationIssue] = []
        info: List[ValidationIssue] = []

        issues.extend(self.validate_parameters(params, triggered_by))
        issues.extend(self.validate_dosing_plan(dosing_plan, triggered_by))

        time_step_result = self.validate_time_step(time_step, params, dosing_plan, triggered_by)
        if time_step_result.severity == Severity.ERROR:
            issues.append(time_step_result)
        elif time_step_result.severity == Severity.WARNING:
            warnings.append(time_step_result)
        else:
            info.append(time_step_result)

        unit_result = self.validate_unit_consistency(params, dosing_plan, triggered_by)
        if unit_result:
            issues.extend(unit_result)

        for field, validator in self.custom_validators.items():
            try:
                result = validator(params.get(field))
                if result:
                    if isinstance(result, ValidationIssue):
                        if result.severity in [Severity.ERROR, Severity.CRITICAL]:
                            issues.append(result)
                        elif result.severity == Severity.WARNING:
                            warnings.append(result)
                        else:
                            info.append(result)
            except Exception as e:
                issues.append(ValidationIssue(
                    field=field,
                    issue_type="validator_error",
                    message=f"自定义验证器执行失败: {str(e)}",
                    severity=Severity.ERROR,
                    current_value=params.get(field),
                    triggered_by=triggered_by,
                    blocked_step="参数校验",
                    next_action="检查自定义验证器逻辑"
                ))

        has_errors = any(i.severity in [Severity.ERROR, Severity.CRITICAL] for i in issues)

        return ValidationResult(
            is_valid=not has_errors,
            issues=issues,
            warnings=warnings,
            info=info
        )

    def validate_parameters(self, params: Dict[str, Any], 
                            triggered_by: Optional[str] = None) -> List[ValidationIssue]:
        issues: List[ValidationIssue] = []

        for field, range_info in self.PARAMETER_RANGES.items():
            if field not in params:
                continue

            value = params[field]

            if not isinstance(value, (int, float)):
                issues.append(ValidationIssue(
                    field=field,
                    issue_type="type_error",
                    message=f"参数 '{field}' 类型错误，预期为数值类型，实际为 {type(value).__name__}",
                    severity=Severity.ERROR,
                    current_value=value,
                    expected_range=range_info,
                    suggestion=f"请确保 '{field}' 是有效的数值",
                    triggered_by=triggered_by,
                    blocked_step="参数解析",
                    next_action=f"重新输入 '{field}' 的数值"
                ))
                continue

            if range_info.min_value is not None and value < range_info.min_value:
                issues.append(ValidationIssue(
                    field=field,
                    issue_type="below_minimum",
                    message=f"参数 '{field}' = {value} {range_info.unit} 低于最小值 {range_info.min_value} {range_info.unit}",
                    severity=Severity.ERROR,
                    current_value=value,
                    expected_range=range_info,
                    suggestion=f"典型范围: {range_info.typical_range[0]}-{range_info.typical_range[1]} {range_info.unit}",
                    triggered_by=triggered_by,
                    blocked_step="参数范围校验",
                    next_action=f"增大 '{field}' 的值至合理范围"
                ))

            if range_info.max_value is not None and value > range_info.max_value:
                issues.append(ValidationIssue(
                    field=field,
                    issue_type="above_maximum",
                    message=f"参数 '{field}' = {value} {range_info.unit} 超过最大值 {range_info.max_value} {range_info.unit}",
                    severity=Severity.ERROR,
                    current_value=value,
                    expected_range=range_info,
                    suggestion=f"典型范围: {range_info.typical_range[0]}-{range_info.typical_range[1]} {range_info.unit}",
                    triggered_by=triggered_by,
                    blocked_step="参数范围校验",
                    next_action=f"减小 '{field}' 的值至合理范围"
                ))

            if range_info.typical_range:
                typical_min, typical_max = range_info.typical_range
                if value < typical_min * 0.5 or value > typical_max * 2:
                    issues.append(ValidationIssue(
                        field=field,
                        issue_type="atypical_value",
                        message=f"参数 '{field}' = {value} {range_info.unit} 超出典型范围 {typical_min}-{typical_max} {range_info.unit}",
                        severity=Severity.WARNING,
                        current_value=value,
                        expected_range=range_info,
                        suggestion="该值可能正确，但请确认是否符合实际情况",
                        triggered_by=triggered_by,
                        blocked_step=None,
                        next_action="确认参数值是否正确，如确认无误可继续"
                    ))

        return issues

    def validate_dosing_plan(self, dosing_plan: Dict[str, Any],
                             triggered_by: Optional[str] = None) -> List[ValidationIssue]:
        issues: List[ValidationIssue] = []
        events = dosing_plan.get("events", [])
        dose_unit = dosing_plan.get("dose_unit", "mg")
        time_unit = dosing_plan.get("time_unit", "hours")

        if not events:
            issues.append(ValidationIssue(
                field="dosing_plan",
                issue_type="no_events",
                message="给药计划为空，没有指定任何给药事件",
                severity=Severity.ERROR,
                current_value=None,
                suggestion="请至少添加一个给药事件",
                triggered_by=triggered_by,
                blocked_step="给药计划解析",
                next_action="添加给药事件（时间、剂量、途径）"
            ))
            return issues

        total_dose = 0
        for idx, event in enumerate(events):
            event_id = f"事件{idx + 1}"

            if "time" not in event or event["time"] < 0:
                issues.append(ValidationIssue(
                    field=f"dosing_plan.event.{idx}.time",
                    issue_type="invalid_time",
                    message=f"{event_id}: 给药时间无效",
                    severity=Severity.ERROR,
                    current_value=event.get("time"),
                    expected_range=self.PARAMETER_RANGES["total_duration"],
                    suggestion=f"给药时间必须在0到{dosing_plan.get('total_duration', 24)} {time_unit}之间",
                    triggered_by=triggered_by,
                    blocked_step="给药时间校验",
                    next_action=f"修正{event_id}的给药时间"
                ))

            if "dose" not in event or event["dose"] <= 0:
                issues.append(ValidationIssue(
                    field=f"dosing_plan.event.{idx}.dose",
                    issue_type="invalid_dose",
                    message=f"{event_id}: 给药剂量无效",
                    severity=Severity.ERROR,
                    current_value=event.get("dose"),
                    expected_range=self.PARAMETER_RANGES["dose"],
                    suggestion=f"剂量必须大于0，典型范围1-1000 {dose_unit}",
                    triggered_by=triggered_by,
                    blocked_step="给药剂量校验",
                    next_action=f"增大{event_id}的给药剂量"
                ))
            else:
                dose = event["dose"]
                total_dose += dose
                dose_range = self.PARAMETER_RANGES["dose"]
                if dose_range.typical_range:
                    tmin, tmax = dose_range.typical_range
                    if dose < tmin * 0.1 or dose > tmax * 10:
                        issues.append(ValidationIssue(
                            field=f"dosing_plan.event.{idx}.dose",
                            issue_type="dose_outlier",
                            message=f"{event_id}: 剂量 {dose} {dose_unit} 可能异常",
                            severity=Severity.WARNING,
                            current_value=dose,
                            expected_range=dose_range,
                            suggestion=f"单次剂量典型范围: {tmin}-{tmax} {dose_unit}",
                            triggered_by=triggered_by,
                            blocked_step=None,
                            next_action=f"确认{event_id}的剂量是否正确"
                        ))

            route = event.get("route", "")
            valid_routes = ["iv_bolus", "iv_infusion", "oral", "sc", "im"]
            if route not in valid_routes:
                issues.append(ValidationIssue(
                    field=f"dosing_plan.event.{idx}.route",
                    issue_type="invalid_route",
                    message=f"{event_id}: 给药途径 '{route}' 不支持",
                    severity=Severity.ERROR,
                    current_value=route,
                    suggestion=f"支持的途径: {', '.join(valid_routes)}",
                    triggered_by=triggered_by,
                    blocked_step="给药途径校验",
                    next_action=f"修正{event_id}的给药途径"
                ))

            if route == "iv_infusion":
                duration = event.get("duration")
                if duration is None or duration <= 0:
                    issues.append(ValidationIssue(
                        field=f"dosing_plan.event.{idx}.duration",
                        issue_type="missing_duration",
                        message=f"{event_id}: 静脉滴注必须指定持续时间",
                        severity=Severity.ERROR,
                        current_value=duration,
                        expected_range=self.PARAMETER_RANGES["duration"],
                        suggestion="滴注持续时间必须大于0",
                        triggered_by=triggered_by,
                        blocked_step="滴注参数校验",
                        next_action=f"为{event_id}添加滴注持续时间"
                    ))

        if len(events) > 1:
            times = [e.get("time", 0) for e in events]
            for i in range(1, len(times)):
                if times[i] <= times[i - 1]:
                    issues.append(ValidationIssue(
                        field=f"dosing_plan.event.{i}.time",
                        issue_type="time_order",
                        message=f"事件{i+1}的给药时间不晚于前一事件",
                        severity=Severity.ERROR,
                        current_value=times[i],
                        suggestion="给药事件必须按时间顺序排列",
                        triggered_by=triggered_by,
                        blocked_step="给药时间排序",
                        next_action="调整给药时间顺序"
                    ))

        if total_dose > 10000:
            issues.append(ValidationIssue(
                field="dosing_plan.total_dose",
                issue_type="excessive_total_dose",
                message=f"总给药剂量 {total_dose} {dose_unit} 可能过高",
                severity=Severity.WARNING,
                current_value=total_dose,
                suggestion="请确认总剂量是否符合临床实际",
                triggered_by=triggered_by,
                blocked_step=None,
                next_action="确认总给药剂量是否正确"
            ))

        return issues

    def validate_time_step(self, time_step: float, params: Dict[str, Any],
                           dosing_plan: Dict[str, Any],
                           triggered_by: Optional[str] = None) -> ValidationIssue:
        half_life = params.get("half_life", params.get("half_life_alpha", 1))
        events = dosing_plan.get("events", [])
        min_interval = float('inf')
        if len(events) > 1:
            times = sorted([e["time"] for e in events])
            for i in range(1, len(times)):
                interval = times[i] - times[i - 1]
                min_interval = min(min_interval, interval)

        max_recommended = min(half_life * self.MAX_TIME_STEP_RATIO, min_interval * 0.5 if min_interval != float('inf') else 1)

        if time_step > max_recommended:
            return ValidationIssue(
                field="time_step",
                issue_type="time_step_too_large",
                message=f"时间步长 {time_step} 小时过大，可能导致数值不稳定",
                severity=Severity.ERROR,
                current_value=time_step,
                expected_range=self.PARAMETER_RANGES["time_step"],
                suggestion=f"建议最大步长: {max_recommended:.3f} 小时（半衰期的1/10或给药间隔的1/2）",
                triggered_by=triggered_by,
                blocked_step="时间步长校验",
                next_action=f"减小时间步长至 {max_recommended:.3f} 小时以下"
            )
        elif time_step < 0.001:
            return ValidationIssue(
                field="time_step",
                issue_type="time_step_too_small",
                message=f"时间步长 {time_step} 小时过小，可能导致计算量过大",
                severity=Severity.WARNING,
                current_value=time_step,
                suggestion="建议使用0.01-1小时的时间步长",
                triggered_by=triggered_by,
                blocked_step=None,
                next_action="可适当增大时间步长以提高计算效率"
            )
        else:
            return ValidationIssue(
                field="time_step",
                issue_type="time_step_ok",
                message=f"时间步长 {time_step} 小时在合理范围内",
                severity=Severity.INFO,
                current_value=time_step,
                suggestion="时间步长设置合理",
                next_action=""
            )

    def validate_unit_consistency(self, params: Dict[str, Any],
                                  dosing_plan: Dict[str, Any],
                                  triggered_by: Optional[str] = None) -> List[ValidationIssue]:
        issues: List[ValidationIssue] = []
        time_unit = dosing_plan.get("time_unit", "hours")
        dose_unit = dosing_plan.get("dose_unit", "mg")

        valid_time_units = ["hours", "minutes", "days"]
        if time_unit not in valid_time_units:
            issues.append(ValidationIssue(
                field="time_unit",
                issue_type="invalid_unit",
                message=f"时间单位 '{time_unit}' 不支持",
                severity=Severity.ERROR,
                current_value=time_unit,
                suggestion=f"支持的时间单位: {', '.join(valid_time_units)}",
                triggered_by=triggered_by,
                blocked_step="单位解析",
                next_action="修正时间单位"
            ))

        valid_dose_units = ["mg", "g", "μg", "mg/kg"]
        if dose_unit not in valid_dose_units:
            issues.append(ValidationIssue(
                field="dose_unit",
                issue_type="invalid_unit",
                message=f"剂量单位 '{dose_unit}' 不支持",
                severity=Severity.ERROR,
                current_value=dose_unit,
                suggestion=f"支持的剂量单位: {', '.join(valid_dose_units)}",
                triggered_by=triggered_by,
                blocked_step="单位解析",
                next_action="修正剂量单位"
            ))

        if dose_unit == "mg/kg" and "weight" not in params:
            issues.append(ValidationIssue(
                field="weight",
                issue_type="missing_weight_for_unit",
                message="使用mg/kg单位时必须提供体重参数",
                severity=Severity.ERROR,
                current_value=None,
                suggestion="请提供受试者体重(kg)",
                triggered_by=triggered_by,
                blocked_step="单位换算",
                next_action="添加体重参数"
            ))

        return issues

    def check_dose_bounds(self, dose: float, patient_weight: float,
                          drug_name: Optional[str] = None) -> Dict[str, Any]:
        dose_per_kg = dose / patient_weight if patient_weight > 0 else dose

        bounds = {
            "amoxicillin": (20, 100),
            "paracetamol": (10, 60),
            "ibuprofen": (5, 30),
            "vancomycin": (15, 40),
            "gentamicin": (3, 7),
        }

        typical_min, typical_max = bounds.get(drug_name.lower() if drug_name else "default", (5, 50))

        is_out_of_bounds = dose_per_kg < typical_min * 0.3 or dose_per_kg > typical_max * 3

        return {
            "dose_per_kg": dose_per_kg,
            "typical_range": (typical_min, typical_max),
            "is_out_of_bounds": is_out_of_bounds,
            "severity": "high" if is_out_of_bounds else ("medium" if dose_per_kg < typical_min * 0.5 or dose_per_kg > typical_max * 2 else "low"),
            "message": f"剂量 {dose} mg = {dose_per_kg:.1f} mg/kg，"
                      + (f"超出典型范围 {typical_min}-{typical_max} mg/kg" if is_out_of_bounds
                         else f"在典型范围 {typical_min}-{typical_max} mg/kg 附近")
        }
