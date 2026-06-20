from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import init_db
from .routers import router as api_router

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "召回漏斗版本快照系统：\n"
        "- 关联训练日志与快照结果，留存重跑覆盖关系\n"
        "- 保护人工判断不被阈值变化覆盖\n"
        "- 记录后补材料的变更历史，防止无声覆盖\n"
        "- 特征迟到时生成人性化下一步处理指引\n"
        "- 解释旧样本误判在新模型中的改判原因\n"
        "- 留存评测工程师临时修改的判断历史\n"
        "- 月底封账场景：导入旧材料→补晚到附件→接口说清变化"
    ),
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/", tags=["根路径"])
def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "features": [
            "训练日志关联留存",
            "阈值变化保护人工判断",
            "后补材料变更历史",
            "特征迟到下一步指引",
            "旧样本改判原因解释",
            "临时修改历史追溯",
            "月底封账流程"
        ]
    }


app.include_router(api_router)
