import argparse
import sys
from pathlib import Path
from typing import List, Optional

from .config import DecomposeConfig
from .data_loader import DataLoader, DataStatus
from .decompose import SeasonalDecomposer
from .interpreter import ResultInterpreter
from .exporter import ChartExporter, CSVExporter
from .audit import AuditLog
from .batch_review import BatchReviewer


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="season-decompose",
        description="时间序列季节拆分工具 - STL分解 + 数据质量分级 + 人工复核留痕",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 基本分析（读取CSV，输出图表和结果）
  season-decompose run -i data.csv -o output/ --period 7

  # 指定日期列和数值列，使用乘法模型
  season-decompose run -i sales.xlsx -o out/ --date-col 日期 --value-col 销售额 \\
      --period 12 --model multiplicative

  # 列出数据问题（不做分解，只做质量检查）
  season-decompose check -i data.csv

  # 数据分析员确认一条待复核数据
  season-decompose confirm -i data.csv --date 2024-03-15 --analyst 张三 \\
      --reason "与财务核对无误" --audit-log audit.json

  # 将一条数据标记为需重采
  season-decompose reject -i data.csv --date 2024-03-16 --analyst 张三 \\
      --reason "系统异常导致" --audit-log audit.json

  # 查看修正日志
  season-decompose log --audit-log audit.json

  # 批量复核：把结论写回来源材料
  season-decompose review -i data.csv -o output/ --audit-log audit.json
        """,
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    p_run = subparsers.add_parser(
        "run", help="执行完整的季节拆分分析",
        description="执行STL季节拆分，生成结果说明、图表PNG、数据CSV",
    )
    _add_io_args(p_run)
    _add_decompose_args(p_run)
    p_run.add_argument("--title", default="时间序列季节拆分", help="图表标题")
    p_run.add_argument("--audit-log", default=None, help="修正日志JSON路径（用于合并历史修正）")

    p_check = subparsers.add_parser(
        "check", help="仅做数据质量检查，不执行分解",
        description="检查数据质量问题，输出可用/暂缓/需重采分级和问题明细",
    )
    _add_io_args(p_check, require_output=False)
    _add_decompose_args(p_check, include_model=False)

    p_confirm = subparsers.add_parser(
        "confirm", help="（数据分析员）确认一条待复核数据",
        description="将指定日期的数据从'暂缓'改为'可用'，并记录原因",
    )
    p_confirm.add_argument("-i", "--input", required=True, help="原始数据文件路径")
    p_confirm.add_argument("--date", required=True, help="待确认数据的日期（如 2024-03-15）")
    p_confirm.add_argument("--new-value", type=float, default=None, help="修正后的数值（不填则沿用原值）")
    p_confirm.add_argument("--analyst", required=True, help="分析员姓名")
    p_confirm.add_argument("--reason", required=True, help="确认原因/依据说明")
    p_confirm.add_argument("--audit-log", required=True, help="修正日志JSON路径（自动创建/追加）")
    _add_decompose_args(p_confirm, include_model=False)

    p_reject = subparsers.add_parser(
        "reject", help="（数据分析员）将一条数据标记为需重新采集",
        description="将指定日期的数据标记为'需重新采集'，并记录原因",
    )
    p_reject.add_argument("-i", "--input", required=True, help="原始数据文件路径")
    p_reject.add_argument("--date", required=True, help="标记数据的日期")
    p_reject.add_argument("--analyst", required=True, help="分析员姓名")
    p_reject.add_argument("--reason", required=True, help="标记原因说明")
    p_reject.add_argument("--audit-log", required=True, help="修正日志JSON路径")
    _add_decompose_args(p_reject, include_model=False)

    p_log = subparsers.add_parser(
        "log", help="查看人工修正日志",
        description="打印修正记录摘要和详细信息",
    )
    p_log.add_argument("--audit-log", required=True, help="修正日志JSON路径")

    p_review = subparsers.add_parser(
        "review", help="批量复核：把结论写回来源材料",
        description="将数据状态、问题描述、修正记录写回复核后的输出文件",
    )
    _add_io_args(p_review)
    _add_decompose_args(p_review)
    p_review.add_argument("--audit-log", default=None, help="修正日志JSON路径")
    p_review.add_argument(
        "--write-back", default=None,
        help="写回来源材料的输出路径（默认在输入文件同目录生成'_已复核'后缀文件）",
    )

    return parser


def _add_io_args(parser: argparse.ArgumentParser, require_output: bool = True):
    parser.add_argument("-i", "--input", required=True, help="输入数据文件路径（支持 .csv / .xlsx）")
    parser.add_argument("-o", "--output", required=require_output, default=None, help="输出目录")


def _add_decompose_args(parser: argparse.ArgumentParser, include_model: bool = True):
    parser.add_argument("--date-col", default="date", help="日期列名（默认: date）")
    parser.add_argument("--value-col", default="value", help="数值列名（默认: value）")
    parser.add_argument("--period", type=int, default=7, help="季节周期，如周=7，月=12（默认: 7）")
    if include_model:
        parser.add_argument(
            "--model", default="additive", choices=["additive", "multiplicative"],
            help="分解模型：加法 additive / 乘法 multiplicative（默认: additive）",
        )
    parser.add_argument("--seasonal", type=int, default=7, help="STL seasonal 参数，须为>=7的奇数（默认: 7）")
    parser.add_argument("--trend", type=int, default=None, help="STL trend 参数（默认: 自动）")
    parser.add_argument("--low-pass", type=int, default=None, help="STL low_pass 参数（默认: 自动）")
    parser.add_argument("--no-robust", action="store_true", help="关闭STL鲁棒拟合（默认开启）")


def main(argv: Optional[List[str]] = None):
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "log":
        audit = AuditLog(args.audit_log)
        audit.print_summary()
        return 0

    config = DecomposeConfig(
        date_col=args.date_col,
        value_col=args.value_col,
        seasonal_period=args.period,
        model=getattr(args, "model", "additive"),
        robust=not getattr(args, "no_robust", False),
        seasonal=args.seasonal,
        trend=args.trend,
        low_pass=args.low_pass,
    )

    if args.command == "check":
        return _cmd_check(args, config)
    elif args.command == "run":
        return _cmd_run(args, config)
    elif args.command == "confirm":
        return _cmd_confirm(args, config)
    elif args.command == "reject":
        return _cmd_reject(args, config)
    elif args.command == "review":
        return _cmd_review(args, config)
    else:
        parser.print_help()
        return 1


def _cmd_check(args, config: DecomposeConfig) -> int:
    print(f"[1/2] 读取数据: {args.input}")
    loader = DataLoader(config)
    loaded = loader.load(args.input)

    print(f"[2/2] 质量检查完成")
    print()
    print("===== 数据质量摘要 =====")
    for k, v in loaded.summary.items():
        print(f"  {k}: {v}")
    print()

    if loaded.issues:
        print("===== 问题明细 =====")
        print(f"{'行号':<6} {'问题类型':<12} {'状态':<10} 描述")
        print("-" * 70)
        for iss in loaded.issues:
            print(f"{iss.row_index:<6} {iss.issue_type:<12} {iss.status.value:<10} {iss.description}")
    else:
        print("未发现数据质量问题。")
    return 0


def _cmd_run(args, config: DecomposeConfig) -> int:
    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"[1/5] 读取并清洗数据: {args.input}")
    loader = DataLoader(config)
    loaded = loader.load(args.input)
    _print_quality_summary(loaded)

    print(f"[2/5] STL 季节拆分（周期={config.seasonal_period}，模型={config.model}）")
    decomposer = SeasonalDecomposer(config)
    result = decomposer.decompose(loaded)

    print(f"[3/5] 生成结果说明")
    interpreter = ResultInterpreter()
    interp = interpreter.interpret(loaded, result)
    _print_interpretation(interp)

    md_path = out_dir / "结果说明.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(interp.to_markdown())
    print(f"  → 文字说明: {md_path}")

    txt_path = out_dir / "结果说明.txt"
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(interp.to_text())

    print(f"[4/5] 导出图表 PNG")
    chart_exporter = ChartExporter()
    png_path = chart_exporter.export(result, str(out_dir / "季节拆分图.png"), title=args.title)
    print(f"  → 图表: {png_path}")

    print(f"[5/5] 导出数据 CSV")
    csv_exporter = CSVExporter()
    csv_path = csv_exporter.export(result, str(out_dir / "拆分结果.csv"))
    print(f"  → 数据: {csv_path}")

    if args.audit_log:
        audit = AuditLog(args.audit_log)
        if audit.records:
            md_audit = out_dir / "修正留痕.md"
            with open(md_audit, "w", encoding="utf-8") as f:
                f.write(audit.to_markdown())
            print(f"  → 修正留痕: {md_audit}")

    print()
    print("✅ 完成。运营同事查看结果说明.txt 或 季节拆分图.png 中的颜色标注即可区分可用/复核/已排除数据。")
    return 0


def _cmd_confirm(args, config: DecomposeConfig) -> int:
    loader = DataLoader(config)
    loaded = loader.load(args.input)

    df = loaded.df
    target = df[df[config.date_col].astype(str) == args.date]

    if target.empty:
        print(f"❌ 未找到日期为 {args.date} 的记录")
        return 1

    idx = target.index[0]
    old_value = target.iloc[0][config.value_col]
    old_status = loaded.status_series.iloc[idx]
    new_value = args.new_value if args.new_value is not None else old_value

    audit = AuditLog(args.audit_log)
    record = audit.confirm_pending(
        analyst=args.analyst,
        date_value=args.date,
        old_value=old_value,
        confirmed_value=new_value,
        reason=args.reason,
        source_file=args.input,
    )

    print(f"✅ 已确认")
    print(f"  日期: {record.date_value}")
    print(f"  状态: {record.old_status} → {record.new_status}")
    print(f"  数值: {record.old_value} → {record.new_value}")
    print(f"  分析员: {record.analyst}")
    print(f"  原因: {record.reason}")
    print(f"  日志已写入: {args.audit_log}")
    return 0


def _cmd_reject(args, config: DecomposeConfig) -> int:
    loader = DataLoader(config)
    loaded = loader.load(args.input)

    df = loaded.df
    target = df[df[config.date_col].astype(str) == args.date]

    if target.empty:
        print(f"❌ 未找到日期为 {args.date} 的记录")
        return 1

    idx = target.index[0]
    old_status = loaded.status_series.iloc[idx]

    audit = AuditLog(args.audit_log)
    record = audit.mark_recollect(
        analyst=args.analyst,
        date_value=args.date,
        current_status=old_status,
        reason=args.reason,
        source_file=args.input,
    )

    print(f"✅ 已标记为需重新采集")
    print(f"  日期: {record.date_value}")
    print(f"  状态: {record.old_status} → {record.new_status}")
    print(f"  分析员: {record.analyst}")
    print(f"  原因: {record.reason}")
    print(f"  日志已写入: {args.audit_log}")
    return 0


def _cmd_review(args, config: DecomposeConfig) -> int:
    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"[1/4] 读取数据: {args.input}")
    loader = DataLoader(config)
    loaded = loader.load(args.input)
    _print_quality_summary(loaded)

    print(f"[2/4] STL 季节拆分")
    decomposer = SeasonalDecomposer(config)
    result = decomposer.decompose(loaded)

    print(f"[3/4] 生成结果说明")
    interpreter = ResultInterpreter()
    interp = interpreter.interpret(loaded, result)

    audit = AuditLog(args.audit_log) if args.audit_log else None
    reviewer = BatchReviewer(audit)

    write_back_path = args.write_back
    if write_back_path is None:
        src = Path(args.input)
        write_back_path = str(src.parent / f"{src.stem}_已复核{src.suffix}")

    print(f"[4/4] 写回复核结论到: {write_back_path}")
    review_out = reviewer.write_back_to_source(
        source_path=args.input,
        loaded_data=loaded,
        interpretation=interp,
        output_path=write_back_path,
    )
    for k, v in review_out.summary.items():
        print(f"  {k}: {v}")

    report_path = out_dir / "批量复核报告.md"
    reviewer.export_review_report(loaded, interp, str(report_path))
    print(f"  → 复核报告: {report_path}")

    csv_exporter = CSVExporter()
    csv_path = csv_exporter.export(result, str(out_dir / "拆分结果.csv"))
    print(f"  → 拆分数据: {csv_path}")

    chart_exporter = ChartExporter()
    png_path = chart_exporter.export(result, str(out_dir / "季节拆分图.png"))
    print(f"  → 拆分图表: {png_path}")

    md_path = out_dir / "结果说明.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(interp.to_markdown())

    print()
    print("✅ 批量复核完成。运营同事可使用 _已复核 文件，其中已标注每行状态及问题说明。")
    return 0


def _print_quality_summary(loaded):
    print(f"  总行数: {loaded.summary['总行数']}")
    print(f"  ✅ 可用: {loaded.summary['可用行数']}")
    print(f"  ⚠️  暂缓: {loaded.summary['暂缓行数']}（需数据分析员复核）")
    print(f"  ❌ 需重采: {loaded.summary['需重采行数']}")
    print(f"  问题总数: {loaded.summary['问题总数']}")


def _print_interpretation(interp):
    print()
    print("===== 结果摘要 =====")
    print(f"  总体: {interp.overall}")
    print(f"  可用: {interp.available_summary}")
    print(f"  暂缓: {interp.pending_summary}")
    print(f"  需重采: {interp.need_recollect_summary}")
    print(f"  质量: {interp.quality_assessment}")
    print(f"  季节: {interp.seasonal_findings}")
    print(f"  趋势: {interp.trend_findings}")
    print()


if __name__ == "__main__":
    sys.exit(main())
