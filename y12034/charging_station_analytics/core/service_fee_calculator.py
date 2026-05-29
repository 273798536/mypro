"""
服务费计算与拆分模块
核心功能：
1. 服务费单价获取（支持配置默认值和订单级覆盖）
2. 服务费按尖峰谷平时段拆分
3. 服务费与电费对账
"""
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field

from ..config.settings import get_config
from .tariff_engine import TariffEngineResult, TariffCalculationResult


@dataclass
class ServiceFeeResult:
    """单条订单服务费计算结果"""
    order_id: str
    original_row_number: int
    service_fee_rate: float
    total_energy: float
    total_service_fee: float
    peak_service_fee: float
    high_service_fee: float
    flat_service_fee: float
    valley_service_fee: float
    is_rate_from_order: bool
    calculation_trace: Dict[str, Any]


@dataclass
class ServiceFeeEngineResult:
    """服务费计算总结果"""
    df: pd.DataFrame
    results: List[ServiceFeeResult]
    calculation_summary: Dict[str, Any]


class ServiceFeeCalculator:
    """服务费计算器"""

    def __init__(self):
        self.config = get_config()
        self.default_rate = self.config.get_default_service_fee()

    def _get_service_fee_rate(self, order_row: pd.Series) -> Tuple[float, bool]:
        """获取服务费单价，优先使用订单数据，其次使用默认配置"""
        order_rate = order_row.get("service_fee_rate")

        if order_rate is not None and not pd.isna(order_rate) and float(order_rate) > 0:
            return float(order_rate), True

        return self.default_rate, False

    def calculate_order(
        self,
        order_row: pd.Series,
        tariff_result: TariffCalculationResult
    ) -> ServiceFeeResult:
        """计算单条订单的服务费"""
        order_id = order_row.get("order_id", "UNKNOWN")
        original_row = order_row.get("_original_row_number", 0)
        total_energy = float(order_row.get("energy", 0.0) or 0.0)

        service_fee_rate, is_from_order = self._get_service_fee_rate(order_row)
        total_service_fee = round(total_energy * service_fee_rate, 2)

        peak_service_fee = round(tariff_result.peak_energy * service_fee_rate, 2)
        high_service_fee = round(tariff_result.high_energy * service_fee_rate, 2)
        flat_service_fee = round(tariff_result.flat_energy * service_fee_rate, 2)
        valley_service_fee = round(tariff_result.valley_energy * service_fee_rate, 2)

        trace = {
            "service_fee_rate": service_fee_rate,
            "rate_source": "订单数据" if is_from_order else "系统默认配置",
            "total_energy": total_energy,
            "total_service_fee": total_service_fee,
            "period_distribution": {
                "peak": {
                    "energy": tariff_result.peak_energy,
                    "service_fee": peak_service_fee
                },
                "high": {
                    "energy": tariff_result.high_energy,
                    "service_fee": high_service_fee
                },
                "flat": {
                    "energy": tariff_result.flat_energy,
                    "service_fee": flat_service_fee
                },
                "valley": {
                    "energy": tariff_result.valley_energy,
                    "service_fee": valley_service_fee
                }
            }
        }

        return ServiceFeeResult(
            order_id=order_id,
            original_row_number=original_row,
            service_fee_rate=service_fee_rate,
            total_energy=round(total_energy, 4),
            total_service_fee=total_service_fee,
            peak_service_fee=peak_service_fee,
            high_service_fee=high_service_fee,
            flat_service_fee=flat_service_fee,
            valley_service_fee=valley_service_fee,
            is_rate_from_order=is_from_order,
            calculation_trace=trace
        )

    def calculate(
        self,
        cleaned_data_df: pd.DataFrame,
        tariff_result: TariffEngineResult
    ) -> ServiceFeeEngineResult:
        """批量计算服务费"""
        df = cleaned_data_df.copy()
        results = []

        tariff_result_map = {r.order_id: r for r in tariff_result.results}

        for idx, row in df.iterrows():
            order_id = row.get("order_id", "UNKNOWN")
            tariff_calc = tariff_result_map.get(order_id)

            if tariff_calc is None:
                continue

            result = self.calculate_order(row, tariff_calc)
            results.append(result)

            df.loc[idx, "service_fee_rate_used"] = result.service_fee_rate
            df.loc[idx, "is_service_fee_from_order"] = result.is_rate_from_order
            df.loc[idx, "calculated_service_fee"] = result.total_service_fee
            df.loc[idx, "peak_service_fee"] = result.peak_service_fee
            df.loc[idx, "high_service_fee"] = result.high_service_fee
            df.loc[idx, "flat_service_fee"] = result.flat_service_fee
            df.loc[idx, "valley_service_fee"] = result.valley_service_fee

            original_service_fee = row.get("service_fee")
            if original_service_fee is not None and not pd.isna(original_service_fee):
                df.loc[idx, "original_service_fee"] = float(original_service_fee)
                df.loc[idx, "service_fee_diff"] = round(
                    result.total_service_fee - float(original_service_fee), 2
                )
            else:
                df.loc[idx, "original_service_fee"] = None
                df.loc[idx, "service_fee_diff"] = None

        summary = {
            "total_orders": len(results),
            "total_energy": round(sum(r.total_energy for r in results), 4),
            "total_service_fee": round(sum(r.total_service_fee for r in results), 2),
            "orders_with_custom_rate": sum(1 for r in results if r.is_rate_from_order),
            "period_distribution": {
                "peak": round(sum(r.peak_service_fee for r in results), 2),
                "high": round(sum(r.high_service_fee for r in results), 2),
                "flat": round(sum(r.flat_service_fee for r in results), 2),
                "valley": round(sum(r.valley_service_fee for r in results), 2),
            }
        }

        return ServiceFeeEngineResult(
            df=df,
            results=results,
            calculation_summary=summary
        )
