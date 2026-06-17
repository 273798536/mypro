from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import crud, schemas
from ..database import get_db
from ..errors.handlers import PromptVersionNotFound, EvalSamplesNotFound
from ..models import EvalStatus

router = APIRouter(prefix="/api/eval-samples", tags=["eval-samples"])


@router.post("", response_model=List[schemas.EvalSampleOut], status_code=201)
def batch_create(payload: schemas.EvalSampleBatchCreate, db: Session = Depends(get_db)):
    pv = crud.get_prompt_version(db, payload.prompt_version_id)
    if not pv:
        raise PromptVersionNotFound.by_id(
            payload.prompt_version_id,
            used_by="批量录入评测样本请求",
        )
    created = crud.batch_create_eval_samples(db, payload.prompt_version_id, payload.samples)
    return _enrich(created, db)


@router.get("", response_model=List[schemas.EvalSampleOut])
def list_samples(
    prompt_version_id: Optional[int] = None,
    eval_status: Optional[str] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    skip: int = 0,
    limit: int = 500,
    db: Session = Depends(get_db),
):
    samples = crud.list_eval_samples(
        db,
        prompt_version_id=prompt_version_id,
        eval_status=eval_status,
        min_score=min_score,
        max_score=max_score,
        skip=skip,
        limit=limit,
    )
    return _enrich(samples, db)


@router.get("/{sample_id}", response_model=schemas.EvalSampleOut)
def get_sample(sample_id: int, db: Session = Depends(get_db)):
    s = crud.get_eval_sample(db, sample_id)
    if not s:
        raise EvalSamplesNotFound.by_ids([sample_id])
    enriched = _enrich([s], db)
    return enriched[0]


def _enrich(samples, db: Session):
    out = []
    for s in samples:
        fb = crud.latest_feedback_for_sample(db, s.id)
        data = schemas.EvalSampleOut(
            id=s.id,
            prompt_version_id=s.prompt_version_id,
            input_text=s.input_text,
            model_output=s.model_output,
            score=s.score,
            safety_violations=s.safety_violations or [],
            eval_status=EvalStatus(s.eval_status.value),
            source_material_ref=s.source_material_ref,
            created_at=s.created_at,
            latest_decision=fb.final_decision if fb else None,
            latest_reason=fb.reason if fb else None,
        )
        out.append(data)
    return out
