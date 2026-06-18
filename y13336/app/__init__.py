from fastapi import FastAPI
from .routers import batches, recalls, overrides, materials, leaks, dashboard

app = FastAPI(title="知识库召回灰度对比", version="0.1.0")

app.include_router(batches.router, prefix="/api/batches", tags=["灰度批次"])
app.include_router(recalls.router, prefix="/api/recalls", tags=["召回结果"])
app.include_router(overrides.router, prefix="/api/overrides", tags=["改判追溯"])
app.include_router(materials.router, prefix="/api/materials", tags=["材料管理"])
app.include_router(leaks.router, prefix="/api/leaks", tags=["样本泄漏"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["运营视图"])


@app.get("/health")
def health():
    return {"status": "ok"}
