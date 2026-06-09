from __future__ import annotations

from pathlib import Path
from typing import List, Optional, Tuple

from .core_logic import (
    determine_conclusion_status,
    generate_retest_suggestion,
    normalize_concentration,
)
from .errors import format_missing_files
from .exporter import build_summary, export_results
from .models import (
    BatchReport,
    BatchReviewResult,
    ConsistencyStatus,
    ReviewSummary,
)
from .traceability import (
    MaterialRegistry,
    load_batch_reports,
    load_previous_reports,
)


class ReviewPipeline:
    """
    聚合反应温控复盘的完整流水线：
    1. 加载批次报告、材料、称量单
    2. 针对每个批次，执行浓度换算、温控校验、溯源、一致性检查
    3. 生成复测建议和结论状态
    4. 导出结果和摘要（终端与文件一致）
    5. 记录 run_manifest 保证重复运行幂等、不乱
    """

    def __init__(
        self,
        input_dir: str | Path,
        output_dir: str | Path,
        expected_concentration_range: Optional[Tuple[float, float]] = None,
        concentration_target_unit: str = "mg/mL",
    ):
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.expected_concentration_range = expected_concentration_range
        self.concentration_target_unit = concentration_target_unit

        self.reports: List[BatchReport] = []
        self.previous_reports = {}
        self.registry: Optional[MaterialRegistry] = None
        self.results: List[BatchReviewResult] = []
        self.summary: Optional[ReviewSummary] = None
        self.warnings: List[str] = []
        self.missing_inputs: List[str] = []

    def load(self) -> Tuple[bool, List[str]]:
        """
        加载所有输入数据。
        Returns:
            (是否成功, 操作建议/错误提示)
        """
        if not self.input_dir.is_dir():
            return False, [
                f"输入目录不存在: {self.input_dir}",
                f"请先创建输入目录并放入批次报告、材料、称量单等数据。",
            ]

        self.registry = MaterialRegistry(self.input_dir)
        _loaded, reg_errors = self.registry.load()
        self.warnings.extend(reg_errors)
        if self.registry.missing_files:
            self.missing_inputs.extend(self.registry.missing_files)

        reports, report_errors = load_batch_reports(self.input_dir)
        self.reports = reports
        self.warnings.extend(report_errors)
        if not self.reports:
            return False, report_errors or ["未找到有效批次报告"]

        self.previous_reports = load_previous_reports(self.output_dir)

        return True, []

    def run(self) -> None:
        """对每个批次运行复盘，生成结果列表。"""
        self.results = []
        for report in self.reports:
            self.results.append(self._review_one(report))

    def _review_one(self, report: BatchReport) -> BatchReviewResult:
        previous = self.previous_reports.get(report.batch_id)

        retest = generate_retest_suggestion(
            report,
            expected_concentration_range=self.expected_concentration_range,
            previous_report=previous,
        )

        concentration_normalized, issues, warnings = normalize_concentration(
            report,
            target_unit=self.concentration_target_unit,
            expected_range=self.expected_concentration_range,
        )

        trace = self.registry.build_trace(report)
        actionable = self.registry.actionable_missing_messages(report)
        if actionable:
            issues.extend(actionable)
            self.missing_inputs.extend(actionable)

        consistency = ConsistencyStatus.CONSISTENT
        if (
            report.conclusion.passed
            and report.temperature_profile is not None
            and report.temperature_profile.points
            and not report.temperature_profile.all_within_range()
        ):
            consistency = ConsistencyStatus.INCONSISTENT

        condition_changed = False
        if previous is not None:
            if previous.reaction_condition != report.reaction_condition:
                condition_changed = True

        conclusion_needs_update = condition_changed or (
            consistency == ConsistencyStatus.INCONSISTENT
        )

        status = determine_conclusion_status(
            retest, consistency, actionable + list(trace.missing_weighing_record_ids)
        )

        return BatchReviewResult(
            batch_id=report.batch_id,
            conclusion_status=status,
            consistency_status=consistency,
            retest=retest,
            trace=trace,
            concentration_normalized=concentration_normalized,
            condition_changed=condition_changed,
            conclusion_needs_update=conclusion_needs_update,
            issues=issues,
            warnings=warnings,
        )

    def build_and_export(self) -> Tuple[ReviewSummary, dict]:
        """构建摘要并导出所有结果文件。"""
        dedup_missing = list(dict.fromkeys(self.missing_inputs))
        self.summary = build_summary(self.results, dedup_missing)
        written = export_results(
            self.output_dir, self.results, self.summary, self.reports
        )
        return self.summary, written
