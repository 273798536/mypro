import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import import_router, records_router, query_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="多项式外推警报系统",
    description="多项式外推警报：导入→复核→状态推进→报告导出，支持追溯、历史对比、脏数据处理",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(import_router.router)
app.include_router(records_router.router)
app.include_router(query_router.router)

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", response_class=HTMLResponse, tags=["UI"])
def index():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read()
    return HTMLResponse("<h1>多项式外推警报系统 API 已启动</h1><p>访问 <a href='/docs'>/docs</a> 查看接口文档</p>")


@app.get("/health", tags=["系统"])
def health():
    return {"status": "ok", "service": "多项式外推警报系统"}
