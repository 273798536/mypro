from typing import Any, Dict, List, Optional, Tuple
import uuid
from .models import (
    SnapshotRecord,
    GrayConfig,
    SampleEvidence,
    ProcessingStatus,
    Decision,
)
from .config_parser import GrayConfigParser
from .evidence_manager import EvidenceManager
from .duplicate_detector import DuplicateDetector
from .bad_data_detector import BadDataDetector
from .revision_explainer import RevisionExplainer, RevisionExplanation
from .decision_engine import DecisionEngine


class VectorIndexSnapshotManager:
    def __init__(self):
        self.config_parser = GrayConfigParser()
        self.evidence_manager = EvidenceManager()
        self.duplicate_detector = DuplicateDetector()
        self.bad_data_detector = BadDataDetector()
        self.revision_explainer = RevisionExplainer()
        self.decision_engine = DecisionEngine(
            evidence_manager=self.evidence_manager,
            bad_data_detector=self.bad_data_detector,
        )
        self.records: Dict[str, SnapshotRecord] = {}
        self.raw_config_rows: List[Dict[str, Any]] = []

    def create_snapshot(
        self,
        run_id: str,
        vector_index_version: str,
        raw_gray_config: Dict[str, Any],
        score: float,
        threshold: float,
        raw_mean_score: Optional[float] = None,
        sample_size: Optional[int] = None,
        source_line: Optional[int] = None,
        source_type: str = "manual",
        previous_result: Optional[Dict[str, Any]] = None,
    ) -> SnapshotRecord:
        record_id = self._generate_record_id()

        gray_config = self.config_parser.parse(
            raw_config=raw_gray_config,
            source_type=source_type,
            source_line=source_line,
        )

        small_sample_size = gray_config.normalized_config.get("small_sample_size")
        mean_mask_ratio = gray_config.normalized_config.get("mean_mask_ratio")
        small_sample_masked = False
        mask_reason = None

        if (
            sample_size is not None
            and small_sample_size is not None
            and mean_mask_ratio is not None
            and raw_mean_score is not None
        ):
            if sample_size < small_sample_size:
                ratio = raw_mean_score / threshold if threshold > 0 else 0
                if ratio >= mean_mask_ratio:
                    small_sample_masked = True
                    mask_reason = (
                        f"样本量{sample_size} < 阈值{small_sample_size}，"
                        f"且均值覆盖比{ratio:.2f} >= 配置{mean_mask_ratio}，"
                        f"已被均值掩盖"
                    )

        record = SnapshotRecord(
            record_id=record_id,
            run_id=run_id,
            vector_index_version=vector_index_version,
            gray_config=gray_config,
            score=score,
            threshold=threshold,
            processing_status=ProcessingStatus.NORMAL,
            raw_mean_score=raw_mean_score,
            small_sample_masked=small_sample_masked,
            small_sample_mask_reason=mask_reason,
            previous_result=previous_result,
        )

        try:
            self.duplicate_detector.register_record(record)
        except Exception:
            pass

        self.bad_data_detector.validate_record(record)

        self.records[record_id] = record
        return record

    def create_snapshots_from_configs(
        self,
        config_rows: List[Dict[str, Any]],
        run_id_field: str = "run_id",
        version_field: str = "vector_index_version",
        score_field: str = "score",
        threshold_field: str = "threshold",
    ) -> List[SnapshotRecord]:
        self.raw_config_rows = config_rows.copy()
        records = []

        for idx, row in enumerate(config_rows):
            raw_config = {k: v for k, v in row.items() if k not in [run_id_field, version_field, score_field, threshold_field]}

            record = self.create_snapshot(
                run_id=row.get(run_id_field, f"unknown_{idx}"),
                vector_index_version=row.get(version_field, "unknown"),
                raw_gray_config=raw_config,
                score=row.get(score_field, 0.0),
                threshold=row.get(threshold_field, 0.5),
                source_line=idx + 1,
                source_type="batch",
            )
            records.append(record)

        return records

    def add_sample_evidence(
        self,
        record_id: str,
        sample_id: str,
        sample_content: Dict[str, Any],
        source_system: Optional[str] = None,
        features: Optional[Dict[str, Any]] = None,
        labels: Optional[Dict[str, Any]] = None,
        notes: Optional[str] = None,
    ) -> Optional[SampleEvidence]:
        record = self.records.get(record_id)
        if not record:
            return None

        evidence = self.evidence_manager.collect_evidence(
            sample_id=sample_id,
            sample_content=sample_content,
            source_system=source_system,
            features=features,
            labels=labels,
            notes=notes,
        )

        self.evidence_manager.add_evidence_to_record(record, evidence)

        if record.processing_status == ProcessingStatus.AWAITING_EVIDENCE:
            completeness = self.evidence_manager.check_evidence_completeness(record)
            if completeness["is_complete"]:
                record.processing_status = ProcessingStatus.NORMAL

        return evidence

    def explain_misjudged_sample(
        self,
        record_id: str,
        misjudged_sample: SampleEvidence,
        old_model_label: str,
    ) -> Optional[RevisionExplanation]:
        record = self.records.get(record_id)
        if not record:
            return None

        explanation = self.revision_explainer.explain_misjudged_sample(
            misjudged_sample=misjudged_sample,
            new_record=record,
            old_model_label=old_model_label,
        )

        record.previous_result = {
            "score": misjudged_sample.labels.get("old_score", 0.0),
            "is_approved": old_model_label == "positive",
            "status": ProcessingStatus.NORMAL.value,
        }
        record.processing_status = ProcessingStatus.REVISED

        return explanation

    def get_masking_relationship(self, record_id: str) -> Optional[Dict[str, Any]]:
        record = self.records.get(record_id)
        if not record:
            return None

        return self.config_parser.get_relationship_report(record.gray_config)

    def get_all_masking_relationships(self) -> List[Dict[str, Any]]:
        return [
            self.get_masking_relationship(rid)
            for rid in self.records
            if self.get_masking_relationship(rid) is not None
        ]

    def get_clickable_evidence(self, record_id: str) -> Optional[List[Dict[str, Any]]]:
        record = self.records.get(record_id)
        if not record:
            return None
        return self.evidence_manager.get_clickable_evidence(record)

    def pinpoint_bad_data_source(
        self, record_id: str, field_name: str
    ) -> Optional[Dict[str, Any]]:
        record = self.records.get(record_id)
        if not record:
            return None
        return self.bad_data_detector.find_original_row(
            record.gray_config, field_name, self.raw_config_rows
        )

    def process_all(self) -> Tuple[List[Decision], str]:
        records_list = list(self.records.values())
        decisions = self.decision_engine.make_batch_decisions(records_list)
        summary = self.decision_engine.print_summary_for_xu()
        return decisions, summary

    def get_record(self, record_id: str) -> Optional[SnapshotRecord]:
        return self.records.get(record_id)

    def get_all_records(self) -> List[SnapshotRecord]:
        return list(self.records.values())

    def get_records_by_status(self, status: ProcessingStatus) -> List[SnapshotRecord]:
        return [r for r in self.records.values() if r.processing_status == status]

    def get_duplicate_summary(self) -> Dict[str, Any]:
        return self.duplicate_detector.get_duplicate_summary()

    def get_bad_data_summary(self) -> Dict[str, Any]:
        return self.bad_data_detector.get_bad_data_summary()

    def register_evidence_link_generator(
        self, source_system: str, generator
    ) -> None:
        self.evidence_manager.register_link_generator(source_system, generator)

    def clear(self) -> None:
        self.records.clear()
        self.raw_config_rows.clear()
        self.duplicate_detector.clear()
        self.decision_engine.clear()

    def _generate_record_id(self) -> str:
        return f"rec_{str(uuid.uuid4())[:12]}"
