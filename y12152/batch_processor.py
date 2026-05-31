from typing import List, Dict, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import os
import json
import pandas as pd

from config import OUTPUT_PATHS
from data_models import (
    FlywheelDataRecord,
    TimeSeriesPoint,
    DataStatus,
    BatchProcessingResult,
    CalculationResult,
    ShutdownRecommendation
)
from boundary_checker import BoundaryChecker
from energy_calculator import EnergyCalculator
from material_tracker import MaterialParameterTracker
from shutdown_recommender import ShutdownRecommender


@dataclass
class ProcessedRecord:
    record: FlywheelDataRecord
    energy_result: CalculationResult
    shutdown_recommendation: ShutdownRecommendation
    status: DataStatus


class BatchProcessor:
    def __init__(self):
        self.boundary_checker = BoundaryChecker()
        self.energy_calculator = EnergyCalculator()
        self.material_tracker = MaterialParameterTracker()
        self.shutdown_recommender = ShutdownRecommender(self.boundary_checker)
        self._ensure_output_directories()

    def _ensure_output_directories(self):
        for path in OUTPUT_PATHS.values():
            os.makedirs(path, exist_ok=True)

    def process_single_record(self, record: FlywheelDataRecord) -> ProcessedRecord:
        material_params = None
        if record.experiment_id and self.material_tracker.has_material_params(record.experiment_id):
            material_params = self.material_tracker.get_latest_params(record.experiment_id)

        energy_result = self.energy_calculator.calculate_record_energy(record, material_params)
        
        status = self.boundary_checker.classify_record(record)
        record.status = status
        
        check_result = self.boundary_checker.check_record(record)
        for violation in check_result.violations:
            record.add_violation(violation)

        shutdown_recommendation = self.shutdown_recommender.generate_recommendation(record, energy_result)

        return ProcessedRecord(
            record=record,
            energy_result=energy_result,
            shutdown_recommendation=shutdown_recommendation,
            status=status
        )

    def process_batch(self, records: List[FlywheelDataRecord], batch_id: str = None) -> BatchProcessingResult:
        if batch_id is None:
            batch_id = f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        batch_result = BatchProcessingResult(
            batch_id=batch_id,
            total_records=len(records),
            processed_at=datetime.now()
        )

        for record in records:
            record.batch_id = batch_id
            processed = self.process_single_record(record)

            if processed.status == DataStatus.NORMAL:
                batch_result.normal_count += 1
                batch_result.normal_results.append(processed.record)
            elif processed.status == DataStatus.BOUNDARY:
                batch_result.boundary_count += 1
                batch_result.boundary_cases.append(processed.record)
            elif processed.status == DataStatus.BAD_INPUT:
                batch_result.bad_input_count += 1
                batch_result.bad_inputs.append(processed.record)
            elif processed.status == DataStatus.PENDING_REVIEW:
                batch_result.pending_review_count += 1
                batch_result.pending_review.append(processed.record)

        self._save_batch_results(batch_result)

        return batch_result

    def _save_batch_results(self, batch_result: BatchProcessingResult):
        batch_dir = os.path.join(OUTPUT_PATHS["normal_results"], batch_result.batch_id)
        os.makedirs(batch_dir, exist_ok=True)

        if batch_result.normal_results:
            self._save_records_to_csv(batch_result.normal_results, 
                                      os.path.join(OUTPUT_PATHS["normal_results"], 
                                                   f"{batch_result.batch_id}_normal.csv"))
        
        if batch_result.boundary_cases:
            self._save_records_to_csv(batch_result.boundary_cases,
                                      os.path.join(OUTPUT_PATHS["boundary_cases"],
                                                   f"{batch_result.batch_id}_boundary.csv"))
        
        if batch_result.bad_inputs:
            self._save_records_to_csv(batch_result.bad_inputs,
                                      os.path.join(OUTPUT_PATHS["bad_inputs"],
                                                   f"{batch_result.batch_id}_bad_inputs.csv"))
        
        if batch_result.pending_review:
            self._save_records_to_csv(batch_result.pending_review,
                                      os.path.join(OUTPUT_PATHS["pending_review"],
                                                   f"{batch_result.batch_id}_pending.csv"))

        self._save_batch_summary(batch_result)

    def _save_records_to_csv(self, records: List[FlywheelDataRecord], filepath: str):
        data = []
        for record in records:
            if record.time_series_data:
                max_speed = max(p.speed_rpm for p in record.time_series_data)
                max_vacuum = max(p.vacuum_pa for p in record.time_series_data)
                max_temp = max(p.temperature_c for p in record.time_series_data)
            else:
                max_speed = max_vacuum = max_temp = 0

            data.append({
                "record_id": record.record_id,
                "experiment_id": record.experiment_id,
                "batch_id": record.batch_id,
                "status": record.status.value,
                "violations": [v.value for v in record.violations],
                "max_speed_rpm": max_speed,
                "max_vacuum_pa": max_vacuum,
                "max_temperature_c": max_temp,
                "data_points": len(record.time_series_data),
                "created_at": record.created_at.isoformat(),
                "notes": record.notes
            })

        df = pd.DataFrame(data)
        df.to_csv(filepath, index=False, encoding='utf-8-sig')

    def _save_batch_summary(self, batch_result: BatchProcessingResult):
        summary = {
            "batch_id": batch_result.batch_id,
            "processed_at": batch_result.processed_at.isoformat(),
            "total_records": batch_result.total_records,
            "normal_count": batch_result.normal_count,
            "boundary_count": batch_result.boundary_count,
            "bad_input_count": batch_result.bad_input_count,
            "pending_review_count": batch_result.pending_review_count,
            "breakdown": {
                "normal": [r.record_id for r in batch_result.normal_results],
                "boundary": [r.record_id for r in batch_result.boundary_cases],
                "bad_inputs": [r.record_id for r in batch_result.bad_inputs],
                "pending_review": [r.record_id for r in batch_result.pending_review]
            }
        }

        summary_path = os.path.join(OUTPUT_PATHS["reports"], 
                                    f"{batch_result.batch_id}_summary.json")
        with open(summary_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)

    def load_records_from_csv(self, filepath: str, experiment_id: str = "") -> List[FlywheelDataRecord]:
        df = pd.read_csv(filepath)
        records = []

        required_cols = ['timestamp', 'speed_rpm', 'vacuum_pa', 'temperature_c']
        if not all(col in df.columns for col in required_cols):
            raise ValueError(f"CSV文件必须包含列: {required_cols}")

        if 'record_id' in df.columns:
            for record_id, group in df.groupby('record_id'):
                time_series = []
                for _, row in group.iterrows():
                    point = TimeSeriesPoint(
                        timestamp=pd.to_datetime(row['timestamp']),
                        speed_rpm=float(row['speed_rpm']),
                        vacuum_pa=float(row['vacuum_pa']),
                        temperature_c=float(row['temperature_c'])
                    )
                    time_series.append(point)

                record = FlywheelDataRecord(
                    record_id=str(record_id),
                    experiment_id=experiment_id,
                    time_series_data=time_series
                )
                records.append(record)
        else:
            time_series = []
            for _, row in df.iterrows():
                point = TimeSeriesPoint(
                    timestamp=pd.to_datetime(row['timestamp']),
                    speed_rpm=float(row['speed_rpm']),
                    vacuum_pa=float(row['vacuum_pa']),
                    temperature_c=float(row['temperature_c'])
                )
                time_series.append(point)

            record = FlywheelDataRecord(
                experiment_id=experiment_id,
                time_series_data=time_series
            )
            records.append(record)

        return records

    def get_batch_statistics(self, batch_result: BatchProcessingResult) -> Dict:
        return {
            "batch_id": batch_result.batch_id,
            "total_records": batch_result.total_records,
            "normal_ratio": batch_result.normal_count / batch_result.total_records if batch_result.total_records > 0 else 0,
            "boundary_ratio": batch_result.boundary_count / batch_result.total_records if batch_result.total_records > 0 else 0,
            "bad_input_ratio": batch_result.bad_input_count / batch_result.total_records if batch_result.total_records > 0 else 0,
            "pending_review_ratio": batch_result.pending_review_count / batch_result.total_records if batch_result.total_records > 0 else 0,
            "processed_at": batch_result.processed_at.isoformat()
        }

