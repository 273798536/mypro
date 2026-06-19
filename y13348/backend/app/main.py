from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .database import engine, Base
from .routers import auth, sessions, corrections, leaks, reports, guides, comments, snapshots


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    from .init_data import init_default_data
    init_default_data()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["审查会话"])
app.include_router(corrections.router, prefix="/api/corrections", tags=["人工修正"])
app.include_router(leaks.router, prefix="/api/leaks", tags=["样本泄漏"])
app.include_router(reports.router, prefix="/api/reports", tags=["灰度报告"])
app.include_router(guides.router, prefix="/api/guides", tags=["操作指引"])
app.include_router(comments.router, prefix="/api/comments", tags=["备注评论"])
app.include_router(snapshots.router, prefix="/api/snapshots", tags=["页面快照"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}
