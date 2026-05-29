"""
异常场景处理模块
================

## 处理的异常场景

1. **冷启动 (Cold Start)**
   - 判定：历史记录 < 14天 或 唯一状态 < 5种
   - 策略：先验转移矩阵 + 领域知识加权 + 逐日更新权重

2. **状态跳变 (State Jump)**
   - 判定：当前状态在历史中从未出现，或转移概率 < 0.01 但实际发生
   - 策略：标记异常 + 相邻状态插值 + 人工复核建议

3. **样本稀疏 (Sparse Data)**
   - 判定：某状态出现次数 < 5 或 稀疏状态占比 > 30%
   - 策略：拉普拉斯平滑 + 状态聚类合并 + 可信度加权

4. **异常样本检测**
   - 负销量、负库存、超3倍均值销量、超7天库存等
"""

from typing import List, Dict, Tuple, Optional
from collections import defaultdict
import math

from models import (
    StateKey, SalesState, WeatherTag, HolidayTag,
    DailyRecord
)
from markov_core import MarkovInventoryPredictor, ALL_SALES_STATES, ALL_WEATHER_TAGS, ALL_HOLIDAY_TAGS


class AnomalyHandler:
    def __init__(self, predictor: MarkovInventoryPredictor):
        self.predictor = predictor

    def detect_all_anomalies(self, records: List[DailyRecord]) -> List[DailyRecord]:
        anomalies = []
        for r in records:
            if r.is_anomaly:
                anomalies.append(r)
            else:
                if self._check_state_jump(r):
                    r.is_anomaly = True
                    r.anomaly_reason = f"状态跳变：从{r.sales_state.value}异常转移"
                    anomalies.append(r)
        
        anomalies.extend(self._detect_sequence_anomalies(records))
        return anomalies

    def _check_state_jump(self, record: DailyRecord) -> bool:
        if not record.state_key:
            return False
        
        state_count = self.predictor.state_counts.get(record.state_key, 0)
        if state_count == 0:
            return True
        
        total = sum(self.predictor.state_counts.values())
        if total > 0 and state_count / total < 0.01:
            return True
        
        return False

    def _detect_sequence_anomalies(self, records: List[DailyRecord]) -> List[DailyRecord]:
        anomalies = []
        sales_order = [SalesState.VERY_LOW, SalesState.LOW, SalesState.MEDIUM, 
                       SalesState.HIGH, SalesState.VERY_HIGH]
        
        for i in range(1, len(records)):
            prev, curr = records[i-1], records[i]
            if not prev.sales_state or not curr.sales_state:
                continue
            
            if prev.sales_state in sales_order and curr.sales_state in sales_order:
                prev_idx = sales_order.index(prev.sales_state)
                curr_idx = sales_order.index(curr.sales_state)
                jump_size = abs(curr_idx - prev_idx)
                
                if jump_size >= 3:
                    if not curr.is_anomaly:
                        curr.is_anomaly = True
                        curr.anomaly_reason = f"销量状态跳变：从{prev.sales_state.value}到{curr.sales_state.value}（跳跃{jump_size}级）"
                        anomalies.append(curr)
        
        return anomalies

    def handle_cold_start(self, records: List[DailyRecord]) -> Dict:
        record_count = len(records)
        unique_states = len(self.predictor.state_counts)
        
        if record_count >= 14 and unique_states >= 5:
            return {"cold_start": False, "message": "数据充足，无需冷启动处理"}
        
        prior_strength = max(0, 14 - record_count) / 14
        recommendations = []
        
        if record_count < 7:
            recommendations.append("建议：至少收集7天数据后再进行正式预测")
            recommendations.append("当前预测基于行业基准数据，可信度较低")
        elif record_count < 14:
            recommendations.append("建议：继续收集数据至14天以上以提高预测准确度")
        
        if unique_states < 5:
            recommendations.append("状态覆盖不足，已启用状态合并策略")
        
        recommendations.append(f"先验权重：{prior_strength:.1%}，经验权重：{1-prior_strength:.1%}")
        
        return {
            "cold_start": True,
            "record_count": record_count,
            "unique_states": unique_states,
            "prior_strength": round(prior_strength, 3),
            "recommendations": recommendations,
            "confidence_adjustment": round(0.3 + 0.4 * (record_count / 14), 2)
        }

    def handle_sparse_data(self) -> Dict:
        state_counts = self.predictor.state_counts
        total_states = len(state_counts)
        
        if total_states == 0:
            return {"sparse_data": False}
        
        sparse_threshold = self.predictor.min_samples_for_transition
        sparse_states = {s: c for s, c in state_counts.items() if c < sparse_threshold}
        sparse_count = len(sparse_states)
        sparse_ratio = sparse_count / total_states
        
        if sparse_ratio <= 0.3:
            return {
                "sparse_data": False,
                "sparse_ratio": round(sparse_ratio, 3),
                "message": "样本密度正常"
            }
        
        merged_groups = self._cluster_sparse_states(sparse_states)
        smoothed_matrix_info = self._apply_smoothing(sparse_states)
        
        return {
            "sparse_data": True,
            "sparse_ratio": round(sparse_ratio, 3),
            "sparse_states_count": sparse_count,
            "total_states": total_states,
            "merged_groups": merged_groups,
            "smoothing_applied": smoothed_matrix_info,
            "recommendations": [
                f"已对{sparse_count}个稀疏状态启用拉普拉斯平滑",
                f"合并为{len(merged_groups)}个状态聚类",
                "建议：在稀疏状态对应的场景下增加数据采集"
            ]
        }

    def _cluster_sparse_states(self, sparse_states: Dict[StateKey, int]) -> List[Dict]:
        groups = defaultdict(list)
        
        for state in sparse_states:
            cluster_key = (state.sales_state, state.holiday)
            groups[cluster_key].append(state)
        
        result = []
        for (sales, holiday), states in groups.items():
            if len(states) >= 2:
                result.append({
                    "cluster": f"{sales.value}_{holiday.value}",
                    "weather_tags_merged": [s.weather.value for s in states],
                    "total_count": sum(sparse_states[s] for s in states),
                    "states_merged": len(states)
                })
        
        return result

    def _apply_smoothing(self, sparse_states: Dict[StateKey, int]) -> Dict:
        alpha = self.predictor.alpha
        smoothed_count = 0
        
        for state in sparse_states:
            count = sparse_states[state]
            if count < self.predictor.min_samples_for_transition:
                smoothed_count += 1
        
        return {
            "smoothed_transitions": smoothed_count,
            "alpha": alpha,
            "method": "拉普拉斯平滑 + 先验加权",
            "formula": "P = (N + α×P_prior) / (N_total + α)"
        }

    def handle_state_jump(self, current_state: StateKey, 
                          records: List[DailyRecord]) -> Dict:
        state_count = self.predictor.state_counts.get(current_state, 0)
        
        if state_count > 0:
            transitions = [
                ((s1, s2), c) for (s1, s2), c in self.predictor.transition_counts.items()
                if s1 == current_state
            ]
            total_trans = sum(c for _, c in transitions)
            
            if total_trans > 0:
                top_trans = max(transitions, key=lambda x: x[1])
                top_prob = top_trans[1] / total_trans
                
                if top_prob < 0.2:
                    return self._process_jump(current_state, records, "转移分布过于分散")
        
        if state_count == 0:
            return self._process_jump(current_state, records, "当前状态从未出现过")
        
        return {"state_jump": False}

    def _process_jump(self, current_state: StateKey, records: List[DailyRecord], 
                      reason: str) -> Dict:
        similar_states = self._find_similar_states(current_state)
        interpolated_transitions = self._interpolate_from_neighbors(current_state, similar_states)
        
        forecast_adjustment = 1.0
        if current_state.sales_state in [SalesState.VERY_HIGH, SalesState.HIGH]:
            forecast_adjustment = 1.2
        elif current_state.sales_state in [SalesState.VERY_LOW, SalesState.LOW]:
            forecast_adjustment = 0.8
        
        return {
            "state_jump": True,
            "reason": reason,
            "similar_states_used": [str(s) for s in similar_states[:3]],
            "interpolation_method": "距离加权反插值",
            "forecast_adjustment_factor": forecast_adjustment,
            "recommendations": [
                f"状态跳变检测：{reason}",
                f"已使用{len(similar_states)}个相邻状态进行插值",
                "建议：人工复核本次预测结果",
                "建议：分析跳变原因（促销、事件、缺货等）"
            ],
            "interpolated_transitions": interpolated_transitions
        }

    def _find_similar_states(self, target: StateKey) -> List[Tuple[StateKey, float]]:
        sales_order = [SalesState.VERY_LOW, SalesState.LOW, SalesState.MEDIUM, 
                       SalesState.HIGH, SalesState.VERY_HIGH]
        
        scored = []
        for state in self.predictor.state_counts:
            dist = 0
            
            if target.sales_state in sales_order and state.sales_state in sales_order:
                dist += abs(sales_order.index(target.sales_state) - 
                           sales_order.index(state.sales_state))
            elif target.sales_state != state.sales_state:
                dist += 2
            
            if target.weather != state.weather:
                if (target.weather in [WeatherTag.RAINY, WeatherTag.SNOWY] and
                    state.weather in [WeatherTag.RAINY, WeatherTag.SNOWY]):
                    dist += 0.5
                else:
                    dist += 1
            
            if target.holiday != state.holiday:
                dist += 1
            
            scored.append((state, dist))
        
        scored.sort(key=lambda x: x[1])
        return [(s, d) for s, d in scored if d < 4][:5]

    def _interpolate_from_neighbors(self, target: StateKey, 
                                    neighbors: List[Tuple[StateKey, float]]) -> Dict:
        if not neighbors:
            return {}
        
        result: Dict[StateKey, float] = defaultdict(float)
        total_weight = 0.0
        
        for state, distance in neighbors:
            weight = 1.0 / (distance + 1.0) ** 2
            total_weight += weight
            
            for (s_from, s_to), count in self.predictor.transition_counts.items():
                if s_from == state:
                    total = self.predictor.state_counts.get(state, 1)
                    prob = count / total
                    result[s_to] += weight * prob
        
        if total_weight > 0:
            for s_to in result:
                result[s_to] /= total_weight
        
        return {str(k): round(v, 4) for k, v in result.items() if v > 0.01}

    def validate_boundary_conditions(self, current_inventory: float,
                                     forecast_demand: float,
                                     lead_time_days: int = 1) -> Dict:
        issues = []
        
        if current_inventory < 0:
            issues.append({
                "severity": "critical",
                "type": "负库存",
                "message": f"当前库存为{current_inventory}，存在数据错误或盘点遗漏"
            })
        
        if forecast_demand < 0:
            issues.append({
                "severity": "critical",
                "type": "负预测需求",
                "message": f"预测需求为{forecast_demand}，算法异常"
            })
        
        if current_inventory > forecast_demand * 3:
            issues.append({
                "severity": "warning",
                "type": "库存过高",
                "message": f"当前库存{current_inventory}是预测需求{forecast_demand:.1f}的3倍以上"
            })
        
        if lead_time_days > 7:
            issues.append({
                "severity": "warning",
                "type": "补货周期过长",
                "message": f"补货周期{lead_time_days}天超过7天，缺货风险增加"
            })
        
        daily_usage = forecast_demand / max(1, lead_time_days)
        if current_inventory < daily_usage * lead_time_days:
            shortage = daily_usage * lead_time_days - current_inventory
            issues.append({
                "severity": "high",
                "type": "即将缺货",
                "message": f"按当前销量，库存仅能维持{current_inventory/daily_usage:.1f}天，缺货{shortage:.1f}单位"
            })
        
        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "daily_usage_rate": round(daily_usage, 2),
            "inventory_coverage_days": round(current_inventory / daily_usage, 1) if daily_usage > 0 else 999
        }

    def clean_anomalous_records(self, records: List[DailyRecord]) -> Tuple[List[DailyRecord], List[DailyRecord]]:
        cleaned = []
        anomalies = []
        
        for r in records:
            if not r.is_anomaly:
                cleaned.append(r)
            else:
                reason = r.anomaly_reason or "未知异常"
                
                if "负销量" in reason and r.sales_quantity < 0:
                    r.sales_quantity = 0
                    r.is_anomaly = False
                    r.anomaly_reason += "（已修正为0）"
                
                if "负库存" in reason and r.ending_inventory < 0:
                    r.ending_inventory = 0
                    r.is_anomaly = False
                    r.anomaly_reason += "（已修正为0）"
                
                if r.is_anomaly:
                    anomalies.append(r)
                else:
                    cleaned.append(r)
        
        return cleaned, anomalies
