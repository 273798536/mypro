from dataclasses import dataclass, field
from typing import Optional, Dict, List
from datetime import datetime


@dataclass
class LessonRecord:
    raw: Dict[str, str]
    source_file: str
    line_number: int
    is_bad_row: bool = False
    bad_reason: str = ""
    is_skipped: bool = False
    skip_reason: str = ""
    is_old_master: bool = False
    auth_note: str = ""
    audio_file: Optional[str] = None
    progress_notes: str = ""
    processed_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, str]:
        result = dict(self.raw)
        result.update({
            "_source_file": self.source_file,
            "_line_number": self.line_number,
            "_is_bad_row": "是" if self.is_bad_row else "否",
            "_bad_reason": self.bad_reason,
            "_is_skipped": "是" if self.is_skipped else "否",
            "_skip_reason": self.skip_reason,
            "_is_old_master": "是" if self.is_old_master else "否",
            "_auth_note": self.auth_note,
            "_audio_file": self.audio_file or "",
            "_progress_notes": self.progress_notes,
            "_processed_at": self.processed_at.strftime("%Y-%m-%d %H:%M:%S"),
        })
        return result


@dataclass
class ArchiveResult:
    records: List[LessonRecord] = field(default_factory=list)
    tracklist_records: List[LessonRecord] = field(default_factory=list)
    final_records: List[LessonRecord] = field(default_factory=list)

    @property
    def total_processed(self) -> int:
        return len([r for r in self.records if not r.is_skipped and not r.is_bad_row])

    @property
    def total_bad(self) -> int:
        return len([r for r in self.records if r.is_bad_row])

    @property
    def total_skipped(self) -> int:
        return len([r for r in self.records if r.is_skipped and not r.is_bad_row])

    @property
    def total_old_master(self) -> int:
        return len([r for r in self.records if r.is_old_master])

    @property
    def total_with_audio(self) -> int:
        return len([r for r in self.records if r.audio_file])
