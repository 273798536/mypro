from typing import List, Dict, Tuple
from dataclasses import dataclass

from config import RESPONSIBLE_PERSONS
from data_models import (
    FlywheelDataRecord,
    ShutdownRecommendation,
    ViolationType,
    DataStatus,
    CalculationResult
)
from boundary_checker import BoundaryChecker


@dataclass
class ViolationSeverity:
    violation_type: ViolationType
    severity: str
    priority: str
    should_shutdown: bool


class ShutdownRecommender:
    def __init__(self, boundary_checker: BoundaryChecker = None):
        self.boundary_checker = boundary_checker or BoundaryChecker()
        self.violation_severity_map = self._init_severity_map()

    def _init_severity_map(self) -> Dict[ViolationType, ViolationSeverity]:
        return {
            ViolationType.SPEED_OVER_LIMIT: ViolationSeverity(
                violation_type=ViolationType.SPEED_OVER_LIMIT,
                severity="critical",
                priority="high",
                should_shutdown=True
            ),
            ViolationType.SPEED_UNDER_LIMIT: ViolationSeverity(
                violation_type=ViolationType.SPEED_UNDER_LIMIT,
                severity="warning",
                priority="low",
                should_shutdown=False
            ),
            ViolationType.VACUUM_LEAK: ViolationSeverity(
                violation_type=ViolationType.VACUUM_LEAK,
                severity="high",
                priority="high",
                should_shutdown=True
            ),
            ViolationType.TEMPERATURE_OVER_LIMIT: ViolationSeverity(
                violation_type=ViolationType.TEMPERATURE_OVER_LIMIT,
                severity="high",
                priority="high",
                should_shutdown=True
            ),
            ViolationType.TEMP_RISE_LAG: ViolationSeverity(
                violation_type=ViolationType.TEMP_RISE_LAG,
                severity="medium",
                priority="medium",
                should_shutdown=False
            ),
            ViolationType.MATERIAL_STRESS_EXCEEDED: ViolationSeverity(
                violation_type=ViolationType.MATERIAL_STRESS_EXCEEDED,
                severity="critical",
                priority="high",
                should_shutdown=True
            )
        }

    def _get_responsible_persons(self, violations: List[ViolationType]) -> List[str]:
        persons = set()
        for violation in violations:
            if violation == ViolationType.SPEED_OVER_LIMIT or violation == ViolationType.SPEED_UNDER_LIMIT:
                persons.update(RESPONSIBLE_PERSONS["speed_violation"])
            elif violation == ViolationType.VACUUM_LEAK:
                persons.update(RESPONSIBLE_PERSONS["vacuum_leak"])
            elif violation == ViolationType.TEMPERATURE_OVER_LIMIT or violation == ViolationType.TEMP_RISE_LAG:
                persons.update(RESPONSIBLE_PERSONS["temperature_lag"])
            elif violation == ViolationType.MATERIAL_STRESS_EXCEEDED:
                persons.update(RESPONSIBLE_PERSONS["material_issue"])
        return list(persons)

    def _get_next_steps(self, violations: List[ViolationType]) -> List[str]:
        steps = []
        if ViolationType.SPEED_OVER_LIMIT in violations:
            steps.append("立即执行紧急停机程序")
            steps.append("通知机械工程师和系统主管现场核查")
            steps.append("检查转速传感器是否正常工作")
        if ViolationType.SPEED_UNDER_LIMIT in violations:
            steps.append("检查驱动系统和负载情况")
        if ViolationType.VACUUM_LEAK in violations:
            steps.append("执行真空系统检漏程序")
            steps.append("通知真空系统工程师排查泄漏点")
        if ViolationType.TEMPERATURE_OVER_LIMIT in violations:
            steps.append("检查冷却系统运行状态")
            steps.append("通知热管理工程师分析温升原因")
        if ViolationType.TEMP_RISE_LAG in violations:
            steps.append("验证温度传感器校准状态")
            steps.append("分析热管理系统响应时间")
        if ViolationType.MATERIAL_STRESS_EXCEEDED in violations:
            steps.append("立即停机并进行材料检测")
            steps.append("通知材料工程师进行应力复核")
        return list(dict.fromkeys(steps))

    def _get_recommendation_reason(self, violations: List[ViolationType], 
                                   energy_result: CalculationResult = None) -> str:
        reasons = []
        for violation in violations:
            if violation == ViolationType.SPEED_OVER_LIMIT:
                reasons.append("转速超过安全上限，存在转子破裂风险")
            elif violation == ViolationType.SPEED_UNDER_LIMIT:
                reasons.append("转速低于正常工作范围")
            elif violation == ViolationType.VACUUM_LEAK:
                reasons.append("真空度异常，可能存在真空泄漏")
            elif violation == ViolationType.TEMPERATURE_OVER_LIMIT:
                reasons.append("温度超过安全限值")
            elif violation == ViolationType.TEMP_RISE_LAG:
                reasons.append("温升速率异常，热管理可能存在问题")
            elif violation == ViolationType.MATERIAL_STRESS_EXCEEDED:
                reasons.append("材料应力超过安全系数")
        
        if energy_result and energy_result.safety_factor < 1.5:
            reasons.append(f"材料安全系数较低 ({energy_result.safety_factor:.2f})")
        
        return "；".join(reasons) if reasons else "系统运行正常"

    def generate_recommendation(self, record: FlywheelDataRecord,
                                energy_result: CalculationResult = None) -> ShutdownRecommendation:
        check_result = self.boundary_checker.check_record(record)
        
        all_violations = check_result.violations.copy()
        
        if energy_result:
            if energy_result.safety_factor < 1.0:
                all_violations.append(ViolationType.MATERIAL_STRESS_EXCEEDED)
        
        all_violations = list(set(all_violations))
        
        should_shutdown = False
        max_priority = "low"
        
        for violation in all_violations:
            severity = self.violation_severity_map.get(violation)
            if severity and severity.should_shutdown:
                should_shutdown = True
            if severity and severity.priority == "high":
                max_priority = "high"
            elif severity and severity.priority == "medium" and max_priority == "low":
                max_priority = "medium"
        
        recommendation = ShutdownRecommendation(
            record_id=record.record_id,
            should_shutdown=should_shutdown,
            priority=max_priority,
            reason=self._get_recommendation_reason(all_violations, energy_result),
            violation_types=all_violations,
            responsible_persons=self._get_responsible_persons(all_violations),
            next_steps=self._get_next_steps(all_violations),
            status="pending" if all_violations else "approved"
        )
        
        return recommendation

    def generate_recommendation_summary(self, recommendation: ShutdownRecommendation) -> Dict:
        return {
            "recommendation_id": recommendation.recommendation_id,
            "record_id": recommendation.record_id,
            "should_shutdown": recommendation.should_shutdown,
            "priority": recommendation.priority,
            "reason": recommendation.reason,
            "violations": [v.value for v in recommendation.violation_types],
            "responsible_persons": recommendation.responsible_persons,
            "next_steps_count": len(recommendation.next_steps),
            "status": recommendation.status
        }

