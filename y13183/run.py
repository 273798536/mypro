#!/usr/bin/env python3
"""冷却塔水滴误差归因 - 命令行入口"""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, Any

sys.path.insert(0, str(Path(__file__).parent))

from src.analyzer import run_attribution, DEFAULT_PARAMS, STATE_FILE
from src.reporter import save_all_outputs, generate_anomaly_queue_text
from src.models import PersistentState


def load_prev_params() -> Dict[str, Any]:
    try:
        state = PersistentState.load(STATE_FILE)
        if state.parameter_history:
            return dict(state.parameter_history[-1]["params"])
    except Exception:
        pass
    return {}


def cmd_run(args):
    filter_conditions = {
        "device_id": args.device,
        "start_time": args.start,
        "end_time": args.end,
        "error_threshold_pct": args.threshold if args.threshold else DEFAULT_PARAMS["error_threshold_pct"]
    }

    params_override = {}
    if args.threshold:
        params_override["error_threshold_pct"] = args.threshold
    if args.drift_threshold:
        params_override["drift_threshold_pct"] = args.drift_threshold
    if args.low_corr:
        params_override["boundary_low_correction"] = args.low_corr
    if args.high_corr:
        params_override["boundary_high_correction"] = args.high_corr
    if args.temp_corr:
        params_override["env_temp_correction"] = args.temp_corr
    if args.hum_corr:
        params_override["env_humidity_correction"] = args.hum_corr

    prev_params = load_prev_params()
    result = run_attribution(params_override, args.device, args.start, args.end)
    json_path, md_path, queue_path = save_all_outputs(result, filter_conditions, prev_params or None)

    print("=" * 60)
    print(f"  冷却塔水滴误差归因 - 运行完成")
    print(f"  运行编号: {result.run_id}")
    print("=" * 60)
    print(f"  总采样点: {result.total_samples}  |  有效: {result.valid_samples}  |  缺口: {result.sampling_gap_count}")
    print(f"  平均误差: {result.mean_error_pct}%  |  最大: {result.max_error_pct}%  |  最小: {result.min_error_pct}%")
    print(f"  检出异常: {len(result.anomalies)} 项")
    print("=" * 60)
    print(f"  完整报告(Markdown): {md_path}")
    print(f"  数据包  数据汇总(JSON):   {json_path}")
    print(f"  异常队列(TXT):       {queue_path}")
    print("=" * 60)
    print("")
    print(">>> 下一步: 打开异常队列文件, 按条目处理。老何看这里:")
    print(generate_anomaly_queue_text(result))
    print("")
    print(f"或执行: python run.py queue 查看当前状态")


def cmd_queue(args):
    state = PersistentState.load(STATE_FILE)
    if not state.anomaly_queue:
        print("当前无待处理异常。上一次运行:", state.last_run_id or "(还没跑过)")
        return

    print("=" * 60)
    print("  冷却塔水滴误差归因 - 当前异常队列")
    print(f"  最近运行:", state.last_run_id)
    print("=" * 60)
    print()

    for i, a in enumerate(state.anomaly_queue, 1):
        print(f"--- 第 {i} 项 / {a['anomaly_id']} ---")
        print(f"  时间: {a['timestamp']}")
        print(f"  类别: {a['category']} ({a['description']}")
        print(f"  误差: {a['error_pct']}%  |  状态: {a['status']}")
        if a.get('boundary_hint'):
            print(f"  边界提示: {a['boundary_hint']}")
        print()
        print("  下一步:")
        for step in a['action_next'].split(";"):
            step = step.strip()
            if step:
                print(f"    {step}")
        print()

    print("=" * 60)
    for dev, status in state.current_status.items():
        print(f"  [{dev}] {status}")
    print("=" * 60)


def cmd_status(args):
    state = PersistentState.load(STATE_FILE)
    print("=" * 60)
    print("  冷却塔水滴误差归因 - 系统状态")
    print("=" * 60)
    print(f"  版本: {state.version}")
    print(f"  最近运行: {state.last_run_id or '(未运行过'}")
    print(f"  最近时间: {state.last_run_timestamp or '-'}")
    print()
    print("  当前设备状态:")
    for dev, st in state.current_status.items():
        print(f"    - {dev}: {st}")
    print()
    print(f"  异常队列: {len(state.anomaly_queue)} 项")
    print(f"  历史运行次数: {len(state.report_history)} 次")
    if state.parameter_history:
        print()
        print("  最近参数:")
        last = state.parameter_history[-1]
        for k, v in sorted(last["params"].items()):
            print(f"    {k} = {v}")
    print("=" * 60)


def cmd_params(args):
    print("=" * 60)
    print("  冷却塔水滴误差归因 - 默认参数参考")
    print("  (可用 --param-name value 在 run 时覆盖")
    print("=" * 60)
    print()
    for k, v in sorted(DEFAULT_PARAMS.items()):
        print(f"  {k:30s} = {v}")
    print()
    print("=" * 60)
    print("  调档示例:")
    print("  python run.py run --threshold 1.5 --low-corr 0.92")
    print("  即: 误差阈值收紧到1.5%, 低端修正系数调成0.92")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        prog="run.py",
        description="冷却塔水滴误差归因系统"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_run = sub.add_parser("run", help="执行一次归因分析")
    p_run.add_argument("--device", default=None, help="设备ID筛选")
    p_run.add_argument("--start", default=None, help="起始时间 (YYYY-MM-DD HH:MM:SS")
    p_run.add_argument("--end", default=None, help="结束时间")
    p_run.add_argument("--threshold", type=float, default=None,
                       help="误差阈值%, 默认2.0%")
    p_run.add_argument("--drift-threshold", type=float, default=None)
    p_run.add_argument("--low-corr", type=float, default=None,
                       help="低端边界修正系数")
    p_run.add_argument("--high-corr", type=float, default=None,
                       help="高端边界修正系数")
    p_run.add_argument("--temp-corr", type=float, default=None)
    p_run.add_argument("--hum-corr", type=float, default=None)
    p_run.set_defaults(func=cmd_run)

    p_queue = sub.add_parser("queue", help="查看当前异常队列")
    p_queue.set_defaults(func=cmd_queue)

    p_status = sub.add_parser("status", help="查看系统状态")
    p_status.set_defaults(func=cmd_status)

    p_params = sub.add_parser("params", help="查看可调参数说明")
    p_params.set_defaults(func=cmd_params)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
