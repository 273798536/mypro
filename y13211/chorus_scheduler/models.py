"""数据模型定义。

所有实体均使用 dataclass，便于序列化与反序列化，
保证重启、重跑后状态一致性。
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import uuid


def _now_iso() -> str:
    return datetime.now().isoformat()


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


@dataclass
class AudioFile:
    """单个音频文件记录。

    Attributes:
        file_id: 唯一标识
        file_path: 相对音频文件夹的路径
        file_name: 文件名
        part_name: 声部名称（如女高、男低），从文件名或元数据解析
        version_tag: 版本标签，如 "v1"、"v2-final"、"20250610_林姐批注版"
        is_latest: 是否当前判定为最新版本
        duration_seconds: 时长（秒）
        start_time_seconds: 排期开始时间（秒，相对于排练起始点）
        source: 版本信息来源（filename/metadata/manual）
        modified_at: 文件修改时间 ISO 字符串
        scan_first_seen_at: 首次被扫描到的时间
    """

    file_id: str
    file_path: str
    file_name: str
    part_name: Optional[str] = None
    version_tag: Optional[str] = None
    is_latest: bool = False
    duration_seconds: Optional[float] = None
    start_time_seconds: Optional[float] = None
    source: str = "filename"
    modified_at: Optional[str] = None
    scan_first_seen_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AudioFile":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class Conflict:
    """排期冲突记录。

    Attributes:
        conflict_id: 唯一标识
        conflict_type: 冲突类型（time_overlap / part_mismatch / version_ambiguous / half_beat_drift）
        severity: 严重程度 error / warning / info
        message: 人类可读的描述
        next_step: 人类可照着执行的下一步动作
        involved_file_ids: 涉及的音频文件 ID 列表
        time_range: 冲突的时间范围 [start, end] 秒
        drift_seconds: 时码偏移量（秒），仅 half_beat_drift 时有值
        detected_at: 检测时间
        resolved: 是否已解决
        resolved_at: 解决时间
    """

    conflict_id: str
    conflict_type: str
    severity: str
    message: str
    next_step: str
    involved_file_ids: List[str] = field(default_factory=list)
    time_range: Optional[List[float]] = None
    drift_seconds: Optional[float] = None
    detected_at: str = field(default_factory=_now_iso)
    resolved: bool = False
    resolved_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Conflict":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class Note:
    """备注/批注记录。

    Attributes:
        note_id: 唯一标识
        note_type: 备注类型（supplementary / manual_annotation / delivery / system）
        target_type: 备注对象类型（audio_file / conflict / global）
        target_id: 备注对象 ID
        content: 备注内容
        author: 作者
        created_at: 创建时间
        updated_at: 更新时间
    """

    note_id: str
    note_type: str
    target_type: str
    target_id: str
    content: str
    author: str = "system"
    created_at: str = field(default_factory=_now_iso)
    updated_at: str = field(default_factory=_now_iso)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Note":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class DeliveryManifest:
    """交付清单。

    每次扫描后生成一份，用于版本间比对和回溯。
    """

    manifest_id: str
    generated_at: str
    audio_file_count: int
    latest_file_count: int
    conflict_count: int
    unresolved_conflict_count: int
    note_count: int
    audio_file_ids: List[str] = field(default_factory=list)
    conflict_ids: List[str] = field(default_factory=list)
    note_ids: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "DeliveryManifest":
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class AppState:
    """应用整体状态，持久化到 JSON 文件。

    保证重启、重跑后历史备注、当前状态、接口返回三者一致。
    """

    state_version: int = 1
    audio_folder: Optional[str] = None
    last_scan_at: Optional[str] = None
    audio_files: Dict[str, AudioFile] = field(default_factory=dict)
    conflicts: Dict[str, Conflict] = field(default_factory=dict)
    notes: Dict[str, Note] = field(default_factory=dict)
    manifests: Dict[str, DeliveryManifest] = field(default_factory=dict)
    scan_history: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "state_version": self.state_version,
            "audio_folder": self.audio_folder,
            "last_scan_at": self.last_scan_at,
            "audio_files": {k: v.to_dict() for k, v in self.audio_files.items()},
            "conflicts": {k: v.to_dict() for k, v in self.conflicts.items()},
            "notes": {k: v.to_dict() for k, v in self.notes.items()},
            "manifests": {k: v.to_dict() for k, v in self.manifests.items()},
            "scan_history": self.scan_history,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AppState":
        state = cls(
            state_version=data.get("state_version", 1),
            audio_folder=data.get("audio_folder"),
            last_scan_at=data.get("last_scan_at"),
            scan_history=data.get("scan_history", []),
        )
        for fid, fdata in data.get("audio_files", {}).items():
            state.audio_files[fid] = AudioFile.from_dict(fdata)
        for cid, cdata in data.get("conflicts", {}).items():
            state.conflicts[cid] = Conflict.from_dict(cdata)
        for nid, ndata in data.get("notes", {}).items():
            state.notes[nid] = Note.from_dict(ndata)
        for mid, mdata in data.get("manifests", {}).items():
            state.manifests[mid] = DeliveryManifest.from_dict(mdata)
        return state
