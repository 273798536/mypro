from dataclasses import dataclass, field, asdict
from datetime import datetime, date
from typing import Optional, List, Dict, Any
import uuid
import json
import os
import pandas as pd


DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(DATA_DIR, exist_ok=True)


@dataclass
class TideRecord:
    record_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    station: str = ""
    tide_time: Optional[datetime] = None
    tide_height: Optional[float] = None
    tide_type: str = ""
    timezone: str = "Asia/Shanghai"
    remark: str = ""
    source_batch: str = ""
    is_clean: bool = False
    issues: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        if self.tide_time:
            d["tide_time"] = self.tide_time.isoformat()
        d["created_at"] = self.created_at.isoformat()
        return d


@dataclass
class VesselTrajectory:
    trajectory_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    vessel_name: str = ""
    vessel_id: str = ""
    arrival_time: Optional[datetime] = None
    departure_time: Optional[datetime] = None
    water_demand: float = 0.0
    route: str = ""
    remark: str = ""
    source_batch: str = ""
    fingerprint: str = ""
    created_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        if self.arrival_time:
            d["arrival_time"] = self.arrival_time.isoformat()
        if self.departure_time:
            d["departure_time"] = self.departure_time.isoformat()
        d["created_at"] = self.created_at.isoformat()
        return d


@dataclass
class SupplySchedule:
    schedule_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    trajectory_id: str = ""
    vessel_name: str = ""
    vessel_id: str = ""
    supply_time: Optional[datetime] = None
    water_amount: float = 0.0
    base_tide_height: Optional[float] = None
    confidence: float = 0.0
    status: str = "pending"
    review_note: str = ""
    reviewer: str = ""
    reviewed_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        if self.supply_time:
            d["supply_time"] = self.supply_time.isoformat()
        if self.reviewed_at:
            d["reviewed_at"] = self.reviewed_at.isoformat()
        d["created_at"] = self.created_at.isoformat()
        return d


@dataclass
class AuditLog:
    log_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    schedule_id: str = ""
    field_name: str = ""
    old_value: str = ""
    new_value: str = ""
    operator: str = ""
    operation: str = ""
    remark: str = ""
    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["timestamp"] = self.timestamp.isoformat()
        return d


class DataStore:
    @staticmethod
    def _path(name: str) -> str:
        return os.path.join(DATA_DIR, f"{name}.json")

    @staticmethod
    def save(name: str, items: List[Any]) -> None:
        data = [item.to_dict() if hasattr(item, "to_dict") else item for item in items]
        with open(DataStore._path(name), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    @staticmethod
    def load_df(name: str) -> pd.DataFrame:
        path = DataStore._path(name)
        if not os.path.exists(path):
            return pd.DataFrame()
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not data:
            return pd.DataFrame()
        return pd.DataFrame(data)

    @staticmethod
    def append(name: str, items: List[Any]) -> None:
        existing_df = DataStore.load_df(name)
        new_data = [item.to_dict() if hasattr(item, "to_dict") else item for item in items]
        new_df = pd.DataFrame(new_data)
        if existing_df.empty:
            combined = new_df
        else:
            combined = pd.concat([existing_df, new_df], ignore_index=True)
        with open(DataStore._path(name), "w", encoding="utf-8") as f:
            json.dump(combined.to_dict(orient="records"), f, ensure_ascii=False, indent=2)
