from __future__ import annotations

import argparse
import json
import sys
from typing import List, Optional

from .gatekeeper import NegSamplingGatekeeper
from .models import GateStatus
from .normalizer import FieldNormalizer
from .report import GateReportGenerator
from .timeline import TimelineManager


def _build_gatekeeper(args: argparse.Namespace) -> NegSamplingGatekeeper:
    timeline = TimelineManager()
    normalizer = FieldNormalizer()
    return NegSamplingGatekeeper(
        timeline_manager=timeline,
        normalizer=normalizer,
        grayscale_min=args.grayscale_min,
        grayscale_max=args.grayscale_max,
        require_grayscale_ratio=not args.no_grayscale_required,
    )


def cmd_ingest(args: argparse.Namespace) -> None:
    gatekeeper = _build_gatekeeper(args)
    with open(args.input, "r", encoding="utf-8") as f:
        rows = json.load(f)
    if not isinstance(rows, list):
        print("Error: input JSON must be an array of objects", file=sys.stderr)
        sys.exit(1)
    records = gatekeeper.ingest_logs(rows, source_file=args.input)
    for rec in records:
        status_marker = {
            GateStatus.APPROVED: "✓",
            GateStatus.SUSPENDED: "⚠",
            GateStatus.REJECTED: "✗",
            GateStatus.PENDING: "?",
        }.get(rec.status, "?")
        line = f"  {status_marker} {rec.record_id} | entry={rec.log_entry.entry_id} | status={rec.status.value}"
        if rec.suspended_reason:
            line += f" | reason={rec.suspended_reason}"
        if rec.bad_data_refs:
            line += f" | bad_data={len(rec.bad_data_refs)}"
        print(line)
    suspended = [r for r in records if r.status == GateStatus.SUSPENDED]
    if suspended:
        print(f"\n{suspended.__len__()} record(s) SUSPENDED — need person-in-charge confirmation")
        print("Use 'confirm' command to approve or reject.")


def cmd_confirm(args: argparse.Namespace) -> None:
    gatekeeper = _build_gatekeeper(args)
    _load_state(gatekeeper, args.state)
    try:
        rec = gatekeeper.confirm_suspended(
            args.record_id, args.confirmed_by, action=args.action
        )
        print(f"Record {args.record_id} -> {rec.status.value} (by {args.confirmed_by})")
    except (KeyError, ValueError) as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    _save_state(gatekeeper, args.state)


def cmd_report(args: argparse.Namespace) -> None:
    gatekeeper = _build_gatekeeper(args)
    _load_state(gatekeeper, args.state)
    gen = GateReportGenerator(gatekeeper)
    if args.format == "text":
        text = gen.generate_text_report(include_timeline=not args.no_timeline)
        print(text)
    else:
        report = gen.generate_report(include_timeline=not args.no_timeline)
        print(json.dumps(report, ensure_ascii=False, indent=2))


def cmd_explain(args: argparse.Namespace) -> None:
    gatekeeper = _build_gatekeeper(args)
    _load_state(gatekeeper, args.state)
    explanation = gatekeeper.explain_processing(args.record_id)
    if "error" in explanation:
        print(f"Error: {explanation['error']}", file=sys.stderr)
        sys.exit(1)
    print(json.dumps(explanation, ensure_ascii=False, indent=2, default=str))


def cmd_find(args: argparse.Namespace) -> None:
    gatekeeper = _build_gatekeeper(args)
    _load_state(gatekeeper, args.state)
    entry = gatekeeper.find_original_log(args.entry_id)
    if entry is None:
        print(f"No entry found for: {args.entry_id}", file=sys.stderr)
        sys.exit(1)
    print(f"Entry ID: {entry.entry_id}")
    print(f"Timestamp: {entry.timestamp.isoformat()}")
    print(f"Sample ID: {entry.sample_id}")
    print(f"Version: {entry.version}")
    print(f"Neg Sample Ratio: {entry.neg_sample_ratio}")
    print(f"Threshold: {entry.threshold}")
    print(f"Grayscale Ratio: {entry.grayscale_ratio}")
    print(f"Original Reference: {entry.get_original_reference()}")
    print(f"Processing Status: {entry.processing_status}")
    print(f"Quality Flag: {entry.quality_flag}")
    print("\nRaw fields:")
    for k, v in entry.raw_fields.items():
        print(f"  {k}: {v}")
    print("\nSource info (field normalization):")
    for canonical, si in entry.source_info.items():
        print(f"  {canonical}: original='{si.original_field_name}' -> normalized='{si.normalized_field_name}', raw_value={si.raw_value}")
        if si.source_file:
            print(f"    source: {si.source_file}:{si.source_line}")


def cmd_timeline(args: argparse.Namespace) -> None:
    gatekeeper = _build_gatekeeper(args)
    _load_state(gatekeeper, args.state)
    if args.record_id:
        events = gatekeeper.timeline.get_events_for_record(args.record_id)
    elif args.sample_id:
        events = gatekeeper.timeline.get_sample_history(args.sample_id)
    elif args.version:
        events = gatekeeper.timeline.get_version_history(args.version)
    elif args.event_type:
        from .models import TimelineEventType
        try:
            et = TimelineEventType(args.event_type)
            events = gatekeeper.timeline.get_events_by_type(et)
        except ValueError:
            print(f"Unknown event type: {args.event_type}", file=sys.stderr)
            print(f"Valid types: {[e.value for e in TimelineEventType]}", file=sys.stderr)
            sys.exit(1)
    else:
        events = gatekeeper.timeline.get_all_events()
    for evt in events:
        print(f"[{evt.timestamp.isoformat()}] {evt.event_type.value}: {evt.description}")
        if evt.raw_log_ref:
            print(f"  原始参考: {evt.raw_log_ref}")
        if evt.details:
            for dk, dv in evt.details.items():
                print(f"  {dk}: {dv}")
        print()


def _load_state(gatekeeper: NegSamplingGatekeeper, state_file: Optional[str]) -> None:
    if not state_file:
        return
    try:
        with open(state_file, "r", encoding="utf-8") as f:
            print("Note: state file loading is a placeholder for persistence.", file=sys.stderr)
    except FileNotFoundError:
        pass


def _save_state(gatekeeper: NegSamplingGatekeeper, state_file: Optional[str]) -> None:
    if not state_file:
        return
    try:
        with open(state_file, "w", encoding="utf-8") as f:
            print("Note: state file saving is a placeholder for persistence.", file=sys.stderr)
    except OSError as e:
        print(f"Warning: could not save state: {e}", file=sys.stderr)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="neg-gate",
        description="负采样上线守门 — Negative Sampling Online Gatekeeper",
    )
    parser.add_argument("--grayscale-min", type=float, default=0.01)
    parser.add_argument("--grayscale-max", type=float, default=1.0)
    parser.add_argument("--no-grayscale-required", action="store_true")
    parser.add_argument("--state", type=str, default=None)

    sub = parser.add_subparsers(dest="command")

    p_ingest = sub.add_parser("ingest", help="Ingest training log entries")
    p_ingest.add_argument("input", help="Path to JSON file with log entries")

    p_confirm = sub.add_parser("confirm", help="Confirm or reject a suspended record")
    p_confirm.add_argument("record_id")
    p_confirm.add_argument("--confirmed-by", required=True)
    p_confirm.add_argument("--action", choices=["approve", "reject"], default="approve")

    p_report = sub.add_parser("report", help="Generate gate report")
    p_report.add_argument("--format", choices=["text", "json"], default="text")
    p_report.add_argument("--no-timeline", action="store_true")

    p_explain = sub.add_parser("explain", help="Explain processing for a record")
    p_explain.add_argument("record_id")

    p_find = sub.add_parser("find", help="Find original log entry by entry_id")
    p_find.add_argument("entry_id")

    p_timeline = sub.add_parser("timeline", help="View historical timeline")
    p_timeline.add_argument("--record-id", type=str, default=None)
    p_timeline.add_argument("--sample-id", type=str, default=None)
    p_timeline.add_argument("--version", type=str, default=None)
    p_timeline.add_argument("--event-type", type=str, default=None)

    return parser


def main(argv: Optional[List[str]] = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command is None:
        parser.print_help()
        sys.exit(0)
    cmd_map = {
        "ingest": cmd_ingest,
        "confirm": cmd_confirm,
        "report": cmd_report,
        "explain": cmd_explain,
        "find": cmd_find,
        "timeline": cmd_timeline,
    }
    handler = cmd_map.get(args.command)
    if handler:
        handler(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
