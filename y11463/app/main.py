from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import pandas as pd
from datetime import datetime

from .database import get_db, engine, Base
from . import models, schemas, crud
from .models import BatchStatus

Base.metadata.create_all(bind=engine)

app = FastAPI(title="口腔门诊材料验收回放链路API", version="1.0.0")


def get_operator(x_operator: str = Header("system")):
    return x_operator


@app.get("/")
def root():
    return {
        "service": "口腔门诊材料验收回放链路服务",
        "version": "1.0.0",
        "endpoints": {
            "批次管理": "/batches",
            "状态流转": "/batches/{batch_id}/submit",
            "对账回放": "/batches/{batch_id}/reconcile",
            "导出": "/batches/{batch_id}/export"
        }
    }


@app.post("/batches", response_model=schemas.ApiResponse)
def create_batch(batch_data: schemas.BatchCreate, db: Session = Depends(get_db),
                 operator: str = Depends(get_operator)):
    try:
        batch, action, old_data = crud.create_batch(db, batch_data, operator)
        
        action_messages = {
            "create": "批次创建成功",
            "ignore": "批次已存在，已忽略重复提交",
            "overwrite": "批次已覆写",
            "append": "批次数据已追加"
        }
        
        return schemas.ApiResponse(
            success=True,
            message=action_messages.get(action, "操作完成"),
            data={
                "batch_id": batch.id,
                "batch_no": batch.batch_no,
                "status": batch.status.value,
                "action": action,
                "replay_strategy": batch.replay_strategy.value
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/batches", response_model=List[schemas.Batch])
def list_batches(skip: int = 0, limit: int = 100, clinic_code: Optional[str] = None,
                 status: Optional[BatchStatus] = None, db: Session = Depends(get_db)):
    return crud.get_batches(db, skip=skip, limit=limit, clinic_code=clinic_code, status=status)


@app.get("/batches/{batch_id}", response_model=schemas.BatchDetail)
def get_batch(batch_id: str, db: Session = Depends(get_db)):
    batch = crud.get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    return batch


@app.patch("/batches/{batch_id}", response_model=schemas.ApiResponse)
def update_batch(batch_id: str, batch_update: schemas.BatchUpdate,
                 db: Session = Depends(get_db), operator: str = Depends(get_operator)):
    try:
        batch = crud.update_batch(db, batch_id, batch_update, operator)
        if not batch:
            raise HTTPException(status_code=404, detail="批次不存在")
        return schemas.ApiResponse(success=True, message="更新成功", data={"batch_id": batch.id})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batches/{batch_id}/submit", response_model=schemas.ApiResponse)
def submit_batch(batch_id: str, db: Session = Depends(get_db), operator: str = Depends(get_operator)):
    try:
        batch = crud.submit_batch(db, batch_id, operator)
        if not batch:
            raise HTTPException(status_code=404, detail="批次不存在")
        return schemas.ApiResponse(
            success=True,
            message="提交成功",
            data={"batch_id": batch.id, "status": batch.status.value}
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batches/{batch_id}/withdraw", response_model=schemas.ApiResponse)
def withdraw_batch(batch_id: str, reason: str, db: Session = Depends(get_db),
                   operator: str = Depends(get_operator)):
    try:
        batch = crud.withdraw_batch(db, batch_id, operator, reason)
        if not batch:
            raise HTTPException(status_code=404, detail="批次不存在")
        return schemas.ApiResponse(
            success=True,
            message="撤回成功",
            data={"batch_id": batch.id, "status": batch.status.value}
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batches/{batch_id}/verify", response_model=schemas.ApiResponse)
def verify_batch(batch_id: str, is_pass: bool, reject_reason: Optional[str] = None,
                 db: Session = Depends(get_db), operator: str = Depends(get_operator)):
    try:
        batch = crud.verify_batch(db, batch_id, operator, is_pass, reject_reason)
        if not batch:
            raise HTTPException(status_code=404, detail="批次不存在")
        return schemas.ApiResponse(
            success=True,
            message="审核完成",
            data={"batch_id": batch.id, "status": batch.status.value}
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batches/{batch_id}/judge", response_model=schemas.ApiResponse)
def manual_judge(batch_id: str, request: schemas.ManualJudgeRequest,
                 db: Session = Depends(get_db), operator: str = Depends(get_operator)):
    try:
        batch = crud.manual_judge(db, batch_id, operator, request.new_status, request.judge_reason)
        if not batch:
            raise HTTPException(status_code=404, detail="批次不存在")
        return schemas.ApiResponse(
            success=True,
            message="人工改判完成",
            data={"batch_id": batch.id, "status": batch.status.value}
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batches/{batch_id}/freeze", response_model=schemas.ApiResponse)
def freeze_batch(batch_id: str, freeze_reason: str, db: Session = Depends(get_db),
                 operator: str = Depends(get_operator)):
    try:
        batch = crud.freeze_batch(db, batch_id, operator, freeze_reason)
        if not batch:
            raise HTTPException(status_code=404, detail="批次不存在")
        return schemas.ApiResponse(
            success=True,
            message="冻结成功",
            data={"batch_id": batch.id, "is_frozen": batch.is_frozen}
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batches/{batch_id}/unfreeze", response_model=schemas.ApiResponse)
def unfreeze_batch(batch_id: str, db: Session = Depends(get_db), operator: str = Depends(get_operator)):
    try:
        batch = crud.unfreeze_batch(db, batch_id, operator)
        if not batch:
            raise HTTPException(status_code=404, detail="批次不存在")
        return schemas.ApiResponse(
            success=True,
            message="解冻成功",
            data={"batch_id": batch.id, "is_frozen": batch.is_frozen}
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/batches/{batch_id}/reconcile", response_model=schemas.ReconcileResult)
def reconcile_batch(batch_id: str, db: Session = Depends(get_db), operator: str = Depends(get_operator)):
    result = crud.reconcile_batch(db, batch_id, operator)
    if not result:
        raise HTTPException(status_code=404, detail="批次不存在")
    return result


@app.get("/batches/{batch_id}/history", response_model=List[schemas.OperationHistory])
def get_history(batch_id: str, db: Session = Depends(get_db)):
    return crud.get_operation_history(db, batch_id)


@app.get("/batches/{batch_id}/export")
def export_batch(batch_id: str, db: Session = Depends(get_db), operator: str = Depends(get_operator)):
    batch = crud.get_batch(db, batch_id)
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    if not batch.is_frozen:
        raise HTTPException(status_code=400, detail="导出前请先冻结批次")
    
    crud.mark_exported(db, batch_id, operator)
    
    os.makedirs("exports", exist_ok=True)
    filename = f"exports/batch_{batch.batch_no}_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
    
    with pd.ExcelWriter(filename, engine='openpyxl') as writer:
        batch_data = {
            "批次号": [batch.batch_no],
            "院区": [batch.clinic_code],
            "状态": [batch.status.value],
            "创建时间": [batch.created_at],
            "提交人": [batch.submitter],
            "提交时间": [batch.submit_time],
            "审核人": [batch.verifier],
            "客服备注": [batch.customer_service_note]
        }
        pd.DataFrame(batch_data).to_excel(writer, sheet_name="批次概览", index=False)
        
        if batch.implants:
            implant_data = []
            for imp in batch.implants:
                implant_data.append({
                    "种植体ID": imp.implant_id,
                    "批号": imp.batch_no,
                    "型号": imp.implant_model,
                    "原始型号": imp.original_model,
                    "数量": imp.quantity,
                    "是否换型号": imp.is_model_changed,
                    "换型原因": imp.model_change_reason,
                    "库存是否扣减": imp.inventory_deducted
                })
            pd.DataFrame(implant_data).to_excel(writer, sheet_name="种植体", index=False)
        
        if batch.appointments:
            apt_data = []
            for apt in batch.appointments:
                apt_data.append({
                    "预约号": apt.appointment_no,
                    "患者": apt.patient_name,
                    "患者ID": apt.patient_id,
                    "医生": apt.doctor_name,
                    "预约日期": apt.appointment_date,
                    "手术类型": apt.surgery_type,
                    "使用种植体": apt.implant_used,
                    "病历是否更新": apt.medical_record_updated
                })
            pd.DataFrame(apt_data).to_excel(writer, sheet_name="预约记录", index=False)
        
        if batch.invoices:
            inv_data = []
            for inv in batch.invoices:
                inv_data.append({
                    "发票号": inv.invoice_no,
                    "供应商": inv.supplier_name,
                    "开票日期": inv.invoice_date,
                    "金额": inv.total_amount,
                    "币种": inv.currency,
                    "是否已验": inv.is_verified
                })
            pd.DataFrame(inv_data).to_excel(writer, sheet_name="供应商发票", index=False)
        
        if batch.operation_histories:
            hist_data = []
            for h in batch.operation_histories:
                hist_data.append({
                    "操作类型": h.operation_type.value,
                    "操作人": h.operator,
                    "操作时间": h.operation_time,
                    "原状态": h.from_status,
                    "新状态": h.to_status,
                    "备注": h.remark
                })
            pd.DataFrame(hist_data).to_excel(writer, sheet_name="操作历史", index=False)
    
    return FileResponse(
        filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=f"batch_{batch.batch_no}.xlsx"
    )


@app.post("/implants/{implant_db_id}/deduct", response_model=schemas.ApiResponse)
def deduct_inventory_by_db_id(implant_db_id: str, db: Session = Depends(get_db), operator: str = Depends(get_operator)):
    implant = crud.deducted_inventory(db, implant_db_id, operator)
    if not implant:
        raise HTTPException(status_code=404, detail="种植体不存在")
    return schemas.ApiResponse(success=True, message="库存扣减完成", data={"implant_db_id": implant_db_id})


@app.post("/batches/{batch_id}/implants/{implant_id}/deduct", response_model=schemas.ApiResponse)
def deduct_inventory_by_business_id(batch_id: str, implant_id: str, db: Session = Depends(get_db), operator: str = Depends(get_operator)):
    implant = crud.deducted_inventory_by_implant_id(db, implant_id, batch_id, operator)
    if not implant:
        raise HTTPException(status_code=404, detail="种植体不存在")
    return schemas.ApiResponse(success=True, message="库存扣减完成", data={"implant_id": implant_id})


@app.post("/appointments/{appointment_db_id}/update-record", response_model=schemas.ApiResponse)
def update_medical_record_by_db_id(appointment_db_id: str, db: Session = Depends(get_db), operator: str = Depends(get_operator)):
    apt = crud.update_medical_record(db, appointment_db_id, operator)
    if not apt:
        raise HTTPException(status_code=404, detail="预约不存在")
    return schemas.ApiResponse(success=True, message="病历更新完成", data={"appointment_db_id": appointment_db_id})


@app.post("/batches/{batch_id}/appointments/{appointment_no}/update-record", response_model=schemas.ApiResponse)
def update_medical_record_by_business_id(batch_id: str, appointment_no: str, db: Session = Depends(get_db), operator: str = Depends(get_operator)):
    apt = crud.update_medical_record_by_appointment_no(db, appointment_no, batch_id, operator)
    if not apt:
        raise HTTPException(status_code=404, detail="预约不存在")
    return schemas.ApiResponse(success=True, message="病历更新完成", data={"appointment_no": appointment_no})
