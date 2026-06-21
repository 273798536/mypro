from typing import Optional, List, Dict, Any

from models import (
    Task, TaskCreate, TaskStatus,
    Attachment, AttachmentCreate,
    Sample, SampleCreate,
    GrayscaleAbnormalRecord, GrayscaleAbnormalRecordCreate,
    JudgmentOverride, JudgmentOverrideCreate,
    Event, EventCreate, EventType,
    JudgmentResult,
    TaskTimeline, OutlierSampleSummary, TaskConclusionDetail,
)
from db import (
    TaskDAO, AttachmentDAO, SampleDAO,
    GrayscaleAbnormalDAO, JudgmentOverrideDAO, EventDAO,
)


class DriftTrackerService:

    @staticmethod
    def create_task(data: TaskCreate) -> Task:
        task = TaskDAO.create(data)
        EventDAO.create(EventCreate(
            task_id=task.task_id,
            event_type=EventType.TASK_CREATED,
            message=f"任务创建: {task.task_name} | 模型: {task.model_version} | 数据集: {task.eval_dataset}",
            operator=data.owner,
            metadata={"parameters": data.parameters, "description": data.description},
        ))
        return task

    @staticmethod
    def start_evaluation(task_id: str, operator: str = "platform_algo") -> Optional[Task]:
        task = TaskDAO.update_status(task_id, TaskStatus.EVALUATING)
        if task:
            EventDAO.create(EventCreate(
                task_id=task_id,
                event_type=EventType.EVAL_STARTED,
                message="评测开始执行",
                operator=operator,
            ))
        return task

    @staticmethod
    def add_attachment(data: AttachmentCreate, operator: str = "system") -> Attachment:
        att = AttachmentDAO.create(data)
        EventDAO.create(EventCreate(
            task_id=data.task_id,
            event_type=EventType.ATTACHMENT_RECEIVED,
            message=f"收到附件[{data.attachment_type}]: {data.content_ref}"
                    + (" (晚到)" if data.is_late else ""),
            operator=operator,
            metadata={
                "attachment_id": att.attachment_id,
                "source": data.source,
                "is_late": data.is_late,
                **data.metadata,
            },
        ))
        return att

    @staticmethod
    def link_late_attachment_to_conclusion(task_id: str, attachment_id: str,
                                           operator: str = "platform_algo") -> bool:
        att = AttachmentDAO.get(attachment_id)
        if not att or att.task_id != task_id:
            return False
        AttachmentDAO.mark_linked(attachment_id)
        EventDAO.create(EventCreate(
            task_id=task_id,
            event_type=EventType.LATE_ATTACHMENT_LINKED,
            message=f"晚到附件已关联至任务结论: {att.content_ref}",
            operator=operator,
            metadata={"attachment_id": attachment_id},
        ))
        return True

    @staticmethod
    def add_sample(data: SampleCreate) -> Sample:
        return SampleDAO.create(data)

    @staticmethod
    def add_samples_bulk(task_id: str, samples: List[SampleCreate]) -> List[Sample]:
        return [SampleDAO.create(s) for s in samples]

    @staticmethod
    def judge_sample(task_id: str, sample_id: str, judgment: JudgmentResult,
                     is_outlier: bool = False, outlier_reason: Optional[str] = None,
                     judged_by: str = "auto_eval") -> Optional[Sample]:
        sample = SampleDAO.get_by_sample_id(task_id, sample_id)
        if not sample:
            return None
        updated = SampleDAO.update_judgment(
            sample.db_id, judgment, is_outlier, outlier_reason, judged_by
        )
        if updated:
            EventDAO.create(EventCreate(
                task_id=task_id,
                event_type=EventType.SAMPLE_JUDGMENT,
                message=f"样本[{sample_id}]判定: {judgment.value}"
                        + (f" | 标记为拉偏样本: {outlier_reason}" if is_outlier else ""),
                operator=judged_by,
                metadata={
                    "sample_id": sample_id,
                    "judgment": judgment.value,
                    "is_outlier": is_outlier,
                    "outlier_reason": outlier_reason,
                },
            ))
        return updated

    @staticmethod
    def mark_grayscale_abnormal(data: GrayscaleAbnormalRecordCreate) -> GrayscaleAbnormalRecord:
        record = GrayscaleAbnormalDAO.create(data)
        EventDAO.create(EventCreate(
            task_id=data.task_id,
            event_type=EventType.GRAYSCALE_ABNORMAL_MARKED,
            message=(f"灰度比例异常: 期望{data.expected_grayscale_ratio:.2%} "
                     f"实际{data.actual_grayscale_ratio:.2%} | {data.reason}"),
            operator=data.detected_by,
            metadata={
                "record_id": record.record_id,
                "sample_id": data.sample_id,
                "expected_ratio": data.expected_grayscale_ratio,
                "actual_ratio": data.actual_grayscale_ratio,
            },
        ))
        return record

    @staticmethod
    def resolve_grayscale_abnormal(record_id: str, resolution_note: str,
                                   operator: str = "platform_algo") -> Optional[GrayscaleAbnormalRecord]:
        record = GrayscaleAbnormalDAO.resolve(record_id, resolution_note)
        if record:
            EventDAO.create(EventCreate(
                task_id=record.task_id,
                event_type=EventType.NOTE_ADDED,
                message=f"灰度异常记录处理完毕: {resolution_note}",
                operator=operator,
                metadata={"record_id": record_id},
            ))
        return record

    @staticmethod
    def override_judgment(data: JudgmentOverrideCreate) -> JudgmentOverride:
        override = JudgmentOverrideDAO.create(data)
        if data.sample_id:
            sample = SampleDAO.get_by_sample_id(data.task_id, data.sample_id)
            if sample:
                SampleDAO.update_judgment(
                    sample.db_id, data.new_judgment,
                    sample.is_outlier, sample.outlier_reason, data.operator,
                )
        EventDAO.create(EventCreate(
            task_id=data.task_id,
            event_type=EventType.MANUAL_JUDGMENT_OVERRIDE,
            message=(f"人工改判 [{data.operator}]: "
                     f"{data.original_judgment.value} -> {data.new_judgment.value}"
                     f" | 原因: {data.reason}"
                     + (f" | 样本: {data.sample_id}" if data.sample_id else "")),
            operator=data.operator,
            metadata={
                "override_id": override.override_id,
                "sample_id": data.sample_id,
                "original_judgment": data.original_judgment.value,
                "new_judgment": data.new_judgment.value,
                "original_source": data.original_source,
            },
        ))
        return override

    @staticmethod
    def conclude_task(task_id: str, final_conclusion: JudgmentResult,
                      operator: str = "platform_algo",
                      note: Optional[str] = None) -> Optional[Task]:
        if final_conclusion in (JudgmentResult.FAIL, JudgmentResult.NEEDS_REVIEW):
            status = TaskStatus.PARTIAL_FAILED if final_conclusion == JudgmentResult.NEEDS_REVIEW else TaskStatus.FAILED
        elif final_conclusion == JudgmentResult.GRAYSCALE_ABNORMAL:
            status = TaskStatus.PARTIAL_FAILED
        else:
            status = TaskStatus.SUCCESS
        task = TaskDAO.update_status(task_id, status, final_conclusion)
        if task:
            EventDAO.create(EventCreate(
                task_id=task_id,
                event_type=EventType.TASK_CONCLUDED,
                message=f"任务结论: {final_conclusion.value}" + (f" | {note}" if note else ""),
                operator=operator,
                metadata={"final_conclusion": final_conclusion.value, "note": note},
            ))
        return task

    @staticmethod
    def close_task(task_id: str, operator: str = "platform_algo",
                   note: Optional[str] = None) -> Optional[Task]:
        task = TaskDAO.update_status(task_id, TaskStatus.CLOSED)
        if task:
            EventDAO.create(EventCreate(
                task_id=task_id,
                event_type=EventType.TASK_CLOSED,
                message="任务关闭归档" + (f" | {note}" if note else ""),
                operator=operator,
                metadata={"note": note},
            ))
        return task

    @staticmethod
    def add_note(task_id: str, message: str, operator: str = "platform_algo",
                 metadata: Optional[Dict[str, Any]] = None) -> Optional[Event]:
        task = TaskDAO.get(task_id)
        if not task:
            return None
        return EventDAO.create(EventCreate(
            task_id=task_id,
            event_type=EventType.NOTE_ADDED,
            message=message,
            operator=operator,
            metadata=metadata or {},
        ))

    @staticmethod
    def get_task_timeline(task_id: str) -> Optional[TaskTimeline]:
        task = TaskDAO.get(task_id)
        if not task:
            return None
        return TaskTimeline(
            task=task,
            events=EventDAO.list_by_task(task_id),
            attachments=AttachmentDAO.list_by_task(task_id),
            samples=SampleDAO.list_by_task(task_id),
            grayscale_abnormals=GrayscaleAbnormalDAO.list_by_task(task_id),
            judgment_overrides=JudgmentOverrideDAO.list_by_task(task_id),
        )

    @staticmethod
    def get_conclusion_detail(task_id: str) -> Optional[TaskConclusionDetail]:
        task = TaskDAO.get(task_id)
        if not task:
            return None
        samples = SampleDAO.list_by_task(task_id)
        outliers = SampleDAO.list_outliers(task_id)
        outlier_summaries: List[OutlierSampleSummary] = []
        for s in outliers:
            outlier_summaries.append(OutlierSampleSummary(
                sample=s,
                judgment_overrides=JudgmentOverrideDAO.list_by_task(task_id, s.sample_id),
                related_events=EventDAO.list_by_sample(task_id, s.sample_id),
            ))
        attachments = AttachmentDAO.list_by_task(task_id)
        final_att = next(
            (a for a in reversed(attachments) if a.linked_to_conclusion),
            attachments[-1] if attachments else None,
        )
        pass_count = sum(1 for s in samples if s.judgment == JudgmentResult.PASS)
        fail_count = sum(1 for s in samples if s.judgment == JudgmentResult.FAIL)
        needs_review_count = sum(1 for s in samples if s.judgment == JudgmentResult.NEEDS_REVIEW)
        gray_abnormals = GrayscaleAbnormalDAO.list_by_task(task_id)
        return TaskConclusionDetail(
            task=task,
            total_samples=len(samples),
            pass_count=pass_count,
            fail_count=fail_count,
            needs_review_count=needs_review_count,
            grayscale_abnormal_count=len(gray_abnormals),
            outlier_samples=outlier_summaries,
            final_attachment=final_att,
            judgment_overrides=JudgmentOverrideDAO.list_by_task(task_id),
        )

    @staticmethod
    def get_original_eval_result(task_id: str, sample_id: Optional[str] = None) -> Dict[str, Any]:
        events = EventDAO.list_by_task(task_id, EventType.EVAL_RESULT_RECEIVED)
        overrides = JudgmentOverrideDAO.list_by_task(task_id, sample_id)
        original_events = []
        if sample_id:
            sample_events = EventDAO.list_by_sample(task_id, sample_id)
            original_events = [e for e in sample_events
                               if e.event_type in (EventType.SAMPLE_JUDGMENT, EventType.EVAL_RESULT_RECEIVED)]
        else:
            original_events = list(events)
            for s in SampleDAO.list_by_task(task_id):
                original_events.extend(EventDAO.list_by_sample(task_id, s.sample_id))
        return {
            "task_id": task_id,
            "sample_id": sample_id,
            "original_events": [e.model_dump() for e in original_events],
            "judgment_overrides": [o.model_dump() for o in overrides],
        }
