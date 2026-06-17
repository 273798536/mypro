from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import get_db, engine, Base
from models import ExperimentStatus, BlockReason
from schemas import (
    ExperimentCreate, ExperimentResponse,
    BuoyDataCreate, BuoyDataResponse,
    VesselTrackCreate, VesselTrackResponse,
    WeatherForecastCreate, WeatherForecastResponse,
    RiskNotificationResponse,
    ProcessingTraceResponse,
    ReportResponse, ExportReportResponse,
    StatusUpdateRequest, WeatherImpactResponse,
    MonthlyHandoverResponse, BlockedRecordSummary
)
from services.import_service import ImportService
from services.workflow_service import WorkflowService
from services.trace_service import TraceService
from services.cleaning_service import CleaningService
from services.weather_service import WeatherService
from services.report_service import ReportService
from services.handover_service import HandoverService

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="海洋酸化实验台 API",
    description="支持从数据导入、复核、状态推进到报告导出的完整工作流，重启后保留处理痕迹",
    version="1.0.0"
)


@app.get("/", tags=["系统"])
def root():
    return {
        "name": "海洋酸化实验台",
        "status": "running",
        "workflow": ["导入", "复核", "状态推进", "报告导出"],
        "features": [
            "持久化处理痕迹",
            "深度为负自动拦截",
            "浮标补录级联更新轨迹",
            "气象预报晚到影响提示",
            "风险通报可追溯",
            "月底转交不可用记录清单"
        ]
    }


@app.post("/experiments", response_model=ExperimentResponse, tags=["实验管理"])
def create_experiment(experiment: ExperimentCreate, db: Session = Depends(get_db)):
    existing = ImportService.get_experiment_by_no(db, experiment.experiment_no)
    if existing:
        raise HTTPException(status_code=400, detail="实验编号已存在")
    return ImportService.create_experiment(db, experiment)


@app.get("/experiments", response_model=List[ExperimentResponse], tags=["实验管理"])
def list_experiments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return ImportService.list_experiments(db, skip, limit)


@app.get("/experiments/{experiment_id}", response_model=ExperimentResponse, tags=["实验管理"])
def get_experiment(experiment_id: int, db: Session = Depends(get_db)):
    exp = ImportService.get_experiment(db, experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="实验不存在")
    return exp


@app.post("/buoy-data/import", response_model=List[BuoyDataResponse], tags=["数据导入"])
def import_buoy_data(data: List[BuoyDataCreate], db: Session = Depends(get_db)):
    for item in data:
        exp = ImportService.get_experiment(db, item.experiment_id)
        if not exp:
            raise HTTPException(status_code=404, detail=f"实验ID {item.experiment_id} 不存在")
    return ImportService.import_buoy_data(db, data)


@app.post("/vessel-tracks/import", response_model=List[VesselTrackResponse], tags=["数据导入"])
def import_vessel_tracks(tracks: List[VesselTrackCreate], db: Session = Depends(get_db)):
    for item in tracks:
        exp = ImportService.get_experiment(db, item.experiment_id)
        if not exp:
            raise HTTPException(status_code=404, detail=f"实验ID {item.experiment_id} 不存在")
    return ImportService.import_vessel_tracks(db, tracks)


@app.post("/weather-forecasts/import", response_model=List[WeatherForecastResponse], tags=["数据导入"])
def import_weather_forecasts(forecasts: List[WeatherForecastCreate], db: Session = Depends(get_db)):
    for item in forecasts:
        exp = ImportService.get_experiment(db, item.experiment_id)
        if not exp:
            raise HTTPException(status_code=404, detail=f"实验ID {item.experiment_id} 不存在")
    return ImportService.import_weather_forecast(db, forecasts)


@app.put("/experiments/{experiment_id}/status", response_model=ExperimentResponse, tags=["工作流"])
def update_experiment_status(
    experiment_id: int,
    request: StatusUpdateRequest,
    db: Session = Depends(get_db)
):
    exp = ImportService.get_experiment(db, experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="实验不存在")
    try:
        return WorkflowService.update_status(
            db, experiment_id, request.new_status, request.operator, request.remark
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/experiments/{experiment_id}/review", tags=["工作流"])
def review_experiment(experiment_id: int, db: Session = Depends(get_db)):
    result = WorkflowService.review_experiment_data(db, experiment_id)
    if not result:
        raise HTTPException(status_code=404, detail="实验不存在")
    return result


@app.get("/experiments/{experiment_id}/risks", response_model=List[RiskNotificationResponse], tags=["风险通报"])
def get_experiment_risks(experiment_id: int, resolved: Optional[bool] = None, db: Session = Depends(get_db)):
    exp = ImportService.get_experiment(db, experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="实验不存在")
    return WorkflowService.get_risks_by_experiment(db, experiment_id, resolved)


@app.put("/risks/{notification_id}/resolve", response_model=RiskNotificationResponse, tags=["风险通报"])
def resolve_risk(
    notification_id: int,
    resolved_by: str,
    resolution_note: str,
    db: Session = Depends(get_db)
):
    result = WorkflowService.resolve_risk(db, notification_id, resolved_by, resolution_note)
    if not result:
        raise HTTPException(status_code=404, detail="风险通报不存在")
    return result


@app.post("/experiments/{experiment_id}/clean-tracks", tags=["数据清洗"])
def clean_trajectory(experiment_id: int, db: Session = Depends(get_db)):
    exp = ImportService.get_experiment(db, experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="实验不存在")
    return CleaningService.clean_trajectory(db, experiment_id)


@app.get("/experiments/{experiment_id}/track-cleaning-history", tags=["数据清洗"])
def get_track_cleaning_history(experiment_id: int, db: Session = Depends(get_db)):
    exp = ImportService.get_experiment(db, experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="实验不存在")
    return CleaningService.get_track_cleaning_history(db, experiment_id)


@app.get("/experiments/{experiment_id}/weather-impact", response_model=WeatherImpactResponse, tags=["气象影响"])
def analyze_weather_impact(experiment_id: int, db: Session = Depends(get_db)):
    result = WeatherService.analyze_weather_impact(db, experiment_id)
    if not result:
        raise HTTPException(status_code=404, detail="实验不存在")
    return result


@app.get("/weather-warnings", response_model=List[WeatherImpactResponse], tags=["气象影响"])
def check_all_weather_warnings(db: Session = Depends(get_db)):
    return WeatherService.check_late_forecast_warnings(db)


@app.get("/experiments/{experiment_id}/forecast-versions", tags=["气象影响"])
def get_forecast_versions(experiment_id: int, db: Session = Depends(get_db)):
    exp = ImportService.get_experiment(db, experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="实验不存在")
    return WeatherService.get_forecast_versions(db, experiment_id)


@app.post("/experiments/{experiment_id}/report", response_model=ReportResponse, tags=["报告导出"])
def generate_report(
    experiment_id: int,
    report_type: str = "monthly",
    generated_by: str = None,
    db: Session = Depends(get_db)
):
    exp = ImportService.get_experiment(db, experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="实验不存在")
    report = ReportService.generate_report(db, experiment_id, report_type, generated_by)
    if not report:
        raise HTTPException(status_code=500, detail="报告生成失败")
    return report


@app.get("/reports/{report_id}/export", response_model=ExportReportResponse, tags=["报告导出"])
def export_report(report_id: int, db: Session = Depends(get_db)):
    result = ReportService.get_export_report_data(db, report_id)
    if not result:
        raise HTTPException(status_code=404, detail="报告不存在")
    return result


@app.get("/experiments/{experiment_id}/traces", response_model=List[ProcessingTraceResponse], tags=["历史痕迹"])
def get_experiment_traces(experiment_id: int, db: Session = Depends(get_db)):
    exp = ImportService.get_experiment(db, experiment_id)
    if not exp:
        raise HTTPException(status_code=404, detail="实验不存在")
    return TraceService.get_traces_by_experiment(db, experiment_id)


@app.get("/traces", response_model=List[ProcessingTraceResponse], tags=["历史痕迹"])
def list_all_traces(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return TraceService.get_all_traces(db, skip, limit)


@app.get("/handover/monthly", response_model=MonthlyHandoverResponse, tags=["月底转交"])
def get_monthly_handover(year: int, month: int, db: Session = Depends(get_db)):
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="月份必须在1-12之间")
    return HandoverService.get_monthly_handover(db, year, month)


@app.get("/handover/unavailable-records", response_model=List[BlockedRecordSummary], tags=["月底转交"])
def get_unavailable_records(experiment_id: Optional[int] = None, db: Session = Depends(get_db)):
    return HandoverService.get_unavailable_records(db, experiment_id)


@app.get("/status-definitions", tags=["系统"])
def get_status_definitions():
    return {
        "experiment_status": {s.name: s.value for s in ExperimentStatus},
        "block_reasons": {s.name: s.value for s in BlockReason},
        "status_transitions": {
            k.value: [v.value for v in vs]
            for k, vs in WorkflowService.STATUS_TRANSITIONS.items()
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
