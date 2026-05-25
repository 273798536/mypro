from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
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
        handling_opinion: str = None,
        target_model: str = None,
        target_record_id: int = None
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
            is_resolved=False,
            is_applied=False,
            target_model=target_model,
            target_record_id=target_record_id
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

    def _check_quantity_conflict(self, order_no: str, quantities: List[int], source: RecordSource) -> List[DirtyRecord]:
        dirty_records = []
        if len(quantities) > 1 and len(set(quantities)) > 1:
            dirty_records.append(self._create_dirty_record(
                source=source,
                dirty_type=DirtyType.QUANTITY_CONFLICT,
                record_id=order_no,
                field_name="quantity",
                original_value=str(quantities),
                handling_opinion=f"同一订单 {order_no} 数量冲突: {quantities}"
            ))
        return dirty_records

    def process_appointment_orders(self, orders: List[AppointmentOrderCreate]) -> Tuple[List[AppointmentOrder], List[DirtyRecord]]:
        created_orders = []
        all_dirty = []

        existing_order_nos = {o.order_no for o in self.db.query(AppointmentOrder).filter(AppointmentOrder.batch_id == self.batch_id).all()}

        order_quantities = {}
        for order_data in orders:
            if order_data.order_no and order_data.quantity is not None:
                if order_data.order_no not in order_quantities:
                    order_quantities[order_data.order_no] = []
                order_quantities[order_data.order_no].append(order_data.quantity)

        for order_no, quantities in order_quantities.items():
            all_dirty.extend(self._check_quantity_conflict(
                order_no, quantities, RecordSource.APPOINTMENT
            ))

        for order_data in orders:
            if order_data.order_no in existing_order_nos:
                continue
            
            order_dict = order_data.model_dump()
            
            order = AppointmentOrder(
                batch_id=self.batch_id,
                **order_dict
            )
            self.db.add(order)
            self.db.flush()
            
            dirty = self._check_missing_fields(
                order_dict,
                ['order_no', 'customer_name', 'appointment_time'],
                RecordSource.APPOINTMENT,
                order_data.order_no
            )
            for d in dirty:
                d.target_model = "AppointmentOrder"
                d.target_record_id = order.id
            all_dirty.extend(dirty)

            if order_data.appointment_time:
                cross_day_dirty = self._check_cross_day(
                    order_data.appointment_time,
                    RecordSource.APPOINTMENT,
                    order_data.order_no,
                    'appointment_time'
                )
                for d in cross_day_dirty:
                    d.target_model = "AppointmentOrder"
                    d.target_record_id = order.id
                all_dirty.extend(cross_day_dirty)

            created_orders.append(order)

        self.db.flush()
        return created_orders, all_dirty

    def process_technician_locations(self, locations: List[TechnicianLocationCreate]) -> Tuple[List[TechnicianLocation], List[DirtyRecord]]:
        created_locations = []
        all_dirty = []

        for loc_data in locations:
            loc_dict = loc_data.model_dump()
            
            record_id = loc_data.technician_id or loc_data.order_no or "unknown"
            
            location = TechnicianLocation(
                batch_id=self.batch_id,
                **loc_dict
            )
            self.db.add(location)
            self.db.flush()
            
            dirty = self._check_missing_fields(
                loc_dict,
                ['technician_id', 'checkin_time'],
                RecordSource.TECHNICIAN_LOCATION,
                record_id
            )
            for d in dirty:
                d.target_model = "TechnicianLocation"
                d.target_record_id = location.id
            all_dirty.extend(dirty)

            if loc_data.checkin_time:
                cross_day_dirty = self._check_cross_day(
                    loc_data.checkin_time,
                    RecordSource.TECHNICIAN_LOCATION,
                    record_id,
                    'checkin_time'
                )
                for d in cross_day_dirty:
                    d.target_model = "TechnicianLocation"
                    d.target_record_id = location.id
                all_dirty.extend(cross_day_dirty)

            created_locations.append(location)

        self.db.flush()
        return created_locations, all_dirty

    def process_user_reviews(self, reviews: List[UserReviewCreate]) -> Tuple[List[UserReview], List[DirtyRecord]]:
        created_reviews = []
        all_dirty = []

        for review_data in reviews:
            review_dict = review_data.model_dump()
            
            review = UserReview(
                batch_id=self.batch_id,
                **review_dict
            )
            self.db.add(review)
            self.db.flush()
            
            dirty = self._check_missing_fields(
                review_dict,
                ['order_no', 'rating'],
                RecordSource.USER_REVIEW,
                review_data.order_no
            )
            for d in dirty:
                d.target_model = "UserReview"
                d.target_record_id = review.id
            all_dirty.extend(dirty)

            if review_data.review_time:
                cross_day_dirty = self._check_cross_day(
                    review_data.review_time,
                    RecordSource.USER_REVIEW,
                    review_data.order_no,
                    'review_time'
                )
                for d in cross_day_dirty:
                    d.target_model = "UserReview"
                    d.target_record_id = review.id
                all_dirty.extend(cross_day_dirty)

            if review_data.rating and review_data.rating <= 2:
                if not review_data.bad_review_found or not review_data.bad_review_reason:
                    all_dirty.append(self._create_dirty_record(
                        source=RecordSource.USER_REVIEW,
                        dirty_type=DirtyType.OTHER,
                        record_id=review_data.order_no,
                        field_name="bad_review_reason",
                        original_value=review_data.bad_review_reason,
                        raw_content=review_dict,
                        handling_opinion="差评原因未找到，需要人工核实",
                        target_model="UserReview",
                        target_record_id=review.id
                    ))

            created_reviews.append(review)

        self.db.flush()
        return created_reviews, all_dirty

    def process_external_receipts(self, receipts: List[ExternalReceiptCreate]) -> Tuple[List[ExternalReceipt], List[DirtyRecord]]:
        created_receipts = []
        all_dirty = []

        order_amounts = {}
        order_quantities = {}
        for receipt_data in receipts:
            if receipt_data.order_no and receipt_data.amount is not None:
                if receipt_data.order_no not in order_amounts:
                    order_amounts[receipt_data.order_no] = []
                order_amounts[receipt_data.order_no].append(receipt_data.amount)
            
            if receipt_data.order_no and receipt_data.quantity is not None:
                if receipt_data.order_no not in order_quantities:
                    order_quantities[receipt_data.order_no] = []
                order_quantities[receipt_data.order_no].append(receipt_data.quantity)

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

        for order_no, quantities in order_quantities.items():
            all_dirty.extend(self._check_quantity_conflict(
                order_no, quantities, RecordSource.EXTERNAL_RECEIPT
            ))

        for receipt_data in receipts:
            receipt_dict = receipt_data.model_dump()
            
            receipt = ExternalReceipt(
                batch_id=self.batch_id,
                **receipt_dict
            )
            self.db.add(receipt)
            self.db.flush()
            
            dirty = self._check_missing_fields(
                receipt_dict,
                ['receipt_no', 'order_no', 'amount'],
                RecordSource.EXTERNAL_RECEIPT,
                receipt_data.receipt_no
            )
            for d in dirty:
                d.target_model = "ExternalReceipt"
                d.target_record_id = receipt.id
            all_dirty.extend(dirty)

            if receipt_data.receipt_time:
                cross_day_dirty = self._check_cross_day(
                    receipt_data.receipt_time,
                    RecordSource.EXTERNAL_RECEIPT,
                    receipt_data.receipt_no,
                    'receipt_time'
                )
                for d in cross_day_dirty:
                    d.target_model = "ExternalReceipt"
                    d.target_record_id = receipt.id
                all_dirty.extend(cross_day_dirty)

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
                handling_opinion="改约和二次上门未合并，需要确认实际情况",
                target_model="AppointmentOrder",
                target_record_id=order.id
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

    def check_quantity_conflicts_across_sources(self) -> List[DirtyRecord]:
        dirty_records = []
        
        order_quantities = {}
        
        orders = self.db.query(AppointmentOrder).filter(
            AppointmentOrder.batch_id == self.batch_id
        ).all()
        for order in orders:
            if order.order_no and order.quantity is not None:
                if order.order_no not in order_quantities:
                    order_quantities[order.order_no] = {}
                order_quantities[order.order_no]['appointment'] = order.quantity
        
        receipts = self.db.query(ExternalReceipt).filter(
            ExternalReceipt.batch_id == self.batch_id
        ).all()
        for receipt in receipts:
            if receipt.order_no and receipt.quantity is not None:
                if receipt.order_no not in order_quantities:
                    order_quantities[receipt.order_no] = {}
                if 'receipt' not in order_quantities[receipt.order_no]:
                    order_quantities[receipt.order_no]['receipt'] = []
                order_quantities[receipt.order_no]['receipt'].append(receipt.quantity)
        
        for order_no, sources in order_quantities.items():
            if 'appointment' in sources and 'receipt' in sources:
                receipt_total = sum(sources['receipt'])
                if sources['appointment'] != receipt_total:
                    dirty_records.append(self._create_dirty_record(
                        source=RecordSource.EXTERNAL_RECEIPT,
                        dirty_type=DirtyType.QUANTITY_CONFLICT,
                        record_id=order_no,
                        field_name="quantity",
                        original_value=f"预约单数量: {sources['appointment']}, 回执数量: {receipt_total}",
                        handling_opinion=f"订单 {order_no} 预约单数量与回执数量不一致: {sources['appointment']} vs {receipt_total}"
                    ))
        
        return dirty_records

    def run_all_checks(self) -> List[DirtyRecord]:
        all_dirty = []
        all_dirty.extend(self.check_reschedule_second_visit_conflict())
        all_dirty.extend(self.check_duplicate_technician_names())
        all_dirty.extend(self.check_quantity_conflicts_across_sources())
        self.db.flush()
        return all_dirty

    def apply_correction_to_target(self, dirty_record: DirtyRecord) -> bool:
        if not dirty_record.target_model or not dirty_record.target_record_id or not dirty_record.corrected_value:
            return False
        
        try:
            if dirty_record.target_model == "AppointmentOrder":
                target = self.db.query(AppointmentOrder).filter(
                    AppointmentOrder.id == dirty_record.target_record_id
                ).first()
                if target and dirty_record.field_name:
                    setattr(target, dirty_record.field_name, dirty_record.corrected_value)
            
            elif dirty_record.target_model == "UserReview":
                target = self.db.query(UserReview).filter(
                    UserReview.id == dirty_record.target_record_id
                ).first()
                if target and dirty_record.field_name:
                    if dirty_record.field_name == "bad_review_found":
                        target.bad_review_found = dirty_record.corrected_value.lower() in ('true', '1', 'yes')
                    elif dirty_record.field_name == "bad_review_reason":
                        target.bad_review_reason = dirty_record.corrected_value
                        if dirty_record.corrected_value and dirty_record.corrected_value.strip():
                            target.bad_review_found = True
                    else:
                        setattr(target, dirty_record.field_name, dirty_record.corrected_value)
            
            elif dirty_record.target_model == "ExternalReceipt":
                target = self.db.query(ExternalReceipt).filter(
                    ExternalReceipt.id == dirty_record.target_record_id
                ).first()
                if target and dirty_record.field_name:
                    if dirty_record.field_name == "quantity":
                        target.quantity = int(dirty_record.corrected_value)
                    elif dirty_record.field_name == "amount":
                        target.amount = float(dirty_record.corrected_value)
                    else:
                        setattr(target, dirty_record.field_name, dirty_record.corrected_value)
            
            elif dirty_record.target_model == "TechnicianLocation":
                target = self.db.query(TechnicianLocation).filter(
                    TechnicianLocation.id == dirty_record.target_record_id
                ).first()
                if target and dirty_record.field_name:
                    setattr(target, dirty_record.field_name, dirty_record.corrected_value)
            
            dirty_record.is_applied = True
            self.db.flush()
            return True
            
        except Exception as e:
            print(f"应用修正值失败: {e}")
            return False

    def recalculate_batch_summary(self, batch_id: int) -> Dict[str, Any]:
        batch = self.db.query(Batch).filter(Batch.id == batch_id).first()
        if not batch:
            return {}
        
        orders = self.db.query(AppointmentOrder).filter(AppointmentOrder.batch_id == batch_id).all()
        reviews = self.db.query(UserReview).filter(UserReview.batch_id == batch_id).all()
        receipts = self.db.query(ExternalReceipt).filter(ExternalReceipt.batch_id == batch_id).all()
        dirty_records = self.db.query(DirtyRecord).filter(DirtyRecord.batch_id == batch_id).all()
        
        total_quantity = sum(o.quantity or 0 for o in orders)
        receipt_quantity = sum(r.quantity or 0 for r in receipts)
        
        summary = {
            "total_orders": len(orders),
            "total_quantity": total_quantity,
            "receipt_quantity": receipt_quantity,
            "rescheduled_count": sum(1 for o in orders if o.is_rescheduled),
            "second_visit_count": sum(1 for o in orders if o.is_second_visit),
            "bad_review_count": sum(1 for r in reviews if r.rating and r.rating <= 2),
            "bad_review_not_found_count": sum(
                1 for r in reviews 
                if r.rating and r.rating <= 2 and not r.bad_review_found
            ),
            "dirty_record_count": len(dirty_records),
            "resolved_dirty_count": sum(1 for d in dirty_records if d.is_resolved),
            "quantity_conflict_count": sum(1 for d in dirty_records if d.dirty_type == DirtyType.QUANTITY_CONFLICT and not d.is_resolved),
            "calculated_at": datetime.utcnow().isoformat()
        }
        
        batch.summary_cache = summary
        batch.summary_updated_at = datetime.utcnow()
        self.db.flush()
        
        return summary
