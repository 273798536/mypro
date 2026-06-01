from __future__ import annotations

import csv
import io
import json
from typing import Any

from .counter import CountResult
from .history import HistoryTracker


class ResultExporter:
    def __init__(self, result: CountResult, history: HistoryTracker | None = None):
        self.result = result
        self.history = history

    def to_json(self, indent: int = 2) -> str:
        payload: dict[str, Any] = {
            "summary": {
                "total_rules": self.result.total_rules,
                "valid_combinations": self.result.valid_combinations,
                "capped": self.result.capped,
            },
            "pruned_branches": [],
            "uncalculable_reasons": [],
            "validation_errors": self.result.errors,
        }

        for p in self.result.pruned_branches:
            entry = {
                "pruned_rule_ids": p.pruned_rule_ids,
                "mutual_exclusion": {
                    "rule_a": p.reason.rule_a,
                    "rule_b": p.reason.rule_b,
                    "reason_type": p.reason.reason.value,
                    "description": p.reason.description,
                    "suggestion": p.reason.suggestion,
                },
                "explanation": {
                    "original": p.original_explanation,
                    "current": p.current_explanation,
                    "manually_modified": p.manually_modified,
                },
            }
            payload["pruned_branches"].append(entry)

            if p.manually_modified:
                payload["uncalculable_reasons"].append(
                    {
                        "rules": p.pruned_rule_ids,
                        "reason": f"Pruning explanation was manually modified for pair ({p.reason.rule_a}, {p.reason.rule_b})",
                        "original": p.original_explanation,
                        "current": p.current_explanation,
                        "impact": "The displayed reason may not match the actual rule conflict; review history for details.",
                    }
                )

        for err in self.result.errors:
            payload["uncalculable_reasons"].append(
                {
                    "rules": [err.get("rule_id", "unknown")],
                    "reason": err.get("message", "Unknown error"),
                    "action": err.get("action", "unknown"),
                    "impact": f"Rule {err.get('rule_id', '?')} has missing fields {err.get('missing_fields', [])} and was {'skipped' if err.get('action') == 'skip' else 'flagged'}.",
                }
            )

        if self.result.capped:
            payload["uncalculable_reasons"].append(
                {
                    "rules": ["ALL"],
                    "reason": f"Combination count exceeded cap of {self.result.cap_limit}",
                    "impact": "Exact count unavailable; result is capped. Consider adding more exclusion rules or reducing rule set.",
                }
            )

        if self.history is not None:
            conflicts = self.history.detect_conflicts()
            if conflicts:
                payload["history_conflicts"] = conflicts

            history_entries = self.history.to_dict_list()
            if history_entries:
                payload["history_entries"] = history_entries

        payload["combination_samples"] = self.result.combination_samples

        return json.dumps(payload, indent=indent, ensure_ascii=False)

    def to_csv_tables(self) -> dict[str, str]:
        tables: dict[str, str] = {}

        summary_buf = io.StringIO()
        writer = csv.writer(summary_buf)
        writer.writerow(["metric", "value"])
        writer.writerow(["total_rules", self.result.total_rules])
        writer.writerow(["valid_combinations", self.result.valid_combinations])
        writer.writerow(["capped", self.result.capped])
        if self.result.capped:
            writer.writerow(["cap_limit", self.result.cap_limit])
        tables["summary"] = summary_buf.getvalue()

        pruned_buf = io.StringIO()
        writer = csv.writer(pruned_buf)
        writer.writerow([
            "rule_a", "rule_b", "reason_type",
            "description", "suggestion",
            "original_explanation", "current_explanation",
            "manually_modified",
        ])
        for p in self.result.pruned_branches:
            writer.writerow([
                p.reason.rule_a,
                p.reason.rule_b,
                p.reason.reason.value,
                p.reason.description,
                p.reason.suggestion,
                p.original_explanation,
                p.current_explanation,
                p.manually_modified,
            ])
        tables["pruned"] = pruned_buf.getvalue()

        if self.result.errors:
            err_buf = io.StringIO()
            writer = csv.writer(err_buf)
            writer.writerow(["rule_id", "missing_fields", "message", "action"])
            for err in self.result.errors:
                writer.writerow([
                    err.get("rule_id", ""),
                    json.dumps(err.get("missing_fields", []), ensure_ascii=False),
                    err.get("message", ""),
                    err.get("action", ""),
                ])
            tables["errors"] = err_buf.getvalue()

        if self.history is not None:
            conflicts = self.history.detect_conflicts()
            if conflicts:
                cfl_buf = io.StringIO()
                writer = csv.writer(cfl_buf)
                writer.writerow(["pair", "field", "conflict_type", "description", "impact"])
                for c in conflicts:
                    writer.writerow([
                        c.get("pair", ""),
                        c.get("field", ""),
                        c.get("conflict_type", ""),
                        c.get("description", ""),
                        c.get("impact", ""),
                    ])
                tables["conflicts"] = cfl_buf.getvalue()

        return tables

    def save_json(self, path: str, indent: int = 2) -> None:
        with open(path, "w", encoding="utf-8") as f:
            f.write(self.to_json(indent))

    def save_csv_tables(self, directory: str) -> None:
        import os
        os.makedirs(directory, exist_ok=True)
        tables = self.to_csv_tables()
        for name, content in tables.items():
            filepath = os.path.join(directory, f"{name}.csv")
            with open(filepath, "w", encoding="utf-8", newline="") as f:
                f.write(content)
