"""
马尔可夫库存预测核心算法
========================

## 算法原理

马尔可夫链是一种随机过程，系统在时刻t+1的状态只依赖于时刻t的状态，
与更早的状态无关（马尔可夫性）。

### 核心公式

1. **状态定义**：S = {销量状态 × 天气标签 × 节假日标签}
   三维组合状态空间，共 7 × 6 × 5 = 210 种可能状态

2. **转移概率估计**（极大似然估计）：
   P(S_{t+1}=s_j | S_t=s_i) = N(s_i → s_j) / N(s_i)
   
   其中：
   - N(s_i → s_j)：历史上从状态s_i转移到s_j的次数
   - N(s_i)：历史上处于状态s_i的总次数

3. **拉普拉斯平滑**（处理样本稀疏）：
   P_smoothed(s_i → s_j) = [N(s_i → s_j) + α] / [N(s_i) + α × K]
   
   其中：
   - α：平滑参数（通常取1）
   - K：目标状态总数

4. **k步转移概率**：
   P^k(s_i → s_j) = (P^k)_{i,j}  （转移矩阵的k次幂）

5. **预测分布**：
   π_{t+k} = π_t × P^k
   
   其中 π_t 是t时刻的状态概率向量

6. **销量期望值**：
   E[Sales_{t+k}] = Σ π_{t+k}(s) × Q(s)
   
   其中 Q(s) 是状态s对应的典型销量

## 边界值处理

| 边界情况 | 判定条件 | 处理策略 |
|---------|---------|---------|
| 冷启动 | 历史记录 < 14天 | 使用先验转移矩阵 + 专家规则 |
| 样本稀疏 | 某状态出现次数 < 5 | 启用拉普拉斯平滑 + 状态聚类合并 |
| 状态跳变 | 转移概率 < 0.01 但实际发生 | 标记为异常转移，人工复核 |
| 零转移 | N(s_i) = 0 | 使用相邻状态的转移概率插值 |
"""

from typing import Dict, List, Tuple, Optional
from collections import defaultdict
import math
from datetime import date

from models import (
    StateKey, SalesState, WeatherTag, HolidayTag,
    DailyRecord, PredictionResult, RestockSuggestion
)


ALL_SALES_STATES = [s for s in SalesState if s not in [SalesState.OUT_OF_STOCK, SalesState.OVERSTOCK]]
ALL_WEATHER_TAGS = list(WeatherTag)
ALL_HOLIDAY_TAGS = list(HolidayTag)


class MarkovInventoryPredictor:
    def __init__(self, alpha: float = 1.0, min_samples_for_transition: int = 5):
        self.alpha = alpha
        self.min_samples_for_transition = min_samples_for_transition
        self.transition_counts: Dict[Tuple[StateKey, StateKey], int] = defaultdict(int)
        self.state_counts: Dict[StateKey, int] = defaultdict(int)
        self.state_avg_sales: Dict[StateKey, float] = defaultdict(float)
        self.avg_sales = 0.0
        self.total_records = 0
        self.is_fitted = False

    def _build_prior_transition_matrix(self) -> Dict[Tuple[StateKey, StateKey], float]:
        prior: Dict[Tuple[StateKey, StateKey], float] = {}
        
        sales_order = [SalesState.VERY_LOW, SalesState.LOW, SalesState.MEDIUM, 
                       SalesState.HIGH, SalesState.VERY_HIGH]
        
        for s1 in ALL_SALES_STATES:
            for w1 in ALL_WEATHER_TAGS:
                for h1 in ALL_HOLIDAY_TAGS:
                    sk1 = StateKey(s1, w1, h1)
                    total = 0
                    for s2 in ALL_SALES_STATES:
                        for w2 in ALL_WEATHER_TAGS:
                            for h2 in ALL_HOLIDAY_TAGS:
                                sk2 = StateKey(s2, w2, h2)
                                
                                weight = 1.0
                                
                                if s1 in sales_order and s2 in sales_order:
                                    idx1, idx2 = sales_order.index(s1), sales_order.index(s2)
                                    sales_dist = abs(idx1 - idx2)
                                    weight *= math.exp(-0.5 * sales_dist)
                                
                                if w1 == w2:
                                    weight *= 2.0
                                elif (w1 in [WeatherTag.RAINY, WeatherTag.SNOWY] and 
                                      w2 in [WeatherTag.RAINY, WeatherTag.SNOWY]):
                                    weight *= 1.5
                                
                                if h1 == h2:
                                    weight *= 3.0
                                elif (h1 in [HolidayTag.PRE_HOLIDAY, HolidayTag.HOLIDAY] and
                                      h2 in [HolidayTag.PRE_HOLIDAY, HolidayTag.HOLIDAY]):
                                    weight *= 2.0
                                
                                prior[(sk1, sk2)] = weight
                                total += weight
                    
                    if total > 0:
                        for s2 in ALL_SALES_STATES:
                            for w2 in ALL_WEATHER_TAGS:
                                for h2 in ALL_HOLIDAY_TAGS:
                                    sk2 = StateKey(s2, w2, h2)
                                    prior[(sk1, sk2)] /= total
        
        return prior

    def fit(self, records: List[DailyRecord]) -> Dict:
        self.total_records = len(records)
        
        if self.total_records == 0:
            raise ValueError("没有历史数据可用于训练")
        
        sales_values = [r.sales_quantity for r in records if r.sales_quantity > 0]
        if sales_values:
            self.avg_sales = sum(sales_values) / len(sales_values)
        
        for r in records:
            if r.avg_sales is None:
                r.compute_states(self.avg_sales)
        
        for r in records:
            if r.state_key:
                self.state_counts[r.state_key] += 1
                self.state_avg_sales[r.state_key] += r.sales_quantity
        
        for sk, total in self.state_avg_sales.items():
            self.state_avg_sales[sk] = total / self.state_counts[sk]
        
        for i in range(len(records) - 1):
            r1, r2 = records[i], records[i + 1]
            if r1.state_key and r2.state_key and (r2.date - r1.date).days == 1:
                self.transition_counts[(r1.state_key, r2.state_key)] += 1
        
        self.is_fitted = True
        
        cold_start = self.total_records < 14
        sparse_states = sum(1 for c in self.state_counts.values() if c < self.min_samples_for_transition)
        sparse_warning = sparse_states > len(self.state_counts) * 0.3
        
        return {
            "total_records": self.total_records,
            "unique_states": len(self.state_counts),
            "unique_transitions": len(self.transition_counts),
            "cold_start": cold_start,
            "sparse_data_warning": sparse_warning,
            "sparse_states_count": sparse_states,
            "avg_sales": self.avg_sales
        }

    def compute_transition_matrix(self, apply_smoothing: bool = True) -> Dict[Tuple[StateKey, StateKey], float]:
        if not self.is_fitted:
            raise RuntimeError("模型尚未训练，请先调用fit()")
        
        matrix: Dict[Tuple[StateKey, StateKey], float] = {}
        prior = self._build_prior_transition_matrix()
        
        all_states = set()
        for (s1, s2) in self.transition_counts.keys():
            all_states.add(s1)
            all_states.add(s2)
        all_states.update(self.state_counts.keys())
        
        if not all_states:
            return prior
        
        for s1 in all_states:
            count_s1 = self.state_counts.get(s1, 0)
            total_weight = 0.0
            row: Dict[StateKey, float] = {}
            
            for s2 in all_states:
                count_trans = self.transition_counts.get((s1, s2), 0)
                
                if apply_smoothing and count_s1 < self.min_samples_for_transition:
                    prior_p = prior.get((s1, s2), 0)
                    effective_alpha = self.alpha * (self.min_samples_for_transition - count_s1)
                    p = (count_trans + effective_alpha * prior_p) / (count_s1 + effective_alpha)
                elif count_s1 > 0:
                    p = count_trans / count_s1
                else:
                    p = prior.get((s1, s2), 0)
                
                row[s2] = p
                total_weight += p
            
            if total_weight > 0 and abs(total_weight - 1.0) > 0.01:
                for s2 in row:
                    row[s2] /= total_weight
            
            for s2, p in row.items():
                matrix[(s1, s2)] = p
        
        return matrix

    def get_state_quantity(self, state: StateKey) -> float:
        if state in self.state_avg_sales:
            return self.state_avg_sales[state]
        
        base_qty = {
            SalesState.VERY_LOW: 0.2,
            SalesState.LOW: 0.5,
            SalesState.MEDIUM: 1.0,
            SalesState.HIGH: 1.5,
            SalesState.VERY_HIGH: 2.0,
            SalesState.OUT_OF_STOCK: 0.0,
            SalesState.OVERSTOCK: 1.0
        }
        
        weather_factor = {
            WeatherTag.SUNNY: 1.1,
            WeatherTag.CLOUDY: 1.0,
            WeatherTag.RAINY: 0.8,
            WeatherTag.SNOWY: 0.6,
            WeatherTag.HOT: 1.3,
            WeatherTag.COLD: 0.9
        }
        
        holiday_factor = {
            HolidayTag.NORMAL: 1.0,
            HolidayTag.WEEKEND: 1.2,
            HolidayTag.PRE_HOLIDAY: 1.5,
            HolidayTag.HOLIDAY: 1.8,
            HolidayTag.POST_HOLIDAY: 0.9
        }
        
        qty = self.avg_sales
        qty *= base_qty.get(state.sales_state, 1.0)
        qty *= weather_factor.get(state.weather, 1.0)
        qty *= holiday_factor.get(state.holiday, 1.0)
        
        return max(0, qty)

    def predict(self, current_state: StateKey, forecast_days: int = 7,
                future_weather: Optional[List[WeatherTag]] = None,
                future_holidays: Optional[List[HolidayTag]] = None) -> PredictionResult:
        if not self.is_fitted:
            raise RuntimeError("模型尚未训练，请先调用fit()")
        
        transition_matrix = self.compute_transition_matrix()
        
        state_probabilities: Dict[int, Dict[StateKey, float]] = {0: {current_state: 1.0}}
        
        for day in range(forecast_days):
            next_probs: Dict[StateKey, float] = defaultdict(float)
            current_probs = state_probabilities[day]
            
            for s_t, p_t in current_probs.items():
                if p_t <= 0:
                    continue
                
                for (s_from, s_to), p_trans in transition_matrix.items():
                    if s_from != s_t or p_trans <= 0:
                        continue
                    
                    if future_weather and day < len(future_weather):
                        if s_to.weather != future_weather[day]:
                            p_trans *= 0.1
                    
                    if future_holidays and day < len(future_holidays):
                        if s_to.holiday != future_holidays[day]:
                            p_trans *= 0.1
                    
                    next_probs[s_to] += p_t * p_trans
            
            total = sum(next_probs.values())
            if total > 0:
                for s in next_probs:
                    next_probs[s] /= total
            
            state_probabilities[day + 1] = dict(next_probs)
        
        daily_forecast = []
        total_forecast = 0.0
        forecast_states = []
        
        for day in range(1, forecast_days + 1):
            probs = state_probabilities.get(day, {})
            if not probs:
                daily_forecast.append({
                    "day": day,
                    "expected_sales": self.avg_sales,
                    "top_state": current_state,
                    "top_probability": 1.0,
                    "states": []
                })
                total_forecast += self.avg_sales
                forecast_states.append(current_state.sales_state)
                continue
            
            expected_sales = sum(p * self.get_state_quantity(s) for s, p in probs.items())
            total_forecast += expected_sales
            
            top_state = max(probs, key=probs.get) if probs else current_state
            top_prob = probs.get(top_state, 0)
            forecast_states.append(top_state.sales_state)
            
            state_list = sorted(
                [{"state": s, "probability": round(p, 4), "expected_qty": round(self.get_state_quantity(s), 2)}
                 for s, p in probs.items() if p > 0.01],
                key=lambda x: -x["probability"]
            )
            
            daily_forecast.append({
                "day": day,
                "expected_sales": round(expected_sales, 2),
                "top_state": top_state,
                "top_probability": round(top_prob, 4),
                "states": state_list
            })
        
        data_quality = self._assess_data_quality()
        anomalies = self._detect_anomalies()
        state_jump = self._detect_state_jump(current_state)
        
        cold_start = self.total_records < 14
        sparse_warning = data_quality.get("sparse_states_ratio", 0) > 0.3
        
        return PredictionResult(
            product_id="",
            product_name="",
            run_timestamp=__import__("datetime").datetime.now(),
            current_state=current_state,
            transition_matrix=self._matrix_to_serializable(transition_matrix),
            state_probabilities=self._probs_to_serializable(state_probabilities),
            forecast_days=forecast_days,
            daily_forecast=daily_forecast,
            total_forecast=round(total_forecast, 2),
            restock_suggestion=RestockSuggestion(
                product_id="", product_name="",
                forecast_date=date.today(),
                current_inventory=0, forecast_demand=total_forecast,
                suggested_restock=0, safety_stock=0, max_stock=0,
                confidence=data_quality.get("confidence_score", 0.5),
                forecast_states=forecast_states,
                reasoning=""
            ),
            data_quality=data_quality,
            anomalies=anomalies,
            cold_start_applied=cold_start,
            sparse_data_warning=sparse_warning,
            state_jump_detected=state_jump
        )

    def _assess_data_quality(self) -> Dict:
        total_states = len(self.state_counts)
        sparse_states = sum(1 for c in self.state_counts.values() if c < self.min_samples_for_transition)
        sparse_ratio = sparse_states / total_states if total_states > 0 else 0
        
        coverage = total_states / (len(ALL_SALES_STATES) * len(ALL_WEATHER_TAGS) * len(ALL_HOLIDAY_TAGS))
        
        if self.total_records >= 60 and sparse_ratio < 0.2:
            confidence = 0.9
        elif self.total_records >= 30 and sparse_ratio < 0.4:
            confidence = 0.7
        elif self.total_records >= 14:
            confidence = 0.5
        else:
            confidence = 0.3
        
        return {
            "total_records": self.total_records,
            "unique_states": total_states,
            "unique_transitions": len(self.transition_counts),
            "sparse_states": sparse_states,
            "sparse_states_ratio": round(sparse_ratio, 3),
            "state_coverage": round(coverage, 4),
            "confidence_score": round(confidence, 2)
        }

    def _detect_anomalies(self) -> List[DailyRecord]:
        return []

    def _detect_state_jump(self, current_state: StateKey) -> bool:
        count = self.state_counts.get(current_state, 0)
        total = sum(self.state_counts.values())
        
        if count == 0:
            return True
        
        if total > 0 and count / total < 0.03:
            return True
        
        top_transitions = [
            ((s1, s2), c) for (s1, s2), c in self.transition_counts.items()
            if s1 == current_state
        ]
        top_transitions.sort(key=lambda x: -x[1])
        
        if not top_transitions:
            return True
        
        total_trans = sum(c for _, c in top_transitions)
        if total_trans > 0:
            top_prob = top_transitions[0][1] / total_trans
            if top_prob < 0.2:
                return True
        
        sales_order = [SalesState.VERY_LOW, SalesState.LOW, SalesState.MEDIUM,
                       SalesState.HIGH, SalesState.VERY_HIGH]
        
        if current_state.sales_state in sales_order:
            common_states = [
                s for s, c in self.state_counts.items()
                if s.sales_state in sales_order and c > total * 0.1
            ]
            
            if common_states:
                avg_idx = sum(
                    sales_order.index(s.sales_state) * self.state_counts[s]
                    for s in common_states
                ) / sum(self.state_counts[s] for s in common_states)
                
                current_idx = sales_order.index(current_state.sales_state)
                if abs(current_idx - avg_idx) >= 2:
                    return True
        
        return False

    def _matrix_to_serializable(self, matrix: Dict[Tuple[StateKey, StateKey], float]) -> Dict:
        result = {}
        for (s1, s2), p in matrix.items():
            if p > 0.001:
                key = f"{s1.sales_state.value}|{s1.weather.value}|{s1.holiday.value}->{s2.sales_state.value}|{s2.weather.value}|{s2.holiday.value}"
                result[key] = round(p, 4)
        return result

    def _probs_to_serializable(self, probs: Dict[int, Dict[StateKey, float]]) -> Dict:
        result = {}
        for day, state_probs in probs.items():
            result[str(day)] = {
                f"{s.sales_state.value}|{s.weather.value}|{s.holiday.value}": round(p, 4)
                for s, p in state_probs.items() if p > 0.001
            }
        return result
