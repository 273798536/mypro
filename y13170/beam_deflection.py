#!/usr/bin/env python3
import argparse
import csv
import io
import sys
from dataclasses import dataclass
from enum import Enum
from typing import Optional

KNOWN_NAMEPLATE_PREFIXES = ["T型梁", "箱梁", "工字梁"]

NOISE_DEVIATION_PCT = 150.0

DEFAULT_E_GPA = 35.0
DEFAULT_TOLERANCE_PCT = 10.0

FORMULA = "δ = PL³/(48EI)"
UNIT_MAP = {"P": "kN", "L": "m", "E": "GPa", "I": "cm⁴", "δ": "mm"}


class RowStatus(Enum):
    PROCESSED_NORMAL = "已处理(正常)"
    PROCESSED_NOISE = "已处理(噪声嫌疑)"
    BAD_ROW = "坏行"
    SKIPPED = "跳过行"
    NEEDS_EVIDENCE = "待补证据"


@dataclass
class BeamRow:
    line_no: int
    nameplate: str
    beam_type: str
    span_m: Optional[float]
    load_kn: Optional[float]
    e_gpa: Optional[float]
    i_cm4: Optional[float]
    measured_mm: Optional[float]
    notes: str = ""
    e_gpa_original: Optional[float] = None
    status: RowStatus = RowStatus.PROCESSED_NORMAL
    calc_mm: Optional[float] = None
    deviation_pct: Optional[float] = None
    reason: str = ""


def parse_float(val) -> Optional[float]:
    if val is None or str(val).strip() == "":
        return None
    try:
        return float(str(val).strip())
    except (ValueError, TypeError):
        return None


def check_nameplate(nameplate: str) -> tuple:
    for prefix in KNOWN_NAMEPLATE_PREFIXES:
        if nameplate.startswith(prefix):
            return True, ""
    return False, f"\"{nameplate}\" 不匹配已知前缀 {KNOWN_NAMEPLATE_PREFIXES}"


def calc_deflection_mm(P_kN, L_m, E_GPa, I_cm4):
    P_N = P_kN * 1000.0
    L_mm = L_m * 1000.0
    E_MPa = E_GPa * 1000.0
    I_mm4 = I_cm4 * 1e4
    return (P_N * L_mm ** 3) / (48.0 * E_MPa * I_mm4)


def classify_row(row: BeamRow, tolerance_pct: float) -> None:
    name_ok, name_reason = check_nameplate(row.nameplate)
    if not name_ok:
        row.status = RowStatus.BAD_ROW
        row.reason = f"名称不一致: {name_reason}"
        return

    fields = [row.span_m, row.load_kn, row.e_gpa, row.i_cm4, row.measured_mm]
    if any(v is None for v in fields):
        missing = []
        if row.span_m is None: missing.append("跨度L")
        if row.load_kn is None: missing.append("荷载P")
        if row.e_gpa is None: missing.append("弹模E")
        if row.i_cm4 is None: missing.append("惯矩I")
        if row.measured_mm is None: missing.append("实测挠度")
        row.status = RowStatus.SKIPPED
        row.reason = f"缺字段: {', '.join(missing)}"
        return

    row.calc_mm = calc_deflection_mm(row.load_kn, row.span_m, row.e_gpa, row.i_cm4)

    if row.calc_mm == 0:
        row.status = RowStatus.BAD_ROW
        row.reason = "计算挠度为0，输入参数异常"
        return

    row.deviation_pct = ((row.measured_mm - row.calc_mm) / row.calc_mm) * 100.0
    abs_dev = abs(row.deviation_pct)

    if abs_dev > NOISE_DEVIATION_PCT:
        row.status = RowStatus.PROCESSED_NOISE
        row.reason = (
            f"极端值: 实测{row.measured_mm:.2f}mm vs "
            f"计算{row.calc_mm:.2f}mm(偏差{row.deviation_pct:+.1f}%), 疑似噪声"
        )
    elif abs_dev > tolerance_pct:
        row.status = RowStatus.NEEDS_EVIDENCE
        row.reason = (
            f"超容差: 偏差{row.deviation_pct:+.1f}%超出±{tolerance_pct}%, "
            f"需补充证据(实测{row.measured_mm:.2f}mm vs 计算{row.calc_mm:.2f}mm)"
        )
    else:
        row.status = RowStatus.PROCESSED_NORMAL
        row.reason = f"偏差{row.deviation_pct:+.1f}%, 在容差±{tolerance_pct}%内"


def compute_boundary_change(row: BeamRow, new_e: float, tolerance_pct: float) -> str:
    if any(v is None for v in [row.e_gpa, row.load_kn, row.span_m, row.i_cm4, row.measured_mm, row.calc_mm]):
        return ""
    if row.calc_mm == 0:
        return ""

    new_calc = calc_deflection_mm(row.load_kn, row.span_m, new_e, row.i_cm4)
    change_pct = ((new_calc - row.calc_mm) / row.calc_mm) * 100.0

    old_dev = row.deviation_pct
    new_dev = ((row.measured_mm - new_calc) / new_calc) * 100.0

    old_in = abs(old_dev) <= tolerance_pct
    new_in = abs(new_dev) <= tolerance_pct

    transition = ""
    if old_in and not new_in:
        transition = " → 超出容差→待补证据"
    elif not old_in and new_in:
        transition = " → 回到容差内"
    elif not old_in and not new_in:
        transition = " → 仍超容差"

    return (
        f"E {row.e_gpa}→{new_e} GPa: "
        f"δ {row.calc_mm:.2f}→{new_calc:.2f}mm({change_pct:+.1f}%), "
        f"偏差{old_dev:+.1f}%→{new_dev:+.1f}%{transition}"
    )


SAMPLE_CSV = """编号,设备铭牌,梁型,跨度L(m),荷载P(kN),弹模E(GPa),惯矩I(cm4),实测挠度(mm),备注
1,T型梁-A1,T型,20.0,150.0,35.0,4.0e7,1.82,
2,T型梁-A2,T型,20.0,150.0,35.0,4.0e7,1.78,
3,T梁-A3,T型,20.0,150.0,35.0,4.0e7,1.80,铭牌名称简写
4,箱梁-B1,箱型,25.0,200.0,35.0,8.7e7,2.15,
5,箱梁-B2,箱型,25.0,200.0,35.0,8.7e7,8.50,疑似传感器噪声
6,工字梁-C1,工字,18.0,120.0,35.0,2.5e7,1.87,接近容差边界
7,工字梁-C2,工字,18.0,120.0,35.0,2.5e7,1.70,
8,T型梁-A4,T型,20.0,150.0,,,1.75,缺弹模和惯矩
"""


def load_sample():
    return load_csv(io.StringIO(SAMPLE_CSV))


def load_csv(source):
    reader = csv.DictReader(source)
    rows = []
    for i, r in enumerate(reader, start=2):
        e_val = parse_float(r.get("弹模E(GPa)"))
        rows.append(BeamRow(
            line_no=i,
            nameplate=r.get("设备铭牌", "").strip(),
            beam_type=r.get("梁型", "").strip(),
            span_m=parse_float(r.get("跨度L(m)")),
            load_kn=parse_float(r.get("荷载P(kN)")),
            e_gpa=e_val,
            e_gpa_original=e_val,
            i_cm4=parse_float(r.get("惯矩I(cm4)")),
            measured_mm=parse_float(r.get("实测挠度(mm)")),
            notes=r.get("备注", "").strip(),
        ))
    return rows


def process_rows(rows, e_override, tolerance_pct):
    override_count = 0
    fill_count = 0
    for row in rows:
        if e_override is not None and row.e_gpa is not None:
            if row.e_gpa != e_override:
                row.e_gpa = e_override
                override_count += 1
        elif e_override is not None and row.e_gpa is None:
            row.e_gpa = e_override
            fill_count += 1
        classify_row(row, tolerance_pct)
    return rows, override_count, fill_count


def _line_nos(rows, status):
    return ",".join(str(r.line_no) for r in rows if r.status == status)


def print_report(rows, e_gpa, tolerance_pct, e_new, override_count, fill_count):
    counts = {}
    for s in RowStatus:
        counts[s] = sum(1 for r in rows if r.status == s)

    print("=== 梁体挠度实验复算 ===")
    print("─" * 55)

    print("行分类:")
    order = [
        (RowStatus.PROCESSED_NORMAL, "已处理(正常)"),
        (RowStatus.PROCESSED_NOISE, "已处理(噪声嫌疑)"),
        (RowStatus.NEEDS_EVIDENCE, "待补证据"),
        (RowStatus.BAD_ROW, "坏行"),
        (RowStatus.SKIPPED, "跳过行"),
    ]
    for status, label in order:
        c = counts[status]
        line = f"  {label}: {c}"
        ln = _line_nos(rows, status)
        if ln:
            line += f"  ← 第{ln}行"
        print(line)
    print(f"  合计: {len(rows)}")

    print()
    print(f"公式: {FORMULA}  [{UNIT_MAP['δ']}]")
    unit_str = "  ".join(f"{k}[{v}]" for k, v in UNIT_MAP.items() if k != "δ")
    print(f"单位: {unit_str}")
    parts = [f"E={e_gpa} GPa"]
    if override_count > 0:
        parts.append(f"覆盖原值 {override_count} 行")
    if fill_count > 0:
        parts.append(f"补空值 {fill_count} 行")
    parts.append(f"容差=±{tolerance_pct}%")
    print(f"参数: {', '.join(parts)}")

    print()
    print("异常位置:")
    anomalies = [r for r in rows if r.status in (RowStatus.BAD_ROW, RowStatus.PROCESSED_NOISE)]
    if anomalies:
        for r in anomalies:
            print(f"  #{r.line_no} {r.reason}")
    else:
        print("  (无)")

    print()
    print("待补证据:")
    evidence_rows = [r for r in rows if r.status == RowStatus.NEEDS_EVIDENCE]
    if evidence_rows:
        for r in evidence_rows:
            print(f"  #{r.line_no} {r.nameplate} | {r.reason}")
    else:
        print("  (无)")

    if e_new is not None:
        print()
        print(f"参数调整影响(E {e_gpa}→{e_new} GPa):")
        boundary_rows = [r for r in rows if r.status in (
            RowStatus.NEEDS_EVIDENCE, RowStatus.PROCESSED_NORMAL
        )]
        shown = False
        for r in boundary_rows:
            note = compute_boundary_change(r, e_new, tolerance_pct)
            if note:
                print(f"  #{r.line_no} {r.nameplate} | {note}")
                shown = True
        if not shown:
            print("  (无受影响样本)")

    print()
    print("已处理明细(正常):")
    normal_rows = [r for r in rows if r.status == RowStatus.PROCESSED_NORMAL]
    if normal_rows:
        for r in normal_rows:
            print(f"  #{r.line_no} {r.nameplate} | 计算{r.calc_mm:.2f}mm | {r.reason}")
    else:
        print("  (无)")

    print("─" * 55)


def export_csv(rows, path):
    fieldnames = [
        "行号", "设备铭牌", "梁型", "跨度L(m)", "荷载P(kN)",
        "弹模E(GPa)", "弹模E原始(GPa)", "惯矩I(cm4)", "实测挠度(mm)",
        "计算挠度(mm)", "偏差(%)", "状态", "原因"
    ]
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows:
            writer.writerow({
                "行号": r.line_no,
                "设备铭牌": r.nameplate,
                "梁型": r.beam_type,
                "跨度L(m)": f"{r.span_m:.2f}" if r.span_m is not None else "",
                "荷载P(kN)": f"{r.load_kn:.1f}" if r.load_kn is not None else "",
                "弹模E(GPa)": f"{r.e_gpa:.1f}" if r.e_gpa is not None else "",
                "弹模E原始(GPa)": f"{r.e_gpa_original:.1f}" if r.e_gpa_original is not None else "",
                "惯矩I(cm4)": f"{r.i_cm4:.0f}" if r.i_cm4 is not None else "",
                "实测挠度(mm)": f"{r.measured_mm:.2f}" if r.measured_mm is not None else "",
                "计算挠度(mm)": f"{r.calc_mm:.2f}" if r.calc_mm is not None else "",
                "偏差(%)": f"{r.deviation_pct:+.1f}" if r.deviation_pct is not None else "",
                "状态": r.status.value,
                "原因": r.reason,
            })
    print(f"导出: {path}")


def main():
    parser = argparse.ArgumentParser(
        prog="梁体挠度实验复算",
        description="梁体挠度实验数据复算 CLI 工具"
    )
    parser.add_argument("-i", "--input", help="输入CSV文件路径(默认使用内嵌样例)")
    parser.add_argument("-e", "--e-gpa", type=float, default=DEFAULT_E_GPA,
                        help=f"弹性模量E(GPa), 默认{DEFAULT_E_GPA}")
    parser.add_argument("--e-new", type=float, default=None,
                        help="参数调整后的E(GPa), 用于对比边界样本变化")
    parser.add_argument("-t", "--tolerance", type=float, default=DEFAULT_TOLERANCE_PCT,
                        help=f"容差百分比(%%), 默认{DEFAULT_TOLERANCE_PCT}")
    parser.add_argument("-o", "--output", default=None, help="导出CSV文件路径")
    parser.add_argument("--sample", action="store_true",
                        help="使用内嵌样例数据(含名称不一致和极端值)")

    args = parser.parse_args()

    if args.input:
        with open(args.input, encoding="utf-8-sig") as f:
            rows = load_csv(f)
    else:
        rows = load_sample()

    rows, override_count, fill_count = process_rows(
        rows, e_override=args.e_gpa, tolerance_pct=args.tolerance
    )

    print_report(rows, args.e_gpa, args.tolerance, args.e_new, override_count, fill_count)

    if args.output:
        export_csv(rows, args.output)


if __name__ == "__main__":
    main()
