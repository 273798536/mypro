#!/usr/bin/env python3
"""马尔可夫链参数试算工具 - 教研编辑交接版"""

import json
import os
import sys
import copy
from datetime import datetime
from typing import Dict, List, Tuple, Optional

HISTORY_FILE = os.path.join(os.path.dirname(__file__), "history.json")
STATE_NAMES = {
    "S0": "未掌握",
    "S1": "初步掌握",
    "S2": "基本掌握",
    "S3": "熟练掌握",
}

SAMPLE_ANSWER_HISTORY = [
    {
        "id": "ANS-2026-001",
        "date": "2026-06-10",
        "author": "系统初版",
        "original_claim": "学生从'未掌握'到'初步掌握'的转移概率约为0.3，从'初步掌握'到'基本掌握'约为0.25。",
        "transition_matrix": [
            [0.6, 0.3, 0.1, 0.0],
            [0.2, 0.55, 0.25, 0.0],
            [0.0, 0.3, 0.5, 0.2],
            [0.0, 0.0, 0.4, 0.6],
        ],
        "notes": "初版参数，基于200份作业数据估算。",
    },
    {
        "id": "ANS-2026-002",
        "date": "2026-06-11",
        "author": "阿宁",
        "original_claim": "修正'S2->S3'转移概率从0.2上调至0.35，因为近期测验显示进阶率高于预期。",
        "transition_matrix": [
            [0.6, 0.3, 0.1, 0.0],
            [0.2, 0.55, 0.25, 0.0],
            [0.0, 0.15, 0.5, 0.35],
            [0.0, 0.0, 0.4, 0.6],
        ],
        "notes": "教研编辑阿宁临时改判：提高进阶率。",
    },
    {
        "id": "ANS-2026-003",
        "date": "2026-06-12",
        "author": "系统",
        "original_claim": "S0列出现零边界问题：S3->S0转移概率为0，反向回流通道关闭。",
        "transition_matrix": [
            [0.6, 0.3, 0.1, 0.0],
            [0.2, 0.55, 0.25, 0.0],
            [0.0, 0.15, 0.5, 0.35],
            [0.0, 0.0, 0.0, 1.0],
        ],
        "notes": "自动修正S3稳态时发现除零风险，S3变成吸收态。",
    },
]


def load_history() -> List[Dict]:
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return copy.deepcopy(SAMPLE_ANSWER_HISTORY)


def save_history(history: List[Dict]):
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


def is_valid_transition_matrix(matrix: List[List[float]]) -> Tuple[bool, List[str]]:
    errors = []
    n = len(matrix)
    for i in range(n):
        row_sum = sum(matrix[i])
        if abs(row_sum - 1.0) > 1e-6:
            errors.append(f"第{i}行({STATE_NAMES.get(f'S{i}', f'S{i}')})和为{row_sum:.4f}，不为1")
        for j in range(n):
            if matrix[i][j] < 0 or matrix[i][j] > 1:
                errors.append(f"P[{i}][{j}] = {matrix[i][j]} 越界")
    return len(errors) == 0, errors


def find_zero_boundary_issues(matrix: List[List[float]]) -> List[Dict]:
    issues = []
    n = len(matrix)
    for i in range(n):
        for j in range(n):
            if matrix[i][j] == 0.0:
                issues.append({
                    "from_state": f"S{i}",
                    "from_name": STATE_NAMES.get(f"S{i}", f"S{i}"),
                    "to_state": f"S{j}",
                    "to_name": STATE_NAMES.get(f"S{j}", f"S{j}"),
                    "type": "zero_transition",
                    "description": f"{STATE_NAMES.get(f'S{i}', f'S{i}')} -> {STATE_NAMES.get(f'S{j}', f'S{j}')} 转移概率为0",
                })
    for j in range(n):
        col_sum = sum(matrix[i][j] for i in range(n))
        if col_sum == 0.0:
            issues.append({
                "state": f"S{j}",
                "state_name": STATE_NAMES.get(f"S{j}", f"S{j}"),
                "type": "zero_inflow",
                "description": f"{STATE_NAMES.get(f'S{j}', f'S{j}')} 列所有转入概率为0，除零边界风险",
            })
    abs_states = []
    for i in range(n):
        if matrix[i][i] == 1.0:
            abs_states.append(f"S{i}")
            issues.append({
                "state": f"S{i}",
                "state_name": STATE_NAMES.get(f"S{i}", f"S{i}"),
                "type": "absorbing_state",
                "description": f"{STATE_NAMES.get(f'S{i}', f'S{i}')} 是吸收态（Pii=1），稳态计算除零边界",
            })
    return issues


def _mat_mul_vec(matrix: List[List[float]], vec: List[float]) -> List[float]:
    n = len(vec)
    result = [0.0] * n
    for j in range(n):
        for i in range(n):
            result[j] += vec[i] * matrix[i][j]
    return result


def compute_steady_state(matrix: List[List[float]], max_iter: int = 10000, tol: float = 1e-8) -> Tuple[Optional[List[float]], List[str]]:
    n = len(matrix)
    issues = find_zero_boundary_issues(matrix)
    absorbing = [i for i in range(n) if matrix[i][i] == 1.0]

    if absorbing:
        err_msgs = []
        for idx in absorbing:
            hist_ref = _find_history_claim_for_state(idx, matrix)
            err_msgs.append(
                f"[除零边界] S{idx}({STATE_NAMES.get(f'S{idx}', f'S{idx}')}) 是吸收态，"
                f"稳态方程组奇异。历史答案原始说法：{hist_ref}"
            )
        return None, err_msgs

    zero_inflow = [iss for iss in issues if iss["type"] == "zero_inflow"]
    if zero_inflow:
        err_msgs = []
        for iss in zero_inflow:
            err_msgs.append(
                f"[除零边界] {iss['state_name']} 列零流入，无法收敛到非平凡稳态。"
                f"历史答案追溯：{_find_history_claim_for_state(int(iss['state'][1:]), matrix)}"
            )
        return None, err_msgs

    pi = [1.0 / n] * n
    for _ in range(max_iter):
        new_pi = _mat_mul_vec(matrix, pi)
        diff = sum(abs(new_pi[i] - pi[i]) for i in range(n))
        pi = new_pi
        if diff < tol:
            total = sum(pi)
            if total < 1e-12:
                return None, ["[除零边界] 迭代收敛到全零分布，零边界导致质量流失。"]
            pi = [p / total for p in pi]
            return pi, []

    return None, [f"[除零边界] 幂迭代{max_iter}步未收敛，可能接近零边界或存在周期态。"]


def _find_history_claim_for_state(state_idx: int, matrix: List[List[float]]) -> str:
    history = load_history()
    for record in reversed(history):
        tm = record.get("transition_matrix")
        if tm and len(tm) > state_idx:
            if tm[state_idx][state_idx] == 1.0:
                return f"[{record['id']}] {record['author']}：{record['original_claim']}"
    return "无对应历史记录，建议核查ANS-2026-003及以后版本"


def compute_n_step(matrix: List[List[float]], initial: List[float], steps: int) -> List[List[float]]:
    state = list(initial)
    trajectory = [list(state)]
    for _ in range(steps):
        state = _mat_mul_vec(matrix, state)
        trajectory.append(list(state))
    return trajectory


def render_ascii_bar(value: float, max_value: float, width: int = 30) -> str:
    filled = int(round(value / max_value * width)) if max_value > 0 else 0
    filled = min(filled, width)
    return "█" * filled + "░" * (width - filled)


def display_chart_and_details(steady: Optional[List[float]], trajectory: List[List[float]], matrix: List[List[float]]):
    print("\n" + "=" * 60)
    print("  马尔可夫链参数试算 - 图表与明细（同一口径）")
    print("=" * 60)

    print("\n【状态转移矩阵明细】")
    states = list(STATE_NAMES.keys())
    header = " " * 10 + "".join(f"{s:>10}" for s in states)
    print(header)
    for i, s in enumerate(states):
        row = f"{s}({STATE_NAMES[s]:<4})"
        row += "".join(f"{matrix[i][j]:>10.4f}" for j in range(len(states)))
        print(row)

    print("\n【稳态分布 - 图表+明细联动】")
    if steady:
        max_val = max(steady)
        for i, s in enumerate(states):
            bar = render_ascii_bar(steady[i], max_val)
            print(f"  {s}({STATE_NAMES[s]:<4})  {steady[i]:.4f}  {bar}")
    else:
        print("  （稳态不可计算，见异常队列）")

    print("\n【前5步演化轨迹 - 图表】")
    for step_idx in range(min(6, len(trajectory))):
        state = trajectory[step_idx]
        max_val = max(state) if state else 1
        bars = "  ".join(render_ascii_bar(v, max_val, 8) for v in state)
        vals = "  ".join(f"{v:.3f}" for v in state)
        print(f"  第{step_idx}步:  {bars}")
        print(f"         {vals}")
        if step_idx < min(5, len(trajectory) - 1):
            print()

    print("\n  （图表与明细使用同一组计算结果，口径一致）")
    print("=" * 60)


def list_history():
    history = load_history()
    print("\n【历史答案记录】")
    for rec in history:
        print(f"\n  {rec['id']} | {rec['date']} | {rec['author']}")
        print(f"    原始说法: {rec['original_claim']}")
        print(f"    备注: {rec.get('notes', '无')}")
        if rec.get("manual_override"):
            print(f"    ★ 包含人工改判: {rec['manual_override']['reason']}")
    print()


def run_trial(history_id: Optional[str] = None, show_details: bool = True):
    history = load_history()
    if history_id:
        record = next((r for r in history if r["id"] == history_id), None)
        if not record:
            print(f"未找到历史答案: {history_id}")
            return 1
    else:
        record = history[-1]

    matrix = record["transition_matrix"]
    print(f"\n>>> 正在复算: {record['id']} by {record['author']}")
    print(f">>> 原始说法: {record['original_claim']}")
    if record.get("manual_override"):
        print(f">>> ★ 人工改判: {record['manual_override']['reason']} (操作人: {record['manual_override']['operator']})")

    valid, errs = is_valid_transition_matrix(matrix)
    if not valid:
        print("\n[校验失败] 转移矩阵不合法:")
        for e in errs:
            print(f"  - {e}")
        return 1

    issues = find_zero_boundary_issues(matrix)
    if issues:
        print(f"\n[零边界提示] 发现 {len(issues)} 个零边界问题:")
        for iss in issues:
            print(f"  - [{iss['type']}] {iss['description']}")

    n = len(matrix)
    initial = [1.0, 0.0, 0.0, 0.0] if n == 4 else [1.0] + [0.0] * (n - 1)
    trajectory = compute_n_step(matrix, initial, 10)
    steady, steady_errors = compute_steady_state(matrix)

    if steady_errors:
        print("\n[除零边界异常] 稳态计算失败:")
        for e in steady_errors:
            print(f"  {e}")

    if show_details:
        display_chart_and_details(steady, trajectory, matrix)

    anomaly_queue = [
        iss for iss in issues if iss["type"] in ("absorbing_state", "zero_inflow")
    ] + [{"type": "steady_error", "description": e} for e in steady_errors]

    if anomaly_queue:
        print(f"\n【异常队列】共 {len(anomaly_queue)} 项")
        for i, a in enumerate(anomaly_queue, 1):
            print(f"  {i}. [{a['type']}] {a['description']}")
    else:
        print("\n【异常队列】空，参数正常。")

    return 0 if steady else 2


def add_manual_override(history_id: str, new_matrix: List[List[float]], reason: str, operator: str = "人工"):
    history = load_history()
    record = next((r for r in history if r["id"] == history_id), None)
    if not record:
        print(f"未找到历史答案: {history_id}")
        return 1

    new_id = f"ANS-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    new_record = {
        "id": new_id,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "author": operator,
        "original_claim": f"基于{history_id}人工改判：{reason}",
        "transition_matrix": new_matrix,
        "notes": f"人工改判自{history_id}",
        "manual_override": {
            "from_id": history_id,
            "reason": reason,
            "operator": operator,
            "timestamp": datetime.now().isoformat(),
        },
        "base_matrix": record["transition_matrix"],
    }
    history.append(new_record)
    save_history(history)
    print(f"\n★ 人工改判已保存: {new_id}")
    print(f"  操作人: {operator}")
    print(f"  改判原因: {reason}")
    print(f"  改判记录已留在历史中，下一班可通过 'history' 命令查看完整链路。")
    return 0


def show_anomaly_queue():
    history = load_history()
    print("\n【异常队列总览 - 所有历史版本】")
    total_anomalies = 0
    for rec in history:
        matrix = rec["transition_matrix"]
        issues = find_zero_boundary_issues(matrix)
        steady, errs = compute_steady_state(matrix)
        all_issues = issues + [{"type": "steady_error", "description": e} for e in errs]
        if all_issues:
            print(f"\n  {rec['id']} ({rec['author']}): {len(all_issues)} 个异常")
            for iss in all_issues:
                print(f"    - [{iss['type']}] {iss['description']}")
            total_anomalies += len(all_issues)
    if total_anomalies == 0:
        print("  无异常。")
    print()


def print_help():
    print("""
马尔可夫链参数试算工具 - 命令清单

  启动与运行:
    python markov_trial.py              一条命令跑完最新样例
    python markov_trial.py run <ID>     复算指定历史答案

  查看历史:
    python markov_trial.py history      列出所有历史答案（含改判链路）
    python markov_trial.py show <ID>    查看指定答案的图表+明细

  人工改判:
    python markov_trial.py demo-override   演示：阿宁改判ANS-2026-003后复算
    （代码中调用 add_manual_override 可编程式改判）

  异常队列:
    python markov_trial.py anomalies    查看所有历史版本的异常队列

零边界说明:
  - 退出码 0: 正常
  - 退出码 2: 稳态计算遇除零边界，卡在「吸收态/零流入」处
  - 所有除零边界均会追溯到历史答案的原始说法，不含糊
  - 退出提示会明确说明零边界卡在哪一步
""")


def main():
    args = sys.argv[1:]

    if not args or args[0] == "run":
        history_id = args[1] if len(args) > 1 else None
        rc = run_trial(history_id)
        if rc == 2:
            print("\n>>> 退出提示：零边界卡在「吸收态判定/稳态方程组奇异」处，已追溯到历史答案原始说法。")
        sys.exit(rc)
    elif args[0] == "history":
        list_history()
    elif args[0] == "show":
        if len(args) < 2:
            print("请指定历史答案ID，例如: python markov_trial.py show ANS-2026-002")
            sys.exit(1)
        run_trial(args[1], show_details=True)
    elif args[0] == "anomalies":
        show_anomaly_queue()
    elif args[0] == "help" or args[0] == "--help" or args[0] == "-h":
        print_help()
    elif args[0] == "demo-override":
        matrix = [
            [0.6, 0.3, 0.1, 0.0],
            [0.2, 0.5, 0.3, 0.0],
            [0.0, 0.2, 0.5, 0.3],
            [0.1, 0.0, 0.3, 0.6],
        ]
        add_manual_override("ANS-2026-003", matrix, "打通S3回流S0，修复除零边界", "阿宁")
        print("\n>>> 改判后复算:")
        history = load_history()
        run_trial(history[-1]["id"])
    else:
        print(f"未知命令: {args[0]}")
        print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
