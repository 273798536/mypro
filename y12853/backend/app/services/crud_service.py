from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc
import hashlib
import json

from app.models import (
    TideRecord, WaterQualityRecord, VesselTrajectory,
    TideWindowResult, CorrectionAuditLog, ImportBatch, DataStatus,
)
from app.schemas import (
    TideRecordCreate, WaterQualityCreate, TrajectoryCreate,
    TideWindowCalcRequest, ManualCorrectionRequest, BatchImportRequest,
)
from app.services.tide_calculator import (
    calculate_tide_window, generate_result_no, TideSample, WaterSample,
    classify_result_data, FORMULA_REGISTRY,
)


def get_or_create_batch(db: Session, req: BatchImportRequest) -> Tuple[ImportBatch, bool]:
    existing = db.query(ImportBatch).filter(
        ImportBatch.batch_id == req.batch_id
    ).first()
    if existing:
        return existing, True
    dup_hash = None
    if req.source_hash:
        dup = db.query(ImportBatch).filter(
            ImportBatch.source_hash == req.source_hash,
            ImportBatch.status == "completed",
            ImportBatch.is_reimport == (req.is_reimport or False),
        ).first()
        if dup and not req.is_reimport:
            return dup, True
        dup_hash = req.source_hash
    batch = ImportBatch(
        batch_id=req.batch_id,
        batch_type=req.batch_type,
        source_file=req.source_file,
        source_hash=dup_hash,
        operator=req.operator,
        remark=req.remark,
        is_reimport=req.is_reimport,
        superseded_batch_id=req.superseded_batch_id,
    )
    db.add(batch)
    db.flush()
    return batch, False


def mark_batch_completed(db: Session, batch_id: str,
                         inserted: int, updated: int, skipped: int,
                         total: int, remark: str = "") -> Optional[ImportBatch]:
    batch = db.query(ImportBatch).filter(ImportBatch.batch_id == batch_id).first()
    if not batch:
        return None
    batch.total_records = total
    batch.inserted_count = inserted
    batch.updated_count = updated
    batch.skipped_count = skipped
    batch.status = "completed"
    batch.finished_at = func.now()
    if remark:
        batch.remark = (batch.remark or "") + remark
    db.flush()
    return batch


def _merge_batch(rec, batch_id: str) -> dict:
    data = rec.model_dump(exclude_unset=True)
    data["batch_id"] = batch_id
    return data


def upsert_tide_records(db: Session, records: List[TideRecordCreate],
                        batch_id: str) -> Tuple[int, int, int]:
    inserted = updated = skipped = 0
    for rec in records:
        exist = db.query(TideRecord).filter(
            TideRecord.port_code == rec.port_code,
            TideRecord.record_time == rec.record_time,
            TideRecord.batch_id == batch_id,
        ).first()
        if exist:
            if exist.tide_height != rec.tide_height or exist.tide_type != rec.tide_type:
                exist.tide_height = rec.tide_height
                exist.tide_type = rec.tide_type
                exist.port_name = rec.port_name or exist.port_name
                exist.data_source = rec.data_source or exist.data_source
                updated += 1
            else:
                skipped += 1
            continue
        new = TideRecord(**_merge_batch(rec, batch_id))
        db.add(new)
        inserted += 1
    db.flush()
    return inserted, updated, skipped


def upsert_water_records(db: Session, records: List[WaterQualityCreate],
                         batch_id: str) -> Tuple[int, int, int]:
    inserted = updated = skipped = 0
    for rec in records:
        exist = db.query(WaterQualityRecord).filter(
            WaterQualityRecord.port_code == rec.port_code,
            WaterQualityRecord.station_code == (rec.station_code or ""),
            WaterQualityRecord.record_time == rec.record_time,
            WaterQualityRecord.batch_id == batch_id,
        ).first()
        if exist:
            changed = False
            for field in ["water_depth", "water_level", "temperature", "salinity", "turbidity"]:
                nv = getattr(rec, field)
                if nv is not None and getattr(exist, field) != nv:
                    setattr(exist, field, nv)
                    changed = True
            if changed:
                updated += 1
            else:
                skipped += 1
            continue
        new = WaterQualityRecord(**_merge_batch(rec, batch_id))
        db.add(new)
        inserted += 1
    db.flush()
    return inserted, updated, skipped


def upsert_trajectories(db: Session, records: List[TrajectoryCreate],
                        batch_id: str) -> Tuple[int, int, int]:
    inserted = updated = skipped = 0
    for rec in records:
        exist = db.query(VesselTrajectory).filter(
            VesselTrajectory.mmsi == rec.mmsi,
            VesselTrajectory.record_time == rec.record_time,
            VesselTrajectory.batch_id == batch_id,
        ).first()
        if exist:
            changed = False
            for field in ["longitude", "latitude", "speed", "heading", "port_code", "vessel_name"]:
                nv = getattr(rec, field)
                if nv is not None and getattr(exist, field) != nv:
                    setattr(exist, field, nv)
                    changed = True
            if changed:
                updated += 1
            else:
                skipped += 1
            continue
        new = VesselTrajectory(**_merge_batch(rec, batch_id))
        db.add(new)
        inserted += 1
    db.flush()
    return inserted, updated, skipped


def _build_hash(port_code: str, work_date: date, vessel_name: str, mmsi: str,
                draft: float, required_depth: float, batch_id: str) -> str:
    raw = f"{port_code}|{work_date}|{vessel_name}|{mmsi}|{draft}|{required_depth}|{batch_id}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def _naive(dt) -> datetime:
    if isinstance(dt, datetime) and dt.tzinfo is not None:
        return dt.replace(tzinfo=None)
    return dt


def _query_tide_samples(db: Session, port_code: str,
                        start: datetime, end: datetime) -> List[TideSample]:
    s = _naive(start); e = _naive(end)
    rows = db.query(TideRecord).filter(
        TideRecord.port_code == port_code,
    ).all()
    out = []
    for r in rows:
        rt = _naive(r.record_time)
        if s <= rt <= e:
            out.append(TideSample(time=rt, height=r.tide_height, source_id=r.id))
    out.sort(key=lambda x: x.time)
    return out


def _query_water_samples(db: Session, port_code: str,
                         start: datetime, end: datetime) -> List[WaterSample]:
    s = _naive(start); e = _naive(end)
    rows = db.query(WaterQualityRecord).filter(
        WaterQualityRecord.port_code == port_code,
    ).all()
    out = []
    for r in rows:
        rt = _naive(r.record_time)
        if s <= rt <= e:
            out.append(WaterSample(
                time=rt, depth=r.water_depth or 0.0,
                water_level=r.water_level, source_id=r.id,
                temp=r.temperature, salinity=r.salinity,
            ))
    out.sort(key=lambda x: x.time)
    return out


def compute_or_get_tide_window(db: Session, req: TideWindowCalcRequest,
                               force_recompute: bool = False) -> Tuple[TideWindowResult, str, bool]:
    result_no = generate_result_no(
        req.port_code, req.work_date, req.vessel_name, req.mmsi or ""
    )
    existing = db.query(TideWindowResult).filter(
        TideWindowResult.result_no == result_no
    ).first()

    current_hash = _build_hash(
        req.port_code, req.work_date, req.vessel_name, req.mmsi or "",
        req.draft, req.required_depth, req.batch_id or "",
    )

    if existing and not force_recompute:
        stored_hash = None
        if existing.calc_params and isinstance(existing.calc_params, dict):
            stored_hash = existing.calc_params.get("input_hash")
        if stored_hash == current_hash:
            return existing, "", False

    start_dt = datetime.combine(req.work_date, datetime.min.time())
    end_dt = start_dt + timedelta(hours=req.time_window_hours)

    tides = _query_tide_samples(db, req.port_code, start_dt, end_dt)
    waters = _query_water_samples(db, req.port_code, start_dt, end_dt)

    calc = calculate_tide_window(
        tide_samples=tides,
        water_samples=waters,
        draft=req.draft,
        required_depth=req.required_depth,
        under_keel_margin=getattr(req, "under_keel_margin", 0.5),
        work_date=start_dt,
        time_window_hours=req.time_window_hours,
    )
    classification = classify_result_data(calc)

    calc_params_dict = {
        "input_hash": current_hash,
        "draft": req.draft,
        "required_depth": req.required_depth,
        "under_keel_margin": getattr(req, "under_keel_margin", 0.5),
        "time_window_hours": req.time_window_hours,
        "formula_scope": classification.get("formula_scope", ""),
    }

    if existing:
        old_status = existing.data_status
        existing.window_start = calc.window_start
        existing.window_end = calc.window_end
        existing.window_duration_min = calc.window_duration_min
        existing.min_depth = calc.min_depth
        existing.max_depth = calc.max_depth
        existing.avg_depth = calc.avg_depth
        existing.under_keel_clearance = calc.under_keel_clearance
        existing.tide_height_at_start = calc.tide_height_at_start
        existing.tide_height_at_end = calc.tide_height_at_end
        existing.negative_depth_count = calc.negative_depth_count
        existing.tide_water_match_score = calc.tide_water_match_score
        existing.data_status = calc.data_status
        existing.available_flag = calc.available_flag
        existing.pending_reason = calc.pending_reason
        existing.recollect_reason = calc.recollect_reason
        existing.failure_reason = calc.failure_reason
        existing.formula_used = calc.formula_used
        existing.formula_note = calc.formula_note
        existing.calc_params = calc_params_dict
        existing.source_tide_ids = calc.diagnostics.matched_tide_ids or None
        existing.source_water_ids = calc.diagnostics.matched_water_ids or None
        existing.batch_id = req.batch_id or existing.batch_id
        db.flush()

        log = CorrectionAuditLog(
            result_id=existing.id,
            operator=req.operator or "system",
            action="recompute",
            old_status=old_status,
            new_status=calc.data_status,
            change_summary=f"重算：旧状态={old_status} → 新状态={calc.data_status}，"
                           f"负深度={calc.negative_depth_count}，匹配度={calc.tide_water_match_score:.0f}%",
            remark="自动重算：输入参数或底层数据变更" + (f"（批次{req.batch_id}）" if req.batch_id else ""),
        )
        db.add(log)
        db.flush()
        return existing, classification["summary_text"], True

    obj = TideWindowResult(
        result_no=result_no,
        port_code=req.port_code,
        port_name=req.port_name,
        vessel_name=req.vessel_name,
        mmsi=req.mmsi,
        work_date=req.work_date,
        required_depth=req.required_depth,
        draft=req.draft,
        window_start=calc.window_start,
        window_end=calc.window_end,
        window_duration_min=calc.window_duration_min,
        min_depth=calc.min_depth,
        max_depth=calc.max_depth,
        avg_depth=calc.avg_depth,
        under_keel_clearance=calc.under_keel_clearance,
        tide_height_at_start=calc.tide_height_at_start,
        tide_height_at_end=calc.tide_height_at_end,
        negative_depth_count=calc.negative_depth_count,
        tide_water_match_score=calc.tide_water_match_score,
        data_status=calc.data_status,
        available_flag=calc.available_flag,
        pending_reason=calc.pending_reason,
        recollect_reason=calc.recollect_reason,
        failure_reason=calc.failure_reason,
        formula_used=calc.formula_used,
        formula_note=calc.formula_note,
        calc_params=calc_params_dict,
        source_tide_ids=calc.diagnostics.matched_tide_ids or None,
        source_water_ids=calc.diagnostics.matched_water_ids or None,
        batch_id=req.batch_id,
    )
    db.add(obj)
    db.flush()

    log = CorrectionAuditLog(
        result_id=obj.id,
        operator=req.operator or "system",
        action="create",
        new_status=calc.data_status,
        change_summary=f"初始计算：状态={calc.data_status}，负深度={calc.negative_depth_count}，匹配度={calc.tide_water_match_score:.0f}%",
        remark="首次自动计算" + (f"（批次{req.batch_id}）" if req.batch_id else ""),
    )
    db.add(log)
    db.flush()

    return obj, classification["summary_text"], True


def apply_manual_correction(db: Session, req: ManualCorrectionRequest,
                            ip_address: str = "") -> Optional[TideWindowResult]:
    result = db.query(TideWindowResult).filter(TideWindowResult.id == req.result_id).first()
    if not result:
        return None

    old_status = result.data_status
    old_values: Dict[str, Any] = {}

    if req.field_name and req.new_value is not None:
        if hasattr(result, req.field_name):
            old_val = getattr(result, req.field_name)
            old_values[req.field_name] = old_val
            try:
                if isinstance(old_val, (int, float)) and not isinstance(old_val, bool):
                    new_val = type(old_val)(req.new_value)
                else:
                    new_val = req.new_value
                setattr(result, req.field_name, new_val)
            except Exception:
                pass

    if req.new_status and req.new_status != old_status:
        result.data_status = req.new_status
        if req.new_status == DataStatus.CONFIRMED:
            result.available_flag = True
            result.confirmed_by = req.operator
            result.confirmed_at = func.now()
        elif req.new_status == DataStatus.AVAILABLE:
            result.available_flag = True
        else:
            result.available_flag = (req.new_status == DataStatus.AVAILABLE)

    summary_parts = []
    if old_values:
        for k, v in old_values.items():
            summary_parts.append(f"{k}: {v} → {getattr(result, k)}")
    if req.new_status and req.new_status != old_status:
        summary_parts.append(f"状态 {old_status} → {req.new_status}")
    if req.change_summary:
        summary_parts.append(req.change_summary)

    log = CorrectionAuditLog(
        result_id=result.id,
        operator=req.operator,
        action="manual_correct" if req.field_name else (
            "status_change" if req.new_status else "update"
        ),
        field_name=req.field_name,
        old_value=old_values if old_values else None,
        new_value={req.field_name: getattr(result, req.field_name)} if req.field_name else None,
        old_status=old_status,
        new_status=result.data_status,
        change_summary="；".join(summary_parts) if summary_parts else None,
        remark=req.remark,
        ip_address=ip_address or None,
    )
    db.add(log)
    db.flush()
    return result


def confirm_result(db: Session, result_id: int, operator: str,
                   remark: str = "") -> Optional[TideWindowResult]:
    result = db.query(TideWindowResult).filter(TideWindowResult.id == result_id).first()
    if not result:
        return None
    old_status = result.data_status
    result.data_status = DataStatus.CONFIRMED
    result.available_flag = True
    result.confirmed_by = operator
    result.confirmed_at = func.now()

    log = CorrectionAuditLog(
        result_id=result.id,
        operator=operator,
        action="confirm",
        old_status=old_status,
        new_status=DataStatus.CONFIRMED,
        change_summary=f"海事安全员复核通过：{old_status} → confirmed",
        remark=remark or "人工复核通过，数据可用",
    )
    db.add(log)
    db.flush()
    return result


def list_results(db: Session, port_code: Optional[str] = None,
                 work_date_from: Optional[date] = None,
                 work_date_to: Optional[date] = None,
                 data_status: Optional[str] = None,
                 vessel_name: Optional[str] = None,
                 page: int = 1, page_size: int = 20,
                 order_by: str = "-work_date") -> Tuple[List[TideWindowResult], int, int]:
    q = db.query(TideWindowResult)
    if port_code:
        q = q.filter(TideWindowResult.port_code == port_code)
    if work_date_from:
        q = q.filter(TideWindowResult.work_date >= work_date_from)
    if work_date_to:
        q = q.filter(TideWindowResult.work_date <= work_date_to)
    if data_status:
        q = q.filter(TideWindowResult.data_status == data_status)
    if vessel_name:
        q = q.filter(TideWindowResult.vessel_name.ilike(f"%{vessel_name}%"))

    total = q.count()
    total_pages = (total + page_size - 1) // page_size

    if order_by.startswith("-"):
        q = q.order_by(desc(getattr(TideWindowResult, order_by[1:], TideWindowResult.work_date)))
    else:
        q = q.order_by(asc(getattr(TideWindowResult, order_by, TideWindowResult.work_date)))

    q = q.offset((page - 1) * page_size).limit(page_size)
    return q.all(), total, total_pages


def get_result_with_logs(db: Session, result_id: int) -> Optional[TideWindowResult]:
    return (
        db.query(TideWindowResult)
        .filter(TideWindowResult.id == result_id)
        .first()
    )


def list_audit_logs(db: Session, result_id: int) -> List[CorrectionAuditLog]:
    return (
        db.query(CorrectionAuditLog)
        .filter(CorrectionAuditLog.result_id == result_id)
        .order_by(desc(CorrectionAuditLog.created_at))
        .all()
    )


def dashboard_stats(db: Session) -> Dict[str, Any]:
    today = date.today()
    q_all = db.query(TideWindowResult)
    q_today = q_all.filter(TideWindowResult.work_date == today)

    status_counts = dict(
        db.query(TideWindowResult.data_status, func.count(TideWindowResult.id))
        .group_by(TideWindowResult.data_status).all()
    )

    neg_count = (
        db.query(func.sum(TideWindowResult.negative_depth_count))
        .filter(TideWindowResult.negative_depth_count > 0).scalar() or 0
    )

    seven_days_ago = today - timedelta(days=7)
    daily = (
        db.query(
            TideWindowResult.work_date,
            TideWindowResult.data_status,
            func.count(TideWindowResult.id),
        )
        .filter(TideWindowResult.work_date >= seven_days_ago)
        .group_by(TideWindowResult.work_date, TideWindowResult.data_status)
        .all()
    )
    trend_map: Dict[str, Dict[str, int]] = {}
    for d, s, c in daily:
        key = d.strftime("%Y-%m-%d")
        trend_map.setdefault(key, {})[s] = int(c)
    trend = [{"date": k, **v} for k, v in sorted(trend_map.items())]

    return {
        "status_stats": {
            "available": int(status_counts.get("available", 0)),
            "pending": int(status_counts.get("pending", 0)),
            "recollect": int(status_counts.get("recollect", 0)),
            "confirmed": int(status_counts.get("confirmed", 0)),
            "total": q_all.count(),
        },
        "today_calc_count": q_today.count(),
        "negative_depth_alerts": int(neg_count),
        "pending_review_count": int(status_counts.get("pending", 0)),
        "last_7_days_trend": trend,
    }


def list_formulas() -> List[Dict[str, Any]]:
    return [
        {
            "key": f.key,
            "name": f.name,
            "formula": f.formula,
            "unit": f.unit,
            "scope": f.scope,
            "failure_modes": f.failure_modes,
            "description": f.description,
        }
        for f in FORMULA_REGISTRY.values()
    ]
