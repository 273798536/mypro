from __future__ import annotations

import json
import csv
import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

from .models import (
    LogEntry,
    Finding,
    CheckResult,
    DataSource,
    Severity,
    FeedbackStatus,
)
from .desensitization import DesensitizationChecker, get_default_rules


class ComplianceCheckEngine:
    def __init__(self, checker: Optional[DesensitizationChecker] = None):
        if checker is None:
            checker = DesensitizationChecker(get_default_rules())
        self.checker = checker

    def check_file(
        self,
        file_path: str,
        prompt_version: Optional[str] = None,
        sample_batch: Optional[str] = None,
        rollback_from: Optional[str] = None,
        source_note: Optional[str] = None,
        image_name: Optional[str] = None,
        data_source: DataSource = DataSource.PRODUCTION_LOG,
        review_round: Optional[str] = None,
        truncate_long_text: bool = True,
        max_text_length: int = 500,
    ) -> CheckResult:
        findings = self.checker.check_file(
            file_path=file_path,
            source_note=source_note,
            image_name=image_name,
            truncate_long_text=truncate_long_text,
            max_text_length=max_text_length,
        )

        total_lines = self._count_lines(file_path)

        result = CheckResult(
            result_id=str(uuid.uuid4()),
            check_time=datetime.now(),
            prompt_version=prompt_version,
            sample_batch=sample_batch,
            rollback_from=rollback_from,
            total_lines=total_lines,
            total_findings=len(findings),
            findings=findings,
            source_files=[file_path],
            data_source=data_source,
            review_round=review_round,
            summary=self._build_summary(findings, total_lines),
        )
        return result

    def check_files(
        self,
        file_paths: List[str],
        **kwargs,
    ) -> CheckResult:
        all_findings = []
        total_lines = 0

        for fp in file_paths:
            findings = self.checker.check_file(
                file_path=fp,
                source_note=kwargs.get("source_note"),
                image_name=kwargs.get("image_name"),
                truncate_long_text=kwargs.get("truncate_long_text", True),
                max_text_length=kwargs.get("max_text_length", 500),
            )
            all_findings.extend(findings)
            total_lines += self._count_lines(fp)

        result = CheckResult(
            result_id=str(uuid.uuid4()),
            check_time=datetime.now(),
            prompt_version=kwargs.get("prompt_version"),
            sample_batch=kwargs.get("sample_batch"),
            rollback_from=kwargs.get("rollback_from"),
            total_lines=total_lines,
            total_findings=len(all_findings),
            findings=all_findings,
            source_files=file_paths,
            data_source=kwargs.get("data_source", DataSource.PRODUCTION_LOG),
            review_round=kwargs.get("review_round"),
            summary=self._build_summary(all_findings, total_lines),
        )
        return result

    def check_entries(
        self,
        entries: List[LogEntry],
        prompt_version: Optional[str] = None,
        sample_batch: Optional[str] = None,
        rollback_from: Optional[str] = None,
        data_source: DataSource = DataSource.PRODUCTION_LOG,
        review_round: Optional[str] = None,
        truncate_long_text: bool = True,
        max_text_length: int = 500,
    ) -> CheckResult:
        findings = self.checker.check_entries(
            entries,
            truncate_long_text=truncate_long_text,
            max_text_length=max_text_length,
        )
        source_files = list({e.source_file for e in entries})

        result = CheckResult(
            result_id=str(uuid.uuid4()),
            check_time=datetime.now(),
            prompt_version=prompt_version,
            sample_batch=sample_batch,
            rollback_from=rollback_from,
            total_lines=len(entries),
            total_findings=len(findings),
            findings=findings,
            source_files=source_files,
            data_source=data_source,
            review_round=review_round,
            summary=self._build_summary(findings, len(entries)),
        )
        return result

    def _count_lines(self, file_path: str) -> int:
        count = 0
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            for _ in f:
                count += 1
        return count

    def _build_summary(self, findings: List[Finding], total_lines: int) -> Dict[str, Any]:
        by_severity: Dict[Severity, int] = {}
        by_category: Dict[str, int] = {}
        by_status: Dict[FeedbackStatus, int] = {}
        truncated_count = 0
        needs_review_count = 0

        for f in findings:
            by_severity[f.severity] = by_severity.get(f.severity, 0) + 1
            by_category[f.category] = by_category.get(f.category, 0) + 1
            by_status[f.feedback_status] = by_status.get(f.feedback_status, 0) + 1
            if f.truncated:
                truncated_count += 1
            if f.feedback_status == FeedbackStatus.NEEDS_REVIEW:
                needs_review_count += 1

        hit_rate = (len(findings) / total_lines * 100) if total_lines > 0 else 0.0

        return {
            "total_findings": len(findings),
            "total_lines": total_lines,
            "hit_rate": round(hit_rate, 2),
            "by_severity": {k.value: v for k, v in by_severity.items()},
            "by_category": by_category,
            "by_status": {k.value: v for k, v in by_status.items()},
            "truncated_count": truncated_count,
            "needs_review_count": needs_review_count,
        }

    @staticmethod
    def save_result(result: CheckResult, output_path: str, fmt: str = "json") -> None:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        if fmt == "json":
            data = result.model_dump(mode="json")
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        elif fmt == "csv":
            ComplianceCheckEngine.result_to_csv(result, output_path)
        else:
            raise ValueError(f"Unsupported format: {fmt}")

    @staticmethod
    def result_to_csv(result: CheckResult, output_path: str) -> None:
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        fieldnames = [
            "finding_id",
            "rule_id",
            "rule_name",
            "severity",
            "category",
            "matched_text",
            "line_number",
            "source_file",
            "source_note",
            "image_name",
            "truncated",
            "truncation_reason",
            "suggestion",
            "feedback_status",
            "feedback_comment",
            "reviewed_by",
            "reviewed_at",
        ]

        with open(output_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for finding in result.findings:
                row = finding.model_dump(mode="json")
                writer.writerow({k: row.get(k, "") for k in fieldnames})

    @staticmethod
    def load_result(file_path: str) -> CheckResult:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return CheckResult.model_validate(data)

    @staticmethod
    def load_entries_from_csv(file_path: str) -> List[LogEntry]:
        entries = []
        with open(file_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader, 1):
                raw_text = row.get("text") or row.get("content") or row.get("log") or ""
                entry = LogEntry(
                    line_number=int(row.get("line_number", i)),
                    raw_text=raw_text,
                    source_file=row.get("source_file", file_path),
                    source_note=row.get("source_note"),
                    image_name=row.get("image_name"),
                )
                entries.append(entry)
        return entries
