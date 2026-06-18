import csv
import os
from typing import List, Dict, Optional
from datetime import datetime

from .models import (
    SampleRecord,
    DuplicateInfo,
    ProcessTimelineEntry,
    ReviewSummary,
)
from .confirmation_analyzer import NeedsConfirmationItem


def ensure_dir(dir_path: str):
    os.makedirs(dir_path, exist_ok=True)


def export_sample_table(
    comparison: Dict[str, Dict],
    output_path: str,
) -> str:
    ensure_dir(os.path.dirname(output_path) if os.path.dirname(output_path) else ".")

    fieldnames = [
        "sample_id",
        "query",
        "expected_knowledge_id",
        "expected_knowledge_title",
        "raw_row",
        "source_sheet",
        "is_bad_data",
        "bad_data_reason",
        "old_model_score",
        "old_model_threshold",
        "old_model_hit",
        "new_model_score",
        "new_model_threshold",
        "new_model_hit",
        "score_delta",
        "threshold_changed",
        "hit_changed",
        "has_manual_review",
        "manual_judgment",
        "manual_reviewer",
        "manual_changed",
        "final_judgment",
        "judgment_source",
        "notes",
    ]

    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for sample_id, comp in sorted(comparison.items()):
            sample = comp["sample"]
            old_r = comp.get("old_result")
            new_r = comp.get("new_result")
            manual = comp.get("manual_review")

            row = {
                "sample_id": sample.sample_id,
                "query": sample.query,
                "expected_knowledge_id": sample.expected_knowledge_id,
                "expected_knowledge_title": sample.expected_knowledge_title,
                "raw_row": sample.raw_row_index or "",
                "source_sheet": sample.source_sheet or "",
                "is_bad_data": "是" if sample.is_bad_data else "否",
                "bad_data_reason": sample.bad_data_reason or "",
                "old_model_score": f"{old_r.confidence_score:.4f}" if old_r else "",
                "old_model_threshold": f"{old_r.threshold:.4f}" if old_r else "",
                "old_model_hit": "是" if comp["old_hit"] else "否",
                "new_model_score": f"{new_r.confidence_score:.4f}" if new_r else "",
                "new_model_threshold": f"{new_r.threshold:.4f}" if new_r else "",
                "new_model_hit": "是" if comp["new_hit"] else "否",
                "score_delta": f"{comp['score_delta']:.4f}" if comp.get("score_delta") is not None else "",
                "threshold_changed": "是" if comp["threshold_changed"] else "否",
                "hit_changed": "是" if comp["hit_changed"] else "否",
                "has_manual_review": "是" if manual else "否",
                "manual_judgment": manual.judgment.value if manual else "",
                "manual_reviewer": manual.reviewer if manual else "",
                "manual_changed": "是" if manual and manual.judgment != manual.original_judgment else "",
                "final_judgment": comp["final_judgment"].value if comp["final_judgment"] else "",
                "judgment_source": comp.get("judgment_source", ""),
                "notes": sample.notes or "",
            }
            writer.writerow(row)

    return output_path


def export_process_records(
    duplicates: List[DuplicateInfo],
    threshold_influenced: List[Dict],
    confirmation_items: List[NeedsConfirmationItem],
    output_path: str,
) -> str:
    ensure_dir(os.path.dirname(output_path) if os.path.dirname(output_path) else ".")

    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)

        writer.writerow(["=== 重复评测记录 ==="])
        writer.writerow([
            "sample_id", "重复次数", "是否有冲突", "冲突详情",
            "出现行号", "来源表", "备注",
        ])

        for dup in duplicates:
            rows = ", ".join(str(o.get("row_index", "")) for o in dup.occurrences)
            sheets = ", ".join(str(o.get("source_sheet", "")) for o in dup.occurrences)
            notes = "; ".join(o.get("notes", "") or "" for o in dup.occurrences)

            writer.writerow([
                dup.sample_id,
                dup.duplicate_count,
                "是" if dup.conflict_found else "否",
                dup.conflict_details or "",
                rows,
                sheets,
                notes,
            ])

        writer.writerow([])
        writer.writerow(["=== 阈值影响记录 ==="])
        writer.writerow([
            "sample_id", "旧阈值", "新阈值", "旧分数", "新分数",
            "旧是否过线", "新是否过线", "变化方向",
        ])

        for infl in threshold_influenced:
            writer.writerow([
                infl["sample_id"],
                f"{infl['old_threshold']:.4f}",
                f"{infl['new_threshold']:.4f}",
                f"{infl['old_score']:.4f}",
                f"{infl['new_score']:.4f}",
                "是" if infl["old_above"] else "否",
                "是" if infl["new_above"] else "否",
                "提上" if infl["direction"] == "promoted" else "压下",
            ])

        writer.writerow([])
        writer.writerow(["=== 待确认事项 ==="])
        writer.writerow([
            "sample_id", "待确认原因", "影响范围", "原始行号", "状态", "补充信息",
        ])

        for item in confirmation_items:
            extra = "; ".join(f"{k}={v}" for k, v in item.details.items())
            writer.writerow([
                item.sample_id,
                item.reason,
                item.impact_scope,
                ", ".join(str(r) for r in item.raw_rows),
                item.status.value,
                extra,
            ])

    return output_path


def export_timeline(
    timeline: List[ProcessTimelineEntry],
    output_path: str,
) -> str:
    ensure_dir(os.path.dirname(output_path) if os.path.dirname(output_path) else ".")

    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["时间", "事件类型", "描述", "关联样本", "元数据"])

        for entry in timeline:
            meta_str = "; ".join(f"{k}={v}" for k, v in entry.metadata.items())
            writer.writerow([
                entry.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                entry.event_type,
                entry.description,
                entry.sample_id or "",
                meta_str,
            ])

    return output_path


def export_summary_report(
    summary: ReviewSummary,
    metrics: Dict,
    confirmation_summary: Dict,
    output_path: str,
) -> str:
    ensure_dir(os.path.dirname(output_path) if os.path.dirname(output_path) else ".")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("知识库召回人工改判 - 汇总报告\n")
        f.write("=" * 50 + "\n\n")
        f.write(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

        f.write("一、样本概况\n")
        f.write(f"  总样本数: {summary.total_samples}\n")
        f.write(f"  去重后样本数: {summary.unique_samples}\n")
        f.write(f"  重复样本数: {summary.duplicate_count}\n")
        f.write(f"  坏数据数: {summary.bad_data_count}\n\n")

        f.write("二、模型指标\n")
        f.write(f"  旧模型命中率: {metrics.get('old_hit_rate', 0):.2%} ({metrics.get('old_hits', 0)}/{metrics.get('total', 0)})\n")
        f.write(f"  新模型命中率: {metrics.get('new_hit_rate', 0):.2%} ({metrics.get('new_hits', 0)}/{metrics.get('total', 0)})\n")
        f.write(f"  命中率变化: {metrics.get('new_hit_rate', 0) - metrics.get('old_hit_rate', 0):+.2%}\n\n")

        f.write("三、人工改判\n")
        f.write(f"  人工改判总数: {metrics.get('manual_total', 0)}\n")
        f.write(f"  其中人工修正数: {summary.manual_changed_count}\n")
        f.write(f"  阈值变化影响数: {summary.threshold_changed_count}\n")
        f.write(f"  人工判断正确率: {metrics.get('manual_correct_rate', 0):.2%}\n\n")

        f.write("四、待确认事项\n")
        f.write(f"  待确认条目数: {confirmation_summary.get('total_items', 0)}\n")
        f.write(f"  涉及样本数: {confirmation_summary.get('unique_samples', 0)}\n")
        f.write("\n  按原因分类:\n")
        for reason, cnt in confirmation_summary.get("by_reason", {}).items():
            f.write(f"    - {reason}: {cnt}条\n")

        f.write("\n五、交付清单\n")
        f.write("  1. sample_table.csv - 样本总表（含模型结果、人工改判、最终判断）\n")
        f.write("  2. process_records.csv - 处理记录（重复、阈值影响、待确认）\n")
        f.write("  3. timeline.csv - 历史时间线\n")
        f.write("  4. summary_report.txt - 本汇总报告\n\n")

        f.write("说明: 样本、阈值、人工修正、指标变化已分开标注，\n")
        f.write("      人工判断优先于阈值变化，坏数据已单独标记。\n")

    return output_path


def export_all(
    output_dir: str,
    comparison: Dict[str, Dict],
    duplicates: List[DuplicateInfo],
    threshold_influenced: List[Dict],
    confirmation_items: List[NeedsConfirmationItem],
    timeline: List[ProcessTimelineEntry],
    summary: ReviewSummary,
    metrics: Dict,
    confirmation_summary: Dict,
) -> Dict[str, str]:
    ensure_dir(output_dir)

    paths = {}

    paths["sample_table"] = export_sample_table(
        comparison, os.path.join(output_dir, "sample_table.csv")
    )
    paths["process_records"] = export_process_records(
        duplicates, threshold_influenced, confirmation_items,
        os.path.join(output_dir, "process_records.csv")
    )
    paths["timeline"] = export_timeline(
        timeline, os.path.join(output_dir, "timeline.csv")
    )
    paths["summary_report"] = export_summary_report(
        summary, metrics, confirmation_summary,
        os.path.join(output_dir, "summary_report.txt")
    )

    return paths
