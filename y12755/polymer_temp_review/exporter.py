from __future__ import annotations

import json
import csv
from datetime import datetime
from pathlib import Path
from typing import Dict, List

import pandas as pd

from .models import (
    BatchReport,
    BatchReviewResult,
    ConclusionStatus,
    ConsistencyStatus,
    ReviewSummary,
)


def build_summary(results: List[BatchReviewResult], missing_inputs: List[str]) -> ReviewSummary:
    """
    根据每个批次的复盘结果生成总览摘要。
    注意：此摘要就是终端输出和导出文件使用同一份数据，保证二者对得上。
    """
    total = len(results)
    direct_use = sum(1 for r in results if r.conclusion_status == ConclusionStatus.DIRECT_USE)
    needs_review = total - direct_use
    consistent = sum(1 for r in results if r.consistency_status == ConsistencyStatus.CONSISTENT)
    inconsistent = total - consistent
    retest = sum(1 for r in results if r.retest.need_retest)

    return ReviewSummary(
        total_batches=total,
        direct_use_count=direct_use,
        needs_review_count=needs_review,
        consistent_count=consistent,
        inconsistent_count=inconsistent,
        retest_count=retest,
        missing_inputs=missing_inputs,
        generated_at=datetime.now(),
    )


def _status_label(status: ConclusionStatus) -> str:
    return "可直接用" if status == ConclusionStatus.DIRECT_USE else "需复核"


def _consistency_label(status: ConsistencyStatus) -> str:
    if status == ConsistencyStatus.CONSISTENT:
        return "一致"
    if status == ConsistencyStatus.INCONSISTENT:
        return "不一致"
    return "未知"


def export_results(
    output_dir: Path,
    results: List[BatchReviewResult],
    summary: ReviewSummary,
    current_reports: List[BatchReport],
) -> Dict[str, Path]:
    """
    导出复盘结果到输出目录，包括：
    - review_summary.json —— 与终端摘要一致的结构化数据
    - batch_results.csv  —— 质检主管可打开查看的明细
    - batch_results.json —— 完整结构化明细（JSON）
    - run_manifest.json —— 本次运行的清单（保证下次运行时读取，用于幂等和变更检测）

    返回写入的文件路径字典。
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    written: Dict[str, Path] = {}

    summary_path = output_dir / "review_summary.json"
    summary_path.write_text(
        json.dumps(summary.model_dump(mode="json"), ensure_ascii=False, indent=2)
    )
    written["summary"] = summary_path

    rows = []
    for r in results:
        rows.append({
            "批次编号": r.batch_id,
            "结论状态": _status_label(r.conclusion_status),
            "条件结论一致性": _consistency_label(r.consistency_status),
            "建议复测": "是" if r.retest.need_retest else "否",
            "复测原因": "；".join(rr.value for rr in r.retest.reasons),
            "复测说明": r.retest.description,
            "反应条件是否变更": "是" if r.condition_changed else "否",
            "结论是否需要更新": "是" if r.conclusion_needs_update else "否",
            "换算后浓度": (
                f"{r.concentration_normalized.value:.4f} {r.concentration_normalized.unit}"
                if r.concentration_normalized else ""
            ),
            "缺失称量单": "；".join(r.trace.missing_weighing_record_ids) or "无",
            "问题": "；".join(r.issues) or "无",
            "警告": "；".join(r.warnings) or "无",
            "复盘时间": r.review_time.isoformat(),
        })

    csv_path = output_dir / "batch_results.csv"
    if rows:
        df = pd.DataFrame(rows)
        df.to_csv(csv_path, index=False, encoding="utf-8-sig", quoting=csv.QUOTE_MINIMAL)
    else:
        csv_path.write_text("没有可导出的批次数据\n", encoding="utf-8")
    written["csv"] = csv_path

    json_path = output_dir / "batch_results.json"
    json_path.write_text(
        json.dumps(
            [r.model_dump(mode="json") for r in results],
            ensure_ascii=False,
            indent=2,
        )
    )
    written["json"] = json_path

    manifest_path = output_dir / "run_manifest.json"
    report_map = {rpt.batch_id: rpt.model_dump(mode="json") for rpt in current_reports}
    manifest_path.write_text(
        json.dumps({
            "run_time": datetime.now().isoformat(),
            "last_reports": report_map,
            "summary": summary.model_dump(mode="json"),
        }, ensure_ascii=False, indent=2)
    )
    written["manifest"] = manifest_path

    return written


def build_terminal_summary_text(summary: ReviewSummary) -> str:
    """生成与 review_summary.json 内容一致的终端摘要，给质检主管快速浏览。
    保证终端看到的结论与导出文件一致：不会出现"页面说通过、文件里又写待确认。
    """
    lines = []
    lines.append("=" * 60)
    lines.append("聚合反应温控复盘 —— 总览摘要")
    lines.append("=" * 60)
    lines.append(f"复盘批次总数:     {summary.total_batches}")
    lines.append(f"可直接使用:       {summary.direct_use_count} 批次")
    lines.append(f"需药化研究员复核: {summary.needs_review_count} 批次")
    lines.append(f"条件结论一致:     {summary.consistent_count} 批次")
    lines.append(f"条件结论不一致:   {summary.inconsistent_count} 批次")
    lines.append(f"建议复测:       {summary.retest_count} 批次")
    if summary.missing_inputs:
        lines.append("")
        lines.append("缺失输入:")
        for m in summary.missing_inputs:
            lines.append(f"  ! {m}")
    lines.append("")
    lines.append(f"生成时间: {summary.generated_at.strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("=" * 60)
    return "\n".join(lines)


def build_terminal_details(results: List[BatchReviewResult]) -> str:
    """生成每个批次的终端详情，带状态标记。"""
    if not results:
        return "没有可展示的批次复盘结果。"

    lines = []
    lines.append("批次详情:")
    lines.append("-" * 60)
    for r in results:
        status = _status_label(r.conclusion_status)
        flag = "✅" if r.conclusion_status == ConclusionStatus.DIRECT_USE else "⚠️"
        lines.append(f"{flag} [{status} 批次 {r.batch_id}")
        lines.append(f"    条件结论一致性: {_consistency_label(r.consistency_status)}")
        lines.append(f"    建议复测: {'是' if r.retest.need_retest else '否'}")
        if r.retest.need_retest:
            lines.append(f"    复测说明: {r.retest.description}")
        if r.conclusion_needs_update:
            lines.append("    ⚠️ 结论建议药化研究员：该批次报告已变更，结论需要同步更新结论")
        if r.trace.missing_weighing_record_ids:
            lines.append(
                "    缺少称量单: " + "；".join(r.trace.missing_weighing_record_ids)
            )
        if r.issues:
            for issue in r.issues:
                lines.append(f"    问题: {issue}")
        lines.append("")
    return "\n".join(lines)
