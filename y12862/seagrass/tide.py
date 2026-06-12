"""
潮汐计算模块
写入共用的 ProcessingRecord.tide_data，
轨迹清洗和覆盖度估算都从这里读数，不会各算各的。

验收场景：拿一条潮位时区错记录倒查，
要能从结果一路回到来源和处理记录。
"""

import math
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional

from .models import ProcessingRecord, STAGE_TIDE_COMPUTATION, RECORD_STATUS_TIDE_COMPUTED


class TideStation:
    """潮位站"""

    def __init__(self, station_id: str, name: str, lon: float, lat: float,
                 datum_m: float = 0.0, timezone_offset_hours: int = 8):
        self.station_id = station_id
        self.name = name
        self.lon = lon
        self.lat = lat
        self.datum_m = datum_m
        self.timezone_offset_hours = timezone_offset_hours

    def compute_tide_level(self, query_time: datetime) -> Dict:
        """
        计算指定时间的潮位。
        用简化的调和常数模拟：M2 + S2 + K1 三个分潮。
        真实场景会查潮位表，这里保证可复现。
        """
        t = (query_time - datetime(2026, 1, 1, tzinfo=timezone.utc)).total_seconds() / 3600.0

        m2_amp = 1.2
        m2_phase = 0.5
        m2_period = 12.42
        m2 = m2_amp * math.sin(2 * math.pi * t / m2_period + m2_phase)

        s2_amp = 0.4
        s2_phase = 1.2
        s2_period = 12.0
        s2 = s2_amp * math.sin(2 * math.pi * t / s2_period + s2_phase)

        k1_amp = 0.3
        k1_phase = 0.8
        k1_period = 23.93
        k1 = k1_amp * math.sin(2 * math.pi * t / k1_period + k1_phase)

        tide_level = self.datum_m + m2 + s2 + k1 + 0.5

        phase = "rising"
        t_next = t + 0.1
        m2_next = m2_amp * math.sin(2 * math.pi * t_next / m2_period + m2_phase)
        s2_next = s2_amp * math.sin(2 * math.pi * t_next / s2_period + s2_phase)
        k1_next = k1_amp * math.sin(2 * math.pi * t_next / k1_period + k1_phase)
        next_level = self.datum_m + m2_next + s2_next + k1_next + 0.5
        if next_level < tide_level:
            phase = "falling"

        return {
            "station_id": self.station_id,
            "station_name": self.name,
            "query_time_utc": query_time,
            "tide_level_m": round(tide_level, 3),
            "tide_phase": phase,
            "datum_m": self.datum_m,
            "station_timezone_offset_hours": self.timezone_offset_hours,
            "computation_method": "harmonic_analysis_M2_S2_K1",
        }


def find_nearest_station(lon: float, lat: float,
                         stations: List[TideStation]) -> Optional[TideStation]:
    if not stations:
        return None
    best = None
    best_dist = float("inf")
    for s in stations:
        dist = math.hypot(s.lon - lon, s.lat - lat)
        if dist < best_dist:
            best_dist = dist
            best = s
    return best


def compute_tide_for_record(record: ProcessingRecord,
                            stations: List[TideStation]) -> ProcessingRecord:
    """
    计算单条记录的潮位，写入共用的 ProcessingRecord。
    同时写 processing_opinion 和 source_ref，保证可溯源。

    关键检查：时区。
    如果记录的时区与潮位站时区不一致，会标 flag，
    方便验收时拿"潮位时区错记录"倒查。
    """
    station = find_nearest_station(record.longitude, record.latitude, stations)
    if station is None:
        record.add_opinion(
            station=STAGE_TIDE_COMPUTATION,
            operator="tide_module",
            opinion="无可用潮位站",
            decision="skip",
            evidence={}
        )
        return record

    tide = station.compute_tide_level(record.survey_time)
    record.tide_data = tide
    record.status = RECORD_STATUS_TIDE_COMPUTED

    record.add_source(
        source_id=station.station_id,
        source_type="tide_station",
        source_name=station.name,
        raw_value=tide
    )

    tz_match = record.timezone_offset_hours == station.timezone_offset_hours
    if tz_match:
        opinion = "潮位计算完成，时区一致"
        decision = "accept"
        evidence = {
            "tide_level_m": tide["tide_level_m"],
            "tide_phase": tide["tide_phase"],
            "station": station.name,
            "timezone_match": True,
        }
    else:
        opinion = (f"潮位计算完成，但时区不一致："
                   f"记录时区UTC{record.timezone_offset_hours:+d}，"
                   f"潮位站时区UTC{station.timezone_offset_hours:+d}")
        decision = "flag_timezone_mismatch"
        record.add_flag("tide_timezone_mismatch")
        evidence = {
            "tide_level_m": tide["tide_level_m"],
            "tide_phase": tide["tide_phase"],
            "station": station.name,
            "record_timezone_offset_hours": record.timezone_offset_hours,
            "station_timezone_offset_hours": station.timezone_offset_hours,
            "timezone_match": False,
            "note": "时区不一致可能导致潮位相位偏差约1小时",
        }

    record.add_opinion(
        stage=STAGE_TIDE_COMPUTATION,
        operator="tide_module",
        opinion=opinion,
        decision=decision,
        evidence=evidence
    )

    return record


def batch_compute_tide(records: List[ProcessingRecord],
                       stations: List[TideStation]) -> List[ProcessingRecord]:
    for r in records:
        compute_tide_for_record(r, stations)
    return records
