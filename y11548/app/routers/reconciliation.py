from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from collections import defaultdict
from datetime import datetime
from ..database import get_db
from ..auth import get_current_active_user, require_roles, get_visible_fields_for_role
from ..models import (
    User, UserRole, Material, LogisticsReceipt, BorrowRecord,
    ScanRecord, ReconciliationResult
)
from ..schemas import ReconciliationResultResponse
from ..utils import log_operation, object_to_dict, filter_response_data

router = APIRouter(prefix="/reconciliation", tags=["对账与异常"])


@router.post("/{batch_id}", response_model=dict)
async def run_reconciliation(
    batch_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    db.query(ReconciliationResult).filter(ReconciliationResult.batch_id == batch_id).delete()
    
    materials = db.query(Material).filter(Material.batch_id == batch_id).all()
    logistics = db.query(LogisticsReceipt).filter(LogisticsReceipt.batch_id == batch_id).all()
    borrows = db.query(BorrowRecord).filter(BorrowRecord.batch_id == batch_id).all()
    scans = db.query(ScanRecord).filter(ScanRecord.batch_id == batch_id).all()
    
    material_qty = defaultdict(int)
    for m in materials:
        material_qty[m.material_code] += m.quantity
    
    logistics_qty = defaultdict(int)
    for l in logistics:
        if l.material_code:
            logistics_qty[l.material_code] += l.quantity
    
    borrow_out_qty = defaultdict(int)
    borrow_return_qty = defaultdict(int)
    for b in borrows:
        borrow_out_qty[b.material_code] += b.quantity
        borrow_return_qty[b.material_code] += b.return_quantity
    
    scan_in_qty = defaultdict(int)
    scan_out_qty = defaultdict(int)
    for s in scans:
        if s.scan_type in ["in", "入库", "进场"]:
            scan_in_qty[s.material_code] += s.quantity
        elif s.scan_type in ["out", "出库", "离场"]:
            scan_out_qty[s.material_code] += s.quantity
    
    all_codes = set()
    all_codes.update(material_qty.keys())
    all_codes.update(logistics_qty.keys())
    all_codes.update(borrow_out_qty.keys())
    all_codes.update(scan_in_qty.keys())
    all_codes.update(scan_out_qty.keys())
    
    anomalies = []
    
    for code in all_codes:
        mat = material_qty.get(code, 0)
        log = logistics_qty.get(code, 0)
        bor_out = borrow_out_qty.get(code, 0)
        bor_ret = borrow_return_qty.get(code, 0)
        scan_in = scan_in_qty.get(code, 0)
        scan_out = scan_out_qty.get(code, 0)
        
        expected_on_site = mat + log - bor_out + bor_ret
        actual_scan = scan_in - scan_out
        diff = expected_on_site - actual_scan
        
        is_anomaly = abs(diff) > 0 or (mat > 0 and log == 0)
        
        anomaly_desc = []
        if abs(diff) > 0:
            anomaly_desc.append(f"账面与扫码差异: {diff}件")
        if mat > 0 and log == 0:
            anomaly_desc.append("有物料清单但无物流签收记录")
        if bor_out > bor_ret:
            anomaly_desc.append(f"有未归还设备: {bor_out - bor_ret}件")
        
        result = ReconciliationResult(
            batch_id=batch_id,
            reconciliation_type="full",
            material_code=code,
            material_name=next((m.material_name for m in materials if m.material_code == code), None),
            expected_quantity=expected_on_site,
            actual_quantity=actual_scan,
            difference=diff,
            is_anomaly=is_anomaly,
            anomaly_description="; ".join(anomaly_desc) if anomaly_desc else None,
            created_by=current_user.id
        )
        db.add(result)
        
        if is_anomaly:
            anomalies.append({
                "material_code": code,
                "material_name": result.material_name,
                "expected": expected_on_site,
                "actual": actual_scan,
                "difference": diff,
                "description": result.anomaly_description
            })
    
    db.commit()
    
    log_operation(
        db, "RECONCILIATION", "reconciliation_results",
        batch_id,
        new_value={"anomaly_count": len(anomalies)},
        created_by=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    
    return {
        "total_codes": len(all_codes),
        "anomaly_count": len(anomalies),
        "anomalies": anomalies
    }


@router.get("/{batch_id}")
async def get_reconciliation_results(
    batch_id: int,
    only_anomalies: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(ReconciliationResult).filter(ReconciliationResult.batch_id == batch_id)
    if only_anomalies:
        query = query.filter(ReconciliationResult.is_anomaly == True)
    results = query.all()
    visible_fields = get_visible_fields_for_role(current_user.role, "reconciliation")
    return filter_response_data([object_to_dict(r) for r in results], visible_fields)


@router.get("/{batch_id}/trace/{material_code}")
async def trace_material(
    batch_id: int,
    material_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    materials = db.query(Material).filter(
        Material.batch_id == batch_id,
        Material.material_code == material_code
    ).all()
    
    logistics = db.query(LogisticsReceipt).filter(
        LogisticsReceipt.batch_id == batch_id,
        LogisticsReceipt.material_code == material_code
    ).all()
    
    borrows = db.query(BorrowRecord).filter(
        BorrowRecord.batch_id == batch_id,
        BorrowRecord.material_code == material_code
    ).all()
    
    scans = db.query(ScanRecord).filter(
        ScanRecord.batch_id == batch_id,
        ScanRecord.material_code == material_code
    ).order_by(ScanRecord.scan_time).all()
    
    return {
        "material_code": material_code,
        "material_list_records": [
            {"id": m.id, "name": m.material_name, "qty": m.quantity, "status": m.status.value}
            for m in materials
        ],
        "logistics_records": [
            {"id": l.id, "date": l.receive_date, "qty": l.quantity, "receiver": l.receiver}
            for l in logistics
        ],
        "borrow_records": [
            {
                "id": b.id, "borrow_no": b.borrow_no, "borrower": b.borrower_name,
                "qty": b.quantity, "returned": b.return_quantity, "date": b.borrow_date
            }
            for b in borrows
        ],
        "scan_records": [
            {"id": s.id, "type": s.scan_type, "qty": s.quantity, "time": s.scan_time, "scanner": s.scanner}
            for s in scans
        ]
    }
