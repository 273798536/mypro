"""
优惠券处理与优惠叠加检测模块
核心功能：
1. 优惠券金额处理与分摊
2. 优惠叠加检测（同一订单多张优惠券）
3. 优惠券按电费、服务费比例分摊
4. 异常优惠标记
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field

from ..config.settings import get_config


@dataclass
class CouponResult:
    """单条订单优惠券处理结果"""
    order_id: str
    original_row_number: int
    original_coupon_amount: float
    coupon_type: Optional[str]
    has_coupon: bool
    is_stacked: bool
    stack_count: int
    electricity_coupon: float
    service_coupon: float
    peak_coupon: float
    high_coupon: float
    flat_coupon: float
    valley_coupon: float
    calculation_trace: Dict[str, Any]


@dataclass
class CouponEngineResult:
    """优惠券处理总结果"""
    df: pd.DataFrame
    results: List[CouponResult]
    stacked_coupon_orders: List[str]
    calculation_summary: Dict[str, Any]


class CouponProcessor:
    """优惠券处理器"""

    def __init__(self):
        self.config = get_config()

    def _detect_stacked_coupon(self, row: pd.Series) -> Tuple[bool, int]:
        """检测优惠叠加"""
        coupon_amount = row.get("coupon_amount", 0.0) or 0.0
        coupon_type = row.get("coupon_type")

        stack_count = 0
        if coupon_amount > 0:
            stack_count += 1

        if coupon_type:
            type_str = str(coupon_type)
            separators = [",", "、", "+", "/", "\\"]
            for sep in separators:
                if sep in type_str:
                    parts = [p for p in type_str.split(sep) if p.strip()]
                    stack_count = max(stack_count, len(parts))

        is_stacked = stack_count > 1
        return is_stacked, stack_count

    def _allocate_coupon(
        self,
        total_coupon: float,
        electricity_fee: float,
        service_fee: float,
        period_fees: Dict[str, float]
    ) -> Dict[str, float]:
        """按比例分摊优惠券到电费和服务费，再到各时段"""
        result = {
            "electricity_coupon": 0.0,
            "service_coupon": 0.0,
            "peak_coupon": 0.0,
            "high_coupon": 0.0,
            "flat_coupon": 0.0,
            "valley_coupon": 0.0,
        }

        if total_coupon <= 0:
            return result

        total_charge = electricity_fee + service_fee
        if total_charge <= 0:
            return result

        elec_ratio = electricity_fee / total_charge
        service_ratio = service_fee / total_charge

        electricity_coupon = round(total_coupon * elec_ratio, 2)
        service_coupon = round(total_coupon * service_ratio, 2)

        diff = total_coupon - electricity_coupon - service_coupon
        if abs(diff) >= 0.01:
            electricity_coupon = round(electricity_coupon + diff, 2)

        result["electricity_coupon"] = electricity_coupon
        result["service_coupon"] = service_coupon

        total_period_fee = sum(period_fees.values())
        if total_period_fee > 0 and electricity_coupon > 0:
            for period, fee in period_fees.items():
                period_coupon = round(electricity_coupon * (fee / total_period_fee), 2)
                result[f"{period}_coupon"] = period_coupon

            period_sum = sum(result[f"{p}_coupon"] for p in ["peak", "high", "flat", "valley"])
            period_diff = electricity_coupon - period_sum
            if abs(period_diff) >= 0.01:
                result["peak_coupon"] = round(result["peak_coupon"] + period_diff, 2)

        return result

    def process_order(
        self,
        row: pd.Series,
        electricity_fee: float,
        service_fee: float,
        period_fees: Dict[str, float]
    ) -> CouponResult:
        """处理单条订单的优惠券"""
        order_id = row.get("order_id", "UNKNOWN")
        original_row = row.get("_original_row_number", 0)

        original_coupon = float(row.get("coupon_amount", 0.0) or 0.0)
        coupon_type = row.get("coupon_type")
        has_coupon = original_coupon > 0

        is_stacked, stack_count = self._detect_stacked_coupon(row)

        allocation = self._allocate_coupon(
            original_coupon, electricity_fee, service_fee, period_fees
        )

        trace = {
            "original_coupon_amount": original_coupon,
            "coupon_type": coupon_type,
            "has_coupon": has_coupon,
            "is_stacked": is_stacked,
            "stack_count": stack_count,
            "electricity_fee": electricity_fee,
            "service_fee": service_fee,
            "allocation_ratio": {
                "electricity_ratio": round(
                    allocation["electricity_coupon"] / original_coupon if original_coupon > 0 else 0, 4
                ),
                "service_ratio": round(
                    allocation["service_coupon"] / original_coupon if original_coupon > 0 else 0, 4
                )
            },
            "period_allocation": {
                period: allocation[f"{period}_coupon"]
                for period in ["peak", "high", "flat", "valley"]
            }
        }

        return CouponResult(
            order_id=order_id,
            original_row_number=original_row,
            original_coupon_amount=original_coupon,
            coupon_type=coupon_type,
            has_coupon=has_coupon,
            is_stacked=is_stacked,
            stack_count=stack_count,
            electricity_coupon=allocation["electricity_coupon"],
            service_coupon=allocation["service_coupon"],
            peak_coupon=allocation["peak_coupon"],
            high_coupon=allocation["high_coupon"],
            flat_coupon=allocation["flat_coupon"],
            valley_coupon=allocation["valley_coupon"],
            calculation_trace=trace
        )

    def process(
        self,
        df: pd.DataFrame
    ) -> CouponEngineResult:
        """批量处理优惠券"""
        result_df = df.copy()
        results = []
        stacked_orders = []

        for idx, row in result_df.iterrows():
            electricity_fee = float(row.get("calculated_electricity_fee", 0.0) or 0.0)
            service_fee = float(row.get("calculated_service_fee", 0.0) or 0.0)

            period_fees = {
                "peak": float(row.get("peak_fee", 0.0) or 0.0),
                "high": float(row.get("high_fee", 0.0) or 0.0),
                "flat": float(row.get("flat_fee", 0.0) or 0.0),
                "valley": float(row.get("valley_fee", 0.0) or 0.0),
            }

            result = self.process_order(row, electricity_fee, service_fee, period_fees)
            results.append(result)

            if result.is_stacked:
                stacked_orders.append(result.order_id)

            result_df.loc[idx, "original_coupon_amount"] = result.original_coupon_amount
            result_df.loc[idx, "has_coupon"] = result.has_coupon
            result_df.loc[idx, "is_coupon_stacked"] = result.is_stacked
            result_df.loc[idx, "coupon_stack_count"] = result.stack_count
            result_df.loc[idx, "electricity_coupon"] = result.electricity_coupon
            result_df.loc[idx, "service_coupon"] = result.service_coupon
            result_df.loc[idx, "peak_coupon"] = result.peak_coupon
            result_df.loc[idx, "high_coupon"] = result.high_coupon
            result_df.loc[idx, "flat_coupon"] = result.flat_coupon
            result_df.loc[idx, "valley_coupon"] = result.valley_coupon

        summary = {
            "total_orders": len(results),
            "orders_with_coupon": sum(1 for r in results if r.has_coupon),
            "total_coupon_amount": round(sum(r.original_coupon_amount for r in results), 2),
            "stacked_coupon_orders": len(stacked_orders),
            "electricity_coupon_total": round(sum(r.electricity_coupon for r in results), 2),
            "service_coupon_total": round(sum(r.service_coupon for r in results), 2),
        }

        return CouponEngineResult(
            df=result_df,
            results=results,
            stacked_coupon_orders=stacked_orders,
            calculation_summary=summary
        )
