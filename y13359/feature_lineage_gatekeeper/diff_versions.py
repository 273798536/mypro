#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import argparse
import json
import os
import sys
from pathlib import Path


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def fmt_num(v, digits=4):
    if isinstance(v, float):
        return f"{v:.{digits}f}"
    return str(v)


def flag_diff(old, new, reverse=False):
    """返回 Δ 值和是否异常"""
    try:
        delta = float(new) - float(old)
    except (TypeError, ValueError):
        return str(new) != str(old), None
    return delta, delta


def section_samples(v1, v2, lines):
    lines.append("## 一、样本变化")
    lines.append("")
    lines.append("| 维度 | 前一版 v1 | 当前版 v2 | Δ | 备注 |")
    lines.append("|---|---|---|---|---|")
    lines.append(f"| 样本总量 | {v1['total_count']:,} | {v2['total_count']:,} | {v2['total_count']-v1['total_count']:+,} |  |")
    lines.append(f"| 正样本 | {v1['positive_count']:,} | {v2['positive_count']:,} | {v2['positive_count']-v1['positive_count']:+,} |  |")
    lines.append(f"| 负样本 | {v1['negative_count']:,} | {v2['negative_count']:,} | {v2['negative_count']-v1['negative_count']:+,} |  |")
    lines.append(f"| 覆盖率 | {v1['coverage_rate']:.2%} | {v2['coverage_rate']:.2%} | {v2['coverage_rate']-v1['coverage_rate']:+.2%} | {'下降，需确认' if v2['coverage_rate'] < v1['coverage_rate'] else ''} |")
    lines.append(f"| 时间范围 | {v1['time_range']} | {v2['time_range']} | - |  |")
    lines.append(f"| 采样策略 | {v1['sampling_strategy']} | {v2['sampling_strategy']} | - |  |")
    lines.append("")
    lines.append("### 按特征样本量")
    lines.append("")
    lines.append("| feature | v1 样本量 | v1 null | v2 样本量 | v2 null | 变化 |")
    lines.append("|---|---|---|---|---|---|")
    v1_f = {f["name"]: f for f in v1["features"]}
    v2_f = {f["name"]: f for f in v2["features"]}
    all_names = sorted(set(v1_f.keys()) | set(v2_f.keys()))
    for name in all_names:
        f1 = v1_f.get(name, {"sample_count": "-", "null_count": "-"})
        f2 = v2_f.get(name, {"sample_count": "-", "null_count": "-"})
        delta = ""
        if isinstance(f1["sample_count"], int) and isinstance(f2["sample_count"], int):
            delta = f"{f2['sample_count']-f1['sample_count']:+,}"
        if name not in v1_f:
            delta = "新增特征"
        elif name not in v2_f:
            delta = "已移除"
        lines.append(f"| {name} | {f1['sample_count']} | {f1['null_count']} | {f2['sample_count']} | {f2['null_count']} | {delta} |")
    lines.append("")


def section_thresholds(v1, v2, lines):
    lines.append("## 二、阈值变化")
    lines.append("")
    lines.append("### 全局阈值")
    lines.append("")
    lines.append("| 阈值项 | v1 | v2 | 变化 |")
    lines.append("|---|---|---|---|")
    for k in sorted(set(v1["thresholds"].keys()) | set(v2["thresholds"].keys())):
        t1 = v1["thresholds"].get(k, "-")
        t2 = v2["thresholds"].get(k, "-")
        delta = ""
        if isinstance(t1, (int, float)) and isinstance(t2, (int, float)):
            delta = f"{t2-t1:+.4f}"
        lines.append(f"| {k} | {t1} | {t2} | {delta} |")
    lines.append("")
    lines.append("### 特征级阈值")
    lines.append("")
    lines.append("| feature | 阈值项 | v1 | v2 | 变化 |")
    lines.append("|---|---|---|---|---|")
    v1_feat = v1.get("features", {})
    v2_feat = v2.get("features", {})
    for name in sorted(set(v1_feat.keys()) | set(v2_feat.keys())):
        f1 = v1_feat.get(name, {})
        f2 = v2_feat.get(name, {})
        for k in sorted(set(f1.keys()) | set(f2.keys())):
            t1 = f1.get(k, "-")
            t2 = f2.get(k, "-")
            delta = ""
            if isinstance(t1, (int, float)) and isinstance(t2, (int, float)):
                delta = f"{t2-t1:+.4f}"
            lines.append(f"| {name} | {k} | {t1} | {t2} | {delta} |")
    lines.append("")


def section_manual_corrections(v1, v2, lines):
    lines.append("## 三、人工修正")
    lines.append("")
    lines.append(f"v1 修正 {v1['total_corrections']} 条，v2 修正 {v2['total_corrections']} 条。")
    lines.append("")
    v1_map = {}
    for c in v1.get("corrections", []):
        key = (c["feature"], c["change"])
        v1_map[key] = c
    v2_map = {}
    for c in v2.get("corrections", []):
        key = (c["feature"], c["change"])
        v2_map[key] = c
    added = [c for k, c in v2_map.items() if k not in v1_map]
    removed = [c for k, c in v1_map.items() if k not in v2_map]
    if added:
        lines.append("### 新增修正")
        lines.append("")
        for c in added:
            lines.append(f"- **{c['feature']}** —— {c['change']}  ")
            lines.append(f"  - 修正人：{c['corrector']}  @ {c['time']}")
            lines.append(f"  - 原因：{c['reason']}")
        lines.append("")
    if removed:
        lines.append("### 已移除修正")
        lines.append("")
        for c in removed:
            lines.append(f"- **{c['feature']}** —— {c['change']}（原因为：{c['reason']}）")
        lines.append("")
    if not added and not removed:
        lines.append("无变化。")
        lines.append("")


def section_metrics(v1_m, v2_m, v2_t, lines):
    lines.append("## 四、指标变化")
    lines.append("")
    lines.append(f"v1 通过率 {v1_m['overall_pass_rate']:.0%}，v2 通过率 {v2_m['overall_pass_rate']:.0%}。")
    lines.append("")
    lines.append("| feature | 指标 | v1 离线 | v1 线上 | v1 Δ | v2 离线 | v2 线上 | v2 Δ | Δ 的变化 | v2 阈值 | 结论 |")
    lines.append("|---|---|---|---|---|---|---|---|---|---|---|")
    v1_feat = v1_m.get("metrics", {})
    v2_feat = v2_m.get("metrics", {})
    feat_th = v2_t.get("features", {})
    for name in sorted(set(v1_feat.keys()) | set(v2_feat.keys())):
        m1 = v1_feat.get(name)
        m2 = v2_feat.get(name)
        if not m1 or not m2:
            lines.append(f"| {name} | mean | {'v1缺失' if not m1 else m1['offline_mean']} | ... | ... | {'v2缺失' if not m2 else m2['offline_mean']} | ... | ... | - | {'单侧缺失，无法对比'} |")
            continue
        th = feat_th.get(name, {}).get("delta_abs", v2_t["thresholds"]["offline_online_delta_abs"])
        d1 = m1["delta_abs"]
        d2 = m2["delta_abs"]
        dd = d2 - d1
        flag = ""
        if not m2["pass"]:
            flag = "**FAIL**"
        elif abs(dd) > th * 0.5:
            flag = "⚠ 变化大"
        unit = m2.get("unit", "") or m1.get("unit", "")
        lines.append(
            f"| {name} | mean{(' ('+unit+')') if unit else ''} | {m1['offline_mean']:.4f} | {m1['online_mean']:.4f} | {d1:.4f} | {m2['offline_mean']:.4f} | {m2['online_mean']:.4f} | {d2:.4f} | {dd:+.4f} | {th} | {flag or 'PASS'} |"
        )
    lines.append("")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--v1", required=True, help="前一版数据目录")
    p.add_argument("--v2", required=True, help="当前版数据目录")
    p.add_argument("--output", default="output/diff_report.md", help="输出报告路径")
    args = p.parse_args()

    v1_dir = Path(args.v1)
    v2_dir = Path(args.v2)
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    v1_samples = load_json(v1_dir / "samples.json")
    v1_th = load_json(v1_dir / "thresholds.json")
    v1_corr = load_json(v1_dir / "manual_corrections.json")
    v1_met = load_json(v1_dir / "metrics.json")

    v2_samples = load_json(v2_dir / "samples.json")
    v2_th = load_json(v2_dir / "thresholds.json")
    v2_corr = load_json(v2_dir / "manual_corrections.json")
    v2_met = load_json(v2_dir / "metrics.json")

    lines = [f"# 特征血缘 —— 版本对比报告", "", f"> v1: {args.v1}   vs   v2: {args.v2}", ""]

    section_samples(v1_samples, v2_samples, lines)
    section_thresholds(v1_th, v2_th, lines)
    section_manual_corrections(v1_corr, v2_corr, lines)
    section_metrics(v1_met, v2_met, v2_th, lines)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[OK] 版本对比报告已输出: {out_path}")


if __name__ == "__main__":
    main()
