from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas
from ..database import get_db
from ..errors.handlers import EvalSamplesNotFound

router = APIRouter(prefix="/api/human-feedback", tags=["human-feedback"])


@router.post("", response_model=schemas.HumanFeedbackOut, status_code=201)
def create_feedback(fb: schemas.HumanFeedbackCreate, db: Session = Depends(get_db)):
    sample = crud.get_eval_sample(db, fb.eval_sample_id)
    if not sample:
        raise EvalSamplesNotFound.by_ids([fb.eval_sample_id])
    created = crud.create_human_feedback(db, fb)
    return created


@router.get("/by-sample/{sample_id}", response_model=List[schemas.HumanFeedbackOut])
def list_by_sample(sample_id: int, db: Session = Depends(get_db)):
    sample = crud.get_eval_sample(db, sample_id)
    if not sample:
        raise EvalSamplesNotFound.by_ids([sample_id])
    return crud.list_feedback_by_sample(db, sample_id)


@router.get("", response_model=List[schemas.HumanFeedbackOut])
def list_all(skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    return crud.list_all_feedback(db, skip=skip, limit=limit)
