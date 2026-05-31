import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pathlib import Path

from ..core.models import (
    DataPacket, DiagnosisResult, VehicleProfile, TripRecord,
    RangeEstimate, FactorContribution, AnomalyInstance
)
from ..core.database import get_db, DatabaseManager
from ..core.config import MIN_TRIPS_FOR_RELIABLE_ESTIMATE

from .data_parser import parse_packet, DataParser
from .range_estimator import estimate_range
from .factor_decomposer import decompose_factors
from .anomaly_detector import detect_anomalies
from .suggestion_engine import generate_suggestions
from .chart_generator import generate_charts
from .exporter import export_result


class BatteryDiagnosisService:
    def __init__(self):
        self.db: DatabaseManager = get_db()
        self.parser = DataParser()

    def _calculate_data_quality(
        self,
        vehicle_profile: Optional[VehicleProfile],
        trips: List[TripRecord]
    ) -> float:
        score = 0.0
        max_score = 0.0

        if vehicle_profile:
            score += 0.2
        max_score += 0.2

        trip_count = len(trips)
        if trip_count >= MIN_TRIPS_FOR_RELIABLE_ESTIMATE:
            score += 0.4
        elif trip_count >= 3:
            score += 0.25
        elif trip_count >= 1:
            score += 0.1
        max_score += 0.4

        valid_trips = 0
        for trip in trips:
            if (trip.distance_km >= 1.0 and
                trip.start_soc > trip.end_soc and
                5 <= trip.avg_speed_kmh <= 120):
                valid_trips += 1

        if trip_count > 0:
            quality_ratio = valid_trips / trip_count
            score += quality_ratio * 0.25
        max_score += 0.25

        temp_complete = sum(1 for t in trips if t.avg_temp_c is not None)
        if trip_count > 0:
            score += (temp_complete / trip_count) * 0.15
        max_score += 0.15

        return score / max_score if max_score > 0 else 0.0

    def _generate_summary(
        self,
        range_estimate: RangeEstimate,
        factor_breakdown: List[FactorContribution],
        anomalies: List[AnomalyInstance],
        data_quality: float
    ) -> str:
        range_deficit = range_estimate.nominal_range_km - range_estimate.actual_estimated_range_km
        deficit_percent = (range_deficit / range_estimate.nominal_range_km) * 100 if range_estimate.nominal_range_km > 0 else 0

        parts = []

        if deficit_percent > 10:
            parts.append(f"车辆续航衰减明显，实际续航较标称值低{deficit_percent:.1f}%({range_deficit:.0f}km)。")
        elif deficit_percent > 5:
            parts.append(f"车辆续航略有衰减，实际续航较标称值低{deficit_percent:.1f}%({range_deficit:.0f}km)。")
        else:
            parts.append("车辆续航表现正常，与标称值偏差在合理范围内。")

        if factor_breakdown:
            top_factor = factor_breakdown[0]
            factor_names = {
                'low_temperature': '低温环境',
                'fast_charging_excess': '频繁快充',
                'abnormal_trip': '行程异常',
                'battery_degradation': '电池衰减',
                'driving_habit': '驾驶习惯',
            }
            factor_name = factor_names.get(top_factor.factor.value, top_factor.factor.value)
            parts.append(f"主要影响因素为{factor_name}，贡献度{top_factor.contribution_percent:.1f}%。")

        if anomalies:
            critical_count = sum(1 for a in anomalies if a.severity == 'critical')
            high_count = sum(1 for a in anomalies if a.severity == 'high')
            if critical_count > 0:
                parts.append(f"检测到{critical_count}个严重异常，{high_count}个高度异常，建议尽快处理。")
            elif high_count > 0:
                parts.append(f"检测到{high_count}个高度异常，建议及时处理。")
            else:
                parts.append(f"检测到{len(anomalies)}个异常，建议关注并采取改善措施。")

        if data_quality < 0.6:
            parts.append(f"当前数据质量评分为{data_quality:.2f}，建议补充更多有效行程数据以提高诊断准确性。")

        return "".join(parts)

    def diagnose(
        self,
        packet: DataPacket,
        save_result: bool = True
    ) -> Dict[str, Any]:
        if not packet.vehicle_profile:
            raise ValueError("缺少车辆档案数据，无法进行诊断")

        if not packet.trip_records:
            raise ValueError("缺少行程数据，无法进行诊断")

        data_quality = self._calculate_data_quality(
            packet.vehicle_profile, packet.trip_records
        )

        range_estimate = estimate_range(packet)

        factor_breakdown = decompose_factors(
            packet.vehicle_profile, packet.trip_records, range_estimate
        )

        anomalies = detect_anomalies(
            packet.vehicle_profile, packet.trip_records,
            range_estimate, factor_breakdown
        )

        diagnosis_id = f"DIAG_{uuid.uuid4().hex[:12].upper()}"

        diagnosis_result = DiagnosisResult(
            diagnosis_id=diagnosis_id,
            vin=packet.vehicle_profile.vin,
            packet_id=packet.packet_id,
            range_estimate=range_estimate,
            factor_breakdown=factor_breakdown,
            anomalies=anomalies,
            recommendations=[],
            summary="",
            data_quality_score=round(data_quality, 3)
        )

        diagnosis_result.summary = self._generate_summary(
            range_estimate, factor_breakdown, anomalies, data_quality
        )

        diagnosis_result.recommendations = generate_suggestions(diagnosis_result)

        duplicate = self.db.check_duplicate(diagnosis_result)
        if duplicate:
            existing_result = self.db.get_diagnosis_by_id(duplicate.diagnosis_id)
            return {
                'diagnosis': existing_result,
                'is_duplicate': True,
                'existing_id': duplicate.diagnosis_id,
                'trips': packet.trip_records
            }

        if save_result:
            self.db.save_diagnosis_result(diagnosis_result)

        charts = generate_charts(diagnosis_result, packet.trip_records, to_base64=True)

        return {
            'diagnosis': diagnosis_result,
            'is_duplicate': False,
            'charts': charts,
            'trips': packet.trip_records
        }

    def diagnose_from_files(
        self,
        file_paths: List[Union[str, Path]],
        save_result: bool = True
    ) -> Dict[str, Any]:
        packet = parse_packet(file_paths)
        return self.diagnose(packet, save_result=save_result)

    def export_diagnosis(
        self,
        diagnosis_id: str,
        format: str = 'excel'
    ) -> Optional[Union[Path, List[Path]]]:
        diagnosis = self.db.get_diagnosis_by_id(diagnosis_id)
        if not diagnosis:
            return None

        history = self.db.get_diagnosis_history(vin=diagnosis.vin, limit=1)
        trips = []
        if history:
            pass

        return export_result(diagnosis, trips, format=format)

    def get_diagnosis(self, diagnosis_id: str) -> Optional[DiagnosisResult]:
        return self.db.get_diagnosis_by_id(diagnosis_id)

    def get_history(
        self,
        vin: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[DiagnosisResult]:
        return self.db.get_diagnosis_history(vin, start_date, end_date, limit, offset)

    def get_count(self, vin: Optional[str] = None) -> int:
        return self.db.get_diagnosis_count(vin)

    def delete_diagnosis(self, diagnosis_id: str) -> bool:
        return self.db.delete_diagnosis(diagnosis_id)


def get_diagnosis_service() -> BatteryDiagnosisService:
    return BatteryDiagnosisService()
