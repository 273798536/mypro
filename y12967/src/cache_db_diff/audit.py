"""审计管理器 - 变更追溯、分页顺序不稳定复核、回滚共用记录"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from .models import (
    AnomalyTrace,
    AuditAction,
    AuditLog,
    PaginationOrderConfig,
    ProcessingOpinion,
    ProcessingRecord,
    RecordStatus,
    RecordType,
    SchemaDiffResult,
)
from .storage import StorageManager


class AuditManager:
    """
    审计管理器
    - 分页顺序不稳定的复核通过：记录谁改的、什么时候改的、为什么改
    - 所有变更写入审计日志，历史可追溯
    - 异常追溯链：顺着异常能查到表结构快照和处理意见
    """

    def __init__(self, storage: StorageManager):
        self.storage = storage

    # ---------- 审计日志写入 ----------
    def log_action(self, action: AuditAction, operator: str,
                   target_type: str, target_id: str,
                   old_value: Any = None, new_value: Any = None,
                   reason: str = None, comment: str = None) -> AuditLog:
        """通用审计日志写入"""
        log = AuditLog(
            batch_id=self.storage.batch_id,
            action=action,
            operator=operator,
            target_type=target_type,
            target_id=target_id,
            old_value=old_value,
            new_value=new_value,
            reason=reason,
            comment=comment,
        )
        self.storage.save_audit_log(log)
        return log

    # ---------- 分页顺序不稳定：复核通过流程 ----------
    def register_pagination_issue(self, table_name: str,
                                  order_by_columns: List[str],
                                  is_stable: bool = False,
                                  change_reason: str = None,
                                  creator: str = "system") -> ProcessingRecord:
        """
        注册分页顺序不稳定问题，生成共用处理记录
        """
        config = PaginationOrderConfig(
            table_name=table_name,
            order_by_columns=order_by_columns,
            is_stable=is_stable,
            review_status=RecordStatus.PENDING,
            change_reason=change_reason,
        )

        existing = self.storage.find_processing_record(
            batch_id=self.storage.batch_id,
            record_type=RecordType.PAGINATION_ORDER,
            table_name=table_name,
        )
        if existing:
            existing.pagination_config = config
            self.storage.save_processing_record(existing)
            return existing

        rec = ProcessingRecord(
            batch_id=self.storage.batch_id,
            record_type=RecordType.PAGINATION_ORDER,
            status=RecordStatus.PENDING,
            table_name=table_name,
            pagination_config=config,
            creator=creator,
        )
        self.storage.save_processing_record(rec)
        return rec

    def review_pagination_passed(self, record_id: str, reviewer: str,
                                 review_comment: str,
                                 change_reason: str = None) -> ProcessingRecord:
        """
        分页顺序不稳定 被复核通过
        必须记录：谁改的、什么时候改的、为什么改
        """
        rec = self.storage.find_processing_record(record_id=record_id)
        if not rec or rec.record_type != RecordType.PAGINATION_ORDER:
            raise ValueError(f"Invalid pagination record: {record_id}")
        if not rec.pagination_config:
            raise ValueError("Record missing pagination config")

        old_status = rec.pagination_config.review_status.value
        old_config = rec.pagination_config.model_dump()

        now = datetime.now()
        rec.pagination_config.review_status = RecordStatus.REVIEW_PASSED
        rec.pagination_config.reviewer = reviewer
        rec.pagination_config.review_time = now
        rec.pagination_config.review_comment = review_comment
        if change_reason:
            rec.pagination_config.change_reason = change_reason
        rec.status = RecordStatus.REVIEW_PASSED
        rec.update_time = now

        self.log_action(
            action=AuditAction.PAGINATION_REVIEWED,
            operator=reviewer,
            target_type="processing_record",
            target_id=record_id,
            old_value=old_config,
            new_value=rec.pagination_config.model_dump(),
            reason=change_reason or review_comment,
            comment=f"分页顺序复核通过，原状态: {old_status}",
        )
        self.storage.save_processing_record(rec)
        return rec

    # ---------- 处理记录状态变更审计 ----------
    def confirm_record(self, record_id: str, operator: str,
                       opinion: str, suggestion: str = None) -> ProcessingRecord:
        """确认一条处理记录"""
        rec = self.storage.find_processing_record(record_id=record_id)
        if not rec:
            raise ValueError(f"Record not found: {record_id}")

        old_status = rec.status.value
        rec.opinions.append(ProcessingOpinion(
            handler=operator, opinion=opinion, suggestion=suggestion))
        rec.status = RecordStatus.CONFIRMED
        rec.update_time = datetime.now()

        self.log_action(
            action=AuditAction.RECORD_CONFIRMED,
            operator=operator,
            target_type="processing_record",
            target_id=record_id,
            old_value=old_status,
            new_value=rec.status.value,
            reason=opinion,
            comment=suggestion,
        )
        self.storage.save_processing_record(rec)
        return rec

    # ---------- 快照修改审计 ----------
    def log_snapshot_modified(self, snapshot_id: str, operator: str,
                              old_schema: Optional[Dict] = None,
                              new_schema: Optional[Dict] = None,
                              reason: str = None) -> AuditLog:
        """记录表结构快照被修改"""
        return self.log_action(
            action=AuditAction.SNAPSHOT_MODIFIED,
            operator=operator,
            target_type="schema_snapshot",
            target_id=snapshot_id,
            old_value=old_schema,
            new_value=new_schema,
            reason=reason,
        )

    # ---------- 结论变更审计 ----------
    def log_conclusion_changed(self, record_id: str, operator: str,
                               old_conclusion: str, new_conclusion: str,
                               reason: str) -> AuditLog:
        """记录结论变更"""
        return self.log_action(
            action=AuditAction.CONCLUSION_CHANGED,
            operator=operator,
            target_type="processing_record",
            target_id=record_id,
            old_value=old_conclusion,
            new_value=new_conclusion,
            reason=reason,
        )

    # ---------- 异常追溯链 ----------
    def create_anomaly_trace(self, anomaly_description: str,
                             anomaly_type: str,
                             root_record_id: str,
                             snapshot_chain: List[str] = None,
                             record_chain: List[str] = None,
                             creator: str = "system") -> AnomalyTrace:
        """
        创建异常追溯链
        顺着异常能查到表结构快照(snapshot_chain)和处理意见(record_chain)
        """
        # 自动从根记录推断关联链
        root_rec = self.storage.find_processing_record(record_id=root_record_id)
        auto_snaps = []
        auto_recs = [root_record_id]
        if root_rec:
            auto_snaps.extend(root_rec.snapshot_refs)
            auto_recs.extend(root_rec.related_record_ids)

        trace = AnomalyTrace(
            batch_id=self.storage.batch_id,
            anomaly_description=anomaly_description,
            anomaly_type=anomaly_type,
            root_record_id=root_record_id,
            snapshot_chain=snapshot_chain or list(dict.fromkeys(auto_snaps)),
            record_chain=record_chain or list(dict.fromkeys(auto_recs)),
        )
        self.storage.save_anomaly_trace(trace)

        rec = ProcessingRecord(
            batch_id=self.storage.batch_id,
            record_type=RecordType.ANOMALY_TRACE,
            status=RecordStatus.PENDING,
            table_name=root_rec.table_name if root_rec else None,
            related_record_ids=trace.record_chain,
            snapshot_refs=trace.snapshot_chain,
            creator=creator,
        )
        self.storage.save_processing_record(rec)
        return trace

    def resolve_anomaly(self, anomaly_id: str, resolver: str,
                        resolution_summary: str,
                        mark_records_resolved: bool = True) -> AnomalyTrace:
        """标记异常已解决"""
        trace = self.storage.load_anomaly_trace(anomaly_id)
        if not trace:
            raise ValueError(f"Anomaly not found: {anomaly_id}")
        trace.is_resolved = True
        trace.resolution_summary = resolution_summary
        trace.resolver = resolver
        self.storage.save_anomaly_trace(trace)

        if mark_records_resolved:
            for rid in trace.record_chain:
                rec = self.storage.find_processing_record(record_id=rid)
                if rec and rec.status != RecordStatus.RESOLVED:
                    self.log_action(
                        action=AuditAction.REVIEW_PASSED,
                        operator=resolver,
                        target_type="processing_record",
                        target_id=rid,
                        old_value=rec.status.value,
                        new_value=RecordStatus.RESOLVED.value,
                        reason=resolution_summary,
                        comment=f"随异常 {anomaly_id} 一并解决",
                    )
                    rec.status = RecordStatus.RESOLVED
                    rec.update_time = datetime.now()
                    self.storage.save_processing_record(rec)
        return trace

    # ---------- 查询：变更历史 ----------
    def get_change_history(self, target_type: str,
                           target_id: str) -> List[AuditLog]:
        """查询某个目标的完整变更历史"""
        return self.storage.get_audit_for_target(target_type, target_id)

    def get_pagination_review_history(self, table_name: str = None) -> List[AuditLog]:
        """查询分页复核的历史记录"""
        logs = [l for l in self.storage.load_audit_logs()
                if l.action == AuditAction.PAGINATION_REVIEWED]
        if table_name:
            logs = [l for l in logs if l.comment and table_name in l.comment]
        return logs

    # ---------- 回滚场景：共用处理记录 ----------
    def create_rollback_record(self, diff: SchemaDiffResult,
                               rollback_reason: str,
                               operator: str) -> ProcessingRecord:
        """
        回滚场景：创建与 schema diff 共用同一套的 ProcessingRecord
        保证界面、报告、审计都算同一批记录
        """
        from .snapshot import SnapshotComparator
        comparator = SnapshotComparator(self.storage)
        rec = comparator.create_schema_diff_record(
            diff, rollback_context={"reason": rollback_reason}, creator=operator)

        self.log_action(
            action=AuditAction.ROLLBACK_PERFORMED,
            operator=operator,
            target_type="processing_record",
            target_id=rec.record_id,
            new_value=diff.model_dump(),
            reason=rollback_reason,
        )
        return rec
