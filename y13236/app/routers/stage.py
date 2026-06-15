from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas

router = APIRouter(prefix="/stage-channels", tags=["舞台通道表"])


@router.post("", response_model=schemas.StageChannel, summary="创建舞台通道记录")
def create_stage_channel(data: schemas.StageChannelCreate, db: Session = Depends(get_db)):
    return crud.create_stage_channel(db, data)


@router.get("", response_model=List[schemas.StageChannel], summary="查看舞台通道列表")
def list_stage_channels(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.list_stage_channels(db, skip=skip, limit=limit)


@router.get("/{channel_id}", response_model=schemas.StageChannel, summary="查看单条舞台通道详情")
def get_stage_channel(channel_id: int, db: Session = Depends(get_db)):
    channel = crud.get_stage_channel(db, channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="舞台通道记录不存在")
    return channel


router_rep = APIRouter(prefix="/repertoires", tags=["曲目表"])


@router_rep.post("", response_model=schemas.Repertoire, summary="创建曲目")
def create_repertoire(data: schemas.RepertoireCreate, db: Session = Depends(get_db)):
    return crud.create_repertoire(db, data)


@router_rep.get("", response_model=List[schemas.Repertoire], summary="查看曲目列表")
def list_repertoires(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.list_repertoires(db, skip=skip, limit=limit)
