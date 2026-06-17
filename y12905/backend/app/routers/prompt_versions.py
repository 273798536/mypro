from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas
from ..database import get_db
from ..errors.handlers import PromptVersionNotFound

router = APIRouter(prefix="/api/prompt-versions", tags=["prompt-versions"])


@router.post("", response_model=schemas.PromptVersionOut, status_code=201)
def create_pv(pv: schemas.PromptVersionCreate, db: Session = Depends(get_db)):
    existing = crud.get_prompt_version_by_tag(db, pv.version_tag)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"version_tag '{pv.version_tag}' 已存在 (id={existing.id})，请使用其他版本标签或 PATCH 更新。",
        )
    return crud.create_prompt_version(db, pv)


@router.get("", response_model=List[schemas.PromptVersionOut])
def list_pv(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.list_prompt_versions(db, skip=skip, limit=limit)


@router.get("/{pv_id}", response_model=schemas.PromptVersionOut)
def get_pv(pv_id: int, db: Session = Depends(get_db)):
    pv = crud.get_prompt_version(db, pv_id)
    if not pv:
        raise PromptVersionNotFound.by_id(pv_id)
    return pv


@router.get("/tag/{tag}", response_model=schemas.PromptVersionOut)
def get_pv_by_tag(tag: str, db: Session = Depends(get_db)):
    pv = crud.get_prompt_version_by_tag(db, tag)
    if not pv:
        raise PromptVersionNotFound.by_tag(tag)
    return pv
