from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, List
from datetime import datetime
from . import models, schemas
from .models import RecordStatus


def get_buffer_records(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    keyword: Optional[str] = None,
) -> List[models.BufferRecord]:
    query = db.query(models.BufferRecord)
    if status:
        query = query.filter(models.BufferRecord.status == status)
    if keyword:
        like = f"%{keyword}%"
        query = query.filter(
            (models.BufferRecord.batch_no.like(like)) |
            (models.BufferRecord.buffer_name.like(like))
        )
    return query.order_by(models.BufferRecord.created_at.desc()).offset(skip).limit(limit).all()


def get_buffer_record(db: Session, record_id: int) -> Optional[models.BufferRecord]:
    return db.query(models.BufferRecord).filter(models.BufferRecord.id == record_id).first()


def find_duplicate_record(db: Session, batch_no: str, record_date: str) -> Optional[models.BufferRecord]:
    return db.query(models.BufferRecord).filter(
        and_(
            models.BufferRecord.batch_no == batch_no,
            models.BufferRecord.record_date == record_date,
        )
    ).first()


def _calc_theoretical_mass(comp: schemas.BufferComponentCreate, volume: float) -> float:
    return round(comp.molar_mass * comp.target_concentration * volume / comp.purity, 4)


def _calc_weighing_check(w: schemas.WeighingRecordCreate) -> schemas.WeighingRecordCreate:
    if w.theoretical_mass and w.theoretical_mass > 0:
        err = abs(w.actual_mass - w.theoretical_mass) / w.theoretical_mass * 100
        w.error_pct = round(err, 3)
        w.is_pass = err <= w.tolerance_pct
    return w


def create_buffer_record(
    db: Session,
    data: schemas.BufferRecordCreate,
    skip_duplicate_check: bool = False,
) -> models.BufferRecord:
    if not skip_duplicate_check:
        dup = find_duplicate_record(db, data.batch_no, data.record_date)
        if dup:
            raise ValueError(f"批次 {data.batch_no} 在 {data.record_date} 已存在记录，禁止重复导入")

    comps_data = []
    for c in data.components or []:
        c.theoretical_mass = _calc_theoretical_mass(c, data.target_volume)
        comps_data.append(models.BufferComponent(**c.model_dump()))

    temp_data = [models.TemperaturePoint(**t.model_dump()) for t in (data.temperature_points or [])]

    weighing_data = []
    for w in data.weighing_records or []:
        w_checked = _calc_weighing_check(w)
        weighing_data.append(models.WeighingRecord(**w_checked.model_dump()))

    if weighing_data:
        data.precision_pass = all(w.is_pass for w in weighing_data if w.is_pass is not None)

    if temp_data:
        temp_pass = all(abs(t.actual_temp - t.set_temp) <= 2.0 for t in temp_data)
        data.temp_curve_pass = temp_pass

    record = models.BufferRecord(
        **{k: v for k, v in data.model_dump().items()
           if k not in ("components", "temperature_points", "weighing_records")},
        components=comps_data,
        temperature_points=temp_data,
        weighing_records=weighing_data,
    )
    db.add(record)
    db.flush()

    log = models.StatusLog(
        record_id=record.id,
        from_status="",
        to_status=record.status,
        operator=data.operator,
        remark="创建记录",
    )
    db.add(log)
    db.commit()
    db.refresh(record)
    return record


def update_buffer_record(
    db: Session,
    record_id: int,
    data: schemas.BufferRecordUpdate,
) -> Optional[models.BufferRecord]:
    record = get_buffer_record(db, record_id)
    if not record:
        return None

    update_data = data.model_dump(exclude_unset=True)

    if "components" in update_data:
        comps_data = update_data.pop("components") or []
        for c in comps_data:
            if not c.get("theoretical_mass"):
                c["theoretical_mass"] = _calc_theoretical_mass(
                    schemas.BufferComponentCreate(**c), record.target_volume
                )
        record.components.clear()
        for c in comps_data:
            record.components.append(models.BufferComponent(**c))

    if "temperature_points" in update_data:
        tps = update_data.pop("temperature_points") or []
        record.temperature_points.clear()
        for t in tps:
            record.temperature_points.append(models.TemperaturePoint(**t))
        if tps:
            record.temp_curve_pass = all(
                abs(t["actual_temp"] - t["set_temp"]) <= 2.0 for t in tps
            )

    if "weighing_records" in update_data:
        ws = update_data.pop("weighing_records") or []
        record.weighing_records.clear()
        for w in ws:
            w_checked = _calc_weighing_check(schemas.WeighingRecordCreate(**w))
            record.weighing_records.append(models.WeighingRecord(**w_checked.model_dump()))
        if ws:
            record.precision_pass = all(
                w.is_pass for w in record.weighing_records if w.is_pass is not None
            )

    for key, val in update_data.items():
        setattr(record, key, val)

    record.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(record)
    return record


def transition_status(
    db: Session,
    record_id: int,
    data: schemas.StatusTransition,
) -> Optional[models.BufferRecord]:
    record = get_buffer_record(db, record_id)
    if not record:
        return None

    allowed = RecordStatus.TRANSITIONS.get(record.status, [])
    if data.target_status not in allowed:
        raise ValueError(
            f"状态 {record.status} 不允许直接变更为 {data.target_status}，"
            f"允许的目标状态: {allowed}"
        )

    if data.target_status == RecordStatus.REVIEWING:
        if record.weighing_records and not record.precision_pass:
            raise ValueError("存在称量精度不合格项，不能进入复核，请先处理精度问题")
        if record.temperature_points and not record.temp_curve_pass:
            raise ValueError("温度曲线偏差超过 ±2℃，请先修正或备注")

    log = models.StatusLog(
        record_id=record.id,
        from_status=record.status,
        to_status=data.target_status,
        operator=data.operator,
        remark=data.remark,
    )
    db.add(log)
    record.status = data.target_status
    record.updated_at = datetime.utcnow()

    if data.target_status == RecordStatus.REPORTED:
        record.reported_at = datetime.utcnow()

    db.commit()
    db.refresh(record)
    return record


def delete_buffer_record(db: Session, record_id: int) -> bool:
    record = get_buffer_record(db, record_id)
    if not record:
        return False
    db.delete(record)
    db.commit()
    return True


def calc_concentration(req: schemas.ConcentrationCalcRequest) -> schemas.ConcentrationCalcResponse:
    note = ""
    conc = req.concentration_mol
    mass = req.mass_g

    if conc is None and mass is None:
        raise ValueError("浓度(mol/L)和质量(g)至少提供一个")

    if conc is None:
        conc = round(mass / (req.molar_mass * req.volume_l), 6)
        note = f"由质量反推浓度: {mass}g / ({req.molar_mass}g/mol × {req.volume_l}L)"
    elif mass is None:
        mass = round(conc * req.molar_mass * req.volume_l, 4)
        note = f"由浓度计算质量: {conc}mol/L × {req.molar_mass}g/mol × {req.volume_l}L"
    else:
        expected = round(conc * req.molar_mass * req.volume_l, 4)
        diff = abs(mass - expected)
        note = f"两者均提供，理论对应质量={expected}g，差值={round(diff, 4)}g"

    return schemas.ConcentrationCalcResponse(
        concentration_mol=conc,
        mass_g=mass,
        molar_mass=req.molar_mass,
        volume_l=req.volume_l,
        note=note,
    )


def calc_balance(req: schemas.BalanceCalcRequest) -> schemas.BalanceCalcResponse:
    delta_ph = req.target_ph - req.acid_pka
    ratio = 10 ** delta_ph
    acid_conc = round(req.total_concentration / (1 + ratio), 6)
    salt_conc = round(req.total_concentration - acid_conc, 6)
    acid_mass = round(acid_conc * req.acid_molar_mass * req.volume_l, 4)
    salt_mass = round(salt_conc * req.salt_molar_mass * req.volume_l, 4)
    note = (
        f"Henderson-Hasselbalch: pH = pKa + log([A⁻]/[HA])\n"
        f"{req.target_ph} = {req.acid_pka} + log(ratio) → ratio = {round(ratio, 4)}\n"
        f"[HA] = {acid_conc} mol/L, [A⁻] = {salt_conc} mol/L"
    )
    return schemas.BalanceCalcResponse(
        target_ph=req.target_ph,
        acid_pka=req.acid_pka,
        ratio_base_acid=round(ratio, 4),
        acid_concentration=acid_conc,
        salt_concentration=salt_conc,
        acid_mass_g=acid_mass,
        salt_mass_g=salt_mass,
        acid_name=req.acid_name,
        salt_name=req.salt_name,
        note=note,
    )


def build_report_content(record: models.BufferRecord) -> dict:
    status_map = {
        RecordStatus.DRAFT: "草稿",
        RecordStatus.IMPORTED: "已导入",
        RecordStatus.REVIEWING: "复核中",
        RecordStatus.CONFIRMED: "已确认",
        RecordStatus.REPORTED: "已报告",
    }
    precision_summary = "未检测" if record.precision_pass is None else ("通过" if record.precision_pass else "不合格")
    temp_summary = "未检测" if record.temp_curve_pass is None else ("通过" if record.temp_curve_pass else "不合格")

    return {
        "batch_no": record.batch_no,
        "record_date": record.record_date,
        "buffer_name": record.buffer_name,
        "target_ph": record.target_ph,
        "actual_ph": record.actual_ph,
        "target_volume": record.target_volume,
        "actual_volume": record.actual_volume,
        "operator": record.operator,
        "reviewer": record.reviewer,
        "status": status_map.get(record.status, record.status),
        "precision_summary": precision_summary,
        "temp_summary": temp_summary,
        "precision_pass": record.precision_pass,
        "temp_curve_pass": record.temp_curve_pass,
        "remark": record.remark,
        "components": [
            {
                "reagent_name": c.reagent_name,
                "formula": c.formula,
                "molar_mass": c.molar_mass,
                "target_concentration": c.target_concentration,
                "actual_concentration": c.actual_concentration,
                "theoretical_mass": c.theoretical_mass,
                "actual_mass": c.actual_mass,
                "purity": c.purity,
            }
            for c in record.components
        ],
        "temperature_points": [
            {"time_minute": t.time_minute, "set_temp": t.set_temp, "actual_temp": t.actual_temp}
            for t in record.temperature_points
        ],
        "weighing_records": [
            {
                "reagent_name": w.reagent_name,
                "theoretical_mass": w.theoretical_mass,
                "actual_mass": w.actual_mass,
                "tolerance_pct": w.tolerance_pct,
                "error_pct": w.error_pct,
                "is_pass": w.is_pass,
            }
            for w in record.weighing_records
        ],
        "reported_at": record.reported_at.isoformat() if record.reported_at else None,
    }
