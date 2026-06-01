from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

from .models import (
    AudioClip,
    HistoryEventType,
    NoiseAnnotation,
    NoiseType,
    RepairAction,
    ScoreReport,
)
from .history import HistoryLog
from .checker import NoiseChecker


class ProblemLevel(Enum):
    CRITICAL = "🔴 严重"
    WARNING = "🟡 警告"
    INFO = "ℹ️ 信息"


@dataclass
class ProblemItem:
    item_id: str
    level: ProblemLevel
    category: str
    description: str
    annotation_id: Optional[str] = None
    clip_id: Optional[str] = None
    report_id: Optional[str] = None
    detail: str = ""
    suppressed_by: Optional[str] = None

    @property
    def is_suppressed(self) -> bool:
        return self.suppressed_by is not None

    @property
    def is_critical(self) -> bool:
        return self.level == ProblemLevel.CRITICAL


class ProblemList:
    MIS_DELETE_CATEGORIES = {"误删原声"}
    UNSUPPRESSABLE_CATEGORIES = {"误删原声", "节拍漂移"}

    def __init__(self, history: HistoryLog, checker: NoiseChecker):
        self.history = history
        self.checker = checker
        self.problems: list[ProblemItem] = []
        self._counter = 0

    def _next_id(self) -> str:
        self._counter += 1
        return f"prob_{self._counter:04d}"

    def build_from_data(
        self,
        clips: dict[str, AudioClip],
        annotations: dict[str, NoiseAnnotation],
        repair_actions: dict[str, RepairAction],
        reports: dict[str, ScoreReport],
    ):
        self.problems.clear()
        self._counter = 0

        self._check_clips(clips)
        self._check_annotations(annotations, clips)
        self._check_repair_actions(repair_actions, annotations)
        self._check_reports(reports, annotations, clips)
        self._check_history_critical()
        self._ensure_mis_delete_not_suppressed()

    def _check_clips(self, clips: dict[str, AudioClip]):
        for clip in clips.values():
            issues = clip.validate()
            for issue in issues:
                self.problems.append(ProblemItem(
                    item_id=self._next_id(),
                    level=ProblemLevel.WARNING,
                    category="音频片段",
                    description=f"{clip.clip_id}: {issue}",
                    clip_id=clip.clip_id,
                    detail=f"标题: {clip.title}, 时长: {clip.duration}s",
                ))

    def _check_annotations(
        self,
        annotations: dict[str, NoiseAnnotation],
        clips: dict[str, AudioClip],
    ):
        for ann in annotations.values():
            issues = ann.validate()
            for issue in issues:
                level = ProblemLevel.WARNING
                category = "噪声标注"
                if "晚补" in issue:
                    category = "晚补"
                    level = ProblemLevel.INFO
                elif "备注" in issue:
                    category = "备注修改"
                    level = ProblemLevel.INFO

                self.problems.append(ProblemItem(
                    item_id=self._next_id(),
                    level=level,
                    category=category,
                    description=f"{ann.annotation_id}: {issue}",
                    annotation_id=ann.annotation_id,
                    clip_id=ann.clip_id,
                    detail=self._annotation_detail(ann, clips),
                ))

            if ann.clip_id and ann.clip_id not in clips:
                self.problems.append(ProblemItem(
                    item_id=self._next_id(),
                    level=ProblemLevel.WARNING,
                    category="噪声标注",
                    description=f"{ann.annotation_id}: 引用的音频片段 {ann.clip_id} 不存在",
                    annotation_id=ann.annotation_id,
                    clip_id=ann.clip_id,
                ))

    def _check_repair_actions(
        self,
        repair_actions: dict[str, RepairAction],
        annotations: dict[str, NoiseAnnotation],
    ):
        for action in repair_actions.values():
            ann = annotations.get(action.annotation_id)
            clip_id = ann.clip_id if ann else None

            if action.mis_deleted_original:
                self.problems.append(ProblemItem(
                    item_id=self._next_id(),
                    level=ProblemLevel.CRITICAL,
                    category="误删原声",
                    description=f"{action.annotation_id}: 修复操作 {action.action_type.value} 导致误删原声",
                    annotation_id=action.annotation_id,
                    clip_id=clip_id,
                    detail=f"修复ID: {action.action_id}, 结果: {action.result}",
                ))

            if ann and ann.noise_type == NoiseType.BEAT_DRIFT:
                self.problems.append(ProblemItem(
                    item_id=self._next_id(),
                    level=ProblemLevel.CRITICAL,
                    category="节拍漂移",
                    description=f"{action.annotation_id}: 节拍漂移区域的修复操作需特别关注",
                    annotation_id=action.annotation_id,
                    clip_id=clip_id,
                    detail=f"修复ID: {action.action_id}, 类型: {action.action_type.value}",
                ))

    def _check_reports(
        self,
        reports: dict[str, ScoreReport],
        annotations: dict[str, NoiseAnnotation],
        clips: dict[str, AudioClip],
    ):
        for report in reports.values():
            issues = report.validate()
            for issue in issues:
                level = ProblemLevel.WARNING
                if "缺少" in issue:
                    level = ProblemLevel.INFO

                self.problems.append(ProblemItem(
                    item_id=self._next_id(),
                    level=level,
                    category="评分报告",
                    description=f"{report.report_id}: {issue}",
                    annotation_id=report.annotation_id,
                    clip_id=report.clip_id,
                    report_id=report.report_id,
                ))

            if report.clip_id and report.clip_id not in clips:
                self.problems.append(ProblemItem(
                    item_id=self._next_id(),
                    level=ProblemLevel.WARNING,
                    category="评分报告",
                    description=f"{report.report_id}: 引用的音频片段 {report.clip_id} 不存在",
                    report_id=report.report_id,
                    clip_id=report.clip_id,
                ))

            if report.annotation_id and report.annotation_id not in annotations:
                self.problems.append(ProblemItem(
                    item_id=self._next_id(),
                    level=ProblemLevel.WARNING,
                    category="评分报告",
                    description=f"{report.report_id}: 引用的噪声标注 {report.annotation_id} 不存在",
                    report_id=report.report_id,
                    annotation_id=report.annotation_id,
                ))

    def _check_history_critical(self):
        mis_delete_entries = self.history.get_mis_delete_entries()
        for entry in mis_delete_entries:
            existing = [
                p for p in self.problems
                if p.annotation_id == entry.annotation_id
                and p.category == "误删原声"
            ]
            if not existing:
                self.problems.append(ProblemItem(
                    item_id=self._next_id(),
                    level=ProblemLevel.CRITICAL,
                    category="误删原声",
                    description=f"{entry.annotation_id}: 历史记录中存在误删原声事件",
                    annotation_id=entry.annotation_id,
                    clip_id=entry.related_clip_id,
                    detail=entry.description,
                ))

    def _ensure_mis_delete_not_suppressed(self):
        for problem in self.problems:
            if problem.category in self.UNSUPPRESSABLE_CATEGORIES and problem.is_suppressed:
                problem.suppressed_by = None

        mis_delete_problems = [
            p for p in self.problems
            if p.category in self.MIS_DELETE_CATEGORIES
        ]
        for mis_del in mis_delete_problems:
            for other in self.problems:
                if other.item_id == mis_del.item_id:
                    continue
                if other.annotation_id == mis_del.annotation_id and other.category in {
                    "节拍漂移", "爆音", "连续爆音"
                }:
                    pass

    def _annotation_detail(
        self, ann: NoiseAnnotation, clips: dict[str, AudioClip]
    ) -> str:
        parts = [
            f"噪声类型: {ann.noise_type.value}",
            f"严重程度: {ann.severity.value}",
        ]
        if ann.start_time is not None:
            parts.append(f"起始: {ann.start_time}s")
        if ann.end_time is not None:
            parts.append(f"结束: {ann.end_time}s")
        if ann.description:
            parts.append(f"描述: {ann.description}")
        if ann.is_late_addition:
            parts.append("【晚补】")
        if ann.notes_modified:
            parts.append(f"【备注已修改】原备注: {ann.original_notes or '无'}")
        clip = clips.get(ann.clip_id)
        if clip:
            parts.append(f"所属片段: {clip.title} ({clip.clip_id})")
        return "; ".join(parts)

    def format_problems(self, show_suppressed: bool = False) -> str:
        visible = self.problems if show_suppressed else [
            p for p in self.problems if not p.is_suppressed
        ]
        if not visible:
            return "✅ 无问题"

        critical = [p for p in visible if p.level == ProblemLevel.CRITICAL]
        warnings = [p for p in visible if p.level == ProblemLevel.WARNING]
        infos = [p for p in visible if p.level == ProblemLevel.INFO]

        lines = []
        if critical:
            lines.append("═══ 🔴 严重问题（不可被其他问题掩盖）═══")
            for p in critical:
                lines.append(self._format_item(p))
        if warnings:
            lines.append("═══ 🟡 警告 ═══")
            for p in warnings:
                lines.append(self._format_item(p))
        if infos:
            lines.append("═══ ℹ️ 信息 ═══")
            for p in infos:
                lines.append(self._format_item(p))

        return "\n".join(lines)

    def _format_item(self, item: ProblemItem) -> str:
        parts = [f"  {item.level.value} [{item.category}] {item.description}"]
        if item.detail:
            parts.append(f"    详情: {item.detail}")
        if item.is_suppressed:
            parts.append(f"    [已被 {item.suppressed_by} 标记掩盖，但误删原声/节拍漂移不可掩盖]")
        return "\n".join(parts)

    def get_summary(self) -> dict:
        visible = [p for p in self.problems if not p.is_suppressed]
        return {
            "total": len(visible),
            "critical": len([p for p in visible if p.level == ProblemLevel.CRITICAL]),
            "warning": len([p for p in visible if p.level == ProblemLevel.WARNING]),
            "info": len([p for p in visible if p.level == ProblemLevel.INFO]),
            "mis_delete_count": len([
                p for p in visible if p.category == "误删原声"
            ]),
            "beat_drift_count": len([
                p for p in visible if p.category == "节拍漂移"
            ]),
        }
