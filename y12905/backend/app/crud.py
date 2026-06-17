from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from . import models, schemas
from .services.decision_engine import rules_are_consistent, detect_added_rules, extract_rule_ids
from .services.diff_service import char_diff_count


# ------------- PromptVersion -------------
def create_prompt_version(db: Session, pv: schemas.PromptVersionCreate) -> models.PromptVersion:
    db_pv = models.PromptVersion(
        version_tag=pv.version_tag,
        content=pv.content,
        safety_rules_snapshot=pv.safety_rules_snapshot.model_dump(),
        change_log=pv.change_log,
    )
    db.add(db_pv)
    db.commit()
    db.refresh(db_pv)
    return db_pv


def get_prompt_version(db: Session, pv_id: int) -> Optional[models.PromptVersion]:
    return db.query(models.PromptVersion).filter(models.PromptVersion.id == pv_id).first()


def get_prompt_version_by_tag(db: Session, tag: str) -> Optional[models.PromptVersion]:
    return db.query(models.PromptVersion).filter(models.PromptVersion.version_tag == tag).first()


def list_prompt_versions(db: Session, skip: int = 0, limit: int = 100) -> List[models.PromptVersion]:
    return db.query(models.PromptVersion).order_by(models.PromptVersion.created_at.desc()).offset(skip).limit(limit).all()


# ------------- EvalSample -------------
def batch_create_eval_samples(
    db: Session, prompt_version_id: int, samples: List[schemas.EvalSampleBase]
) -> List[models.EvalSample]:
    objs = []
    for s in samples:
        objs.append(models.EvalSample(
            prompt_version_id=prompt_version_id,
            input_text=s.input_text,
            model_output=s.model_output,
            score=s.score,
            safety_violations=s.safety_violations,
            eval_status=models.EvalStatus(s.eval_status.value),
            source_material_ref=s.source_material_ref,
        ))
    db.bulk_save_objects(objs)
    db.commit()
    return list_eval_samples_by_version(db, prompt_version_id)


def get_eval_sample(db: Session, sid: int) -> Optional[models.EvalSample]:
    return db.query(models.EvalSample).filter(models.EvalSample.id == sid).first()


def list_eval_samples_by_version(db: Session, pv_id: int) -> List[models.EvalSample]:
    return db.query(models.EvalSample).filter(models.EvalSample.prompt_version_id == pv_id).all()


def list_eval_samples(
    db: Session,
    prompt_version_id: Optional[int] = None,
    eval_status: Optional[str] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    skip: int = 0,
    limit: int = 500,
) -> List[models.EvalSample]:
    q = db.query(models.EvalSample)
    if prompt_version_id is not None:
        q = q.filter(models.EvalSample.prompt_version_id == prompt_version_id)
    if eval_status is not None:
        q = q.filter(models.EvalSample.eval_status == eval_status)
    if min_score is not None:
        q = q.filter(models.EvalSample.score >= min_score)
    if max_score is not None:
        q = q.filter(models.EvalSample.score <= max_score)
    return q.order_by(models.EvalSample.id).offset(skip).limit(limit).all()


def latest_feedback_for_sample(db: Session, sample_id: int) -> Optional[models.HumanFeedback]:
    return (
        db.query(models.HumanFeedback)
        .filter(models.HumanFeedback.eval_sample_id == sample_id)
        .order_by(models.HumanFeedback.created_at.desc())
        .first()
    )


# ------------- GrayCompare -------------
def create_gray_compare(db: Session, g: schemas.GrayCompareCreate) -> models.GrayCompareTask:
    va = get_prompt_version(db, g.version_a_id)
    vb = get_prompt_version(db, g.version_b_id)
    consistency = rules_are_consistent(
        va.safety_rules_snapshot if va else {},
        vb.safety_rules_snapshot if vb else {},
    )
    task = models.GrayCompareTask(
        version_a_id=g.version_a_id,
        version_b_id=g.version_b_id,
        status=models.TaskStatus.PENDING,
        consistency_flag=consistency,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    _run_compare(db, task)
    return task


def _run_compare(db: Session, task: models.GrayCompareTask) -> None:
    samples_a = list_eval_samples_by_version(db, task.version_a_id)
    samples_b = list_eval_samples_by_version(db, task.version_b_id)
    map_a = {s.source_material_ref or f"id:{s.id}": s for s in samples_a}
    map_b = {s.source_material_ref or f"id:{s.id}": s for s in samples_b}
    keys = sorted(set(map_a.keys()) | set(map_b.keys()))
    total = len(keys)
    pass_a = pass_b = 0
    sum_a = sum_b = 0.0
    viol_a = viol_b = 0
    imp = reg = unc = 0
    for k in keys:
        sa = map_a.get(k)
        sb = map_b.get(k)
        if sa:
            sum_a += sa.score
            viol_a += len(sa.safety_violations or [])
            if sa.eval_status == models.EvalStatus.PASS:
                pass_a += 1
        if sb:
            sum_b += sb.score
            viol_b += len(sb.safety_violations or [])
            if sb.eval_status == models.EvalStatus.PASS:
                pass_b += 1
        if sa and sb:
            if sb.score > sa.score:
                imp += 1
            elif sb.score < sa.score:
                reg += 1
            else:
                unc += 1
    total_a = len(samples_a) or 1
    total_b = len(samples_b) or 1
    task.metrics_summary = {
        "total_samples": total,
        "pass_rate_a": round(pass_a / total_a, 4),
        "pass_rate_b": round(pass_b / total_b, 4),
        "avg_score_a": round(sum_a / total_a, 4),
        "avg_score_b": round(sum_b / total_b, 4),
        "violation_count_a": viol_a,
        "violation_count_b": viol_b,
        "improved_count": imp,
        "regressed_count": reg,
        "unchanged_count": unc,
    }
    task.status = models.TaskStatus.COMPLETED
    db.commit()


def compute_sample_diffs(db: Session, task: models.GrayCompareTask) -> List[Dict[str, Any]]:
    samples_a = list_eval_samples_by_version(db, task.version_a_id)
    samples_b = list_eval_samples_by_version(db, task.version_b_id)
    map_a = {s.source_material_ref or f"id:{s.id}": s for s in samples_a}
    map_b = {s.source_material_ref or f"id:{s.id}": s for s in samples_b}
    keys = sorted(set(map_a.keys()) | set(map_b.keys()))
    out = []
    for k in keys:
        sa = map_a.get(k)
        sb = map_b.get(k)
        score_a = sa.score if sa else 0.0
        score_b = sb.score if sb else 0.0
        dec_obj = latest_feedback_for_sample(db, sb.id) if sb else None
        decision = dec_obj.final_decision.value if dec_obj else None
        reason = dec_obj.reason if dec_obj else None
        out.append({
            "sample_id": (sb or sa).id,
            "source_material_ref": k,
            "input_text": (sb or sa).input_text,
            "output_a": sa.model_output if sa else "",
            "output_b": sb.model_output if sb else "",
            "score_a": score_a,
            "score_b": score_b,
            "status_a": sa.eval_status.value if sa else "FAIL",
            "status_b": sb.eval_status.value if sb else "FAIL",
            "violations_a": sa.safety_violations if sa else [],
            "violations_b": sb.safety_violations if sb else [],
            "decision": decision,
            "reason": reason,
            "score_delta": round(score_b - score_a, 2),
        })
    return out


def get_gray_compare(db: Session, cid: int) -> Optional[models.GrayCompareTask]:
    return db.query(models.GrayCompareTask).filter(models.GrayCompareTask.id == cid).first()


def list_gray_compare(db: Session, skip: int = 0, limit: int = 100) -> List[models.GrayCompareTask]:
    return db.query(models.GrayCompareTask).order_by(models.GrayCompareTask.created_at.desc()).offset(skip).limit(limit).all()


# ------------- HumanFeedback -------------
def create_human_feedback(
    db: Session, fb: schemas.HumanFeedbackCreate
) -> models.HumanFeedback:
    sample = get_eval_sample(db, fb.eval_sample_id)
    original_score = sample.score if sample else fb.revised_score
    pv = sample.prompt_version if sample else None

    version_rule_ids = set()
    if pv:
        version_rule_ids = set(extract_rule_ids(pv.safety_rules_snapshot or {}))

    from .services.decision_engine import compute_decision
    final_decision, reason = compute_decision(
        original_score=original_score,
        revised_score=fb.revised_score,
        has_safety_violations=bool(sample.safety_violations) if sample else False,
        affects_safety_rules=fb.affects_safety_rules,
        affected_rule_ids=fb.affected_rule_ids,
        version_rule_ids=version_rule_ids,
    )

    obj = models.HumanFeedback(
        eval_sample_id=fb.eval_sample_id,
        evaluator=fb.evaluator,
        feedback_text=fb.feedback_text,
        original_score=original_score,
        revised_score=fb.revised_score,
        affects_safety_rules=fb.affects_safety_rules,
        affected_rule_ids=fb.affected_rule_ids,
        final_decision=final_decision,
        reason=reason,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def list_feedback_by_sample(db: Session, sample_id: int) -> List[models.HumanFeedback]:
    return (
        db.query(models.HumanFeedback)
        .filter(models.HumanFeedback.eval_sample_id == sample_id)
        .order_by(models.HumanFeedback.created_at.desc())
        .all()
    )


def list_all_feedback(db: Session, skip: int = 0, limit: int = 200) -> List[models.HumanFeedback]:
    return db.query(models.HumanFeedback).order_by(models.HumanFeedback.created_at.desc()).offset(skip).limit(limit).all()


# ------------- Statistics -------------
def score_distribution(db: Session, pv_id: int, bucket_size: float = 1.0) -> List[Dict[str, Any]]:
    samples = list_eval_samples_by_version(db, pv_id)
    buckets = {}
    for s in samples:
        key = f"{int(s.score // bucket_size * bucket_size)}-{int((s.score // bucket_size + 1) * bucket_size)}"
        buckets[key] = buckets.get(key, 0) + 1
    return [{"bucket": k, "count": v} for k, v in sorted(buckets.items())]


def safety_violation_distribution(db: Session, pv_id: int) -> List[Dict[str, Any]]:
    samples = list_eval_samples_by_version(db, pv_id)
    counts: Dict[str, int] = {}
    for s in samples:
        for v in (s.safety_violations or []):
            counts[v] = counts.get(v, 0) + 1
    return [{"rule_id": k, "count": v} for k, v in sorted(counts.items(), key=lambda x: -x[1])]


def eval_status_distribution(db: Session, pv_id: int) -> List[Dict[str, Any]]:
    q = (
        db.query(models.EvalSample.eval_status, func.count(models.EvalSample.id))
        .filter(models.EvalSample.prompt_version_id == pv_id)
        .group_by(models.EvalSample.eval_status)
    )
    return [{"bucket": s.value, "count": c} for s, c in q.all()]


def trend_metrics(db: Session, version_ids: List[int]) -> List[Dict[str, Any]]:
    out = []
    for vid in version_ids:
        pv = get_prompt_version(db, vid)
        if not pv:
            continue
        samples = list_eval_samples_by_version(db, vid)
        total = len(samples) or 1
        avg = sum(s.score for s in samples) / total
        pass_rate = sum(1 for s in samples if s.eval_status == models.EvalStatus.PASS) / total
        out.append({
            "version_tag": pv.version_tag,
            "metric": round(avg, 4),
            "metric_pass_rate": round(pass_rate, 4),
            "timestamp": pv.created_at,
        })
    return out
