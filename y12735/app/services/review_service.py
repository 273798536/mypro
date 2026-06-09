from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from app.core import (
    InsufficientDataError,
    check_constraints,
    detect_outliers,
    fit_linear,
)
from app.models import (
    AuditLogEntry,
    DataPoint,
    FitBounds,
    FitConstraint,
    ResultClassification,
    ReviewRecord,
    ReviewerRole,
    ReviewStatus,
)
from app.services.explanation_service import (
    build_explanation,
    classify_overall,
    classify_points,
)


class ReviewNotFoundError(LookupError):
    pass


class InvalidTransitionError(ValueError):
    pass


class ReviewService:
    def __init__(self) -> None:
        self._records: dict[str, ReviewRecord] = {}

    def create_review_from_data(
        self,
        title: str,
        source_file: str,
        source_sheets: list[str],
        data_points: list[DataPoint],
        constraints: Optional[list[FitConstraint]] = None,
        bounds: Optional[FitBounds] = None,
    ) -> ReviewRecord:
        record_id = uuid.uuid4().hex[:12]
        record = ReviewRecord(
            record_id=record_id,
            title=title,
            source_file=source_file,
            source_sheets=source_sheets,
            data_points=data_points,
            fit_constraints=constraints or [],
            fit_bounds=bounds,
        )
        record.audit_log.append(
            AuditLogEntry(
                reviewer="system",
                role=ReviewerRole.SYSTEM,
                from_status=None,
                to_status=ReviewStatus.PENDING,
                note="系统从计算草稿创建复核记录",
            )
        )
        self._records[record_id] = record
        return record

    def run_analysis(self, record_id: str) -> ReviewRecord:
        record = self._get_record(record_id)
        try:
            xs = [dp.x for dp in record.data_points]
            ys = [dp.y for dp in record.data_points]
            fit_result = fit_linear(xs, ys)
        except InsufficientDataError as exc:
            raise InvalidTransitionError(
                f"拟合失败：{exc} 请核对计算草稿是否缺页、是否存在未录入的数据行，或补充数据后重新提交。"
            ) from exc

        record.fit_result = fit_result

        outliers = detect_outliers(
            data_points=record.data_points,
            fit_result=fit_result,
            bounds=record.fit_bounds,
        )
        record.outliers = outliers

        violations = check_constraints(fit_result=fit_result, constraints=record.fit_constraints)
        record.constraint_violations = violations

        total = len(record.data_points)
        usable, deferred, recollect = classify_points(total, outliers)
        classification = classify_overall(total, outliers, violations, fit_result.r_squared)

        record.classification = classification
        record.explanation = build_explanation(
            title=record.title,
            fit_result=fit_result,
            outliers=outliers,
            violations=violations,
            classification=classification,
            usable=usable,
            deferred=deferred,
            recollect=recollect,
        )
        record.updated_at = datetime.now()
        return record

    def _get_record(self, record_id: str) -> ReviewRecord:
        if record_id not in self._records:
            raise ReviewNotFoundError(
                f"复核记录 {record_id} 不存在。请确认该记录编号是否正确，"
                f"或该计算草稿是否已完成上传和分析。"
            )
        return self._records[record_id]

    def get_record(self, record_id: str) -> ReviewRecord:
        return self._get_record(record_id)

    def list_records(self) -> list[ReviewRecord]:
        return list(self._records.values())

    def approve(
        self,
        record_id: str,
        reviewer: str,
        role: ReviewerRole,
        note: str = "",
        corrections: Optional[dict[str, object]] = None,
    ) -> ReviewRecord:
        record = self._get_record(record_id)
        if record.status not in (ReviewStatus.PENDING, ReviewStatus.REJECTED):
            raise InvalidTransitionError(
                f"当前记录状态为『{record.status.value}』，无法标记为通过。"
                f"只有『待确认』或『驳回』状态的记录可改为通过。"
            )
        from_status = record.status
        field_changes: dict[str, tuple[object, object]] = {}

        if corrections:
            for key, new_val in corrections.items():
                old_val = record.editor_corrections.get(key, "<未设置>")
                field_changes[f"editor_corrections.{key}"] = (old_val, new_val)
                record.editor_corrections[key] = new_val

        record.status = ReviewStatus.APPROVED
        record.updated_at = datetime.now()
        record.audit_log.append(
            AuditLogEntry(
                reviewer=reviewer,
                role=role,
                from_status=from_status,
                to_status=ReviewStatus.APPROVED,
                note=note or "教研编辑确认通过，异常点解释已核对。",
                field_changes=field_changes,
            )
        )
        return record

    def reject(
        self,
        record_id: str,
        reviewer: str,
        role: ReviewerRole,
        reason: str,
        corrections: Optional[dict[str, object]] = None,
    ) -> ReviewRecord:
        record = self._get_record(record_id)
        if record.status != ReviewStatus.PENDING:
            raise InvalidTransitionError(
                f"当前记录状态为『{record.status.value}』，无法驳回。只有『待确认』状态可执行驳回。"
            )
        if not reason.strip():
            raise InvalidTransitionError("驳回时必须填写原因，便于后续处理人理解需补采或核对的内容。")

        field_changes: dict[str, tuple[object, object]] = {}
        if corrections:
            for key, new_val in corrections.items():
                old_val = record.editor_corrections.get(key, "<未设置>")
                field_changes[f"editor_corrections.{key}"] = (old_val, new_val)
                record.editor_corrections[key] = new_val

        record.status = ReviewStatus.REJECTED
        record.rejection_reason = reason
        record.updated_at = datetime.now()
        record.audit_log.append(
            AuditLogEntry(
                reviewer=reviewer,
                role=role,
                from_status=ReviewStatus.PENDING,
                to_status=ReviewStatus.REJECTED,
                note=reason,
                field_changes=field_changes,
            )
        )
        return record

    def reset_to_pending(
        self,
        record_id: str,
        reviewer: str,
        role: ReviewerRole,
        note: str = "",
    ) -> ReviewRecord:
        record = self._get_record(record_id)
        if record.status != ReviewStatus.REJECTED:
            raise InvalidTransitionError(
                f"当前记录状态为『{record.status.value}』，无法重置为待确认。只有驳回后可重新提交。"
            )
        from_status = record.status
        record.status = ReviewStatus.PENDING
        record.rejection_reason = None
        record.updated_at = datetime.now()
        record.audit_log.append(
            AuditLogEntry(
                reviewer=reviewer,
                role=role,
                from_status=from_status,
                to_status=ReviewStatus.PENDING,
                note=note or "已补充数据或修正计算草稿，重新提交待确认。",
            )
        )
        return record

    def override_classification(
        self,
        record_id: str,
        reviewer: str,
        role: ReviewerRole,
        new_classification: ResultClassification,
        reason: str,
    ) -> ReviewRecord:
        record = self._get_record(record_id)
        if not reason.strip():
            raise InvalidTransitionError("修改结果分类时必须说明原因，留痕备查。")
        old = record.classification
        record.classification = new_classification
        record.updated_at = datetime.now()
        record.audit_log.append(
            AuditLogEntry(
                reviewer=reviewer,
                role=role,
                from_status=record.status,
                to_status=record.status,
                note=f"修改结果分类：{old.value} → {new_classification.value}，原因：{reason}",
                field_changes={"classification": (old.value, new_classification.value)},
            )
        )
        return record
