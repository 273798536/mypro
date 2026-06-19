import json
import os
import csv
from typing import List, Optional, Dict, Tuple
from datetime import datetime
from pathlib import Path

from data_models import (
    VersionNote,
    ScheduleRecommendation,
    ManualCorrection,
    EvidenceReviewRecord,
    ReviewSummary,
    ReviewStatus,
    CorrectionType,
)


class ScheduleReviewEngine:
    def __init__(self, data_dir: str = "review_data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)

        self.version_notes: Dict[str, VersionNote] = {}
        self.recommendations: Dict[str, ScheduleRecommendation] = {}
        self.manual_corrections: Dict[str, ManualCorrection] = {}
        self.review_records: Dict[str, EvidenceReviewRecord] = {}

        self._load_all_data()

    def _load_all_data(self):
        self._load_version_notes()
        self._load_recommendations()
        self._load_manual_corrections()
        self._load_review_records()

    def _load_version_notes(self):
        path = self.data_dir / "version_notes.json"
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data:
                    vn = VersionNote(**item)
                    self.version_notes[vn.version_id] = vn

    def _load_recommendations(self):
        path = self.data_dir / "recommendations.json"
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data:
                    rec = ScheduleRecommendation(**item)
                    self.recommendations[rec.recommendation_id] = rec

    def _load_manual_corrections(self):
        path = self.data_dir / "manual_corrections.json"
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data:
                    ct = CorrectionType(item["correction_type"]) if isinstance(item["correction_type"], str) else item["correction_type"]
                    item["correction_type"] = ct
                    mc = ManualCorrection(**item)
                    self.manual_corrections[mc.correction_id] = mc

    def _load_review_records(self):
        path = self.data_dir / "review_records.json"
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data:
                    st = ReviewStatus(item["status"]) if isinstance(item["status"], str) else item["status"]
                    item["status"] = st
                    rr = EvidenceReviewRecord(**item)
                    self.review_records[rr.review_id] = rr

    def save_all_data(self):
        self._save_version_notes()
        self._save_recommendations()
        self._save_manual_corrections()
        self._save_review_records()

    def _save_version_notes(self):
        path = self.data_dir / "version_notes.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump([vn.__dict__ for vn in self.version_notes.values()], f, ensure_ascii=False, indent=2)

    def _save_recommendations(self):
        path = self.data_dir / "recommendations.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump([rec.__dict__ for rec in self.recommendations.values()], f, ensure_ascii=False, indent=2)

    def _save_manual_corrections(self):
        path = self.data_dir / "manual_corrections.json"
        with open(path, "w", encoding="utf-8") as f:
            data = []
            for mc in self.manual_corrections.values():
                d = mc.__dict__.copy()
                d["correction_type"] = mc.correction_type.value
                data.append(d)
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _save_review_records(self):
        path = self.data_dir / "review_records.json"
        with open(path, "w", encoding="utf-8") as f:
            data = []
            for rr in self.review_records.values():
                d = rr.__dict__.copy()
                d["status"] = rr.status.value
                data.append(d)
            json.dump(data, f, ensure_ascii=False, indent=2)

    def add_version_note(self, version_note: VersionNote) -> str:
        self.version_notes[version_note.version_id] = version_note
        self.save_all_data()
        return version_note.version_id

    def add_recommendation(self, recommendation: ScheduleRecommendation) -> str:
        self.recommendations[recommendation.recommendation_id] = recommendation
        self.save_all_data()
        return recommendation.recommendation_id

    def add_manual_correction(self, correction: ManualCorrection) -> str:
        if correction.related_version_id and correction.related_version_id not in self.version_notes:
            raise ValueError(f"引用的版本说明不存在: {correction.related_version_id}")

        existing = self._get_latest_correction(correction.recommendation_id)
        if existing and not existing.is_overridden:
            existing.is_overridden = True
            existing.overridden_by = correction.correction_id
            existing.overridden_at = datetime.now().isoformat()
            existing.override_reason = f"被新结果覆盖: {correction.corrected_result}"

        self.manual_corrections[correction.correction_id] = correction
        self.save_all_data()
        return correction.correction_id

    def _get_latest_correction(self, recommendation_id: str) -> Optional[ManualCorrection]:
        corrections = [
            mc for mc in self.manual_corrections.values()
            if mc.recommendation_id == recommendation_id
        ]
        if not corrections:
            return None
        corrections.sort(key=lambda x: x.corrected_at, reverse=True)
        return corrections[0]

    def _build_evidence_chain(self, recommendation_id: str) -> Tuple[List[Dict], List[str]]:
        evidence_chain = []
        missing_refs = []

        rec = self.recommendations.get(recommendation_id)
        if not rec:
            missing_refs.append(f"推荐记录不存在: {recommendation_id}")
            return evidence_chain, missing_refs

        evidence_chain.append({
            "type": "original_recommendation",
            "id": rec.recommendation_id,
            "description": f"原始推荐: {rec.original_recommendation}",
            "model_version": rec.model_version,
            "confidence": rec.confidence_score,
            "timestamp": rec.generated_at,
        })

        if rec.rule_matches:
            for rule_id in rec.rule_matches:
                found = False
                for vn in self.version_notes.values():
                    if rule_id in vn.related_rules:
                        evidence_chain.append({
                            "type": "version_reference",
                            "id": vn.version_id,
                            "rule_id": rule_id,
                            "title": vn.title,
                            "description": vn.description,
                            "publish_date": vn.publish_date,
                            "evidence_reference": vn.evidence_reference,
                        })
                        if not vn.evidence_reference:
                            missing_refs.append(f"版本说明[{vn.version_id}]缺少证据引用")
                        found = True
                        break
                if not found:
                    missing_refs.append(f"规则[{rule_id}]无对应版本说明")

        corrections = [
            mc for mc in self.manual_corrections.values()
            if mc.recommendation_id == recommendation_id
        ]
        corrections.sort(key=lambda x: x.corrected_at)

        for mc in corrections:
            chain_item = {
                "type": "correction",
                "id": mc.correction_id,
                "correction_type": mc.correction_type.value,
                "original": mc.original_result,
                "corrected": mc.corrected_result,
                "reason": mc.reason,
                "operator": mc.operator,
                "timestamp": mc.corrected_at,
                "is_overridden": mc.is_overridden,
            }

            if mc.related_version_id:
                vn = self.version_notes.get(mc.related_version_id)
                if vn:
                    chain_item["version_reference"] = {
                        "id": vn.version_id,
                        "title": vn.title,
                        "description": vn.description,
                    }
                else:
                    missing_refs.append(f"改判[{mc.correction_id}]引用的版本[{mc.related_version_id}]不存在")

            if mc.evidence_reference:
                chain_item["evidence_reference"] = mc.evidence_reference
            elif mc.correction_type == CorrectionType.MANUAL_JUDGMENT:
                missing_refs.append(f"人工改判[{mc.correction_id}]缺少证据引用")

            if mc.is_overridden:
                chain_item["override_info"] = {
                    "overridden_by": mc.overridden_by,
                    "overridden_at": mc.overridden_at,
                    "override_reason": mc.override_reason,
                }

            evidence_chain.append(chain_item)

        return evidence_chain, missing_refs

    def _explain_judgment_change(self, recommendation_id: str, old_model_version: str, new_model_version: str) -> str:
        rec = self.recommendations.get(recommendation_id)
        if not rec:
            return "无法找到推荐记录"

        explanations = []

        old_corrections = [
            mc for mc in self.manual_corrections.values()
            if mc.recommendation_id == recommendation_id
            and not mc.is_overridden
        ]

        if old_corrections:
            mc = old_corrections[0]
            explanations.append(f"【改判原因】{mc.reason}")
            explanations.append(f"【改判类型】{mc.correction_type.value}")
            explanations.append(f"【原始结果】{mc.original_result}")
            explanations.append(f"【改判结果】{mc.corrected_result}")

            if mc.related_version_id:
                vn = self.version_notes.get(mc.related_version_id)
                if vn:
                    explanations.append(f"【版本依据】{vn.title}: {vn.description}")

            if mc.evidence_reference:
                explanations.append(f"【证据来源】{mc.evidence_reference}")

        if rec.rule_matches:
            rule_explanations = []
            for rule_id in rec.rule_matches:
                for vn in self.version_notes.values():
                    if rule_id in vn.related_rules:
                        rule_explanations.append(f"- {rule_id}: {vn.title}")
                        break
            if rule_explanations:
                explanations.append("【匹配规则】\n" + "\n".join(rule_explanations))

        if rec.evidence_features:
            feature_str = ", ".join([f"{k}={v}" for k, v in rec.evidence_features.items()])
            explanations.append(f"【特征依据】{feature_str}")

        explanations.append(f"【版本对比】旧模型:{old_model_version} → 新模型:{new_model_version}")
        explanations.append(f"【置信度】{rec.confidence_score:.2f}")

        return "\n".join(explanations)

    def process_review(self, recommendation_id: str, operator: str = "system",
                       old_model_version: str = None, new_model_version: str = None) -> EvidenceReviewRecord:
        rec = self.recommendations.get(recommendation_id)
        if not rec:
            raise ValueError(f"推荐记录不存在: {recommendation_id}")

        existing_review = self._get_existing_review(recommendation_id)
        if existing_review:
            review_id = existing_review.review_id
        else:
            review_id = f"REV-{datetime.now().strftime('%Y%m%d%H%M%S')}-{recommendation_id}"

        evidence_chain, missing_refs = self._build_evidence_chain(recommendation_id)

        review = EvidenceReviewRecord(
            review_id=review_id,
            recommendation_id=recommendation_id,
            status=ReviewStatus.PROCESSING,
            evidence_chain=evidence_chain,
            missing_references=missing_refs,
            reviewed_by=operator,
        )

        if missing_refs:
            review.status = ReviewStatus.SUSPENDED
            review.review_notes = "存在引用缺失，已挂起等待现场老师确认。缺失项: " + "; ".join(missing_refs)
        else:
            has_manual = any(
                mc for mc in self.manual_corrections.values()
                if mc.recommendation_id == recommendation_id
                and mc.correction_type == CorrectionType.MANUAL_JUDGMENT
            )
            if has_manual:
                review.status = ReviewStatus.MANUAL_REVIEW
                review.review_notes = "包含人工改判，需要老师确认改判依据是否充分"
            else:
                review.status = ReviewStatus.RESOLVED
                review.review_notes = "证据链完整，复核通过"

        if old_model_version and new_model_version:
            review.resolution = self._explain_judgment_change(
                recommendation_id, old_model_version, new_model_version
            )

        review.reviewed_at = datetime.now().isoformat()

        corrections = [
            mc for mc in self.manual_corrections.values()
            if mc.recommendation_id == recommendation_id
        ]
        if corrections:
            review.correction_id = corrections[-1].correction_id

        if evidence_chain:
            for item in evidence_chain:
                if item["type"] == "version_reference":
                    review.version_id = item["id"]
                    break

        self.review_records[review.review_id] = review
        self.save_all_data()

        return review

    def _get_existing_review(self, recommendation_id: str) -> Optional[EvidenceReviewRecord]:
        for rr in self.review_records.values():
            if rr.recommendation_id == recommendation_id:
                return rr
        return None

    def resolve_suspended(self, review_id: str, resolution: str, operator: str) -> EvidenceReviewRecord:
        review = self.review_records.get(review_id)
        if not review:
            raise ValueError(f"复核记录不存在: {review_id}")

        if review.status != ReviewStatus.SUSPENDED:
            raise ValueError(f"当前状态[{review.status.value}]不允许执行此操作")

        review.status = ReviewStatus.EVIDENCE_MISSING
        review.resolution = resolution
        review.reviewed_by = operator
        review.reviewed_at = datetime.now().isoformat()
        review.review_notes += f" | 老师补充说明: {resolution}"

        self.save_all_data()
        return review

    def confirm_manual_review(self, review_id: str, confirmed: bool, comment: str, operator: str) -> EvidenceReviewRecord:
        review = self.review_records.get(review_id)
        if not review:
            raise ValueError(f"复核记录不存在: {review_id}")

        if review.status == ReviewStatus.MANUAL_REVIEW:
            if confirmed:
                review.status = ReviewStatus.RESOLVED
                review.review_notes += f" | 人工改判已确认: {comment}"
            else:
                review.status = ReviewStatus.EVIDENCE_MISSING
                review.review_notes += f" | 人工改判需补充证据: {comment}"

        review.reviewed_by = operator
        review.reviewed_at = datetime.now().isoformat()
        review.resolution = (review.resolution or "") + f"\n【老师意见】{comment}"

        self.save_all_data()
        return review

    def get_summary(self) -> ReviewSummary:
        summary = ReviewSummary()
        summary.total_count = len(self.review_records)

        for rr in self.review_records.values():
            if rr.status == ReviewStatus.RESOLVED:
                summary.resolved_count += 1
            elif rr.status == ReviewStatus.EVIDENCE_MISSING:
                summary.evidence_missing_count += 1
            elif rr.status == ReviewStatus.SUSPENDED:
                summary.suspended_count += 1
            elif rr.status == ReviewStatus.PENDING:
                summary.pending_count += 1

        for mc in self.manual_corrections.values():
            if mc.correction_type == CorrectionType.MANUAL_JUDGMENT:
                summary.manual_judgment_count += 1
            if mc.is_overridden:
                summary.override_count += 1

        return summary

    def export_review_csv(self, output_path: str) -> str:
        fieldnames = [
            "复核ID", "推荐ID", "排班日期", "护士姓名", "班次类型",
            "原始推荐", "模型版本", "置信度",
            "状态", "版本说明引用", "改判记录",
            "证据链完整性", "缺失引用", "复核说明", "处理结论",
            "复核人", "复核时间",
        ]

        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            for rr in self.review_records.values():
                rec = self.recommendations.get(rr.recommendation_id, None)
                if not rec:
                    continue

                version_refs = []
                correction_info = []

                for item in rr.evidence_chain:
                    if item["type"] == "version_reference":
                        version_refs.append(f"{item['id']}:{item['title']}")
                    elif item["type"] == "correction":
                        override_tag = "[已覆盖]" if item["is_overridden"] else ""
                        correction_info.append(
                            f"{override_tag}[{item['correction_type']}] {item['original']}→{item['corrected']} ({item['reason']})"
                        )

                writer.writerow({
                    "复核ID": rr.review_id,
                    "推荐ID": rr.recommendation_id,
                    "排班日期": rec.schedule_date,
                    "护士姓名": rec.nurse_name,
                    "班次类型": rec.shift_type,
                    "原始推荐": rec.original_recommendation,
                    "模型版本": rec.model_version,
                    "置信度": f"{rec.confidence_score:.2f}",
                    "状态": rr.status.value,
                    "版本说明引用": "; ".join(version_refs),
                    "改判记录": "\n".join(correction_info),
                    "证据链完整性": "完整" if not rr.missing_references else "缺失",
                    "缺失引用": "; ".join(rr.missing_references),
                    "复核说明": rr.review_notes,
                    "处理结论": rr.resolution,
                    "复核人": rr.reviewed_by,
                    "复核时间": rr.reviewed_at or "",
                })

        return output_path

    def export_version_trace_csv(self, output_path: str) -> str:
        fieldnames = [
            "版本ID", "发布日期", "标题", "描述", "关联规则",
            "影响场景", "证据引用", "操作人", "创建时间",
        ]

        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            for vn in sorted(self.version_notes.values(), key=lambda x: x.publish_date):
                writer.writerow({
                    "版本ID": vn.version_id,
                    "发布日期": vn.publish_date,
                    "标题": vn.title,
                    "描述": vn.description,
                    "关联规则": ", ".join(vn.related_rules),
                    "影响场景": ", ".join(vn.affected_scenarios),
                    "证据引用": vn.evidence_reference or "",
                    "操作人": vn.operator,
                    "创建时间": vn.created_at,
                })

        return output_path

    def get_pending_items(self) -> List[EvidenceReviewRecord]:
        return [
            rr for rr in self.review_records.values()
            if rr.status in [ReviewStatus.SUSPENDED, ReviewStatus.MANUAL_REVIEW, ReviewStatus.EVIDENCE_MISSING]
        ]

    def get_resolved_items(self) -> List[EvidenceReviewRecord]:
        return [
            rr for rr in self.review_records.values()
            if rr.status == ReviewStatus.RESOLVED
        ]
