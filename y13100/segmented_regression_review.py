#!/usr/bin/env python3
import argparse
import csv
import os
import sys
import math
from collections import defaultdict
from datetime import datetime

EXIT_OK = 0
EXIT_HARD_ERROR = 1
EXIT_PENDING_CONFIRM = 2

TOLERANCE = 1e-9

UNIT_CONVERSION_TABLE = {
    ("bp", "%"): lambda v: v / 100.0,
    ("%", "bp"): lambda v: v * 100.0,
    ("万", ""): lambda v: v * 10000.0,
    ("", "万"): lambda v: v / 10000.0,
    ("亿", "万"): lambda v: v * 10000.0,
    ("万", "亿"): lambda v: v / 10000.0,
    ("K", ""): lambda v: v * 1000.0,
    ("", "K"): lambda v: v / 1000.0,
    ("M", "K"): lambda v: v * 1000.0,
    ("K", "M"): lambda v: v / 1000.0,
}

REQUIRED_ANSWER_COLS = [
    "record_id", "segment", "historical_answer",
    "actual_value", "unit", "sort_key", "source_file", "source_row",
]

REQUIRED_WITHDRAWAL_COLS = [
    "withdrawal_id", "withdrawn_record_id", "withdrawal_reason",
    "final_conclusion", "final_value", "final_unit",
]

DETAIL_FIELDS = [
    "record_id", "segment", "historical_answer", "actual_value",
    "abs_diff", "unit", "sort_key", "flag",
    "withdrawal_reason", "final_conclusion", "final_value", "source",
]

WITHDRAWAL_FIELDS = [
    "withdrawal_id", "withdrawn_record_id", "withdrawal_reason",
    "final_conclusion", "final_value", "final_unit",
    "original_answer", "original_actual", "original_diff",
    "link_status", "source_row",
]

INSTABILITY_FIELDS = [
    "sort_key_value", "duplicate_count", "record_ids", "source_locations",
]

TRACE_FIELDS = [
    "record_id", "step", "from_unit", "to_unit",
    "original_value", "converted_value", "formula",
]

BAD_DATA_FIELDS = ["file", "row", "record_id", "error", "detail"]


def read_csv_safe(filepath, required_cols, row_validator=None):
    rows = []
    bad = []
    with open(filepath, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not required_cols[0] in (reader.fieldnames or []):
            return rows, bad, []
        missing = [c for c in required_cols if c not in (reader.fieldnames or [])]
        if missing:
            return rows, bad, [{
                "file": filepath, "row": 0, "record_id": "",
                "error": f"missing columns: {missing}", "detail": "",
            }]
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
        issues.append({
            "file": filepath, "row": row_num, "record_id": "",
            "error": "empty record_id", "detail": str(row),
        })
    for col in ("historical_answer", "actual_value", "sort_key"):
        val = row.get(col, "")
        if val == "" or val is None:
            issues.append({
                "file": filepath, "row": row_num, "record_id": rid,
                "error": f"missing {col}", "detail": f"{col} is empty",
            })
        else:
            try:
                float(val)
            except (ValueError, TypeError):
                issues.append({
                    "file": filepath, "row": row_num, "record_id": rid,
                    "error": f"non-numeric {col}", "detail": f"{col}={val}",
                })
    seg = row.get("segment", "")
    if not seg:
        issues.append({
            "file": filepath, "row": row_num, "record_id": rid,
            "error": "missing segment", "detail": "segment is empty",
        })
    return issues


def validate_withdrawal_row(row, row_num, filepath):
    issues = []
    wid = row.get("withdrawal_id", "")
    if not wid:
        issues.append({
            "file": filepath, "row": row_num, "record_id": "",
            "error": "empty withdrawal_id", "detail": str(row),
        })
    wrid = row.get("withdrawn_record_id", "")
    if not wrid:
        issues.append({
            "file": filepath, "row": row_num, "record_id": wid,
            "error": "empty withdrawn_record_id", "detail": str(row),
        })
    fv = row.get("final_value", "")
    if fv:
        try:
            float(fv)
        except (ValueError, TypeError):
            issues.append({
                "file": filepath, "row": row_num, "record_id": wid,
                "error": "non-numeric final_value", "detail": f"final_value={fv}",
            })
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
        pred_raw = float(r["historical_answer"])
        actual = float(r["actual_value"])
        unit = r["unit"]
        actual_unit = r.get("actual_unit", unit)
        pred = pred_raw
        if actual_unit and actual_unit != unit:
            pred = try_unit_convert(pred_raw, unit, actual_unit, r["record_id"], calc_trace)
        diff = abs(pred - actual)
        is_error = diff > TOLERANCE
        r["_abs_diff"] = diff
        r["_pred_raw"] = pred_raw
        r["_pred_converted"] = pred
        r["_actual_value"] = actual
        r["_compare_unit"] = actual_unit or unit
        calc_trace.append({
            "record_id": r["record_id"],
            "step": "error_check",
            "from_unit": unit,
            "to_unit": actual_unit or unit,
            "original_value": pred_raw,
            "converted_value": pred,
            "formula": (
                f"原始 {pred_raw} {unit} "
                f"{'-> 换算 ' + str(pred) + ' ' + (actual_unit or unit) + ' ' if actual_unit and actual_unit != unit else ''}"
                f"vs 实际 {actual} {actual_unit or unit} | "
                f"|{pred} - {actual}| = {diff:.10f} > {TOLERANCE} ? {'YES' if is_error else 'NO'}"
            ),
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
    for sk_val, records in sorted(groups.items(), key=lambda kv: kv[0]):
        if len(records) > 1:
            rids = [r["record_id"] for r in records]
            src_rows = [
                f"{r.get('source_file', '')}#L{r.get('source_row', '')}"
                for r in records
            ]
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
    for w in withdrawal_rows:
        wid = w["withdrawal_id"]
        withdrawn_rid = w["withdrawn_record_id"]
        target = answer_by_id.get(withdrawn_rid)
        if not target:
            calc_trace.append({
                "record_id": withdrawn_rid,
                "step": "withdrawal_link_miss",
                "from_unit": "", "to_unit": "",
                "original_value": "", "converted_value": "",
                "formula": (
                    f"withdrawal_id={wid} references "
                    f"record_id={withdrawn_rid}, not found in answers"
                ),
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

        orig_unit = target.get("unit", "")
        actual_unit = target.get("actual_unit", orig_unit)
        compare_unit = actual_unit or orig_unit
        final_unit = w.get("final_unit", compare_unit)
        pred_raw = float(target["historical_answer"])
        pred_converted = target.get("_pred_converted", pred_raw)
        orig_actual = float(target["actual_value"])
        orig_diff = target.get("_abs_diff", abs(pred_converted - orig_actual))

        final_val_raw = float(w["final_value"]) if w.get("final_value") else orig_actual
        final_val = final_val_raw
        if final_unit and compare_unit and final_unit != compare_unit:
            final_val = try_unit_convert(
                final_val_raw, final_unit, compare_unit,
                withdrawn_rid, calc_trace,
            )
        final_diff = abs(pred_converted - final_val)
        calc_trace.append({
            "record_id": withdrawn_rid,
            "step": "withdrawal_link",
            "from_unit": final_unit,
            "to_unit": compare_unit,
            "original_value": final_val_raw,
            "converted_value": final_val,
            "formula": (
                f"pred(换算后)={pred_converted} {compare_unit} "
                f"vs final_val(换算后)={final_val} {compare_unit} | "
                f"orig_diff=|{pred_converted}-{orig_actual}|={orig_diff:.10f}; "
                f"final_diff=|{pred_converted}-{final_val}|={final_diff:.10f}"
            ),
        })
        linkage.append({
            "withdrawal_id": wid,
            "withdrawn_record_id": withdrawn_rid,
            "withdrawal_reason": w.get("withdrawal_reason", ""),
            "final_conclusion": w.get("final_conclusion", ""),
            "final_value": w["final_value"],
            "final_unit": w.get("final_unit", ""),
            "original_answer": str(pred_raw),
            "original_actual": str(orig_actual),
            "original_diff": f"{orig_diff:.10f}",
            "link_status": "linked",
            "source_row": (
                f"{target.get('source_file', '')}"
                f"#L{target.get('source_row', '')}"
            ),
        })
    return linkage


def build_detail_rows(seg_rows, errors, linkage, unstable_keys):
    error_rids = {e["record_id"] for e in errors}
    withdrawn_rids = {
        lk["withdrawn_record_id"] for lk in linkage
        if lk["link_status"] == "linked"
    }
    unstable_rids = set()
    for u in unstable_keys:
        for rid in u["record_ids"].split(";"):
            unstable_rids.add(rid)

    details = []
    for r in seg_rows:
        rid = r["record_id"]
        pred_raw = float(r["historical_answer"])
        actual = float(r["actual_value"])
        diff = r.get("_abs_diff", abs(pred_raw - actual))
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
            "historical_answer": pred_raw,
            "actual_value": actual,
            "abs_diff": f"{diff:.10f}",
            "unit": r["unit"],
            "sort_key": r["sort_key"],
            "flag": "|".join(flag_parts) if flag_parts else "OK",
            "withdrawal_reason": w_reason,
            "final_conclusion": w_conclusion,
            "final_value": w_final,
            "source": (
                f"{r.get('source_file', '')}"
                f"#L{r.get('source_row', '')}"
            ),
        })
    return details


def write_csv(filepath, rows, fieldnames):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        if rows:
            writer.writerows(rows)


def write_status(output_dir, status, message):
    os.makedirs(output_dir, exist_ok=True)
    path = os.path.join(output_dir, "STATUS.txt")
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"STATUS: {status}\n")
        f.write(f"TIME: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        if message:
            f.write(f"MESSAGE: {message}\n")
    return path


def print_instability_block(all_unstable):
    total_groups = len(all_unstable)
    total_records = sum(u["duplicate_count"] for u in all_unstable)
    print("\n" + "=" * 72)
    print("⚠️  【排序不稳定 — 已进入待确认模式】")
    print("=" * 72)
    print("  以下 sort_key 存在重复记录，边界样本归属不确定，")
    print("  分段错误率、撤回联动等统计结果尚未生成。")
    print("-" * 72)
    for u in all_unstable:
        print(f"  sort_key = {u['sort_key_value']}")
        print(f"    重复次数: {u['duplicate_count']}")
        print(f"    涉及 ID:  {u['record_ids']}")
        print(f"    来源行:   {u['source_locations']}")
    print("-" * 72)
    print(f"  待确认原因: 相同 sort_key 存在多条记录，分段排序顺序不确定")
    print(f"  影响范围:   {total_groups} 组 sort_key 冲突，涉及 {total_records} 条记录")
    print("  处理方式:")
    print("    1) 在输入 CSV 中补充二级排序字段，使 sort_key 全局唯一")
    print("    2) 或评估后确认该冲突不影响结论，使用 --confirm-sort 强制重跑")
    print(f"  详细清单:   instability_report.csv")
    print(f"  当前状态:   STATUS.txt = PENDING_INSTABILITY")
    print("=" * 72)


def print_final_summary(segments, all_errors, all_unstable, bad_data, linkage, total_rows):
    print("=" * 72)
    print("分段回归错题复盘 — 终端摘要")
    print(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"总记录数: {total_rows}")
    if all_unstable:
        print(f"排序不稳定: {sum(u['duplicate_count'] for u in all_unstable)} 条记录 "
              f"(已用 --confirm-sort 确认继续)")
    print("=" * 72)

    print("\n【分段统计】")
    error_rid_set = {e["record_id"] for e in all_errors}
    for seg, rows in sorted(segments.items()):
        err_count = sum(1 for r in rows if r["record_id"] in error_rid_set)
        total = len(rows)
        rate = err_count / total * 100 if total else 0
        print(f"  分段 {seg}: {total} 条 | 错误 {err_count} 条 | 错误率 {rate:.2f}%")

    if all_unstable:
        print("\n【排序不稳定（已确认继续）】")
        for u in all_unstable:
            print(f"  sort_key={u['sort_key_value']} x{u['duplicate_count']} "
                  f"({u['record_ids']})")
        print("  标记: 受影响记录已在 detail.csv 的 flag 列追加 SORT_UNSTABLE")

    if bad_data:
        print("\n❌ 【坏数据】")
        for bd in bad_data:
            print(f"  文件={bd.get('file', '')} 行={bd.get('row', '')} "
                  f"id={bd.get('record_id', '')}")
            print(f"    问题: {bd.get('error', '')}")
            if bd.get("detail"):
                print(f"    详情: {bd['detail']}")

    if linkage:
        linked = [lk for lk in linkage if lk["link_status"] == "linked"]
        broken = [lk for lk in linkage if lk["link_status"] == "broken"]
        print(f"\n【撤回记录 ↔ 最终结论】共 {len(linkage)} 条 "
              f"(联动成功 {len(linked)}，断链 {len(broken)})")
        for lk in linked:
            print(f"  ✅ {lk['withdrawal_id']} -> {lk['withdrawn_record_id']}")
            print(f"     原始答案={lk['original_answer']} "
                  f"实际值={lk['original_actual']} "
                  f"差异={lk['original_diff']}")
            print(f"     撤回原因={lk['withdrawal_reason']} "
                  f"最终结论={lk['final_conclusion']} "
                  f"最终值={lk['final_value']}")
        for lk in broken:
            print(f"  ❌ {lk['withdrawal_id']} -> {lk['withdrawn_record_id']} "
                  f"(未匹配到历史答案)")

    print("\n" + "=" * 72)
    print("CSV 明细已写入输出目录，STATUS.txt = OK")
    print("=" * 72)


def run(input_dir, output_dir, confirm_sort=False):
    os.makedirs(output_dir, exist_ok=True)

    all_answer_rows = []
    all_bad_data = []
    all_withdrawal_rows = []

    try:
        csv_files = sorted(
            f for f in os.listdir(input_dir) if f.lower().endswith(".csv")
        )
    except OSError as e:
        msg = f"无法读取输入目录 {input_dir}: {e}"
        print(f"❌ {msg}", file=sys.stderr)
        write_status(output_dir, "ERROR", msg)
        return EXIT_HARD_ERROR

    for fname in csv_files:
        fpath = os.path.join(input_dir, fname)
        if "withdrawal" in fname.lower():
            rows, bad, missing = read_csv_safe(
                fpath, REQUIRED_WITHDRAWAL_COLS, validate_withdrawal_row,
            )
            all_withdrawal_rows.extend(rows)
            all_bad_data.extend(bad)
            all_bad_data.extend(missing)
        else:
            rows, bad, missing = read_csv_safe(
                fpath, REQUIRED_ANSWER_COLS, validate_answer_row,
            )
            all_answer_rows.extend(rows)
            all_bad_data.extend(bad)
            all_bad_data.extend(missing)

    if not all_answer_rows:
        msg = (
            "输入目录中未找到有效的历史答案记录，"
            "请检查 CSV 格式和列名（需要包含 record_id, segment 等）。"
        )
        print(f"❌ {msg}", file=sys.stderr)
        write_csv(
            os.path.join(output_dir, "bad_data_report.csv"),
            all_bad_data, BAD_DATA_FIELDS,
        )
        write_status(output_dir, "ERROR", msg)
        return EXIT_HARD_ERROR

    calc_trace = []
    segments = segment_data(all_answer_rows)

    all_errors = []
    all_unstable = []
    for seg_name, seg_rows in sorted(segments.items()):
        errors = compute_segment_metrics(seg_rows, calc_trace)
        all_errors.extend(errors)
        unstable = detect_sorting_instability(seg_rows)
        all_unstable.extend(unstable)

    write_csv(
        os.path.join(output_dir, "calculation_trace.csv"),
        calc_trace, TRACE_FIELDS,
    )
    write_csv(
        os.path.join(output_dir, "instability_report.csv"),
        all_unstable, INSTABILITY_FIELDS,
    )
    write_csv(
        os.path.join(output_dir, "bad_data_report.csv"),
        all_bad_data, BAD_DATA_FIELDS,
    )

    if all_unstable and not confirm_sort:
        pending_msg = (
            f"检测到 {len(all_unstable)} 组 sort_key 冲突，"
            f"涉及 {sum(u['duplicate_count'] for u in all_unstable)} 条记录。"
            f"未生成 detail.csv / withdrawal_linkage.csv，"
            f"请处理排序问题或使用 --confirm-sort 重跑。"
        )
        write_status(output_dir, "PENDING_INSTABILITY", pending_msg)
        print_instability_block(all_unstable)
        return EXIT_PENDING_CONFIRM

    linkage = link_withdrawals(all_answer_rows, all_withdrawal_rows, calc_trace)

    all_detail_rows = []
    for seg_name, seg_rows in sorted(segments.items()):
        seg_errors = [e for e in all_errors if e["segment"] == seg_name]
        details = build_detail_rows(
            seg_rows, seg_errors, linkage, all_unstable,
        )
        all_detail_rows.extend(details)

    write_csv(
        os.path.join(output_dir, "detail.csv"),
        all_detail_rows, DETAIL_FIELDS,
    )
    write_csv(
        os.path.join(output_dir, "withdrawal_linkage.csv"),
        linkage, WITHDRAWAL_FIELDS,
    )
    write_csv(
        os.path.join(output_dir, "calculation_trace.csv"),
        calc_trace, TRACE_FIELDS,
    )

    write_status(output_dir, "OK", "")
    print_final_summary(
        segments, all_errors, all_unstable, all_bad_data, linkage,
        len(all_answer_rows),
    )
    return EXIT_OK


def build_parser():
    parser = argparse.ArgumentParser(
        prog="分段回归错题复盘",
        description=(
            "对分段回归历史答案进行错题复盘。"
            "终端输出摘要，CSV 写入输出目录。"
            "检测到排序不稳定时默认进入待确认模式，"
            "需处理或加 --confirm-sort 才输出最终统计。"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "退出码:\n"
            "  0 = 完成，结果已输出\n"
            "  1 = 硬错误（目录不存在、无有效数据等）\n"
            "  2 = 待确认模式（排序不稳定，需处理或加 --confirm-sort）\n"
            "\n"
            "输出 CSV:\n"
            "  detail.csv               — 每条记录明细（含 flag 标记）\n"
            "  withdrawal_linkage.csv   — 撤回记录与最终结论联动\n"
            "  instability_report.csv   — sort_key 冲突清单\n"
            "  calculation_trace.csv    — 中间计算过程与单位换算\n"
            "  bad_data_report.csv      — 坏数据及来源行号\n"
            "  STATUS.txt               — 本次运行状态 (OK/PENDING_INSTABILITY/ERROR)"
        ),
    )
    parser.add_argument(
        "--input-dir",
        required=True,
        help="包含历史答案 CSV 和撤回记录 CSV 的输入目录",
    )
    parser.add_argument(
        "--output-dir",
        required=True,
        help="CSV 明细文件的输出目录（不存在会自动创建）",
    )
    parser.add_argument(
        "--confirm-sort",
        action="store_true",
        default=False,
        help=(
            "排序不稳定时强制继续输出最终统计结果 "
            "（默认会进入待确认模式，不生成 detail.csv 等结论性文件）"
        ),
    )
    return parser


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)

    if not os.path.isdir(args.input_dir):
        print(f"❌ 输入目录不存在: {args.input_dir}", file=sys.stderr)
        try:
            write_status(args.output_dir, "ERROR", f"输入目录不存在: {args.input_dir}")
        except OSError:
            pass
        return EXIT_HARD_ERROR

    return run(args.input_dir, args.output_dir, confirm_sort=args.confirm_sort)


if __name__ == "__main__":
    sys.exit(main())
