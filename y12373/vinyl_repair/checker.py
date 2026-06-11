from dataclasses import dataclass, field
from typing import Optional

from .models import (
    HistoryEventType,
    NoiseAnnotation,
    NoiseType,
    RepairAction,
    RepairActionType,
    Severity,
)
from .history import HistoryLog


@dataclass
class RecognitionState:
    annotation_id: str
    current_noise_type: NoiseType
    current_severity: Severity
    confidence: float
    error_explanation: str = ""
    playback_note: str = ""
    recognition_round: int = 1
    superseded: bool = False


@dataclass
class RepairPreview:
    annotation_id: str
    repair_type: RepairActionType
    before_description: str
    after_description: str
    playback_changed: bool = False
    explanation_changed: bool = False
    mis_delete_detected: bool = False
    beat_drift_detected: bool = False


class NoiseChecker:
    def __init__(self, history: HistoryLog):
        self.history = history
        self.recognition_states: dict[str, list[RecognitionState]] = {}
        self.repair_previews: dict[str, RepairPreview] = {}

    def recognize(
        self,
        annotation: NoiseAnnotation,
        confidence: float = 1.0,
        note: str = "",
    ) -> RecognitionState:
        old_states = self.recognition_states.get(annotation.annotation_id, [])
        for old in old_states:
            old.superseded = True

        explanation = self._generate_error_explanation(annotation)
        playback = self._generate_playback_note(annotation)

        state = RecognitionState(
            annotation_id=annotation.annotation_id,
            current_noise_type=annotation.noise_type,
            current_severity=annotation.severity,
            confidence=confidence,
            error_explanation=explanation,
            playback_note=playback,
            recognition_round=len(old_states) + 1,
        )

        if annotation.annotation_id not in self.recognition_states:
            self.recognition_states[annotation.annotation_id] = []
        self.recognition_states[annotation.annotation_id].append(state)

        self.history.record(
            annotation_id=annotation.annotation_id,
            event_type=HistoryEventType.RECOGNITION,
            description=f"第{state.recognition_round}轮识别: {annotation.noise_type.value}/{annotation.severity.value} (置信度{confidence:.0%})"
            + (f" - {note}" if note else ""),
        )

        return state

    def preview_repair(
        self,
        annotation: NoiseAnnotation,
        repair_type: RepairActionType,
    ) -> RepairPreview:
        before_desc = f"修复前: {annotation.noise_type.value}/{annotation.severity.value}"

        after_noise, after_severity, after_desc = self._simulate_repair(
            annotation, repair_type
        )

        mis_delete = self._check_mis_delete(annotation, repair_type)
        beat_drift = self._check_beat_drift(annotation, repair_type)
        playback_changed = mis_delete or beat_drift or (after_noise != annotation.noise_type)
        explanation_changed = mis_delete or beat_drift

        preview = RepairPreview(
            annotation_id=annotation.annotation_id,
            repair_type=repair_type,
            before_description=before_desc,
            after_description=after_desc,
            playback_changed=playback_changed,
            explanation_changed=explanation_changed,
            mis_delete_detected=mis_delete,
            beat_drift_detected=beat_drift,
        )

        self.repair_previews[annotation.annotation_id] = preview

        if mis_delete:
            self.history.record(
                annotation_id=annotation.annotation_id,
                event_type=HistoryEventType.MIS_DELETE,
                description=f"修复预览检测到误删原声: {repair_type.value} 作用于 {annotation.noise_type.value}",
            )

        if beat_drift:
            self.history.record(
                annotation_id=annotation.annotation_id,
                event_type=HistoryEventType.BEAT_DRIFT,
                description=f"修复预览检测到节拍漂移: {repair_type.value} 作用于 {annotation.noise_type.value}",
            )

        self.history.record(
            annotation_id=annotation.annotation_id,
            event_type=HistoryEventType.PREVIEW_CHANGE,
            description=f"修复预览: {before_desc} → {after_desc}"
            + (" [误删原声]" if mis_delete else "")
            + (" [节拍漂移]" if beat_drift else ""),
        )

        return preview

    def apply_repair(self, annotation: NoiseAnnotation, repair: RepairAction) -> RecognitionState:
        preview = self.repair_previews.get(annotation.annotation_id)

        effective_mis_delete = (preview.mis_delete_detected if preview else False) or repair.mis_deleted_original
        effective_beat_drift = (preview.beat_drift_detected if preview else False)

        if effective_mis_delete or effective_beat_drift:
            self.history.record(
                annotation_id=annotation.annotation_id,
                event_type=HistoryEventType.REPAIR,
                description=f"修复应用: {repair.action_type.value}"
                + (" ⚠️ 含误删原声" if effective_mis_delete else "")
                + (" ⚠️ 含节拍漂移" if effective_beat_drift else ""),
            )
        else:
            self.history.record(
                annotation_id=annotation.annotation_id,
                event_type=HistoryEventType.REPAIR,
                description=f"修复应用: {repair.action_type.value} - {repair.result}",
            )

        if repair.mis_deleted_original:
            self.history.record(
                annotation_id=annotation.annotation_id,
                event_type=HistoryEventType.MIS_DELETE,
                description=f"确认误删原声: {repair.action_type.value}",
            )

        updated_type, updated_severity, _ = self._simulate_repair(
            annotation, repair.action_type
        )

        updated_annotation = NoiseAnnotation(
            annotation_id=annotation.annotation_id,
            clip_id=annotation.clip_id,
            noise_type=updated_type,
            severity=updated_severity,
            start_time=annotation.start_time,
            end_time=annotation.end_time,
            description=annotation.description,
            is_late_addition=annotation.is_late_addition,
            notes_modified=annotation.notes_modified,
            original_notes=annotation.original_notes,
            current_notes=annotation.current_notes,
        )

        new_state = self.recognize(
            updated_annotation,
            confidence=0.9,
            note="修复后重新识别",
        )

        if preview or repair.mis_deleted_original:
            mis_delete_flag = effective_mis_delete
            beat_drift_flag = effective_beat_drift
            if mis_delete_flag or beat_drift_flag:
                note = self._generate_playback_note(annotation)
                if mis_delete_flag:
                    note += " ⚠️ 部分原声已被误删，音质受损"
                if beat_drift_flag:
                    note += " ⚠️ 节拍出现漂移，节奏不稳定"
                new_state.playback_note = note

                explanation = self._generate_error_explanation(annotation)
                if mis_delete_flag:
                    explanation = "误删原声: 修复操作类型与噪声类型不匹配，导致原始音频内容被删除。此问题不可被后续节拍漂移或连续爆音修复掩盖。"
                if beat_drift_flag:
                    explanation += " 节拍漂移: 修复操作可能影响了节拍稳定性。"
                new_state.error_explanation = explanation

        return new_state

    def get_current_state(self, annotation_id: str) -> Optional[RecognitionState]:
        states = self.recognition_states.get(annotation_id, [])
        for state in reversed(states):
            if not state.superseded:
                return state
        return None

    def get_all_recognition_rounds(self, annotation_id: str) -> list[RecognitionState]:
        return self.recognition_states.get(annotation_id, [])

    def _generate_error_explanation(self, annotation: NoiseAnnotation) -> str:
        base = {
            NoiseType.BACKGROUND_NOISE: "持续性的低频沙沙声，来自黑胶唱片表面磨损",
            NoiseType.POP: "短促的咔嗒或爆裂声，通常由灰尘或划痕引起",
            NoiseType.BEAT_DRIFT: "节拍不规律偏移，可能因唱片变形或转盘不稳",
        }
        explanation = base.get(annotation.noise_type, "未知噪声类型")

        if annotation.severity == Severity.SEVERE:
            explanation += "，严重程度高，需谨慎处理避免误删原声"
        elif annotation.severity == Severity.MILD:
            explanation += "，程度较轻，可选择保留"

        return explanation

    def _generate_playback_note(self, annotation: NoiseAnnotation) -> str:
        base = {
            NoiseType.BACKGROUND_NOISE: "底噪在背景持续可闻",
            NoiseType.POP: "爆音在标记时段可听到咔嗒声",
            NoiseType.BEAT_DRIFT: "节拍漂移时段节奏有波动",
        }
        return base.get(annotation.noise_type, "回放正常")

    def _simulate_repair(
        self,
        annotation: NoiseAnnotation,
        repair_type: RepairActionType,
    ) -> tuple[NoiseType, Severity, str]:
        if repair_type == RepairActionType.DENOISE:
            if annotation.noise_type == NoiseType.BACKGROUND_NOISE:
                new_severity = Severity.MILD if annotation.severity != Severity.MILD else Severity.MILD
                return (NoiseType.BACKGROUND_NOISE, new_severity, "降噪处理: 底噪减轻")
            elif annotation.noise_type == NoiseType.POP:
                return (annotation.noise_type, annotation.severity, "降噪处理: 对爆音无明显效果，可能误删原声")
            else:
                return (annotation.noise_type, annotation.severity, "降噪处理: 对节拍漂移无效果")

        elif repair_type == RepairActionType.REMOVE_POP:
            if annotation.noise_type == NoiseType.POP:
                new_severity = Severity.MILD
                return (NoiseType.POP, new_severity, "去爆音处理: 爆音显著减少")
            elif annotation.noise_type == NoiseType.BACKGROUND_NOISE:
                return (NoiseType.BACKGROUND_NOISE, annotation.severity, "去爆音处理: 对底噪无效，可能误删原声")
            else:
                return (NoiseType.BEAT_DRIFT, annotation.severity, "去爆音处理: 连续爆音可能掩盖节拍漂移")

        elif repair_type == RepairActionType.BEAT_CORRECTION:
            if annotation.noise_type == NoiseType.BEAT_DRIFT:
                new_severity = Severity.MILD
                return (NoiseType.BEAT_DRIFT, new_severity, "节拍修正: 节拍漂移得到缓解")
            elif annotation.noise_type == NoiseType.POP:
                return (annotation.noise_type, annotation.severity, "节拍修正: 对爆音无效，可能引入新的节拍异常")
            else:
                return (annotation.noise_type, annotation.severity, "节拍修正: 可能误删原有音乐内容")

        return (annotation.noise_type, annotation.severity, "未知修复操作")

    def _check_mis_delete(self, annotation: NoiseAnnotation, repair_type: RepairActionType) -> bool:
        if repair_type == RepairActionType.DENOISE and annotation.noise_type != NoiseType.BACKGROUND_NOISE:
            return True
        if repair_type == RepairActionType.REMOVE_POP and annotation.noise_type == NoiseType.BACKGROUND_NOISE:
            return True
        if repair_type == RepairActionType.BEAT_CORRECTION and annotation.noise_type == NoiseType.BACKGROUND_NOISE:
            return True
        return False

    def _check_beat_drift(self, annotation: NoiseAnnotation, repair_type: RepairActionType) -> bool:
        if repair_type == RepairActionType.REMOVE_POP and annotation.noise_type == NoiseType.BEAT_DRIFT:
            return True
        if repair_type == RepairActionType.BEAT_CORRECTION and annotation.noise_type == NoiseType.POP:
            return True
        return False

    def _update_playback_after_repair(
        self, annotation: NoiseAnnotation, preview: RepairPreview
    ) -> str:
        note = self._generate_playback_note(annotation)
        if preview.mis_delete_detected:
            note += " ⚠️ 部分原声已被误删，音质受损"
        if preview.beat_drift_detected:
            note += " ⚠️ 节拍出现漂移，节奏不稳定"
        return note

    def _update_explanation_after_repair(
        self, annotation: NoiseAnnotation, preview: RepairPreview
    ) -> str:
        explanation = self._generate_error_explanation(annotation)
        if preview.mis_delete_detected:
            explanation = "误删原声: 修复操作类型与噪声类型不匹配，导致原始音频内容被删除。此问题不可被后续节拍漂移或连续爆音修复掩盖。"
        if preview.beat_drift_detected:
            explanation += " 节拍漂移: 修复操作可能影响了节拍稳定性。"
        return explanation
