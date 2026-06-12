from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List
import pandas as pd


@dataclass
class SeabirdObservation:
    obs_id: str
    obs_time: datetime
    location: str
    lat: float
    lon: float
    species: str
    count: int
    observer: str
    weather: str
    notes: str = ""
    photo_arrived: bool = True
    photo_time: Optional[datetime] = None
    data_source: str = "manual"


@dataclass
class TideRecord:
    tide_id: str
    obs_time: datetime
    location: str
    lat: float
    lon: float
    tide_height: float
    tide_type: str
    timezone: str
    timezone_correct: bool = True
    data_source: str = "tide_station"


@dataclass
class ShipTrack:
    track_id: str
    ship_name: str
    timestamp: datetime
    lat: float
    lon: float
    speed: float
    heading: float
    is_supplementary: bool = False


@dataclass
class InspectionPhoto:
    photo_id: str
    obs_id: str
    upload_time: datetime
    file_name: str
    is_late: bool = False


@dataclass
class MergedRecord:
    record_id: str
    obs_time: datetime
    location: str
    lat: float
    lon: float
    species: str
    bird_count: int
    tide_height: Optional[float] = None
    tide_type: Optional[str] = None
    ship_nearby: bool = False
    ship_names: List[str] = field(default_factory=list)
    has_photo: bool = False
    photo_late: bool = False
    issues: List[str] = field(default_factory=list)
    is_valid: bool = True
    invalid_reason: str = ""
    affected_conclusions: List[str] = field(default_factory=list)

    def to_dict(self):
        return {
            "记录编号": self.record_id,
            "观测时间": self.obs_time.strftime("%Y-%m-%d %H:%M"),
            "地点": self.location,
            "纬度": self.lat,
            "经度": self.lon,
            "鸟类种类": self.species,
            "数量": self.bird_count,
            "潮位(m)": round(self.tide_height, 2) if self.tide_height is not None else "",
            "潮汐类型": self.tide_type or "",
            "附近有船": "是" if self.ship_nearby else "否",
            "船名": "、".join(self.ship_names) if self.ship_names else "",
            "有照片": "是" if self.has_photo else "否",
            "照片晚到": "是" if self.photo_late else "否",
            "记录有效": "是" if self.is_valid else "否",
            "无效原因": self.invalid_reason,
            "问题": "；".join(self.issues) if self.issues else "",
            "受影响结论": "；".join(self.affected_conclusions) if self.affected_conclusions else "",
        }
