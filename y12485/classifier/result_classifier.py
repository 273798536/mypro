from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime

from models.particle import ParticleSimulator, SimulationFrame, ParticleStatus, DirectionReversalEvent, OutOfBoundsEvent
from core.electromagnetic import ElectromagneticField


class ResultCategory(Enum):
    DIRECT_USE = "direct_use"
    NEEDS_REVIEW = "needs_teacher_review"
    NOT_USABLE = "not_usable"


@dataclass
class ClassificationRule:
    rule_id: str
    name: str
    description: str
    category: ResultCategory
    severity: int
    check_function: str


@dataclass
class Issue:
    issue_id: str
    rule_id: str
    name: str
    description: str
    category: ResultCategory
    severity: int
    location: Optional[Dict[str, Any]] = None
    evidence: Optional[Dict[str, Any]] = None
    suggestion: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "issue_id": self.issue_id,
            "rule_id": self.rule_id,
            "name": self.name,
            "description": self.description,
            "category": self.category.value,
            "severity": self.severity,
            "location": self.location,
            "evidence": self.evidence,
            "suggestion": self.suggestion
        }


@dataclass
class ClassificationResult:
    particle_id: str
    final_category: ResultCategory
    issues: List[Issue] = field(default_factory=list)
    direct_use_evidence: List[str] = field(default_factory=list)
    review_required_reasons: List[str] = field(default_factory=list)
    not_usable_reasons: List[str] = field(default_factory=list)
    confidence_score: float = 1.0
    summary: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "particle_id": self.particle_id,
            "final_category": self.final_category.value,
            "confidence_score": self.confidence_score,
            "summary": self.summary,
            "issues": [issue.to_dict() for issue in self.issues],
            "direct_use_evidence": self.direct_use_evidence,
            "review_required_reasons": self.review_required_reasons,
            "not_usable_reasons": self.not_usable_reasons
        }


@dataclass
class BatchClassificationResult:
    overall_summary: str
    particle_results: Dict[str, ClassificationResult]
    direct_use_count: int = 0
    needs_review_count: int = 0
    not_usable_count: int = 0
    total_particles: int = 0
    generated_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "overall_summary": self.overall_summary,
            "particle_results": {pid: res.to_dict() for pid, res in self.particle_results.items()},
            "direct_use_count": self.direct_use_count,
            "needs_review_count": self.needs_review_count,
            "not_usable_count": self.not_usable_count,
            "total_particles": self.total_particles,
            "generated_at": self.generated_at.isoformat()
        }


class ResultClassifier:
    def __init__(self):
        self.rules = self._initialize_rules()

    def _initialize_rules(self) -> List[ClassificationRule]:
        return [
            ClassificationRule(
                rule_id="R001",
                name="场强爆炸",
                description="粒子运动过程中遇到数值不稳定的场强爆炸",
                category=ResultCategory.NOT_USABLE,
                severity=10,
                check_function="_check_field_explosion"
            ),
            ClassificationRule(
                rule_id="R002",
                name="粒子质量缺失",
                description="粒子质量未设置，无法进行正确的物理计算",
                category=ResultCategory.NOT_USABLE,
                severity=10,
                check_function="_check_mass_missing"
            ),
            ClassificationRule(
                rule_id="R003",
                name="粒子电荷缺失",
                description="粒子电荷未设置，无法进行正确的物理计算",
                category=ResultCategory.NOT_USABLE,
                severity=10,
                check_function="_check_charge_missing"
            ),
            ClassificationRule(
                rule_id="R004",
                name="数值错误",
                description="模拟过程中出现数值计算错误",
                category=ResultCategory.NOT_USABLE,
                severity=9,
                check_function="_check_numerical_error"
            ),
            ClassificationRule(
                rule_id="R005",
                name="方向反转",
                description="粒子运动方向发生反转，需要验证是否为物理现象",
                category=ResultCategory.NEEDS_REVIEW,
                severity=5,
                check_function="_check_direction_reversal"
            ),
            ClassificationRule(
                rule_id="R006",
                name="粒子越界",
                description="粒子超出模拟边界，结果可能不完整",
                category=ResultCategory.NEEDS_REVIEW,
                severity=4,
                check_function="_check_out_of_bounds"
            ),
            ClassificationRule(
                rule_id="R007",
                name="反转与越界重叠",
                description="方向反转事件与越界事件发生在同一时间步，可能被错误合并",
                category=ResultCategory.NEEDS_REVIEW,
                severity=7,
                check_function="_check_event_overlap"
            ),
            ClassificationRule(
                rule_id="R008",
                name="轨迹正常",
                description="粒子运动轨迹正常，无异常事件",
                category=ResultCategory.DIRECT_USE,
                severity=0,
                check_function="_check_normal_trajectory"
            ),
            ClassificationRule(
                rule_id="R009",
                name="数据完整",
                description="所有必要参数完整，计算过程稳定",
                category=ResultCategory.DIRECT_USE,
                severity=0,
                check_function="_check_data_completeness"
            )
        ]

    def _check_field_explosion(self, simulator: ParticleSimulator, particle_id: str, frames: List[SimulationFrame]) -> Optional[Issue]:
        explosion_frames = [f for f in frames if f.field_has_explosion]
        if explosion_frames:
            first_explosion = explosion_frames[0]
            return Issue(
                issue_id=f"{particle_id}_explosion",
                rule_id="R001",
                name="场强爆炸",
                description=f"粒子在模拟步 {first_explosion.step_index} 遭遇场强爆炸: {first_explosion.explosion_reason}",
                category=ResultCategory.NOT_USABLE,
                severity=10,
                location={"step": first_explosion.step_index, "position": first_explosion.position.tolist()},
                evidence={"explosion_reason": first_explosion.explosion_reason,
                          "e_magnitude": first_explosion.e_magnitude,
                          "b_magnitude": first_explosion.b_magnitude},
                suggestion="请检查电荷/线圈配置，避免粒子过于靠近场源"
            )
        return None

    def _check_mass_missing(self, simulator: ParticleSimulator, particle_id: str, frames: List[SimulationFrame]) -> Optional[Issue]:
        particle = next((p for p in simulator.particles if p.id == particle_id), None)
        if particle and particle.mass is None:
            return Issue(
                issue_id=f"{particle_id}_mass_missing",
                rule_id="R002",
                name="粒子质量缺失",
                description="粒子质量未设置，无法进行正确的物理计算",
                category=ResultCategory.NOT_USABLE,
                severity=10,
                evidence={"particle_id": particle_id, "particle_name": particle.name},
                suggestion="请使用 set_mass() 方法设置粒子质量，常见值: 电子=9.11e-31 kg, 质子=1.67e-27 kg"
            )
        return None

    def _check_charge_missing(self, simulator: ParticleSimulator, particle_id: str, frames: List[SimulationFrame]) -> Optional[Issue]:
        particle = next((p for p in simulator.particles if p.id == particle_id), None)
        if particle and particle.charge is None:
            return Issue(
                issue_id=f"{particle_id}_charge_missing",
                rule_id="R003",
                name="粒子电荷缺失",
                description="粒子电荷未设置，无法进行正确的物理计算",
                category=ResultCategory.NOT_USABLE,
                severity=10,
                evidence={"particle_id": particle_id, "particle_name": particle.name},
                suggestion="请使用 set_charge() 方法设置粒子电荷，常见值: 电子=-1.60e-19 C, 质子=1.60e-19 C"
            )
        return None

    def _check_numerical_error(self, simulator: ParticleSimulator, particle_id: str, frames: List[SimulationFrame]) -> Optional[Issue]:
        error_frames = [f for f in frames if f.status == ParticleStatus.NUMERICAL_ERROR]
        if error_frames:
            first_error = error_frames[0]
            return Issue(
                issue_id=f"{particle_id}_numerical_error",
                rule_id="R004",
                name="数值错误",
                description=f"粒子在模拟步 {first_error.step_index} 出现数值计算错误",
                category=ResultCategory.NOT_USABLE,
                severity=9,
                location={"step": first_error.step_index},
                suggestion="请尝试减小时间步长或调整模拟参数"
            )
        return None

    def _check_direction_reversal(self, simulator: ParticleSimulator, particle_id: str, frames: List[SimulationFrame]) -> Optional[Issue]:
        reversals = simulator.get_reversal_events(particle_id)
        if reversals:
            reversal_details = [
                {
                    "step": r.step_index,
                    "timestamp": r.timestamp,
                    "source": r.reversal_source.value,
                    "dot_product": r.dot_product,
                    "position": r.position.tolist()
                }
                for r in reversals
            ]
            return Issue(
                issue_id=f"{particle_id}_reversal",
                rule_id="R005",
                name="方向反转",
                description=f"检测到 {len(reversals)} 次方向反转事件，需要验证是否为预期物理现象",
                category=ResultCategory.NEEDS_REVIEW,
                severity=5,
                evidence={"reversal_count": len(reversals), "reversal_details": reversal_details},
                suggestion="请检查场配置和初始条件，确认反转是否为物理现象（如粒子到达极板）或数值问题"
            )
        return None

    def _check_out_of_bounds(self, simulator: ParticleSimulator, particle_id: str, frames: List[SimulationFrame]) -> Optional[Issue]:
        oob_events = simulator.get_out_of_bounds_events(particle_id)
        if oob_events:
            oob_details = [
                {
                    "step": e.step_index,
                    "timestamp": e.timestamp,
                    "axis": e.boundary_axis,
                    "position": e.boundary_position
                }
                for e in oob_events
            ]
            return Issue(
                issue_id=f"{particle_id}_oob",
                rule_id="R006",
                name="粒子越界",
                description=f"粒子 {len(oob_events)} 次超出模拟边界，轨迹可能不完整",
                category=ResultCategory.NEEDS_REVIEW,
                severity=4,
                evidence={"oob_count": len(oob_events), "oob_details": oob_details},
                suggestion="请考虑扩大模拟边界或调整初始条件，确保粒子在感兴趣区域内运动"
            )
        return None

    def _check_event_overlap(self, simulator: ParticleSimulator, particle_id: str, frames: List[SimulationFrame]) -> Optional[Issue]:
        error_merging = simulator.has_error_merging()
        if particle_id in error_merging and error_merging[particle_id]["reversal_oob_overlap"]:
            overlap_steps = error_merging[particle_id]["overlap_steps"]
            return Issue(
                issue_id=f"{particle_id}_overlap",
                rule_id="R007",
                name="反转与越界重叠",
                description=f"方向反转与越界事件在时间步 {overlap_steps} 重叠，可能被错误合并",
                category=ResultCategory.NEEDS_REVIEW,
                severity=7,
                evidence={"overlap_steps": overlap_steps},
                suggestion="请人工复核这些时间步的原始数据，区分方向反转和越界事件"
            )
        return None

    def _check_normal_trajectory(self, simulator: ParticleSimulator, particle_id: str, frames: List[SimulationFrame]) -> Optional[Issue]:
        normal_frames = [f for f in frames if f.status == ParticleStatus.NORMAL]
        if len(normal_frames) == len(frames) and len(frames) > 0:
            return Issue(
                issue_id=f"{particle_id}_normal",
                rule_id="R008",
                name="轨迹正常",
                description="粒子运动轨迹正常，无异常事件",
                category=ResultCategory.DIRECT_USE,
                severity=0,
                evidence={"total_steps": len(frames), "normal_steps": len(normal_frames)}
            )
        return None

    def _check_data_completeness(self, simulator: ParticleSimulator, particle_id: str, frames: List[SimulationFrame]) -> Optional[Issue]:
        particle = next((p for p in simulator.particles if p.id == particle_id), None)
        if particle and particle.mass is not None and particle.charge is not None and len(frames) > 0:
            return Issue(
                issue_id=f"{particle_id}_complete",
                rule_id="R009",
                name="数据完整",
                description="所有必要参数完整，计算过程稳定",
                category=ResultCategory.DIRECT_USE,
                severity=0,
                evidence={"has_mass": particle.mass is not None,
                          "has_charge": particle.charge is not None,
                          "frames_count": len(frames)}
            )
        return None

    def classify_particle(self, simulator: ParticleSimulator, particle_id: str) -> ClassificationResult:
        frames = simulator.frames.get(particle_id, [])
        issues: List[Issue] = []
        direct_use_evidence: List[str] = []
        review_reasons: List[str] = []
        not_usable_reasons: List[str] = []

        for rule in self.rules:
            check_func = getattr(self, rule.check_function, None)
            if check_func:
                issue = check_func(simulator, particle_id, frames)
                if issue:
                    issues.append(issue)
                    if issue.category == ResultCategory.DIRECT_USE:
                        direct_use_evidence.append(issue.description)
                    elif issue.category == ResultCategory.NEEDS_REVIEW:
                        review_reasons.append(issue.description)
                    elif issue.category == ResultCategory.NOT_USABLE:
                        not_usable_reasons.append(issue.description)

        if not_usable_reasons:
            final_category = ResultCategory.NOT_USABLE
            confidence = 0.0
            summary = f"结果暂时不可用: {'; '.join(not_usable_reasons[:2])}"
        elif review_reasons:
            final_category = ResultCategory.NEEDS_REVIEW
            confidence = 0.5
            summary = f"需要物理老师复核: {'; '.join(review_reasons[:2])}"
        else:
            final_category = ResultCategory.DIRECT_USE
            confidence = 1.0
            summary = "结果可直接使用，数据完整无异常"

        return ClassificationResult(
            particle_id=particle_id,
            final_category=final_category,
            issues=issues,
            direct_use_evidence=direct_use_evidence,
            review_required_reasons=review_reasons,
            not_usable_reasons=not_usable_reasons,
            confidence_score=confidence,
            summary=summary
        )

    def classify_all(self, simulator: ParticleSimulator) -> BatchClassificationResult:
        results: Dict[str, ClassificationResult] = {}
        direct_use_count = 0
        needs_review_count = 0
        not_usable_count = 0

        for particle in simulator.particles:
            result = self.classify_particle(simulator, particle.id)
            results[particle.id] = result

            if result.final_category == ResultCategory.DIRECT_USE:
                direct_use_count += 1
            elif result.final_category == ResultCategory.NEEDS_REVIEW:
                needs_review_count += 1
            else:
                not_usable_count += 1

        total = len(simulator.particles)
        if total > 0:
            if not_usable_count > 0:
                overall = f"本次模拟共 {total} 个粒子，{not_usable_count} 个暂不可用，{needs_review_count} 个需复核，{direct_use_count} 个可直接使用"
            elif needs_review_count > 0:
                overall = f"本次模拟共 {total} 个粒子，{needs_review_count} 个需物理老师复核，{direct_use_count} 个可直接使用"
            else:
                overall = f"本次模拟共 {total} 个粒子，全部可直接使用"
        else:
            overall = "未检测到任何粒子"

        return BatchClassificationResult(
            overall_summary=overall,
            particle_results=results,
            direct_use_count=direct_use_count,
            needs_review_count=needs_review_count,
            not_usable_count=not_usable_count,
            total_particles=total
        )

    def get_classification_guide(self) -> Dict[str, Any]:
        return {
            "categories": {
                "direct_use": {
                    "name": "可直接使用",
                    "description": "数据完整、计算稳定、无异常事件，结果可信",
                    "criteria": [
                        "粒子质量和电荷完整设置",
                        "无场强爆炸或数值错误",
                        "无方向反转或越界事件（或已确认是预期物理现象）"
                    ]
                },
                "needs_teacher_review": {
                    "name": "需物理老师确认",
                    "description": "存在需要人工判断的异常，可能是物理现象也可能是问题",
                    "criteria": [
                        "检测到方向反转，需确认是否为预期物理现象",
                        "粒子越界，需确认是否影响结果",
                        "事件时间重叠，需人工区分"
                    ]
                },
                "not_usable": {
                    "name": "暂时不能算",
                    "description": "存在严重问题，数据不可靠",
                    "criteria": [
                        "场强爆炸导致数值不稳定",
                        "粒子质量或电荷缺失",
                        "数值计算错误"
                    ]
                }
            },
            "rules": [
                {
                    "id": r.rule_id,
                    "name": r.name,
                    "description": r.description,
                    "category": r.category.value,
                    "severity": r.severity
                }
                for r in self.rules
            ]
        }
