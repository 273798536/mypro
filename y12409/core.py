from datetime import datetime, date, timedelta
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

from models import (
    Rack, PUEFactor, MeterReading, TimeOfUsePrice,
    CustomerCharge, ValidationIssue, BadRow,
    MigrationRecord, MeterGap, ReadingSource, RackStatus
)


class DataStore:
    def __init__(self):
        self.racks: Dict[str, List[Rack]] = defaultdict(list)
        self.pue_factors: Dict[str, PUEFactor] = {}
        self.readings: Dict[str, MeterReading] = {}
        self.tou_prices: List[TimeOfUsePrice] = []
        self.bad_rows: List[BadRow] = []
        self.issues: List[ValidationIssue] = []
        self.migrations: List[MigrationRecord] = []
        self.gaps: List[MeterGap] = []

    def add_rack(self, rack: Rack) -> Optional[ValidationIssue]:
        issues = self._validate_rack(rack)
        if issues:
            bad_row = BadRow(
                row_type="rack",
                row_id=rack.rack_id,
                issues=issues,
                data=rack.__dict__
            )
            self.bad_rows.append(bad_row)
            return issues[0]
        self.racks[rack.rack_id].append(rack)
        return None

    def add_pue(self, pue: PUEFactor) -> Optional[ValidationIssue]:
        issues = self._validate_pue(pue)
        if issues:
            bad_row = BadRow(
                row_type="pue",
                row_id=pue.pue_id,
                issues=issues,
                data=pue.__dict__
            )
            self.bad_rows.append(bad_row)
            return issues[0]
        self.pue_factors[pue.pue_id] = pue
        return None

    def add_reading(self, reading: MeterReading) -> Optional[ValidationIssue]:
        issues = self._validate_reading(reading)
        if issues:
            bad_row = BadRow(
                row_type="reading",
                row_id=reading.reading_id,
                issues=issues,
                data=reading.__dict__
            )
            self.bad_rows.append(bad_row)
            return issues[0]

        existing = self._find_existing_reading(reading)
        if existing:
            if reading.is_supplement:
                reading.version = existing.version + 1
                existing.replaced_by = reading.reading_id
            else:
                issue = ValidationIssue(
                    issue_type="duplicate_reading",
                    severity="error",
                    message=f"机柜{reading.rack_id}在{reading.reading_date}已有抄表记录，"
                            f"如需补充请标记is_supplement=True",
                    source_record=reading.reading_id,
                    related_records=[existing.reading_id]
                )
                self.issues.append(issue)
                bad_row = BadRow(
                    row_type="reading",
                    row_id=reading.reading_id,
                    issues=[issue],
                    data=reading.__dict__
                )
                self.bad_rows.append(bad_row)
                return issue

        self.readings[reading.reading_id] = reading
        return None

    def _find_existing_reading(self, reading: MeterReading) -> Optional[MeterReading]:
        for r in self.readings.values():
            if (r.rack_id == reading.rack_id
                and r.reading_date == reading.reading_date
                and r.replaced_by is None
                and not r.is_supplement):
                return r
        return None

    def _validate_rack(self, rack: Rack) -> List[ValidationIssue]:
        issues = []
        if not rack.rack_id:
            issues.append(ValidationIssue(
                issue_type="missing_id",
                severity="error",
                message="机柜ID不能为空",
                source_record=rack.rack_id or "unknown"
            ))
        if not rack.customer:
            issues.append(ValidationIssue(
                issue_type="missing_customer",
                severity="error",
                message=f"机柜{rack.rack_id}缺少客户信息",
                source_record=rack.rack_id
            ))
        if rack.power_capacity <= 0:
            issues.append(ValidationIssue(
                issue_type="invalid_capacity",
                severity="warning",
                message=f"机柜{rack.rack_id}功率容量异常: {rack.power_capacity}",
                source_record=rack.rack_id
            ))
        return issues

    def _validate_pue(self, pue: PUEFactor) -> List[ValidationIssue]:
        issues = []
        if pue.pue_value < 1.0 or pue.pue_value > 3.0:
            issues.append(ValidationIssue(
                issue_type="invalid_pue",
                severity="error",
                message=f"PUE系数异常: {pue.pue_value}，正常范围1.0-3.0",
                source_record=pue.pue_id
            ))
        if not pue.date:
            issues.append(ValidationIssue(
                issue_type="missing_date",
                severity="error",
                message="PUE缺少生效日期",
                source_record=pue.pue_id
            ))
        return issues

    def _validate_reading(self, reading: MeterReading) -> List[ValidationIssue]:
        issues = []
        if not reading.rack_id:
            issues.append(ValidationIssue(
                issue_type="missing_rack_id",
                severity="error",
                message="抄表记录缺少机柜ID",
                source_record=reading.reading_id
            ))
            return issues

        if reading.rack_id not in self.racks:
            issues.append(ValidationIssue(
                issue_type="unknown_rack",
                severity="error",
                message=f"未知机柜ID: {reading.rack_id}，抄表记录将被排除",
                source_record=reading.reading_id,
                details={"rack_id": reading.rack_id}
            ))

        if reading.start_kwh is not None and reading.end_kwh is not None:
            if reading.end_kwh < reading.start_kwh:
                issues.append(ValidationIssue(
                    issue_type="negative_consumption",
                    severity="error",
                    message=f"机柜{reading.rack_id}抄表异常: 止度{reading.end_kwh} < 起度{reading.start_kwh}",
                    source_record=reading.reading_id,
                    details={"start": reading.start_kwh, "end": reading.end_kwh}
                ))

        if reading.consumption is not None and reading.consumption == 0:
            issues.append(ValidationIssue(
                issue_type="zero_consumption",
                severity="warning",
                message=f"机柜{reading.rack_id}在{reading.reading_date}耗电量为0，请确认",
                source_record=reading.reading_id
            ))

        return issues

    def get_pue_for_date(self, d: date) -> Optional[PUEFactor]:
        sorted_pues = sorted(
            [p for p in self.pue_factors.values() if p.date <= d],
            key=lambda x: x.date,
            reverse=True
        )
        return sorted_pues[0] if sorted_pues else None

    def get_active_racks_on(self, d: date) -> List[Rack]:
        return [r for r in self.racks.values() if r.is_active_on(d)]

    def get_valid_readings(self, start_date: date, end_date: date) -> List[MeterReading]:
        result = []
        for r in self.readings.values():
            if (r.replaced_by is None
                and start_date <= r.reading_date <= end_date
                and r.consumption is not None):
                result.append(r)
        return result

    def get_reading_versions(self, rack_id: str, reading_date: date) -> List[MeterReading]:
        versions = []
        for r in self.readings.values():
            if r.rack_id == rack_id and r.reading_date == reading_date:
                versions.append(r)
        return sorted(versions, key=lambda x: x.version)


class Calculator:
    def __init__(self, store: DataStore):
        self.store = store

    def calculate_tou_cost(self, consumption_kwh: float, reading_date: date) -> Tuple[float, float, List[Dict]]:
        total_hours = 24
        per_hour = consumption_kwh / total_hours

        peak_cost = 0.0
        offpeak_cost = 0.0
        details = []

        for price in self.store.tou_prices:
            hours_in_period = price.end_hour - price.start_hour
            period_kwh = per_hour * hours_in_period
            period_cost = period_kwh * price.price_per_kwh

            if price.is_peak:
                peak_cost += period_cost
            else:
                offpeak_cost += period_cost

            details.append({
                "period": price.period_name,
                "hours": hours_in_period,
                "kwh": round(period_kwh, 4),
                "price": price.price_per_kwh,
                "cost": round(period_cost, 2),
                "is_peak": price.is_peak
            })

        return round(peak_cost, 2), round(offpeak_cost, 2), details

    def calculate_charges(self, start_date: date, end_date: date) -> Tuple[List[CustomerCharge], List[ValidationIssue]]:
        charges: List[CustomerCharge] = []
        calc_issues: List[ValidationIssue] = []

        readings = self.store.get_valid_readings(start_date, end_date)
        readings_by_rack_date: Dict[Tuple[str, date], List[MeterReading]] = defaultdict(list)

        for r in readings:
            readings_by_rack_date[(r.rack_id, r.reading_date)].append(r)

        current_date = start_date
        while current_date <= end_date:
            pue = self.store.get_pue_for_date(current_date)

            if not pue:
                calc_issues.append(ValidationIssue(
                    issue_type="missing_pue",
                    severity="error",
                    message=f"日期{current_date}缺少PUE系数，该日数据无法计算",
                    source_record=f"pue_{current_date}"
                ))
                current_date += timedelta(days=1)
                continue

            active_racks = self.store.get_active_racks_on(current_date)

            for rack in active_racks:
                rack_readings = readings_by_rack_date.get((rack.rack_id, current_date), [])

                if not rack_readings:
                    calc_issues.append(ValidationIssue(
                        issue_type="missing_reading",
                        severity="warning",
                        message=f"客户{rack.customer}的机柜{rack.rack_id}在{current_date}无有效抄表记录",
                        source_record=f"reading_{rack.rack_id}_{current_date}",
                        details={"customer": rack.customer, "rack_id": rack.rack_id, "date": current_date.isoformat()}
                    ))
                    continue

                latest = max(rack_readings, key=lambda x: x.version)
                consumption = latest.consumption

                if consumption is None:
                    continue

                final_kwh = consumption * pue.pue_value
                peak_cost, offpeak_cost, price_details = self.calculate_tou_cost(final_kwh, current_date)

                charge = CustomerCharge(
                    customer=rack.customer,
                    date=current_date,
                    rack_id=rack.rack_id,
                    consumption_kwh=round(consumption, 4),
                    pue_factor=pue.pue_value,
                    final_kwh=round(final_kwh, 4),
                    peak_cost=peak_cost,
                    offpeak_cost=offpeak_cost,
                    total_cost=round(peak_cost + offpeak_cost, 2),
                    reading_ids=[r.reading_id for r in rack_readings],
                    pue_ids=[pue.pue_id],
                    price_details=price_details
                )
                charges.append(charge)

            current_date += timedelta(days=1)

        return charges, calc_issues
