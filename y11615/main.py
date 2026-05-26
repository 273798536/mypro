from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import import_data, customers, invoices, receipts, collection, credit, reports, alerts

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="应收账款逾期滚动系统",
    description="B2B销售应收账款逾期滚动分析后端服务",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(import_data.router, prefix="/api/import", tags=["数据导入"])
app.include_router(customers.router, prefix="/api/customers", tags=["客户管理"])
app.include_router(invoices.router, prefix="/api/invoices", tags=["发票管理"])
app.include_router(receipts.router, prefix="/api/receipts", tags=["回款管理"])
app.include_router(collection.router, prefix="/api/collection", tags=["催收管理"])
app.include_router(credit.router, prefix="/api/credit", tags=["信用额度"])
app.include_router(reports.router, prefix="/api/reports", tags=["报告分析"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["风险预警"])


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "应收账款逾期滚动系统运行正常"}
