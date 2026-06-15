"""状态持久化 —— 会话保存、重扫对齐"""
from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from .models import (
    ReviewSession,
    TrackRow,
    ManualAnnotation,
    ReviewStatus,
)
from .parser import parse_annotation_file


STATE_DIRNAME = ".podcast_review_state"


def state_dir_for(tracklist_path: str) -> Path:
    path = Path(tracklist_path).resolve()
    return path.parent / STATE_DIRNAME


def latest_session_path(tracklist_path: str) -> Optional[Path]:
    sd = state_dir_for(tracklist_path)
    if not sd.exists():
        return None
    sessions = sorted(sd.glob("session_*.json"))
    return sessions[-1] if sessions else None


def save_session(session: ReviewSession) -> Path:
    sd = state_dir_for(session.tracklist_path)
    sd.mkdir(parents=True, exist_ok=True)
    stamp = session.started_at.replace(":", "-").replace("T", "_")
    path = sd / f"session_{stamp}_{session.session_id[:8]}.json"
    path.write_text(
        json.dumps(session.to_dict(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    # 同时写入 latest 指针
    (sd / "LATEST").write_text(str(path), encoding="utf-8")
    return path


def load_latest_session(tracklist_path: str) -> Optional[ReviewSession]:
    latest = latest_session_path(tracklist_path)
    if not latest:
        return None
    data = json.loads(latest.read_text(encoding="utf-8"))
    return ReviewSession.from_dict(data)


def new_session(tracklist_path: str,
                delivery_list_path: Optional[str] = None,
                annotation_path: Optional[str] = None) -> ReviewSession:
    return ReviewSession(
        session_id=uuid.uuid4().hex,
        started_at=datetime.now().isoformat(timespec="seconds"),
        tracklist_path=str(Path(tracklist_path).resolve()),
        delivery_list_path=str(Path(delivery_list_path).resolve()) if delivery_list_path else None,
        annotation_path=str(Path(annotation_path).resolve()) if annotation_path else None,
    )


def align_with_previous_session(
    fresh_tracks: list[TrackRow],
    previous: Optional[ReviewSession],
) -> None:
    """
    将上次的状态对齐到新解析的曲目行上。
    对齐顺序：row_hash -> (source, row_number)
    """
    if not previous:
        return
    by_hash = {t.row_hash: t for t in previous.tracks}
    by_rowkey: dict[tuple, TrackRow] = {
        (t.source_file, t.row_number): t for t in previous.tracks
    }
    for t in fresh_tracks:
        prev = by_hash.get(t.row_hash)
        if prev is None:
            prev = by_rowkey.get((t.source_file, t.row_number))
        if prev is None:
            continue
        # 继承历史状态：人工批注优先保留
        if prev.manual_annotation:
            t.apply_manual_annotation(prev.manual_annotation)
        # 挂起状态也继承，等待人工补充信息后再重扫
        if prev.status == ReviewStatus.SUSPENDED and not t.manual_annotation:
            t.status = ReviewStatus.SUSPENDED
            t.issues.extend(prev.issues)
            t.version_evidence.extend(prev.version_evidence)
        # 若上次已人工确认 ok/reject 则沿用
        if prev.status in (ReviewStatus.MANUAL_OK, ReviewStatus.MANUAL_REJECT) and not t.manual_annotation:
            t.status = prev.status
            if prev.manual_annotation:
                t.apply_manual_annotation(prev.manual_annotation)


def apply_external_annotations(
    tracks: list[TrackRow],
    annotation_path: Optional[str],
) -> int:
    """应用外部批注文件，返回处理条数"""
    if not annotation_path:
        return 0
    annotations = parse_annotation_file(annotation_path)
    if not annotations:
        return 0
    applied = 0
    by_hash = {t.row_hash: t for t in tracks}
    for rh, obj in annotations.items():
        track = by_hash.get(rh)
        if track is None:
            continue
        status = str(obj.get("status", "")).lower()
        if status not in ("ok", "reject"):
            continue
        ann = ManualAnnotation(
            annotator=str(obj.get("annotator", "外部批注")),
            status=status,
            comment=str(obj.get("comment", "")),
            annotated_at=str(obj.get("annotated_at", datetime.now().isoformat(timespec="seconds"))),
        )
        track.apply_manual_annotation(ann)
        applied += 1
    return applied


def finalize_session(session: ReviewSession) -> None:
    session.ended_at = datetime.now().isoformat(timespec="seconds")
