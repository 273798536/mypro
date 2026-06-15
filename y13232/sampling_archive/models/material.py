from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime
import uuid


class MaterialStatus(str, Enum):
    PROCESSED = "已处理"
    PENDING = "待补材料"
    MANUAL_REVIEW = "人工改判"
    CONFLICT = "版本冲突"


@dataclass
class Material:
    id: str = ""
    name: str = ""
    original_name: str = ""
    category: str = ""
    status: MaterialStatus = MaterialStatus.PENDING
    source: str = ""
    source_raw: str = ""
    version: str = "1.0"
    version_source: str = ""
    file_path: str = ""
    file_size: int = 0
    submitted_by: str = ""
    submitted_at: str = ""
    notes: str = ""
    raw_data: Dict[str, Any] = field(default_factory=dict)
    duplicate_of: Optional[str] = None
    confidence_score: float = 0.0
    annotations: List[Dict[str, Any]] = field(default_factory=list)
    created_at: str = ""
    updated_at: str = ""

    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        if not self.created_at:
            self.created_at = now
        if not self.updated_at:
            self.updated_at = now
        if not self.original_name:
            self.original_name = self.name

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d['status'] = self.status.value if isinstance(self.status, MaterialStatus) else self.status
        return d

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Material':
        status = data.get('status', MaterialStatus.PENDING)
        if isinstance(status, str):
            try:
                status = MaterialStatus(status)
            except ValueError:
                status = MaterialStatus.PENDING
        data_copy = dict(data)
        data_copy['status'] = status
        return cls(**data_copy)
