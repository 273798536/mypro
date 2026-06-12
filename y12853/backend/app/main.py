from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from contextlib import asynccontextmanager
import os

from app.core.config import settings
from app.core.db import engine, Base
from app.api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时自动建表（开发环境，生产用alembic）
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"建表提示（如未连接PostgreSQL可忽略）: {e}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "## 港口拖轮潮窗 API\n\n"
        "### 日常入口\n"
        "- **轨迹清洗** → `/api/v1/trajectory-cleaning/*`\n\n"
        "### 潮窗核心\n"
        "- **计算/查询** → `/api/v1/tide-window/calculate`（幂等，同输入不重复创建）\n"
        "- **结果列表** → `/api/v1/tide-window/results`（分页，支持状态筛选）\n"
        "- **结果详情+说明** → `/api/v1/tide-window/results/{id}/summary`（可用/暂缓/重采，简短说清）\n"
        "- **人工修正** → `/api/v1/tide-window/results/{id}/correct`（留痕，前后变化可追溯）\n"
        "- **复核通过** → `/api/v1/tide-window/results/{id}/confirm`（待确认→通过，留痕）\n"
        "- **修正历史** → `/api/v1/tide-window/results/{id}/audit-log`\n"
        "- **公式说明** → `/api/v1/tide-window/formulas`（公式/单位/适用范围/失败原因，人能看懂）\n\n"
        "### 数据导入/补录（防双份结论）\n"
        "- 潮汐/水质批量导入 → `/api/v1/import/*`（自动去重幂等，补录需显式is_reimport=true）\n"
        "- 批次追溯 → `/api/v1/import/batches`\n\n"
        "### 首次打开\n"
        "- **自动生成示例数据** → POST `/api/v1/example/seed`（不用先造半天表）\n"
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# 开发放开CORS，生产需收紧
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")


@app.get("/health", tags=["系统"])
def health_check():
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "db": "connected" if engine.pool.status() else "unknown",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
    )
