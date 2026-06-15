from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List


class LineStatus(str, Enum):
    PROCESSED = "已处理"
    BAD = "坏行"
    SKIPPED = "跳过"
    TIMECODE_OFF = "时码偏差"
    MANUAL_OVERRIDDEN = "人工改判"


@dataclass
class VoicePart:
    track_no: str
    part_name: str
    singer: str
    timecode: str
    status: LineStatus = LineStatus.PROCESSED
    remark: str = ""
    authorization_period: str = ""
    manual_note: str = ""
    original_status: Optional[LineStatus] = None
    timecode_deviation: Optional[str] = None

    @property
    def has_timecode_issue(self) -> bool:
        return self.timecode_deviation is not None and self.timecode_deviation != ""

    @property
    def is_manual_overridden(self) -> bool:
        return self.original_status is not None


@dataclass
class ArchiveResult:
    total: int = 0
    processed: int = 0
    bad_lines: int = 0
    skipped_lines: int = 0
    timecode_off_lines: int = 0
    manual_overridden_lines: int = 0
    parts: List[VoicePart] = field(default_factory=list)
    bad_records: List[dict] = field(default_factory=list)
    skipped_records: List[dict] = field(default_factory=list)
    timecode_off_records: List[VoicePart] = field(default_factory=list)
    manual_overridden_records: List[VoicePart] = field(default_factory=list)
    authorization_note: str = ""
    output_html: str = ""
    output_screenshot: str = ""
