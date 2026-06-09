from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.config import settings
from app.routers.batch_router import router as batch_router
from app.routers.workflow_router import router as workflow_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.APP_NAME, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(batch_router)
app.include_router(workflow_router)


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "status": "running",
        "database": settings.DATABASE_URL,
        "endpoints": {
            "batches": "/api/batches",
            "docs": "/docs"
        }
    }


@app.get("/health")
def health():
    return {"status": "ok"}
