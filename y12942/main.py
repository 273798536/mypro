from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import datetime
from urllib.parse import quote
import io
import json

from database import get_db, engine, Base
from models import (
    EvaluationBatch, EvaluationQuestion, ProcessingRecord,
    ReviewRecord, AnomalyRecord, BatchStatus, ProcessingStatus, ReviewResult
)
from schemas import (
    BatchImportRequest, BatchResponse, BatchDetailResponse,
    QuestionResponse, StatusUpdateRequest, ProcessingRecordUpdate,
    ProcessingRecordResponse, ReviewSubmitRequest, ReviewRecordResponse,
    AnomalyRecordRequest, AnomalyRecordResponse, AnomalyTraceResponse,
    BatchListResponse, ProcessingRecordListResponse
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="代码补全评测回放系统",
    description="评测题库导入、复核、状态推进、报告导出一体化后端接口",
    version="1.0.0"
)


def _get_next_run_number(db: Session, batch_code: str, prompt_version: str) -> int:
    max_run = db.query(func.max(EvaluationBatch.run_number)).filter(
        EvaluationBatch.batch_code == batch_code,
        EvaluationBatch.prompt_version == prompt_version
    ).scalar()
    return (max_run or 0) + 1


def _build_batch_response(batch: EvaluationBatch) -> BatchResponse:
    return BatchResponse(
        id=batch.id,
        batch_code=batch.batch_code,
        prompt_version=batch.prompt_version,
        run_number=batch.run_number,
        status=batch.status,
        description=batch.description,
        created_by=batch.created_by,
        created_at=batch.created_at,
        updated_at=batch.updated_at,
        import_note=batch.import_note,
        question_count=len(batch.questions)
    )


@app.post("/api/batches/import", response_model=BatchDetailResponse, summary="导入评测题库")
def import_batch(request: BatchImportRequest, db: Session = Depends(get_db)):
    """
    导入评测题库，自动处理同一批提示词版本的去重。
    同一批提示词版本第二次导入时，run_number 自动递增，避免产生冲突结论。
    """
    run_number = _get_next_run_number(db, request.batch_code, request.prompt_version)

    batch = EvaluationBatch(
        batch_code=request.batch_code,
        prompt_version=request.prompt_version,
        run_number=run_number,
        status=BatchStatus.IMPORTED,
        description=request.description,
        created_by=request.created_by,
        import_note=request.import_note
    )
    db.add(batch)
    db.flush()

    for item in request.questions:
        question = EvaluationQuestion(
            batch_id=batch.id,
            question_external_id=item.question_external_id,
            prompt=item.prompt,
            expected_code=item.expected_code,
            question_category=item.question_category,
            difficulty_level=item.difficulty_level,
            tags=item.tags,
            question_metadata=item.metadata
        )
        db.add(question)

    db.flush()

    for question in batch.questions:
        proc_record = ProcessingRecord(
            batch_id=batch.id,
            question_id=question.id,
            run_number=run_number,
            status=ProcessingStatus.PENDING
        )
        db.add(proc_record)

    db.commit()
    db.refresh(batch)

    questions = [
        QuestionResponse(
            id=q.id,
            batch_id=q.batch_id,
            question_external_id=q.question_external_id,
            prompt=q.prompt,
            expected_code=q.expected_code,
            question_category=q.question_category,
            difficulty_level=q.difficulty_level,
            tags=q.tags
        )
        for q in batch.questions
    ]

    return BatchDetailResponse(
        id=batch.id,
        batch_code=batch.batch_code,
        prompt_version=batch.prompt_version,
        run_number=batch.run_number,
        status=batch.status,
        description=batch.description,
        created_by=batch.created_by,
        created_at=batch.created_at,
        updated_at=batch.updated_at,
        import_note=batch.import_note,
        question_count=len(batch.questions),
        questions=questions
    )


@app.get("/api/batches", response_model=BatchListResponse, summary="查询评测批次列表")
def list_batches(
    status: Optional[BatchStatus] = None,
    batch_code: Optional[str] = None,
    prompt_version: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    查询所有评测批次，支持按状态、批次编码、提示词版本筛选。
    重启服务后仍可查询历史处理痕迹。
    """
    query = db.query(EvaluationBatch)
    if status:
        query = query.filter(EvaluationBatch.status == status)
    if batch_code:
        query = query.filter(EvaluationBatch.batch_code.contains(batch_code))
    if prompt_version:
        query = query.filter(EvaluationBatch.prompt_version.contains(prompt_version))

    total = query.count()
    batches = query.order_by(EvaluationBatch.created_at.desc()).offset(skip).limit(limit).all()

    return BatchListResponse(
        total=total,
        items=[_build_batch_response(b) for b in batches]
    )


@app.get("/api/batches/{batch_id}", response_model=BatchDetailResponse, summary="查询批次详情")
def get_batch_detail(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(EvaluationBatch).filter(EvaluationBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    questions = [
        QuestionResponse(
            id=q.id,
            batch_id=q.batch_id,
            question_external_id=q.question_external_id,
            prompt=q.prompt,
            expected_code=q.expected_code,
            question_category=q.question_category,
            difficulty_level=q.difficulty_level,
            tags=q.tags
        )
        for q in batch.questions
    ]

    return BatchDetailResponse(
        id=batch.id,
        batch_code=batch.batch_code,
        prompt_version=batch.prompt_version,
        run_number=batch.run_number,
        status=batch.status,
        description=batch.description,
        created_by=batch.created_by,
        created_at=batch.created_at,
        updated_at=batch.updated_at,
        import_note=batch.import_note,
        question_count=len(batch.questions),
        questions=questions
    )


@app.put("/api/batches/{batch_id}/status", response_model=BatchResponse, summary="推进批次状态")
def update_batch_status(
    batch_id: int,
    request: StatusUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    状态流转：已导入 → 处理中 → 待复核 → 复核中 → 已完成
    界面和报告共用同一批处理记录，不各自计算。
    """
    batch = db.query(EvaluationBatch).filter(EvaluationBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    valid_transitions = {
        BatchStatus.IMPORTED: [BatchStatus.PROCESSING],
        BatchStatus.PROCESSING: [BatchStatus.PENDING_REVIEW],
        BatchStatus.PENDING_REVIEW: [BatchStatus.REVIEWING, BatchStatus.PROCESSING],
        BatchStatus.REVIEWING: [BatchStatus.COMPLETED, BatchStatus.PENDING_REVIEW],
        BatchStatus.COMPLETED: []
    }

    if batch.status != request.status and request.status not in valid_transitions.get(batch.status, []):
        raise HTTPException(
            status_code=400,
            detail=f"状态流转不合法：{batch.status} → {request.status}"
        )

    batch.status = request.status
    if request.note:
        batch.import_note = (batch.import_note or "") + f"\n[{datetime.now()}] {request.note}"

    if request.status == BatchStatus.PROCESSING:
        for record in batch.processing_records:
            record.status = ProcessingStatus.RUNNING
            record.started_at = datetime.now()
    elif request.status == BatchStatus.PENDING_REVIEW:
        for record in batch.processing_records:
            if record.status == ProcessingStatus.RUNNING:
                record.status = ProcessingStatus.SUCCESS
                record.completed_at = datetime.now()

    db.commit()
    db.refresh(batch)
    return _build_batch_response(batch)


@app.get("/api/batches/{batch_id}/processing-records", response_model=ProcessingRecordListResponse, summary="查询批次处理记录")
def list_processing_records(
    batch_id: int,
    status: Optional[ProcessingStatus] = None,
    db: Session = Depends(get_db)
):
    """
    查询批次下所有处理记录，版本追踪和评测回放共用此数据。
    """
    batch = db.query(EvaluationBatch).filter(EvaluationBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    query = db.query(ProcessingRecord).filter(ProcessingRecord.batch_id == batch_id)
    if status:
        query = query.filter(ProcessingRecord.status == status)

    total = query.count()
    records = query.all()

    items = []
    for r in records:
        question = None
        if r.question:
            question = QuestionResponse(
                id=r.question.id,
                batch_id=r.question.batch_id,
                question_external_id=r.question.question_external_id,
                prompt=r.question.prompt,
                expected_code=r.question.expected_code,
                question_category=r.question.question_category,
                difficulty_level=r.question.difficulty_level,
                tags=r.question.tags
            )

        review_record = None
        if r.review_record:
            review_record = ReviewRecordResponse(
                id=r.review_record.id,
                processing_record_id=r.review_record.processing_record_id,
                reviewer=r.review_record.reviewer,
                reviewed_at=r.review_record.reviewed_at,
                review_result=r.review_record.review_result,
                review_comment=r.review_record.review_comment,
                annotation_record=r.review_record.annotation_record,
                manual_feedback=r.review_record.manual_feedback,
                tag_conflicts=r.review_record.tag_conflicts
            )

        items.append(ProcessingRecordResponse(
            id=r.id,
            batch_id=r.batch_id,
            question_id=r.question_id,
            run_number=r.run_number,
            status=r.status,
            started_at=r.started_at,
            completed_at=r.completed_at,
            predicted_code=r.predicted_code,
            execution_result=r.execution_result,
            error_message=r.error_message,
            quality_score=r.quality_score,
            metrics=r.metrics,
            processing_note=r.processing_note,
            question=question,
            review_record=review_record
        ))

    return ProcessingRecordListResponse(total=total, items=items)


@app.put("/api/processing-records/{record_id}", response_model=ProcessingRecordResponse, summary="更新处理记录")
def update_processing_record(
    record_id: int,
    request: ProcessingRecordUpdate,
    db: Session = Depends(get_db)
):
    """
    更新单条处理记录的状态和结果数据。
    """
    record = db.query(ProcessingRecord).filter(ProcessingRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="处理记录不存在")

    record.status = request.status
    if request.predicted_code is not None:
        record.predicted_code = request.predicted_code
    if request.execution_result is not None:
        record.execution_result = request.execution_result
    if request.error_message is not None:
        record.error_message = request.error_message
    if request.quality_score is not None:
        record.quality_score = request.quality_score
    if request.metrics is not None:
        record.metrics = request.metrics
    if request.processing_note is not None:
        record.processing_note = request.processing_note

    if request.status in [ProcessingStatus.SUCCESS, ProcessingStatus.FAILED, ProcessingStatus.ANOMALY]:
        record.completed_at = datetime.now()

    db.commit()
    db.refresh(record)
    return ProcessingRecordResponse(
        id=record.id,
        batch_id=record.batch_id,
        question_id=record.question_id,
        run_number=record.run_number,
        status=record.status,
        started_at=record.started_at,
        completed_at=record.completed_at,
        predicted_code=record.predicted_code,
        execution_result=record.execution_result,
        error_message=record.error_message,
        quality_score=record.quality_score,
        metrics=record.metrics,
        processing_note=record.processing_note,
        question=None,
        review_record=None
    )


@app.post("/api/processing-records/{record_id}/review", response_model=ReviewRecordResponse, summary="提交复核意见")
def submit_review(
    record_id: int,
    request: ReviewSubmitRequest,
    db: Session = Depends(get_db)
):
    """
    提交复核意见，将标注记录、人工反馈、标签冲突整合在同一轮复核中。
    训练组可直接看到本次处理的具体材料。
    """
    record = db.query(ProcessingRecord).filter(ProcessingRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="处理记录不存在")

    existing_review = db.query(ReviewRecord).filter(
        ReviewRecord.processing_record_id == record_id
    ).first()

    if existing_review:
        existing_review.reviewer = request.reviewer
        existing_review.reviewed_at = datetime.now()
        existing_review.review_result = request.review_result
        existing_review.review_comment = request.review_comment
        existing_review.annotation_record = request.annotation_record
        existing_review.manual_feedback = request.manual_feedback
        existing_review.tag_conflicts = request.tag_conflicts
        review = existing_review
    else:
        review = ReviewRecord(
            processing_record_id=record_id,
            reviewer=request.reviewer,
            reviewed_at=datetime.now(),
            review_result=request.review_result,
            review_comment=request.review_comment,
            annotation_record=request.annotation_record,
            manual_feedback=request.manual_feedback,
            tag_conflicts=request.tag_conflicts
        )
        db.add(review)

    db.commit()
    db.refresh(review)
    return ReviewRecordResponse(
        id=review.id,
        processing_record_id=review.processing_record_id,
        reviewer=review.reviewer,
        reviewed_at=review.reviewed_at,
        review_result=review.review_result,
        review_comment=review.review_comment,
        annotation_record=review.annotation_record,
        manual_feedback=review.manual_feedback,
        tag_conflicts=review.tag_conflicts
    )


@app.post("/api/processing-records/{record_id}/anomalies", response_model=AnomalyRecordResponse, summary="记录异常")
def record_anomaly(
    record_id: int,
    request: AnomalyRecordRequest,
    db: Session = Depends(get_db)
):
    """
    记录处理过程中的异常，用于后续溯源追踪。
    """
    record = db.query(ProcessingRecord).filter(ProcessingRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="处理记录不存在")

    record.status = ProcessingStatus.ANOMALY

    anomaly = AnomalyRecord(
        processing_record_id=record_id,
        anomaly_type=request.anomaly_type,
        description=request.description,
        handling_opinion=request.handling_opinion
    )
    db.add(anomaly)
    db.commit()
    db.refresh(anomaly)

    return AnomalyRecordResponse(
        id=anomaly.id,
        processing_record_id=anomaly.processing_record_id,
        anomaly_type=anomaly.anomaly_type,
        description=anomaly.description,
        detected_at=anomaly.detected_at,
        handling_opinion=anomaly.handling_opinion,
        resolved_at=anomaly.resolved_at,
        is_resolved=anomaly.is_resolved
    )


@app.get("/api/anomalies/{anomaly_id}/trace", response_model=AnomalyTraceResponse, summary="异常溯源追踪")
def trace_anomaly(anomaly_id: int, db: Session = Depends(get_db)):
    """
    顺着异常往回查，完整追溯到评测题库和处理意见。
    """
    anomaly = db.query(AnomalyRecord).filter(AnomalyRecord.id == anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="异常记录不存在")

    proc_record = anomaly.processing_record
    question = proc_record.question
    batch = proc_record.batch

    anomaly_resp = AnomalyRecordResponse(
        id=anomaly.id,
        processing_record_id=anomaly.processing_record_id,
        anomaly_type=anomaly.anomaly_type,
        description=anomaly.description,
        detected_at=anomaly.detected_at,
        handling_opinion=anomaly.handling_opinion,
        resolved_at=anomaly.resolved_at,
        is_resolved=anomaly.is_resolved
    )

    question_resp = QuestionResponse(
        id=question.id,
        batch_id=question.batch_id,
        question_external_id=question.question_external_id,
        prompt=question.prompt,
        expected_code=question.expected_code,
        question_category=question.question_category,
        difficulty_level=question.difficulty_level,
        tags=question.tags
    )

    batch_resp = _build_batch_response(batch)

    proc_resp = ProcessingRecordResponse(
        id=proc_record.id,
        batch_id=proc_record.batch_id,
        question_id=proc_record.question_id,
        run_number=proc_record.run_number,
        status=proc_record.status,
        started_at=proc_record.started_at,
        completed_at=proc_record.completed_at,
        predicted_code=proc_record.predicted_code,
        execution_result=proc_record.execution_result,
        error_message=proc_record.error_message,
        quality_score=proc_record.quality_score,
        metrics=proc_record.metrics,
        processing_note=proc_record.processing_note,
        question=None,
        review_record=None
    )

    review_resp = None
    if proc_record.review_record:
        review_resp = ReviewRecordResponse(
            id=proc_record.review_record.id,
            processing_record_id=proc_record.review_record.processing_record_id,
            reviewer=proc_record.review_record.reviewer,
            reviewed_at=proc_record.review_record.reviewed_at,
            review_result=proc_record.review_record.review_result,
            review_comment=proc_record.review_record.review_comment,
            annotation_record=proc_record.review_record.annotation_record,
            manual_feedback=proc_record.review_record.manual_feedback,
            tag_conflicts=proc_record.review_record.tag_conflicts
        )

    return AnomalyTraceResponse(
        anomaly=anomaly_resp,
        processing_record=proc_resp,
        question=question_resp,
        batch=batch_resp,
        review_record=review_resp
    )


def _format_category_name(raw: Optional[str]) -> str:
    mapping = {
        "loop": "循环结构",
        "condition": "条件分支",
        "function": "函数定义",
        "class": "类定义",
        "error_handling": "异常处理",
        "algorithm": "算法实现",
        "data_structure": "数据结构",
        "string": "字符串处理",
        "math": "数学计算",
        "file_io": "文件操作"
    }
    if not raw:
        return "未分类"
    return mapping.get(raw, raw)


def _format_difficulty(raw: Optional[str]) -> str:
    mapping = {"easy": "简单", "medium": "中等", "hard": "困难"}
    if not raw:
        return "未标注"
    return mapping.get(raw, raw)


def _format_status(raw: ProcessingStatus) -> str:
    mapping = {
        ProcessingStatus.SUCCESS: "运行成功",
        ProcessingStatus.FAILED: "运行失败",
        ProcessingStatus.ANOMALY: "存在异常",
        ProcessingStatus.PENDING: "待处理",
        ProcessingStatus.RUNNING: "运行中"
    }
    return mapping.get(raw, str(raw))


def _format_review_result(raw: Optional[ReviewResult]) -> str:
    if not raw:
        return "未复核"
    mapping = {
        ReviewResult.APPROVED: "通过",
        ReviewResult.REJECTED: "驳回",
        ReviewResult.NEEDS_REVISION: "需修改"
    }
    return mapping.get(raw, str(raw))


@app.get("/api/batches/{batch_id}/export", summary="导出评测报告（非技术友好格式）")
def export_batch_report(batch_id: int, db: Session = Depends(get_db)):
    """
    导出评测报告，文件名包含批次编码、版本和运行轮次，便于区分。
    内容转为非技术人员可读的中文描述，避免字段名和缩写。
    """
    batch = db.query(EvaluationBatch).filter(EvaluationBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    records = db.query(ProcessingRecord).filter(
        ProcessingRecord.batch_id == batch_id,
        ProcessingRecord.run_number == batch.run_number
    ).all()

    filename = f"代码补全评测报告_{batch.batch_code}_v{batch.prompt_version}_第{batch.run_number}轮_{datetime.now().strftime('%Y%m%d')}.csv"

    output = io.StringIO()
    output.write('\ufeff')

    headers = [
        "题目编号", "题目分类", "难度等级", "提示词内容",
        "运行状态", "质量评分", "复核结论",
        "运行结果说明", "人工反馈意见", "标注记录", "标签冲突说明"
    ]
    output.write(",".join(headers) + "\n")

    for r in records:
        q = r.question
        review = r.review_record

        feedback_text = ""
        if review and review.manual_feedback:
            fb = review.manual_feedback
            parts = []
            if fb.get("accuracy"):
                parts.append(f"准确性:{fb['accuracy']}分")
            if fb.get("completeness"):
                parts.append(f"完整性:{fb['completeness']}分")
            if fb.get("comment"):
                parts.append(f"意见:{fb['comment']}")
            feedback_text = ";".join(parts)

        annotation_text = ""
        if review and review.annotation_record:
            ann = review.annotation_record
            parts = []
            if ann.get("annotator"):
                parts.append(f"标注人:{ann['annotator']}")
            if ann.get("correctness"):
                parts.append(f"正确性判断:{'正确' if ann['correctness'] else '错误'}")
            if ann.get("annotation_note"):
                parts.append(f"标注备注:{ann['annotation_note']}")
            annotation_text = ";".join(parts)

        conflict_text = ""
        if review and review.tag_conflicts:
            conflicts = review.tag_conflicts
            parts = []
            for c in conflicts:
                old = c.get("old_tag", "")
                new = c.get("new_tag", "")
                reason = c.get("reason", "")
                parts.append(f"[{old}→{new}:{reason}]")
            conflict_text = " ".join(parts)

        result_note = ""
        if r.error_message:
            result_note = f"运行出错: {r.error_message}"
        elif r.execution_result:
            result_note = f"执行结果: {r.execution_result[:100]}"

        row = [
            str(q.question_external_id or r.id),
            _format_category_name(q.question_category),
            _format_difficulty(q.difficulty_level),
            '"' + q.prompt.replace('"', '""') + '"',
            _format_status(r.status),
            str(r.quality_score or ""),
            _format_review_result(review.review_result if review else None),
            '"' + result_note.replace('"', '""') + '"',
            '"' + feedback_text.replace('"', '""') + '"',
            '"' + annotation_text.replace('"', '""') + '"',
            '"' + conflict_text.replace('"', '""') + '"'
        ]
        output.write(",".join(row) + "\n")

    summary_row = [
        "合计", "", "", "",
        f"共{len(records)}题",
        "", "", "", "", "", ""
    ]
    output.write(",".join(summary_row) + "\n")

    success_count = sum(1 for r in records if r.status == ProcessingStatus.SUCCESS)
    failed_count = sum(1 for r in records if r.status == ProcessingStatus.FAILED)
    anomaly_count = sum(1 for r in records if r.status == ProcessingStatus.ANOMALY)
    approved_count = sum(1 for r in records if r.review_record and r.review_record.review_result == ReviewResult.APPROVED)

    stats_row = [
        "统计", "", "", "",
        f"成功{success_count}题,失败{failed_count}题,异常{anomaly_count}题,通过复核{approved_count}题",
        "", "", "", "", "", ""
    ]
    output.write(",".join(stats_row) + "\n")

    if batch.description:
        output.write(f'"备注: {batch.description}"\n')

    output.seek(0)

    encoded_filename = quote(filename)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )


@app.get("/api/batches/{batch_code}/versions/{prompt_version}/runs", summary="查询同一批次的多轮运行历史")
def list_batch_runs(batch_code: str, prompt_version: str, db: Session = Depends(get_db)):
    """
    查询同一批提示词版本的所有运行历史，便于对比多轮结果。
    """
    batches = db.query(EvaluationBatch).filter(
        EvaluationBatch.batch_code == batch_code,
        EvaluationBatch.prompt_version == prompt_version
    ).order_by(EvaluationBatch.run_number).all()

    if not batches:
        raise HTTPException(status_code=404, detail="未找到该批次和版本的运行记录")

    return {
        "batch_code": batch_code,
        "prompt_version": prompt_version,
        "total_runs": len(batches),
        "runs": [
            {
                "run_number": b.run_number,
                "status": b.status,
                "created_at": b.created_at,
                "question_count": len(b.questions),
                "description": b.description
            }
            for b in batches
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
