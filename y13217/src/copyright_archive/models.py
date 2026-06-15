"""数据模型定义"""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any


class JudgmentStatus(str, Enum):
    """判断状态"""
    PENDING = "待确认"
    MATCHED = "已匹配"
    MISMATCHED = "不匹配"
    OVERRIDDEN = "已覆盖"
    CONFIRMED = "已确认"


class NoteType(str, Enum):
    """备注类型"""
    SUPPLEMENTARY = "后补备注"
    VERBAL = "口头备注"
    OPERATION = "运营备注"
    MANUAL = "人工批注"


class Actor(str, Enum):
    """操作人角色"""
    LIN_JIE = "林姐（音乐老师）"
    OPERATION_MANAGER = "运营主管"
    SYSTEM = "系统"
    MANUAL = "人工审核"


class MismatchReason(str, Enum):
    """不匹配原因"""
    NAME_DIFFERENCE = "曲目名称不一致"
    ARTIST_DIFFERENCE = "演唱者不一致"
    VERSION_DIFFERENCE = "版本不同（旧版/新版）"
    EXTRA_SUFFIX = "文件名有额外后缀"
    MISSING_ID = "缺少曲目ID"
    UNKNOWN = "原因不明"


@dataclass
class RepertoireItem:
    """曲目表条目"""
    track_id: str
    track_name: str
    artist: str
    copyright_owner: str
    authorization_type: str
    version: str = "正式版"
    is_active: bool = True


@dataclass
class CopyrightFile:
    """版权授权文件"""
    filename: str
    file_path: str
    track_name_from_file: str
    artist_from_file: str
    track_id_from_file: Optional[str] = None
    version_from_file: str = "未知"


@dataclass
class Note:
    """备注"""
    note_id: str
    note_type: NoteType
    content: str
    actor: Actor
    timestamp: datetime
    target_track_id: Optional[str] = None
    target_filename: Optional[str] = None


@dataclass
class MatchResult:
    """匹配结果"""
    filename: str
    track_id: Optional[str]
    status: JudgmentStatus
    mismatch_reason: Optional[MismatchReason] = None
    mismatch_details: str = ""
    match_score: float = 0.0
    matched_track_name: Optional[str] = None
    matched_artist: Optional[str] = None
    matched_version: Optional[str] = None


@dataclass
class JudgmentCard:
    """判断卡 - 记录每一次判断及其变更"""
    card_id: str
    filename: str
    track_id: str
    initial_judgment: JudgmentStatus
    initial_reason: str
    current_judgment: JudgmentStatus
    current_reason: str
    actor: Actor
    judgment_time: datetime
    is_overridden: bool = False
    overridden_by: Optional[Actor] = None
    override_time: Optional[datetime] = None
    override_reason: str = ""
    needs_manual_confirm: bool = False
    confirm_reason: str = ""


@dataclass
class HistoryEntry:
    """历史记录条目"""
    entry_id: str
    timestamp: datetime
    actor: Actor
    action: str
    details: Dict[str, Any]
    target_filename: Optional[str] = None
    target_track_id: Optional[str] = None


@dataclass
class ProcessingContext:
    """处理上下文 - 贯穿整个处理链的数据容器"""
    repertoire: List[RepertoireItem] = field(default_factory=list)
    copyright_files: List[CopyrightFile] = field(default_factory=list)
    notes: List[Note] = field(default_factory=list)
    match_results: List[MatchResult] = field(default_factory=list)
    judgment_cards: List[JudgmentCard] = field(default_factory=list)
    history: List[HistoryEntry] = field(default_factory=list)
    pending_confirmations: List[JudgmentCard] = field(default_factory=list)
