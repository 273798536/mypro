from __future__ import annotations
import json
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import BatchImportResult
from app.services.import_service import import_batch, import_orders, import_bank_slips, import_platform_bills

router = APIRouter(prefix="/import", tags=["数据导入"])

SAMPLES_DIR = Path(__file__).resolve().parent.parent.parent / "samples"


@router.post("/batch", response_model=BatchImportResult)
def import_batch_endpoint(
    orders: Optional[List[dict]] = None,
    bank_slips: Optional[List[dict]] = None,
    platform_bills: Optional[List[dict]] = None,
    db: Session = Depends(get_db),
):
    return import_batch(db, orders, bank_slips, platform_bills)


@router.post("/orders", response_model=dict)
def import_orders_endpoint(data: List[dict], db: Session = Depends(get_db)):
    result = import_orders(db, data)
    return result.model_dump()


@router.post("/bank-slips", response_model=dict)
def import_slips_endpoint(data: List[dict], db: Session = Depends(get_db)):
    result = import_bank_slips(db, data)
    return result.model_dump()


@router.post("/platform-bills", response_model=dict)
def import_bills_endpoint(data: List[dict], db: Session = Depends(get_db)):
    result = import_platform_bills(db, data)
    return result.model_dump()


@router.post("/sample", response_model=BatchImportResult)
def import_sample_data(db: Session = Depends(get_db)):
    orders_path = SAMPLES_DIR / "orders.json"
    slips_path = SAMPLES_DIR / "bank_slips.json"
    bills_path = SAMPLES_DIR / "platform_bills.json"

    orders = None
    slips = None
    bills = None

    if orders_path.exists():
        with open(orders_path, "r", encoding="utf-8") as f:
            orders = json.load(f)
    if slips_path.exists():
        with open(slips_path, "r", encoding="utf-8") as f:
            slips = json.load(f)
    if bills_path.exists():
        with open(bills_path, "r", encoding="utf-8") as f:
            bills = json.load(f)

    if not any([orders, slips, bills]):
        raise HTTPException(status_code=404, detail="样例数据文件不存在，请检查 samples/ 目录")

    return import_batch(db, orders, slips, bills)


@router.post("/file", response_model=BatchImportResult)
def import_from_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = file.file.read()
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="文件内容不是合法 JSON")

    orders = data.get("orders")
    bank_slips = data.get("bank_slips")
    platform_bills = data.get("platform_bills")

    return import_batch(db, orders, bank_slips, platform_bills)
