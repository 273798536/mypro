from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from datetime import datetime
import uuid
import json
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from scipy.stats import beta

from database import (
    TrialCalculation, WeightChangeLog, StatusChangeLog, HistoricalAnswer,
    TraceRecord, ExportRecord, STATUS_CHOICES, STATUS_EXPORT_DESCRIPTIONS,
    PROCESSING_STATUS_CHOICES, TRACE_STAGE_CHOICES
)
from schemas import (
    TrialCalculationCreate, TrialCalculationUpdate, StatusEnum,
    HistoricalAnswerCreate, HistoricalAnswerUpdate, ProcessingStatusEnum,
    TraceRecordCreate, TraceStageEnum, ExportRequest
)


# ============ 贝叶斯计算 ============

def calc_beta_mean(alpha: float, beta_val: float) -> float:
    """计算Beta分布均值 α/(α+β)"""
    return round(alpha / (alpha + beta_val), 6)


def calc_posterior(prior_alpha: float, prior_beta: float,
                   success: int, total: int) -> Tuple[float, float, float]:
    """
    共轭先验计算后验：Beta(α,β) + Binomial 数据 → Beta(α+s, β+f)
    返回 (post_alpha, post_beta, post_mean)
    """
    fail = max(total - success, 0)
    post_alpha = prior_alpha + success
    post_beta = prior_beta + fail
    post_mean = calc_beta_mean(post_alpha, post_beta)
    return round(post_alpha, 6), round(post_beta, 6), post_mean


# ============ 工具函数 ============

def gen_trial_no() -> str:
    """生成试算编号 BYS-YYYYMMDD-XXXX"""
    today = datetime.utcnow().strftime("%Y%m%d")
    short = uuid.uuid4().hex[:4].upper()
    return f"BYS-{today}-{short}"


def enrich_trial_labels(trial: TrialCalculation) -> Dict[str, Any]:
    """给试算记录附加显示用标签，保证前后端一致"""
    data = {
        "id": trial.id,
        "trial_no": trial.trial_no,
        "project_name": trial.project_name,
        "parameter_name": trial.parameter_name,
        "description": trial.description,
        "prior_alpha": trial.prior_alpha,
        "prior_beta": trial.prior_beta,
        "prior_mean": trial.prior_mean,
        "weight": trial.weight,
        "sample_success": trial.sample_success,
        "sample_total": trial.sample_total,
        "sample_fail": trial.sample_fail,
        "posterior_alpha": trial.posterior_alpha,
        "posterior_beta": trial.posterior_beta,
        "posterior_mean": trial.posterior_mean,
        "status": trial.status,
        "status_label": STATUS_CHOICES.get(trial.status, trial.status),
        "status_remark": trial.status_remark,
        "status_export_description": STATUS_EXPORT_DESCRIPTIONS.get(
            trial.status, ""
        ),
        "is_duplicate": trial.is_duplicate,
        "duplicate_reason": trial.duplicate_reason,
        "duplicate_of_id": trial.duplicate_of_id,
        "duplicate_tag": "🔁 重复样本" if trial.is_duplicate else None,
        "source_batch_no": trial.source_batch_no,
        "source_filename": trial.source_filename,
        "source_uploader": trial.source_uploader,
        "source_import_time": trial.source_import_time,
        "created_at": trial.created_at,
        "updated_at": trial.updated_at,
        "created_by": trial.created_by,
        "updated_by": trial.updated_by,
        "weight_change_count": len(trial.weight_changes),
        "historical_answer_count": len(trial.historical_answers),
    }
    return data


def enrich_trial_detail(db: Session, trial: TrialCalculation) -> Dict[str, Any]:
    """详情页：附加所有关联记录，含处理状态来源保留"""
    base = enrich_trial_labels(trial)
    base["raw_data_snapshot"] = trial.raw_data_snapshot
    base["field_mapping_snapshot"] = trial.field_mapping_snapshot

    base["weight_changes"] = [
        {
            "id": w.id,
            "old_weight": w.old_weight,
            "new_weight": w.new_weight,
            "delta": round(w.new_weight - w.old_weight, 4),
            "historical_answer_id": w.historical_answer_id,
            "reference_answer_value": w.reference_answer_value,
            "historical_answer_source": (
                w.historical_answer.answer_source
                if w.historical_answer else None
            ),
            "reason": w.reason,
            "changed_by": w.changed_by,
            "changed_at": w.changed_at,
        }
        for w in trial.weight_changes
    ]

    base["status_changes"] = [
        {
            "id": s.id,
            "old_status": s.old_status,
            "new_status": s.new_status,
            "old_status_label": STATUS_CHOICES.get(s.old_status, s.old_status),
            "new_status_label": STATUS_CHOICES.get(s.new_status, s.new_status),
            "remark": s.remark,
            "changed_by": s.changed_by,
            "changed_at": s.changed_at,
        }
        for s in trial.status_changes
    ]

    base["historical_answers"] = [
        {
            "id": h.id,
            "answer_source": h.answer_source,
            "answer_batch": h.answer_batch,
            "original_field_names": h.original_field_names,
            "standardized_field_map": h.standardized_field_map,
            "answer_value": h.answer_value,
            "answer_confidence": h.answer_confidence,
            "processing_status": h.processing_status,
            "processing_status_label": PROCESSING_STATUS_CHOICES.get(
                h.processing_status, h.processing_status
            ),
            "processing_remark": h.processing_remark,
            "raw_answer_payload": h.raw_answer_payload,
            "created_by": h.created_by,
            "created_at": h.created_at,
            "adopted_at": h.adopted_at,
            "weight_change_used_count": len(h.weight_changes),
        }
        for h in trial.historical_answers
    ]

    base["trace_records"] = [
        {
            "id": t.id,
            "trace_stage": t.trace_stage,
            "trace_stage_label": TRACE_STAGE_CHOICES.get(
                t.trace_stage, t.trace_stage
            ),
            "field_name": t.field_name,
            "field_value_before": t.field_value_before,
            "field_value_after": t.field_value_after,
            "narrative": t.narrative,
            "evidence_ref": t.evidence_ref,
            "operator": t.operator,
            "operated_at": t.operated_at,
        }
        for t in trial.trace_records
    ]

    base["export_records"] = [
        {
            "id": e.id,
            "export_type": e.export_type,
            "export_filename": e.export_filename,
            "export_status_label": e.export_status_label,
            "export_status_description": e.export_status_description,
            "status_at_export": e.status_at_export,
            "is_duplicate_at_export": e.is_duplicate_at_export,
            "weight_at_export": e.weight_at_export,
            "export_screenshot_caption": e.export_screenshot_caption,
            "exported_by": e.exported_by,
            "exported_at": e.exported_at,
        }
        for e in trial.export_records
    ]

    return base


# ============ 试算CRUD ============

def create_trial(db: Session, data: TrialCalculationCreate) -> TrialCalculation:
    """创建试算，自动计算贝叶斯参数，自动查重标记"""
    trial = TrialCalculation(
        trial_no=gen_trial_no(),
        project_name=data.project_name,
        parameter_name=data.parameter_name,
        description=data.description,
        prior_alpha=data.prior_alpha,
        prior_beta=data.prior_beta,
        prior_mean=calc_beta_mean(data.prior_alpha, data.prior_beta),
        weight=data.weight,
        sample_success=data.sample_success,
        sample_total=data.sample_total,
        sample_fail=max(data.sample_total - data.sample_success, 0),
        source_batch_no=data.source_batch_no,
        source_filename=data.source_filename,
        source_uploader=data.source_uploader,
        source_import_time=datetime.utcnow() if data.source_filename else None,
        field_mapping_snapshot=data.field_mapping_snapshot,
        raw_data_snapshot=data.raw_data_snapshot,
        created_by=data.created_by,
        updated_by=data.created_by,
    )
    pa, pb, pm = calc_posterior(
        trial.prior_alpha, trial.prior_beta,
        trial.sample_success, trial.sample_total
    )
    trial.posterior_alpha, trial.posterior_beta, trial.posterior_mean = pa, pb, pm

    db.add(trial)
    db.flush()

    # 自动重复检测
    dup_info = detect_duplicate_for_new(db, trial)
    if dup_info:
        trial.is_duplicate = True
        trial.duplicate_reason = dup_info["reason"]
        trial.duplicate_of_id = dup_info.get("duplicate_of_id")

    # 追加追溯线索
    add_trace(db, trial.id, TraceRecordCreate(
        trace_stage="material",
        narrative=f"创建试算记录，项目【{trial.project_name}】"
                  f"参数【{trial.parameter_name}】，"
                  f"先验α={trial.prior_alpha}, β={trial.prior_beta}，"
                  f"样本成功/总数={trial.sample_success}/{trial.sample_total}",
        evidence_ref=trial.source_filename or "手动创建",
        operator=data.created_by,
    ))
    add_trace(db, trial.id, TraceRecordCreate(
        trace_stage="calculation",
        narrative=f"贝叶斯共轭先验计算：后验α'={pa}, β'={pb}，"
                  f"后验均值={pm}。公式：α'=α+s, β'=β+(n-s)。",
        field_name="posterior_mean",
        field_value_after=str(pm),
        operator="系统自动计算",
    ))
    if dup_info:
        add_trace(db, trial.id, TraceRecordCreate(
            trace_stage="preprocess",
            narrative=f"系统自动检测到与#{dup_info.get('duplicate_of_id')}样本相似，"
                      f"已标记为重复样本。理由：{dup_info['reason']}",
            operator="系统查重",
        ))

    db.commit()
    db.refresh(trial)
    return trial


def get_trial(db: Session, trial_id: int) -> Optional[TrialCalculation]:
    return db.query(TrialCalculation).filter(TrialCalculation.id == trial_id).first()


def get_trial_by_no(db: Session, trial_no: str) -> Optional[TrialCalculation]:
    return db.query(TrialCalculation).filter(TrialCalculation.trial_no == trial_no).first()


def list_trials(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    keyword: Optional[str] = None,
    status: Optional[str] = None,
    project_name: Optional[str] = None,
    is_duplicate: Optional[bool] = None,
    source_batch_no: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> Tuple[List[TrialCalculation], int]:
    """列表查询，支持重复样本筛选"""
    q = db.query(TrialCalculation)

    if keyword:
        like = f"%{keyword}%"
        q = q.filter(or_(
            TrialCalculation.trial_no.like(like),
            TrialCalculation.project_name.like(like),
            TrialCalculation.parameter_name.like(like),
            TrialCalculation.source_filename.like(like),
        ))
    if status:
        q = q.filter(TrialCalculation.status == status)
    if project_name:
        q = q.filter(TrialCalculation.project_name == project_name)
    if is_duplicate is not None:
        q = q.filter(TrialCalculation.is_duplicate == is_duplicate)
    if source_batch_no:
        q = q.filter(TrialCalculation.source_batch_no == source_batch_no)

    total = q.count()

    sort_col = getattr(TrialCalculation, sort_by, TrialCalculation.created_at)
    if sort_order == "asc":
        q = q.order_by(sort_col.asc())
    else:
        q = q.order_by(sort_col.desc())

    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def update_trial(db: Session, trial_id: int, data: TrialCalculationUpdate) -> Optional[TrialCalculation]:
    """
    更新试算。权重变更自动写入WeightChangeLog并关联历史答案。
    状态变更自动写入StatusChangeLog。
    """
    trial = get_trial(db, trial_id)
    if not trial:
        return None

    update_data = data.model_dump(exclude_unset=True)

    # 提取需要单独处理的字段
    weight_change_reason = update_data.pop("weight_change_reason", None)
    weight_change_hist_ans_id = update_data.pop("weight_change_historical_answer_id", None)
    new_status = update_data.get("status")
    status_remark = update_data.get("status_remark")

    # 权重变更 → 记录日志
    if "weight" in update_data and update_data["weight"] != trial.weight:
        ref_value = None
        if weight_change_hist_ans_id:
            hist = db.query(HistoricalAnswer).filter(
                HistoricalAnswer.id == weight_change_hist_ans_id,
                HistoricalAnswer.trial_id == trial_id
            ).first()
            if hist:
                ref_value = hist.answer_value

        wlog = WeightChangeLog(
            trial_id=trial.id,
            old_weight=trial.weight,
            new_weight=update_data["weight"],
            historical_answer_id=weight_change_hist_ans_id,
            reference_answer_value=ref_value,
            reason=weight_change_reason or "调整权重",
            changed_by=data.updated_by,
        )
        db.add(wlog)
        add_trace(db, trial.id, TraceRecordCreate(
            trace_stage="adjust",
            field_name="weight",
            field_value_before=str(trial.weight),
            field_value_after=str(update_data["weight"]),
            narrative=(
                f"权重由 {trial.weight} 调整为 {update_data['weight']}，"
                f"理由：{weight_change_reason or '（未填）'}；"
                f"参考历史答案ID={weight_change_hist_ans_id}，"
                f"参考取值={ref_value}"
            ),
            operator=data.updated_by,
        ))

    # 先验参数/样本变更 → 重新计算后验
    need_recalc = any(k in update_data for k in
                      ["prior_alpha", "prior_beta", "sample_success", "sample_total"])
    if need_recalc:
        for k in ["prior_alpha", "prior_beta", "sample_success", "sample_total"]:
            if k in update_data:
                setattr(trial, k, update_data[k])
        trial.prior_mean = calc_beta_mean(trial.prior_alpha, trial.prior_beta)
        trial.sample_fail = max(trial.sample_total - trial.sample_success, 0)
        pa, pb, pm = calc_posterior(
            trial.prior_alpha, trial.prior_beta,
            trial.sample_success, trial.sample_total
        )
        trial.posterior_alpha, trial.posterior_beta, trial.posterior_mean = pa, pb, pm
        add_trace(db, trial.id, TraceRecordCreate(
            trace_stage="calculation",
            narrative=f"参数调整后重新计算：后验均值={pm}。",
            field_name="posterior_mean",
            field_value_after=str(pm),
            operator="系统自动计算",
        ))

    # 普通字段
    for k, v in update_data.items():
        if k not in ("status", "status_remark"):
            setattr(trial, k, v)

    # 状态变更
    if new_status and new_status != trial.status:
        slog = StatusChangeLog(
            trial_id=trial.id,
            old_status=trial.status,
            new_status=new_status,
            remark=status_remark,
            changed_by=data.updated_by,
        )
        db.add(slog)
        add_trace(db, trial.id, TraceRecordCreate(
            trace_stage="finalize",
            narrative=(
                f"状态由【{STATUS_CHOICES.get(trial.status, trial.status)}】"
                f"变更为【{STATUS_CHOICES.get(new_status, new_status)}】，"
                f"说明：{status_remark or '（无）'}"
            ),
            operator=data.updated_by,
        ))
        trial.status = new_status
        trial.status_remark = status_remark

    trial.updated_at = datetime.utcnow()
    if data.updated_by:
        trial.updated_by = data.updated_by

    db.commit()
    db.refresh(trial)
    return trial


# ============ 历史答案 ============

def add_historical_answer(
    db: Session, trial_id: int, data: HistoricalAnswerCreate
) -> Optional[HistoricalAnswer]:
    trial = get_trial(db, trial_id)
    if not trial:
        return None

    # 保住来源：即使字段名前后不一，也完整保留 raw_answer_payload
    ha = HistoricalAnswer(
        trial_id=trial_id,
        answer_source=data.answer_source,
        answer_batch=data.answer_batch,
        original_field_names=data.original_field_names,
        standardized_field_map=data.standardized_field_map,
        answer_value=data.answer_value,
        answer_confidence=data.answer_confidence,
        processing_status=data.processing_status.value,
        processing_remark=data.processing_remark,
        raw_answer_payload=data.raw_answer_payload,
        created_by=data.created_by,
    )
    db.add(ha)
    db.flush()
    add_trace(db, trial_id, TraceRecordCreate(
        trace_stage="material",
        narrative=(
            f"收到来自【{data.answer_source}】的历史答案，"
            f"取值={data.answer_value}，原始字段：{data.original_field_names}，"
            f"处理状态=待处理。字段名可能前后不一，已完整保存原始载荷。"
        ),
        evidence_ref=data.answer_batch or data.answer_source,
        operator=data.created_by,
    ))
    db.commit()
    db.refresh(ha)
    return ha


def update_historical_answer(
    db: Session, answer_id: int, data: HistoricalAnswerUpdate
) -> Optional[HistoricalAnswer]:
    ha = db.query(HistoricalAnswer).filter(HistoricalAnswer.id == answer_id).first()
    if not ha:
        return None
    upd = data.model_dump(exclude_unset=True)
    if "processing_status" in upd:
        upd["processing_status"] = upd["processing_status"].value
        if upd["processing_status"] == "adopted" and not ha.adopted_at:
            upd["adopted_at"] = datetime.utcnow()
            add_trace(db, ha.trial_id, TraceRecordCreate(
                trace_stage="adjust",
                narrative=(
                    f"采纳历史答案#{answer_id}（来源【{ha.answer_source}】），"
                    f"取值={ha.answer_value}。"
                ),
                operator=data.model_dump().get("created_by") or "人工",
            ))
    for k, v in upd.items():
        setattr(ha, k, v)
    db.commit()
    db.refresh(ha)
    return ha


def list_historical_answers(
    db: Session, trial_id: Optional[int] = None,
    processing_status: Optional[str] = None,
    answer_source: Optional[str] = None,
) -> List[HistoricalAnswer]:
    q = db.query(HistoricalAnswer)
    if trial_id:
        q = q.filter(HistoricalAnswer.trial_id == trial_id)
    if processing_status:
        q = q.filter(HistoricalAnswer.processing_status == processing_status)
    if answer_source:
        q = q.filter(HistoricalAnswer.answer_source.like(f"%{answer_source}%"))
    return q.order_by(HistoricalAnswer.created_at.desc()).all()


# ============ 追溯线索 ============

def add_trace(
    db: Session, trial_id: int, data: TraceRecordCreate
) -> Optional[TraceRecord]:
    t = TraceRecord(
        trial_id=trial_id,
        trace_stage=data.trace_stage.value if isinstance(data.trace_stage, TraceStageEnum) else data.trace_stage,
        field_name=data.field_name,
        field_value_before=data.field_value_before,
        field_value_after=data.field_value_after,
        narrative=data.narrative,
        evidence_ref=data.evidence_ref,
        evidence_snapshot=data.evidence_snapshot,
        operator=data.operator,
    )
    db.add(t)
    db.flush()
    return t


def list_traces(db: Session, trial_id: int) -> List[TraceRecord]:
    return (
        db.query(TraceRecord)
        .filter(TraceRecord.trial_id == trial_id)
        .order_by(TraceRecord.operated_at.asc())
        .all()
    )


# ============ 重复样本检测 ============

def detect_duplicate_for_new(
    db: Session, new_trial: TrialCalculation,
    threshold_project_param: bool = True,
    threshold_prior: float = 1e-3,
    threshold_sample: bool = True,
) -> Optional[Dict[str, Any]]:
    """
    新建试算时自动查重。规则：
    1. 同项目+同参数名 + 同先验(α,β误差内) + 同样本成功/总数 → 重复
    """
    q = db.query(TrialCalculation).filter(
        TrialCalculation.id != new_trial.id
    )
    if threshold_project_param:
        q = q.filter(
            TrialCalculation.project_name == new_trial.project_name,
            TrialCalculation.parameter_name == new_trial.parameter_name,
        )
    if threshold_sample:
        q = q.filter(
            TrialCalculation.sample_success == new_trial.sample_success,
            TrialCalculation.sample_total == new_trial.sample_total,
        )
    candidates = q.all()
    for c in candidates:
        if (abs(c.prior_alpha - new_trial.prior_alpha) < threshold_prior
                and abs(c.prior_beta - new_trial.prior_beta) < threshold_prior):
            return {
                "duplicate_of_id": c.id,
                "duplicate_of_trial_no": c.trial_no,
                "reason": (
                    f"与{c.trial_no}项目参数完全一致："
                    f"α={c.prior_alpha}, β={c.prior_beta}, "
                    f"成功={c.sample_success}, 总数={c.sample_total}"
                ),
            }
    return None


def manual_mark_duplicate(
    db: Session, trial_id: int, duplicate_of_id: int,
    reason: str, operator: Optional[str] = None,
) -> Optional[TrialCalculation]:
    """人工标记重复样本"""
    trial = get_trial(db, trial_id)
    dup_of = get_trial(db, duplicate_of_id)
    if not trial or not dup_of:
        return None
    trial.is_duplicate = True
    trial.duplicate_of_id = duplicate_of_id
    trial.duplicate_reason = reason
    add_trace(db, trial_id, TraceRecordCreate(
        trace_stage="preprocess",
        narrative=(
            f"人工标记为重复样本，主样本={dup_of.trial_no}。"
            f"理由：{reason}"
        ),
        operator=operator,
    ))
    db.commit()
    db.refresh(trial)
    return trial


# ============ 导出记录 & 状态一致性 ============

def build_export_screenshot_caption(
    db: Session, trial: TrialCalculation, custom_caption: Optional[str] = None
) -> str:
    """
    构建截图说明文字，确保与页面状态一致。
    包含：状态说明 + 重复标记 + 权重说明
    同源：状态文字来自 STATUS_CHOICES / STATUS_EXPORT_DESCRIPTIONS，与接口一致。
    """
    parts = []
    parts.append(f"贝叶斯先验参数试算 · {trial.trial_no}")
    parts.append(f"项目：{trial.project_name}｜参数：{trial.parameter_name}")
    parts.append(
        f"先验 α={trial.prior_alpha}, β={trial.prior_beta}；"
        f"样本 成功/总数={trial.sample_success}/{trial.sample_total}；"
        f"权重={trial.weight}"
    )
    parts.append(
        f"后验 α'={trial.posterior_alpha}, β'={trial.posterior_beta}；"
        f"后验均值={trial.posterior_mean}"
    )
    status_desc = STATUS_EXPORT_DESCRIPTIONS.get(trial.status, "")
    parts.append(
        f"当前状态：【{STATUS_CHOICES.get(trial.status, trial.status)}】{status_desc}"
    )
    if trial.status_remark:
        parts.append(f"状态说明：{trial.status_remark}")
    if trial.is_duplicate:
        dup_trial = ""
        if trial.duplicate_of_id:
            master = get_trial(db, trial.duplicate_of_id)
            if master:
                dup_trial = f"（对应主样本 {master.trial_no} / ID={master.id}）"
        parts.append(f"⚠️  重复样本：{trial.duplicate_reason or '系统判定字段重复'}{dup_trial}")
    if trial.historical_answers:
        adopted = [h for h in trial.historical_answers if h.processing_status == "adopted"]
        if adopted:
            src = ", ".join({f"{h.answer_source}={h.answer_value}" for h in adopted})
            parts.append(f"参考历史答案（已采纳）：{src}")
    if trial.source_filename or trial.source_batch_no:
        parts.append(
            f"数据来源：批次={trial.source_batch_no or 'N/A'}｜"
            f"文件={trial.source_filename or 'N/A'}｜"
            f"上传人={trial.source_uploader or 'N/A'}"
        )
    if custom_caption:
        parts.append(custom_caption)
    parts.append(f"导出时间：{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    return "\n".join(parts)


def create_export_record(
    db: Session, trial_id: int, data: ExportRequest,
    export_filename: str,
) -> Optional[ExportRecord]:
    """
    创建导出记录，把导出瞬间的状态完整快照下来，
    确保：页面接口查status -> 与导出文件里的文字一致。
    """
    trial = get_trial(db, trial_id)
    if not trial:
        return None

    caption = build_export_screenshot_caption(db, trial, data.caption_override)

    exp = ExportRecord(
        trial_id=trial_id,
        export_type=data.export_type,
        export_filename=export_filename,
        export_status_label=STATUS_CHOICES.get(trial.status, trial.status),
        export_status_description=STATUS_EXPORT_DESCRIPTIONS.get(trial.status, ""),
        status_at_export=trial.status,
        is_duplicate_at_export=trial.is_duplicate,
        weight_at_export=trial.weight,
        parameters_snapshot={
            "prior_alpha": trial.prior_alpha,
            "prior_beta": trial.prior_beta,
            "prior_mean": trial.prior_mean,
            "posterior_alpha": trial.posterior_alpha,
            "posterior_beta": trial.posterior_beta,
            "posterior_mean": trial.posterior_mean,
            "sample_success": trial.sample_success,
            "sample_total": trial.sample_total,
            "weight": trial.weight,
            "is_duplicate": trial.is_duplicate,
            "duplicate_reason": trial.duplicate_reason,
        },
        export_screenshot_caption=caption,
        exported_by=data.exported_by,
    )
    db.add(exp)
    add_trace(db, trial_id, TraceRecordCreate(
        trace_stage="finalize",
        narrative=(
            f"导出【{data.export_type}】文件：{export_filename}。"
            f"导出时状态={trial.status}，重复标记={trial.is_duplicate}，"
            f"权重={trial.weight}。状态说明文字已与页面同步写入截图说明。"
        ),
        evidence_ref=export_filename,
        operator=data.exported_by,
    ))
    db.commit()
    db.refresh(exp)
    return exp


def list_export_records(
    db: Session, trial_id: Optional[int] = None
) -> List[ExportRecord]:
    q = db.query(ExportRecord)
    if trial_id:
        q = q.filter(ExportRecord.trial_id == trial_id)
    return q.order_by(ExportRecord.exported_at.desc()).all()


# ============ 汇总/统计 ============

def summary(db: Session) -> Dict[str, Any]:
    total = db.query(func.count(TrialCalculation.id)).scalar() or 0
    by_status = dict(
        db.query(TrialCalculation.status, func.count(TrialCalculation.id))
        .group_by(TrialCalculation.status).all()
    )
    dup_count = (
        db.query(func.count(TrialCalculation.id))
        .filter(TrialCalculation.is_duplicate == True).scalar() or 0
    )
    hist_count = db.query(func.count(HistoricalAnswer.id)).scalar() or 0
    weight_change_count = db.query(func.count(WeightChangeLog.id)).scalar() or 0
    export_count = db.query(func.count(ExportRecord.id)).scalar() or 0
    return {
        "total": total,
        "by_status": {STATUS_CHOICES.get(k, k): v for k, v in by_status.items()},
        "duplicate_count": dup_count,
        "historical_answer_count": hist_count,
        "weight_change_count": weight_change_count,
        "export_count": export_count,
    }
