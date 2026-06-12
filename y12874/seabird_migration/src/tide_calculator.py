from datetime import datetime, timedelta
from typing import List, Optional, Tuple
import math
import pytz

from .models import TideRecord


TIDE_STATIONS = {
    "东码头": {"lat": 30.15, "lon": 121.85, "base_height": 2.5, "amplitude": 1.8},
    "西滩涂": {"lat": 30.22, "lon": 121.75, "base_height": 2.2, "amplitude": 1.5},
    "南岛礁": {"lat": 30.08, "lon": 121.92, "base_height": 3.0, "amplitude": 2.0},
    "北湾": {"lat": 30.28, "lon": 121.80, "base_height": 2.8, "amplitude": 1.7},
}


class TideCalculator:
    def __init__(self, tide_records: Optional[List[TideRecord]] = None):
        self.tide_records: List[TideRecord] = []
        self._cache_dirty = True
        self._cached_interpolator = None
        if tide_records:
            self.add_tide_records(tide_records)

    def add_tide_records(self, records: List[TideRecord]):
        for r in records:
            existing = next((t for t in self.tide_records if t.tide_id == r.tide_id), None)
            if existing:
                idx = self.tide_records.index(existing)
                self.tide_records[idx] = r
            else:
                self.tide_records.append(r)
        self._cache_dirty = True

    def remove_tide_record(self, tide_id: str):
        self.tide_records = [t for t in self.tide_records if t.tide_id != tide_id]
        self._cache_dirty = True

    def _group_by_location(self):
        groups = {}
        for r in self.tide_records:
            if r.timezone_correct:
                if r.location not in groups:
                    groups[r.location] = []
                groups[r.location].append(r)
        for loc in groups:
            groups[loc].sort(key=lambda x: x.obs_time)
        return groups

    def get_tide_at_time(self, obs_time: datetime, location: str,
                         obs_lat: float, obs_lon: float) -> Tuple[Optional[float], Optional[str], List[str]]:
        issues = []
        tz_issue = self._check_timezone_issue(obs_time, location)
        if tz_issue:
            issues.append(tz_issue)
            return None, None, issues

        groups = self._group_by_location()
        if location in groups and len(groups[location]) >= 2:
            height, tide_type = self._interpolate_tide(groups[location], obs_time)
            return height, tide_type, issues

        station = TIDE_STATIONS.get(location)
        if station:
            height = self._synthetic_tide(obs_time, station["base_height"], station["amplitude"])
            tide_type = self._classify_tide_type(height, station["base_height"])
            if not groups.get(location):
                issues.append("无实测潮汐数据，使用模型估算值")
            return height, tide_type, issues

        nearest_station = self._find_nearest_station(obs_lat, obs_lon)
        if nearest_station:
            station = TIDE_STATIONS[nearest_station]
            height = self._synthetic_tide(obs_time, station["base_height"], station["amplitude"])
            tide_type = self._classify_tide_type(height, station["base_height"])
            issues.append(f"无本地潮汐数据，使用最近站点({nearest_station})估算")
            return height, tide_type, issues

        issues.append("无法获取潮汐数据")
        return None, None, issues

    def _check_timezone_issue(self, obs_time: datetime, location: str) -> Optional[str]:
        groups = self._group_by_location()
        all_records = [r for r in self.tide_records if r.location == location]
        wrong_tz = [r for r in all_records if not r.timezone_correct]

        if wrong_tz:
            wrong_record = wrong_tz[0]
            return f"潮位时区错误：记录使用{wrong_record.timezone}，本地应为Asia/Shanghai（相差约8小时），潮位数据不可靠"

        return None

    def validate_timezone(self, record: TideRecord) -> Tuple[bool, str]:
        expected_tz = "Asia/Shanghai"
        if record.timezone != expected_tz:
            return False, f"时区不匹配：记录时区为{record.timezone}，本地应为{expected_tz}"

        try:
            tz = pytz.timezone(record.timezone)
            now = datetime.now()
            utc_offset = tz.utcoffset(now)
            if utc_offset.total_seconds() != 8 * 3600:
                return False, f"时区偏移异常：UTC{utc_offset.total_seconds()/3600:+.0f}，本地应为UTC+8"
        except Exception:
            return False, f"无效的时区标识：{record.timezone}"

        return True, "时区正确"

    def _interpolate_tide(self, records: List[TideRecord], target_time: datetime) -> Tuple[float, str]:
        times = [r.obs_time for r in records]
        heights = [r.tide_height for r in records]

        if target_time <= times[0]:
            height = heights[0]
        elif target_time >= times[-1]:
            height = heights[-1]
        else:
            for i in range(len(times) - 1):
                if times[i] <= target_time <= times[i + 1]:
                    dt_total = (times[i + 1] - times[i]).total_seconds()
                    dt_target = (target_time - times[i]).total_seconds()
                    ratio = dt_target / dt_total if dt_total > 0 else 0
                    height = heights[i] + ratio * (heights[i + 1] - heights[i])
                    break
            else:
                height = heights[-1]

        base_height = sum(heights) / len(heights)
        tide_type = self._classify_tide_type(height, base_height)
        return height, tide_type

    def _synthetic_tide(self, t: datetime, base_height: float, amplitude: float) -> float:
        hours_since_midnight = t.hour + t.minute / 60
        tide_phase = (hours_since_midnight / 12.42) * 2 * math.pi
        semidiurnal = amplitude * math.sin(tide_phase)
        daily_correction = 0.2 * amplitude * math.sin(tide_phase / 2)
        return base_height + semidiurnal + daily_correction

    def _classify_tide_type(self, height: float, base_height: float) -> str:
        diff = height - base_height
        if diff > 0.8:
            return "高潮"
        elif diff > 0.2:
            return "涨潮"
        elif diff < -0.8:
            return "低潮"
        elif diff < -0.2:
            return "落潮"
        else:
            return "平潮"

    def _find_nearest_station(self, lat: float, lon: float) -> Optional[str]:
        nearest = None
        min_dist = float("inf")
        for name, info in TIDE_STATIONS.items():
            dist = math.sqrt((lat - info["lat"]) ** 2 + (lon - info["lon"]) ** 2)
            if dist < min_dist:
                min_dist = dist
                nearest = name
        return nearest

    def get_tide_series(self, location: str, start_time: datetime,
                        end_time: datetime, interval_minutes: int = 30) -> List[Tuple[datetime, float]]:
        station = TIDE_STATIONS.get(location)
        if not station:
            nearest = self._find_nearest_station(
                TIDE_STATIONS.get("东码头", {}).get("lat", 30.15),
                TIDE_STATIONS.get("东码头", {}).get("lon", 121.85),
            )
            station = TIDE_STATIONS.get(nearest, {"base_height": 2.5, "amplitude": 1.8})

        series = []
        current = start_time
        while current <= end_time:
            height = self._synthetic_tide(current, station["base_height"], station["amplitude"])
            series.append((current, height))
            current += timedelta(minutes=interval_minutes)
        return series

    def recalculate_all(self):
        self._cache_dirty = True
