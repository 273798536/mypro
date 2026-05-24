from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy import func, or_, and_
from sqlalchemy.orm import Session
from pydantic import BaseModel
import json
import os
import pandas as pd
from io import BytesIO

from database import (
    get_db, init_db, StoreOrder, DriverTrack, ReceiptIOU,
    RetryQueue, ReceiptSubmission, CompensationRecord, AuditLog, FailedRecord, User
)
from auth import (
    authenticate_user, create_access_token, get_current_user,
    require_permission, filter_fields_by_role, init_users,
    ACCESS_TOKEN_EXPIRE_MINUTES, Token, UserResponse
)

app = FastAPI(title="农资门店配送重试补偿队列API")


class OrderCreate(BaseModel):
    order_no: str
    store_name: str
    region: str
    product_name: str
    quantity: float
    unit: str
    amount: float
    driver_name: str
    vehicle_no: str
    order_date: str
    is_supplementary: bool = False
    data_source: str = "original"


class ReceiptSubmit(BaseModel):
    receipt_no: str
    order_no: str
    store_name: str
    signatory: str
    sign_time: str
    actual_quantity: float
    actual_amount: float
    is_iou: bool = False
    iou_amount: float = 0
    remark: str = ""
    source: str = "manual"


class RetryTaskRequest(BaseModel):
    order_no: str
    task_type: str
    max_retries: int = 3
    priority: int = 5


class VerifyRequest(BaseModel):
    submission_id: int
    verified_status: str
    review_comment: str = ""


class ManualOverrideRequest(BaseModel):
    queue_id: int
    new_status: str
    remark: str = ""


class CompensationRequest(BaseModel):
    order_no: str
    compensation_type: str
    compensation_amount: float
    compensation_reason: str


class CloseOrderRequest(BaseModel):
    order_no: str
    close_reason: str


class ResolveFailureRequest(BaseModel):
    failure_id: int
    resolution_note: str


@app.on_event("startup")
async def startup_event():
    init_db()
    db = next(get_db())
    init_users(db)


@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


def log_audit(db: Session, order_no: str, action: str, old_value: dict, new_value: dict, operator: str, operator_role: str, remark: str = ""):
    audit = AuditLog(
        order_no=order_no,
        action=action,
        old_value=old_value,
        new_value=new_value,
        operator=operator,
        operator_role=operator_role,
        remark=remark
    )
    db.add(audit)
    db.commit()


def add_failed_record(db: Session, order_no: str, receipt_no: str, failure_type: str, error_code: str, error_message: str, raw_data: dict):
    failed = FailedRecord(
        order_no=order_no,
        receipt_no=receipt_no,
        failure_type=failure_type,
        error_code=error_code,
        error_message=error_message,
        raw_data=raw_data
    )
    db.add(failed)
    db.commit()


@app.post("/orders/")
async def create_order(
    order: OrderCreate,
    current_user: User = Depends(require_permission("create_order")),
    db: Session = Depends(get_db)
):
    existing = db.query(StoreOrder).filter(StoreOrder.order_no == order.order_no).first()
    if existing:
        raise HTTPException(status_code=400, detail="订单号已存在")

    db_order = StoreOrder(
        order_no=order.order_no,
        store_name=order.store_name,
        region=order.region,
        product_name=order.product_name,
        quantity=order.quantity,
        unit=order.unit,
        amount=order.amount,
        driver_name=order.driver_name,
        vehicle_no=order.vehicle_no,
        order_date=datetime.fromisoformat(order.order_date.replace("Z", "+00:00")),
        is_supplementary=order.is_supplementary,
        data_source=order.data_source,
        created_by=current_user.username
    )
    db.add(db_order)
    db.commit()

    log_audit(db, order.order_no, "create_order", {}, order.dict(), current_user.username, current_user.role, "创建门店订单")

    return {"message": "订单创建成功", "order_no": order.order_no}


@app.post("/receipts/submit")
async def submit_receipt(
    receipt: ReceiptSubmit,
    current_user: User = Depends(require_permission("submit_receipt")),
    db: Session = Depends(get_db)
):
    try:
        order = db.query(StoreOrder).filter(StoreOrder.order_no == receipt.order_no).first()
        if not order:
            add_failed_record(db, receipt.order_no, receipt.receipt_no, "order_not_found", "E001", "关联订单不存在", receipt.dict())
            raise HTTPException(status_code=400, detail="关联订单不存在，已记录到失败清单")

        existing_receipt = db.query(ReceiptIOU).filter(ReceiptIOU.receipt_no == receipt.receipt_no).first()
        if existing_receipt:
            add_failed_record(db, receipt.order_no, receipt.receipt_no, "duplicate_receipt", "E002", "回执号已存在", receipt.dict())
            raise HTTPException(status_code=400, detail="回执号已存在，已记录到失败清单")

        submission = ReceiptSubmission(
            receipt_no=receipt.receipt_no,
            order_no=receipt.order_no,
            source=receipt.source,
            submission_data=receipt.dict(),
            submission_status="queued",
            created_by=current_user.username
        )
        db.add(submission)
        db.commit()

        retry_queue = RetryQueue(
            order_no=receipt.order_no,
            task_type="receipt_processing",
            current_status="queued",
            max_retries=3,
            priority=5
        )
        db.add(retry_queue)
        db.commit()

        log_audit(db, receipt.order_no, "submit_receipt", {}, receipt.dict(), current_user.username, current_user.role, "提交回执")

        return {"message": "回执提交成功，已进入处理队列", "submission_id": submission.id, "queue_id": retry_queue.id}

    except HTTPException:
        raise
    except Exception as e:
        add_failed_record(db, receipt.order_no, receipt.receipt_no, "system_error", "E999", str(e), receipt.dict())
        raise HTTPException(status_code=500, detail=f"系统错误: {str(e)}")


@app.post("/retry/process")
async def process_retry_queue(
    current_user: User = Depends(require_permission("retry_task")),
    db: Session = Depends(get_db)
):
    pending_tasks = db.query(RetryQueue).filter(
        and_(
            RetryQueue.current_status == "queued",
            RetryQueue.retry_count < RetryQueue.max_retries,
            RetryQueue.is_dead_letter == False,
            RetryQueue.manual_override == False
        )
    ).order_by(RetryQueue.priority.desc(), RetryQueue.created_at.asc()).limit(10).all()

    results = []
    for task in pending_tasks:
        task.retry_count += 1
        task.last_retry_time = datetime.utcnow()

        try:
            submission = db.query(ReceiptSubmission).filter(ReceiptSubmission.order_no == task.order_no).first()
            if submission and submission.submission_status == "queued":
                receipt_data = submission.submission_data
                db_receipt = ReceiptIOU(
                    order_no=receipt_data.get("order_no"),
                    receipt_no=receipt_data.get("receipt_no"),
                    store_name=receipt_data.get("store_name"),
                    signatory=receipt_data.get("signatory"),
                    sign_time=datetime.fromisoformat(receipt_data.get("sign_time").replace("Z", "+00:00")),
                    actual_quantity=receipt_data.get("actual_quantity"),
                    actual_amount=receipt_data.get("actual_amount"),
                    is_iou=receipt_data.get("is_iou", False),
                    iou_amount=receipt_data.get("iou_amount", 0),
                    remark=receipt_data.get("remark", ""),
                    created_by=submission.created_by
                )
                db.add(db_receipt)
                submission.submission_status = "processed"
                task.current_status = "success"

                order = db.query(StoreOrder).filter(StoreOrder.order_no == task.order_no).first()
                if order:
                    old_status = order.status
                    order.status = "delivered"
                    log_audit(db, task.order_no, "order_status_update", {"status": old_status}, {"status": "delivered"}, "system", "system", "重试成功更新订单状态")

                db.commit()
                results.append({"task_id": task.id, "order_no": task.order_no, "status": "success"})
            else:
                task.current_status = "success"
                db.commit()
                results.append({"task_id": task.id, "order_no": task.order_no, "status": "already_processed"})

        except Exception as e:
            task.error_message = str(e)
            task.error_category = type(e).__name__

            if task.retry_count >= task.max_retries:
                task.current_status = "failed"
                task.is_dead_letter = True
                add_failed_record(db, task.order_no, "", "retry_exhausted", "E003", f"重试次数耗尽: {str(e)}", {"task_id": task.id})
            else:
                task.next_retry_time = datetime.utcnow() + timedelta(minutes=5 * task.retry_count)
                task.current_status = "queued"

            db.commit()
            results.append({"task_id": task.id, "order_no": task.order_no, "status": "failed", "error": str(e)})

    return {"processed": len(results), "results": results}


@app.post("/retry/manual")
async def manual_override(
    request: ManualOverrideRequest,
    current_user: User = Depends(require_permission("manual_override")),
    db: Session = Depends(get_db)
):
    task = db.query(RetryQueue).filter(RetryQueue.id == request.queue_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="队列任务不存在")

    old_value = {
        "current_status": task.current_status,
        "manual_override": task.manual_override,
        "is_dead_letter": task.is_dead_letter
    }

    task.manual_override = True
    task.current_status = request.new_status
    task.handled_by = current_user.username
    task.handled_at = datetime.utcnow()

    if request.new_status == "success":
        task.is_dead_letter = False

    db.commit()

    new_value = {
        "current_status": request.new_status,
        "manual_override": True,
        "handled_by": current_user.username,
        "handled_at": task.handled_at.isoformat()
    }

    log_audit(db, task.order_no, "manual_override", old_value, new_value, current_user.username, current_user.role, request.remark)

    return {"message": "人工处理完成", "queue_id": request.queue_id, "new_status": request.new_status}


@app.post("/receipts/verify")
async def verify_receipt(
    request: VerifyRequest,
    current_user: User = Depends(require_permission("verify_receipt")),
    db: Session = Depends(get_db)
):
    submission = db.query(ReceiptSubmission).filter(ReceiptSubmission.id == request.submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="提交记录不存在")

    old_value = {
        "verified_status": submission.verified_status,
        "review_comment": submission.review_comment
    }

    submission.verified_status = request.verified_status
    submission.review_comment = request.review_comment
    submission.reviewer = current_user.username
    submission.reviewed_at = datetime.utcnow()

    db.commit()

    new_value = {
        "verified_status": request.verified_status,
        "review_comment": request.review_comment,
        "reviewer": current_user.username
    }

    log_audit(db, submission.order_no, "verify_receipt", old_value, new_value, current_user.username, current_user.role, request.review_comment)

    return {"message": "复核完成", "submission_id": request.submission_id, "status": request.verified_status}


@app.post("/compensation/post")
async def compensation_post(
    request: CompensationRequest,
    current_user: User = Depends(require_permission("compensation_post")),
    db: Session = Depends(get_db)
):
    order = db.query(StoreOrder).filter(StoreOrder.order_no == request.order_no).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    compensation = CompensationRecord(
        order_no=request.order_no,
        compensation_type=request.compensation_type,
        compensation_amount=request.compensation_amount,
        compensation_reason=request.compensation_reason,
        accounting_status="posted",
        posted_by=current_user.username,
        posted_at=datetime.utcnow()
    )
    db.add(compensation)
    db.commit()

    log_audit(db, request.order_no, "compensation_post", {}, request.dict(), current_user.username, current_user.role, request.compensation_reason)

    return {"message": "补偿入账成功", "compensation_id": compensation.id}


@app.post("/orders/close")
async def close_order(
    request: CloseOrderRequest,
    current_user: User = Depends(require_permission("close_order")),
    db: Session = Depends(get_db)
):
    order = db.query(StoreOrder).filter(StoreOrder.order_no == request.order_no).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    old_value = {"status": order.status}
    order.status = "closed"
    db.commit()

    new_value = {"status": "closed", "close_reason": request.close_reason}
    log_audit(db, request.order_no, "close_order", old_value, new_value, current_user.username, current_user.role, request.close_reason)

    return {"message": "订单关闭成功", "order_no": request.order_no}


@app.get("/orders/")
async def list_orders(
    status: Optional[str] = None,
    region: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_permission("view_orders")),
    db: Session = Depends(get_db)
):
    query = db.query(StoreOrder)
    if status:
        query = query.filter(StoreOrder.status == status)
    if region:
        query = query.filter(StoreOrder.region == region)

    orders = query.offset(skip).limit(limit).all()
    result = []
    for order in orders:
        order_dict = {
            "id": order.id,
            "order_no": order.order_no,
            "store_name": order.store_name,
            "region": order.region,
            "product_name": order.product_name,
            "quantity": order.quantity,
            "unit": order.unit,
            "amount": order.amount,
            "driver_name": order.driver_name,
            "vehicle_no": order.vehicle_no,
            "status": order.status,
            "is_supplementary": order.is_supplementary,
            "created_at": order.created_at.isoformat()
        }
        result.append(filter_fields_by_role(order_dict, current_user.role))

    return {"total": query.count(), "data": result}


@app.get("/orders/{order_no}/audit")
async def get_order_audit(
    order_no: str,
    current_user: User = Depends(require_permission("view_audit")),
    db: Session = Depends(get_db)
):
    audits = db.query(AuditLog).filter(AuditLog.order_no == order_no).order_by(AuditLog.created_at.desc()).all()
    result = []
    for audit in audits:
        result.append({
            "id": audit.id,
            "action": audit.action,
            "old_value": audit.old_value,
            "new_value": audit.new_value,
            "operator": audit.operator,
            "operator_role": audit.operator_role,
            "remark": audit.remark,
            "created_at": audit.created_at.isoformat()
        })
    return {"order_no": order_no, "audit_logs": result}


@app.get("/orders/{order_no}/diff")
async def get_order_diff(
    order_no: str,
    current_user: User = Depends(require_permission("view_audit")),
    db: Session = Depends(get_db)
):
    audits = db.query(AuditLog).filter(AuditLog.order_no == order_no).order_by(AuditLog.created_at.asc()).all()

    diffs = []
    for i, audit in enumerate(audits):
        diffs.append({
            "step": i + 1,
            "action": audit.action,
            "operator": audit.operator,
            "operator_role": audit.operator_role,
            "before": audit.old_value,
            "after": audit.new_value,
            "remark": audit.remark,
            "time": audit.created_at.isoformat()
        })

    return {"order_no": order_no, "change_history": diffs}


@app.get("/failures/")
async def list_failures(
    is_resolved: Optional[bool] = None,
    failure_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_permission("view_failures")),
    db: Session = Depends(get_db)
):
    query = db.query(FailedRecord)
    if is_resolved is not None:
        query = query.filter(FailedRecord.is_resolved == is_resolved)
    if failure_type:
        query = query.filter(FailedRecord.failure_type == failure_type)

    failures = query.order_by(FailedRecord.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    for f in failures:
        result.append({
            "id": f.id,
            "order_no": f.order_no,
            "receipt_no": f.receipt_no,
            "failure_type": f.failure_type,
            "error_code": f.error_code,
            "error_message": f.error_message,
            "is_resolved": f.is_resolved,
            "resolved_by": f.resolved_by,
            "resolution_note": f.resolution_note,
            "created_at": f.created_at.isoformat(),
            "resolved_at": f.resolved_at.isoformat() if f.resolved_at else None
        })

    return {"total": query.count(), "data": result}


@app.post("/failures/{failure_id}/resolve")
async def resolve_failure(
    failure_id: int,
    request: ResolveFailureRequest,
    current_user: User = Depends(require_permission("manual_override")),
    db: Session = Depends(get_db)
):
    failure = db.query(FailedRecord).filter(FailedRecord.id == failure_id).first()
    if not failure:
        raise HTTPException(status_code=404, detail="失败记录不存在")

    failure.is_resolved = True
    failure.resolved_by = current_user.username
    failure.resolution_note = request.resolution_note
    failure.resolved_at = datetime.utcnow()
    db.commit()

    return {"message": "失败记录已标记为已解决", "failure_id": failure_id}


@app.get("/reports/summary")
async def get_report_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    region: Optional[str] = None,
    current_user: User = Depends(require_permission("view_reports")),
    db: Session = Depends(get_db)
):
    base_query = db.query(StoreOrder)
    if region:
        base_query = base_query.filter(StoreOrder.region == region)

    total_orders = base_query.count()
    total_amount = db.query(func.sum(StoreOrder.amount)).filter(StoreOrder.id.in_([o.id for o in base_query.all()])).scalar() or 0

    status_breakdown = db.query(
        StoreOrder.status,
        func.count(StoreOrder.id),
        func.sum(StoreOrder.amount)
    ).group_by(StoreOrder.status).all()

    retry_queue_query = db.query(RetryQueue)
    queued_count = retry_queue_query.filter(RetryQueue.current_status == "queued").count()
    success_count = retry_queue_query.filter(RetryQueue.current_status == "success").count()
    failed_count = retry_queue_query.filter(RetryQueue.current_status == "failed").count()
    dead_letter_count = retry_queue_query.filter(RetryQueue.is_dead_letter == True).count()

    failures_query = db.query(FailedRecord)
    unresolved_failures = failures_query.filter(FailedRecord.is_resolved == False).count()

    compensation_total = db.query(func.sum(CompensationRecord.compensation_amount)).scalar() or 0

    return {
        "period": {"start_date": start_date, "end_date": end_date},
        "orders": {
            "total_count": total_orders,
            "total_amount": total_amount,
            "status_breakdown": [
                {"status": s[0], "count": s[1], "amount": s[2] or 0} for s in status_breakdown
            ]
        },
        "retry_queue": {
            "queued": queued_count,
            "success": success_count,
            "failed": failed_count,
            "dead_letter": dead_letter_count
        },
        "failures": {
            "unresolved": unresolved_failures
        },
        "compensation": {
            "total_amount": compensation_total
        }
    }


@app.get("/manager/retry-classification")
async def get_retry_classification(
    current_user: User = Depends(require_permission("manage_dead_letter")),
    db: Session = Depends(get_db)
):
    retry_tasks = db.query(RetryQueue).filter(
        or_(RetryQueue.current_status == "queued", RetryQueue.is_dead_letter == True)
    ).all()

    categories = {}
    for task in retry_tasks:
        category = task.error_category or "unknown"
        if category not in categories:
            categories[category] = {
                "count": 0,
                "retryable": 0,
                "dead_letter": 0,
                "tasks": []
            }
        categories[category]["count"] += 1
        if task.is_dead_letter:
            categories[category]["dead_letter"] += 1
        else:
            categories[category]["retryable"] += 1

        categories[category]["tasks"].append({
            "id": task.id,
            "order_no": task.order_no,
            "task_type": task.task_type,
            "retry_count": task.retry_count,
            "max_retries": task.max_retries,
            "error_message": task.error_message,
            "is_dead_letter": task.is_dead_letter,
            "manual_override": task.manual_override
        })

    return {
        "classification": categories,
        "summary": {
            "total_pending": len(retry_tasks),
            "retryable": sum(c["retryable"] for c in categories.values()),
            "dead_letter": sum(c["dead_letter"] for c in categories.values()),
            "categories": list(categories.keys())
        }
    }


@app.get("/manager/dead-letter")
async def get_dead_letter(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_permission("manage_dead_letter")),
    db: Session = Depends(get_db)
):
    dead_letters = db.query(RetryQueue).filter(RetryQueue.is_dead_letter == True).order_by(RetryQueue.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for dl in dead_letters:
        result.append({
            "id": dl.id,
            "order_no": dl.order_no,
            "task_type": dl.task_type,
            "retry_count": dl.retry_count,
            "max_retries": dl.max_retries,
            "error_category": dl.error_category,
            "error_message": dl.error_message,
            "handled_by": dl.handled_by,
            "manual_override": dl.manual_override,
            "created_at": dl.created_at.isoformat()
        })

    return {"total": db.query(RetryQueue).filter(RetryQueue.is_dead_letter == True).count(), "data": result}


@app.post("/manager/dead-letter/{queue_id}/restore")
async def restore_dead_letter(
    queue_id: int,
    current_user: User = Depends(require_permission("manage_dead_letter")),
    db: Session = Depends(get_db)
):
    task = db.query(RetryQueue).filter(RetryQueue.id == queue_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="死信任务不存在")

    old_value = {
        "is_dead_letter": task.is_dead_letter,
        "current_status": task.current_status,
        "retry_count": task.retry_count
    }

    task.is_dead_letter = False
    task.current_status = "queued"
    task.retry_count = 0
    task.next_retry_time = datetime.utcnow()
    task.handled_by = current_user.username
    task.handled_at = datetime.utcnow()

    db.commit()

    new_value = {
        "is_dead_letter": False,
        "current_status": "queued",
        "retry_count": 0,
        "restored_by": current_user.username
    }

    log_audit(db, task.order_no, "restore_dead_letter", old_value, new_value, current_user.username, current_user.role, "死信恢复重试")

    return {"message": "死信已恢复到重试队列", "queue_id": queue_id}


@app.get("/export/orders")
async def export_orders(
    status: Optional[str] = None,
    current_user: User = Depends(require_permission("export_data")),
    db: Session = Depends(get_db)
):
    query = db.query(StoreOrder)
    if status:
        query = query.filter(StoreOrder.status == status)

    orders = query.all()
    data = []
    for order in orders:
        data.append({
            "订单号": order.order_no,
            "门店名称": order.store_name,
            "区域": order.region,
            "产品名称": order.product_name,
            "数量": order.quantity,
            "单位": order.unit,
            "金额": order.amount,
            "司机": order.driver_name,
            "车牌号": order.vehicle_no,
            "状态": order.status,
            "是否补录": "是" if order.is_supplementary else "否",
            "创建人": order.created_by,
            "创建时间": order.created_at.isoformat()
        })

    df = pd.DataFrame(data)
    output = BytesIO()
    df.to_excel(output, index=False, sheet_name="订单数据")
    output.seek(0)

    filename = f"orders_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    filepath = f"/tmp/{filename}"

    with open(filepath, "wb") as f:
        f.write(output.getvalue())

    return FileResponse(filepath, filename=filename, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


@app.get("/export/failures")
async def export_failures(
    is_resolved: Optional[bool] = None,
    current_user: User = Depends(require_permission("export_data")),
    db: Session = Depends(get_db)
):
    query = db.query(FailedRecord)
    if is_resolved is not None:
        query = query.filter(FailedRecord.is_resolved == is_resolved)

    failures = query.all()
    data = []
    for f in failures:
        data.append({
            "失败ID": f.id,
            "订单号": f.order_no,
            "回执号": f.receipt_no,
            "失败类型": f.failure_type,
            "错误码": f.error_code,
            "错误信息": f.error_message,
            "是否解决": "是" if f.is_resolved else "否",
            "解决人": f.resolved_by,
            "解决说明": f.resolution_note,
            "创建时间": f.created_at.isoformat(),
            "解决时间": f.resolved_at.isoformat() if f.resolved_at else ""
        })

    df = pd.DataFrame(data)
    output = BytesIO()
    df.to_excel(output, index=False, sheet_name="失败记录")
    output.seek(0)

    filename = f"failures_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    filepath = f"/tmp/{filename}"

    with open(filepath, "wb") as f:
        f.write(output.getvalue())

    return FileResponse(filepath, filename=filename, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
