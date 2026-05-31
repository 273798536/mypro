from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional
from enum import Enum


class EntryType(Enum):
    NORMAL = "normal"
    DUPLICATE = "duplicate"
    UPGRADE = "upgrade"


@dataclass
class EntryRecord:
    entry_id: str
    account_id: str
    entry_date: date
    entry_time: Optional[datetime] = None
    gate_id: Optional[str] = None
    entry_type: EntryType = EntryType.NORMAL
    is_duplicate: bool = False
    duplicate_of_entry_id: Optional[str] = None
    source_record_id: Optional[str] = None
    is_valid: bool = True
    created_at: datetime = field(default_factory=datetime.now)
    remarks: str = ""

    def __post_init__(self):
        if isinstance(self.entry_type, str):
            self.entry_type = EntryType(self.entry_type)
