from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import batches, prompt_versions

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="数据版权来源账本 API",
    description="评测题库版权来源账本后端：导入、复核、状态推进、提示词版本追踪、报告导出",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(batches.router)
app.include_router(prompt_versions.router)


@app.get("/api/health", tags=["系统"])
def health_check():
    return {"status": "ok", "service": "copyright-ledger"}
