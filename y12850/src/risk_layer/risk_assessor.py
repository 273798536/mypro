from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import pandas as pd
import numpy as np
import pytz

from ..tide_engine import TideCalculator
from ..traceability import DataTracker, DataStatus


class RiskLevel(Enum):
    """
    风险等级（赶海安全视角）

    分层说明：
    - SAFE: 安全 - 赶海条件良好
    - CAUTION: 注意 - 需关注潮位变化，谨慎作业
    - WARNING: 警告 - 赶海风险较高，不建议新手前往
    - DANGER: 危险 - 禁止赶海/出船
    """
    SAFE = "安全"
    CAUTION = "注意"
    WARNING = "警告"
    DANGER = "危险"

    @property
    def color(self) -> str:
        return {
            RiskLevel.SAFE: "#27ae60",
            RiskLevel.CAUTION: "#f1c40f",
            RiskLevel.WARNING: "#e67e22",
            RiskLevel.DANGER: "#e74c3c",
        }[self]

    @property
    def score(self) -> int:
        return {
            RiskLevel.SAFE: 1,
            RiskLevel.CAUTION: 2,
            RiskLevel.WARNING: 3,
            RiskLevel.DANGER: 4,
        }[self]


@dataclass
class RiskResult:
    """
    单条风险评估结果

    字段：
    - ship_id / ship_name: 船舶标识
    - record_time: 评估时间点
    - risk_level: 风险等级
    - risk_score: 风险分值（用于排序）
    - factors: 导致该风险的因素清单（每条含描述、权重）
    - nearest_station: 最近潮位站
    - estimated_tide_cm: 估算潮位
    - water_depth_m: 水深
    - speed_kn: 航速
    - suggestion: 行动建议（给船长看的一句话）
    - longitude / latitude: 位置（用于地图联动）
    - source_row / source_file / source_note: 追溯信息
    """
    record_id: str
    ship_id: str
    ship_name: str
    record_time: datetime
    risk_level: RiskLevel
    risk_score: float
    factors: List[Dict[str, Any]] = field(default_factory=list)
    nearest_station: Optional[str] = None
    estimated_tide_cm: Optional[float] = None
    water_depth_m: Optional[float] = None
    speed_kn: Optional[float] = None
    suggestion: Optional[str] = None
    longitude: Optional[float] = None
    latitude: Optional[float] = None
    source_row: int = 0
    source_file: str = ""
    source_note: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "ship_id": self.ship_id,
            "ship_name": self.ship_name,
            "record_time": self.record_time.strftime("%Y-%m-%d %H:%M"),
            "risk_level": self.risk_level.value,
            "risk_level_color": self.risk_level.color,
            "risk_score": round(self.risk_score, 2),
            "nearest_station": self.nearest_station or "",
            "estimated_tide_cm": round(self.estimated_tide_cm, 1) if self.estimated_tide_cm is not None else "",
            "water_depth_m": self.water_depth_m if self.water_depth_m is not None else "",
            "speed_kn": self.speed_kn if self.speed_kn is not None else "",
            "suggestion": self.suggestion or "",
            "factors_text": "；".join(f["description"] for f in self.factors),
            "longitude": self.longitude,
            "latitude": self.latitude,
            "source_row": self.source_row,
            "source_file": self.source_file,
            "source_note": self.source_note,
        }


class RiskAssessor:
    """
    风险分层评估器

    评估维度：
    1. 潮位风险 - 低潮时赶海是否安全，潮位是否异常低/高
    2. 水深风险 - 船底与海底距离是否足够
    3. 航速风险 - 进出港是否过快
    4. 数据可信度 - 潮汐数据是否经过复核（与DataTracker联动）

    地图联动：每条RiskResult都带经纬度，可直接标注在地图上。
    """

    STATION_COORDS = {
        "T001": (121.955, 29.290),
        "T002": (121.948, 29.285),
        "T003": (121.970, 29.270),
        "T004": (121.935, 29.275),
        "T005": (121.960, 29.300),
    }

    LOW_TIDE_THRESHOLD_CM = 80
    SAFE_WATER_DEPTH_M = 5.0
    MIN_SAFE_DEPTH_M = 2.0
    CAUTION_SPEED_KN = 8.0

    LOCAL_TZ = pytz.timezone("Asia/Shanghai")

    def __init__(self, tide_calculator: TideCalculator, tracker: Optional[DataTracker] = None):
        self.tide_calc = tide_calculator
        self.tracker = tracker or DataTracker()
        self._results: List[RiskResult] = []

    def _find_nearest_station(self, lon: float, lat: float) -> Tuple[str, float]:
        """找最近的潮位站，返回 (station_id, 距离km)"""
        best = None
        best_dist = float("inf")
        for sid, (s_lon, s_lat) in self.STATION_COORDS.items():
            d = self._haversine_km(lon, lat, s_lon, s_lat)
            if d < best_dist:
                best_dist = d
                best = sid
        return best, best_dist

    @staticmethod
    def _haversine_km(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
        R = 6371.0
        rlat1, rlat2 = np.radians(lat1), np.radians(lat2)
        dlat = np.radians(lat2 - lat1)
        dlon = np.radians(lon2 - lon1)
        a = np.sin(dlat / 2) ** 2 + np.cos(rlat1) * np.cos(rlat2) * np.sin(dlon / 2) ** 2
        return R * 2 * np.arcsin(np.sqrt(a))

    def _assess_tide_risk(
        self, station_id: str, record_time: datetime
    ) -> Tuple[Optional[float], List[Dict[str, Any]]]:
        """评估潮位风险"""
        factors = []
        tide = self.tide_calc.interpolate_tide(station_id, record_time)
        if tide is None:
            factors.append({
                "name": "tide_unknown",
                "description": "该时段潮位数据缺失，无法估算",
                "weight": 0.5,
                "contribution": 2.0,
            })
            return None, factors

        if tide <= self.LOW_TIDE_THRESHOLD_CM:
            factors.append({
                "name": "low_tide",
                "description": f"估算潮位仅 {tide:.0f}cm，接近或低于最低安全线",
                "weight": 0.4,
                "contribution": 2.5,
            })
        elif tide < 120:
            factors.append({
                "name": "moderate_tide",
                "description": f"估算潮位 {tide:.0f}cm，处于中低水位",
                "weight": 0.3,
                "contribution": 1.2,
            })
        else:
            factors.append({
                "name": "normal_tide",
                "description": f"估算潮位 {tide:.0f}cm，水位正常",
                "weight": 0.1,
                "contribution": 0.3,
            })
        return tide, factors

    def _assess_depth_risk(
        self, tide_cm: Optional[float], depth_m: Optional[float]
    ) -> List[Dict[str, Any]]:
        """评估水深风险"""
        factors = []
        if depth_m is None:
            return factors

        effective_depth = depth_m
        if tide_cm is not None:
            effective_depth = depth_m + (tide_cm / 100.0) * 0.5

        if effective_depth < self.MIN_SAFE_DEPTH_M:
            factors.append({
                "name": "shallow_water",
                "description": f"有效水深约 {effective_depth:.1f}m，低于安全下限",
                "weight": 0.4,
                "contribution": 3.0,
            })
        elif effective_depth < self.SAFE_WATER_DEPTH_M:
            factors.append({
                "name": "moderate_depth",
                "description": f"有效水深约 {effective_depth:.1f}m，需注意搁浅风险",
                "weight": 0.25,
                "contribution": 1.5,
            })
        return factors

    def _assess_speed_risk(self, speed_kn: Optional[float]) -> List[Dict[str, Any]]:
        """评估航速风险"""
        factors = []
        if speed_kn is None:
            return factors
        if speed_kn > self.CAUTION_SPEED_KN:
            factors.append({
                "name": "high_speed",
                "description": f"航速 {speed_kn:.1f}节，近岸区域偏快",
                "weight": 0.2,
                "contribution": 1.5,
            })
        return factors

    def _assess_data_quality(
        self, station_id: str
    ) -> List[Dict[str, Any]]:
        """评估数据可信度（与DataTracker联动）"""
        factors = []
        tracker = self.tide_calc.get_tracker()
        tracked_df = tracker.to_dataframe()
        if tracked_df.empty:
            return factors

        station_records = tracked_df[tracked_df["record_id"].str.contains("")]
        tide_df = self.tide_calc.get_dataframe()
        if tide_df.empty:
            return factors

        station_tide = tide_df[tide_df["station_id"] == station_id]
        rids = station_tide["record_id"].tolist()
        if not rids:
            return factors

        tracked_statuses = tracked_df[tracked_df["record_id"].isin(rids)]["data_status"].tolist()
        if "需重新采集" in tracked_statuses:
            factors.append({
                "name": "timezone_issue",
                "description": "该潮位站存在时区错误数据，风险评估结果仅供参考",
                "weight": 0.2,
                "contribution": 1.0,
            })
        if "暂缓" in tracked_statuses:
            factors.append({
                "name": "pending_data",
                "description": "部分潮位记录待复核，评估结果需谨慎使用",
                "weight": 0.1,
                "contribution": 0.5,
            })
        return factors

    def _score_to_level(self, score: float) -> RiskLevel:
        if score >= 3.0:
            return RiskLevel.DANGER
        elif score >= 2.0:
            return RiskLevel.WARNING
        elif score >= 1.0:
            return RiskLevel.CAUTION
        else:
            return RiskLevel.SAFE

    def _build_suggestion(self, level: RiskLevel, factors: List[Dict[str, Any]]) -> str:
        names = [f["name"] for f in factors]
        if level == RiskLevel.DANGER:
            return "立即停止作业，返航至安全水域"
        if level == RiskLevel.WARNING:
            if "shallow_water" in names:
                return "水深不足，请立即转向深水区域，避免搁浅"
            if "low_tide" in names:
                return "潮位过低，赶海人员请尽快返回岸边"
            return "风险较高，建议暂停作业并观察潮位变化"
        if level == RiskLevel.CAUTION:
            if "high_speed" in names:
                return "近岸区域请减速航行"
            return "注意观察潮位和水深变化，谨慎作业"
        return "作业条件良好，按计划执行"

    def assess_trajectory(self, df_trajectory: pd.DataFrame) -> List[RiskResult]:
        """
        对整条船舶轨迹数据进行风险评估
        """
        self._results = []

        for _, row in df_trajectory.iterrows():
            raw_dict = row.to_dict()
            source_row = int(row.get("source_row", 0))
            source_file = row.get("source_file", "")
            source_note = row.get("source_note", "")
            ship_id = row.get("ship_id", "")
            ship_name = row.get("ship_name", "")
            lon = float(row.get("longitude", 0))
            lat = float(row.get("latitude", 0))
            depth_m = float(row.get("water_depth_m", 0)) if pd.notna(row.get("water_depth_m")) else None
            speed = float(row.get("speed_kn", 0)) if pd.notna(row.get("speed_kn")) else None
            time_str = row.get("record_time", "")

            try:
                record_time = self.LOCAL_TZ.localize(
                    datetime.strptime(time_str, "%Y-%m-%d %H:%M")
                )
            except (ValueError, TypeError):
                record_time = self.LOCAL_TZ.localize(datetime.now())

            nearest_station, _ = self._find_nearest_station(lon, lat)

            all_factors: List[Dict[str, Any]] = []

            tide_cm, tide_factors = self._assess_tide_risk(nearest_station, record_time)
            all_factors.extend(tide_factors)

            depth_factors = self._assess_depth_risk(tide_cm, depth_m)
            all_factors.extend(depth_factors)

            speed_factors = self._assess_speed_risk(speed)
            all_factors.extend(speed_factors)

            data_factors = self._assess_data_quality(nearest_station)
            all_factors.extend(data_factors)

            total_weight = sum(f.get("weight", 0.1) for f in all_factors) or 1.0
            weighted_score = sum(
                f.get("contribution", 0) * f.get("weight", 0.1) for f in all_factors
            ) / total_weight

            level = self._score_to_level(weighted_score)
            suggestion = self._build_suggestion(level, all_factors)

            tracked = self.tracker.track_record(
                source_row=source_row,
                source_file=source_file,
                source_note=source_note,
                data_status=DataStatus.AVAILABLE,
                raw_data=raw_dict,
            )

            result = RiskResult(
                record_id=tracked.record_id,
                ship_id=ship_id,
                ship_name=ship_name,
                record_time=record_time,
                risk_level=level,
                risk_score=weighted_score,
                factors=all_factors,
                nearest_station=nearest_station,
                estimated_tide_cm=tide_cm,
                water_depth_m=depth_m,
                speed_kn=speed,
                suggestion=suggestion,
                longitude=lon,
                latitude=lat,
                source_row=source_row,
                source_file=source_file,
                source_note=source_note,
            )
            self._results.append(result)

        return self._results

    def get_dataframe(self) -> pd.DataFrame:
        return pd.DataFrame([r.to_dict() for r in self._results])

    def get_results(self) -> List[RiskResult]:
        return self._results

    def summary(self) -> Dict[str, Any]:
        """风险分层汇总"""
        counts = {l.value: 0 for l in RiskLevel}
        ships: Dict[str, Dict[str, Any]] = {}
        for r in self._results:
            counts[r.risk_level.value] += 1
            ships.setdefault(r.ship_id, {
                "ship_name": r.ship_name,
                "total": 0,
                "by_level": {l.value: 0 for l in RiskLevel},
                "max_level": RiskLevel.SAFE,
            })
            ships[r.ship_id]["total"] += 1
            ships[r.ship_id]["by_level"][r.risk_level.value] += 1
            if r.risk_level.score > ships[r.ship_id]["max_level"].score:
                ships[r.ship_id]["max_level"] = r.risk_level

        for sid in ships:
            ships[sid]["max_level"] = ships[sid]["max_level"].value

        return {
            "total": len(self._results),
            "counts": counts,
            "by_ship": ships,
        }
