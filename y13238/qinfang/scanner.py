import os
import re
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Set, Union, Tuple
from . import (
    Material, ExceptionItem, ScanRecord, Note,
    ExceptionType, ExceptionStatus, MaterialStatus,
)
from .state_manager import StateManager


NAMING_PATTERN = re.compile(
    r"^(?P<name>[^_]+)_(?P<version>v\d+)(?:_(?P<suffix>\w+))?\.(?P<ext>mp3|wav|flac|aac|m4a|ogg)$",
    re.IGNORECASE,
)

ALIAS_DELIMITER = "|"

KNOWN_EXTENSIONS = {".mp3", ".wav", ".flac", ".aac", ".m4a", ".ogg"}


def _canonicalize_name(raw_name: str) -> str:
    return raw_name.strip().lower().replace(" ", "_")


def _parse_filename(filename: str) -> Optional[dict]:
    m = NAMING_PATTERN.match(filename)
    if m:
        return {
            "canonical_name": _canonicalize_name(m.group("name")),
            "version": m.group("version"),
            "suffix": m.group("suffix") or "",
            "ext": m.group("ext"),
        }
    return None


class Scanner:
    def __init__(self, state_manager: StateManager):
        self.sm = state_manager

    def scan(self, audio_dir: Union[str, Path]) -> ScanRecord:
        audio_dir = Path(audio_dir)
        if not audio_dir.exists():
            raise FileNotFoundError(f"音频文件夹不存在: {audio_dir}")

        state = self.sm.load()

        existing_map = {}
        for mat in state.materials:
            existing_map[mat.filename] = mat

        files_scanned = 0
        materials_added = 0
        new_exceptions: List[ExceptionItem] = []

        for entry in sorted(audio_dir.iterdir()):
            if not entry.is_file():
                continue
            if entry.suffix.lower() not in KNOWN_EXTENSIONS:
                continue

            files_scanned += 1
            filename = entry.name

            if filename in existing_map:
                continue

            parsed = _parse_filename(filename)
            mat = Material(
                filename=filename,
                canonical_name=parsed["canonical_name"] if parsed else _canonicalize_name(entry.stem),
                version=int(parsed["version"][1:]) if parsed else 1,
                status=MaterialStatus.NORMAL.value,
            )

            if parsed is None:
                mat.status = MaterialStatus.ANOMALOUS.value
                new_exceptions.append(ExceptionItem(
                    material_id=mat.id,
                    material_filename=filename,
                    exception_type=ExceptionType.NAMING_INCONSISTENT.value,
                    reason=f"文件名「{filename}」不符合命名规范（应为：曲名_v版本号.扩展名），无法自动解析版本和曲名。",
                    next_step="请确认该文件对应的标准曲名和版本，人工补充后重扫。",
                ))
            else:
                alias_conflict = self._check_alias_conflict(mat, state.materials)
                if alias_conflict:
                    mat.status = MaterialStatus.ANOMALOUS.value
                    new_exceptions.append(alias_conflict)

                version_conflict = self._check_version_conflict(mat, state.materials)
                if version_conflict:
                    mat.status = MaterialStatus.ANOMALOUS.value
                    new_exceptions.append(version_conflict)

            state.materials.append(mat)
            materials_added += 1

        state.exception_queue.extend(new_exceptions)
        record = ScanRecord(
            files_scanned=files_scanned,
            exceptions_found=len(new_exceptions),
            materials_added=materials_added,
        )
        state.scan_history.append(record)
        state.last_scan_time = record.scan_time
        self.sm.state = state
        self.sm.save()
        return record

    def _check_alias_conflict(self, new_mat: Material, existing: List[Material]) -> Optional[ExceptionItem]:
        for mat in existing:
            if mat.id == new_mat.id:
                continue
            if new_mat.canonical_name == mat.canonical_name:
                continue
            if new_mat.canonical_name in mat.aliases or mat.canonical_name in new_mat.aliases:
                return ExceptionItem(
                    material_id=new_mat.id,
                    material_filename=new_mat.filename,
                    exception_type=ExceptionType.ALIAS_CONFLICT.value,
                    reason=f"曲名「{new_mat.canonical_name}」与已有材料「{mat.filename}」的别名冲突，可能是同一曲目不同叫法。",
                    next_step=f"请确认是否为同一曲目。如是，请将「{new_mat.canonical_name}」添加为「{mat.canonical_name}」的别名，然后重扫。",
                )
        return None

    def _check_version_conflict(self, new_mat: Material, existing: List[Material]) -> Optional[ExceptionItem]:
        for mat in existing:
            if mat.id == new_mat.id:
                continue
            if new_mat.canonical_name == mat.canonical_name and new_mat.version == mat.version:
                return ExceptionItem(
                    material_id=new_mat.id,
                    material_filename=new_mat.filename,
                    exception_type=ExceptionType.VERSION_MISMATCH.value,
                    reason=f"曲名「{new_mat.canonical_name}」已存在版本 v{new_mat.version}（文件：{mat.filename}），新旧版本并存，无法确定哪份最新。",
                    next_step=f"请确认最新版本并更新版本号，或将旧版本标记为已归档，然后重扫。",
                )
        return None

    def _build_active_alias_conflict_key(self, a_id: str, b_id: str) -> str:
        return "|".join(sorted([a_id, b_id]))

    def _find_alias_pair_from_exception(self, item: ExceptionItem, mats: List[Material]) -> Optional[str]:
        if item.exception_type != ExceptionType.ALIAS_CONFLICT.value:
            return None
        a_id = item.material_id
        a = next((m for m in mats if m.id == a_id), None)
        if a is None:
            return None
        b = None
        for m in mats:
            if m.id == a_id:
                continue
            if m.filename in item.reason or m.canonical_name in item.reason:
                b = m
                break
            if any(alias in item.reason for alias in m.aliases):
                b = m
                break
        if b is None:
            return None
        return self._build_active_alias_conflict_key(a_id, b.id)

    def _full_check_alias_conflicts(self) -> List[ExceptionItem]:
        state = self.sm.load()
        mats = state.materials
        if len(mats) < 2:
            return []

        seen_keys: Set[str] = set()
        for item in state.exception_queue:
            if item.exception_type != ExceptionType.ALIAS_CONFLICT.value:
                continue
            pair_key = self._find_alias_pair_from_exception(item, mats)
            if pair_key:
                seen_keys.add(pair_key)

        created: List[ExceptionItem] = []
        for i in range(len(mats)):
            a = mats[i]
            for j in range(i + 1, len(mats)):
                b = mats[j]
                if a.canonical_name == b.canonical_name:
                    continue
                key = self._build_active_alias_conflict_key(a.id, b.id)
                if key in seen_keys:
                    continue
                hit_a = a.canonical_name in b.aliases
                hit_b = b.canonical_name in a.aliases
                if not (hit_a or hit_b):
                    continue

                if hit_a:
                    target = a
                    other = b
                else:
                    target = b
                    other = a

                ex = ExceptionItem(
                    material_id=target.id,
                    material_filename=target.filename,
                    exception_type=ExceptionType.ALIAS_CONFLICT.value,
                    reason=f"曲名「{target.canonical_name}」与材料「{other.filename}」(标准名:{other.canonical_name})的别名冲突，可能是同一曲目不同叫法。",
                    next_step=f"请确认是否为同一曲目。如是，请将两者标准名合并或在别名列表中互相标注，然后重扫。",
                )
                state.exception_queue.append(ex)
                if target.status == MaterialStatus.NORMAL.value:
                    target.status = MaterialStatus.ANOMALOUS.value
                created.append(ex)
                seen_keys.add(key)

        self.sm.state = state
        self.sm.save()
        return created

    def rescan(self, audio_dir: Union[str, Path]) -> ScanRecord:
        state = self.sm.load()
        for item in state.exception_queue:
            if item.status == ExceptionStatus.PENDING.value:
                mat = next((m for m in state.materials if m.id == item.material_id), None)
                if mat and mat.status != MaterialStatus.ANOMALOUS.value:
                    item.status = ExceptionStatus.RESOLVED.value
                    item.resolved_at = datetime.now(timezone.utc).isoformat()
                    item.resolved_by = "system_rescan"

        self.sm.state = state
        self.sm.save()
        scan_record = self.scan(audio_dir)

        alias_created = self._full_check_alias_conflicts()
        if alias_created:
            scan_record.exceptions_found += len(alias_created)
            state = self.sm.load()
            if state.scan_history:
                state.scan_history[-1] = scan_record
            self.sm.state = state
            self.sm.save()

        return scan_record
