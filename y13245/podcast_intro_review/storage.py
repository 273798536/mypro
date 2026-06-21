"""状态持久化 —— 会话保存、重扫对齐、人工批注

核心对齐规则（三级索引，按优先级从高到低）：
  1. identity_hash  —— 稳定指纹（来源+行号+曲名+版本号），补备注后不变，最推荐用于人工批注
  2. raw_hash       —— 精确指纹（含整行原文），只有行完全没动过时才命中
  3. (source, row_number)  —— 行号兜底，应对极端情况
"""
from __future__ import annotations

import json
import uuid
from collections import defaultdict
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
    # 优先用 LATEST 指针（保证 save_session 刚写入的一定能读到，避免同秒保存时 glob 字典序错）
    latest_ptr = sd / "LATEST"
    if latest_ptr.exists():
        try:
            p = Path(latest_ptr.read_text(encoding="utf-8").strip())
            if p.exists():
                return p
        except Exception:
            pass
    # 兜底：按文件名排序取最后（老版本没有 LATEST 文件）
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


def _build_track_indexes(tracks: list[TrackRow]) -> tuple[dict, dict, dict]:
    """构建三级查找索引"""
    by_identity = {}
    by_raw = {}
    by_rowkey = {}
    for t in tracks:
        by_identity[t.identity_hash] = t
        by_raw[t.raw_hash] = t
        by_rowkey[(t.source_file, t.row_number)] = t
    return by_identity, by_raw, by_rowkey


def _lookup_track(
    by_identity: dict, by_raw: dict, by_rowkey: dict,
    *, identity_hash: Optional[str] = None,
    raw_hash: Optional[str] = None,
    row_hash: Optional[str] = None,
    source_file: Optional[str] = None,
    row_number: Optional[int] = None,
) -> Optional[TrackRow]:
    """三级回退查找。row_hash 视为 identity_hash 的别名（向后兼容）。"""
    id_key = identity_hash or row_hash
    if id_key and id_key in by_identity:
        return by_identity[id_key]
    if raw_hash and raw_hash in by_raw:
        return by_raw[raw_hash]
    # row_hash 也可能是旧版会话存的 raw_hash（老格式）——再扫一遍值对比
    if row_hash:
        for t in by_identity.values():
            if t.raw_hash == row_hash:
                return t
    if source_file is not None and row_number is not None:
        return by_rowkey.get((source_file, row_number))
    return None


def align_with_previous_session(
    fresh_tracks: list[TrackRow],
    previous: Optional[ReviewSession],
    *,
    override_annotation: bool = False,
) -> int:
    """
    将上次的状态对齐到新解析的曲目行上。

    参数:
        override_annotation: 本次是否允许历史批注覆盖当前已经有的批注
                             （默认 False，外部先应用的批注最优先）
    返回:
        被对齐（状态发生继承）的行数
    """
    if not previous:
        return 0
    # 新解析行的索引
    fi, fr, fk = _build_track_indexes(fresh_tracks)
    applied = 0
    for prev in previous.tracks:
        # 历史行 → 用它的 identity 优先找新行
        target = _lookup_track(
            fi, fr, fk,
            identity_hash=prev.identity_hash,
            raw_hash=prev.raw_hash,
            row_hash=prev.row_hash,  # 兼容旧会话
            source_file=prev.source_file,
            row_number=prev.row_number,
        )
        if target is None:
            continue

        changed = False

        # 规则一：人工批注优先保留（外部 > 历史）
        if prev.manual_annotation and (override_annotation or not target.manual_annotation):
            target.apply_manual_annotation(prev.manual_annotation)
            changed = True

        # 规则二：历史里的旧版母带挂起证据继承 —— 除非已经被人工裁定（ok/reject）
        if prev.status == ReviewStatus.SUSPENDED:
            if target.status not in (ReviewStatus.MANUAL_OK, ReviewStatus.MANUAL_REJECT):
                if not target.manual_annotation:
                    target.status = ReviewStatus.SUSPENDED
                    # 去重合并 issues
                    seen_msgs = {i.message for i in target.issues}
                    for iss in prev.issues:
                        if iss.message not in seen_msgs:
                            target.issues.append(iss)
                            seen_msgs.add(iss.message)
                    # 去重合并证据
                    seen_ev = set(target.version_evidence)
                    for ev in prev.version_evidence:
                        if ev not in seen_ev:
                            target.version_evidence.append(ev)
                            seen_ev.add(ev)
                    if prev.last_reviewed_at and not target.last_reviewed_at:
                        target.last_reviewed_at = prev.last_reviewed_at
                    changed = True

        # 规则三：历史里已人工 ok/reject 但 apply 没触发（比如已经有同等级别）的状态仍要同步
        if prev.status in (ReviewStatus.MANUAL_OK, ReviewStatus.MANUAL_REJECT):
            if target.status != prev.status and prev.manual_annotation:
                if override_annotation or not target.manual_annotation:
                    target.status = prev.status
                    changed = True

        # 规则四：若历史有授权信息且当前没有，继承（用户可能上一次扫后又改了别的列）
        if prev.authorization and not target.authorization:
            target.authorization = prev.authorization
            changed = True

        if changed:
            applied += 1
    return applied


def apply_external_annotations(
    tracks: list[TrackRow],
    annotation_path: Optional[str],
) -> tuple[int, int]:
    """
    应用外部批注文件。三级回退匹配。

    返回: (成功应用条数, 未匹配的批注条目数)
    """
    if not annotation_path:
        return 0, 0
    annotations = parse_annotation_file(annotation_path)
    if not annotations:
        return 0, 0
    by_id, by_raw, by_rk = _build_track_indexes(tracks)
    applied = 0
    unmatched = 0

    for key, obj in annotations.items():
        # 条目本身可能直接带 identity_hash / raw_hash / row_hash / row_number / source_file
        # 同时 key 本身也可能是 identity_hash 或 raw_hash（取决于 parse_annotation_file 如何存）
        identity_hash = obj.get("identity_hash") or obj.get("row_hash")
        raw_hash = obj.get("raw_hash")
        # 如果对象里没单独字段，就把 dict key 当成可能的 hash
        if not identity_hash and not raw_hash:
            # 尝试把 key 按 identity / raw 各试一遍
            identity_hash = key
            raw_hash = key
        row_number = obj.get("row_number")
        if isinstance(row_number, str):
            try:
                row_number = int(row_number)
            except ValueError:
                row_number = None
        source_file = obj.get("source_file")

        track = _lookup_track(
            by_id, by_raw, by_rk,
            identity_hash=identity_hash,
            raw_hash=raw_hash,
            source_file=source_file,
            row_number=row_number,
        )
        if track is None:
            unmatched += 1
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
        # 外部批注总是覆盖（本次传入最优先）
        track.apply_manual_annotation(ann)
        # 如果之前是 SUSPENDED（自动挂起），证据保留，状态由批注说了算
        applied += 1
    return applied, unmatched


def finalize_session(session: ReviewSession) -> None:
    session.ended_at = datetime.now().isoformat(timespec="seconds")
