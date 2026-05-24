from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
import io
import csv

try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False

from app.models import TenderTask, TaskHistory, TaskStatus
from app.schemas import TaskResponse

class ExportService:
    @staticmethod
    def export_tasks_to_csv(
        db: Session,
        status: Optional[TaskStatus] = None,
        tender_no: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> io.StringIO:
        query = db.query(TenderTask)
        
        if status:
            query = query.filter(TenderTask.status == status)
        if tender_no:
            query = query.filter(TenderTask.tender_no.contains(tender_no))
        if start_date:
            query = query.filter(TenderTask.submit_time >= start_date)
        if end_date:
            query = query.filter(TenderTask.submit_time <= end_date)
        
        tasks = query.order_by(TenderTask.submit_time.desc()).all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        headers = [
            "任务ID", "批次ID", "投标编号", "项目名称", "状态",
            "提交人", "提交时间", "最后处理时间", "重试次数",
            "最大重试次数", "是否冻结", "冻结人", "冻结时间",
            "人工处理人", "错误信息", "关闭人", "关闭时间"
        ]
        writer.writerow(headers)
        
        for task in tasks:
            row = [
                task.id,
                task.batch_id,
                task.tender_no,
                task.project_name,
                task.status.value,
                task.submitter,
                task.submit_time.strftime("%Y-%m-%d %H:%M:%S") if task.submit_time else "",
                task.last_process_time.strftime("%Y-%m-%d %H:%M:%S") if task.last_process_time else "",
                task.retry_count,
                task.max_retry_times,
                "是" if task.is_frozen else "否",
                task.frozen_by or "",
                task.frozen_time.strftime("%Y-%m-%d %H:%M:%S") if task.frozen_time else "",
                task.manual_handler or "",
                task.error_message or "",
                task.closed_by or "",
                task.closed_time.strftime("%Y-%m-%d %H:%M:%S") if task.closed_time else ""
            ]
            writer.writerow(row)
        
        output.seek(0)
        return output

    @staticmethod
    def export_histories_to_csv(
        db: Session,
        task_id: Optional[int] = None,
        batch_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> io.StringIO:
        query = db.query(TaskHistory)
        
        if task_id:
            query = query.filter(TaskHistory.task_id == task_id)
        if batch_id:
            query = query.filter(TaskHistory.batch_id == batch_id)
        if start_date:
            query = query.filter(TaskHistory.operate_time >= start_date)
        if end_date:
            query = query.filter(TaskHistory.operate_time <= end_date)
        
        histories = query.order_by(TaskHistory.operate_time.desc()).all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        headers = [
            "历史ID", "任务ID", "批次ID", "操作类型",
            "操作人", "操作时间", "操作前状态", "操作后状态",
            "变更字段", "备注"
        ]
        writer.writerow(headers)
        
        for h in histories:
            row = [
                h.id,
                h.task_id,
                h.batch_id,
                h.operation_type,
                h.operator,
                h.operate_time.strftime("%Y-%m-%d %H:%M:%S") if h.operate_time else "",
                h.before_status.value if h.before_status else "",
                h.after_status.value if h.after_status else "",
                ",".join(h.changed_fields) if h.changed_fields else "",
                h.remark or ""
            ]
            writer.writerow(row)
        
        output.seek(0)
        return output

    @staticmethod
    def export_tasks_to_excel(
        db: Session,
        status: Optional[TaskStatus] = None,
        tender_no: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> io.BytesIO:
        if not HAS_PANDAS:
            raise ImportError("pandas is required for Excel export")
        
        query = db.query(TenderTask)
        
        if status:
            query = query.filter(TenderTask.status == status)
        if tender_no:
            query = query.filter(TenderTask.tender_no.contains(tender_no))
        if start_date:
            query = query.filter(TenderTask.submit_time >= start_date)
        if end_date:
            query = query.filter(TenderTask.submit_time <= end_date)
        
        tasks = query.order_by(TenderTask.submit_time.desc()).all()
        
        data = []
        for task in tasks:
            data.append({
                "任务ID": task.id,
                "批次ID": task.batch_id,
                "投标编号": task.tender_no,
                "项目名称": task.project_name,
                "状态": task.status.value,
                "提交人": task.submitter,
                "提交时间": task.submit_time,
                "最后处理时间": task.last_process_time,
                "重试次数": task.retry_count,
                "最大重试次数": task.max_retry_times,
                "是否冻结": "是" if task.is_frozen else "否",
                "冻结人": task.frozen_by,
                "冻结时间": task.frozen_time,
                "人工处理人": task.manual_handler,
                "错误信息": task.error_message,
                "关闭人": task.closed_by,
                "关闭时间": task.closed_time
            })
        
        df = pd.DataFrame(data)
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='任务列表', index=False)
        
        output.seek(0)
        return output
