from __future__ import annotations

from datetime import datetime
from typing import Optional

from dateutil.relativedelta import relativedelta

from .models import (
    ExclusionTrace,
    MaintenanceRecord,
    MeterReading,
    ProjectContract,
    SavingsDetail,
    SharingResult,
    SourceRef,
)
from .storage import DataStore


def months_between(start: str, end: str) -> list[str]:
    result = []
    current = datetime.strptime(start, "%Y-%m")
    end_dt = datetime.strptime(end, "%Y-%m")
    while current <= end_dt:
        result.append(current.strftime("%Y-%m"))
        current += relativedelta(months=1)
    return result


def maintenance_for_month(record: MaintenanceRecord, month: str) -> Optional[float]:
    month_start = datetime.strptime(month, "%Y-%m").date()
    month_end = (month_start + relativedelta(months=1)) - relativedelta(days=1)

    overlap_start = max(record.start_date, month_start)
    overlap_end = min(record.end_date, month_end)

    if overlap_start > overlap_end:
        return None

    days_total = (month_end - month_start).days + 1
    days_overlap = (overlap_end - overlap_start).days + 1

    return days_overlap / days_total


class SavingsCalculator:
    def __init__(self, store: DataStore):
        self.store = store

    def calculate(
        self,
        project_id: str,
        period_start: str,
        period_end: str,
        trigger_reason: str = "",
        operator: str = "",
    ) -> SharingResult:
        project = self.store.load_project(project_id)
        if project is None:
            raise ValueError(f"Project {project_id} not found")

        readings = self.store.load_readings(project_id)
        maintenance = self.store.load_maintenance(project_id)

        readings_by_month: dict[str, list[MeterReading]] = {}
        for r in readings:
            readings_by_month.setdefault(r.month, []).append(r)

        baseline_adjustments = {a.month: a for a in project.baseline_adjustments}

        if not project.sharing_ratios:
            raise ValueError(f"Project {project_id} has no sharing ratios defined")

        active_ratio = max(project.sharing_ratios, key=lambda r: r.version)

        savings_details = []
        exclusions = []

        for month in months_between(period_start, period_end):
            month_readings = readings_by_month.get(month, [])

            baseline_adj = baseline_adjustments.get(month)
            baseline_kwh = project.baseline_kwh
            baseline_adj_kwh = 0.0
            baseline_adj_ref = None

            if baseline_adj:
                baseline_kwh = baseline_adj.adjusted_kwh
                baseline_adj_kwh = baseline_adj.adjusted_kwh - baseline_adj.original_kwh
                baseline_adj_ref = SourceRef(
                    entity_type="BaselineAdjustment",
                    entity_id=baseline_adj.adjustment_id,
                    field="adjusted_kwh",
                    description=f"基准调整: {baseline_adj.reason}",
                )

            maintenance_exclusion = 0.0
            maintenance_refs = []

            for m in maintenance:
                overlap_ratio = maintenance_for_month(m, month)
                if overlap_ratio:
                    excluded = m.excluded_kwh * overlap_ratio
                    maintenance_exclusion += excluded
                    maintenance_refs.append(
                        SourceRef(
                            entity_type="MaintenanceRecord",
                            entity_id=m.record_id,
                            field="excluded_kwh",
                            description=f"检修剔除: {m.description}",
                        )
                    )

            if maintenance_exclusion > 0:
                exclusions.append(
                    ExclusionTrace(
                        month=month,
                        reason="设备检修",
                        source_refs=maintenance_refs,
                        excluded_kwh=maintenance_exclusion,
                    )
                )

            missing_reading = len(month_readings) == 0
            actual_kwh = sum(r.kwh for r in month_readings)

            adjusted_actual = actual_kwh + maintenance_exclusion

            savings_kwh = baseline_kwh - adjusted_actual
            savings_revenue = savings_kwh * project.unit_price

            savings_details.append(
                SavingsDetail(
                    month=month,
                    baseline_kwh=baseline_kwh,
                    actual_kwh=actual_kwh,
                    baseline_adjustment_kwh=baseline_adj_kwh,
                    baseline_adjustment_ref=baseline_adj_ref,
                    maintenance_exclusion_kwh=maintenance_exclusion,
                    maintenance_exclusion_refs=maintenance_refs,
                    missing_reading=missing_reading,
                    savings_kwh=savings_kwh,
                    savings_revenue=savings_revenue,
                )
            )

        total_savings = sum(d.savings_kwh for d in savings_details)
        total_revenue = sum(d.savings_revenue for d in savings_details)

        sharing_breakdown = []
        for entry in active_ratio.entries:
            share = total_revenue * entry.percentage / 100
            sharing_breakdown.append(
                {
                    "party": entry.party,
                    "percentage": entry.percentage,
                    "amount": share,
                }
            )

        result = SharingResult(
            project_id=project_id,
            version=self.store.get_next_version(project_id),
            period_start=period_start,
            period_end=period_end,
            ratio_version=active_ratio.version,
            ratio_entries=active_ratio.entries,
            exclusions=exclusions,
            savings_details=savings_details,
            total_savings_kwh=total_savings,
            total_revenue=total_revenue,
            sharing_breakdown=sharing_breakdown,
            trigger_reason=trigger_reason,
        )

        self.store.save_result(result)
        return result
