from typing import Any, Dict, List, Optional, Callable
import uuid
from .models import SampleEvidence, SnapshotRecord, ProcessingStatus


class EvidenceManager:
    def __init__(self):
        self.evidence_store: Dict[str, SampleEvidence] = {}
        self.record_evidence_index: Dict[str, List[str]] = {}
        self.evidence_link_generators: Dict[str, Callable[[str], str]] = {}

    def register_link_generator(self, source_system: str, generator: Callable[[str], str]) -> None:
        self.evidence_link_generators[source_system] = generator

    def collect_evidence(
        self,
        sample_id: str,
        sample_content: Dict[str, Any],
        source_system: Optional[str] = None,
        features: Optional[Dict[str, Any]] = None,
        labels: Optional[Dict[str, Any]] = None,
        notes: Optional[str] = None,
    ) -> SampleEvidence:
        evidence_id = self._generate_evidence_id()

        source_url = None
        if source_system and source_system in self.evidence_link_generators:
            source_url = self.evidence_link_generators[source_system](sample_id)

        evidence = SampleEvidence(
            evidence_id=evidence_id,
            sample_id=sample_id,
            sample_content=sample_content,
            source_url=source_url,
            source_system=source_system,
            features=features or {},
            labels=labels or {},
            notes=notes,
        )

        self.evidence_store[evidence_id] = evidence
        return evidence

    def add_evidence_to_record(
        self, record: SnapshotRecord, evidence: SampleEvidence
    ) -> None:
        record.add_evidence(evidence)
        if record.record_id not in self.record_evidence_index:
            self.record_evidence_index[record.record_id] = []
        if evidence.evidence_id not in self.record_evidence_index[record.record_id]:
            self.record_evidence_index[record.record_id].append(evidence.evidence_id)

    def get_evidence_chain(self, record: SnapshotRecord) -> List[Dict[str, Any]]:
        chain = []
        for evidence in record.evidence_chain:
            chain.append({
                "evidence_id": evidence.evidence_id,
                "sample_id": evidence.sample_id,
                "source_system": evidence.source_system,
                "source_url": evidence.source_url,
                "key_features": self._extract_key_features(evidence),
                "collected_at": evidence.collected_at.isoformat(),
            })
        return chain

    def get_clickable_evidence(self, record: SnapshotRecord) -> List[Dict[str, Any]]:
        result = []
        for evidence in record.evidence_chain:
            result.append({
                "display_text": f"样本 {evidence.sample_id} - 查看原始数据",
                "url": evidence.source_url or f"#/evidence/{evidence.evidence_id}",
                "evidence_id": evidence.evidence_id,
                "sample_id": evidence.sample_id,
                "score_contribution": self._calculate_score_contribution(evidence, record),
            })
        return result

    def find_evidence_by_feature(
        self, record: SnapshotRecord, feature_name: str, feature_value: Any
    ) -> Optional[SampleEvidence]:
        for evidence in record.evidence_chain:
            if evidence.features.get(feature_name) == feature_value:
                return evidence
        return None

    def get_evidence_for_score(
        self, record: SnapshotRecord, score_component: str
    ) -> Optional[SampleEvidence]:
        for evidence in record.evidence_chain:
            if score_component in evidence.features:
                return evidence
        return None

    def build_evidence_summary(self, record: SnapshotRecord) -> Dict[str, Any]:
        evidence_count = len(record.evidence_chain)
        has_clickable = any(e.source_url for e in record.evidence_chain)
        features_covered = set()
        for e in record.evidence_chain:
            features_covered.update(e.features.keys())

        return {
            "record_id": record.record_id,
            "score": record.score,
            "threshold": record.threshold,
            "evidence_count": evidence_count,
            "has_clickable_evidence": has_clickable,
            "features_covered": sorted(list(features_covered)),
            "evidence_chain": self.get_evidence_chain(record),
            "clickable_links": self.get_clickable_evidence(record),
            "status": record.processing_status,
            "is_approved": record.is_approved(),
        }

    def check_evidence_completeness(self, record: SnapshotRecord) -> Dict[str, Any]:
        issues = []
        required_features = ["query_text", "matched_item", "similarity_score"]

        for feature in required_features:
            found = any(feature in e.features for e in record.evidence_chain)
            if not found:
                issues.append(f"缺少特征证据: {feature}")

        if len(record.evidence_chain) == 0:
            issues.append("没有关联任何样本证据")

        if record.processing_status == ProcessingStatus.AWAITING_EVIDENCE:
            issues.append("记录状态为待补充证据")

        return {
            "is_complete": len(issues) == 0,
            "issues": issues,
            "evidence_count": len(record.evidence_chain),
        }

    def get_evidence_by_id(self, evidence_id: str) -> Optional[SampleEvidence]:
        return self.evidence_store.get(evidence_id)

    def get_records_by_evidence(self, evidence_id: str) -> List[str]:
        return [
            record_id
            for record_id, e_ids in self.record_evidence_index.items()
            if evidence_id in e_ids
        ]

    def _generate_evidence_id(self) -> str:
        return f"evi_{str(uuid.uuid4())[:12]}"

    def _extract_key_features(self, evidence: SampleEvidence) -> Dict[str, Any]:
        key_names = ["query_text", "matched_item", "similarity_score", "recall_rank"]
        return {k: v for k, v in evidence.features.items() if k in key_names}

    def _calculate_score_contribution(
        self, evidence: SampleEvidence, record: SnapshotRecord
    ) -> float:
        sim_score = evidence.features.get("similarity_score")
        if sim_score is None:
            return 0.0
        weight = evidence.features.get("weight", 1.0)
        return sim_score * weight
