#!/usr/bin/env python3
"""
配乐情绪标签审计工具
用法:
    python audit.py --materials sample_data/materials.json \
                    --usages sample_data/usages.json \
                    --reports sample_data/reports.json \
                    --output output/
"""

import argparse
import sys
import json
from pathlib import Path
from collections import defaultdict

from models import IssueType, Severity
from importer import import_all
from checker import AuditChecker
from tag_merger import TagMerger
from reporter import AuditReporter


def print_banner():
    banner = """
╔══════════════════════════════════════════════════════════════╗
║                  配乐情绪标签审计工具                          ║
║           Soundtrack Mood Tag Audit Tool                     ║
╚══════════════════════════════════════════════════════════════╝
    """
    print(banner)


def print_statistics(dataset, issues):
    print("┌─ 审计数据统计")
    print(f"│ 音频素材: {len(dataset.materials)} 个")
    print(f"│ 项目用途: {len(dataset.usages)} 个")
    print(f"│ 审计报告: {len(dataset.reports)} 份")
    print(f"│ 标签相似关系: {len(dataset.tag_similarities)} 条")
    print(f"│ 归并反馈记录: {len(dataset.merge_feedbacks)} 条")
    print("│")

    by_type = defaultdict(lambda: defaultdict(int))
    by_severity = defaultdict(int)
    for issue in issues:
        by_type[issue.issue_type.value][issue.severity.value] += 1
        by_severity[issue.severity.value] += 1

    print("│ 问题汇总:")
    type_labels = {
        "tag_conflict": "标签冲突",
        "material_duplicate": "素材重复",
        "usage_mismatch": "用途错配",
        "merge_anomaly": "归并异常",
    }
    sev_labels = {"critical": "严重", "warning": "警告", "info": "提示"}

    for t_key, t_label in type_labels.items():
        sev_data = by_type.get(t_key, {})
        total = sum(sev_data.values())
        if total > 0:
            parts = []
            for s_key, s_label in sev_labels.items():
                cnt = sev_data.get(s_key, 0)
                if cnt > 0:
                    parts.append(f"{s_label}={cnt}")
            print(f"│   {t_label}: {total} 个 ({', '.join(parts)})")

    print("│")
    print(f"│ 总计: {len(issues)} 个问题")
    print(f"│   严重: {by_severity.get('critical', 0)}, 警告: {by_severity.get('warning', 0)}, 提示: {by_severity.get('info', 0)}")
    print("└────────────────────────────────────────")
    print()


def print_issue_details(issues, limit=3):
    if not issues:
        return

    print("┌─ 问题详情预览")
    critical_issues = [i for i in issues if i.severity == Severity.CRITICAL]
    warning_issues = [i for i in issues if i.severity == Severity.WARNING]

    display_issues = critical_issues[:2] + warning_issues[:1]

    for idx, issue in enumerate(display_issues[:limit], 1):
        sev_marker = "🔴" if issue.severity == Severity.CRITICAL else "🟡" if issue.severity == Severity.WARNING else "🔵"
        type_label = {
            "tag_conflict": "标签冲突",
            "material_duplicate": "素材重复",
            "usage_mismatch": "用途错配",
            "merge_anomaly": "归并异常",
        }.get(issue.issue_type.value, issue.issue_type.value)

        print(f"│ {idx}. {sev_marker} [{type_label}] {issue.title}")
        print(f"│    描述: {issue.description}")
        if issue.related_materials:
            print(f"│    相关素材: {', '.join(issue.related_materials[:3])}")
        if issue.related_usages:
            print(f"│    相关用途: {', '.join(issue.related_usages[:3])}")
        print("│")
        print("│    证据:")
        evidence_preview = list(issue.evidence.items())[:3]
        for k, v in evidence_preview:
            if isinstance(v, list):
                v_str = ", ".join(map(str, v[:5]))
                if len(v) > 5:
                    v_str += "..."
            elif isinstance(v, dict):
                v_str = json.dumps(v, ensure_ascii=False)[:50] + "..."
            else:
                v_str = str(v)[:80]
            print(f"│      {k}: {v_str}")
        print("│")
        print("│    处理建议:")
        for sug in issue.suggestions[:2]:
            print(f"│      - {sug}")
        if len(issue.suggestions) > 2:
            print(f"│      ... (还有 {len(issue.suggestions) - 2} 条建议)")
        print("│")

    if len(issues) > limit:
        print(f"│  ... (还有 {len(issues) - limit} 个问题，详见导出报告)")
    print("└────────────────────────────────────────")
    print()


def print_merge_preview(merger, dataset):
    print("┌─ 标签归并预览")
    unmerged = [m for m in dataset.materials.values() if not m.merged_tags]
    if unmerged:
        print(f"│ 待归并素材: {len(unmerged)} 个")
        for mat in unmerged[:3]:
            suggested, sims = merger.suggest_merge(mat)
            print(f"│   {mat.material_id} [{mat.title}]")
            print(f"│     现有标签: {sorted(mat.all_tags())}")
            print(f"│     建议归并: {suggested}")
            if sims:
                sim_parts = [f"{s.tag_a}↔{s.tag_b}({s.similarity_score:.0%})" for s in sims[:3]]
                print(f"│     相似依据: {', '.join(sim_parts)}")
            print("│")
    else:
        print("│ 所有素材均已完成归并")
    print("└────────────────────────────────────────")
    print()


def main():
    parser = argparse.ArgumentParser(description="配乐情绪标签审计工具")
    parser.add_argument("--materials", required=True, help="音频素材文件路径 (JSON/CSV)")
    parser.add_argument("--usages", required=True, help="项目用途文件路径 (JSON/CSV)")
    parser.add_argument("--reports", required=True, help="审计报告文件路径 (JSON/CSV)")
    parser.add_argument("--output", default="output/", help="输出目录 (默认: output/)")
    parser.add_argument("--apply-merge", action="store_true", help="实际执行标签归并 (默认仅预览)")
    parser.add_argument("--similarity-threshold", type=float, default=0.6, help="标签相似度阈值 (默认: 0.6)")
    parser.add_argument("--verbose", "-v", action="store_true", help="显示详细输出")

    args = parser.parse_args()

    print_banner()

    try:
        print("▶ 步骤 1/5: 导入数据...")
        dataset = import_all(args.materials, args.usages, args.reports)
        print(f"  ✓ 成功导入 {len(dataset.materials)} 个素材, "
              f"{len(dataset.usages)} 个用途, "
              f"{len(dataset.reports)} 份报告")
        print()

        print("▶ 步骤 2/5: 构建标签相似关系...")
        merger = TagMerger(dataset)
        if args.similarity_threshold != 0.6:
            merger.rebuild_similarities(args.similarity_threshold)
        print(f"  ✓ 发现 {len(dataset.tag_similarities)} 条标签相似关系")
        print()

        print("▶ 步骤 3/5: 执行问题检查...")
        checker = AuditChecker(dataset)
        issues = checker.check_all()
        merge_anomalies = merger.check_merge_anomalies()
        issues.extend(merge_anomalies)
        dataset.issues = issues
        print(f"  ✓ 发现 {len(issues)} 个问题")
        print()

        print("▶ 步骤 4/5: 标签归并处理...")
        if args.apply_merge:
            print("  正在应用归并 (非预览模式)...")
            merge_results = []
            for mat in dataset.materials.values():
                result = merger.apply_merge(mat, dry_run=False)
                if result["applied"]:
                    merge_results.append(result)
            print(f"  ✓ 已对 {len(merge_results)} 个素材应用归并")
        else:
            print("  预览模式，未实际应用归并")
        print()

        print("▶ 步骤 5/5: 导出审计报告...")
        output_dir = Path(args.output)
        output_dir.mkdir(parents=True, exist_ok=True)

        reporter = AuditReporter(dataset)

        issue_json_path = reporter.export_issue_list_json(
            output_dir / "issues.json"
        )
        print(f"  ✓ 问题清单 (JSON): {issue_json_path}")

        issue_csv_path = reporter.export_issue_list_csv(
            output_dir / "issues.csv"
        )
        print(f"  ✓ 问题清单 (CSV): {issue_csv_path}")

        report_md_path = reporter.export_audit_report_markdown(
            output_dir / "audit_report.md"
        )
        print(f"  ✓ 审计报告 (Markdown): {report_md_path}")

        full_data_path = reporter.export_full_dataset(
            output_dir / "full_dataset.json"
        )
        print(f"  ✓ 完整数据导出: {full_data_path}")
        print()

        print("════════════════════════════════════════")
        print("              审计完成")
        print("════════════════════════════════════════")
        print()

        print_statistics(dataset, issues)

        if args.verbose:
            print_issue_details(issues)
            print_merge_preview(merger, dataset)

        print("💡 提示: 请查看导出的审计报告获取完整问题详情和处理建议")
        print(f"   主要报告: {report_md_path}")

        return 0

    except FileNotFoundError as e:
        print(f"❌ 文件错误: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"❌ 执行错误: {e}", file=sys.stderr)
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 2


if __name__ == "__main__":
    sys.exit(main())
