import csv
import os
import shutil
from datetime import datetime
from typing import List

from .types import SensorRecord, DuplicateInfo, ExportResult
from .calculator import build_calc_trace


HISTORY_DIR_NAME = "history_versions"
SCREENSHOT_DOC_NAME = "screenshot_captions.md"
CALC_TRACE_NAME = "calc_trace.txt"
SUMMARY_CSV_NAME = "summary_report.csv"
TERMINAL_DUMP_NAME = "terminal_summary.txt"


def ensure_output_dir(output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    history_dir = os.path.join(output_dir, HISTORY_DIR_NAME)
    os.makedirs(history_dir, exist_ok=True)
    return history_dir


def write_summary_csv(output_path: str, records: List[SensorRecord]):
    fieldnames = [
        "row_index", "timestamp", "device_id",
        "raw_value", "raw_unit",
        "normalized_value", "normalized_unit",
        "speckle_contrast", "speckle_size_um",
        "version", "remarks_count", "screenshots_count",
        "unit_conversion_note",
    ]
    with open(output_path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        for r in records:
            writer.writerow({
                "row_index": r.row_index,
                "timestamp": r.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "device_id": r.device_id,
                "raw_value": r.raw_value,
                "raw_unit": r.raw_unit,
                "normalized_value": f"{r.normalized_value:.6g}",
                "normalized_unit": r.normalized_unit,
                "speckle_contrast": ("" if r.speckle_contrast is None else f"{r.speckle_contrast:.4f}"),
                "speckle_size_um": ("" if r.speckle_size_um is None else f"{r.speckle_size_um:.4f}"),
                "version": r.version,
                "remarks_count": len(r.remarks),
                "screenshots_count": len(r.screenshots),
                "unit_conversion_note": r.unit_conversion_note,
            })


def write_screenshot_doc(output_path: str, records: List[SensorRecord]):
    lines = ["# 截图说明文档（与终端摘要分离，保留历史版本链）\n"]
    lines.append(f"> 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    lines.append("---\n")

    for rec in records:
        lines.append(f"## 设备 {rec.device_id} @ {rec.timestamp.strftime('%Y-%m-%d %H:%M')}  (行#{rec.row_index})\n")

        if not rec.screenshots:
            lines.append("_无截图_\n")
            continue

        for idx, s in enumerate(rec.screenshots, start=1):
            lines.append(f"### 截图 {idx} — {s.version}  [{s.timestamp.strftime('%Y-%m-%d %H:%M')}]\n")
            lines.append(f"- **说明**: {s.caption}\n")
            lines.append(f"- **文件**: `{s.path}`\n")
            lines.append(f"- **版本标签**: {s.version}\n")
            lines.append("")
        lines.append("---\n")

    with open(output_path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))


def write_history_artifacts(history_dir: str, records: List[SensorRecord], input_dir: str):
    remarks_path = os.path.join(history_dir, "all_remarks_history.md")
    lines = ["# 历史备注完整保留（不合并、不覆盖）\n"]
    lines.append(f"> 来源输入目录: `{input_dir}`\n")
    lines.append("---\n")

    for rec in records:
        lines.append(f"## 行#{rec.row_index} 设备 {rec.device_id} ({rec.timestamp})\n")
        if not rec.remarks:
            lines.append("_无备注_\n")
            continue
        for rm in rec.remarks:
            mark = " ←最新" if rm.is_latest else ""
            lines.append(f"- [{rm.timestamp.strftime('%Y-%m-%d %H:%M')}] **{rm.author}**{mark}: {rm.content}\n")
        lines.append("")
    with open(remarks_path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))

    meta_path = os.path.join(history_dir, "input_manifest.txt")
    with open(meta_path, "w", encoding="utf-8") as fh:
        fh.write(f"输入目录: {input_dir}\n")
        fh.write(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        fh.write(f"记录总数: {len(records)}\n")
        for fn in sorted(os.listdir(input_dir)):
            full = os.path.join(input_dir, fn)
            if os.path.isfile(full):
                fh.write(f"  - {fn} ({os.path.getsize(full)} bytes)\n")


def build_terminal_summary(
    records: List[SensorRecord],
    alerts: List[DuplicateInfo],
    warnings: List[str],
    input_dir: str,
    output_dir: str,
) -> str:
    lines = []
    sep = "=" * 72
    lines.append(sep)
    lines.append("              激光散斑报告 — 终端摘要（仅数值概览）")
    lines.append(sep)
    lines.append(f"输入目录 : {input_dir}")
    lines.append(f"输出目录 : {output_dir}")
    lines.append(f"记录条数 : {len(records)}")
    lines.append(f"生成时间 : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")

    if warnings:
        lines.append("【解析告警】以下行被跳过，请检查原始日志：")
        for w in warnings:
            lines.append(f"  ! {w}")
        lines.append("")

    lines.append("【归一化数值一览】")
    lines.append(f"  {'#':>3}  {'时间':<19}  {'设备':<10}  {'原始值':>14}  {'归一化值':>14}  {'衬比':>8}  备注/截图")
    for r in records:
        raw = f"{r.raw_value} {r.raw_unit}"
        norm = f"{r.normalized_value:.6g} {r.normalized_unit}"
        contrast = "-" if r.speckle_contrast is None else f"{r.speckle_contrast:.3f}"
        extras = []
        if r.remarks:
            extras.append(f"📝×{len(r.remarks)}")
        if r.screenshots:
            extras.append(f"🖼×{len(r.screenshots)}")
        extra_str = " ".join(extras) if extras else "(无)"
        warn = " ⚠混写" if r.unit_conversion_note else ""
        lines.append(
            f"  {r.row_index:>3}  {r.timestamp.strftime('%Y-%m-%d %H:%M:%S')}  "
            f"{r.device_id:<10}  {raw:>14}  {norm:>14}  {contrast:>8}  {extra_str}{warn}"
        )
    lines.append("")

    lines.append("【输出文件索引】")
    lines.append(f"  ✓ 数值汇总表        : summary_report.csv")
    lines.append(f"  ✓ 中间计算过程      : {CALC_TRACE_NAME}   ← 对照两组参数用这个")
    lines.append(f"  ✓ 截图说明文档      : {SCREENSHOT_DOC_NAME}   ← 终端摘要不含截图，看这里")
    lines.append(f"  ✓ 历史备注与源清单  : {HISTORY_DIR_NAME}/  ← 旧版本截图、补记备注都在这里")
    lines.append("")

    if alerts:
        lines.append(sep)
        lines.append("   ⚠  存在设备编号重复 —— 报告已暂停出最终值，请先人工确认  ⚠")
        lines.append(sep)
        lines.append(f"重复设备数: {len(alerts)}")
        lines.append("")
        for i, a in enumerate(alerts, start=1):
            lines.append(f"── 重复 #{i}: 设备 {a.device_id} ──")
            lines.append(f"  待确认原因 : {a.reason_hint}")
            lines.append(f"  影响范围   :")
            for ln in a.impact_scope.splitlines():
                lines.append(f"    {ln}")
            lines.append(f"  发生条数   : {len(a.occurrences)}")
            lines.append(f"  对应数值   : {', '.join(f'{v:.6g}' for v in a.values)} {records[0].normalized_unit}")
            lines.append("")
        lines.append("⚠  请确认重复项后，通过 --force 选项强制出最终报告（按最新时间戳取终值），或修正 CSV 重跑。")
    else:
        lines.append("【状态】未发现设备编号重复，报告已完整生成。")

    lines.append(sep)
    return "\n".join(lines)


def export_report(
    input_dir: str,
    output_dir: str,
    records: List[SensorRecord],
    alerts: List[DuplicateInfo],
    warnings: List[str],
    force: bool = False,
) -> ExportResult:
    history_dir = ensure_output_dir(output_dir)

    summary_csv = os.path.join(output_dir, SUMMARY_CSV_NAME)
    write_summary_csv(summary_csv, records)

    shot_doc = os.path.join(output_dir, SCREENSHOT_DOC_NAME)
    write_screenshot_doc(shot_doc, records)

    calc_path = os.path.join(output_dir, CALC_TRACE_NAME)
    with open(calc_path, "w", encoding="utf-8") as fh:
        fh.write(build_calc_trace(records))

    write_history_artifacts(history_dir, records, input_dir)

    terminal_text = build_terminal_summary(records, alerts, warnings, input_dir, output_dir)
    term_dump = os.path.join(output_dir, TERMINAL_DUMP_NAME)
    with open(term_dump, "w", encoding="utf-8") as fh:
        fh.write(terminal_text)

    return ExportResult(
        summary={
            "record_count": len(records),
            "duplicate_count": len(alerts),
            "warning_count": len(warnings),
            "summary_csv": summary_csv,
            "forced": force,
        },
        duplicate_alerts=alerts,
        records=records,
        terminal_text=terminal_text,
        screenshot_doc_path=shot_doc,
        calc_trace_path=calc_path,
        history_dir=history_dir,
    )
