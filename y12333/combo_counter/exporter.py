from __future__ import annotations

import csv
import io
import json
from typing import Any

from .counter import CountResult, BatchReportResult
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


class BatchExporter:
    def __init__(self, batch_results: list[BatchReportResult], history: HistoryTracker | None = None):
        self.batch_results = batch_results
        self.history = history

    def to_json(self, indent: int = 2) -> str:
        reports_data = []
        summary: dict[str, Any] = {
            "total_reports": len(self.batch_results),
            "reports_ok": 0,
            "reports_warn": 0,
            "reports_skip": 0,
        }
        for br in self.batch_results:
            reports_data.append(br.to_dict())
            if br.status == "OK":
                summary["reports_ok"] += 1
            elif br.status == "WARN":
                summary["reports_warn"] += 1
            elif br.status == "SKIP":
                summary["reports_skip"] += 1

        payload: dict[str, Any] = {
            "summary": summary,
            "reports": reports_data,
        }

        if self.history is not None:
            conflicts = self.history.detect_conflicts()
            if conflicts:
                payload["history_conflicts"] = conflicts
            entries = self.history.to_dict_list()
            if entries:
                payload["history_entries"] = entries

        return json.dumps(payload, indent=indent, ensure_ascii=False)

    def to_csv_tables(self) -> dict[str, str]:
        tables: dict[str, str] = {}

        summary_buf = io.StringIO()
        writer = csv.writer(summary_buf)
        writer.writerow([
            "report_id", "scenario", "status", "total_rules",
            "valid_combinations", "capped", "skip_reason", "notes",
        ])
        for br in self.batch_results:
            tr = br.result.total_rules if br.result else 0
            vc = br.result.valid_combinations if br.result else 0
            capped = br.result.capped if br.result else False
            writer.writerow([
                br.report.report_id,
                br.report.scenario,
                br.status,
                tr,
                vc,
                capped,
                br.skip_reason,
                br.report.notes,
            ])
        tables["batch_summary"] = summary_buf.getvalue()

        uncalc_buf = io.StringIO()
        writer = csv.writer(uncalc_buf)
        writer.writerow([
            "report_id", "type", "reason", "impact", "details_json",
        ])
        for br in self.batch_results:
            for u in br.uncalculable_reasons:
                details = {k: v for k, v in u.items() if k not in ("type", "reason", "impact")}
                writer.writerow([
                    br.report.report_id,
                    u.get("type", ""),
                    u.get("reason", ""),
                    u.get("impact", ""),
                    json.dumps(details, ensure_ascii=False),
                ])
        tables["uncalculable_reasons"] = uncalc_buf.getvalue()

        pruned_buf = io.StringIO()
        writer = csv.writer(pruned_buf)
        writer.writerow([
            "report_id", "rule_a", "rule_b", "reason_type",
            "description", "suggestion", "manually_modified",
        ])
        for br in self.batch_results:
            if br.result:
                for p in br.result.pruned_branches:
                    writer.writerow([
                        br.report.report_id,
                        p.reason.rule_a,
                        p.reason.rule_b,
                        p.reason.reason.value,
                        p.reason.description,
                        p.reason.suggestion,
                        p.manually_modified,
                    ])
        tables["pruned_pairs"] = pruned_buf.getvalue()

        errors_buf = io.StringIO()
        writer = csv.writer(errors_buf)
        writer.writerow([
            "report_id", "rule_id", "missing_fields", "message", "action",
        ])
        for br in self.batch_results:
            if br.result:
                for err in br.result.errors:
                    writer.writerow([
                        br.report.report_id,
                        err.get("rule_id", ""),
                        json.dumps(err.get("missing_fields", []), ensure_ascii=False),
                        err.get("message", ""),
                        err.get("action", ""),
                    ])
        tables["validation_errors"] = errors_buf.getvalue()

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
