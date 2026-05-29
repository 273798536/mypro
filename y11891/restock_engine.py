"""
补货建议引擎
============

## 补货计算逻辑

### 核心公式

1. **安全库存 (Safety Stock)**
   SS = Z × σ_L × √L
   
   其中：
   - Z：服务水平系数（95%服务水平对应Z=1.65）
   - σ_L：补货周期内需求标准差
   - L：补货提前期（天）

2. **再订货点 (Reorder Point)**
   ROP = 平均日需求 × L + SS

3. **补货量 (Restock Quantity)**
   Q = MAX(0, 目标库存 - 当前库存 - 在途库存)
   
   目标库存 = 预测周期需求 + 安全库存

4. **服务水平调整**
   - 高价值商品：服务水平 90% (Z=1.28)
   - 中价值商品：服务水平 95% (Z=1.65)
   - 低价值商品：服务水平 98% (Z=2.05)
   - 生鲜商品：服务水平 85% (Z=1.04)，同时考虑保质期

### 约束条件

- 最小补货量：供应商起订量
- 最大补货量：仓储容量限制
- 补货批量：整箱/整件要求
"""

from typing import List, Dict, Optional, Tuple
from datetime import date, datetime
import math

from models import (
    StateKey, SalesState, WeatherTag, HolidayTag,
    DailyRecord, PredictionResult, RestockSuggestion
)
from markov_core import MarkovInventoryPredictor
from anomaly_handler import AnomalyHandler


class RestockEngine:
    def __init__(self, predictor: MarkovInventoryPredictor, 
                 anomaly_handler: AnomalyHandler,
                 service_level: float = 0.95,
                 lead_time_days: int = 1,
                 review_period_days: int = 7):
        self.predictor = predictor
        self.anomaly_handler = anomaly_handler
        self.service_level = service_level
        self.lead_time_days = lead_time_days
        self.review_period_days = review_period_days
        self._z_score_cache = {}

    def get_z_score(self, service_level: float) -> float:
        if service_level in self._z_score_cache:
            return self._z_score_cache[service_level]
        
        z_table = {
            0.80: 0.84, 0.85: 1.04, 0.90: 1.28,
            0.95: 1.65, 0.98: 2.05, 0.99: 2.33
        }
        
        closest = min(z_table.keys(), key=lambda x: abs(x - service_level))
        z = z_table[closest]
        self._z_score_cache[service_level] = z
        return z

    def calculate_safety_stock(self, records: List[DailyRecord],
                               forecast_days: int) -> Tuple[float, Dict]:
        if len(records) < 7:
            base_ss = self.predictor.avg_sales * 0.5
            return base_ss, {
                "method": "经验估计",
                "reason": "数据不足7天，使用50%日均销量作为安全库存",
                "z_score": None,
                "demand_std": None,
                "lead_time": self.lead_time_days
            }
        
        daily_sales = [r.sales_quantity for r in records if r.sales_quantity > 0]
        if len(daily_sales) < 2:
            base_ss = self.predictor.avg_sales * 0.5
            return base_ss, {
                "method": "经验估计",
                "reason": "有效数据不足",
                "z_score": None,
                "demand_std": None,
                "lead_time": self.lead_time_days
            }
        
        mean_sales = sum(daily_sales) / len(daily_sales)
        variance = sum((x - mean_sales) ** 2 for x in daily_sales) / (len(daily_sales) - 1)
        std_dev = math.sqrt(variance)
        
        z = self.get_z_score(self.service_level)
        L = self.lead_time_days + forecast_days
        
        safety_stock = z * std_dev * math.sqrt(L)
        
        return safety_stock, {
            "method": "传统统计法",
            "formula": "SS = Z × σ × √(L+T)",
            "z_score": round(z, 2),
            "service_level": self.service_level,
            "demand_std": round(std_dev, 2),
            "lead_time": L,
            "mean_daily_sales": round(mean_sales, 2)
        }

    def calculate_demand_std_by_state(self, current_state: StateKey,
                                       records: List[DailyRecord]) -> float:
        same_state_sales = [
            r.sales_quantity for r in records
            if r.state_key == current_state and r.sales_quantity > 0
        ]
        
        if len(same_state_sales) >= 5:
            mean = sum(same_state_sales) / len(same_state_sales)
            variance = sum((x - mean) ** 2 for x in same_state_sales) / (len(same_state_sales) - 1)
            return math.sqrt(variance)
        
        all_sales = [r.sales_quantity for r in records if r.sales_quantity > 0]
        if len(all_sales) >= 5:
            mean = sum(all_sales) / len(all_sales)
            variance = sum((x - mean) ** 2 for x in all_sales) / (len(all_sales) - 1)
            return math.sqrt(variance)
        
        return self.predictor.avg_sales * 0.3

    def generate_restock_suggestion(self,
                                    prediction: PredictionResult,
                                    current_inventory: float,
                                    current_state: StateKey,
                                    records: List[DailyRecord],
                                    product_id: str = "P001",
                                    product_name: str = "商品",
                                    min_order_qty: float = 0,
                                    max_stock_capacity: Optional[float] = None,
                                    batch_size: float = 1,
                                    in_transit_qty: float = 0,
                                    shelf_life_days: Optional[int] = None) -> RestockSuggestion:
        
        forecast_demand = prediction.total_forecast
        
        safety_stock, ss_details = self.calculate_safety_stock(records, prediction.forecast_days)
        
        boundary_check = self.anomaly_handler.validate_boundary_conditions(
            current_inventory, forecast_demand, self.lead_time_days
        )
        
        cold_start_info = self.anomaly_handler.handle_cold_start(records)
        if cold_start_info.get("cold_start"):
            confidence = cold_start_info["confidence_adjustment"]
            safety_stock *= (1.0 + cold_start_info["prior_strength"] * 0.5)
        else:
            confidence = prediction.data_quality.get("confidence_score", 0.5)
        
        sparse_info = self.anomaly_handler.handle_sparse_data()
        if sparse_info.get("sparse_data"):
            safety_stock *= 1.2
            confidence *= 0.9
        
        jump_info = self.anomaly_handler.handle_state_jump(current_state, records)
        if jump_info.get("state_jump"):
            forecast_demand *= jump_info["forecast_adjustment_factor"]
            safety_stock *= 1.3
            confidence *= 0.8
        
        target_stock = forecast_demand + safety_stock
        
        if max_stock_capacity and target_stock > max_stock_capacity:
            target_stock = max_stock_capacity
        
        if shelf_life_days and shelf_life_days < prediction.forecast_days:
            max_demand = self.predictor.avg_sales * shelf_life_days * 1.2
            target_stock = min(target_stock, max_demand)
        
        suggested_qty = target_stock - current_inventory - in_transit_qty
        suggested_qty = max(0, suggested_qty)
        
        if suggested_qty > 0 and suggested_qty < min_order_qty:
            if min_order_qty <= target_stock:
                suggested_qty = min_order_qty
            else:
                suggested_qty = 0
        
        if batch_size > 1 and suggested_qty > 0:
            suggested_qty = math.ceil(suggested_qty / batch_size) * batch_size
        
        if max_stock_capacity:
            suggested_qty = min(suggested_qty, max_stock_capacity - current_inventory)
        
        reasoning_parts = []
        reasoning_parts.append(f"预测周期({prediction.forecast_days}天)需求：{forecast_demand:.1f}")
        reasoning_parts.append(f"安全库存：{safety_stock:.1f}（{ss_details['method']}）")
        reasoning_parts.append(f"目标库存：{target_stock:.1f}")
        reasoning_parts.append(f"当前库存：{current_inventory:.1f}")
        if in_transit_qty > 0:
            reasoning_parts.append(f"在途库存：{in_transit_qty:.1f}")
        
        if boundary_check["issues"]:
            for issue in boundary_check["issues"]:
                reasoning_parts.append(f"⚠️ {issue['severity']}: {issue['message']}")
        
        if cold_start_info.get("cold_start"):
            reasoning_parts.append(f"❄️ 冷启动：{cold_start_info['recommendations'][0]}")
        
        if sparse_info.get("sparse_data"):
            reasoning_parts.append(f"📊 样本稀疏：{sparse_info['recommendations'][0]}")
        
        if jump_info.get("state_jump"):
            reasoning_parts.append(f"⚡ 状态跳变：{jump_info['reason']}")
        
        if suggested_qty <= 0:
            reasoning_parts.append("结论：无需补货")
        else:
            reasoning_parts.append(f"结论：建议补货 {suggested_qty:.1f} 单位")
        
        if min_order_qty > 0 and suggested_qty > 0:
            reasoning_parts.append(f"（满足最小起订量 {min_order_qty}）")
        
        if batch_size > 1 and suggested_qty > 0:
            reasoning_parts.append(f"（按批量 {batch_size} 向上取整）")
        
        if shelf_life_days:
            reasoning_parts.append(f"（考虑保质期 {shelf_life_days} 天限制）")
        
        state_transitions = self._extract_key_transitions(current_state, prediction)
        
        return RestockSuggestion(
            product_id=product_id,
            product_name=product_name,
            forecast_date=date.today(),
            current_inventory=current_inventory,
            forecast_demand=round(forecast_demand, 2),
            suggested_restock=round(suggested_qty, 2),
            safety_stock=round(safety_stock, 2),
            max_stock=round(target_stock, 2),
            confidence=round(confidence, 2),
            forecast_states=prediction.restock_suggestion.forecast_states,
            reasoning="\n".join(reasoning_parts),
            state_transitions=state_transitions
        )

    def _extract_key_transitions(self, current_state: StateKey,
                                  prediction: PredictionResult) -> List[Tuple[StateKey, StateKey, float]]:
        transitions = []
        matrix = self.predictor.compute_transition_matrix()
        
        for (s_from, s_to), prob in matrix.items():
            if s_from == current_state and prob > 0.1:
                transitions.append((s_from, s_to, round(prob, 4)))
        
        transitions.sort(key=lambda x: -x[2])
        return transitions[:5]

    def batch_restock_calculation(self,
                                  products: List[Dict],
                                  prediction_results: Dict[str, PredictionResult],
                                  records_by_product: Dict[str, List[DailyRecord]]) -> List[RestockSuggestion]:
        suggestions = []
        
        for product in products:
            product_id = product["product_id"]
            pred = prediction_results.get(product_id)
            records = records_by_product.get(product_id, [])
            
            if not pred or not records:
                continue
            
            suggestion = self.generate_restock_suggestion(
                prediction=pred,
                current_inventory=product.get("current_inventory", 0),
                current_state=pred.current_state,
                records=records,
                product_id=product_id,
                product_name=product.get("product_name", product_id),
                min_order_qty=product.get("min_order_qty", 0),
                max_stock_capacity=product.get("max_stock_capacity"),
                batch_size=product.get("batch_size", 1),
                in_transit_qty=product.get("in_transit_qty", 0),
                shelf_life_days=product.get("shelf_life_days")
            )
            suggestions.append(suggestion)
        
        suggestions.sort(key=lambda s: -s.suggested_restock)
        return suggestions

    def what_if_analysis(self, base_suggestion: RestockSuggestion,
                         prediction: PredictionResult,
                         current_inventory: float,
                         records: List[DailyRecord],
                         scenarios: List[Dict]) -> List[Dict]:
        results = []
        
        for scenario in scenarios:
            adjusted_service_level = scenario.get("service_level", self.service_level)
            adjusted_lead_time = scenario.get("lead_time_days", self.lead_time_days)
            demand_factor = scenario.get("demand_factor", 1.0)
            
            original_service_level = self.service_level
            original_lead_time = self.lead_time_days
            
            self.service_level = adjusted_service_level
            self.lead_time_days = adjusted_lead_time
            
            try:
                adjusted_pred = prediction
                adjusted_pred.total_forecast *= demand_factor
                
                suggestion = self.generate_restock_suggestion(
                    prediction=adjusted_pred,
                    current_inventory=current_inventory,
                    current_state=prediction.current_state,
                    records=records,
                    product_id=base_suggestion.product_id,
                    product_name=base_suggestion.product_name
                )
                
                results.append({
                    "scenario_name": scenario.get("name", "未命名场景"),
                    "parameters": {
                        "service_level": adjusted_service_level,
                        "lead_time_days": adjusted_lead_time,
                        "demand_factor": demand_factor
                    },
                    "suggested_restock": suggestion.suggested_restock,
                    "safety_stock": suggestion.safety_stock,
                    "delta_qty": suggestion.suggested_restock - base_suggestion.suggested_restock,
                    "delta_pct": round((suggestion.suggested_restock - base_suggestion.suggested_restock) / 
                                      max(base_suggestion.suggested_restock, 1) * 100, 1)
                })
            finally:
                self.service_level = original_service_level
                self.lead_time_days = original_lead_time
        
        return results
