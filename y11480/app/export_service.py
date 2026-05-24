import pandas as pd
from io import BytesIO
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session

from app import models, schemas
from app.models import BatchStatus


class ExportService:
    def __init__(self, db: Session):
        self.db = db

    def get_batches_for_export(self, filters: schemas.ExportFilter) -> List[models.Batch]:
        query = self.db.query(models.Batch)

        if filters.status:
            query = query.filter(models.Batch.status == filters.status)
        if filters.start_date:
            query = query.filter(models.Batch.production_date >= filters.start_date)
        if filters.end_date:
            query = query.filter(models.Batch.production_date <= filters.end_date)
        if filters.pot_no:
            query = query.filter(models.Batch.pot_no == filters.pot_no)

        return query.order_by(models.Batch.created_at.desc()).all()

    def export_batches_to_excel(self, filters: schemas.ExportFilter) -> BytesIO:
        batches = self.get_batches_for_export(filters)

        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            self._write_batch_summary(batches, writer)
            self._write_sample_labels(batches, writer)
            self._write_temperature_records(batches, writer)
            self._write_store_complaints(batches, writer)
            self._write_affected_stores(batches, writer)
            self._write_supervisor_comments(batches, writer)
            self._write_status_history(batches, writer)

        output.seek(0)
        return output

    def _write_batch_summary(self, batches: List[models.Batch], writer):
        data = []
        for batch in batches:
            data.append({
                '批次号': batch.batch_no,
                '锅次号': batch.pot_no,
                '产品名称': batch.product_name,
                '生产日期': batch.production_date.strftime('%Y-%m-%d') if batch.production_date else '',
                '当前状态': batch.status.value,
                '冻结前状态': batch.before_freeze_status.value if batch.before_freeze_status else '',
                '冻结原因': batch.freeze_reason or '',
                '创建人': batch.creator.full_name if batch.creator else '',
                '创建时间': batch.created_at.strftime('%Y-%m-%d %H:%M:%S') if batch.created_at else '',
                '复核人': batch.reviewer.full_name if batch.reviewer else '',
                '复核时间': batch.reviewed_at.strftime('%Y-%m-%d %H:%M:%S') if batch.reviewed_at else '',
                '复核结果': batch.review_result or '',
                '复核意见': batch.review_comment or '',
                '留样标签数': len(batch.sample_labels),
                '温度记录数': len(batch.temperature_records),
                '门店投诉数': len(batch.store_complaints),
                '受影响门店数': len(batch.affected_stores)
            })

        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name='批次汇总', index=False)

    def _write_sample_labels(self, batches: List[models.Batch], writer):
        data = []
        for batch in batches:
            for label in batch.sample_labels:
                data.append({
                    '批次号': batch.batch_no,
                    '标签编号': label.label_code,
                    '留样时间': label.sample_time.strftime('%Y-%m-%d %H:%M:%S') if label.sample_time else '',
                    '留样人': label.sampler or '',
                    '留样位置': label.sample_location or '',
                    '留样数量': label.quantity or '',
                    '单位': label.unit or '',
                    '储存条件': label.storage_condition or ''
                })

        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name='留样标签', index=False)

    def _write_temperature_records(self, batches: List[models.Batch], writer):
        data = []
        for batch in batches:
            for record in batch.temperature_records:
                data.append({
                    '批次号': batch.batch_no,
                    '记录时间': record.record_time.strftime('%Y-%m-%d %H:%M:%S') if record.record_time else '',
                    '温度(℃)': record.temperature,
                    '测量点': record.measure_point or '',
                    '记录人': record.recorder or '',
                    '是否异常': '是' if record.is_abnormal else '否',
                    '备注': record.remark or ''
                })

        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name='温度记录', index=False)

    def _write_store_complaints(self, batches: List[models.Batch], writer):
        data = []
        for batch in batches:
            for complaint in batch.store_complaints:
                data.append({
                    '批次号': batch.batch_no,
                    '门店名称': complaint.store_name,
                    '门店编号': complaint.store_code or '',
                    '投诉时间': complaint.complaint_time.strftime('%Y-%m-%d %H:%M:%S') if complaint.complaint_time else '',
                    '投诉类型': complaint.complaint_type or '',
                    '投诉内容': complaint.complaint_content,
                    '涉及数量': complaint.quantity or '',
                    '涉及金额': complaint.amount or '',
                    '联系人': complaint.contact_person or '',
                    '联系电话': complaint.contact_phone or '',
                    '处理状态': complaint.status or ''
                })

        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name='门店投诉', index=False)

    def _write_affected_stores(self, batches: List[models.Batch], writer):
        data = []
        for batch in batches:
            for store in batch.affected_stores:
                data.append({
                    '批次号': batch.batch_no,
                    '锅次号': batch.pot_no,
                    '门店名称': store.store_name,
                    '门店编号': store.store_code or '',
                    '收货数量': store.quantity_received or '',
                    '已用数量': store.quantity_used or '',
                    '剩余数量': store.quantity_remaining or '',
                    '配送时间': store.distribution_time.strftime('%Y-%m-%d %H:%M:%S') if store.distribution_time else ''
                })

        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name='受影响门店', index=False)

    def _write_supervisor_comments(self, batches: List[models.Batch], writer):
        data = []
        for batch in batches:
            for comment in batch.supervisor_comments:
                data.append({
                    '批次号': batch.batch_no,
                    '批注类型': comment.comment_type or '',
                    '批注内容': comment.content,
                    '批注人': comment.supervisor.full_name if comment.supervisor else '',
                    '批注时间': comment.created_at.strftime('%Y-%m-%d %H:%M:%S') if comment.created_at else ''
                })

        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name='主管批注', index=False)

    def _write_status_history(self, batches: List[models.Batch], writer):
        data = []
        for batch in batches:
            for history in batch.status_history:
                data.append({
                    '批次号': batch.batch_no,
                    '原状态': history.from_status.value if history.from_status else '',
                    '新状态': history.to_status.value,
                    '变更人': self.db.query(models.User).filter(models.User.id == history.changed_by).first().full_name if history.changed_by else '',
                    '变更原因': history.change_reason or '',
                    '变更时间': history.created_at.strftime('%Y-%m-%d %H:%M:%S') if history.created_at else ''
                })

        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name='状态变更历史', index=False)
