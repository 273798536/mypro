"""核心业务服务层：组装处理记录的全流程。"""
import re
import uuid
from datetime import datetime
from typing import Dict, Any, Tuple, List
from sqlalchemy.orm import Session
from . import models, schemas
from .utils.temp_units import parse_temperature, detect_temp_unit_mix
from .utils.concentration import calculate_final_concentration, analyze_weighing_precision
from .utils.spectrum import detect_peak_overlaps, generate_spectrum_points


STATUS_FLOW = {
    "imported": {"next": "reviewing", "label": "已导入"},
    "reviewing": {"next": "reviewed", "label": "复核中"},
    "reviewed": {"next": "pending_export", "label": "复核通过"},
    "pending_export": {"next": "exported", "label": "待导出"},
    "exported": {"next": None, "label": "已导出"},
}

STATUS_ALLOW_BACK = {"reviewing": "imported", "reviewed": "reviewing", "pending_export": "reviewed"}


def generate_record_no() -> str:
    """生成格式为 EZS-YYYYMMDD-HHMMSS-XXXX 的记录号。"""
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    tail = uuid.uuid4().hex[:4].upper()
    return f"EZS-{ts}-{tail}"


def _add_status_log(db: Session, record_id: int, from_s: str, to_s: str, operator: str, note: str = None):
    log = models.StatusLog(
        record_id=record_id,
        from_status=from_s,
        to_status=to_s,
        operator=operator,
        operation_note=note,
    )
    db.add(log)


def _add_audit(db: Session, record_id: int, action: str, field_name: str = None,
               old_value: str = None, new_value: str = None, operator: str = None, note: str = None):
    trail = models.AuditTrail(
        record_id=record_id,
        action_type=action,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
        operator=operator or "system",
        trace_note=note,
    )
    db.add(trail)


def _normalize_condition(c: Dict[str, Any], row_idx: int) -> models.ReactionCondition:
    """归一化反应条件：重点处理温度。"""
    name = c.get("condition_name") or f"条件{row_idx + 1}"
    raw_val = c.get("condition_value") or ""
    raw_unit = c.get("unit") or ""

    is_temp = bool(re.search(r"温度|temp", name, re.IGNORECASE))

    cond = models.ReactionCondition(
        condition_name=name,
        condition_value=str(raw_val),
        unit=raw_unit if raw_unit else None,
        row_order=c.get("row_order") or (row_idx + 1),
        review_note=c.get("review_note"),
    )

    # 提取数值
    m = re.search(r"-?\d+(?:\.\d+)?", str(raw_val))
    if m:
        try:
            cond.numeric_value = float(m.group(0))
        except ValueError:
            pass

    if is_temp:
        parsed = parse_temperature(str(raw_val), raw_unit or None)
        cond.normalized_value = parsed["normalized_value"]
        cond.normalized_unit = parsed["normalized_unit"]
        if not cond.unit:
            cond.unit = parsed["unit"]
        cond.is_unit_missing = parsed["has_unit_missing"]
        cond.is_unit_mismatch = parsed["has_unit_mismatch"]
        cond.issue_description = parsed["issue_description"]
        if parsed["normalized_value"] is not None and (parsed["normalized_value"] > 150 or parsed["normalized_value"] < -50):
            cond.is_abnormal = True
    else:
        # 非温度条件也检查单位缺失
        if m and not raw_unit and name not in ("pH值", "pH", "ph"):
            cond.is_unit_missing = True
            cond.issue_description = c.get("issue_description") or "非无量纲条件未填写单位"
        else:
            cond.issue_description = c.get("issue_description")

    return cond


def _normalize_substrate(s: Dict[str, Any], row_idx: int) -> models.SubstrateConversion:
    sub = models.SubstrateConversion(
        substrate_name=s.get("substrate_name") or f"底物{row_idx + 1}",
        cas_no=s.get("cas_no"),
        initial_mass=s.get("initial_mass"),
        initial_mass_unit=s.get("initial_mass_unit") or None,
        volume=s.get("volume"),
        volume_unit=s.get("volume_unit") or None,
        molecular_weight=s.get("molecular_weight"),
        purity=s.get("purity") or 100.0,
        final_concentration_unit=s.get("final_concentration_unit") or "mmol/L",
        conversion_note=s.get("conversion_note"),
        row_order=s.get("row_order") or (row_idx + 1),
    )

    if (sub.initial_mass is not None and sub.volume is not None
            and sub.initial_mass_unit and sub.volume_unit
            and sub.molecular_weight and sub.molecular_weight > 0):
        result = calculate_final_concentration(
            mass=sub.initial_mass,
            mass_unit=sub.initial_mass_unit,
            volume=sub.volume,
            volume_unit=sub.volume_unit,
            molecular_weight=sub.molecular_weight,
            purity_percent=sub.purity,
            target_unit=sub.final_concentration_unit,
        )
        sub.final_concentration = result["final_concentration"]
        sub.conversion_formula = result["formula"]
        if result["note"]:
            sub.conversion_note = (sub.conversion_note or "") + result["note"]
        if result["error"]:
            sub.conversion_note = (sub.conversion_note or "") + f" [换算异常] {result['error']}"

    # 称量精度分析
    if sub.initial_mass is not None and sub.initial_mass_unit:
        wp = analyze_weighing_precision(
            mass=sub.initial_mass,
            mass_unit=sub.initial_mass_unit,
            molecular_weight=sub.molecular_weight,
        )
        sub.is_weighing_insufficient = wp["is_insufficient"]
        sub.weighing_precision = wp["precision_level"]
        sub.weighing_issue_explain = wp["plain_explain"]

    return sub


def _normalize_spectrum(sp: Dict[str, Any], row_idx: int) -> models.SpectrumData:
    spec = models.SpectrumData(
        spectrum_type=sp.get("spectrum_type") or "HPLC",
        detection_wavelength=sp.get("detection_wavelength"),
        column_info=sp.get("column_info"),
        retention_time=sp.get("retention_time"),
        peak_area=sp.get("peak_area"),
        peak_height=sp.get("peak_height"),
        peak_name=sp.get("peak_name") or f"峰{row_idx + 1}",
        is_overlap=bool(sp.get("is_overlap")),
        overlap_with=sp.get("overlap_with"),
        overlap_severity=sp.get("overlap_severity"),
        overlap_note=sp.get("overlap_note"),
        interpretation=sp.get("interpretation"),
        interpretation_linked=sp.get("interpretation_linked", True),
        row_order=sp.get("row_order") or (row_idx + 1),
    )
    if spec.retention_time is not None and spec.peak_height:
        spec.raw_data_json = {"points": generate_spectrum_points(spec.retention_time, spec.peak_height)}
    else:
        spec.raw_data_json = sp.get("raw_data_json")
    return spec


def create_processing_record(db: Session, data: Dict[str, Any], operator: str = "system") -> models.ProcessingRecord:
    """
    创建一条完整处理记录。
    data 结构同 build_sample_record / parse_old_excel 的返回。
    """
    record_no = generate_record_no()
    record = models.ProcessingRecord(
        record_no=record_no,
        batch_no=data.get("batch_no") or f"B{datetime.now().strftime('%Y%m%d%H%M')}",
        material_name=data.get("material_name") or "酶促反应底物换算",
        status="imported",
        source_file_name=data.get("source_file_name"),
        source_format=data.get("source_format") or "manual",
        remark=data.get("remark"),
        supplementary_note=data.get("supplementary_note"),
        safety_note=data.get("safety_note"),
        processing_opinion=data.get("processing_opinion"),
    )
    db.add(record)
    db.flush()

    # 反应条件
    for i, c in enumerate(data.get("reaction_conditions", [])):
        cond = _normalize_condition(c, i)
        cond.record_id = record.id
        db.add(cond)

    # 底物换算
    for i, s in enumerate(data.get("substrate_conversions", [])):
        sub = _normalize_substrate(s, i)
        sub.record_id = record.id
        db.add(sub)

    # 谱图数据
    spec_objs = []
    for i, sp in enumerate(data.get("spectrum_data", [])):
        spec = _normalize_spectrum(sp, i)
        spec.record_id = record.id
        db.add(spec)
        spec_objs.append(spec)

    db.flush()

    # 二次分析：温度混用 / 谱峰重叠 / 称量问题 / 漏填单位
    temp_mix, temp_detail = detect_temp_unit_mix(record.reaction_conditions)
    record.has_temp_unit_mix = temp_mix
    record.temp_unit_issue_detail = temp_detail or None

    overlaps = detect_peak_overlaps(spec_objs)
    if overlaps:
        record.has_peak_overlap = True
        peak_map = {}
        for o in overlaps:
            if o.get("peak_a_id"):
                peak_map.setdefault(o["peak_a_id"], []).append(o["note"])
            if o.get("peak_b_id"):
                peak_map.setdefault(o["peak_b_id"], []).append(o["note"])
        for s in spec_objs:
            if s.id in peak_map:
                s.is_overlap = True
                if s.overlap_note:
                    s.overlap_note += " | " + "；".join(peak_map[s.id])
                else:
                    s.overlap_note = "；".join(peak_map[s.id])
                if not s.overlap_severity:
                    matched = next((o for o in overlaps if o.get("peak_a_id") == s.id or o.get("peak_b_id") == s.id), None)
                    if matched:
                        s.overlap_severity = matched["severity"]
                        s.overlap_with = matched["peak_b"] if matched.get("peak_a_id") == s.id else matched["peak_a"]
        record.peak_overlap_detail = {"count": len(overlaps), "overlaps": overlaps}

    weighing_issues = []
    for s in record.substrate_conversions:
        if s.is_weighing_insufficient:
            weighing_issues.append({
                "substrate": s.substrate_name,
                "precision": s.weighing_precision,
                "explain": s.weighing_issue_explain,
            })
    if weighing_issues:
        record.has_weighing_issue = True
        record.weighing_issue_detail = {"count": len(weighing_issues), "items": weighing_issues}

    missing_units = []
    for c in record.reaction_conditions:
        if c.is_unit_missing:
            missing_units.append({"type": "reaction_condition", "name": c.condition_name, "issue": c.issue_description})
    for s in record.substrate_conversions:
        if s.initial_mass is not None and not s.initial_mass_unit:
            missing_units.append({"type": "substrate", "name": s.substrate_name, "issue": f"称样量单位缺失"})
        if s.volume is not None and not s.volume_unit:
            missing_units.append({"type": "substrate", "name": s.substrate_name, "issue": f"体积单位缺失"})
    record.missing_unit_fields = missing_units or None

    # 状态 + 审计
    _add_status_log(db, record.id, None, "imported", operator, "创建处理记录")
    _add_audit(db, record.id, "import", operator=operator, note=f"导入记录号{record_no}")

    db.commit()
    db.refresh(record)
    return record


def get_record_detail(db: Session, record_id: int) -> models.ProcessingRecord:
    return db.query(models.ProcessingRecord).filter(models.ProcessingRecord.id == record_id).first()


def list_records(db: Session, status: str = None, keyword: str = None,
                 skip: int = 0, limit: int = 50) -> Tuple[int, List[models.ProcessingRecord]]:
    q = db.query(models.ProcessingRecord)
    if status:
        q = q.filter(models.ProcessingRecord.status == status)
    if keyword:
        like = f"%{keyword}%"
        q = q.filter(
            (models.ProcessingRecord.record_no.like(like))
            | (models.ProcessingRecord.batch_no.like(like))
            | (models.ProcessingRecord.material_name.like(like))
        )
    total = q.count()
    items = q.order_by(models.ProcessingRecord.created_at.desc()).offset(skip).limit(limit).all()
    return total, items


def transition_status(db: Session, record_id: int, operator: str, direction: str = "next",
                      note: str = None) -> Tuple[bool, str, models.ProcessingRecord]:
    """推进或回退状态。direction: next/back"""
    record = get_record_detail(db, record_id)
    if not record:
        return False, "记录不存在", None

    old = record.status
    if direction == "next":
        info = STATUS_FLOW.get(old)
        if not info or not info["next"]:
            return False, f"当前状态「{old}」无法继续推进", record
        new = info["next"]
    elif direction == "back":
        new = STATUS_ALLOW_BACK.get(old)
        if not new:
            return False, f"当前状态「{old}」无法回退", record
    else:
        return False, "direction 参数无效", record

    record.status = new
    _add_status_log(db, record.id, old, new, operator, note)
    _add_audit(db, record.id, f"status_{direction}", field_name="status",
               old_value=str(old), new_value=str(new), operator=operator, note=note)

    if new == "reviewed":
        record.reviewed_at = datetime.utcnow()
        record.reviewer = operator
    if new == "exported":
        record.exported_at = datetime.utcnow()
        record.exporter = operator

    db.commit()
    db.refresh(record)
    return True, f"{old} → {new}", record


def submit_review(db: Session, record_id: int, payload: schemas.ReviewSubmitIn) -> Tuple[bool, str, models.ProcessingRecord]:
    record = get_record_detail(db, record_id)
    if not record:
        return False, "记录不存在", None
    if record.status not in ("imported", "reviewing"):
        return False, f"当前状态「{record.status}」不允许提交复核", record

    if payload.processing_opinion is not None:
        record.processing_opinion = payload.processing_opinion
    if payload.safety_note is not None:
        record.safety_note = payload.safety_note
    if payload.supplementary_note is not None:
        record.supplementary_note = payload.supplementary_note

    # 逐项复核备注
    if payload.reaction_condition_reviews:
        for cond in record.reaction_conditions:
            if cond.id in payload.reaction_condition_reviews:
                cond.review_note = payload.reaction_condition_reviews[cond.id]
                _add_audit(db, record.id, "review", field_name=f"cond_{cond.id}",
                           operator=payload.reviewer, note=f"条件复核：{cond.review_note}")

    if payload.spectrum_interpretations:
        for sp in record.spectrum_data:
            if sp.id in payload.spectrum_interpretations:
                sp.interpretation = payload.spectrum_interpretations[sp.id]
                _add_audit(db, record.id, "review", field_name=f"spectrum_{sp.id}",
                           operator=payload.reviewer, note=f"谱图判读更新：{sp.interpretation}")

    # 状态推进
    ok, msg, record = transition_status(db, record_id, payload.reviewer, "next",
                                        "复核通过" if payload.pass_review else "复核提交但未通过，待补正")
    if not ok and record.status == "reviewing":
        db.commit()
        db.refresh(record)
        ok, msg = True, "复核意见已保存"

    if not record.reviewer:
        record.reviewer = payload.reviewer
        record.reviewed_at = datetime.utcnow()
        db.commit()
        db.refresh(record)

    return True, "复核提交成功" if payload.pass_review else "复核意见已保存（未通过，需补正）", record
