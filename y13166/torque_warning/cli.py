import argparse
import os
import sys
from typing import List

from .models import RunConfig, ProcessedRecord, ConfirmationRequest, MaterialStatus
from .material_loader import load_all_materials
from .core import process_equipment
from .terminal_summary import build_terminal_summary, print_terminal_summary
from .page_summary import render_page_summary
from .report_generator import export_json_report, export_param_compare_markdown


def _default_input() -> str:
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(here, "sample_input")


def _default_output() -> str:
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(here, "output")


def run(config: RunConfig) -> tuple[List[ProcessedRecord], List[ConfirmationRequest]]:
    nameplates, attachments, notes, base_readings = load_all_materials(config.input_dir)

    records: List[ProcessedRecord] = []
    confirms: List[ConfirmationRequest] = []

    for np in nameplates:
        eid = np.equipment_id
        eq_atts = [a for a in attachments if a.equipment_id == eid]
        eq_notes = [n for n in notes if n.equipment_id == eid]
        eq_read = base_readings.get(eid, [])
        record, confirm = process_equipment(np, eq_read, eq_atts, eq_notes, config)
        records.append(record)
        if confirm:
            confirms.append(confirm)

    summary = build_terminal_summary(records, config)
    print_terminal_summary(summary, records, confirms)

    page_path = render_page_summary(records, summary, config, config.output_dir)
    json_path = export_json_report(records, summary, confirms, config, config.output_dir)

    prev_run = os.path.join(config.output_dir, "torque_warning_report.json")
    prev_records = None
    prev_config = None
    if os.path.exists(prev_run) and config.param_level > 1:
        import json as _json
        try:
            with open(prev_run, "r", encoding="utf-8") as f:
                prev_data = _json.load(f)
            prev_cfg = prev_data.get("run_config", {})
            prev_config = RunConfig(
                input_dir=prev_cfg.get("input_dir", config.input_dir),
                output_dir=prev_cfg.get("output_dir", config.output_dir),
                threshold_adjustment_pct=float(prev_cfg.get("threshold_adjustment_pct", 0.0)),
                param_level=int(prev_cfg.get("param_level", 1)),
                require_confirmation=bool(prev_cfg.get("require_confirmation", True)),
            )
            prev_records = []
            old_cfg2 = RunConfig(
                input_dir=config.input_dir, output_dir=config.output_dir,
                threshold_adjustment_pct=prev_config.threshold_adjustment_pct,
                param_level=prev_config.param_level, require_confirmation=False,
            )
            for np in nameplates:
                eid = np.equipment_id
                rec, _ = process_equipment(
                    np,
                    base_readings.get(eid, []),
                    [a for a in attachments if a.equipment_id == eid],
                    [n for n in notes if n.equipment_id == eid],
                    old_cfg2,
                )
                prev_records.append(rec)
        except Exception as e:
            print(f"[INFO] 上次运行数据读取失败,跳过参数对比: {e}")

    if config.param_level > 1:
        cmp_path = export_param_compare_markdown(prev_records, records, prev_config, config, config.output_dir)
        print(f"  参数对比报告: {cmp_path}")

    print(f"  结构化报告(JSON): {json_path}")
    print(f"  页面摘要(HTML):   {page_path}")

    if confirms:
        print()
        print("  ⚠ 存在需人工确认项,现场老师处理后可再次运行命令。")

    return records, confirms


def main():
    parser = argparse.ArgumentParser(
        prog="电机扭矩阈值预警",
        description="电机扭矩阈值预警工具 — 保留极端值,避免风险被均值掩盖",
    )
    parser.add_argument("--input-dir", "-i", default=_default_input(), help="输入材料目录(含 nameplates/, attachments/, notes/, readings/ 子目录)")
    parser.add_argument("--output-dir", "-o", default=_default_output(), help="输出目录(报告/页面摘要/对比报告)")
    parser.add_argument("--threshold-adjust", "-t", type=float, default=0.0, help="阈值调节量(百分比),正值更严格,负值更宽松,例如 -5.0 或 +10.0")
    parser.add_argument("--param-level", "-l", type=int, default=1, help="参数档编号(1=初次,2=调一档复算,3=再调一档...)")
    parser.add_argument("--no-confirm", action="store_true", help="跳过人工确认提示(默认开启)")

    args = parser.parse_args()

    config = RunConfig(
        input_dir=os.path.abspath(args.input_dir),
        output_dir=os.path.abspath(args.output_dir),
        threshold_adjustment_pct=args.threshold_adjust,
        require_confirmation=not args.no_confirm,
        param_level=args.param_level,
    )

    os.makedirs(config.output_dir, exist_ok=True)
    run(config)


if __name__ == "__main__":
    main()
