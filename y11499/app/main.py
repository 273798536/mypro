from datetime import timedelta
from typing import List, Optional
from fastapi import Depends, FastAPI, HTTPException, status, UploadFile, File, Query, Request, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
import os
import io
import pandas as pd
import threading
import time
import random
import traceback
from datetime import datetime

from .database import get_db, engine, Base, settings
from . import models, schemas, auth, services, pdf_parser

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="财务报销稽核权限追责台账 API",
    description="处理发票PDF、差旅申请、付款流水的报销稽核系统，支持批次处理、状态流转、审计追踪",
    version="1.0.0"
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

TASK_WORKER_RUNNING = False
TASK_WORKER_THREAD = None


def process_batch_import_task(db: Session, task: models.AsyncTask):
    payload = task.payload or {}
    batch_data_dict = payload.get("batch_data", {})
    creator_id = payload.get("creator_id")
    simulate_failure = payload.get("simulate_failure", False)
    failure_point = payload.get("failure_point", 0)
    
    batch = None
    created_count = 0
    updated_count = 0
    ignored_count = 0
    failed_count = 0
    failed_items = []
    
    try:
        services.update_task_status(db, task.task_id, models.TaskStatus.PROCESSING)
        
        if simulate_failure and failure_point <= 0:
            if task.retry_count < task.max_retries:
                raise Exception("模拟处理失败，等待重试")
            else:
                raise Exception("模拟永久失败，已达最大重试次数")
        
        batch = models.Batch(
            batch_number=services.generate_batch_number(),
            name=batch_data_dict.get("batch_name", ""),
            description=batch_data_dict.get("batch_description", ""),
            strategy=batch_data_dict.get("strategy", "append"),
            creator_id=creator_id,
            status="processing",
            total_items=len(batch_data_dict.get("reimbursements", []))
        )
        db.add(batch)
        db.commit()
        db.refresh(batch)
        
        for idx, reimb_dict in enumerate(batch_data_dict.get("reimbursements", [])):
            if simulate_failure and idx >= failure_point:
                if task.retry_count < task.max_retries:
                    db.rollback()
                    raise Exception(f"模拟在第 {idx} 项失败，等待重试")
            
            try:
                reimbursement_data = schemas.ReimbursementCreate(**reimb_dict)
                
                if reimbursement_data.idempotency_key:
                    idempotency_key = reimbursement_data.idempotency_key
                else:
                    key_data = {
                        "purpose": reimbursement_data.purpose,
                        "total_amount": reimbursement_data.total_amount,
                        "travelers": reimbursement_data.traveler_names,
                        "invoices": [inv.dict() for inv in (reimbursement_data.invoices or [])]
                    }
                    idempotency_key = services.generate_idempotency_key(key_data)
                
                existing, is_new = services.get_or_create_reimbursement_by_key(
                    db, idempotency_key, reimbursement_data, creator_id, batch.id
                )
                
                if is_new:
                    created_count += 1
                    services._populate_reimbursement_details(db, existing, reimbursement_data, creator_id)
                else:
                    strategy = batch_data_dict.get("strategy", "append")
                    if strategy == "ignore":
                        ignored_count += 1
                    elif strategy == "overwrite":
                        updated_count += 1
                        services._update_reimbursement_details(db, existing, reimbursement_data, creator_id)
                    elif strategy == "append":
                        updated_count += 1
                        services._append_reimbursement_details(db, existing, reimbursement_data, creator_id)
                
                batch.processed_items = created_count + updated_count + ignored_count
                
            except Exception as e:
                failed_count += 1
                failed_items.append({
                    "index": idx,
                    "error": str(e),
                    "reimbursement_no": reimb_dict.get("reimbursement_no", "")
                })
        
        batch.failed_items = failed_count
        batch.status = "completed"
        batch.completed_at = datetime.now()
        db.commit()
        
        result = {
            "batch_id": batch.id,
            "batch_number": batch.batch_number,
            "total_items": len(batch_data_dict.get("reimbursements", [])),
            "created_count": created_count,
            "updated_count": updated_count,
            "ignored_count": ignored_count,
            "failed_count": failed_count,
            "failed_items": failed_items
        }
        
        services.update_task_status(
            db, task.task_id, models.TaskStatus.COMPLETED,
            result=result
        )
        
    except Exception as e:
        error_msg = str(e)
        error_stack = traceback.format_exc()
        
        if batch:
            try:
                batch.status = "failed"
                db.commit()
            except:
                db.rollback()
        
        if "重试" in error_msg and task.retry_count < task.max_retries:
            services.update_task_status(
                db, task.task_id, models.TaskStatus.WAIT_RETRY,
                error_message=error_msg,
                error_stack=error_stack
            )
        elif "永久失败" in error_msg or task.retry_count >= task.max_retries:
            services.update_task_status(
                db, task.task_id, models.TaskStatus.PERMANENT_FAILED,
                error_message=error_msg,
                error_stack=error_stack
            )
        else:
            services.update_task_status(
                db, task.task_id, models.TaskStatus.WAIT_MANUAL,
                error_message=error_msg,
                error_stack=error_stack
            )


def task_worker():
    global TASK_WORKER_RUNNING
    
    while TASK_WORKER_RUNNING:
        db = None
        try:
            db = next(get_db())
            
            pending_task = db.query(models.AsyncTask).filter(
                models.AsyncTask.status == models.TaskStatus.PENDING
            ).first()
            
            if pending_task:
                process_batch_import_task(db, pending_task)
                db.commit()
            
            retry_tasks = db.query(models.AsyncTask).filter(
                models.AsyncTask.status == models.TaskStatus.WAIT_RETRY,
                models.AsyncTask.next_retry_at <= datetime.now()
            ).all()
            
            for task in retry_tasks:
                process_batch_import_task(db, task)
                db.commit()
            
            time.sleep(1)
            
        except Exception as e:
            print(f"Task worker error: {e}")
            time.sleep(5)
        finally:
            if db:
                try:
                    db.close()
                except:
                    pass


def resume_pending_tasks():
    db = next(get_db())
    try:
        processing_tasks = db.query(models.AsyncTask).filter(
            models.AsyncTask.status == models.TaskStatus.PROCESSING
        ).all()
        
        for task in processing_tasks:
            task.status = models.TaskStatus.WAIT_RETRY
            task.next_retry_at = datetime.now()
            db.commit()
        
        count = len(processing_tasks)
        if count > 0:
            print(f"恢复了 {count} 个未完成的任务，状态设为等待重试")
    finally:
        db.close()


@app.on_event("startup")
def startup_event():
    global TASK_WORKER_RUNNING, TASK_WORKER_THREAD
    
    resume_pending_tasks()
    
    TASK_WORKER_RUNNING = True
    TASK_WORKER_THREAD = threading.Thread(target=task_worker, daemon=True)
    TASK_WORKER_THREAD.start()
    print("异步任务处理器已启动")
    db = next(get_db())
    admin = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin:
        hashed_password = auth.get_password_hash("admin123")
        admin_user = models.User(
            username="admin",
            full_name="系统管理员",
            email="admin@company.com",
            hashed_password=hashed_password,
            role=models.UserRole.ADMIN,
            department="信息技术部"
        )
        db.add(admin_user)
        
        finance_user = models.User(
            username="finance",
            full_name="财务经理",
            email="finance@company.com",
            hashed_password=auth.get_password_hash("finance123"),
            role=models.UserRole.FINANCE,
            department="财务部"
        )
        db.add(finance_user)
        
        employee_user = models.User(
            username="employee",
            full_name="普通员工",
            email="employee@company.com",
            hashed_password=auth.get_password_hash("employee123"),
            role=models.UserRole.EMPLOYEE,
            department="销售部"
        )
        db.add(employee_user)
        
        db.commit()


@app.post("/token", response_model=schemas.Token, tags=["认证"])
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/users/me", response_model=schemas.UserResponse, tags=["用户"])
async def read_users_me(
    current_user: models.User = Depends(auth.get_current_active_user)
):
    return current_user


@app.post("/users", response_model=schemas.UserResponse, tags=["用户"])
def create_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.UserRole.ADMIN]))
):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="用户名已存在")
    
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        full_name=user.full_name,
        email=user.email,
        hashed_password=hashed_password,
        role=user.role,
        department=user.department
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/reimbursements", response_model=schemas.ReimbursementResponse, tags=["报销单"])
def create_reimbursement(
    reimbursement: schemas.ReimbursementCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if reimbursement.idempotency_key:
        idempotency_key = reimbursement.idempotency_key
    else:
        key_data = {
            "purpose": reimbursement.purpose,
            "total_amount": reimbursement.total_amount,
            "user_id": current_user.id,
            "timestamp": datetime.now().isoformat()
        }
        idempotency_key = services.generate_idempotency_key(key_data)
    
    existing = db.query(models.Reimbursement).filter(
        models.Reimbursement.idempotency_key == idempotency_key
    ).first()
    
    if existing:
        return existing
    
    reimb = models.Reimbursement(
        reimbursement_no=reimbursement.reimbursement_no or services.generate_reimbursement_no(),
        creator_id=current_user.id,
        applicant_id=reimbursement.applicant_id or current_user.id,
        department=reimbursement.department or current_user.department,
        purpose=reimbursement.purpose,
        total_amount=reimbursement.total_amount,
        status=models.ReimbursementStatus.DRAFT,
        travel_start_date=reimbursement.travel_start_date,
        travel_end_date=reimbursement.travel_end_date,
        travel_destination=reimbursement.travel_destination,
        traveler_names=reimbursement.traveler_names,
        idempotency_key=idempotency_key
    )
    db.add(reimb)
    db.commit()
    db.refresh(reimb)
    
    services._populate_reimbursement_details(db, reimb, reimbursement, current_user.id)
    
    services.log_audit(
        db, reimb.id, current_user.id,
        action="create",
        change_reason="新建报销单",
        ip_address=request.client.host if request.client else None
    )
    
    db.refresh(reimb)
    return reimb


@app.get("/reimbursements", response_model=schemas.ReimbursementListResponse, tags=["报销单"])
def list_reimbursements(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[schemas.ReimbursementStatus] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    query = db.query(models.Reimbursement)
    
    if current_user.role not in [models.UserRole.FINANCE, models.UserRole.ADMIN, models.UserRole.AUDITOR]:
        query = query.filter(models.Reimbursement.creator_id == current_user.id)
    
    if status:
        query = query.filter(models.Reimbursement.status == status)
    if department:
        query = query.filter(models.Reimbursement.department == department)
    
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return schemas.ReimbursementListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )


@app.get("/reimbursements/{reimbursement_id}", response_model=schemas.ReimbursementResponse, tags=["报销单"])
def get_reimbursement(
    reimbursement_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    reimb = db.query(models.Reimbursement).filter(models.Reimbursement.id == reimbursement_id).first()
    if not reimb:
        raise HTTPException(status_code=404, detail="报销单不存在")
    
    if current_user.role not in [models.UserRole.FINANCE, models.UserRole.ADMIN, models.UserRole.AUDITOR]:
        if reimb.creator_id != current_user.id:
            raise HTTPException(status_code=403, detail="无权访问此报销单")
    
    return reimb


@app.put("/reimbursements/{reimbursement_id}", response_model=schemas.ReimbursementResponse, tags=["报销单"])
def update_reimbursement(
    reimbursement_id: int,
    update_data: schemas.ReimbursementUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    reimb = db.query(models.Reimbursement).filter(models.Reimbursement.id == reimbursement_id).first()
    if not reimb:
        raise HTTPException(status_code=404, detail="报销单不存在")
    
    if reimb.status != models.ReimbursementStatus.DRAFT:
        raise HTTPException(status_code=400, detail="只能编辑草稿状态的报销单")
    
    if reimb.creator_id != current_user.id and current_user.role not in [models.UserRole.FINANCE, models.UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="无权编辑此报销单")
    
    old_values = {}
    new_values = {}
    
    for field, value in update_data.dict(exclude_unset=True).items():
        old_val = getattr(reimb, field)
        if old_val != value:
            old_values[field] = str(old_val)
            new_values[field] = str(value)
            setattr(reimb, field, value)
    
    db.commit()
    db.refresh(reimb)
    
    if old_values:
        services.log_audit(
            db, reimb.id, current_user.id,
            action="update",
            old_values=old_values,
            new_values=new_values,
            change_reason="编辑报销单",
            ip_address=request.client.host if request.client else None
        )
    
    return reimb


@app.post("/reimbursements/{reimbursement_id}/status", response_model=schemas.ReimbursementResponse, tags=["报销单"])
def change_status(
    reimbursement_id: int,
    status_change: schemas.StatusChangeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    try:
        reimb = services.change_reimbursement_status(
            db, reimbursement_id, status_change.status,
            current_user.id, current_user.role,
            status_change.reason, status_change.change_reason
        )
        return reimb
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@app.get("/reimbursements/{reimbursement_id}/audit-logs", response_model=List[schemas.AuditLogResponse], tags=["审计"])
def get_audit_logs(
    reimbursement_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.UserRole.FINANCE, models.UserRole.AUDITOR, models.UserRole.ADMIN]))
):
    logs = db.query(models.AuditLog).filter(
        models.AuditLog.reimbursement_id == reimbursement_id
    ).order_by(models.AuditLog.created_at.desc()).all()
    
    result = []
    for log in logs:
        log_dict = schemas.AuditLogResponse.from_orm(log).dict()
        log_dict["actor_name"] = log.actor.full_name if log.actor else None
        result.append(log_dict)
    
    return result


class AsyncBatchImportRequest(schemas.BatchImportRequest):
    simulate_failure: bool = False
    failure_point: int = 0


@app.post("/batches/import", response_model=schemas.BatchImportResponse, tags=["批次处理"])
def batch_import(
    batch_data: schemas.BatchImportRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.UserRole.FINANCE, models.UserRole.ADMIN]))
):
    return services.process_batch_import(db, batch_data, current_user.id)


@app.post("/batches/import-async", response_model=schemas.AsyncTaskResponse, tags=["批次处理"])
def batch_import_async(
    batch_data: AsyncBatchImportRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.UserRole.FINANCE, models.UserRole.ADMIN]))
):
    task = services.create_async_task(
        db,
        task_type="batch_import",
        payload={
            "batch_data": batch_data.dict(),
            "creator_id": current_user.id,
            "simulate_failure": batch_data.simulate_failure,
            "failure_point": batch_data.failure_point
        },
        max_retries=3
    )
    return task


@app.get("/batches", response_model=List[schemas.BatchResponse], tags=["批次处理"])
def list_batches(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    query = db.query(models.Batch)
    if current_user.role not in [models.UserRole.FINANCE, models.UserRole.ADMIN, models.UserRole.AUDITOR]:
        query = query.filter(models.Batch.creator_id == current_user.id)
    return query.order_by(models.Batch.created_at.desc()).all()


@app.post("/upload/invoice", tags=["文件上传"])
async def upload_invoice(
    file: UploadFile = File(...),
    reimbursement_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="只支持PDF文件")
    
    content = await file.read()
    file_path = os.path.join(UPLOAD_DIR, f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}")
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    parsed_data = pdf_parser.parse_invoice_pdf(content)
    pdf_hash = pdf_parser.get_pdf_hash(content)
    
    evidence = models.Evidence(
        reimbursement_id=reimbursement_id,
        evidence_type=models.EvidenceType.INVOICE_PDF,
        file_name=file.filename,
        file_path=file_path,
        file_hash=pdf_hash,
        file_size=len(content),
        parsed_content=parsed_data,
        ocr_text=parsed_data.get("raw_text", "")
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    
    if parsed_data.get("invoice_number") and reimbursement_id:
        invoice_data = schemas.InvoiceCreate(
            invoice_number=parsed_data["invoice_number"],
            invoice_code=parsed_data.get("invoice_code", ""),
            invoice_date=datetime.fromisoformat(parsed_data["invoice_date"]) if parsed_data.get("invoice_date") else None,
            seller_name=parsed_data.get("seller_name", ""),
            seller_tax_no=parsed_data.get("seller_tax_no", ""),
            buyer_name=parsed_data.get("buyer_name", ""),
            buyer_tax_no=parsed_data.get("buyer_tax_no", ""),
            total_amount=parsed_data.get("total_amount", 0),
            tax_amount=parsed_data.get("tax_amount", 0),
            amount_with_tax=parsed_data.get("amount_with_tax", 0),
            category=parsed_data.get("category", ""),
            expense_type=parsed_data.get("expense_type", ""),
            parsed_data=parsed_data
        )
        
        duplicate_of = services.detect_duplicate_invoice(db, invoice_data)
        invoice = models.Invoice(
            reimbursement_id=reimbursement_id,
            **invoice_data.dict(exclude={"parsed_data"}),
            pdf_hash=pdf_hash,
            is_duplicate=duplicate_of is not None,
            duplicate_of=duplicate_of.id if duplicate_of else None,
            parsed_data=parsed_data
        )
        db.add(invoice)
        db.commit()
    
    return {
        "evidence_id": evidence.id,
        "file_name": file.filename,
        "pdf_hash": pdf_hash,
        "parsed_data": parsed_data,
        "is_duplicate": parsed_data.get("invoice_number") and bool(
            db.query(models.Invoice).filter(
                models.Invoice.invoice_number == parsed_data["invoice_number"],
                models.Invoice.is_duplicate == False
            ).first()
        )
    }


@app.get("/finance/dashboard", response_model=schemas.FinanceDashboardResponse, tags=["财务报表"])
def finance_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.UserRole.FINANCE, models.UserRole.ADMIN]))
):
    return services.get_finance_dashboard_data(db)


@app.post("/export", tags=["导出"])
def export_data(
    export_request: schemas.ExportRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.UserRole.FINANCE, models.UserRole.AUDITOR, models.UserRole.ADMIN]))
):
    query = db.query(models.Reimbursement)
    
    if export_request.status_filter:
        query = query.filter(models.Reimbursement.status.in_(export_request.status_filter))
    if export_request.date_from:
        query = query.filter(models.Reimbursement.created_at >= export_request.date_from)
    if export_request.date_to:
        query = query.filter(models.Reimbursement.created_at <= export_request.date_to)
    if export_request.department_filter:
        query = query.filter(models.Reimbursement.department.in_(export_request.department_filter))
    
    reimbursements = query.all()
    data = []
    
    for r in reimbursements:
        row = {
            "报销单号": r.reimbursement_no,
            "部门": r.department,
            "用途": r.purpose,
            "总金额": r.total_amount,
            "状态": r.status.value,
            "出差地点": r.travel_destination,
            "同行人员": ",".join(r.traveler_names) if r.traveler_names else "",
            "创建时间": r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "提交时间": r.submitted_at.strftime("%Y-%m-%d %H:%M:%S") if r.submitted_at else "",
            "发票数量": len(r.invoices),
            "重复发票数量": sum(1 for inv in r.invoices if inv.is_duplicate),
        }
        
        if not export_request.include_sensitive:
            row = services.mask_sensitive_fields(row, current_user.role.value)
        
        data.append(row)
    
    df = pd.DataFrame(data)
    output_path = os.path.join(UPLOAD_DIR, f"export_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx")
    df.to_excel(output_path, index=False)
    
    return FileResponse(
        output_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=f"报销数据导出_{datetime.now().strftime('%Y%m%d')}.xlsx"
    )


@app.get("/tasks/{task_id}", response_model=schemas.AsyncTaskResponse, tags=["异步任务"])
def get_task_status(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    task = db.query(models.AsyncTask).filter(models.AsyncTask.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@app.post("/tasks/{task_id}/retry", response_model=schemas.AsyncTaskResponse, tags=["异步任务"])
def retry_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.UserRole.FINANCE, models.UserRole.ADMIN]))
):
    task = db.query(models.AsyncTask).filter(models.AsyncTask.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    if task.status not in [models.TaskStatus.WAIT_RETRY, models.TaskStatus.WAIT_MANUAL, models.TaskStatus.PERMANENT_FAILED]:
        raise HTTPException(status_code=400, detail="此任务状态不支持重试")
    
    task.status = models.TaskStatus.PENDING
    task.retry_count = 0
    task.error_message = None
    task.error_stack = None
    task.next_retry_at = None
    db.commit()
    db.refresh(task)
    
    return task


@app.get("/tasks", response_model=List[schemas.AsyncTaskResponse], tags=["异步任务"])
def list_tasks(
    status: Optional[schemas.TaskStatus] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.UserRole.FINANCE, models.UserRole.ADMIN]))
):
    query = db.query(models.AsyncTask)
    if status:
        query = query.filter(models.AsyncTask.status == status)
    return query.order_by(models.AsyncTask.created_at.desc()).all()


@app.get("/batches/{batch_id}", response_model=schemas.BatchDetailResponse, tags=["批次处理"])
def get_batch_detail(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="批次不存在")
    
    if current_user.role not in [models.UserRole.FINANCE, models.UserRole.ADMIN, models.UserRole.AUDITOR]:
        if batch.creator_id != current_user.id:
            raise HTTPException(status_code=403, detail="无权访问此批次")
    
    return batch


@app.get("/invoices", response_model=List[schemas.InvoiceResponse], tags=["发票管理"])
def list_invoices(
    duplicate_of: Optional[int] = None,
    is_duplicate: Optional[bool] = None,
    reimbursement_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    query = db.query(models.Invoice)
    
    if duplicate_of is not None:
        query = query.filter(models.Invoice.duplicate_of == duplicate_of)
    if is_duplicate is not None:
        query = query.filter(models.Invoice.is_duplicate == is_duplicate)
    if reimbursement_id is not None:
        query = query.filter(models.Invoice.reimbursement_id == reimbursement_id)
    
    if current_user.role not in [models.UserRole.FINANCE, models.UserRole.ADMIN, models.UserRole.AUDITOR]:
        query = query.join(models.Reimbursement).filter(
            models.Reimbursement.creator_id == current_user.id
        )
    
    return query.offset((page - 1) * page_size).limit(page_size).all()


@app.get("/invoices/{invoice_id}", response_model=schemas.InvoiceResponse, tags=["发票管理"])
def get_invoice(
    invoice_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="发票不存在")
    
    if current_user.role not in [models.UserRole.FINANCE, models.UserRole.ADMIN, models.UserRole.AUDITOR]:
        reimb = db.query(models.Reimbursement).filter(
            models.Reimbursement.id == invoice.reimbursement_id
        ).first()
        if not reimb or reimb.creator_id != current_user.id:
            raise HTTPException(status_code=403, detail="无权访问此发票")
    
    if invoice.seller_tax_no:
        services.log_sensitive_field_access(
            db, "seller_tax_no", "invoices", invoice_id,
            current_user.id, current_user.role.value,
            "read", current_user.role.value not in ["finance", "admin", "auditor"],
            request.client.host if request.client else None
        )
    if invoice.buyer_tax_no:
        services.log_sensitive_field_access(
            db, "buyer_tax_no", "invoices", invoice_id,
            current_user.id, current_user.role.value,
            "read", current_user.role.value not in ["finance", "admin", "auditor"],
            request.client.host if request.client else None
        )
    
    return invoice


@app.put("/invoices/{invoice_id}", response_model=schemas.InvoiceResponse, tags=["发票管理"])
def update_invoice(
    invoice_id: int,
    update_data: schemas.InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.UserRole.FINANCE, models.UserRole.ADMIN]))
):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="发票不存在")
    
    old_values = {}
    new_values = {}
    
    for field, value in update_data.dict(exclude_unset=True).items():
        old_val = getattr(invoice, field)
        if old_val != value:
            old_values[field] = str(old_val)
            new_values[field] = str(value)
            setattr(invoice, field, value)
    
    if update_data.is_duplicate == False:
        invoice.duplicate_of = None
        new_values["duplicate_of"] = None
    
    db.commit()
    db.refresh(invoice)
    
    if old_values:
        services.log_audit(
            db, invoice.reimbursement_id, current_user.id,
            action="update_invoice",
            old_values={"invoice_id": invoice_id, **old_values},
            new_values={"invoice_id": invoice_id, **new_values},
            change_reason="修正发票信息"
        )
    
    return invoice


@app.post("/reimbursements/{reimbursement_id}/invoices", response_model=schemas.InvoiceResponse, tags=["发票管理"])
def add_invoice_to_reimbursement(
    reimbursement_id: int,
    invoice_data: schemas.InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    reimb = db.query(models.Reimbursement).filter(
        models.Reimbursement.id == reimbursement_id
    ).first()
    if not reimb:
        raise HTTPException(status_code=404, detail="报销单不存在")
    
    if current_user.role not in [models.UserRole.FINANCE, models.UserRole.ADMIN]:
        if reimb.creator_id != current_user.id:
            raise HTTPException(status_code=403, detail="无权修改此报销单")
    
    if reimb.status not in [models.ReimbursementStatus.DRAFT, models.ReimbursementStatus.REJECTED]:
        raise HTTPException(status_code=400, detail="只能在草稿或驳回状态添加发票")
    
    duplicate_of = services.detect_duplicate_invoice(db, invoice_data)
    invoice = models.Invoice(
        reimbursement_id=reimbursement_id,
        **invoice_data.dict(),
        is_duplicate=duplicate_of is not None,
        duplicate_of=duplicate_of.id if duplicate_of else None
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    
    services.log_audit(
        db, reimbursement_id, current_user.id,
        action="add_invoice",
        new_values={"invoice_id": invoice.id, "invoice_number": invoice.invoice_number},
        change_reason="补充发票信息"
    )
    
    return invoice


@app.get("/evidences", response_model=List[schemas.EvidenceResponse], tags=["证据管理"])
def list_evidences(
    evidence_type: Optional[schemas.EvidenceType] = None,
    reimbursement_id: Optional[int] = None,
    batch_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    query = db.query(models.Evidence)
    
    if evidence_type:
        query = query.filter(models.Evidence.evidence_type == evidence_type)
    if reimbursement_id:
        query = query.filter(models.Evidence.reimbursement_id == reimbursement_id)
    if batch_id:
        query = query.filter(models.Evidence.batch_id == batch_id)
    
    if current_user.role not in [models.UserRole.FINANCE, models.UserRole.ADMIN, models.UserRole.AUDITOR]:
        query = query.outerjoin(models.Reimbursement).outerjoin(models.Batch).filter(
            (models.Reimbursement.creator_id == current_user.id) |
            (models.Batch.creator_id == current_user.id)
        )
    
    return query.offset((page - 1) * page_size).limit(page_size).all()


@app.get("/evidences/{evidence_id}", response_model=schemas.EvidenceResponse, tags=["证据管理"])
def get_evidence(
    evidence_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    evidence = db.query(models.Evidence).filter(models.Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="证据不存在")
    
    if current_user.role not in [models.UserRole.FINANCE, models.UserRole.ADMIN, models.UserRole.AUDITOR]:
        if evidence.reimbursement_id:
            reimb = db.query(models.Reimbursement).filter(
                models.Reimbursement.id == evidence.reimbursement_id
            ).first()
            if not reimb or reimb.creator_id != current_user.id:
                raise HTTPException(status_code=403, detail="无权访问此证据")
        elif evidence.batch_id:
            batch = db.query(models.Batch).filter(
                models.Batch.id == evidence.batch_id
            ).first()
            if not batch or batch.creator_id != current_user.id:
                raise HTTPException(status_code=403, detail="无权访问此证据")
    
    return evidence


@app.put("/evidences/{evidence_id}", response_model=schemas.EvidenceResponse, tags=["证据管理"])
def update_evidence(
    evidence_id: int,
    update_data: schemas.EvidenceUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role([models.UserRole.FINANCE, models.UserRole.ADMIN]))
):
    evidence = db.query(models.Evidence).filter(models.Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="证据不存在")
    
    old_values = {}
    new_values = {}
    
    for field, value in update_data.dict(exclude_unset=True).items():
        old_val = getattr(evidence, field)
        if old_val != value:
            old_values[field] = str(old_val)
            new_values[field] = str(value)
            setattr(evidence, field, value)
    
    db.commit()
    db.refresh(evidence)
    
    if old_values:
        services.log_audit(
            db, evidence.reimbursement_id, current_user.id,
            action="update_evidence",
            old_values={"evidence_id": evidence_id, **old_values},
            new_values={"evidence_id": evidence_id, **new_values},
            change_reason="修正证据解析结果"
        )
    
    return evidence


@app.get("/payment-flows", response_model=List[schemas.PaymentFlowResponse], tags=["付款流水"])
def list_payment_flows(
    is_duplicate: Optional[bool] = None,
    reimbursement_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    query = db.query(models.PaymentFlow)
    
    if is_duplicate is not None:
        query = query.filter(models.PaymentFlow.is_duplicate == is_duplicate)
    if reimbursement_id is not None:
        query = query.filter(models.PaymentFlow.reimbursement_id == reimbursement_id)
    
    if current_user.role not in [models.UserRole.FINANCE, models.UserRole.ADMIN, models.UserRole.AUDITOR]:
        query = query.join(models.Reimbursement).filter(
            models.Reimbursement.creator_id == current_user.id
        )
    
    payment_flows = query.offset((page - 1) * page_size).limit(page_size).all()
    
    for pf in payment_flows:
        if pf.bank_account:
            services.log_sensitive_field_access(
                db, "bank_account", "payment_flows", pf.id,
                current_user.id, current_user.role.value,
                "read", current_user.role.value not in ["finance", "admin"]
            )
    
    return payment_flows


@app.get("/payment-flows/{flow_id}", response_model=schemas.PaymentFlowResponse, tags=["付款流水"])
def get_payment_flow(
    flow_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    pf = db.query(models.PaymentFlow).filter(models.PaymentFlow.id == flow_id).first()
    if not pf:
        raise HTTPException(status_code=404, detail="付款流水不存在")
    
    if current_user.role not in [models.UserRole.FINANCE, models.UserRole.ADMIN, models.UserRole.AUDITOR]:
        reimb = db.query(models.Reimbursement).filter(
            models.Reimbursement.id == pf.reimbursement_id
        ).first()
        if not reimb or reimb.creator_id != current_user.id:
            raise HTTPException(status_code=403, detail="无权访问此付款流水")
    
    if pf.bank_account:
        services.log_sensitive_field_access(
            db, "bank_account", "payment_flows", flow_id,
            current_user.id, current_user.role.value,
            "read", current_user.role.value not in ["finance", "admin"],
            request.client.host if request.client else None
        )
    
    return pf


@app.get("/status-transitions", tags=["系统配置"])
def get_valid_status_transitions(
    current_user: models.User = Depends(auth.get_current_active_user)
):
    transitions = {}
    for from_status, to_statuses in services.VALID_TRANSITIONS.items():
        transitions[from_status.value] = [
            {
                "status": s.value,
                "allowed_roles": [r.value for r in services.STATUS_PERMISSIONS.get(s, [])],
                "can_transition": current_user.role in services.STATUS_PERMISSIONS.get(s, [])
            }
            for s in to_statuses
        ]
    return transitions
