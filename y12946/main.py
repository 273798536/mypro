from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
from datetime import datetime

from database import engine, get_db, Base
import models
import schemas

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="多Agent轨迹质检系统",
    description="知识库运营用 - 多Agent轨迹质量检验平台",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== 批次管理 ==============

@app.post("/api/batches", response_model=schemas.Batch, summary="创建质检批次")
def create_batch(batch: schemas.BatchCreate, db: Session = Depends(get_db)):
    db_batch = models.InspectionBatch(
        name=batch.name,
        description=batch.description,
        status="draft"
    )
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)
    return db_batch


@app.get("/api/batches", response_model=schemas.BatchListResponse, summary="获取批次列表")
def list_batches(skip: int = 0, limit: int = 20, status: str = "", db: Session = Depends(get_db)):
    query = db.query(models.InspectionBatch)
    if status:
        query = query.filter(models.InspectionBatch.status == status)
    total = query.count()
    items = query.order_by(models.InspectionBatch.created_at.desc()).offset(skip).limit(limit).all()
    return schemas.BatchListResponse(total=total, items=items)


@app.get("/api/batches/{batch_id}", response_model=schemas.BatchDetailResponse, summary="获取批次详情")
def get_batch_detail(batch_id: int, db: Session = Depends(get_db)):
    batch = db.query(models.InspectionBatch).filter(models.InspectionBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    materials = db.query(models.Material).filter(models.Material.batch_id == batch_id).all()

    training_count = len([m for m in materials if m.material_type == "training"])
    eval_count = len([m for m in materials if m.material_type == "eval"])
    pass_count = len([m for m in materials if m.status == "passed"])
    fail_count = len([m for m in materials if m.status == "failed"])
    pending_count = len([m for m in materials if m.status == "pending"])

    interception_count = db.query(models.SafetyInterception).join(
        models.Material, models.SafetyInterception.material_id == models.Material.id
    ).filter(models.Material.batch_id == batch_id).count()

    label_conflict_count = db.query(models.LabelConflict).join(
        models.Material, models.LabelConflict.material_id == models.Material.id
    ).filter(models.Material.batch_id == batch_id, models.LabelConflict.is_resolved == False).count()

    rollback_count = db.query(models.RollbackRecord).filter(models.RollbackRecord.batch_id == batch_id).count()

    stats = {
        "total": len(materials),
        "training_count": training_count,
        "eval_count": eval_count,
        "pass_count": pass_count,
        "fail_count": fail_count,
        "pending_count": pending_count,
        "interception_count": interception_count,
        "label_conflict_count": label_conflict_count,
        "rollback_count": rollback_count,
    }

    return schemas.BatchDetailResponse(batch=batch, materials=materials, stats=stats)


@app.put("/api/batches/{batch_id}/status", response_model=schemas.Batch, summary="推进批次状态")
def update_batch_status(batch_id: int, req: schemas.StatusUpdateRequest, db: Session = Depends(get_db)):
    valid_statuses = ["draft", "imported", "reviewing", "completed", "exported"]
    if req.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"无效状态: {req.status}")

    batch = db.query(models.InspectionBatch).filter(models.InspectionBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    batch.status = req.status
    batch.updated_at = datetime.now()
    db.commit()
    db.refresh(batch)
    return batch


# ============== 材料导入 ==============

@app.post("/api/batches/import", summary="批量导入材料（训练样本/评测题库）")
def import_materials(req: schemas.BatchImportRequest, db: Session = Depends(get_db)):
    batch = db.query(models.InspectionBatch).filter(models.InspectionBatch.id == req.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    if req.material_type not in ["training", "eval"]:
        raise HTTPException(status_code=400, detail="material_type 必须是 training 或 eval")

    imported = []
    for item in req.items:
        mat = models.Material(
            batch_id=req.batch_id,
            material_type=req.material_type,
            title=item.title,
            content=item.content,
            answer=item.answer,
            source=item.source,
            difficulty=item.difficulty,
            knowledge_point=item.knowledge_point,
            status="pending"
        )
        db.add(mat)
        imported.append(mat)

    if batch.status == "draft":
        batch.status = "imported"
        batch.updated_at = datetime.now()

    db.commit()
    for mat in imported:
        db.refresh(mat)

    return {
        "success": True,
        "imported_count": len(imported),
        "material_type": req.material_type,
        "items": imported
    }


@app.get("/api/batches/{batch_id}/materials", response_model=List[schemas.Material], summary="获取批次材料列表")
def list_materials(
    batch_id: int,
    material_type: str = "",
    status: str = "",
    db: Session = Depends(get_db)
):
    query = db.query(models.Material).filter(models.Material.batch_id == batch_id)
    if material_type:
        query = query.filter(models.Material.material_type == material_type)
    if status:
        query = query.filter(models.Material.status == status)
    return query.order_by(models.Material.id).all()


@app.patch("/api/materials/{material_id}", response_model=schemas.Material, summary="更新材料属性")
def update_material(material_id: int, updates: schemas.MaterialUpdate, db: Session = Depends(get_db)):
    material = db.query(models.Material).filter(models.Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="材料不存在")

    update_data = updates.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(material, key, value)

    material.updated_at = datetime.now()
    db.commit()
    db.refresh(material)
    return material


@app.get("/api/materials/{material_id}", response_model=schemas.Material, summary="获取材料详情")
def get_material(material_id: int, db: Session = Depends(get_db)):
    material = db.query(models.Material).filter(models.Material.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="材料不存在")
    return material


# ============== Agent 轨迹 ==============

@app.post("/api/traces", response_model=schemas.AgentTrace, summary="添加Agent轨迹")
def create_trace(trace: schemas.AgentTraceCreate, db: Session = Depends(get_db)):
    material = db.query(models.Material).filter(models.Material.id == trace.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="材料不存在")

    db_trace = models.AgentTrace(
        batch_id=material.batch_id,
        material_id=trace.material_id,
        agent_name=trace.agent_name,
        agent_role=trace.agent_role,
        step_order=trace.step_order,
        input_text=trace.input_text,
        output_text=trace.output_text,
        thought_process=trace.thought_process,
        status=trace.status,
        judgment_before=trace.judgment_before,
        judgment_after=trace.judgment_after,
        is_intercepted=trace.is_intercepted,
        interception_reason=trace.interception_reason,
        cost_time_ms=trace.cost_time_ms,
        tokens_used=trace.tokens_used,
    )
    db.add(db_trace)
    db.commit()
    db.refresh(db_trace)
    return db_trace


@app.get("/api/materials/{material_id}/traces", response_model=List[schemas.AgentTrace], summary="获取材料的Agent轨迹")
def get_material_traces(material_id: int, db: Session = Depends(get_db)):
    return db.query(models.AgentTrace).filter(
        models.AgentTrace.material_id == material_id
    ).order_by(models.AgentTrace.step_order).all()


# ============== 复核流程 ==============

@app.post("/api/reviews/submit", response_model=schemas.ReviewRecord, summary="提交复核记录")
def submit_review(req: schemas.ReviewSubmitRequest, db: Session = Depends(get_db)):
    material = db.query(models.Material).filter(models.Material.id == req.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="材料不存在")

    review = models.ReviewRecord(
        batch_id=material.batch_id,
        material_id=req.material_id,
        reviewer=req.reviewer,
        review_type="manual",
        feedback=req.feedback,
        label=req.label,
        score=req.score,
        annotation_source="human",
        has_label_conflict=req.has_label_conflict,
        conflict_with=req.conflict_with,
        status="reviewed",
        review_round=req.review_round,
    )
    db.add(review)

    if req.has_label_conflict:
        conflict = models.LabelConflict(
            material_id=req.material_id,
            original_label=req.original_label,
            original_source=req.conflict_with,
            new_label=req.label,
            new_source="human_review",
            conflict_reason=req.feedback,
            is_resolved=False,
        )
        db.add(conflict)

    if material.status == "pending":
        material.status = "reviewing"

    db.commit()
    db.refresh(review)

    batch = db.query(models.InspectionBatch).filter(models.InspectionBatch.id == material.batch_id).first()
    if batch and batch.status not in ["reviewing", "completed", "exported"]:
        batch.status = "reviewing"
        batch.updated_at = datetime.now()

    return review


@app.get("/api/batches/{batch_id}/reviews", response_model=List[schemas.ReviewRecord], summary="获取批次复核记录")
def list_reviews(batch_id: int, db: Session = Depends(get_db)):
    return db.query(models.ReviewRecord).filter(
        models.ReviewRecord.batch_id == batch_id
    ).order_by(models.ReviewRecord.created_at.desc()).all()


@app.post("/api/label-conflicts/{conflict_id}/resolve", response_model=schemas.LabelConflict, summary="解决标签冲突")
def resolve_conflict(
    conflict_id: int,
    final_label: str,
    resolved_by: str = "知识库运营",
    db: Session = Depends(get_db)
):
    conflict = db.query(models.LabelConflict).filter(models.LabelConflict.id == conflict_id).first()
    if not conflict:
        raise HTTPException(status_code=404, detail="冲突记录不存在")

    conflict.is_resolved = True
    conflict.final_label = final_label
    conflict.resolved_by = resolved_by
    conflict.resolved_at = datetime.now()

    material = db.query(models.Material).filter(models.Material.id == conflict.material_id).first()
    if material:
        reviews = db.query(models.ReviewRecord).filter(
            models.ReviewRecord.material_id == material.id
        ).order_by(models.ReviewRecord.created_at.desc()).all()
        if reviews:
            latest = reviews[0]
            latest.label = final_label
            latest.has_label_conflict = False

    db.commit()
    db.refresh(conflict)
    return conflict


@app.get("/api/batches/{batch_id}/label-conflicts", response_model=List[schemas.LabelConflict], summary="获取批次标签冲突")
def list_label_conflicts(batch_id: int, resolved: bool = False, db: Session = Depends(get_db)):
    query = db.query(models.LabelConflict).join(
        models.Material, models.LabelConflict.material_id == models.Material.id
    ).filter(models.Material.batch_id == batch_id)

    if not resolved:
        query = query.filter(models.LabelConflict.is_resolved == False)
    else:
        query = query.filter(models.LabelConflict.is_resolved == True)

    return query.order_by(models.LabelConflict.created_at.desc()).all()


# ============== 安全拦截 & 分布统计 ==============

@app.post("/api/safety-interceptions", response_model=schemas.SafetyInterception, summary="记录安全拦截")
def create_interception(interception: schemas.SafetyInterceptionCreate, db: Session = Depends(get_db)):
    material = db.query(models.Material).filter(models.Material.id == interception.material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="材料不存在")

    db_intercept = models.SafetyInterception(
        material_id=interception.material_id,
        original_judgment=interception.original_judgment,
        original_score=interception.original_score,
        intercepted_judgment=interception.intercepted_judgment,
        intercepted_score=interception.intercepted_score,
        interception_type=interception.interception_type,
        interception_level=interception.interception_level,
        interception_detail=interception.interception_detail,
        is_rollback_applied=False,
        rollback_judgment="",
    )
    db.add(db_intercept)
    db.commit()
    db.refresh(db_intercept)
    return db_intercept


@app.get("/api/batches/{batch_id}/distribution", response_model=schemas.DistributionStats, summary="获取安全拦截前后分布对比")
def get_distribution(batch_id: int, db: Session = Depends(get_db)):
    interceptions = db.query(models.SafetyInterception).join(
        models.Material, models.SafetyInterception.material_id == models.Material.id
    ).filter(models.Material.batch_id == batch_id).all()

    before_dist = {}
    after_dist = {}
    changed_count = 0

    for intercept in interceptions:
        key_before = intercept.original_judgment or "unknown"
        key_after = intercept.intercepted_judgment or "unknown"
        before_dist[key_before] = before_dist.get(key_before, 0) + 1
        after_dist[key_after] = after_dist.get(key_after, 0) + 1

        if intercept.original_judgment != intercept.intercepted_judgment:
            changed_count += 1

    materials = db.query(models.Material).filter(models.Material.batch_id == batch_id).all()
    status_before = {}
    for m in materials:
        key = m.status or "unknown"
        status_before[key] = status_before.get(key, 0) + 1

    return schemas.DistributionStats(
        before=before_dist if before_dist else status_before,
        after=after_dist if after_dist else status_before,
        changed_count=changed_count
    )


# ============== 版本回滚 ==============

@app.post("/api/rollbacks", response_model=schemas.RollbackRecord, summary="记录版本回滚")
def create_rollback(rollback: schemas.RollbackRecordCreate, db: Session = Depends(get_db)):
    batch = db.query(models.InspectionBatch).filter(models.InspectionBatch.id == rollback.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    materials = db.query(models.Material).filter(models.Material.batch_id == rollback.batch_id).all()
    total_before = len(materials)
    lost_count = len(rollback.lost_material_ids)
    total_after = total_before - lost_count

    db_rollback = models.RollbackRecord(
        batch_id=rollback.batch_id,
        rollback_from_version=rollback.rollback_from_version,
        rollback_to_version=rollback.rollback_to_version,
        reason=rollback.reason,
        total_materials_before=total_before,
        total_materials_after=total_after,
        lost_count=lost_count,
        lost_material_ids=rollback.lost_material_ids,
        lost_material_titles=rollback.lost_material_titles,
        stuck_material_id=rollback.stuck_material_id,
        stuck_material_title=rollback.stuck_material_title,
        stuck_reason=rollback.stuck_reason,
        operator=rollback.operator,
    )
    db.add(db_rollback)
    db.commit()
    db.refresh(db_rollback)
    return db_rollback


@app.get("/api/batches/{batch_id}/rollbacks", response_model=List[schemas.RollbackRecord], summary="获取批次回滚记录")
def list_rollbacks(batch_id: int, db: Session = Depends(get_db)):
    return db.query(models.RollbackRecord).filter(
        models.RollbackRecord.batch_id == batch_id
    ).order_by(models.RollbackRecord.created_at.desc()).all()


# ============== 报告导出 ==============

@app.post("/api/reports/generate", response_model=schemas.InspectionReport, summary="生成质检报告")
def generate_report(req: schemas.ReportGenerateRequest, db: Session = Depends(get_db)):
    batch = db.query(models.InspectionBatch).filter(models.InspectionBatch.id == req.batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")

    materials = db.query(models.Material).filter(models.Material.batch_id == req.batch_id).all()
    total = len(materials)
    training_count = len([m for m in materials if m.material_type == "training"])
    eval_count = len([m for m in materials if m.material_type == "eval"])

    pass_count = len([m for m in materials if m.status == "passed"])
    fail_count = len([m for m in materials if m.status == "failed"])
    pending_count = len([m for m in materials if m.status == "pending" or m.status == "reviewing"])
    pass_rate = (pass_count / total * 100) if total > 0 else 0.0

    interceptions = db.query(models.SafetyInterception).join(
        models.Material, models.SafetyInterception.material_id == models.Material.id
    ).filter(models.Material.batch_id == req.batch_id).all()
    interception_count = len(interceptions)

    label_conflicts = db.query(models.LabelConflict).join(
        models.Material, models.LabelConflict.material_id == models.Material.id
    ).filter(models.Material.batch_id == req.batch_id).all()
    label_conflict_count = len([c for c in label_conflicts if not c.is_resolved])

    rollbacks = db.query(models.RollbackRecord).filter(models.RollbackRecord.batch_id == req.batch_id).all()
    rollback_affected_count = sum(r.lost_count for r in rollbacks)

    issue_count = interception_count + label_conflict_count + rollback_affected_count

    dist_before = {}
    dist_after = {}
    for intercept in interceptions:
        kb = intercept.original_judgment or "unknown"
        ka = intercept.intercepted_judgment or "unknown"
        dist_before[kb] = dist_before.get(kb, 0) + 1
        dist_after[ka] = dist_after.get(ka, 0) + 1

    rollback_stuck = {}
    for r in rollbacks:
        if r.stuck_material_id:
            rollback_stuck[str(r.id)] = {
                "stuck_material_id": r.stuck_material_id,
                "stuck_material_title": r.stuck_material_title,
                "stuck_reason": r.stuck_reason,
                "rollback_from": r.rollback_from_version,
                "rollback_to": r.rollback_to_version,
            }

    old_table_count = len([m for m in materials if m.is_old_table])
    supplement_note_count = len([m for m in materials if m.has_supplement_note])
    missing_unit_count = len([m for m in materials if m.missing_unit])
    bias_sample_count = len([m for m in materials if m.is_bias_sample])

    summary_parts = []
    if issue_count > 0:
        summary_parts.append(f"共发现 {issue_count} 个问题")
    if interception_count > 0:
        summary_parts.append(f"其中安全拦截 {interception_count} 条")
    if label_conflict_count > 0:
        summary_parts.append(f"标签冲突 {label_conflict_count} 条")
    if rollback_affected_count > 0:
        summary_parts.append(f"版本回滚影响 {rollback_affected_count} 条")
    summary = "；".join(summary_parts) if summary_parts else "整体质量良好"

    report = models.InspectionReport(
        batch_id=req.batch_id,
        title=req.title or f"{batch.name} - 质检报告",
        summary=summary,
        total_materials=total,
        training_count=training_count,
        eval_count=eval_count,
        pass_count=pass_count,
        fail_count=fail_count,
        pending_count=pending_count,
        pass_rate=round(pass_rate, 2),
        issue_count=issue_count,
        interception_count=interception_count,
        rollback_affected_count=rollback_affected_count,
        label_conflict_count=label_conflict_count,
        distribution_before=dist_before,
        distribution_after=dist_after,
        rollback_stuck_details=rollback_stuck,
        detail_data={
            "old_table_count": old_table_count,
            "supplement_note_count": supplement_note_count,
            "missing_unit_count": missing_unit_count,
            "bias_sample_count": bias_sample_count,
            "batch_status": batch.status,
            "review_rounds": max(
                (r.review_round for r in db.query(models.ReviewRecord).filter(
                    models.ReviewRecord.batch_id == req.batch_id
                ).all()),
                default=0
            ),
        },
        exported_by=req.exported_by,
    )
    db.add(report)

    if batch.status != "exported":
        batch.status = "exported"
        batch.updated_at = datetime.now()

    db.commit()
    db.refresh(report)
    return report


@app.get("/api/batches/{batch_id}/reports", response_model=List[schemas.InspectionReport], summary="获取批次报告列表")
def list_reports(batch_id: int, db: Session = Depends(get_db)):
    return db.query(models.InspectionReport).filter(
        models.InspectionReport.batch_id == batch_id
    ).order_by(models.InspectionReport.export_time.desc()).all()


@app.get("/api/reports/{report_id}", response_model=schemas.InspectionReport, summary="获取报告详情")
def get_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(models.InspectionReport).filter(models.InspectionReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在")
    return report


# ============== 健康检查 ==============

@app.get("/api/health", summary="健康检查")
def health_check():
    return {"status": "ok", "message": "多Agent轨迹质检服务运行正常"}


@app.get("/", summary="根路径")
def root():
    return {
        "name": "多Agent轨迹质检系统",
        "version": "1.0.0",
        "description": "知识库运营 - 多Agent轨迹质量检验平台",
        "docs": "/docs"
    }
