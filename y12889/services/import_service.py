from sqlalchemy.orm import Session
from typing import List
from models import Experiment, BuoyData, VesselTrack, WeatherForecast, ExperimentStatus
from schemas import (
    ExperimentCreate, BuoyDataCreate, VesselTrackCreate, WeatherForecastCreate
)
from services.trace_service import TraceService
from services.workflow_service import WorkflowService
import uuid


class ImportService:
    @staticmethod
    def create_experiment(db: Session, experiment: ExperimentCreate) -> Experiment:
        db_experiment = Experiment(**experiment.model_dump())
        db.add(db_experiment)
        db.flush()

        TraceService.add_trace(
            db,
            experiment_id=db_experiment.id,
            operation="create_experiment",
            new_status=ExperimentStatus.IMPORTED.value,
            remark=f"创建实验记录: {experiment.experiment_no}"
        )

        db.commit()
        db.refresh(db_experiment)
        return db_experiment

    @staticmethod
    def import_buoy_data(db: Session, buoy_data_list: List[BuoyDataCreate]) -> List[BuoyData]:
        results = []
        supplementary_count = 0

        for data in buoy_data_list:
            db_data = BuoyData(**data.model_dump())
            db.add(db_data)
            db.flush()
            results.append(db_data)

            if data.is_supplementary:
                supplementary_count += 1

            experiment = db.query(Experiment).filter(Experiment.id == data.experiment_id).first()
            if experiment:
                if db_data.depth < 0:
                    db_data.data_quality = "blocked"
                    WorkflowService.check_and_notify_risk(
                        db,
                        experiment_id=experiment.id,
                        data_id=db_data.id,
                        data_type="buoy",
                        depth=db_data.depth
                    )
                else:
                    db_data.data_quality = "imported"

        affected_experiment_ids = list(set([d.experiment_id for d in buoy_data_list]))

        if supplementary_count > 0:
            from services.cleaning_service import CleaningService
            for exp_id in affected_experiment_ids:
                CleaningService.recalculate_tracks_after_buoy_update(db, exp_id)

        for exp_id in affected_experiment_ids:
            TraceService.add_trace(
                db,
                experiment_id=exp_id,
                operation="import_buoy_data",
                affected_data=f"导入{len([d for d in buoy_data_list if d.experiment_id == exp_id])}条浮标数据, 补录{supplementary_count}条"
            )

        db.commit()
        for r in results:
            db.refresh(r)
        return results

    @staticmethod
    def import_vessel_tracks(db: Session, tracks: List[VesselTrackCreate]) -> List[VesselTrack]:
        results = []
        for track in tracks:
            db_track = VesselTrack(**track.model_dump())
            db.add(db_track)
            db.flush()
            results.append(db_track)

        affected_experiment_ids = list(set([t.experiment_id for t in tracks]))
        for exp_id in affected_experiment_ids:
            TraceService.add_trace(
                db,
                experiment_id=exp_id,
                operation="import_vessel_tracks",
                affected_data=f"导入{len([t for t in tracks if t.experiment_id == exp_id])}条船舶轨迹"
            )

        db.commit()
        for r in results:
            db.refresh(r)
        return results

    @staticmethod
    def import_weather_forecast(db: Session, forecasts: List[WeatherForecastCreate]) -> List[WeatherForecast]:
        results = []
        late_count = 0

        for forecast in forecasts:
            existing = (
                db.query(WeatherForecast)
                .filter(
                    WeatherForecast.experiment_id == forecast.experiment_id,
                    WeatherForecast.forecast_for_date == forecast.forecast_for_date
                )
                .order_by(WeatherForecast.version.desc())
                .first()
            )

            new_version = existing.version + 1 if existing else 1
            is_late = forecast.is_late or (existing is not None)

            if is_late:
                late_count += 1

            forecast_dict = forecast.model_dump()
            forecast_dict["is_late"] = is_late

            db_forecast = WeatherForecast(
                **forecast_dict,
                version=new_version
            )
            db.add(db_forecast)
            db.flush()
            results.append(db_forecast)

        affected_experiment_ids = list(set([f.experiment_id for f in forecasts]))
        for exp_id in affected_experiment_ids:
            exp_late_count = len([f for f in forecasts if f.experiment_id == exp_id and f.is_late])
            TraceService.add_trace(
                db,
                experiment_id=exp_id,
                operation="import_weather_forecast",
                affected_data=f"导入{len([f for f in forecasts if f.experiment_id == exp_id])}条气象预报, 晚到{exp_late_count}条"
            )

        db.commit()
        for r in results:
            db.refresh(r)
        return results

    @staticmethod
    def get_experiment(db: Session, experiment_id: int) -> Experiment:
        return db.query(Experiment).filter(Experiment.id == experiment_id).first()

    @staticmethod
    def get_experiment_by_no(db: Session, experiment_no: str) -> Experiment:
        return db.query(Experiment).filter(Experiment.experiment_no == experiment_no).first()

    @staticmethod
    def list_experiments(db: Session, skip: int = 0, limit: int = 100):
        return db.query(Experiment).offset(skip).limit(limit).all()
