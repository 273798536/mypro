from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List
import hashlib
import json


class DataSourceType(Enum):
    DISPATCH_ORDER = "dispatch_order"
    VALVE_INVENTORY = "valve_inventory"
    SITE_PHOTO = "site_photo"
    SCAN_DETAIL = "scan_detail"


class RecordStatus(Enum):
    PENDING = "pending"
    VALID = "valid"
    INVALID = "invalid"
    FIXED = "fixed"
    WITHDRAWN = "withdrawn"
    FROZEN = "frozen"
    MANUAL_JUDGED = "manual_judged"


class ImportStatus(Enum):
    SUCCESS = "success"
    PARTIAL_FAILURE = "partial_failure"
    FAILED = "failed"


@dataclass
class SourceEvidence:
    source_file: str
    source_file_hash: str
    original_row_number: int
    original_content: Dict[str, Any]
    parsed_standard_value: Dict[str, Any]
    import_timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_file": self.source_file,
            "source_file_hash": self.source_file_hash,
            "original_row_number": self.original_row_number,
            "original_content": self.original_content,
            "parsed_standard_value": self.parsed_standard_value,
            "import_timestamp": self.import_timestamp
        }


@dataclass
class RepairRecord:
    record_id: str
    source_type: DataSourceType
    business_key: str
    status: RecordStatus
    current_value: Dict[str, Any]
    source_evidence: List[SourceEvidence]
    check_results: List[Dict[str, Any]] = field(default_factory=list)
    fix_history: List[Dict[str, Any]] = field(default_factory=list)
    manual_judgment: Optional[Dict[str, Any]] = None
    is_frozen: bool = False
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "source_type": self.source_type.value,
            "business_key": self.business_key,
            "status": self.status.value,
            "current_value": self.current_value,
            "source_evidence": [e.to_dict() for e in self.source_evidence],
            "check_results": self.check_results,
            "fix_history": self.fix_history,
            "manual_judgment": self.manual_judgment,
            "is_frozen": self.is_frozen,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'RepairRecord':
        return cls(
            record_id=data["record_id"],
            source_type=DataSourceType(data["source_type"]),
            business_key=data["business_key"],
            status=RecordStatus(data["status"]),
            current_value=data["current_value"],
            source_evidence=[SourceEvidence(**e) for e in data["source_evidence"]],
            check_results=data.get("check_results", []),
            fix_history=data.get("fix_history", []),
            manual_judgment=data.get("manual_judgment"),
            is_frozen=data.get("is_frozen", False),
            created_at=data["created_at"],
            updated_at=data["updated_at"]
        )


def generate_business_key(source_type: DataSourceType, data: Dict[str, Any]) -> str:
    key_components = []
    
    if source_type == DataSourceType.DISPATCH_ORDER:
        key_components = [
            str(data.get("order_no", "")),
            str(data.get("repair_date", ""))
        ]
    elif source_type == DataSourceType.VALVE_INVENTORY:
        key_components = [
            str(data.get("valve_code", "")),
            str(data.get("inventory_date", ""))
        ]
    elif source_type == DataSourceType.SITE_PHOTO:
        key_components = [
            str(data.get("order_no", "")),
            str(data.get("photo_sequence", ""))
        ]
    elif source_type == DataSourceType.SCAN_DETAIL:
        key_components = [
            str(data.get("order_no", "")),
            str(data.get("material_code", "")),
            str(data.get("scan_time", ""))
        ]
    
    key_string = "|".join(key_components)
    return hashlib.md5(key_string.encode('utf-8')).hexdigest()[:16]


def generate_record_id(source_type: DataSourceType, business_key: str) -> str:
    return f"{source_type.value}_{business_key}"
