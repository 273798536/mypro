#!/usr/bin/env python3
import argparse
import json
import sys
from typing import Any, Dict

from .gate import ShadowGate
from .storage import Storage
from .compare import VersionComparer
from .models import VersionDiff


def _print_json(data: Any) -> None:
    print(json.dumps(data, ensure_ascii=False, indent=2))


def _parse_kv_pairs(items):
    result: Dict[str, Any] = {}
    if not items:
        return result
    for item in items:
        if "=" in item:
            k, v = item.split("=", 1)
            try:
                result[k] = json.loads(v)
            except (json.JSONDecodeError, TypeError):
                result[k] = v
    return result


def cmd_submit(args):
    gate = ShadowGate(data_dir=args.data_dir)
    params = _parse_kv_pairs(args.param)
    metrics = _parse_kv_pairs(args.metric)
    thresholds = _parse_kv_pairs(args.threshold)

    result = gate.submit(
        run_id=args.run_id,
        params=params,
        failure_reason=args.failure_reason or "",
        page_summary=args.page_summary or "",
        metrics=metrics,
        samples=args.samples or [],
        thresholds=thresholds,
        manual_corrections=[],
        note=args.note or "",
        actor=args.actor or "system",
    )
    _print_json(result.to_dict())
    return 0 if result.accepted or result.suspended else 1


def cmd_summary(args):
    gate = ShadowGate(data_dir=args.data_dir)
    summary = gate.get_page_summary(args.run_id)
    if summary is None:
        _print_json({"error": f"run_id={args.run_id} 不存在"})
        return 1
    _print_json(summary)
    return 0


def cmd_list(args):
    gate = ShadowGate(data_dir=args.data_dir)
    records = gate.list_records(
        status=args.status,
        suspended_only=args.suspended,
    )
    _print_json({"count": len(records), "records": records})
    return 0


def cmd_resume(args):
    gate = ShadowGate(data_dir=args.data_dir)
    result = gate.resume(
        run_id=args.run_id,
        actor=args.actor or "reviewer",
        comment=args.comment or "",
    )
    _print_json(result.to_dict())
    return 0 if result.accepted else 1


def cmd_confirm(args):
    gate = ShadowGate(data_dir=args.data_dir)
    result = gate.confirm(
        run_id=args.run_id,
        conclusion=args.conclusion,
        actor=args.actor or "reviewer",
        comment=args.comment or "",
    )
    _print_json(result.to_dict())
    return 0 if result.accepted else 1


def cmd_compare(args):
    storage = Storage(data_dir=args.data_dir)
    comparer = VersionComparer(storage)
    if args.all_reruns:
        results = comparer.compare_reruns(args.run_id)
        _print_json({"count": len(results), "diffs": results})
    else:
        record = storage.get_record(args.run_id)
        if record is None:
            _print_json({"error": f"run_id={args.run_id} 不存在"})
            return 1
        diffs = storage.get_version_diffs(args.run_id)
        summaries = [comparer.get_summary(VersionDiff(**d)) for d in diffs]
        _print_json({"count": len(summaries), "summaries": summaries})
    return 0


def cmd_audit(args):
    storage = Storage(data_dir=args.data_dir)
    entries = storage.get_audit_by_run(args.run_id)
    _print_json({"count": len(entries), "entries": entries})
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="shadow-gate",
        description="影子流量上线守门：保护失败队列证据，run_id重复挂起等待复核",
    )
    p.add_argument("--data-dir", default="./data", help="数据存储目录")
    sub = p.add_subparsers(dest="command", required=True)

    sp = sub.add_parser("submit", help="提交/重跑失败记录（启动守门）")
    sp.add_argument("--run-id", required=True)
    sp.add_argument("--failure-reason", required=True)
    sp.add_argument("--page-summary", required=True)
    sp.add_argument("--param", action="append", help="参数 key=value，可重复")
    sp.add_argument("--metric", action="append", help="指标 key=value，可重复")
    sp.add_argument("--threshold", action="append", help="阈值 key=value，可重复")
    sp.add_argument("--sample", dest="samples", action="append", help="样本，可重复")
    sp.add_argument("--note", help="临时备注")
    sp.add_argument("--actor", default="system")
    sp.set_defaults(func=cmd_submit)

    sp = sub.add_parser("summary", help="查看页面摘要")
    sp.add_argument("--run-id", required=True)
    sp.set_defaults(func=cmd_summary)

    sp = sub.add_parser("list", help="列出失败队列记录")
    sp.add_argument("--status")
    sp.add_argument("--suspended", action="store_true")
    sp.set_defaults(func=cmd_list)

    sp = sub.add_parser("resume", help="恢复挂起的run_id")
    sp.add_argument("--run-id", required=True)
    sp.add_argument("--comment")
    sp.add_argument("--actor", default="reviewer")
    sp.set_defaults(func=cmd_resume)

    sp = sub.add_parser("confirm", help="人工确认结论")
    sp.add_argument("--run-id", required=True)
    sp.add_argument("--conclusion", required=True, choices=["passed", "failed", "waived"])
    sp.add_argument("--comment")
    sp.add_argument("--actor", default="reviewer")
    sp.set_defaults(func=cmd_confirm)

    sp = sub.add_parser("compare", help="版本对比（样本/阈值/人工修正/指标）")
    sp.add_argument("--run-id", required=True)
    sp.add_argument("--all-reruns", action="store_true", help="对比所有重跑版本")
    sp.set_defaults(func=cmd_compare)

    sp = sub.add_parser("audit", help="查看人工确认历史")
    sp.add_argument("--run-id", required=True)
    sp.set_defaults(func=cmd_audit)

    return p


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
