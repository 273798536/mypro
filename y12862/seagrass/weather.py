"""
气象预报模块 - 海草床覆盖度估算的关键输入线
提供：预报数据接入、异常检测、溯源链路
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional

from .models import ProcessingRecord, STAGE_WEATHER_FORECAST


class WeatherForecastProvider:
    """
    气象预报数据提供方
    真实场景可能是 API 拉取，这里用内置样例数据模拟，保证可复现。
    """

    def __init__(self):
        self.provider_name = "marine_weather_center"
        self._forecast_cache = {}

    def fetch_forecast(self, lon: float, lat: float, query_time: datetime) -> Dict:
        """
        拉取指定位置、时间的气象预报。
        返回结构化数据，包括风速、风向、浪高、能见度、天气状况。
        """
        forecast_id = f"fc_{uuid.uuid4().hex[:8]}"
        hour = query_time.hour
        day_factor = (hour / 12.0 - 1.0)

        wind_speed = 8.0 + 3.0 * day_factor + lat * 0.1
        wind_speed = max(2.0, min(25.0, wind_speed))
        wind_dir = 135.0 + day_factor * 20.0

        wave_height = 0.8 + 0.3 * day_factor
        visibility = 10.0 - day_factor * 2.0
        visibility = max(2.0, min(15.0, visibility))

        weather_condition = "clear"
        if wind_speed > 18:
            weather_condition = "stormy"
        elif wind_speed > 12:
            weather_condition = "windy"
        elif visibility < 5:
            weather_condition = "foggy"

        forecast = {
            "forecast_id": forecast_id,
            "provider": self.provider_name,
            "lon": lon,
            "lat": lat,
            "forecast_time": query_time,
            "wind_speed_mps": round(wind_speed, 2),
            "wind_direction_deg": round(wind_dir, 1),
            "wave_height_m": round(wave_height, 2),
            "visibility_km": round(visibility, 1),
            "weather_condition": weather_condition,
            "data_quality": "normal",
            "issue_time": query_time - timedelta(hours=6),
        }
        self._forecast_cache[forecast_id] = forecast
        return forecast

    def get_forecast_by_id(self, forecast_id: str) -> Optional[Dict]:
        return self._forecast_cache.get(forecast_id)


def apply_weather_to_record(record: ProcessingRecord,
                            weather_provider: WeatherForecastProvider) -> ProcessingRecord:
    """
    将气象预报数据应用到处理记录上。
    写入 weather_data、source_refs、processing_opinions，
    保证溯源链路完整：从结果能查到气象预报和处理意见。
    """
    fc = weather_provider.fetch_forecast(
        lon=record.longitude, lat=record.latitude, query_time=record.survey_time
    )

    record.weather_data = fc
    record.add_source(
        source_id=fc["forecast_id"],
        source_type="weather_forecast",
        source_name=fc["provider"],
        raw_value=fc
    )

    quality_assessment = "可用"
    decision = "accept"
    flags_to_add = []

    if fc["weather_condition"] == "stormy":
        quality_assessment = "恶劣，数据置信度低"
        decision = "flag_low_confidence"
        flags_to_add.append("weather_stormy")
    elif fc["weather_condition"] == "foggy":
        quality_assessment = "能见度差，影响观测"
        decision = "flag_low_confidence"
        flags_to_add.append("weather_foggy")
    elif fc["wind_speed_mps"] > 12:
        quality_assessment = "风力偏大，覆盖度可能偏低"
        decision = "accept_with_caveat"
        flags_to_add.append("weather_windy")

    evidence = {
        "forecast_id": fc["forecast_id"],
        "wind_speed_mps": fc["wind_speed_mps"],
        "wave_height_m": fc["wave_height_m"],
        "visibility_km": fc["visibility_km"],
        "weather_condition": fc["weather_condition"],
    }

    record.add_opinion(
        stage=STAGE_WEATHER_FORECAST,
        operator="weather_module",
        opinion=f"气象条件{quality_assessment}",
        decision=decision,
        evidence=evidence
    )

    for f in flags_to_add:
        record.add_flag(f)

    return record


def batch_apply_weather(records: List[ProcessingRecord],
                        weather_provider: WeatherForecastProvider) -> List[ProcessingRecord]:
    for r in records:
        apply_weather_to_record(r, weather_provider)
    return records


def find_weather_anomalies(records: List[ProcessingRecord]) -> List[ProcessingRecord]:
    """
    找出所有有气象异常标记的记录。
    验收时顺着异常往回查要用。
    """
    return [r for r in records if any(f.startswith("weather_") for f in r.flags)]
