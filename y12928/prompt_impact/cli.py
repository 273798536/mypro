from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import List

from prompt_impact import analyze as analyze_mod
from prompt_impact import diff as diff_mod
from prompt_impact import errors as E
from prompt_impact import parsing
from prompt_impact import replay as replay_mod
from prompt_impact import report as report_mod
from prompt_impact import sample as sample_mod
from prompt_impact import trace as trace_mod
from prompt_impact.ids import run_id as new_run_id
from prompt_impact.models import RunManifest
from prompt_impact.store import Store, now_iso


def _run_pipeline(input_dir: Path, output_dir: Path):
    now = now_iso()
    store = Store.load(output_dir)
    parsed = parsing.parse_inputs(input_dir, now)

    for m in parsed.materials:
        store.upsert_material(m)

    findings = analyze_mod.analyze(parsed)
    run_id_val = new_run_id()
    touched = set()
    new_findings: List[str] = []
    changed_findings: List[str] = []
    for f in findings:
        action, _ = store.upsert_finding(f, run_id_val, now)
        touched.add(f.id)
        if action == "new":
            new_findings.append(f.id)
        elif action in ("updated", "reopened"):
            changed_findings.append(f.id)

    resolved = store.resolve_orphans(touched, run_id_val, now)
    store.save(run_id_val)

    manifest = RunManifest(
        run_id=run_id_val,
        started_at=now,
        finished_at=now_iso(),
        input_dir=str(input_dir),
        output_dir=str(output_dir),
        material_fingerprints={m.source_path: m.fingerprint for m in parsed.materials},
        counts={
            "materials": len(parsed.materials),
            "prompts": len(parsed.prompts),
            "model_logs": len(parsed.model_logs),
            "annotations": len(parsed.annotations),
            "eval_runs": len(parsed.eval_runs),
            "findings": len(findings),
        },
        changed_findings=changed_findings,
        new_findings=new_findings,
        resolved_findings=resolved,
        errors=list(parsed.errors),
    )
    report = report_mod.build_report(store, manifest, run_id_val, now_iso(), parsed.errors)
    report_mod.save_artifacts(report, store, output_dir)
    return report, store, parsed


def cmd_run(args) -> int:
    input_dir = Path(args.input).resolve()
    output_dir = Path(args.output).resolve()
    if not input_dir.exists():
        print(f"[MISSING_INPUT] 输入目录不存在: {input_dir}", file=sys.stderr)
        print("处置建议: 请确认 --input 指向包含 prompts/ model_logs/ annotations/ runs/ 的材料目录。", file=sys.stderr)
        return 2
    if input_dir.resolve() == output_dir.resolve():
        print("[CONFIG] 输入与输出目录相同，可能污染材料目录，已拒绝。", file=sys.stderr)
        return 2
    report, store, parsed = _run_pipeline(input_dir, output_dir)
    print(report_mod.to_terminal_summary(report))
    return 1 if report.gate_decision == report_mod.GATE_FAIL else 0


def cmd_replay(args) -> int:
    input_dir = Path(args.input).resolve()
    output_dir = Path(args.output).resolve()
    if not input_dir.exists():
        print(f"[MISSING_INPUT] 输入目录不存在: {input_dir}", file=sys.stderr)
        return 2
    now = now_iso()
    parsed = parsing.parse_inputs(input_dir, now)
    store = Store.load(output_dir)
    if not store.findings:
        print("[NO_STORE] 输出目录尚无结论记录，请先执行 run 后再 replay。", file=sys.stderr)
        return 2
    result = replay_mod.replay(parsed, store, args.eval_run)
    out_path = output_dir / f"replay_{args.eval_run}.json"
    out_path.write_text(json.dumps(result.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
    print(replay_mod.render_replay(result))
    print(f"\n回放结果已写入: {out_path}")
    return 0 if result.status == "complete" else 1


def cmd_trace(args) -> int:
    output_dir = Path(args.output).resolve()
    store = Store.load(output_dir)
    finding_id = args.result_id or args.finding_id
    if not finding_id:
        print("[USAGE] 请通过 --result-id 指定要倒查的结论 ID。", file=sys.stderr)
        return 2
    finding = store.findings.get(finding_id)
    if finding is None:
        print(f"[NOT_FOUND] 未找到结论 ID: {finding_id}", file=sys.stderr)
        print("处置建议: 执行 `prompt-impact run` 后，在 report.json 的 findings 中查阅 id。", file=sys.stderr)
        return 1
    record = trace_mod.trace_for(store, finding_id)
    if record is None:
        print(f"[NOT_FOUND] 该结论无追溯记录: {finding_id}", file=sys.stderr)
        return 1
    print(trace_mod.render_trace(record, finding))
    return 0 if record.complete else 1


def cmd_export(args) -> int:
    output_dir = Path(args.output).resolve()
    report_path = output_dir / "report.json"
    if not report_path.exists():
        print("[NO_REPORT] 输出目录没有 report.json，请先执行 run。", file=sys.stderr)
        return 2
    try:
        from prompt_impact.models import Report

        report = Report.from_dict(json.loads(report_path.read_text(encoding="utf-8")))
    except (json.JSONDecodeError, OSError) as exc:
        print(f"[CORRUPT_REPORT] report.json 解析失败: {exc}", file=sys.stderr)
        return 2
    fmt = args.format
    content = report_mod.to_markdown(report) if fmt == "md" else (
        report_mod.to_terminal_summary(report) if fmt == "summary" else json.dumps(report.to_dict(), ensure_ascii=False, indent=2)
    )
    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(content, encoding="utf-8")
        print(f"已导出 {fmt} -> {out_path}")
    else:
        print(content)
    report_mod.assert_consistent(report, report_mod.to_markdown(report), report_mod.to_terminal_summary(report))
    return 0


def cmd_diff(args) -> int:
    output_dir = Path(args.output).resolve()
    baseline_dir = Path(args.baseline).resolve() if args.baseline else None
    store = Store.load(output_dir)
    baseline = diff_mod.load_baseline_report(baseline_dir) if baseline_dir else None
    if baseline_dir and baseline is None:
        print(f"[NO_BASELINE] 基线目录未找到 report.json: {baseline_dir}", file=sys.stderr)
        return 2
    result = diff_mod.diff(store, baseline)
    print(diff_mod.render_diff(result, baseline_dir))
    return 1 if result.verdict == "anomaly" else 0


def cmd_init_sample(args) -> int:
    output_dir = Path(args.output).resolve()
    root = sample_mod.write_sample(output_dir)
    print(f"已生成示例材料: {root}")
    print("下一步: prompt-impact run --input " + str(root) + " --output " + str(output_dir / "out"))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="prompt-impact",
        description="Prompt 改动影响报告 CLI: 幂等、可追溯、去重的变更影响分析",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_run = sub.add_parser("run", help="汇总材料并生成影响报告（安全拦截日常入口）")
    p_run.add_argument("--input", required=True, help="材料目录(含 prompts/ model_logs/ annotations/ runs/)")
    p_run.add_argument("--output", required=True, help="报告输出目录")
    p_run.set_defaults(func=cmd_run)

    p_replay = sub.add_parser("replay", help="评测回放：检查某次评测能否解释清楚")
    p_replay.add_argument("--input", required=True, help="材料目录")
    p_replay.add_argument("--output", required=True, help="报告输出目录(需已 run)")
    p_replay.add_argument("--eval-run", required=True, help="评测运行 ID")
    p_replay.set_defaults(func=cmd_replay)

    p_trace = sub.add_parser("trace", help="从结论倒查到来源与处理记录")
    p_trace.add_argument("--output", required=True, help="报告输出目录")
    p_trace.add_argument("--result-id", help="结论 ID(等同 --finding-id)")
    p_trace.add_argument("--finding-id", help="结论 ID")
    p_trace.set_defaults(func=cmd_trace)

    p_export = sub.add_parser("export", help="导出报告(md/json/summary)，与摘要保持一致")
    p_export.add_argument("--output", required=True, help="报告输出目录")
    p_export.add_argument("--format", choices=["md", "json", "summary"], default="md")
    p_export.add_argument("--out", help="写入文件路径(默认打印到标准输出)")
    p_export.set_defaults(func=cmd_export)

    p_diff = sub.add_parser("diff", help="对比基线，复核重复导入/补录后是否出现两份结论")
    p_diff.add_argument("--output", required=True, help="当前报告输出目录")
    p_diff.add_argument("--baseline", help="基线输出目录(含 report.json)")
    p_diff.set_defaults(func=cmd_diff)

    p_init = sub.add_parser("init-sample", help="生成示例材料以便上手")
    p_init.add_argument("--output", required=True, help="写入目录")
    p_init.set_defaults(func=cmd_init_sample)

    return parser


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
