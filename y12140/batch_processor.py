from typing import List, Optional
from models import (
    ExperimentRecord, BatchResult, SedimentationResult,
    AnomalyRecord, AnomalyType, BoundaryType
)
from validator import DataValidator
from conflict_detector import ConflictDetector
from sedimentation_model import StokesModel


class BatchProcessor:
    def __init__(
        self,
        validator: Optional[DataValidator] = None,
        conflict_detector: Optional[ConflictDetector] = None,
        model: Optional[StokesModel] = None
    ):
        self.validator = validator or DataValidator()
        self.conflict_detector = conflict_detector or ConflictDetector()
        self.model = model or StokesModel()

    def _has_critical_anomaly(self, anomalies: List[AnomalyRecord]) -> bool:
        return any(a.severity == "critical" for a in anomalies)

    def _is_boundary_result(self, result: SedimentationResult) -> bool:
        if result.boundary_info is None:
            return False
        return result.boundary_info.boundary_type in (
            BoundaryType.LOWER,
            BoundaryType.UPPER,
            BoundaryType.NEAR_BOUNDARY
        )

    def _process_single_record(
        self,
        record: ExperimentRecord,
        batch_result: BatchResult
    ) -> None:
        batch_result.total_records += 1

        anomalies, has_critical = self.validator.validate(record)

        if anomalies:
            batch_result.anomalies.extend(anomalies)

        if has_critical:
            return

        conflicts = self.conflict_detector.detect_conflicts(record)
        if conflicts:
            batch_result.merge_conflicts.extend(conflicts)

            for conflict in conflicts:
                anomaly = AnomalyRecord(
                    sample_id=conflict.sample_id,
                    anomaly_type=AnomalyType.MERGE_CONFLICT,
                    severity="warning",
                    message=f"Merge conflict in {conflict.field_name}",
                    human_readable_message=conflict.resolution_note,
                    source_file=record.source_file,
                    line_number=record.line_number,
                    field_name=conflict.field_name,
                    conflict_details={
                        "particle_value": conflict.particle_value,
                        "particle_source": conflict.particle_source,
                        "liquid_value": conflict.liquid_value,
                        "liquid_source": conflict.liquid_source
                    }
                )
                batch_result.anomalies.append(anomaly)

        if record.particle is None or record.liquid is None:
            return

        try:
            result = self.model.calculate(record.particle, record.liquid)

            if self._is_boundary_result(result):
                batch_result.boundary_results.append(result)
            else:
                batch_result.normal_results.append(result)

        except Exception as e:
            anomaly = AnomalyRecord(
                sample_id=record.sample_id,
                anomaly_type=AnomalyType.OUT_OF_BOUNDARY,
                severity="error",
                message=f"Calculation error: {str(e)}",
                human_readable_message=(
                    f"样本【{record.sample_id}】在计算沉降速度时出错：{str(e)}。"
                    f"请检查数据是否有异常。"
                ),
                source_file=record.source_file,
                line_number=record.line_number
            )
            batch_result.anomalies.append(anomaly)

    def process_batch(
        self,
        records: List[ExperimentRecord]
    ) -> BatchResult:
        self.validator.reset()
        self.conflict_detector.reset()

        batch_result = BatchResult()

        for record in records:
            self._process_single_record(record, batch_result)

        return batch_result

    def process_with_separate_sources(
        self,
        particle_records: List[ExperimentRecord],
        liquid_records: List[ExperimentRecord]
    ) -> BatchResult:
        particle_map = {p.sample_id: p.particle for p in particle_records if p.particle}
        liquid_map = {l.sample_id: l.liquid for l in liquid_records if l.liquid}

        all_sample_ids = set(particle_map.keys()) | set(liquid_map.keys())

        merged_records: List[ExperimentRecord] = []
        for sample_id in all_sample_ids:
            particle = particle_map.get(sample_id)
            liquid = liquid_map.get(sample_id)

            if particle is None or liquid is None:
                continue

            particle_record = next(
                (p for p in particle_records if p.sample_id == sample_id),
                None
            )
            liquid_record = next(
                (l for l in liquid_records if l.sample_id == sample_id),
                None
            )

            source_file = ""
            line_number = 0
            if particle_record:
                source_file = particle_record.source_file
                line_number = particle_record.line_number
            elif liquid_record:
                source_file = liquid_record.source_file
                line_number = liquid_record.line_number

            merged_record = ExperimentRecord(
                sample_id=sample_id,
                particle=particle,
                liquid=liquid,
                source_file=source_file,
                line_number=line_number
            )
            merged_records.append(merged_record)

        return self.process_batch(merged_records)

    def get_statistics(self, batch_result: BatchResult) -> dict:
        normal = len(batch_result.normal_results)
        boundary = len(batch_result.boundary_results)
        anomaly = len(batch_result.anomalies)
        conflict = len(batch_result.merge_conflicts)
        total = batch_result.total_records

        critical_anomalies = [
            a for a in batch_result.anomalies
            if a.severity == "critical"
        ]
        warning_anomalies = [
            a for a in batch_result.anomalies
            if a.severity == "warning"
        ]

        anomaly_by_type = {}
        for a in batch_result.anomalies:
            t = a.anomaly_type.value
            anomaly_by_type[t] = anomaly_by_type.get(t, 0) + 1

        return {
            "total_records": total,
            "normal_results": normal,
            "boundary_results": boundary,
            "anomalies": anomaly,
            "critical_anomalies": len(critical_anomalies),
            "warning_anomalies": len(warning_anomalies),
            "merge_conflicts": conflict,
            "success_rate": f"{(normal + boundary) / total * 100:.1f}%" if total > 0 else "N/A",
            "anomaly_by_type": anomaly_by_type
        }
