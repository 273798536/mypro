from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, datetime

from app.database import get_db
from app.crud.trade import crud_trade, crud_agreement, crud_seat, crud_restriction, crud_fund
from app.schemas.trade import (
    TradeCreate, TradeResponse, TradeListResponse, TradeDetailResponse,
    TradeAgreementCreate, TradeAgreementResponse,
    SeatInfoCreate, SeatInfoResponse,
    RestrictionRuleCreate, RestrictionRuleResponse,
    FundRecordCreate, FundRecordResponse,
    VerificationRequest, VerificationConclusionResponse,
    LockRequest, ExportRequest, ExportResponse,
    VerificationRecordResponse, TraceLogResponse, StatusTransitionResponse
)
from app.services.verification_engine import verification_engine

router = APIRouter(prefix="/trades", tags=["交易台账"])


@router.post("/", response_model=TradeResponse, summary="录入交易")
def create_trade(trade_in: TradeCreate, db: Session = Depends(get_db)):
    existing = crud_trade.get_by_trade_code(db, trade_in.trade_code)
    if existing:
        raise HTTPException(status_code=400, detail=f"交易编号{trade_in.trade_code}已存在")
    trade = crud_trade.create(db, obj_in=trade_in)
    return trade


@router.get("/", response_model=TradeListResponse, summary="查询交易列表")
def list_trades(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[str] = None,
    stock_code: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    total, items = crud_trade.get_multi_filters(
        db, start_date=start_date, end_date=end_date,
        status=status, stock_code=stock_code,
        skip=skip, limit=limit
    )
    return TradeListResponse(total=total, items=items)


@router.get("/{trade_id}", response_model=TradeDetailResponse, summary="查看交易详情(含核对记录和追溯)")
def get_trade_detail(trade_id: int, db: Session = Depends(get_db)):
    detail = crud_trade.get_detail(db, trade_id)
    if not detail:
        raise HTTPException(status_code=404, detail="交易不存在")
    return detail


@router.post("/verify", response_model=VerificationConclusionResponse, summary="执行交易核对")
def verify_trade(req: VerificationRequest, db: Session = Depends(get_db)):
    result = verification_engine.verify_trade(db, trade_id=req.trade_id, operator=req.operator)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    trade = crud_trade.get(db, id=req.trade_id)
    verification_records = sorted(trade.verification_records, key=lambda x: x.verified_at)

    return VerificationConclusionResponse(
        trade_id=result["trade_id"],
        final_status=result["final_status"],
        verification_records=verification_records,
        suggested_next_action=result.get("suggested_next_action")
    )


@router.post("/lock", response_model=TradeResponse, summary="锁定/解锁交易")
def lock_trade(req: LockRequest, db: Session = Depends(get_db)):
    trade = crud_trade.get(db, id=req.trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="交易不存在")
    trade = crud_trade.set_lock(db, db_obj=trade, locked=req.lock, operator=req.operator)
    return trade


@router.post("/export", response_model=ExportResponse, summary="导出交易清单")
def export_trades(req: ExportRequest, db: Session = Depends(get_db)):
    total, trades = crud_trade.get_multi_filters(
        db, start_date=req.start_date, end_date=req.end_date,
        status=req.status, stock_code=req.stock_code,
        skip=0, limit=5000
    )
    details = []
    for trade in trades:
        detail = crud_trade.get_detail(db, trade.id)
        if detail:
            details.append(detail)
    return ExportResponse(
        total=total,
        export_time=datetime.now(),
        data=details
    )


@router.get("/{trade_id}/traces", response_model=list[TraceLogResponse], summary="查看交易追溯日志")
def get_trade_traces(trade_id: int, db: Session = Depends(get_db)):
    trade = crud_trade.get(db, id=trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="交易不存在")
    return sorted(trade.trace_logs, key=lambda x: x.id)


@router.get("/{trade_id}/transitions", response_model=list[StatusTransitionResponse], summary="查看交易状态变更历史")
def get_trade_transitions(trade_id: int, db: Session = Depends(get_db)):
    trade = crud_trade.get(db, id=trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="交易不存在")
    return sorted(trade.status_transitions, key=lambda x: x.transition_at)
