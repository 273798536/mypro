from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import models
from app.models.enums import QuestionStatus, IssueType, CopyrightType
from app.schemas import schemas


def create_batch(db: Session, batch_in: schemas.EvaluationBatchCreate) -> models.EvaluationBatch:
    db_batch = models.EvaluationBatch(
        batch_name=batch_in.batch_name,
        importer=batch_in.importer,
        description=batch_in.description,
        subject_category=batch_in.subject_category,
        total_questions=len(batch_in.questions),
        current_status=QuestionStatus.IMPORTED,
    )
    db.add(db_batch)
    db.flush()

    for idx, q_in in enumerate(batch_in.questions):
        db_question = models.EvaluationQuestion(
            batch_id=db_batch.id,
            question_id_external=q_in.question_id_external,
            question_content=q_in.question_content,
            standard_answer=q_in.standard_answer,
            difficulty=q_in.difficulty,
            knowledge_point=q_in.knowledge_point,
            human_note=q_in.human_note,
            sort_order=idx,
            current_status=QuestionStatus.IMPORTED,
        )
        db.add(db_question)
        db.flush()

        for cs_in in q_in.copyright_sources:
            db_cs = models.CopyrightSource(
                question_id=db_question.id,
                copyright_type=cs_in.copyright_type,
                source_title=cs_in.source_title,
                source_author=cs_in.source_author,
                source_publisher=cs_in.source_publisher,
                source_url=cs_in.source_url,
                publication_date=cs_in.publication_date,
                authorization_number=cs_in.authorization_number,
                authorization_expiry=cs_in.authorization_expiry,
                fair_use_justification=cs_in.fair_use_justification,
                remark=cs_in.remark,
            )
            db.add(db_cs)

    db_status = models.StatusHistory(
        batch_id=db_batch.id,
        from_status=None,
        to_status=QuestionStatus.IMPORTED,
        operator=batch_in.importer,
        reason="批次已导入",
    )
    db.add(db_status)

    db.commit()
    db.refresh(db_batch)
    return db_batch


def list_batches(db: Session, skip: int = 0, limit: int = 100) -> List[models.EvaluationBatch]:
    return db.query(models.EvaluationBatch).order_by(models.EvaluationBatch.import_time.desc()).offset(skip).limit(limit).all()


def get_batch(db: Session, batch_id: int) -> Optional[models.EvaluationBatch]:
    return db.query(models.EvaluationBatch).filter(models.EvaluationBatch.id == batch_id).first()


def get_question(db: Session, question_id: int) -> Optional[models.EvaluationQuestion]:
    return db.query(models.EvaluationQuestion).filter(models.EvaluationQuestion.id == question_id).first()


def submit_batch_review(
    db: Session,
    batch_id: int,
    review_submit: schemas.BatchReviewSubmit,
) -> models.EvaluationBatch:
    db_batch = get_batch(db, batch_id)
    if not db_batch:
        return None

    material_missing = 0
    calibration_wrong = 0
    passed_count = 0
    pending_count = 0

    for item in review_submit.items:
        db_question = get_question(db, item.question_id)
        if not db_question or db_question.batch_id != batch_id:
            continue

        from_status = db_question.current_status

        if item.passed:
            db_question.current_status = QuestionStatus.REVIEW_PASSED
            passed_count += 1
        else:
            db_question.current_status = QuestionStatus.REVIEW_BLOCKED
            if item.issue_type == IssueType.MATERIAL_MISSING:
                material_missing += 1
            elif item.issue_type == IssueType.CALIBRATION_WRONG:
                calibration_wrong += 1

        db_review = models.ReviewRecord(
            question_id=db_question.id,
            reviewer=review_submit.reviewer,
            issue_type=item.issue_type,
            issue_detail=item.issue_detail,
            next_action=item.next_action,
            passed=item.passed,
            human_note_preserved=db_question.human_note,
        )
        db.add(db_review)

        db_status = models.StatusHistory(
            question_id=db_question.id,
            batch_id=batch_id,
            from_status=from_status,
            to_status=db_question.current_status,
            operator=review_submit.reviewer,
            reason=item.issue_detail or ("复核通过" if item.passed else "复核不通过"),
        )
        db.add(db_status)

    total = db_batch.total_questions
    processed = len(review_submit.items)
    pending_count = total - processed - passed_count - material_missing - calibration_wrong

    if material_missing > 0 or calibration_wrong > 0:
        batch_new_status = QuestionStatus.REVIEW_BLOCKED
    elif passed_count == total:
        batch_new_status = QuestionStatus.REVIEW_PASSED
    else:
        batch_new_status = QuestionStatus.UNDER_REVIEW

    old_batch_status = db_batch.current_status
    db_batch.current_status = batch_new_status

    db_status_batch = models.StatusHistory(
        batch_id=batch_id,
        from_status=old_batch_status,
        to_status=batch_new_status,
        operator=review_submit.reviewer,
        reason=f"复核提交: 通过{passed_count}题, 缺材料{material_missing}题, 口径问题{calibration_wrong}题, 待处理{pending_count}题",
    )
    db.add(db_status_batch)

    db.commit()
    db.refresh(db_batch)
    return db_batch


def get_review_summary(db: Session, batch_id: int) -> schemas.BatchReviewIssueSummary:
    db_batch = get_batch(db, batch_id)
    if not db_batch:
        return schemas.BatchReviewIssueSummary()

    questions = db_batch.questions
    material_missing = 0
    calibration_wrong = 0
    blocked = 0
    passed = 0
    pending = 0

    for q in questions:
        last_review = db.query(models.ReviewRecord).filter(
            models.ReviewRecord.question_id == q.id
        ).order_by(models.ReviewRecord.review_time.desc()).first()

        if not last_review:
            pending += 1
            continue

        if last_review.passed:
            passed += 1
        else:
            blocked += 1
            if last_review.issue_type == IssueType.MATERIAL_MISSING:
                material_missing += 1
            elif last_review.issue_type == IssueType.CALIBRATION_WRONG:
                calibration_wrong += 1

    return schemas.BatchReviewIssueSummary(
        material_missing_count=material_missing,
        calibration_wrong_count=calibration_wrong,
        total_blocked=blocked,
        total_passed=passed,
        total_pending=pending,
    )


def transition_batch_status(
    db: Session,
    batch_id: int,
    req: schemas.StatusTransitionRequest,
) -> Optional[models.EvaluationBatch]:
    db_batch = get_batch(db, batch_id)
    if not db_batch:
        return None

    from_status = db_batch.current_status
    db_batch.current_status = req.target_status

    if req.target_status == QuestionStatus.REJECTED:
        db_batch.rejection_reason = req.reason

    db_status = models.StatusHistory(
        batch_id=batch_id,
        from_status=from_status,
        to_status=req.target_status,
        operator=req.operator,
        reason=req.reason,
    )
    db.add(db_status)

    if req.target_status in [QuestionStatus.APPROVED, QuestionStatus.REJECTED]:
        for q in db_batch.questions:
            q_old = q.current_status
            q.current_status = req.target_status
            db_q_status = models.StatusHistory(
                question_id=q.id,
                batch_id=batch_id,
                from_status=q_old,
                to_status=req.target_status,
                operator=req.operator,
                reason=req.reason or (f"评审会{'通过' if req.target_status == QuestionStatus.APPROVED else '未通过'}"),
            )
            db.add(db_q_status)

    db.commit()
    db.refresh(db_batch)
    return db_batch


def create_prompt_version(
    db: Session,
    pv_in: schemas.PromptVersionCreate,
) -> models.PromptVersion:
    if pv_in.is_active:
        db.query(models.PromptVersion).filter(models.PromptVersion.is_active == True).update({"is_active": False})
        db.flush()

    db_pv = models.PromptVersion(
        version_code=pv_in.version_code,
        version_name=pv_in.version_name,
        prompt_content=pv_in.prompt_content,
        creator=pv_in.creator,
        description=pv_in.description,
        is_active=pv_in.is_active,
    )
    db.add(db_pv)
    db.commit()
    db.refresh(db_pv)
    return db_pv


def list_prompt_versions(db: Session) -> List[models.PromptVersion]:
    return db.query(models.PromptVersion).order_by(models.PromptVersion.create_time.desc()).all()


def get_prompt_version(db: Session, pv_id: int) -> Optional[models.PromptVersion]:
    return db.query(models.PromptVersion).filter(models.PromptVersion.id == pv_id).first()


def bind_prompt_version(
    db: Session,
    batch_id: int,
    req: schemas.PromptVersionBindRequest,
) -> List[models.PromptVersionTrack]:
    db_pv = get_prompt_version(db, req.prompt_version_id)
    if not db_pv:
        return []

    db_batch = get_batch(db, batch_id)
    if not db_batch:
        return []

    created_tracks = []

    if req.question_ids:
        target_questions = [q for q in db_batch.questions if q.id in req.question_ids]
    else:
        target_questions = db_batch.questions

    for q in target_questions:
        existing = db.query(models.PromptVersionTrack).filter(
            models.PromptVersionTrack.question_id == q.id,
            models.PromptVersionTrack.prompt_version_id == req.prompt_version_id,
        ).first()
        if not existing:
            db_track = models.PromptVersionTrack(
                prompt_version_id=req.prompt_version_id,
                batch_id=batch_id,
                question_id=q.id,
                operator=req.operator,
                remark=req.remark,
            )
            db.add(db_track)
            created_tracks.append(db_track)

    batch_existing = db.query(models.PromptVersionTrack).filter(
        models.PromptVersionTrack.batch_id == batch_id,
        models.PromptVersionTrack.prompt_version_id == req.prompt_version_id,
        models.PromptVersionTrack.question_id.is_(None),
    ).first()
    if not batch_existing:
        db_batch_track = models.PromptVersionTrack(
            prompt_version_id=req.prompt_version_id,
            batch_id=batch_id,
            question_id=None,
            operator=req.operator,
            remark=req.remark or "批次级别绑定",
        )
        db.add(db_batch_track)
        created_tracks.append(db_batch_track)

    db.commit()
    for t in created_tracks:
        db.refresh(t)
    return created_tracks


def get_batch_prompt_tracks(db: Session, batch_id: int) -> List[models.PromptVersionTrack]:
    return db.query(models.PromptVersionTrack).filter(
        models.PromptVersionTrack.batch_id == batch_id
    ).order_by(models.PromptVersionTrack.bind_time.desc()).all()


def get_batch_issue_breakdown(db: Session, batch_id: int) -> List[schemas.IssueBreakdown]:
    db_batch = get_batch(db, batch_id)
    if not db_batch:
        return []

    breakdown = []

    for issue_type, label in [
        (IssueType.MATERIAL_MISSING, "需补材料"),
        (IssueType.CALIBRATION_WRONG, "需改口径"),
    ]:
        q_ids = []
        details = []
        for q in db_batch.questions:
            last_review = db.query(models.ReviewRecord).filter(
                models.ReviewRecord.question_id == q.id,
                models.ReviewRecord.issue_type == issue_type,
            ).order_by(models.ReviewRecord.review_time.desc()).first()
            if last_review:
                q_ids.append(q.id)
                details.append({
                    "question_id": q.id,
                    "question_content": q.question_content,
                    "issue_detail": last_review.issue_detail,
                    "next_action": last_review.next_action,
                    "human_note": last_review.human_note_preserved or q.human_note,
                })

        breakdown.append(schemas.IssueBreakdown(
            issue_type=issue_type,
            issue_type_label=label,
            count=len(q_ids),
            question_ids=q_ids,
            details=details,
        ))

    return breakdown


def analyze_bias(db: Session, batch_id: int) -> dict:
    db_batch = get_batch(db, batch_id)
    if not db_batch:
        return {"has_bias": False}

    kp_counts = {}
    diff_counts = {}
    total = len(db_batch.questions)

    for q in db_batch.questions:
        kp = q.knowledge_point or "未分类"
        kp_counts[kp] = kp_counts.get(kp, 0) + 1
        diff = q.difficulty or "未标注"
        diff_counts[diff] = diff_counts.get(diff, 0) + 1

    biased_kps = []
    if total > 0:
        for kp, cnt in kp_counts.items():
            ratio = cnt / total
            if ratio > 0.5 and total >= 5:
                biased_kps.append({"knowledge_point": kp, "count": cnt, "ratio": round(ratio, 4)})

    result = {
        "has_bias": len(biased_kps) > 0,
        "total_questions": total,
        "knowledge_point_distribution": kp_counts,
        "difficulty_distribution": diff_counts,
        "biased_points": biased_kps,
    }

    if len(biased_kps) > 0:
        kp_names = "、".join([b["knowledge_point"] for b in biased_kps])
        result["bias_explanation"] = f"该评测集存在偏科问题，知识点「{kp_names}」占比过高，评测覆盖面不够均衡。"
    else:
        result["bias_explanation"] = "该评测集知识点分布相对均衡，未发现明显偏科。"

    return result


def generate_plain_explanation(db: Session, batch_id: int) -> str:
    db_batch = get_batch(db, batch_id)
    if not db_batch:
        return ""

    summary = get_review_summary(db, batch_id)
    bias = analyze_bias(db, batch_id)

    parts = []
    parts.append(f"各位同事，关于评测批次「{db_batch.batch_name}」的版权来源账本审核情况如下：")
    parts.append(f"本批次共 {db_batch.total_questions} 道题。")

    if db_batch.current_status == QuestionStatus.IMPORTED:
        parts.append("目前该批次刚导入，尚未开始复核。")
    elif db_batch.current_status == QuestionStatus.UNDER_REVIEW:
        parts.append(f"目前正在复核中，已通过 {summary.total_passed} 题，待处理 {summary.total_pending} 题。")
    elif db_batch.current_status == QuestionStatus.REVIEW_PASSED:
        parts.append(f"全部 {summary.total_passed} 题已通过评测负责人复核，等待评审会最终审核。")
    elif db_batch.current_status == QuestionStatus.REVIEW_BLOCKED:
        parts.append(f"复核阶段存在问题：需补材料 {summary.material_missing_count} 题，需改口径 {summary.calibration_wrong_count} 题。请相关同学尽快处理。")
    elif db_batch.current_status == QuestionStatus.APPROVED:
        parts.append("本批次已通过模型评审会审核。")
    elif db_batch.current_status == QuestionStatus.REJECTED:
        parts.append(f"本批次未通过模型评审会审核，原因：{db_batch.rejection_reason or '未填写'}。")
        if summary.total_blocked > 0 or summary.total_passed < db_batch.total_questions:
            parts.append(
                f"复核阶段记录：通过 {summary.total_passed} 题，需补材料 {summary.material_missing_count} 题，需改口径 {summary.calibration_wrong_count} 题，待复核 {summary.total_pending} 题。"
            )

    if bias["has_bias"]:
        parts.append(bias["bias_explanation"])

    parts.append("详情请查阅导出的完整报告。")
    return "\n".join(parts)


def get_rejection_explanation(db: Session, batch_id: int) -> Optional[str]:
    db_batch = get_batch(db, batch_id)
    if not db_batch or db_batch.current_status != QuestionStatus.REJECTED:
        return None

    bias = analyze_bias(db, batch_id)
    parts = []

    if db_batch.rejection_reason:
        parts.append(f"评审会拦截原因：{db_batch.rejection_reason}")
    if bias["has_bias"]:
        parts.append(bias["bias_explanation"])

    return "\n".join(parts) if parts else None
