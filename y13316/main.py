#!/usr/bin/env python3
import json
import os
from datetime import datetime
from typing import Dict, Any

from models import ReportData, JudgmentStatus, ChangeType
from engine import build_report_data, generate_detail_rows, apply_filters, calculate_statistics
from detectors import ThresholdDriftDetector, LateAttachmentLinker, BadDataDetector
from report_generator import MarkdownReportGenerator
from demo_data import generate_demo_data, generate_historical_outputs


def run_gray_comparison(filter_conditions: Dict[str, Any] = None) -> ReportData:
    if filter_conditions is None:
        filter_conditions = {}

    print("=" * 60)
    print("🏭 工业视觉灰度对比系统启动")
    print("=" * 60)
    print()

    print("📦 步骤1: 加载演示数据...")
    (
        samples,
        model_outputs,
        threshold_configs,
        manual_judgments,
        attachments,
        baseline_judgments,
        sample_product_line_map,
        sample_category_map,
        sample_capture_times,
        judgment_times,
    ) = generate_demo_data()
    historical_outputs, hist_pl_map, hist_cat_map = generate_historical_outputs()

    combined_pl_map = {**sample_product_line_map, **hist_pl_map}
    combined_cat_map = {**sample_category_map, **hist_cat_map}

    print(f"   - 样本数: {len(samples)}")
    print(f"   - 模型输出数: {len(model_outputs)}")
    print(f"   - 阈值配置数: {len(threshold_configs)}")
    print(f"   - 人工改判数: {len(manual_judgments)}")
    print(f"   - 附件数: {len(attachments)}")
    print(f"   - 历史模型输出数: {len(historical_outputs)}")
    print()

    print("🔍 步骤2: 检测坏数据...")
    bad_data_detector = BadDataDetector()
    bad_data_records = bad_data_detector.detect_bad_data(model_outputs, min_confidence=0.5)
    print(f"   - 检测到 {len(bad_data_records)} 条坏数据记录")
    for bd in bad_data_records:
        severity_icon = "🔴" if bd.severity == "error" else "🟡"
        print(f"     {severity_icon} [{bd.sample_id}] 行{bd.model_output_line}: {bd.issue_type}")
    print()

    print("📏 步骤3: 检测阈值漂移...")
    drift_detector = ThresholdDriftDetector(
        drift_sensitivity=0.15,
        min_samples_for_drift=5,
        lookback_window_hours=24,
    )
    drift_records = drift_detector.detect_drifts(
        model_outputs,
        historical_outputs,
        threshold_configs,
        combined_pl_map,
        combined_cat_map,
    )
    print(f"   - 检测到 {len(drift_records)} 条阈值漂移记录")
    for drift in drift_records[:3]:
        print(f"     ⚠️  [{drift.sample_id}] {drift.product_line}/{drift.category} "
              f"漂移幅度: {drift.drift_magnitude:.4f} 需确认: {drift.needs_operation_confirm}")
    if len(drift_records) > 3:
        print(f"     ... 还有 {len(drift_records) - 3} 条")
    print()

    print("📎 步骤4: 识别晚到附件...")
    attachment_linker = LateAttachmentLinker(late_arrival_window_hours=48)
    late_attachments = attachment_linker.identify_late_attachments(
        attachments,
        sample_capture_times,
        judgment_times,
    )
    print(f"   - 识别到 {len(late_attachments)} 个晚到附件")
    for att in late_attachments:
        print(f"     📎 [{att.attachment_id}] -> 样本 {att.sample_id}: {att.description}")
    print()

    print("📊 步骤5: 构建统一报告数据...")
    print(f"   - 筛选条件: {filter_conditions if filter_conditions else '无'}")
    report_data = build_report_data(
        samples=samples,
        model_outputs=model_outputs,
        threshold_configs=threshold_configs,
        manual_judgments=manual_judgments,
        attachments=attachments,
        baseline_judgments=baseline_judgments,
        filter_conditions=filter_conditions,
        threshold_drifts=drift_records,
        bad_data_records=bad_data_records,
    )
    print(f"   - 过滤后样本数: {len(report_data.items)} / {len(samples)}")
    print(f"   - 统计指标数: {len(report_data.statistics)}")
    print(f"   - 挂起样本数: {report_data.statistics.get('suspended_count', 0)}")
    print()

    return report_data


def export_json(report_data: ReportData, output_path: str):
    data = {
        "generated_at": report_data.generated_at.isoformat(),
        "filter_conditions": report_data.filter_conditions,
        "statistics": report_data.statistics,
        "threshold_drifts": [
            {
                "sample_id": d.sample_id,
                "product_line": d.product_line,
                "category": d.category,
                "drift_magnitude": d.drift_magnitude,
                "needs_operation_confirm": d.needs_operation_confirm,
            }
            for d in report_data.threshold_drifts
        ],
        "bad_data_records": [
            {
                "sample_id": b.sample_id,
                "issue_type": b.issue_type,
                "severity": b.severity,
                "model_output_line": b.model_output_line,
                "model_object_ref": b.model_object_ref,
                "description": b.description,
            }
            for b in report_data.bad_data_records
        ],
        "late_attachments": [
            {
                "attachment_id": a.attachment_id,
                "sample_id": a.sample_id,
                "file_type": a.file_type,
                "is_late_arrival": a.is_late_arrival,
                "description": a.description,
            }
            for a in report_data.late_attachments
        ],
        "detail_rows": generate_detail_rows(report_data.items),
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ JSON数据已导出: {output_path}")


def export_markdown(report_data: ReportData, output_path: str):
    generator = MarkdownReportGenerator()
    md_content = generator.generate(report_data)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"✅ Markdown报告已生成: {output_path}")
    return md_content


def print_summary(report_data: ReportData):
    print()
    print("=" * 60)
    print("📋 运行摘要")
    print("=" * 60)
    print()

    stats = report_data.statistics
    print(f"总样本数: {stats['total_count']}")
    print(f"通过率: {stats['pass_rate'] * 100:.2f}% ({stats['pass_count']}/{stats['total_count']})")
    print(f"失败率: {stats['fail_rate'] * 100:.2f}% ({stats['fail_count']}/{stats['total_count']})")
    print(f"挂起数: {stats['suspended_count']} (需运营主管确认)")
    print()

    print(f"样本变化: {stats['sample_changed_count']} 条")
    print(f"阈值变化: {stats['threshold_changed_count']} 条")
    print(f"人工改判: {stats['manual_revised_count']} 条")
    print(f"晚到附件: {stats['late_attachment_count']} 条")
    print(f"阈值漂移: {stats['threshold_drift_count']} 条")
    print(f"坏数据: {stats['bad_data_count']} 条")
    print()

    pass_diff = stats['pass_count_difference']
    rate_diff = stats['pass_rate_difference'] * 100
    diff_symbol = "↑" if pass_diff > 0 else "↓" if pass_diff < 0 else "→"
    print(f"通过率变化: {diff_symbol} {abs(pass_diff)} 条 ({rate_diff:+.2f}%)")
    print()

    if stats['suspended_count'] > 0:
        print("⚠️  重要提示: 有样本因阈值漂移挂起，未给出假稳定结论")
        print("   请运营主管及时审核挂起样本！")
        print()


def main():
    output_dir = "/Users/mac/pro/solo/workspaces/y13316/output"
    os.makedirs(output_dir, exist_ok=True)

    filter_conditions = {
    }

    report_data = run_gray_comparison(filter_conditions)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    json_path = os.path.join(output_dir, f"gray_comparison_{timestamp}.json")
    md_path = os.path.join(output_dir, f"gray_comparison_{timestamp}.md")

    export_json(report_data, json_path)
    md_content = export_markdown(report_data, md_path)

    print_summary(report_data)

    print("=" * 60)
    print("✅ 工业视觉灰度对比完成")
    print("=" * 60)
    print()
    print("📁 输出文件:")
    print(f"   - JSON数据: {json_path}")
    print(f"   - Markdown报告: {md_path}")
    print()

    print("📝 报告摘要预览:")
    print("-" * 60)
    preview_lines = md_content.split("\n")[:30]
    for line in preview_lines:
        print(f"  {line}")
    if len(md_content.split("\n")) > 30:
        print("  ...")
    print("-" * 60)

    return report_data


if __name__ == "__main__":
    main()
