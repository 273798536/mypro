from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime
import pandas as pd
import io
from ..database import get_db
from ..auth import get_current_active_user, require_roles, can_export
from ..models import (
    User, UserRole, Material, LogisticsReceipt, BorrowRecord,
    ScanRecord, ReconciliationResult
)
from ..utils import log_operation

router = APIRouter(prefix="/exports", tags=["数据导出"])


def df_to_excel_bytes(df, sheet_name="Sheet1"):
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name=sheet_name, index=False)
    output.seek(0)
    return output


@router.get("/{batch_id}/materials")
async def export_materials(
    batch_id: int,
    request: Request,
    format: str = "excel",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    materials = db.query(Material).filter(Material.batch_id == batch_id).all()
    
    data = [{
        "物料编码": m.material_code,
        "物料名称": m.material_name,
        "分类": m.category,
        "规格": m.specification,
        "数量": m.quantity,
        "单位": m.unit,
        "库位": m.warehouse_location,
        "状态": m.status.value,
        "备注": m.remark,
        "创建时间": m.created_at
    } for m in materials]
    
    df = pd.DataFrame(data)
    
    if format == "csv":
        output = io.StringIO()
        df.to_csv(output, index=False)
        output.seek(0)
        media_type = "text/csv"
        filename = f"materials_{batch_id}_{datetime.now().strftime('%Y%m%d')}.csv"
    else:
        output = df_to_excel_bytes(df, "物料清单")
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"materials_{batch_id}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    log_operation(
        db, "EXPORT_MATERIALS", "materials", batch_id,
        created_by=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    
    return StreamingResponse(
        output,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{batch_id}/borrow")
async def export_borrow(
    batch_id: int,
    request: Request,
    only_unreturned: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    query = db.query(BorrowRecord).filter(BorrowRecord.batch_id == batch_id)
    if only_unreturned:
        query = query.filter(BorrowRecord.is_returned == False)
    borrows = query.all()
    
    data = [{
        "借用单号": b.borrow_no,
        "借用人": b.borrower_name,
        "联系电话": b.borrower_phone,
        "部门": b.borrower_department,
        "物料编码": b.material_code,
        "物料名称": b.material_name,
        "借用数量": b.quantity,
        "借用日期": b.borrow_date,
        "预计归还日期": b.expected_return_date,
        "实际归还日期": b.actual_return_date,
        "已归还数量": b.return_quantity,
        "未归还数量": b.quantity - b.return_quantity,
        "是否已归还": b.is_returned,
        "状态": b.status.value,
        "备注": b.remark
    } for b in borrows]
    
    df = pd.DataFrame(data)
    output = df_to_excel_bytes(df, "借用记录")
    filename = f"borrow_records_{batch_id}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    log_operation(
        db, "EXPORT_BORROW", "borrow_records", batch_id,
        created_by=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{batch_id}/full")
async def export_full_report(
    batch_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    materials = db.query(Material).filter(Material.batch_id == batch_id).all()
    logistics = db.query(LogisticsReceipt).filter(LogisticsReceipt.batch_id == batch_id).all()
    borrows = db.query(BorrowRecord).filter(BorrowRecord.batch_id == batch_id).all()
    scans = db.query(ScanRecord).filter(ScanRecord.batch_id == batch_id).all()
    recon = db.query(ReconciliationResult).filter(ReconciliationResult.batch_id == batch_id).all()
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        if materials:
            df_mat = pd.DataFrame([{
                "物料编码": m.material_code,
                "物料名称": m.material_name,
                "分类": m.category,
                "数量": m.quantity,
                "状态": m.status.value
            } for m in materials])
            df_mat.to_excel(writer, sheet_name="物料清单", index=False)
        
        if logistics:
            df_log = pd.DataFrame([{
                "运单号": l.waybill_no,
                "物料编码": l.material_code,
                "物料名称": l.material_name,
                "数量": l.quantity,
                "签收日期": l.receive_date,
                "签收人": l.receiver
            } for l in logistics])
            df_log.to_excel(writer, sheet_name="物流签收", index=False)
        
        if borrows:
            df_bor = pd.DataFrame([{
                "借用单号": b.borrow_no,
                "借用人": b.borrower_name,
                "部门": b.borrower_department,
                "物料编码": b.material_code,
                "物料名称": b.material_name,
                "借用数量": b.quantity,
                "已归还": b.return_quantity,
                "未归还": b.quantity - b.return_quantity,
                "借用日期": b.borrow_date
            } for b in borrows])
            df_bor.to_excel(writer, sheet_name="借用记录", index=False)
        
        if scans:
            df_scan = pd.DataFrame([{
                "扫码单号": s.scan_no,
                "物料编码": s.material_code,
                "类型": s.scan_type,
                "数量": s.quantity,
                "时间": s.scan_time,
                "扫码人": s.scanner
            } for s in scans])
            df_scan.to_excel(writer, sheet_name="扫码明细", index=False)
        
        if recon:
            df_recon = pd.DataFrame([{
                "物料编码": r.material_code,
                "物料名称": r.material_name,
                "账面数量": r.expected_quantity,
                "实际扫码": r.actual_quantity,
                "差异": r.difference,
                "是否异常": r.is_anomaly,
                "异常描述": r.anomaly_description
            } for r in recon])
            df_recon.to_excel(writer, sheet_name="对账结果", index=False)
    
    output.seek(0)
    filename = f"full_report_{batch_id}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    log_operation(
        db, "EXPORT_FULL_REPORT", "full_report", batch_id,
        created_by=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
