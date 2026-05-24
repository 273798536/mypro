from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.inspection import router as inspection_router
from app.api.rework import router as rework_router
from app.api.shift import router as shift_router
from app.api.price import router as price_router
from app.api.imports import router as import_router
from app.api.export import router as export_router
from app.api.audit import router as audit_router
from app.api.status import router as status_router
from app.api.traceability import router as traceability_router

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router, prefix="/auth", tags=["认证"])
api_router.include_router(inspection_router, prefix="/inspection", tags=["抽检记录"])
api_router.include_router(rework_router, prefix="/rework", tags=["返工单"])
api_router.include_router(shift_router, prefix="/shift", tags=["机台班次"])
api_router.include_router(price_router, prefix="/price", tags=["改价表"])
api_router.include_router(import_router, prefix="/import", tags=["数据导入"])
api_router.include_router(export_router, prefix="/export", tags=["数据导出"])
api_router.include_router(audit_router, prefix="/audit", tags=["审计日志"])
api_router.include_router(status_router, prefix="/status", tags=["状态管理"])
api_router.include_router(traceability_router, prefix="/traceability", tags=["追责台账"])
