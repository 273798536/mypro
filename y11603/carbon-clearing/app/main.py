from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.session import init_db
from app.routers import import_router, reconcile_router, report_router, history_router

app = FastAPI(
    title="碳积分清算对账服务",
    description="园区企业碳积分清算对账后端服务，支持导入、跨月归集、红冲补偿、回执核验、审计报告",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(import_router.router, prefix="/api/import", tags=["导入"])
app.include_router(reconcile_router.router, prefix="/api/reconcile", tags=["对账"])
app.include_router(report_router.router, prefix="/api/reports", tags=["报告"])
app.include_router(history_router.router, prefix="/api/history", tags=["历史"])


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "carbon-clearing"}