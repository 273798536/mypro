from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import json
import uuid

from app.models import (
    ReceiptQueue, StatusHistory, QueueStatus,
    DirtyType, RetryCategory, LogisticsReceipt,
    BorrowRecord, StoreTransferRecord, MaterialList,
    Material
)
from app.schemas import (
    ReceiptQueueCreate, ManualReviewRequest,
    CompensationRequest, CloseRequest, RetryRequest,
    DeadLetterRecoverRequest, LogisticsReceiptCreate,
    BorrowRecordCreate, StoreTransferCreate, MaterialListCreate
)
from app.config import settings


class QueueService:
    @staticmethod
    def generate_queue_no() -> str:
        return f"RQ{datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:8].upper()}"

    @staticmethod
    def _calculate_amount(db: Session, material_code: Optional[str], quantity: float, unit_price: Optional[float] = None) -> float:
        if unit_price is not None and unit_price > 0:
            return round(quantity * unit_price, 2)
        if material_code:
            material = db.query(Material).filter(Material.material_code == material_code).first()
            if material and material.unit_price > 0:
                return round(quantity * material.unit_price, 2)
        return 0.0

    @staticmethod
    def _add_status_history(
        db: Session,
        queue_id: int,
        from_status: Optional[str],
        to_status: str,
        changed_by: str,
        change_reason: str
    ):
        history = StatusHistory(
            receipt_queue_id=queue_id,
            from_status=from_status,
            to_status=to_status,
            changed_by=changed_by,
            change_reason=change_reason
        )
        db.add(history)
        db.flush()

    @staticmethod
    def _detect_dirty_data(
        db: Session,
        material_name: str,
        material_code: Optional[str],
        quantity: float,
        amount: float,
        source_type: str,
        business_time: Optional[datetime] = None
    ) -> tuple[bool, Optional[str], Optional[str]]:
        is_dirty = False
        dirty_type = None
        dirty_note = None

        if not material_name or quantity <= 0:
            is_dirty = True
            dirty_type = DirtyType.MISSING_FIELD
            dirty_note = "缺少必要字段: 物料名称或数量无效"
            return is_dirty, dirty_type, dirty_note

        if material_code:
            existing = db.query(Material).filter(
                Material.material_code == material_code
            ).first()
            if existing and existing.name != material_name:
                is_dirty = True
                dirty_type = DirtyType.NAME_CHANGED
                dirty_note = f"物料编码{material_code}对应名称应为{existing.name}，实际为{material_name}"
                return is_dirty, dirty_type, dirty_note

        if business_time and material_code:
            current_date = business_time.date()

            same_day_material = db.query(ReceiptQueue).filter(
                ReceiptQueue.material_code == material_code,
                ReceiptQueue.material_name == material_name,
                ReceiptQueue.business_date.isnot(None),
                func.date(ReceiptQueue.business_date) == current_date
            ).all()

            for record in same_day_material:
                quantity_conflict = abs(record.quantity - quantity) > 0.001
                amount_conflict = amount > 0 and record.amount > 0 and abs(record.amount - amount) > 0.01
                biz_date_str = record.business_date.strftime("%Y-%m-%d") if record.business_date else "N/A"

                if amount_conflict:
                    is_dirty = True
                    dirty_type = DirtyType.AMOUNT_CONFLICT
                    dirty_note = f"同一物料当日金额冲突: 业务日期{biz_date_str}，历史记录{record.amount}，当前{amount}"
                    if quantity_conflict:
                        dirty_note += f"；同时存在数量冲突: 历史记录{record.quantity}，当前{quantity}"
                    return is_dirty, dirty_type, dirty_note

                if quantity_conflict:
                    is_dirty = True
                    dirty_type = DirtyType.QUANTITY_CONFLICT
                    dirty_note = f"同一物料当日数量冲突: 业务日期{biz_date_str}，历史记录{record.quantity}，当前{quantity}"
                    return is_dirty, dirty_type, dirty_note

        if business_time and material_code and not is_dirty:
            current_date = business_time.date()
            yesterday_date = current_date - timedelta(days=1)

            yesterday_record = db.query(ReceiptQueue).filter(
                ReceiptQueue.material_code == material_code,
                ReceiptQueue.material_name == material_name,
                ReceiptQueue.business_date.isnot(None),
                func.date(ReceiptQueue.business_date) == yesterday_date
            ).first()

            if yesterday_record:
                is_dirty = True
                dirty_type = DirtyType.CROSS_DAY
                biz_date_str = yesterday_record.business_date.strftime("%Y-%m-%d") if yesterday_record.business_date else "N/A"
                dirty_note = f"跨日重复提交: 业务日期{biz_date_str}已有相同物料记录（{yesterday_record.queue_no}），今日再次提交"
                return is_dirty, dirty_type, dirty_note

        return is_dirty, dirty_type, dirty_note

    @classmethod
    def create_queue_item(
        cls,
        db: Session,
        item_data: ReceiptQueueCreate,
        business_time: Optional[datetime] = None
    ) -> ReceiptQueue:
        is_dirty, dirty_type, dirty_note = cls._detect_dirty_data(
            db,
            item_data.material_name,
            item_data.material_code,
            item_data.quantity,
            item_data.amount,
            item_data.source_type,
            business_time
        )

        queue_item = ReceiptQueue(
            queue_no=cls.generate_queue_no(),
            source_type=item_data.source_type,
            source_id=item_data.source_id,
            material_name=item_data.material_name,
            material_code=item_data.material_code,
            quantity=item_data.quantity,
            amount=item_data.amount,
            business_date=business_time,
            logistics_receipt_id=item_data.logistics_receipt_id,
            borrow_record_id=item_data.borrow_record_id,
            store_transfer_id=item_data.store_transfer_id,
            original_data=item_data.original_data,
            max_retry_count=item_data.max_retry_count,
            is_dirty=is_dirty,
            dirty_type=dirty_type,
            dirty_note=dirty_note
        )

        if is_dirty:
            queue_item.status = QueueStatus.MANUAL_REVIEW
            queue_item.retry_category = RetryCategory.NEED_MANUAL

        db.add(queue_item)
        db.flush()

        cls._add_status_history(
            db,
            queue_item.id,
            None,
            queue_item.status,
            "system",
            f"回执创建，来源: {item_data.source_type}" + (f"，脏数据标记: {dirty_note}" if is_dirty else "")
        )

        db.commit()
        db.refresh(queue_item)
        return queue_item

    @classmethod
    def submit_logistics_receipt(
        cls,
        db: Session,
        data: LogisticsReceiptCreate
    ) -> ReceiptQueue:
        raw_data = data.raw_data or json.dumps(data.model_dump(), ensure_ascii=False, default=str)
        amount = cls._calculate_amount(db, data.material_code, data.quantity)

        receipt = LogisticsReceipt(
            tracking_number=data.tracking_number,
            material_name=data.material_name,
            material_code=data.material_code,
            quantity=data.quantity,
            sender=data.sender,
            receiver=data.receiver,
            receive_time=data.receive_time,
            signatory=data.signatory,
            sms_screenshot_url=data.sms_screenshot_url,
            raw_data=raw_data
        )
        db.add(receipt)
        db.flush()

        queue_data = ReceiptQueueCreate(
            material_name=data.material_name,
            material_code=data.material_code,
            quantity=data.quantity,
            amount=amount,
            source_type="logistics",
            source_id=receipt.id,
            logistics_receipt_id=receipt.id,
            original_data=raw_data
        )

        return cls.create_queue_item(db, queue_data, business_time=data.receive_time)

    @classmethod
    def submit_borrow_record(
        cls,
        db: Session,
        data: BorrowRecordCreate
    ) -> ReceiptQueue:
        raw_data = data.raw_data or json.dumps(data.model_dump(), ensure_ascii=False, default=str)
        amount = cls._calculate_amount(db, data.material_code, data.quantity)

        record = BorrowRecord(
            borrow_no=data.borrow_no,
            material_name=data.material_name,
            material_code=data.material_code,
            quantity=data.quantity,
            borrower=data.borrower,
            borrower_department=data.borrower_department,
            borrow_time=data.borrow_time,
            expected_return_time=data.expected_return_time,
            handler=data.handler,
            remark=data.remark,
            raw_data=raw_data
        )
        db.add(record)
        db.flush()

        queue_data = ReceiptQueueCreate(
            material_name=data.material_name,
            material_code=data.material_code,
            quantity=data.quantity,
            amount=amount,
            source_type="borrow",
            source_id=record.id,
            borrow_record_id=record.id,
            original_data=raw_data
        )

        return cls.create_queue_item(db, queue_data, business_time=data.borrow_time)

    @classmethod
    def submit_store_transfer(
        cls,
        db: Session,
        data: StoreTransferCreate
    ) -> ReceiptQueue:
        raw_data = data.raw_data or json.dumps(data.model_dump(), ensure_ascii=False, default=str)
        amount = cls._calculate_amount(db, data.material_code, data.quantity)

        transfer = StoreTransferRecord(
            transfer_no=data.transfer_no,
            material_name=data.material_name,
            material_code=data.material_code,
            quantity=data.quantity,
            from_store=data.from_store,
            to_store=data.to_store,
            transfer_time=data.transfer_time,
            handler=data.handler,
            receiver=data.receiver,
            raw_data=raw_data
        )
        db.add(transfer)
        db.flush()

        queue_data = ReceiptQueueCreate(
            material_name=data.material_name,
            material_code=data.material_code,
            quantity=data.quantity,
            amount=amount,
            source_type="store_transfer",
            source_id=transfer.id,
            store_transfer_id=transfer.id,
            original_data=raw_data
        )

        return cls.create_queue_item(db, queue_data, business_time=data.transfer_time)

    @classmethod
    def submit_material_list(
        cls,
        db: Session,
        data: MaterialListCreate
    ) -> ReceiptQueue:
        raw_data = data.raw_data or json.dumps(data.model_dump(), ensure_ascii=False, default=str)
        quantity = data.actual_quantity if data.actual_quantity is not None else data.planned_quantity
        unit_price = data.unit_price if data.unit_price > 0 else None
        amount = cls._calculate_amount(db, data.material_code, quantity, unit_price)
        total_amount = round(quantity * (unit_price or 0), 2) if unit_price else amount

        business_time = data.list_date or datetime.now()

        material_list = MaterialList(
            list_no=data.list_no,
            exhibition_name=data.exhibition_name,
            material_name=data.material_name,
            material_code=data.material_code,
            planned_quantity=data.planned_quantity,
            actual_quantity=data.actual_quantity,
            unit_price=data.unit_price,
            total_amount=total_amount,
            list_date=data.list_date,
            responsible_person=data.responsible_person,
            raw_data=raw_data
        )
        db.add(material_list)
        db.flush()

        queue_data = ReceiptQueueCreate(
            material_name=data.material_name,
            material_code=data.material_code,
            quantity=quantity,
            amount=amount,
            source_type="material_list",
            source_id=material_list.id,
            original_data=raw_data
        )

        return cls.create_queue_item(db, queue_data, business_time=business_time)

    @classmethod
    def process_retry(
        cls,
        db: Session,
        queue_id: int,
        retry_data: RetryRequest
    ) -> ReceiptQueue:
        queue_item = db.query(ReceiptQueue).filter(ReceiptQueue.id == queue_id).first()
        if not queue_item:
            raise ValueError("队列项不存在")

        old_status = queue_item.status
        queue_item.retry_count += 1
        queue_item.last_retry_time = datetime.now()

        if queue_item.retry_count >= queue_item.max_retry_count:
            queue_item.status = QueueStatus.DEAD_LETTER
            queue_item.retry_category = RetryCategory.NEED_MANUAL
            reason = f"达到最大重试次数{queue_item.max_retry_count}，转入死信队列"
        else:
            queue_item.status = QueueStatus.RETRYING
            queue_item.next_retry_time = datetime.now() + timedelta(minutes=settings.RETRY_INTERVAL_MINUTES)
            reason = f"第{queue_item.retry_count}次重试: {retry_data.reason}"

        cls._add_status_history(
            db,
            queue_item.id,
            old_status,
            queue_item.status,
            retry_data.triggered_by,
            reason
        )

        db.commit()
        db.refresh(queue_item)
        return queue_item

    @classmethod
    def manual_review(
        cls,
        db: Session,
        queue_id: int,
        review_data: ManualReviewRequest
    ) -> ReceiptQueue:
        queue_item = db.query(ReceiptQueue).filter(ReceiptQueue.id == queue_id).first()
        if not queue_item:
            raise ValueError("队列项不存在")

        old_status = queue_item.status
        queue_item.handler = review_data.handler
        queue_item.handled_at = datetime.now()
        queue_item.handle_note = review_data.handle_note

        if review_data.corrected_data:
            queue_item.corrected_data = json.dumps(review_data.corrected_data, ensure_ascii=False)
            queue_item.correction_note = review_data.correction_note
            queue_item.is_dirty = False
            queue_item.dirty_type = None
            queue_item.dirty_note = None

            if 'quantity' in review_data.corrected_data:
                queue_item.quantity = review_data.corrected_data['quantity']
            if 'amount' in review_data.corrected_data:
                queue_item.amount = review_data.corrected_data['amount']
            if 'material_name' in review_data.corrected_data:
                queue_item.material_name = review_data.corrected_data['material_name']
            if 'material_code' in review_data.corrected_data:
                queue_item.material_code = review_data.corrected_data['material_code']

        queue_item.status = QueueStatus.PENDING
        queue_item.retry_count = 0

        cls._add_status_history(
            db,
            queue_item.id,
            old_status,
            queue_item.status,
            review_data.handler,
            f"人工审核完成: {review_data.handle_note}" +
            (f"，数据已修正: {review_data.correction_note}" if review_data.corrected_data else "")
        )

        db.commit()
        db.refresh(queue_item)
        return queue_item

    @classmethod
    def compensate(
        cls,
        db: Session,
        queue_id: int,
        comp_data: CompensationRequest
    ) -> ReceiptQueue:
        queue_item = db.query(ReceiptQueue).filter(ReceiptQueue.id == queue_id).first()
        if not queue_item:
            raise ValueError("队列项不存在")

        old_status = queue_item.status
        queue_item.status = QueueStatus.COMPENSATED
        queue_item.compensated_amount = comp_data.compensated_amount
        queue_item.compensated_at = datetime.now()
        queue_item.compensated_by = comp_data.compensated_by
        queue_item.handler = comp_data.compensated_by
        queue_item.handled_at = datetime.now()
        queue_item.handle_note = comp_data.compensation_note

        cls._add_status_history(
            db,
            queue_item.id,
            old_status,
            queue_item.status,
            comp_data.compensated_by,
            f"补偿入账，金额: {comp_data.compensated_amount}，备注: {comp_data.compensation_note}"
        )

        db.commit()
        db.refresh(queue_item)
        return queue_item

    @classmethod
    def close(
        cls,
        db: Session,
        queue_id: int,
        close_data: CloseRequest
    ) -> ReceiptQueue:
        queue_item = db.query(ReceiptQueue).filter(ReceiptQueue.id == queue_id).first()
        if not queue_item:
            raise ValueError("队列项不存在")

        old_status = queue_item.status
        queue_item.status = QueueStatus.CLOSED
        queue_item.closed_at = datetime.now()
        queue_item.closed_by = close_data.closed_by
        queue_item.close_note = close_data.close_note

        cls._add_status_history(
            db,
            queue_item.id,
            old_status,
            queue_item.status,
            close_data.closed_by,
            f"关闭队列项: {close_data.close_note}"
        )

        db.commit()
        db.refresh(queue_item)
        return queue_item

    @classmethod
    def recover_dead_letter(
        cls,
        db: Session,
        queue_id: int,
        recover_data: DeadLetterRecoverRequest
    ) -> ReceiptQueue:
        queue_item = db.query(ReceiptQueue).filter(ReceiptQueue.id == queue_id).first()
        if not queue_item:
            raise ValueError("队列项不存在")
        if queue_item.status != QueueStatus.DEAD_LETTER:
            raise ValueError("只有死信队列项可以恢复")

        old_status = queue_item.status
        queue_item.status = QueueStatus.PENDING
        queue_item.retry_count = 0
        queue_item.max_retry_count = recover_data.new_max_retry
        queue_item.handler = recover_data.recovered_by
        queue_item.handled_at = datetime.now()
        queue_item.handle_note = recover_data.recovery_note

        cls._add_status_history(
            db,
            queue_item.id,
            old_status,
            queue_item.status,
            recover_data.recovered_by,
            f"从死信队列恢复: {recover_data.recovery_note}，新重试次数限制: {recover_data.new_max_retry}"
        )

        db.commit()
        db.refresh(queue_item)
        return queue_item

    @staticmethod
    def get_queue_item(db: Session, queue_id: int) -> Optional[ReceiptQueue]:
        return db.query(ReceiptQueue).filter(ReceiptQueue.id == queue_id).first()

    @staticmethod
    def get_queue_by_no(db: Session, queue_no: str) -> Optional[ReceiptQueue]:
        return db.query(ReceiptQueue).filter(ReceiptQueue.queue_no == queue_no).first()

    @staticmethod
    def list_queue(
        db: Session,
        status: Optional[List[str]] = None,
        source_type: Optional[List[str]] = None,
        is_dirty: Optional[bool] = None,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[ReceiptQueue], int]:
        query = db.query(ReceiptQueue)

        if status:
            query = query.filter(ReceiptQueue.status.in_(status))
        if source_type:
            query = query.filter(ReceiptQueue.source_type.in_(source_type))
        if is_dirty is not None:
            query = query.filter(ReceiptQueue.is_dirty == is_dirty)

        total = query.count()
        items = query.order_by(ReceiptQueue.created_at.desc()).offset(
            (page - 1) * page_size
        ).limit(page_size).all()

        return items, total
