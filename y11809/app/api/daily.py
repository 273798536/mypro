from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import and_
from datetime import datetime
from app.core.database import get_db
from app.models.schemas import (
    StudentCardCreate, StudentCardUpdate, StudentCardResponse, StudentCardBalance,
    RechargeRecordCreate, ConsumeRevokeCreate, SubsidyRuleCreate,
    BatchImportRequest, BatchImportResult,
    RefundRuleMatchRequest, RefundRuleMatchResponse,
    BalanceLayerQuery,
)
from app.models.models import StudentCard, RechargeRecord, ConsumeRevoke, SubsidyRule
from app.services.refund_service import BalanceService, RefundRuleEngine
from app.services.batch_import_service import BatchImportService

router = APIRouter(prefix="/api/daily", tags=["日常操作"])


@router.post("/cards", response_model=StudentCardResponse)
def create_card(card_data: StudentCardCreate, db: Session = Depends(get_db)):
    """新增学生卡"""
    existing = db.query(StudentCard).filter(StudentCard.card_no == card_data.card_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="卡号已存在")

    card = StudentCard(**card_data.model_dump())
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


@router.get("/cards/{card_no}", response_model=StudentCardResponse)
def get_card(card_no: str, db: Session = Depends(get_db)):
    """查询学生卡"""
    card = db.query(StudentCard).filter(StudentCard.card_no == card_no).first()
    if not card:
        raise HTTPException(status_code=404, detail="卡号不存在")
    return card


@router.put("/cards/{card_no}", response_model=StudentCardResponse)
def update_card(card_no: str, update_data: StudentCardUpdate, db: Session = Depends(get_db)):
    """更新学生卡"""
    card = db.query(StudentCard).filter(StudentCard.card_no == card_no).first()
    if not card:
        raise HTTPException(status_code=404, detail="卡号不存在")

    update_dict = update_data.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(card, k, v)
    card.updated_at = datetime.now()
    db.commit()
    db.refresh(card)
    return card


@router.get("/balance/{card_no}", response_model=StudentCardBalance)
def get_card_balance(card_no: str, db: Session = Depends(get_db)):
    """查询余额分层"""
    card = BalanceService.update_card_balance(db, card_no)
    if not card:
        raise HTTPException(status_code=404, detail="卡号不存在")

    return StudentCardBalance(
        card_no=card.card_no,
        student_name=card.student_name,
        total_balance=card.total_balance,
        subsidy_balance=card.subsidy_balance,
        recharge_balance=card.recharge_balance,
        revoke_balance=card.revoke_balance,
        is_merged=card.is_merged,
        merged_from=card.merged_from,
        merged_to=card.merged_to,
    )


@router.get("/balance/layers/query", response_model=List[StudentCardBalance])
def query_balance_layers(
    card_no: Optional[str] = None,
    department: Optional[str] = None,
    min_total_balance: Optional[float] = None,
    has_blocked_subsidy: Optional[bool] = None,
    has_cross_day_revoke: Optional[bool] = None,
    has_merged_card: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    """余额分层查询，支持多维度筛选"""
    from app.models.models import RefundRecord

    query = db.query(StudentCard)

    if card_no:
        query = query.filter(StudentCard.card_no.like(f"%{card_no}%"))
    if department:
        query = query.filter(StudentCard.department.like(f"%{department}%"))
    if min_total_balance is not None:
        query = query.filter(StudentCard.total_balance >= min_total_balance)

    cards = query.all()
    results = []

    for card in cards:
        card = BalanceService.update_card_balance(db, card.card_no)

        latest_refund = db.query(RefundRecord).filter(
            RefundRecord.card_no == card.card_no
        ).order_by(RefundRecord.created_at.desc()).first()

        include = True
        if has_blocked_subsidy is not None:
            if latest_refund and latest_refund.has_blocked_subsidy != has_blocked_subsidy:
                include = False
        if has_cross_day_revoke is not None:
            if latest_refund and latest_refund.has_cross_day_revoke != has_cross_day_revoke:
                include = False
        if has_merged_card is not None:
            if card.is_merged != has_merged_card:
                include = False

        if include:
            results.append(
                StudentCardBalance(
                    card_no=card.card_no,
                    student_name=card.student_name,
                    total_balance=card.total_balance,
                    subsidy_balance=card.subsidy_balance,
                    recharge_balance=card.recharge_balance,
                    revoke_balance=card.revoke_balance,
                    is_merged=card.is_merged,
                    merged_from=card.merged_from,
                    merged_to=card.merged_to,
                )
            )

    return results


@router.post("/recharges")
def create_recharge(recharge_data: RechargeRecordCreate, db: Session = Depends(get_db)):
    """新增充值流水"""
    existing = db.query(RechargeRecord).filter(
        RechargeRecord.recharge_no == recharge_data.recharge_no
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="充值单号已存在")

    card = db.query(StudentCard).filter(StudentCard.card_no == recharge_data.card_no).first()
    if not card:
        card = StudentCard(
            card_no=recharge_data.card_no,
            status="normal",
            remark="自动创建"
        )
        db.add(card)
        db.flush()

    data = recharge_data.model_dump()
    if not data.get("recharge_time"):
        data["recharge_time"] = datetime.now()

    record = RechargeRecord(**data)
    db.add(record)
    db.commit()
    db.refresh(record)

    BalanceService.update_card_balance(db, recharge_data.card_no)
    return record


@router.post("/revokes")
def create_revoke(revoke_data: ConsumeRevokeCreate, db: Session = Depends(get_db)):
    """新增消费撤销"""
    existing = db.query(ConsumeRevoke).filter(
        ConsumeRevoke.revoke_no == revoke_data.revoke_no
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="撤销单号已存在")

    card = db.query(StudentCard).filter(StudentCard.card_no == revoke_data.card_no).first()
    if not card:
        card = StudentCard(
            card_no=revoke_data.card_no,
            status="normal",
            remark="自动创建"
        )
        db.add(card)
        db.flush()

    data = revoke_data.model_dump()
    if not data.get("revoke_time"):
        data["revoke_time"] = datetime.now()

    is_cross_day = False
    if data.get("consume_time") and data.get("revoke_time"):
        is_cross_day = data["consume_time"].date() != data["revoke_time"].date()
    data["is_cross_day"] = is_cross_day

    record = ConsumeRevoke(**data)
    db.add(record)
    db.commit()
    db.refresh(record)

    BalanceService.update_card_balance(db, revoke_data.card_no)
    return record


@router.post("/subsidy-rules")
def create_subsidy_rule(rule_data: SubsidyRuleCreate, db: Session = Depends(get_db)):
    """新增补贴规则"""
    existing = db.query(SubsidyRule).filter(
        SubsidyRule.rule_code == rule_data.rule_code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="规则编号已存在")

    rule = SubsidyRule(**rule_data.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.get("/refund-rules/match/{card_no}", response_model=RefundRuleMatchResponse)
def match_refund_rules(card_no: str, db: Session = Depends(get_db)):
    """退费规则匹配（日常操作）"""
    try:
        result = RefundRuleEngine.match_refund_rules(db, card_no)
        return RefundRuleMatchResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/batch-import", response_model=BatchImportResult)
def batch_import(import_request: BatchImportRequest, db: Session = Depends(get_db)):
    """批量导入（学生卡/充值流水/消费撤销/补贴规则）"""
    import_type = import_request.import_type
    items = [{"row_number": item.row_number, "row_data": item.row_data} for item in import_request.items]

    handlers = {
        "student_card": BatchImportService.import_student_cards,
        "recharge_record": BatchImportService.import_recharge_records,
        "consume_revoke": BatchImportService.import_consume_revokes,
        "subsidy_rule": BatchImportService.import_subsidy_rules,
    }

    if import_type not in handlers:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的导入类型: {import_type}, 支持: {list(handlers.keys())}"
        )

    try:
        result = handlers[import_type](db, items, import_request.operator)
        return BatchImportResult(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/batch-import/logs")
def get_import_logs(db: Session = Depends(get_db)):
    """查询批量导入日志"""
    from app.models.models import BatchImportLog
    logs = db.query(BatchImportLog).order_by(BatchImportLog.created_at.desc()).limit(100).all()
    return logs
