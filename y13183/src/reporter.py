#!/usr/bin/env python3
"""冷却塔水滴误差归因 - 报告生成器"""

import json
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any

from .models import AttributionResult, PersistentState, ErrorCategory, Status
from .analyzer import STATE_FILE


REPORTS_DIR = Path(__file__).parent.parent / "reports"
OUTPUT_DIR = Path(__file__).parent.parent / "output"


def ensure_dirs():
    REPORTS_DIR.mkdir(exist_ok=True)
    OUTPUT_DIR.mkdir(exist_ok=True)


def generate_json_bundle(result: AttributionResult,
                         filter_conditions: Dict[str, Any]) -> Dict[str, Any]:
    bundle = {
        "meta": {
            "run_id": result.run_id,
            "run_timestamp": result.run_timestamp,
            "device_id": result.device_id,
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        },
        "filter_conditions": filter_conditions,
        "statistics": {
            "total_samples": result.total_samples,
            "valid_samples": result.valid_samples,
            "sampling_gap_count": result.sampling_gap_count,
            "mean_error_pct": result.mean_error_pct,
            "max_error_pct": result.max_error_pct,
            "min_error_pct": result.min_error_pct,
            "std_error_pct": result.std_error_pct,
            "attribution_distribution": {
                "漂移偏差_pct": result.drift_pct,
                "校准偏差_pct": result.calibration_pct,
                "环境干扰_pct": result.environmental_pct,
                "采样缺口_pct": result.sampling_gap_pct,
                "待确认_pct": result.unknown_pct
            }
        },
        "detail_rows": result.detail_rows,
        "anomaly_queue": [a.to_dict() for a in result.anomalies],
        "boundary_samples": result.boundary_samples,
        "formula": {
            "expression": result.formula_used,
            "units": result.formula_units
        },
        "parameters": result.parameters_used,
        "notes": result.notes
    }
    return bundle


def format_value(v, digits=2, suffix=""):
    if v is None:
        return "-"
    if isinstance(v, float):
        return f"{round(v, digits)}{suffix}"
    return f"{v}{suffix}"


def generate_markdown_report(result: AttributionResult,
                             filter_conditions: Dict[str, Any],
                             prev_params: Optional[Dict[str, Any]] = None) -> str:
    lines = []

    lines.append("# 冷却塔水滴误差归因报告")
    lines.append("")
    lines.append(f"- **运行编号**: {result.run_id}")
    lines.append(f"- **生成时间**: {result.run_timestamp}")
    lines.append(f"- **设备**: {result.device_id}")
    lines.append("")

    lines.append("## 一、筛选条件")
    lines.append("")
    lines.append("| 条件 | 值 |")
    lines.append("|------|----|")
    for k, v in filter_conditions.items():
        lines.append(f"| {k} | {v if v else '(未设置)'} |")
    lines.append("")

    lines.append("## 二、统计数字")
    lines.append("")
    lines.append("| 指标 | 数值 | 单位 |")
    lines.append("|------|------|------|")
    lines.append(f"| 总采样点数 | {result.total_samples} | 个 |")
    lines.append(f"| 有效采样点 | {result.valid_samples} | 个 |")
    lines.append(f"| 采样缺口数 | {result.sampling_gap_count} | 处 |")
    lines.append(f"| 平均误差 | {result.mean_error_pct} | % |")
    lines.append(f"| 最大误差 | {result.max_error_pct} | % |")
    lines.append(f"| 最小误差 | {result.min_error_pct} | % |")
    lines.append(f"| 误差标准差 | {result.std_error_pct} | % |")
    lines.append("")
    lines.append("**误差归因分布**:")
    lines.append("")
    lines.append("| 归因类别 | 占比 |")
    lines.append("|----------|------|")
    lines.append(f"| 漂移偏差 | {result.drift_pct}% |")
    lines.append(f"| 校准偏差 | {result.calibration_pct}% |")
    lines.append(f"| 环境干扰 | {result.environmental_pct}% |")
    lines.append(f"| 采样缺口 | {result.sampling_gap_pct}% |")
    lines.append(f"| 待确认 | {result.unknown_pct}% |")
    lines.append("")

    lines.append("## 三、公式与单位")
    lines.append("")
    lines.append("```")
    lines.append(result.formula_used)
    lines.append("```")
    lines.append("")
    lines.append("**符号与单位**:")
    lines.append("")
    lines.append("| 符号 | 单位及含义 |")
    lines.append("|------|-----------|")
    for k, v in result.formula_units.items():
        lines.append(f"| {k} | {v} |")
    lines.append("")

    lines.append("## 四、本次使用参数")
    lines.append("")
    if prev_params:
        lines.append("| 参数 | 本次值 | 上次值 | 变化 |")
        lines.append("|------|--------|--------|------|")
        for k in sorted(set(list(result.parameters_used.keys()) + list(prev_params.keys()))):
            cur = result.parameters_used.get(k, "-")
            prev = prev_params.get(k, "-")
            delta = ""
            if isinstance(cur, (int, float)) and isinstance(prev, (int, float)):
                d = cur - prev
                sign = "+" if d > 0 else ""
                delta = f"{sign}{round(d, 4)}"
            lines.append(f"| {k} | {cur} | {prev} | {delta} |")
    else:
        lines.append("| 参数 | 值 |")
        lines.append("|------|----|")
        for k, v in sorted(result.parameters_used.items()):
            lines.append(f"| {k} | {v} |")
    lines.append("")

    if prev_params and result.parameters_used != prev_params:
        lines.append("> 参数调整说明：本次运行较上次调整了参数，")
        lines.append("> 边界修正系数、温湿度修正系数、误差阈值等变化会直接影响修正后流量 Q_corr，")
        lines.append("> 从而使误差率 ε、归因分布和异常检出数量发生变化。")
        lines.append("")

    lines.append("## 五、边界样本说明")
    lines.append("")
    if result.boundary_samples:
        lines.append("| 时间 | 原始值(m3/h) | 量程占比 | 边界说明 | 修正系数 | 补充说明 |")
        lines.append("|------|-------------|---------|---------|---------|---------|")
        for bs in result.boundary_samples:
            lines.append(
                f"| {bs['timestamp']} | {bs['raw_value']} | {bs['range_pct']}% | "
                f"{bs['boundary_hint']} | {bs['k_boundary']} | {bs.get('correction_note', '')} |"
            )
    else:
        lines.append("_本次未检出边界样本_")
    lines.append("")
    lines.append("> 边界样本影响：高低端流量超出校准线性区间时，水滴计数器的采样频率或涡轮转速非线性，")
    lines.append("> 需乘以修正系数 K_boundary；该系数变化会直接改变修正后流量和误差率。")
    lines.append("")

    lines.append("## 六、明细表")
    lines.append("")
    lines.append(
        "| 时间 | 原始值(m3/h) | 参考值(m3/h) | 修正值(m3/h) | 误差(%) | "
        "K边界 | K环境 | K漂移 | 边界提示 | 归因类别 | 异常ID |"
    )
    lines.append(
        "|------|-------------|-------------|-------------|---------|"
        "------|------|------|---------|---------|--------|"
    )
    for r in result.detail_rows:
        lines.append(
            f"| {r['timestamp']} | {format_value(r.get('raw_value'))} | "
            f"{format_value(r.get('reference_value'))} | {format_value(r.get('corrected_value'))} | "
            f"{format_value(r.get('error_pct'))} | {format_value(r.get('k_boundary'))} | "
            f"{format_value(r.get('k_env'))} | {format_value(r.get('k_drift'))} | "
            f"{r.get('boundary_hint', '')} | {r.get('category', '')} | {r.get('anomaly_id', '')} |"
        )
    lines.append("")

    lines.append("## 七、异常队列")
    lines.append("")
    if result.anomalies:
        lines.append("> **处理人**: 老何")
        lines.append("")
        lines.append(
            "| 异常ID | 时间 | 类别 | 描述 | 测量值(m3/h) | 参考值(m3/h) | "
            "误差(%) | 状态 | 边界提示 | 下一步 |"
        )
        lines.append(
            "|--------|------|------|------|-------------|-------------|"
            "--------|------|---------|--------|"
        )
        for a in result.anomalies:
            lines.append(
                f"| {a.anomaly_id} | {a.timestamp} | {a.category.value} | {a.description} | "
                f"{round(a.measured_value,2) if a.measured_value else '-'} | "
                f"{round(a.expected_value,2) if a.expected_value else '-'} | "
                f"{round(a.error_pct,2)} | {a.status.value} | {a.boundary_hint} | 见下方 |"
            )
        lines.append("")
        lines.append("### 各异常下一步处理")
        lines.append("")
        for a in result.anomalies:
            lines.append(f"#### {a.anomaly_id} ({a.timestamp} - {a.category.value})")
            lines.append("")
            lines.append(f"- **边界提示**: {a.boundary_hint or '无'}")
            lines.append(f"- **当前状态**: {a.status.value}")
            lines.append("")
            lines.append("**下一步操作**:")
            lines.append("")
            for step in a.action_next.split(";"):
                step = step.strip()
                if step:
                    lines.append(f"- {step}")
            lines.append("")
            lines.append("**历史记录**:")
            lines.append("")
            for h in a.history:
                lines.append(f"- [{h['time']}] {h['event']}")
            lines.append("")
    else:
        lines.append("_本次运行未检出异常_")
        lines.append("")

    lines.append("## 八、备注与说明")
    lines.append("")
    for n in result.notes:
        lines.append(f"- {n}")
    lines.append("")

    state = PersistentState.load(STATE_FILE)
    if state.historical_notes:
        lines.append("## 九、历史备注（重启后保留）")
        lines.append("")
        for h in state.historical_notes[-5:]:
            lines.append(f"- [{h['timestamp']}] {h['run_id']}: {h['content']}")
        lines.append("")

    return "\n".join(lines)


def generate_anomaly_queue_text(result: AttributionResult) -> str:
    lines = []
    lines.append("=" * 60)
    lines.append("  冷却塔水滴误差归因 - 异常队列 (给老何)")
    lines.append(f"  生成时间: {result.run_timestamp}")
    lines.append(f"  运行编号: {result.run_id}")
    lines.append("=" * 60)
    lines.append("")

    if not result.anomalies:
        lines.append("当前无异常。")
        return "\n".join(lines)

    lines.append(f"共 {len(result.anomalies)} 项异常，处理人：老何")
    lines.append("")
    for i, a in enumerate(result.anomalies, 1):
        lines.append(f"--- 第 {i} 项 / {a.anomaly_id} ---")
        lines.append(f"时间: {a.timestamp}")
        lines.append(f"类别: {a.category.value}  ({a.description})")
        lines.append(f"测量值: {round(a.measured_value,2) if a.measured_value else '-'} m3/h  |  "
                     f"参考值: {round(a.expected_value,2) if a.expected_value else '-'} m3/h  |  "
                     f"误差: {round(a.error_pct,2)}%")
        lines.append(f"状态: {a.status.value}")
        if a.boundary_hint:
            lines.append(f"边界提示: {a.boundary_hint}")
        lines.append("")
        lines.append("下一步:")
        for step in a.action_next.split(";"):
            step = step.strip()
            if step:
                lines.append(f"  {step}")
        lines.append("")

    lines.append("=" * 60)
    lines.append(f"当前状态总览: 异常={len(result.anomalies)}项, "
                 f"均误差={result.mean_error_pct}%, "
                 f"采样缺口={result.sampling_gap_count}处")
    lines.append("=" * 60)
    return "\n".join(lines)


def save_all_outputs(result: AttributionResult,
                     filter_conditions: Dict[str, Any],
                     prev_params: Optional[Dict[str, Any]] = None):
    ensure_dirs()

    bundle = generate_json_bundle(result, filter_conditions)
    json_path = OUTPUT_DIR / f"{result.run_id}_bundle.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(bundle, f, ensure_ascii=False, indent=2)

    md_path = REPORTS_DIR / f"{result.run_id}_report.md"
    md_content = generate_markdown_report(result, filter_conditions, prev_params)
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    queue_path = OUTPUT_DIR / f"{result.run_id}_anomaly_queue.txt"
    queue_content = generate_anomaly_queue_text(result)
    with open(queue_path, "w", encoding="utf-8") as f:
        f.write(queue_content)

    state = PersistentState.load(STATE_FILE)
    state.report_history.append({
        "run_id": result.run_id,
        "timestamp": result.run_timestamp,
        "report_md": str(md_path),
        "bundle_json": str(json_path),
        "anomaly_queue": str(queue_path)
    })
    state.save(STATE_FILE)

    return json_path, md_path, queue_path
