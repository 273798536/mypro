"""合唱声部排期冲突检测工具。

提供音频版本管理、排期冲突检测、备注系统、交付清单等功能。
"""

from .models import (
    AudioFile,
    Conflict,
    Note,
    DeliveryManifest,
    AppState,
)
from .audio_scanner import (
    scan_audio_folder,
    mark_latest_versions,
    group_by_part,
    find_file_by_path,
)
from .conflict_detector import (
    ConflictDetector,
    resolve_conflict,
    DEFAULT_HALF_BEAT_SECONDS,
)
from .note_manager import (
    NoteManager,
    format_note_summary,
)
from .state_manager import (
    StateManager,
    DEFAULT_STATE_FILENAME,
)

__all__ = [
    "AudioFile",
    "Conflict",
    "Note",
    "DeliveryManifest",
    "AppState",
    "scan_audio_folder",
    "mark_latest_versions",
    "group_by_part",
    "find_file_by_path",
    "ConflictDetector",
    "resolve_conflict",
    "DEFAULT_HALF_BEAT_SECONDS",
    "NoteManager",
    "format_note_summary",
    "StateManager",
    "DEFAULT_STATE_FILENAME",
]
