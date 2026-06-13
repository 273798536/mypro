from __future__ import annotations

from copy import deepcopy
from typing import Any, Optional

from .models import (
    BASE_UNIT,
    Anomaly,
    ExperimentalRecord,
    FilterCriteria,
    JudgmentAction,
    JudgmentEntry,
    RecalcImpact,
    ReportBundle,
    ReportConfig,
    StatisticResult,
)
from .anomaly import run_all_anomaly_checks
from .audit import AuditTrail
from .engine import apply_filter, build_detail_table, compute_statistics
from .parser import parse_records_from_list
from .recalc import recalc_with_parameter_change
from .report import classify_actionable_items, generate_report


class MotorTorqueReportExporter:
    def __init__(
        self,
        operator: str = "",
        output_unit: str = BASE_UNIT,
        boundary_sigma: float = 1.5,
        torque_positive_means_cw: bool = True,
    ) -> None:
        self.operator = operator
        self.output_unit = output_unit
        self.boundary_sigma = boundary_sigma
        self.torque_positive_means_cw = torque_positive_means_cw
        self._records: list[ExperimentalRecord] = []
        self._anomalies: list[Anomaly] = []
        self._audit = AuditTrail()
        self._recalc_impacts: list[RecalcImpact] = []
        self._recalc_judgments: list[JudgmentEntry] = []

    def load_records(self, records: list[dict[str, Any]]) -> "MotorTorqueReportExporter":
        self._records = parse_records_from_list(records)
        return self

    def set_records(self, records: list[ExperimentalRecord]) -> "MotorTorqueReportExporter":
        self._records = deepcopy(records)
        return self

    def check_anomalies(self) -> list[Anomaly]:
        self._anomalies = run_all_anomaly_checks(
            self._records,
            torque_positive_means_cw=self.torque_positive_means_cw,
        )
        return self._anomalies

    def confirm_anomaly(self, record_id: str, resolution: str) -> "MotorTorqueReportExporter":
        for a in self._anomalies:
            if a.record_id == record_id:
                a.confirmed = True
                a.resolution = resolution
                self._audit.record_override(
                    operator=self.operator,
                    target_record_id=record_id,
                    anomaly_type=a.anomaly_type,
                    action=JudgmentAction.CONFIRM_ANOMALY,
                    reason=resolution,
                )
                break
        return self

    def fix_direction(self, record_id: str, reason: str = "") -> "MotorTorqueReportExporter":
        from .models import JudgmentAction

        for r in self._records:
            if r.record_id == record_id:
                old_dir = r.direction.value
                r.direction = r.direction.opposite()
                self._audit.record_direction_fix(
                    operator=self.operator,
                    record_id=record_id,
                    old_direction=old_dir,
                    new_direction=r.direction.value,
                    reason=reason or f"方向修正: {old_dir} → {r.direction.value}",
                )
                break
        return self

    def release_record(self, record_id: str, reason: str) -> "MotorTorqueReportExporter":
        self._audit.record_release(
            operator=self.operator,
            record_id=record_id,
            reason=reason,
        )
        return self

    def request_supplement(self, record_id: str, reason: str) -> "MotorTorqueReportExporter":
        self._audit.record_supplement_request(
            operator=self.operator,
            record_id=record_id,
            reason=reason,
        )
        return self

    def recalculate(
        self,
        parameter_name: str,
        old_value: Any,
        new_value: Any,
    ) -> "MotorTorqueReportExporter":
        modified, impacts, _, _, judgment = recalc_with_parameter_change(
            records=self._records,
            parameter_name=parameter_name,
            old_value=old_value,
            new_value=new_value,
            operator=self.operator,
            output_unit=self.output_unit,
            boundary_sigma=self.boundary_sigma,
        )
        self._records = modified
        self._recalc_impacts.extend(impacts)
        self._recalc_judgments.append(judgment)
        self._audit.add(judgment)
        return self

    def export(
        self,
        filter_criteria: Optional[FilterCriteria] = None,
        config: Optional[ReportConfig] = None,
    ) -> ReportBundle:
        criteria = filter_criteria or FilterCriteria()
        cfg = config or ReportConfig(operator=self.operator, output_unit=self.output_unit)

        if not self._anomalies:
            self.check_anomalies()

        filtered = apply_filter(self._records, criteria)

        if criteria.exclude_anomalies:
            anomaly_ids = {a.record_id for a in self._anomalies if not a.confirmed}
            filtered = [r for r in filtered if r.record_id not in anomaly_ids]

        stats = compute_statistics(filtered, output_unit=self.output_unit, boundary_sigma=self.boundary_sigma)
        detail = build_detail_table(filtered, output_unit=self.output_unit)

        all_audit = self._audit.entries

        supplement, release = classify_actionable_items(self._anomalies, len(filtered))

        bundle = ReportBundle(
            config=cfg,
            filter_criteria=criteria,
            statistics=stats,
            detail_rows=detail,
            anomalies=self._anomalies,
            recalc_impacts=self._recalc_impacts,
            audit_trail=all_audit,
            supplement_needed=supplement,
            release_allowed=release,
        )
        return bundle

    def export_markdown(
        self,
        filter_criteria: Optional[FilterCriteria] = None,
        config: Optional[ReportConfig] = None,
    ) -> str:
        bundle = self.export(filter_criteria, config)
        return generate_report(bundle)
