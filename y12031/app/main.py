from fastapi import FastAPI

from app.database import init_db
from app.routers import router

app = FastAPI(title="农产品保底收购结算服务", version="1.0.0")

app.include_router(router)


@app.on_event("startup")
def on_startup():
    init_db()
