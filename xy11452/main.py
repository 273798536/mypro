from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.database import engine
from app.models import Base
from app.routers import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="设备租赁归还重试补偿队列 API",
    description="""
    设备租赁归还重试补偿队列服务，用于处理出库单、归还照片、维修估价、扫码明细和押金扣减复核的补偿流程。

    ## 主要功能

    * **外部回执提交** - 支持出库单、归还照片、维修估价、扫码明细等数据提交
    * **幂等性处理** - 重复请求自动识别，支持忽略、覆盖、追加三种策略
    * **限次重试** - 指数退避重试机制，超限移入死信队列
    * **人工接管** - 支持人工决策和金额调整
    * **补偿入账** - 自动计算押金扣减和补偿金额
    * **审计追踪** - 完整操作历史记录，谁在什么时候改过什么
    * **导出功能** - 支持队列列表、操作历史、财务报表导出

    ## 边界情况覆盖

    * 重复提交 - 基于幂等键自动处理
    * 撤回后再提交 - 取消状态可重新提交
    * 部分失败 - 重试机制保证最终一致性
    * 人工改判 - 支持手动调整金额和状态
    * 导出前冻结 - 防止导出期间数据变更
    """,
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(router)


@app.get("/", tags=["health"])
def health_check():
    return {
        "status": "ok",
        "service": "设备租赁归还重试补偿队列 API",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
