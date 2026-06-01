#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from combo_counter import (
    CombinationCounter,
    DiscountRule,
    HistoryTracker,
    MutExDetail,
    ResultExporter,
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
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")


def main() -> None:
    data_dir = os.path.join(BASE_DIR, "data")
    rules_path = os.path.join(data_dir, "discount_rules.json")

    print("Loading discount rules from", rules_path)
    rules = load_rules(rules_path)
    print(f"  Parsed {len(rules)} rules\n")

    for r in rules:
        missing = r.validate()
        status = "OK" if not missing else f"MISSING: {missing}"
        flag = ""
        if r.late_supplement:
            flag += " [LATE-SUPPLEMENT]"
        if r.remark and ("改" in r.remark or "修改" in r.remark):
            flag += " [REMARK-EDITED]"
        if missing:
            flag += " [INCOMPLETE]"
        print(f"  {r.rule_id or '<no-id>':6s} | {r.name or '<no-name>':16s} | {r.rule_type.value:14s} | {r.scope.value:8s} | {status}{flag}")

    history = HistoryTracker()
    counter = CombinationCounter(rules, max_combinations=100_000, history_tracker=history)

    print_separator("STEP 1: Count Combinations")
    result = counter.count()
    print(f"  Total enabled rules: {result.total_rules}")
    print(f"  Valid combinations:  {result.valid_combinations}")
    print(f"  Capped:              {result.capped}")
    if result.capped:
        print(f"  Cap limit:           {result.cap_limit}")

    print_separator("STEP 2: Validation Errors (missing fields / skip reasons)")
    if not result.errors:
        print("  (none)")
    for err in result.errors:
        print(f"  Rule: {err['rule_id']}")
        print(f"    Missing: {err['missing_fields']}")
        print(f"    Message: {err['message']}")
        print(f"    Action:  {err['action']}")

    print_separator("STEP 3: Mutual Exclusion & Pruning Details")
    if not result.pruned_branches:
        print("  (none)")
    for p in result.pruned_branches:
        print(f"  Pair: {p.reason.rule_a} <-> {p.reason.rule_b}")
        print(f"    Reason:     {p.reason.reason.value}")
        print(f"    Description:{p.reason.description}")
        print(f"    Suggestion: {p.reason.suggestion}")
        print(f"    Explanation (original): {p.original_explanation}")
        print(f"    Explanation (current):  {p.current_explanation}")
        print(f"    Manually modified:      {p.manually_modified}")
        print()

    print_separator("STEP 4: Simulate Manual Override of Pruning Explanation")
    override_result = counter.update_pruning_explanation(
        rule_a="R001",
        rule_b="R002",
        new_explanation="运营确认全场9折和全场8折不可叠加——已线下对齐 2026-06-01",
        operator="lisi",
    )
    if override_result:
        print(f"  Updated: {override_result.reason.rule_a} <-> {override_result.reason.rule_b}")
        print(f"  New explanation: {override_result.current_explanation}")
        print(f"  Manually modified: {override_result.manually_modified}")
    else:
        print("  (no matching pruning entry)")

    override_result2 = counter.update_pruning_explanation(
        rule_a="R009",
        rule_b="R010",
        new_explanation="产品确认新用户礼包与会员免邮不可叠加——二选一",
        operator="zhangsan",
    )
    if override_result2:
        print(f"  Updated: {override_result2.reason.rule_a} <-> {override_result2.reason.rule_b}")
        print(f"  New explanation: {override_result2.current_explanation}")
        print(f"  Manually modified: {override_result2.manually_modified}")

    print_separator("STEP 5: History Comparison (modified pairs)")
    for pair_key in [("R001", "R002"), ("R009", "R010")]:
        comparison = history.compare_history(pair_key[0], pair_key[1])
        print(f"\n  History for {pair_key[0]} <-> {pair_key[1]}:")
        if not comparison:
            print("    (no entries)")
        for c in comparison:
            print(f"    Step {c['step']}: [{c['timestamp']}] by '{c['operator']}'")
            print(f"      Field: {c['field']}")
            print(f"      Old:   {c['old_value']}")
            print(f"      New:   {c['new_value']}")
            print(f"      Note:  {c['note']}")
            if c["changed_from_previous"]:
                print(f"      *** Gap detected: previous new_value != current old_value ***")

    print_separator("STEP 6: Conflict Detection in History")
    conflicts = history.detect_conflicts()
    if not conflicts:
        print("  (no conflicts)")
    for c in conflicts:
        print(f"  Pair: {c['pair']} | Field: {c['field']} | Type: {c['conflict_type']}")
        print(f"    Description: {c['description']}")
        print(f"    Impact:      {c['impact']}")
        print()

    print_separator("STEP 7: Export Results")
    exporter = ResultExporter(result, history)
    output_dir = os.path.join(BASE_DIR, "output")
    os.makedirs(output_dir, exist_ok=True)

    json_path = os.path.join(output_dir, "count_result.json")
    exporter.save_json(json_path)
    print(f"  JSON -> {json_path}")

    csv_dir = os.path.join(output_dir, "csv")
    exporter.save_csv_tables(csv_dir)
    print(f"  CSV  -> {csv_dir}/")

    print_separator("STEP 8: Quick Summary of Sample Combinations")
    if not result.combination_samples:
        print("  (no valid combinations)")
    for i, combo in enumerate(result.combination_samples, 1):
        print(f"  #{i:2d}: {combo}")

    print_separator("DONE")
    print(f"\nAll outputs saved to: {output_dir}/")
    print("Run `cat output/count_result.json` to view the full JSON export.")


if __name__ == "__main__":
    main()
