from __future__ import annotations

import os
from difflib import SequenceMatcher
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .models import (
    AudioFile,
    ConflictRecord,
    ConflictType,
    HistoryAction,
    HistoryEntry,
    ItemStatus,
    ProcessingResult,
    ScheduleItem,
    Timecode,
)


class TimecodeValidator:
    HALF_FRAME_TOLERANCE = 0.5 / 25.0

    @classmethod
    def check_drift(cls, expected: Optional[Timecode], actual: Optional[Timecode]) -> Tuple[bool, float]:
        if expected is None or actual is None:
            return True, 0.0

        expected_sec = expected.to_seconds()
        actual_sec = actual.to_seconds()
        drift = abs(expected_sec - actual_sec)

        return drift <= cls.HALF_FRAME_TOLERANCE, drift

    @classmethod
    def check_overlap(cls, item1: ScheduleItem, item2: ScheduleItem) -> Tuple[bool, float]:
        if (
            item1.start_time is None
            or item1.end_time is None
            or item2.start_time is None
            or item2.end_time is None
        ):
            return False, 0.0

        if item1.booth != item2.booth or item1.day != item2.day:
            return False, 0.0

        item1_start = item1.start_time.to_seconds()
        item1_end = item1.end_time.to_seconds()
        item2_start = item2.start_time.to_seconds()
        item2_end = item2.end_time.to_seconds()

        latest_start = max(item1_start, item2_start)
        earliest_end = min(item1_end, item2_end)
        overlap = earliest_end - latest_start

        return overlap > 0, max(0, overlap)


class ConflictDetector:
    def __init__(self, result: Optional[ProcessingResult] = None):
        self.result = result or ProcessingResult()
        self.timecode_validator = TimecodeValidator()

    def detect_all(
        self,
        schedule_items: List[ScheduleItem],
        audio_files: List[AudioFile],
    ) -> List[ConflictRecord]:
        conflicts: List[ConflictRecord] = []

        conflicts.extend(self._detect_name_mismatches(schedule_items, audio_files))
        conflicts.extend(self._detect_missing_files(schedule_items, audio_files))
        conflicts.extend(self._detect_extra_files(schedule_items, audio_files))
        conflicts.extend(self._detect_time_overlaps(schedule_items))
        conflicts.extend(self._detect_timecode_drifts(schedule_items, audio_files))
        conflicts.extend(self._detect_duplicates(schedule_items))

        for conflict in conflicts:
            self.result.history.append(
                HistoryEntry(
                    action=HistoryAction.CONFLICT_DETECTED,
                    item_id=conflict.schedule_item_id,
                    details={"conflict_id": str(conflict.id), "conflict_type": conflict.conflict_type.value},
                    new_value=conflict.model_dump(),
                )
            )

        self.result.conflicts.extend(conflicts)
        self.result.stats.conflicts_detected = len(conflicts)

        return conflicts

    def _detect_name_mismatches(
        self,
        schedule_items: List[ScheduleItem],
        audio_files: List[AudioFile],
    ) -> List[ConflictRecord]:
        conflicts: List[ConflictRecord] = []
        media_files = [af for af in audio_files if not af.is_screenshot and not af.is_note]

        for item in schedule_items:
            matched_files = [
                af for af in media_files if af.track_id == item.track_id
            ]

            for af in matched_files:
                expected = item.expected_filename.lower() if item.expected_filename else ""
                actual = af.filename.lower()

                if expected and expected != actual:
                    similarity = SequenceMatcher(None, expected, actual).ratio()
                    if similarity < 0.9:
                        conflict = ConflictRecord(
                            conflict_type=ConflictType.NAME_MISMATCH,
                            schedule_item_id=item.id,
                            audio_file_id=af.id,
                            description=f"文件名不匹配：曲目表预期 '{item.expected_filename}'，实际文件 '{af.filename}'",
                            severity="warning",
                            requires_manual_confirmation=False,
                        )
                        conflicts.append(conflict)

        return conflicts

    def _detect_missing_files(
        self,
        schedule_items: List[ScheduleItem],
        audio_files: List[AudioFile],
    ) -> List[ConflictRecord]:
        conflicts: List[ConflictRecord] = []
        media_files = [af for af in audio_files if not af.is_screenshot and not af.is_note]
        track_ids_in_files = {af.track_id for af in media_files if af.track_id}

        for item in schedule_items:
            if item.track_id not in track_ids_in_files:
                conflict = ConflictRecord(
                    conflict_type=ConflictType.MISSING_FILE,
                    schedule_item_id=item.id,
                    description=f"缺失音频文件：曲目 '{item.title}' ({item.track_id}) 在音频文件夹中未找到对应文件",
                    severity="error",
                    requires_manual_confirmation=True,
                    confirmation_reason="需要确认文件是否确实缺失，还是文件名格式不标准导致未识别",
                    next_steps=[
                        "检查音频文件夹中是否存在该曲目文件",
                        "确认文件名是否包含正确的TRACK ID",
                        "如文件已存在但命名不规范，请重命名文件",
                        "如文件确实缺失，请联系录音师补录",
                    ],
                )
                conflicts.append(conflict)
                item.status = ItemStatus.NEEDS_EVIDENCE

        return conflicts

    def _detect_extra_files(
        self,
        schedule_items: List[ScheduleItem],
        audio_files: List[AudioFile],
    ) -> List[ConflictRecord]:
        conflicts: List[ConflictRecord] = []
        media_files = [af for af in audio_files if not af.is_screenshot and not af.is_note]
        track_ids_in_schedule = {item.track_id for item in schedule_items}

        for af in media_files:
            if af.track_id and af.track_id not in track_ids_in_schedule:
                conflict = ConflictRecord(
                    conflict_type=ConflictType.EXTRA_FILE,
                    schedule_item_id=None,
                    audio_file_id=af.id,
                    description=f"多余文件：音频文件 '{af.filename}' 的 TRACK ID '{af.track_id}' 不在曲目表中",
                    severity="info",
                    requires_manual_confirmation=True,
                    confirmation_reason="需要确认该文件是否为错误提交，还是曲目表有遗漏",
                    next_steps=[
                        "检查曲目表是否遗漏了该曲目",
                        "确认该文件是否属于本次音乐节",
                        "如为错误提交，请删除该文件",
                        "如曲目表遗漏，请更新曲目表",
                    ],
                )
                conflicts.append(conflict)

        return conflicts

    def _detect_time_overlaps(self, schedule_items: List[ScheduleItem]) -> List[ConflictRecord]:
        conflicts: List[ConflictRecord] = []
        sorted_items = sorted(
            [item for item in schedule_items if item.start_time and item.end_time],
            key=lambda x: (x.day, x.booth, x.start_time.to_seconds()),
        )

        for i in range(len(sorted_items)):
            for j in range(i + 1, len(sorted_items)):
                item1 = sorted_items[i]
                item2 = sorted_items[j]

                has_overlap, overlap_duration = self.timecode_validator.check_overlap(item1, item2)

                if has_overlap:
                    conflict = ConflictRecord(
                        conflict_type=ConflictType.TIME_OVERLAP,
                        schedule_item_id=item1.id,
                        description=(
                            f"时间重叠：第{item1.day}天 {item1.booth} 摊位 "
                            f"'{item1.title}' ({item1.start_time}-{item1.end_time}) 与 "
                            f"'{item2.title}' ({item2.start_time}-{item2.end_time}) "
                            f"重叠 {overlap_duration:.2f} 秒"
                        ),
                        severity="error",
                        requires_manual_confirmation=True,
                        confirmation_reason="排期冲突必须人工调整，算法无法自动决定优先级",
                        next_steps=[
                            "联系排期负责人确认两个节目的优先级",
                            "调整其中一个节目的时间或摊位",
                            "确认是否需要合并或取消其中一个节目",
                            "调整后重新运行检测",
                        ],
                    )
                    conflicts.append(conflict)
                    item1.status = ItemStatus.NEEDS_CONFIRMATION
                    item2.status = ItemStatus.NEEDS_CONFIRMATION

        return conflicts

    def _detect_timecode_drifts(
        self,
        schedule_items: List[ScheduleItem],
        audio_files: List[AudioFile],
    ) -> List[ConflictRecord]:
        conflicts: List[ConflictRecord] = []
        media_files = [af for af in audio_files if not af.is_screenshot and not af.is_note]

        for item in schedule_items:
            matched_files = [
                af for af in media_files if af.track_id == item.track_id
            ]

            for af in matched_files:
                if item.start_time and af.timecode:
                    within_tolerance, drift = self.timecode_validator.check_drift(
                        item.start_time, af.timecode
                    )

                    if not within_tolerance:
                        conflict = ConflictRecord(
                            conflict_type=ConflictType.TIMECODE_DRIFT,
                            schedule_item_id=item.id,
                            audio_file_id=af.id,
                            description=(
                                f"时码偏差超过半拍：曲目 '{item.title}' 预期时码 {item.start_time}，"
                                f"文件时码 {af.timecode}，偏差 {drift:.4f} 秒 "
                                f"(允许偏差 {TimecodeValidator.HALF_FRAME_TOLERANCE:.4f} 秒)"
                            ),
                            severity="warning",
                            requires_manual_confirmation=False,
                        )
                        conflicts.append(conflict)

        return conflicts

    def _detect_duplicates(self, schedule_items: List[ScheduleItem]) -> List[ConflictRecord]:
        conflicts: List[ConflictRecord] = []
        track_id_counts: Dict[str, List[ScheduleItem]] = {}

        for item in schedule_items:
            if item.track_id not in track_id_counts:
                track_id_counts[item.track_id] = []
            track_id_counts[item.track_id].append(item)

        for track_id, items in track_id_counts.items():
            if len(items) > 1:
                for item in items[1:]:
                    conflict = ConflictRecord(
                        conflict_type=ConflictType.DUPLICATE,
                        schedule_item_id=item.id,
                        description=(
                            f"重复条目：TRACK ID '{track_id}' 在曲目表中出现 {len(items)} 次。"
                            f"首现条目：'{items[0].title}'，重复条目：'{item.title}'"
                        ),
                        severity="warning",
                        requires_manual_confirmation=True,
                        confirmation_reason="需要确认哪一条是正确的排期",
                        next_steps=[
                            "检查重复条目的详细信息",
                            "保留正确的条目，删除错误的重复条目",
                            "如两条都是需要的，请修改其中一条的TRACK ID",
                        ],
                    )
                    conflicts.append(conflict)
                    item.status = ItemStatus.NEEDS_CONFIRMATION

        return conflicts
