import os
import uuid
import hashlib
import json
from datetime import datetime
from typing import Optional, Dict, Any
import pandas as pd
from sqlalchemy.orm import Session
from app.config import get_settings
from app.models.export_snapshot import ExportSnapshot
from app.models.checkin import CheckinRecord
from app.models.deposit import DepositRecord
from app.models.room_change import RoomChangeRecord
from app.models.reconciliation import ReconciliationResult
from app.services.audit import AuditService
from app.utils.mask import mask_sensitive_data

settings = get_settings()


class ExportService:
    def __init__(self, db: Session):
        self.db = db
        self.audit_service = AuditService(db)
        self._ensure_export_dir()

    def _ensure_export_dir(self):
        os.makedirs(settings.EXPORT_DIR, exist_ok=True)

    def generate_snapshot_no(self) -> str:
        return f"EXP-{uuid.uuid4().hex[:16].upper()}"

    def _model_to_dict(self, model, exclude_fields=None, mask_sensitive=True):
        exclude = exclude_fields or ["id"]
        data = {}
        for column in model.__table__.columns:
            if column.name not in exclude:
                value = getattr(model, column.name)
                if isinstance(value, datetime):
                    value = value.isoformat()
                data[column.name] = value
        if mask_sensitive:
            data = mask_sensitive_data(data)
        return data

    def _get_checkin_data(self, batch_no: Optional[str] = None):
        query = self.db.query(CheckinRecord)
        if batch_no:
            query = query.filter(CheckinRecord.batch_no == batch_no)
        return [self._model_to_dict(c) for c in query.all()]

    def _get_deposit_data(self, batch_no: Optional[str] = None):
        query = self.db.query(DepositRecord)
        if batch_no:
            query = query.filter(DepositRecord.batch_no == batch_no)
        return [self._model_to_dict(d) for d in query.all()]

    def _get_room_change_data(self, batch_no: Optional[str] = None):
        query = self.db.query(RoomChangeRecord)
        if batch_no:
            query = query.filter(RoomChangeRecord.batch_no == batch_no)
        return [self._model_to_dict(r) for r in query.all()]

    def _get_reconciliation_data(self, batch_no: Optional[str] = None):
        query = self.db.query(ReconciliationResult)
        if batch_no:
            query = query.filter(ReconciliationResult.batch_no == batch_no)
        return [self._model_to_dict(r) for r in query.all()]

    def _calculate_checksum(self, data: Dict[str, Any]) -> str:
        json_str = json.dumps(data, sort_keys=True)
        return hashlib.sha256(json_str.encode()).hexdigest()

    def export_to_excel(
        self,
        export_type: str,
        batch_no: Optional[str] = None,
        exported_by: str = "system",
        freeze_after: bool = False,
        filters: Optional[Dict[str, Any]] = None,
    ) -> ExportSnapshot:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_name = f"{export_type}_{timestamp}.xlsx"
        file_path = os.path.join(settings.EXPORT_DIR, file_name)

        all_data = {}
        snapshot_data = {}

        if export_type in ["checkin", "all"]:
            data = self._get_checkin_data(batch_no)
            all_data["入住单"] = data
            snapshot_data["checkin"] = data

        if export_type in ["deposit", "all"]:
            data = self._get_deposit_data(batch_no)
            all_data["押金流水"] = data
            snapshot_data["deposit"] = data

        if export_type in ["room_change", "all"]:
            data = self._get_room_change_data(batch_no)
            all_data["换房记录"] = data
            snapshot_data["room_change"] = data

        if export_type in ["reconciliation", "all"]:
            data = self._get_reconciliation_data(batch_no)
            all_data["对账结果"] = data
            snapshot_data["reconciliation"] = data

        with pd.ExcelWriter(file_path, engine="openpyxl") as writer:
            has_data = False
            for sheet_name, data in all_data.items():
                if data:
                    df = pd.DataFrame(data)
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
                    has_data = True
            
            if not has_data:
                pd.DataFrame({"说明": ["无数据"]}).to_excel(writer, sheet_name="说明", index=False)

        record_count = sum(len(d) for d in all_data.values())
        checksum = self._calculate_checksum(snapshot_data)

        snapshot = ExportSnapshot(
            snapshot_no=self.generate_snapshot_no(),
            batch_no=batch_no,
            export_type=export_type,
            file_path=file_path,
            file_name=file_name,
            is_frozen=freeze_after,
            frozen_at=datetime.utcnow() if freeze_after else None,
            frozen_by=exported_by if freeze_after else None,
            record_count=record_count,
            checksum=checksum,
            exported_by=exported_by,
            exported_at=datetime.utcnow(),
            snapshot_data=snapshot_data,
        )

        if freeze_after:
            snapshot.remarks = "导出时自动冻结"

        self.db.add(snapshot)
        self.db.commit()
        self.db.refresh(snapshot)

        self.audit_service.log_operation(
            record_type="export",
            record_id=snapshot.snapshot_no,
            operation="create" + ("_and_freeze" if freeze_after else ""),
            operator=exported_by,
            after_data={"export_type": export_type, "record_count": record_count},
            batch_no=batch_no,
        )

        return snapshot

    def freeze_snapshot(
        self,
        snapshot_no: str,
        frozen_by: str,
        remarks: Optional[str] = None,
    ) -> Optional[ExportSnapshot]:
        snapshot = (
            self.db.query(ExportSnapshot)
            .filter(ExportSnapshot.snapshot_no == snapshot_no)
            .first()
        )

        if not snapshot or snapshot.is_frozen:
            return snapshot

        snapshot.is_frozen = True
        snapshot.frozen_at = datetime.utcnow()
        snapshot.frozen_by = frozen_by
        if remarks:
            snapshot.remarks = remarks

        self.db.commit()
        self.db.refresh(snapshot)

        self.audit_service.log_operation(
            record_type="export",
            record_id=snapshot_no,
            operation="freeze",
            operator=frozen_by,
            change_reason=remarks,
            batch_no=snapshot.batch_no,
        )

        return snapshot

    def get_snapshot(self, snapshot_no: str) -> Optional[ExportSnapshot]:
        return (
            self.db.query(ExportSnapshot)
            .filter(ExportSnapshot.snapshot_no == snapshot_no)
            .first()
        )

    def list_snapshots(
        self, batch_no: Optional[str] = None, frozen_only: bool = False, limit: int = 100
    ):
        query = self.db.query(ExportSnapshot)
        if batch_no:
            query = query.filter(ExportSnapshot.batch_no == batch_no)
        if frozen_only:
            query = query.filter(ExportSnapshot.is_frozen == True)
        return query.order_by(ExportSnapshot.exported_at.desc()).limit(limit).all()

    def verify_snapshot(self, snapshot_no: str) -> Dict[str, Any]:
        snapshot = self.get_snapshot(snapshot_no)
        if not snapshot:
            return {"valid": False, "error": "快照不存在"}

        current_data = snapshot.snapshot_data or {}
        current_checksum = self._calculate_checksum(current_data)

        is_valid = current_checksum == snapshot.checksum

        return {
            "valid": is_valid,
            "snapshot_no": snapshot_no,
            "expected_checksum": snapshot.checksum,
            "actual_checksum": current_checksum,
            "is_frozen": snapshot.is_frozen,
        }
