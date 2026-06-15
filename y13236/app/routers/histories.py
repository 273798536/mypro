from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas

router = APIRouter(prefix="/histories", tags=["操作历史与撤回记录"])


@router.get("/operations", response_model=List[schemas.OperationHistory], summary="查看操作历史（备注/判断/结论改动）")
def list_operation_histories(
    schedule_id: Optional[int] = Query(None, description="按排期ID筛选"),
    conflict_id: Optional[int] = Query(None, description="按冲突ID筛选"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return crud.list_operation_histories(db, schedule_id=schedule_id, conflict_id=conflict_id, skip=skip, limit=limit)


@router.get("/withdrawals", response_model=List[schemas.WithdrawalRecord], summary="查看撤回记录（与冲突结论关联）")
def list_withdrawals(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return crud.list_withdrawals(db, skip=skip, limit=limit)
