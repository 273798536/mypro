#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from combo_counter import (
    BatchCounter,
    BatchExporter,
    BatchReportResult,
    DiscountRule,
    HistoryTracker,
    ReportSpec,
)


def load_rules(path: str) -> list[DiscountRule]:
    with open(path, encoding="utf-8") as f:
        raw = json.load(f)
    rules = []
    for item in raw:
        try:
            rules.append(DiscountRule.from_dict(item))
        except Exception as e:
            print(f"  [WARN] Cannot parse rule {item.get('rule_id', '<unknown>')}: {e}")
    return rules


def print_separator(title: str) -> None:
    print(f"\n{'=' * 70}")
    print(f"  {title}")
    print(f"{'=' * 70}")


def main() -> None:
    data_dir = os.path.join(BASE_DIR, "data")
    rules_path = os.path.join(data_dir, "discount_rules.json")
    reports_path = os.path.join(data_dir, "count_reports.json")

    print("=== LOADING INPUTS ===\n")

    print("1. Loading discount rules from", rules_path)
    rules = load_rules(rules_path)
    print(f"   Parsed {len(rules)} rules\n")

    print("2. Loading reports from", reports_path)
    reports = BatchCounter.load_reports_from_json(reports_path)
    print(f"   Loaded {len(reports)} reports:")
    for r in reports:
        missing = r.validate()
        status = "OK" if not missing else f"MISSING: {missing}"
        print(f"     {r.report_id or '<no-id>':12s} | {r.scenario or '<no-scenario>':24s} | {len(r.rule_ids)} rules | {status}")
    print()

    history = HistoryTracker()
    batch_counter = BatchCounter(rules, history_tracker=history)

    print_separator("STEP 1: RUN BATCH COUNT FOR ALL REPORTS")
    results = batch_counter.run_reports(reports)

    print(f"  Total reports: {len(results)}")
    for r in results:
        total_rules = r.result.total_rules if r.result else 0
        valid = r.result.valid_combinations if r.result else 0
        missing = r.missing_rules if r.missing_rules else "-"
        print(f"    {r.report.report_id} | status={r.status:4s} | rules={total_rules:2d} | combinations={valid:2d} | missing={missing}")

    print_separator("STEP 2: PER-REPORT DETAILS")
    for i, br in enumerate(results, 1):
        print(f"\n  [{i}] {br.report.report_id}  -  {br.report.scenario or '(no scenario)'}")
        print(f"      Status:        {br.status}")
        if br.skip_reason:
            print(f"      Skip reason:   {br.skip_reason}")
        if br.missing_rules:
            print(f"      Missing rules: {br.missing_rules}")

        if br.result and br.result.total_rules > 0:
            print(f"      Valid rules:   {br.result.total_rules}")
            print(f"      Valid combos:  {br.result.valid_combinations}")
            print(f"      Capped:        {br.result.capped}")

        if br.uncalculable_reasons:
            print(f"      Uncalculable reasons ({len(br.uncalculable_reasons)}):")
            for j, u in enumerate(br.uncalculable_reasons, 1):
                print(f"        [{j}] type={u['type']}")
                print(f"            reason: {u['reason']}")
                print(f"            impact: {u['impact']}")

        if br.result and br.result.pruned_branches:
            print(f"      Pruned pairs ({len(br.result.pruned_branches)}):")
            for p in br.result.pruned_branches:
                mod_tag = " [MANUAL-MODIFIED]" if p.manually_modified else ""
                print(f"        {p.reason.rule_a} <-> {p.reason.rule_b}  |  {p.reason.reason.value}{mod_tag}")
                print(f"          suggestion: {p.reason.suggestion}")

        if br.result and br.result.combination_samples:
            print(f"      Sample combinations:")
            for k, c in enumerate(br.result.combination_samples[:5], 1):
                print(f"        #{k}: {c}")

    print_separator("STEP 3: SIMULATE MANUAL PRUNING OVERRIDE (per report context)")
    target_report = results[0]
    if target_report.counter:
        override = target_report.counter.update_pruning_explanation(
            rule_a="R001",
            rule_b="R002",
            new_explanation="运营在 RP-2026-001 报告中确认全场9折和全场8折不可叠加——线下对齐 2026-06-03",
            operator="lisi",
        )
        if override:
            print(f"  Modified prune explanation for ({override.reason.rule_a}, {override.reason.rule_b})")
            print(f"  Old: {override.original_explanation}")
            print(f"  New: {override.current_explanation}")

    print_separator("STEP 4: BATCH HISTORY & CONFLICTS")
    entries = history.all_entries()
    if not entries:
        print("  (no history entries)")
    else:
        print(f"  History entries ({len(entries)}):")
        for e in entries:
            print(f"    [{e.timestamp[:19]}] {e.operator} | {e.rule_a}<->{e.rule_b} | {e.field_name} changed")

    conflicts = history.detect_conflicts()
    if not conflicts:
        print("\n  (no conflicts detected)")
    else:
        print(f"\n  Conflicts ({len(conflicts)}):")
        for c in conflicts:
            print(f"    {c['pair']} | {c['conflict_type']}")
            print(f"      impact: {c['impact']}")

    print_separator("STEP 5: EXPORT BATCH RESULTS")
    output_dir = os.path.join(BASE_DIR, "output")
    os.makedirs(output_dir, exist_ok=True)

    batch_exporter = BatchExporter(results, history)

    batch_json_path = os.path.join(output_dir, "batch_count_result.json")
    batch_exporter.save_json(batch_json_path)
    print(f"  Batch JSON -> {batch_json_path}")

    batch_csv_dir = os.path.join(output_dir, "batch_csv")
    batch_exporter.save_csv_tables(batch_csv_dir)
    print(f"  Batch CSV  -> {batch_csv_dir}/")

    print_separator("STEP 6: CHECK KEY EXPORTED TABLES")
    print("\n  batch_summary.csv head:")
    with open(os.path.join(batch_csv_dir, "batch_summary.csv"), encoding="utf-8") as f:
        for _ in range(5):
            line = f.readline()
            if line:
                print(f"    {line.rstrip()}")

    print("\n  uncalculable_reasons.csv head:")
    with open(os.path.join(batch_csv_dir, "uncalculable_reasons.csv"), encoding="utf-8") as f:
        for _ in range(10):
            line = f.readline()
            if line:
                print(f"    {line.rstrip()}")

    print_separator("BATCH RUN COMPLETED")
    print(f"\nAll batch outputs saved to: {output_dir}/")
    print("\nKey outputs:")
    print(f"  1. {batch_json_path} — Full batch JSON with per-report results & uncalculable reasons")
    print(f"  2. {batch_csv_dir}/batch_summary.csv — Overview of all reports (status, counts)")
    print(f"  3. {batch_csv_dir}/uncalculable_reasons.csv — Why each report wasn't fully calculable")
    print(f"  4. {batch_csv_dir}/pruned_pairs.csv — All mutually exclusive rule pairs across reports")
    print(f"  5. {batch_csv_dir}/validation_errors.csv — Rule-level validation errors across reports")


if __name__ == "__main__":
    main()
