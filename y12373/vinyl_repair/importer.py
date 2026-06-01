import json
from pathlib import Path
from typing import Optional

from .models import (
    AudioClip,
    NoiseAnnotation,
    NoiseType,
    RepairAction,
    RepairActionType,
    ScoreReport,
    Severity,
)


class ImportError(Exception):
    pass


class Importer:
    def __init__(self):
        self.clips: dict[str, AudioClip] = {}
        self.annotations: dict[str, NoiseAnnotation] = {}
        self.repair_actions: dict[str, RepairAction] = {}
        self.reports: dict[str, ScoreReport] = {}
        self.import_warnings: list[dict] = []

    def _add_warning(self, record_type: str, record_id: str, message: str):
        self.import_warnings.append({
            "record_type": record_type,
            "record_id": record_id,
            "message": message,
        })

    def load_audio_clips(self, path: str) -> list[AudioClip]:
        data = self._load_json(path)
        clips = []
        for item in data:
            missing_fields = []
            clip_id = item.get("clip_id")
            if not clip_id:
                missing_fields.append("clip_id")

            title = item.get("title")
            if not title:
                missing_fields.append("title")

            duration = item.get("duration")
            if duration is None:
                missing_fields.append("duration")
                duration = 0.0

            source = item.get("source", "")
            file_path = item.get("file_path")

            clip = AudioClip(
                clip_id=clip_id or f"MISSING_{len(self.clips)}",
                title=title or "未知标题",
                duration=float(duration),
                source=source,
                file_path=file_path,
            )

            issues = clip.validate()
            for issue in issues:
                self._add_warning("AudioClip", clip.clip_id, issue)
            missing_fields.extend(issues)

            self.clips[clip.clip_id] = clip
            clips.append(clip)

        return clips

    def load_noise_annotations(self, path: str) -> list[NoiseAnnotation]:
        data = self._load_json(path)
        annotations = []

        noise_type_map = {
            "底噪": NoiseType.BACKGROUND_NOISE,
            "爆音": NoiseType.POP,
            "节拍漂移": NoiseType.BEAT_DRIFT,
        }

        severity_map = {
            "轻微": Severity.MILD,
            "中等": Severity.MEDIUM,
            "严重": Severity.SEVERE,
        }

        for item in data:
            annotation_id = item.get("annotation_id")
            clip_id = item.get("clip_id")
            noise_type_str = item.get("noise_type", "")
            severity_str = item.get("severity", "中等")

            noise_type = noise_type_map.get(noise_type_str)
            if noise_type is None:
                self._add_warning(
                    "NoiseAnnotation",
                    annotation_id or "UNKNOWN",
                    f"未知噪声类型: {noise_type_str}",
                )
                noise_type = NoiseType.BACKGROUND_NOISE

            severity = severity_map.get(severity_str, Severity.MEDIUM)

            start_time = item.get("start_time")
            end_time = item.get("end_time")
            description = item.get("description")
            is_late_addition = item.get("is_late_addition", False)
            notes_modified = item.get("notes_modified", False)
            original_notes = item.get("original_notes")
            current_notes = item.get("current_notes")

            if start_time is None:
                self._add_warning(
                    "NoiseAnnotation",
                    annotation_id or "UNKNOWN",
                    "缺少 start_time",
                )
            if end_time is None:
                self._add_warning(
                    "NoiseAnnotation",
                    annotation_id or "UNKNOWN",
                    "缺少 end_time",
                )
            if description is None:
                self._add_warning(
                    "NoiseAnnotation",
                    annotation_id or "UNKNOWN",
                    "缺少 description",
                )

            if is_late_addition:
                self._add_warning(
                    "NoiseAnnotation",
                    annotation_id or "UNKNOWN",
                    "晚补记录",
                )

            if notes_modified:
                self._add_warning(
                    "NoiseAnnotation",
                    annotation_id or "UNKNOWN",
                    "备注已被修改",
                )

            annotation = NoiseAnnotation(
                annotation_id=annotation_id or f"MISSING_ANN_{len(self.annotations)}",
                clip_id=clip_id or "",
                noise_type=noise_type,
                severity=severity,
                start_time=start_time,
                end_time=end_time,
                description=description,
                is_late_addition=is_late_addition,
                notes_modified=notes_modified,
                original_notes=original_notes,
                current_notes=current_notes,
            )

            self.annotations[annotation.annotation_id] = annotation
            annotations.append(annotation)

        return annotations

    def load_repair_actions(self, path: str) -> list[RepairAction]:
        data = self._load_json(path)
        actions = []

        action_type_map = {
            "降噪": RepairActionType.DENOISE,
            "去爆音": RepairActionType.REMOVE_POP,
            "节拍修正": RepairActionType.BEAT_CORRECTION,
        }

        for item in data:
            action_id = item.get("action_id")
            annotation_id = item.get("annotation_id")
            action_type_str = item.get("action_type", "")
            result = item.get("result", "")
            mis_deleted_original = item.get("mis_deleted_original", False)
            timestamp = item.get("timestamp")

            action_type = action_type_map.get(action_type_str)
            if action_type is None:
                self._add_warning(
                    "RepairAction",
                    action_id or "UNKNOWN",
                    f"未知修复类型: {action_type_str}",
                )
                action_type = RepairActionType.DENOISE

            if mis_deleted_original:
                self._add_warning(
                    "RepairAction",
                    action_id or "UNKNOWN",
                    "⚠️ 误删原声",
                )

            action = RepairAction(
                action_id=action_id or f"MISSING_ACT_{len(self.repair_actions)}",
                annotation_id=annotation_id or "",
                action_type=action_type,
                result=result,
                mis_deleted_original=mis_deleted_original,
                timestamp=timestamp or "",
            )

            self.repair_actions[action.action_id] = action
            actions.append(action)

        return actions

    def load_score_reports(self, path: str) -> list[ScoreReport]:
        data = self._load_json(path)
        reports = []

        for item in data:
            report_id = item.get("report_id")
            student_id = item.get("student_id")
            clip_id = item.get("clip_id")
            annotation_id = item.get("annotation_id")
            score = item.get("score")
            accuracy = item.get("accuracy")
            repair_quality = item.get("repair_quality")
            issues = item.get("issues", [])
            submitted_at = item.get("submitted_at")

            if report_id is None:
                self._add_warning("ScoreReport", "UNKNOWN", "缺少 report_id")
            if student_id is None:
                self._add_warning(
                    "ScoreReport", report_id or "UNKNOWN", "缺少 student_id"
                )
            if submitted_at is None:
                self._add_warning(
                    "ScoreReport", report_id or "UNKNOWN", "缺少 submitted_at"
                )

            report = ScoreReport(
                report_id=report_id or f"MISSING_RPT_{len(self.reports)}",
                student_id=student_id or "",
                clip_id=clip_id or "",
                annotation_id=annotation_id or "",
                score=float(score) if score is not None else 0.0,
                accuracy=float(accuracy) if accuracy is not None else 0.0,
                repair_quality=float(repair_quality) if repair_quality is not None else 0.0,
                issues=issues if isinstance(issues, list) else [],
                submitted_at=submitted_at,
            )

            self.reports[report.report_id] = report
            reports.append(report)

        return reports

    def _load_json(self, path: str) -> list:
        p = Path(path)
        if not p.exists():
            raise ImportError(f"文件不存在: {path}")
        with open(p, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            data = [data]
        return data

    def get_warnings_summary(self) -> str:
        if not self.import_warnings:
            return "导入无警告"
        lines = ["导入警告:"]
        for w in self.import_warnings:
            lines.append(f"  [{w['record_type']}] {w['record_id']}: {w['message']}")
        return "\n".join(lines)
