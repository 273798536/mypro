from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock
from typing import Dict, List, Optional

from .models import Experiment, ExperimentCreate, ExperimentUpdate, RevisionRecord, VariantData


class ExperimentStore:
    def __init__(self) -> None:
        self._experiments: Dict[str, Experiment] = {}
        self._lock = Lock()

    def create(self, data: ExperimentCreate) -> Experiment:
        now = datetime.now(timezone.utc)
        exp = Experiment(
            source=data.source,
            variants=data.variants,
            stop_date=data.stop_date,
            planned_stop_date=data.planned_stop_date,
            notes=data.notes,
            created_at=now,
            updated_at=now,
        )
        with self._lock:
            self._experiments[exp.id] = exp
        return exp

    def get(self, experiment_id: str) -> Optional[Experiment]:
        return self._experiments.get(experiment_id)

    def list_all(self) -> List[Experiment]:
        return list(self._experiments.values())

    def update(self, experiment_id: str, data: ExperimentUpdate) -> Optional[Experiment]:
        with self._lock:
            exp = self._experiments.get(experiment_id)
            if exp is None:
                return None

            snapshot = self._snapshot(exp)
            exp.current_version += 1
            now = datetime.now(timezone.utc)

            if data.variants is not None:
                exp.variants = data.variants
            if data.stop_date is not None:
                exp.stop_date = data.stop_date
            if data.planned_stop_date is not None:
                exp.planned_stop_date = data.planned_stop_date
            if data.notes is not None:
                exp.notes = data.notes
            if data.source is not None:
                exp.source = data.source

            revision = RevisionRecord(
                version=exp.current_version,
                modified_at=now,
                modified_by=data.modified_by,
                change_summary=data.change_summary,
                data_snapshot=snapshot,
            )
            exp.revisions.append(revision)
            exp.updated_at = now
            return exp

    def set_result(self, experiment_id: str, result) -> Optional[Experiment]:
        with self._lock:
            exp = self._experiments.get(experiment_id)
            if exp is None:
                return None
            exp.last_result = result
            exp.updated_at = datetime.now(timezone.utc)
            return exp

    def delete(self, experiment_id: str) -> bool:
        with self._lock:
            return self._experiments.pop(experiment_id, None) is not None

    @staticmethod
    def _snapshot(exp: Experiment) -> dict:
        return {
            "source": {
                "name": exp.source.name,
                "description": exp.source.description,
                "created_by": exp.source.created_by,
            },
            "variants": [
                {
                    "name": v.name,
                    "exposures": v.exposures,
                    "conversions": v.conversions,
                    "prior_alpha": v.prior_alpha,
                    "prior_beta": v.prior_beta,
                }
                for v in exp.variants
            ],
            "stop_date": exp.stop_date.isoformat() if exp.stop_date else None,
            "planned_stop_date": exp.planned_stop_date.isoformat() if exp.planned_stop_date else None,
            "notes": exp.notes,
            "current_version": exp.current_version,
        }


store = ExperimentStore()