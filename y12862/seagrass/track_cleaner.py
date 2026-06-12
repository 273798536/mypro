"""
轨迹清洗模块
和潮汐计算共用同一批 ProcessingRecord，
所有清洗结果写入 record.track_data 和 processing_opinions，
界面、报告、下载都从同一份记录取数。
"""

import math
from typing import List, Tuple

from .models import ProcessingRecord, STAGE_TRACK_CLEANING, RECORD_STATUS_CLEANED


SPEED_THRESHOLD_KMH = 80.0
HEADING_JUMP_THRESHOLD = 60.0
DEPTH_RANGE = (0.5, 80.0)


def haversine_distance_km(lon1: float, lat1: float,
                           lon2: float, lat2: float) -> float:
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dl / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def compute_heading(lon1: float, lat1: float,
                    lon2: float, lat2: float) -> float:
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    heading = math.degrees(math.atan2(dlon, dlat)) % 360.0
    return heading


def clean_track(records: List[ProcessingRecord]) -> Tuple[List[ProcessingRecord], List[dict]]:
    """
    轨迹清洗。
    检查：速度异常、航向跳变、深度异常、定位漂移。
    所有结果写入每条记录，共用处理记录。

    返回：(清洗后的记录列表, 清洗报告明细)
    """
    if not records:
        return records, []

    sorted_recs = sorted(records, key=lambda r: r.survey_time)
    issues = []

    for i, rec in enumerate(sorted_recs):
        track_info = {
            "point_index": i,
            "speed_kmh": None,
            "heading_deg": None,
            "depth_valid": True,
            "speed_valid": True,
            "heading_valid": True,
            "is_outlier": False,
        }

        depth = rec.depth
        if depth < DEPTH_RANGE[0] or depth > DEPTH_RANGE[1]:
            track_info["depth_valid"] = False
            track_info["is_outlier"] = True
            rec.add_flag("track_depth_anomaly")
            issues.append({
                "record_id": rec.record_id,
                "type": "depth_anomaly",
                "detail": f"深度 {depth:.2f}m 超出正常范围 {DEPTH_RANGE}",
            })

        if i > 0:
            prev = sorted_recs[i - 1]
            dist_km = haversine_distance_km(
                prev.longitude, prev.latitude,
                rec.longitude, rec.latitude
            )
            dt_h = (rec.survey_time - prev.survey_time).total_seconds() / 3600.0

            if dt_h > 0:
                speed = dist_km / dt_h
                track_info["speed_kmh"] = round(speed, 2)
                if speed > SPEED_THRESHOLD_KMH:
                    track_info["speed_valid"] = False
                    track_info["is_outlier"] = True
                    rec.add_flag("track_speed_anomaly")
                    issues.append({
                        "record_id": rec.record_id,
                        "type": "speed_anomaly",
                        "detail": f"速度 {speed:.1f} km/h 超过阈值 {SPEED_THRESHOLD_KMH} km/h",
                    })

                heading = compute_heading(
                    prev.longitude, prev.latitude,
                    rec.longitude, rec.latitude
                )
                track_info["heading_deg"] = round(heading, 1)

                if i > 1 and track_info["speed_valid"]:
                    prev_prev = sorted_recs[i - 2]
                    prev_heading = compute_heading(
                        prev_prev.longitude, prev_prev.latitude,
                        prev.longitude, prev.latitude
                    )
                    heading_diff = abs(heading - prev_heading)
                    if heading_diff > 180:
                        heading_diff = 360 - heading_diff
                    if heading_diff > HEADING_JUMP_THRESHOLD:
                        track_info["heading_valid"] = False
                        track_info["is_outlier"] = True
                        rec.add_flag("track_heading_jump")
                        issues.append({
                            "record_id": rec.record_id,
                            "type": "heading_jump",
                            "detail": f"航向跳变 {heading_diff:.1f}° 超过阈值 {HEADING_JUMP_THRESHOLD}°",
                        })

        rec.track_data = track_info

        if track_info["is_outlier"]:
            rec.add_opinion(
                stage=STAGE_TRACK_CLEANING,
                operator="track_cleaner",
                opinion="轨迹清洗发现异常点，已标记",
                decision="flag_outlier",
                evidence={k: v for k, v in track_info.items() if v is not None}
            )
        else:
            rec.status = RECORD_STATUS_CLEANED
            rec.add_opinion(
                stage=STAGE_TRACK_CLEANING,
                operator="track_cleaner",
                opinion="轨迹清洗通过",
                decision="keep",
                evidence={k: v for k, v in track_info.items() if v is not None}
            )

    return sorted_recs, issues
