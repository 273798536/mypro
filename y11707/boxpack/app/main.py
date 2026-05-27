from __future__ import annotations

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api.routes import router as api_router

app = FastAPI(title="Warehouse Box Packing ILP API", version="0.1.0")
app.include_router(api_router)

try:
    app.mount("/static", StaticFiles(directory="static"), name="static")
except RuntimeError:
    pass


@app.get("/")
def index() -> FileResponse:
    return FileResponse("static/index.html")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
