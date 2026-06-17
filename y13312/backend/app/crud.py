import json
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from . import models, schemas


def get_samples(
    db: Session,
    skip: int = 0,
    limit: int = 20,
    status: str = None,
    has_label_conflict: bool = None,
    has_name_mismatch: bool = None,
    has_material_mismatch: bool = None,
    keyword: str = None,
    min_score: float = None,
    max_score: float = None,
):
    query = db.query(models.Sample)

    if status:
        query = query.filter(models.Sample.status == status)
    if has_label_conflict is not None:
        query = query.filter(models.Sample.has_label_conflict == has_label_conflict)
    if has_name_mismatch is not None:
        query = query.filter(models.Sample.has_name_mismatch == has_name_mismatch)
    if has_material_mismatch is not None:
        query = query.filter(models.Sample.has_material_mismatch == has_material_mismatch)
    if keyword:
        query = query.filter(
            or_(
                models.Sample.sample_no.like(f"%{keyword}%"),
                models.Sample.customer_name.like(f"%{keyword}%"),
                models.Sample.id_card.like(f"%{keyword}%"),
            )
        )
    if min_score is not None:
        query = query.filter(models.Sample.current_score >= min_score)
    if max_score is not None:
        query = query.filter(models.Sample.current_score <= max_score)

    total = query.count()
    items = query.order_by(models.Sample.updated_at.desc()).offset(skip).limit(limit).all()

    return total, items


def get_sample(db: Session, sample_id: int):
    return db.query(models.Sample).filter(models.Sample.id == sample_id).first()


def get_sample_by_no(db: Session, sample_no: str):
    return db.query(models.Sample).filter(models.Sample.sample_no == sample_no).first()


def create_sample(db: Session, sample: schemas.SampleCreate):
    db_sample = models.Sample(
        sample_no=sample.sample_no,
        customer_name=sample.customer_name,
        id_card=sample.id_card,
        original_score=sample.original_score,
        current_score=sample.current_score if sample.current_score else sample.original_score,
        status=sample.status,
        risk_level=sample.risk_level,
        has_label_conflict=sample.has_label_conflict,
        has_name_mismatch=sample.has_name_mismatch,
        has_material_mismatch=sample.has_material_mismatch,
    )
    db.add(db_sample)
    db.flush()

    for mat in sample.materials:
        db_mat = models.SampleMaterial(
            sample_id=db_sample.id,
            material_name=mat.material_name,
            material_type=mat.material_type,
            material_value=mat.material_value,
            source=mat.source,
            source_detail=mat.source_detail,
            is_original=mat.is_original,
            is_dirty=mat.is_dirty,
            is_name_mismatch=mat.is_name_mismatch,
            raw_value=mat.raw_value if mat.raw_value else mat.material_value,
        )
        db.add(db_mat)

    for lc in sample.label_conflicts:
        db_lc = models.LabelConflict(
            sample_id=db_sample.id,
            field_name=lc.field_name,
            field_label=lc.field_label,
            source_a=lc.source_a,
            value_a=lc.value_a,
            source_b=lc.source_b,
            value_b=lc.value_b,
            conflict_type=lc.conflict_type,
        )
        db.add(db_lc)

    snapshot_data = sample.model_dump() if hasattr(sample, 'model_dump') else sample.dict()
    db_snapshot = models.SampleSnapshot(
        sample_id=db_sample.id,
        snapshot_type="import_snapshot",
        snapshot_data=snapshot_data,
        created_by="system",
    )
    db.add(db_snapshot)

    db.commit()
    db.refresh(db_sample)
    return db_sample


def create_manual_adjustment(db: Session, sample_id: int, adjustment: schemas.ManualAdjustmentCreate):
    sample = get_sample(db, sample_id)
    if not sample:
        return None

    snapshot_data = {
        "sample_no": sample.sample_no,
        "customer_name": sample.customer_name,
        "current_score": sample.current_score,
        "status": sample.status,
        "risk_level": sample.risk_level,
        "materials": [
            {
                "material_name": m.material_name,
                "material_value": m.material_value,
                "source": m.source,
            }
            for m in sample.materials
        ],
    }

    db_adjustment = models.ManualAdjustment(
        sample_id=sample_id,
        adjuster=adjustment.adjuster,
        reason=adjustment.reason,
        score_before=sample.current_score,
        score_after=adjustment.score_after,
        status_before=sample.status,
        status_after=adjustment.status_after,
        risk_level_before=sample.risk_level,
        risk_level_after=adjustment.risk_level_after,
        source=adjustment.source,
        source_ref=adjustment.source_ref,
    )
    db.add(db_adjustment)
    db.flush()

    db_snapshot = models.SampleSnapshot(
        sample_id=sample_id,
        adjustment_id=db_adjustment.id,
        snapshot_type="before_adjustment",
        snapshot_data=snapshot_data,
        created_by=adjustment.adjuster,
    )
    db.add(db_snapshot)

    sample.current_score = adjustment.score_after
    sample.status = adjustment.status_after
    if adjustment.risk_level_after:
        sample.risk_level = adjustment.risk_level_after
    sample.adjustment_count = sample.adjustment_count + 1
    sample.review_count = sample.review_count + 1
    sample.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(db_adjustment)
    return db_adjustment


def get_adjustment_history(db: Session, sample_id: int):
    return (
        db.query(models.ManualAdjustment)
        .filter(models.ManualAdjustment.sample_id == sample_id)
        .order_by(models.ManualAdjustment.created_at.desc())
        .all()
    )


def get_review_stats(db: Session):
    total = db.query(func.count(models.Sample.id)).scalar()
    processed = db.query(func.count(models.Sample.id)).filter(models.Sample.status == "processed").scalar()
    material_missing = db.query(func.count(models.Sample.id)).filter(models.Sample.status == "material_missing").scalar()
    manual_adjusted = db.query(func.count(models.Sample.id)).filter(models.Sample.status == "manual_adjusted").scalar()
    pending_review = db.query(func.count(models.Sample.id)).filter(models.Sample.status == "pending_review").scalar()
    has_label_conflict = db.query(func.count(models.Sample.id)).filter(models.Sample.has_label_conflict == True).scalar()
    has_name_mismatch = db.query(func.count(models.Sample.id)).filter(models.Sample.has_name_mismatch == True).scalar()
    total_adjustments = db.query(func.count(models.ManualAdjustment.id)).scalar()

    score_changes = db.query(
        func.avg(models.ManualAdjustment.score_after - models.ManualAdjustment.score_before)
    ).scalar() or 0

    return {
        "total": total,
        "processed": processed,
        "material_missing": material_missing,
        "manual_adjusted": manual_adjusted,
        "pending_review": pending_review,
        "has_label_conflict": has_label_conflict,
        "has_name_mismatch": has_name_mismatch,
        "avg_score_change": round(score_changes, 2),
        "total_adjustments": total_adjustments,
    }


def get_anomaly_samples(db: Session, limit: int = 20):
    anomalies = []

    big_changes = (
        db.query(models.Sample)
        .filter(models.Sample.adjustment_count > 0)
        .all()
    )

    for sample in big_changes:
        if sample.original_score is not None and sample.current_score is not None:
            score_change = abs(sample.current_score - sample.original_score)
            if score_change >= 10 or sample.adjustment_count >= 2:
                anomaly_type = "大幅改判" if score_change >= 10 else "多次改判"
                reason_parts = []
                if score_change >= 10:
                    reason_parts.append(f"评分变动{score_change:.1f}分")
                if sample.adjustment_count >= 2:
                    reason_parts.append(f"被改判{sample.adjustment_count}次")
                if sample.has_label_conflict:
                    reason_parts.append("存在标签冲突")
                if sample.has_name_mismatch:
                    reason_parts.append("名称不一致")
                anomalies.append({
                    "id": sample.id,
                    "sample_no": sample.sample_no,
                    "customer_name": sample.customer_name,
                    "current_score": sample.current_score,
                    "original_score": sample.original_score,
                    "score_change": sample.current_score - sample.original_score,
                    "adjustment_count": sample.adjustment_count,
                    "anomaly_type": anomaly_type,
                    "anomaly_reason": "、".join(reason_parts),
                })

    anomalies.sort(key=lambda x: abs(x["score_change"]), reverse=True)
    return anomalies[:limit]


def export_samples(db: Session, status: str = None):
    query = db.query(models.Sample)
    if status:
        query = query.filter(models.Sample.status == status)
    samples = query.all()

    results = []
    for sample in samples:
        materials_data = {}
        for m in sample.materials:
            materials_data[m.material_name] = m.material_value

        conflict_fields = []
        for lc in sample.label_conflicts:
            conflict_fields.append(f"{lc.field_label}:{lc.source_a}={lc.value_a}/{lc.source_b}={lc.value_b}")

        results.append({
            "样本编号": sample.sample_no,
            "客户姓名": sample.customer_name,
            "身份证号": sample.id_card,
            "初始评分": sample.original_score,
            "当前评分": sample.current_score,
            "状态": sample.status,
            "风险等级": sample.risk_level,
            "是否有标签冲突": "是" if sample.has_label_conflict else "否",
            "是否有名称不一致": "是" if sample.has_name_mismatch else "否",
            "改判次数": sample.adjustment_count,
            "评测次数": sample.review_count,
            "标签冲突详情": "; ".join(conflict_fields),
            **materials_data,
        })

    return results


def resolve_label_conflict(db: Session, conflict_id: int, resolution: str, resolved_by: str):
    conflict = db.query(models.LabelConflict).filter(models.LabelConflict.id == conflict_id).first()
    if not conflict:
        return None

    conflict.is_resolved = True
    conflict.resolution = resolution
    conflict.resolved_by = resolved_by
    conflict.resolved_at = datetime.utcnow()

    db.commit()
    db.refresh(conflict)

    sample = get_sample(db, conflict.sample_id)
    unresolved = (
        db.query(models.LabelConflict)
        .filter(
            and_(
                models.LabelConflict.sample_id == conflict.sample_id,
                models.LabelConflict.is_resolved == False,
            )
        )
        .count()
    )
    if unresolved == 0 and sample:
        sample.has_label_conflict = False
        db.commit()

    return conflict


def update_sample_status(db: Session, sample_id: int, status: str, adjuster: str = "system"):
    sample = get_sample(db, sample_id)
    if not sample:
        return None

    sample.status = status
    sample.review_count = sample.review_count + 1
    sample.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(sample)
    return sample
