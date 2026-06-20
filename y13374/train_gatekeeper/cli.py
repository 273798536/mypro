#!/usr/bin/env python3
import argparse
import json
import os
import sys
from typing import List

from .core import (
    GateEngine,
    StateManager,
    ReportGenerator,
    Sample,
    SampleSource,
    GateParams,
    GateDecision,
    NoteType,
)

EXIT_PASS = 0
EXIT_FAIL = 1
EXIT_WARNING = 2
EXIT_ERROR = 3


def load_samples(input_path: str) -> List[Sample]:
    if not os.path.exists(input_path):
        print(f"[ERROR] 样本文件不存在: {input_path}", file=sys.stderr)
        sys.exit(EXIT_ERROR)

    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    samples = []
    for item in data:
        source = SampleSource(item.get("source", "current"))
        sample = Sample(
            sample_id=item["sample_id"],
            content=item.get("content", ""),
            expected_label=item.get("expected_label", ""),
            predicted_label=item.get("predicted_label"),
            score=item.get("score"),
            source=source,
            version=item.get("version", "current"),
            is_boundary=item.get("is_boundary", False),
            metadata=item.get("metadata", {}),
        )
        samples.append(sample)

    return samples


def load_config(config_path: str) -> GateParams:
    if not os.path.exists(config_path):
        print(f"[WARN] 配置文件不存在，使用默认参数: {config_path}", file=sys.stderr)
        return GateParams()

    with open(config_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    return GateParams(
        gray_ratio=data.get("gray_ratio", 1.0),
        pass_threshold=data.get("pass_threshold", 0.8),
        fail_threshold=data.get("fail_threshold", 0.6),
        max_old_queue_ratio=data.get("max_old_queue_ratio", 0.3),
        max_boundary_ratio=data.get("max_boundary_ratio", 0.1),
        min_total_samples=data.get("min_total_samples", 10),
        version=data.get("version", "v1"),
    )


def cmd_run(args):
    data_dir = os.path.abspath(args.data_dir)
    input_path = os.path.abspath(args.input)
    config_path = os.path.abspath(args.config)

    state_mgr = StateManager(data_dir)
    reporter = ReportGenerator(data_dir)

    params = load_config(config_path)
    snapshot = state_mgr.update_params(params, reason=args.reason or "CLI 更新参数")

    samples = load_samples(input_path)

    engine = GateEngine(params)
    result = engine.evaluate(samples)
    result.param_snapshot_id = snapshot.snapshot_id

    state_mgr.record_run(result)

    report_path = reporter.generate_report(
        result=result,
        state=state_mgr.load_state(),
        samples=samples,
        format=args.format,
    )

    decision_cn = {"pass": "通过", "fail": "失败", "warning": "警戒"}.get(
        result.decision.value, result.decision.value
    )

    print("=" * 50)
    print("  训练队列上线守门 评测完成")
    print("=" * 50)
    print(f"结论: {decision_cn} ({result.decision.value})")
    print(f"准确率: {result.accuracy * 100:.2f}% ({result.correct_samples}/{result.total_samples})")
    print(f"运行编号: {result.run_id}")
    print(f"报告路径: {report_path}")
    print("-" * 50)

    if result.param_errors:
        print("[参数错误]")
        for err in result.param_errors:
            print(f"  - {err}")
        print("-" * 50)

    if result.next_steps:
        print("[下一步]")
        for step in result.next_steps[:3]:
            print(f"  - {step}")
        print("-" * 50)

    if result.decision == GateDecision.PASS:
        sys.exit(EXIT_PASS)
    elif result.decision == GateDecision.FAIL:
        sys.exit(EXIT_FAIL)
    else:
        sys.exit(EXIT_WARNING)


def cmd_status(args):
    data_dir = os.path.abspath(args.data_dir)
    state_mgr = StateManager(data_dir)
    state = state_mgr.load_state()
    consistency = state_mgr.verify_consistency()

    print("=" * 50)
    print("  训练队列上线守门 当前状态")
    print("=" * 50)
    print(f"状态ID: {state.state_id}")
    print(f"最后更新: {state.last_updated}")
    print(f"状态一致: {'是' if consistency['consistent'] else '否'}")
    print(f"历史运行数: {consistency['run_count']}")
    print(f"参数快照数: {consistency['param_history_count']}")
    print(f"备注数量: {consistency['note_count']}")
    print("-" * 50)

    print("[当前参数]")
    cp = state.current_params
    print(f"  gray_ratio: {cp.gray_ratio}")
    print(f"  pass_threshold: {cp.pass_threshold}")
    print(f"  fail_threshold: {cp.fail_threshold}")
    print(f"  min_total_samples: {cp.min_total_samples}")
    print(f"  version: {cp.version}")
    print("-" * 50)

    if state.current_result:
        r = state.current_result
        decision_cn = {"pass": "通过", "fail": "失败", "warning": "警戒"}.get(
            r.decision.value, r.decision.value
        )
        print("[最近一次评测]")
        print(f"  运行ID: {r.run_id}")
        print(f"  结论: {decision_cn} ({r.decision.value})")
        print(f"  准确率: {r.accuracy * 100:.2f}%")
        print(f"  样本数: {r.total_samples}")
        print(f"  评测时间: {r.created_at}")
    else:
        print("[最近一次评测] 暂无记录")
    print("-" * 50)

    if not consistency["consistent"]:
        print("[一致性问题]")
        for issue in consistency["issues"]:
            print(f"  - {issue}")

    print("")
    print("常用命令:")
    print("  重新评测:  train-gatekeeper run")
    print("  查看报告:  train-gatekeeper report")
    print("  添加备注:  train-gatekeeper note add --content '备注内容'")

    sys.exit(EXIT_PASS)


def cmd_report(args):
    data_dir = os.path.abspath(args.data_dir)
    state_mgr = StateManager(data_dir)
    reporter = ReportGenerator(data_dir)
    state = state_mgr.load_state()

    if args.run_id:
        result = state_mgr.get_run(args.run_id)
        if not result:
            print(f"[ERROR] 未找到 run_id={args.run_id} 的评测记录", file=sys.stderr)
            sys.exit(EXIT_ERROR)
    else:
        result = state.current_result
        if not result:
            print("[ERROR] 暂无评测记录，请先运行 train-gatekeeper run", file=sys.stderr)
            sys.exit(EXIT_ERROR)

    report_path = reporter.generate_report(
        result=result,
        state=state,
        format=args.format,
    )

    print(f"报告已生成: {report_path}")
    print(f"运行编号: {result.run_id}")
    print(f"结论: {result.decision.value}")

    sys.exit(EXIT_PASS)


def cmd_note_add(args):
    data_dir = os.path.abspath(args.data_dir)
    state_mgr = StateManager(data_dir)

    note_type = NoteType(args.type)
    related = args.related.split(",") if args.related else []

    note = state_mgr.add_note(
        content=args.content,
        note_type=note_type,
        author=args.author,
        related_sample_ids=related,
    )

    print(f"备注已添加 (ID: {note.note_id})")
    print(f"类型: {note.note_type.value}")
    print(f"作者: {note.author}")
    print(f"内容: {note.content}")
    sys.exit(EXIT_PASS)


def cmd_note_list(args):
    data_dir = os.path.abspath(args.data_dir)
    state_mgr = StateManager(data_dir)

    note_type = NoteType(args.type) if args.type else None
    notes = state_mgr.list_notes(note_type=note_type)

    print(f"共 {len(notes)} 条备注")
    print("-" * 50)
    for n in notes:
        print(f"[{n.note_type.value}] {n.note_id}  {n.author} @ {n.created_at}")
        print(f"    {n.content}")
        if n.related_sample_ids:
            print(f"    关联样本: {', '.join(n.related_sample_ids)}")
        print()

    sys.exit(EXIT_PASS)


def cmd_params_show(args):
    data_dir = os.path.abspath(args.data_dir)
    state_mgr = StateManager(data_dir)
    params = state_mgr.get_current_params()

    print("=" * 50)
    print("  当前守门参数")
    print("=" * 50)
    print(f"  gray_ratio (灰度比例):       {params.gray_ratio}")
    print(f"  pass_threshold (通过阈值):   {params.pass_threshold}")
    print(f"  fail_threshold (失败阈值):   {params.fail_threshold}")
    print(f"  max_old_queue_ratio:         {params.max_old_queue_ratio}")
    print(f"  max_boundary_ratio:          {params.max_boundary_ratio}")
    print(f"  min_total_samples:           {params.min_total_samples}")
    print(f"  version:                     {params.version}")
    print(f"  参数指纹:                    {params.fingerprint()}")
    print("")

    errors = params.validate()
    if errors:
        print("[参数校验不通过]")
        for e in errors:
            print(f"  - {e}")
    else:
        print("[参数校验通过]")

    sys.exit(EXIT_PASS)


def cmd_params_history(args):
    data_dir = os.path.abspath(args.data_dir)
    state_mgr = StateManager(data_dir)
    state = state_mgr.load_state()

    print(f"共 {len(state.param_history)} 个参数快照")
    print("-" * 50)
    for i, s in enumerate(state.param_history):
        print(f"[{i + 1}] {s.snapshot_id}  {s.created_at}")
        if s.reason:
            print(f"    原因: {s.reason}")
        print(f"    gray_ratio={s.params.gray_ratio}, "
              f"pass={s.params.pass_threshold}, "
              f"fail={s.params.fail_threshold}")

    sys.exit(EXIT_PASS)


def cmd_params_compare(args):
    data_dir = os.path.abspath(args.data_dir)
    state_mgr = StateManager(data_dir)

    result = state_mgr.compare_params(args.old, args.new)

    if not result["found"]:
        print("[ERROR] 未找到指定的快照ID", file=sys.stderr)
        sys.exit(EXIT_ERROR)

    print(f"对比: {result['old_snapshot_id']} → {result['new_snapshot_id']}")
    print(f"时间: {result['old_created_at']} → {result['new_created_at']}")
    print("-" * 50)

    if not result["changes"]:
        print("参数无变化")
    else:
        print(f"共 {len(result['changes'])} 项变更:")
        for c in result["changes"]:
            print(f"  {c['param']}: {c['old']} → {c['new']}")

    sys.exit(EXIT_PASS)


def main():
    parser = argparse.ArgumentParser(
        prog="train-gatekeeper",
        description="训练队列上线守门 - 评测工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  train-gatekeeper run --config config.json --input samples.json
  train-gatekeeper status
  train-gatekeeper report --format html
  train-gatekeeper note add --content "复测通过" --author 小唐
  train-gatekeeper params show
  train-gatekeeper params history

退出码约定:
  0 - 通过 (pass)
  1 - 失败 (fail)
  2 - 警戒 (warning)
  3 - 命令错误 (error)
""",
    )

    parser.add_argument(
        "--data-dir",
        default=os.path.join(os.getcwd(), "data"),
        help="数据目录 (默认: ./data)",
    )

    subparsers = parser.add_subparsers(dest="command", help="子命令")

    run_parser = subparsers.add_parser("run", help="运行评测")
    run_parser.add_argument("--config", "-c", default="config.json", help="配置文件路径")
    run_parser.add_argument("--input", "-i", default="samples.json", help="样本文件路径")
    run_parser.add_argument("--format", "-f", default="json", choices=["json", "txt", "html"],
                            help="报告格式 (默认: json)")
    run_parser.add_argument("--reason", "-r", default="", help="参数变更原因")

    status_parser = subparsers.add_parser("status", help="查看当前状态")

    report_parser = subparsers.add_parser("report", help="导出报告")
    report_parser.add_argument("--run-id", default=None, help="指定运行ID，默认最新一次")
    report_parser.add_argument("--format", "-f", default="json", choices=["json", "txt", "html"],
                               help="报告格式 (默认: json)")

    note_parser = subparsers.add_parser("note", help="备注管理")
    note_sub = note_parser.add_subparsers(dest="note_cmd")

    note_add = note_sub.add_parser("add", help="添加备注")
    note_add.add_argument("--content", required=True, help="备注内容")
    note_add.add_argument("--type", default="verbal", choices=["verbal", "formal"],
                          help="备注类型 (默认: verbal)")
    note_add.add_argument("--author", default="anonymous", help="作者")
    note_add.add_argument("--related", default="", help="关联样本ID，逗号分隔")

    note_list = note_sub.add_parser("list", help="列出备注")
    note_list.add_argument("--type", default=None, choices=["verbal", "formal"],
                           help="按类型过滤")

    params_parser = subparsers.add_parser("params", help="参数管理")
    params_sub = params_parser.add_subparsers(dest="params_cmd")

    params_sub.add_parser("show", help="显示当前参数")
    params_sub.add_parser("history", help="参数变更历史")

    params_cmp = params_sub.add_parser("compare", help="对比两个参数版本")
    params_cmp.add_argument("--old", required=True, help="旧快照ID")
    params_cmp.add_argument("--new", required=True, help="新快照ID")

    args = parser.parse_args()

    if args.command is None:
        parser.print_help()
        sys.exit(EXIT_ERROR)

    if args.command == "run":
        cmd_run(args)
    elif args.command == "status":
        cmd_status(args)
    elif args.command == "report":
        cmd_report(args)
    elif args.command == "note":
        if args.note_cmd == "add":
            cmd_note_add(args)
        elif args.note_cmd == "list":
            cmd_note_list(args)
        else:
            note_parser.print_help()
            sys.exit(EXIT_ERROR)
    elif args.command == "params":
        if args.params_cmd == "show":
            cmd_params_show(args)
        elif args.params_cmd == "history":
            cmd_params_history(args)
        elif args.params_cmd == "compare":
            cmd_params_compare(args)
        else:
            params_parser.print_help()
            sys.exit(EXIT_ERROR)
    else:
        parser.print_help()
        sys.exit(EXIT_ERROR)


if __name__ == "__main__":
    main()
