from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
import os

from database import engine, get_db, Base
import models
import schemas

Base.metadata.create_all(bind=engine)

app = FastAPI(title="工厂模具外借外协借用保养核对API", version="1.0.0")


@app.get("/")
def root():
    return {"message": "工厂模具外借外协借用保养核对API已启动", "docs": "/docs"}


@app.post("/molds/", response_model=schemas.Mold, status_code=201)
def create_mold(mold: schemas.MoldCreate, db: Session = Depends(get_db)):
    db_mold = db.query(models.Mold).filter(models.Mold.mold_no == mold.mold_no).first()
    if db_mold:
        raise HTTPException(status_code=400, detail=f"模具编号 {mold.mold_no} 已存在")
    db_mold = models.Mold(**mold.model_dump())
    db.add(db_mold)
    db.commit()
    db.refresh(db_mold)
    return db_mold


@app.get("/molds/", response_model=List[schemas.Mold])
def list_molds(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Mold).offset(skip).limit(limit).all()


@app.post("/borrow/", response_model=schemas.BorrowRecord, status_code=201)
def create_borrow_record(borrow: schemas.BorrowRecordCreate, db: Session = Depends(get_db)):
    db_mold = db.query(models.Mold).filter(models.Mold.mold_no == borrow.mold_no).first()
    if not db_mold:
        raise HTTPException(status_code=404, detail=f"模具编号 {borrow.mold_no} 不存在")
    
    if db_mold.status == "borrowed":
        active_borrow = db.query(models.BorrowRecord).filter(
            models.BorrowRecord.mold_no == borrow.mold_no,
            models.BorrowRecord.status == "borrowed"
        ).first()
        if active_borrow:
            raise HTTPException(status_code=400, detail=f"模具 {borrow.mold_no} 当前已被借用，无法重复借用")
    
    db_borrow = models.BorrowRecord(
        mold_id=db_mold.id,
        mold_no=borrow.mold_no,
        workshop=borrow.workshop,
        borrower=borrow.borrower,
        expected_return_date=borrow.expected_return_date
    )
    db_mold.status = "borrowed"
    db.add(db_borrow)
    db.commit()
    db.refresh(db_borrow)
    return db_borrow


@app.get("/borrow/", response_model=List[schemas.BorrowRecord])
def list_borrow_records(
    mold_no: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(models.BorrowRecord)
    if mold_no:
        query = query.filter(models.BorrowRecord.mold_no == mold_no)
    if status:
        query = query.filter(models.BorrowRecord.status == status)
    return query.offset(skip).limit(limit).all()


@app.get("/borrow/{borrow_id}", response_model=schemas.BorrowRecordDetail)
def get_borrow_record(borrow_id: int, db: Session = Depends(get_db)):
    db_borrow = db.query(models.BorrowRecord).filter(models.BorrowRecord.id == borrow_id).first()
    if not db_borrow:
        raise HTTPException(status_code=404, detail=f"借用记录 {borrow_id} 不存在")
    
    now = datetime.utcnow()
    if db_borrow.status == "borrowed" and db_borrow.expected_return_date and now > db_borrow.expected_return_date:
        db_borrow.is_overdue = 1
        db.commit()
        db.refresh(db_borrow)
    
    return db_borrow


@app.post("/maintenance/", response_model=schemas.MaintenanceRecord, status_code=201)
def create_maintenance_record(maintenance: schemas.MaintenanceRecordCreate, db: Session = Depends(get_db)):
    db_borrow = db.query(models.BorrowRecord).filter(models.BorrowRecord.id == maintenance.borrow_record_id).first()
    if not db_borrow:
        raise HTTPException(status_code=404, detail=f"借用记录 {maintenance.borrow_record_id} 不存在")
    
    if db_borrow.mold_no != maintenance.mold_no:
        raise HTTPException(status_code=400, detail=f"借用记录的模具编号与提交的模具编号不一致")
    
    existing = db.query(models.MaintenanceRecord).filter(
        models.MaintenanceRecord.borrow_record_id == maintenance.borrow_record_id,
        models.MaintenanceRecord.maintenance_content == maintenance.maintenance_content
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="相同内容的保养记录已存在，请勿重复提交")
    
    db_maintenance = models.MaintenanceRecord(**maintenance.model_dump())
    db_borrow.maintenance_done = 1
    db.add(db_maintenance)
    db.commit()
    db.refresh(db_maintenance)
    return db_maintenance


@app.get("/maintenance/", response_model=List[schemas.MaintenanceRecord])
def list_maintenance_records(
    borrow_record_id: Optional[int] = None,
    mold_no: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(models.MaintenanceRecord)
    if borrow_record_id:
        query = query.filter(models.MaintenanceRecord.borrow_record_id == borrow_record_id)
    if mold_no:
        query = query.filter(models.MaintenanceRecord.mold_no == mold_no)
    return query.offset(skip).limit(limit).all()


@app.post("/return-photo/", response_model=schemas.ReturnRecord, status_code=201)
def create_return_photo(return_record: schemas.ReturnRecordCreate, db: Session = Depends(get_db)):
    db_borrow = db.query(models.BorrowRecord).filter(models.BorrowRecord.id == return_record.borrow_record_id).first()
    if not db_borrow:
        raise HTTPException(status_code=404, detail=f"借用记录 {return_record.borrow_record_id} 不存在")
    
    if db_borrow.mold_no != return_record.mold_no:
        raise HTTPException(status_code=400, detail=f"借用记录的模具编号与提交的模具编号不一致")
    
    if db_borrow.maintenance_done == 0:
        raise HTTPException(status_code=400, detail="该借用记录尚未完成保养，请先补保养记录再提交归还照片")
    
    existing = db.query(models.ReturnRecord).filter(
        models.ReturnRecord.borrow_record_id == return_record.borrow_record_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="该借用记录已提交归还照片，请勿重复提交")
    
    if db_borrow.is_overdue == 0 and db_borrow.expected_return_date:
        now = datetime.utcnow()
        if now > db_borrow.expected_return_date:
            db_borrow.is_overdue = 1
    
    db_return = models.ReturnRecord(**return_record.model_dump())
    db_borrow.actual_return_date = datetime.utcnow()
    db_borrow.status = "returned"
    
    db_mold = db.query(models.Mold).filter(models.Mold.mold_no == return_record.mold_no).first()
    if db_mold:
        db_mold.status = "idle"
    
    db.add(db_return)
    db.commit()
    db.refresh(db_return)
    return db_return


@app.get("/return-photo/", response_model=List[schemas.ReturnRecord])
def list_return_records(
    borrow_record_id: Optional[int] = None,
    mold_no: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(models.ReturnRecord)
    if borrow_record_id:
        query = query.filter(models.ReturnRecord.borrow_record_id == borrow_record_id)
    if mold_no:
        query = query.filter(models.ReturnRecord.mold_no == mold_no)
    return query.offset(skip).limit(limit).all()


@app.post("/missing-part/", response_model=schemas.MissingPart, status_code=201)
def create_missing_part(missing_part: schemas.MissingPartCreate, db: Session = Depends(get_db)):
    db_borrow = db.query(models.BorrowRecord).filter(models.BorrowRecord.id == missing_part.borrow_record_id).first()
    if not db_borrow:
        raise HTTPException(status_code=404, detail=f"借用记录 {missing_part.borrow_record_id} 不存在")
    
    if db_borrow.mold_no != missing_part.mold_no:
        raise HTTPException(status_code=400, detail=f"借用记录的模具编号与提交的模具编号不一致")
    
    existing = db.query(models.MissingPart).filter(
        models.MissingPart.borrow_record_id == missing_part.borrow_record_id,
        models.MissingPart.part_name == missing_part.part_name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"配件 {missing_part.part_name} 已标记为缺失，请勿重复提交")
    
    db_missing = models.MissingPart(**missing_part.model_dump())
    db.add(db_missing)
    db.commit()
    db.refresh(db_missing)
    return db_missing


@app.get("/missing-part/", response_model=List[schemas.MissingPart])
def list_missing_parts(
    borrow_record_id: Optional[int] = None,
    mold_no: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(models.MissingPart)
    if borrow_record_id:
        query = query.filter(models.MissingPart.borrow_record_id == borrow_record_id)
    if mold_no:
        query = query.filter(models.MissingPart.mold_no == mold_no)
    if status:
        query = query.filter(models.MissingPart.status == status)
    return query.offset(skip).limit(limit).all()


@app.post("/compensation/", response_model=schemas.CompensationRecord, status_code=201)
def create_compensation_record(compensation: schemas.CompensationRecordCreate, db: Session = Depends(get_db)):
    db_borrow = db.query(models.BorrowRecord).filter(models.BorrowRecord.id == compensation.borrow_record_id).first()
    if not db_borrow:
        raise HTTPException(status_code=404, detail=f"借用记录 {compensation.borrow_record_id} 不存在")
    
    if db_borrow.mold_no != compensation.mold_no:
        raise HTTPException(status_code=400, detail=f"借用记录的模具编号与提交的模具编号不一致")
    
    existing = db.query(models.CompensationRecord).filter(
        models.CompensationRecord.borrow_record_id == compensation.borrow_record_id,
        models.CompensationRecord.compensation_reason == compensation.compensation_reason
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="相同原因的赔付记录已存在，请勿重复提交")
    
    if compensation.compensation_amount <= 0:
        raise HTTPException(status_code=400, detail="赔付金额必须大于0")
    
    db_compensation = models.CompensationRecord(**compensation.model_dump())
    db.add(db_compensation)
    db.commit()
    db.refresh(db_compensation)
    return db_compensation


@app.get("/compensation/", response_model=List[schemas.CompensationRecord])
def list_compensation_records(
    borrow_record_id: Optional[int] = None,
    mold_no: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(models.CompensationRecord)
    if borrow_record_id:
        query = query.filter(models.CompensationRecord.borrow_record_id == borrow_record_id)
    if mold_no:
        query = query.filter(models.CompensationRecord.mold_no == mold_no)
    if status:
        query = query.filter(models.CompensationRecord.compensation_status == status)
    return query.offset(skip).limit(limit).all()


@app.get("/overdue-check/")
def check_overdue(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    overdue_records = db.query(models.BorrowRecord).filter(
        models.BorrowRecord.status == "borrowed",
        models.BorrowRecord.expected_return_date.isnot(None),
        models.BorrowRecord.expected_return_date < now
    ).all()
    
    result = []
    for record in overdue_records:
        record.is_overdue = 1
        overdue_days = (now - record.expected_return_date).days
        result.append({
            "borrow_id": record.id,
            "mold_no": record.mold_no,
            "workshop": record.workshop,
            "borrow_date": record.borrow_date,
            "expected_return_date": record.expected_return_date,
            "overdue_days": overdue_days
        })
    
    db.commit()
    return {"overdue_count": len(result), "overdue_records": result}


@app.get("/maintenance-check/")
def check_maintenance_pending(db: Session = Depends(get_db)):
    pending_records = db.query(models.BorrowRecord).filter(
        models.BorrowRecord.status == "returned",
        models.BorrowRecord.maintenance_done == 0
    ).all()
    
    result = []
    for record in pending_records:
        result.append({
            "borrow_id": record.id,
            "mold_no": record.mold_no,
            "workshop": record.workshop,
            "actual_return_date": record.actual_return_date
        })
    
    return {"pending_maintenance_count": len(result), "pending_records": result}


@app.get("/missing-parts-summary/")
def get_missing_parts_summary(db: Session = Depends(get_db)):
    missing_parts = db.query(models.MissingPart).filter(
        models.MissingPart.status == "pending"
    ).all()
    
    result = []
    for part in missing_parts:
        result.append({
            "id": part.id,
            "mold_no": part.mold_no,
            "part_name": part.part_name,
            "part_quantity": part.part_quantity,
            "part_value": part.part_value,
            "found_date": part.found_date
        })
    
    return {"pending_missing_count": len(result), "missing_parts": result}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
