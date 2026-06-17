from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.crud import crud
from app.schemas import schemas

router = APIRouter(prefix="/api/prompt-versions", tags=["提示词版本"])


@router.post("", response_model=schemas.PromptVersion, summary="新建提示词版本（补录）")
def create_prompt_version(pv_in: schemas.PromptVersionCreate, db: Session = Depends(get_db)):
    return crud.create_prompt_version(db, pv_in)


@router.get("", response_model=List[schemas.PromptVersion], summary="查询所有提示词版本")
def list_prompt_versions(db: Session = Depends(get_db)):
    return crud.list_prompt_versions(db)


@router.get("/{pv_id}", response_model=schemas.PromptVersion, summary="查询提示词版本详情")
def get_prompt_version(pv_id: int, db: Session = Depends(get_db)):
    db_pv = crud.get_prompt_version(db, pv_id)
    if not db_pv:
        raise HTTPException(status_code=404, detail="提示词版本不存在")
    return db_pv
