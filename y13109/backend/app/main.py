from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.batches import router as batches_router

app = FastAPI(
    title="矩阵条件数批量验算系统",
    description="支持批量矩阵条件数计算、状态追踪、改判溯源、越界隔离、跳变分析和Markdown报告生成",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(batches_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
