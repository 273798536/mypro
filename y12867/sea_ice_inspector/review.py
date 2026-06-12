import uuid
from datetime import datetime
from typing import List, Dict, Optional, Tuple
import logging

from .models import (
    ProcessingRecord,
    ProcessingBatch,
    ReviewNote,
    DataStatus,
    ExceptionType,
    InspectionPhoto,
)
from .tide import TideCalculator

logger = logging.getLogger(__name__)


class ReviewManager:
    def __init__(self, tide_calculator: Optional[TideCalculator] = None):
        self.tide_calculator = tide_calculator or TideCalculator()

    def _generate_id(self) -> str:
        return f"note_{uuid.uuid4().hex[:8]}"

    def add_review_note(
        self,
        record: ProcessingRecord,
        reviewer: str,
        content: str,
        is_exception: bool = False,
        exception_type: Optional[ExceptionType] = None,
        resolution: Optional[str] = None,
    ) -> ProcessingRecord:
        note = ReviewNote(
            note_id=self._generate_id(),
            processing_record_id=record.record_id,
            reviewer=reviewer,
            review_time=datetime.now(),
            content=content,
            is_exception=is_exception,
            exception_type=exception_type,
            resolution=resolution,
        )
        record.review_notes.append(note)

        if resolution and record.status == DataStatus.PARTIAL:
            has_unresolved = any(
                gap for gap in record.data_gaps if not gap.resolved
            )
            has_unreviewed_exceptions = any(
                trace for trace in record.exception_traces if not trace.reviewed
            )
            if not has_unresolved and not has_unreviewed_exceptions:
                record.status = DataStatus.REVIEWED
                logger.info(f"记录 {record.record_id} 已完成复核，状态更新为 REVIEWED")

        logger.info(
            f"已添加复核备注 - 记录 {record.record_id}, "
            f"复核人: {reviewer}, "
            f"是否异常: {is_exception}"
        )

        return record

    def add_inspection_photo(
        self,
        record: ProcessingRecord,
        photo: InspectionPhoto,
        reviewer: str,
    ) -> ProcessingRecord:
        record.inspection_photo = photo

        for gap in record.data_gaps:
            if gap.gap_type == ExceptionType.MISSING_PHOTO and not gap.resolved:
                gap.resolved = True
                gap.resolved_time = datetime.now()
                logger.info(f"数据缺口 {gap.gap_id} 已解决：照片已补充")

        for trace in record.exception_traces:
            if trace.exception_type == ExceptionType.MISSING_PHOTO and not trace.reviewed:
                trace.reviewed = True
                trace.reviewer_note = f"照片已由 {reviewer} 于 {datetime.now().isoformat()} 补充"

        note_content = f"补充巡检照片: {photo.photo_id}, 上传时间: {photo.timestamp.isoformat()}"
        if photo.annotation:
            note_content += f", 备注: {photo.annotation}"

        self.add_review_note(
            record=record,
            reviewer=reviewer,
            content=note_content,
            is_exception=False,
        )

        self._reevaluate_record_status(record)

        logger.info(f"记录 {record.record_id} 已补充照片，状态已重新评估")
        return record

    def update_ice_thickness(
        self,
        record: ProcessingRecord,
        new_thickness: float,
        reviewer: str,
        reason: str,
        recalculate_tide: bool = True,
    ) -> ProcessingRecord:
        old_thickness = record.final_ice_thickness
        record.buoy_data.ice_thickness = new_thickness

        if recalculate_tide and record.tide_calculation:
            new_tide, audit_note = self.tide_calculator.recalculate_with_review(
                record_id=record.record_id,
                buoy_id=record.buoy_id,
                latitude=record.buoy_data.latitude,
                longitude=record.buoy_data.longitude,
                timestamp=record.buoy_data.timestamp,
                raw_thickness=new_thickness,
                reviewer_note=reason,
            )
            record.tide_calculation = new_tide
            record.final_ice_thickness = new_tide.tide_corrected_thickness
            self.add_review_note(
                record=record,
                reviewer=reviewer,
                content=f"修正冰厚: {old_thickness}cm → {new_thickness}cm, 原因: {reason}. {audit_note}",
                is_exception=True,
                exception_type=ExceptionType.ABNORMAL_THICKNESS,
                resolution="人工复核修正",
            )
        else:
            record.final_ice_thickness = new_thickness
            self.add_review_note(
                record=record,
                reviewer=reviewer,
                content=f"直接修正冰厚: {old_thickness}cm → {new_thickness}cm, 原因: {reason}",
                is_exception=True,
                exception_type=ExceptionType.ABNORMAL_THICKNESS,
                resolution="人工复核修正（未重算潮汐）",
            )

        self._reevaluate_record_status(record)
        return record

    def adjust_tide_factor(
        self,
        record: ProcessingRecord,
        new_factor: float,
        reviewer: str,
        reason: str,
    ) -> ProcessingRecord:
        if not record.tide_calculation:
            raise ValueError(f"记录 {record.record_id} 暂无潮汐计算结果，无法调整校正因子")

        old_factor = 0.85
        old_thickness = record.final_ice_thickness

        new_tide, audit_note = self.tide_calculator.recalculate_with_review(
            record_id=record.record_id,
            buoy_id=record.buoy_id,
            latitude=record.buoy_data.latitude,
            longitude=record.buoy_data.longitude,
            timestamp=record.buoy_data.timestamp,
            raw_thickness=record.buoy_data.ice_thickness,
            reviewer_note=reason,
            override_factor=new_factor,
        )

        record.tide_calculation = new_tide
        record.final_ice_thickness = new_tide.tide_corrected_thickness

        for trace in record.exception_traces:
            if trace.exception_type == ExceptionType.TIDE_ANOMALY and not trace.reviewed:
                trace.reviewed = True
                trace.reviewer_note = f"潮汐校正因子已由 {reviewer} 调整为 {new_factor}"

        self.add_review_note(
            record=record,
            reviewer=reviewer,
            content=(
                f"调整潮汐校正因子: {old_factor} → {new_factor}, "
                f"厚度变化: {old_thickness}cm → {record.final_ice_thickness}cm, "
                f"原因: {reason}"
            ),
            is_exception=True,
            exception_type=ExceptionType.TIDE_ANOMALY,
            resolution="人工调整潮汐校正因子",
        )

        self._reevaluate_record_status(record)
        return record

    def resolve_no_sail_violation(
        self,
        record: ProcessingRecord,
        reviewer: str,
        resolution: str,
        keep_violation_flag: bool = True,
    ) -> ProcessingRecord:
        for trace in record.exception_traces:
            if trace.exception_type == ExceptionType.NO_SAIL_ZONE_VIOLATION and not trace.reviewed:
                trace.reviewed = True
                trace.reviewer_note = f"处理意见: {resolution}"

        if not keep_violation_flag:
            record.is_no_sail_violation = False
            record.no_sail_zone = None

        self.add_review_note(
            record=record,
            reviewer=reviewer,
            content=f"处理禁航区越界: {resolution}, 保留标记: {keep_violation_flag}",
            is_exception=True,
            exception_type=ExceptionType.NO_SAIL_ZONE_VIOLATION,
            resolution=resolution,
        )

        self._reevaluate_record_status(record)
        return record

    def trace_exception(self, record: ProcessingRecord, trace_id: str) -> Dict:
        for trace in record.exception_traces:
            if trace.trace_id == trace_id:
                return {
                    "trace": trace.model_dump(),
                    "buoy_data": record.buoy_data.model_dump(),
                    "processing_opinion": trace.processing_opinion,
                    "review_notes": [
                        note.model_dump()
                        for note in record.review_notes
                        if note.exception_type == trace.exception_type
                    ],
                    "tide_calculation": (
                        record.tide_calculation.model_dump()
                        if record.tide_calculation
                        else None
                    ),
                    "inspection_photo": (
                        record.inspection_photo.model_dump()
                        if record.inspection_photo
                        else None
                    ),
                    "record_status": record.status.value,
                }
        raise ValueError(f"未找到异常追溯记录: {trace_id}")

    def get_review_summary(self, batch: ProcessingBatch) -> Dict:
        summary = {
            "total_records": batch.total_count,
            "pending_review": sum(
                1 for r in batch.records
                if r.status in [DataStatus.PARTIAL, DataStatus.PROCESSED]
                and any(t for t in r.exception_traces if not t.reviewed)
            ),
            "reviewed": sum(1 for r in batch.records if r.status == DataStatus.REVIEWED),
            "exceptions_by_type": {},
            "gaps_pending": sum(
                len([g for g in r.data_gaps if not g.resolved])
                for r in batch.records
            ),
            "reviewers": list({
                note.reviewer
                for r in batch.records
                for note in r.review_notes
            }),
        }

        for record in batch.records:
            for trace in record.exception_traces:
                ex_type = trace.exception_type.value
                if ex_type not in summary["exceptions_by_type"]:
                    summary["exceptions_by_type"][ex_type] = {
                        "total": 0,
                        "reviewed": 0,
                        "pending": 0,
                    }
                summary["exceptions_by_type"][ex_type]["total"] += 1
                if trace.reviewed:
                    summary["exceptions_by_type"][ex_type]["reviewed"] += 1
                else:
                    summary["exceptions_by_type"][ex_type]["pending"] += 1

        return summary

    def get_pending_review_items(self, batch: ProcessingBatch) -> List[Dict]:
        items = []
        for record in batch.records:
            for trace in record.exception_traces:
                if not trace.reviewed:
                    items.append({
                        "trace_id": trace.trace_id,
                        "record_id": record.record_id,
                        "buoy_id": record.buoy_id,
                        "exception_type": trace.exception_type.value,
                        "description": trace.description,
                        "processing_opinion": trace.processing_opinion,
                        "detected_time": trace.detected_time.isoformat(),
                        "record_status": record.status.value,
                        "buoy_data_ref": trace.original_buoy_data_ref,
                    })
            for gap in record.data_gaps:
                if not gap.resolved:
                    items.append({
                        "gap_id": gap.gap_id,
                        "record_id": record.record_id,
                        "buoy_id": record.buoy_id,
                        "exception_type": gap.gap_type.value,
                        "description": gap.description,
                        "processing_opinion": "需补充数据",
                        "detected_time": gap.reported_time.isoformat(),
                        "record_status": record.status.value,
                        "reported_to": gap.reported_to,
                    })
        return items

    def _reevaluate_record_status(self, record: ProcessingRecord):
        has_unresolved_gaps = any(gap for gap in record.data_gaps if not gap.resolved)
        has_unreviewed_exceptions = any(
            trace for trace in record.exception_traces if not trace.reviewed
        )
        has_photo = record.inspection_photo is not None

        if has_unresolved_gaps or has_unreviewed_exceptions:
            record.status = DataStatus.PARTIAL
        elif not has_photo:
            record.status = DataStatus.PARTIAL
        elif record.review_notes:
            record.status = DataStatus.REVIEWED
        else:
            record.status = DataStatus.PROCESSED
