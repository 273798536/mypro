from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import UserRemark
from app.schemas import UserRemarkCreate

router = APIRouter(prefix="/remarks", tags=["用户备注"])


@router.post("/")
async def create_remark(
    request: UserRemarkCreate,
    db: Session = Depends(get_db)
):
    remark = UserRemark(
        order_no=request.order_no,
        remark_content=request.remark_content,
        remarker=request.remarker
    )
    db.add(remark)
    db.commit()
    db.refresh(remark)
    return remark


@router.get("/order/{order_no}")
async def get_order_remarks(
    order_no: str,
    db: Session = Depends(get_db)
):
    remarks = db.query(UserRemark).filter(
        UserRemark.order_no == order_no
    ).order_by(UserRemark.id.desc()).all()
    return remarks
