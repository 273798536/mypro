from datetime import datetime, date, timedelta, time
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

from models import (
    Rack, MeterReading, MigrationRecord, MeterGap,
    ValidationIssue, RackStatus
)
from core import DataStore


class MigrationAnalyzer:
    def __init__(self, store: DataStore):
        self.store = store

    def detect_cross_day_migrations(self, start_date: date, end_date: date) -> List[MigrationRecord]:
        migrations = []
        racks_with_history = self._get_racks_with_location_changes()

        for rack_id, rack_versions in racks_with_history.items():
            if len(rack_versions) < 2:
                continue

            sorted_versions = sorted(rack_versions, key=lambda r: r.effective_date)

            for i in range(len(sorted_versions) - 1):
                old = sorted_versions[i]
                new = sorted_versions[i + 1]

                migration_date = new.effective_date
                if not (start_date <= migration_date <= end_date):
                    continue

                cross_day = self._is_cross_day_migration(old, new, migration_date)
                affected_readings = self._find_affected_readings(rack_id, migration_date)
                gap_hours = self._calculate_gap_hours(old, new, migration_date)

                migration = MigrationRecord(
                    rack_id=rack_id,
                    customer=old.customer,
                    old_location=old.location,
                    new_location=new.location,
                    migration_date=migration_date,
                    cross_day=cross_day,
                    affected_readings=affected_readings,
                    gap_hours=gap_hours
                )
                migrations.append(migration)

                if cross_day:
                    issue = ValidationIssue(
                        issue_type="cross_day_migration",
                        severity="error",
                        message=f"【醒目】客户{old.customer}的机柜{rack_id}在{migration_date}迁柜跨日！"
                                f"{old.location} → {new.location}，缺口{gap_hours}小时，"
                                f"影响抄表记录: {affected_readings}",
                        source_record=migration.migration_id,
                        related_records=affected_readings,
                        details={
                            "customer": old.customer,
                            "rack_id": rack_id,
                            "old_location": old.location,
                            "new_location": new.location,
                            "migration_date": migration_date.isoformat(),
                            "gap_hours": gap_hours,
                            "affected_readings": affected_readings
                        }
                    )
                    self.store.issues.append(issue)

        self.store.migrations.extend(migrations)
        return migrations

    def _get_racks_with_location_changes(self) -> Dict[str, List[Rack]]:
        result = defaultdict(list)
        for rack in self.store.racks.values():
            result[rack.rack_id].append(rack)
        return result

    def _is_cross_day_migration(self, old: Rack, new: Rack, migration_date: date) -> bool:
        if old.end_date is None:
            return False
        day_diff = (new.effective_date - old.end_date).days
        return day_diff >= 1

    def _find_affected_readings(self, rack_id: str, migration_date: date) -> List[str]:
        affected = []
        for r in self.store.readings.values():
            if r.rack_id == rack_id and r.reading_date == migration_date:
                affected.append(r.reading_id)
        return affected

    def _calculate_gap_hours(self, old: Rack, new: Rack, migration_date: date) -> int:
        if old.end_date is None:
            return 0
        total_hours = 24
        effective_hours = 0

        if old.end_date == migration_date - timedelta(days=1):
            effective_hours += 24
        if new.effective_date == migration_date:
            effective_hours += 24

        return max(0, total_hours * 2 - effective_hours)


class GapAnalyzer:
    def __init__(self, store: DataStore):
        self.store = store

    def detect_meter_gaps(self, start_date: date, end_date: date,
                          max_gap_hours: float = 26.0) -> List[MeterGap]:
        gaps = []

        readings_by_rack: Dict[str, List[MeterReading]] = defaultdict(list)
        for r in self.store.readings.values():
            if (r.replaced_by is None
                and r.read_at is not None
                and start_date <= r.reading_date <= end_date):
                readings_by_rack[r.rack_id].append(r)

        for rack_id, readings in readings_by_rack.items():
            sorted_readings = sorted(readings, key=lambda x: x.read_at)

            for i in range(len(sorted_readings) - 1):
                prev = sorted_readings[i]
                next_ = sorted_readings[i + 1]

                gap_start = prev.read_at
                gap_end = next_.read_at
                gap_duration = (gap_end - gap_start).total_seconds() / 3600.0

                if gap_duration > max_gap_hours:
                    estimated = self._estimate_consumption(prev, next_, gap_duration)

                    gap = MeterGap(
                        rack_id=rack_id,
                        gap_start=gap_start,
                        gap_end=gap_end,
                        gap_hours=round(gap_duration, 2),
                        previous_reading_id=prev.reading_id,
                        next_reading_id=next_.reading_id,
                        estimated_consumption=estimated
                    )
                    gaps.append(gap)

                    rack = self.store.racks.get(rack_id)
                    customer = rack.customer if rack else "未知客户"

                    issue = ValidationIssue(
                        issue_type="meter_gap",
                        severity="error",
                        message=f"【醒目】客户{customer}的机柜{rack_id}存在抄表缺口！"
                                f"{gap_start} → {gap_end}，缺口{round(gap_duration, 1)}小时，"
                                f"前次抄表[{prev.reading_id}]，后次抄表[{next_.reading_id}]，"
                                f"预估耗电约{estimated}kWh",
                        source_record=gap.gap_id,
                        related_records=[prev.reading_id, next_.reading_id],
                        details={
                            "customer": customer,
                            "rack_id": rack_id,
                            "gap_start": gap_start.isoformat(),
                            "gap_end": gap_end.isoformat(),
                            "gap_hours": round(gap_duration, 2),
                            "previous_reading": prev.reading_id,
                            "next_reading": next_.reading_id,
                            "previous_end_kwh": prev.end_kwh,
                            "next_start_kwh": next_.start_kwh,
                            "estimated_consumption": estimated
                        }
                    )
                    self.store.issues.append(issue)

        self.store.gaps.extend(gaps)
        return gaps

    def _estimate_consumption(self, prev: MeterReading, next_: MeterReading,
                              gap_hours: float) -> Optional[float]:
        if prev.end_kwh is None or next_.start_kwh is None:
            return None

        direct_diff = next_.start_kwh - prev.end_kwh
        if direct_diff >= 0:
            return round(direct_diff, 4)

        if prev.consumption and prev.read_at:
            next_read_at = next_.read_at or prev.read_at + timedelta(hours=gap_hours)
            hours_between = (next_read_at - prev.read_at).total_seconds() / 3600.0
            if hours_between > 0:
                rate = prev.consumption / 24.0
                return round(rate * gap_hours, 4)

        return None

    def get_gaps_by_customer(self, customer: str) -> List[MeterGap]:
        result = []
        customer_racks = [r.rack_id for r in self.store.racks.values()
                          if r.customer == customer]
        for gap in self.store.gaps:
            if gap.rack_id in customer_racks:
                result.append(gap)
        return result


class DifferenceExplainer:
    def __init__(self, store: DataStore):
        self.store = store

    def explain_differences(self, charges: List,
                            start_date: date, end_date: date) -> List[Dict]:
        explanations = []

        migration_analyzer = MigrationAnalyzer(self.store)
        gap_analyzer = GapAnalyzer(self.store)

        migrations = migration_analyzer.detect_cross_day_migrations(start_date, end_date)
        gaps = gap_analyzer.detect_meter_gaps(start_date, end_date)

        charges_by_customer: Dict[str, List] = defaultdict(list)
        for c in charges:
            charges_by_customer[c.customer].append(c)

        for customer, customer_charges in charges_by_customer.items():
            customer_migrations = [m for m in migrations if m.customer == customer]
            customer_gaps = gap_analyzer.get_gaps_by_customer(customer)
            bad_rows = self._get_customer_bad_rows(customer)

            total_kwh = sum(c.final_kwh for c in customer_charges)
            total_cost = sum(c.total_cost for c in customer_charges)

            explanation = {
                "customer": customer,
                "period": f"{start_date} ~ {end_date}",
                "summary": {
                    "total_days": (end_date - start_date).days + 1,
                    "active_racks": len(set(c.rack_id for c in customer_charges)),
                    "total_kwh": round(total_kwh, 2),
                    "total_cost": round(total_cost, 2),
                    "peak_cost": round(sum(c.peak_cost for c in customer_charges), 2),
                    "offpeak_cost": round(sum(c.offpeak_cost for c in customer_charges), 2),
                },
                "cross_day_migrations": [
                    {
                        "migration_id": m.migration_id,
                        "rack_id": m.rack_id,
                        "date": m.migration_date.isoformat(),
                        "old_location": m.old_location,
                        "new_location": m.new_location,
                        "gap_hours": m.gap_hours,
                        "affected_readings": m.affected_readings,
                        "action_required": True
                    }
                    for m in customer_migrations if m.cross_day
                ],
                "meter_gaps": [
                    {
                        "gap_id": g.gap_id,
                        "rack_id": g.rack_id,
                        "gap_start": g.gap_start.isoformat(),
                        "gap_end": g.gap_end.isoformat(),
                        "gap_hours": g.gap_hours,
                        "previous_reading": g.previous_reading_id,
                        "next_reading": g.next_reading_id,
                        "estimated_kwh": g.estimated_consumption,
                        "is_resolved": g.is_resolved,
                        "action_required": not g.is_resolved
                    }
                    for g in customer_gaps
                ],
                "bad_rows": [
                    {
                        "row_type": br.row_type,
                        "row_id": br.row_id,
                        "issues": [i.message for i in br.issues],
                        "excluded": br.excluded_from_calc
                    }
                    for br in bad_rows
                ],
                "reading_versions": self._get_customer_reading_versions(customer, start_date, end_date),
                "notes": self._generate_notes(customer_migrations, customer_gaps, bad_rows)
            }
            explanations.append(explanation)

        return explanations

    def _get_customer_bad_rows(self, customer: str) -> List:
        result = []
        customer_racks = [r.rack_id for r in self.store.racks.values()
                          if r.customer == customer]

        for br in self.store.bad_rows:
            if br.row_type == "rack" and br.row_id in customer_racks:
                result.append(br)
            elif br.row_type == "reading":
                rack_id = br.data.get("rack_id")
                if rack_id in customer_racks:
                    result.append(br)
        return result

    def _get_customer_reading_versions(self, customer: str,
                                       start_date: date, end_date: date) -> List[Dict]:
        versions = []
        customer_racks = [r.rack_id for r in self.store.racks.values()
                          if r.customer == customer]

        current = start_date
        while current <= end_date:
            for rack_id in customer_racks:
                vs = self.store.get_reading_versions(rack_id, current)
                if len(vs) > 1:
                    versions.append({
                        "rack_id": rack_id,
                        "date": current.isoformat(),
                        "versions": [
                            {
                                "version": v.version,
                                "reading_id": v.reading_id,
                                "is_supplement": v.is_supplement,
                                "start_kwh": v.start_kwh,
                                "end_kwh": v.end_kwh,
                                "consumption": v.consumption,
                                "replaced_by": v.replaced_by,
                                "source": v.source.value if hasattr(v.source, 'value') else str(v.source)
                            }
                            for v in vs
                        ]
                    })
            current += timedelta(days=1)

        return versions

    def _generate_notes(self, migrations, gaps, bad_rows) -> List[str]:
        notes = []

        cross_day = [m for m in migrations if m.cross_day]
        if cross_day:
            notes.append(f"⚠️ 存在{len(cross_day)}笔迁柜跨日记录，请核实电费分摊是否准确")

        unresolved_gaps = [g for g in gaps if not g.is_resolved]
        if unresolved_gaps:
            notes.append(f"⚠️ 存在{len(unresolved_gaps)}笔抄表缺口未处理，涉及预估耗电")

        if bad_rows:
            error_rows = [br for br in bad_rows
                          if any(i.severity == "error" for i in br.issues)]
            if error_rows:
                notes.append(f"⚠️ {len(error_rows)}笔数据因严重错误被排除，"
                             f"可能导致分摊金额偏少")

        if not notes:
            notes.append("✅ 数据完整，未发现异常")

        return notes
