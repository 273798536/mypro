from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.database import init_db
from app.routers import bunkering, voyage, hedge, allocation, export


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="船燃套保损益归集", version="0.1.0", lifespan=lifespan)

app.include_router(bunkering.router)
app.include_router(voyage.router)
app.include_router(hedge.router)
app.include_router(allocation.router)
app.include_router(export.router)
