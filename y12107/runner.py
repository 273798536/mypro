from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from advisor import Advice, CorrectionAdvisor
from classifier import ClassifiedBatch, DataClassifier
from engine import ScheduleResult, SchedulingEngine
from history import HistoryManager, ScheduleSnapshot
from models import BuildingMap, Shift, WorkOrder


@dataclass
class ExperimentInput:
    name: str
    orders: list[WorkOrder]
    buildings: list[BuildingMap]
    shifts: list[Shift]
    start_building: Optional[str] = None


@dataclass
class ExperimentResult:
    name: str
    schedule_result: ScheduleResult
    snapshot: ScheduleSnapshot
    classification: dict[str, ClassifiedBatch]
    advices: list[Advice]
    diff_from_previous: Optional[dict[str, Any]] = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "schedule": self.schedule_result.to_dict(),
            "classification_summary": {
                k: v.summary() for k, v in self.classification.items()
            },
            "advices": [
                {
                    "category": a.category,
                    "severity": a.severity,
                    "message": a.message,
                    "action": a.action,
                    "affected_ids": a.affected_ids,
                }
                for a in self.advices
            ],
            "diff_from_previous": self.diff_from_previous,
        }


@dataclass
class BatchReport:
    experiments: list[ExperimentResult]
    total_experiments: int
    normal_only_count: int
    with_boundary_count: int
    with_bad_count: int
    total_advices: int
    critical_advices: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_experiments": self.total_experiments,
            "normal_only_count": self.normal_only_count,
            "with_boundary_count": self.with_boundary_count,
            "with_bad_count": self.with_bad_count,
            "total_advices": self.total_advices,
            "critical_advices": self.critical_advices,
            "experiments": [e.to_dict() for e in self.experiments],
        }


class BatchRunner:
    def __init__(self) -> None:
        self._classifier = DataClassifier()
        self._advisor = CorrectionAdvisor()
        self._history = HistoryManager()

    @property
    def history(self) -> HistoryManager:
        return self._history

    def run_single(self, experiment: ExperimentInput) -> ExperimentResult:
        engine = SchedulingEngine()
        engine.load_buildings(experiment.buildings)
        engine.load_orders(experiment.orders)
        engine.load_shifts(experiment.shifts)

        classification = self._classifier.classify_all(
            experiment.orders, experiment.buildings, experiment.shifts
        )

        result = engine.schedule(experiment.start_building)

        b_dicts = {b.building_id: b.to_dict() for b in experiment.buildings}
        o_dicts = {o.order_id: o.to_dict() for o in experiment.orders}
        s_dicts = {s.shift_id: s.to_dict() for s in experiment.shifts}

        snapshot = self._history.record(
            result=result,
            buildings=b_dicts,
            orders=o_dicts,
            shifts=s_dicts,
            trigger=f"experiment:{experiment.name}",
        )

        advices = self._advisor.advise(
            result,
            {o.order_id: o for o in experiment.orders},
            {b.building_id: b for b in experiment.buildings},
            {s.shift_id: s for s in experiment.shifts},
        )

        diff_from_prev = None
        if self._history.snapshot_count >= 2:
            versions = self._history.list_versions()
            if len(versions) >= 2:
                prev_ver = versions[-2]["version"]
                cur_ver = versions[-1]["version"]
                d = self._history.diff(prev_ver, cur_ver)
                if d:
                    diff_from_prev = d.to_dict()

        return ExperimentResult(
            name=experiment.name,
            schedule_result=result,
            snapshot=snapshot,
            classification=classification,
            advices=advices,
            diff_from_previous=diff_from_prev,
        )

    def run_batch(self, experiments: list[ExperimentInput]) -> BatchReport:
        results: list[ExperimentResult] = []
        for exp in experiments:
            r = self.run_single(exp)
            results.append(r)

        normal_only = 0
        with_boundary = 0
        with_bad = 0
        total_advices = 0
        critical_advices = 0

        for r in results:
            has_boundary = False
            has_bad = False
            for batch in r.classification.values():
                if batch.boundary:
                    has_boundary = True
                if batch.bad:
                    has_bad = True
            if has_bad:
                with_bad += 1
            elif has_boundary:
                with_boundary += 1
            else:
                normal_only += 1
            total_advices += len(r.advices)
            critical_advices += sum(
                1 for a in r.advices if a.severity == "critical"
            )

        return BatchReport(
            experiments=results,
            total_experiments=len(results),
            normal_only_count=normal_only,
            with_boundary_count=with_boundary,
            with_bad_count=with_bad,
            total_advices=total_advices,
            critical_advices=critical_advices,
        )
