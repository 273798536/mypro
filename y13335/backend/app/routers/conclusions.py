from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/conclusions", tags=["conclusions"])


@router.get("/", response_model=dict)
def list_conclusions(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    version_id: Optional[int] = None,
    is_final: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.ReviewConclusion)

    if version_id is not None:
        query = query.filter(models.ReviewConclusion.version_id == version_id)
    if is_final is not None:
        query = query.filter(models.ReviewConclusion.is_final == is_final)

    total = query.count()
    items = query.order_by(models.ReviewConclusion.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{conclusion_id}", response_model=schemas.ReviewConclusion)
def get_conclusion(conclusion_id: int, db: Session = Depends(get_db)):
    conclusion = db.query(models.ReviewConclusion).filter(models.ReviewConclusion.id == conclusion_id).first()
    if not conclusion:
        raise HTTPException(status_code=404, detail="Conclusion not found")
    return conclusion


@router.post("/", response_model=schemas.ReviewConclusion)
def create_conclusion(conclusion: schemas.ReviewConclusionCreate, db: Session = Depends(get_db)):
    db_conclusion = models.ReviewConclusion(**conclusion.model_dump())
    db.add(db_conclusion)
    db.commit()
    db.refresh(db_conclusion)
    return db_conclusion


@router.post("/generate")
def generate_conclusion(
    version_id: int,
    title: str,
    conclusion_id: Optional[str] = None,
    operator: Optional[str] = "",
    db: Session = Depends(get_db),
):
    version = db.query(models.AlgorithmVersion).filter(models.AlgorithmVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    evals = db.query(models.EvaluationRecord).filter(
        models.EvaluationRecord.version_id == version_id,
        models.EvaluationRecord.is_repeat_eval == False
    ).all()

    total = len(evals)
    pass_count = sum(1 for e in evals if e.is_pass)
    fail_count = total - pass_count

    corrections = db.query(models.ManualCorrection).filter(
        models.ManualCorrection.version_id == version_id
    ).count()

    scores = [e.score for e in evals]
    avg_score = sum(scores) / len(scores) if scores else 0

    metrics = {
        "pass_rate": round(pass_count / total, 4) if total > 0 else 0,
        "avg_score": round(avg_score, 4),
        "max_score": max(scores) if scores else 0,
        "min_score": min(scores) if scores else 0,
        "correction_count": corrections,
    }

    repeat_evals = db.query(models.EvaluationRecord).filter(
        models.EvaluationRecord.version_id == version_id,
        models.EvaluationRecord.is_repeat_eval == True
    ).count()

    highlights = [
        f"评测样本总数: {total}",
        f"通过样本数: {pass_count}",
        f"未通过样本数: {fail_count}",
        f"人工修正数: {corrections}",
        f"重复评测样本数（不计入正常统计）: {repeat_evals}",
        f"平均分数: {round(avg_score, 2)}",
    ]

    summary = (
        f"版本 {version.version} 知识库召回证据复核结论："
        f"共评测 {total} 条样本，通过 {pass_count} 条，通过率 {metrics['pass_rate']:.2%}，"
        f"人工修正 {corrections} 条。阈值配置：{version.threshold_config}。"
    )

    if not conclusion_id:
        conclusion_id = f"CONC-{version.version}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    db_conclusion = models.ReviewConclusion(
        conclusion_id=conclusion_id,
        version_id=version_id,
        title=title,
        summary=summary,
        total_samples=total,
        pass_count=pass_count,
        fail_count=fail_count,
        correction_count=corrections,
        metrics=metrics,
        highlights=highlights,
        is_final=False,
        operator=operator,
    )
    db.add(db_conclusion)
    db.commit()
    db.refresh(db_conclusion)

    return db_conclusion


@router.put("/{conclusion_id}/finalize")
def finalize_conclusion(conclusion_id: int, db: Session = Depends(get_db)):
    conclusion = db.query(models.ReviewConclusion).filter(models.ReviewConclusion.id == conclusion_id).first()
    if not conclusion:
        raise HTTPException(status_code=404, detail="Conclusion not found")
    conclusion.is_final = True
    conclusion.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Conclusion finalized", "conclusion_id": conclusion.conclusion_id}


@router.get("/{conclusion_id}/export")
def export_conclusion(conclusion_id: int, db: Session = Depends(get_db)):
    conclusion = db.query(models.ReviewConclusion).filter(models.ReviewConclusion.id == conclusion_id).first()
    if not conclusion:
        raise HTTPException(status_code=404, detail="Conclusion not found")

    evals = db.query(models.EvaluationRecord).filter(
        models.EvaluationRecord.version_id == conclusion.version_id
    ).all()

    details = []
    for e in evals:
        sample = db.query(models.Sample).filter(models.Sample.id == e.sample_id).first()
        corrections = db.query(models.ManualCorrection).filter(
            models.ManualCorrection.sample_id == e.sample_id,
            models.ManualCorrection.version_id == conclusion.version_id
        ).all()

        status_desc = "通过" if e.is_pass else "未通过"
        if e.is_repeat_eval:
            status_desc = "重复评测-" + status_desc

        details.append({
            "样本ID": sample.sample_id if sample else e.sample_id,
            "查询内容": sample.query if sample else "",
            "分数": e.score,
            "状态": status_desc,
            "是否重复评测": "是" if e.is_repeat_eval else "否",
            "人工修正数": len(corrections),
            "修正来源": [c.source for c in corrections],
        })

    return {
        "conclusion_id": conclusion.conclusion_id,
        "title": conclusion.title,
        "version": conclusion.version.version if conclusion.version else "",
        "summary": conclusion.summary,
        "metrics": conclusion.metrics,
        "highlights": conclusion.highlights,
        "is_final": conclusion.is_final,
        "operator": conclusion.operator,
        "created_at": conclusion.created_at,
        "sample_details": details,
    }
