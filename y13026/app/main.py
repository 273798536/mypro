from fastapi import FastAPI
from app.config import settings
from app.database import Base, engine
from app.routers import router

app = FastAPI(
    title=settings.app_name,
    description="券商适当性异常回放系统 - 保留审批邮件与后补凭证的关系链，状态与导出Markdown报告一致",
    version="1.0.0",
)


@app.on_event("startup")
def on_startup():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        pass


app.include_router(router)


@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.app_name}
