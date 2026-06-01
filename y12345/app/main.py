from fastapi import FastAPI
from app.database import engine, Base
from app.routers import experiments, nodes, reports

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="声学驻波教室 API",
    description="轻量持久化声学驻波实验记录系统 — 频率·管长·节点·温度修正全程可追溯",
    version="1.0.0",
)

app.include_router(experiments.router)
app.include_router(nodes.router)
app.include_router(reports.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
