from datetime import date, timedelta
from decimal import Decimal
from dateutil.relativedelta import relativedelta
from typing import List

from sqlalchemy.orm import Session

from app.models.models import EnergyReading, CorrectionLog
from app.config import CROSS_MONTH_THRESHOLD_DAYS


def _log_correction(db: Session, enterprise_id: int, target_table: str,
                    target_id: int, field_name: str, old_value: str,
                    new_value: str, reason: str, operator: str = "system"):
    log = CorrectionLog(
        enterprise_id=enterprise_id,
        target_table=target_table,
        target_id=target_id,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
        reason=reason,
        operator=operator,
    )
    db.add(log)


def detect_cross_month_readings(db: Session, period: str = None) -> List[dict]:
    query = db.query(EnergyReading).filter(EnergyReading.is_adjusted == False)
    if period:
        year, month = period.split("-")
        y, m = int(year), int(month)
        period_start = date(y, m, 1)
        period_end = period_start + relativedelta(months=1) - timedelta(days=1)
        query = query.filter(
            EnergyReading.reading_date >= period_start,
            EnergyReading.reading_date <= period_end,
        )

    readings = query.all()
    results = []

    for r in readings:
        rd = r.reading_date
        month_start = date(rd.year, rd.month, 1)
        next_month = month_start + relativedelta(months=1)
        month_end = next_month - timedelta(days=1)

        from app.models.models import Enterprise
        ent = db.query(Enterprise).filter(Enterprise.id == r.enterprise_id).first()

        same_day_readings = (
            db.query(EnergyReading)
            .filter(
                EnergyReading.enterprise_id == r.enterprise_id,
                EnergyReading.reading_date == rd,
                EnergyReading.energy_type == r.energy_type,
                EnergyReading.id != r.id,
            )
            .all()
        )

        if len(same_day_readings) > 0:
            r.is_cross_month = True
            r.cross_month_from = month_start
            r.cross_month_to = month_end
            r.cross_month_note = f"同日存在多条读数，可能跨月归集异常，共{len(same_day_readings) + 1}条"
            results.append({
                "reading_id": r.id,
                "enterprise_code": ent.enterprise_code if ent else None,
                "reading_date": str(rd),
                "energy_type": r.energy_type,
                "value": str(r.value),
                "issue": "duplicate_same_day",
                "count": len(same_day_readings) + 1,
            })
            continue

        if rd.day <= CROSS_MONTH_THRESHOLD_DAYS:
            prev_month_end = month_start - timedelta(days=1)
            prev_reading = (
                db.query(EnergyReading)
                .filter(
                    EnergyReading.enterprise_id == r.enterprise_id,
                    EnergyReading.energy_type == r.energy_type,
                    EnergyReading.reading_date >= date(prev_month_end.year, prev_month_end.month, 1),
                    EnergyReading.reading_date <= prev_month_end,
                )
                .order_by(EnergyReading.reading_date.desc())
                .first()
            )
            if prev_reading and (rd - prev_reading.reading_date).days <= CROSS_MONTH_THRESHOLD_DAYS + 1:
                r.is_cross_month = True
                r.cross_month_from = prev_reading.reading_date
                r.cross_month_to = rd
                r.cross_month_note = f"跨月读数：上月末({prev_reading.reading_date})与本月初({rd})间隔过短"
                results.append({
                    "reading_id": r.id,
                    "enterprise_code": ent.enterprise_code if ent else None,
                    "reading_date": str(rd),
                    "energy_type": r.energy_type,
                    "value": str(r.value),
                    "issue": "cross_month_boundary",
                    "prev_reading_date": str(prev_reading.reading_date),
                    "prev_value": str(prev_reading.value),
                })

    db.commit()
    return results


def adjust_reading_period(db: Session, reading_id: int,
                          new_date: date, operator: str = "system") -> dict:
    reading = db.query(EnergyReading).filter(EnergyReading.id == reading_id).first()
    if not reading:
        return {"error": "reading not found"}

    old_date = str(reading.reading_date)
    reading.reading_date = new_date
    reading.is_adjusted = True
    reading.original_reading_id = reading.id

    _log_correction(
        db, reading.enterprise_id, "energy_readings", reading_id,
        "reading_date", old_date, str(new_date),
        "跨月归集调整", operator,
    )
    db.commit()
    return {
        "reading_id": reading_id,
        "old_date": old_date,
        "new_date": str(new_date),
        "status": "adjusted",
    }


def aggregate_cross_month_readings(db: Session, enterprise_id: int,
                                   energy_type: str, period: str) -> dict:
    year, month = period.split("-")
    y, m = int(year), int(month)
    period_start = date(y, m, 1)
    period_end = period_start + relativedelta(months=1)

    readings = (
        db.query(EnergyReading)
        .filter(
            EnergyReading.enterprise_id == enterprise_id,
            EnergyReading.energy_type == energy_type,
            EnergyReading.reading_date >= period_start,
            EnergyReading.reading_date < period_end,
        )
        .order_by(EnergyReading.reading_date)
        .all()
    )

    total = sum((r.value for r in readings), Decimal("0"))
    cross_count = sum(1 for r in readings if r.is_cross_month)

    return {
        "enterprise_id": enterprise_id,
        "energy_type": energy_type,
        "period": period,
        "reading_count": len(readings),
        "cross_month_count": cross_count,
        "total_value": total,
    }