from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
from typing import Optional


class SampleClass(Enum):
    NORMAL = "正常样本"
    BOUNDARY = "边界样本"
    BAD = "明显坏样本"


class IssueType(Enum):
    SAME_NAME_OVERWRITE = "同名覆盖"
    TRACK_MISSING = "轨道缺失"
    WRONG_VERSION_FEEDBACK = "反馈错版"
    MERGE_CONFLICT = "合并冲突"
    PARAM_DRIFT = "参数漂移"


@dataclass
class TrackState:
    track_name: str
    file_path: str
    file_hash: str
    parameters: dict = field(default_factory=dict)
    last_modified_by: str = ""
    last_modified_at: str = ""


@dataclass
class VersionSnapshot:
    project_name: str
    version_id: str
    timestamp: str
    engineer: str
    tracks: dict = field(default_factory=dict)

    def track_names(self):
        return set(self.tracks.keys())

    def get_track(self, name: str) -> Optional[TrackState]:
        return self.tracks.get(name)


@dataclass
class RollbackRecord:
    from_version: str
    to_version: str
    reason: str
    operator: str
    timestamp: str
    affected_tracks: list = field(default_factory=list)


@dataclass
class CheckIssue:
    issue_type: IssueType
    sample_class: SampleClass
    track_name: str
    detail: str
    version_ref: str
    record_pointer: str = ""
    plain_explanation: str = ""


@dataclass
class MergeConflict:
    track_name: str
    engineering_version: str
    param_version: str
    engineer_author: str
    param_author: str
    engineering_change: str
    param_change: str


@dataclass
class ExportEntry:
    version_id: str
    issue_type: IssueType
    track_name: str
    sample_class: SampleClass
    detail: str
    timestamp: str
    resolved: bool = False
