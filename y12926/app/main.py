from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.init_db import init_db
from app.routers import batches, processing, reports

app = FastAPI(
    title="模型路由命中分析系统",
    description=(
        "围绕评测题库的完整后端接口：导入、去重、路由判定、状态推进、"
        "人工复核、版本回滚、报告导出。支持重启后追溯上一轮处理痕迹、"
        "查看人工修正前后差别、以及版本回滚卡点在具体材料上的定位。"
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/health", tags=["基础"], summary="健康检查")
def health_check():
    return {"status": "ok", "service": "routing-analysis"}


app.include_router(batches.router)
app.include_router(processing.router)
app.include_router(reports.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
