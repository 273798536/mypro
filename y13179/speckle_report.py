#!/usr/bin/env python3
"""激光散斑报告导出 —— 命令行入口。

样例:
    python speckle_report.py --input ./sample_input --output ./sample_output
    python speckle_report.py -i ./data -o ./out --force
    python speckle_report.py --example            # 放样例
    python speckle_report.py --show-captions out  # 查看截图说明
"""
import argparse
import os
import shutil
import sys
import json

from speckle.parser import parse_sensor_log
from speckle.dedup import detect_duplicates
from speckle.exporter import export_report, SCREENSHOT_DOC_NAME, HISTORY_DIR_NAME, CALC_TRACE_NAME


EXAMPLE_DIR_NAME = "sample_input"


def build_argparser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="激光散斑报告导出",
        description=(
            "从传感器 CSV 日志导出激光散斑实验报告。\n"
            "核心: 指定输入输出目录、终端摘要与截图说明分离、\n"
            "      保留历史备注/旧版本截图、设备重复时先待确认、\n"
            "      中间计算过程透明可见（含单位混写校正）。"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("-i", "--input", metavar="DIR", help="传感器日志 CSV 所在目录（材料入口）")
    p.add_argument("-o", "--output", metavar="DIR", help="报告输出目录")
    p.add_argument("--force", action="store_true",
                   help="存在重复设备时仍强制生成最终报告（按最新时间戳取终值）")
    p.add_argument("--example", action="store_true",
                   help=f"在当前目录下放样例数据 ({EXAMPLE_DIR_NAME}/) 后退出")
    p.add_argument("--show-captions", metavar="OUTPUT_DIR",
                   help="打开/打印指定输出目录下的截图说明文档路径后退出")
    p.add_argument("--json", action="store_true", help="结果以 JSON 打印（供脚本消费）")
    return p


def lay_example(dest_root: str) -> str:
    dest = os.path.join(dest_root, EXAMPLE_DIR_NAME)
    os.makedirs(dest, exist_ok=True)

    csv_content = """timestamp,device_id,measure_value,measure_unit,speckle_contrast,speckle_size_um,remarks,screenshots,version
2026-06-10 09:15:00,SPK-A01,5.2,mW,0.382,23.4,[小林 @ 2026-06-10 10:00] 初测稳定;;[王工 @ 2026-06-11 14:20] 复核，确认3%误差在允许范围内,[v1 @ 2026-06-10 09:20] 散斑图首次采集|./shots/a01_v1.png;;[v2 @ 2026-06-11 14:25] 重采降噪版|./shots/a01_v2.png,v2
2026-06-10 10:02:00,SPK-A02,5200,uW,0.401,22.8,[小林 @ 2026-06-10 10:20] 注意：这里日志写成uW了，实际应为mW？待查,[v1 @ 2026-06-10 10:10] A02散斑原始图|./shots/a02_v1.png,v1
2026-06-10 11:30:00,SPK-A01,5.1,mW,0.378,23.1,[小林 @ 2026-06-10 11:45] 重复测一次看稳定性,[v1 @ 2026-06-10 11:35] A01复测|./shots/a01_rerun.png,v1
2026-06-10 13:05:00,SPK-A03,0.0065,W,0.415,24.0,,[v1 @ 2026-06-10 13:10] A03高功率采集|./shots/a03_v1.png,v1
"""
    csv_path = os.path.join(dest, "sensor_log_20260610.csv")
    with open(csv_path, "w", encoding="utf-8") as fh:
        fh.write(csv_content)

    shots_dir = os.path.join(dest, "shots")
    os.makedirs(shots_dir, exist_ok=True)
    for name in ("a01_v1.png", "a01_v2.png", "a02_v1.png", "a01_rerun.png", "a03_v1.png"):
        with open(os.path.join(shots_dir, name), "wb") as fh:
            fh.write(b"\x89PNG example placeholder\n")

    return dest


def main(argv=None) -> int:
    parser = build_argparser()
    args = parser.parse_args(argv)

    if args.example:
        d = lay_example(os.getcwd())
        print(f"[放样例完成] 样例输入目录已生成: {d}")
        print(f"  → 运行:  python speckle_report.py -i {d} -o ./sample_output")
        return 0

    if args.show_captions:
        out_dir = args.show_captions
        path = os.path.join(out_dir, SCREENSHOT_DOC_NAME)
        if not os.path.exists(path):
            print(f"[异常出口] 找不到截图说明文件: {path}", file=sys.stderr)
            print("  请先执行一次导出命令（至少需要 -i 和 -o）。", file=sys.stderr)
            return 2
        print(f"[截图说明文档位置] {path}")
        try:
            with open(path, encoding="utf-8") as fh:
                first_50 = "".join(fh.readlines()[:50])
            print(first_50)
        except Exception as e:
            print(f"  [读取失败] {e}", file=sys.stderr)
        return 0

    if not args.input or not args.output:
        parser.print_help()
        print("\n[材料入口/异常出口快速上手]:")
        print("  ① 先放样例:  python speckle_report.py --example")
        print("  ② 再跑一次:  python speckle_report.py -i sample_input -o sample_output")
        print("  ③ 看截图说明: python speckle_report.py --show-captions sample_output")
        print("  ④ 重跑只需:  改 CSV 后再执行 ② 的命令（覆盖输出目录）")
        return 1

    input_dir = os.path.abspath(args.input)
    output_dir = os.path.abspath(args.output)

    if not os.path.isdir(input_dir):
        print(f"[异常出口] 输入目录不存在: {input_dir}", file=sys.stderr)
        print("  如需样例请先运行: python speckle_report.py --example", file=sys.stderr)
        return 2

    try:
        records, warnings = parse_sensor_log(input_dir)
    except (FileNotFoundError, ValueError) as e:
        print(f"[异常出口] 解析传感器日志失败:", file=sys.stderr)
        print(f"  {e}", file=sys.stderr)
        print("  请检查 CSV 是否包含必填列: timestamp, device_id, measure_value, measure_unit",
              file=sys.stderr)
        return 3

    if not records:
        print("[异常出口] 输入目录未解析出任何有效记录。", file=sys.stderr)
        if warnings:
            print("  解析告警:", file=sys.stderr)
            for w in warnings:
                print(f"    - {w}", file=sys.stderr)
        return 4

    alerts = detect_duplicates(records)
    if alerts and not args.force:
        result = export_report(input_dir, output_dir, records, alerts, warnings, force=False)
        print(result.terminal_text)
        if args.json:
            print(json.dumps({
                "status": "needs_confirmation",
                "duplicates": [a.device_id for a in alerts],
                "output_dir": output_dir,
                "screenshot_doc": result.screenshot_doc_path,
                "calc_trace": result.calc_trace_path,
            }, ensure_ascii=False, indent=2))
        return 5

    result = export_report(input_dir, output_dir, records, alerts, warnings, force=args.force)
    print(result.terminal_text)

    if args.json:
        print(json.dumps({
            "status": "ok" if not alerts else "ok_forced",
            "record_count": len(records),
            "duplicates": [a.device_id for a in alerts],
            "warnings": warnings,
            "output": {
                "summary_csv": result.summary["summary_csv"],
                "screenshot_doc": result.screenshot_doc_path,
                "calc_trace": result.calc_trace_path,
                "history_dir": result.history_dir,
            },
        }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
