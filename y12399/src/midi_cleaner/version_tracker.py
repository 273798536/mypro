"""版本混用检测模块"""

import os
import hashlib
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Tuple
from collections import defaultdict
from datetime import datetime

from .midi_parser import ParsedMidi, MidiMetadata


@dataclass
class VersionInfo:
    """版本信息"""
    file_hash: str
    file_name: str
    file_path: str
    source_version: str
    track_version: str
    created_at: str
    parsed_at: str
    file_size: int
    ticks_per_beat: int
    total_duration: float
    track_names: List[str]
    tags: Dict[str, str] = field(default_factory=dict)


@dataclass
class VersionConflict:
    """版本冲突"""
    conflict_id: str
    type: str
    severity: str
    description: str
    field_name: str
    source_values: Dict[str, str]
    affected_files: List[str]
    context: Dict = field(default_factory=dict)


@dataclass
class VersionMismatch:
    """版本不匹配"""
    anomaly_id: str
    type: str
    severity: str
    description: str
    expected_version: str
    actual_version: str
    file_name: str
    file_path: str
    file_hash: str
    context: Dict = field(default_factory=dict)


@dataclass
class VersionCheckResult:
    """版本检查结果"""
    all_versions: List[VersionInfo]
    conflicts: List[VersionConflict]
    mismatches: List[VersionMismatch]
    summary: Dict[str, any]


class VersionTracker:
    """版本追踪器"""

    def __init__(
        self,
        expected_source_version: Optional[str] = None,
        expected_track_version: Optional[str] = None,
        allow_multi_source: bool = False,
        allow_multi_track: bool = False
    ):
        self.expected_source_version = expected_source_version
        self.expected_track_version = expected_track_version
        self.allow_multi_source = allow_multi_source
        self.allow_multi_track = allow_multi_track
        self._version_history: Dict[str, List[VersionInfo]] = defaultdict(list)

    def register_midi(self, parsed_midi: ParsedMidi, tags: Optional[Dict[str, str]] = None) -> VersionInfo:
        """注册MIDI文件版本信息"""
        metadata = parsed_midi.metadata
        version_info = VersionInfo(
            file_hash=metadata.file_hash,
            file_name=metadata.file_name,
            file_path=metadata.file_path,
            source_version=metadata.source_version,
            track_version=metadata.track_version,
            created_at=metadata.created_at,
            parsed_at=metadata.parsed_at,
            file_size=metadata.file_size,
            ticks_per_beat=metadata.ticks_per_beat,
            total_duration=metadata.total_duration,
            track_names=metadata.track_names,
            tags=tags or {}
        )

        file_key = self._generate_file_key(metadata)
        self._version_history[file_key].append(version_info)

        return version_info

    def check_versions(
        self,
        parsed_midis: List[ParsedMidi],
        tags: Optional[Dict[int, Dict[str, str]]] = None
    ) -> VersionCheckResult:
        """检查一组MIDI文件的版本混用情况"""
        all_versions: List[VersionInfo] = []
        conflicts: List[VersionConflict] = []
        mismatches: List[VersionMismatch] = []
        conflict_id_counter = 0
        mismatch_id_counter = 0

        tags = tags or {}

        for idx, parsed_midi in enumerate(parsed_midis):
            file_tags = tags.get(idx, {})
            version_info = self.register_midi(parsed_midi, file_tags)
            all_versions.append(version_info)

            mismatch = self._check_expected_versions(version_info, mismatch_id_counter)
            if mismatch:
                mismatches.append(mismatch)
                mismatch_id_counter += 1

        source_versions = defaultdict(list)
        track_versions = defaultdict(list)
        ticks_per_beat_values = defaultdict(list)

        for version in all_versions:
            source_versions[version.source_version].append(version.file_name)
            track_versions[version.track_version].append(version.file_name)
            ticks_per_beat_values[version.ticks_per_beat].append(version.file_name)

        if not self.allow_multi_source and len(source_versions) > 1:
            conflicts.append(VersionConflict(
                conflict_id=f"VRS-{conflict_id_counter:06d}",
                type="mixed_source_versions",
                severity="high",
                description=f"检测到{len(source_versions)}个不同的来源版本混用",
                field_name="source_version",
                source_values=dict(source_versions),
                affected_files=[v.file_name for v in all_versions],
                context={
                    "expected": self.expected_source_version or "single_version",
                    "detected": list(source_versions.keys()),
                    "count_per_version": {k: len(v) for k, v in source_versions.items()}
                }
            ))
            conflict_id_counter += 1

        if not self.allow_multi_track and len(track_versions) > 1:
            conflicts.append(VersionConflict(
                conflict_id=f"VRS-{conflict_id_counter:06d}",
                type="mixed_track_versions",
                severity="high",
                description=f"检测到{len(track_versions)}个不同的轨道版本混用",
                field_name="track_version",
                source_values=dict(track_versions),
                affected_files=[v.file_name for v in all_versions],
                context={
                    "expected": self.expected_track_version or "single_version",
                    "detected": list(track_versions.keys()),
                    "count_per_version": {k: len(v) for k, v in track_versions.items()}
                }
            ))
            conflict_id_counter += 1

        if len(ticks_per_beat_values) > 1:
            conflicts.append(VersionConflict(
                conflict_id=f"VRS-{conflict_id_counter:06d}",
                type="mixed_ticks_per_beat",
                severity="medium",
                description=f"检测到{len(ticks_per_beat_values)}个不同的节拍分辨率混用",
                field_name="ticks_per_beat",
                source_values={str(k): v for k, v in ticks_per_beat_values.items()},
                affected_files=[v.file_name for v in all_versions],
                context={
                    "detected": [str(k) for k in ticks_per_beat_values.keys()],
                    "count_per_value": {str(k): len(v) for k, v in ticks_per_beat_values.items()}
                }
            ))
            conflict_id_counter += 1

        duration_conflicts = self._check_duration_consistency(all_versions, conflict_id_counter)
        conflicts.extend(duration_conflicts)
        conflict_id_counter += len(duration_conflicts)

        track_name_conflicts = self._check_track_name_consistency(all_versions, conflict_id_counter)
        conflicts.extend(track_name_conflicts)
        conflict_id_counter += len(track_name_conflicts)

        summary = self._generate_summary(all_versions, conflicts, mismatches)

        return VersionCheckResult(
            all_versions=all_versions,
            conflicts=conflicts,
            mismatches=mismatches,
            summary=summary
        )

    def _check_expected_versions(
        self,
        version_info: VersionInfo,
        start_id: int
    ) -> Optional[VersionMismatch]:
        """检查版本是否符合预期"""
        if (self.expected_source_version and
                version_info.source_version != self.expected_source_version):
            return VersionMismatch(
                anomaly_id=f"VRM-{start_id:06d}",
                type="source_version_mismatch",
                severity="high",
                description=f"来源版本不匹配：期望{self.expected_source_version}，实际{version_info.source_version}",
                expected_version=self.expected_source_version,
                actual_version=version_info.source_version,
                file_name=version_info.file_name,
                file_path=version_info.file_path,
                file_hash=version_info.file_hash,
                context={
                    "field": "source_version",
                    "file_size": version_info.file_size
                }
            )

        if (self.expected_track_version and
                version_info.track_version != self.expected_track_version):
            return VersionMismatch(
                anomaly_id=f"VRM-{start_id:06d}",
                type="track_version_mismatch",
                severity="high",
                description=f"轨道版本不匹配：期望{self.expected_track_version}，实际{version_info.track_version}",
                expected_version=self.expected_track_version,
                actual_version=version_info.track_version,
                file_name=version_info.file_name,
                file_path=version_info.file_path,
                file_hash=version_info.file_hash,
                context={
                    "field": "track_version",
                    "file_size": version_info.file_size
                }
            )

        return None

    def _check_duration_consistency(
        self,
        versions: List[VersionInfo],
        start_id: int
    ) -> List[VersionConflict]:
        """检查时长一致性"""
        conflicts = []
        conflict_id = start_id

        if len(versions) < 2:
            return conflicts

        durations = [v.total_duration for v in versions]
        max_duration = max(durations)
        min_duration = min(durations)
        duration_diff = max_duration - min_duration

        if max_duration > 0 and (duration_diff / max_duration) > 0.1:
            duration_map = defaultdict(list)
            for v in versions:
                duration_map[f"{v.total_duration:.2f}s"].append(v.file_name)

            conflicts.append(VersionConflict(
                conflict_id=f"VRS-{conflict_id:06d}",
                type="inconsistent_duration",
                severity="medium",
                description=f"MIDI文件时长差异过大：{min_duration:.2f}s ~ {max_duration:.2f}s，相差{duration_diff:.2f}s",
                field_name="total_duration",
                source_values=dict(duration_map),
                affected_files=[v.file_name for v in versions],
                context={
                    "min_duration": round(min_duration, 2),
                    "max_duration": round(max_duration, 2),
                    "difference": round(duration_diff, 2),
                    "difference_percent": round((duration_diff / max_duration) * 100, 2)
                }
            ))
            conflict_id += 1

        return conflicts

    def _check_track_name_consistency(
        self,
        versions: List[VersionInfo],
        start_id: int
    ) -> List[VersionConflict]:
        """检查轨道名称一致性"""
        conflicts = []
        conflict_id = start_id

        if len(versions) < 2:
            return conflicts

        track_name_sets = [set(v.track_names) for v in versions]
        all_track_names = set().union(*track_name_sets)

        for track_name in all_track_names:
            present_in = [v.file_name for v in versions if track_name in v.track_names]
            missing_in = [v.file_name for v in versions if track_name not in v.track_names]

            if missing_in:
                conflicts.append(VersionConflict(
                    conflict_id=f"VRS-{conflict_id:06d}",
                    type="missing_track",
                    severity="low",
                    description=f"轨道[{track_name}]在部分文件中缺失",
                    field_name="track_names",
                    source_values={
                        "present_in": present_in,
                        "missing_in": missing_in
                    },
                    affected_files=missing_in,
                    context={
                        "track_name": track_name,
                        "present_count": len(present_in),
                        "missing_count": len(missing_in),
                        "total_files": len(versions)
                    }
                ))
                conflict_id += 1

        return conflicts

    def _generate_summary(
        self,
        versions: List[VersionInfo],
        conflicts: List[VersionConflict],
        mismatches: List[VersionMismatch]
    ) -> Dict[str, any]:
        """生成版本检查摘要"""
        source_versions = set(v.source_version for v in versions)
        track_versions = set(v.track_version for v in versions)

        severity_counts = defaultdict(int)
        for conflict in conflicts:
            severity_counts[conflict.severity] += 1
        for mismatch in mismatches:
            severity_counts[mismatch.severity] += 1

        return {
            "total_files": len(versions),
            "unique_source_versions": list(source_versions),
            "unique_track_versions": list(track_versions),
            "source_version_count": len(source_versions),
            "track_version_count": len(track_versions),
            "total_conflicts": len(conflicts),
            "total_mismatches": len(mismatches),
            "severity_distribution": dict(severity_counts),
            "has_version_mixing": len(source_versions) > 1 or len(track_versions) > 1,
            "check_timestamp": datetime.now().isoformat()
        }

    def _generate_file_key(self, metadata: MidiMetadata) -> str:
        """生成文件唯一键"""
        base_name = os.path.splitext(metadata.file_name)[0]
        return f"{base_name}_{metadata.source_version}_{metadata.track_version}"

    def get_version_history(self, file_key: str) -> List[VersionInfo]:
        """获取文件的版本历史"""
        return self._version_history.get(file_key, [])

    def get_version_mismatches(self, result: VersionCheckResult) -> List[VersionMismatch]:
        """获取版本不匹配异常（单独列出）"""
        return result.mismatches

    def get_version_conflicts(self, result: VersionCheckResult) -> List[VersionConflict]:
        """获取版本冲突（单独列出）"""
        return result.conflicts

    def to_dict(self, result: VersionCheckResult) -> Dict:
        """转换为字典格式"""
        return {
            "all_versions": [asdict(v) for v in result.all_versions],
            "conflicts": [asdict(c) for c in result.conflicts],
            "mismatches": [asdict(m) for m in result.mismatches],
            "summary": result.summary
        }
