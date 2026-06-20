"""命令行入口"""
import sys
import argparse
from .core import ModelCompressSnapshot


def main():
    parser = argparse.ArgumentParser(
        description="模型压缩版本快照 (Model Compress Snapshot)"
    )
    subparsers = parser.add_subparsers(dest="command", help="子命令")

    # import
    p_import = subparsers.add_parser("import", help="导入样本")
    p_import.add_argument("file", help="文件路径")
    p_import.add_argument("--model-version", "-m", required=True, help="模型版本")
    p_import.add_argument("--source", "-s", help="来源名称")
    p_import.add_argument("--data-dir", default="./data", help="数据目录")

    # snapshot
    p_snap = subparsers.add_parser("snapshot", help="创建快照")
    p_snap.add_argument("name", help="快照名称")
    p_snap.add_argument("--model-version", "-m", required=True)
    p_snap.add_argument("--description", "-d", default="")
    p_snap.add_argument("--created-by", default="")
    p_snap.add_argument("--parent", default=None, help="父快照ID")
    p_snap.add_argument("--data-dir", default="./data")

    # correct
    p_corr = subparsers.add_parser("correct", help="人工修正")
    p_corr.add_argument("sample_id", help="样本ID")
    p_corr.add_argument("new_label", help="新标签")
    p_corr.add_argument("--operator", "-o", default="", help="操作人")
    p_corr.add_argument("--reason", "-r", default="", help="修正理由")
    p_corr.add_argument("--data-dir", default="./data")

    # report
    p_report = subparsers.add_parser("report", help="生成报告")
    p_report.add_argument("snapshot_id", help="快照ID")
    p_report.add_argument("--diff", default=None, help="对比的旧快照ID")
    p_report.add_argument("--title", default=None)
    p_report.add_argument("--data-dir", default="./data")

    # list
    p_list = subparsers.add_parser("list", help="列出资源")
    p_list.add_argument("type", choices=["samples", "snapshots", "reports", "raw"])
    p_list.add_argument("--data-dir", default="./data")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    mcs = ModelCompressSnapshot(args.data_dir)

    if args.command == "import":
        samples = mcs.import_file(args.file, args.model_version, args.source)
        print(f"导入成功，共 {len(samples)} 条样本")
        for s in samples[:5]:
            print(f"  - {s.sample_id}: {s.predicted_label} (conf={s.confidence:.3f})")
        if len(samples) > 5:
            print(f"  ... 还有 {len(samples)-5} 条")

    elif args.command == "snapshot":
        snap = mcs.create_snapshot(
            args.name, args.model_version, args.description,
            args.created_by, args.parent
        )
        print(f"快照创建成功: {snap.snapshot_id}")
        print(f"  名称: {snap.snapshot_name}")
        print(f"  样本数: {snap.summary.get('total_samples', 0)}")
        print(f"  误判数: {snap.summary.get('misjudged_count', 0)}")

    elif args.command == "correct":
        corr = mcs.correct_sample(
            args.sample_id, args.new_label, args.operator, args.reason
        )
        if corr:
            print(f"修正成功: {corr.correction_id}")
            print(f"  {corr.before_label} → {corr.after_label}")
            print(f"  理由: {corr.reason}")
        else:
            print(f"样本不存在: {args.sample_id}")

    elif args.command == "report":
        if args.diff:
            report = mcs.generate_diff_report(
                args.snapshot_id, args.diff, args.title
            )
            print(f"对比报告生成: {report.file_path}")
        else:
            report = mcs.generate_report(args.snapshot_id, args.title)
            print(f"报告生成: {report.file_path}")

    elif args.command == "list":
        if args.type == "samples":
            samples = mcs.list_samples()
            print(f"共 {len(samples)} 条样本")
            for s in samples:
                print(f"  {s.sample_id} | {s.predicted_label} | {s.raw_source}")
        elif args.type == "snapshots":
            snaps = mcs.list_snapshots()
            print(f"共 {len(snaps)} 个快照")
            for s in snaps:
                print(f"  {s.snapshot_id} | {s.snapshot_name} | "
                      f"{s.summary.get('total_samples', 0)} samples")
        elif args.type == "reports":
            reports = mcs.list_reports()
            print(f"共 {len(reports)} 份报告")
            for r in reports:
                print(f"  {r.report_id} | {r.report_type} | {r.file_path}")
        elif args.type == "raw":
            import os
            raw_dir = mcs.get_raw_dir()
            files = os.listdir(raw_dir) if os.path.isdir(raw_dir) else []
            print(f"原始文件目录: {raw_dir}")
            print(f"共 {len(files)} 个文件")
            for f in sorted(files):
                print(f"  - {f}")


if __name__ == "__main__":
    main()
