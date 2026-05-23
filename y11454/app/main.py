from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.api import auth, ledger, audit

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="设备租赁归还权限追责台账 API",
    description="设备租赁归还权限追责台账系统 - 支持出库单、归还照片、维修估价、供应商对账单的全流程管理",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(ledger.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "message": "设备租赁归还权限追责台账 API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
