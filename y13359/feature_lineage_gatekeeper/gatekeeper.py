#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import argparse
import csv
import json
import os
from collections import Counter, defaultdict
from pathlib import Path


FEATURE_META = {
    "user_ctr_7d": {
        "formula": "user_ctr_7d = 用户近7天点击次数 / 用户近7天曝光次数",
        "unit": "",
        "standard_unit": "",
        "standard_min": 0.0,
        "standard_max": 1.0,
        "delta_threshold": 0.005,
    },
    "item_click_rank": {
        "formula": "item_click_rank = 该商品近N天点击数在同品类中的排序位次",
        "unit": "分",
        "standard_unit": "分",
        "standard_min": 0,
        "standard_max": 9999,
        "delta_threshold": 20.0,
    },
    "user_active_tag": {
        "formula": "user_active_tag = 近30天是否有行为(1)或无行为(0)，未知用null表示",
        "unit": "bool",
        "standard_unit": "bool",
        "standard_min": 0,
        "standard_max": 1,
        "delta_threshold": 0.0,
    },
    "new_user_retention_1d": {
        "formula": "new_user_retention_1d = D+1日活跃D日新用户数 / D日新增用户数",
        "unit": "%",
        "standard_unit": "%",
        "standard_min": 0.0,
        "standard_max": 1.0,
        "delta_threshold": 0.005,
    },
    "exposure_price_avg": {
        "formula": "exposure_price_avg = 曝光时段商品支付价均值",
        "unit": "元",
        "standard_unit": "元",
        "standard_min": 0.0,
        "standard_max": 999999.0,
        "delta_threshold": 10.0,
    },
    "user_gender_pred": {
        "formula": "user_gender_pred = 用户性别预测，离散值 {0:未知, 1:男, 2:女}",
        "unit": "类别",
        "standard_unit": "类别",
        "standard_min": 0,
        "standard_max": 2,
        "delta_threshold": 0.0,
    },
}


def load_csv(path):
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=2):
            row["_raw_line"] = i
            rows.append(row)
    return rows


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_text(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def check_row(row):
    feature = row["feature_name"]
    meta = FEATURE_META.get(feature, {})
    issues = []

    unit = (row.get("unit") or "").strip()
    std_unit = meta.get("standard_unit", "")
    if std_unit and not unit:
        issues.append({"type": "unit_missing", "msg": f"单位缺失，标准单位应为「{std_unit}」"})
    elif std_unit and unit and unit != std_unit:
        issues.append({"type": "unit_mismatch", "msg": f"单位「{unit}」与标准「{std_unit}」不一致"})

    try:
        bmin = float(row["boundary_min"]) if row.get("boundary_min") != "" else None
        bmax = float(row["boundary_max"]) if row.get("boundary_max") != "" else None
    except ValueError:
        bmin = bmax = None
    std_min = meta.get("standard_min")
    std_max = meta.get("standard_max")
    if bmin is not None and std_min is not None and bmin < std_min:
        issues.append({"type": "boundary_low", "msg": f"下限{bmin} 低于标准下限{std_min}"})
    if bmax is not None and std_max is not None and bmax > std_max:
        issues.append({"type": "boundary_high", "msg": f"上限{bmax} 高于标准上限{std_max}"})

    try:
        oval = float(row["offline_value"]) if row.get("offline_value") != "" else None
        nval = float(row["online_value"]) if row.get("online_value") != "" else None
    except ValueError:
        oval = nval = None

    if oval is not None and bmin is not None and bmax is not None and (oval < bmin or oval > bmax):
        pass
    if oval is not None and std_min is not None and std_max is not None and (oval < std_min or oval > std_max):
        issues.append({"type": "value_out_of_std", "msg": f"离线值 {oval} 超出标准值范围 [{std_min}, {std_max}]"})

    if feature == "user_gender_pred" and oval is not None and int(oval) != oval:
        issues.append({"type": "non_discrete", "msg": f"类别特征离线值 {oval} 非离散整数"})

    if oval is not None and nval is not None:
        delta = abs(oval - nval)
        th = meta.get("delta_threshold")
        if th and delta > th:
            issues.append({"type": "delta_over", "msg": f"离/线上差值 {delta:.4f} 超过阈值 {th}"})

    return issues


def find_duplicate_run_ids(rows):
    cnt = Counter(r["run_id"] for r in rows)
    dups = {rid: [] for rid, c in cnt.items() if c > 1}
    for r in rows:
        if r["run_id"] in dups:
            dups[r["run_id"]].append(r)
    return dups


def build_pending(dups):
    pending = {}
    for rid, rs in dups.items():
        features = list({r["feature_name"] for r in rs})
        lines = [r["_raw_line"] for r in rs]
        pending[rid] = {
            "run_id": rid,
            "appearances": len(rs),
            "raw_lines": lines,
            "features": features,
            "possible_reasons": [
                "同一 run_id 被重复提交，可能是任务重跑覆盖前一次",
                "可能是不同窗口/不同口径的数据错挂到同一 run_id",
                "可能是任务调度系统重复派发",
            ],
            "impact_scope": {
                "affected_rows": lines,
                "affected_features": features,
                "risk": "在确认前不给出最终通过/失败结论，以免坏数据带偏整体通过率",
            },
            "action_required": "请联系提交方或调度方确认以哪次提交为准，废弃其他提交后重新计算",
        }
    return pending


def write_failed_raw_lines(rows):
    out = []
    for r in rows:
        if r.get("status", "").strip().upper() == "FAIL":
            out.append({
                "raw_line": r["_raw_line"],
                "run_id": r["run_id"],
                "feature_name": r["feature_name"],
                "offline_value": r["offline_value"],
                "online_value": r["online_value"],
                "fail_reason": r.get("fail_reason", ""),
                "row_object": {k: v for k, v in r.items()},
            })
    return out


def build_report(rows, normal, notes, pending, failed_raw):
    lines = []
    lines.append("# 特征血缘上线守门报告")
    lines.append("")
    fail_count = sum(1 for r in rows if r.get("status", "").upper() == "FAIL")
    lines.append(f"> 失败队列 {fail_count} 条，正常记录 1 条，重复 run_id {len(pending)} 个")
    lines.append("")

    lines.append("## 一、特征公式、单位、边界值（明处）")
    lines.append("")
    lines.append("| feature | 公式 | 单位 | 标准下限 | 标准上限 | Δ阈值 |")
    lines.append("|---|---|---|---|---|---|")
    for fname, m in FEATURE_META.items():
        lines.append(f"| {fname} | {m['formula']} | {m['standard_unit'] or '-'} | {m['standard_min']} | {m['standard_max']} | {m['delta_threshold']} |")
    lines.append("")

    lines.append("## 二、失败队列明细")
    lines.append("")
    lines.append("> 按原始行号排序，逐条列原因。若 run_id 重复，先看第三节『待确认 run_id』。")
    lines.append("")
    lines.append("| 原始行 | run_id | feature | 离线值 | 线上值 | 单位 | 边界 | 检查发现 | 原因 |")
    lines.append("|---|---|---|---|---|---|---|---|---|")
    for r in rows:
        if r.get("status", "").upper() == "FAIL":
            issues = check_row(r)
            boundary = f"[{r.get('boundary_min')}, {r.get('boundary_max')}]"
            issue_str = "；".join(i["msg"] for i in issues) if issues else "-"
            lines.append(
                f"| {r['_raw_line']} | {r['run_id']} | {r['feature_name']} | {r.get('offline_value','')} | {r.get('online_value','')} | {r.get('unit','') or '-'} | {boundary} | {issue_str} | {r.get('fail_reason','')} |"
            )
    lines.append("")

    lines.append("## 三、待确认 run_id（重复提交，暂不算最终数字）")
    lines.append("")
    if pending:
        for rid, info in pending.items():
            lines.append(f"### run_id: `{rid}`")
            lines.append("")
            lines.append(f"- 出现次数：{info['appearances']}")
            lines.append(f"- 涉及原始行：{info['raw_lines']}")
            lines.append(f"- 涉及特征：{', '.join(info['features'])}")
            lines.append("- 可能原因：")
            for reason in info["possible_reasons"]:
                lines.append(f"  - {reason}")
            lines.append(f"- 影响范围：")
            lines.append(f"  - 行：{info['impact_scope']['affected_rows']}")
            lines.append(f"  - 特征：{info['impact_scope']['affected_features']}")
            lines.append(f"  - 风险提示：{info['impact_scope']['risk']}")
            lines.append(f"- 待办：{info['action_required']}")
            lines.append("")
    else:
        lines.append("无。")
        lines.append("")

    lines.append("## 四、一条正常通过记录")
    lines.append("")
    if normal:
        lines.append(f"- run_id：`{normal.get('run_id')}`")
        lines.append(f"- feature：{normal.get('feature_name')}")
        lines.append(f"- 公式：{normal.get('formula')}")
        lines.append(f"- 离线值：{normal.get('offline_value')} {normal.get('unit','')}")
        lines.append(f"- 线上值：{normal.get('online_value')} {normal.get('unit','')}")
        lines.append(f"- 差值：{normal.get('check_items',{}).get('offline_online_delta')}")
        lines.append(f"- 阈值：{normal.get('check_items',{}).get('delta_threshold')}")
        lines.append(f"- 结论：{normal.get('remark')}")
        lines.append("")

    lines.append("## 五、后补说明")
    lines.append("")
    if notes:
        lines.append(notes)
        lines.append("")

    lines.append("## 六、原始失败行速查（对象级）")
    lines.append("")
    lines.append("> 详见 `output/failed_raw_lines.json`，可直接按 row_object 字段回源。")
    lines.append("")
    for fr in failed_raw:
        lines.append(f"- 行 {fr['raw_line']} / run_id `{fr['run_id']}` / {fr['feature_name']}")
        lines.append(f"  - 失败原因：{fr['fail_reason']}")
    lines.append("")
    return "\n".join(lines)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--failed-queue", required=True, help="失败队列 CSV")
    p.add_argument("--normal", required=True, help="正常记录 JSON")
    p.add_argument("--notes", required=True, help="后补说明 MD")
    p.add_argument("--output-dir", default="output", help="输出目录")
    args = p.parse_args()

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    rows = load_csv(args.failed_queue)
    normal = load_json(args.normal)
    notes = load_text(args.notes)

    dups = find_duplicate_run_ids(rows)
    pending = build_pending(dups)
    failed_raw = write_failed_raw_lines(rows)

    with open(out_dir / "pending_run_ids.json", "w", encoding="utf-8") as f:
        json.dump(pending, f, ensure_ascii=False, indent=2)

    with open(out_dir / "failed_raw_lines.json", "w", encoding="utf-8") as f:
        json.dump(failed_raw, f, ensure_ascii=False, indent=2)

    report = build_report(rows, normal, notes, pending, failed_raw)
    with open(out_dir / "gatekeeper_report.md", "w", encoding="utf-8") as f:
        f.write(report)

    print(f"[OK] 守门报告: {out_dir / 'gatekeeper_report.md'}")
    print(f"[OK] 待确认 run_id: {out_dir / 'pending_run_ids.json'}")
    print(f"[OK] 失败原始行: {out_dir / 'failed_raw_lines.json'}")


if __name__ == "__main__":
    main()
