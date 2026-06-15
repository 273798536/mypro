"""排期冲突检测核心逻辑。

检测合唱声部排期冲突，包括：
- 版本歧义：同一声部有多个版本且无法确定哪个最新
- 时间重叠：不同声部在时间上重叠
- 半拍偏移：时码差异在半拍范围内，需人工确认
- 声部缺失：缺少指定声部

所有冲突都附带人类可读的下一步处理建议。
"""

from typing import List, Dict, Optional
from dataclasses import dataclass

from .models import AudioFile, Conflict, _new_id


DEFAULT_HALF_BEAT_SECONDS = 0.3


class ConflictDetector:
    """冲突检测器。

    参数名保持稳定，供日常脚本调用。
    """

    def __init__(
        self,
        half_beat_seconds: float = DEFAULT_HALF_BEAT_SECONDS,
        default_duration_seconds: float = 120.0,
    ):
        """
        Args:
            half_beat_seconds: 半拍对应的秒数，用于判定时码偏移
            default_duration_seconds: 未知时长时的默认估算值（秒）
        """
        self.half_beat_seconds = half_beat_seconds
        self.default_duration_seconds = default_duration_seconds

    def detect_all(self, audio_files: List[AudioFile]) -> List[Conflict]:
        """执行所有检测，返回冲突列表。"""
        conflicts: List[Conflict] = []
        conflicts.extend(self._detect_version_ambiguous(audio_files))
        conflicts.extend(self._detect_time_overlap(audio_files))
        conflicts.extend(self._detect_half_beat_drift(audio_files))
        conflicts.extend(self._detect_missing_part_info(audio_files))
        return conflicts

    def _detect_version_ambiguous(self, audio_files: List[AudioFile]) -> List[Conflict]:
        """检测同一声部下多个版本且标签不清晰的情况。"""
        conflicts: List[Conflict] = []
        groups: Dict[str, List[AudioFile]] = {}

        for af in audio_files:
            if not af.part_name:
                continue
            groups.setdefault(af.part_name, []).append(af)

        for part, files in groups.items():
            if len(files) <= 1:
                continue

            untagged = [f for f in files if not f.version_tag]
            if len(untagged) >= 2:
                conflicts.append(Conflict(
                    conflict_id=_new_id("cf"),
                    conflict_type="version_ambiguous",
                    severity="error",
                    message=(
                        f"声部「{part}」有 {len(untagged)} 个文件没有版本标签，"
                        f"无法确定哪份是最新。"
                    ),
                    next_step=(
                        f"请重命名「{part}」相关文件，加上 v1、v2 或日期等版本标识，"
                        f"例如：{part}_v2_final.wav。然后重新扫描。"
                    ),
                    involved_file_ids=[f.file_id for f in untagged],
                ))
                continue

            latest_count = sum(1 for f in files if f.is_latest)
            if latest_count == 0 and len(files) >= 2:
                conflicts.append(Conflict(
                    conflict_id=_new_id("cf"),
                    conflict_type="version_ambiguous",
                    severity="warning",
                    message=(
                        f"声部「{part}」有 {len(files)} 个版本，"
                        f"系统无法判定哪份最新，请人工确认。"
                    ),
                    next_step=(
                        f"打开音频文件夹听一下 {part} 的 {len(files)} 个版本，"
                        f"把最新的那个文件名加上 final 或最新日期。"
                    ),
                    involved_file_ids=[f.file_id for f in files],
                ))

        return conflicts

    def _detect_time_overlap(self, audio_files: List[AudioFile]) -> List[Conflict]:
        """检测不同声部之间的时间重叠冲突。

        仅对有明确 start_time 的文件进行检测。
        """
        conflicts: List[Conflict] = []
        timed_files = [
            af for af in audio_files
            if af.start_time_seconds is not None and af.is_latest and af.part_name
        ]

        if len(timed_files) < 2:
            return conflicts

        timed_files.sort(key=lambda f: f.start_time_seconds or 0)

        for i in range(len(timed_files)):
            for j in range(i + 1, len(timed_files)):
                a = timed_files[i]
                b = timed_files[j]

                a_start = a.start_time_seconds or 0
                b_start = b.start_time_seconds or 0
                a_dur = a.duration_seconds or self.default_duration_seconds
                b_dur = b.duration_seconds or self.default_duration_seconds
                a_end = a_start + a_dur
                b_end = b_start + b_dur

                overlap_start = max(a_start, b_start)
                overlap_end = min(a_end, b_end)
                overlap = overlap_end - overlap_start

                if overlap <= 0:
                    continue

                drift = abs(a_start - b_start)
                if drift <= self.half_beat_seconds:
                    continue

                conflicts.append(Conflict(
                    conflict_id=_new_id("cf"),
                    conflict_type="time_overlap",
                    severity="error",
                    message=(
                        f"声部「{a.part_name}」与「{b.part_name}」在时间上重叠，"
                        f"重叠时长 {overlap:.1f} 秒（{overlap_start:.1f}s ~ {overlap_end:.1f}s）。"
                    ),
                    next_step=(
                        f"调整其中一个声部的开始时间。建议："
                        f"将「{b.part_name}」往后挪到 {a_end:.1f} 秒之后开始，"
                        f"或者缩短「{a.part_name}」的音频长度。"
                    ),
                    involved_file_ids=[a.file_id, b.file_id],
                    time_range=[overlap_start, overlap_end],
                ))

        return conflicts

    def _detect_half_beat_drift(self, audio_files: List[AudioFile]) -> List[Conflict]:
        """检测时码偏移在半拍以内的情况，提示人工确认。

        这类偏移不影响排期，但可能影响合唱对齐质量。
        """
        conflicts: List[Conflict] = []
        timed_files = [
            af for af in audio_files
            if af.start_time_seconds is not None and af.is_latest and af.part_name
        ]

        if len(timed_files) < 2:
            return conflicts

        timed_files.sort(key=lambda f: f.start_time_seconds or 0)

        for i in range(len(timed_files)):
            for j in range(i + 1, len(timed_files)):
                a = timed_files[i]
                b = timed_files[j]

                a_start = a.start_time_seconds or 0
                b_start = b.start_time_seconds or 0
                drift = abs(a_start - b_start)

                if drift == 0 or drift > self.half_beat_seconds:
                    continue

                conflicts.append(Conflict(
                    conflict_id=_new_id("cf"),
                    conflict_type="half_beat_drift",
                    severity="warning",
                    message=(
                        f"声部「{a.part_name}」与「{b.part_name}」的开始时间相差 "
                        f"{drift*1000:.0f} 毫秒，在半拍（{self.half_beat_seconds*1000:.0f}ms）以内，"
                        f"可能是对齐偏差，也可能是故意错开。"
                    ),
                    next_step=(
                        f"请听一下这两条音频的开头：\n"
                        f"  1. 如果是对齐偏差：把 {a.part_name} 或 {b.part_name} 的开始时间统一，"
                        f"重命名文件里的 start 参数即可；\n"
                        f"  2. 如果是故意错开（比如轮唱）：在备注里注明，下次扫描就不会再提示。"
                    ),
                    involved_file_ids=[a.file_id, b.file_id],
                    drift_seconds=drift,
                ))

        return conflicts

    def _detect_missing_part_info(self, audio_files: List[AudioFile]) -> List[Conflict]:
        """检测缺少声部信息或开始时间的文件。"""
        conflicts: List[Conflict] = []

        no_part = [af for af in audio_files if not af.part_name]
        if no_part:
            conflicts.append(Conflict(
                conflict_id=_new_id("cf"),
                conflict_type="part_mismatch",
                severity="info",
                message=(
                    f"有 {len(no_part)} 个文件无法识别声部名称，"
                    f"无法参与排期冲突检测。"
                ),
                next_step=(
                    f"在文件名中加上声部名称，例如：女高_xxx.wav、男低_xxx.wav。"
                    f"支持的关键词：女高/女低/男高/男低/童声/领唱 或英文 soprano/alto/tenor/bass。"
                ),
                involved_file_ids=[f.file_id for f in no_part],
            ))

        no_time = [
            af for af in audio_files
            if af.part_name and af.start_time_seconds is None and af.is_latest
        ]
        if no_time:
            conflicts.append(Conflict(
                conflict_id=_new_id("cf"),
                conflict_type="part_mismatch",
                severity="info",
                message=(
                    f"有 {len(no_time)} 个最新版本文件缺少开始时间，"
                    f"跳过时间重叠检测。"
                ),
                next_step=(
                    f"在文件名中加上 start 或 开始 时间，例如：女高_start_45.5.wav。"
                    f"时间单位是秒。"
                ),
                involved_file_ids=[f.file_id for f in no_time],
            ))

        return conflicts


def resolve_conflict(conflict: Conflict) -> Conflict:
    """标记冲突为已解决。"""
    from datetime import datetime
    conflict.resolved = True
    conflict.resolved_at = datetime.now().isoformat()
    return conflict
