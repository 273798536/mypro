"""巡检主流程编排。"""
from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional

from .io_utils import DataLoader, ResultWriter, make_batch_id
from .models import (
    BatchReport,
    GraphData,
    InspectionResult,
    ValidationItem,
)
from .solver import compute_shortest_path
from .validator import ConstraintValidator


class InspectionPipeline:
    """巡检流水线：加载 → 计算 → 校验 → 写入。"""

    def __init__(
        self,
        input_dir: str,
        output_dir: str,
        skip_missing_drafts: bool = True,
    ):
        self.input_dir = input_dir
        self.output_dir = output_dir
        self.skip_missing_drafts = skip_missing_drafts
        self.loader = DataLoader(input_dir)
        self.writer = ResultWriter(output_dir)
        self.validator = ConstraintValidator()

    def run(self, operator: Optional[str] = None) -> BatchReport:
        graphs, load_errors = self.loader.load_all()
        previous_report = self.writer.load_previous_report()

        batch_id = make_batch_id(graphs) if graphs else f"batch_empty_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        report = BatchReport(
            batch_id=batch_id,
            timestamp=timestamp,
            input_dir=str(self.loader.input_dir),
            output_dir=str(self.writer.output_dir),
            total=len(graphs) + len(load_errors),
        )

        # 处理加载失败的
        for gid, err in load_errors.items():
            from .models import PathResult

            r = InspectionResult(
                graph_id=gid,
                computation=PathResult(
                    distance=None, path=None, success=False, error=err
                ),
                validations=[
                    ValidationItem(
                        name="文件加载",
                        passed=False,
                        message=f"加载失败: {err}",
                    )
                ],
            )
            report.results[gid] = r
            report.failed += 1
            self.writer.write_result(r)

        # 处理正常图
        for gid, graph in graphs.items():
            previous = None
            if previous_report and gid in previous_report.results:
                previous = previous_report.results[gid]

            has_draft = self.loader.has_draft(gid)
            draft = self.loader.load_draft(gid) if has_draft else None

            missing: List[str] = []
            if not has_draft and self.skip_missing_drafts:
                missing.append("计算草稿")
                report.missing_draft_graphs.append(gid)

            # 先计算（即使缺草稿也算）
            comp = compute_shortest_path(graph)

            # 校验
            validations = self.validator.validate(
                graph, comp, draft=draft, previous=previous
            )

            # 检查是否需要人工确认：历史对比不一致、近似误差过大
            needs_confirmation = False
            for v in validations:
                if v.name == "历史对比" and not v.passed:
                    needs_confirmation = True
                if v.name == "期望距离校验" and not v.passed:
                    # 误差过大需要确认
                    needs_confirmation = True
                if v.name == "草稿一致性校验" and not v.passed:
                    needs_confirmation = True

            result = InspectionResult(
                graph_id=gid,
                computation=comp,
                validations=validations,
                missing_drafts=missing,
                needs_confirmation=needs_confirmation,
            )

            if needs_confirmation:
                report.needs_confirmation_graphs.append(gid)

            report.results[gid] = result
            report.computed += 1
            if result.all_passed:
                report.passed += 1
            else:
                report.failed += 1

            self.writer.write_result(result)

        # 写报告
        self.writer.write_report(report)
        self.writer.write_summary(report)
        if report.missing_draft_graphs:
            self.writer.write_missing_drafts(report.missing_draft_graphs)
        self.writer.archive_history(batch_id, report)

        return report

    def confirm(
        self,
        graph_id: str,
        approved: bool,
        operator: str = "排课老师",
        comment: Optional[str] = None,
    ) -> Optional[InspectionResult]:
        """人工确认某个图的结果。"""
        result = self.writer.load_result(graph_id)
        if result is None:
            return None
        result.confirmed = approved
        result.confirmed_by = operator
        result.confirmed_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        if comment:
            result.validations.append(
                ValidationItem(
                    name="人工备注",
                    passed=approved,
                    message=comment,
                )
            )
        self.writer.write_result(result)
        return result

    def list_confirmations_needed(self) -> List[str]:
        """列出需要确认的 graph_id。"""
        report = self.writer.load_previous_report()
        if report is None:
            return []
        return list(report.needs_confirmation_graphs)

    def list_missing_drafts(self) -> List[str]:
        """列出缺少草稿的 graph_id。"""
        report = self.writer.load_previous_report()
        if report is None:
            return []
        return list(report.missing_draft_graphs)
