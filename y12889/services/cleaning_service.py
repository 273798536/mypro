from sqlalchemy.orm import Session
from typing import List, Dict
from datetime import datetime
from models import VesselTrack, BuoyData, Experiment
from services.trace_service import TraceService
import math


class CleaningService:
    @staticmethod
    def clean_trajectory(db: Session, experiment_id: int) -> Dict:
        tracks = (
            db.query(VesselTrack)
            .filter(VesselTrack.experiment_id == experiment_id)
            .order_by(VesselTrack.record_time)
            .all()
        )

        if not tracks:
            return {"cleaned": 0, "anomalies": 0, "version": 1}

        max_version = max([t.cleaning_version for t in tracks]) if tracks else 1
        new_version = max_version + 1

        anomaly_count = 0
        cleaned_count = 0

        for i, track in enumerate(tracks):
            was_anomaly = track.anomaly_flag

            track.is_cleaned = True
            track.cleaning_version = new_version

            if i > 0:
                prev_track = tracks[i - 1]
                time_diff = (track.record_time - prev_track.record_time).total_seconds() / 3600.0

                if time_diff > 0:
                    distance = CleaningService._haversine_distance(
                        prev_track.latitude, prev_track.longitude,
                        track.latitude, track.longitude
                    )
                    calculated_speed = distance / time_diff

                    if calculated_speed > 60:
                        track.anomaly_flag = True
                        track.anomaly_reason = f"速度异常: {calculated_speed:.2f}节, 超过最大航速60节"
                    elif abs(track.latitude) > 90 or abs(track.longitude) > 180:
                        track.anomaly_flag = True
                        track.anomaly_reason = "经纬度超出有效范围"
                    else:
                        track.anomaly_flag = False
                        track.anomaly_reason = None
                else:
                    track.anomaly_flag = prev_track.anomaly_flag
                    track.anomaly_reason = prev_track.anomaly_reason

            if track.anomaly_flag:
                anomaly_count += 1
            if not was_anomaly and track.anomaly_flag:
                cleaned_count += 1

        TraceService.add_trace(
            db,
            experiment_id=experiment_id,
            operation="clean_trajectory",
            affected_data=f"清洗{len(tracks)}条轨迹, 发现{anomaly_count}个异常点, 清洗版本v{new_version}"
        )

        db.commit()
        return {
            "cleaned": len(tracks),
            "anomalies": anomaly_count,
            "version": new_version
        }

    @staticmethod
    def recalculate_tracks_after_buoy_update(db: Session, experiment_id: int) -> Dict:
        buoy_data = (
            db.query(BuoyData)
            .filter(
                BuoyData.experiment_id == experiment_id,
                BuoyData.depth >= 0
            )
            .all()
        )

        tracks = (
            db.query(VesselTrack)
            .filter(VesselTrack.experiment_id == experiment_id)
            .all()
        )

        if not buoy_data or not tracks:
            return {"updated": 0, "recalculated": False}

        max_version = max([t.cleaning_version for t in tracks]) if tracks else 1
        new_version = max_version + 1

        for track in tracks:
            nearest_buoy = min(
                buoy_data,
                key=lambda b: abs((b.record_time - track.record_time).total_seconds())
            )

            time_diff = abs((nearest_buoy.record_time - track.record_time).total_seconds())

            if time_diff < 1800:
                track.is_cleaned = True
                track.cleaning_version = new_version
                if track.anomaly_flag and nearest_buoy.depth >= 0:
                    track.anomaly_flag = False
                    track.anomaly_reason = None

        TraceService.add_trace(
            db,
            experiment_id=experiment_id,
            operation="recalculate_tracks",
            affected_data=f"浮标数据补录后重新计算轨迹, 涉及{len(tracks)}条轨迹, 版本v{new_version}"
        )

        db.flush()

        return {
            "updated": len(tracks),
            "recalculated": True,
            "new_version": new_version
        }

    @staticmethod
    def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 3440.069

        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)

        a = (math.sin(delta_lat / 2) ** 2 +
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c

    @staticmethod
    def get_track_cleaning_history(db: Session, experiment_id: int) -> List[Dict]:
        tracks = (
            db.query(VesselTrack)
            .filter(VesselTrack.experiment_id == experiment_id)
            .all()
        )

        if not tracks:
            return []

        versions = {}
        for track in tracks:
            v = track.cleaning_version
            if v not in versions:
                versions[v] = {"count": 0, "anomalies": 0}
            versions[v]["count"] += 1
            if track.anomaly_flag:
                versions[v]["anomalies"] += 1

        return [
            {
                "version": v,
                "total_records": data["count"],
                "anomaly_count": data["anomalies"]
            }
            for v, data in sorted(versions.items(), reverse=True)
        ]
