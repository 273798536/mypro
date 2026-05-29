"""
分时电价引擎
核心功能：
1. 将充电时间段按尖峰谷平时段拆分
2. 计算各时段充电量占比
3. 计算各时段电费
4. 建立追溯链路
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, time
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, field
from collections import defaultdict

from ..config.settings import get_config
from .data_cleaner import CleanedData


@dataclass
class TimeSegment:
    """时段分段"""
    period_key: str
    period_name: str
    start_time: datetime
    end_time: datetime
    duration_minutes: float
    energy: float
    price: float
    electricity_fee: float


@dataclass
class TariffCalculationResult:
    """单条订单分时计算结果"""
    order_id: str
    original_row_number: int
    start_time: datetime
    end_time: datetime
    total_energy: float
    total_duration_minutes: float
    segments: List[TimeSegment]
    total_electricity_fee: float
    peak_energy: float
    high_energy: float
    flat_energy: float
    valley_energy: float
    peak_fee: float
    high_fee: float
    flat_fee: float
    valley_fee: float
    is_cross_period: bool
    crossed_periods: List[str]
    calculation_trace: Dict[str, Any]


@dataclass
class TariffEngineResult:
    """分时电价计算总结果"""
    df: pd.DataFrame
    results: List[TariffCalculationResult]
    cross_period_orders: List[str]
    calculation_summary: Dict[str, Any]


class TariffEngine:
    """分时电价引擎"""

    def __init__(self):
        self.config = get_config()
        self.periods = self.config.periods
        self._period_boundaries = self._build_period_boundaries()

    def _build_period_boundaries(self) -> List[Tuple[time, time, str]]:
        """构建时段边界列表"""
        boundaries = []
        for period_key, period_info in self.periods.items():
            for time_range in period_info.get("time_ranges", []):
                start_str, end_str = time_range
                start_h, start_m = map(int, start_str.split(":"))
                end_h, end_m = map(int, end_str.split(":"))
                if end_h == 24:
                    end_h = 23
                    end_m = 59
                boundaries.append((
                    time(start_h, start_m),
                    time(end_h, end_m),
                    period_key
                ))
        boundaries.sort(key=lambda x: x[0])
        return boundaries

    def _get_period_for_time(self, dt: datetime) -> str:
        """获取某时间点所属的时段"""
        t = dt.time()
        for start_t, end_t, period_key in self._period_boundaries:
            if start_t <= t <= end_t:
                return period_key
            if start_t > end_t:
                if t >= start_t or t <= end_t:
                    return period_key
        return "flat"

    def _split_time_by_periods(
        self,
        start_time: datetime,
        end_time: datetime
    ) -> List[Tuple[datetime, datetime, str]]:
        """按尖峰谷平时段拆分时间段"""
        segments = []
        current = start_time

        while current < end_time:
            period_key = self._get_period_for_time(current)

            next_boundary = self._find_next_period_boundary(current)
            segment_end = min(next_boundary, end_time)

            segments.append((current, segment_end, period_key))
            current = segment_end

            if len(segments) > 100:
                break

        return segments

    def _find_next_period_boundary(self, dt: datetime) -> datetime:
        """找到下一个时段边界"""
        current_time = dt.time()
        current_date = dt.date()

        for start_t, end_t, period_key in self._period_boundaries:
            if start_t <= current_time <= end_t:
                boundary_time = end_t
                boundary_dt = datetime.combine(current_date, boundary_time)
                if boundary_dt > dt:
                    return boundary_dt + timedelta(minutes=1)

        next_day = current_date + timedelta(days=1)
        return datetime.combine(next_day, time(0, 0))

    def _calculate_segment_energy(
        self,
        segment_duration: float,
        total_duration: float,
        total_energy: float
    ) -> float:
        """按时长比例计算分段充电量"""
        if total_duration <= 0:
            return 0.0
        return total_energy * (segment_duration / total_duration)

    def calculate_order(
        self,
        order_row: pd.Series,
        override_tariff: Optional[Dict] = None
    ) -> TariffCalculationResult:
        """计算单条订单的分时电价"""
        order_id = order_row.get("order_id", "UNKNOWN")
        original_row = order_row.get("_original_row_number", 0)
        start_time = order_row.get("start_time")
        end_time = order_row.get("end_time")
        total_energy = float(order_row.get("energy", 0.0) or 0.0)

        if start_time is None or end_time is None or start_time >= end_time:
            return self._create_empty_result(order_id, original_row, start_time, end_time, total_energy)

        total_duration = (end_time - start_time).total_seconds() / 60.0

        time_segments = self._split_time_by_periods(start_time, end_time)

        segments = []
        period_energy = defaultdict(float)
        period_fee = defaultdict(float)
        crossed_periods = set()

        for seg_start, seg_end, period_key in time_segments:
            seg_duration = (seg_end - seg_start).total_seconds() / 60.0
            seg_energy = self._calculate_segment_energy(seg_duration, total_duration, total_energy)

            if override_tariff and period_key in override_tariff:
                price = override_tariff[period_key]
            else:
                price = self.config.get_period_price(period_key)

            seg_fee = seg_energy * price

            segments.append(TimeSegment(
                period_key=period_key,
                period_name=self.config.get_period_name(period_key),
                start_time=seg_start,
                end_time=seg_end,
                duration_minutes=round(seg_duration, 2),
                energy=round(seg_energy, 4),
                price=price,
                electricity_fee=round(seg_fee, 2)
            ))

            period_energy[period_key] += seg_energy
            period_fee[period_key] += seg_fee
            crossed_periods.add(period_key)

        total_electricity_fee = sum(s.electricity_fee for s in segments)
        is_cross_period = len(crossed_periods) > 1

        trace = {
            "total_duration_minutes": total_duration,
            "segment_count": len(segments),
            "energy_distribution": {
                period: round(energy, 4) for period, energy in period_energy.items()
            },
            "fee_distribution": {
                period: round(fee, 2) for period, fee in period_fee.items()
            },
            "average_electricity_price": round(
                total_electricity_fee / total_energy if total_energy > 0 else 0, 4
            )
        }

        return TariffCalculationResult(
            order_id=order_id,
            original_row_number=original_row,
            start_time=start_time,
            end_time=end_time,
            total_energy=round(total_energy, 4),
            total_duration_minutes=round(total_duration, 2),
            segments=segments,
            total_electricity_fee=round(total_electricity_fee, 2),
            peak_energy=round(period_energy.get("peak", 0.0), 4),
            high_energy=round(period_energy.get("high", 0.0), 4),
            flat_energy=round(period_energy.get("flat", 0.0), 4),
            valley_energy=round(period_energy.get("valley", 0.0), 4),
            peak_fee=round(period_fee.get("peak", 0.0), 2),
            high_fee=round(period_fee.get("high", 0.0), 2),
            flat_fee=round(period_fee.get("flat", 0.0), 2),
            valley_fee=round(period_fee.get("valley", 0.0), 2),
            is_cross_period=is_cross_period,
            crossed_periods=list(crossed_periods),
            calculation_trace=trace
        )

    def _create_empty_result(
        self,
        order_id: str,
        original_row: int,
        start_time: Optional[datetime],
        end_time: Optional[datetime],
        total_energy: float
    ) -> TariffCalculationResult:
        """创建空结果（用于异常订单）"""
        return TariffCalculationResult(
            order_id=order_id,
            original_row_number=original_row,
            start_time=start_time or datetime.min,
            end_time=end_time or datetime.min,
            total_energy=round(total_energy, 4),
            total_duration_minutes=0.0,
            segments=[],
            total_electricity_fee=0.0,
            peak_energy=0.0,
            high_energy=0.0,
            flat_energy=0.0,
            valley_energy=0.0,
            peak_fee=0.0,
            high_fee=0.0,
            flat_fee=0.0,
            valley_fee=0.0,
            is_cross_period=False,
            crossed_periods=[],
            calculation_trace={"error": "时间数据异常，无法计算分时电价"}
        )

    def calculate(
        self,
        cleaned_data: CleanedData,
        override_tariff: Optional[Dict] = None
    ) -> TariffEngineResult:
        """批量计算分时电价"""
        df = cleaned_data.df.copy()
        results = []
        cross_period_orders = []

        for idx, row in df.iterrows():
            result = self.calculate_order(row, override_tariff)
            results.append(result)

            if result.is_cross_period:
                cross_period_orders.append(result.order_id)

            df.loc[idx, "peak_energy"] = result.peak_energy
            df.loc[idx, "high_energy"] = result.high_energy
            df.loc[idx, "flat_energy"] = result.flat_energy
            df.loc[idx, "valley_energy"] = result.valley_energy
            df.loc[idx, "peak_fee"] = result.peak_fee
            df.loc[idx, "high_fee"] = result.high_fee
            df.loc[idx, "flat_fee"] = result.flat_fee
            df.loc[idx, "valley_fee"] = result.valley_fee
            df.loc[idx, "calculated_electricity_fee"] = result.total_electricity_fee
            df.loc[idx, "is_cross_period"] = result.is_cross_period
            df.loc[idx, "crossed_periods"] = ",".join(result.crossed_periods)
            df.loc[idx, "avg_electricity_price"] = result.calculation_trace.get(
                "average_electricity_price", 0
            )

        total_energy = sum(r.total_energy for r in results)
        total_fee = sum(r.total_electricity_fee for r in results)

        summary = {
            "total_orders": len(results),
            "cross_period_orders": len(cross_period_orders),
            "cross_period_ratio": round(len(cross_period_orders) / len(results) * 100, 2) if results else 0,
            "total_energy": round(total_energy, 4),
            "total_electricity_fee": round(total_fee, 2),
            "period_energy_distribution": {
                "peak": round(sum(r.peak_energy for r in results), 4),
                "high": round(sum(r.high_energy for r in results), 4),
                "flat": round(sum(r.flat_energy for r in results), 4),
                "valley": round(sum(r.valley_energy for r in results), 4),
            },
            "period_fee_distribution": {
                "peak": round(sum(r.peak_fee for r in results), 2),
                "high": round(sum(r.high_fee for r in results), 2),
                "flat": round(sum(r.flat_fee for r in results), 2),
                "valley": round(sum(r.valley_fee for r in results), 2),
            }
        }

        return TariffEngineResult(
            df=df,
            results=results,
            cross_period_orders=cross_period_orders,
            calculation_summary=summary
        )
