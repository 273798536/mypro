from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import engine, Base, get_db
from app.models import models
from app.api import daily, refund
from app.models.schemas import HealthResponse

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="校园饭卡沉淀金后端服务",
    description="毕业季退卡结算系统：支持余额分层、退费规则匹配、脏数据容错、手动修正、批量复核与报表导出",
    version="1.0.0",
)

app.include_router(daily.router)
app.include_router(refund.router)


@app.get("/health", response_model=HealthResponse, tags=["系统"])
def health_check(db: Session = Depends(get_db)):
    """健康检查"""
    try:
        db.execute("SELECT 1")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return HealthResponse(
        status="ok",
        database=db_status,
        timestamp=datetime.now(),
    )


@app.get("/", tags=["系统"])
def root():
    return {
        "name": "校园饭卡沉淀金后端服务",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "日常操作": "/api/daily/*",
            "退卡结算": "/api/refund/*",
            "健康检查": "/health",
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
