from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.crud.trade import crud_agreement, crud_seat, crud_restriction, crud_fund
from app.schemas.trade import (
    TradeAgreementCreate, TradeAgreementResponse,
    SeatInfoCreate, SeatInfoResponse,
    RestrictionRuleCreate, RestrictionRuleResponse,
    FundRecordCreate, FundRecordResponse
)

router = APIRouter(tags=["基础材料"])


@router.post("/agreements/", response_model=TradeAgreementResponse, summary="创建交易协议")
def create_agreement(data: TradeAgreementCreate, db: Session = Depends(get_db)):
    existing = crud_agreement.get_by_agreement_no(db, data.agreement_no)
    if existing:
        raise HTTPException(status_code=400, detail=f"协议编号{data.agreement_no}已存在")
    return crud_agreement.create(db, obj_in=data)


@router.get("/agreements/{agreement_id}", response_model=TradeAgreementResponse, summary="查看协议详情")
def get_agreement(agreement_id: int, db: Session = Depends(get_db)):
    obj = crud_agreement.get(db, id=agreement_id)
    if not obj:
        raise HTTPException(status_code=404, detail="协议不存在")
    return obj


@router.post("/seats/", response_model=SeatInfoResponse, summary="创建席位信息")
def create_seat(data: SeatInfoCreate, db: Session = Depends(get_db)):
    existing = crud_seat.get_by_seat_code(db, data.seat_code)
    if existing:
        raise HTTPException(status_code=400, detail=f"席位代码{data.seat_code}已存在")
    return crud_seat.create(db, obj_in=data)


@router.get("/seats/{seat_id}", response_model=SeatInfoResponse, summary="查看席位详情")
def get_seat(seat_id: int, db: Session = Depends(get_db)):
    obj = crud_seat.get(db, id=seat_id)
    if not obj:
        raise HTTPException(status_code=404, detail="席位信息不存在")
    return obj


@router.post("/restrictions/", response_model=RestrictionRuleResponse, summary="创建限售规则")
def create_restriction(data: RestrictionRuleCreate, db: Session = Depends(get_db)):
    existing = crud_restriction.get_by_rule_code(db, data.rule_code)
    if existing:
        raise HTTPException(status_code=400, detail=f"限售规则编号{data.rule_code}已存在")
    return crud_restriction.create(db, obj_in=data)


@router.get("/restrictions/{restriction_id}", response_model=RestrictionRuleResponse, summary="查看限售规则详情")
def get_restriction(restriction_id: int, db: Session = Depends(get_db)):
    obj = crud_restriction.get(db, id=restriction_id)
    if not obj:
        raise HTTPException(status_code=404, detail="限售规则不存在")
    return obj


@router.post("/funds/", response_model=FundRecordResponse, summary="创建资金到账记录")
def create_fund(data: FundRecordCreate, db: Session = Depends(get_db)):
    return crud_fund.create(db, obj_in=data)


@router.get("/funds/trade/{trade_id}", response_model=list[FundRecordResponse], summary="查看交易的资金记录")
def get_trade_funds(trade_id: int, db: Session = Depends(get_db)):
    return crud_fund.get_by_trade_id(db, trade_id)
