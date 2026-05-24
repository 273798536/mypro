from fastapi import APIRouter

from app.api.endpoints import auth, return_application, ledger, audit, export, system_check

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["认证"])
api_router.include_router(return_application.router, prefix="/return", tags=["退供申请"])
api_router.include_router(ledger.router, prefix="/ledger", tags=["台账"])
api_router.include_router(audit.router, prefix="/audit", tags=["审计"])
api_router.include_router(export.router, prefix="/export", tags=["导出"])
api_router.include_router(system_check.router, prefix="/system-check", tags=["系统检查"])
