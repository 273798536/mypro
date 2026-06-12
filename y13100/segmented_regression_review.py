#!/usr/bin/env python3
import argparse
import csv
import os
import sys
import math
from collections import defaultdict
from datetime import datetime

TOLERANCE = 1e-9

UNIT_CONVERSION_TABLE = {
    ("bp", "%"): lambda v: v / 100.0,
    ("%","bp"): lambda v: v * 100.0,
    ("万",""): lambda v: v * 10000.0,
    ("","万"): lambda v: v / 10000.0,
    ("亿","万"): lambda v: v * 10000.0,
    ("万","亿"): lambda v: v / 10000.0,
    ("K",""): lambda v: v * 1000.0,
    ("","K"): lambda v: v / 1000.0,
    ("M","K"): lambda v: v * 1000.0,
    ("K","M"): lambda v: v / 1000.0,
}

REQUIRED_ANSWER_COLS = [
    "record_id", "segment", "historical_answer",
    "actual_value", "unit", "sort_key", "source_file", "source_row",
]

REQUIRED_WITHDRAWAL_COLS = [
    "withdrawal_id", "withdrawn_record_id", "withdrawal_reason",
    "final_conclusion", "final_value", "final_unit",
]


def read_csv_safe(filepath, required_cols, row_validator=None):
    rows = []
    bad = []
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not required_cols[0] in (reader.fieldnames or []):
            return rows, bad, []
        missing = [c for c in required_cols if c not in (reader.fieldnames or [])]
        if missing:
            return rows, bad, [{"file": filepath, "error": f"missing columns: {missing}", "row": 0, "detail": ""}]
        for i, row in enumerate(reader, start=2):
            issues = row_validator(row, i, filepath) if row_validator else []
            if issues:
                bad.extend(issues)
            else:
                row["_source_csv"] = filepath
                row["_csv_row"] = i
                rows.append(row)
    return rows, bad, []


def validate_answer_row(row, row_num, filepath):
    issues = []
    rid = row.get("record_id", "")
    if not rid:
        issues.append({"file": filepath, "row": row_num, "record_id": "", "error": "empty record_id", "detail": str(row)})
    for col in ("historical_answer", "actual_value", "sort_key"):
        val = row.get(col, "")
        if val == "" or val is None:
            issues.append({"file": filepath, "row": row_num, "record_id": rid, "error": f"missing {col}", "detail": f"{col} is empty"})
        else:
            try:
                float(val)
            except (ValueError, TypeError):
                issues.append({"file": filepath, "row": row_num, "record_id": rid, "error": f"non-numeric {col}", "detail": f"{col}={val}"})
    seg = row.get("segment", "")
    if not seg:
        issues.append({"file": filepath, "row": row_num, "record_id": rid, "error": "missing segment", "detail": "segment is empty"})
    return issues


def validate_withdrawal_row(row, row_num, filepath):
    issues = []
    wid = row.get("withdrawal_id", "")
    if not wid:
        issues.append({"file": filepath, "row": row_num, "record_id": "", "error": "empty withdrawal_id", "detail": str(row)})
    wrid = row.get("withdrawn_record_id", "")
    if not wrid:
        issues.append({"file": filepath, "row": row_num, "record_id": wid, "error": "empty withdrawn_record_id", "detail": str(row)})
    fv = row.get("final_value", "")
    if fv:
        try:
            float(fv)
        except (ValueError, TypeError):
            issues.append({"file": filepath, "row": row_num, "record_id": wid, "error": "non-numeric final_value", "detail": f"final_value={fv}"})
    return issues


def try_unit_convert(value, from_unit, to_unit, record_id, calc_trace):
    if from_unit == to_unit:
        return value
    key = (from_unit, to_unit)
    if key in UNIT_CONVERSION_TABLE:
        converted = UNIT_CONVERSION_TABLE[key](value)
        calc_trace.append({
            "record_id": record_id,
            "step": "unit_conversion",
            "from_unit": from_unit,
            "to_unit": to_unit,
            "original_value": value,
            "converted_value": converted,
            "formula": f"{value} {from_unit} -> {converted} {to_unit}",
        })
        return converted
    calc_trace.append({
        "record_id": record_id,
        "step": "unit_conversion_skipped",
        "from_unit": from_unit,
        "to_unit": to_unit,
        "original_value": value,
        "converted_value": value,
        "formula": f"no conversion rule for {from_unit}->{to_unit}, kept original",
    })
    return value


def segment_data(rows):
    segs = defaultdict(list)
    for r in rows:
        segs[r["segment"]].append(r)
    return dict(segs)


def compute_segment_metrics(seg_rows, calc_trace):
    errors = []
    for r in seg_rows:
        pred = float(r["historical_answer"])
        actual = float(r["actual_value"])
        unit = r["unit"]
        actual_unit = r.get("actual_unit", unit)
        if actual_unit and actual_unit != unit:
            pred = try_unit_convert(pred, unit, actual_unit, r["record_id"], calc_trace)
        diff = abs(pred - actual)
        is_error = diff > TOLERANCE
        r["_abs_diff"] = diff
        r["_pred_converted"] = pred
        r["_actual_value"] = actual
        calc_trace.append({
            "record_id": r["record_id"],
            "step": "error_check",
            "from_unit": unit,
            "to_unit": actual_unit or unit,
            "original_value": pred,
            "converted_value": pred,
            "formula": f"|{pred} - {actual}| = {diff:.10f} > {TOLERANCE} ? {'YES' if is_error else 'NO'}",
        })
        if is_error:
            errors.append({**r, "abs_diff": diff})
    return errors


def detect_sorting_instability(seg_rows, sort_key="sort_key"):
    groups = defaultdict(list)
    for r in seg_rows:
        sk = float(r[sort_key])
        groups[sk].append(r)

    unstable = []
    for sk_val, records in groups.items():
        if len(records) > 1:
            rids = [r["record_id"] for r in records]
            src_rows = [f"{r.get('source_file','')}#L{r.get('source_row','')}" for r in records]
            unstable.append({
                "sort_key_value": sk_val,
                "duplicate_count": len(records),
                "record_ids": ";".join(rids),
                "source_locations": ";".join(src_rows),
            })
    return unstable


def link_withdrawals(answer_rows, withdrawal_rows, calc_trace):
    linkage = []
    answer_by_id = {r["record_id"]: r for r in answer_rows}
    withdrawal_by_id = {r["withdrawal_id"]: r for r in withdrawal_rows}

    for w in withdrawal_rows:
        wid = w["withdrawal_id"]
        withdrawn_rid = w["withdrawn_record_id"]
        target = answer_by_id.get(withdrawn_rid)
        if not target:
            calc_trace.append({
                "record_id": withdrawn_rid,
                "step": "withdrawal_link_miss",
                "from_unit": "",
                "to_unit": "",
                "original_value": "",
                "converted_value": "",
                "formula": f"withdrawal_id={wid} references record_id={withdrawn_rid}, not found in answers",
            })
            linkage.append({
                "withdrawal_id": wid,
                "withdrawn_record_id": withdrawn_rid,
                "withdrawal_reason": w.get("withdrawal_reason", ""),
                "final_conclusion": w.get("final_conclusion", ""),
                "final_value": w.get("final_value", ""),
                "final_unit": w.get("final_unit", ""),
                "original_answer": "NOT_FOUND",
                "original_actual": "NOT_FOUND",
                "original_diff": "N/A",
                "link_status": "broken",
                "source_row": "",
            })
            continue

        orig_pred = float(target["historical_answer"])
        orig_actual = float(target["actual_value"])
        final_val = float(w["final_value"]) if w.get("final_value") else orig_actual
        orig_unit = target.get("unit", "")
        actual_unit = target.get("actual_unit", orig_unit)
        final_unit = w.get("final_unit", actual_unit)
        compare_unit = actual_unit or orig_unit
        if final_unit and compare_unit and final_unit != compare_unit:
            final_val = try_unit_convert(final_val, final_unit, compare_unit, withdrawn_rid, calc_trace)
        orig_diff = target.get("_abs_diff", abs(orig_pred - orig_actual))
        pred_converted = target.get("_pred_converted", orig_pred)
        final_diff = abs(pred_converted - final_val)
        calc_trace.append({
            "record_id": withdrawn_rid,
            "step": "withdrawal_link",
            "from_unit": orig_unit,
            "to_unit": final_unit,
            "original_value": orig_pred,
            "converted_value": final_val,
            "formula": f"orig_diff=|{orig_pred}-{orig_actual}|={orig_diff:.10f}; final_diff=|{orig_pred}-{final_val}|={final_diff:.10f}",
        })
        linkage.append({
            "withdrawal_id": wid,
            "withdrawn_record_id": withdrawn_rid,
            "withdrawal_reason": w.get("withdrawal_reason", ""),
            "final_conclusion": w.get("final_conclusion", ""),
            "final_value": w["final_value"],
            "final_unit": w.get("final_unit", ""),
            "original_answer": str(orig_pred),
            "original_actual": str(orig_actual),
            "original_diff": f"{orig_diff:.10f}",
            "link_status": "linked",
            "source_row": f"{target.get('source_file','')}#L{target.get('source_row','')}",
        })
    return linkage


def build_detail_rows(seg_rows, errors, linkage, unstable_keys):
    error_rids = {e["record_id"] for e in errors}
    withdrawn_rids = set()
    for lk in linkage:
        if lk["link_status"] == "linked":
            withdrawn_rids.add(lk["withdrawn_record_id"])

    unstable_rids = set()
    for u in unstable_keys:
        for rid in u["record_ids"].split(";"):
            unstable_rids.add(rid)

    details = []
    for r in seg_rows:
        rid = r["record_id"]
        pred = float(r["historical_answer"])
        actual = float(r["actual_value"])
        diff = r.get("_abs_diff", abs(pred - actual))
        is_error = rid in error_rids
        is_withdrawn = rid in withdrawn_rids
        is_unstable = rid in unstable_rids

        w_conclusion = ""
        w_reason = ""
        w_final = ""
        for lk in linkage:
            if lk["withdrawn_record_id"] == rid and lk["link_status"] == "linked":
                w_conclusion = lk["final_conclusion"]
                w_reason = lk["withdrawal_reason"]
                w_final = lk["final_value"]
                break

        flag_parts = []
        if is_error:
            flag_parts.append("ERROR")
        if is_withdrawn:
            flag_parts.append("WITHDRAWN")
        if is_unstable:
            flag_parts.append("SORT_UNSTABLE")

        details.append({
            "record_id": rid,
            "segment": r["segment"],
            "historical_answer": pred,
            "actual_value": actual,
            "abs_diff": f"{diff:.10f}",
            "unit": r["unit"],
            "sort_key": r["sort_key"],
            "flag": "|".join(flag_parts) if flag_parts else "OK",
            "withdrawal_reason": w_reason,
            "final_conclusion": w_conclusion,
            "final_value": w_final,
            "source": f"{r.get('source_file','')}#L{r.get('source_row','')}",
        })
    return details


def write_csv(filepath, rows, fieldnames):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def print_summary(segments, all_errors, all_unstable, bad_data, linkage, total_rows):
    print("=" * 72)
    print("分段回归错题复盘 — 终端摘要")
    print(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"总记录数: {total_rows}")
    print("=" * 72)

    print("\n【分段统计】")
    for seg, rows in sorted(segments.items()):
        err_count = sum(1 for r in rows if r["record_id"] in {e["record_id"] for e in all_errors})
        total = len(rows)
        rate = err_count / total * 100 if total else 0
        print(f"  分段 {seg}: {total} 条 | 错误 {err_count} 条 | 错误率 {rate:.2f}%")

    if all_unstable:
        print("\n⚠️  【排序不稳定 — 待确认】")
        for u in all_unstable:
            print(f"  sort_key={u['sort_key_value']} 出现 {u['duplicate_count']} 次")
            print(f"    涉及 record_id: {u['record_ids']}")
            print(f"    来源位置: {u['source_locations']}")
        print(f"  ⚠ 原因: 相同 sort_key 存在多条记录，排序顺序不确定")
        print(f"  ⚠ 影响范围: {len(all_unstable)} 组 sort_key 冲突，涉及 {sum(u['duplicate_count'] for u in all_unstable)} 条记录")
        print(f"  ⚠ 建议: 确认 sort_key 是否需要增加二级排序字段后再重跑")

    if bad_data:
        print("\n❌ 【坏数据】")
        for bd in bad_data:
            print(f"  文件={bd.get('file','')} 行={bd.get('row','')} id={bd.get('record_id','')}")
            print(f"    问题: {bd.get('error','')}")
            if bd.get("detail"):
                print(f"    详情: {bd['detail']}")

    if linkage:
        linked = [lk for lk in linkage if lk["link_status"] == "linked"]
        broken = [lk for lk in linkage if lk["link_status"] == "broken"]
        print(f"\n【撤回记录 ↔ 最终结论】共 {len(linkage)} 条")
        for lk in linked:
            print(f"  ✅ {lk['withdrawal_id']} -> {lk['withdrawn_record_id']}")
            print(f"     原始答案={lk['original_answer']} 实际值={lk['original_actual']} 差异={lk['original_diff']}")
            print(f"     撤回原因={lk['withdrawal_reason']} 最终结论={lk['final_conclusion']} 最终值={lk['final_value']}")
        for lk in broken:
            print(f"  ❌ {lk['withdrawal_id']} -> {lk['withdrawn_record_id']} (未匹配到历史答案)")

    print("\n" + "=" * 72)
    print("CSV 明细文件已写入输出目录，终端摘要结束。")
    print("=" * 72)


def run(input_dir, output_dir):
    os.makedirs(output_dir, exist_ok=True)

    all_answer_rows = []
    all_bad_data = []
    all_withdrawal_rows = []

    csv_files = sorted(
        f for f in os.listdir(input_dir) if f.lower().endswith(".csv")
    )

    for fname in csv_files:
        fpath = os.path.join(input_dir, fname)
        if "withdrawal" in fname.lower():
            rows, bad, missing = read_csv_safe(fpath, REQUIRED_WITHDRAWAL_COLS, validate_withdrawal_row)
            all_withdrawal_rows.extend(rows)
            all_bad_data.extend(bad)
            all_bad_data.extend(missing)
        else:
            rows, bad, missing = read_csv_safe(fpath, REQUIRED_ANSWER_COLS, validate_answer_row)
            all_answer_rows.extend(rows)
            all_bad_data.extend(bad)
            all_bad_data.extend(missing)

    if not all_answer_rows:
        print("❌ 输入目录中未找到有效的历史答案记录，请检查 CSV 格式和列名。", file=sys.stderr)
        sys.exit(1)

    calc_trace = []
    segments = segment_data(all_answer_rows)

    all_errors = []
    all_unstable = []
    all_detail_rows = []

    for seg_name, seg_rows in sorted(segments.items()):
        errors = compute_segment_metrics(seg_rows, calc_trace)
        all_errors.extend(errors)
        unstable = detect_sorting_instability(seg_rows)
        all_unstable.extend(unstable)

    linkage = link_withdrawals(all_answer_rows, all_withdrawal_rows, calc_trace)

    for seg_name, seg_rows in sorted(segments.items()):
        seg_errors = [e for e in all_errors if e["segment"] == seg_name]
        details = build_detail_rows(seg_rows, seg_errors, linkage, all_unstable)
        all_detail_rows.extend(details)

    write_csv(
        os.path.join(output_dir, "detail.csv"),
        all_detail_rows,
        ["record_id","segment","historical_answer","actual_value","abs_diff","unit","sort_key","flag","withdrawal_reason","final_conclusion","final_value","source"],
    )

    write_csv(
        os.path.join(output_dir, "withdrawal_linkage.csv"),
        linkage,
        ["withdrawal_id","withdrawn_record_id","withdrawal_reason","final_conclusion","final_value","final_unit","original_answer","original_actual","original_diff","link_status","source_row"],
    )

    write_csv(
        os.path.join(output_dir, "instability_report.csv"),
        all_unstable,
        ["sort_key_value","duplicate_count","record_ids","source_locations"],
    )

    write_csv(
        os.path.join(output_dir, "calculation_trace.csv"),
        calc_trace,
        ["record_id","step","from_unit","to_unit","original_value","converted_value","formula"],
    )

    write_csv(
        os.path.join(output_dir, "bad_data_report.csv"),
        all_bad_data,
        ["file","row","record_id","error","detail"],
    )

    print_summary(segments, all_errors, all_unstable, all_bad_data, linkage, len(all_answer_rows))


def main():
    parser = argparse.ArgumentParser(
        prog="分段回归错题复盘",
        description="对分段回归历史答案进行错题复盘，输出终端摘要和 CSV 明细。",
    )
    parser.add_argument(
        "--input-dir",
        required=True,
        help="包含历史答案 CSV 和撤回记录 CSV 的输入目录",
    )
    parser.add_argument(
        "--output-dir",
        required=True,
        help="CSV 明细文件的输出目录",
    )
    args = parser.parse_args()

    if not os.path.isdir(args.input_dir):
        print(f"❌ 输入目录不存在: {args.input_dir}", file=sys.stderr)
        sys.exit(1)

    run(args.input_dir, args.output_dir)


if __name__ == "__main__":
    main()
