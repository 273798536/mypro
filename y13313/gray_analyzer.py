from typing import Dict, Any, Optional
from models import ReplayResult, GrayBreakdown, ScoreVerdict, DecisionStatus, MaterialStatus


class GrayAnalyzer:
    def __init__(self):
        pass

    def decompose(self, result: ReplayResult) -> Dict[str, Any]:
        breakdown = result.gray_breakdown or GrayBreakdown(case_id=result.case_id)
        components = {
            "case_id": result.case_id,
            "final_verdict": breakdown.final_verdict.value if breakdown.final_verdict else "未判定",
            "final_status": result.final_status.value,
            "components": {
                "sample_change": {
                    "delta": breakdown.sample_change_delta,
                    "note": breakdown.sample_change_note or "无样本层面变化",
                    "details": self._extract_sample_details(result),
                    "impact_level": self._calc_impact_level(breakdown.sample_change_delta)
                },
                "threshold_change": {
                    "delta": breakdown.threshold_change_delta,
                    "note": breakdown.threshold_change_note or "无阈值调整",
                    "details": self._extract_threshold_details(result),
                    "impact_level": self._calc_impact_level(breakdown.threshold_change_delta)
                },
                "manual_override": {
                    "delta": breakdown.manual_override_delta,
                    "note": breakdown.manual_override_note or "无人工改判",
                    "details": self._extract_manual_details(result),
                    "impact_level": self._calc_impact_level(breakdown.manual_override_delta)
                }
            },
            "verdict_chain": self._extract_verdict_chain(result),
            "dominant_driver": self._find_dominant_driver(breakdown, result)
        }
        return components

    def _extract_sample_details(self, result: ReplayResult) -> Dict[str, Any]:
        details = {
            "total_materials": len(result.material_chain),
            "effective_materials": len([m for m in result.material_chain if m.status != MaterialStatus.WITHDRAWN]),
            "withdrawn_materials": len([m for m in result.material_chain if m.status == MaterialStatus.WITHDRAWN]),
            "revised_materials": len(result.revised_materials),
            "missing_references": len(result.missing_references),
            "material_ids_without_ref": result.missing_references,
            "revised_material_ids": result.revised_materials
        }
        return details

    def _extract_threshold_details(self, result: ReplayResult) -> Dict[str, Any]:
        snapshots_info = []
        for snap in result.score_snapshots:
            snapshots_info.append({
                "threshold_id": snap.threshold_id,
                "score": snap.score,
                "verdict": snap.verdict.value,
                "confidence": snap.confidence.value,
                "missing_materials": snap.missing_materials
            })
        return {
            "snapshot_count": len(snapshots_info),
            "snapshots": snapshots_info
        }

    def _extract_manual_details(self, result: ReplayResult) -> Dict[str, Any]:
        corr_info = []
        for corr in result.corrections:
            corr_info.append({
                "correction_id": corr.correction_id,
                "operator": corr.operator,
                "timestamp": corr.timestamp.isoformat(),
                "original_verdict": corr.original_verdict.value,
                "corrected_verdict": corr.corrected_verdict.value,
                "reason": corr.reason,
                "related_materials": corr.related_material_ids
            })
        return {
            "correction_count": len(corr_info),
            "corrections": corr_info,
            "withdrawals": [
                {
                    "withdraw_id": w.withdraw_id,
                    "operator": w.operator,
                    "material_id": w.withdrawn_material_id,
                    "reason": w.reason
                } for w in result.withdrawals
            ],
            "verbal_notes": [
                {
                    "note_id": n.note_id,
                    "operator": n.operator,
                    "content": n.content,
                    "related_materials": n.related_material_ids
                } for n in result.verbal_notes
            ]
        }

    def _extract_verdict_chain(self, result: ReplayResult) -> list:
        chain = []
        for snap in result.score_snapshots:
            chain.append({
                "stage": f"阈值评估[{snap.threshold_id}",
                "verdict": snap.verdict.value,
                "score": snap.score,
                "confidence": snap.confidence.value
            })
        for corr in result.corrections:
            chain.append({
                "stage": f"人工改判[{corr.operator}]",
                "verdict": f"{corr.original_verdict.value}→{corr.corrected_verdict.value}",
                "reason": corr.reason
            })
        if result.final_verdict:
            chain.append({
                "stage": "最终结论",
                "verdict": result.final_verdict.value,
                "status": result.final_status.value
            })
        return chain

    def _find_dominant_driver(self, breakdown: GrayBreakdown, result: ReplayResult) -> str:
        deltas = []
        if breakdown.sample_change_delta is not None:
            deltas.append(("样本变化", abs(breakdown.sample_change_delta)))
        if breakdown.threshold_change_delta is not None:
            deltas.append(("阈值变化", abs(breakdown.threshold_change_delta)))
        if breakdown.manual_override_delta is not None and abs(breakdown.manual_override_delta) > 0:
            deltas.append(("人工改判", abs(breakdown.manual_override_delta)))
        if not deltas:
            return "无显著驱动因素"
        deltas.sort(key=lambda x: x[1], reverse=True)
        return deltas[0][0]

    def _calc_impact_level(self, delta: Optional[float]) -> str:
        if delta is None or delta == 0:
            return "无影响"
        ad = abs(delta)
        if ad >= 10:
            return "强影响"
        elif ad >= 5:
            return "中等影响"
        else:
            return "弱影响"

    def summary_text(self, result: ReplayResult) -> str:
        decomp = self.decompose(result)
        lines = []
        lines.append(f"案件 {result.case_id} 灰度拆解分析")
        lines.append("=" * 50)
        lines.append(f"最终结论: {decomp['final_verdict']}  |  状态: {decomp['final_status']}")
        lines.append(f"主导驱动因素: {decomp['dominant_driver']}")
        lines.append("")
        lines.append("-- 驱动因素拆解 --")
        for name, comp in decomp["components"].items():
            label_map = {
                "sample_change": "样本变化",
                "threshold_change": "阈值变化",
                "manual_override": "人工改判"
            }
            label = label_map.get(name, name)
            delta_str = f"{comp['delta']:+.2f}" if comp['delta'] is not None else "N/A"
            lines.append(f"  [{label}] Δ={delta_str}  影响度: {comp['impact_level']}")
            lines.append(f"      {comp['note']}")
        lines.append("")
        lines.append("-- 判定链路 --")
        for step in decomp["verdict_chain"]:
            lines.append(f"  * {step['stage']}: {step['verdict']}")
        return "\n".join(lines)
