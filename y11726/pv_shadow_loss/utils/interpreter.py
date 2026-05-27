from __future__ import annotations

from typing import List, Dict, Any
from ..models.schemas import (
    ShadowLossResponse,
    ShadowAttribution,
    StringCalculation,
    MaintenanceSuggestion,
    EdgeWarning,
    ValidationResult,
)


class ResultInterpreter:
    """
    结果解释层：将原始计算结果转化为可读的运维语言
    """

    @staticmethod
    def summarize(response: ShadowLossResponse) -> Dict[str, Any]:
        summary = {
            "status": response.status,
            "station_id": response.station_id,
            "processing_time_ms": response.processing_time_ms,
            "key_findings": [],
            "risk_assessment": {},
            "action_items": [],
            "data_quality": {},
        }

        summary["key_findings"] = ResultInterpreter._findings(
            response.shadow_attributions
        )
        summary["risk_assessment"] = ResultInterpreter._risk(
            response.string_calculations
        )
        summary["action_items"] = ResultInterpreter._actions(
            response.maintenance_suggestions
        )
        summary["data_quality"] = ResultInterpreter._quality(
            response.validations, response.edge_warnings, response.corrections
        )

        return summary

    @staticmethod
    def _findings(attributions: List[ShadowAttribution]) -> List[str]:
        findings = []
        affected = [a for a in attributions if a.shadow_loss_pct > 0.05]

        if not affected:
            findings.append("未检测到显著阴影影响")
            return findings

        total_comps = len(attributions)
        affected_count = len(affected)
        findings.append(
            f"检测到 {affected_count}/{total_comps} 个组件受阴影影响 "
            f"({affected_count/total_comps:.0%})"
        )

        tree_count = sum(1 for a in affected if a.shadow_type.value == "tree")
        building_count = sum(1 for a in affected if a.shadow_type.value == "building")
        if tree_count > 0:
            findings.append(f"树影影响 {tree_count} 个组件")
        if building_count > 0:
            findings.append(f"建筑遮挡影响 {building_count} 个组件")

        severe = [a for a in affected if a.shadow_loss_pct > 0.2]
        if severe:
            top = sorted(severe, key=lambda x: x.shadow_loss_pct, reverse=True)[:3]
            for t in top:
                findings.append(
                    f"组件 {t.component_id} 阴影损失严重 "
                    f"({t.shadow_loss_pct:.0%}，估算 {t.estimated_energy_loss_kwh:.2f}kWh)"
                )

        return findings

    @staticmethod
    def _risk(calculations: List[StringCalculation]) -> Dict[str, Any]:
        if not calculations:
            return {"overall_risk": "unknown", "details": "无组串计算结果"}

        total_loss = sum(c.string_shadow_loss_pct for c in calculations) / len(calculations)
        hotspots = [c for c in calculations if c.hotspot_risk > 0.5]

        risk = "low"
        if total_loss > 0.2 or len(hotspots) > 0:
            risk = "high"
        elif total_loss > 0.1:
            risk = "medium"

        return {
            "overall_risk": risk,
            "total_string_loss_pct": round(total_loss, 4),
            "hotspot_risk_strings": [c.string_id for c in hotspots],
            "worst_string": max(calculations, key=lambda c: c.string_shadow_loss_pct).string_id
            if calculations else None,
        }

    @staticmethod
    def _actions(suggestions: List[MaintenanceSuggestion]) -> List[str]:
        actions = []
        for s in suggestions[:5]:
            priority_label = {"critical": "紧急", "high": "高", "medium": "中", "low": "低"}.get(s.priority, s.priority)
            actions.append(
                f"[{priority_label}] {s.description}"
                + (f" (预计减少{s.estimated_effect_pct:.0%}损失)" if s.estimated_effect_pct > 0 else "")
            )
        return actions

    @staticmethod
    def _quality(validations: List[ValidationResult],
                 warnings: List[EdgeWarning],
                 corrections: List) -> Dict[str, Any]:
        errors = [v for v in validations if v.severity == "error"]
        warnings_v = [v for v in validations if v.severity == "warning"]
        blocking = [w for w in warnings if w.is_blocking]

        return {
            "error_count": len(errors),
            "warning_count": len(warnings_v),
            "edge_warning_count": len(warnings),
            "blocking_issues": [w.message for w in blocking],
            "correction_count": len(corrections),
            "has_corrections": len(corrections) > 0,
        }

    @staticmethod
    def to_readable_text(response: ShadowLossResponse) -> str:
        summary = ResultInterpreter.summarize(response)
        lines = [
            f"电站 {summary['station_id']} 阴影损失分析报告",
            f"状态: {summary['status']} | 耗时: {summary['processing_time_ms']}ms",
            "",
            "=== 关键发现 ===",
        ]
        for f in summary["key_findings"]:
            lines.append(f"  - {f}")

        risk = summary["risk_assessment"]
        lines.extend([
            "",
            f"=== 风险评估: {risk.get('overall_risk', 'unknown')} ===",
            f"  组串整体损失率: {risk.get('total_string_loss_pct', 0):.0%}",
        ])
        if risk.get("hotspot_risk_strings"):
            lines.append(f"  热斑风险组串: {', '.join(risk['hotspot_risk_strings'])}")

        if summary["action_items"]:
            lines.extend(["", "=== 行动建议 ==="])
            for a in summary["action_items"]:
                lines.append(f"  - {a}")

        quality = summary["data_quality"]
        lines.extend([
            "",
            "=== 数据质量 ===",
            f"  错误: {quality['error_count']} | 警告: {quality['warning_count']} | 边缘提示: {quality['edge_warning_count']}",
        ])
        if quality["has_corrections"]:
            lines.append(f"  已自动修正 {quality['correction_count']} 处数据")

        return "\n".join(lines)
