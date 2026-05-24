from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from datetime import datetime
import uuid

from app.models.schemas import (
    Appointment,
    UserReview,
    AbnormalPhoto,
    Complaint,
    TechnicianLocation,
    ServiceRemark,
)
from app.utils.audit import AuditLogger


class ComplaintService:
    def __init__(self, db: Session, operator: str, audit_logger: AuditLogger):
        self.db = db
        self.operator = operator
        self.audit_logger = audit_logger

    def find_related_appointments(self, appointment_no: str) -> List[Appointment]:
        main_appt = (
            self.db.query(Appointment)
            .filter(Appointment.appointment_no == appointment_no)
            .first()
        )
        if not main_appt:
            return []

        related = [main_appt]

        if main_appt.is_rescheduled and main_appt.original_appointment_no:
            original = (
                self.db.query(Appointment)
                .filter(
                    Appointment.appointment_no == main_appt.original_appointment_no
                )
                .first()
            )
            if original:
                related.append(original)

        if main_appt.is_second_visit and main_appt.parent_appointment_no:
            parent = (
                self.db.query(Appointment)
                .filter(
                    Appointment.appointment_no == main_appt.parent_appointment_no
                )
                .first()
            )
            if parent:
                related.append(parent)

        rescheduled_children = (
            self.db.query(Appointment)
            .filter(
                Appointment.original_appointment_no == appointment_no,
                Appointment.is_rescheduled == True,
            )
            .all()
        )
        related.extend(rescheduled_children)

        second_visits = (
            self.db.query(Appointment)
            .filter(
                Appointment.parent_appointment_no == appointment_no,
                Appointment.is_second_visit == True,
            )
            .all()
        )
        related.extend(second_visits)

        return list({a.id: a for a in related}.values())

    def gather_evidence(self, appointment_no: str) -> Dict[str, Any]:
        related_appts = self.find_related_appointments(appointment_no)
        appt_nos = [a.appointment_no for a in related_appts]

        evidence = {
            "appointments": [],
            "reviews": [],
            "photos": [],
            "locations": [],
            "remarks": [],
        }

        for appt in related_appts:
            evidence["appointments"].append(
                {
                    "appointment_no": appt.appointment_no,
                    "order_no": appt.order_no,
                    "user_name": appt.user_name,
                    "user_phone": appt.user_phone,
                    "scheduled_time": (
                        appt.scheduled_time.isoformat()
                        if appt.scheduled_time
                        else None
                    ),
                    "is_rescheduled": appt.is_rescheduled,
                    "original_appointment_no": appt.original_appointment_no,
                    "is_second_visit": appt.is_second_visit,
                    "parent_appointment_no": appt.parent_appointment_no,
                    "status": appt.status,
                }
            )

        reviews = (
            self.db.query(UserReview)
            .filter(UserReview.appointment_no.in_(appt_nos))
            .all()
        )
        for review in reviews:
            evidence["reviews"].append(
                {
                    "review_no": review.review_no,
                    "appointment_no": review.appointment_no,
                    "rating": review.rating,
                    "is_negative": review.is_negative,
                    "negative_reason": review.negative_reason,
                    "negative_reason_detail": review.negative_reason_detail,
                    "review_time": (
                        review.review_time.isoformat() if review.review_time else None
                    ),
                    "manually_adjusted": review.manually_adjusted,
                }
            )

        photos = (
            self.db.query(AbnormalPhoto)
            .filter(AbnormalPhoto.appointment_no.in_(appt_nos))
            .all()
        )
        for photo in photos:
            evidence["photos"].append(
                {
                    "photo_no": photo.photo_no,
                    "appointment_no": photo.appointment_no,
                    "photo_type": photo.photo_type,
                    "description": photo.description,
                    "upload_time": (
                        photo.upload_time.isoformat() if photo.upload_time else None
                    ),
                    "is_abnormal": photo.is_abnormal,
                }
            )

        locations = (
            self.db.query(TechnicianLocation)
            .filter(TechnicianLocation.appointment_no.in_(appt_nos))
            .order_by(TechnicianLocation.location_time)
            .all()
        )
        for loc in locations:
            evidence["locations"].append(
                {
                    "appointment_no": loc.appointment_no,
                    "latitude": loc.latitude,
                    "longitude": loc.longitude,
                    "location_time": (
                        loc.location_time.isoformat() if loc.location_time else None
                    ),
                    "location_type": loc.location_type,
                }
            )

        remarks = (
            self.db.query(ServiceRemark)
            .filter(ServiceRemark.appointment_no.in_(appt_nos))
            .order_by(ServiceRemark.created_at)
            .all()
        )
        for remark in remarks:
            evidence["remarks"].append(
                {
                    "appointment_no": remark.appointment_no,
                    "operator": remark.operator,
                    "remark_type": remark.remark_type,
                    "content": remark.content,
                    "created_at": remark.created_at.isoformat(),
                }
            )

        return evidence

    def create_complaint(
        self,
        complaint_no: str,
        appointment_no: str,
        complaint_type: Optional[str] = None,
        complaint_reason: Optional[str] = None,
        review_id: Optional[int] = None,
    ) -> Complaint:
        evidence = self.gather_evidence(appointment_no)

        related_appt_nos = [a["appointment_no"] for a in evidence["appointments"]]

        complaint = Complaint(
            complaint_no=complaint_no,
            appointment_no=appointment_no,
            review_id=review_id,
            complaint_type=complaint_type,
            complaint_reason=complaint_reason,
            status="pending",
            merged_from=related_appt_nos,
            merge_evidence=evidence,
            is_merged=True,
        )

        self.db.add(complaint)
        self.db.commit()
        self.db.refresh(complaint)

        self.audit_logger.log_create(
            entity_type="Complaint",
            entity_id=complaint_no,
            operator=self.operator,
            new_value={
                "appointment_no": appointment_no,
                "complaint_type": complaint_type,
                "merged_appointments": related_appt_nos,
            },
        )

        return complaint

    def merge_complaints(
        self, target_complaint_no: str, source_complaint_nos: List[str], merge_reason: str
    ) -> Complaint:
        target = (
            self.db.query(Complaint)
            .filter(Complaint.complaint_no == target_complaint_no)
            .first()
        )
        if not target:
            raise ValueError(f"Target complaint {target_complaint_no} not found")

        sources = (
            self.db.query(Complaint)
            .filter(Complaint.complaint_no.in_(source_complaint_nos))
            .all()
        )
        if len(sources) != len(source_complaint_nos):
            found_nos = {s.complaint_no for s in sources}
            missing = set(source_complaint_nos) - found_nos
            raise ValueError(f"Source complaints not found: {missing}")

        all_merged_from = set(target.merged_from or [])
        all_evidence = target.merge_evidence or {
            "appointments": [],
            "reviews": [],
            "photos": [],
            "locations": [],
            "remarks": [],
        }

        for source in sources:
            if source.merged_from:
                all_merged_from.update(source.merged_from)
            if source.merge_evidence:
                for key in all_evidence:
                    all_evidence[key].extend(source.merge_evidence.get(key, []))

        for key in all_evidence:
            seen = set()
            unique_items = []
            for item in all_evidence[key]:
                item_key = str(item.get("appointment_no") or item.get("review_no") or item.get("photo_no") or item)
                if item_key not in seen:
                    seen.add(item_key)
                    unique_items.append(item)
            all_evidence[key] = unique_items

        old_value = {
            "merged_from": target.merged_from,
            "evidence_count": {k: len(v) for k, v in (target.merge_evidence or {}).items()},
        }

        target.merged_from = list(all_merged_from)
        target.merge_evidence = all_evidence
        target.is_merged = True

        self.db.commit()
        self.db.refresh(target)

        self.audit_logger.log_merge(
            entity_type="Complaint",
            entity_id=target_complaint_no,
            operator=self.operator,
            merged_from=source_complaint_nos,
            merge_reason=merge_reason,
        )

        self.audit_logger.log_update(
            entity_type="Complaint",
            entity_id=target_complaint_no,
            operator=self.operator,
            old_value=old_value,
            new_value={
                "merged_from": target.merged_from,
                "evidence_count": {k: len(v) for k, v in all_evidence.items()},
            },
            change_reason=merge_reason,
        )

        return target

    def verify_negative_review_evidence(
        self, review_no: str
    ) -> Tuple[bool, List[str], Dict[str, Any]]:
        review = (
            self.db.query(UserReview)
            .filter(UserReview.review_no == review_no)
            .first()
        )
        if not review:
            raise ValueError(f"Review {review_no} not found")

        if not review.is_negative:
            return True, [], {"message": "Not a negative review"}

        missing_evidence = []
        evidence = self.gather_evidence(review.appointment_no)

        has_abnormal_photos = any(p["is_abnormal"] for p in evidence["photos"])
        has_location_data = len(evidence["locations"]) > 0
        has_service_remarks = len(evidence["remarks"]) > 0

        if not has_abnormal_photos:
            missing_evidence.append("缺少异常照片证据")
        if not has_location_data:
            missing_evidence.append("缺少师傅定位数据")
        if not has_service_remarks:
            missing_evidence.append("缺少客服备注")

        has_evidence = len(missing_evidence) == 0
        return has_evidence, missing_evidence, evidence

    def get_complaint_detail(self, complaint_no: str) -> Dict[str, Any]:
        complaint = (
            self.db.query(Complaint)
            .filter(Complaint.complaint_no == complaint_no)
            .first()
        )
        if not complaint:
            raise ValueError(f"Complaint {complaint_no} not found")

        return {
            "complaint_no": complaint.complaint_no,
            "appointment_no": complaint.appointment_no,
            "complaint_type": complaint.complaint_type,
            "complaint_reason": complaint.complaint_reason,
            "status": complaint.status,
            "is_merged": complaint.is_merged,
            "merged_from": complaint.merged_from,
            "merge_evidence": complaint.merge_evidence,
            "handled_by": complaint.handled_by,
            "handled_at": (
                complaint.handled_at.isoformat() if complaint.handled_at else None
            ),
            "handle_result": complaint.handle_result,
            "created_at": complaint.created_at.isoformat(),
        }
