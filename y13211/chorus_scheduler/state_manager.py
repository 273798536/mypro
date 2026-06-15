"""状态管理与交付清单。

核心协调层，负责：
- 整合音频扫描、冲突检测、备注管理
- 状态持久化（JSON 文件），保证重启重跑后状态一致
- 生成交付清单，版本间可追溯
- 旧版本、人工批注、交付清单三者彼此对应
"""

import os
import json
import shutil
from typing import List, Optional, Dict, Any
from datetime import datetime

from .models import (
    AppState,
    AudioFile,
    Conflict,
    Note,
    DeliveryManifest,
    _new_id,
    _now_iso,
)
from .audio_scanner import (
    scan_audio_folder,
    mark_latest_versions,
    find_file_by_path,
)
from .conflict_detector import ConflictDetector
from .note_manager import NoteManager


DEFAULT_STATE_FILENAME = ".chorus_scheduler_state.json"


class StateManager:
    """状态管理器。

    对外暴露的核心接口，所有操作都通过它进行，
    确保状态一致性。
    """

    def __init__(self, work_dir: str, state_filename: str = DEFAULT_STATE_FILENAME):
        """
        Args:
            work_dir: 工作目录（通常是音频文件夹或其上一级）
            state_filename: 状态文件名
        """
        self.work_dir = work_dir
        self.state_path = os.path.join(work_dir, state_filename)
        self.state = AppState()
        self.note_manager = NoteManager()
        self.conflict_detector = ConflictDetector()

    def load(self) -> bool:
        """从磁盘加载状态。

        Returns:
            True 表示加载成功，False 表示没有找到状态文件
        """
        if not os.path.exists(self.state_path):
            return False

        try:
            with open(self.state_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.state = AppState.from_dict(data)
            self.note_manager = NoteManager()
            for nid, note in self.state.notes.items():
                self.note_manager._notes[nid] = note
            return True
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            print(f"[警告] 状态文件损坏，将重新初始化: {e}")
            self.state = AppState()
            self.note_manager = NoteManager()
            return False

    def save(self) -> None:
        """保存状态到磁盘。"""
        self.state.notes = self.note_manager.all_notes()

        os.makedirs(self.work_dir, exist_ok=True)
        tmp_path = self.state_path + ".tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(self.state.to_dict(), f, ensure_ascii=False, indent=2)
        shutil.move(tmp_path, self.state_path)

    def scan(self, audio_folder: str) -> Dict[str, Any]:
        """执行一次完整扫描。

        流程：
        1. 扫描音频文件夹
        2. 标记最新版本
        3. 检测冲突
        4. 合并到现有状态（保留历史备注）
        5. 生成交付清单
        6. 保存状态

        Args:
            audio_folder: 音频文件夹路径

        Returns:
            扫描结果摘要字典
        """
        if not os.path.isabs(audio_folder):
            audio_folder = os.path.abspath(audio_folder)

        self.state.audio_folder = audio_folder

        new_files = scan_audio_folder(audio_folder)

        existing_by_path = {af.file_path: af for af in self.state.audio_files.values()}

        merged_files: Dict[str, AudioFile] = {}
        added_count = 0
        updated_count = 0
        unchanged_count = 0

        for new_af in new_files:
            old_af = existing_by_path.get(new_af.file_path)
            if old_af:
                new_af.file_id = old_af.file_id
                new_af.scan_first_seen_at = old_af.scan_first_seen_at
                new_af.is_latest = old_af.is_latest
                if old_af.modified_at != new_af.modified_at:
                    updated_count += 1
                else:
                    unchanged_count += 1
            else:
                added_count += 1

            merged_files[new_af.file_id] = new_af

        self.state.audio_files = merged_files
        mark_latest_versions(list(merged_files.values()))

        conflicts = self.conflict_detector.detect_all(list(merged_files.values()))
        old_conflict_ids = set(self.state.conflicts.keys())

        new_conflicts_map: Dict[str, Conflict] = {}
        for c in conflicts:
            key = self._conflict_signature(c)
            old = None
            for oc in self.state.conflicts.values():
                if self._conflict_signature(oc) == key:
                    old = oc
                    break
            if old:
                c.conflict_id = old.conflict_id
                c.detected_at = old.detected_at
                c.resolved = old.resolved
                c.resolved_at = old.resolved_at
            new_conflicts_map[c.conflict_id] = c

        self.state.conflicts = new_conflicts_map

        scan_time = _now_iso()
        self.state.last_scan_at = scan_time
        if scan_time not in self.state.scan_history:
            self.state.scan_history.append(scan_time)

        manifest = self._generate_manifest()
        self.state.manifests[manifest.manifest_id] = manifest

        self.save()

        unresolved = [c for c in conflicts if not c.resolved]
        return {
            "scan_time": scan_time,
            "audio_folder": audio_folder,
            "total_files": len(new_files),
            "files_added": added_count,
            "files_updated": updated_count,
            "files_unchanged": unchanged_count,
            "latest_count": sum(1 for f in merged_files.values() if f.is_latest),
            "total_conflicts": len(conflicts),
            "unresolved_conflicts": len(unresolved),
            "conflicts_by_severity": self._count_by_severity(conflicts),
            "manifest_id": manifest.manifest_id,
        }

    def _conflict_signature(self, c: Conflict) -> str:
        """生成冲突的签名，用于跨次扫描识别同一冲突。"""
        sorted_ids = sorted(c.involved_file_ids)
        return f"{c.conflict_type}:{','.join(sorted_ids)}"

    def _count_by_severity(self, conflicts: List[Conflict]) -> Dict[str, int]:
        counts: Dict[str, int] = {"error": 0, "warning": 0, "info": 0}
        for c in conflicts:
            counts[c.severity] = counts.get(c.severity, 0) + 1
        return counts

    def _generate_manifest(self) -> DeliveryManifest:
        """生成当前状态的交付清单。"""
        audio_files = list(self.state.audio_files.values())
        conflicts = list(self.state.conflicts.values())
        notes = list(self.state.notes.values()) if isinstance(self.state.notes, dict) else []
        if isinstance(self.state.notes, dict):
            notes = list(self.state.notes.values())

        latest_files = [f for f in audio_files if f.is_latest]
        unresolved = [c for c in conflicts if not c.resolved]

        return DeliveryManifest(
            manifest_id=_new_id("mf"),
            generated_at=_now_iso(),
            audio_file_count=len(audio_files),
            latest_file_count=len(latest_files),
            conflict_count=len(conflicts),
            unresolved_conflict_count=len(unresolved),
            note_count=len(notes),
            audio_file_ids=[f.file_id for f in audio_files],
            conflict_ids=[c.conflict_id for c in conflicts],
            note_ids=[n.note_id for n in notes] if notes else [],
        )

    def add_supplementary_note(
        self,
        content: str,
        author: str = "anonymous",
        target_type: str = "global",
        target_id: str = "global",
    ) -> Note:
        """添加一条后补备注，并保存状态。

        参数名保持稳定，供日常脚本调用。
        """
        note = self.note_manager.add_supplementary_note(
            content=content,
            author=author,
            target_type=target_type,
            target_id=target_id,
        )
        self.save()
        return note

    def add_manual_annotation(
        self,
        content: str,
        author: str,
        target_type: str,
        target_id: str,
    ) -> Note:
        """添加一条人工批注。"""
        note = self.note_manager.add_manual_annotation(
            content=content,
            author=author,
            target_type=target_type,
            target_id=target_id,
        )
        self.save()
        return note

    def list_notes(
        self,
        note_type: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
    ) -> List[Note]:
        """查询备注。"""
        return self.note_manager.list_notes(
            note_type=note_type,
            target_type=target_type,
            target_id=target_id,
        )

    def get_audio_files(self, only_latest: bool = False) -> List[AudioFile]:
        """获取音频文件列表。"""
        files = list(self.state.audio_files.values())
        if only_latest:
            files = [f for f in files if f.is_latest]
        return files

    def get_conflicts(self, only_unresolved: bool = False) -> List[Conflict]:
        """获取冲突列表。"""
        conflicts = list(self.state.conflicts.values())
        if only_unresolved:
            conflicts = [c for c in conflicts if not c.resolved]
        return conflicts

    def get_manifests(self) -> List[DeliveryManifest]:
        """获取所有交付清单，按时间倒序。"""
        manifests = list(self.state.manifests.values())
        manifests.sort(key=lambda m: m.generated_at, reverse=True)
        return manifests

    def get_latest_manifest(self) -> Optional[DeliveryManifest]:
        """获取最新的交付清单。"""
        manifests = self.get_manifests()
        return manifests[0] if manifests else None

    def find_audio_file(self, file_path: Optional[str] = None, file_id: Optional[str] = None) -> Optional[AudioFile]:
        """根据路径或 ID 查找音频文件。"""
        if file_id and file_id in self.state.audio_files:
            return self.state.audio_files[file_id]
        if file_path:
            for af in self.state.audio_files.values():
                if af.file_path == file_path:
                    return af
        return None

    def resolve_conflict(self, conflict_id: str) -> Optional[Conflict]:
        """标记冲突为已解决。"""
        conflict = self.state.conflicts.get(conflict_id)
        if not conflict:
            return None
        conflict.resolved = True
        conflict.resolved_at = _now_iso()
        self.save()
        return conflict

    def get_status_summary(self) -> Dict[str, Any]:
        """获取当前状态摘要，用于接口返回。

        保证：历史备注、当前状态、接口返回三者一致。
        """
        files = list(self.state.audio_files.values())
        conflicts = list(self.state.conflicts.values())
        notes = self.note_manager.list_notes()
        manifests = self.get_manifests()
        latest_manifest = manifests[0] if manifests else None

        return {
            "audio_folder": self.state.audio_folder,
            "last_scan_at": self.state.last_scan_at,
            "scan_count": len(self.state.scan_history),
            "audio_files": {
                "total": len(files),
                "latest": sum(1 for f in files if f.is_latest),
                "with_part": sum(1 for f in files if f.part_name),
                "with_time": sum(1 for f in files if f.start_time_seconds is not None),
            },
            "conflicts": {
                "total": len(conflicts),
                "unresolved": sum(1 for c in conflicts if not c.resolved),
                "by_severity": self._count_by_severity(conflicts),
                "by_type": self._count_by_type(conflicts),
            },
            "notes": {
                "total": len(notes),
                "by_type": self._count_notes_by_type(notes),
            },
            "manifests": {
                "total": len(manifests),
                "latest_id": latest_manifest.manifest_id if latest_manifest else None,
            },
        }

    def _count_by_type(self, conflicts: List[Conflict]) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for c in conflicts:
            counts[c.conflict_type] = counts.get(c.conflict_type, 0) + 1
        return counts

    def _count_notes_by_type(self, notes: List[Note]) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for n in notes:
            counts[n.note_type] = counts.get(n.note_type, 0) + 1
        return counts

    def compare_manifests(self, manifest_id_1: str, manifest_id_2: str) -> Dict[str, Any]:
        """比较两份交付清单的差异。

        用于验证：旧版本、人工批注、交付清单彼此对上。
        """
        m1 = self.state.manifests.get(manifest_id_1)
        m2 = self.state.manifests.get(manifest_id_2)
        if not m1 or not m2:
            raise ValueError("找不到指定的交付清单")

        set1_files = set(m1.audio_file_ids)
        set2_files = set(m2.audio_file_ids)
        set1_conflicts = set(m1.conflict_ids)
        set2_conflicts = set(m2.conflict_ids)
        set1_notes = set(m1.note_ids)
        set2_notes = set(m2.note_ids)

        return {
            "manifest_1": manifest_id_1,
            "manifest_2": manifest_id_2,
            "files": {
                "added": list(set2_files - set1_files),
                "removed": list(set1_files - set2_files),
                "common": list(set1_files & set2_files),
            },
            "conflicts": {
                "added": list(set2_conflicts - set1_conflicts),
                "removed": list(set1_conflicts - set2_conflicts),
                "resolved_new": [
                    cid for cid in set1_conflicts & set2_conflicts
                    if self.state.conflicts.get(cid) and self.state.conflicts[cid].resolved
                ],
            },
            "notes": {
                "added": list(set2_notes - set1_notes),
                "removed": list(set1_notes - set2_notes),
                "common": list(set1_notes & set2_notes),
            },
        }
