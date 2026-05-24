from datetime import datetime
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session

from app.models.enums import DirtyType, RecordSource
from app.models.models import (
    Batch, AppointmentOrder, TechnicianLocation, UserReview,
    ExternalReceipt, DirtyRecord
)
from app.schemas.schemas import (
    AppointmentOrderCreate, TechnicianLocationCreate,
    UserReviewCreate, ExternalReceiptCreate
)


class DataProcessor:
    def __init__(self, db: Session, batch_id: int):
        self.db = db
        self.batch_id = batch_id

    def _create_dirty_record(
        self,
        source: RecordSource,
        dirty_type: DirtyType,
        record_id: str,
        field_name: str = None,
        original_value: str = None,
        raw_content: Dict[str, Any] = None,
        handling_opinion: str = None
    ) -> DirtyRecord:
        dirty = DirtyRecord(
            batch_id=self.batch_id,
            source=source,
            dirty_type=dirty_type,
            record_id=record_id,
            field_name=field_name,
            original_value=original_value,
            raw_content=raw_content,
            handling_opinion=handling_opinion,
            is_resolved=False
        )
        self.db.add(dirty)
        return dirty

    def _check_missing_fields(self, data: Dict[str, Any], required_fields: List[str], source: RecordSource, record_id: str) -> List[DirtyRecord]:
        dirty_records = []
        for field in required_fields:
            if field not in data or data[field] is None or data[field] == "":
                dirty_records.append(self._create_dirty_record(
                    source=source,
                    dirty_type=DirtyType.MISSING_FIELD,
                    record_id=record_id,
                    field_name=field,
                    original_value=str(data.get(field)),
                    raw_content=data,
                    handling_opinion=f"缺少必填字段: {field}"
                ))
        return dirty_records

    def _check_cross_day(self, time_field: datetime, source: RecordSource, record_id: str, field_name: str) -> List[DirtyRecord]:
        dirty_records = []
        batch = self.db.query(Batch).filter(Batch.id == self.batch_id).first()
        if batch and time_field:
            if time_field.date() != batch.created_at.date():
                dirty_records.append(self._create_dirty_record(
                    source=source,
                    dirty_type=DirtyType.CROSS_DAY,
                    record_id=record_id,
                    field_name=field_name,
                    original_value=time_field.isoformat(),
                    handling_opinion=f"日期跨天: 批次日期 {batch.created_at.date()}, 记录日期 {time_field.date()}"
                ))
        return dirty_records

    def process_appointment_orders(self, orders: List[AppointmentOrderCreate]) -> Tuple[List[AppointmentOrder], List[DirtyRecord]]:
        created_orders = []
        all_dirty = []

        existing_order_nos = {o.order_no for o in self.db.query(AppointmentOrder).filter(AppointmentOrder.batch_id == self.batch_id).all()}

        for order_data in orders:
            if order_data.order_no in existing_order_nos:
                continue
            
            order_dict = order_data.model_dump()
            
            dirty = self._check_missing_fields(
                order_dict,
                ['order_no', 'customer_name', 'appointment_time'],
                RecordSource.APPOINTMENT,
                order_data.order_no
            )
            all_dirty.extend(dirty)

            if order_data.appointment_time:
                all_dirty.extend(self._check_cross_day(
                    order_data.appointment_time,
                    RecordSource.APPOINTMENT,
                    order_data.order_no,
                    'appointment_time'
                ))

            order = AppointmentOrder(
                batch_id=self.batch_id,
                **order_dict
            )
            self.db.add(order)
            created_orders.append(order)

        self.db.flush()
        return created_orders, all_dirty

    def process_technician_locations(self, locations: List[TechnicianLocationCreate]) -> Tuple[List[TechnicianLocation], List[DirtyRecord]]:
        created_locations = []
        all_dirty = []

        for loc_data in locations:
            loc_dict = loc_data.model_dump()
            
            record_id = loc_data.technician_id or loc_data.order_no or "unknown"
            
            dirty = self._check_missing_fields(
                loc_dict,
                ['technician_id', 'checkin_time'],
                RecordSource.TECHNICIAN_LOCATION,
                record_id
            )
            all_dirty.extend(dirty)

            if loc_data.checkin_time:
                all_dirty.extend(self._check_cross_day(
                    loc_data.checkin_time,
                    RecordSource.TECHNICIAN_LOCATION,
                    record_id,
                    'checkin_time'
                ))

            location = TechnicianLocation(
                batch_id=self.batch_id,
                **loc_dict
            )
            self.db.add(location)
            created_locations.append(location)

        self.db.flush()
        return created_locations, all_dirty

    def process_user_reviews(self, reviews: List[UserReviewCreate]) -> Tuple[List[UserReview], List[DirtyRecord]]:
        created_reviews = []
        all_dirty = []

        for review_data in reviews:
            review_dict = review_data.model_dump()
            
            dirty = self._check_missing_fields(
                review_dict,
                ['order_no', 'rating'],
                RecordSource.USER_REVIEW,
                review_data.order_no
            )
            all_dirty.extend(dirty)

            if review_data.review_time:
                all_dirty.extend(self._check_cross_day(
                    review_data.review_time,
                    RecordSource.USER_REVIEW,
                    review_data.order_no,
                    'review_time'
                ))

            if review_data.rating and review_data.rating <= 2:
                if not review_data.bad_review_found or not review_data.bad_review_reason:
                    all_dirty.append(self._create_dirty_record(
                        source=RecordSource.USER_REVIEW,
                        dirty_type=DirtyType.OTHER,
                        record_id=review_data.order_no,
                        field_name="bad_review_reason",
                        original_value=review_data.bad_review_reason,
                        raw_content=review_dict,
                        handling_opinion="差评原因未找到，需要人工核实"
                    ))

            review = UserReview(
                batch_id=self.batch_id,
                **review_dict
            )
            self.db.add(review)
            created_reviews.append(review)

        self.db.flush()
        return created_reviews, all_dirty

    def process_external_receipts(self, receipts: List[ExternalReceiptCreate]) -> Tuple[List[ExternalReceipt], List[DirtyRecord]]:
        created_receipts = []
        all_dirty = []

        order_amounts = {}
        for receipt_data in receipts:
            if receipt_data.order_no and receipt_data.amount is not None:
                if receipt_data.order_no not in order_amounts:
                    order_amounts[receipt_data.order_no] = []
                order_amounts[receipt_data.order_no].append(receipt_data.amount)

        for order_no, amounts in order_amounts.items():
            if len(amounts) > 1 and len(set(amounts)) > 1:
                all_dirty.append(self._create_dirty_record(
                    source=RecordSource.EXTERNAL_RECEIPT,
                    dirty_type=DirtyType.AMOUNT_CONFLICT,
                    record_id=order_no,
                    field_name="amount",
                    original_value=str(amounts),
                    handling_opinion=f"同一订单 {order_no} 金额冲突: {amounts}"
                ))

        for receipt_data in receipts:
            receipt_dict = receipt_data.model_dump()
            
            dirty = self._check_missing_fields(
                receipt_dict,
                ['receipt_no', 'order_no', 'amount'],
                RecordSource.EXTERNAL_RECEIPT,
                receipt_data.receipt_no
            )
            all_dirty.extend(dirty)

            if receipt_data.receipt_time:
                all_dirty.extend(self._check_cross_day(
                    receipt_data.receipt_time,
                    RecordSource.EXTERNAL_RECEIPT,
                    receipt_data.receipt_no,
                    'receipt_time'
                ))

            receipt = ExternalReceipt(
                batch_id=self.batch_id,
                **receipt_dict
            )
            self.db.add(receipt)
            created_receipts.append(receipt)

        self.db.flush()
        return created_receipts, all_dirty

    def check_reschedule_second_visit_conflict(self) -> List[DirtyRecord]:
        dirty_records = []
        
        orders = self.db.query(AppointmentOrder).filter(
            AppointmentOrder.batch_id == self.batch_id,
            AppointmentOrder.is_rescheduled == True,
            AppointmentOrder.is_second_visit == True
        ).all()

        for order in orders:
            dirty_records.append(self._create_dirty_record(
                source=RecordSource.APPOINTMENT,
                dirty_type=DirtyType.OTHER,
                record_id=order.order_no,
                field_name="reschedule_and_second_visit",
                original_value="改约和二次上门同时标记",
                handling_opinion="改约和二次上门未合并，需要确认实际情况"
            ))

        return dirty_records

    def check_duplicate_technician_names(self) -> List[DirtyRecord]:
        dirty_records = []
        
        locations = self.db.query(TechnicianLocation).filter(
            TechnicianLocation.batch_id == self.batch_id
        ).all()

        tech_map = {}
        for loc in locations:
            if loc.technician_id:
                if loc.technician_id not in tech_map:
                    tech_map[loc.technician_id] = set()
                if loc.technician_name:
                    tech_map[loc.technician_id].add(loc.technician_name)

        for tech_id, names in tech_map.items():
            if len(names) > 1:
                dirty_records.append(self._create_dirty_record(
                    source=RecordSource.TECHNICIAN_LOCATION,
                    dirty_type=DirtyType.NAME_CHANGED,
                    record_id=tech_id,
                    field_name="technician_name",
                    original_value=str(list(names)),
                    handling_opinion=f"师傅 {tech_id} 存在多个姓名: {names}, 需确认"
                ))

        return dirty_records

    def run_all_checks(self) -> List[DirtyRecord]:
        all_dirty = []
        all_dirty.extend(self.check_reschedule_second_visit_conflict())
        all_dirty.extend(self.check_duplicate_technician_names())
        self.db.flush()
        return all_dirty
