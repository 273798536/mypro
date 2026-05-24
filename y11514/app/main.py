from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Response
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta, datetime
import json
import io
import pandas as pd

from app.database import engine, Base, get_db
from app.models import (
    User, UserRole, WorkflowStatus, RecordStatus,
    BorrowApplication, ExpressOrder, CompensationRecord, RefundRecord
)
from app.schemas import (
    UserCreate, UserResponse, Token,
    BorrowApplicationCreate, BorrowApplicationUpdate, BorrowApplicationResponse, BorrowApplicationDetailResponse,
    ExpressOrderCreate, ExpressOrderUpdate, ExpressOrderResponse,
    CompensationRecordCreate, CompensationRecordUpdate, CompensationRecordResponse,
    RefundRecordCreate, RefundRecordUpdate, RefundRecordResponse,
    CostCalculationRequest, CostCalculationResponse,
    StatisticsResponse, RoleViewResponse, AuditLogResponse
)
from app.auth import (
    create_access_token, authenticate_user, get_current_user,
    get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES,
    allow_data_entry, allow_reviewer, allow_supervisor, allow_all_authenticated,
    mask_sensitive_data
)
from app.services import (
    create_borrow_application, update_borrow_application,
    transition_workflow_status, calculate_cost_trace,
    get_statistics, get_role_view, check_duplicate,
    log_audit
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="图书馆馆际借阅权限追责台账 API",
    description="管理借阅申请、快递单、读者赔偿记录和退款流水的台账系统",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def init_default_users(db: Session):
    if not db.query(User).filter(User.username == "admin").first():
        admin = User(
            username="admin",
            full_name="系统管理员",
            role=UserRole.SUPERVISOR,
            hashed_password=get_password_hash("admin123")
        )
        db.add(admin)
    
    roles = [
        ("entry_user", "录入员张三", UserRole.DATA_ENTRY),
        ("review_user", "复核员李四", UserRole.REVIEWER),
        ("readonly_user", "只读用户王五", UserRole.READ_ONLY)
    ]
    
    for username, full_name, role in roles:
        if not db.query(User).filter(User.username == username).first():
            user = User(
                username=username,
                full_name=full_name,
                role=role,
                hashed_password=get_password_hash("123456")
            )
            db.add(user)
    
    db.commit()


@app.on_event("startup")
def startup_event():
    db = next(get_db())
    init_default_users(db)
    db.close()


@app.post("/token", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@app.post("/users/", response_model=UserResponse)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_supervisor)
):
    from app.auth import get_user
    db_user = get_user(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="用户名已存在")
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    log_audit(db, current_user, "创建用户", "users", db_user.id)
    db.commit()
    return db_user


@app.get("/users/me/", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.post("/borrow-applications/", response_model=BorrowApplicationResponse)
def create_borrow_app(
    app: BorrowApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_data_entry)
):
    if check_duplicate(db, "borrow_application", app.application_no):
        raise HTTPException(status_code=400, detail="申请编号已存在")
    db_app = create_borrow_application(db, app, current_user)
    db.commit()
    db.refresh(db_app)
    return db_app


@app.get("/borrow-applications/", response_model=List[BorrowApplicationResponse])
def read_borrow_apps(
    skip: int = 0,
    limit: int = 100,
    status: Optional[WorkflowStatus] = None,
    record_status: Optional[RecordStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_all_authenticated)
):
    query = db.query(BorrowApplication)
    if status:
        query = query.filter(BorrowApplication.status == status)
    if record_status:
        query = query.filter(BorrowApplication.record_status == record_status)
    
    apps = query.order_by(BorrowApplication.created_at.desc()).offset(skip).limit(limit).all()
    
    if current_user.role != UserRole.SUPERVISOR:
        result = []
        for app in apps:
            app_dict = app.__dict__.copy()
            masked = mask_sensitive_data(app_dict, current_user.role)
            result.append(BorrowApplicationResponse(**masked))
        return result
    
    return apps


@app.get("/borrow-applications/{app_id}", response_model=BorrowApplicationDetailResponse)
def read_borrow_app(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_all_authenticated)
):
    db_app = db.query(BorrowApplication).filter(BorrowApplication.id == app_id).first()
    if db_app is None:
        raise HTTPException(status_code=404, detail="借阅申请不存在")
    return db_app


@app.put("/borrow-applications/{app_id}", response_model=BorrowApplicationResponse)
def update_borrow_app(
    app_id: int,
    update: BorrowApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_data_entry)
):
    db_app = update_borrow_application(db, app_id, update, current_user)
    if db_app is None:
        raise HTTPException(status_code=404, detail="借阅申请不存在")
    db.commit()
    db.refresh(db_app)
    return db_app


@app.post("/borrow-applications/{app_id}/submit")
def submit_borrow_app(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_data_entry)
):
    success = transition_workflow_status(
        db, "borrow_application", app_id, WorkflowStatus.SUBMITTED, current_user
    )
    if not success:
        raise HTTPException(status_code=404, detail="借阅申请不存在")
    db.commit()
    return {"message": "提交成功", "status": WorkflowStatus.SUBMITTED}


@app.post("/borrow-applications/{app_id}/reject")
def reject_borrow_app(
    app_id: int,
    reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_reviewer)
):
    success = transition_workflow_status(
        db, "borrow_application", app_id, WorkflowStatus.REJECTED, current_user, reason
    )
    if not success:
        raise HTTPException(status_code=404, detail="借阅申请不存在")
    db.commit()
    return {"message": "已驳回", "status": WorkflowStatus.REJECTED, "reason": reason}


@app.post("/borrow-applications/{app_id}/second-confirm")
def second_confirm_borrow_app(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_supervisor)
):
    success = transition_workflow_status(
        db, "borrow_application", app_id, WorkflowStatus.SECOND_CONFIRM, current_user
    )
    if not success:
        raise HTTPException(status_code=404, detail="借阅申请不存在")
    db.commit()
    return {"message": "二次确认完成", "status": WorkflowStatus.SECOND_CONFIRM}


@app.post("/borrow-applications/{app_id}/finalize")
def finalize_borrow_app(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_supervisor)
):
    success = transition_workflow_status(
        db, "borrow_application", app_id, WorkflowStatus.FINALIZED, current_user
    )
    if not success:
        raise HTTPException(status_code=404, detail="借阅申请不存在")
    db.commit()
    return {"message": "已完成归档", "status": WorkflowStatus.FINALIZED}


@app.post("/express-orders/", response_model=ExpressOrderResponse)
def create_express_order(
    order: ExpressOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_data_entry)
):
    if check_duplicate(db, "express_order", order.order_no):
        raise HTTPException(status_code=400, detail="快递单号已存在")
    db_order = ExpressOrder(
        **order.model_dump(),
        created_by=current_user.id,
        raw_original_data=json.dumps(order.model_dump(), ensure_ascii=False, default=str)
    )
    db.add(db_order)
    db.flush()
    log_audit(db, current_user, "创建快递单", "express_orders", db_order.id)
    db.commit()
    db.refresh(db_order)
    return db_order


@app.get("/express-orders/", response_model=List[ExpressOrderResponse])
def read_express_orders(
    skip: int = 0,
    limit: int = 100,
    borrow_application_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_all_authenticated)
):
    query = db.query(ExpressOrder)
    if borrow_application_id:
        query = query.filter(ExpressOrder.borrow_application_id == borrow_application_id)
    return query.order_by(ExpressOrder.created_at.desc()).offset(skip).limit(limit).all()


@app.post("/compensation-records/", response_model=CompensationRecordResponse)
def create_compensation_record(
    record: CompensationRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_data_entry)
):
    if check_duplicate(db, "compensation_record", record.record_no):
        raise HTTPException(status_code=400, detail="赔偿记录编号已存在")
    db_record = CompensationRecord(
        **record.model_dump(),
        created_by=current_user.id,
        raw_original_data=json.dumps(record.model_dump(), ensure_ascii=False, default=str)
    )
    db.add(db_record)
    db.flush()
    log_audit(db, current_user, "创建赔偿记录", "compensation_records", db_record.id)
    db.commit()
    db.refresh(db_record)
    return db_record


@app.get("/compensation-records/", response_model=List[CompensationRecordResponse])
def read_compensation_records(
    skip: int = 0,
    limit: int = 100,
    borrow_application_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_all_authenticated)
):
    query = db.query(CompensationRecord)
    if borrow_application_id:
        query = query.filter(CompensationRecord.borrow_application_id == borrow_application_id)
    return query.order_by(CompensationRecord.created_at.desc()).offset(skip).limit(limit).all()


@app.post("/refund-records/", response_model=RefundRecordResponse)
def create_refund_record(
    record: RefundRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_data_entry)
):
    if check_duplicate(db, "refund_record", record.refund_no):
        raise HTTPException(status_code=400, detail="退款记录编号已存在")
    db_record = RefundRecord(
        **record.model_dump(),
        created_by=current_user.id,
        raw_original_data=json.dumps(record.model_dump(), ensure_ascii=False, default=str)
    )
    db.add(db_record)
    db.flush()
    log_audit(db, current_user, "创建退款记录", "refund_records", db_record.id)
    db.commit()
    db.refresh(db_record)
    return db_record


@app.get("/refund-records/", response_model=List[RefundRecordResponse])
def read_refund_records(
    skip: int = 0,
    limit: int = 100,
    borrow_application_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_all_authenticated)
):
    query = db.query(RefundRecord)
    if borrow_application_id:
        query = query.filter(RefundRecord.borrow_application_id == borrow_application_id)
    return query.order_by(RefundRecord.created_at.desc()).offset(skip).limit(limit).all()


@app.post("/calculate-cost", response_model=CostCalculationResponse)
def calculate_cost(
    request: CostCalculationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_all_authenticated)
):
    app = db.query(BorrowApplication).filter(
        BorrowApplication.application_no == request.application_no
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="借阅申请不存在")
    
    breakdown, trace = calculate_cost_trace(db, request.application_no)
    
    return {
        "application_no": request.application_no,
        "reader_name": app.reader_name,
        "book_title": app.book_title,
        "cost_breakdown": breakdown,
        "calculation_trace": trace
    }


@app.get("/statistics", response_model=StatisticsResponse)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_all_authenticated)
):
    return get_statistics(db)


@app.get("/role-view", response_model=RoleViewResponse)
def get_role_view_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_all_authenticated)
):
    return get_role_view(db, current_user)


@app.get("/audit-logs/", response_model=List[AuditLogResponse])
def read_audit_logs(
    skip: int = 0,
    limit: int = 100,
    table_name: Optional[str] = None,
    record_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_reviewer)
):
    from app.models import AuditLog
    query = db.query(AuditLog)
    if table_name:
        query = query.filter(AuditLog.table_name == table_name)
    if record_id:
        query = query.filter(AuditLog.record_id == record_id)
    return query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()


@app.post("/import/{record_type}")
def import_records(
    record_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_data_entry)
):
    import uuid
    batch_no = f"IMP{datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:6].upper()}"
    
    content = file.file.read()
    df = pd.read_excel(io.BytesIO(content)) if file.filename.endswith('.xlsx') else pd.read_csv(io.BytesIO(content))
    
    total_count = len(df)
    success_count = 0
    error_count = 0
    duplicate_count = 0
    errors = []
    
    for idx, row in df.iterrows():
        try:
            if record_type == "borrow_application":
                if check_duplicate(db, "borrow_application", str(row.get("application_no", ""))):
                    duplicate_count += 1
                    continue
                app = BorrowApplicationCreate(
                    application_no=str(row.get("application_no", f"TEMP{idx}")),
                    reader_name=str(row.get("reader_name", "")),
                    reader_id=str(row.get("reader_id", "")),
                    book_title=str(row.get("book_title", "")),
                    lending_library=str(row.get("lending_library", "")),
                    borrowing_library=str(row.get("borrowing_library", ""))
                )
                create_borrow_application(db, app, current_user, raw_data=row.to_json())
                success_count += 1
        except Exception as e:
            error_count += 1
            errors.append(f"行{idx+2}: {str(e)}")
    
    from app.models import ImportRecord
    import_record = ImportRecord(
        import_batch_no=batch_no,
        file_name=file.filename,
        record_type=record_type,
        total_count=total_count,
        success_count=success_count,
        error_count=error_count,
        duplicate_count=duplicate_count,
        created_by=current_user.id,
        error_details="\n".join(errors) if errors else None
    )
    db.add(import_record)
    db.commit()
    
    return {
        "batch_no": batch_no,
        "total": total_count,
        "success": success_count,
        "errors": error_count,
        "duplicates": duplicate_count
    }


@app.get("/export/{record_type}")
def export_records(
    record_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_all_authenticated)
):
    model_map = {
        "borrow_applications": BorrowApplication,
        "express_orders": ExpressOrder,
        "compensation_records": CompensationRecord,
        "refund_records": RefundRecord
    }
    
    model = model_map.get(record_type)
    if not model:
        raise HTTPException(status_code=400, detail="无效的记录类型")
    
    records = db.query(model).all()
    
    data = []
    for record in records:
        record_dict = {c.name: getattr(record, c.name) for c in record.__table__.columns}
        
        if current_user.role != UserRole.SUPERVISOR:
            record_dict = mask_sensitive_data(record_dict, current_user.role)
        
        if "raw_original_data" in record_dict:
            del record_dict["raw_original_data"]
        if "hashed_password" in record_dict:
            del record_dict["hashed_password"]
        
        data.append(record_dict)
    
    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name=record_type)
    
    output.seek(0)
    
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={record_type}_export_{datetime.now().strftime('%Y%m%d')}.xlsx"}
    )


@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}
