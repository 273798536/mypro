from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from models import Experiment, WeatherForecast, ExperimentStatus, Report
from services.trace_service import TraceService
import json


class WeatherService:
    @staticmethod
    def analyze_weather_impact(db: Session, experiment_id: int) -> Dict:
        experiment = db.query(Experiment).filter(Experiment.id == experiment_id).first()
        if not experiment:
            return None

        late_forecasts = (
            db.query(WeatherForecast)
            .filter(
                WeatherForecast.experiment_id == experiment_id,
                WeatherForecast.is_late == True
            )
            .all()
        )

        if not late_forecasts:
            return {
                "experiment_id": experiment_id,
                "experiment_no": experiment.experiment_no,
                "impacted": False,
                "impacted_conclusions": [],
                "late_forecast_count": 0,
                "old_results_preserved": True
            }

        all_forecasts = (
            db.query(WeatherForecast)
            .filter(WeatherForecast.experiment_id == experiment_id)
            .order_by(WeatherForecast.forecast_for_date, WeatherForecast.version)
            .all()
        )

        date_versions = {}
        for f in all_forecasts:
            date_key = f.forecast_for_date.date()
            if date_key not in date_versions:
                date_versions[date_key] = []
            date_versions[date_key].append(f)

        impacted_conclusions = []

        for date, versions in date_versions.items():
            if len(versions) >= 2:
                old_version = versions[0]
                new_version = versions[-1]

                if old_version.wind_speed is not None and new_version.wind_speed is not None:
                    wind_diff = abs(new_version.wind_speed - old_version.wind_speed)
                    if wind_diff > 10:
                        impacted_conclusions.append(
                            f"{date}: 风速由{old_version.wind_speed}m/s修正为{new_version.wind_speed}m/s, "
                            f"差值{wind_diff:.1f}m/s, 可能影响海洋混合层深度估算"
                        )

                if old_version.wave_height is not None and new_version.wave_height is not None:
                    wave_diff = abs(new_version.wave_height - old_version.wave_height)
                    if wave_diff > 1.0:
                        impacted_conclusions.append(
                            f"{date}: 浪高由{old_version.wave_height}m修正为{new_version.wave_height}m, "
                            f"差值{wave_diff:.1f}m, 可能影响气体交换速率计算"
                        )

                if old_version.air_pressure is not None and new_version.air_pressure is not None:
                    pressure_diff = abs(new_version.air_pressure - old_version.air_pressure)
                    if pressure_diff > 10:
                        impacted_conclusions.append(
                            f"{date}: 气压由{old_version.air_pressure}hPa修正为{new_version.air_pressure}hPa, "
                            f"差值{pressure_diff:.1f}hPa, 可能影响CO2分压计算"
                        )

        existing_reports = (
            db.query(Report)
            .filter(Report.experiment_id == experiment_id)
            .order_by(Report.generated_at.desc())
            .all()
        )

        old_results_preserved = len(existing_reports) > 0

        if impacted_conclusions:
            TraceService.add_trace(
                db,
                experiment_id=experiment_id,
                operation="weather_impact_analysis",
                operator="system",
                remark=f"气象预报晚到，检测到{len(impacted_conclusions)}项结论可能受影响",
                affected_data=json.dumps(impacted_conclusions, ensure_ascii=False)
            )

        return {
            "experiment_id": experiment_id,
            "experiment_no": experiment.experiment_no,
            "impacted": len(impacted_conclusions) > 0,
            "impacted_conclusions": impacted_conclusions,
            "late_forecast_count": len(late_forecasts),
            "old_results_preserved": old_results_preserved
        }

    @staticmethod
    def check_late_forecast_warnings(db: Session) -> List[Dict]:
        experiments = db.query(Experiment).all()
        warnings = []

        for exp in experiments:
            impact = WeatherService.analyze_weather_impact(db, exp.id)
            if impact and impact["impacted"]:
                warnings.append(impact)

        return warnings

    @staticmethod
    def get_forecast_versions(db: Session, experiment_id: int) -> List[Dict]:
        forecasts = (
            db.query(WeatherForecast)
            .filter(WeatherForecast.experiment_id == experiment_id)
            .order_by(WeatherForecast.forecast_for_date, WeatherForecast.version)
            .all()
        )

        version_history = {}
        for f in forecasts:
            date_key = f.forecast_for_date.date().isoformat()
            if date_key not in version_history:
                version_history[date_key] = []
            version_history[date_key].append({
                "version": f.version,
                "wind_speed": f.wind_speed,
                "wave_height": f.wave_height,
                "air_pressure": f.air_pressure,
                "is_late": f.is_late,
                "received_at": f.received_at
            })

        return [
            {
                "forecast_date": date,
                "versions": versions
            }
            for date, versions in sorted(version_history.items())
        ]
