import uuid
import math
from datetime import datetime, timedelta
from typing import Optional
import logging

from .models import TideCalculation
from config import TIDE_CORRECTION_FACTOR

logger = logging.getLogger(__name__)


class TideCalculator:
    def __init__(self):
        self.algorithm_version = "v1.0"
        self._tide_cache = {}

    def _generate_id(self) -> str:
        return f"tide_{uuid.uuid4().hex[:8]}"

    def _get_tidal_constituents(self, lat: float, lon: float) -> dict:
        base_amplitude = 1.5 + 0.3 * math.sin(math.radians(lat))
        phase_shift = math.radians(lon) / 2.0
        return {
            "M2": {"amplitude": base_amplitude, "phase": phase_shift},
            "S2": {"amplitude": base_amplitude * 0.4, "phase": phase_shift + 0.5},
            "K1": {"amplitude": base_amplitude * 0.6, "phase": phase_shift + 1.2},
            "O1": {"amplitude": base_amplitude * 0.5, "phase": phase_shift + 0.8},
        }

    def _calculate_tide_level(
        self,
        timestamp: datetime,
        lat: float,
        lon: float,
    ) -> float:
        constituents = self._get_tidal_constituents(lat, lon)
        time_since_epoch = timestamp.timestamp() / 3600.0

        tide = 0.0
        for name, params in constituents.items():
            if name == "M2":
                frequency = 2 * math.pi / 12.42
            elif name == "S2":
                frequency = 2 * math.pi / 12.0
            elif name == "K1":
                frequency = 2 * math.pi / 23.93
            elif name == "O1":
                frequency = 2 * math.pi / 25.82
            else:
                frequency = 2 * math.pi / 12.0

            tide += params["amplitude"] * math.sin(
                frequency * time_since_epoch + params["phase"]
            )

        return round(tide, 3)

    def _find_tide_extremes(
        self,
        timestamp: datetime,
        lat: float,
        lon: float,
        window_hours: int = 12,
    ) -> tuple[float, float]:
        high_tide = -float("inf")
        low_tide = float("inf")

        start_time = timestamp - timedelta(hours=window_hours)
        end_time = timestamp + timedelta(hours=window_hours)

        current = start_time
        while current <= end_time:
            tide = self._calculate_tide_level(current, lat, lon)
            high_tide = max(high_tide, tide)
            low_tide = min(low_tide, tide)
            current += timedelta(minutes=10)

        return round(high_tide, 3), round(low_tide, 3)

    def calculate(
        self,
        record_id: str,
        buoy_id: str,
        latitude: float,
        longitude: float,
        timestamp: datetime,
        raw_thickness: float,
        override_factor: Optional[float] = None,
    ) -> TideCalculation:
        cache_key = f"{buoy_id}_{timestamp.isoformat()}"
        if cache_key in self._tide_cache and override_factor is None:
            cached = self._tide_cache[cache_key]
            if cached.processing_record_id == record_id:
                return cached

        current_tide = self._calculate_tide_level(timestamp, latitude, longitude)
        high_tide, low_tide = self._find_tide_extremes(timestamp, latitude, longitude)

        factor = override_factor if override_factor is not None else TIDE_CORRECTION_FACTOR

        tide_range = high_tide - low_tide
        if tide_range > 0:
            tide_position = (current_tide - low_tide) / tide_range
            correction = factor * (0.5 - tide_position) * raw_thickness * 0.1
        else:
            correction = 0.0

        tide_corrected_thickness = round(max(0, raw_thickness + correction), 2)

        result = TideCalculation(
            tide_id=self._generate_id(),
            processing_record_id=record_id,
            buoy_id=buoy_id,
            calculation_time=datetime.now(),
            high_tide=high_tide,
            low_tide=low_tide,
            current_tide=current_tide,
            tide_corrected_thickness=tide_corrected_thickness,
            algorithm_version=self.algorithm_version,
        )

        if override_factor is None:
            self._tide_cache[cache_key] = result

        logger.info(
            f"潮汐计算完成 - 浮标 {buoy_id}: "
            f"当前潮位 {current_tide}m, "
            f"校正后厚度 {tide_corrected_thickness}cm "
            f"(原始 {raw_thickness}cm, 校正因子 {factor})"
        )

        return result

    def recalculate_with_review(
        self,
        record_id: str,
        buoy_id: str,
        latitude: float,
        longitude: float,
        timestamp: datetime,
        raw_thickness: float,
        reviewer_note: str,
        override_factor: Optional[float] = None,
    ) -> tuple[TideCalculation, str]:
        new_calc = self.calculate(
            record_id=record_id,
            buoy_id=buoy_id,
            latitude=latitude,
            longitude=longitude,
            timestamp=timestamp,
            raw_thickness=raw_thickness,
            override_factor=override_factor,
        )

        audit_note = (
            f"[{datetime.now().isoformat()}] 潮汐复核重算 - "
            f"原因: {reviewer_note}, "
            f"校正因子: {override_factor if override_factor else '默认'}, "
            f"新厚度: {new_calc.tide_corrected_thickness}cm"
        )

        logger.info(audit_note)
        return new_calc, audit_note

    def clear_cache(self):
        self._tide_cache.clear()
        logger.info("潮汐计算缓存已清空")
