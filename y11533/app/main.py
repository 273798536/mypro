from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db, get_db
from app.api.v1 import router as api_router
from app.services.task_service import TaskService

app = FastAPI(
    title=settings.APP_NAME,
    description="银行网点排班验收回放链路API - 支持柜员排班、请假单、业务量预测、班次记录的数据接入，处理临时外出培训后窗口人手和午休规则冲突的口径变化",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    init_db()
    
    db = next(get_db())
    recovered_count = TaskService.resume_interrupted_tasks(db)
    if recovered_count > 0:
        print(f"[系统启动] 已恢复 {recovered_count} 个中断的任务")

@app.get("/", summary="根路径")
async def root():
    return {
        "service": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "api_base": "/api/v1",
        "features": [
            "数据导入：柜员排班、请假单、业务量预测、手工改价表、班次记录",
            "原始证据保留：来源文件、原始行号、解析后标准值",
            "状态管理：时间、操作者、原因完整记录",
            "异步任务：等重试、等人工、永久失败三种分类",
            "回放链路：造数、启动服务、发请求、对账、导出、回放异常",
            "自动化检查：重复导入、权限拦截、异常保留、重启后历史、导出一致性",
        ],
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
