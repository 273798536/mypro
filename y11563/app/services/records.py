import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from app.models.checkin import CheckinRecord
from app.models.deposit import DepositRecord
from app.models.room_change import RoomChangeRecord
from app.services.idempotency import IdempotencyService
from app.services.audit import AuditService


class RecordService:
    def __init__(self, db: Session):
        self.db = db
        self.idempotency_service = IdempotencyService(db)
        self.audit_service = AuditService(db)

    def generate_batch_no(self) -> str:
        return f"BATCH-{uuid.uuid4().hex[:12].upper()}"

    def _get_model_dict(self, model) -> Dict[str, Any]:
        data = {}
        for column in model.__table__.columns:
            value = getattr(model, column.name)
            if isinstance(value, datetime):
                value = value.isoformat()
            data[column.name] = value
        return data

    def create_or_update_checkin(
        self,
        data: Dict[str, Any],
        duplicate_strategy: str = "update",
        operator: str = "system",
        batch_no: Optional[str] = None,
    ) -> Tuple[CheckinRecord, bool, str]:
        checkin_no = data["checkin_no"]
        custom_key = data.get("idempotency_key")
        idempotency_key = self.idempotency_service.generate_key(
            "checkin", checkin_no, custom_key
        )

        is_duplicate, idem_record = self.idempotency_service.check_and_record(
            idempotency_key=idempotency_key,
            request_type="create_checkin",
            record_type="checkin",
            record_id=checkin_no,
            request_data=data,
        )

        existing = (
            self.db.query(CheckinRecord)
            .filter(CheckinRecord.checkin_no == checkin_no)
            .first()
        )

        if existing and is_duplicate:
            if duplicate_strategy == "ignore":
                self.idempotency_service.update_status(
                    idempotency_key, "completed", {"action": "ignored"}
                )
                return existing, True, "ignored"

            elif duplicate_strategy == "update":
                before_data = self._get_model_dict(existing)
                for key, value in data.items():
                    if hasattr(existing, key) and key not in [
                        "checkin_no",
                        "id",
                        "created_at",
                        "created_by",
                    ]:
                        setattr(existing, key, value)
                existing.updated_by = operator
                existing.updated_at = datetime.utcnow()
                self.db.commit()
                self.db.refresh(existing)

                after_data = self._get_model_dict(existing)
                self.audit_service.log_operation(
                    record_type="checkin",
                    record_id=checkin_no,
                    operation="update_duplicate",
                    operator=operator,
                    before_data=before_data,
                    after_data=after_data,
                    change_reason="重复提交更新",
                    batch_no=batch_no,
                )
                self.idempotency_service.update_status(
                    idempotency_key, "completed", {"action": "updated"}
                )
                return existing, True, "updated"

            elif duplicate_strategy == "append":
                new_checkin_no = f"{checkin_no}_{uuid.uuid4().hex[:8]}"
                data["checkin_no"] = new_checkin_no
                data["batch_no"] = batch_no
                data["created_by"] = operator
                data["updated_by"] = operator
                new_record = CheckinRecord(**data)
                self.db.add(new_record)
                self.db.commit()
                self.db.refresh(new_record)

                self.audit_service.log_operation(
                    record_type="checkin",
                    record_id=new_checkin_no,
                    operation="create_append",
                    operator=operator,
                    after_data=self._get_model_dict(new_record),
                    change_reason="重复提交追加",
                    batch_no=batch_no,
                )
                self.idempotency_service.update_status(
                    idempotency_key, "completed", {"action": "appended", "new_id": new_checkin_no}
                )
                return new_record, True, "appended"

        if existing:
            before_data = self._get_model_dict(existing)
            for key, value in data.items():
                if hasattr(existing, key) and key not in [
                    "checkin_no",
                    "id",
                    "created_at",
                    "created_by",
                ]:
                    setattr(existing, key, value)
            existing.updated_by = operator
            existing.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(existing)

            after_data = self._get_model_dict(existing)
            self.audit_service.log_operation(
                record_type="checkin",
                record_id=checkin_no,
                operation="update",
                operator=operator,
                before_data=before_data,
                after_data=after_data,
                batch_no=batch_no,
            )
            self.idempotency_service.update_status(idempotency_key, "completed")
            return existing, False, "updated"

        data["batch_no"] = batch_no
        data["created_by"] = operator
        data["updated_by"] = operator
        new_record = CheckinRecord(**{k: v for k, v in data.items() if k != "idempotency_key" and k != "operator" and k != "duplicate_strategy"})
        self.db.add(new_record)
        self.db.commit()
        self.db.refresh(new_record)

        self.audit_service.log_operation(
            record_type="checkin",
            record_id=checkin_no,
            operation="create",
            operator=operator,
            after_data=self._get_model_dict(new_record),
            batch_no=batch_no,
        )
        self.idempotency_service.update_status(idempotency_key, "completed")
        return new_record, False, "created"

    def create_or_update_deposit(
        self,
        data: Dict[str, Any],
        duplicate_strategy: str = "update",
        operator: str = "system",
        batch_no: Optional[str] = None,
    ) -> Tuple[DepositRecord, bool, str]:
        deposit_no = data["deposit_no"]
        custom_key = data.get("idempotency_key")
        idempotency_key = self.idempotency_service.generate_key(
            "deposit", deposit_no, custom_key
        )

        is_duplicate, idem_record = self.idempotency_service.check_and_record(
            idempotency_key=idempotency_key,
            request_type="create_deposit",
            record_type="deposit",
            record_id=deposit_no,
            request_data=data,
        )

        existing = (
            self.db.query(DepositRecord)
            .filter(DepositRecord.deposit_no == deposit_no)
            .first()
        )

        if existing and is_duplicate:
            if duplicate_strategy == "ignore":
                self.idempotency_service.update_status(
                    idempotency_key, "completed", {"action": "ignored"}
                )
                return existing, True, "ignored"

            elif duplicate_strategy == "update":
                before_data = self._get_model_dict(existing)
                for key, value in data.items():
                    if hasattr(existing, key) and key not in [
                        "deposit_no",
                        "id",
                        "created_at",
                        "created_by",
                    ]:
                        setattr(existing, key, value)
                existing.updated_by = operator
                existing.updated_at = datetime.utcnow()
                self.db.commit()
                self.db.refresh(existing)

                after_data = self._get_model_dict(existing)
                self.audit_service.log_operation(
                    record_type="deposit",
                    record_id=deposit_no,
                    operation="update_duplicate",
                    operator=operator,
                    before_data=before_data,
                    after_data=after_data,
                    change_reason="重复提交更新",
                    batch_no=batch_no,
                )
                self.idempotency_service.update_status(
                    idempotency_key, "completed", {"action": "updated"}
                )
                return existing, True, "updated"

        if existing:
            self.idempotency_service.update_status(idempotency_key, "completed")
            return existing, False, "existed"

        data["batch_no"] = batch_no
        data["created_by"] = operator
        data["updated_by"] = operator
        new_record = DepositRecord(**{k: v for k, v in data.items() if k != "idempotency_key" and k != "operator" and k != "duplicate_strategy"})
        self.db.add(new_record)
        self.db.commit()
        self.db.refresh(new_record)

        self.audit_service.log_operation(
            record_type="deposit",
            record_id=deposit_no,
            operation="create",
            operator=operator,
            after_data=self._get_model_dict(new_record),
            batch_no=batch_no,
        )
        self.idempotency_service.update_status(idempotency_key, "completed")
        return new_record, False, "created"

    def create_or_update_room_change(
        self,
        data: Dict[str, Any],
        duplicate_strategy: str = "update",
        operator: str = "system",
        batch_no: Optional[str] = None,
    ) -> Tuple[RoomChangeRecord, bool, str]:
        change_no = data["change_no"]
        custom_key = data.get("idempotency_key")
        idempotency_key = self.idempotency_service.generate_key(
            "room_change", change_no, custom_key
        )

        is_duplicate, idem_record = self.idempotency_service.check_and_record(
            idempotency_key=idempotency_key,
            request_type="create_room_change",
            record_type="room_change",
            record_id=change_no,
            request_data=data,
        )

        existing = (
            self.db.query(RoomChangeRecord)
            .filter(RoomChangeRecord.change_no == change_no)
            .first()
        )

        if existing and is_duplicate:
            if duplicate_strategy == "ignore":
                self.idempotency_service.update_status(
                    idempotency_key, "completed", {"action": "ignored"}
                )
                return existing, True, "ignored"

            elif duplicate_strategy == "update":
                before_data = self._get_model_dict(existing)
                for key, value in data.items():
                    if hasattr(existing, key) and key not in [
                        "change_no",
                        "id",
                        "created_at",
                        "created_by",
                    ]:
                        setattr(existing, key, value)
                existing.updated_by = operator
                existing.updated_at = datetime.utcnow()
                self.db.commit()
                self.db.refresh(existing)

                after_data = self._get_model_dict(existing)
                self.audit_service.log_operation(
                    record_type="room_change",
                    record_id=change_no,
                    operation="update_duplicate",
                    operator=operator,
                    before_data=before_data,
                    after_data=after_data,
                    change_reason="重复提交更新",
                    batch_no=batch_no,
                )
                self.idempotency_service.update_status(
                    idempotency_key, "completed", {"action": "updated"}
                )
                return existing, True, "updated"

        if existing:
            self.idempotency_service.update_status(idempotency_key, "completed")
            return existing, False, "existed"

        data["batch_no"] = batch_no
        data["created_by"] = operator
        data["updated_by"] = operator
        new_record = RoomChangeRecord(**{k: v for k, v in data.items() if k != "idempotency_key" and k != "operator" and k != "duplicate_strategy"})
        self.db.add(new_record)
        self.db.commit()
        self.db.refresh(new_record)

        self.audit_service.log_operation(
            record_type="room_change",
            record_id=change_no,
            operation="create",
            operator=operator,
            after_data=self._get_model_dict(new_record),
            batch_no=batch_no,
        )
        self.idempotency_service.update_status(idempotency_key, "completed")
        return new_record, False, "created"

    def get_checkin(self, checkin_no: str) -> Optional[CheckinRecord]:
        return (
            self.db.query(CheckinRecord)
            .filter(CheckinRecord.checkin_no == checkin_no)
            .first()
        )

    def get_deposit(self, deposit_no: str) -> Optional[DepositRecord]:
        return (
            self.db.query(DepositRecord)
            .filter(DepositRecord.deposit_no == deposit_no)
            .first()
        )

    def get_room_change(self, change_no: str) -> Optional[RoomChangeRecord]:
        return (
            self.db.query(RoomChangeRecord)
            .filter(RoomChangeRecord.change_no == change_no)
            .first()
        )

    def revoke_record(
        self,
        record_type: str,
        record_id: str,
        operator: str,
        reason: str,
    ) -> bool:
        model_map = {
            "checkin": CheckinRecord,
            "deposit": DepositRecord,
            "room_change": RoomChangeRecord,
        }
        model = model_map.get(record_type)
        if not model:
            return False

        id_field_map = {
            "checkin": "checkin_no",
            "deposit": "deposit_no",
            "room_change": "change_no",
        }
        id_field = id_field_map[record_type]

        record = (
            self.db.query(model).filter(getattr(model, id_field) == record_id).first()
        )
        if not record:
            return False

        before_data = self._get_model_dict(record)
        record.status = "revoked"
        record.updated_by = operator
        record.updated_at = datetime.utcnow()
        self.db.commit()

        after_data = self._get_model_dict(record)
        self.audit_service.log_operation(
            record_type=record_type,
            record_id=record_id,
            operation="revoke",
            operator=operator,
            before_data=before_data,
            after_data=after_data,
            change_reason=reason,
        )

        return True
