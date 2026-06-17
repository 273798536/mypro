import argparse
import json
import os
import sys
from datetime import datetime

from .core.comparison import (
    load_model_logs, load_segments, load_safety_rules, load_feedback,
    run_comparison, apply_feedback, _now_str, _new_id,
)
from .statistics.distribution import compute_statistics, refresh_statistics
from .anomalies.classifier import print_anomaly_summary, classify_anomalies
from .export.reporter import export_all, export_json, export_markdown
from .models.schemas import HumanFeedback


SAMPLES_DIR = os.path.join(os.path.dirname(__file__), "samples")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="retrieval_compare",
        description="检索召回对比 API —— 模型日志 vs 切分清单 对比工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 1. 使用内置样例数据直接跑（不用自己整理文件）
  python -m retrieval_compare run --sample

  # 2. 指定自己的数据
  python -m retrieval_compare run \\
      --model-logs /path/to/model_logs.json \\
      --segments /path/to/segments.json \\
      --safety-rules /path/to/safety_rules.json \\
      --output-dir ./output

  # 3. 追加人工反馈（补录后自动刷新统计）
  python -m retrieval_compare feedback \\
      --input ./output/retrieval_compare.json \\
      --record-id anom_xxxxxx \\
      --feedback-type resolve \\
      --content "已在清单补充缺失规则R003，见工单 #1234" \\
      --reviewer "安全_李审核"

  # 4. 重新只导出报告
  python -m retrieval_compare export \\
      --input ./output/retrieval_compare.json \\
      --output-dir ./output
""",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    run_p = sub.add_parser("run", help="执行一次对比分析")
    run_p.add_argument("--sample", action="store_true", help="使用内置样例数据，无需准备文件")
    run_p.add_argument("--model-logs", help="模型日志 JSON 文件路径")
    run_p.add_argument("--segments", help="切分清单 JSON 文件路径")
    run_p.add_argument("--safety-rules", help="安全规则 JSON 文件路径")
    run_p.add_argument("--feedback", help="已有的人工反馈 JSON（可选）")
    run_p.add_argument("--output-dir", default="./output", help="输出目录，默认 ./output")
    run_p.add_argument("--name-prefix", default="retrieval_compare", help="输出文件名前缀")
    run_p.add_argument("--quiet", action="store_true", help="不打印终端摘要")

    fb_p = sub.add_parser("feedback", help="为某条异常补录人工反馈，并刷新统计")
    fb_p.add_argument("--input", required=True, help="上一轮生成的 retrieval_compare.json 路径")
    fb_p.add_argument("--record-id", required=True, help="异常记录 ID（例如 anom_xxxxxx）")
    fb_p.add_argument(
        "--feedback-type",
        required=True,
        choices=["confirm", "resolve", "dispute", "remark"],
        help="confirm=确认异常存在  resolve=已解决  dispute=对判定有异议  remark=仅补充备注",
    )
    fb_p.add_argument("--content", required=True, help="反馈内容，原话保留不做改写")
    fb_p.add_argument("--reviewer", required=True, help="审核人姓名/工号")
    fb_p.add_argument("--corrected-value", help="JSON 格式的修正值（可选）")
    fb_p.add_argument("--output-dir", default="./output", help="刷新后的输出目录")
    fb_p.add_argument("--name-prefix", default="retrieval_compare", help="输出文件名前缀")

    exp_p = sub.add_parser("export", help="从已有的 JSON 对比结果重新导出报告")
    exp_p.add_argument("--input", required=True, help="retrieval_compare.json 路径")
    exp_p.add_argument("--output-dir", default="./output", help="输出目录")
    exp_p.add_argument("--name-prefix", default="retrieval_compare", help="输出文件名前缀")

    show_p = sub.add_parser("show-samples", help="打印内置样例数据路径和说明")

    return parser


def _resolve_paths(args):
    if args.sample:
        return {
            "model_logs": os.path.join(SAMPLES_DIR, "model_logs.json"),
            "segments": os.path.join(SAMPLES_DIR, "segments.json"),
            "safety_rules": os.path.join(SAMPLES_DIR, "safety_rules.json"),
            "feedback": None,
        }
    required = ["model_logs", "segments", "safety_rules"]
    missing = [f"--{r.replace('_', '-')}" for r in required if not getattr(args, r)]
    if missing:
        print(f"错误: 非 --sample 模式下必须提供: {' '.join(missing)}", file=sys.stderr)
        sys.exit(2)
    return {
        "model_logs": args.model_logs,
        "segments": args.segments,
        "safety_rules": args.safety_rules,
        "feedback": getattr(args, "feedback", None),
    }


def cmd_run(args):
    paths = _resolve_paths(args)
    logs = load_model_logs(paths["model_logs"])
    segs = load_segments(paths["segments"])
    rules = load_safety_rules(paths["safety_rules"])
    feedback = load_feedback(paths["feedback"]) if paths["feedback"] else None

    result = run_comparison(logs, segs, rules, existing_feedback=feedback)
    compute_statistics(result)

    if not args.quiet:
        print(f"模型日志: {paths['model_logs']} ({result.total_model_logs} 条)")
        print(f"切分清单: {paths['segments']} ({result.total_segments} 条)")
        print(f"安全规则: {paths['safety_rules']} ({len(rules)} 条)")
        print(f"匹配记录: {result.matched_records}")
        print(f"检出异常: {len(result.anomalies)}")
        print()
        print_anomaly_summary(result.anomalies)

    out = export_all(result, args.output_dir, name_prefix=args.name_prefix)
    if not args.quiet:
        print()
        print("=" * 70)
        print(f"JSON 报告: {out['json']}")
        print(f"评审报告: {out['markdown']}")
    return 0


def cmd_feedback(args):
    with open(args.input, "r", encoding="utf-8") as f:
        data = json.load(f)

    from .models.schemas import (
        ComparisonResult, AnomalyRecord, ModelLog, SegmentItem,
        HumanRemark, HumanFeedback as _HF, AnomalyType, NextAction, RecordStatus,
    )

    anomalies = []
    for a_raw in data.get("anomalies", []):
        ml = None
        if a_raw.get("model_log"):
            m = a_raw["model_log"]
            ml = ModelLog(
                log_id=m["log_id"], query=m["query"], segment_id=m["segment_id"],
                retrieved_segments=m.get("retrieved_segments", []), score=m["score"],
                safety_rule_hit=m.get("safety_rule_hit", []), timestamp=m.get("timestamp", ""),
                human_remarks=[HumanRemark(**r) for r in m.get("human_remarks", [])],
                extra=m.get("extra", {}),
            )
        sg = None
        if a_raw.get("segment"):
            s = a_raw["segment"]
            sg = SegmentItem(
                segment_id=s["segment_id"], content=s["content"], category=s["category"],
                safety_rules=s.get("safety_rules", []), tags=s.get("tags", []),
                human_remarks=[HumanRemark(**r) for r in s.get("human_remarks", [])],
                extra=s.get("extra", {}),
            )
        anomalies.append(AnomalyRecord(
            record_id=a_raw["record_id"],
            anomaly_type=AnomalyType(a_raw["anomaly_type"]),
            model_log=ml, segment=sg,
            description=a_raw.get("description", ""),
            next_action=NextAction(a_raw.get("next_action", "await_review")),
            status=RecordStatus(a_raw.get("status", "pending")),
            human_remarks=[HumanRemark(**r) for r in a_raw.get("human_remarks", [])],
            feedback_history=[_HF(**f) for f in a_raw.get("feedback_history", [])],
            detected_at=a_raw.get("detected_at", ""),
            last_updated_at=a_raw.get("last_updated_at", ""),
        ))

    result = ComparisonResult(
        total_model_logs=data.get("total_model_logs", 0),
        total_segments=data.get("total_segments", 0),
        matched_records=data.get("matched_records", 0),
        anomalies=anomalies,
        statistics=data.get("statistics", {}),
        generated_at=data.get("generated_at", ""),
    )

    corrected = None
    if args.corrected_value:
        try:
            corrected = json.loads(args.corrected_value)
        except json.JSONDecodeError:
            corrected = args.corrected_value

    fb = HumanFeedback(
        feedback_id=_new_id("fb"),
        record_id=args.record_id,
        feedback_type=args.feedback_type,
        content=args.content,
        reviewer=args.reviewer,
        created_at=_now_str(),
        corrected_value=corrected,
    )

    apply_feedback(result, fb)
    refresh_statistics(result)

    out = export_all(result, args.output_dir, name_prefix=args.name_prefix)
    print(f"已为 {args.record_id} 记录反馈: [{args.feedback_type}] {args.content}")
    print(f"刷新后的 JSON 报告: {out['json']}")
    print(f"刷新后的评审报告: {out['markdown']}")
    return 0


def cmd_export(args):
    with open(args.input, "r", encoding="utf-8") as f:
        data = json.load(f)
    from .models.schemas import (
        ComparisonResult, AnomalyRecord, ModelLog, SegmentItem,
        HumanRemark, HumanFeedback, AnomalyType, NextAction, RecordStatus,
    )
    anomalies = []
    for a_raw in data.get("anomalies", []):
        ml = None
        if a_raw.get("model_log"):
            m = a_raw["model_log"]
            ml = ModelLog(
                log_id=m["log_id"], query=m["query"], segment_id=m["segment_id"],
                retrieved_segments=m.get("retrieved_segments", []), score=m["score"],
                safety_rule_hit=m.get("safety_rule_hit", []), timestamp=m.get("timestamp", ""),
                human_remarks=[HumanRemark(**r) for r in m.get("human_remarks", [])],
                extra=m.get("extra", {}),
            )
        sg = None
        if a_raw.get("segment"):
            s = a_raw["segment"]
            sg = SegmentItem(
                segment_id=s["segment_id"], content=s["content"], category=s["category"],
                safety_rules=s.get("safety_rules", []), tags=s.get("tags", []),
                human_remarks=[HumanRemark(**r) for r in s.get("human_remarks", [])],
                extra=s.get("extra", {}),
            )
        anomalies.append(AnomalyRecord(
            record_id=a_raw["record_id"],
            anomaly_type=AnomalyType(a_raw["anomaly_type"]),
            model_log=ml, segment=sg,
            description=a_raw.get("description", ""),
            next_action=NextAction(a_raw.get("next_action", "await_review")),
            status=RecordStatus(a_raw.get("status", "pending")),
            human_remarks=[HumanRemark(**r) for r in a_raw.get("human_remarks", [])],
            feedback_history=[HumanFeedback(**f) for f in a_raw.get("feedback_history", [])],
            detected_at=a_raw.get("detected_at", ""),
            last_updated_at=a_raw.get("last_updated_at", ""),
        ))
    result = ComparisonResult(
        total_model_logs=data.get("total_model_logs", 0),
        total_segments=data.get("total_segments", 0),
        matched_records=data.get("matched_records", 0),
        anomalies=anomalies,
        statistics=data.get("statistics", {}),
        generated_at=data.get("generated_at", ""),
    )
    refresh_statistics(result)
    out = export_all(result, args.output_dir, name_prefix=args.name_prefix)
    print(f"JSON 报告: {out['json']}")
    print(f"评审报告: {out['markdown']}")
    return 0


def cmd_show_samples(_args):
    print("内置样例数据位于:")
    print(f"  模型日志:  {os.path.join(SAMPLES_DIR, 'model_logs.json')}")
    print(f"  切分清单:  {os.path.join(SAMPLES_DIR, 'segments.json')}")
    print(f"  安全规则:  {os.path.join(SAMPLES_DIR, 'safety_rules.json')}")
    print(f"  反馈示例:  {os.path.join(SAMPLES_DIR, 'feedback.json')}")
    print()
    print("快速开始: python -m retrieval_compare run --sample")
    return 0


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command == "run":
        return cmd_run(args)
    if args.command == "feedback":
        return cmd_feedback(args)
    if args.command == "export":
        return cmd_export(args)
    if args.command == "show-samples":
        return cmd_show_samples(args)
    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
