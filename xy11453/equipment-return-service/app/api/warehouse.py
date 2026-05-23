from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas

router = APIRouter(prefix="/warehouse-orders", tags=["warehouse-orders"])


@router.post("/", response_model=schemas.WarehouseOrderResponse)
def create_warehouse_order(
    order_in: schemas.WarehouseOrderCreate,
    db: Session = Depends(get_db)
):
    existing = crud.warehouse_order.get_by_order_no(db, order_in.order_no)
    if existing:
        raise HTTPException(status_code=400, detail=f"Order {order_in.order_no} already exists")
    return crud.warehouse_order.create(db, order_in)


@router.get("/{order_no}", response_model=schemas.WarehouseOrderResponse)
def get_warehouse_order(order_no: str, db: Session = Depends(get_db)):
    order = crud.warehouse_order.get_by_order_no(db, order_no)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.get("/", response_model=List[schemas.WarehouseOrderResponse])
def list_warehouse_orders(
    skip: int = 0,
    limit: int = 100,
    customer_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.warehouse_order.get_multi(db, skip=skip, limit=limit, customer_id=customer_id)
