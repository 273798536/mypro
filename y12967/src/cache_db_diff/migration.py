"""迁移重复执行检测与处理"""
from __future__ import annotations

from collections import defaultdict
from typing import Dict, List

from .models import (
    DuplicateMigrationInfo,
    MigrationExecutionRecord,
    ProcessingOpinion,
    ProcessingRecord,
    RecordStatus,
    RecordType,
)
from .storage import StorageManager


class MigrationChecker:
    """
    迁移重复执行检测器
    - 扫描输入目录中的迁移执行记录
    - 识别重复执行的迁移
    - 生成统一的 ProcessingRecord，与 schema 对比共用同一批记录体系
    """

    def __init__(self, storage: StorageManager):
        self.storage = storage

    def detect_duplicates(self, records: List[MigrationExecutionRecord]) -> Dict[str, DuplicateMigrationInfo]:
        """
        检测重复执行的迁移
        返回 {migration_name: DuplicateMigrationInfo}
        """
        grouped: Dict[str, List[MigrationExecutionRecord]] = defaultdict(list)
        for rec in records:
            grouped[rec.migration_name].append(rec)

        duplicates: Dict[str, DuplicateMigrationInfo] = {}
        for name, execs in grouped.items():
            if len(execs) > 1:
                sorted_execs = sorted(execs, key=lambda e: e.execution_time)
                duplicates[name] = DuplicateMigrationInfo(
                    migration_name=name,
                    executions=sorted_execs,
                    first_execution=sorted_execs[0].execution_time,
                    last_execution=sorted_execs[-1].execution_time,
                    execution_count=len(sorted_execs),
                )
        return duplicates

    def create_records(self, duplicates: Dict[str, DuplicateMigrationInfo],
                       creator: str = "system") -> List[ProcessingRecord]:
        """
        为每个重复迁移创建 ProcessingRecord
        注意：与 schema diff 共用 ProcessingRecord 体系
        """
        records = []
        for dup in duplicates.values():
            existing = self.storage.find_processing_record(
                batch_id=self.storage.batch_id,
                record_type=RecordType.MIGRATION_DUPLICATE,
                migration_name=dup.migration_name,
            )
            if existing:
                records.append(existing)
                continue
            rec = ProcessingRecord(
                batch_id=self.storage.batch_id,
                record_type=RecordType.MIGRATION_DUPLICATE,
                status=RecordStatus.PENDING,
                migration_name=dup.migration_name,
                duplicate_info=dup,
                creator=creator,
            )
            self.storage.save_processing_record(rec)
            records.append(rec)
        return records

    def run(self, creator: str = "system") -> List[ProcessingRecord]:
        """执行完整检测流程"""
        migrations = self.storage.load_input_migrations()
        duplicates = self.detect_duplicates(migrations)
        return self.create_records(duplicates, creator=creator)

    def confirm_resolution(self, record_id: str, handler: str,
                           opinion: str, suggestion: str = None) -> ProcessingRecord:
        """
        确认重复迁移的处理意见
        与审计组、后端负责人使用同一套记录
        """
        rec = self.storage.find_processing_record(record_id=record_id)
        if not rec:
            raise ValueError(f"Record not found: {record_id}")
        rec.opinions.append(ProcessingOpinion(
            handler=handler,
            opinion=opinion,
            suggestion=suggestion,
        ))
        rec.status = RecordStatus.CONFIRMED
        self.storage.save_processing_record(rec)
        return rec
