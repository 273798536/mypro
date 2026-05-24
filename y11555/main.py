from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from config import engine, SessionLocal, Base
import models
import schemas
from services import ReceiptService

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="农资门店配送异常回执状态机 API",
    description="处理门店订单、司机轨迹、签收欠条的异常回执状态管理服务",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/", tags=["System"])
def root():
    return {
        "service": "农资门店配送异常回执状态机 API",
        "version": "1.0.0",
        "status": "running"
    }

@app.post("/api/batch/import", response_model=schemas.BatchImportResponse, tags=["Batch Import"])
def import_batch(request: schemas.BatchImportRequest, db: Session = Depends(get_db)):
    try:
        return ReceiptService.import_batch(db, request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/batch/{batch_no}/failed", tags=["Batch Import"])
def get_batch_failed_items(batch_no: str, db: Session = Depends(get_db)):
    try:
        return {
            "batch_no": batch_no,
            "failed_items": ReceiptService.get_batch_failed_items(db, batch_no)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/batch/{batch_no}/resubmit/{row_number}", tags=["Batch Import"])
def resubmit_failed_item(
    batch_no: str,
    row_number: int,
    item: schemas.BatchImportItem,
    db: Session = Depends(get_db)
):
    try:
        return ReceiptService.resubmit_failed_item(db, batch_no, row_number, item)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/receipt/status/change", tags=["Status Management"])
def change_status(request: schemas.StatusChangeRequest, db: Session = Depends(get_db)):
    try:
        return ReceiptService.change_status(db, request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/receipt/review", tags=["Status Management"])
def review_receipt(request: schemas.ReviewRequest, db: Session = Depends(get_db)):
    try:
        return ReceiptService.review_receipt(db, request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/receipt/freeze", tags=["Status Management"])
def freeze_receipt(request: schemas.FreezeRequest, db: Session = Depends(get_db)):
    try:
        return ReceiptService.freeze_receipt(db, request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/receipt/{receipt_no}/unfreeze", tags=["Status Management"])
def unfreeze_receipt(receipt_no: str, operated_by: str, db: Session = Depends(get_db)):
    try:
        return ReceiptService.unfreeze_receipt(db, receipt_no, operated_by)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/receipt/{receipt_no}/revoke", tags=["Status Management"])
def revoke_receipt(receipt_no: str, operated_by: str, reason: str, db: Session = Depends(get_db)):
    try:
        return ReceiptService.revoke_receipt(db, receipt_no, operated_by, reason)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/receipt/{receipt_no}/archive", tags=["Status Management"])
def archive_receipt(receipt_no: str, operated_by: str, db: Session = Depends(get_db)):
    try:
        return ReceiptService.archive_receipt(db, receipt_no, operated_by)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/attachment/add", tags=["Attachment"])
def add_attachment(attachment: schemas.AttachmentCreate, db: Session = Depends(get_db)):
    try:
        return ReceiptService.add_attachment(db, attachment)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/receipt/query", tags=["Query"])
def query_receipts(query: schemas.ReceiptQuery, db: Session = Depends(get_db)):
    try:
        total, receipts = ReceiptService.query_receipts(db, query)
        return {
            "total": total,
            "page": query.page,
            "page_size": query.page_size,
            "data": receipts
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/receipt/{receipt_no}", tags=["Query"])
def get_receipt_detail(receipt_no: str, db: Session = Depends(get_db)):
    try:
        detail = ReceiptService.get_receipt_detail(db, receipt_no)
        return {
            "receipt": detail["receipt"],
            "status_history": detail["status_history"],
            "attachments": detail["attachments"],
            "operation_logs": detail["operation_logs"],
            "batch_no": detail["batch"].batch_no if detail["batch"] else None,
            "store_order": detail["store_order"],
            "driver_track": detail["driver_track"],
            "sign_receipt": detail["sign_receipt"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/export/summary", tags=["Export"])
def export_summary(request: schemas.ExportRequest, db: Session = Depends(get_db)):
    try:
        return ReceiptService.export_summary(db, request.filters, request.exported_by)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
