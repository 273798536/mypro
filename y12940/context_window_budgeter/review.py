from typing import List, Dict, Optional, Tuple, Any
from collections import defaultdict
from datetime import datetime
import json
import csv
import io

from .models import (
    SampleRecord,
    RecordStatus,
    ReviewAction,
    AuditLogEntry,
)
from .version_control import VersionControl, SecurityInterceptor
from .utils import generate_id


class ReviewItem:
    def __init__(self, record: SampleRecord, issues: List[str]):
        self.record = record
        self.issues = issues
        self.reviewed = False
        self.reviewer: Optional[str] = None
        self.review_action: Optional[ReviewAction] = None
        self.review_note: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record.record_id,
            "status": self.record.status.value,
            "issues": self.issues,
            "reviewed": self.reviewed,
            "reviewer": self.reviewer,
            "review_action": self.review_action.value if self.review_action else None,
            "review_note": self.review_note,
            "label": self.record.label,
            "prompt_preview": self.record.prompt[:100],
            "version": self.record.version,
        }


class GroupMetrics:
    def __init__(self, group_key: str):
        self.group_key = group_key
        self.total_records: int = 0
        self.clean_records: int = 0
        self.pending_records: int = 0
        self.dirty_records: int = 0
        self.leaked_records: int = 0
        self.total_tokens: int = 0
        self.avg_tokens: float = 0.0
        self.label_distribution: Dict[str, int] = defaultdict(int)
        self.review_rate: float = 0.0
        self.duplicate_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "group_key": self.group_key,
            "total_records": self.total_records,
            "clean_records": self.clean_records,
            "pending_records": self.pending_records,
            "dirty_records": self.dirty_records,
            "leaked_records": self.leaked_records,
            "total_tokens": self.total_tokens,
            "avg_tokens": round(self.avg_tokens, 2),
            "label_distribution": dict(self.label_distribution),
            "review_rate": round(self.review_rate, 2),
            "duplicate_count": self.duplicate_count,
            "pass_rate": round(
                self.clean_records / self.total_records if self.total_records > 0 else 0.0, 2
            ),
        }


class ReviewWorkflow:
    def __init__(
        self,
        version_control: VersionControl,
        security: SecurityInterceptor,
        allowed_labels: Optional[List[str]] = None,
    ):
        self.version_control = version_control
        self.security = security
        self.allowed_labels = allowed_labels
        self.review_queue: List[ReviewItem] = []
        self.audit_log: List[AuditLogEntry] = []

    def build_review_queue(
        self,
        pending_records: List[Dict],
        dirty_records: List[Dict],
        all_records: List[SampleRecord],
    ) -> List[ReviewItem]:
        self.review_queue = []
        record_map = {r.record_id: r for r in all_records}

        for item in pending_records:
            record = record_map.get(item["record_id"])
            if record:
                self.review_queue.append(ReviewItem(record, item["issues"]))

        for item in dirty_records:
            record = record_map.get(item["record_id"])
            if record and record.status != RecordStatus.LEAKED:
                self.review_queue.append(ReviewItem(record, item["issues"]))

        return self.review_queue

    def process_review(
        self,
        record_id: str,
        reviewer: str,
        action: ReviewAction,
        note: str,
        new_label: Optional[str] = None,
    ) -> Tuple[bool, str]:
        item = next(
            (i for i in self.review_queue if i.record.record_id == record_id), None
        )
        if not item:
            return False, f"记录 {record_id} 不在复核队列中"

        if action == ReviewAction.APPROVE:
            ok, issues = self.security.can_export(item.record)
            non_review_issues = [
                i for i in issues
                if "未经过人工复核" not in i and "不可导出" not in i and "状态为" not in i
            ]
            if non_review_issues:
                return False, f"安全检查不通过: {'; '.join(non_review_issues)}"
        else:
            ok, issues = self.security.can_export(item.record)
            non_critical_issues = [
                i for i in issues
                if "未经过人工复核" not in i and "不可导出" not in i and "状态为" not in i
            ]
            if action in [ReviewAction.FLAG_AS_LEAK, ReviewAction.REJECT] and non_critical_issues:
                pass

        if action == ReviewAction.FIX_LABEL and new_label:
            if self.allowed_labels and new_label not in self.allowed_labels:
                return False, f"标签 {new_label} 不在允许列表中"
            self.version_control.update_record(
                item.record,
                label=new_label,
                change_reason=f"复核修正标签: {item.record.label} -> {new_label}",
                changed_by=reviewer,
            )

        self.version_control.apply_review_action(
            item.record, reviewer, action, note
        )

        item.reviewed = True
        item.reviewer = reviewer
        item.review_action = action
        item.review_note = note

        self.audit_log.append(AuditLogEntry(
            operation="process_review",
            record_id=record_id,
            user=reviewer,
            details={"action": action.value, "note": note, "new_label": new_label}
        ))

        return True, f"已完成复核: {action.value}"

    def batch_review(
        self,
        record_ids: List[str],
        reviewer: str,
        action: ReviewAction,
        note: str,
    ) -> Dict[str, Any]:
        results = {"success": [], "failed": []}
        for rid in record_ids:
            ok, msg = self.process_review(rid, reviewer, action, note)
            if ok:
                results["success"].append(rid)
            else:
                results["failed"].append({"record_id": rid, "reason": msg})
        return results

    def compute_group_metrics(
        self, records: List[SampleRecord], group_by: str = "label"
    ) -> Dict[str, GroupMetrics]:
        metrics_map: Dict[str, GroupMetrics] = defaultdict(lambda: GroupMetrics(""))

        for record in records:
            if group_by == "label":
                key = record.label
            elif group_by == "status":
                key = record.status.value
            elif group_by == "group_key":
                key = record.group_key or "default"
            else:
                key = "all"

            if key not in metrics_map:
                metrics_map[key] = GroupMetrics(key)

            m = metrics_map[key]
            m.total_records += 1
            m.total_tokens += record.estimate_tokens()
            m.label_distribution[record.label] += 1

            if record.status == RecordStatus.CLEAN:
                m.clean_records += 1
            elif record.status == RecordStatus.PENDING:
                m.pending_records += 1
            elif record.status == RecordStatus.DIRTY:
                m.dirty_records += 1
            elif record.status == RecordStatus.LEAKED:
                m.leaked_records += 1

            if "duplicate" in record.tags:
                m.duplicate_count += 1

            if record.review_notes:
                reviewed_count = sum(
                    1 for r in record.review_notes if r["action"] in [
                        ReviewAction.APPROVE.value, ReviewAction.REJECT.value
                    ]
                )
                if reviewed_count > 0:
                    m.review_rate += 1

        for key, m in metrics_map.items():
            if m.total_records > 0:
                m.avg_tokens = m.total_tokens / m.total_records
                m.review_rate = m.review_rate / m.total_records
                m.pass_rate = m.clean_records / m.total_records if m.total_records > 0 else 0.0

        return dict(metrics_map)

    def generate_review_report(
        self,
        dedup_result: Any,
        records: List[SampleRecord],
    ) -> str:
        lines = ["=" * 70, "人工复核与分组指标报告", "=" * 70]

        lines.append("\n📋 复核队列概览:")
        lines.append(f"  待复核总数: {len(self.review_queue)}")
        reviewed_count = sum(1 for item in self.review_queue if item.reviewed)
        lines.append(f"  已完成: {reviewed_count}")
        lines.append(f"  待处理: {len(self.review_queue) - reviewed_count}")

        label_metrics = self.compute_group_metrics(records, "label")
        lines.append("\n📊 按标签分组指标:")
        for key, m in sorted(label_metrics.items()):
            lines.append(f"  标签 [{key}]:")
            lines.append(f"    总数: {m.total_records}, 通过率: {m.pass_rate*100:.0f}%")
            lines.append(f"    ✅{m.clean_records} ⚠️{m.pending_records} ❌{m.dirty_records} 🔒{m.leaked_records}")
            lines.append(f"    平均token: {m.avg_tokens:.0f}, 重复数: {m.duplicate_count}")

        status_metrics = self.compute_group_metrics(records, "status")
        lines.append("\n📊 按状态分组指标:")
        for key, m in sorted(status_metrics.items()):
            status_emoji = {
                "clean": "✅",
                "pending_review": "⚠️",
                "dirty": "❌",
                "train_val_leak": "🔒",
                "exported": "📦",
            }.get(key, "❓")
            lines.append(f"  {status_emoji} {key}: {m.total_records} 条")

        if self.review_queue:
            lines.append("\n📝 待复核详情:")
            for i, item in enumerate(self.review_queue, 1):
                status_marker = "✓" if item.reviewed else " "
                lines.append(f"  [{status_marker}] {i}. {item.record.record_id}")
                lines.append(f"     状态: {item.record.status.value}")
                lines.append(f"     问题: {', '.join(item.issues)}")
                lines.append(f"     标签: {item.record.label}")
                prompt_preview = item.record.prompt[:60].replace("\n", " ")
                lines.append(f"     Prompt: {prompt_preview}...")
                if item.reviewed:
                    lines.append(f"     复核: {item.reviewer} -> {item.review_action.value}")
                    lines.append(f"     备注: {item.review_note}")

        return "\n".join(lines)

    def export_review_csv(self, output_path: Optional[str] = None) -> str:
        output = io.StringIO() if output_path is None else open(output_path, "w", newline="")
        writer = csv.writer(output)
        writer.writerow([
            "记录ID", "状态", "标签", "问题", "是否已复核",
            "复核人", "复核动作", "复核备注", "版本", "Token数",
        ])
        for item in self.review_queue:
            writer.writerow([
                item.record.record_id,
                item.record.status.value,
                item.record.label,
                "; ".join(item.issues),
                "是" if item.reviewed else "否",
                item.reviewer or "",
                item.review_action.value if item.review_action else "",
                item.review_note,
                item.record.version,
                item.record.estimate_tokens(),
            ])

        if output_path is None:
            content = output.getvalue()
            output.close()
            return content
        else:
            output.close()
            return output_path
