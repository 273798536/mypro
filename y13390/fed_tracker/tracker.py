import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from .models import (
    TaskRecord,
    ProcessingResult,
    TaskStatus,
    RecordIssue,
    TaskSummary,
)
from .storage import StateStorage
from .explainer import RevisionExplainer


class FederationTracker:
    def __init__(self, storage: Optional[StateStorage] = None):
        self.storage = storage or StateStorage()
        self.explainer = RevisionExplainer()
        self.late_attachment_threshold = 120

    def process(self, records: List[TaskRecord], run_id: Optional[str] = None) -> ProcessingResult:
        run_id = run_id or f"run_{uuid.uuid4().hex[:8]}"
        result = ProcessingResult(
            total=len(records),
            run_id=run_id,
            started_at=datetime.now(),
        )

        for record in records:
            record.status = TaskStatus.PROCESSING
            status, issue, skip_reason = self._classify_record(record)
            record.status = status

            if status == TaskStatus.PROCESSED:
                result.processed += 1
                result.processed_ids.append(record.task_id)
            elif status == TaskStatus.SKIPPED:
                result.skipped += 1
                result.skipped_ids.append(record.task_id)
                result.skip_reasons[record.task_id] = skip_reason or "未指定原因"
            elif status == TaskStatus.BAD_RECORD:
                result.bad_records += 1
                result.bad_record_ids.append(record.task_id)
                result.bad_record_details.append({
                    "task_id": record.task_id,
                    "issue": issue.value if issue else "unknown",
                    "description": self._describe_issue(record, issue),
                    "payload_snippet": self._safe_payload_snippet(record),
                })
            elif status == TaskStatus.REVISED:
                result.revised += 1
                result.revised_ids.append(record.task_id)
                explanation = self.explainer.explain_revision(record)
                result.revision_explanations[record.task_id] = self.explainer.format_explanation(explanation)
                record.revision_reason = explanation["primary_reason"]

            if issue and issue not in record.issues:
                record.issues.append(issue)

        result.finished_at = datetime.now()

        self.storage.save_records(records)
        self.storage.add_processing_result(result)

        summary = self._build_summary(result, records)
        self.storage.save_summary(summary)

        return result

    def _classify_record(self, record: TaskRecord) -> Tuple[TaskStatus, Optional[RecordIssue], Optional[str]]:
        try:
            if not record.payload or not isinstance(record.payload, dict):
                return TaskStatus.BAD_RECORD, RecordIssue.INVALID_FORMAT, None

            if record.attachment_delay_seconds > self.late_attachment_threshold:
                record.attachment_arrived = False
                note = f"附件延迟 {record.attachment_delay_seconds}s，超过阈值 {self.late_attachment_threshold}s"
                record.notes.append(note)
                self.storage.add_note(f"任务 {record.task_id}: {note}")
                return TaskStatus.BAD_RECORD, RecordIssue.LATE_ATTACHMENT, None

            if record.is_version_alias:
                note = "检测到版本别名指向旧索引文件，不属于本次联邦任务范围"
                record.notes.append(note)
                self.storage.add_note(f"任务 {record.task_id}: {note}")
                return TaskStatus.BAD_RECORD, RecordIssue.VERSION_ALIAS, None

            if RecordIssue.OLD_MODEL_MISJUDGE in record.issues:
                note = "旧模型 v1 误判样本，v2 模型改判"
                record.notes.append(note)
                self.storage.add_note(f"任务 {record.task_id}: {note}")
                return TaskStatus.REVISED, RecordIssue.OLD_MODEL_MISJUDGE, None

            required_fields = ["task_content", "client_signature", "timestamp"]
            missing = [f for f in required_fields if f not in record.payload]
            if missing:
                note = f"缺少必填字段: {', '.join(missing)}"
                record.notes.append(note)
                self.storage.add_note(f"任务 {record.task_id}: {note}")
                return TaskStatus.BAD_RECORD, RecordIssue.MISSING_REQUIRED, None

            if record.payload.get("should_skip", False):
                skip_reason = record.payload.get("skip_reason", "配置标记跳过")
                note = f"跳过原因: {skip_reason}"
                record.notes.append(note)
                self.storage.add_note(f"任务 {record.task_id}: {note}")
                return TaskStatus.SKIPPED, None, skip_reason

            record.notes.append("正常处理完成")
            return TaskStatus.PROCESSED, None, None

        except Exception as e:
            note = f"处理异常: {str(e)}"
            record.notes.append(note)
            self.storage.add_note(f"任务 {record.task_id}: {note}")
            return TaskStatus.BAD_RECORD, RecordIssue.DATA_CORRUPTED, None

    def _describe_issue(self, record: TaskRecord, issue: Optional[RecordIssue]) -> str:
        descriptions = {
            RecordIssue.LATE_ATTACHMENT: f"附件延迟 {record.attachment_delay_seconds}s 到达，超过 v2 阈值 120s",
            RecordIssue.VERSION_ALIAS: "记录包含版本别名（refers_to 字段指向旧文件索引），不应作为新任务处理",
            RecordIssue.OLD_MODEL_MISJUDGE: "v1 模型误判样本，v2 模型已改判并给出解释",
            RecordIssue.INVALID_FORMAT: "payload 格式错误或为空",
            RecordIssue.MISSING_REQUIRED: "缺少必填字段，无法完成联邦计算",
            RecordIssue.DATA_CORRUPTED: "数据损坏，解析过程抛出异常",
        }
        return descriptions.get(issue, "未知问题")

    def _safe_payload_snippet(self, record: TaskRecord) -> Dict[str, Any]:
        if not record.payload:
            return {}
        keys = list(record.payload.keys())[:5]
        snippet = {k: str(record.payload[k])[:50] for k in keys}
        return snippet

    def _build_summary(self, result: ProcessingResult, records: List[TaskRecord]) -> TaskSummary:
        notes = self.storage.load_notes()
        page_summary = self._generate_page_summary(result, records)
        status = "completed" if result.bad_records == 0 else "completed_with_issues"

        return TaskSummary(
            run_id=result.run_id,
            started_at=result.started_at,
            finished_at=result.finished_at,
            total=result.total,
            processed=result.processed,
            skipped=result.skipped,
            bad_records=result.bad_records,
            revised=result.revised,
            status=status,
            page_summary=page_summary,
            historical_notes=notes,
        )

    def _generate_page_summary(self, result: ProcessingResult, records: List[TaskRecord]) -> str:
        parts = [
            f"本次共处理 {result.total} 条联邦客户端任务",
            f"正常通过 {result.processed} 条",
        ]
        if result.skipped > 0:
            parts.append(f"跳过 {result.skipped} 条")
        if result.bad_records > 0:
            parts.append(f"坏行 {result.bad_records} 条（需人工复核）")
        if result.revised > 0:
            parts.append(f"改判 {result.revised} 条（v2 模型修正 v1 误判）")

        bad_types = {}
        for detail in result.bad_record_details:
            issue = detail["issue"]
            bad_types[issue] = bad_types.get(issue, 0) + 1
        if bad_types:
            type_desc = "、".join([f"{k}×{v}" for k, v in bad_types.items()])
            parts.append(f"坏行类型: {type_desc}")

        return "；".join(parts)

    def get_summary(self) -> Optional[TaskSummary]:
        return self.storage.load_summary()

    def verify_state(self) -> Dict[str, bool]:
        return self.storage.verify_consistency()

    def get_revision_explanations(self, result: ProcessingResult) -> Dict[str, str]:
        return result.revision_explanations
