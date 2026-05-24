import json
import threading
import time
import traceback
from datetime import datetime
from typing import Dict, Any, List, Callable, Optional
from sqlalchemy.orm import Session
from .database import SessionLocal
from .repository import DataRepository, safe_json_dumps
from .models import (
    ImportTask,
    TaskStatus,
    RecordType,
    DuplicateType,
    ProcessingResult,
)
from .config import MAX_RETRY_TIMES
from .duplicate_detector import generate_fingerprint


class TaskProcessor:
    def __init__(self):
        self.is_running = False
        self.worker_thread: Optional[threading.Thread] = None
        self.handlers: Dict[RecordType, Callable] = {}

    def register_handler(self, record_type: RecordType, handler: Callable):
        self.handlers[record_type] = handler

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

            handler = self.handlers.get(task.record_type)
            if not handler:
                raise ValueError(f"未找到记录类型 {task.record_type} 的处理器")

            handler(task, repo)

            repo.update_task_status(task, TaskStatus.COMPLETED)
            repo.add_log(task, "任务处理完成")

        except Exception as e:
            error_msg = f"{str(e)}\n{traceback.format_exc()}"
            task.retry_times += 1

            if task.retry_times >= task.max_retry_times:
                repo.update_task_status(task, TaskStatus.PERMANENT_FAILED, error_msg)
                repo.add_log(task, f"任务永久失败: {str(e)}", level="error")
            else:
                repo.update_task_status(task, TaskStatus.WAITING_RETRY, error_msg)
                repo.add_log(task, f"任务失败，等待重试 ({task.retry_times}/{task.max_retry_times}): {str(e)}", level="warning")


class RecordProcessor:
    @staticmethod
    def process_inventory(task: ImportTask, repo: DataRepository):
        raw_data = json.loads(task.error_message or "{}") if task.status == TaskStatus.WAITING_RETRY else {}
        records = raw_data.get("records", []) if raw_data else []

        for idx, data in enumerate(records):
            RecordProcessor._process_single_inventory(task, repo, data, idx + 1)

    @staticmethod
    def _process_single_inventory(
        task: ImportTask, repo: DataRepository, data: Dict[str, Any], row_num: int
    ):
        try:
            fingerprint = generate_fingerprint(data, RecordType.INVENTORY)
            existing = repo.check_duplicate(fingerprint, RecordType.INVENTORY)

            if existing:
                repo.increment_task_counts(task, duplicate=1)
                dup_reason = RecordProcessor._get_duplicate_reason(data, existing, RecordType.INVENTORY)
                repo.add_duplicate_record(
                    task,
                    DuplicateType.EXACT_MATCH,
                    existing.record_id,
                    f"dup_{fingerprint[:8]}",
                    fingerprint,
                    dup_reason,
                    safe_json_dumps(data),
                    row_num,
                )
                repo.add_log(
                    task,
                    f"第{row_num}行检测到重复库存记录，已跳过",
                    record_id=existing.record_id,
                    raw_data=safe_json_dumps(data),
                )
                return ProcessingResult.DUPLICATE

            record = repo.create_inventory_record(task, data, row_num)
            repo.increment_task_counts(task, success=1)
            repo.add_log(
                task,
                f"第{row_num}行库存记录导入成功",
                record_id=record.record_id,
            )
            return ProcessingResult.NEW

        except Exception as e:
            repo.increment_task_counts(task, error=1)
            repo.add_log(
                task,
                f"第{row_num}行库存记录处理失败: {str(e)}",
                level="error",
                raw_data=safe_json_dumps(data),
            )
            return ProcessingResult.ERROR

    @staticmethod
    def process_replenishment(task: ImportTask, repo: DataRepository):
        raw_data = json.loads(task.error_message or "{}") if task.status == TaskStatus.WAITING_RETRY else {}
        records = raw_data.get("records", []) if raw_data else []

        for idx, data in enumerate(records):
            RecordProcessor._process_single_replenishment(task, repo, data, idx + 1)

    @staticmethod
    def _process_single_replenishment(
        task: ImportTask, repo: DataRepository, data: Dict[str, Any], row_num: int
    ):
        try:
            fingerprint = generate_fingerprint(data, RecordType.REPLENISHMENT)
            existing = repo.check_duplicate(fingerprint, RecordType.REPLENISHMENT)

            if existing:
                repo.increment_task_counts(task, duplicate=1)
                dup_reason = RecordProcessor._get_duplicate_reason(data, existing, RecordType.REPLENISHMENT)
                repo.add_duplicate_record(
                    task,
                    DuplicateType.EXACT_MATCH,
                    existing.record_id,
                    f"dup_{fingerprint[:8]}",
                    fingerprint,
                    dup_reason,
                    safe_json_dumps(data),
                    row_num,
                )
                repo.add_log(
                    task,
                    f"第{row_num}行检测到重复补货记录，已跳过",
                    record_id=existing.record_id,
                )
                return ProcessingResult.DUPLICATE

            record = repo.create_replenishment_record(task, data, row_num)
            repo.increment_task_counts(task, success=1)
            repo.add_log(
                task,
                f"第{row_num}行补货记录导入成功",
                record_id=record.record_id,
            )
            return ProcessingResult.NEW

        except Exception as e:
            repo.increment_task_counts(task, error=1)
            repo.add_log(
                task,
                f"第{row_num}行补货记录处理失败: {str(e)}",
                level="error",
                raw_data=safe_json_dumps(data),
            )
            return ProcessingResult.ERROR

    @staticmethod
    def process_refund(task: ImportTask, repo: DataRepository):
        raw_data = json.loads(task.error_message or "{}") if task.status == TaskStatus.WAITING_RETRY else {}
        records = raw_data.get("records", []) if raw_data else []

        for idx, data in enumerate(records):
            RecordProcessor._process_single_refund(task, repo, data, idx + 1)

    @staticmethod
    def _process_single_refund(
        task: ImportTask, repo: DataRepository, data: Dict[str, Any], row_num: int
    ):
        try:
            fingerprint = generate_fingerprint(data, RecordType.REFUND)
            existing = repo.check_duplicate(fingerprint, RecordType.REFUND)

            if existing:
                repo.increment_task_counts(task, duplicate=1)
                dup_reason = RecordProcessor._get_duplicate_reason(data, existing, RecordType.REFUND)
                repo.add_duplicate_record(
                    task,
                    DuplicateType.EXACT_MATCH,
                    existing.record_id,
                    f"dup_{fingerprint[:8]}",
                    fingerprint,
                    dup_reason,
                    safe_json_dumps(data),
                    row_num,
                )
                repo.add_log(
                    task,
                    f"第{row_num}行检测到重复退款记录，已跳过",
                    record_id=existing.record_id,
                )
                return ProcessingResult.DUPLICATE

            record = repo.create_refund_record(task, data, row_num)
            repo.increment_task_counts(task, success=1)
            repo.add_log(
                task,
                f"第{row_num}行退款记录导入成功",
                record_id=record.record_id,
            )
            return ProcessingResult.NEW

        except Exception as e:
            repo.increment_task_counts(task, error=1)
            repo.add_log(
                task,
                f"第{row_num}行退款记录处理失败: {str(e)}",
                level="error",
                raw_data=safe_json_dumps(data),
            )
            return ProcessingResult.ERROR

    @staticmethod
    def process_price_adjustment(task: ImportTask, repo: DataRepository):
        raw_data = json.loads(task.error_message or "{}") if task.status == TaskStatus.WAITING_RETRY else {}
        records = raw_data.get("records", []) if raw_data else []

        for idx, data in enumerate(records):
            RecordProcessor._process_single_price_adjustment(task, repo, data, idx + 1)

    @staticmethod
    def _process_single_price_adjustment(
        task: ImportTask, repo: DataRepository, data: Dict[str, Any], row_num: int
    ):
        try:
            fingerprint = generate_fingerprint(data, RecordType.PRICE_ADJUSTMENT)
            existing = repo.check_duplicate(fingerprint, RecordType.PRICE_ADJUSTMENT)

            if existing:
                repo.increment_task_counts(task, duplicate=1)
                dup_reason = RecordProcessor._get_duplicate_reason(data, existing, RecordType.PRICE_ADJUSTMENT)
                repo.add_duplicate_record(
                    task,
                    DuplicateType.EXACT_MATCH,
                    existing.record_id,
                    f"dup_{fingerprint[:8]}",
                    fingerprint,
                    dup_reason,
                    safe_json_dumps(data),
                    row_num,
                )
                repo.add_log(
                    task,
                    f"第{row_num}行检测到重复改价记录，已跳过",
                    record_id=existing.record_id,
                )
                return ProcessingResult.DUPLICATE

            record = repo.create_price_adjustment_record(task, data, row_num)
            repo.increment_task_counts(task, success=1)
            repo.add_log(
                task,
                f"第{row_num}行改价记录导入成功",
                record_id=record.record_id,
            )
            return ProcessingResult.NEW

        except Exception as e:
            repo.increment_task_counts(task, error=1)
            repo.add_log(
                task,
                f"第{row_num}行改价记录处理失败: {str(e)}",
                level="error",
                raw_data=safe_json_dumps(data),
            )
            return ProcessingResult.ERROR

    @staticmethod
    def _get_duplicate_reason(new_data: Dict, existing_record, record_type: RecordType) -> str:
        if record_type == RecordType.INVENTORY:
            reason = "网络恢复后重复扣库存" if existing_record.processing_reason else "精确匹配重复数据"
            if existing_record.is_hot_cell and existing_record.quantity == 0:
                reason = "热销格口显示满仓异常"
            return reason
        return "精确匹配重复数据"


def create_task_processor() -> TaskProcessor:
    processor = TaskProcessor()
    processor.register_handler(RecordType.INVENTORY, RecordProcessor.process_inventory)
    processor.register_handler(RecordType.REPLENISHMENT, RecordProcessor.process_replenishment)
    processor.register_handler(RecordType.REFUND, RecordProcessor.process_refund)
    processor.register_handler(RecordType.PRICE_ADJUSTMENT, RecordProcessor.process_price_adjustment)
    return processor
