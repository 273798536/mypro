import math
from typing import Dict, List, Tuple, Optional
import numpy as np
from scipy import stats
from .models import (
    SkuAnalysisResult, WarningType, DataSource,
    SalesRecord, ReplenishmentCycle, ServiceLevelConfig,
    WarehouseCapacity, ManualSuggestion, StockoutRecord
)


class DemandAnalyzer:
    def __init__(self, sales_records: List[SalesRecord]):
        self.sales_records = sales_records
        self.daily_sales = self._aggregate_daily_sales()
        self.sales_array = np.array(list(self.daily_sales.values())) if self.daily_sales else np.array([])
    
    def _aggregate_daily_sales(self) -> Dict[str, float]:
        daily: Dict[str, float] = {}
        for record in self.sales_records:
            if record.date in daily:
                daily[record.date] += record.quantity
            else:
                daily[record.date] = record.quantity
        return dict(sorted(daily.items()))
    
    def get_days_of_history(self) -> int:
        return len(self.daily_sales)
    
    def calculate_demand_stats(self, remove_outliers: bool = True) -> Tuple[float, float, Dict]:
        trace = {}
        trace["total_days"] = len(self.sales_array)
        trace["original_data"] = self.sales_array.tolist() if len(self.sales_array) < 50 else f"len={len(self.sales_array)}"
        
        if len(self.sales_array) == 0:
            return 0.0, 0.0, trace
        
        data = self.sales_array
        
        if remove_outliers and len(data) >= 10:
            q1 = np.percentile(data, 25)
            q3 = np.percentile(data, 75)
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 3 * iqr
            mask = (data >= lower_bound) & (data <= upper_bound)
            outliers_removed = data[~mask]
            trace["outliers_removed_count"] = len(outliers_removed)
            trace["outliers_values"] = outliers_removed.tolist()
            trace["outlier_bounds"] = {"lower": lower_bound, "upper": upper_bound}
            data = data[mask]
        
        if len(data) == 0:
            return 0.0, 0.0, trace
        
        mean = float(np.mean(data))
        std = float(np.std(data, ddof=1)) if len(data) > 1 else 0.0
        
        trace["clean_data_count"] = len(data)
        trace["mean"] = mean
        trace["std"] = std
        
        return mean, std, trace
    
    def detect_promotion_peaks(self, threshold: float = 2.5) -> List[Dict]:
        peaks = []
        if len(self.sales_array) < 7:
            return peaks
        
        mean = np.mean(self.sales_array)
        std = np.std(self.sales_array)
        
        if std == 0:
            return peaks
        
        dates = list(self.daily_sales.keys())
        values = list(self.daily_sales.values())
        
        for i, (date, value) in enumerate(zip(dates, values)):
            z_score = (value - mean) / std
            if z_score >= threshold:
                peaks.append({
                    "date": date,
                    "value": value,
                    "z_score": z_score,
                    "vs_mean_ratio": value / mean if mean > 0 else float('inf')
                })
        
        return peaks
    
    def detect_seasonality(self) -> Dict:
        result = {"has_seasonality": False, "details": {}}
        if len(self.sales_array) < 28:
            return result
        
        try:
            from statsmodels.tsa.stattools import acf
            acf_values = acf(self.sales_array, nlags=14, fft=True)
            weekly_corr = acf_values[7] if len(acf_values) > 7 else 0
            
            if abs(weekly_corr) > 0.3:
                result["has_seasonality"] = True
                result["details"]["weekly_autocorrelation"] = float(weekly_corr)
        except ImportError:
            result["details"] = {"note": "statsmodels not available for seasonality detection"}
        
        return result


class SafetyStockCalculator:
    def __init__(self):
        pass
    
    def calculate_z_score(self, service_level: float) -> float:
        return float(stats.norm.ppf(service_level))
    
    def calculate_raw_safety_stock(
        self,
        demand_std: float,
        lead_time_days: float,
        review_period_days: float,
        z_score: float
    ) -> float:
        protection_period = lead_time_days + review_period_days
        return z_score * demand_std * math.sqrt(protection_period)
    
    def calculate_reorder_point(
        self,
        demand_mean: float,
        lead_time_days: float,
        safety_stock: float
    ) -> float:
        return demand_mean * lead_time_days + safety_stock
    
    def calculate_order_up_to_level(
        self,
        demand_mean: float,
        lead_time_days: float,
        review_period_days: float,
        safety_stock: float
    ) -> float:
        cycle_stock = demand_mean * (lead_time_days + review_period_days) / 2
        return cycle_stock + safety_stock


class SkuProcessor:
    def __init__(self, sku_id: str):
        self.sku_id = sku_id
        self.sales_records: List[SalesRecord] = []
        self.replenishment_cycle: Optional[ReplenishmentCycle] = None
        self.service_level: Optional[ServiceLevelConfig] = None
        self.warehouse_capacity: Optional[WarehouseCapacity] = None
        self.manual_suggestion: Optional[ManualSuggestion] = None
        self.stockout_records: List[StockoutRecord] = []
        self.data_sources: List[str] = []
        self.warnings: List[Dict] = []
    
    def add_sales(self, records: List[SalesRecord]):
        self.sales_records.extend([r for r in records if r.sku_id == self.sku_id])
        if self.sales_records:
            self.data_sources.append(DataSource.SALES)
    
    def set_replenishment_cycle(self, cycle: ReplenishmentCycle):
        if cycle.sku_id == self.sku_id:
            self.replenishment_cycle = cycle
            self.data_sources.append(DataSource.REPLENISHMENT_CYCLE)
    
    def set_service_level(self, sl: ServiceLevelConfig):
        if sl.sku_id == self.sku_id:
            self.service_level = sl
            self.data_sources.append(DataSource.SERVICE_LEVEL)
    
    def set_warehouse_capacity(self, cap: WarehouseCapacity):
        if cap.sku_id == self.sku_id:
            self.warehouse_capacity = cap
            self.data_sources.append(DataSource.WAREHOUSE_CAPACITY)
    
    def set_manual_suggestion(self, suggestion: ManualSuggestion):
        if suggestion.sku_id == self.sku_id:
            self.manual_suggestion = suggestion
            self.data_sources.append(DataSource.MANUAL_SUGGESTION)
    
    def add_stockout_records(self, records: List[StockoutRecord]):
        self.stockout_records.extend([r for r in records if r.sku_id == self.sku_id])
        if self.stockout_records:
            self.data_sources.append(DataSource.STOCKOUT)
    
    def process(self, default_service_level: float = 0.95) -> Optional[SkuAnalysisResult]:
        if not self.sales_records:
            self.warnings.append({
                "type": WarningType.INSUFFICIENT_DATA,
                "message": f"SKU {self.sku_id}: 无销量数据，无法计算安全库存",
                "severity": "error"
            })
            return None
        
        analyzer = DemandAnalyzer(self.sales_records)
        calculator = SafetyStockCalculator()
        
        days_of_history = analyzer.get_days_of_history()
        
        if days_of_history < 7:
            self.warnings.append({
                "type": WarningType.NEW_PRODUCT,
                "message": f"SKU {self.sku_id}: 历史数据仅 {days_of_history} 天，不足7天，可能为新品，结果仅供参考",
                "severity": "warning",
                "details": {"days_of_history": days_of_history, "minimum_required": 7}
            })
        
        if days_of_history < 30:
            self.warnings.append({
                "type": WarningType.INSUFFICIENT_DATA,
                "message": f"SKU {self.sku_id}: 历史数据 {days_of_history} 天，建议至少30天以获得更可靠的计算结果",
                "severity": "warning",
                "details": {"days_of_history": days_of_history, "recommended": 30}
            })
        
        mean, std, demand_trace = analyzer.calculate_demand_stats()
        
        if mean == 0:
            self.warnings.append({
                "type": WarningType.INSUFFICIENT_DATA,
                "message": f"SKU {self.sku_id}: 历史销量均值为0，无法计算安全库存",
                "severity": "error"
            })
            return None
        
        cv = std / mean if mean > 0 else 0.0
        
        promotion_peaks = analyzer.detect_promotion_peaks()
        if promotion_peaks:
            self.warnings.append({
                "type": WarningType.PROMOTION_PEAK,
                "message": f"SKU {self.sku_id}: 检测到 {len(promotion_peaks)} 个促销峰值，已从需求分布中排除",
                "severity": "warning",
                "details": {"peaks": promotion_peaks[:3]}
            })
        
        lead_time = self.replenishment_cycle.lead_time_days if self.replenishment_cycle else 7.0
        review_period = self.replenishment_cycle.review_period_days if (self.replenishment_cycle and self.replenishment_cycle.review_period_days) else 7.0
        
        service_level = self.service_level.service_level if self.service_level else default_service_level
        z_score = calculator.calculate_z_score(service_level)
        
        raw_safety_stock = calculator.calculate_raw_safety_stock(
            demand_std=std,
            lead_time_days=lead_time,
            review_period_days=review_period,
            z_score=z_score
        )
        
        capacity_adjusted = raw_safety_stock
        if self.warehouse_capacity:
            max_cap = self.warehouse_capacity.max_capacity
            if raw_safety_stock > max_cap:
                capacity_adjusted = max_cap
                self.warnings.append({
                    "type": WarningType.CAPACITY_LIMIT,
                    "message": f"SKU {self.sku_id}: 计算的安全库存 {raw_safety_stock:.2f} 超过仓库容量上限 {max_cap:.2f}，已调整",
                    "severity": "warning",
                    "details": {
                        "calculated": raw_safety_stock,
                        "max_capacity": max_cap,
                        "adjusted_to": capacity_adjusted
                    }
                })
        
        final_safety_stock = capacity_adjusted
        manual_override = None
        manual_note = None
        
        if self.manual_suggestion and self.manual_suggestion.suggested_safety_stock is not None:
            manual_override = self.manual_suggestion.suggested_safety_stock
            manual_note = self.manual_suggestion.note
            final_safety_stock = manual_override
        
        reorder_point = calculator.calculate_reorder_point(mean, lead_time, final_safety_stock)
        order_up_to = calculator.calculate_order_up_to_level(mean, lead_time, review_period, final_safety_stock)
        
        calculation_trace = {
            "demand_analysis": demand_trace,
            "parameters": {
                "lead_time_days": lead_time,
                "review_period_days": review_period,
                "service_level": service_level,
                "z_score": z_score
            },
            "capacity_check": {
                "applied": self.warehouse_capacity is not None,
                "max_capacity": self.warehouse_capacity.max_capacity if self.warehouse_capacity else None
            },
            "manual_override_applied": self.manual_suggestion is not None and self.manual_suggestion.suggested_safety_stock is not None
        }
        
        return SkuAnalysisResult(
            sku_id=self.sku_id,
            demand_mean=mean,
            demand_std=std,
            demand_cv=cv,
            lead_time_days=lead_time,
            review_period_days=review_period,
            service_level=service_level,
            z_score=z_score,
            raw_safety_stock=raw_safety_stock,
            capacity_adjusted_safety_stock=capacity_adjusted,
            final_safety_stock=final_safety_stock,
            reorder_point=reorder_point,
            order_up_to_level=order_up_to,
            warnings=self.warnings,
            data_sources_used=list(set(self.data_sources)),
            manual_override=manual_override,
            manual_note=manual_note,
            calculation_trace=calculation_trace
        )
