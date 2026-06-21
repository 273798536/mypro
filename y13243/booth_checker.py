#!/usr/bin/env python3
"""音乐节摊位异常提醒 - 值班脚本稳定调用入口"""

from __future__ import annotations

import sys
import json
import argparse
from typing import Optional

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))

from festival_booth_checker.core.config import Config
from festival_booth_checker.core.storage import BoothStorage
from festival_booth_checker.core.processor import BoothProcessor
from festival_booth_checker.core.exporter import BoothExporter
from festival_booth_checker.core.models import ProcessingResult, BoothStatus


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="booth_checker",
        description="音乐节摊位异常提醒 - 社区公示前置检查工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
返回码约定:
  0  成功或无记录
  1  参数错误
  2  扫描/处理失败
  3  存在版本冲突需人工介入
  4  存在异常待处理

所有命令默认输出 JSON 到 stdout，值班脚本可直接解析。
"""
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # scan 命令
    p_scan = sub.add_parser("scan", help="扫描输入目录并执行异常检测")
    p_scan.add_argument("--input", "-i", help="输入目录（默认 config.input_dir）")
    p_scan.add_argument("--operator", "-o", default="system", help="操作人标识，记入历史")
    p_scan.add_argument("--force", action="store_true", help="强制覆盖版本冲突（不推荐）")
    p_scan.add_argument("--output", help="额外输出 JSON 文件路径（同时仍输出到 stdout）")
    p_scan.add_argument("--quiet", "-q", action="store_true", help="仅输出最终 JSON，不输出过程日志")

    # dashboard 命令
    p_dash = sub.add_parser("dashboard", help="输出状态看板（已处理/待补证据）")
    p_dash.add_argument("--format", choices=["json", "text"], default="json", help="输出格式")

    # summary 命令 - 演出统筹接班用
    sub.add_parser("summary", help="阿蓝接班三要素：样例位置/异常位置/导出方法")

    # export 命令
    p_exp = sub.add_parser("export", help="导出处理结果")
    p_exp.add_argument("--format", "-f", choices=["json", "csv"], default="json", help="导出格式")
    p_exp.add_argument("--only", choices=["all", "anomalies", "pending", "passed"], default=None,
                        help="筛选范围：全部/仅异常/待处理/已通过")
    p_exp.add_argument("--all", dest="only", action="store_const", const="all",
                        help="等价于 --only all")
    p_exp.add_argument("--anomalies", dest="only", action="store_const", const="anomalies",
                        help="等价于 --only anomalies")
    p_exp.add_argument("--pending", dest="only", action="store_const", const="pending",
                        help="等价于 --only pending")
    p_exp.add_argument("--passed", dest="only", action="store_const", const="passed",
                        help="等价于 --only passed")
    p_exp.add_argument("--output", "-O", help="指定导出文件完整路径（含文件名）")

    # status 命令
    p_stat = sub.add_parser("status", help="查询单摊位状态或更新状态")
    p_stat.add_argument("booth_id", help="摊位号")
    p_stat.add_argument("--set-status", choices=[s.value for s in BoothStatus], help="设置状态")
    p_stat.add_argument("--note", default="", help="状态变更备注")
    p_stat.add_argument("--operator", "-o", default="manual", help="操作人")

    # resolve 命令
    p_res = sub.add_parser("resolve", help="标记某摊位某异常已解决")
    p_res.add_argument("booth_id", help="摊位号")
    p_res.add_argument("anomaly_id", help="异常ID")
    p_res.add_argument("--note", default="", help="解决说明")
    p_res.add_argument("--operator", "-o", default="manual", help="操作人")

    # version 命令
    p_ver = sub.add_parser("version", help="查看某摊位版本信息及冲突建议")
    p_ver.add_argument("booth_id", help="摊位号")

    return parser


def run() -> int:
    parser = build_parser()
    args = parser.parse_args()

    config = Config()
    processor = BoothProcessor(config)
    exporter = BoothExporter(config, processor.storage)

    result: Optional[ProcessingResult] = None
    exit_code = 0

    if args.command == "scan":
        result = processor.scan_and_process(
            input_dir=args.input,
            operator=args.operator,
            force=args.force
        )
        data = result.data or {}
        totals = data.get("totals", {})
        if result.errors:
            exit_code = 2
        elif totals.get("conflicts", 0) > 0 and not args.force:
            exit_code = 3
        elif totals.get("processed", 0) > 0:
            anomaly_items = sum(1 for p in data.get("processed", []) if p.get("anomaly_count", 0) > 0)
            if anomaly_items > 0:
                exit_code = 4

        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(result.to_json())

    elif args.command == "dashboard":
        result = processor.get_dashboard()
        if args.format == "text":
            d = result.data
            lines = []
            lines.append("=" * 50)
            lines.append("音乐节摊位 状态看板")
            lines.append("=" * 50)
            for s, n in d.get("status_summary", {}).items():
                lines.append(f"  {s:<8} : {n} 个")
            lines.append("-" * 50)
            lines.append(f"  已处理   : {d.get('handled_count', 0)}")
            lines.append(f"  待行动   : {d.get('action_needed_count', 0)}")
            lines.append(f"  处理中   : {d.get('pending_count', 0)}")
            lines.append("-" * 50)
            if d.get("need_evidence_list"):
                lines.append("【需补证据】")
                for x in d["need_evidence_list"]:
                    lines.append(f"  - {x['booth_id']} {x['booth_name']} (来源: {x['version_source']})")
            if d.get("anomaly_locations"):
                lines.append("【异常明细】")
                for x in d["anomaly_locations"]:
                    lines.append(f"  - {x['booth_id']} | {x['type']}({x['level']}) | {x['location']} | {x['description']}")
            print("\n".join(lines))
            return 0

    elif args.command == "summary":
        result = processor.get_summary_for_alan()

    elif args.command == "export":
        only_value = args.only or "all"
        if args.output and os.path.isdir(args.output):
            result = ProcessingResult(
                success=False,
                code="INVALID_OUTPUT",
                message=f"--output/-O 必须是完整文件路径（含文件名），不能是目录：{args.output}",
                errors=["请将 --output 指定为目标文件完整路径，例如 /tmp/booth.csv"],
                params_used={"format": args.format, "only": only_value, "output": args.output}
            )
            exit_code = 1
        else:
            result = exporter.export_all(args.format, only_value)
            if args.output and result.success:
                import shutil
                os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
                shutil.copy2(result.data["file_path"], args.output)
                result.data["file_path"] = args.output
                result.data["saved_as_requested"] = True
            result.params_used = {"format": args.format, "only": only_value, "output": args.output}

    elif args.command == "status":
        if args.set_status:
            processor.storage.update_status(args.booth_id, BoothStatus(args.set_status), args.note, args.operator)
            result = ProcessingResult(True, "OK", f"状态已更新为 {args.set_status}",
                                      data={"booth_id": args.booth_id, "new_status": args.set_status},
                                      params_used=vars(args))
        else:
            rec = processor.storage.get(args.booth_id)
            if rec:
                result = ProcessingResult(True, "OK", "查询成功", data=rec.to_dict())
            else:
                result = ProcessingResult(False, "NOT_FOUND", f"未找到摊位 {args.booth_id}",
                                          errors=[f"booth_id={args.booth_id} 不存在"],
                                          params_used=vars(args))
                exit_code = 1

    elif args.command == "resolve":
        ok = processor.storage.resolve_anomaly(args.booth_id, args.anomaly_id, args.note, args.operator)
        if ok:
            result = ProcessingResult(True, "OK", f"异常 {args.anomaly_id} 已标记解决",
                                      data={"booth_id": args.booth_id, "anomaly_id": args.anomaly_id},
                                      params_used=vars(args))
        else:
            result = ProcessingResult(False, "NOT_FOUND", "摊位或异常不存在",
                                      errors=[f"booth_id={args.booth_id}, anomaly_id={args.anomaly_id}"],
                                      params_used=vars(args))
            exit_code = 1

    elif args.command == "version":
        info = processor.storage.get_version_info(args.booth_id)
        if info:
            result = ProcessingResult(True, "OK", "版本信息", data=info)
        else:
            result = ProcessingResult(False, "NOT_FOUND", f"未找到摊位 {args.booth_id}",
                                      errors=[f"booth_id={args.booth_id}"],
                                      params_used=vars(args))
            exit_code = 1

    if result:
        print(result.to_json())

    return exit_code


if __name__ == "__main__":
    sys.exit(run())
