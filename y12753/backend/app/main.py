from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager

from .database import Base, engine, get_db, SessionLocal
from .routers import router
from .sample_data import init_sample_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        inserted = init_sample_data(db)
        if inserted > 0:
            print(f"[初始化] 已插入 {inserted} 条示例缓冲液记录")
        else:
            print("[初始化] 示例记录已存在，跳过")
    finally:
        db.close()
    yield


app = FastAPI(
    title="缓冲液配方计算器 API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "buffer-calc-backend"}
