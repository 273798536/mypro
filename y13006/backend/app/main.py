from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from .database import get_db, SessionLocal, Base, engine
from .models import (
    CashflowRecord, ApprovalEmail, ManualRemark, ImportLog,
    RecordStatus, EmailStatus
)
from .services import CashflowImportService
from .simulated_emails import SIMULATED_EMAILS

app = FastAPI(title="ABS现金流异常回放", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ManualRemarkCreate(BaseModel):
    remark_content: str
    operator: str


class ImportRequest(BaseModel):
    email_index: int
    imported_by: str = "项目经理-李明"


class SupplementRequest(BaseModel):
    tax_amount: Optional[float] = None
    exchange_rate: Optional[float] = None
    amount: Optional[float] = None
    operator: str = "项目经理-李明"


class CashflowRecordOut(BaseModel):
    id: int
    approval_email_id: int
    original_row_number: Optional[int] = None
    raw_mixed_tax_rate_column: Optional[str] = None
    tax_amount: Optional[float] = None
    exchange_rate: Optional[float] = None
    transaction_date: Optional[datetime] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    counterparty: Optional[str] = None
    voucher_number: Optional[str] = None
    status: str
    abnormal_reason: Optional[str] = None
    is_manual_remark_updated: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ManualRemarkOut(BaseModel):
    id: int
    cashflow_record_id: int
    remark_content: str
    operator: str
    is_export_synced: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ApprovalEmailOut(BaseModel):
    id: int
    email_message_id: str
    subject: str
    sender: str
    recipient: str
    sent_at: datetime
    received_at: Optional[datetime] = None
    status: str
    is_attachment_late: bool
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "ABS现金流异常回放"}


@app.post("/api/database/reset")
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return {"message": "数据库已重置（清空所有数据），请通过导入操作重新导入审批邮件包"}


@app.get("/api/records", response_model=List[CashflowRecordOut])
def list_records(
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(CashflowRecord)
    if status:
        query = query.filter(CashflowRecord.status == status)
    return query.order_by(CashflowRecord.created_at.desc()).all()


@app.get("/api/records/{record_id}", response_model=CashflowRecordOut)
def get_record(record_id: int, db: Session = Depends(get_db)):
    record = db.query(CashflowRecord).filter(CashflowRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    return record


@app.post("/api/records/{record_id}/remarks", response_model=ManualRemarkOut)
def add_manual_remark(record_id: int, data: ManualRemarkCreate, db: Session = Depends(get_db)):
    service = CashflowImportService(db)
    remark = service.update_manual_remark(record_id, data.remark_content, data.operator)
    if not remark:
        raise HTTPException(status_code=404, detail="记录不存在")
    return remark


@app.get("/api/records/{record_id}/remarks", response_model=List[ManualRemarkOut])
def list_remarks(record_id: int, db: Session = Depends(get_db)):
    return db.query(ManualRemark).filter(ManualRemark.cashflow_record_id == record_id).order_by(ManualRemark.created_at.desc()).all()


@app.post("/api/records/{record_id}/supplement", response_model=CashflowRecordOut)
def supplement_record(record_id: int, data: SupplementRequest, db: Session = Depends(get_db)):
    service = CashflowImportService(db)
    record = service.supplement_record(record_id, data.model_dump(exclude={"operator"}), data.operator)
    if not record:
        raise HTTPException(status_code=400, detail="补录失败：记录不存在或状态不是'挂起'")
    return record


@app.get("/api/emails", response_model=List[ApprovalEmailOut])
def list_emails(db: Session = Depends(get_db)):
    return db.query(ApprovalEmail).order_by(ApprovalEmail.sent_at.desc()).all()


@app.get("/api/import/packages")
def list_import_packages():
    packages = []
    for i, email in enumerate(SIMULATED_EMAILS):
        rows_info = []
        for att in email.get("attachments", []):
            for row in att.get("rows", []):
                rows_info.append({
                    "row_number": row.get("row_number"),
                    "voucher_number": row.get("voucher_number"),
                    "counterparty": row.get("counterparty"),
                    "amount": row.get("amount"),
                    "currency": row.get("currency"),
                    "raw_mixed_tax_rate": row.get("raw_mixed_tax_rate"),
                    "attachment_arrived": att.get("is_arrived", True),
                    "attachment_file": att.get("file_name", "")
                })
        packages.append({
            "index": i,
            "email_message_id": email["email_message_id"],
            "subject": email["subject"],
            "sender": email["sender"],
            "sent_at": email["sent_at"],
            "is_attachment_late": email.get("is_attachment_late", False),
            "row_count": sum(len(att.get("rows", [])) for att in email.get("attachments", [])),
            "rows": rows_info
        })
    return packages


@app.post("/api/import/email")
def import_email(data: ImportRequest, db: Session = Depends(get_db)):
    if data.email_index < 0 or data.email_index >= len(SIMULATED_EMAILS):
        raise HTTPException(status_code=400, detail=f"无效的邮件包索引：{data.email_index}，可用范围0-{len(SIMULATED_EMAILS)-1}")

    email_data = SIMULATED_EMAILS[data.email_index]
    service = CashflowImportService(db)
    result = service.import_email_records(email_data, data.imported_by)
    return result


@app.get("/api/import-logs")
def list_import_logs(batch_no: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(ImportLog)
    if batch_no:
        query = query.filter(ImportLog.batch_no == batch_no)
    logs = query.order_by(ImportLog.created_at.desc()).limit(200).all()
    return [
        {
            "id": l.id,
            "batch_no": l.batch_no,
            "original_row_number": l.original_row_number,
            "action": l.action.value if l.action else None,
            "detail": l.detail,
            "imported_by": l.imported_by,
            "created_at": l.created_at
        }
        for l in logs
    ]


@app.post("/api/export/sync")
def sync_export():
    db = SessionLocal()
    try:
        service = CashflowImportService(db)
        count = service.sync_export_remarks()
        return {"synced_count": count, "message": f"已将{count}条备注标记为导出已同步"}
    finally:
        db.close()


@app.get("/api/export/records")
def export_records(db: Session = Depends(get_db)):
    records = db.query(CashflowRecord).order_by(CashflowRecord.created_at.desc()).all()
    result = []
    for r in records:
        remarks = db.query(ManualRemark).filter(
            ManualRemark.cashflow_record_id == r.id
        ).order_by(ManualRemark.created_at.desc()).all()
        remark_text = " | ".join([f"[{rm.operator}]{rm.remark_content}" for rm in remarks])
        result.append({
            "voucher_number": r.voucher_number,
            "transaction_date": r.transaction_date.isoformat() if r.transaction_date else None,
            "amount": r.amount,
            "currency": r.currency,
            "counterparty": r.counterparty,
            "tax_amount": r.tax_amount,
            "exchange_rate": r.exchange_rate,
            "raw_tax_rate": r.raw_mixed_tax_rate_column,
            "status": r.status.value if r.status else None,
            "abnormal_reason": r.abnormal_reason,
            "manual_remarks": remark_text,
            "original_email_row": r.original_row_number,
            "export_synced": all(rm.is_export_synced for rm in remarks) if remarks else True
        })
    return {"data": result, "count": len(result)}
