from __future__ import annotations

import argparse
import os
import sys
from typing import Optional

from queue_window_checker import (
    ChangeTracer,
    QueueWindowValidator,
    ReportGenerator,
    Unit,
    load_csv_answer,
    load_window_config,
    validate_answer_integrity,
)
from queue_window_checker.samples import build_historical_answers


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="排队窗口边界校验 - 支持CSV导入、参数配置、多格式导出",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 基础：导入CSV + 参数配置
  python3 main.py --input samples/现场案例A.csv --config config/default_window_config.json

  # 调参对比：先用默认参数跑，再用调参后的配置重跑，自动生成差异
  python3 main.py --input samples/现场案例A.csv --config config/default_window_config.json --tune config/tuned_window_config.json

  # 自定义输出目录和文件名前缀
  python3 main.py --input samples/现场案例A.csv --config config/default_window_config.json --output my_report --prefix 首轮

  # 运行内置样例（全部4个案例）
  python3 main.py --demo
        """,
    )
    parser.add_argument(
        "--input", "-i",
        type=str,
        help="历史答案CSV文件路径",
    )
    parser.add_argument(
        "--config", "-c",
        type=str,
        help="窗口参数配置JSON文件路径",
    )
    parser.add_argument(
        "--tune", "-t",
        type=str,
        help="第二组参数配置JSON（用于对比调参前后的差异）",
        default=None,
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        help="输出目录（默认: output/）",
        default="output",
    )
    parser.add_argument(
        "--prefix", "-p",
        type=str,
        help="导出文件名前缀（默认: 自动从输入文件名生成）",
        default=None,
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="运行全部内置样例（忽略其他参数）",
    )
    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="减少控制台输出",
    )
    return parser


def _auto_prefix(input_path: Optional[str]) -> str:
    if not input_path:
        return "report"
    base = os.path.basename(input_path)
    name, _ = os.path.splitext(base)
    return name


def run_single(
    input_csv: str,
    config_path: str,
    output_dir: str,
    prefix: str,
    tune_config: Optional[str] = None,
    quiet: bool = False,
) -> tuple[bool, dict]:
    if not os.path.exists(input_csv):
        print(f"[错误] 输入文件不存在: {input_csv}", file=sys.stderr)
        return False, {}
    if not os.path.exists(config_path):
        print(f"[错误] 配置文件不存在: {config_path}", file=sys.stderr)
        return False, {}

    abs_in = os.path.abspath(input_csv)
    abs_cfg = os.path.abspath(config_path)

    if not quiet:
        print(f"[1/4] 导入CSV: {abs_in}")
    answer = load_csv_answer(abs_in)
    integrity_anoms = validate_answer_integrity(answer)
    if not quiet:
        print(f"      历史答案ID: {answer.answer_id}, 材料数: {len(answer.materials)}, 完整性异常: {len(integrity_anoms)}")
        for a in integrity_anoms:
            print(f"      - [{a.anomaly_type.value}] {a.message}")

    if not quiet:
        print(f"[2/4] 加载参数配置: {abs_cfg}")
    config = load_window_config(abs_cfg)
    if not quiet:
        print(f"      窗口: {config.window_size}{config.window_unit.value}, 区间: [{config.lower_bound}, {config.upper_bound}]{config.value_unit.value}")
        print(f"      公式: {config.formula}")

    validator = QueueWindowValidator(config)
    tracer = ChangeTracer()

    if not quiet:
        print(f"[3/4] 执行边界校验 ...")
    result = validator.validate(answer)
    tracer.record(validator.config, result)

    if tune_config:
        if not quiet:
            print(f"      调参重跑 -> 使用配置: {os.path.abspath(tune_config)}")
        tune_cfg = load_window_config(tune_config)
        validator2 = QueueWindowValidator(tune_cfg)
        result2 = validator2.validate(answer)
        tracer.record(tune_cfg, result2)
        if not quiet:
            print(f"      调参后状态: {result2.status.value}（原状态: {result.status.value}）")

    if not quiet:
        print(f"[4/4] 导出报告 ...")
    reporter = ReportGenerator(output_dir)

    diffs = tracer.diff_all() if tracer.has_history else None
    latest = tracer.latest()
    final_result = latest[1] if latest else result

    txt = reporter.export_text_report(answer, final_result, diffs, f"{prefix}_check_report.txt")
    xlsx = reporter.export_excel(answer, final_result, diffs, f"{prefix}_check_report.xlsx")
    js = reporter.export_json(answer, final_result, diffs, f"{prefix}_check_report.json")

    handover_paths = {
        f"{answer.answer_id} (CSV)": answer.source_file or abs_in,
        f"当前参数配置": abs_cfg,
    }
    if tune_config:
        handover_paths["调参配置"] = os.path.abspath(tune_config)
    handover = reporter.quick_handover(handover_paths)

    if not quiet:
        print(f"      TXT:   {os.path.basename(txt)}")
        print(f"      Excel: {os.path.basename(xlsx)}")
        print(f"      JSON:  {os.path.basename(js)}")
        print(f"      交接卡: {os.path.basename(handover)}")
        print(f"      输出目录: {os.path.abspath(output_dir)}")

    summary = {
        "status": final_result.status.value,
        "anomaly_count": len(final_result.anomalies),
        "computed_value": final_result.computed_value,
        "computed_unit": final_result.computed_unit.value if final_result.computed_unit else None,
        "sort_stable": final_result.sort_stable,
        "output_txt": txt,
        "output_xlsx": xlsx,
        "output_json": js,
        "handover": handover,
        "param_diffs": [
            {
                "config_before": d.config_before,
                "config_after": d.config_after,
                "fields_changed": [f.__dict__ for f in d.fields_changed],
                "result_before_summary": d.result_before_summary,
                "result_after_summary": d.result_after_summary,
                "result_diff": d.result_diff,
            }
            for d in (diffs or [])
        ],
    }
    return True, summary


def run_demo(quiet: bool = False) -> int:
    answers = build_historical_answers()
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")
    reporter = ReportGenerator(output_dir)

    sample_paths: dict[str, str] = {}

    def _print(*args, **kwargs):
        if not quiet:
            print(*args, **kwargs)

    _print("==> 演示模式：运行全部 4 个内置样例")
    _print()

    # 案例A - 混入名称不一致材料
    _print("案例A: 混入名称不一致材料（M003 高中英语字帖 vs 高中英语同步字帖）")
    answer_a = answers["现场案例A"]
    sample_paths[f"现场案例A (CSV)"] = os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples", "现场案例A.csv")
    config_a = load_window_config(os.path.join(os.path.dirname(os.path.abspath(__file__)), "config", "default_window_config.json"))
    validator_a = QueueWindowValidator(config_a)
    result_a = validator_a.validate(answer_a)
    tracer_a = ChangeTracer()
    tracer_a.record(config_a, result_a)
    # 调参重跑
    config_tuned = load_window_config(os.path.join(os.path.dirname(os.path.abspath(__file__)), "config", "tuned_window_config.json"))
    validator_t = QueueWindowValidator(config_tuned)
    result_t = validator_t.validate(answer_a)
    tracer_a.record(config_tuned, result_t)
    diffs_a = tracer_a.diff_all()
    reporter.export_text_report(answer_a, result_t, diffs_a, "案例A_调参后_check_report.txt")
    reporter.export_excel(answer_a, result_t, diffs_a, "案例A_调参后_check_report.xlsx")
    reporter.export_json(answer_a, result_t, diffs_a, "案例A_调参后_check_report.json")
    reporter.export_text_report(answer_a, result_a, [], "案例A_首轮_check_report.txt")
    reporter.export_excel(answer_a, result_a, [], "案例A_首轮_check_report.xlsx")
    reporter.export_json(answer_a, result_a, [], "案例A_首轮_check_report.json")
    _print(f"    首轮状态: {result_a.status.value}, 调参后: {result_t.status.value}")
    _print(f"    异常数: {len(result_t.anomalies)}")
    for a in result_t.anomalies:
        _print(f"      - [{a.anomaly_type.value}] {a.message}")
    _print()

    # 案例B - 排序不稳定
    _print("案例B: 并列数量（M101、M102 都是300）-> 排序不稳定应挂起")
    answer_b = answers["现场案例B（并列数量）"]
    sample_paths[f"现场案例B (CSV)"] = os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples", "现场案例B.csv")
    validator_b = QueueWindowValidator(config_a)
    result_b = validator_b.validate(answer_b)
    reporter.export_text_report(answer_b, result_b, [], "案例B_排序不稳定_check_report.txt")
    _print(f"    状态: {result_b.status.value}, 排序稳定: {result_b.sort_stable}")
    for a in result_b.anomalies:
        _print(f"      - [{a.anomaly_type.value}] {a.message}")
    _print()

    # 案例C - 空集合
    _print("案例C: 空集合 -> 挂起，不被当成正常输入")
    answer_c = answers["现场案例C（空集合）"]
    sample_paths[f"现场案例C (CSV)"] = os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples", "现场案例C.csv")
    validator_c = QueueWindowValidator(config_a)
    result_c = validator_c.validate(answer_c)
    reporter.export_text_report(answer_c, result_c, [], "案例C_空集合挂起_check_report.txt")
    _print(f"    状态: {result_c.status.value}")
    for a in result_c.anomalies:
        _print(f"      - [{a.anomaly_type.value}] {a.message}")
    _print()

    # 案例D - 边界样本演示
    _print("案例D: 边界样本、单位、公式影响演示")
    answer_d = answers["现场案例D（边界样本）"]
    sample_paths[f"现场案例D (CSV)"] = os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples", "现场案例D.csv")
    validator_d = QueueWindowValidator(config_a)
    result_d1 = validator_d.validate(answer_d)
    tracer_d = ChangeTracer()
    tracer_d.record(config_a, result_d1)
    config_d2 = load_window_config(os.path.join(os.path.dirname(os.path.abspath(__file__)), "config", "default_window_config.json"))
    config_d2.window_size = 10.0
    config_d2.window_unit = Unit.SECOND
    config_d2.upper_bound = 780.0
    validator_d2 = QueueWindowValidator(config_d2)
    result_d2 = validator_d2.validate(answer_d)
    tracer_d.record(config_d2, result_d2)
    diffs_d = tracer_d.diff_all()
    reporter.export_excel(answer_d, result_d2, diffs_d, "案例D_边界与单位影响_check_report.xlsx")
    _print(f"    首轮: 状态={result_d1.status.value}, 计算值={result_d1.computed_value}")
    _print(f"    调参(窗口单位分钟->秒): 状态={result_d2.status.value}, 计算值={result_d2.computed_value}")
    _print()

    sample_paths["输出目录"] = output_dir
    handover = reporter.quick_handover(sample_paths)
    _print(f"[交接卡] {handover}")
    _print()
    _print(f"所有报告输出目录: {output_dir}")
    return 0


def main() -> int:
    parser = _build_parser()
    args = parser.parse_args()

    if args.demo:
        return run_demo(args.quiet)

    if not args.input or not args.config:
        parser.print_help()
        print("\n[错误] 必须同时提供 --input 和 --config 参数，或使用 --demo", file=sys.stderr)
        return 2

    prefix = args.prefix or _auto_prefix(args.input)
    ok, summary = run_single(
        input_csv=args.input,
        config_path=args.config,
        output_dir=args.output,
        prefix=prefix,
        tune_config=args.tune,
        quiet=args.quiet,
    )

    if not ok:
        return 1

    if not args.quiet:
        print()
        print("== 最终结果摘要 ==")
        for k, v in summary.items():
            if k == "param_diffs":
                continue
            print(f"  {k}: {v}")
        if summary.get("param_diffs"):
            print(f"  参数调档差异: {len(summary['param_diffs'])} 次")
            for i, d in enumerate(summary["param_diffs"], 1):
                fields = [f"{f['field']}: {f['old_value']}->{f['new_value']}" for f in d.get("fields_changed", [])]
                print(f"    #{i}: {', '.join(fields)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
