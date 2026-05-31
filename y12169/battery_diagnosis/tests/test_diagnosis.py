import os
import sys
import json
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from battery_diagnosis.core.database import get_db, DatabaseManager
from battery_diagnosis.core.models import DataPacket, AnomalyType
from battery_diagnosis.modules.data_parser import parse_packet, DataParser
from battery_diagnosis.modules.range_estimator import estimate_range
from battery_diagnosis.modules.factor_decomposer import decompose_factors
from battery_diagnosis.modules.anomaly_detector import detect_anomalies
from battery_diagnosis.modules.suggestion_engine import generate_suggestions
from battery_diagnosis.modules.diagnosis_service import get_diagnosis_service, BatteryDiagnosisService
from battery_diagnosis.modules.exporter import export_result


TESTS_DIR = Path(__file__).parent
TEST_DATA_DIR = TESTS_DIR


@pytest.fixture(scope="function")
def temp_db():
    temp_dir = tempfile.mkdtemp()
    original_db_path = os.environ.get("DB_PATH")
    os.environ["DB_PATH"] = str(Path(temp_dir) / "test_diagnosis.db")

    import importlib
    from battery_diagnosis.core import config, database
    importlib.reload(config)
    importlib.reload(database)

    DatabaseManager._instance = None

    yield

    DatabaseManager._instance = None
    shutil.rmtree(temp_dir, ignore_errors=True)
    if original_db_path:
        os.environ["DB_PATH"] = original_db_path
    else:
        os.environ.pop("DB_PATH", None)


class TestDataParser:
    def test_parse_vehicle_profile(self):
        parser = DataParser()
        profile_file = TEST_DATA_DIR / "test_vehicle_profile.csv"

        packet = parser.parse_csv(profile_file)

        assert packet.vehicle_profile is not None
        assert packet.vehicle_profile.vin == "LBV1Z3108KM000001"
        assert packet.vehicle_profile.brand == "比亚迪"
        assert packet.vehicle_profile.model == "汉EV"
        assert packet.vehicle_profile.nominal_range_km == 605
        assert packet.vehicle_profile.battery_capacity_kwh == 85.4
        assert packet.vehicle_profile.source_file == "test_vehicle_profile.csv"

    def test_parse_trip_data_low_temp(self):
        parser = DataParser()
        trip_file = TEST_DATA_DIR / "test_trip_data_low_temp.csv"

        packet = parser.parse_csv(trip_file)

        assert len(packet.trip_records) == 12
        trip = packet.trip_records[0]
        assert trip.trip_id == "TRIP001"
        assert trip.avg_temp_c == -12.5
        assert trip.min_temp_c == -15.2
        assert trip.fast_charging_count_7d == 4
        assert trip.source_file == "test_trip_data_low_temp.csv"
        assert trip.source_line == 2

    def test_parse_mixed_packet(self):
        files = [
            TEST_DATA_DIR / "test_vehicle_profile.csv",
            TEST_DATA_DIR / "test_trip_data_low_temp.csv",
            TEST_DATA_DIR / "test_diagnosis_report.csv"
        ]

        packet = parse_packet(files)

        assert packet.vehicle_profile is not None
        assert len(packet.trip_records) == 12
        assert len(packet.diagnosis_reports) == 1
        assert len(packet.raw_files) == 3


class TestRangeEstimator:
    def test_estimate_range_low_temp(self, temp_db):
        files = [
            TEST_DATA_DIR / "test_vehicle_profile.csv",
            TEST_DATA_DIR / "test_trip_data_low_temp.csv"
        ]
        packet = parse_packet(files)

        range_est = estimate_range(packet)

        assert range_est.vin == "LBV1Z3108KM000001"
        assert range_est.nominal_range_km == 605
        assert range_est.actual_estimated_range_km < 605
        assert range_est.battery_health_percent > 70
        assert range_est.confidence_score > 0.5
        assert len(range_est.source_refs) > 0

    def test_estimate_range_with_diagnosis_report(self, temp_db):
        files = [
            TEST_DATA_DIR / "test_vehicle_profile.csv",
            TEST_DATA_DIR / "test_trip_data_low_temp.csv",
            TEST_DATA_DIR / "test_diagnosis_report.csv"
        ]
        packet = parse_packet(files)

        range_est = estimate_range(packet)

        assert range_est.battery_health_percent == 88.5


class TestFactorDecomposer:
    def test_decompose_factors_low_temp(self, temp_db):
        files = [
            TEST_DATA_DIR / "test_vehicle_profile.csv",
            TEST_DATA_DIR / "test_trip_data_low_temp.csv"
        ]
        packet = parse_packet(files)
        range_est = estimate_range(packet)

        factors = decompose_factors(
            packet.vehicle_profile, packet.trip_records, range_est
        )

        assert len(factors) > 0

        temp_factor = next((f for f in factors if f.factor == AnomalyType.LOW_TEMPERATURE), None)
        assert temp_factor is not None
        assert temp_factor.contribution_percent > 20
        assert temp_factor.impact_range_km > 0
        assert len(temp_factor.evidence) > 0
        assert len(temp_factor.source_refs) > 0

        total_percent = sum(f.contribution_percent for f in factors)
        assert abs(total_percent - 100) < 1 or total_percent == 0

    def test_decompose_factors_fast_charge(self, temp_db):
        files = [
            TEST_DATA_DIR / "test_vehicle_profile.csv",
            TEST_DATA_DIR / "test_trip_data_fast_charge.csv"
        ]
        packet = parse_packet(files)
        range_est = estimate_range(packet)

        factors = decompose_factors(
            packet.vehicle_profile, packet.trip_records, range_est
        )

        fc_factor = next((f for f in factors if f.factor == AnomalyType.FAST_CHARGING_EXCESS), None)
        assert fc_factor is not None
        assert fc_factor.contribution_percent > 10


class TestAnomalyDetector:
    def test_detect_low_temperature_anomalies(self, temp_db):
        files = [
            TEST_DATA_DIR / "test_vehicle_profile.csv",
            TEST_DATA_DIR / "test_trip_data_low_temp.csv"
        ]
        packet = parse_packet(files)
        range_est = estimate_range(packet)
        factors = decompose_factors(
            packet.vehicle_profile, packet.trip_records, range_est
        )

        anomalies = detect_anomalies(
            packet.vehicle_profile, packet.trip_records, range_est, factors
        )

        temp_anomalies = [a for a in anomalies if a.anomaly_type == AnomalyType.LOW_TEMPERATURE]
        assert len(temp_anomalies) >= 1

        temp_anomaly = temp_anomalies[0]
        assert temp_anomaly.severity in ["high", "critical", "medium"]
        assert temp_anomaly.affected_range_km > 0
        assert len(temp_anomaly.trip_ids) >= 2
        assert len(temp_anomaly.evidence) > 0
        assert len(temp_anomaly.source_refs) > 0

    def test_detect_fast_charge_anomalies(self, temp_db):
        files = [
            TEST_DATA_DIR / "test_vehicle_profile.csv",
            TEST_DATA_DIR / "test_trip_data_fast_charge.csv"
        ]
        packet = parse_packet(files)
        range_est = estimate_range(packet)
        factors = decompose_factors(
            packet.vehicle_profile, packet.trip_records, range_est
        )

        anomalies = detect_anomalies(
            packet.vehicle_profile, packet.trip_records, range_est, factors
        )

        fc_anomalies = [a for a in anomalies if a.anomaly_type == AnomalyType.FAST_CHARGING_EXCESS]
        assert len(fc_anomalies) >= 1

        fc_anomaly = fc_anomalies[0]
        assert fc_anomaly.severity in ["critical", "high", "medium"]
        assert fc_anomaly.affected_range_km > 0

    def test_anomaly_trip_not_merged_incorrectly(self, temp_db):
        files = [
            TEST_DATA_DIR / "test_vehicle_profile.csv",
            TEST_DATA_DIR / "test_trip_data_low_temp.csv"
        ]
        packet = parse_packet(files)
        range_est = estimate_range(packet)
        factors = decompose_factors(
            packet.vehicle_profile, packet.trip_records, range_est
        )

        anomalies = detect_anomalies(
            packet.vehicle_profile, packet.trip_records, range_est, factors
        )

        temp_anomalies = [a for a in anomalies if a.anomaly_type == AnomalyType.LOW_TEMPERATURE]
        fc_anomalies = [a for a in anomalies if a.anomaly_type == AnomalyType.FAST_CHARGING_EXCESS]

        if temp_anomalies and fc_anomalies:
            temp_trip_ids = set(temp_anomalies[0].trip_ids)
            fc_trip_ids = set(fc_anomalies[0].trip_ids)
            overlap = temp_trip_ids & fc_trip_ids
            assert len(overlap) == 0, "快充异常和低温异常错误地共享了行程ID"


class TestDatabase:
    def test_save_and_get_diagnosis(self, temp_db):
        db = get_db()
        service = get_diagnosis_service()

        files = [
            TEST_DATA_DIR / "test_vehicle_profile.csv",
            TEST_DATA_DIR / "test_trip_data_low_temp.csv"
        ]

        result = service.diagnose_from_files(files, save_result=True)
        diagnosis = result['diagnosis']

        retrieved = db.get_diagnosis_by_id(diagnosis.diagnosis_id)
        assert retrieved is not None
        assert retrieved.diagnosis_id == diagnosis.diagnosis_id
        assert retrieved.vin == diagnosis.vin

    def test_duplicate_detection(self, temp_db):
        service = get_diagnosis_service()

        files = [
            TEST_DATA_DIR / "test_vehicle_profile.csv",
            TEST_DATA_DIR / "test_trip_data_low_temp.csv"
        ]

        result1 = service.diagnose_from_files(files, save_result=True)
        assert result1['is_duplicate'] is False

        result2 = service.diagnose_from_files(files, save_result=True)
        assert result2['is_duplicate'] is True
        assert result2['diagnosis'].diagnosis_id == result1['diagnosis'].diagnosis_id

    def test_diagnosis_history(self, temp_db):
        service = get_diagnosis_service()

        files1 = [
            TEST_DATA_DIR / "test_vehicle_profile.csv",
            TEST_DATA_DIR / "test_trip_data_low_temp.csv"
        ]
        files2 = [
            TEST_DATA_DIR / "test_vehicle_profile.csv",
            TEST_DATA_DIR / "test_trip_data_fast_charge.csv"
        ]

        result1 = service.diagnose_from_files(files1, save_result=True)
        result2 = service.diagnose_from_files(files2, save_result=True)

        history = service.get_history(vin="LBV1Z3108KM000001")
        assert len(history) >= 2

        count = service.get_count(vin="LBV1Z3108KM000001")
        assert count >= 2


class TestDiagnosisService:
    def test_full_diagnosis_low_temp(self, temp_db):
        service = get_diagnosis_service()

        files = [
            TEST_DATA_DIR / "test_vehicle_profile.csv",
            TEST_DATA_DIR / "test_trip_data_low_temp.csv",
            TEST_DATA_DIR / "test_diagnosis_report.csv"
        ]

        result = service.diagnose_from_files(files, save_result=True)

        assert result['is_duplicate'] is False
        diagnosis = result['diagnosis']

        assert diagnosis.vin == "LBV1Z3108KM000001"
        assert diagnosis.range_estimate is not None
        assert len(diagnosis.factor_breakdown) > 0
        assert len(diagnosis.anomalies) > 0
        assert len(diagnosis.recommendations) > 0
        assert diagnosis.summary != ""
        assert diagnosis.data_quality_score > 0.5

        assert 'charts' in result
        assert result['charts'] is not None

        temp_anomalies = [a for a in diagnosis.anomalies if a.anomaly_type == AnomalyType.LOW_TEMPERATURE]
        assert len(temp_anomalies) > 0

        for anomaly in diagnosis.anomalies:
            assert len(anomaly.source_refs) > 0

        for factor in diagnosis.factor_breakdown:
            assert len(factor.source_refs) > 0

    def test_diagnosis_data_quality(self, temp_db):
        service = get_diagnosis_service()

        files = [
            TEST_DATA_DIR / "test_vehicle_profile.csv",
            TEST_DATA_DIR / "test_trip_data_low_temp.csv"
        ]

        result = service.diagnose_from_files(files, save_result=True)
        diagnosis = result['diagnosis']

        assert diagnosis.data_quality_score > 0.7

    def test_source_refs_consistency(self, temp_db):
        service = get_diagnosis_service()

        files = [
            TEST_DATA_DIR / "test_vehicle_profile.csv",
            TEST_DATA_DIR / "test_trip_data_low_temp.csv"
        ]

        result = service.diagnose_from_files(files, save_result=True)
        diagnosis = result['diagnosis']

        all_source_refs = set()
        all_source_refs.update(diagnosis.range_estimate.source_refs)

        for factor in diagnosis.factor_breakdown:
            all_source_refs.update(factor.source_refs)

        for anomaly in diagnosis.anomalies:
            all_source_refs.update(anomaly.source_refs)

        assert len(all_source_refs) > 0

        for ref in all_source_refs:
            assert "test_vehicle_profile.csv" in ref or "test_trip_data_low_temp.csv" in ref


class TestExport:
    def test_export_to_json(self, temp_db):
        service = get_diagnosis_service()

        files = [
            TEST_DATA_DIR / "test_vehicle_profile.csv",
            TEST_DATA_DIR / "test_trip_data_low_temp.csv"
        ]

        result = service.diagnose_from_files(files, save_result=True)
        diagnosis = result['diagnosis']
        trips = result['trips']

        export_path = export_result(diagnosis, trips, format='json')

        assert export_path is not None
        assert export_path.exists()
        assert export_path.suffix == '.json'

        with open(export_path, 'r', encoding='utf-8') as f:
            export_data = json.load(f)

        assert 'diagnosis' in export_data
        assert export_data['diagnosis']['diagnosis_id'] == diagnosis.diagnosis_id

    def test_export_to_csv(self, temp_db):
        service = get_diagnosis_service()

        files = [
            TEST_DATA_DIR / "test_vehicle_profile.csv",
            TEST_DATA_DIR / "test_trip_data_low_temp.csv"
        ]

        result = service.diagnose_from_files(files, save_result=True)
        diagnosis = result['diagnosis']
        trips = result['trips']

        export_paths = export_result(diagnosis, trips, format='csv')

        assert export_paths is not None
        assert len(export_paths) >= 2

        for path in export_paths:
            assert path.exists()
            assert path.suffix == '.csv'

    def test_export_consistency(self, temp_db):
        service = get_diagnosis_service()

        files = [
            TEST_DATA_DIR / "test_vehicle_profile.csv",
            TEST_DATA_DIR / "test_trip_data_low_temp.csv"
        ]

        result = service.diagnose_from_files(files, save_result=True)
        diagnosis = result['diagnosis']
        trips = result['trips']

        json_path = export_result(diagnosis, trips, format='json')

        with open(json_path, 'r', encoding='utf-8') as f:
            export_data = json.load(f)

        exported_diagnosis = export_data['diagnosis']

        assert exported_diagnosis['range_estimate']['actual_estimated_range_km'] == diagnosis.range_estimate.actual_estimated_range_km
        assert len(exported_diagnosis['anomalies']) == len(diagnosis.anomalies)
        assert len(exported_diagnosis['factor_breakdown']) == len(diagnosis.factor_breakdown)

        if diagnosis.anomalies:
            exported_anomaly_types = [a['anomaly_type'] for a in exported_diagnosis['anomalies']]
            anomaly_types = [a.anomaly_type.value for a in diagnosis.anomalies]
            assert exported_anomaly_types == anomaly_types


class TestSuggestionEngine:
    def test_generate_suggestions(self, temp_db):
        service = get_diagnosis_service()

        files = [
            TEST_DATA_DIR / "test_vehicle_profile.csv",
            TEST_DATA_DIR / "test_trip_data_low_temp.csv"
        ]

        result = service.diagnose_from_files(files, save_result=True)
        diagnosis = result['diagnosis']

        suggestions = diagnosis.recommendations

        assert len(suggestions) >= 3

        has_low_temp_suggestion = any("低温" in s or "low_temperature" in s for s in suggestions)
        assert has_low_temp_suggestion

        has_battery_suggestion = any("电池" in s or "battery" in s for s in suggestions)
        assert has_battery_suggestion


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
