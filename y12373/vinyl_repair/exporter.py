import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from .models import AudioClip, NoiseAnnotation, RepairAction, ScoreReport
from .history import HistoryLog
from .checker import NoiseChecker
from .problem_list import ProblemList


class ExportMapper:
    def __init__(
        self,
        clips: dict[str, AudioClip],
        annotations: dict[str, NoiseAnnotation],
        repair_actions: dict[str, RepairAction],
        reports: dict[str, ScoreReport],
        history: HistoryLog,
        checker: NoiseChecker,
        problem_list: ProblemList,
    ):
        self.clips = clips
        self.annotations = annotations
        self.repair_actions = repair_actions
        self.reports = reports
        self.history = history
        self.checker = checker
        self.problem_list = problem_list

    def build_clip_annotation_report_mapping(self) -> list[dict]:
        mapping = []
        for report in self.reports.values():
            ann = self.annotations.get(report.annotation_id)
            clip = self.clips.get(report.clip_id)

            entry = {
                "report_id": report.report_id,
                "student_id": report.student_id,
                "clip_id": report.clip_id,
                "clip_title": clip.title if clip else "未知",
                "annotation_id": report.annotation_id,
                "noise_type": ann.noise_type.value if ann else "未知",
                "severity": ann.severity.value if ann else "未知",
                "score": report.score,
                "accuracy": report.accuracy,
                "repair_quality": report.repair_quality,
                "mis_delete_in_history": self.history.has_mis_delete(report.annotation_id),
                "problems": self._get_related_problems(report),
            }

            if ann:
                state = self.checker.get_current_state(ann.annotation_id)
                if state:
                    entry["current_recognition_round"] = state.recognition_round
                    entry["current_playback_note"] = state.playback_note
                    entry["current_error_explanation"] = state.error_explanation

            mapping.append(entry)

        clip_groups: dict[str, list[dict]] = {}
        for entry in mapping:
            cid = entry["clip_id"]
            if cid not in clip_groups:
                clip_groups[cid] = []
            clip_groups[cid].append(entry)

        result = []
        for cid, group in clip_groups.items():
            clip = self.clips.get(cid)
            result.append({
                "clip_id": cid,
                "clip_title": clip.title if clip else "未知",
                "duration": clip.duration if clip else 0,
                "source": clip.source if clip else "未知",
                "annotations_and_reports": group,
            })

        return result

    def _get_related_problems(self, report: ScoreReport) -> list[dict]:
        related = []
        for p in self.problem_list.problems:
            if p.annotation_id == report.annotation_id or p.clip_id == report.clip_id or p.report_id == report.report_id:
                related.append({
                    "problem_id": p.item_id,
                    "level": p.level.value,
                    "category": p.category,
                    "description": p.description,
                    "is_suppressed": p.is_suppressed,
                })
        return related


class GradeExporter:
    def __init__(
        self,
        clips: dict[str, AudioClip],
        annotations: dict[str, NoiseAnnotation],
        repair_actions: dict[str, RepairAction],
        reports: dict[str, ScoreReport],
        history: HistoryLog,
        checker: NoiseChecker,
        problem_list: ProblemList,
    ):
        self.mapper = ExportMapper(
            clips, annotations, repair_actions, reports, history, checker, problem_list
        )
        self.history = history
        self.problem_list = problem_list

    def export(self, output_path: str) -> str:
        export_data = {
            "export_time": datetime.now().isoformat(),
            "summary": self._build_summary(),
            "mapping_detail": self.mapper.build_clip_annotation_report_mapping(),
            "problem_summary": self.problem_list.get_summary(),
            "critical_problems": self._build_critical_problems(),
            "history_trace": self._build_history_trace(),
        }

        p = Path(output_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)

        return str(p)

    def _build_summary(self) -> dict:
        total_clips = len(self.mapper.clips)
        total_annotations = len(self.mapper.annotations)
        total_reports = len(self.mapper.reports)
        total_repairs = len(self.mapper.repair_actions)
        mis_delete_count = sum(
            1 for a in self.mapper.repair_actions.values() if a.mis_deleted_original
        )

        return {
            "total_clips": total_clips,
            "total_annotations": total_annotations,
            "total_reports": total_reports,
            "total_repairs": total_repairs,
            "mis_delete_count": mis_delete_count,
        }

    def _build_critical_problems(self) -> list[dict]:
        critical = [
            p for p in self.problem_list.problems
            if p.is_critical and not p.is_suppressed
        ]
        return [
            {
                "problem_id": p.item_id,
                "category": p.category,
                "description": p.description,
                "detail": p.detail,
                "annotation_id": p.annotation_id,
                "clip_id": p.clip_id,
            }
            for p in critical
        ]

    def _build_history_trace(self) -> list[dict]:
        traces = []
        for entry in self.history.entries:
            traces.append({
                "entry_id": entry.entry_id,
                "annotation_id": entry.annotation_id,
                "event_type": entry.event_type.value,
                "description": entry.description,
                "timestamp": entry.timestamp,
                "is_active": entry.is_active,
                "is_critical": entry.is_critical,
                "superseded_by": entry.superseded_by,
            })
        return traces

    def format_export_summary(self, output_path: str) -> str:
        summary = self._build_summary()
        problem_summary = self.problem_list.get_summary()
        mapping = self.mapper.build_clip_annotation_report_mapping()

        lines = [
            "═══ 成绩导出摘要 ═══",
            f"导出时间: {datetime.now().isoformat()}",
            f"输出路径: {output_path}",
            "",
            f"音频片段: {summary['total_clips']} 条",
            f"噪声标注: {summary['total_annotations']} 条",
            f"修复操作: {summary['total_repairs']} 条",
            f"评分报告: {summary['total_reports']} 条",
            f"误删原声: {summary['mis_delete_count']} 条",
            "",
            f"问题统计: 严重 {problem_summary['critical']}, "
            f"警告 {problem_summary['warning']}, "
            f"信息 {problem_summary['info']}",
            "",
            "═══ 对应关系（音频片段→噪声标注→成绩导出）═══",
        ]

        for clip_group in mapping:
            lines.append(f"  📀 {clip_group['clip_title']} ({clip_group['clip_id']})")
            lines.append(f"     时长: {clip_group['duration']}s | 来源: {clip_group['source']}")
            for ar in clip_group["annotations_and_reports"]:
                mis_flag = " 🔴误删原声" if ar.get("mis_delete_in_history") else ""
                lines.append(
                    f"     ├─ 标注 {ar['annotation_id']}: "
                    f"{ar['noise_type']}/{ar['severity']} | "
                    f"学生 {ar['student_id']} | "
                    f"分数 {ar['score']} | "
                    f"准确率 {ar['accuracy']}%"
                    f"{mis_flag}"
                )
                if ar.get("current_error_explanation"):
                    lines.append(f"     │  错因: {ar['current_error_explanation']}")
                if ar.get("problems"):
                    for prob in ar["problems"]:
                        lines.append(f"     │  问题: [{prob['category']}] {prob['description']}")

        return "\n".join(lines)
