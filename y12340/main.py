from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.database import engine, Base
from app.api.experiments import router as experiments_router
from app.config import settings

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

app.include_router(experiments_router, prefix="/api/v1/experiments", tags=["experiments"])

app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.get("/")
def read_root():
    return FileResponse("app/templates/index.html")


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
