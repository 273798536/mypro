from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import uuid


@dataclass
class BaseEntity:
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    source: str = "manual"
    version: str = "v1.0"


@dataclass
class VersionInfo:
    version_id: str
    created_at: datetime
    source: str
    description: str
    parent_version: Optional[str] = None

    def __str__(self):
        return f"{self.version_id} ({self.source}) - {self.description}"
