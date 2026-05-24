import json
import uuid
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.enums import ExceptionType, ReceiptStatus, OperationType, DataSource, ReviewChannel
from app.models import (
    Batch,
    LeaderRefundRaw,
    WarehouseReviewRaw,
    ExceptionReceipt,
    StatusHistory,
    AuditLog
)
from app.services.state_machine import ReceiptStateMachine


def safe_str(value):
    if value is None or (isinstance(value, float) and value != value):
        return ""
    return str(value).strip()


def clean_nan_values(data: Dict[str, Any]) -> Dict[str, Any]:
    return {k: ("" if (isinstance(v, float) and v != v) else v) for k, v in data.items()}


class ImportService:
    def __init__(self, db: Session):
        self.db = db

    def _generate_receipt_no(self) -> str:
        return f"RCP{datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:8].upper()}"

    def import_leader_refunds(
        self,
        batch_no: str,
        source_file: str,
        operator: str,
        rows_data: List[Dict[str, Any]],
        remark: str = None
    ) -> Tuple[Batch, List[Dict[str, Any]], bool]:
        existing_batch = self.db.query(Batch).filter(Batch.batch_no == batch_no).first()
        if existing_batch:
            return existing_batch, [], True

        batch = Batch(
            batch_no=batch_no,
            source_file=source_file,
            data_source=DataSource.LEADER_REFUND_TABLE,
            operator=operator,
            remark=remark,
            total_count=len(rows_data)
        )
        self.db.add(batch)
        self.db.flush()

        failed_rows = []
        success_count = 0

        for idx, row_data in enumerate(rows_data, start=1):
            try:
                raw_refund = LeaderRefundRaw(
                    batch_id=batch.id,
                    original_row_no=idx,
                    original_data=json.dumps(row_data, ensure_ascii=False)
                )

                order_no = safe_str(row_data.get("订单号") or row_data.get("order_no"))
                leader_id = safe_str(row_data.get("团长ID") or row_data.get("leader_id"))
                leader_name = safe_str(row_data.get("团长名称") or row_data.get("leader_name"))
                city = safe_str(row_data.get("城市") or row_data.get("city"))
                
                refund_amount_str = safe_str(row_data.get("退款金额") or row_data.get("refund_amount"))
                refund_amount = float(refund_amount_str) if refund_amount_str else 0
                
                refund_reason = safe_str(row_data.get("退款原因") or row_data.get("refund_reason"))
                
                exception_type_str = safe_str(row_data.get("异常类型") or row_data.get("exception_type"))
                exception_type = None
                if exception_type_str:
                    for et in ExceptionType:
                        if et.value == exception_type_str or et.name.lower() == exception_type_str.lower():
                            exception_type = et
                            break

                refund_time_str = row_data.get("退款时间") or row_data.get("refund_time")
                refund_time = None
                if refund_time_str:
                    try:
                        if isinstance(refund_time_str, str):
                            refund_time = datetime.fromisoformat(refund_time_str.replace('Z', '+00:00'))
                    except (ValueError, TypeError):
                        pass

                raw_refund.order_no = order_no
                raw_refund.leader_id = leader_id
                raw_refund.leader_name = leader_name
                raw_refund.city = city
                raw_refund.refund_amount = refund_amount
                raw_refund.refund_reason = refund_reason
                raw_refund.exception_type = exception_type
                raw_refund.refund_time = refund_time
                raw_refund.parse_success = bool(order_no and leader_id)
                raw_refund.parse_error = None if raw_refund.parse_success else "订单号或团长ID为空"

                self.db.add(raw_refund)

                if raw_refund.parse_success:
                    self._create_or_update_receipt_from_refund(raw_refund, operator)
                    success_count += 1
                else:
                    failed_rows.append({
                        "row_no": idx,
                        "error": raw_refund.parse_error or "解析失败",
                        "data": clean_nan_values(row_data)
                    })

            except Exception as e:
                    failed_rows.append({
                        "row_no": idx,
                        "error": str(e),
                        "data": clean_nan_values(row_data)
                    })

        batch.success_count = success_count
        batch.fail_count = len(failed_rows)

        self.db.add(AuditLog(
            operation_type=OperationType.CREATE,
            target_type="batch",
            target_id=batch.id,
            operator=operator,
            detail=json.dumps({
                "batch_no": batch_no,
                "source": "团长退款表",
                "total": len(rows_data),
                "success": success_count,
                "failed": len(failed_rows)
            }, ensure_ascii=False)
        ))

        self.db.commit()
        return batch, failed_rows, False

    def _create_or_update_receipt_from_refund(
        self,
        raw_refund: LeaderRefundRaw,
        operator: str
    ) -> ExceptionReceipt:
        receipt = self.db.query(ExceptionReceipt).filter(
            ExceptionReceipt.order_no == raw_refund.order_no
        ).first()

        if receipt:
            receipt.refund_amount = raw_refund.refund_amount
            receipt.amount_diff = receipt.compensate_amount - receipt.refund_amount
            receipt.operator = operator
            
            if raw_refund.exception_type and not receipt.exception_type:
                receipt.exception_type = raw_refund.exception_type
            
            return receipt

        receipt = ExceptionReceipt(
            receipt_no=self._generate_receipt_no(),
            order_no=raw_refund.order_no,
            city=raw_refund.city,
            leader_id=raw_refund.leader_id,
            leader_name=raw_refund.leader_name,
            exception_type=raw_refund.exception_type or ExceptionType.OTHER,
            current_status=ReceiptStatus.PENDING,
            refund_amount=raw_refund.refund_amount,
            compensate_amount=0,
            amount_diff=-raw_refund.refund_amount,
            original_leader_refund_id=raw_refund.id,
            operator=operator
        )

        self.db.add(receipt)
        self.db.flush()

        self.db.add(StatusHistory(
            receipt_id=receipt.id,
            from_status=None,
            to_status=ReceiptStatus.PENDING,
            change_reason="从团长退款表导入创建",
            operator=operator,
            operation_type=OperationType.CREATE
        ))

        return receipt

    def import_warehouse_reviews(
        self,
        batch_no: str,
        source_file: str,
        operator: str,
        rows_data: List[Dict[str, Any]],
        remark: str = None
    ) -> Tuple[Batch, List[Dict[str, Any]], bool]:
        existing_batch = self.db.query(Batch).filter(Batch.batch_no == batch_no).first()
        if existing_batch:
            return existing_batch, [], True

        batch = Batch(
            batch_no=batch_no,
            source_file=source_file,
            data_source=DataSource.WAREHOUSE_REVIEW_TABLE,
            operator=operator,
            remark=remark,
            total_count=len(rows_data)
        )
        self.db.add(batch)
        self.db.flush()

        failed_rows = []
        success_count = 0

        for idx, row_data in enumerate(rows_data, start=1):
            try:
                raw_review = WarehouseReviewRaw(
                    batch_id=batch.id,
                    original_row_no=idx,
                    original_data=json.dumps(row_data, ensure_ascii=False)
                )

                order_no = safe_str(row_data.get("订单号") or row_data.get("order_no"))
                reviewer = safe_str(row_data.get("复核人") or row_data.get("reviewer"))
                review_result = safe_str(row_data.get("复核结果") or row_data.get("review_result"))

                review_channel_str = safe_str(row_data.get("复核渠道") or row_data.get("review_channel"))
                review_channel = None
                if review_channel_str:
                    for rc in ReviewChannel:
                        if rc.value == review_channel_str or rc.name.lower() == review_channel_str.lower():
                            review_channel = rc
                            break

                review_remark = safe_str(row_data.get("复核备注") or row_data.get("review_remark"))

                review_time_str = row_data.get("复核时间") or row_data.get("review_time")
                review_time = None
                if review_time_str and not (isinstance(review_time_str, float) and review_time_str != review_time_str):
                    try:
                        if isinstance(review_time_str, str):
                            review_time = datetime.fromisoformat(review_time_str.replace('Z', '+00:00'))
                    except (ValueError, TypeError):
                        pass

                compensate_amount_str = safe_str(row_data.get("补偿金额") or row_data.get("compensate_amount"))
                compensate_amount = float(compensate_amount_str) if compensate_amount_str else 0

                responsibility = safe_str(row_data.get("责任方") or row_data.get("responsibility"))

                raw_review.order_no = order_no
                raw_review.reviewer = reviewer
                raw_review.review_result = review_result
                raw_review.review_channel = review_channel
                raw_review.review_remark = review_remark
                raw_review.review_time = review_time
                raw_review.compensate_amount = compensate_amount
                raw_review.responsibility = responsibility
                raw_review.parse_success = bool(order_no)
                raw_review.parse_error = None if raw_review.parse_success else "订单号为空"

                self.db.add(raw_review)

                if raw_review.parse_success:
                    self._update_receipt_from_review(raw_review, operator)
                    success_count += 1
                else:
                    failed_rows.append({
                        "row_no": idx,
                        "error": raw_review.parse_error or "解析失败",
                        "data": clean_nan_values(row_data)
                    })

            except Exception as e:
                failed_rows.append({
                    "row_no": idx,
                    "error": str(e),
                    "data": clean_nan_values(row_data)
                })

        batch.success_count = success_count
        batch.fail_count = len(failed_rows)

        self.db.add(AuditLog(
            operation_type=OperationType.CREATE,
            target_type="batch",
            target_id=batch.id,
            operator=operator,
            detail=json.dumps({
                "batch_no": batch_no,
                "source": "仓库复核表",
                "total": len(rows_data),
                "success": success_count,
                "failed": len(failed_rows)
            }, ensure_ascii=False)
        ))

        self.db.commit()
        return batch, failed_rows, False

    def _update_receipt_from_review(
        self,
        raw_review: WarehouseReviewRaw,
        operator: str
    ) -> ExceptionReceipt:
        receipt = self.db.query(ExceptionReceipt).filter(
            ExceptionReceipt.order_no == raw_review.order_no
        ).first()

        if not receipt:
            receipt = ExceptionReceipt(
                receipt_no=self._generate_receipt_no(),
                order_no=raw_review.order_no,
                exception_type=ExceptionType.OTHER,
                current_status=ReceiptStatus.PENDING,
                refund_amount=0,
                compensate_amount=raw_review.compensate_amount,
                amount_diff=raw_review.compensate_amount,
                original_warehouse_review_id=raw_review.id,
                operator=operator
            )
            self.db.add(receipt)
            self.db.flush()

            self.db.add(StatusHistory(
                receipt_id=receipt.id,
                from_status=None,
                to_status=ReceiptStatus.PENDING,
                change_reason="从仓库复核表导入创建",
                operator=operator,
                operation_type=OperationType.CREATE
            ))
        else:
            if not receipt.original_warehouse_review_id:
                receipt.original_warehouse_review_id = raw_review.id

        receipt.compensate_amount = raw_review.compensate_amount
        receipt.amount_diff = receipt.compensate_amount - receipt.refund_amount
        receipt.responsibility = raw_review.responsibility
        receipt.review_channel = raw_review.review_channel or ReviewChannel.WAREHOUSE_AUDIT
        receipt.latest_review_remark = raw_review.review_remark
        receipt.reviewed_at = raw_review.review_time
        receipt.operator = operator

        target_status = self._parse_review_result(raw_review.review_result)
        if target_status and not receipt.is_frozen:
            state_machine = ReceiptStateMachine(self.db, receipt)
            if state_machine.can_transition_to(target_status):
                state_machine.transition(
                    target_status=target_status,
                    operator=operator,
                    operation_type=OperationType.REVIEW,
                    change_reason=raw_review.review_remark or f"仓库复核结果: {raw_review.review_result}"
                )

        return receipt

    def _parse_review_result(self, review_result: str) -> Optional[ReceiptStatus]:
        if not review_result:
            return None
        review_result_lower = review_result.lower()
        if "通过" in review_result or "pass" in review_result_lower or "approved" in review_result_lower:
            return ReceiptStatus.APPROVED
        elif "驳回" in review_result or "拒绝" in review_result or "reject" in review_result_lower:
            return ReceiptStatus.REJECTED
        elif "复核中" in review_result or "reviewing" in review_result_lower:
            return ReceiptStatus.REVIEWING
        return None
