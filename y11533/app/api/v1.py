import os
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.config import settings
from app.models import ReplayChain, AsyncTask, ImportBatch, StatusLog
from app.services.import_service import ImportService
from app.services.export_service import ExportService
from app.services.replay_service import ReplayService
from app.services.task_service import TaskService, TASK_STATUS_SUCCESS, TASK_STATUS_WAITING_MANUAL
from app.services.status_service import StatusService
from app.services.automation_check_service import AutomationCheckService
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api/v1", tags=["银行网点排班验收回放链路"])

@router.post("/import/{data_type}", summary="导入数据")
async def import_data(
    data_type: str,
    file: UploadFile = File(...),
    operator: str = Form(...),
    db: Session = Depends(get_db),
):
    """
    导入数据，支持Excel/CSV格式
    - data_type: schedule/leave/forecast/adjustment/record
    """
    if data_type not in ["schedule", "leave", "forecast", "adjustment", "record"]:
        raise HTTPException(status_code=400, detail=f"不支持的数据类型: {data_type}")
    
    file_path = os.path.join(settings.UPLOADS_DIR, f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}")
    
    with open(file_path, "wb") as f:
        f.write(await file.read())
    
    duplicate_check = AutomationCheckService.check_duplicate_import(db, file_path, data_type)
    if not duplicate_check["passed"]:
        raise HTTPException(status_code=400, detail=duplicate_check["message"])
    
    batch = ImportService.create_batch(db, data_type, file.filename, file_path, operator)
    
    df = ImportService.read_file(file_path)
    
    result = ImportService.import_data(db, batch, df, file.filename, operator)
    
    return {
        "code": 0,
        "message": "导入完成",
        "data": result,
    }

@router.get("/export/{data_type}", summary="导出数据")
async def export_data(
    data_type: str,
    branch_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    include_evidence: bool = True,
    db: Session = Depends(get_db),
):
    """
    导出数据，包含原始证据
    """
    filters = {}
    if branch_id:
        filters["branch_id"] = branch_id
    if start_date:
        filters["start_date"] = start_date
    if end_date:
        filters["end_date"] = end_date
    
    try:
        filepath, filename = ExportService.export_data(
            db, data_type, filters=filters, include_evidence=include_evidence, branch_id=branch_id
        )
        return FileResponse(filepath, filename=filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/replay/create", summary="创建回放链路")
async def create_replay_chain(
    chain_name: str = Form(...),
    branch_id: str = Form(...),
    branch_name: str = Form(...),
    replay_date: str = Form(...),
    created_by: str = Form(...),
    db: Session = Depends(get_db),
):
    """创建回放链路"""
    chain = ReplayService.create_chain(db, chain_name, branch_id, branch_name, replay_date, created_by)
    return {
        "code": 0,
        "message": "创建成功",
        "data": {"chain_id": chain.chain_id},
    }

@router.post("/replay/{chain_id}/start", summary="启动完整回放链路")
async def start_replay(
    chain_id: str,
    background_tasks: BackgroundTasks,
    operator: str = Form(...),
    db: Session = Depends(get_db),
):
    """
    启动完整回放链路：造数 -> 启动服务 -> 发请求 -> 对账 -> 导出
    """
    chain = db.query(ReplayChain).filter(ReplayChain.chain_id == chain_id).first()
    if not chain:
        raise HTTPException(status_code=404, detail="回放链路不存在")
    
    task = TaskService.create_task(
        db, "replay", f"回放链路-{chain_id}",
        input_data={"chain_id": chain_id, "operator": operator},
        created_by=operator, priority=10,
    )
    
    def run_replay_task():
        db_local = next(get_db())
        try:
            chain_local = db_local.query(ReplayChain).filter(ReplayChain.chain_id == chain_id).first()
            if not chain_local:
                raise ValueError(f"回放链路 {chain_id} 在后台任务中不存在")
            
            task_local = TaskService.get_task(db_local, task.task_id)
            TaskService.start_task(db_local, task_local)
            ReplayService.run_full_replay(db_local, chain_local, task_local)
            TaskService.complete_task(db_local, task_local)
            
            chain_local = db_local.query(ReplayChain).filter(ReplayChain.chain_id == chain_id).first()
            AutomationCheckService.check_export_consistency(db_local, chain_id, chain_local.export_file_path)
        except Exception as e:
            task_local = TaskService.get_task(db_local, task.task_id)
            TaskService.handle_failure(db_local, task_local, e, "WAITING_MANUAL")
    
    background_tasks.add_task(run_replay_task)
    
    return {
        "code": 0,
        "message": "回放任务已启动",
        "data": {"task_id": task.task_id, "chain_id": chain_id},
    }

@router.get("/replay/{chain_id}", summary="获取回放链路详情")
async def get_replay_chain(
    chain_id: str,
    db: Session = Depends(get_db),
):
    """获取回放链路详情，支行行长关注的重点：命令脚本、HTTP读写、本地持久化"""
    chain = db.query(ReplayChain).filter(ReplayChain.chain_id == chain_id).first()
    if not chain:
        raise HTTPException(status_code=404, detail="回放链路不存在")
    
    return {
        "code": 0,
        "data": {
            "chain_id": chain.chain_id,
            "chain_name": chain.chain_name,
            "branch_id": chain.branch_id,
            "branch_name": chain.branch_name,
            "replay_date": chain.replay_date,
            "status": chain.status,
            "created_by": chain.created_by,
            "created_at": chain.created_at,
            "completed_at": chain.completed_at,
            "duration_seconds": chain.duration_seconds,
            "request_summary": {
                "total": chain.request_count,
                "success": chain.request_success_count,
                "failed": chain.request_failed_count,
            },
            "reconcile_summary": {
                "diff_count": chain.reconcile_diff_count,
                "anomaly_count": chain.anomaly_count,
            },
            "重点关注": {
                "命令脚本日志": chain.command_script_log,
                "HTTP请求日志": json.loads(chain.http_request_log) if chain.http_request_log else [],
                "本地持久化日志": chain.persistence_log,
                "对账结果": json.loads(chain.reconcile_result) if chain.reconcile_result else {},
                "异常详情": json.loads(chain.anomaly_details) if chain.anomaly_details else [],
            },
            "export_file": chain.export_file_name,
        },
    }

@router.get("/replay/{chain_id}/export", summary="导出回放报告")
async def export_replay_report(
    chain_id: str,
    db: Session = Depends(get_db),
):
    """导出回放链路完整报告"""
    try:
        filepath, filename = ExportService.export_replay_chain(db, chain_id)
        return FileResponse(filepath, filename=filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/task/{task_id}", summary="获取任务状态")
async def get_task_status(
    task_id: str,
    db: Session = Depends(get_db),
):
    """获取异步任务状态"""
    task = TaskService.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    return {
        "code": 0,
        "data": {
            "task_id": task.task_id,
            "task_type": task.task_type,
            "task_name": task.task_name,
            "status": task.status,
            "progress": task.progress,
            "progress_message": task.progress_message,
            "failure_category": task.failure_category,
            "failure_reason": task.failure_reason,
            "retry_count": task.retry_count,
            "manual_opinion": task.manual_opinion,
            "manual_operator": task.manual_operator,
            "manual_time": task.manual_time,
            "created_by": task.created_by,
            "created_at": task.created_at,
        },
    }

@router.post("/task/{task_id}/manual", summary="人工处理任务")
async def manual_resolve_task(
    task_id: str,
    new_status: str = Form(...),
    opinion: str = Form(...),
    operator_id: str = Form(...),
    db: Session = Depends(get_db),
):
    """人工处理等待人工的任务 - 需要branch_manager或admin角色"""
    task = TaskService.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    if task.status != TASK_STATUS_WAITING_MANUAL:
        raise HTTPException(status_code=400, detail="任务不处于待人工处理状态")
    
    permission_check = AuthService.require_permission(
        db,
        operator_id,
        settings.ADMIN_ROLES,
        "人工处理任务"
    )
    
    if not permission_check["passed"]:
        raise HTTPException(
            status_code=403,
            detail=permission_check["message"]
        )
    
    operator = permission_check.get("username", operator_id)
    task = TaskService.manual_resolve(db, task, new_status, opinion, operator)
    
    AutomationCheckService.check_exception_preserve(db, task_id)
    
    return {
        "code": 0,
        "message": "人工处理完成",
        "data": {"task_id": task_id, "new_status": task.status, "operator": operator},
    }

@router.get("/task/{task_id}/history", summary="获取任务状态历史")
async def get_task_history(
    task_id: str,
    db: Session = Depends(get_db),
):
    """获取任务状态变更历史"""
    task = TaskService.get_task(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    
    logs = StatusService.get_entity_status_history(db, "async_tasks", task.task_id)
    
    return {
        "code": 0,
        "data": [
            {
                "old_status": log.old_status,
                "new_status": log.new_status,
                "reason": log.change_reason,
                "operator": log.operator,
                "time": log.change_time,
            }
            for log in logs
        ],
    }

@router.post("/system/restart/recover", summary="服务重启恢复任务")
async def recover_after_restart(
    db: Session = Depends(get_db),
):
    """服务重启后恢复中断的任务"""
    count = TaskService.resume_interrupted_tasks(db)
    
    return {
        "code": 0,
        "message": f"已恢复 {count} 个中断的任务",
        "data": {"recovered_count": count},
    }

@router.get("/system/health", summary="健康检查")
async def health_check():
    return {
        "code": 0,
        "message": "服务正常",
        "data": {
            "timestamp": datetime.now().isoformat(),
            "service": "银行网点排班验收回放链路服务",
        },
    }

@router.post("/check/restart-consistency", summary="检查重启后历史一致性")
async def check_restart_consistency(
    entity_type: str = Form(...),
    entity_id: str = Form(...),
    before_restart_data: str = Form(...),
    db: Session = Depends(get_db),
):
    """检查重启后历史一致性"""
    try:
        before_data = json.loads(before_restart_data)
        result = AutomationCheckService.check_restart_history(db, entity_type, entity_id, before_data)
        return {"code": 0, "data": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
