from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
from .boundary_reflection import ReflectionRecord, ReflectionType, ReflectionCause


class GameResult(Enum):
    WIN = "win"
    LOSE = "lose"
    DRAW = "draw"
    NEEDS_REVIEW = "needs_review"


class FailReason(Enum):
    SOURCE_OVERLAP = "source_overlap"
    EXCESSIVE_REFLECTION = "excessive_reflection"
    INCOMPLETE_SOURCE = "incomplete_source"
    SIMULATION_ERROR = "simulation_error"
    AMPLITUDE_TOO_LOW = "amplitude_too_low"
    NONE = "none"


@dataclass
class SettlementResult:
    result: GameResult
    total_score: int
    max_score: int
    fail_reason: FailReason = FailReason.NONE
    fail_details: Dict[str, Any] = field(default_factory=dict)
    wave_simulation_relation: str = ""
    reflection_summary: Dict[str, Any] = field(default_factory=dict)
    source_analysis: List[Dict[str, Any]] = field(default_factory=list)

    def to_human_readable(self) -> str:
        lines = []
        lines.append("=" * 50)
        lines.append("水波干涉乐园 - 结算报告")
        lines.append("=" * 50)
        lines.append(f"结果: {self._translate_result()}")
        lines.append(f"得分: {self.total_score} / {self.max_score}")
        lines.append("")

        if self.result == GameResult.LOSE and self.fail_reason != FailReason.NONE:
            lines.append("失败原因:")
            lines.append(f"  {self._translate_fail_reason()}")
            lines.append("")
            lines.append("与波动模拟的关系:")
            lines.append(f"  {self.wave_simulation_relation}")
            lines.append("")

        if self.fail_details:
            lines.append("详细分析:")
            for key, value in self.fail_details.items():
                if isinstance(value, (int, float)):
                    lines.append(f"  {key}: {value:.4f}")
                else:
                    lines.append(f"  {key}: {value}")
            lines.append("")

        if self.source_analysis:
            lines.append("波源状态:")
            for src in self.source_analysis:
                status = src.get("status", "unknown")
                missing = src.get("missing_fields", [])
                remark = src.get("remark", "")
                remark_str = f" (备注: {remark})" if remark else ""
                missing_str = f" (缺字段: {', '.join(missing)})" if missing else ""
                lines.append(
                    f"  - {src.get('id')}: 振幅={src.get('amplitude'):.2f}, 状态={status}{missing_str}{remark_str}"
                )
            lines.append("")

        if self.reflection_summary and self.reflection_summary.get("total", 0) > 0:
            lines.append("边界反射统计:")
            lines.append(f"  总计: {self.reflection_summary.get('total', 0)} 处")
            lines.append(f"  正常: {self.reflection_summary.get('normal', 0)} 处")
            lines.append(
                f"  需人工确认: {self.reflection_summary.get('needs_confirm', 0)} 处"
            )
            lines.append(f"  错误: {self.reflection_summary.get('error', 0)} 处")
            lines.append("")

        lines.append("=" * 50)
        return "\n".join(lines)

    def _translate_result(self) -> str:
        translations = {
            GameResult.WIN: "胜利",
            GameResult.LOSE: "失败",
            GameResult.DRAW: "平局",
            GameResult.NEEDS_REVIEW: "待复审",
        }
        return translations.get(self.result, str(self.result))

    def _translate_fail_reason(self) -> str:
        translations = {
            FailReason.SOURCE_OVERLAP: "波源重叠导致异常干涉",
            FailReason.EXCESSIVE_REFLECTION: "边界反射超过容许阈值",
            FailReason.INCOMPLETE_SOURCE: "波源数据不完整",
            FailReason.SIMULATION_ERROR: "模拟过程出现计算错误",
            FailReason.AMPLITUDE_TOO_LOW: "干涉振幅未达到目标值",
            FailReason.NONE: "无",
        }
        return translations.get(self.fail_reason, str(self.fail_reason))


class Settlement:
    def __init__(
        self,
        target_amplitude: float = 1.5,
        max_reflections_needing_confirm: int = 2,
        pass_score: int = 60,
    ):
        self.target_amplitude = target_amplitude
        self.max_reflections_needing_confirm = max_reflections_needing_confirm
        self.pass_score = pass_score
        self.max_score = 100

    def calculate(
        self,
        sources: List[Any],
        simulation_result: Any,
        reflections: List[ReflectionRecord],
        reflection_summary: Dict[str, Any],
    ) -> SettlementResult:
        score = self.max_score
        fail_reason = FailReason.NONE
        fail_details = {}
        wave_relation = ""

        source_dicts = [s.to_dict() for s in sources]
        has_incomplete = any(
            s.get("status") == "incomplete" for s in source_dicts
        )
        overlapping_reflections = [
            r
            for r in reflections
            if r.cause == ReflectionCause.SOURCE_OVERLAP
        ]
        has_overlap = len(overlapping_reflections) > 0

        error_reflections = [
            r for r in reflections if r.type == ReflectionType.ERROR
        ]
        has_simulation_error = len(error_reflections) > 0

        needs_confirm_count = reflection_summary.get("needs_confirm", 0)

        if has_overlap:
            score = max(0, score - 50)
            fail_reason = FailReason.SOURCE_OVERLAP
            fail_details = {
                "重叠波源对数": len(overlapping_reflections),
                "最小波源间距": overlapping_reflections[0].value
                if overlapping_reflections
                else 0,
                "间距阈值": 0.5,
            }
            wave_relation = (
                "波源间距过近导致波峰异常叠加，违反干涉原理。"
                "在波动模拟中，波源重叠会使相干距离趋近于零，"
                "造成局部振幅远超正常值，破坏干涉图案的可观测性。"
            )

        elif has_incomplete:
            score = max(0, score - 20)
            fail_reason = FailReason.INCOMPLETE_SOURCE
            incomplete_sources = [
                s.get("id")
                for s in source_dicts
                if s.get("status") == "incomplete"
            ]
            fail_details = {"缺字段波源": ", ".join(incomplete_sources)}
            wave_relation = (
                "缺失的相位参数使用默认值0代替，可能导致干涉结果与预期偏差。"
                "相位是波动方程的关键参数，相位差决定了相长/相消干涉的位置。"
            )

        elif has_simulation_error:
            score = max(0, score - 40)
            fail_reason = FailReason.SIMULATION_ERROR
            fail_details = {
                "错误反射数": len(error_reflections),
                "最大异常值": max(
                    [r.value for r in error_reflections], default=0
                ),
            }
            wave_relation = (
                "检测到振幅异常峰值，可能是边界条件处理不当或数值计算溢出。"
                "在理想无边界水池中，波能应随距离衰减，不应出现异常放大。"
            )

        elif needs_confirm_count > self.max_reflections_needing_confirm:
            score = max(0, score - 15)
            fail_reason = FailReason.EXCESSIVE_REFLECTION
            fail_details = {
                "需确认反射数": needs_confirm_count,
                "容许上限": self.max_reflections_needing_confirm,
            }
            wave_relation = (
                "边界区域存在多处不确定反射，请人工确认是水池边缘的真实反射"
                "还是模拟参数设置问题。教学场景中建议使用吸收边界条件。"
            )

        if fail_reason == FailReason.NONE:
            actual_amplitude = simulation_result.max_amplitude
            amplitude_score = min(
                30,
                int(30 * (actual_amplitude / self.target_amplitude))
                if actual_amplitude <= self.target_amplitude
                else 30,
            )

            if actual_amplitude < self.target_amplitude * 0.5:
                score = max(0, score - 30 + amplitude_score)
                fail_reason = FailReason.AMPLITUDE_TOO_LOW
                fail_details = {
                    "实际振幅": actual_amplitude,
                    "目标振幅": self.target_amplitude,
                    "振幅达标率": actual_amplitude / self.target_amplitude,
                }
                wave_relation = (
                    f"实际振幅({actual_amplitude:.2f})未达到目标值({self.target_amplitude})。"
                    "可尝试增大波源振幅或调整波源位置使干涉相长区域覆盖目标区域。"
                )
            else:
                score = min(score - 30 + amplitude_score, self.max_score)
                fail_details = {
                    "实际振幅": actual_amplitude,
                    "目标振幅": self.target_amplitude,
                }

        result = (
            GameResult.WIN
            if score >= self.pass_score and fail_reason == FailReason.NONE
            else (
                GameResult.NEEDS_REVIEW
                if needs_confirm_count > 0 and score >= self.pass_score
                else GameResult.LOSE
            )
        )

        return SettlementResult(
            result=result,
            total_score=score,
            max_score=self.max_score,
            fail_reason=fail_reason,
            fail_details=fail_details,
            wave_simulation_relation=wave_relation,
            reflection_summary=reflection_summary,
            source_analysis=source_dicts,
        )
