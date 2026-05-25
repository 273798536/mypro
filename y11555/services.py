from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import uuid
from config import Status, STATUS_TRANSITIONS, PERMISSIONS, ROLES
import models
import schemas

class StateMachine:
    @staticmethod
    def can_transition(current_status: str, target_status: str) -> bool:
        if current_status not in STATUS_TRANSITIONS:
            return False
        return target_status in STATUS_TRANSITIONS[current_status]

    @staticmethod
    def validate_transition(current_status: str, target_status: str) -> Tuple[bool, str]:
        if current_status == target_status:
            return True, "same_status"
        if not StateMachine.can_transition(current_status, target_status):
            return False, f"Cannot transition from {current_status} to {target_status}"
        return True, "valid"

class ReceiptService:
    @staticmethod
    def generate_receipt_no() -> str:
        return f"RCP{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"

    @staticmethod
    def import_batch(db: Session, request: schemas.BatchImportRequest) -> schemas.BatchImportResponse:
        existing_batch = db.query(models.Batch).filter(models.Batch.batch_no == request.batch_no).first()
        
        if existing_batch:
            return ReceiptService._reimport_batch(db, existing_batch, request)
        
        batch = models.Batch(
            batch_no=request.batch_no,
            source_file=request.source_file,
            source_type=request.source_type,
            total_records=len(request.items),
            created_by=request.created_by,
            remark=request.remark,
            status="processing"
        )
        db.add(batch)
        db.flush()
        
        success_count = 0
        fail_count = 0
        failed_items = []
        
        for item in request.items:
            try:
                receipt = ReceiptService._create_receipt_from_item(db, batch.id, item, request.created_by)
                import_detail = models.ImportDetail(
                    batch_id=batch.id,
                    original_row_number=item.original_row_number,
                    original_data=item.original_data,
                    parsed_data=ReceiptService._item_to_parsed_data(item),
                    import_status="success",
                    receipt_id=receipt.id
                )
                db.add(import_detail)
                success_count += 1
            except Exception as e:
                import_detail = models.ImportDetail(
                    batch_id=batch.id,
                    original_row_number=item.original_row_number,
                    original_data=item.original_data,
                    parsed_data={},
                    import_status="failed",
                    error_message=str(e)
                )
                db.add(import_detail)
                failed_items.append({
                    "row_number": item.original_row_number,
                    "error": str(e),
                    "original_data": item.original_data
                })
                fail_count += 1
        
        batch.success_count = success_count
        batch.fail_count = fail_count
        batch.status = "completed" if fail_count == 0 else "partial"
        
        db.commit()
        
        return schemas.BatchImportResponse(
            batch_no=request.batch_no,
            total_records=len(request.items),
            success_count=success_count,
            fail_count=fail_count,
            status=batch.status,
            failed_items=failed_items
        )

    @staticmethod
    def _reimport_batch(db: Session, batch: models.Batch, request: schemas.BatchImportRequest) -> schemas.BatchImportResponse:
        existing_details = {detail.original_row_number: detail for detail in batch.import_details}
        
        success_count = 0
        fail_count = 0
        failed_items = []
        
        for item in request.items:
            existing = existing_details.get(item.original_row_number)
            
            if existing and existing.import_status == "success" and existing.receipt_id:
                try:
                    ReceiptService._update_receipt_from_item(db, existing.receipt_id, item)
                    existing.original_data = item.original_data
                    existing.parsed_data = ReceiptService._item_to_parsed_data(item)
                    existing.import_status = "success"
                    existing.error_message = None
                    success_count += 1
                except Exception as e:
                    existing.import_status = "failed"
                    existing.error_message = str(e)
                    failed_items.append({
                        "row_number": item.original_row_number,
                        "error": str(e),
                        "original_data": item.original_data
                    })
                    fail_count += 1
            else:
                try:
                    if existing and existing.receipt_id:
                        ReceiptService._cleanup_dirty_receipt(db, existing.receipt_id)
                        existing.receipt_id = None
                    receipt = ReceiptService._create_receipt_from_item(db, batch.id, item, request.created_by)
                    if existing:
                        existing.parsed_data = ReceiptService._item_to_parsed_data(item)
                        existing.import_status = "success"
                        existing.receipt_id = receipt.id
                        existing.error_message = None
                    else:
                        import_detail = models.ImportDetail(
                            batch_id=batch.id,
                            original_row_number=item.original_row_number,
                            original_data=item.original_data,
                            parsed_data=ReceiptService._item_to_parsed_data(item),
                            import_status="success",
                            receipt_id=receipt.id
                        )
                        db.add(import_detail)
                    success_count += 1
                except Exception as e:
                    if not existing:
                        import_detail = models.ImportDetail(
                            batch_id=batch.id,
                            original_row_number=item.original_row_number,
                            original_data=item.original_data,
                            parsed_data={},
                            import_status="failed",
                            error_message=str(e)
                        )
                        db.add(import_detail)
                    failed_items.append({
                        "row_number": item.original_row_number,
                        "error": str(e),
                        "original_data": item.original_data
                    })
                    fail_count += 1
        
        batch.success_count = success_count
        batch.fail_count = fail_count
        batch.status = "completed" if fail_count == 0 else "partial"
        batch.updated_at = datetime.utcnow()
        
        db.commit()
        
        return schemas.BatchImportResponse(
            batch_no=request.batch_no,
            total_records=len(request.items),
            success_count=success_count,
            fail_count=fail_count,
            status=batch.status,
            failed_items=failed_items
        )

    @staticmethod
    def _item_to_parsed_data(item: schemas.BatchImportItem) -> Dict[str, Any]:
        return {
            "store_order": item.store_order.model_dump() if item.store_order else None,
            "driver_track": item.driver_track.model_dump() if item.driver_track else None,
            "sign_receipt": item.sign_receipt.model_dump() if item.sign_receipt else None,
            "abnormal_type": item.abnormal_type.value if item.abnormal_type else None,
            "abnormal_description": item.abnormal_description,
            "abnormal_quantity": item.abnormal_quantity,
            "abnormal_amount": item.abnormal_amount,
            "area": item.area,
            "store_name": item.store_name,
            "product_name": item.product_name
        }

    @staticmethod
    def _validate_item_fields(item: schemas.BatchImportItem) -> List[str]:
        errors = []
        if item.store_order is None and item.driver_track is None and item.sign_receipt is None:
            errors.append("门店订单、司机轨迹、签收回执至少提供一项")

        if item.store_order:
            if not item.store_order.order_no:
                errors.append("门店订单编号(order_no)不能为空")
            if not item.store_order.store_name and not item.store_name:
                errors.append("门店名称(store_name)不能为空")
            if not item.store_order.product_name and not item.product_name:
                errors.append("产品名称(product_name)不能为空")

        if item.driver_track:
            if not item.driver_track.track_no:
                errors.append("司机轨迹编号(track_no)不能为空")

        if item.sign_receipt:
            if not item.sign_receipt.sign_no:
                errors.append("签收回执编号(sign_no)不能为空")

        if item.abnormal_type and item.abnormal_amount is None:
            errors.append("异常类型已填写时，异常金额(abnormal_amount)不能为空")

        return errors

    @staticmethod
    def _create_receipt_from_item(db: Session, batch_id: int, item: schemas.BatchImportItem, created_by: str) -> models.AbnormalReceipt:
        validation_errors = ReceiptService._validate_item_fields(item)
        if validation_errors:
            raise Exception("; ".join(validation_errors))

        order_id = None
        if item.store_order:
            order = db.query(models.StoreOrder).filter(models.StoreOrder.order_no == item.store_order.order_no).first()
            if not order:
                order = models.StoreOrder(**item.store_order.model_dump())
                db.add(order)
                db.flush()
            order_id = order.id

        track_id = None
        if item.driver_track:
            track = db.query(models.DriverTrack).filter(models.DriverTrack.track_no == item.driver_track.track_no).first()
            if not track:
                track = models.DriverTrack(**item.driver_track.model_dump())
                db.add(track)
                db.flush()
            track_id = track.id

        sign_id = None
        if item.sign_receipt:
            sign = db.query(models.SignReceipt).filter(models.SignReceipt.sign_no == item.sign_receipt.sign_no).first()
            if not sign:
                sign = models.SignReceipt(**item.sign_receipt.model_dump())
                db.add(sign)
                db.flush()
            sign_id = sign.id

        initial_status = Status.IMPORTED
        if item.abnormal_type:
            initial_status = Status.ABNORMAL_DETECTED

        receipt = models.AbnormalReceipt(
            receipt_no=ReceiptService.generate_receipt_no(),
            batch_id=batch_id,
            order_id=order_id,
            track_id=track_id,
            sign_id=sign_id,
            area=item.area,
            store_name=item.store_name or (item.store_order.store_name if item.store_order else None),
            product_name=item.product_name or (item.store_order.product_name if item.store_order else None),
            abnormal_type=item.abnormal_type.value if item.abnormal_type else None,
            abnormal_description=item.abnormal_description,
            abnormal_quantity=item.abnormal_quantity,
            abnormal_amount=item.abnormal_amount,
            current_status=initial_status,
            created_by=created_by
        )
        db.add(receipt)
        db.flush()

        StatusHistoryService.add_history(
            db, receipt.id, None, initial_status,
            created_by, "batch_import", "system"
        )

        return receipt

    @staticmethod
    def _update_receipt_from_item(db: Session, receipt_id: int, item: schemas.BatchImportItem):
        receipt = db.query(models.AbnormalReceipt).filter(models.AbnormalReceipt.id == receipt_id).first()
        if not receipt:
            raise Exception("Receipt not found")
        
        if receipt.is_frozen:
            raise Exception("Cannot update frozen receipt")

        if item.area:
            receipt.area = item.area
        if item.store_name:
            receipt.store_name = item.store_name
        if item.product_name:
            receipt.product_name = item.product_name
        if item.abnormal_type:
            receipt.abnormal_type = item.abnormal_type.value
        if item.abnormal_description:
            receipt.abnormal_description = item.abnormal_description
        if item.abnormal_quantity is not None:
            receipt.abnormal_quantity = item.abnormal_quantity
        if item.abnormal_amount is not None:
            receipt.abnormal_amount = item.abnormal_amount

    @staticmethod
    def change_status(db: Session, request: schemas.StatusChangeRequest) -> Dict[str, Any]:
        receipt = db.query(models.AbnormalReceipt).filter(models.AbnormalReceipt.receipt_no == request.receipt_no).first()
        if not receipt:
            raise Exception(f"Receipt {request.receipt_no} not found")

        if receipt.is_frozen and request.target_status != Status.REVOKED:
            raise Exception("Cannot change status of frozen receipt (except revoke)")

        is_valid, message = StateMachine.validate_transition(receipt.current_status, request.target_status)
        if not is_valid:
            raise Exception(message)

        if message == "same_status":
            return {
                "receipt_no": receipt.receipt_no,
                "status": receipt.current_status,
                "message": "already_in_target_status"
            }

        PermissionService.check_status_transition_permission(request.operator_role, receipt.current_status, request.target_status)

        old_status = receipt.current_status
        receipt.previous_status = old_status
        receipt.current_status = request.target_status

        if request.manual_reason:
            receipt.manual_reason = request.manual_reason

        StatusHistoryService.add_history(
            db, receipt.id, old_status, request.target_status,
            request.changed_by, request.change_reason or "status_change",
            request.operator_role
        )

        OperationLogService.add_log(
            db, receipt.id, "status_change",
            f"Status changed from {old_status} to {request.target_status}. Reason: {request.change_reason}",
            request.changed_by, request.operator_role
        )

        db.commit()

        return {
            "receipt_no": receipt.receipt_no,
            "old_status": old_status,
            "new_status": request.target_status,
            "message": "success"
        }

    @staticmethod
    def review_receipt(db: Session, request: schemas.ReviewRequest) -> Dict[str, Any]:
        receipt = db.query(models.AbnormalReceipt).filter(models.AbnormalReceipt.receipt_no == request.receipt_no).first()
        if not receipt:
            raise Exception(f"Receipt {request.receipt_no} not found")

        if receipt.is_frozen:
            raise Exception("Cannot review frozen receipt")

        PermissionService.check_permission(request.operator_role, "review")

        receipt.review_result = request.review_result
        receipt.review_reason = request.review_reason
        receipt.reviewed_by = request.reviewed_by
        receipt.reviewed_at = datetime.utcnow()
        
        if request.service_remark:
            receipt.service_remark = request.service_remark

        old_status = receipt.current_status
        new_status = Status.VERIFIED if request.review_result == "approve" else Status.ABNORMAL_CONFIRMED
        
        if old_status != new_status:
            PermissionService.check_status_transition_permission(request.operator_role, old_status, new_status)
            receipt.previous_status = old_status
            receipt.current_status = new_status

            StatusHistoryService.add_history(
                db, receipt.id, old_status, new_status,
                request.reviewed_by, f"Review: {request.review_result}",
                request.operator_role
            )

        OperationLogService.add_log(
            db, receipt.id, "review",
            f"Review completed. Result: {request.review_result}, Reason: {request.review_reason}",
            request.reviewed_by, request.operator_role
        )

        db.commit()

        return {
            "receipt_no": receipt.receipt_no,
            "review_result": request.review_result,
            "new_status": new_status,
            "message": "success"
        }

    @staticmethod
    def freeze_receipt(db: Session, request: schemas.FreezeRequest) -> Dict[str, Any]:
        receipt = db.query(models.AbnormalReceipt).filter(models.AbnormalReceipt.receipt_no == request.receipt_no).first()
        if not receipt:
            raise Exception(f"Receipt {request.receipt_no} not found")

        PermissionService.check_permission(request.operator_role, "freeze")

        if receipt.is_frozen:
            return {
                "receipt_no": receipt.receipt_no,
                "is_frozen": True,
                "message": "already_frozen"
            }

        old_status = receipt.current_status
        PermissionService.check_status_transition_permission(request.operator_role, old_status, Status.FROZEN)

        receipt.status_before_freeze = receipt.current_status
        receipt.is_frozen = True
        receipt.frozen_at = datetime.utcnow()
        receipt.frozen_by = request.frozen_by
        receipt.frozen_reason = request.frozen_reason
        receipt.current_status = Status.FROZEN

        StatusHistoryService.add_history(
            db, receipt.id, receipt.status_before_freeze, Status.FROZEN,
            request.frozen_by, f"Freeze: {request.frozen_reason}",
            request.operator_role
        )

        OperationLogService.add_log(
            db, receipt.id, "freeze",
            f"Receipt frozen. Reason: {request.frozen_reason}",
            request.frozen_by, request.operator_role
        )

        db.commit()

        return {
            "receipt_no": receipt.receipt_no,
            "status_before_freeze": receipt.status_before_freeze,
            "is_frozen": True,
            "message": "success"
        }

    @staticmethod
    def unfreeze_receipt(db: Session, receipt_no: str, operated_by: str, operator_role: str) -> Dict[str, Any]:
        receipt = db.query(models.AbnormalReceipt).filter(models.AbnormalReceipt.receipt_no == receipt_no).first()
        if not receipt:
            raise Exception(f"Receipt {receipt_no} not found")

        PermissionService.check_permission(operator_role, "unfreeze")

        if not receipt.is_frozen:
            return {
                "receipt_no": receipt.receipt_no,
                "is_frozen": False,
                "message": "not_frozen"
            }

        restore_status = receipt.status_before_freeze or Status.VERIFIED
        PermissionService.check_status_transition_permission(operator_role, Status.FROZEN, restore_status)

        receipt.is_frozen = False
        receipt.current_status = restore_status

        StatusHistoryService.add_history(
            db, receipt.id, Status.FROZEN, restore_status,
            operated_by, "Unfreeze",
            operator_role
        )

        OperationLogService.add_log(
            db, receipt.id, "unfreeze",
            "Receipt unfrozen",
            operated_by, operator_role
        )

        db.commit()

        return {
            "receipt_no": receipt.receipt_no,
            "restored_status": restore_status,
            "is_frozen": False,
            "message": "success"
        }

    @staticmethod
    def revoke_receipt(db: Session, receipt_no: str, operated_by: str, reason: str, operator_role: str) -> Dict[str, Any]:
        receipt = db.query(models.AbnormalReceipt).filter(models.AbnormalReceipt.receipt_no == receipt_no).first()
        if not receipt:
            raise Exception(f"Receipt {receipt_no} not found")

        PermissionService.check_permission(operator_role, "revoke")

        old_status = receipt.current_status
        PermissionService.check_status_transition_permission(operator_role, old_status, Status.REVOKED)
        
        if receipt.is_frozen:
            receipt.is_frozen = False

        receipt.previous_status = old_status
        receipt.current_status = Status.REVOKED

        StatusHistoryService.add_history(
            db, receipt.id, old_status, Status.REVOKED,
            operated_by, f"Revoke: {reason}",
            operator_role
        )

        OperationLogService.add_log(
            db, receipt.id, "revoke",
            f"Receipt revoked. Reason: {reason}",
            operated_by, operator_role
        )

        db.commit()

        return {
            "receipt_no": receipt.receipt_no,
            "old_status": old_status,
            "new_status": Status.REVOKED,
            "message": "success"
        }

    @staticmethod
    def archive_receipt(db: Session, receipt_no: str, operated_by: str, operator_role: str) -> Dict[str, Any]:
        receipt = db.query(models.AbnormalReceipt).filter(models.AbnormalReceipt.receipt_no == receipt_no).first()
        if not receipt:
            raise Exception(f"Receipt {receipt_no} not found")

        PermissionService.check_permission(operator_role, "archive")

        if receipt.current_status not in [Status.SETTLED, Status.REVOKED]:
            raise Exception("Can only archive settled or revoked receipts")

        old_status = receipt.current_status
        PermissionService.check_status_transition_permission(operator_role, old_status, Status.ARCHIVED)

        receipt.current_status = Status.ARCHIVED

        StatusHistoryService.add_history(
            db, receipt.id, old_status, Status.ARCHIVED,
            operated_by, "Archive",
            operator_role
        )

        OperationLogService.add_log(
            db, receipt.id, "archive",
            "Receipt archived",
            operated_by, operator_role
        )

        db.commit()

        return {
            "receipt_no": receipt.receipt_no,
            "old_status": old_status,
            "new_status": Status.ARCHIVED,
            "message": "success"
        }

    @staticmethod
    def add_attachment(db: Session, attachment: schemas.AttachmentCreate) -> Dict[str, Any]:
        receipt = db.query(models.AbnormalReceipt).filter(models.AbnormalReceipt.receipt_no == attachment.receipt_no).first()
        if not receipt:
            raise Exception(f"Receipt {attachment.receipt_no} not found")

        PermissionService.check_permission(attachment.operator_role, "attach")

        if receipt.is_frozen:
            raise Exception("Cannot add attachment to frozen receipt")

        new_attachment = models.Attachment(
            receipt_id=receipt.id,
            file_name=attachment.file_name,
            file_path=attachment.file_path,
            file_type=attachment.file_type,
            file_size=attachment.file_size,
            uploaded_by=attachment.uploaded_by,
            description=attachment.description
        )
        db.add(new_attachment)

        OperationLogService.add_log(
            db, receipt.id, "attachment",
            f"Attachment added: {attachment.file_name}",
            attachment.uploaded_by, attachment.operator_role
        )

        db.commit()

        return {
            "attachment_id": new_attachment.id,
            "receipt_no": receipt.receipt_no,
            "file_name": attachment.file_name,
            "message": "success"
        }

    @staticmethod
    def query_receipts(db: Session, query: schemas.ReceiptQuery) -> Tuple[int, List[models.AbnormalReceipt]]:
        q = db.query(models.AbnormalReceipt)

        if query.receipt_no:
            q = q.filter(models.AbnormalReceipt.receipt_no == query.receipt_no)
        if query.area:
            q = q.filter(models.AbnormalReceipt.area.like(f"%{query.area}%"))
        if query.store_name:
            q = q.filter(models.AbnormalReceipt.store_name.like(f"%{query.store_name}%"))
        if query.abnormal_type:
            q = q.filter(models.AbnormalReceipt.abnormal_type == query.abnormal_type)
        if query.current_status:
            q = q.filter(models.AbnormalReceipt.current_status == query.current_status)
        if query.is_frozen is not None:
            q = q.filter(models.AbnormalReceipt.is_frozen == query.is_frozen)
        if query.created_by:
            q = q.filter(models.AbnormalReceipt.created_by == query.created_by)
        if query.start_date:
            q = q.filter(models.AbnormalReceipt.created_at >= query.start_date)
        if query.end_date:
            q = q.filter(models.AbnormalReceipt.created_at <= query.end_date)

        total = q.count()

        offset = (query.page - 1) * query.page_size
        receipts = q.order_by(models.AbnormalReceipt.created_at.desc()).offset(offset).limit(query.page_size).all()

        return total, receipts

    @staticmethod
    def get_receipt_detail(db: Session, receipt_no: str) -> Dict[str, Any]:
        receipt = db.query(models.AbnormalReceipt).filter(models.AbnormalReceipt.receipt_no == receipt_no).first()
        if not receipt:
            raise Exception(f"Receipt {receipt_no} not found")

        return {
            "receipt": receipt,
            "status_history": receipt.status_history,
            "attachments": receipt.attachments,
            "operation_logs": receipt.operation_logs,
            "batch": receipt.batch,
            "store_order": receipt.store_order,
            "driver_track": receipt.driver_track,
            "sign_receipt": receipt.sign_receipt
        }

    @staticmethod
    def export_summary(db: Session, filters: Dict[str, Any], exported_by: str, operator_role: str) -> Dict[str, Any]:
        PermissionService.check_permission(operator_role, "export")

        q = db.query(models.AbnormalReceipt)

        if filters.get("area"):
            q = q.filter(models.AbnormalReceipt.area.like(f"%{filters['area']}%"))
        if filters.get("store_name"):
            q = q.filter(models.AbnormalReceipt.store_name.like(f"%{filters['store_name']}%"))
        if filters.get("abnormal_type"):
            q = q.filter(models.AbnormalReceipt.abnormal_type == filters["abnormal_type"])
        if filters.get("current_status"):
            q = q.filter(models.AbnormalReceipt.current_status == filters["current_status"])
        if filters.get("is_frozen") is not None:
            q = q.filter(models.AbnormalReceipt.is_frozen == filters["is_frozen"])

        receipts = q.order_by(models.AbnormalReceipt.created_at.desc()).all()

        export_no = f"EXP{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

        export_record = models.ExportRecord(
            export_no=export_no,
            export_type="summary",
            filters=filters,
            record_count=len(receipts),
            exported_by=exported_by,
            status="completed"
        )
        db.add(export_record)
        db.commit()

        summary_items = []
        for r in receipts:
            summary_items.append({
                "receipt_no": r.receipt_no,
                "area": r.area or "",
                "store_name": r.store_name or "",
                "product_name": r.product_name or "",
                "abnormal_type": r.abnormal_type or "",
                "abnormal_amount": r.abnormal_amount or 0,
                "status_before_freeze": r.status_before_freeze,
                "current_status": r.current_status,
                "is_frozen": r.is_frozen,
                "review_result": r.review_result,
                "manual_reason": r.manual_reason,
                "created_by": r.created_by,
                "created_at": r.created_at
            })

        return {
            "export_no": export_no,
            "record_count": len(receipts),
            "data": summary_items,
            "exported_at": datetime.utcnow(),
            "exported_by": exported_by
        }

    @staticmethod
    def get_batch_failed_items(db: Session, batch_no: str) -> List[Dict[str, Any]]:
        batch = db.query(models.Batch).filter(models.Batch.batch_no == batch_no).first()
        if not batch:
            raise Exception(f"Batch {batch_no} not found")

        failed_details = db.query(models.ImportDetail).filter(
            models.ImportDetail.batch_id == batch.id,
            models.ImportDetail.import_status == "failed"
        ).all()

        return [{
            "row_number": d.original_row_number,
            "error": d.error_message,
            "original_data": d.original_data
        } for d in failed_details]

    @staticmethod
    def _cleanup_dirty_receipt(db: Session, receipt_id: int):
        db.query(models.StatusHistory).filter(models.StatusHistory.receipt_id == receipt_id).delete()
        db.query(models.OperationLog).filter(models.OperationLog.receipt_id == receipt_id).delete()
        db.query(models.Attachment).filter(models.Attachment.receipt_id == receipt_id).delete()
        db.query(models.AbnormalReceipt).filter(models.AbnormalReceipt.id == receipt_id).delete()

    @staticmethod
    def resubmit_failed_item(db: Session, batch_no: str, row_number: int, item: schemas.BatchImportItem) -> Dict[str, Any]:
        batch = db.query(models.Batch).filter(models.Batch.batch_no == batch_no).first()
        if not batch:
            raise Exception(f"Batch {batch_no} not found")

        existing = db.query(models.ImportDetail).filter(
            models.ImportDetail.batch_id == batch.id,
            models.ImportDetail.original_row_number == row_number
        ).first()

        if not existing:
            raise Exception(f"Row {row_number} not found in batch")

        was_previously_failed = (existing.import_status == "failed")

        if existing.receipt_id and was_previously_failed:
            ReceiptService._cleanup_dirty_receipt(db, existing.receipt_id)
            existing.receipt_id = None

        try:
            receipt = ReceiptService._create_receipt_from_item(db, batch.id, item, batch.created_by or "system")
            existing.original_data = item.original_data
            existing.parsed_data = ReceiptService._item_to_parsed_data(item)
            existing.import_status = "success"
            existing.receipt_id = receipt.id
            existing.error_message = None
            db.commit()

            if was_previously_failed:
                batch.success_count += 1
                batch.fail_count = max(0, batch.fail_count - 1)
                if batch.fail_count == 0:
                    batch.status = "completed"
            db.commit()

            return {
                "receipt_no": receipt.receipt_no,
                "row_number": row_number,
                "status": "success",
                "message": "Resubmitted successfully"
            }
        except Exception as e:
            existing.import_status = "failed"
            existing.error_message = str(e)
            db.commit()
            raise Exception(f"Resubmit failed: {str(e)}")


class StatusHistoryService:
    @staticmethod
    def add_history(db: Session, receipt_id: int, from_status: Optional[str], to_status: str,
                    changed_by: str, change_reason: str, operator_role: str):
        history = models.StatusHistory(
            receipt_id=receipt_id,
            from_status=from_status,
            to_status=to_status,
            changed_by=changed_by,
            change_reason=change_reason,
            operator_role=operator_role
        )
        db.add(history)


class OperationLogService:
    @staticmethod
    def add_log(db: Session, receipt_id: int, operation_type: str, operation_content: str,
                operated_by: str, operator_role: str, ip_address: str = None):
        log = models.OperationLog(
            receipt_id=receipt_id,
            operation_type=operation_type,
            operation_content=operation_content,
            operated_by=operated_by,
            operator_role=operator_role,
            ip_address=ip_address
        )
        db.add(log)


class PermissionService:
    @staticmethod
    def has_permission(operator_role: str, operation: str) -> bool:
        if operator_role == "admin":
            return True
        allowed_roles = PERMISSIONS.get(operation, [])
        return operator_role in allowed_roles

    @staticmethod
    def has_status_transition_permission(operator_role: str, from_status: str, to_status: str) -> bool:
        if operator_role == "admin":
            return True

        role_permissions = ROLES.get(operator_role, [])

        exact_match = f"status:{from_status}→{to_status}"
        if exact_match in role_permissions:
            return True

        wildcard_from = f"status:*→{to_status}"
        if wildcard_from in role_permissions:
            return True

        wildcard_to = f"status:{from_status}→*"
        if wildcard_to in role_permissions:
            return True

        return False

    @staticmethod
    def check_permission(operator_role: str, operation: str):
        if not PermissionService.has_permission(operator_role, operation):
            raise Exception(f"权限不足：角色[{operator_role}]无[{operation}]操作权限")

    @staticmethod
    def check_status_transition_permission(operator_role: str, from_status: str, to_status: str):
        if not PermissionService.has_status_transition_permission(operator_role, from_status, to_status):
            raise Exception(f"权限不足：角色[{operator_role}]无[{from_status}→{to_status}]状态流转权限")