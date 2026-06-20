import argparse
import sys
import json
import os

from .database import init_db, DEFAULT_DB_PATH
from .tracker import NegSampleTracker
from .reporter import ReportGenerator
from .decision import DecisionManager
from .comparator import RunComparator
from .exporter import CSVExporter
from .constants import (
    STATUS_LABELS,
    DECISION_LABELS,
    ERROR_MESSAGES,
)


def _print_result(result, as_json=False):
    """统一输出格式，脚本易解析。"""
    if as_json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        if result.get("success") is False:
            error_code = result.get("error_code", "E999")
            error_msg = result.get("error_message", result.get("error", "未知错误"))
            print(f"[错误] {error_code}: {error_msg}", file=sys.stderr)
        else:
            print("操作成功")
            for key, value in result.items():
                if key == "success":
                    continue
                print(f"  {key}: {value}")


def cmd_init(args):
    init_db(args.db_path)
    _print_result({"success": True, "db_path": args.db_path or DEFAULT_DB_PATH},
                  as_json=args.json)


def cmd_create_run(args):
    tracker = NegSampleTracker(args.db_path)
    result = tracker.create_run(
        run_id=args.run_id,
        model_version=args.model_version,
        data_source=args.data_source,
        raw_snapshot_path=args.raw_snapshot_path,
    )
    _print_result(result, as_json=args.json)
    if result.get("is_duplicate"):
        sys.exit(2)


def cmd_add_features(args):
    tracker = NegSampleTracker(args.db_path)
    snapshots = []
    if args.snapshot_file:
        with open(args.snapshot_file, "r", encoding="utf-8") as f:
            snapshots = json.load(f)
    elif args.feature:
        for feat_str in args.feature:
            parts = feat_str.split("=", 1)
            if len(parts) == 2:
                name, value = parts
                snapshots.append({
                    "feature_name": name,
                    "feature_value": value,
                    "raw_value": value,
                    "is_raw_dirty": False,
                })
            else:
                snapshots.append({
                    "feature_name": feat_str,
                    "feature_value": None,
                    "raw_value": None,
                    "is_raw_dirty": True,
                })

    result = tracker.add_feature_snapshots_batch(args.run_id, snapshots)
    _print_result(result, as_json=args.json)
    if not result.get("success"):
        sys.exit(1)


def cmd_add_params(args):
    tracker = NegSampleTracker(args.db_path)
    changes = []
    if args.param_file:
        with open(args.param_file, "r", encoding="utf-8") as f:
            changes = json.load(f)
    elif args.param:
        for param_str in args.param:
            parts = param_str.split("=", 1)
            if len(parts) == 2:
                name, new_val = parts
                changes.append({
                    "param_name": name,
                    "old_value": None,
                    "new_value": new_val,
                })

    result = tracker.add_param_changes_batch(args.run_id, changes)
    _print_result(result, as_json=args.json)
    if not result.get("success"):
        sys.exit(1)


def cmd_get_run(args):
    tracker = NegSampleTracker(args.db_path)
    result = tracker.get_run(args.run_id)
    if result is None:
        _print_result({
            "success": False,
            "error_code": "E002",
            "error_message": ERROR_MESSAGES["E002"],
        }, as_json=args.json)
        sys.exit(1)
    else:
        result["success"] = True
        _print_result(result, as_json=args.json)


def cmd_list_runs(args):
    tracker = NegSampleTracker(args.db_path)
    runs = tracker.list_runs(status=args.status, limit=args.limit, offset=args.offset)
    result = {"success": True, "total": len(runs), "runs": runs}
    _print_result(result, as_json=args.json)


def cmd_resolve_conflict(args):
    tracker = NegSampleTracker(args.db_path)
    result = tracker.resolve_conflict(
        run_id=args.run_id,
        keep_existing=args.keep_existing,
    )
    _print_result(result, as_json=args.json)


def cmd_report(args):
    reporter = ReportGenerator(args.db_path)
    if args.action == "generate":
        result = reporter.generate_report(args.run_id)
        if result.get("success") and not args.json:
            print(result.get("report_text", ""))
        else:
            _print_result(result, as_json=args.json)
    elif args.action == "show":
        report = reporter.get_report(args.run_id)
        if report is None:
            _print_result({
                "success": False,
                "error": "未找到报告，请先生成",
            }, as_json=args.json)
            sys.exit(1)
        else:
            if args.json:
                report["success"] = True
                _print_result(report, as_json=True)
            else:
                print(report.get("report_content", ""))


def cmd_decide(args):
    dm = DecisionManager(args.db_path)
    if args.action == "approve":
        result = dm.approve(
            run_id=args.run_id,
            decision_note=args.note,
            decided_by=args.decided_by,
            model_version_snapshot=args.model_version,
        )
    elif args.action == "reject":
        result = dm.reject(
            run_id=args.run_id,
            decision_note=args.note,
            decided_by=args.decided_by,
            model_version_snapshot=args.model_version,
        )
    elif args.action == "history":
        history = dm.get_decision_history(args.run_id)
        if history is None:
            _print_result({
                "success": False,
                "error_code": "E002",
                "error_message": ERROR_MESSAGES["E002"],
            }, as_json=args.json)
            sys.exit(1)
        result = {"success": True, "decisions": history}
    else:
        result = {"success": False, "error": "未知操作"}

    _print_result(result, as_json=args.json)
    if not result.get("success"):
        sys.exit(1)


def cmd_compare(args):
    comp = RunComparator(args.db_path)
    result = comp.compare_runs(args.run_id_a, args.run_id_b)
    if args.json:
        _print_result(result, as_json=True)
    else:
        if result.get("success"):
            print(comp.format_compare_text(result))
        else:
            _print_result(result, as_json=False)
            sys.exit(1)


def cmd_export(args):
    exporter = CSVExporter(args.db_path)

    if args.type == "runs":
        result = exporter.export_runs(
            output_path=args.output,
            status=args.status,
        )
    elif args.type == "features":
        result = exporter.export_feature_snapshots(
            run_id=args.run_id,
            output_path=args.output,
        )
    elif args.type == "params":
        result = exporter.export_param_changes(
            run_id=args.run_id,
            output_path=args.output,
        )
    elif args.type == "decisions":
        result = exporter.export_decisions(
            output_path=args.output,
            decision=args.decision,
        )
    elif args.type == "full":
        result = exporter.export_full_detail(
            run_id=args.run_id,
            output_path=args.output,
        )
    else:
        result = {"success": False, "error": "未知导出类型"}

    _print_result(result, as_json=args.json)
    if not result.get("success"):
        sys.exit(1)


def build_parser():
    parser = argparse.ArgumentParser(
        prog="neg-sample-tracker",
        description="负采样任务追踪工具",
    )
    parser.add_argument(
        "--db-path",
        default=None,
        help="数据库文件路径（默认当前目录下 neg_sample_tracker.db）",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="以 JSON 格式输出结果，便于脚本解析",
    )

    subparsers = parser.add_subparsers(dest="command", help="可用命令")

    p_init = subparsers.add_parser("init", help="初始化数据库")
    p_init.set_defaults(func=cmd_init)

    p_create = subparsers.add_parser("create-run", help="创建负采样运行记录")
    p_create.add_argument("--run-id", required=True, help="运行编号（唯一标识）")
    p_create.add_argument("--model-version", default=None, help="模型版本")
    p_create.add_argument("--data-source", default=None, help="数据来源")
    p_create.add_argument("--raw-snapshot-path", default=None, help="原始快照文件路径")
    p_create.set_defaults(func=cmd_create_run)

    p_addf = subparsers.add_parser("add-features", help="添加特征快照")
    p_addf.add_argument("--run-id", required=True, help="运行编号")
    p_addf.add_argument("--snapshot-file", default=None, help="快照 JSON 文件路径")
    p_addf.add_argument(
        "--feature",
        action="append",
        default=None,
        help="单个特征，格式为 名称=值（可重复使用）",
    )
    p_addf.set_defaults(func=cmd_add_features)

    p_addp = subparsers.add_parser("add-params", help="添加参数变化记录")
    p_addp.add_argument("--run-id", required=True, help="运行编号")
    p_addp.add_argument("--param-file", default=None, help="参数变化 JSON 文件路径")
    p_addp.add_argument(
        "--param",
        action="append",
        default=None,
        help="单个参数，格式为 名称=新值（可重复使用）",
    )
    p_addp.set_defaults(func=cmd_add_params)

    p_get = subparsers.add_parser("get-run", help="查看单条运行详情")
    p_get.add_argument("--run-id", required=True, help="运行编号")
    p_get.set_defaults(func=cmd_get_run)

    p_list = subparsers.add_parser("list-runs", help="列出运行记录")
    p_list.add_argument("--status", default=None, help="按状态筛选")
    p_list.add_argument("--limit", type=int, default=100, help="返回数量上限")
    p_list.add_argument("--offset", type=int, default=0, help="偏移量")
    p_list.set_defaults(func=cmd_list_runs)

    p_resolve = subparsers.add_parser("resolve-conflict", help="解决 run_id 冲突")
    p_resolve.add_argument("--run-id", required=True, help="运行编号")
    p_resolve.add_argument(
        "--keep-existing",
        action="store_true",
        default=True,
        help="保留已存在的记录（默认）",
    )
    p_resolve.add_argument(
        "--use-new",
        action="store_false",
        dest="keep_existing",
        help="使用新提交的记录",
    )
    p_resolve.set_defaults(func=cmd_resolve_conflict)

    p_report = subparsers.add_parser("report", help="生成/查看报告")
    p_report.add_argument("action", choices=["generate", "show"], help="操作类型")
    p_report.add_argument("--run-id", required=True, help="运行编号")
    p_report.set_defaults(func=cmd_report)

    p_decide = subparsers.add_parser("decide", help="人工判断")
    p_decide.add_argument(
        "action",
        choices=["approve", "reject", "history"],
        help="操作类型：approve=放行, reject=补材料, history=查看历史",
    )
    p_decide.add_argument("--run-id", required=True, help="运行编号")
    p_decide.add_argument("--note", default=None, help="判断备注")
    p_decide.add_argument("--decided-by", default=None, help="判断人")
    p_decide.add_argument("--model-version", default=None, help="模型版本快照")
    p_decide.set_defaults(func=cmd_decide)

    p_compare = subparsers.add_parser("compare", help="对比两次运行结果")
    p_compare.add_argument("--run-id-a", required=True, help="运行编号 A")
    p_compare.add_argument("--run-id-b", required=True, help="运行编号 B")
    p_compare.set_defaults(func=cmd_compare)

    p_export = subparsers.add_parser("export", help="导出 CSV")
    p_export.add_argument(
        "type",
        choices=["runs", "features", "params", "decisions", "full"],
        help="导出类型：runs=运行列表, features=特征快照, params=参数变化, "
             "decisions=人工判断, full=完整明细",
    )
    p_export.add_argument("--run-id", default=None, help="运行编号（features/params/full 需要）")
    p_export.add_argument("--output", default=None, help="输出文件路径（不传则打印到标准输出）")
    p_export.add_argument("--status", default=None, help="按状态筛选（runs 类型用）")
    p_export.add_argument("--decision", default=None, help="按判断结果筛选（decisions 类型用）")
    p_export.set_defaults(func=cmd_export)

    return parser


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)

    if not hasattr(args, "func"):
        parser.print_help()
        sys.exit(1)

    args.func(args)


if __name__ == "__main__":
    main()
