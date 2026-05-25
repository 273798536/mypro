from typing import Dict, Any, List
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
import os
import pandas as pd

from app.models.schemas import (
    ExportTask,
    Appointment,
    UserReview,
    Complaint,
    TechnicianLocation,
    AbnormalPhoto,
    AuditLog,
)
from app.utils.audit import AuditLogger


class ExportService:
    def __init__(self, db: Session, audit_logger: AuditLogger):
        self.db = db
        self.audit_logger = audit_logger
        self.export_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "exports",
        )
        os.makedirs(self.export_dir, exist_ok=True)

    def _freeze_records(self, filters: Dict[str, Any], operator: str) -> List[int]:
        frozen_ids = []
        appointment_nos = []

        if "appointment_no" in filters and filters["appointment_no"]:
            appointment_nos = filters["appointment_no"]
        else:
            if filters.get("start_time") or filters.get("end_time"):
                query = self.db.query(Appointment)
                if filters.get("start_time"):
                    query = query.filter(Appointment.created_at >= filters["start_time"])
                if filters.get("end_time"):
                    query = query.filter(Appointment.created_at <= filters["end_time"])
                appts = query.all()
                appointment_nos = [a.appointment_no for a in appts]

        if appointment_nos:
            appts = (
                self.db.query(Appointment)
                .filter(Appointment.appointment_no.in_(appointment_nos))
                .all()
            )
            for appt in appts:
                self.audit_logger.log_freeze(
                    entity_type="Appointment",
                    entity_id=appt.appointment_no,
                    operator=operator,
                )
                frozen_ids.append(appt.id)

            if not filters.get("appointment_no"):
                filters["appointment_no"] = appointment_nos

        return frozen_ids

    def create_export_task(
        self,
        task_type: str,
        operator: str,
        filters: Dict[str, Any] = None,
        freeze_before_export: bool = False,
    ) -> Dict[str, Any]:
        task_no = f"EXP{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4].upper()}"

        if freeze_before_export and filters:
            self._freeze_records(filters, operator)

        task = ExportTask(
            task_no=task_no,
            task_type=task_type,
            operator=operator,
            filters=filters or {},
            is_frozen=freeze_before_export,
            frozen_at=datetime.now() if freeze_before_export else None,
            frozen_by=operator if freeze_before_export else None,
            status="processing",
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)

        self.audit_logger.log_create(
            entity_type="ExportTask",
            entity_id=task_no,
            operator=operator,
            new_value={
                "task_type": task_type,
                "filters": filters,
                "freeze_before_export": freeze_before_export,
            },
        )

        try:
            file_name, record_count = self._generate_export(task_type, filters, task_no)

            task.file_name = file_name
            task.file_path = os.path.join(self.export_dir, file_name)
            task.record_count = record_count
            task.status = "completed"
            task.completed_at = datetime.now()
            self.db.commit()
            self.db.refresh(task)

            self.audit_logger.log_export(
                entity_type="ExportTask",
                entity_id=task_no,
                operator=operator,
                record_count=record_count,
            )

            return {
                "task_no": task_no,
                "status": "completed",
                "file_name": file_name,
                "record_count": record_count,
                "is_frozen": freeze_before_export,
                "created_at": task.created_at,
            }

        except Exception as e:
            task.status = "failed"
            task.remark = str(e)
            self.db.commit()
            raise

    def _generate_export(
        self, task_type: str, filters: Dict[str, Any], task_no: str
    ) -> tuple:
        if task_type == "complaints":
            return self._export_complaints(filters, task_no)
        elif task_type == "appointments":
            return self._export_appointments(filters, task_no)
        elif task_type == "reviews":
            return self._export_reviews(filters, task_no)
        elif task_type == "audit_logs":
            return self._export_audit_logs(filters, task_no)
        elif task_type == "full_chain":
            return self._export_full_chain(filters, task_no)
        else:
            raise ValueError(f"Unknown export type: {task_type}")

    def _export_complaints(self, filters: Dict[str, Any], task_no: str) -> tuple:
        query = self.db.query(Complaint)
        if filters and "start_time" in filters:
            query = query.filter(Complaint.created_at >= filters["start_time"])
        if filters and "end_time" in filters:
            query = query.filter(Complaint.created_at <= filters["end_time"])

        complaints = query.all()
        data = []
        for c in complaints:
            data.append(
                {
                    "投诉单号": c.complaint_no,
                    "预约单号": c.appointment_no,
                    "投诉类型": c.complaint_type,
                    "投诉原因": c.complaint_reason,
                    "状态": c.status,
                    "是否合并": "是" if c.is_merged else "否",
                    "合并预约单": ",".join(c.merged_from or []),
                    "处理人": c.handled_by,
                    "处理时间": c.handled_at,
                    "处理结果": c.handle_result,
                    "创建时间": c.created_at,
                }
            )

        df = pd.DataFrame(data)
        file_name = f"{task_no}_投诉单.xlsx"
        df.to_excel(os.path.join(self.export_dir, file_name), index=False)
        return file_name, len(data)

    def _export_appointments(self, filters: Dict[str, Any], task_no: str) -> tuple:
        query = self.db.query(Appointment)
        if filters and "start_time" in filters:
            query = query.filter(Appointment.created_at >= filters["start_time"])
        if filters and "end_time" in filters:
            query = query.filter(Appointment.created_at <= filters["end_time"])

        appts = query.all()
        data = []
        for a in appts:
            data.append(
                {
                    "预约单号": a.appointment_no,
                    "订单号": a.order_no,
                    "用户姓名": a.user_name,
                    "用户电话": a.user_phone,
                    "地址": a.address,
                    "家电类型": a.appliance_type,
                    "家电型号": a.appliance_model,
                    "服务类型": a.service_type,
                    "预约时间": a.scheduled_time,
                    "实际时间": a.actual_time,
                    "师傅ID": a.technician_id,
                    "师傅姓名": a.technician_name,
                    "状态": a.status,
                    "是否改约": "是" if a.is_rescheduled else "否",
                    "原预约单号": a.original_appointment_no,
                    "是否二次上门": "是" if a.is_second_visit else "否",
                    "父预约单号": a.parent_appointment_no,
                    "是否撤回": "是" if a.is_withdrawn else "否",
                    "撤回时间": a.withdrawn_at,
                    "创建时间": a.created_at,
                }
            )

        df = pd.DataFrame(data)
        file_name = f"{task_no}_预约单.xlsx"
        df.to_excel(os.path.join(self.export_dir, file_name), index=False)
        return file_name, len(data)

    def _export_reviews(self, filters: Dict[str, Any], task_no: str) -> tuple:
        query = self.db.query(UserReview)
        if filters and "start_time" in filters:
            query = query.filter(UserReview.created_at >= filters["start_time"])
        if filters and "end_time" in filters:
            query = query.filter(UserReview.created_at <= filters["end_time"])

        reviews = query.all()
        data = []
        for r in reviews:
            data.append(
                {
                    "评价单号": r.review_no,
                    "预约单号": r.appointment_no,
                    "评分": r.rating,
                    "是否差评": "是" if r.is_negative else "否",
                    "差评原因": r.negative_reason,
                    "差评详情": r.negative_reason_detail,
                    "评价内容": r.review_content,
                    "评价人": r.reviewer_name,
                    "评价时间": r.review_time,
                    "是否人工调整": "是" if r.manually_adjusted else "否",
                    "调整人": r.adjusted_by,
                    "调整时间": r.adjusted_at,
                    "调整原因": r.adjustment_reason,
                    "创建时间": r.created_at,
                }
            )

        df = pd.DataFrame(data)
        file_name = f"{task_no}_用户评价.xlsx"
        df.to_excel(os.path.join(self.export_dir, file_name), index=False)
        return file_name, len(data)

    def _export_audit_logs(self, filters: Dict[str, Any], task_no: str) -> tuple:
        query = self.db.query(AuditLog).order_by(AuditLog.operation_time.desc())
        if filters and "start_time" in filters:
            query = query.filter(AuditLog.operation_time >= filters["start_time"])
        if filters and "end_time" in filters:
            query = query.filter(AuditLog.operation_time <= filters["end_time"])

        logs = query.all()
        data = []
        for log in logs:
            data.append(
                {
                    "操作类型": log.operation_type,
                    "实体类型": log.entity_type,
                    "实体ID": log.entity_id,
                    "操作人": log.operator,
                    "操作时间": log.operation_time,
                    "变更原因": log.change_reason,
                    "IP地址": log.ip_address,
                }
            )

        df = pd.DataFrame(data)
        file_name = f"{task_no}_操作日志.xlsx"
        df.to_excel(os.path.join(self.export_dir, file_name), index=False)
        return file_name, len(data)

    def _export_full_chain(self, filters: Dict[str, Any], task_no: str) -> tuple:
        writer = pd.ExcelWriter(
            os.path.join(self.export_dir, f"{task_no}_完整链路.xlsx"),
            engine="openpyxl",
        )

        _, count1 = self._export_complaints_to_sheet(writer, filters)
        _, count2 = self._export_appointments_to_sheet(writer, filters)
        _, count3 = self._export_reviews_to_sheet(writer, filters)
        _, count4 = self._export_locations_to_sheet(writer, filters)
        _, count5 = self._export_photos_to_sheet(writer, filters)

        writer.close()
        return f"{task_no}_完整链路.xlsx", count1 + count2 + count3 + count4 + count5

    def _export_complaints_to_sheet(self, writer, filters):
        query = self.db.query(Complaint)
        complaints = query.all()
        data = [
            {
                "投诉单号": c.complaint_no,
                "预约单号": c.appointment_no,
                "投诉类型": c.complaint_type,
                "投诉原因": c.complaint_reason,
                "状态": c.status,
                "是否合并": "是" if c.is_merged else "否",
                "创建时间": c.created_at,
            }
            for c in complaints
        ]
        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name="投诉单", index=False)
        return None, len(data)

    def _export_appointments_to_sheet(self, writer, filters):
        appts = self.db.query(Appointment).all()
        data = [
            {
                "预约单号": a.appointment_no,
                "用户姓名": a.user_name,
                "家电类型": a.appliance_type,
                "服务类型": a.service_type,
                "师傅姓名": a.technician_name,
                "是否改约": "是" if a.is_rescheduled else "否",
                "是否二次上门": "是" if a.is_second_visit else "否",
            }
            for a in appts
        ]
        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name="预约单", index=False)
        return None, len(data)

    def _export_reviews_to_sheet(self, writer, filters):
        reviews = self.db.query(UserReview).all()
        data = [
            {
                "评价单号": r.review_no,
                "预约单号": r.appointment_no,
                "评分": r.rating,
                "是否差评": "是" if r.is_negative else "否",
                "差评原因": r.negative_reason,
                "评价时间": r.review_time,
            }
            for r in reviews
        ]
        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name="用户评价", index=False)
        return None, len(data)

    def _export_locations_to_sheet(self, writer, filters):
        locations = self.db.query(TechnicianLocation).all()
        data = [
            {
                "预约单号": l.appointment_no,
                "师傅ID": l.technician_id,
                "纬度": l.latitude,
                "经度": l.longitude,
                "定位时间": l.location_time,
                "定位类型": l.location_type,
            }
            for l in locations
        ]
        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name="师傅定位", index=False)
        return None, len(data)

    def _export_photos_to_sheet(self, writer, filters):
        photos = self.db.query(AbnormalPhoto).all()
        data = [
            {
                "照片单号": p.photo_no,
                "预约单号": p.appointment_no,
                "照片类型": p.photo_type,
                "是否异常": "是" if p.is_abnormal else "否",
                "描述": p.description,
                "上传时间": p.upload_time,
            }
            for p in photos
        ]
        df = pd.DataFrame(data)
        df.to_excel(writer, sheet_name="异常照片", index=False)
        return None, len(data)


class ReconciliationService:
    def __init__(self, db: Session):
        self.db = db

    def reconcile(
        self, start_time: datetime, end_time: datetime, operator: str
    ) -> Dict[str, Any]:
        appts = (
            self.db.query(Appointment)
            .filter(
                Appointment.created_at >= start_time,
                Appointment.created_at <= end_time,
            )
            .all()
        )

        reviews = (
            self.db.query(UserReview)
            .filter(
                UserReview.created_at >= start_time,
                UserReview.created_at <= end_time,
            )
            .all()
        )

        photos = (
            self.db.query(AbnormalPhoto)
            .filter(
                AbnormalPhoto.created_at >= start_time,
                AbnormalPhoto.created_at <= end_time,
            )
            .all()
        )

        complaints = (
            self.db.query(Complaint)
            .filter(
                Complaint.created_at >= start_time,
                Complaint.created_at <= end_time,
            )
            .all()
        )

        merged_complaints = [c for c in complaints if c.is_merged]
        unmerged_complaints = [c for c in complaints if not c.is_merged]

        negative_reviews = [r for r in reviews if r.is_negative]
        negative_with_evidence = 0
        negative_without_evidence = 0
        issues = []

        for review in negative_reviews:
            appt_photos = [
                p
                for p in photos
                if p.appointment_no == review.appointment_no and p.is_abnormal
            ]
            if appt_photos:
                negative_with_evidence += 1
            else:
                negative_without_evidence += 1
                issues.append(
                    {
                        "type": "差评缺少证据",
                        "review_no": review.review_no,
                        "appointment_no": review.appointment_no,
                        "description": f"差评{review.review_no}没有对应的异常照片证据",
                    }
                )

        for complaint in unmerged_complaints:
            issues.append(
                {
                    "type": "投诉单未合并",
                    "complaint_no": complaint.complaint_no,
                    "appointment_no": complaint.appointment_no,
                    "description": f"投诉单{complaint.complaint_no}未进行链路合并",
                }
            )

        for appt in appts:
            if appt.is_rescheduled or appt.is_second_visit:
                has_complaint = any(
                    c.appointment_no == appt.appointment_no for c in complaints
                )
                if has_complaint:
                    complaint = next(
                        c
                        for c in complaints
                        if c.appointment_no == appt.appointment_no
                    )
                    if not complaint.is_merged:
                        issues.append(
                            {
                                "type": "改约/二次上门投诉未合并",
                                "complaint_no": complaint.complaint_no,
                                "appointment_no": appt.appointment_no,
                                "description": f"预约单{appt.appointment_no}存在改约/二次上门，但投诉单未合并",
                            }
                        )

        return {
            "total_appointments": len(appts),
            "total_reviews": len(reviews),
            "total_photos": len(photos),
            "total_complaints": len(complaints),
            "merged_complaints": len(merged_complaints),
            "unmerged_complaints": len(unmerged_complaints),
            "negative_reviews_with_evidence": negative_with_evidence,
            "negative_reviews_without_evidence": negative_without_evidence,
            "issues": issues,
        }
