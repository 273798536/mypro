#!/usr/bin/env python3
"""
声学混响报告导出 - 值班脚本调用入口。

所有输出默认以 JSON 打印到 stdout, 便于 shell / 其他脚本解析。
稳定字段: status, run_tag, failure_reason, export_path, message
"""

import argparse
import json
import sys
import os
import shutil
from typing import Any, Dict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from acoustic_reverb_export import (
    Storage,
    FieldAdapter,
    ParamVersionManager,
    GapDetector,
    ReportExporter,
    TraceQuerier,
)


def _load_json(path: str) -> Any:
    if not path:
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _print_json(payload: Dict[str, Any]):
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def cmd_param(args):
    storage = Storage(args.db)
    mgr = ParamVersionManager(storage)
    if args.action == "save":
        params = _load_json(args.params_file)
        if not params:
            _print_json({"status": "failed", "failure_reason": "params_file 必填且需为合法 JSON"})
            return 1
        tag, errors = mgr.save(
            params=params,
            source=args.source or "",
            operator=args.operator or "cli",
            remark=args.remark or "",
        )
        if errors:
            _print_json({"status": "failed", "failure_reason": "; ".join(errors)})
            return 2
        _print_json({"status": "success", "version_tag": tag, "message": "参数版本已保存"})
        return 0
    if args.action == "list":
        rows = mgr.list(limit=args.limit)
        _print_json({"status": "success", "count": len(rows), "rows": rows})
        return 0
    if args.action == "diff":
        if not args.tag_a or not args.tag_b:
            _print_json({"status": "failed", "failure_reason": "diff 需要 --tag-a 和 --tag-b"})
            return 1
        _print_json(mgr.diff(args.tag_a, args.tag_b))
        return 0
    if args.action == "get":
        pv = mgr.get(args.tag)
        if not pv:
            _print_json({"status": "failed", "failure_reason": "参数版本不存在"})
            return 1
        _print_json({"status": "success", "param_version": pv})
        return 0
    _print_json({"status": "failed", "failure_reason": f"未知 action: {args.action}"})
    return 1


def cmd_export(args):
    storage = Storage(args.db)
    exporter = ReportExporter(storage)
    # 注意: 未提供文件时保持 None, 不能用 `or []`, 否则 retry 的继承判断会失效
    sample_rows = _load_json(args.samples_file)
    photo_rows = _load_json(args.photos_file)
    if args.run_tag:
        result = exporter.retry(
            run_tag=args.run_tag,
            screenshot_path=args.screenshot_path or "",
            screenshot_description=args.screenshot_desc or "",
            current_remark=args.remark or "",
            triggered_by=args.triggered_by or "cli-retry",
            sample_rows=sample_rows,
            photo_rows=photo_rows,
            source_file=args.source_file or "",
            source_system=args.source_system or "",
        )
    else:
        result = exporter.run_export(
            sample_rows=sample_rows,
            photo_rows=photo_rows,
            source_file=args.source_file or "",
            source_system=args.source_system or "",
            screenshot_path=args.screenshot_path or "",
            screenshot_description=args.screenshot_desc or "",
            triggered_by=args.triggered_by or "cli",
            current_remark=args.remark or "",
            historical_remark=args.historical_remark or "",
            param_version_tag=args.param_tag,
        )
    _print_json(result)
    return 0 if result.get("status") == "success" else 3


def cmd_attach(args):
    storage = Storage(args.db)
    exporter = ReportExporter(storage)
    if args.screenshot_path or args.screenshot_desc:
        ok = exporter.attach_screenshot(
            run_tag=args.run_tag,
            screenshot_path=args.screenshot_path or "",
            screenshot_description=args.screenshot_desc or "",
            operator=args.operator or "cli",
        )
        if not ok:
            _print_json({"status": "failed", "failure_reason": "run_tag 不存在"})
            return 1
    if args.remark:
        ok = exporter.attach_remark(
            run_tag=args.run_tag,
            current_remark=args.remark,
            operator=args.operator or "cli",
        )
        if not ok:
            _print_json({"status": "failed", "failure_reason": "run_tag 不存在"})
            return 1
    _print_json({"status": "success", "message": "已更新"})
    return 0


def cmd_trace(args):
    storage = Storage(args.db)
    q = TraceQuerier(storage)
    if args.kind == "photo":
        _print_json(q.from_photo(args.id))
    elif args.kind == "report":
        _print_json(q.from_report(args.id))
    elif args.kind == "meeting":
        _print_json(q.for_meeting(args.id))
    else:
        _print_json({"status": "failed", "failure_reason": f"未知 kind: {args.kind}"})
        return 1
    return 0


def cmd_list(args):
    storage = Storage(args.db)
    exporter = ReportExporter(storage)
    if args.what == "runs":
        rows = exporter.list_runs(limit=args.limit)
        _print_json({"status": "success", "count": len(rows), "rows": rows})
    elif args.what == "photos":
        rows = storage.list_photos(limit=args.limit)
        _print_json({"status": "success", "count": len(rows), "rows": rows})
    else:
        _print_json({"status": "failed", "failure_reason": f"未知 what: {args.what}"})
        return 1
    return 0


def cmd_show(args):
    """查看 / 下载某次 run 的导出文件。"""
    storage = Storage(args.db)
    run = storage.get_report_run(run_tag=args.run_tag)
    if not run:
        _print_json({"status": "failed", "failure_reason": f"找不到 run_tag={args.run_tag}"})
        return 1
    export_path = run.get("export_path") or ""
    if not export_path or not os.path.exists(export_path):
        _print_json({
            "status": "failed",
            "failure_reason": f"导出文件不存在: {export_path or '(未生成)'}",
            "run_tag": args.run_tag,
        })
        return 1
    if args.copy:
        dest = os.path.abspath(args.copy)
        os.makedirs(os.path.dirname(dest) or ".", exist_ok=True)
        shutil.copyfile(export_path, dest)
        _print_json({
            "status": "success",
            "run_tag": args.run_tag,
            "source": export_path,
            "copied_to": dest,
            "message": f"已复制到 {dest}",
        })
        return 0
    with open(export_path, "r", encoding="utf-8") as f:
        artifact = json.load(f)
    if args.field and isinstance(artifact, dict):
        keys = args.field.split(".")
        cur = artifact
        for k in keys:
            if isinstance(cur, dict) and k in cur:
                cur = cur[k]
            else:
                _print_json({"status": "failed", "failure_reason": f"字段不存在: {args.field}"})
                return 1
        _print_json({"status": "success", "run_tag": args.run_tag, "field": args.field, "value": cur})
        return 0
    _print_json({
        "status": "success",
        "run_tag": args.run_tag,
        "export_path": export_path,
        "artifact": artifact,
    })
    return 0


def main():
    parser = argparse.ArgumentParser(prog="reverb-cli", description="声学混响报告导出 CLI")
    parser.add_argument("--db", default=None, help="SQLite 数据库路径, 默认使用内置路径")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_param = sub.add_parser("param", help="参数版本管理")
    p_param.add_argument("action", choices=["save", "list", "get", "diff"])
    p_param.add_argument("--params-file", help="JSON 文件路径 (save)")
    p_param.add_argument("--source", help="参数来源说明 (save)")
    p_param.add_argument("--operator", help="操作人 (save)")
    p_param.add_argument("--remark", help="备注 (save)")
    p_param.add_argument("--tag", help="参数版本标签 (get)")
    p_param.add_argument("--tag-a", help="参数版本 A (diff)")
    p_param.add_argument("--tag-b", help="参数版本 B (diff)")
    p_param.add_argument("--limit", type=int, default=20)

    p_exp = sub.add_parser("export", help="执行一次报告导出 (或重跑)")
    p_exp.add_argument("--samples-file", help="采样行 JSON 文件路径")
    p_exp.add_argument("--photos-file", help="照片行 JSON 文件路径")
    p_exp.add_argument("--source-file", help="采样来源文件路径 (用于缺口来源行标注)")
    p_exp.add_argument("--source-system", help="照片来源系统")
    p_exp.add_argument("--screenshot-path", help="截图文件路径")
    p_exp.add_argument("--screenshot-desc", help="截图说明文字")
    p_exp.add_argument("--triggered-by", help="触发方, 默认 cli")
    p_exp.add_argument("--remark", help="当前备注")
    p_exp.add_argument("--historical-remark", help="初始历史备注")
    p_exp.add_argument("--param-tag", help="指定参数版本标签, 默认取当前激活版本")
    p_exp.add_argument("--run-tag", help="如果填了, 则为重跑该 run_tag")

    p_att = sub.add_parser("attach", help="为某个 run 补录截图/备注")
    p_att.add_argument("run_tag", help="报告 run_tag")
    p_att.add_argument("--screenshot-path", help="截图路径")
    p_att.add_argument("--screenshot-desc", help="截图说明")
    p_att.add_argument("--remark", help="当前备注")
    p_att.add_argument("--operator", help="操作人")

    p_tra = sub.add_parser("trace", help="追溯查询 (交接/评审用)")
    p_tra.add_argument("kind", choices=["photo", "report", "meeting"])
    p_tra.add_argument("id", help="photo_id 或 run_tag")

    p_lst = sub.add_parser("list", help="列表查询")
    p_lst.add_argument("what", choices=["runs", "photos"])
    p_lst.add_argument("--limit", type=int, default=50)

    p_show = sub.add_parser("show", help="查看/下载某次 run 的导出文件")
    p_show.add_argument("run_tag", help="报告 run_tag")
    p_show.add_argument("--copy", help="复制导出文件到该路径 (下载)")
    p_show.add_argument("--field", help="只输出指定字段, 如 human_summary.照片数量")

    args = parser.parse_args()
    if args.cmd == "param":
        sys.exit(cmd_param(args))
    if args.cmd == "export":
        sys.exit(cmd_export(args))
    if args.cmd == "attach":
        sys.exit(cmd_attach(args))
    if args.cmd == "trace":
        sys.exit(cmd_trace(args))
    if args.cmd == "list":
        sys.exit(cmd_list(args))
    if args.cmd == "show":
        sys.exit(cmd_show(args))
    parser.print_help()
    sys.exit(1)


if __name__ == "__main__":
    main()
