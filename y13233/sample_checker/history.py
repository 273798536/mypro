from __future__ import annotations

import copy
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

from .models import (
    SamplePackage,
    Note,
    NoteType,
    DetectionRecord,
    CheckStatus,
    VersionedState,
)


@dataclass
class HistoryChange:
    version: int
    changed_by: str
    changed_reason: str
    changed_at: str
    diff: Dict[str, Any] = field(default_factory=dict)
    snapshot_before: Dict[str, Any] = field(default_factory=dict)
    snapshot_after: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "changed_by": self.changed_by,
            "changed_reason": self.changed_reason,
            "changed_at": self.changed_at,
            "diff": self.diff,
            "snapshot_before_summary": self._summarize(self.snapshot_before),
            "snapshot_after_summary": self._summarize(self.snapshot_after),
        }

    @staticmethod
    def _summarize(snap: Dict[str, Any]) -> Dict[str, Any]:
        out: Dict[str, Any] = {}
        if "notes" in snap:
            out["note_count"] = len(snap["notes"])
            out["notes"] = [
                {
                    "note_id": n.get("note_id"),
                    "note_type": n.get("note_type"),
                    "author": n.get("author"),
                    "content_preview": (n.get("content") or "")[:40],
                }
                for n in snap["notes"]
            ]
        if "manual_annotations" in snap:
            out["manual_annotations"] = snap["manual_annotations"]
        if "results" in snap:
            out["result_summary"] = HistoryChange._summary_results(snap["results"])
        return out

    @staticmethod
    def _summary_results(results: List[Dict[str, Any]]) -> Dict[str, int]:
        c: Dict[str, int] = {}
        for r in results:
            st = r.get("status", "unknown")
            c[st] = c.get(st, 0) + 1
        return c


@dataclass
class HistoryTracker:
    _package_history: Dict[str, List[VersionedState]] = field(default_factory=dict)
    _scan_records: Dict[str, List[DetectionRecord]] = field(default_factory=dict)
    _changes: List[HistoryChange] = field(default_factory=list)
    _version_counter: Dict[str, int] = field(default_factory=dict)

    # ── 给采样包拍快照并记录变更 ─────────────────────────────
    def snapshot_package(
        self,
        pkg: SamplePackage,
        changed_by: str = "",
        changed_reason: str = "",
    ) -> VersionedState:
        key = pkg.package_id
        self._version_counter[key] = self._version_counter.get(key, 0) + 1
        ver = self._version_counter[key]

        snap = pkg.to_dict()
        prev_snap = (
            self._package_history[key][-1].snapshot
            if self._package_history.get(key)
            else {}
        )

        vs = VersionedState(
            version=ver,
            snapshot=snap,
            changed_by=changed_by,
            changed_reason=changed_reason,
        )
        self._package_history.setdefault(key, []).append(vs)

        diff = self._diff_snapshots(prev_snap, snap)
        if diff or ver == 1:
            change = HistoryChange(
                version=ver,
                changed_by=changed_by,
                changed_reason=changed_reason,
                changed_at=vs.changed_at,
                diff=diff,
                snapshot_before=prev_snap,
                snapshot_after=snap,
            )
            self._changes.append(change)

        return vs

    # ── 记录一次扫描（用于交接班，下次能看到完整轨迹） ──────
    def record_scan(self, pkg: SamplePackage, record: DetectionRecord) -> None:
        self._scan_records.setdefault(pkg.package_id, []).append(record)

    # ── 取某个包所有扫描记录 ─────────────────────────────────
    def get_scan_history(
        self, pkg: SamplePackage
    ) -> List[DetectionRecord]:
        return list(self._scan_records.get(pkg.package_id, []))

    def get_last_scan(
        self, pkg: SamplePackage
    ) -> Optional[DetectionRecord]:
        hist = self._scan_records.get(pkg.package_id, [])
        return hist[-1] if hist else None

    # ── 取变更日志：林姐改了啥、什么时候改的 ────────────────
    def get_change_log(
        self, pkg: Optional[SamplePackage] = None, author: Optional[str] = None
    ) -> List[HistoryChange]:
        out = list(self._changes)
        if author:
            out = [c for c in out if c.changed_by == author]
        return out

    def format_change_log(
        self, pkg: Optional[SamplePackage] = None, author: Optional[str] = None
    ) -> str:
        changes = self.get_change_log(pkg, author)
        if not changes:
            return "（无历史变更）"
        lines = []
        for c in changes:
            actor = c.changed_by or "未知"
            reason = c.changed_reason or "（未填写）"
            lines.append(
                f"[版本={c.version} | {c.changed_at}] {actor}：{reason}"
            )
            if c.diff:
                for k, v in c.diff.items():
                    lines.append(f"  - {k}: {v}")
            before_sum = c._summarize(c.snapshot_before)
            after_sum = c._summarize(c.snapshot_after)
            lines.append(
                f"  扫描结果变化前: {before_sum.get('result_summary', {})}"
            )
            lines.append(
                f"  扫描结果变化后: {after_sum.get('result_summary', {})}"
            )
        return "\n".join(lines)

    # ── 给下一班看的交接班摘要 ────────────────────────────────
    def handoff_summary(self, pkg: SamplePackage, latest_record: DetectionRecord) -> str:
        lines = ["=== 采样包素材异常提醒 · 交接班摘要 ==="]
        lines.append(f"包名：{pkg.name}  版本：{pkg.version}  ID：{pkg.package_id}")
        lines.append(f"最新扫描：{latest_record.scanned_at}  操作人：{latest_record.operator or '（未填写）'}")

        # 挂起项突出
        hangs = [r for r in latest_record.results if r.status == CheckStatus.HANG]
        if hangs:
            lines.append("")
            lines.append(f"【需要运营主管确认的挂起项 · 共 {len(hangs)} 条】")
            for h in hangs:
                lines.append(f"  - HANG  {h.title}")
                lines.append(f"      {h.detail[:120]}")

        # 林姐/老师改过的
        teacher_edits = [
            n for n in pkg.notes if n.note_type == NoteType.TEACHER_EDIT
        ]
        if teacher_edits:
            lines.append("")
            lines.append(f"【音乐老师（林姐等）最近临时改动 · 共 {len(teacher_edits)} 条】")
            for n in teacher_edits:
                lines.append(f"  - [{n.created_at}] {n.author}：{n.content}")
                if n.affects_fields:
                    lines.append(f"      影响判断字段：{', '.join(n.affects_fields)}")

        # 变更历史
        log = self.format_change_log(pkg)
        if log != "（无历史变更）":
            lines.append("")
            lines.append("【完整变更轨迹（下一班必须看）】")
            lines.append(log)

        # 交叉验证
        lines.append("")
        cv = "✅ 通过" if latest_record.cross_validation_ok else "⚠️ 存在问题"
        lines.append(f"交叉对齐（旧版本↔批注↔清单）：{cv}")
        for iss in latest_record.cross_validation_issues:
            lines.append(f"  - {iss}")

        return "\n".join(lines)

    # ── 内部：比较两个快照的差异 ──────────────────────────────
    @staticmethod
    def _diff_snapshots(
        before: Dict[str, Any], after: Dict[str, Any]
    ) -> Dict[str, Any]:
        diff: Dict[str, Any] = {}
        if not before:
            diff["event"] = "初始版本，已建基线"
            return diff

        # 备注变化
        before_notes = {
            n.get("signature"): n for n in before.get("notes", [])
        }
        after_notes = {
            n.get("signature"): n for n in after.get("notes", [])
        }
        added = [s for s in after_notes if s not in before_notes]
        removed = [s for s in before_notes if s not in after_notes]
        if added:
            diff["notes_added"] = [
                f"{after_notes[s].get('note_type')}:"
                f"{after_notes[s].get('author')}:"
                f"{(after_notes[s].get('content') or '')[:30]}"
                for s in added
            ]
        if removed:
            diff["notes_removed_count"] = len(removed)

        # 版本变化
        if before.get("version") != after.get("version"):
            diff["package_version"] = (
                f"{before.get('version')} → {after.get('version')}"
            )

        # 人工批注变化
        b_ann = set(before.get("manual_annotations", []))
        a_ann = set(after.get("manual_annotations", []))
        if b_ann ^ a_ann:
            diff["manual_annotations_added"] = sorted(a_ann - b_ann)
            diff["manual_annotations_removed"] = sorted(b_ann - a_ann)

        return diff
