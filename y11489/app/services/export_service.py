import os
import json
import hashlib
from datetime import datetime
from typing import Any, Dict, List, Optional
from pathlib import Path
import pandas as pd
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.config import settings
from app.models.export import ExportRecord
from app.models.inspection import InspectionRecord
from app.models.rework import ReworkOrder
from app.models.machine_shift import MachineShift
from app.models.price_adjustment import PriceAdjustment
from app.models.states import RecordStatus
from app.models.user import User
from app.schemas.export import ExportRequest
from app.services.audit import AuditService
from app.services.status import StatusService


class ExportService:
    EXPORT_NO_PREFIX = "EXP"

    @staticmethod
    def _generate_export_no() -> str:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        return f"{ExportService.EXPORT_NO_PREFIX}{timestamp}"

    @staticmethod
    def _get_entity_class(export_type: str):
        mapping = {
            "inspection": InspectionRecord,
            "rework": ReworkOrder,
            "shift": MachineShift,
            "price": PriceAdjustment,
        }
        return mapping.get(export_type)

    @staticmethod
    def _mask_sensitive_record(record: Dict[str, Any]) -> Dict[str, Any]:
        return AuditService.mask_sensitive_data(record)

    @staticmethod
    def _query_records(
        db: Session,
        export_type: str,
        req: ExportRequest,
    ) -> List[Any]:
        if export_type == "all":
            all_records = []
            for et in ["inspection", "rework", "shift", "price"]:
                cls = ExportService._get_entity_class(et)
                query = db.query(cls)
                if req.status_filter and hasattr(cls, "status"):
                    query = query.filter(cls.status.in_(req.status_filter))
                if req.batch_no and hasattr(cls, "batch_no"):
                    query = query.filter(cls.batch_no.contains(req.batch_no))
                all_records.extend(query.all())
            return all_records

        cls = ExportService._get_entity_class(export_type)
        if not cls:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported export type: {export_type}"
            )

        query = db.query(cls)
        
        if req.start_date and hasattr(cls, "created_at"):
            query = query.filter(cls.created_at >= req.start_date)
        if req.end_date and hasattr(cls, "created_at"):
            query = query.filter(cls.created_at <= req.end_date)
        if req.status_filter and hasattr(cls, "status"):
            query = query.filter(cls.status.in_(req.status_filter))
        if req.batch_no and hasattr(cls, "batch_no"):
            query = query.filter(cls.batch_no.contains(req.batch_no))
        if req.machine_id and hasattr(cls, "machine_id"):
            query = query.filter(cls.machine_id.contains(req.machine_id))

        return query.all()

    @staticmethod
    def _record_to_dict(record: Any, include_raw: bool = False) -> Dict[str, Any]:
        result = {}
        for col in record.__table__.columns:
            val = getattr(record, col.name)
            if isinstance(val, RecordStatus):
                val = val.value
            elif isinstance(val, datetime):
                val = val.isoformat()
            result[col.name] = val
        
        if not include_raw and "raw_data" in result:
            del result["raw_data"]
        
        return result

    @staticmethod
    def _get_change_history(db: Session, entity_type: str, entity_id: int) -> List[Dict[str, Any]]:
        from app.models.audit import ChangeHistory
        changes = db.query(ChangeHistory).filter(
            ChangeHistory.entity_type == entity_type,
            ChangeHistory.entity_id == entity_id
        ).order_by(ChangeHistory.version).all()
        
        return [
            {
                "version": c.version,
                "field": c.field_name,
                "old_value": c.old_value,
                "new_value": c.new_value,
                "is_manual": c.is_manual_change,
                "reason": c.change_reason,
                "changed_at": c.changed_at.isoformat() if c.changed_at else None,
            }
            for c in changes
        ]

    @staticmethod
    def export_records(
        db: Session,
        req: ExportRequest,
        user: User,
    ) -> ExportRecord:
        export_no = ExportService._generate_export_no()
        records = ExportService._query_records(db, req.export_type, req)
        
        export_data: List[Dict[str, Any]] = []
        for record in records:
            entity_type = type(record).__name__.lower()
            if "record" in entity_type:
                entity_type = "inspection"
            elif "order" in entity_type and "rework" in entity_type:
                entity_type = "rework"
            elif "shift" in entity_type:
                entity_type = "shift"
            elif "adjustment" in entity_type:
                entity_type = "price"

            record_dict = ExportService._record_to_dict(record, req.include_raw_data)
            
            if req.mask_sensitive_fields:
                record_dict = ExportService._mask_sensitive_record(record_dict)
            
            if req.include_change_history:
                record_dict["change_history"] = ExportService._get_change_history(
                    db, entity_type, record.id
                )
            
            export_data.append(record_dict)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{export_no}_{req.export_type}.{req.format}"
        file_path = settings.EXPORT_DIR / filename

        if req.format == "xlsx":
            df = pd.DataFrame(export_data)
            df.to_excel(file_path, index=False)
        elif req.format == "csv":
            df = pd.DataFrame(export_data)
            df.to_csv(file_path, index=False, encoding="utf-8-sig")
        elif req.format == "json":
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(export_data, f, ensure_ascii=False, indent=2)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported format: {req.format}"
            )

        file_size = os.path.getsize(file_path)
        with open(file_path, "rb") as f:
            file_hash = hashlib.md5(f.read()).hexdigest()

        export_record = ExportRecord(
            export_no=export_no,
            export_type=req.export_type,
            criteria=req.model_dump(),
            record_count=len(export_data),
            is_sensitive_masked=1 if req.mask_sensitive_fields else 0,
            include_raw_data=1 if req.include_raw_data else 0,
            include_change_history=1 if req.include_change_history else 0,
            file_path=str(file_path),
            file_hash=file_hash,
            file_size=file_size,
            exported_by=user.id,
            status="completed",
        )
        db.add(export_record)
        db.commit()
        db.refresh(export_record)

        AuditService.log_action(
            db=db,
            action=f"export_{req.export_type}",
            entity_type="export_record",
            entity_id=export_record.id,
            user=user,
            new_values={
                "export_no": export_no,
                "record_count": len(export_data),
                "format": req.format,
                "mask_sensitive": req.mask_sensitive_fields,
            },
        )

        return export_record

    @staticmethod
    def freeze_before_export(
        db: Session,
        export_type: str,
        user: User,
    ) -> Dict[str, int]:
        classes = []
        if export_type == "all":
            classes = [
                ("inspection", InspectionRecord),
                ("rework", ReworkOrder),
                ("price", PriceAdjustment),
            ]
        else:
            cls = ExportService._get_entity_class(export_type)
            if cls:
                classes = [(export_type, cls)]

        frozen_count = 0
        for entity_type, cls in classes:
            records = db.query(cls).filter(
                cls.status.in_([RecordStatus.SUBMITTED, RecordStatus.RECONFIRMED])
            ).all()
            for record in records:
                try:
                    StatusService.freeze_entity(db, entity_type, record.id, user, "Freeze before export")
                    frozen_count += 1
                except Exception:
                    pass

        return {"frozen_count": frozen_count}

    @staticmethod
    def get_export_file_path(db: Session, export_id: int) -> Path:
        export = db.query(ExportRecord).filter(ExportRecord.id == export_id).first()
        if not export:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Export record not found"
            )
        return Path(export.file_path)
