import uuid
from typing import List, Dict, Optional
from datetime import datetime
from collections import defaultdict

from .models import (
    StudentAnswer,
    ParameterGap,
    BatchRunReport,
    StabilityResult,
    StabilityVerdict,
)
from .review_workflow import ReviewWorkflow


class FaultTolerantBatchRunner:
    def __init__(self, workflow: Optional[ReviewWorkflow] = None):
        self.workflow = workflow or ReviewWorkflow()

    def _required_parameters(self, answers_by_problem: Dict[str, List[StudentAnswer]]) -> Dict[str, List[str]]:
        reqs = {}
        for pid, answers in answers_by_problem.items():
            orders = set()
            for ans in answers:
                if ans.coefficients:
                    for k in ans.coefficients.keys():
                        if k.startswith("a") and k[1:].isdigit():
                            orders.add(int(k[1:]))
            if orders:
                max_order = max(orders)
                reqs[pid] = [f"a{i}" for i in range(max_order + 1)]
            else:
                reqs[pid] = ["a0", "a1", "a2"]
        return reqs

    def _collect_missing(
        self,
        answers_by_problem: Dict[str, List[StudentAnswer]],
        required_params: Dict[str, List[str]],
    ) -> Dict[str, ParameterGap]:
        gaps = {}
        for pid, answers in answers_by_problem.items():
            reqs = required_params.get(pid, [])
            student_missing = defaultdict(list)
            all_students = []
            for ans in answers:
                all_students.append(ans.student_id)
                coeffs = ans.coefficients or {}
                for p in reqs:
                    if p not in coeffs:
                        student_missing[p].append(ans.student_id)
            if student_missing:
                missing_params = sorted(student_missing.keys())
                gaps[pid] = ParameterGap(
                    problem_id=pid,
                    missing_parameters=missing_params,
                    student_ids=sorted(set(s for lst in student_missing.values() for s in lst)),
                    reason=f"缺少参数: {', '.join(missing_params)}",
                )
        return gaps

    def run_batch(
        self,
        answers_by_problem: Dict[str, List[StudentAnswer]],
        aggregate_fn=None,
    ) -> BatchRunReport:
        batch_id = "batch_" + str(uuid.uuid4())[:6]
        report = BatchRunReport(batch_id=batch_id, total_problems=len(answers_by_problem), successful=0, failed=0, skipped=0)

        required_params = self._required_parameters(answers_by_problem)
        gaps = self._collect_missing(answers_by_problem, required_params)

        for pid, answers in answers_by_problem.items():
            student_ids = [a.student_id for a in answers]
            gap = gaps.get(pid)

            if gap and len(gap.missing_parameters):
                report.skipped += 1
                report.gaps.append(gap)
                continue

            try:
                if aggregate_fn:
                    merged = aggregate_fn(pid, answers)
                else:
                    merged = {}
                    for a in answers:
                        if a.coefficients:
                            merged.update(a.coefficients)

                if not merged:
                    report.skipped += 1
                    report.gaps.append(
                        ParameterGap(
                            problem_id=pid,
                            missing_parameters=required_params.get(pid, []),
                            student_ids=student_ids,
                            reason="聚合后系数为空，所有学生均无有效系数",
                        )
                    )
                    continue

                result = self.workflow.run_analysis(
                    problem_id=pid,
                    coefficients=merged,
                    student_ids=student_ids,
                )
                report.results.append(result)
                report.successful += 1

            except Exception as e:
                report.failed += 1
                report.gaps.append(
                    ParameterGap(
                        problem_id=pid,
                        missing_parameters=[],
                        student_ids=student_ids,
                        reason=f"处理异常: {type(e).__name__}: {e}",
                    )
                )

        report.finished_at = datetime.now()
        return report

    def format_report(self, report: BatchRunReport) -> str:
        lines = []
        lines.append("=" * 60)
        lines.append(f"批处理报告 [{report.batch_id}]")
        lines.append("=" * 60)
        lines.append(
            f"总计 {report.total_problems} 题 | 成功 {report.successful} | 跳过 {report.skipped} | 失败 {report.failed}"
        )
        lines.append(
            f"开始: {report.started_at.strftime('%H:%M:%S')}  结束: {report.finished_at.strftime('%H:%M:%S') if report.finished_at else '-'}"
        )
        lines.append("-" * 60)

        if report.results:
            lines.append("[已完成分析]")
            for r in report.results:
                lines.append(f"  • {r.problem_id}: {r.verdict.value}  (run={r.run_count})")

        if report.gaps:
            lines.append("-" * 60)
            lines.append("[参数缺口清单（请算法工程师补录）]")
            for g in report.gaps:
                lines.append(f"  ❌ 问题 {g.problem_id}")
                lines.append(f"     缺失参数: {', '.join(g.missing_parameters) or '无'}")
                lines.append(f"     涉及学生: {', '.join(g.student_ids[:5])}{' 等' if len(g.student_ids) > 5 else ''}")
                lines.append(f"     原因: {g.reason}")

        lines.append("=" * 60)
        return "\n".join(lines)

    def get_workflow(self) -> ReviewWorkflow:
        return self.workflow
