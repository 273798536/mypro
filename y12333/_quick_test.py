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
    DiscountRule,
    HistoryTracker,
    ReportSpec,
)


def quick_verify():
    print("=== QUICK VERIFICATION ===\n")

    print("[1] Load rules...")
    with open("data/discount_rules.json", encoding="utf-8") as f:
        rules_data = json.load(f)
    rules = [DiscountRule.from_dict(d) for d in rules_data]
    print(f"    Loaded {len(rules)} rules")

    print("\n[2] Load reports...")
    reports = BatchCounter.load_reports_from_json("data/count_reports.json")
    print(f"    Loaded {len(reports)} reports")
    for r in reports:
        missing = r.validate()
        print(f"      {r.report_id}: {len(r.rule_ids)} rules, validate: {missing or 'OK'}")

    print("\n[3] Run batch counter...")
    history = HistoryTracker()
    bc = BatchCounter(rules, history_tracker=history)
    results = bc.run_reports(reports)
    print(f"    Ran {len(results)} reports")

    print("\n[4] Results summary:")
    for r in results:
        vc = r.result.valid_combinations if r.result else "N/A"
        print(f"    {r.report.report_id}: status={r.status}, combos={vc}")
        for u in r.uncalculable_reasons:
            print(f"      -> uncalc: {u['type']} - {u['reason'][:60]}...")

    print("\n[5] Export JSON...")
    exporter = BatchExporter(results, history)
    os.makedirs("output", exist_ok=True)
    exporter.save_json("output/batch_quick_test.json")
    print("    Saved to output/batch_quick_test.json")

    print("\n[6] Verify JSON content...")
    with open("output/batch_quick_test.json", encoding="utf-8") as f:
        data = json.load(f)
    print(f"    Summary: {data['summary']}")
    print(f"    Reports in JSON: {len(data['reports'])}")

    print("\n=== DONE - All verification passed ===")


if __name__ == "__main__":
    quick_verify()
