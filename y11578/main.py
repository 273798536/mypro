import json
import csv
import io
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import (
    get_db, init_db,
    DeliveryOrder, RepairRecord, DeductionDetail, RefundFlow,
    ReconciliationResult, ReconciliationDetail, OperationLog,
    BatchInfo, CompensationRecord
)
from schemas import (
    DeliveryOrderCreate, RepairRecordCreate, DeductionDetailCreate, RefundFlowCreate,
    RecordFix, ReconciliationRequest, ExportRequest,
    BatchFreezeRequest, RecordWithdrawRequest, CompensationRequest
)
from reconciliation import DirtyDataDetector, ReconciliationEngine, generate_import_key

app = FastAPI(title="外协加工对账验收回放链路 API")

@app.on_event("startup")
def startup_event():
    init_db()

@app.post("/api/delivery/import", summary="导入外协送货单")
def import_delivery(records: List[DeliveryOrderCreate], db: Session = Depends(get_db)):
    results = []
    engine = ReconciliationEngine(db)
    batch_products = engine._get_batch_products()
    
    for record in records:
        record_dict = record.dict()
        
        import_key = generate_import_key(record_dict, ['order_no', 'batch_no', 'quantity', 'delivery_date'])
        
        existing_record = db.query(DeliveryOrder).filter(
            DeliveryOrder.import_key == import_key
        ).first()
        
        if existing_record:
            results.append({
                "id": existing_record.id,
                "order_no": record.order_no,
                "batch_no": record.batch_no,
                "is_duplicate": True,
                "is_dirty": existing_record.is_dirty,
                "dirty_reason": existing_record.dirty_reason
            })
            continue
        
        batch_info = db.query(BatchInfo).filter(BatchInfo.batch_no == record.batch_no).first()
        if batch_info and batch_info.is_frozen:
            results.append({
                "order_no": record.order_no,
                "batch_no": record.batch_no,
                "is_frozen": True,
                "error": "批次已冻结，无法导入"
            })
            continue
        
        existing = db.query(DeliveryOrder).filter(
            DeliveryOrder.batch_no == record.batch_no
        ).all()
        
        is_dirty, dirty_type, dirty_reason, fix_suggestion = DirtyDataDetector.detect_delivery_order(
            record_dict, existing, batch_products
        )
        
        db_record = DeliveryOrder(
            **record_dict,
            raw_data=json.dumps(record_dict, ensure_ascii=False),
            is_dirty=is_dirty,
            dirty_type=dirty_type,
            dirty_reason=dirty_reason if is_dirty else None,
            fix_suggestion=fix_suggestion if is_dirty else None,
            import_key=import_key
        )
        db.add(db_record)
        db.flush()
        
        if record.batch_no and record.product_name and record.batch_no not in batch_products:
            batch_products[record.batch_no] = record.product_name
        
        log = OperationLog(
            operation_type="IMPORT",
            table_name="delivery_orders",
            record_id=db_record.id,
            old_value="",
            new_value=json.dumps(record_dict, ensure_ascii=False),
            operator="api"
        )
        db.add(log)
        
        results.append({
            "id": db_record.id,
            "order_no": record.order_no,
            "batch_no": record.batch_no,
            "is_dirty": is_dirty,
            "dirty_type": dirty_type,
            "dirty_reason": dirty_reason,
            "is_duplicate": False
        })
    
    db.commit()
    return {
        "success": True,
        "total": len(records),
        "dirty_count": sum(1 for r in results if r.get("is_dirty")),
        "duplicate_count": sum(1 for r in results if r.get("is_duplicate")),
        "results": results
    }

@app.post("/api/repair/import", summary="导入返修记录")
def import_repair(records: List[RepairRecordCreate], db: Session = Depends(get_db)):
    results = []
    engine = ReconciliationEngine(db)
    batch_products = engine._get_batch_products()
    
    for record in records:
        record_dict = record.dict()
        
        import_key = generate_import_key(record_dict, ['repair_no', 'batch_no', 'repair_quantity', 'repair_date'])
        
        existing_record = db.query(RepairRecord).filter(
            RepairRecord.import_key == import_key
        ).first()
        
        if existing_record:
            results.append({
                "id": existing_record.id,
                "repair_no": record.repair_no,
                "batch_no": record.batch_no,
                "is_duplicate": True,
                "is_dirty": existing_record.is_dirty,
                "dirty_reason": existing_record.dirty_reason
            })
            continue
        
        batch_info = db.query(BatchInfo).filter(BatchInfo.batch_no == record.batch_no).first()
        if batch_info and batch_info.is_frozen:
            results.append({
                "repair_no": record.repair_no,
                "batch_no": record.batch_no,
                "is_frozen": True,
                "error": "批次已冻结，无法导入"
            })
            continue
        
        existing = db.query(RepairRecord).filter(
            RepairRecord.batch_no == record.batch_no
        ).all()
        
        is_dirty, dirty_type, dirty_reason, fix_suggestion = DirtyDataDetector.detect_repair_record(
            record_dict, existing, batch_products
        )
        
        db_record = RepairRecord(
            **record_dict,
            raw_data=json.dumps(record_dict, ensure_ascii=False),
            is_dirty=is_dirty,
            dirty_type=dirty_type,
            dirty_reason=dirty_reason if is_dirty else None,
            fix_suggestion=fix_suggestion if is_dirty else None,
            import_key=import_key
        )
        db.add(db_record)
        db.flush()
        
        if record.batch_no and record.product_name and record.batch_no not in batch_products:
            batch_products[record.batch_no] = record.product_name
        
        log = OperationLog(
            operation_type="IMPORT",
            table_name="repair_records",
            record_id=db_record.id,
            old_value="",
            new_value=json.dumps(record_dict, ensure_ascii=False),
            operator="api"
        )
        db.add(log)
        
        results.append({
            "id": db_record.id,
            "repair_no": record.repair_no,
            "batch_no": record.batch_no,
            "is_dirty": is_dirty,
            "dirty_type": dirty_type,
            "dirty_reason": dirty_reason,
            "is_duplicate": False
        })
    
    db.commit()
    return {
        "success": True,
        "total": len(records),
        "dirty_count": sum(1 for r in results if r.get("is_dirty")),
        "duplicate_count": sum(1 for r in results if r.get("is_duplicate")),
        "results": results
    }

@app.post("/api/deduction/import", summary="导入扣款明细")
def import_deduction(records: List[DeductionDetailCreate], db: Session = Depends(get_db)):
    results = []
    engine = ReconciliationEngine(db)
    batch_products = engine._get_batch_products()
    
    for record in records:
        record_dict = record.dict()
        
        import_key = generate_import_key(record_dict, ['deduction_no', 'batch_no', 'amount', 'deduction_date'])
        
        existing_record = db.query(DeductionDetail).filter(
            DeductionDetail.import_key == import_key
        ).first()
        
        if existing_record:
            results.append({
                "id": existing_record.id,
                "deduction_no": record.deduction_no,
                "batch_no": record.batch_no,
                "is_duplicate": True,
                "is_dirty": existing_record.is_dirty,
                "dirty_reason": existing_record.dirty_reason
            })
            continue
        
        batch_info = db.query(BatchInfo).filter(BatchInfo.batch_no == record.batch_no).first()
        if batch_info and batch_info.is_frozen:
            results.append({
                "deduction_no": record.deduction_no,
                "batch_no": record.batch_no,
                "is_frozen": True,
                "error": "批次已冻结，无法导入"
            })
            continue
        
        existing = db.query(DeductionDetail).filter(
            DeductionDetail.batch_no == record.batch_no
        ).all()
        
        is_dirty, dirty_type, dirty_reason, fix_suggestion = DirtyDataDetector.detect_deduction_detail(
            record_dict, existing, batch_products
        )
        
        db_record = DeductionDetail(
            **record_dict,
            raw_data=json.dumps(record_dict, ensure_ascii=False),
            is_dirty=is_dirty,
            dirty_type=dirty_type,
            dirty_reason=dirty_reason if is_dirty else None,
            fix_suggestion=fix_suggestion if is_dirty else None,
            import_key=import_key
        )
        db.add(db_record)
        db.flush()
        
        if record.batch_no and record.product_name and record.batch_no not in batch_products:
            batch_products[record.batch_no] = record.product_name
        
        log = OperationLog(
            operation_type="IMPORT",
            table_name="deduction_details",
            record_id=db_record.id,
            old_value="",
            new_value=json.dumps(record_dict, ensure_ascii=False),
            operator="api"
        )
        db.add(log)
        
        results.append({
            "id": db_record.id,
            "deduction_no": record.deduction_no,
            "batch_no": record.batch_no,
            "is_dirty": is_dirty,
            "dirty_type": dirty_type,
            "dirty_reason": dirty_reason,
            "is_duplicate": False
        })
    
    db.commit()
    return {
        "success": True,
        "total": len(records),
        "dirty_count": sum(1 for r in results if r.get("is_dirty")),
        "duplicate_count": sum(1 for r in results if r.get("is_duplicate")),
        "results": results
    }

@app.post("/api/refund/import", summary="导入退款流水")
def import_refund(records: List[RefundFlowCreate], db: Session = Depends(get_db)):
    results = []
    
    for record in records:
        record_dict = record.dict()
        
        import_key = generate_import_key(record_dict, ['refund_no', 'batch_no', 'amount', 'refund_date'])
        
        existing_record = db.query(RefundFlow).filter(
            RefundFlow.import_key == import_key
        ).first()
        
        if existing_record:
            results.append({
                "id": existing_record.id,
                "refund_no": record.refund_no,
                "batch_no": record.batch_no,
                "is_duplicate": True,
                "is_dirty": existing_record.is_dirty,
                "dirty_reason": existing_record.dirty_reason
            })
            continue
        
        batch_info = db.query(BatchInfo).filter(BatchInfo.batch_no == record.batch_no).first()
        if batch_info and batch_info.is_frozen:
            results.append({
                "refund_no": record.refund_no,
                "batch_no": record.batch_no,
                "is_frozen": True,
                "error": "批次已冻结，无法导入"
            })
            continue
        
        existing = db.query(RefundFlow).filter(
            RefundFlow.batch_no == record.batch_no
        ).all()
        
        is_dirty, dirty_type, dirty_reason, fix_suggestion = DirtyDataDetector.detect_refund_flow(
            record_dict, existing
        )
        
        db_record = RefundFlow(
            **record_dict,
            raw_data=json.dumps(record_dict, ensure_ascii=False),
            is_dirty=is_dirty,
            dirty_type=dirty_type,
            dirty_reason=dirty_reason if is_dirty else None,
            fix_suggestion=fix_suggestion if is_dirty else None,
            import_key=import_key
        )
        db.add(db_record)
        db.flush()
        
        log = OperationLog(
            operation_type="IMPORT",
            table_name="refund_flows",
            record_id=db_record.id,
            old_value="",
            new_value=json.dumps(record_dict, ensure_ascii=False),
            operator="api"
        )
        db.add(log)
        
        results.append({
            "id": db_record.id,
            "refund_no": record.refund_no,
            "batch_no": record.batch_no,
            "is_dirty": is_dirty,
            "dirty_type": dirty_type,
            "dirty_reason": dirty_reason,
            "is_duplicate": False
        })
    
    db.commit()
    return {
        "success": True,
        "total": len(records),
        "dirty_count": sum(1 for r in results if r.get("is_dirty")),
        "duplicate_count": sum(1 for r in results if r.get("is_duplicate")),
        "results": results
    }

@app.post("/api/batch/freeze", summary="冻结批次")
def freeze_batch(request: BatchFreezeRequest, db: Session = Depends(get_db)):
    batch_info = db.query(BatchInfo).filter(BatchInfo.batch_no == request.batch_no).first()
    
    if not batch_info:
        batch_info = BatchInfo(batch_no=request.batch_no)
        db.add(batch_info)
    
    old_value = json.dumps({"is_frozen": batch_info.is_frozen}, ensure_ascii=False)
    
    batch_info.is_frozen = True
    batch_info.freeze_reason = request.freeze_reason
    batch_info.frozen_by = request.operator
    batch_info.frozen_at = datetime.utcnow()
    
    log = OperationLog(
        operation_type="FREEZE",
        table_name="batch_info",
        record_id=batch_info.id,
        old_value=old_value,
        new_value=json.dumps({"is_frozen": True, "freeze_reason": request.freeze_reason}, ensure_ascii=False),
        operator=request.operator
    )
    db.add(log)
    db.commit()
    
    return {
        "success": True,
        "batch_no": request.batch_no,
        "is_frozen": True,
        "freeze_reason": request.freeze_reason
    }

@app.post("/api/batch/unfreeze", summary="解冻批次")
def unfreeze_batch(request: BatchFreezeRequest, db: Session = Depends(get_db)):
    batch_info = db.query(BatchInfo).filter(BatchInfo.batch_no == request.batch_no).first()
    
    if not batch_info or not batch_info.is_frozen:
        raise HTTPException(status_code=400, detail="批次未冻结")
    
    old_value = json.dumps({"is_frozen": True}, ensure_ascii=False)
    
    batch_info.is_frozen = False
    
    log = OperationLog(
        operation_type="UNFREEZE",
        table_name="batch_info",
        record_id=batch_info.id,
        old_value=old_value,
        new_value=json.dumps({"is_frozen": False}, ensure_ascii=False),
        operator=request.operator
    )
    db.add(log)
    db.commit()
    
    return {
        "success": True,
        "batch_no": request.batch_no,
        "is_frozen": False
    }

@app.post("/api/record/withdraw", summary="撤回记录")
def withdraw_record(request: RecordWithdrawRequest, db: Session = Depends(get_db)):
    tables = {
        "delivery_orders": DeliveryOrder,
        "repair_records": RepairRecord,
        "deduction_details": DeductionDetail,
        "refund_flows": RefundFlow
    }
    
    if request.table_name not in tables:
        raise HTTPException(status_code=400, detail="无效的表名")
    
    Model = tables[request.table_name]
    record = db.query(Model).filter(Model.id == request.id).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    
    if record.is_withdrawn:
        raise HTTPException(status_code=400, detail="记录已撤回")
    
    old_value = record.raw_data
    
    record.is_withdrawn = True
    record.withdraw_reason = request.withdraw_reason
    record.withdrawn_by = request.operator
    record.withdrawn_at = datetime.utcnow()
    
    log = OperationLog(
        operation_type="WITHDRAW",
        table_name=request.table_name,
        record_id=request.id,
        old_value=old_value,
        new_value=json.dumps({
            "is_withdrawn": True,
            "withdraw_reason": request.withdraw_reason
        }, ensure_ascii=False),
        operator=request.operator
    )
    db.add(log)
    db.commit()
    
    return {
        "success": True,
        "table": request.table_name,
        "id": request.id,
        "is_withdrawn": True,
        "withdraw_reason": request.withdraw_reason
    }

@app.post("/api/compensation/add", summary="添加补偿记录")
def add_compensation(request: CompensationRequest, db: Session = Depends(get_db)):
    compensation_no = f"COMP{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    comp = CompensationRecord(
        compensation_no=compensation_no,
        batch_no=request.batch_no,
        amount=request.amount,
        reason=request.reason,
        operator=request.operator
    )
    db.add(comp)
    db.flush()
    
    log = OperationLog(
        operation_type="COMPENSATION",
        table_name="compensation_records",
        record_id=comp.id,
        old_value="",
        new_value=json.dumps({
            "compensation_no": compensation_no,
            "batch_no": request.batch_no,
            "amount": request.amount,
            "reason": request.reason
        }, ensure_ascii=False),
        operator=request.operator
    )
    db.add(log)
    db.commit()
    
    return {
        "success": True,
        "compensation_no": compensation_no,
        "batch_no": request.batch_no,
        "amount": request.amount,
        "reason": request.reason
    }

@app.get("/api/dirty/list", summary="获取脏记录列表")
def get_dirty_records(table: Optional[str] = None, db: Session = Depends(get_db)):
    results = []
    tables = {
        "delivery_orders": DeliveryOrder,
        "repair_records": RepairRecord,
        "deduction_details": DeductionDetail,
        "refund_flows": RefundFlow
    }
    
    target_tables = [table] if table else tables.keys()
    
    for table_name in target_tables:
        if table_name not in tables:
            continue
        Model = tables[table_name]
        records = db.query(Model).filter(Model.is_dirty == True, Model.is_withdrawn == False).all()
        for r in records:
            results.append({
                "table": table_name,
                "id": r.id,
                "batch_no": r.batch_no,
                "dirty_type": r.dirty_type,
                "dirty_reason": r.dirty_reason,
                "fix_suggestion": r.fix_suggestion,
                "is_fixed": r.is_fixed,
                "raw_data": json.loads(r.raw_data) if r.raw_data else {}
            })
    
    return {"success": True, "count": len(results), "data": results}

@app.post("/api/record/fix", summary="修正脏记录")
def fix_record(fix: RecordFix, db: Session = Depends(get_db)):
    tables = {
        "delivery_orders": DeliveryOrder,
        "repair_records": RepairRecord,
        "deduction_details": DeductionDetail,
        "refund_flows": RefundFlow
    }
    
    if fix.table_name not in tables:
        raise HTTPException(status_code=400, detail="无效的表名")
    
    Model = tables[fix.table_name]
    record = db.query(Model).filter(Model.id == fix.id).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    
    if record.is_withdrawn:
        raise HTTPException(status_code=400, detail="记录已撤回，无法修正")
    
    old_value = record.raw_data
    
    for key, value in fix.updates.items():
        if hasattr(record, key):
            setattr(record, key, value)
    
    record_dict = {c.name: getattr(record, c.name) for c in record.__table__.columns}
    record_dict = {k: v for k, v in record_dict.items() if k not in ['id', 'is_dirty', 'dirty_type', 'dirty_reason', 'fix_suggestion', 'is_fixed', 'fixed_by', 'fixed_at', 'raw_data', 'created_at', 'updated_at', 'is_withdrawn', 'withdraw_reason', 'withdrawn_by', 'withdrawn_at', 'import_key']}
    
    existing = db.query(Model).filter(
        Model.batch_no == record.batch_no,
        Model.id != record.id,
        Model.is_withdrawn == False
    ).all()
    
    engine = ReconciliationEngine(db)
    batch_products = engine._get_batch_products()
    
    if fix.table_name == "delivery_orders":
        is_dirty, dirty_type, dirty_reason, fix_suggestion = DirtyDataDetector.detect_delivery_order(record_dict, existing, batch_products)
    elif fix.table_name == "repair_records":
        is_dirty, dirty_type, dirty_reason, fix_suggestion = DirtyDataDetector.detect_repair_record(record_dict, existing, batch_products)
    elif fix.table_name == "deduction_details":
        is_dirty, dirty_type, dirty_reason, fix_suggestion = DirtyDataDetector.detect_deduction_detail(record_dict, existing, batch_products)
    else:
        is_dirty, dirty_type, dirty_reason, fix_suggestion = DirtyDataDetector.detect_refund_flow(record_dict, existing)
    
    record.is_dirty = is_dirty
    record.dirty_type = dirty_type if is_dirty else None
    record.dirty_reason = dirty_reason if is_dirty else None
    record.fix_suggestion = fix_suggestion if is_dirty else None
    record.is_fixed = not is_dirty
    record.fixed_by = fix.operator
    record.fixed_at = datetime.utcnow()
    record.raw_data = json.dumps(record_dict, ensure_ascii=False)
    
    log = OperationLog(
        operation_type="FIX",
        table_name=fix.table_name,
        record_id=fix.id,
        old_value=old_value,
        new_value=json.dumps(record_dict, ensure_ascii=False),
        operator=fix.operator
    )
    db.add(log)
    db.commit()
    
    return {
        "success": True,
        "table": fix.table_name,
        "id": fix.id,
        "is_dirty": is_dirty,
        "dirty_type": dirty_type,
        "dirty_reason": dirty_reason
    }

@app.post("/api/reconcile", summary="执行对账")
def reconcile(request: ReconciliationRequest, db: Session = Depends(get_db)):
    engine = ReconciliationEngine(db)
    results = engine.reconcile_all(request.batch_nos, operator="api")
    
    return {
        "success": True,
        "count": len(results),
        "discrepancy_count": sum(1 for r in results if r.has_discrepancy),
        "results": [
            {
                "recon_no": r.recon_no,
                "batch_no": r.batch_no,
                "supplier": r.supplier,
                "product_name": r.product_name,
                "has_discrepancy": r.has_discrepancy,
                "discrepancy_amount": r.discrepancy_amount,
                "status": r.status
            }
            for r in results
        ]
    }

@app.get("/api/reconciliation/list", summary="对账结果列表")
def get_reconciliation_list(
    has_discrepancy: Optional[bool] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ReconciliationResult)
    
    if has_discrepancy is not None:
        query = query.filter(ReconciliationResult.has_discrepancy == has_discrepancy)
    if status:
        query = query.filter(ReconciliationResult.status == status)
    
    results = query.order_by(ReconciliationResult.created_at.desc()).all()
    
    return {
        "success": True,
        "count": len(results),
        "data": [
            {
                "id": r.id,
                "recon_no": r.recon_no,
                "batch_no": r.batch_no,
                "supplier": r.supplier,
                "product_name": r.product_name,
                "total_delivery_qty": r.total_delivery_qty,
                "total_repair_qty": r.total_repair_qty,
                "total_return_qty": r.total_return_qty,
                "total_deduction_amount": r.total_deduction_amount,
                "total_refund_amount": r.total_refund_amount,
                "total_compensation_amount": r.total_compensation_amount,
                "net_settlement": r.net_settlement,
                "has_discrepancy": r.has_discrepancy,
                "discrepancy_type": r.discrepancy_type,
                "discrepancy_desc": r.discrepancy_desc,
                "discrepancy_amount": r.discrepancy_amount,
                "status": r.status,
                "recon_date": r.recon_date
            }
            for r in results
        ]
    }

@app.get("/api/reconciliation/{recon_no}", summary="对账详情")
def get_reconciliation_detail(recon_no: str, db: Session = Depends(get_db)):
    recon = db.query(ReconciliationResult).filter(ReconciliationResult.recon_no == recon_no).first()
    
    if not recon:
        raise HTTPException(status_code=404, detail="对账记录不存在")
    
    details = db.query(ReconciliationDetail).filter(ReconciliationDetail.recon_id == recon.id).all()
    
    return {
        "success": True,
        "summary": {
            "recon_no": recon.recon_no,
            "batch_no": recon.batch_no,
            "supplier": recon.supplier,
            "product_name": recon.product_name,
            "total_delivery_qty": recon.total_delivery_qty,
            "total_repair_qty": recon.total_repair_qty,
            "total_return_qty": recon.total_return_qty,
            "total_deduction_amount": recon.total_deduction_amount,
            "total_refund_amount": recon.total_refund_amount,
            "total_compensation_amount": recon.total_compensation_amount,
            "net_settlement": recon.net_settlement,
            "has_discrepancy": recon.has_discrepancy,
            "discrepancy_desc": recon.discrepancy_desc,
            "discrepancy_amount": recon.discrepancy_amount,
            "status": recon.status
        },
        "details": [
            {
                "source_type": d.source_type,
                "source_no": d.source_no,
                "quantity": d.quantity,
                "amount": d.amount,
                "date": d.date,
                "remark": d.remark
            }
            for d in details
        ]
    }

@app.get("/api/export/{recon_no}", summary="导出对账结果")
def export_reconciliation(recon_no: str, format: str = "csv", db: Session = Depends(get_db)):
    recon = db.query(ReconciliationResult).filter(ReconciliationResult.recon_no == recon_no).first()
    
    if not recon:
        raise HTTPException(status_code=404, detail="对账记录不存在")
    
    details = db.query(ReconciliationDetail).filter(ReconciliationDetail.recon_id == recon.id).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["外协加工对账验收报告"])
    writer.writerow(["对账编号", recon.recon_no])
    writer.writerow(["批次号", recon.batch_no])
    writer.writerow(["供应商", recon.supplier])
    writer.writerow(["产品名称", recon.product_name])
    writer.writerow(["对账日期", recon.recon_date])
    writer.writerow([])
    
    writer.writerow(["汇总信息"])
    writer.writerow(["送货总数", recon.total_delivery_qty])
    writer.writerow(["返修总数", recon.total_repair_qty])
    writer.writerow(["返还总数", recon.total_return_qty])
    writer.writerow(["扣款总额", recon.total_deduction_amount])
    writer.writerow(["退款总额", recon.total_refund_amount])
    writer.writerow(["补偿总额", recon.total_compensation_amount])
    writer.writerow(["净结算额", recon.net_settlement])
    writer.writerow(["是否有差异", "是" if recon.has_discrepancy else "否"])
    if recon.has_discrepancy:
        writer.writerow(["差异类型", recon.discrepancy_type])
        writer.writerow(["差异说明", recon.discrepancy_desc])
        writer.writerow(["差异金额", recon.discrepancy_amount])
    writer.writerow(["状态", recon.status])
    writer.writerow([])
    
    writer.writerow(["明细记录"])
    writer.writerow(["来源类型", "单据编号", "数量", "金额", "日期", "备注"])
    for d in details:
        writer.writerow([
            d.source_type,
            d.source_no,
            d.quantity,
            d.amount,
            d.date,
            d.remark
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=recon_{recon_no}.csv"}
    )

@app.get("/api/logs", summary="操作日志")
def get_operation_logs(
    operation_type: Optional[str] = None,
    table_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(OperationLog)
    
    if operation_type:
        query = query.filter(OperationLog.operation_type == operation_type)
    if table_name:
        query = query.filter(OperationLog.table_name == table_name)
    
    logs = query.order_by(OperationLog.operation_time.desc()).limit(100).all()
    
    return {
        "success": True,
        "count": len(logs),
        "data": [
            {
                "id": l.id,
                "operation_type": l.operation_type,
                "table_name": l.table_name,
                "record_id": l.record_id,
                "operator": l.operator,
                "operation_time": l.operation_time.strftime('%Y-%m-%d %H:%M:%S')
            }
            for l in logs
        ]
    }

@app.get("/api/batch/list", summary="批次列表")
def get_batch_list(db: Session = Depends(get_db)):
    batches = db.query(BatchInfo).all()
    
    return {
        "success": True,
        "count": len(batches),
        "data": [
            {
                "batch_no": b.batch_no,
                "is_frozen": b.is_frozen,
                "freeze_reason": b.freeze_reason,
                "frozen_by": b.frozen_by,
                "frozen_at": b.frozen_at.strftime('%Y-%m-%d %H:%M:%S') if b.frozen_at else None
            }
            for b in batches
        ]
    }

@app.get("/api/health", summary="健康检查")
def health_check():
    return {"status": "ok", "service": "外协加工对账验收回放链路服务"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
