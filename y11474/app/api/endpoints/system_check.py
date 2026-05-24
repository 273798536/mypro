from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, SystemCheckLog
from app.schemas import SystemCheckResult
from app.security import get_current_user, require_action, UserRole
from app.system_checks import SystemChecker

router = APIRouter()


@router.get("/", response_model=List[SystemCheckResult])
async def run_all_system_checks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_action("audit"))
):
    if current_user.role != UserRole.SUPERVISOR:
        raise HTTPException(
            status_code=403,
            detail="只有主管可以运行系统检查"
        )
    
    results = SystemChecker.run_all_checks(db)
    return results


@router.get("/duplicate-imports", response_model=SystemCheckResult)
async def check_duplicate_imports(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_action("audit"))
):
    return SystemChecker.check_duplicate_imports(db)


@router.get("/permission-interception", response_model=SystemCheckResult)
async def check_permission_interception(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_action("audit"))
):
    return SystemChecker.check_permission_interception(db)


@router.get("/exception-retention", response_model=SystemCheckResult)
async def check_exception_retention(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_action("audit"))
):
    return SystemChecker.check_exception_retention(db)


@router.get("/restart-history", response_model=SystemCheckResult)
async def check_restart_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_action("audit"))
):
    return SystemChecker.check_restart_history(db)


@router.get("/export-consistency", response_model=SystemCheckResult)
async def check_export_consistency(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_action("audit"))
):
    return SystemChecker.check_export_consistency(db)


@router.get("/logs")
async def get_system_check_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_action("audit"))
):
    logs = db.query(SystemCheckLog).order_by(
        SystemCheckLog.executed_at.desc()
    ).offset(skip).limit(limit).all()
    
    return [
        {
            "id": log.id,
            "check_type": log.check_type,
            "check_result": log.check_result,
            "details": log.details,
            "passed": log.passed,
            "executed_at": log.executed_at,
            "execution_time_ms": log.execution_time_ms
        }
        for log in logs
    ]
