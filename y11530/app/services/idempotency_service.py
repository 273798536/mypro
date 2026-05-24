from datetime import datetime
from typing import Dict, Any, Optional, Type
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import hashlib
import json

from app.models import (
    TellerSchedule,
    LeaveForm,
    BusinessForecast,
    RefundFlow,
    InventoryDifference,
)


class IdempotencyService:
    def __init__(self, db: Session):
        self.db = db

    def _generate_idempotency_key(self, data: Dict[str, Any], prefix: str) -> str:
        sorted_data = dict(sorted(data.items()))
        data_str = json.dumps(sorted_data, default=str)
        hash_str = hashlib.md5(data_str.encode()).hexdigest()
        return f"{prefix}:{hash_str}"

    def _upsert_record(
        self,
        model_class: Type,
        idempotency_key: str,
        data: Dict[str, Any],
        exclude_fields: Optional[list] = None,
    ) -> Any:
        exclude_fields = exclude_fields or []
        
        existing = (
            self.db.query(model_class)
            .filter(model_class.idempotency_key == idempotency_key)
            .first()
        )

        if existing:
            for key, value in data.items():
                if key not in exclude_fields and hasattr(existing, key):
                    setattr(existing, key, value)
            existing.updated_at = datetime.now()
            self.db.flush()
            return existing, True

        record = model_class(idempotency_key=idempotency_key, **data)
        self.db.add(record)
        self.db.flush()
        return record, False

    def import_teller_schedule(self, data: Dict[str, Any]) -> tuple[TellerSchedule, bool]:
        key_data = {
            "branch_id": data.get("branch_id"),
            "teller_id": data.get("teller_id"),
            "schedule_date": data.get("schedule_date"),
            "shift_type": data.get("shift_type"),
        }
        idempotency_key = self._generate_idempotency_key(key_data, "schedule")
        
        try:
            return self._upsert_record(
                TellerSchedule,
                idempotency_key,
                data,
                exclude_fields=["idempotency_key", "id", "created_at"],
            )
        except IntegrityError:
            self.db.rollback()
            existing = (
                self.db.query(TellerSchedule)
                .filter(TellerSchedule.idempotency_key == idempotency_key)
                .first()
            )
            return existing, True

    def import_leave_form(self, data: Dict[str, Any]) -> tuple[LeaveForm, bool]:
        key_data = {
            "branch_id": data.get("branch_id"),
            "teller_id": data.get("teller_id"),
            "start_date": data.get("start_date"),
            "end_date": data.get("end_date"),
        }
        idempotency_key = self._generate_idempotency_key(key_data, "leave")
        
        try:
            return self._upsert_record(
                LeaveForm,
                idempotency_key,
                data,
                exclude_fields=["idempotency_key", "id", "created_at"],
            )
        except IntegrityError:
            self.db.rollback()
            existing = (
                self.db.query(LeaveForm)
                .filter(LeaveForm.idempotency_key == idempotency_key)
                .first()
            )
            return existing, True

    def import_business_forecast(self, data: Dict[str, Any]) -> tuple[BusinessForecast, bool]:
        key_data = {
            "branch_id": data.get("branch_id"),
            "forecast_date": data.get("forecast_date"),
            "forecast_window": data.get("forecast_window"),
        }
        idempotency_key = self._generate_idempotency_key(key_data, "forecast")
        
        try:
            return self._upsert_record(
                BusinessForecast,
                idempotency_key,
                data,
                exclude_fields=["idempotency_key", "id", "created_at"],
            )
        except IntegrityError:
            self.db.rollback()
            existing = (
                self.db.query(BusinessForecast)
                .filter(BusinessForecast.idempotency_key == idempotency_key)
                .first()
            )
            return existing, True

    def import_refund_flow(self, data: Dict[str, Any]) -> tuple[RefundFlow, bool]:
        key_data = {
            "branch_id": data.get("branch_id"),
            "transaction_id": data.get("transaction_id"),
        }
        idempotency_key = self._generate_idempotency_key(key_data, "refund")
        
        try:
            return self._upsert_record(
                RefundFlow,
                idempotency_key,
                data,
                exclude_fields=["idempotency_key", "id", "created_at"],
            )
        except IntegrityError:
            self.db.rollback()
            existing = (
                self.db.query(RefundFlow)
                .filter(RefundFlow.idempotency_key == idempotency_key)
                .first()
            )
            return existing, True

    def import_inventory_difference(self, data: Dict[str, Any]) -> tuple[InventoryDifference, bool]:
        key_data = {
            "branch_id": data.get("branch_id"),
            "inventory_date": data.get("inventory_date"),
            "item_type": data.get("item_type"),
        }
        idempotency_key = self._generate_idempotency_key(key_data, "inventory")
        
        try:
            return self._upsert_record(
                InventoryDifference,
                idempotency_key,
                data,
                exclude_fields=["idempotency_key", "id", "created_at"],
            )
        except IntegrityError:
            self.db.rollback()
            existing = (
                self.db.query(InventoryDifference)
                .filter(InventoryDifference.idempotency_key == idempotency_key)
                .first()
            )
            return existing, True

    def batch_import_schedules(self, data_list: list[Dict[str, Any]]) -> Dict[str, Any]:
        created = 0
        updated = 0
        errors = []

        for idx, data in enumerate(data_list):
            try:
                _, is_update = self.import_teller_schedule(data)
                if is_update:
                    updated += 1
                else:
                    created += 1
            except Exception as e:
                errors.append({"index": idx, "error": str(e), "data": data})

        self.db.commit()
        return {"created": created, "updated": updated, "errors": errors}

    def batch_import_leaves(self, data_list: list[Dict[str, Any]]) -> Dict[str, Any]:
        created = 0
        updated = 0
        errors = []

        for idx, data in enumerate(data_list):
            try:
                _, is_update = self.import_leave_form(data)
                if is_update:
                    updated += 1
                else:
                    created += 1
            except Exception as e:
                errors.append({"index": idx, "error": str(e), "data": data})

        self.db.commit()
        return {"created": created, "updated": updated, "errors": errors}

    def batch_import_forecasts(self, data_list: list[Dict[str, Any]]) -> Dict[str, Any]:
        created = 0
        updated = 0
        errors = []

        for idx, data in enumerate(data_list):
            try:
                _, is_update = self.import_business_forecast(data)
                if is_update:
                    updated += 1
                else:
                    created += 1
            except Exception as e:
                errors.append({"index": idx, "error": str(e), "data": data})

        self.db.commit()
        return {"created": created, "updated": updated, "errors": errors}

    def batch_import_refunds(self, data_list: list[Dict[str, Any]]) -> Dict[str, Any]:
        created = 0
        updated = 0
        errors = []

        for idx, data in enumerate(data_list):
            try:
                _, is_update = self.import_refund_flow(data)
                if is_update:
                    updated += 1
                else:
                    created += 1
            except Exception as e:
                errors.append({"index": idx, "error": str(e), "data": data})

        self.db.commit()
        return {"created": created, "updated": updated, "errors": errors}

    def batch_import_inventories(self, data_list: list[Dict[str, Any]]) -> Dict[str, Any]:
        created = 0
        updated = 0
        errors = []

        for idx, data in enumerate(data_list):
            try:
                _, is_update = self.import_inventory_difference(data)
                if is_update:
                    updated += 1
                else:
                    created += 1
            except Exception as e:
                errors.append({"index": idx, "error": str(e), "data": data})

        self.db.commit()
        return {"created": created, "updated": updated, "errors": errors}
