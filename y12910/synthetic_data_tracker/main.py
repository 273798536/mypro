from fastapi import FastAPI
from database import init_db
from routers import records, reports, versions

app = FastAPI(
    title="合成数据来源追踪",
    description="评测题库全流程后端：导入 → 复核 → 状态推进 → 报告导出，含版本追踪与样本去重",
    version="1.0.0",
)


@app.on_event("startup")
def startup():
    init_db()


app.include_router(records.router)
app.include_router(reports.router)
app.include_router(versions.router)
