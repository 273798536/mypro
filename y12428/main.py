from fastapi import FastAPI
from app.api.query import router as query_router
from app.api.status import router as status_router
from app.api.history import router as history_router
from app.api.export import router as export_router
from app.api.dropout import router as dropout_router

app = FastAPI(
    title="跨校课程联盟分账系统",
    description=(
        "高校联盟财务跨校选课费用拆分后端链路。"
        "统一管理学分费、退课费、资源费的多校分摊，"
        "支持查询明细、状态变更、历史追溯、报表导出，"
        "冲突检测不悄悄选边，证据缺口主动提示。"
    ),
    version="1.0.0",
)

app.include_router(query_router)
app.include_router(status_router)
app.include_router(history_router)
app.include_router(export_router)
app.include_router(dropout_router)


@app.get("/", tags=["健康检查"])
def root():
    return {
        "service": "跨校课程联盟分账系统",
        "version": "1.0.0",
        "docs": "/docs",
    }
