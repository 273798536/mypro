"""人工修正工作流 - 标注记录管理、复核审批"""

from typing import List, Optional
from datetime import datetime
from .models import Sample, AnnotationRecord, ValidationResult
from .storage import AnnotationStore, SampleStore


class CorrectionWorkflow:
    """人工修正工作流 - 管理样本标注与复核"""

    def __init__(self, annotation_store: AnnotationStore, sample_store: SampleStore):
        self.annotation_store = annotation_store
        self.sample_store = sample_store

    def create_annotation(
        self,
        sample_id: str,
        annotator: str,
        question_corrected: Optional[str] = None,
        answer_corrected: Optional[str] = None,
        context_corrected: Optional[str] = None,
        status: str = "pending",
        comment: str = "",
    ) -> AnnotationRecord:
        """创建一条标注/修正记录

        Args:
            sample_id: 样本 ID
            annotator: 标注人
            question_corrected: 修正后的问题
            answer_corrected: 修正后的答案
            context_corrected: 修正后的上下文
            status: 状态 (pending/approved/rejected/needs_review/corrected)
            comment: 备注

        Returns:
            创建的 AnnotationRecord
        """
        if status not in AnnotationRecord.VALID_STATUSES:
            raise ValueError(f"无效状态: {status}，有效值: {AnnotationRecord.VALID_STATUSES}")

        annotation = AnnotationRecord(
            sample_id=sample_id,
            annotator=annotator,
            question_corrected=question_corrected,
            answer_corrected=answer_corrected,
            context_corrected=context_corrected,
            status=status,
            comment=comment,
        )

        self.annotation_store.save(annotation)
        return annotation

    def update_status(
        self,
        annotation_id: str,
        new_status: str,
        comment: str = "",
    ) -> Optional[AnnotationRecord]:
        """更新标注记录状态

        Args:
            annotation_id: 标注记录 ID
            new_status: 新状态
            comment: 追加备注

        Returns:
            更新后的 AnnotationRecord，找不到返回 None
        """
        if new_status not in AnnotationRecord.VALID_STATUSES:
            raise ValueError(f"无效状态: {new_status}")

        annotation = self.annotation_store.load(annotation_id)
        if not annotation:
            return None

        annotation.status = new_status
        annotation.updated_at = datetime.now().isoformat()
        if comment:
            if annotation.comment:
                annotation.comment += f"\n{comment}"
            else:
                annotation.comment = comment

        self.annotation_store.save(annotation)
        return annotation

    def get_sample_annotations(self, sample_id: str) -> List[AnnotationRecord]:
        """获取某样本的所有标注记录（按时间倒序）"""
        return self.annotation_store.list_by_sample(sample_id)

    def get_latest_annotation(self, sample_id: str) -> Optional[AnnotationRecord]:
        """获取某样本的最新标注记录"""
        annotations = self.annotation_store.list_by_sample(sample_id)
        return annotations[0] if annotations else None

    def apply_correction(self, annotation_id: str) -> Optional[Sample]:
        """将修正应用到原始样本

        将标注记录中的修正内容覆盖到样本上，并创建新版本的样本。

        Args:
            annotation_id: 标注记录 ID

        Returns:
            更新后的 Sample，找不到返回 None
        """
        annotation = self.annotation_store.load(annotation_id)
        if not annotation:
            return None

        sample = self.sample_store.load(annotation.sample_id)
        if not sample:
            return None

        if annotation.question_corrected is not None:
            sample.question = annotation.question_corrected
        if annotation.answer_corrected is not None:
            sample.answer = annotation.answer_corrected
        if annotation.context_corrected is not None:
            sample.context = annotation.context_corrected

        self.sample_store.save(sample)

        annotation.status = "corrected"
        annotation.updated_at = datetime.now().isoformat()
        self.annotation_store.save(annotation)

        return sample

    def list_by_status(self, status: str) -> List[AnnotationRecord]:
        """按状态列出标注记录"""
        return self.annotation_store.list_by_status(status)

    def summary(self) -> dict:
        """标注工作流统计摘要"""
        all_annotations = self.annotation_store.list_all()
        status_counts = {}
        for ann in all_annotations:
            status_counts[ann.status] = status_counts.get(ann.status, 0) + 1

        return {
            "total": len(all_annotations),
            "status_counts": status_counts,
            "pending": status_counts.get("pending", 0),
            "needs_review": status_counts.get("needs_review", 0),
            "approved": status_counts.get("approved", 0),
            "rejected": status_counts.get("rejected", 0),
            "corrected": status_counts.get("corrected", 0),
        }
