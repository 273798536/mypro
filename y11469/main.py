from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.api.ledger import router as ledger_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="服装打版样衣权限追责台账 API",
    description="从样衣流转单、尺码修改意见、面料出入库等数据源还原处理链，实现完整状态流转和追责管理",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ledger_router)


@app.get("/")
async def root():
    return {
        "name": "服装打版样衣权限追责台账 API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
