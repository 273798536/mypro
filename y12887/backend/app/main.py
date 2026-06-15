from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import import_data, processing, calculation, review, trace, export, photos

Base.metadata.create_all(bind=engine)

app = FastAPI(title="海水浴场风险播报系统", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(import_data.router, prefix="/api/import", tags=["数据导入"])
app.include_router(processing.router, prefix="/api/processing", tags=["处理记录"])
app.include_router(calculation.router, prefix="/api/calculation", tags=["计算工具"])
app.include_router(review.router, prefix="/api/review", tags=["复核管理"])
app.include_router(trace.router, prefix="/api/trace", tags=["追溯查询"])
app.include_router(export.router, prefix="/api/export", tags=["数据导出"])
app.include_router(photos.router, prefix="/api/photos", tags=["照片管理"])


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "message": "海水浴场风险播报系统运行正常"}
