from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json

from .database import engine, get_db, Base
from . import models, schemas, crud
from .models import UserRole, WorkflowStatus, TaskStatus, DuplicateStrategy

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="农资门店配送权限追责台账 API",
    description="门店订单、司机轨迹、签收欠条、客服备注接入与审计追踪系统",
    version="1.0.0"
)


@app.on_event("startup")
def startup_event():
    db = next(get_db())
    if not crud.get_user_by_username(db, "admin"):
        crud.create_user(db, schemas.UserCreate(
            username="admin",
            real_name="系统管理员",
            role=UserRole.ADMIN,
            phone="13800138000",
            area="总部"
        ))
    if not crud.get_user_by_username(db, "area_manager_01"):
        crud.create_user(db, schemas.UserCreate(
            username="area_manager_01",
            real_name="张经理",
            role=UserRole.AREA_MANAGER,
            phone="13900139000",
            area="华东片区"
        ))
    if not crud.get_user_by_username(db, "store_clerk_01"):
        crud.create_user(db, schemas.UserCreate(
            username="store_clerk_01",
            real_name="李店员",
            role=UserRole.STORE_CLERK,
            phone="13700137000",
            area="华东片区-南京"
        ))
    if not crud.get_user_by_username(db, "driver_01"):
        crud.create_user(db, schemas.UserCreate(
            username="driver_01",
            real_name="王司机",
            role=UserRole.DRIVER,
            phone="13600136000",
            area="华东片区"
        ))
    if not crud.get_user_by_username(db, "cs_01"):
        crud.create_user(db, schemas.UserCreate(
            username="cs_01",
            real_name="赵客服",
            role=UserRole.CUSTOMER_SERVICE,
            phone="13500135000",
            area="总部客服中心"
        ))


@app.post("/api/users/", response_model=schemas.User, tags=["用户管理"])
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="用户名已存在")
    return crud.create_user(db=db, user=user)


@app.get("/api/users/", response_model=List[schemas.User], tags=["用户管理"])
def list_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.User).offset(skip).limit(limit).all()


@app.post("/api/orders/", tags=["门店订单"])
def create_store_order(order: schemas.StoreOrderCreate, db: Session = Depends(get_db)):
    db_order, action = crud.create_store_order(db, order)
    return {
        "order": schemas.StoreOrder.model_validate(db_order),
        "action": action
    }


@app.get("/api/orders/{order_id}", response_model=schemas.StoreOrderDetail, tags=["门店订单"])
def get_store_order(order_id: int, role: UserRole = UserRole.ADMIN, db: Session = Depends(get_db)):
    db_order = crud.get_store_order(db, order_id, role)
    if db_order is None:
        raise HTTPException(status_code=404, detail="订单不存在")
    return db_order


@app.get("/api/orders/batch/{batch_no}", response_model=List[schemas.StoreOrder], tags=["门店订单"])
def get_orders_by_batch(batch_no: str, role: UserRole = UserRole.ADMIN, db: Session = Depends(get_db)):
    return crud.get_store_orders_by_batch(db, batch_no, role)


@app.put("/api/orders/{order_id}", tags=["门店订单"])
def update_store_order(
    order_id: int,
    order_update: schemas.StoreOrderUpdate,
    operator_id: int,
    db: Session = Depends(get_db)
):
    db_order = crud.update_store_order(db, order_id, order_update, operator_id)
    if db_order is None:
        raise HTTPException(status_code=404, detail="订单不存在")
    return {"order": schemas.StoreOrder.model_validate(db_order)}


@app.post("/api/orders/{order_id}/workflow", tags=["门店订单"])
def order_workflow_action(
    order_id: int,
    action: schemas.WorkflowAction,
    db: Session = Depends(get_db)
):
    result = crud.update_workflow_status(
        db, "store_order", order_id, action.action,
        action.operator_id, action.change_reason
    )
    if result is None:
        raise HTTPException(status_code=400, detail="操作失败")
    return {
        "order_id": order_id,
        "new_status": result.status,
        "message": "工作流状态更新成功"
    }


@app.post("/api/trajectories/", tags=["司机轨迹"])
def create_trajectory(trajectory: schemas.DriverTrajectoryCreate, db: Session = Depends(get_db)):
    db_traj, action = crud.create_driver_trajectory(db, trajectory)
    return {
        "trajectory": schemas.DriverTrajectory.model_validate(db_traj),
        "action": action
    }


@app.post("/api/trajectories/{traj_id}/workflow", tags=["司机轨迹"])
def trajectory_workflow_action(
    traj_id: int,
    action: schemas.WorkflowAction,
    db: Session = Depends(get_db)
):
    result = crud.update_workflow_status(
        db, "trajectory", traj_id, action.action,
        action.operator_id, action.change_reason
    )
    if result is None:
        raise HTTPException(status_code=400, detail="操作失败")
    return {
        "trajectory_id": traj_id,
        "new_status": result.workflow_status,
        "message": "工作流状态更新成功"
    }


@app.post("/api/receipts/", tags=["签收欠条"])
def create_receipt(receipt: schemas.ReceiptIOUCreate, db: Session = Depends(get_db)):
    db_receipt, action = crud.create_receipt_iou(db, receipt)
    return {
        "receipt": schemas.ReceiptIOU.model_validate(db_receipt),
        "action": action
    }


@app.post("/api/receipts/{receipt_id}/workflow", tags=["签收欠条"])
def receipt_workflow_action(
    receipt_id: int,
    action: schemas.WorkflowAction,
    db: Session = Depends(get_db)
):
    result = crud.update_workflow_status(
        db, "receipt", receipt_id, action.action,
        action.operator_id, action.change_reason
    )
    if result is None:
        raise HTTPException(status_code=400, detail="操作失败")
    return {
        "receipt_id": receipt_id,
        "new_status": result.workflow_status,
        "message": "工作流状态更新成功"
    }


@app.post("/api/handovers/", tags=["门店交接"])
def create_handover(handover: schemas.StoreHandoverCreate, db: Session = Depends(get_db)):
    db_handover, action = crud.create_store_handover(db, handover)
    return {
        "handover": schemas.StoreHandover.model_validate(db_handover),
        "action": action
    }


@app.post("/api/handovers/{handover_id}/workflow", tags=["门店交接"])
def handover_workflow_action(
    handover_id: int,
    action: schemas.WorkflowAction,
    db: Session = Depends(get_db)
):
    result = crud.update_workflow_status(
        db, "handover", handover_id, action.action,
        action.operator_id, action.change_reason
    )
    if result is None:
        raise HTTPException(status_code=400, detail="操作失败")
    return {
        "handover_id": handover_id,
        "new_status": result.workflow_status,
        "message": "工作流状态更新成功"
    }


@app.post("/api/remarks/", tags=["客服备注"])
def create_remark(remark: schemas.ServiceRemarkCreate, db: Session = Depends(get_db)):
    db_remark, action = crud.create_service_remark(db, remark)
    return {
        "remark": schemas.ServiceRemark.model_validate(db_remark),
        "action": action
    }


@app.post("/api/remarks/{remark_id}/workflow", tags=["客服备注"])
def remark_workflow_action(
    remark_id: int,
    action: schemas.WorkflowAction,
    db: Session = Depends(get_db)
):
    result = crud.update_workflow_status(
        db, "remark", remark_id, action.action,
        action.operator_id, action.change_reason
    )
    if result is None:
        raise HTTPException(status_code=400, detail="操作失败")
    return {
        "remark_id": remark_id,
        "new_status": result.workflow_status,
        "message": "工作流状态更新成功"
    }


@app.get("/api/audit-logs/", response_model=List[schemas.AuditLog], tags=["审计日志"])
def list_audit_logs(
    batch_no: Optional[str] = None,
    target_type: Optional[str] = None,
    operator_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    return crud.get_audit_logs(db, batch_no, target_type, operator_id)


@app.get("/api/change-histories/", response_model=List[schemas.ChangeHistory], tags=["变更历史"])
def list_change_histories(
    order_id: Optional[int] = None,
    batch_no: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_change_histories(db, order_id, batch_no)


@app.post("/api/async-tasks/", response_model=schemas.AsyncTask, tags=["异步任务"])
def create_async_task(task: schemas.AsyncTaskCreate, db: Session = Depends(get_db)):
    return crud.create_async_task(db, task)


@app.get("/api/async-tasks/failed/", response_model=List[schemas.AsyncTask], tags=["异步任务"])
def list_failed_tasks(db: Session = Depends(get_db)):
    return crud.get_failed_tasks(db)


@app.put("/api/async-tasks/{task_id}/retry", tags=["异步任务"])
def retry_task(task_id: str, db: Session = Depends(get_db)):
    task = crud.update_async_task_status(db, task_id, TaskStatus.PENDING)
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"message": "任务已重置为待处理状态", "task_id": task_id}


@app.put("/api/async-tasks/{task_id}/manual-resolve", tags=["异步任务"])
def manual_resolve_task(task_id: str, db: Session = Depends(get_db)):
    task = crud.update_async_task_status(db, task_id, TaskStatus.SUCCESS, result={"resolved_manually": True})
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {"message": "任务已标记为人工处理成功", "task_id": task_id}


class TaskFailureUpdate(BaseModel):
    error_message: Optional[str] = None
    result: Optional[dict] = None


@app.put("/api/async-tasks/{task_id}/mark-wait-retry", tags=["异步任务"])
def mark_task_wait_retry(
    task_id: str,
    failure_update: Optional[TaskFailureUpdate] = None,
    db: Session = Depends(get_db)
):
    task = crud.update_async_task_status(
        db, task_id, TaskStatus.WAIT_RETRY,
        error_message=failure_update.error_message if failure_update else None,
        result=failure_update.result if failure_update else None
    )
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {
        "message": "任务已标记为等待重试",
        "task_id": task_id,
        "retry_count": task.retry_count,
        "next_retry_time": task.next_retry_time
    }


@app.put("/api/async-tasks/{task_id}/mark-wait-manual", tags=["异步任务"])
def mark_task_wait_manual(
    task_id: str,
    failure_update: Optional[TaskFailureUpdate] = None,
    db: Session = Depends(get_db)
):
    task = crud.update_async_task_status(
        db, task_id, TaskStatus.WAIT_MANUAL,
        error_message=failure_update.error_message if failure_update else None,
        result=failure_update.result if failure_update else None
    )
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {
        "message": "任务已标记为等待人工处理",
        "task_id": task_id,
        "retry_count": task.retry_count
    }


@app.put("/api/async-tasks/{task_id}/mark-permanent-failed", tags=["异步任务"])
def mark_task_permanent_failed(
    task_id: str,
    failure_update: Optional[TaskFailureUpdate] = None,
    db: Session = Depends(get_db)
):
    task = crud.update_async_task_status(
        db, task_id, TaskStatus.PERMANENT_FAILED,
        error_message=failure_update.error_message if failure_update else None,
        result=failure_update.result if failure_update else None
    )
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {
        "message": "任务已标记为永久失败",
        "task_id": task_id,
        "retry_count": task.retry_count
    }


@app.get("/api/views/area-manager/", tags=["角色视图"])
def get_area_manager_view(
    batch_no: Optional[str] = None,
    area: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_role_based_view(db, UserRole.AREA_MANAGER, area, batch_no)


@app.post("/api/export/", tags=["导出功能"])
def export_data(export_req: schemas.ExportRequest, db: Session = Depends(get_db)):
    orders = crud.get_store_orders_by_batch(db, export_req.batch_no, export_req.role) if export_req.batch_no else []
    audit_logs = crud.get_audit_logs(db, export_req.batch_no)
    changes = crud.get_change_histories(db, batch_no=export_req.batch_no)
    
    result = {
        "export_time": datetime.now().isoformat(),
        "exported_by_role": export_req.role.value,
        "desensitized": export_req.desensitize,
        "orders": [schemas.StoreOrder.model_validate(o).model_dump() for o in orders],
        "audit_logs_count": len(audit_logs),
        "change_count": len(changes)
    }
    
    if export_req.role not in [UserRole.AREA_MANAGER, UserRole.AUDITOR, UserRole.ADMIN]:
        result["orders"] = [crud.desensitize_data(o, export_req.role) for o in result["orders"]]
    
    return result


@app.get("/api/health/", tags=["系统"])
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/", tags=["系统"])
def root():
    return {
        "name": "农资门店配送权限追责台账 API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health/"
    }
