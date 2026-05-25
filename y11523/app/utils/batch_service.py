from typing import List, Dict, Any, Tuple, Optional, Set
from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
import traceback

from app.models.schemas import (
    DataBatch,
    Appointment,
    TechnicianLocation,
    UserReview,
    AbnormalPhoto,
    ExportTask,
)
from app.models.pydantic_schemas import (
    AppointmentCreate,
    TechnicianLocationCreate,
    UserReviewCreate,
    AbnormalPhotoCreate,
    DuplicateStrategy,
    BatchStatus,
)
from app.utils.audit import AuditLogger


class BatchService:
    def __init__(self, db: Session, audit_logger: AuditLogger):
        self.db = db
        self.audit_logger = audit_logger

    def _check_duplicate_appointment(self, appointment_no: str) -> Optional[Appointment]:
        return (
            self.db.query(Appointment)
            .filter(Appointment.appointment_no == appointment_no)
            .first()
        )

    def _check_duplicate_review(self, review_no: str) -> Optional[UserReview]:
        return (
            self.db.query(UserReview)
            .filter(UserReview.review_no == review_no)
            .first()
        )

    def _check_duplicate_photo(self, photo_no: str) -> Optional[AbnormalPhoto]:
        return (
            self.db.query(AbnormalPhoto)
            .filter(AbnormalPhoto.photo_no == photo_no)
            .first()
        )

    def _check_existing_batch(self, batch_no: str) -> Optional[DataBatch]:
        return (
            self.db.query(DataBatch)
            .filter(DataBatch.batch_no == batch_no)
            .first()
        )

    def _check_frozen_appointments(self, appointment_nos: List[str]) -> Set[str]:
        frozen_appointments = set()

        if not appointment_nos:
            return frozen_appointments

        frozen_export_tasks = (
            self.db.query(ExportTask)
            .filter(
                ExportTask.is_frozen == True,
                ExportTask.filters != None
            )
            .all()
        )

        for task in frozen_export_tasks:
            filters = task.filters or {}
            frozen_list = filters.get("appointment_no", [])
            for appt_no in frozen_list:
                if appt_no in appointment_nos:
                    frozen_appointments.add(appt_no)

        return frozen_appointments

    def _validate_appointment_exists(self, appointment_no: str) -> bool:
        return self._check_duplicate_appointment(appointment_no) is not None

    def _to_dict(self, obj) -> Dict[str, Any]:
        result = {}
        for column in obj.__table__.columns:
            value = getattr(obj, column.name)
            if isinstance(value, datetime):
                result[column.name] = value.isoformat()
            else:
                result[column.name] = value
        return result

    def process_batch(
        self,
        batch_no: str,
        source: str,
        operator: str,
        duplicate_strategy: DuplicateStrategy,
        appointments: List[AppointmentCreate],
        locations: List[TechnicianLocationCreate],
        reviews: List[UserReviewCreate],
        photos: List[AbnormalPhotoCreate],
        remark: str = None,
    ) -> Dict[str, Any]:
        existing_batch = self._check_existing_batch(batch_no)

        if existing_batch:
            self.audit_logger.log_operation(
                operation_type="DUPLICATE_BATCH",
                entity_type="DataBatch",
                entity_id=batch_no,
                operator=operator,
                old_value={"batch_id": existing_batch.id, "status": existing_batch.status},
                new_value={"action": duplicate_strategy.value},
                change_reason=f"Duplicate batch submission, strategy: {duplicate_strategy.value}",
            )

            if duplicate_strategy == DuplicateStrategy.IGNORE:
                return {
                    "batch_no": batch_no,
                    "status": "duplicate_ignored",
                    "message": f"Batch {batch_no} already exists, ignored.",
                    "existing_batch_id": existing_batch.id,
                    "existing_status": existing_batch.status,
                    "total_count": existing_batch.total_count,
                    "success_count": existing_batch.success_count,
                    "fail_count": existing_batch.fail_count,
                    "failed_items": [],
                    "duplicate_strategy": duplicate_strategy.value,
                    "ignored_count": 0,
                    "overwritten_count": 0,
                    "appended_count": 0,
                }
            elif duplicate_strategy == DuplicateStrategy.APPEND:
                new_batch_no = f"{batch_no}_APPEND_{datetime.now().strftime('%H%M%S')}"
                batch = DataBatch(
                    batch_no=new_batch_no,
                    source=source,
                    operator=operator,
                    duplicate_strategy=duplicate_strategy.value,
                    remark=f"Append of {batch_no}. Original remark: {remark}" if remark else f"Append of {batch_no}",
                    status=BatchStatus.PROCESSING.value,
                )
            else:
                self.db.delete(existing_batch)
                self.db.commit()
                batch = DataBatch(
                    batch_no=batch_no,
                    source=source,
                    operator=operator,
                    duplicate_strategy=duplicate_strategy.value,
                    remark=remark,
                    status=BatchStatus.PROCESSING.value,
                )
        else:
            batch = DataBatch(
                batch_no=batch_no,
                source=source,
                operator=operator,
                duplicate_strategy=duplicate_strategy.value,
                remark=remark,
                status=BatchStatus.PROCESSING.value,
            )

        self.db.add(batch)
        self.db.commit()
        self.db.refresh(batch)

        all_appointment_nos = list(set(
            [a.appointment_no for a in appointments] +
            [l.appointment_no for l in locations] +
            [r.appointment_no for r in reviews] +
            [p.appointment_no for p in photos]
        ))

        frozen_appointments = self._check_frozen_appointments(all_appointment_nos)

        total_count = len(appointments) + len(locations) + len(reviews) + len(photos)
        success_count = 0
        fail_count = 0
        ignored_count = 0
        overwritten_count = 0
        appended_count = 0
        failed_items = []

        try:
            appointment_nos_from_batch = set()

            for appt_data in appointments:
                try:
                    result, action = self._process_appointment(
                        appt_data, batch.id, duplicate_strategy, operator, frozen_appointments
                    )
                    appointment_nos_from_batch.add(appt_data.appointment_no)
                    if action == "created":
                        success_count += 1
                        appended_count += 1
                    elif action == "overwritten":
                        success_count += 1
                        overwritten_count += 1
                    elif action == "ignored":
                        ignored_count += 1
                    elif action == "frozen":
                        fail_count += 1
                        failed_items.append({
                            "type": "appointment",
                            "appointment_no": appt_data.appointment_no,
                            "error": "Appointment is frozen and cannot be modified",
                        })
                except Exception as e:
                    fail_count += 1
                    failed_items.append({
                        "type": "appointment",
                        "appointment_no": appt_data.appointment_no,
                        "error": str(e),
                        "traceback": traceback.format_exc(),
                    })

            for loc_data in locations:
                try:
                    if not self._validate_appointment_exists(loc_data.appointment_no):
                        fail_count += 1
                        failed_items.append({
                            "type": "location",
                            "appointment_no": loc_data.appointment_no,
                            "error": f"Referenced appointment {loc_data.appointment_no} does not exist",
                        })
                        continue

                    result, action = self._process_location(
                        loc_data, batch.id, duplicate_strategy, operator
                    )
                    if action == "created":
                        success_count += 1
                        appended_count += 1
                    elif action == "overwritten":
                        success_count += 1
                        overwritten_count += 1
                    elif action == "ignored":
                        ignored_count += 1
                except Exception as e:
                    fail_count += 1
                    failed_items.append({
                        "type": "location",
                        "appointment_no": loc_data.appointment_no,
                        "error": str(e),
                    })

            for review_data in reviews:
                try:
                    if not self._validate_appointment_exists(review_data.appointment_no):
                        fail_count += 1
                        failed_items.append({
                            "type": "review",
                            "appointment_no": review_data.appointment_no,
                            "error": f"Referenced appointment {review_data.appointment_no} does not exist",
                        })
                        continue

                    if review_data.appointment_no in frozen_appointments:
                        fail_count += 1
                        failed_items.append({
                            "type": "review",
                            "appointment_no": review_data.appointment_no,
                            "error": "Appointment is frozen, review cannot be modified",
                        })
                        continue

                    result, action = self._process_review(
                        review_data, batch.id, duplicate_strategy, operator
                    )
                    if action == "created":
                        success_count += 1
                        appended_count += 1
                    elif action == "overwritten":
                        success_count += 1
                        overwritten_count += 1
                    elif action == "ignored":
                        ignored_count += 1
                except Exception as e:
                    fail_count += 1
                    failed_items.append({
                        "type": "review",
                        "review_no": review_data.review_no,
                        "appointment_no": review_data.appointment_no,
                        "error": str(e),
                    })

            for photo_data in photos:
                try:
                    if not self._validate_appointment_exists(photo_data.appointment_no):
                        fail_count += 1
                        failed_items.append({
                            "type": "photo",
                            "appointment_no": photo_data.appointment_no,
                            "error": f"Referenced appointment {photo_data.appointment_no} does not exist",
                        })
                        continue

                    if photo_data.appointment_no in frozen_appointments:
                        fail_count += 1
                        failed_items.append({
                            "type": "photo",
                            "appointment_no": photo_data.appointment_no,
                            "error": "Appointment is frozen, photo cannot be modified",
                        })
                        continue

                    result, action = self._process_photo(
                        photo_data, batch.id, duplicate_strategy, operator
                    )
                    if action == "created":
                        success_count += 1
                        appended_count += 1
                    elif action == "overwritten":
                        success_count += 1
                        overwritten_count += 1
                    elif action == "ignored":
                        ignored_count += 1
                except Exception as e:
                    fail_count += 1
                    failed_items.append({
                        "type": "photo",
                        "photo_no": photo_data.photo_no,
                        "appointment_no": photo_data.appointment_no,
                        "error": str(e),
                    })

            if fail_count == 0:
                batch.status = BatchStatus.SUCCESS.value
            elif success_count > 0:
                batch.status = BatchStatus.PARTIAL_SUCCESS.value
            else:
                batch.status = BatchStatus.FAILED.value

            batch.total_count = total_count
            batch.success_count = success_count
            batch.fail_count = fail_count

            if failed_items:
                batch.remark = (remark or "") + f" | Failed items: {len(failed_items)}"

            self.db.commit()

            self.audit_logger.log_create(
                entity_type="DataBatch",
                entity_id=batch.batch_no,
                operator=operator,
                new_value={
                    "source": source,
                    "total_count": total_count,
                    "success_count": success_count,
                    "fail_count": fail_count,
                    "duplicate_strategy": duplicate_strategy.value,
                    "status": batch.status,
                    "frozen_appointments_blocked": list(frozen_appointments),
                },
            )

            return {
                "batch_no": batch.batch_no,
                "status": batch.status,
                "total_count": total_count,
                "success_count": success_count,
                "fail_count": fail_count,
                "failed_items": failed_items,
                "duplicate_strategy": duplicate_strategy.value,
                "ignored_count": ignored_count,
                "overwritten_count": overwritten_count,
                "appended_count": appended_count,
                "frozen_appointments_blocked": list(frozen_appointments),
            }

        except Exception as e:
            batch.status = BatchStatus.FAILED.value
            batch.remark = f"Batch processing failed: {str(e)}"
            self.db.commit()
            raise

    def _process_appointment(
        self,
        appt_data: AppointmentCreate,
        batch_id: int,
        strategy: DuplicateStrategy,
        operator: str,
        frozen_appointments: Set[str] = None,
    ) -> Tuple[Appointment, str]:
        frozen_appointments = frozen_appointments or set()

        existing = self._check_duplicate_appointment(appt_data.appointment_no)

        if existing and existing.appointment_no in frozen_appointments:
            raise PermissionError(f"Appointment {appt_data.appointment_no} is frozen and cannot be modified")

        if existing:
            if strategy == DuplicateStrategy.IGNORE:
                return existing, "ignored"
            elif strategy == DuplicateStrategy.OVERWRITE:
                old_value = self._to_dict(existing)

                for key, value in appt_data.model_dump(exclude_unset=True).items():
                    setattr(existing, key, value)
                existing.batch_id = batch_id

                self.db.commit()
                self.db.refresh(existing)

                self.audit_logger.log_update(
                    entity_type="Appointment",
                    entity_id=appt_data.appointment_no,
                    operator=operator,
                    old_value=old_value,
                    new_value=self._to_dict(existing),
                    change_reason=f"Batch overwrite (batch: {batch_id})",
                )
                return existing, "overwritten"
            elif strategy == DuplicateStrategy.APPEND:
                pass

        if existing and existing.is_withdrawn:
            old_value = self._to_dict(existing)
            existing.is_withdrawn = False
            existing.withdrawn_at = None
            for key, value in appt_data.model_dump(exclude_unset=True).items():
                setattr(existing, key, value)
            existing.batch_id = batch_id

            self.db.commit()
            self.db.refresh(existing)

            self.audit_logger.log_update(
                entity_type="Appointment",
                entity_id=appt_data.appointment_no,
                operator=operator,
                old_value=old_value,
                new_value=self._to_dict(existing),
                change_reason=f"Re-submit after withdrawal (batch: {batch_id})",
            )
            return existing, "overwritten"

        appt = Appointment(
            **appt_data.model_dump(exclude_unset=True),
            batch_id=batch_id,
        )
        self.db.add(appt)
        self.db.commit()
        self.db.refresh(appt)

        self.audit_logger.log_create(
            entity_type="Appointment",
            entity_id=appt_data.appointment_no,
            operator=operator,
            new_value=self._to_dict(appt),
        )
        return appt, "created"

    def _process_location(
        self,
        loc_data: TechnicianLocationCreate,
        batch_id: int,
        strategy: DuplicateStrategy,
        operator: str,
    ) -> Tuple[TechnicianLocation, str]:
        loc = TechnicianLocation(
            **loc_data.model_dump(exclude_unset=True),
            batch_id=batch_id,
        )
        self.db.add(loc)
        self.db.commit()
        self.db.refresh(loc)
        return loc, "created"

    def _process_review(
        self,
        review_data: UserReviewCreate,
        batch_id: int,
        strategy: DuplicateStrategy,
        operator: str,
    ) -> Tuple[UserReview, str]:
        existing = self._check_duplicate_review(review_data.review_no)

        if existing:
            if strategy == DuplicateStrategy.IGNORE:
                return existing, "ignored"
            elif strategy == DuplicateStrategy.OVERWRITE:
                old_value = self._to_dict(existing)

                for key, value in review_data.model_dump(exclude_unset=True).items():
                    setattr(existing, key, value)
                existing.batch_id = batch_id

                self.db.commit()
                self.db.refresh(existing)

                self.audit_logger.log_update(
                    entity_type="UserReview",
                    entity_id=review_data.review_no,
                    operator=operator,
                    old_value=old_value,
                    new_value=self._to_dict(existing),
                    change_reason=f"Batch overwrite (batch: {batch_id})",
                )
                return existing, "overwritten"

        review = UserReview(
            **review_data.model_dump(exclude_unset=True),
            batch_id=batch_id,
        )
        self.db.add(review)
        self.db.commit()
        self.db.refresh(review)

        self.audit_logger.log_create(
            entity_type="UserReview",
            entity_id=review_data.review_no,
            operator=operator,
            new_value=self._to_dict(review),
        )
        return review, "created"

    def _process_photo(
        self,
        photo_data: AbnormalPhotoCreate,
        batch_id: int,
        strategy: DuplicateStrategy,
        operator: str,
    ) -> Tuple[AbnormalPhoto, str]:
        existing = self._check_duplicate_photo(photo_data.photo_no)

        if existing:
            if strategy == DuplicateStrategy.IGNORE:
                return existing, "ignored"
            elif strategy == DuplicateStrategy.OVERWRITE:
                old_value = self._to_dict(existing)

                for key, value in photo_data.model_dump(exclude_unset=True).items():
                    setattr(existing, key, value)
                existing.batch_id = batch_id

                self.db.commit()
                self.db.refresh(existing)

                self.audit_logger.log_update(
                    entity_type="AbnormalPhoto",
                    entity_id=photo_data.photo_no,
                    operator=operator,
                    old_value=old_value,
                    new_value=self._to_dict(existing),
                    change_reason=f"Batch overwrite (batch: {batch_id})",
                )
                return existing, "overwritten"

        photo = AbnormalPhoto(
            **photo_data.model_dump(exclude_unset=True),
            batch_id=batch_id,
        )
        self.db.add(photo)
        self.db.commit()
        self.db.refresh(photo)

        self.audit_logger.log_create(
            entity_type="AbnormalPhoto",
            entity_id=photo_data.photo_no,
            operator=operator,
            new_value=self._to_dict(photo),
        )
        return photo, "created"

    def withdraw_appointment(
        self, appointment_no: str, operator: str, reason: str
    ) -> Appointment:
        appt = self._check_duplicate_appointment(appointment_no)
        if not appt:
            raise ValueError(f"Appointment {appointment_no} not found")

        old_value = self._to_dict(appt)
        appt.is_withdrawn = True
        appt.withdrawn_at = datetime.now()
        self.db.commit()
        self.db.refresh(appt)

        self.audit_logger.log_withdraw(
            entity_type="Appointment",
            entity_id=appointment_no,
            operator=operator,
            withdraw_reason=reason,
        )
        self.audit_logger.log_update(
            entity_type="Appointment",
            entity_id=appointment_no,
            operator=operator,
            old_value=old_value,
            new_value=self._to_dict(appt),
            change_reason=reason,
        )

        return appt
