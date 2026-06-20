from contextlib import asynccontextmanager
from fastapi import FastAPI

from replay.database import engine, Base
from replay.routers import history, replay, mutations


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="训练队列异常回放",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(history.router)
app.include_router(replay.router)
app.include_router(mutations.router)


@app.get("/health")
def health():
    return {"status": "ok"}
