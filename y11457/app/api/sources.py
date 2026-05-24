from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user, RolePermission
from app.models import User, UserRole
from app.schemas import (
    LeaderRefundCreate, LeaderRefundResponse,
    WarehouseReviewCreate, WarehouseReviewResponse,
    UserRemarkCreate, UserRemarkResponse,
    ManualPriceAdjustCreate, ManualPriceAdjustResponse,
    VerifyRequest
)
from app.services import QueueService, OperationLogService
from app.utils import model_to_dict_safe
from app.models import (
    LeaderRefund, WarehouseReview, UserRemark, ManualPriceAdjust,
    DataSource, IssueType
)

router = APIRouter(prefix="/sources", tags=["数据源管理"])


@router.post("/leader-refunds", response_model=LeaderRefundResponse)
async def create_leader_refund(
    data: LeaderRefundCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not RolePermission.can_perform_action(current_user.role, "create"):
        raise HTTPException(status_code=403, detail="权限不足")
    
    existing = db.query(LeaderRefund).filter(LeaderRefund.refund_no == data.refund_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="退款单号已存在")
    
    refund = LeaderRefund(**data.model_dump())
    refund.source = DataSource.LEADER_REFUND
    db.add(refund)
    db.flush()
    
    OperationLogService.log(
        db=db,
        user=current_user,
        action="create_leader_refund",
        table_name="leader_refunds",
        record_id=refund.id,
        diff_data={"before": None, "after": model_to_dict_safe(data)}
    )
    
    if refund.is_verified:
        QueueService.create_from_source(
            db=db,
            source_type=DataSource.LEADER_REFUND,
            source_id=refund.id,
            source_table="leader_refunds",
            order_no=refund.order_no,
            city=refund.city,
            issue_type=refund.issue_type,
            compensation_amount=refund.compensation_amount,
            operator=current_user
        )
    
    db.commit()
    db.refresh(refund)
    return refund


@router.get("/leader-refunds", response_model=List[LeaderRefundResponse])
async def list_leader_refunds(
    city: Optional[str] = None,
    is_verified: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(LeaderRefund)
    
    if current_user.role != UserRole.SUPERVISOR and current_user.city:
        query = query.filter(LeaderRefund.city == current_user.city)
    elif city:
        query = query.filter(LeaderRefund.city == city)
    
    if is_verified is not None:
        query = query.filter(LeaderRefund.is_verified == is_verified)
    
    refunds = query.offset(skip).limit(limit).all()
    return refunds


@router.post("/leader-refunds/{record_id}/verify")
async def verify_leader_refund(
    record_id: int,
    data: VerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not RolePermission.can_perform_action(current_user.role, "verify"):
        raise HTTPException(status_code=403, detail="权限不足")
    
    refund = db.query(LeaderRefund).filter(LeaderRefund.id == record_id).first()
    if not refund:
        raise HTTPException(status_code=404, detail="记录不存在")
    
    old_verified = refund.is_verified
    refund.is_verified = data.verified
    refund.verified_by = current_user.id
    
    if data.verified:
        from datetime import datetime
        refund.verified_at = datetime.utcnow()
        
        QueueService.create_from_source(
            db=db,
            source_type=DataSource.LEADER_REFUND,
            source_id=refund.id,
            source_table="leader_refunds",
            order_no=refund.order_no,
            city=refund.city,
            issue_type=refund.issue_type,
            compensation_amount=refund.compensation_amount,
            operator=current_user
        )
    
    OperationLogService.log(
        db=db,
        user=current_user,
        action="verify_leader_refund",
        table_name="leader_refunds",
        record_id=refund.id,
        diff_data={
            "before": {"is_verified": old_verified},
            "after": {"is_verified": data.verified}
        }
    )
    
    db.commit()
    return {"message": "审核成功", "is_verified": data.verified}


@router.post("/warehouse-reviews", response_model=WarehouseReviewResponse)
async def create_warehouse_review(
    data: WarehouseReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not RolePermission.can_perform_action(current_user.role, "create"):
        raise HTTPException(status_code=403, detail="权限不足")
    
    existing = db.query(WarehouseReview).filter(WarehouseReview.review_no == data.review_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="复核单号已存在")
    
    review = WarehouseReview(**data.model_dump())
    review.source = DataSource.WAREHOUSE_REVIEW
    db.add(review)
    db.flush()
    
    if review.is_verified:
        QueueService.create_from_source(
            db=db,
            source_type=DataSource.WAREHOUSE_REVIEW,
            source_id=review.id,
            source_table="warehouse_reviews",
            order_no=review.order_no,
            city=review.city,
            issue_type=review.issue_type,
            compensation_amount=review.compensation_amount,
            operator=current_user
        )
    
    db.commit()
    db.refresh(review)
    return review


@router.get("/warehouse-reviews", response_model=List[WarehouseReviewResponse])
async def list_warehouse_reviews(
    city: Optional[str] = None,
    is_verified: Optional[bool] = None,
    issue_type: Optional[IssueType] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(WarehouseReview)
    
    if current_user.role != UserRole.SUPERVISOR and current_user.city:
        query = query.filter(WarehouseReview.city == current_user.city)
    elif city:
        query = query.filter(WarehouseReview.city == city)
    
    if is_verified is not None:
        query = query.filter(WarehouseReview.is_verified == is_verified)
    if issue_type:
        query = query.filter(WarehouseReview.issue_type == issue_type)
    
    reviews = query.offset(skip).limit(limit).all()
    return reviews


@router.post("/warehouse-reviews/{record_id}/verify")
async def verify_warehouse_review(
    record_id: int,
    data: VerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not RolePermission.can_perform_action(current_user.role, "verify"):
        raise HTTPException(status_code=403, detail="权限不足")
    
    review = db.query(WarehouseReview).filter(WarehouseReview.id == record_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="记录不存在")
    
    old_verified = review.is_verified
    review.is_verified = data.verified
    review.verified_by = current_user.id
    
    if data.verified:
        from datetime import datetime
        review.verified_at = datetime.utcnow()
        
        QueueService.create_from_source(
            db=db,
            source_type=DataSource.WAREHOUSE_REVIEW,
            source_id=review.id,
            source_table="warehouse_reviews",
            order_no=review.order_no,
            city=review.city,
            issue_type=review.issue_type,
            compensation_amount=review.compensation_amount,
            operator=current_user
        )
    
    db.commit()
    return {"message": "审核成功", "is_verified": data.verified}


@router.post("/user-remarks", response_model=UserRemarkResponse)
async def create_user_remark(
    data: UserRemarkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not RolePermission.can_perform_action(current_user.role, "create"):
        raise HTTPException(status_code=403, detail="权限不足")
    
    existing = db.query(UserRemark).filter(UserRemark.remark_no == data.remark_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="备注单号已存在")
    
    remark = UserRemark(**data.model_dump())
    remark.source = DataSource.USER_REMARK
    db.add(remark)
    db.flush()
    
    if remark.is_verified:
        QueueService.create_from_source(
            db=db,
            source_type=DataSource.USER_REMARK,
            source_id=remark.id,
            source_table="user_remarks",
            order_no=remark.order_no,
            city=remark.city,
            issue_type=remark.issue_type,
            compensation_amount=remark.compensation_amount,
            operator=current_user
        )
    
    db.commit()
    db.refresh(remark)
    return remark


@router.get("/user-remarks", response_model=List[UserRemarkResponse])
async def list_user_remarks(
    city: Optional[str] = None,
    is_verified: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(UserRemark)
    
    if current_user.role != UserRole.SUPERVISOR and current_user.city:
        query = query.filter(UserRemark.city == current_user.city)
    elif city:
        query = query.filter(UserRemark.city == city)
    
    if is_verified is not None:
        query = query.filter(UserRemark.is_verified == is_verified)
    
    remarks = query.offset(skip).limit(limit).all()
    return remarks


@router.post("/user-remarks/{record_id}/verify")
async def verify_user_remark(
    record_id: int,
    data: VerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not RolePermission.can_perform_action(current_user.role, "verify"):
        raise HTTPException(status_code=403, detail="权限不足")
    
    remark = db.query(UserRemark).filter(UserRemark.id == record_id).first()
    if not remark:
        raise HTTPException(status_code=404, detail="记录不存在")
    
    old_verified = remark.is_verified
    remark.is_verified = data.verified
    remark.verified_by = current_user.id
    
    if data.verified:
        from datetime import datetime
        remark.verified_at = datetime.utcnow()
        
        QueueService.create_from_source(
            db=db,
            source_type=DataSource.USER_REMARK,
            source_id=remark.id,
            source_table="user_remarks",
            order_no=remark.order_no,
            city=remark.city,
            issue_type=remark.issue_type,
            compensation_amount=remark.compensation_amount,
            operator=current_user
        )
    
    db.commit()
    return {"message": "审核成功", "is_verified": data.verified}


@router.post("/manual-price-adjusts", response_model=ManualPriceAdjustResponse)
async def create_manual_price_adjust(
    data: ManualPriceAdjustCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not RolePermission.can_perform_action(current_user.role, "create"):
        raise HTTPException(status_code=403, detail="权限不足")
    
    existing = db.query(ManualPriceAdjust).filter(ManualPriceAdjust.adjust_no == data.adjust_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="改价单号已存在")
    
    adjust = ManualPriceAdjust(**data.model_dump())
    adjust.source = DataSource.MANUAL_PRICE_ADJUST
    db.add(adjust)
    db.flush()
    
    if adjust.is_verified:
        QueueService.create_from_source(
            db=db,
            source_type=DataSource.MANUAL_PRICE_ADJUST,
            source_id=adjust.id,
            source_table="manual_price_adjusts",
            order_no=adjust.order_no,
            city=adjust.city,
            issue_type=IssueType.WRONG_PRICE,
            compensation_amount=adjust.compensation_amount,
            operator=current_user
        )
    
    db.commit()
    db.refresh(adjust)
    return adjust


@router.get("/manual-price-adjusts", response_model=List[ManualPriceAdjustResponse])
async def list_manual_price_adjusts(
    city: Optional[str] = None,
    is_verified: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ManualPriceAdjust)
    
    if current_user.role != UserRole.SUPERVISOR and current_user.city:
        query = query.filter(ManualPriceAdjust.city == current_user.city)
    elif city:
        query = query.filter(ManualPriceAdjust.city == city)
    
    if is_verified is not None:
        query = query.filter(ManualPriceAdjust.is_verified == is_verified)
    
    adjusts = query.offset(skip).limit(limit).all()
    return adjusts


@router.post("/manual-price-adjusts/{record_id}/verify")
async def verify_manual_price_adjust(
    record_id: int,
    data: VerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not RolePermission.can_perform_action(current_user.role, "verify"):
        raise HTTPException(status_code=403, detail="权限不足")
    
    adjust = db.query(ManualPriceAdjust).filter(ManualPriceAdjust.id == record_id).first()
    if not adjust:
        raise HTTPException(status_code=404, detail="记录不存在")
    
    old_verified = adjust.is_verified
    adjust.is_verified = data.verified
    adjust.verified_by = current_user.id
    
    if data.verified:
        from datetime import datetime
        adjust.verified_at = datetime.utcnow()
        
        QueueService.create_from_source(
            db=db,
            source_type=DataSource.MANUAL_PRICE_ADJUST,
            source_id=adjust.id,
            source_table="manual_price_adjusts",
            order_no=adjust.order_no,
            city=adjust.city,
            issue_type=IssueType.WRONG_PRICE,
            compensation_amount=adjust.compensation_amount,
            operator=current_user
        )
    
    db.commit()
    return {"message": "审核成功", "is_verified": data.verified}
