from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.orm import Session
from datetime import datetime
import pandas as pd
import io
from ..database import get_db
from ..auth import get_current_active_user, require_roles, get_visible_fields_for_role
from ..models import (
    User, UserRole, ImportTask, ImportFailure, ImportStatus,
    Material, LogisticsReceipt, BorrowRecord, ScanRecord, RecordStatus
)
from ..schemas import ImportTaskResponse, ImportFailureResponse
from ..utils import log_operation, generate_no, is_batch_frozen, filter_response_data, object_to_dict

router = APIRouter(prefix="/imports", tags=["数据导入"])


@router.post("/{import_type}", response_model=ImportTaskResponse)
async def import_data(
    import_type: str,
    batch_id: int,
    file: UploadFile = File(...),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.DATA_ENTRY, UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    valid_types = ["material", "logistics", "borrow", "scan"]
    if import_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid import type. Must be one of {valid_types}")
    
    if is_batch_frozen(db, batch_id):
        raise HTTPException(status_code=400, detail="Cannot import data to frozen or completed batch")
    
    task_no = generate_no("IMP")
    task = ImportTask(
        task_no=task_no,
        batch_id=batch_id,
        import_type=import_type,
        file_name=file.filename,
        status=ImportStatus.PROCESSING,
        created_by=current_user.id
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        task.total_count = len(df)
        success_count = 0
        failed_count = 0
        
        for idx, row in df.iterrows():
            row_num = idx + 2
            try:
                if import_type == "material":
                    record = Material(
                        batch_id=batch_id,
                        material_code=str(row.get("物料编码", "")),
                        material_name=str(row.get("物料名称", "")),
                        category=str(row.get("分类", "")),
                        specification=str(row.get("规格", "")),
                        quantity=int(row.get("数量", 0)),
                        unit=str(row.get("单位", "件")),
                        warehouse_location=str(row.get("库位", "")),
                        status=RecordStatus.SUBMITTED,
                        created_by=current_user.id
                    )
                elif import_type == "logistics":
                    record = LogisticsReceipt(
                        batch_id=batch_id,
                        waybill_no=str(row.get("运单号", "")),
                        logistics_company=str(row.get("物流公司", "")),
                        sender=str(row.get("发货人", "")),
                        receiver=str(row.get("签收人", "")),
                        receive_date=pd.to_datetime(row.get("签收日期", datetime.now())).to_pydatetime(),
                        material_code=str(row.get("物料编码", "")),
                        material_name=str(row.get("物料名称", "")),
                        quantity=int(row.get("数量", 0)),
                        package_condition=str(row.get("包装情况", "")),
                        is_damaged=bool(row.get("是否损坏", False)),
                        damage_description=str(row.get("损坏描述", "")),
                        status=RecordStatus.SUBMITTED,
                        created_by=current_user.id
                    )
                elif import_type == "borrow":
                    record = BorrowRecord(
                        batch_id=batch_id,
                        borrow_no=str(row.get("借用单号", generate_no("BRW"))),
                        borrower_name=str(row.get("借用人", "")),
                        borrower_phone=str(row.get("联系电话", "")),
                        borrower_department=str(row.get("部门", "")),
                        material_code=str(row.get("物料编码", "")),
                        material_name=str(row.get("物料名称", "")),
                        quantity=int(row.get("数量", 0)),
                        borrow_date=pd.to_datetime(row.get("借用日期", datetime.now())).to_pydatetime(),
                        expected_return_date=pd.to_datetime(row.get("预计归还日期", None)).to_pydatetime() if pd.notna(row.get("预计归还日期")) else None,
                        status=RecordStatus.SUBMITTED,
                        created_by=current_user.id
                    )
                elif import_type == "scan":
                    record = ScanRecord(
                        batch_id=batch_id,
                        scan_no=str(row.get("扫码单号", generate_no("SCAN"))),
                        material_code=str(row.get("物料编码", "")),
                        material_name=str(row.get("物料名称", "")),
                        scan_type=str(row.get("扫码类型", "")),
                        scan_time=pd.to_datetime(row.get("扫码时间", datetime.now())).to_pydatetime(),
                        scanner=str(row.get("扫码人", "")),
                        location=str(row.get("地点", "")),
                        quantity=int(row.get("数量", 1)),
                        status=RecordStatus.SUBMITTED,
                        created_by=current_user.id
                    )
                
                db.add(record)
                success_count += 1
            except Exception as e:
                failed_count += 1
                failure = ImportFailure(
                    task_id=task.id,
                    row_number=row_num,
                    raw_data=row.to_dict(),
                    error_message=str(e)
                )
                db.add(failure)
        
        task.success_count = success_count
        task.failed_count = failed_count
        if failed_count == 0:
            task.status = ImportStatus.SUCCESS
        elif success_count == 0:
            task.status = ImportStatus.FAILED
        else:
            task.status = ImportStatus.PARTIAL
        task.completed_at = datetime.utcnow()
        
        db.commit()
        db.refresh(task)
        
        log_operation(
            db, f"IMPORT_{import_type.upper()}", f"import_{import_type}",
            created_by=current_user.id,
            new_value={"task_id": task.id, "success": success_count, "failed": failed_count},
            ip_address=request.client.host if request and request.client else None
        )
        
    except Exception as e:
        task.status = ImportStatus.FAILED
        task.completed_at = datetime.utcnow()
        db.commit()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
    
    return task


@router.get("")
async def list_import_tasks(
    batch_id: int = None,
    status: ImportStatus = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(ImportTask)
    if batch_id:
        query = query.filter(ImportTask.batch_id == batch_id)
    if status:
        query = query.filter(ImportTask.status == status)
    tasks = query.offset(skip).limit(limit).all()
    visible_fields = get_visible_fields_for_role(current_user.role, "import")
    return filter_response_data([object_to_dict(t) for t in tasks], visible_fields)


@router.get("/{task_id}/failures")
async def get_import_failures(
    task_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.REVIEWER, UserRole.SUPERVISOR))
):
    failures = db.query(ImportFailure).filter(ImportFailure.task_id == task_id).offset(skip).limit(limit).all()
    return [object_to_dict(f) for f in failures]
