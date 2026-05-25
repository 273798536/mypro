import json
import threading
import time
import traceback
from datetime import datetime
from typing import Dict, Any, List, Callable, Optional
from sqlalchemy.orm import Session
from .database import SessionLocal
from .repository import DataRepository, safe_json_dumps, safe_json_loads
from .models import (
    ImportTask,
    TaskStatus,
    RecordType,
    DuplicateType,
    ProcessingResult,
    PendingRecord,
    PendingRecordStatus,
)
from .config import MAX_RETRY_TIMES
from .duplicate_detector import generate_fingerprint


class TaskProcessor:
    def __init__(self):
        self.is_running = False
        self.worker_thread: Optional[threading.Thread] = None

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self.worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        self.worker_thread.start()

    def stop(self):
        self.is_running = False
        if self.worker_thread:
            self.worker_thread.join(timeout=5)

    def _worker_loop(self):
        while self.is_running:
            try:
                db = SessionLocal()
                repo = DataRepository(db)
                tasks = repo.get_pending_tasks()

                for task in tasks:
                    self._process_task(task, repo)

                db.close()
                time.sleep(2)
            except Exception as e:
                print(f"Worker loop error: {e}")
                time.sleep(5)

    def _process_task(self, task: ImportTask, repo: DataRepository):
        if task.status == TaskStatus.WAITING_RETRY and task.retry_times >= task.max_retry_times:
            repo.update_task_status(task, TaskStatus.PERMANENT_FAILED, "已达最大重试次数")
            return

        try:
            repo.update_task_status(task, TaskStatus.PROCESSING)
            repo.add_log(task, f"开始处理任务，当前重试次数: {task.retry_times}")

            pending_records = repo.get_pending_records(task.id)

            pending_count = sum(1 for r in pending_records if r.status in [PendingRecordStatus.PENDING, PendingRecordStatus.WAITING_RETRY])
            if pending_count == 0:
                self._finalize_task(task, repo)
                return

            success_count = 0
            duplicate_count = 0
            error_count = 0

            for record in pending_records:
                if record.status not in [PendingRecordStatus.PENDING, PendingRecordStatus.WAITING_RETRY]:
                    continue

                result = self._process_single_record(task, repo, record)

                if result == ProcessingResult.NEW:
                    success_count += 1
                elif result == ProcessingResult.DUPLICATE:
                    duplicate_count += 1
                elif result == ProcessingResult.ERROR:
                    error_count += 1

            repo.increment_task_counts(task, success=success_count, duplicate=duplicate_count, error=error_count)

            pending_records_after = repo.get_pending_records(task.id)
            waiting_retry_count = sum(1 for r in pending_records_after if r.status == PendingRecordStatus.WAITING_RETRY)
            waiting_manual_count = sum(1 for r in pending_records_after if r.status == PendingRecordStatus.WAITING_MANUAL)
            permanent_failed_count = sum(1 for r in pending_records_after if r.status == PendingRecordStatus.PERMANENT_FAILED)

            if waiting_manual_count > 0:
                repo.update_task_status(task, TaskStatus.WAITING_MANUAL, f"有 {waiting_manual_count} 条记录等待人工处理")
                repo.add_log(task, f"任务部分完成，{waiting_manual_count} 条记录等待人工处理")
            elif permanent_failed_count > 0 and waiting_retry_count == 0:
                repo.update_task_status(task, TaskStatus.PERMANENT_FAILED, f"有 {permanent_failed_count} 条记录永久失败")
                repo.add_log(task, f"任务完成，{permanent_failed_count} 条记录永久失败", level="warning")
            elif waiting_retry_count > 0:
                task.retry_times += 1
                if task.retry_times >= task.max_retry_times:
                    repo.update_task_status(task, TaskStatus.PERMANENT_FAILED, f"有 {waiting_retry_count} 条记录重试失败")
                    repo.add_log(task, f"任务永久失败，{waiting_retry_count} 条记录达到最大重试次数", level="error")
                else:
                    repo.update_task_status(task, TaskStatus.WAITING_RETRY, f"有 {waiting_retry_count} 条记录等待重试")
                    repo.add_log(task, f"任务部分完成，{waiting_retry_count} 条记录等待重试 ({task.retry_times}/{task.max_retry_times})", level="warning")
            else:
                self._finalize_task(task, repo)

        except Exception as e:
            error_msg = f"{str(e)}\n{traceback.format_exc()}"
            task.retry_times += 1

            if task.retry_times >= task.max_retry_times:
                repo.update_task_status(task, TaskStatus.PERMANENT_FAILED, error_msg)
                repo.add_log(task, f"任务永久失败: {str(e)}", level="error")
            else:
                repo.update_task_status(task, TaskStatus.WAITING_RETRY, error_msg)
                repo.add_log(task, f"任务失败，等待重试 ({task.retry_times}/{task.max_retry_times}): {str(e)}", level="warning")

    def _finalize_task(self, task: ImportTask, repo: DataRepository):
        repo.update_task_status(task, TaskStatus.COMPLETED)
        repo.add_log(
            task,
            f"任务处理完成: 总计{task.total_count}条, "
            f"成功{task.success_count}条, "
            f"重复{task.duplicate_count}条, "
            f"错误{task.error_count}条"
        )

    def _process_single_record(
        self, task: ImportTask, repo: DataRepository, record: PendingRecord
    ) -> ProcessingResult:
        repo.update_pending_record_status(record, PendingRecordStatus.PROCESSING)

        try:
            data = safe_json_loads(record.raw_data)
        except Exception as e:
            repo.update_pending_record_status(record, PendingRecordStatus.PERMANENT_FAILED, f"JSON解析失败: {str(e)}")
            repo.add_log(task, f"第{record.source_row_number}行原始数据解析失败: {str(e)}", level="error")
            return ProcessingResult.ERROR

        processor_map = {
            RecordType.INVENTORY: self._process_inventory,
            RecordType.REPLENISHMENT: self._process_replenishment,
            RecordType.REFUND: self._process_refund,
            RecordType.PRICE_ADJUSTMENT: self._process_price_adjustment,
        }

        processor = processor_map.get(record.record_type)
        if not processor:
            repo.update_pending_record_status(record, PendingRecordStatus.PERMANENT_FAILED, f"未知的记录类型: {record.record_type}")
            return ProcessingResult.ERROR

        return processor(task, repo, record, data)

    def _process_inventory(
        self, task: ImportTask, repo: DataRepository, record: PendingRecord, data: Dict[str, Any]
    ) -> ProcessingResult:
        try:
            fingerprint = generate_fingerprint(data, RecordType.INVENTORY)
            existing = repo.check_duplicate(fingerprint, RecordType.INVENTORY)

            if existing:
                repo.update_pending_record_status(record, PendingRecordStatus.DUPLICATE)
                dup_reason = self._get_duplicate_reason(data, existing, RecordType.INVENTORY)
                repo.add_duplicate_record(
                    task,
                    DuplicateType.EXACT_MATCH,
                    existing.record_id,
                    f"dup_{fingerprint[:8]}",
                    fingerprint,
                    dup_reason,
                    safe_json_dumps(data),
                    record.source_row_number,
                )
                repo.add_log(
                    task,
                    f"第{record.source_row_number}行检测到重复库存记录，已跳过",
                    record_id=existing.record_id,
                    raw_data=safe_json_dumps(data),
                )
                return ProcessingResult.DUPLICATE

            result = repo.create_inventory_record(task, data, record.source_row_number)
            repo.update_pending_record_status(record, PendingRecordStatus.SUCCESS)
            repo.add_log(
                task,
                f"第{record.source_row_number}行库存记录导入成功",
                record_id=result.record_id,
            )
            return ProcessingResult.NEW

        except Exception as e:
            return self._handle_record_error(task, repo, record, data, e)

    def _process_replenishment(
        self, task: ImportTask, repo: DataRepository, record: PendingRecord, data: Dict[str, Any]
    ) -> ProcessingResult:
        try:
            fingerprint = generate_fingerprint(data, RecordType.REPLENISHMENT)
            existing = repo.check_duplicate(fingerprint, RecordType.REPLENISHMENT)

            if existing:
                repo.update_pending_record_status(record, PendingRecordStatus.DUPLICATE)
                dup_reason = self._get_duplicate_reason(data, existing, RecordType.REPLENISHMENT)
                repo.add_duplicate_record(
                    task,
                    DuplicateType.EXACT_MATCH,
                    existing.record_id,
                    f"dup_{fingerprint[:8]}",
                    fingerprint,
                    dup_reason,
                    safe_json_dumps(data),
                    record.source_row_number,
                )
                repo.add_log(
                    task,
                    f"第{record.source_row_number}行检测到重复补货记录，已跳过",
                    record_id=existing.record_id,
                )
                return ProcessingResult.DUPLICATE

            result = repo.create_replenishment_record(task, data, record.source_row_number)
            repo.update_pending_record_status(record, PendingRecordStatus.SUCCESS)
            repo.add_log(
                task,
                f"第{record.source_row_number}行补货记录导入成功",
                record_id=result.record_id,
            )
            return ProcessingResult.NEW

        except Exception as e:
            return self._handle_record_error(task, repo, record, data, e)

    def _process_refund(
        self, task: ImportTask, repo: DataRepository, record: PendingRecord, data: Dict[str, Any]
    ) -> ProcessingResult:
        try:
            fingerprint = generate_fingerprint(data, RecordType.REFUND)
            existing = repo.check_duplicate(fingerprint, RecordType.REFUND)

            if existing:
                repo.update_pending_record_status(record, PendingRecordStatus.DUPLICATE)
                dup_reason = self._get_duplicate_reason(data, existing, RecordType.REFUND)
                repo.add_duplicate_record(
                    task,
                    DuplicateType.EXACT_MATCH,
                    existing.record_id,
                    f"dup_{fingerprint[:8]}",
                    fingerprint,
                    dup_reason,
                    safe_json_dumps(data),
                    record.source_row_number,
                )
                repo.add_log(
                    task,
                    f"第{record.source_row_number}行检测到重复退款记录，已跳过",
                    record_id=existing.record_id,
                )
                return ProcessingResult.DUPLICATE

            result = repo.create_refund_record(task, data, record.source_row_number)
            repo.update_pending_record_status(record, PendingRecordStatus.SUCCESS)
            repo.add_log(
                task,
                f"第{record.source_row_number}行退款记录导入成功",
                record_id=result.record_id,
            )
            return ProcessingResult.NEW

        except Exception as e:
            return self._handle_record_error(task, repo, record, data, e)

    def _process_price_adjustment(
        self, task: ImportTask, repo: DataRepository, record: PendingRecord, data: Dict[str, Any]
    ) -> ProcessingResult:
        try:
            fingerprint = generate_fingerprint(data, RecordType.PRICE_ADJUSTMENT)
            existing = repo.check_duplicate(fingerprint, RecordType.PRICE_ADJUSTMENT)

            if existing:
                repo.update_pending_record_status(record, PendingRecordStatus.DUPLICATE)
                dup_reason = self._get_duplicate_reason(data, existing, RecordType.PRICE_ADJUSTMENT)
                repo.add_duplicate_record(
                    task,
                    DuplicateType.EXACT_MATCH,
                    existing.record_id,
                    f"dup_{fingerprint[:8]}",
                    fingerprint,
                    dup_reason,
                    safe_json_dumps(data),
                    record.source_row_number,
                )
                repo.add_log(
                    task,
                    f"第{record.source_row_number}行检测到重复改价记录，已跳过",
                    record_id=existing.record_id,
                )
                return ProcessingResult.DUPLICATE

            result = repo.create_price_adjustment_record(task, data, record.source_row_number)
            repo.update_pending_record_status(record, PendingRecordStatus.SUCCESS)
            repo.add_log(
                task,
                f"第{record.source_row_number}行改价记录导入成功",
                record_id=result.record_id,
            )
            return ProcessingResult.NEW

        except Exception as e:
            return self._handle_record_error(task, repo, record, data, e)

    def _handle_record_error(
        self, task: ImportTask, repo: DataRepository, record: PendingRecord, data: Dict[str, Any], e: Exception
    ) -> ProcessingResult:
        error_msg = f"{str(e)}\n{traceback.format_exc()}"

        if record.retry_times >= record.max_retry_times:
            repo.update_pending_record_status(record, PendingRecordStatus.PERMANENT_FAILED, error_msg)
            repo.add_log(
                task,
                f"第{record.source_row_number}行处理永久失败({record.retry_times}/{record.max_retry_times}): {str(e)}",
                level="error",
                raw_data=safe_json_dumps(data),
            )
        elif self._is_manual_required_error(e):
            repo.update_pending_record_status(record, PendingRecordStatus.WAITING_MANUAL, error_msg)
            repo.add_log(
                task,
                f"第{record.source_row_number}行需要人工处理: {str(e)}",
                level="warning",
                raw_data=safe_json_dumps(data),
            )
        else:
            repo.update_pending_record_status(record, PendingRecordStatus.WAITING_RETRY, error_msg)
            repo.add_log(
                task,
                f"第{record.source_row_number}行处理失败({record.retry_times + 1}/{record.max_retry_times})，等待重试: {str(e)}",
                level="warning",
                raw_data=safe_json_dumps(data),
            )

        return ProcessingResult.ERROR

    @staticmethod
    def _is_manual_required_error(e: Exception) -> bool:
        error_str = str(e).lower()
        manual_keywords = ["manual", "invalid", "format", "schema", "constraint", "unique"]
        return any(kw in error_str for kw in manual_keywords)

    @staticmethod
    def _get_duplicate_reason(new_data: Dict, existing_record, record_type: RecordType) -> str:
        if record_type == RecordType.INVENTORY:
            reason = "网络恢复后重复扣库存" if existing_record.processing_reason else "精确匹配重复数据"
            if existing_record.is_hot_cell and existing_record.quantity == 0:
                reason = "热销格口显示满仓异常"
            return reason
        return "精确匹配重复数据"


def create_task_processor() -> TaskProcessor:
    return TaskProcessor()
