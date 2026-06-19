from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from .models import (
    Evaluation,
    EvaluationResult,
    GrayResult,
    MisjudgmentRecord,
    RecordStatus,
    VersionEntry,
)
from .store import Store


class ReplayEngine:
    def __init__(self, store: Store):
        self.store = store

    def import_materials(self, file_path: str | Path) -> list[MisjudgmentRecord]:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Material file not found: {path}")

        raw = json.loads(path.read_text(encoding="utf-8"))
        items = raw if isinstance(raw, list) else raw.get("records", raw.get("materials", []))

        imported = []
        for item in items:
            name = item.get("name", "")
            evidence_path = item.get("evidence_path", "")
            aliases = item.get("aliases", [])
            notes = item.get("notes", "")
            screenshots = item.get("screenshots", [])
            values = item.get("values", {})

            existing = self.store.find_by_name(name)
            if existing:
                self._append_version(existing, notes, screenshots, values)
                imported.append(existing)
            else:
                fuzzy_matches = self.store.find_fuzzy(name)
                if fuzzy_matches:
                    for match in fuzzy_matches:
                        if name not in match.aliases:
                            match.aliases.append(name)
                        self._append_version(match, notes, screenshots, values)
                        imported.append(match)
                else:
                    rec = MisjudgmentRecord.create(
                        name=name,
                        evidence_path=evidence_path,
                        aliases=aliases,
                    )
                    now = datetime.now().isoformat()
                    rec.versions.append(
                        VersionEntry(
                            timestamp=now,
                            notes=notes,
                            screenshots=screenshots,
                            values=values,
                        )
                    )
                    self.store.add(rec)
                    imported.append(rec)

        return imported

    def _append_version(
        self,
        record: MisjudgmentRecord,
        notes: str = "",
        screenshots: list[str] | None = None,
        values: dict[str, Any] | None = None,
    ) -> None:
        now = datetime.now().isoformat()
        record.versions.append(
            VersionEntry(
                timestamp=now,
                notes=notes,
                screenshots=screenshots or [],
                values=values or {},
            )
        )
        self.store.update(record)

    def add_record(
        self,
        name: str,
        evidence_path: str = "",
        aliases: list[str] | None = None,
        notes: str = "",
        screenshots: list[str] | None = None,
        values: dict[str, Any] | None = None,
    ) -> tuple[MisjudgmentRecord, bool]:
        existing = self.store.find_by_name(name)
        if existing:
            self._append_version(existing, notes, screenshots, values)
            return existing, True

        fuzzy_matches = self.store.find_fuzzy(name)
        if fuzzy_matches:
            match = fuzzy_matches[0]
            if name not in match.aliases:
                match.aliases.append(name)
            self._append_version(match, notes, screenshots, values)
            return match, True

        rec = MisjudgmentRecord.create(
            name=name,
            evidence_path=evidence_path,
            aliases=aliases,
        )
        now = datetime.now().isoformat()
        rec.versions.append(
            VersionEntry(
                timestamp=now,
                notes=notes,
                screenshots=screenshots or [],
                values=values or {},
            )
        )
        self.store.add(rec)
        return rec, False

    def evaluate(
        self,
        record_id: str,
        evaluator: str,
        result: EvaluationResult,
        score: float | None = None,
        impact_scope: str = "",
        source_line: str = "",
        evidence_ref: str = "",
    ) -> Evaluation:
        record = self.store.get(record_id)
        if not record:
            raise ValueError(f"Record not found: {record_id}")

        is_duplicate = False
        duplicate_of = None
        for existing_eval in record.evaluations:
            if existing_eval.result == result and existing_eval.evaluator == evaluator:
                is_duplicate = True
                duplicate_of = existing_eval.id
                break

        now = datetime.now().isoformat()
        evaluation = Evaluation(
            id=f"eval-{len(record.evaluations) + 1:03d}",
            evaluator=evaluator,
            timestamp=now,
            result=result,
            is_duplicate=is_duplicate,
            duplicate_of=duplicate_of,
            impact_scope=impact_scope,
            source_line=source_line,
            score=score,
            evidence_ref=evidence_ref,
        )

        record.evaluations.append(evaluation)
        if result == EvaluationResult.CONFIRMED:
            record.status = RecordStatus.PROCESSED
        elif result in (EvaluationResult.FALSE_POSITIVE, EvaluationResult.FALSE_NEGATIVE):
            record.status = RecordStatus.NEEDS_EVIDENCE

        self.store.update(record)
        return evaluation

    def add_gray_result(
        self,
        record_id: str,
        sample_changes: list[dict[str, Any]] | None = None,
        threshold_changes: list[dict[str, Any]] | None = None,
        human_corrections: list[dict[str, Any]] | None = None,
    ) -> GrayResult:
        record = self.store.get(record_id)
        if not record:
            raise ValueError(f"Record not found: {record_id}")

        now = datetime.now().isoformat()
        gray = GrayResult(
            timestamp=now,
            sample_changes=sample_changes or [],
            threshold_changes=threshold_changes or [],
            human_corrections=human_corrections or [],
        )
        record.gray_results.append(gray)
        self.store.update(record)
        return gray

    def update_status(self, record_id: str, status: RecordStatus) -> MisjudgmentRecord:
        record = self.store.get(record_id)
        if not record:
            raise ValueError(f"Record not found: {record_id}")
        record.status = status
        self.store.update(record)
        return record

    def get_evidence_chain(self, record_id: str) -> list[dict[str, Any]]:
        record = self.store.get(record_id)
        if not record:
            raise ValueError(f"Record not found: {record_id}")

        chain = []
        for v in record.versions:
            chain.append({
                "type": "version",
                "timestamp": v.timestamp,
                "notes": v.notes,
                "screenshots": v.screenshots,
                "values": v.values,
            })
        for e in record.evaluations:
            chain.append({
                "type": "evaluation",
                "timestamp": e.timestamp,
                "evaluator": e.evaluator,
                "result": e.result.value,
                "score": e.score,
                "evidence_ref": e.evidence_ref,
                "is_duplicate": e.is_duplicate,
                "duplicate_of": e.duplicate_of,
                "impact_scope": e.impact_scope,
                "source_line": e.source_line,
            })
        for g in record.gray_results:
            chain.append({
                "type": "gray_result",
                "timestamp": g.timestamp,
                "sample_changes": g.sample_changes,
                "threshold_changes": g.threshold_changes,
                "human_corrections": g.human_corrections,
            })

        chain.sort(key=lambda x: x["timestamp"])
        return chain
