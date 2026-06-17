"""命令行入口 - 问答样本去模板化工具."""

import argparse
import json
import os
import sys

from .workflow import WorkflowManager
from .report_exporter import ReportExporter
from .demo_data import generate_demo_samples, generate_incremental_samples, save_demo_samples


def cmd_run(args):
    wf = WorkflowManager(version_tag=args.version)
    if args.input:
        wf.load_samples_from_json(args.input)
    else:
        samples = generate_demo_samples()
        wf.load_samples(samples)
    if args.version != "v1":
        wf.create_version(
            version_tag=args.version,
            description=args.version_desc or "",
            change_log=args.change_log or [],
        )
    print(f"[去模板化] 正在处理 {len(wf.samples)} 条样本...")
    report = wf.run_full_workflow()
    print(f"  模板化清理：{report.template_removed_count} 条")
    print(f"  重复样本：{len(report.dedup_records)} 条")
    print(f"  训练验证泄漏：{len(report.leak_records)} 条")
    print(f"  可用样本：{report.total_usable} / {report.total_processed}")
    output_dir = args.output or "./output"
    exporter = ReportExporter(report)
    paths = exporter.export_for_training_team(output_dir, filename_prefix=f"qa_{args.version}")
    print(f"\n[导出完成] 训练组专用报告已生成：")
    for fmt, path in paths.items():
        print(f"  {fmt}: {path}")
    return 0


def cmd_incremental(args):
    wf = WorkflowManager(version_tag=args.base_version)
    if args.base_input:
        wf.load_samples_from_json(args.base_input)
    else:
        wf.load_samples(generate_demo_samples())
    wf.run_full_workflow()
    print(f"[基线版本] 已加载 {len(wf.samples)} 条基线样本")
    if args.incremental_input:
        with open(args.incremental_input, "r", encoding="utf-8") as f:
            from .models import QASample
            inc_data = json.load(f)
            inc_samples = [QASample.from_dict(d) for d in inc_data]
    else:
        inc_samples = generate_incremental_samples()
    print(f"[增量更新] 正在补录 {len(inc_samples)} 条新样本...")
    report = wf.run_incremental_workflow(inc_samples)
    print(f"  新样本中模板化清理：{report.template_removed_count} 条")
    print(f"  新样本中重复检测：{len(report.dedup_records)} 条（安全拦截已自动更新）")
    print(f"  新样本中训练验证泄漏：{len(report.leak_records)} 条")
    output_dir = args.output or "./output"
    exporter = ReportExporter(report)
    paths = exporter.export_for_training_team(output_dir, filename_prefix=f"qa_{args.new_version}_incremental")
    print(f"\n[导出完成] 增量报告已生成：")
    for fmt, path in paths.items():
        print(f"  {fmt}: {path}")
    if args.merged_output:
        wf.save_samples_to_json(args.merged_output)
        print(f"[合并保存] 合并后样本已保存到：{args.merged_output}")
    return 0


def cmd_demo(args):
    output_dir = args.output or "./output"
    demo_path = os.path.join(output_dir, "demo_samples.json")
    save_demo_samples(demo_path)
    print(f"[示例数据] 已生成：{demo_path}")
    print(f"  包含 {len(generate_demo_samples())} 条样本，覆盖以下场景：")
    print(f"  - 带问候语/礼貌语模板的问答（可被去模板化）")
    print(f"  - 训练集与验证集重复的泄漏样本（可被泄漏检测拦截）")
    print(f"  - 内容完全相同的重复样本（可被去重移除）")
    print(f"  - 带人工备注的样本（备注原话保留）")
    if args.run:
        sys.argv = [sys.argv[0], "run", "--output", output_dir]
        main()
    return 0


def cmd_report(args):
    if not args.json_input:
        print("错误：请指定 --json-input 参数")
        return 1
    from .models import WorkflowReport
    with open(args.json_input, "r", encoding="utf-8") as f:
        data = json.load(f)
    from .models import LeakRecord, DedupRecord, GroupMetrics
    report = WorkflowReport(
        report_id=data.get("report_id", ""),
        generated_at=data.get("generated_at", ""),
        version_tag=data.get("version_tag", "v1"),
        total_processed=data.get("total_processed", 0),
        total_usable=data.get("total_usable", 0),
        total_blocked=data.get("total_blocked", 0),
        template_removed_count=data.get("template_removed_count", 0),
        blocked_sample_ids=data.get("blocked_sample_ids", []),
        usable_sample_ids=data.get("usable_sample_ids", []),
        export_summary=data.get("export_summary", ""),
    )
    for gm in data.get("group_metrics", []):
        report.group_metrics.append(GroupMetrics(**gm))
    from .models import IssueType, IssueSeverity
    for lr in data.get("leak_records", []):
        lr["issue_type"] = IssueType(lr.get("issue_type", "train_val_leak"))
        lr["severity"] = IssueSeverity(lr.get("severity", "blocker"))
        report.leak_records.append(LeakRecord(**lr))
    for dr in data.get("dedup_records", []):
        dr["issue_type"] = IssueType(dr.get("issue_type", "duplicate"))
        dr["severity"] = IssueSeverity(dr.get("severity", "warning"))
        report.dedup_records.append(DedupRecord(**dr))
    exporter = ReportExporter(report)
    text = exporter.export_text_report()
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"[文本报告] 已生成：{args.output}")
    else:
        print(text)
    return 0


def main():
    parser = argparse.ArgumentParser(
        prog="qa-dedup",
        description="问答样本去模板化工具 - AI/ML 工作流工具",
    )
    subparsers = parser.add_subparsers(dest="command", help="子命令")

    p_run = subparsers.add_parser("run", help="运行完整工作流")
    p_run.add_argument("--input", "-i", help="输入样本 JSON 文件路径")
    p_run.add_argument("--output", "-o", help="输出目录（默认 ./output）")
    p_run.add_argument("--version", "-v", default="v1", help="版本标签（默认 v1）")
    p_run.add_argument("--version-desc", help="版本描述")
    p_run.add_argument("--change-log", nargs="*", help="变更日志条目")
    p_run.set_defaults(func=cmd_run)

    p_inc = subparsers.add_parser("incremental", help="增量更新（评测题库补录）")
    p_inc.add_argument("--base-input", help="基线样本 JSON 文件路径")
    p_inc.add_argument("--incremental-input", help="新增补录样本 JSON 文件路径")
    p_inc.add_argument("--output", "-o", help="输出目录（默认 ./output）")
    p_inc.add_argument("--base-version", default="v1", help="基线版本标签")
    p_inc.add_argument("--new-version", default="v2", help="新版本标签")
    p_inc.add_argument("--merged-output", help="合并后样本的输出路径")
    p_inc.set_defaults(func=cmd_incremental)

    p_demo = subparsers.add_parser("demo", help="生成示例数据并可选运行")
    p_demo.add_argument("--output", "-o", help="输出目录（默认 ./output）")
    p_demo.add_argument("--run", action="store_true", help="生成示例数据后立即运行工作流")
    p_demo.set_defaults(func=cmd_demo)

    p_rep = subparsers.add_parser("report", help="从 JSON 报告重新导出训练组文本报告")
    p_rep.add_argument("--json-input", required=True, help="已有的 JSON 报告路径")
    p_rep.add_argument("--output", "-o", help="输出文本文件路径，不指定则打印到终端")
    p_rep.set_defaults(func=cmd_report)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        return 0
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
