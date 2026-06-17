from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import crud, schemas
from ..database import get_db
from ..errors.handlers import PromptVersionNotFound, GrayCompareTaskNotFound
from ..services.consistency import compute_summary_hash, build_compare_summary

router = APIRouter(prefix="/api/gray-compare", tags=["gray-compare"])


@router.post("", response_model=schemas.GrayCompareTaskOut, status_code=201)
def create_compare(payload: schemas.GrayCompareCreate, db: Session = Depends(get_db)):
    va = crud.get_prompt_version(db, payload.version_a_id)
    if not va:
        raise PromptVersionNotFound.by_id(payload.version_a_id, used_by="灰度对比任务 version_a")
    vb = crud.get_prompt_version(db, payload.version_b_id)
    if not vb:
        raise PromptVersionNotFound.by_id(payload.version_b_id, used_by="灰度对比任务 version_b")
    task = crud.create_gray_compare(db, payload)
    return _out(task, db, include_diff=False)


@router.get("", response_model=List[schemas.GrayCompareTaskOut])
def list_compares(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    tasks = crud.list_gray_compare(db, skip=skip, limit=limit)
    return [_out(t, db, include_diff=False) for t in tasks]


@router.get("/{cid}", response_model=schemas.GrayCompareTaskOut)
def get_compare(
    cid: int,
    include_diff: bool = Query(default=False, description="是否包含逐样本 diff 明细"),
    db: Session = Depends(get_db),
):
    t = crud.get_gray_compare(db, cid)
    if not t:
        raise GrayCompareTaskNotFound.by_id(cid)
    return _out(t, db, include_diff=include_diff)


@router.get("/{cid}/summary-hash")
def get_summary_hash(cid: int, db: Session = Depends(get_db)):
    t = crud.get_gray_compare(db, cid)
    if not t:
        raise GrayCompareTaskNotFound.by_id(cid)
    return {
        "compare_id": cid,
        "summary_hash": compute_summary_hash(db, t),
        "summary": build_compare_summary(db, t),
    }


def _out(task, db: Session, include_diff: bool):
    va = crud.get_prompt_version(db, task.version_a_id)
    vb = crud.get_prompt_version(db, task.version_b_id)
    metrics = schemas.MetricsSummary(**(task.metrics_summary or {}))
    diffs = None
    if include_diff:
        raw = crud.compute_sample_diffs(db, task)
        diffs = [schemas.SampleDiff(**d) for d in raw]
        counts = {"APPROVED": 0, "REVIEW_REQUIRED": 0, "RERUN": 0}
        for d in raw:
            k = d.get("decision") or "REVIEW_REQUIRED"
            counts[k] = counts.get(k, 0) + 1
        metrics.decision_counts = counts
    return schemas.GrayCompareTaskOut(
        id=task.id,
        version_a_id=task.version_a_id,
        version_b_id=task.version_b_id,
        version_a_tag=va.version_tag if va else "",
        version_b_tag=vb.version_tag if vb else "",
        metrics_summary=metrics,
        status=task.status,
        consistency_flag=task.consistency_flag,
        created_at=task.created_at,
        sample_diffs=diffs,
        summary_hash=compute_summary_hash(db, task),
    )
