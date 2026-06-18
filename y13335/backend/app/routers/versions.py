from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/versions", tags=["versions"])


@router.get("/", response_model=List[schemas.AlgorithmVersion])
def list_versions(db: Session = Depends(get_db)):
    return db.query(models.AlgorithmVersion).order_by(models.AlgorithmVersion.created_at.desc()).all()


@router.get("/{version_id}", response_model=schemas.AlgorithmVersion)
def get_version(version_id: int, db: Session = Depends(get_db)):
    version = db.query(models.AlgorithmVersion).filter(models.AlgorithmVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version


@router.post("/", response_model=schemas.AlgorithmVersion)
def create_version(version: schemas.AlgorithmVersionCreate, db: Session = Depends(get_db)):
    existing = db.query(models.AlgorithmVersion).filter(models.AlgorithmVersion.version == version.version).first()
    if existing:
        raise HTTPException(status_code=400, detail="Version already exists")

    db_version = models.AlgorithmVersion(**version.model_dump())
    db.add(db_version)
    db.commit()
    db.refresh(db_version)
    return db_version


@router.put("/{version_id}/activate")
def activate_version(version_id: int, db: Session = Depends(get_db)):
    db.query(models.AlgorithmVersion).filter(models.AlgorithmVersion.is_active == True).update({"is_active": False})

    version = db.query(models.AlgorithmVersion).filter(models.AlgorithmVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    version.is_active = True
    db.commit()
    return {"message": "Version activated"}


@router.get("/{version_id}/compare/{other_version_id}")
def compare_versions(version_id: int, other_version_id: int, db: Session = Depends(get_db)):
    v_old = db.query(models.AlgorithmVersion).filter(models.AlgorithmVersion.id == other_version_id).first()
    v_new = db.query(models.AlgorithmVersion).filter(models.AlgorithmVersion.id == version_id).first()

    if not v_old or not v_new:
        raise HTTPException(status_code=404, detail="Version not found")

    evals_old = db.query(models.EvaluationRecord).filter(
        models.EvaluationRecord.version_id == other_version_id
    ).all()
    evals_new = db.query(models.EvaluationRecord).filter(
        models.EvaluationRecord.version_id == version_id
    ).all()

    old_map = {e.sample_id: e for e in evals_old}
    new_map = {e.sample_id: e for e in evals_new}

    all_sample_ids = set(old_map.keys()) | set(new_map.keys())

    same_count = 0
    diff_count = 0
    pass_increase = 0
    pass_decrease = 0
    sample_diffs = []

    for sid in all_sample_ids:
        old_eval = old_map.get(sid)
        new_eval = new_map.get(sid)

        if old_eval and new_eval:
            if old_eval.is_pass == new_eval.is_pass:
                same_count += 1
            else:
                diff_count += 1
                if new_eval.is_pass and not old_eval.is_pass:
                    pass_increase += 1
                else:
                    pass_decrease += 1

                sample_diffs.append({
                    "sample_id": sid,
                    "sample_query": old_eval.sample.query if old_eval.sample else "",
                    "old_pass": old_eval.is_pass,
                    "new_pass": new_eval.is_pass,
                    "old_score": old_eval.score,
                    "new_score": new_eval.score,
                    "old_is_repeat": old_eval.is_repeat_eval,
                    "new_is_repeat": new_eval.is_repeat_eval,
                })

    threshold_diff = {
        "old": v_old.threshold_config,
        "new": v_new.threshold_config,
    }

    corrections_new = db.query(models.ManualCorrection).filter(
        models.ManualCorrection.version_id == version_id
    ).count()
    corrections_old = db.query(models.ManualCorrection).filter(
        models.ManualCorrection.version_id == other_version_id
    ).count()

    correction_stats = {
        "old_count": corrections_old,
        "new_count": corrections_new,
        "increase": corrections_new - corrections_old,
    }

    return {
        "version_old": v_old,
        "version_new": v_new,
        "total_samples": len(all_sample_ids),
        "same_count": same_count,
        "diff_count": diff_count,
        "pass_increase": pass_increase,
        "pass_decrease": pass_decrease,
        "threshold_diff": threshold_diff,
        "sample_diffs": sample_diffs,
        "correction_stats": correction_stats,
    }
