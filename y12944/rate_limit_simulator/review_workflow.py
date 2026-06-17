from datetime import datetime
from typing import Dict, List, Optional, Tuple
import uuid

from .models import (
    InterceptResult,
    ManualCorrection,
    ReviewRecord,
    Sample,
    SampleVersion,
)


class ReviewWorkflow:
    def __init__(self):
        self._review_records: Dict[str, List[ReviewRecord]] = {}
        self._corrections: Dict[str, List[ManualCorrection]] = {}
        self._versions: Dict[str, List[SampleVersion]] = {}

    def create_comprehensive_review(
        self,
        sample: Sample,
        version: Optional[SampleVersion],
        reviewer: str,
        model_logs: Dict,
        safety_rules_checked: List[str],
        tool_call_params: Dict,
        review_notes: str,
        is_approved: bool,
    ) -> ReviewRecord:
        sample_id = sample.sample_id
        version_id = version.version_id if version else None

        if sample_id not in self._review_records:
            self._review_records[sample_id] = []
        previous_records = self._review_records[sample_id]
        review_round = len(previous_records) + 1
        previous_review_id = previous_records[-1].review_id if previous_records else None

        review = ReviewRecord(
            review_id=f"review_{uuid.uuid4().hex[:12]}",
            sample_id=sample_id,
            version_id=version_id,
            review_round=review_round,
            reviewer=reviewer,
            review_type="comprehensive",
            review_notes=review_notes,
            is_approved=is_approved,
            model_logs=model_logs,
            safety_rules_checked=safety_rules_checked,
            tool_call_params=tool_call_params,
            previous_review_id=previous_review_id,
        )
        self._review_records[sample_id].append(review)
        return review

    def add_manual_correction(
        self,
        sample: Sample,
        version: Optional[SampleVersion],
        original_prompt: str,
        corrected_prompt: Optional[str],
        original_response: Optional[str],
        corrected_response: Optional[str],
        correction_note: str,
        corrected_by: str,
    ) -> ManualCorrection:
        correction = ManualCorrection(
            correction_id=f"correction_{uuid.uuid4().hex[:12]}",
            sample_id=sample.sample_id,
            version_id=version.version_id if version else None,
            original_prompt=original_prompt,
            corrected_prompt=corrected_prompt,
            original_response=original_response,
            corrected_response=corrected_response,
            correction_note=correction_note,
            corrected_by=corrected_by,
        )
        if sample.sample_id not in self._corrections:
            self._corrections[sample.sample_id] = []
        self._corrections[sample.sample_id].append(correction)
        return correction

    def create_new_version(
        self,
        sample: Sample,
        new_prompt: str,
        new_response: Optional[str],
        created_by: str,
        change_reason: str,
        tool_call_params: Optional[Dict] = None,
        model_logs: Optional[Dict] = None,
    ) -> SampleVersion:
        sample_id = sample.sample_id
        if sample_id not in self._versions:
            self._versions[sample_id] = []
        previous_versions = self._versions[sample_id]
        previous_version_id = previous_versions[-1].version_id if previous_versions else None

        version = SampleVersion(
            version_id=f"version_{uuid.uuid4().hex[:12]}",
            sample_id=sample_id,
            prompt=new_prompt,
            response=new_response,
            prompt_version=sample.prompt_version,
            model_version=sample.model_version,
            created_by=created_by,
            change_reason=change_reason,
            previous_version_id=previous_version_id,
            tool_call_params=tool_call_params,
            model_logs=model_logs,
        )
        self._versions[sample_id].append(version)
        return version

    def approve_correction(
        self, correction_id: str, approved_by: str
    ) -> Optional[ManualCorrection]:
        for corrections in self._corrections.values():
            for correction in corrections:
                if correction.correction_id == correction_id:
                    correction.is_approved = True
                    correction.approved_by = approved_by
                    correction.approved_at = datetime.now()
                    return correction
        return None

    def get_sample_reviews(self, sample_id: str) -> List[ReviewRecord]:
        return self._review_records.get(sample_id, [])

    def get_sample_corrections(self, sample_id: str) -> List[ManualCorrection]:
        return self._corrections.get(sample_id, [])

    def get_sample_versions(self, sample_id: str) -> List[SampleVersion]:
        return self._versions.get(sample_id, [])

    def get_latest_review(self, sample_id: str) -> Optional[ReviewRecord]:
        reviews = self.get_sample_reviews(sample_id)
        return reviews[-1] if reviews else None

    def get_latest_approved_version(
        self, sample_id: str
    ) -> Optional[SampleVersion]:
        versions = self.get_sample_versions(sample_id)
        for version in reversed(versions):
            corrections = self.get_sample_corrections(sample_id)
            for correction in corrections:
                if correction.version_id == version.version_id and correction.is_approved:
                    return version
        return versions[-1] if versions else None

    def get_review_summary(
        self, sample_id: str
    ) -> Dict:
        reviews = self.get_sample_reviews(sample_id)
        corrections = self.get_sample_corrections(sample_id)
        versions = self.get_sample_versions(sample_id)

        approved_count = sum(1 for r in reviews if r.is_approved)
        rejected_count = sum(1 for r in reviews if not r.is_approved)
        approved_corrections = sum(1 for c in corrections if c.is_approved)
        pending_corrections = sum(1 for c in corrections if not c.is_approved)

        return {
            "sample_id": sample_id,
            "total_reviews": len(reviews),
            "approved_count": approved_count,
            "rejected_count": rejected_count,
            "total_corrections": len(corrections),
            "approved_corrections": approved_corrections,
            "pending_corrections": pending_corrections,
            "total_versions": len(versions),
            "latest_review": reviews[-1] if reviews else None,
            "latest_version": versions[-1] if versions else None,
            "has_unresolved_issues": pending_corrections > 0 or rejected_count > 0,
        }

    def build_review_chain(self, sample_id: str) -> List[Dict]:
        reviews = self.get_sample_reviews(sample_id)
        versions = self.get_sample_versions(sample_id)
        corrections = self.get_sample_corrections(sample_id)

        all_events = []
        for version in versions:
            all_events.append(
                {
                    "type": "version",
                    "timestamp": version.created_at,
                    "data": version,
                    "description": f"创建版本 {version.version_id[:8]}，原因：{version.change_reason}",
                }
            )
        for correction in corrections:
            all_events.append(
                {
                    "type": "correction",
                    "timestamp": correction.corrected_at,
                    "data": correction,
                    "description": f"人工修正：{correction.correction_note[:30]}...",
                }
            )
        for review in reviews:
            all_events.append(
                {
                    "type": "review",
                    "timestamp": review.reviewed_at,
                    "data": review,
                    "description": f"第{review.review_round}轮复核，结果：{'通过' if review.is_approved else '未通过'}",
                }
            )

        all_events.sort(key=lambda x: x["timestamp"])
        return all_events
