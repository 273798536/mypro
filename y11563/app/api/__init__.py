from fastapi import APIRouter
from app.api import checkin, deposit, room_change, reconciliation, export, audit, sms, handover

api_router = APIRouter()

api_router.include_router(checkin.router, prefix="/checkin", tags=["入住单"])
api_router.include_router(deposit.router, prefix="/deposit", tags=["押金流水"])
api_router.include_router(room_change.router, prefix="/room-change", tags=["换房记录"])
api_router.include_router(reconciliation.router, prefix="/reconciliation", tags=["对账"])
api_router.include_router(export.router, prefix="/export", tags=["导出"])
api_router.include_router(audit.router, prefix="/audit", tags=["审计日志"])
api_router.include_router(sms.router, prefix="/sms", tags=["短信截图"])
api_router.include_router(handover.router, prefix="/handover", tags=["门店交接"])
