"""
稳定性专业计算模块
包含：含量测定、性状考察、有效期推算
"""
import math
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

from .models import StabilityResult, TestItem, BatchInfo, TestPoint
from .config import Config
from .batch_manager import BatchManager


@dataclass
class LinearRegressionResult:
    slope: float
    intercept: float
    r_squared: float
    std_error: float


class StabilityCalculator:
    """稳定性计算器"""

    def __init__(self, config: Config, batch_manager: BatchManager):
        self.config = config
        self.batch_manager = batch_manager
        self.degradation_threshold = config.get("stability.content_degradation_threshold", 5.0)
        self.ph_variation_threshold = config.get("stability.ph_variation_threshold", 1.0)
        self.calculation_method = config.get("stability.calculation_method", "线性回归法")
        self.standard_time_points = config.get("stability.standard_time_points",
                                                ["0月", "1月", "3月", "6月", "12月", "24月"])

    def _parse_time_point(self, tp_str: str) -> float:
        """解析时间点为月数"""
        if not tp_str:
            return 0.0
        tp_str = tp_str.strip()
        if tp_str.endswith("月"):
            return float(tp_str[:-1])
        elif tp_str.endswith("天"):
            return float(tp_str[:-1]) / 30.0
        elif tp_str.endswith("周"):
            return float(tp_str[:-1]) * 7 / 30.0
        try:
            return float(tp_str)
        except ValueError:
            return 0.0

    def _parse_date(self, date_str: str) -> Optional[date]:
        """解析日期字符串"""
        if not date_str:
            return None
        for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%Y年%m月%d日", "%Y.%m.%d"]:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
        return None

    def _linear_regression(self, x: List[float], y: List[float]) -> Optional[LinearRegressionResult]:
        """线性回归计算"""
        n = len(x)
        if n < 2:
            return None

        sum_x = sum(x)
        sum_y = sum(y)
        sum_xy = sum(xi * yi for xi, yi in zip(x, y))
        sum_x2 = sum(xi ** 2 for xi in x)
        sum_y2 = sum(yi ** 2 for yi in y)

        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x ** 2)
        intercept = (sum_y - slope * sum_x) / n

        y_pred = [slope * xi + intercept for xi in x]
        ss_res = sum((yi - yp) ** 2 for yi, yp in zip(y, y_pred))
        ss_tot = sum((yi - sum_y / n) ** 2 for yi in y)

        if ss_tot == 0:
            r_squared = 1.0
        else:
            r_squared = 1 - (ss_res / ss_tot)

        if n > 2:
            std_error = math.sqrt(ss_res / (n - 2))
        else:
            std_error = 0.0

        return LinearRegressionResult(
            slope=slope,
            intercept=intercept,
            r_squared=r_squared,
            std_error=std_error
        )

    def _get_item_values(self, batch_no: str, item_code: str) -> List[Tuple[float, float, TestItem]]:
        """获取某个项目在各时间点的数值"""
        items = self.batch_manager.ledger.test_items.get(batch_no, [])
        values = []
        for item in items:
            if item.item_code == item_code and item.measured_value is not None:
                months = self._parse_time_point(item.time_point)
                values.append((months, item.measured_value, item))
        return sorted(values, key=lambda v: v[0])

    def calculate_content_degradation(self, batch_no: str, item_name: str = "含量",
                                       item_code: str = "CONTENT") -> Optional[StabilityResult]:
        """计算含量降解率"""
        values = self._get_item_values(batch_no, item_code)
        if len(values) < 2:
            return None

        x = [v[0] for v in values]
        y = [v[1] for v in values]

        initial_value = y[0]
        final_value = y[-1]

        if initial_value == 0:
            degradation_rate = 0.0
        else:
            degradation_rate = abs((final_value - initial_value) / initial_value) * 100

        regression = self._linear_regression(x, y)

        half_life = None
        expiry_estimate = None
        is_conforming = degradation_rate < self.degradation_threshold

        if regression and regression.slope < 0:
            threshold = initial_value * (1 - self.degradation_threshold / 100)
            if regression.slope != 0:
                expiry_months = (threshold - regression.intercept) / regression.slope
                if expiry_months > 0:
                    expiry_estimate = f"{expiry_months:.1f}月"

            if regression.slope != 0:
                half_life_months = (initial_value / 2 - regression.intercept) / regression.slope
                if half_life_months > 0:
                    half_life = round(half_life_months, 2)

        remarks = ""
        if len(values) < 3:
            remarks = f"数据点不足({len(values)}个)，建议补充更多时间点数据"
        elif regression and regression.r_squared < 0.9:
            remarks = f"线性相关性较低(R²={regression.r_squared:.3f})，降解规律不明显"
        if not is_conforming:
            remarks = f"{remarks} 含量下降{degradation_rate:.2f}%，超过{self.degradation_threshold}%限度".strip()

        return StabilityResult(
            batch_no=batch_no,
            item_name=item_name,
            initial_value=initial_value,
            final_value=final_value,
            degradation_rate=round(degradation_rate, 2),
            half_life=half_life,
            expiry_estimate=expiry_estimate,
            is_conforming=is_conforming,
            calculation_method=f"{self.calculation_method}(n={len(values)})",
            remarks=remarks
        )

    def calculate_ph_stability(self, batch_no: str) -> Optional[StabilityResult]:
        """计算pH值稳定性"""
        values = self._get_item_values(batch_no, "PH")
        if len(values) < 2:
            return None

        x = [v[0] for v in values]
        y = [v[1] for v in values]

        initial_value = y[0]
        final_value = y[-1]
        ph_variation = abs(final_value - initial_value)

        is_conforming = ph_variation < self.ph_variation_threshold

        regression = self._linear_regression(x, y)
        expiry_estimate = None
        if regression and is_conforming:
            expiry_estimate = "pH稳定，未见明显变化趋势"
        elif not is_conforming:
            expiry_estimate = f"pH变化{ph_variation:.2f}，超出{self.ph_variation_threshold}限度"

        remarks = ""
        if ph_variation > self.ph_variation_threshold * 0.8:
            remarks = f"pH变化接近限度，建议加强考察"

        return StabilityResult(
            batch_no=batch_no,
            item_name="pH值",
            initial_value=initial_value,
            final_value=final_value,
            degradation_rate=round(ph_variation, 2),
            expiry_estimate=expiry_estimate,
            is_conforming=is_conforming,
            calculation_method="极差法",
            remarks=remarks
        )

    def calculate_microbial_stability(self, batch_no: str) -> Optional[StabilityResult]:
        """计算微生物稳定性"""
        values = self._get_item_values(batch_no, "MICROBE")
        if not values:
            return None

        x = [v[0] for v in values]
        y = [v[1] for v in values]

        initial_value = y[0]
        final_value = y[-1]
        microbial_limit = self.config.get("stability.microbial_limit", 100)

        is_conforming = final_value <= microbial_limit

        if initial_value > 0:
            change_rate = (final_value - initial_value) / initial_value * 100
        else:
            change_rate = 0 if final_value == 0 else float('inf')

        remarks = ""
        if final_value > microbial_limit * 0.8:
            remarks = f"微生物数量接近限度({microbial_limit}CFU/g)，建议加强考察"
        if not is_conforming:
            remarks = f"微生物超标，限度为{microbial_limit}CFU/g"

        return StabilityResult(
            batch_no=batch_no,
            item_name="微生物",
            initial_value=initial_value,
            final_value=final_value,
            degradation_rate=round(change_rate, 2),
            expiry_estimate=f"微生物数量{'符合' if is_conforming else '不符合'}限度要求",
            is_conforming=is_conforming,
            calculation_method="限度检查法",
            remarks=remarks
        )

    def calculate_appearance_stability(self, batch_no: str) -> Optional[StabilityResult]:
        """计算性状稳定性"""
        items = self.batch_manager.ledger.test_items.get(batch_no, [])
        appearance_items = [item for item in items if item.item_code in ["APPEARANCE", "COLOR", "ODOR"]]

        if not appearance_items:
            return None

        changes = 0
        total = len(appearance_items)
        initial_values = {}
        final_values = {}

        for item in appearance_items:
            if item.time_point not in initial_values:
                initial_values[item.time_point] = item
            final_values[item.time_point] = item

        for item in appearance_items:
            if item.is_qualified is False:
                changes += 1

        change_rate = (changes / total * 100) if total > 0 else 0
        is_conforming = changes == 0

        remarks = ""
        if changes > 0:
            changed_items = [item.item_name for item in appearance_items if item.is_qualified is False]
            remarks = f"性状变化项目：{', '.join(changed_items)}"

        return StabilityResult(
            batch_no=batch_no,
            item_name="性状",
            initial_value=float(total),
            final_value=float(total - changes),
            degradation_rate=round(change_rate, 2),
            expiry_estimate=f"性状{'稳定' if is_conforming else '有变化'}",
            is_conforming=is_conforming,
            calculation_method="合格项统计法",
            remarks=remarks
        )

    def calculate_batch_stability(self, batch_no: str, operator: str) -> List[StabilityResult]:
        """计算批次的所有稳定性指标"""
        results = []

        calc_funcs = [
            (self.calculate_content_degradation, ("含量", "CONTENT")),
            (self.calculate_ph_stability, None),
            (self.calculate_microbial_stability, None),
            (self.calculate_appearance_stability, None),
        ]

        for func, args in calc_funcs:
            try:
                if args:
                    result = func(batch_no, *args)
                else:
                    result = func(batch_no)
                if result:
                    results.append(result)
            except Exception as e:
                continue

        if results:
            if batch_no not in self.batch_manager.ledger.stability_results:
                self.batch_manager.ledger.stability_results[batch_no] = []

            for result in results:
                existing_idx = None
                for i, sr in enumerate(self.batch_manager.ledger.stability_results[batch_no]):
                    if sr.item_name == result.item_name:
                        existing_idx = i
                        break

                if existing_idx is not None:
                    self.batch_manager.ledger.stability_results[batch_no][existing_idx] = result
                else:
                    self.batch_manager.ledger.stability_results[batch_no].append(result)

            self.batch_manager.create_processing_record(
                batch_no=batch_no,
                operator=operator,
                action="稳定性计算",
                remarks=f"完成批次{batch_no}稳定性计算，共{len(results)}项",
                metadata={
                    "calculation_method": self.calculation_method,
                    "results_count": len(results),
                    "items": [r.item_name for r in results],
                    "conforming_count": sum(1 for r in results if r.is_conforming)
                }
            )

        return results

    def calculate_all_batches(self, operator: str) -> Dict[str, List[StabilityResult]]:
        """计算所有批次的稳定性"""
        all_results = {}
        for batch_no in self.batch_manager.ledger.batches:
            results = self.calculate_batch_stability(batch_no, operator)
            if results:
                all_results[batch_no] = results
        return all_results

    def get_stability_summary(self, batch_no: str) -> Dict:
        """获取批次稳定性汇总"""
        results = self.batch_manager.ledger.stability_results.get(batch_no, [])
        if not results:
            return {}

        all_conforming = all(r.is_conforming for r in results)
        avg_degradation = sum(r.degradation_rate for r in results) / len(results) if results else 0

        expiry_estimates = [r.expiry_estimate for r in results if r.expiry_estimate]

        return {
            "batch_no": batch_no,
            "total_items": len(results),
            "conforming_items": sum(1 for r in results if r.is_conforming),
            "non_conforming_items": sum(1 for r in results if not r.is_conforming),
            "all_conforming": all_conforming,
            "avg_degradation_rate": round(avg_degradation, 2),
            "expiry_estimates": expiry_estimates,
            "recommended_expiry": min(expiry_estimates) if expiry_estimates else "数据不足",
            "details": results
        }
