from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
import uuid
import json


class BoothStatus(str, Enum):
    PENDING = "待处理"
    PROCESSING = "处理中"
    NEED_REVIEW = "待复核"
    PASSED = "已通过"
    NEED_EVIDENCE = "待补证据"
    REJECTED = "已驳回"
    CONFLICT = "版本冲突"


class AnomalyLevel(str, Enum):
    NONE = "无异常"
    MINOR = "轻微异常"
    MAJOR = "严重异常"
    CRITICAL = "致命异常"


class AnomalyType(str, Enum):
    TIMING_OFFSET = "时码偏差"
    AUTHORIZATION_EXPIRED = "授权过期"
    AUTHORIZATION_HIDDEN = "授权期限备注藏"
    MISSING_MATERIAL = "材料缺失"
    INCOMPLETE_SETLIST = "曲目表不全"
    DUPLICATE_RECORD = "重复记录"
    VERSION_CONFLICT = "版本冲突"
    FORMAT_ERROR = "格式错误"
    OTHER = "其他异常"


def _new_uuid_short() -> str:
    return uuid.uuid4().hex[:12]


def _now_iso() -> str:
    return datetime.now().isoformat()


@dataclass
class VersionInfo:
    version_id: str = field(default_factory=_new_uuid_short)
    file_path: str = ""
    file_hash: str = ""
    source: str = ""
    imported_at: str = field(default_factory=_now_iso)
    note: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _default_anomaly_type() -> AnomalyType:
    return AnomalyType.OTHER


def _default_anomaly_level() -> AnomalyLevel:
    return AnomalyLevel.MINOR


@dataclass
class AnomalyRecord:
    anomaly_id: str = field(default_factory=_new_uuid_short)
    type: AnomalyType = field(default_factory=_default_anomaly_type)
    level: AnomalyLevel = field(default_factory=_default_anomaly_level)
    description: str = ""
    location: str = ""
    suggestion: str = ""
    screenshot_hint: str = ""
    detected_at: str = field(default_factory=_now_iso)
    resolved: bool = False
    resolved_at: Optional[str] = None
    resolver_note: str = ""

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["type"] = self.type.value
        d["level"] = self.level.value
        return d


def _default_version() -> VersionInfo:
    return VersionInfo()


def _default_booth_status() -> BoothStatus:
    return BoothStatus.PENDING


@dataclass
class BoothRecord:
    booth_id: str
    booth_name: str = ""
    performer: str = ""
    contact: str = ""
    authorization_period: str = ""
    authorization_visible: bool = True
    setlist_complete: bool = True
    timing_offset_ms: int = 0
    raw_data: Dict[str, Any] = field(default_factory=dict)
    version: VersionInfo = field(default_factory=_default_version)
    status: BoothStatus = field(default_factory=_default_booth_status)
    anomalies: List = field(default_factory=list)
    history: List = field(default_factory=list)
    created_at: str = field(default_factory=_now_iso)
    updated_at: str = field(default_factory=_now_iso)
    operator: str = ""

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["status"] = self.status.value
        d["version"] = self.version.to_dict()
        d["anomalies"] = [a.to_dict() for a in self.anomalies]
        return d

    def add_history(self, action: str, detail: str, operator: str = ""):
        self.history.append({
            "action": action,
            "detail": detail,
            "operator": operator,
            "timestamp": datetime.now().isoformat()
        })
        self.updated_at = datetime.now().isoformat()


@dataclass
class ProcessingResult:
    success: bool
    code: str
    message: str
    data: Dict[str, Any] = field(default_factory=dict)
    errors: List = field(default_factory=list)
    screenshot_hints: List = field(default_factory=list)
    params_used: Dict[str, Any] = field(default_factory=dict)

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=indent)

    def to_dict(self) -> Dict[str, Any]:
        d = {
            "success": self.success,
            "code": self.code,
            "message": self.message,
            "data": self.data,
            "errors": list(self.errors),
            "screenshot_hints": list(self.screenshot_hints),
            "params_used": self.params_used
        }
        return d
