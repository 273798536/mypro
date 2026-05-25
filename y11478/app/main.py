from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
import os
import pandas as pd
from io import BytesIO

from .database import engine, get_db, Base
from . import models, schemas, crud
from .services import ReconciliationService

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="会议室占用验收回放链路 API",
    description="处理预约日历、门禁刷卡、临时取消消息和供应商对账单的审计服务",
    version="1.0.0"
)


@app.post("/api/import", response_model=schemas.ImportResponse, tags=["Import"])
def import_data(import_request: schemas.ImportRequest, db: Session = Depends(get_db)):
    result = crud.batch_import_data(db, import_request)
    return result


@app.get("/api/bookings", response_model=List[schemas.Booking], tags=["Bookings"])
def read_bookings(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    room_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    bookings = crud.get_bookings(db, skip=skip, limit=limit, start_date=start_date, end_date=end_date, room_name=room_name)
    return bookings


@app.get("/api/bookings/{booking_id}", tags=["Bookings"])
def read_booking_detail(booking_id: int, db: Session = Depends(get_db)):
    booking = crud.get_booking(db, booking_id=booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")

    return schemas.AuditRecordDetail(
        booking=schemas.Booking.model_validate(booking),
        access_records=[schemas.Access.model_validate(a) for a in booking.access_records],
        cancel_messages=[schemas.CancelMessage.model_validate(c) for c in booking.cancel_messages],
        supplier_bills=[schemas.SupplierBill.model_validate(b) for b in booking.supplier_bills],
        process_records=[schemas.ProcessRecord.model_validate(p) for p in booking.process_records]
    )


@app.get("/api/reconciliation", response_model=List[schemas.ReconciliationResult], tags=["Reconciliation"])
def get_reconciliation(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    room_name: Optional[str] = None,
    exceptions_only: bool = False,
    db: Session = Depends(get_db)
):
    bookings = crud.get_bookings(db, skip=skip, limit=limit, start_date=start_date, end_date=end_date, room_name=room_name)
    results = []

    for booking in bookings:
        result = ReconciliationService.reconcile_booking(db, booking)
        if not exceptions_only or result["is_exception"]:
            results.append(schemas.ReconciliationResult(**result))

    return results


@app.get("/api/export/reconciliation", tags=["Export"])
def export_reconciliation(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    room_name: Optional[str] = None,
    format: str = Query("xlsx", pattern="^(xlsx|csv)$"),
    db: Session = Depends(get_db)
):
    bookings = crud.get_bookings(db, start_date=start_date, end_date=end_date, room_name=room_name)
    results = []

    for booking in bookings:
        result = ReconciliationService.reconcile_booking(db, booking)
        results.append({
            "预约ID": result["booking_id"],
            "会议室": result["room_name"],
            "会议主题": result["meeting_topic"],
            "开始时间": result["start_time"].strftime("%Y-%m-%d %H:%M:%S"),
            "预约状态": result["booking_status"],
            "有门禁记录": "是" if result["has_access_record"] else "否",
            "有取消消息": "是" if result["has_cancel_message"] else "否",
            "有供应商账单": "是" if result["has_supplier_bill"] else "否",
            "茶歇费用": result["tea_break_cost"],
            "设备费用": result["equipment_cost"],
            "总费用": result["total_cost"],
            "是否异常": "是" if result["is_exception"] else "否",
            "异常类型": result["exception_type"],
            "异常描述": result["exception_description"]
        })

    df = pd.DataFrame(results)

    os.makedirs("exports", exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"exports/reconciliation_{timestamp}.{format}"

    if format == "xlsx":
        df.to_excel(filename, index=False, engine="openpyxl")
    else:
        df.to_csv(filename, index=False, encoding="utf-8-sig")

    return FileResponse(
        filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if format == "xlsx" else "text/csv",
        filename=f"reconciliation_{timestamp}.{format}"
    )


@app.get("/api/process-records", response_model=List[schemas.ProcessRecord], tags=["Process"])
def read_process_records(
    booking_id: Optional[int] = None,
    batch_id: Optional[str] = None,
    is_dirty: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    records = crud.get_process_records(db, booking_id=booking_id, batch_id=batch_id, is_dirty=is_dirty, skip=skip, limit=limit)
    return records


@app.patch("/api/process-records/{process_id}/resolve", tags=["Process"])
def resolve_dirty_record(
    process_id: int,
    corrected_value: dict,
    reason: str,
    db: Session = Depends(get_db)
):
    record = crud.resolve_dirty_record(db, process_id, corrected_value, reason)
    if record is None:
        raise HTTPException(status_code=404, detail="Process record not found")
    return {"status": "success", "message": "Record resolved and re-summarized", "record": schemas.ProcessRecord.model_validate(record)}


@app.post("/api/relink-all", tags=["Reconciliation"])
def relink_all_records(db: Session = Depends(get_db)):
    bookings = crud.get_bookings(db, limit=1000)
    relink_stats = {"total_bookings": len(bookings), "relinked_access": 0, "relinked_cancel": 0, "relinked_bill": 0}

    for booking in bookings:
        stats = ReconciliationService.relink_all_for_booking(db, booking)
        relink_stats["relinked_access"] += stats["access"]
        relink_stats["relinked_cancel"] += stats["cancel"]

    bill_stats = ReconciliationService.distribute_bills_globally(db)
    relink_stats["relinked_bill"] = bill_stats["bills_linked"]

    return {"status": "success", "message": "All records re-linked and re-summarized", "stats": relink_stats}


@app.get("/api/import-history", tags=["History"])
def read_import_history(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    history = crud.get_import_history(db, skip=skip, limit=limit)
    return history


@app.get("/api/audit-logs", tags=["Audit"])
def read_audit_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    logs = crud.get_audit_logs(db, skip=skip, limit=limit)
    return logs


@app.get("/api/health", tags=["System"])
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.get("/", tags=["System"])
def root():
    return {
        "service": "会议室占用验收回放链路 API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "import": "POST /api/import",
            "bookings": "GET /api/bookings",
            "booking_detail": "GET /api/bookings/{id}",
            "reconciliation": "GET /api/reconciliation",
            "export": "GET /api/export/reconciliation",
            "process_records": "GET /api/process-records",
            "import_history": "GET /api/import-history",
            "audit_logs": "GET /api/audit-logs"
        }
    }
