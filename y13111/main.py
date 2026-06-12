from __future__ import annotations

import os
import sys

from queue_window_checker import (
    ChangeTracer,
    QueueWindowValidator,
    ReportGenerator,
    Unit,
    WindowConfig,
)
from queue_window_checker.samples import build_historical_answers


OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")


def run_case_a_normal_demo(tracer: ChangeTracer, reporter: ReportGenerator) -> None:
    print("==> 运行 现场案例A（混入一条名称不一致的材料）")
    answers = build_historical_answers()
    answer = answers["现场案例A"]

    config = WindowConfig(
        window_size=30.0,
        window_unit=Unit.MINUTE,
        lower_bound=10.0,
        upper_bound=15.0,
        value_unit=Unit.COUNT,
        formula="avg_throughput = total_count / window_size",
        tolerance=0.0,
    )
    validator = QueueWindowValidator(config)
    result = validator.validate(answer)
    tracer.record(validator.config, result)
    print(f"    状态: {result.status.value}")
    print(f"    异常数: {len(result.anomalies)}")
    for a in result.anomalies:
        print(f"      - [{a.anomaly_type.value}] {a.message}")

    diffs = tracer.diff_all()
    txt = reporter.export_text_report(answer, result, diffs, "案例A_首轮.txt")
    xlsx = reporter.export_excel(answer, result, diffs, "案例A_首轮.xlsx")
    js = reporter.export_json(answer, result, diffs, "案例A_首轮.json")
    print(f"    导出: {os.path.basename(txt)} / {os.path.basename(xlsx)} / {os.path.basename(js)}")


def run_case_a_tune_param(tracer: ChangeTracer, reporter: ReportGenerator) -> None:
    print("==> 参数调一档 重算 现场案例A")
    answers = build_historical_answers()
    answer = answers["现场案例A"]

    config = WindowConfig(
        window_size=30.0,
        window_unit=Unit.MINUTE,
        lower_bound=10.0,
        upper_bound=15.0,
        value_unit=Unit.COUNT,
        formula="avg_throughput = total_count / window_size",
        tolerance=0.0,
    )
    validator = QueueWindowValidator(config)
    validator.validate(answer)

    validator.update_config(window_size=60.0, upper_bound=8.0)
    print(f"    调参: window_size 30->60 分钟, upper_bound 15->8")
    result2 = validator.validate(answer)
    tracer.record(validator.config, result2)

    diffs = tracer.diff_all()
    if diffs:
        last = diffs[-1]
        print(f"    结果变化: {last.result_diff}")

    txt = reporter.export_text_report(answer, result2, diffs, "案例A_调参后.txt")
    xlsx = reporter.export_excel(answer, result2, diffs, "案例A_调参后.xlsx")
    js = reporter.export_json(answer, result2, diffs, "案例A_调参后.json")
    print(f"    导出: {os.path.basename(txt)} / {os.path.basename(xlsx)} / {os.path.basename(js)}")


def run_case_b_sort_unstable(tracer: ChangeTracer, reporter: ReportGenerator) -> None:
    print("==> 运行 现场案例B（并列数量 -> 排序不稳定应挂起）")
    answers = build_historical_answers()
    answer = answers["现场案例B（并列数量）"]

    config = WindowConfig(
        window_size=30.0,
        window_unit=Unit.MINUTE,
        lower_bound=20.0,
        upper_bound=60.0,
        value_unit=Unit.COUNT,
        tolerance=0.0,
    )
    validator = QueueWindowValidator(config)
    result = validator.validate(answer)
    tracer.record(validator.config, result)
    print(f"    状态: {result.status.value}")
    print(f"    排序稳定: {result.sort_stable}")
    for a in result.anomalies:
        print(f"      - [{a.anomaly_type.value}] {a.message}")

    txt = reporter.export_text_report(answer, result, tracer.diff_all(), "案例B_排序不稳定.txt")
    print(f"    导出: {os.path.basename(txt)}")


def run_case_c_empty_set(tracer: ChangeTracer, reporter: ReportGenerator) -> None:
    print("==> 运行 现场案例C（空集合 -> 应挂起，不被当成正常输入）")
    answers = build_historical_answers()
    answer = answers["现场案例C（空集合）"]

    config = WindowConfig(
        window_size=30.0, window_unit=Unit.MINUTE,
        lower_bound=5.0, upper_bound=20.0, value_unit=Unit.COUNT,
    )
    validator = QueueWindowValidator(config)
    result = validator.validate(answer)
    tracer.record(validator.config, result)
    print(f"    状态: {result.status.value}")
    for a in result.anomalies:
        print(f"      - [{a.anomaly_type.value}] {a.message}")

    txt = reporter.export_text_report(answer, result, tracer.diff_all(), "案例C_空集合挂起.txt")
    print(f"    导出: {os.path.basename(txt)}")


def run_case_d_boundary(tracer: ChangeTracer, reporter: ReportGenerator) -> None:
    print("==> 运行 现场案例D（演示边界样本、公式、单位对结果的影响）")
    answers = build_historical_answers()
    answer = answers["现场案例D（边界样本）"]

    config = WindowConfig(
        window_size=10.0,
        window_unit=Unit.MINUTE,
        lower_bound=10.0,
        upper_bound=13.0,
        value_unit=Unit.COUNT,
        formula="avg_throughput = total_count / window_size",
        tolerance=0.0,
    )
    validator = QueueWindowValidator(config)
    r1 = validator.validate(answer)
    tracer.record(validator.config, r1)
    print(f"    首轮: 状态={r1.status.value}, 计算值={r1.computed_value} {r1.computed_unit.value if r1.computed_unit else ''}")

    validator.update_config(window_size=10.0, window_unit=Unit.SECOND, upper_bound=780.0)
    r2 = validator.validate(answer)
    tracer.record(validator.config, r2)
    print(f"    调参(窗口单位分钟->秒,上限13->780): 状态={r2.status.value}, 计算值={r2.computed_value}")

    diffs = tracer.diff_all()
    xlsx = reporter.export_excel(answer, r2, diffs, "案例D_边界与单位影响.xlsx")
    print(f"    导出: {os.path.basename(xlsx)}  (查看 边界样本 + 参数调档差异 sheet)")


def main() -> int:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    reporter = ReportGenerator(OUTPUT_DIR)
    tracer = ChangeTracer()

    answers = build_historical_answers()
    sample_paths = {
        aid: (a.source_file or f"memory://{aid}")
        for aid, a in answers.items()
    }
    sample_paths["报告输出目录"] = OUTPUT_DIR
    handover = reporter.quick_handover(sample_paths)
    print(f"[交接卡] 已生成: {handover}")
    print()

    run_case_a_normal_demo(tracer, reporter)
    print()
    run_case_a_tune_param(tracer, reporter)
    print()
    run_case_b_sort_unstable(tracer, reporter)
    print()
    run_case_c_empty_set(tracer, reporter)
    print()
    run_case_d_boundary(tracer, reporter)

    print()
    print(f"所有报告输出目录: {OUTPUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
