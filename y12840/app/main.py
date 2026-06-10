from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .routers import samples, qc_review, analysis_export, test_scenarios

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="群体遗传 PCA 复盘系统",
    description=(
        "处理样本清单导入、样本质控、状态复核、图像标注、差异分析和报告导出的全流程系统。\n"
        "核心关注点：\n"
        "1. 样本条码重复、空值、备注混写等常见坑的自动兜住\n"
        "2. 质控组一眼区分可直接用 vs 需生物老师复核\n"
        "3. 处理痕迹持久化，重启可查到上一轮记录\n"
        "4. 报告导出带一致性哈希，避免结果对不上"
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(samples.router)
app.include_router(qc_review.router)
app.include_router(analysis_export.router)
app.include_router(test_scenarios.router)


@app.get("/", tags=["info"])
def root():
    return {
        "name": "群体遗传 PCA 复盘系统",
        "version": "1.0.0",
        "docs": "/docs",
        "quick_start": [
            "POST /api/test/pipeline-demo 一键生成演示数据",
            "POST /api/test/duplicate-import 跑重复导入场景测试",
            "GET  /api/qc/unusable 质控组月底转交必看：不可用记录",
            "GET  /api/qc/summary 质控整体统计",
        ],
        "qc_team_focus": "质控组月底转交时，请优先使用 /api/qc/unusable 查看不可用记录（驳回/需生物老师复核/低质量），而不是浏览系统菜单。",
    }


@app.get("/health", tags=["info"])
def health_check():
    return {"status": "ok", "database_persistent": "SQLite 文件 pca_review.db，重启服务后数据保留"}
