from typing import List, Tuple
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session
import uuid
import math

from app.models import TideRecord, WaterQualityRecord, VesselTrajectory, ImportBatch
from app.schemas import (
    TideRecordCreate, WaterQualityCreate, TrajectoryCreate, BatchImportRequest,
    TideWindowCalcRequest,
)
from app.services.crud_service import (
    get_or_create_batch, mark_batch_completed,
    upsert_tide_records, upsert_water_records, upsert_trajectories,
    compute_or_get_tide_window,
)


def _sine_tide(t: datetime, base: float = 3.0, amp: float = 2.5,
               period_hours: float = 12.42, phase_hours: float = 0.0) -> float:
    period_sec = period_hours * 3600
    phase = 2 * math.pi * ((t.timestamp() / period_sec) + phase_hours / period_hours)
    return base + amp * math.sin(phase)


def _noisy_depth(tide_h: float, base_depth: float = 10.0, noise: float = 0.15,
                 bias: float = 0.0) -> float:
    import random
    true_depth = base_depth + tide_h + bias
    return true_depth + random.uniform(-noise, noise)


def seed_tide_records(db: Session, port_code: str = "CNQIN",
                      port_name: str = "青岛港",
                      days: int = 3) -> Tuple[ImportBatch, int, int, int]:
    batch_id = f"seed-tide-{uuid.uuid4().hex[:8]}"
    batch, is_dup = get_or_create_batch(db, BatchImportRequest(
        batch_id=batch_id, batch_type="tide", source_file="example_seed",
        operator="system", remark="示例数据-潮汐表",
    ))
    if is_dup:
        return batch, 0, 0, batch.total_records or 0

    today = date.today()
    tz = timezone(timedelta(hours=8))
    records: List[TideRecordCreate] = []
    for d in range(-1, days - 1):
        day = today + timedelta(days=d)
        for h in range(0, 24 * 60, 30):
            dt = datetime.combine(day, datetime.min.time(), tzinfo=tz) + timedelta(minutes=h)
            tide_h = round(_sine_tide(dt, base=2.8, amp=2.2, phase_hours=2.0), 3)
            records.append(TideRecordCreate(
                port_code=port_code,
                port_name=port_name,
                record_date=dt.date(),
                record_time=dt,
                tide_height=tide_h,
                tide_type=("HIGH" if h % (12 * 60) < 6 * 60 else "LOW") if abs(tide_h) > 3.5 else "MID",
                data_source="示例潮汐表(正弦合成)",
                batch_id=batch_id,
            ))
    inserted, updated, skipped = upsert_tide_records(db, records, batch_id)
    mark_batch_completed(db, batch_id, inserted, updated, skipped, len(records))
    db.commit()
    return batch, inserted, updated, len(records)


def seed_water_quality(db: Session, port_code: str = "CNQIN",
                       station_code: str = "ST01",
                       days: int = 3,
                       add_negative_count: int = 3,
                       add_time_misalignment: bool = True) -> Tuple[ImportBatch, int, int, int]:
    batch_id = f"seed-water-{uuid.uuid4().hex[:8]}"
    batch, is_dup = get_or_create_batch(db, BatchImportRequest(
        batch_id=batch_id, batch_type="water", source_file="example_seed",
        operator="system", remark=f"示例水质数据（含{add_negative_count}个负深度）",
    ))
    if is_dup:
        return batch, 0, 0, batch.total_records or 0

    import random
    random.seed(42)
    today = date.today()
    tz = timezone(timedelta(hours=8))
    records: List[WaterQualityCreate] = []

    misalignment_min = 15 if add_time_misalignment else 0

    neg_positions = set(random.sample(range(20, 180), min(add_negative_count, 10)))
    idx = 0
    for d in range(-1, days - 1):
        day = today + timedelta(days=d)
        for h in range(0, 24 * 60, 45):
            dt = datetime.combine(day, datetime.min.time(), tzinfo=tz) + timedelta(minutes=h + misalignment_min)
            tide_h = _sine_tide(dt, base=2.8, amp=2.2, phase_hours=2.0)
            if idx in neg_positions:
                depth = round(random.uniform(-0.8, -0.05), 2)
            else:
                depth = round(_noisy_depth(tide_h, base_depth=8.5, noise=0.2, bias=-0.1), 3)
            records.append(WaterQualityCreate(
                port_code=port_code,
                station_code=station_code,
                record_date=dt.date(),
                record_time=dt,
                water_depth=depth,
                water_level=round(tide_h + 8.5, 3),
                temperature=round(12 + random.uniform(-1, 1), 2),
                salinity=round(30 + random.uniform(-1, 1), 2),
                turbidity=round(5 + random.uniform(0, 3), 2),
                batch_id=batch_id,
            ))
            idx += 1

    inserted, updated, skipped = upsert_water_records(db, records, batch_id)
    mark_batch_completed(db, batch_id, inserted, updated, skipped, len(records))
    db.commit()
    return batch, inserted, updated, len(records)


def seed_trajectories(db: Session, mmsi_list: List[str] = None,
                      port_code: str = "CNQIN",
                      days: int = 2) -> Tuple[ImportBatch, int, int, int]:
    batch_id = f"seed-trajectory-{uuid.uuid4().hex[:8]}"
    batch, is_dup = get_or_create_batch(db, BatchImportRequest(
        batch_id=batch_id, batch_type="trajectory", source_file="example_seed",
        operator="system", remark="示例船舶轨迹（待清洗）",
    ))
    if is_dup:
        return batch, 0, 0, batch.total_records or 0

    import random
    random.seed(99)
    if not mmsi_list:
        mmsi_list = [
            ("413123456", "远洋一号"),
            ("413123457", "海王星"),
            ("413123458", "东海明珠"),
        ]
    tz = timezone(timedelta(hours=8))
    today = date.today()
    records: List[TrajectoryCreate] = []

    for mmsi, name in mmsi_list:
        base_lon = 120.3 + random.uniform(-0.05, 0.05)
        base_lat = 36.05 + random.uniform(-0.05, 0.05)
        for d in range(-1, days - 1):
            day = today + timedelta(days=d)
            for h in range(60, 18 * 60, 10):
                dt = datetime.combine(day, datetime.min.time(), tzinfo=tz) + timedelta(minutes=h)
                progress = h / (18 * 60)
                lon = base_lon + progress * 0.08 + random.uniform(-0.001, 0.001)
                lat = base_lat + math.sin(progress * math.pi) * 0.05 + random.uniform(-0.001, 0.001)
                speed = round(6 + random.uniform(-3, 4), 1) if progress < 0.9 else round(random.uniform(0, 1), 1)
                heading = round(45 + progress * 180 + random.uniform(-5, 5), 1) % 360
                records.append(TrajectoryCreate(
                    mmsi=mmsi,
                    vessel_name=name,
                    port_code=port_code,
                    record_time=dt,
                    longitude=round(lon, 6),
                    latitude=round(lat, 6),
                    speed=speed,
                    heading=heading,
                    batch_id=batch_id,
                ))

    inserted, updated, skipped = upsert_trajectories(db, records, batch_id)
    mark_batch_completed(db, batch_id, inserted, updated, skipped, len(records))
    db.commit()
    return batch, inserted, updated, len(records)


def seed_example_tide_window_calculations(db: Session,
                                          port_code: str = "CNQIN",
                                          port_name: str = "青岛港") -> List[str]:
    created = []
    tz = timezone(timedelta(hours=8))
    today = date.today()
    tasks = [
        ("远洋一号", "413123456", today, 7.5, 0.6),
        ("海王星", "413123457", today, 8.5, 0.7),
        ("东海明珠", "413123458", today + timedelta(days=1), 6.8, 0.5),
        ("远洋一号", "413123456", today + timedelta(days=1), 7.5, 0.6),
    ]
    for vname, mmsi, wd, draft, margin in tasks:
        obj, _, is_new = compute_or_get_tide_window(db, TideWindowCalcRequest(
            port_code=port_code,
            port_name=port_name,
            vessel_name=vname,
            mmsi=mmsi,
            work_date=wd,
            required_depth=round(draft + margin + 0.5, 1),
            draft=draft,
            under_keel_margin=margin,
            time_window_hours=24.0,
            operator="system",
        ), force_recompute=False)
        if obj and is_new:
            created.append(f"{vname}-{wd}")
    db.commit()
    return created


def seed_all_example_data(db: Session, force: bool = False) -> dict:
    existing_tide = db.query(TideRecord).count()
    if existing_tide > 0 and not force:
        return {
            "skipped": True,
            "reason": "已有数据，如需重建请使用force=true",
            "tide_count": existing_tide,
            "water_count": db.query(WaterQualityRecord).count(),
            "trajectory_count": db.query(VesselTrajectory).count(),
        }
    if force:
        db.query(TideRecord).delete()
        db.query(WaterQualityRecord).delete()
        db.query(VesselTrajectory).delete()
        db.query(ImportBatch).delete()
        db.commit()

    b1, i1, u1, t1 = seed_tide_records(db)
    b2, i2, u2, t2 = seed_water_quality(db, add_negative_count=4, add_time_misalignment=True)
    b3, i3, u3, t3 = seed_trajectories(db)
    calc_list = seed_example_tide_window_calculations(db)

    return {
        "tide": {"batch": b1.batch_id, "inserted": i1, "total": t1},
        "water": {"batch": b2.batch_id, "inserted": i2, "total": t2},
        "trajectory": {"batch": b3.batch_id, "inserted": i3, "total": t3},
        "calculations": calc_list,
        "summary": (
            f"示例数据已生成：潮汐{t1}条、水质{t2}条（含负深度样点，用于演示自动剔除与暂缓机制）、"
            f"轨迹{t3}条、潮窗计算{len(calc_list)}条。海事安全员首次打开即可查看。"
        ),
    }
