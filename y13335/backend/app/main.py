from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .routers import samples, versions, evaluations, corrections, history, conclusions
from . import seed_data

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="知识库召回证据复核系统",
    description="用于知识库召回的证据复核，支持版本对比、人工修正追溯、复核结论生成",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(samples.router, prefix="/api")
app.include_router(versions.router, prefix="/api")
app.include_router(evaluations.router, prefix="/api")
app.include_router(corrections.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(conclusions.router, prefix="/api")


@app.on_event("startup")
def startup_event():
    from .database import SessionLocal
    db = SessionLocal()
    try:
        seed_data.seed_all(db)
    finally:
        db.close()


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "知识库召回证据复核系统运行正常"}


@app.get("/api/dashboard")
def get_dashboard():
    from .database import SessionLocal
    from . import models
    from sqlalchemy import func

    db = SessionLocal()
    try:
        total_samples = db.query(func.count(models.Sample.id)).scalar()
        total_versions = db.query(func.count(models.AlgorithmVersion.id)).scalar()
        total_corrections = db.query(func.count(models.ManualCorrection.id)).scalar()
        total_conclusions = db.query(func.count(models.ReviewConclusion.id)).scalar()

        active_version = db.query(models.AlgorithmVersion).filter(
            models.AlgorithmVersion.is_active == True
        ).first()

        pending_corrections = db.query(func.count(models.ManualCorrection.id)).filter(
            models.ManualCorrection.process_status == "pending"
        ).scalar()

        recent_histories = db.query(models.ReviewHistory).order_by(
            models.ReviewHistory.created_at.desc()
        ).limit(5).all()

        return {
            "total_samples": total_samples,
            "total_versions": total_versions,
            "total_corrections": total_corrections,
            "total_conclusions": total_conclusions,
            "active_version": active_version,
            "pending_corrections": pending_corrections,
            "recent_histories": recent_histories,
        }
    finally:
        db.close()
