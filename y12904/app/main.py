from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import banks, tasks, reports

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="模型评测题库偏科检查",
    description="后端接口：导入、复核、状态推进、报告导出。重启服务后可查上一轮处理痕迹。安全拦截增量更新，切分清单补录后样本去重自动刷新。",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(banks.router)
app.include_router(tasks.router)
app.include_router(reports.router)


@app.get("/")
def root():
    return {
        "service": "模型评测题库偏科检查",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
