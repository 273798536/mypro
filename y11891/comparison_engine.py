"""
对比分析引擎
============

用于两次运行结果的差异对比，标出：
1. 转移矩阵的变化（新增/消失/概率变动）
2. 状态概率分布的变化
3. 补货建议的变化
4. 新增的异常样本
5. 数据质量指标的变化
"""

from typing import List, Dict, Tuple, Optional
from collections import defaultdict
from datetime import datetime

from models import (
    StateKey, SalesState, WeatherTag, HolidayTag,
    DailyRecord, PredictionResult, ComparisonResult,
    RestockSuggestion
)


class ComparisonEngine:
    def __init__(self, prob_threshold: float = 0.01, 
                 change_threshold: float = 0.05):
        self.prob_threshold = prob_threshold
        self.change_threshold = change_threshold

    def compare_runs(self, first_run: PredictionResult,
                     second_run: PredictionResult) -> ComparisonResult:
        assert first_run.product_id == second_run.product_id, "产品ID不一致，无法对比"
        
        matrix_changes = self._compare_transition_matrices(
            first_run.transition_matrix,
            second_run.transition_matrix
        )
        
        restock_changes = self._compare_restock_suggestions(
            first_run.restock_suggestion,
            second_run.restock_suggestion
        )
        
        state_prob_changes = self._compare_state_probabilities(
            first_run.state_probabilities,
            second_run.state_probabilities
        )
        
        new_anomalies = self._compare_anomalies(
            first_run.anomalies,
            second_run.anomalies
        )
        
        data_quality_changes = self._compare_data_quality(
            first_run.data_quality,
            second_run.data_quality
        )
        
        return ComparisonResult(
            product_id=first_run.product_id,
            product_name=first_run.product_name,
            first_run=first_run,
            second_run=second_run,
            transition_matrix_changes=matrix_changes,
            restock_changes=restock_changes,
            state_probability_changes=state_prob_changes,
            new_anomalies=new_anomalies,
            data_quality_changes=data_quality_changes
        )

    def _compare_transition_matrices(self,
                                     matrix1: Dict[str, float],
                                     matrix2: Dict[str, float]) -> List[Dict]:
        changes = []
        
        all_keys = set(matrix1.keys()) | set(matrix2.keys())
        
        for key in all_keys:
            p1 = matrix1.get(key, 0.0)
            p2 = matrix2.get(key, 0.0)
            delta = p2 - p1
            change_pct = (delta / p1 * 100) if p1 > 0 else float('inf')
            
            if abs(delta) < self.change_threshold and p1 > 0 and p2 > 0:
                continue
            
            if p1 <= self.prob_threshold and p2 <= self.prob_threshold:
                continue
            
            change_type = self._classify_change(p1, p2)
            
            s_from_str, s_to_str = key.split('->')
            s1_parts = s_from_str.split('|')
            s2_parts = s_to_str.split('|')
            
            change_record = {
                "transition": key,
                "from_state": {
                    "sales": s1_parts[0],
                    "weather": s1_parts[1],
                    "holiday": s1_parts[2]
                },
                "to_state": {
                    "sales": s2_parts[0],
                    "weather": s2_parts[1],
                    "holiday": s2_parts[2]
                },
                "prob_first": round(p1, 4),
                "prob_second": round(p2, 4),
                "delta_absolute": round(delta, 4),
                "delta_percentage": round(change_pct, 1) if change_pct != float('inf') else "N/A",
                "change_type": change_type,
                "is_significant": abs(delta) >= self.change_threshold
            }
            
            if change_type != "unchanged":
                changes.append(change_record)
        
        changes.sort(key=lambda x: -abs(x["delta_absolute"]))
        return changes

    def _classify_change(self, p1: float, p2: float) -> str:
        if p1 <= self.prob_threshold and p2 > self.prob_threshold:
            return "new"
        elif p1 > self.prob_threshold and p2 <= self.prob_threshold:
            return "disappeared"
        elif p2 > p1 + self.change_threshold:
            return "increased"
        elif p2 < p1 - self.change_threshold:
            return "decreased"
        else:
            return "unchanged"

    def _compare_restock_suggestions(self,
                                     s1: RestockSuggestion,
                                     s2: RestockSuggestion) -> Dict:
        delta_qty = s2.suggested_restock - s1.suggested_restock
        delta_pct = (delta_qty / s1.suggested_restock * 100) if s1.suggested_restock > 0 else float('inf')
        
        state_changes = []
        for i, (st1, st2) in enumerate(zip(s1.forecast_states, s2.forecast_states)):
            if st1 != st2:
                state_changes.append({
                    "day": i + 1,
                    "first_state": st1.value,
                    "second_state": st2.value,
                    "change_direction": self._get_state_change_direction(st1, st2)
                })
        
        reasoning_changes = self._compare_reasoning(s1.reasoning, s2.reasoning)
        
        transition_changes = []
        trans1_dict = {(str(t[0]), str(t[1])): t[2] for t in s1.state_transitions}
        trans2_dict = {(str(t[0]), str(t[1])): t[2] for t in s2.state_transitions}
        
        all_trans = set(trans1_dict.keys()) | set(trans2_dict.keys())
        for (s_from, s_to) in all_trans:
            p1 = trans1_dict.get((s_from, s_to), 0)
            p2 = trans2_dict.get((s_from, s_to), 0)
            if abs(p2 - p1) >= self.change_threshold:
                transition_changes.append({
                    "from": s_from,
                    "to": s_to,
                    "prob_first": p1,
                    "prob_second": p2,
                    "delta": round(p2 - p1, 4)
                })
        
        return {
            "suggested_restock": {
                "first": s1.suggested_restock,
                "second": s2.suggested_restock,
                "delta_absolute": round(delta_qty, 2),
                "delta_percentage": round(delta_pct, 1) if delta_pct != float('inf') else "N/A",
                "change_direction": "increase" if delta_qty > 0 else "decrease" if delta_qty < 0 else "unchanged"
            },
            "forecast_demand": {
                "first": s1.forecast_demand,
                "second": s2.forecast_demand,
                "delta_absolute": round(s2.forecast_demand - s1.forecast_demand, 2),
                "delta_percentage": round((s2.forecast_demand - s1.forecast_demand) / max(s1.forecast_demand, 0.01) * 100, 1)
            },
            "safety_stock": {
                "first": s1.safety_stock,
                "second": s2.safety_stock,
                "delta_absolute": round(s2.safety_stock - s1.safety_stock, 2),
                "delta_percentage": round((s2.safety_stock - s1.safety_stock) / max(s1.safety_stock, 0.01) * 100, 1)
            },
            "confidence": {
                "first": s1.confidence,
                "second": s2.confidence,
                "delta": round(s2.confidence - s1.confidence, 2)
            },
            "forecast_state_changes": state_changes,
            "key_transition_changes": transition_changes,
            "reasoning_changes": reasoning_changes,
            "business_impact": self._assess_business_impact(s1, s2)
        }

    def _get_state_change_direction(self, s1: SalesState, s2: SalesState) -> str:
        order = [SalesState.VERY_LOW, SalesState.LOW, SalesState.MEDIUM,
                 SalesState.HIGH, SalesState.VERY_HIGH]
        
        if s1 not in order or s2 not in order:
            return "special_state_change"
        
        idx1, idx2 = order.index(s1), order.index(s2)
        if idx2 > idx1:
            return f"up_{idx2-idx1}_level(s)"
        elif idx2 < idx1:
            return f"down_{idx1-idx2}_level(s)"
        else:
            return "unchanged"

    def _compare_reasoning(self, r1: str, r2: str) -> Dict:
        lines1 = set(r1.split('\n'))
        lines2 = set(r2.split('\n'))
        
        added = list(lines2 - lines1)
        removed = list(lines1 - lines2)
        unchanged = list(lines1 & lines2)
        
        return {
            "added_lines": added,
            "removed_lines": removed,
            "unchanged_count": len(unchanged)
        }

    def _assess_business_impact(self, s1: RestockSuggestion, s2: RestockSuggestion) -> Dict:
        delta_qty = s2.suggested_restock - s1.suggested_restock
        
        if abs(delta_qty) < 0.1:
            level = "low"
            description = "补货建议无变化"
        elif abs(delta_qty) < s1.suggested_restock * 0.1:
            level = "medium"
            description = "补货建议小幅调整"
        else:
            level = "high"
            description = "补货建议重大调整，需重点关注"
        
        return {
            "impact_level": level,
            "description": description,
            "action_required": level in ["medium", "high"],
            "estimated_cost_change": round(delta_qty * 10, 2)
        }

    def _compare_state_probabilities(self,
                                      probs1: Dict[str, Dict[str, float]],
                                      probs2: Dict[str, Dict[str, float]]) -> List[Dict]:
        changes = []
        all_days = set(probs1.keys()) | set(probs2.keys())
        
        for day in sorted(all_days, key=lambda x: int(x)):
            day_probs1 = probs1.get(day, {})
            day_probs2 = probs2.get(day, {})
            
            all_states = set(day_probs1.keys()) | set(day_probs2.keys())
            
            for state in all_states:
                p1 = day_probs1.get(state, 0.0)
                p2 = day_probs2.get(state, 0.0)
                delta = p2 - p1
                
                if abs(delta) < self.change_threshold:
                    continue
                
                if p1 < self.prob_threshold and p2 < self.prob_threshold:
                    continue
                
                state_parts = state.split('|')
                changes.append({
                    "day": int(day),
                    "state": state,
                    "sales_state": state_parts[0] if len(state_parts) > 0 else "",
                    "weather": state_parts[1] if len(state_parts) > 1 else "",
                    "holiday": state_parts[2] if len(state_parts) > 2 else "",
                    "prob_first": round(p1, 4),
                    "prob_second": round(p2, 4),
                    "delta": round(delta, 4),
                    "change_type": "increase" if delta > 0 else "decrease"
                })
        
        changes.sort(key=lambda x: (-abs(x["delta"]), x["day"]))
        return changes[:20]

    def _compare_anomalies(self,
                           anomalies1: List[DailyRecord],
                           anomalies2: List[DailyRecord]) -> List[DailyRecord]:
        anomaly_keys1 = {(a.date, a.product_id, a.anomaly_reason) for a in anomalies1}
        
        new_anomalies = []
        for a in anomalies2:
            key = (a.date, a.product_id, a.anomaly_reason)
            if key not in anomaly_keys1:
                new_anomalies.append(a)
        
        return new_anomalies

    def _compare_data_quality(self,
                               dq1: Dict,
                               dq2: Dict) -> Dict:
        changes = {}
        all_keys = set(dq1.keys()) | set(dq2.keys())
        
        for key in all_keys:
            v1 = dq1.get(key, 0)
            v2 = dq2.get(key, 0)
            
            if isinstance(v1, (int, float)) and isinstance(v2, (int, float)):
                delta = v2 - v1
                if abs(delta) > 0.001:
                    changes[key] = {
                        "first": round(v1, 4) if isinstance(v1, float) else v1,
                        "second": round(v2, 4) if isinstance(v2, float) else v2,
                        "delta": round(delta, 4),
                        "improved": self._is_quality_improved(key, delta)
                    }
        
        summary = self._summarize_quality_changes(changes)
        changes["_summary"] = summary
        
        return changes

    def _is_quality_improved(self, key: str, delta: float) -> Optional[bool]:
        improved_keys = ["confidence_score", "total_records", "unique_states", 
                         "unique_transitions", "state_coverage"]
        degraded_keys = ["sparse_states", "sparse_states_ratio"]
        
        if key in improved_keys:
            return delta > 0
        elif key in degraded_keys:
            return delta < 0
        else:
            return None

    def _summarize_quality_changes(self, changes: Dict) -> Dict:
        improvements = 0
        degradations = 0
        neutral = 0
        
        for key, value in changes.items():
            if key == "_summary":
                continue
            if value.get("improved") is True:
                improvements += 1
            elif value.get("improved") is False:
                degradations += 1
            else:
                neutral += 1
        
        if improvements > degradations:
            overall = "improved"
        elif degradations > improvements:
            overall = "degraded"
        else:
            overall = "unchanged"
        
        return {
            "overall_trend": overall,
            "improvements_count": improvements,
            "degradations_count": degradations,
            "neutral_count": neutral,
            "total_changes": improvements + degradations + neutral
        }

    def print_comparison_report(self, result: ComparisonResult) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append("马尔可夫库存预测 - 两次运行对比报告")
        lines.append("=" * 60)
        lines.append(f"产品：{result.product_name} ({result.product_id})")
        lines.append(f"第一次运行：{result.first_run.run_timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"第二次运行：{result.second_run.run_timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")
        
        rc = result.restock_changes
        lines.append("-" * 40)
        lines.append("📦 补货建议变化")
        lines.append("-" * 40)
        sr = rc["suggested_restock"]
        lines.append(f"  补货量：{sr['first']:.1f} → {sr['second']:.1f}")
        lines.append(f"  变化量：{sr['delta_absolute']:+.1f} ({sr['delta_percentage']}%)")
        lines.append(f"  预测需求：{rc['forecast_demand']['first']:.1f} → {rc['forecast_demand']['second']:.1f}")
        lines.append(f"  安全库存：{rc['safety_stock']['first']:.1f} → {rc['safety_stock']['second']:.1f}")
        lines.append(f"  置信度：{rc['confidence']['first']:.2f} → {rc['confidence']['second']:.2f}")
        lines.append(f"  业务影响：{rc['business_impact']['impact_level'].upper()} - {rc['business_impact']['description']}")
        
        if rc["forecast_state_changes"]:
            lines.append("")
            lines.append("  预测状态变化：")
            for sc in rc["forecast_state_changes"][:5]:
                lines.append(f"    第{sc['day']}天：{sc['first_state']} → {sc['second_state']} ({sc['change_direction']})")
        
        if rc["reasoning_changes"]["added_lines"]:
            lines.append("")
            lines.append("  新增推理逻辑：")
            for line in rc["reasoning_changes"]["added_lines"][:3]:
                lines.append(f"    + {line}")
        
        if result.transition_matrix_changes:
            lines.append("")
            lines.append("-" * 40)
            lines.append("🔄 转移矩阵变化（Top 5）")
            lines.append("-" * 40)
            for tc in result.transition_matrix_changes[:5]:
                arrow = "↑" if tc["change_type"] == "increased" else "↓" if tc["change_type"] == "decreased" else "✚" if tc["change_type"] == "new" else "✕"
                lines.append(f"  {arrow} {tc['transition']}")
                lines.append(f"    {tc['prob_first']:.4f} → {tc['prob_second']:.4f} ({tc['delta_percentage']}%)")
        
        if result.new_anomalies:
            lines.append("")
            lines.append("-" * 40)
            lines.append(f"⚠️  新增异常样本 ({len(result.new_anomalies)} 条)")
            lines.append("-" * 40)
            for anomaly in result.new_anomalies[:5]:
                lines.append(f"  {anomaly.date}: {anomaly.anomaly_reason}")
                lines.append(f"    销量={anomaly.sales_quantity}, 库存={anomaly.ending_inventory}")
        
        dq = result.data_quality_changes
        if "_summary" in dq and dq["_summary"]["total_changes"] > 0:
            lines.append("")
            lines.append("-" * 40)
            lines.append(f"📊 数据质量变化（{dq['_summary']['overall_trend'].upper()}）")
            lines.append("-" * 40)
            for key, value in dq.items():
                if key == "_summary":
                    continue
                arrow = "↑" if value.get("improved") else "↓" if value.get("improved") is False else "→"
                lines.append(f"  {arrow} {key}: {value['first']} → {value['second']} ({value['delta']:+.3f})")
        
        lines.append("")
        lines.append("=" * 60)
        
        return "\n".join(lines)
