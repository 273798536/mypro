import uuid
import hashlib
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any


class ReviewStatus(str, Enum):
    PENDING = "待复核"
    PASSED = "可放行"
    NEEDS_SUPPLEMENT = "需补材料"
    AMBIGUOUS = "存疑待确认"


class IssueType(str, Enum):
    CONTRACT_MISMATCH = "合同曲目对不上"
    FILENAME_MISMATCH = "文件名曲目对不上"
    CONTRACT_FILENAME_MISMATCH = "合同和文件名对不上"
    DUPLICATE_TRACK = "曲目重复"
    MISSING_CONTRACT = "缺少合同扫描件"
    MISSING_FILE = "缺少音频文件"
    ALIAS_CONFLICT = "曲名别名有冲突"


FILE_HASH_CHUNK = 8192


def compute_file_hash(filepath: str) -> str:
    h = hashlib.sha256()
    try:
        with open(filepath, "rb") as f:
            while True:
                chunk = f.read(FILE_HASH_CHUNK)
                if not chunk:
                    break
                h.update(chunk)
    except FileNotFoundError:
        h.update(filepath.encode("utf-8"))
    return h.hexdigest()


def compute_content_hash(content: str) -> str:
    return hashlib.sha256(content.strip().encode("utf-8")).hexdigest()


@dataclass
class TrackItem:
    track_no: int
    title: str
    aliases: List[str] = field(default_factory=list)
    duration: Optional[str] = None
    iswc: Optional[str] = None

    def all_names(self) -> List[str]:
        names = [self.title] + self.aliases
        return [n.strip() for n in names if n and n.strip()]


@dataclass
class ContractScan:
    contract_id: str
    file_path: str
    file_hash: str
    submitted_at: str
    tracks: List[TrackItem] = field(default_factory=list)
    raw_text: str = ""

    def content_key(self) -> str:
        return compute_content_hash(
            self.contract_id + "|" + self.file_hash + "|" + self.raw_text
        )


@dataclass
class AudioFile:
    file_path: str
    file_name: str
    file_hash: str
    submitted_at: str
    parsed_track_no: Optional[int] = None
    parsed_title: Optional[str] = None


@dataclass
class Issue:
    issue_type: IssueType
    description: str
    human_reason: str
    severity: str = "warning"
    related_track_no: Optional[int] = None
    resolution_hint: str = ""


@dataclass
class StatusChange:
    changed_at: str
    old_status: Optional[ReviewStatus]
    new_status: ReviewStatus
    trigger: str
    changed_issues: List[str] = field(default_factory=list)


@dataclass
class RemarkEntry:
    remark_id: str
    author: str
    content: str
    added_at: str
    judgment_deltas: List[str] = field(default_factory=list)


@dataclass
class ReviewSubmission:
    submission_id: str
    package_name: str
    created_at: str
    contract_scans: List[ContractScan] = field(default_factory=list)
    audio_files: List[AudioFile] = field(default_factory=list)
    contract_content_keys: List[str] = field(default_factory=list)
    audio_file_hashes: List[str] = field(default_factory=list)
    reference_tracklist: List[TrackItem] = field(default_factory=list)


@dataclass
class ReviewRecord:
    record_id: str
    package_name: str
    created_at: str
    updated_at: str
    status: ReviewStatus
    contract_scans: List[ContractScan] = field(default_factory=list)
    audio_files: List[AudioFile] = field(default_factory=list)
    reference_tracklist: List[TrackItem] = field(default_factory=list)
    issues: List[Issue] = field(default_factory=list)
    remarks: List[RemarkEntry] = field(default_factory=list)
    status_history: List[StatusChange] = field(default_factory=list)
    contract_content_keys: List[str] = field(default_factory=list)
    audio_file_hashes: List[str] = field(default_factory=list)
    submission_count: int = 1

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["status"] = self.status.value
        for idx, iss in enumerate(self.issues):
            d["issues"][idx]["issue_type"] = iss.issue_type.value
        for idx, h in enumerate(self.status_history):
            if h.old_status is not None:
                d["status_history"][idx]["old_status"] = h.old_status.value
            d["status_history"][idx]["new_status"] = h.new_status.value
        return d

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "ReviewRecord":
        d = dict(d)
        d["status"] = ReviewStatus(d["status"])

        ref_tracks = []
        for t in d.get("reference_tracklist", []) or []:
            ref_tracks.append(TrackItem(**dict(t)))
        d["reference_tracklist"] = ref_tracks

        contracts = []
        for c in d.get("contract_scans", []) or []:
            c = dict(c)
            c_tracks = []
            for t in c.get("tracks", []) or []:
                c_tracks.append(TrackItem(**dict(t)))
            c["tracks"] = c_tracks
            contracts.append(ContractScan(**c))
        d["contract_scans"] = contracts

        audios = []
        for a in d.get("audio_files", []) or []:
            audios.append(AudioFile(**dict(a)))
        d["audio_files"] = audios

        issues = []
        for i in d.get("issues", []) or []:
            i = dict(i)
            i["issue_type"] = IssueType(i["issue_type"])
            issues.append(Issue(**i))
        d["issues"] = issues

        remarks = []
        for r in d.get("remarks", []) or []:
            remarks.append(RemarkEntry(**dict(r)))
        d["remarks"] = remarks

        history = []
        for h in d.get("status_history", []) or []:
            h = dict(h)
            if h.get("old_status") is not None:
                h["old_status"] = ReviewStatus(h["old_status"])
            h["new_status"] = ReviewStatus(h["new_status"])
            history.append(StatusChange(**h))
        d["status_history"] = history

        return cls(**d)
