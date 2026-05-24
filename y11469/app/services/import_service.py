import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.core.enums import DataSourceType, ImportResult
from app.core.exceptions import PartialImportFailure, OriginalEvidenceProtected
from app.models.ledger import (
    ImportBatch, SampleTransfer, SizeModification, FabricInventory,
    ManualPricing, ShiftRecord
)


class ImportService:
    def __init__(self, db: Session):
        self.db = db

    def generate_batch_id(self) -> str:
        return f"BATCH-{uuid.uuid4().hex[:12].upper()}"

    def create_import_batch(
        self,
        source_type: str,
        source_file: str,
        imported_by: str
    ) -> ImportBatch:
        batch = ImportBatch(
            batch_id=self.generate_batch_id(),
            source_type=source_type,
            source_file=source_file,
            imported_by=imported_by
        )
        self.db.add(batch)
        self.db.flush()
        return batch

    def check_duplicate(
        self,
        source_type: str,
        identifier_field: str,
        identifier_value: str
    ) -> bool:
        model_map = {
            DataSourceType.SAMPLE_TRANSFER: (SampleTransfer, "transfer_no"),
            DataSourceType.SIZE_MODIFICATION: (SizeModification, "modification_no"),
            DataSourceType.FABRIC_INVENTORY: (FabricInventory, "inventory_no"),
            DataSourceType.MANUAL_PRICING: (ManualPricing, "pricing_no"),
            DataSourceType.SHIFT_RECORD: (ShiftRecord, "shift_no"),
        }

        if source_type not in model_map:
            return False

        model, field_name = model_map[source_type]
        existing = self.db.query(model).filter(
            getattr(model, field_name) == identifier_value
        ).first()
        return existing is not None

    def import_sample_transfer(
        self,
        data: Dict[str, Any],
        source_file: str,
        source_row: int,
        batch_id: str,
        imported_by: str
    ) -> Tuple[bool, str]:
        try:
            transfer_no = data.get("transfer_no")
            if not transfer_no:
                return False, "缺少流转单号"

            if self.check_duplicate(DataSourceType.SAMPLE_TRANSFER, "transfer_no", transfer_no):
                return False, f"流转单号 {transfer_no} 已存在"

            record = SampleTransfer(
                transfer_no=transfer_no,
                style_code=data.get("style_code", ""),
                version=data.get("version", 1),
                transfer_type=data.get("transfer_type", ""),
                from_department=data.get("from_department", ""),
                to_department=data.get("to_department", ""),
                from_person=data.get("from_person", ""),
                to_person=data.get("to_person", ""),
                sample_count=data.get("sample_count", 0),
                transfer_date=datetime.fromisoformat(data["transfer_date"]) if data.get("transfer_date") else None,
                received_date=datetime.fromisoformat(data["received_date"]) if data.get("received_date") else None,
                is_obsolete=data.get("is_obsolete", False),
                obsolete_reason=data.get("obsolete_reason"),
                status=data.get("status", ""),
                remarks=data.get("remarks"),
                source_file=source_file,
                source_row_number=source_row,
                original_raw_data=json.dumps(data, ensure_ascii=False),
                import_batch_id=batch_id,
                imported_by=imported_by
            )
            self.db.add(record)
            return True, ""
        except Exception as e:
            return False, str(e)

    def import_size_modification(
        self,
        data: Dict[str, Any],
        source_file: str,
        source_row: int,
        batch_id: str,
        imported_by: str
    ) -> Tuple[bool, str]:
        try:
            modification_no = data.get("modification_no")
            if not modification_no:
                return False, "缺少修改单号"

            if self.check_duplicate(DataSourceType.SIZE_MODIFICATION, "modification_no", modification_no):
                return False, f"修改单号 {modification_no} 已存在"

            record = SizeModification(
                modification_no=modification_no,
                style_code=data.get("style_code", ""),
                version=data.get("version", 1),
                size_type=data.get("size_type", ""),
                original_specs=data.get("original_specs", {}),
                modified_specs=data.get("modified_specs", {}),
                modification_reason=data.get("modification_reason", ""),
                designer=data.get("designer", ""),
                pattern_maker=data.get("pattern_maker", ""),
                modified_date=datetime.fromisoformat(data["modified_date"]) if data.get("modified_date") else None,
                confirmed_date=datetime.fromisoformat(data["confirmed_date"]) if data.get("confirmed_date") else None,
                requires_new_fabric=data.get("requires_new_fabric", False),
                old_fabric_disposition=data.get("old_fabric_disposition"),
                is_approved=data.get("is_approved", False),
                remarks=data.get("remarks"),
                source_file=source_file,
                source_row_number=source_row,
                original_raw_data=json.dumps(data, ensure_ascii=False),
                import_batch_id=batch_id,
                imported_by=imported_by
            )
            self.db.add(record)
            return True, ""
        except Exception as e:
            return False, str(e)

    def import_fabric_inventory(
        self,
        data: Dict[str, Any],
        source_file: str,
        source_row: int,
        batch_id: str,
        imported_by: str
    ) -> Tuple[bool, str]:
        try:
            inventory_no = data.get("inventory_no")
            if not inventory_no:
                return False, "缺少出入库单号"

            if self.check_duplicate(DataSourceType.FABRIC_INVENTORY, "inventory_no", inventory_no):
                return False, f"出入库单号 {inventory_no} 已存在"

            record = FabricInventory(
                inventory_no=inventory_no,
                style_code=data.get("style_code", ""),
                version=data.get("version", 1),
                fabric_code=data.get("fabric_code", ""),
                fabric_name=data.get("fabric_name", ""),
                fabric_batch=data.get("fabric_batch", ""),
                color=data.get("color", ""),
                operation_type=data.get("operation_type", ""),
                quantity=data.get("quantity", 0),
                unit=data.get("unit", "米"),
                operation_date=datetime.fromisoformat(data["operation_date"]) if data.get("operation_date") else None,
                operator=data.get("operator", ""),
                receiver=data.get("receiver"),
                receiver_role=data.get("receiver_role"),
                is_old_version=data.get("is_old_version", False),
                old_version_note=data.get("old_version_note"),
                disposition_status=data.get("disposition_status"),
                remarks=data.get("remarks"),
                source_file=source_file,
                source_row_number=source_row,
                original_raw_data=json.dumps(data, ensure_ascii=False),
                import_batch_id=batch_id,
                imported_by=imported_by
            )
            self.db.add(record)
            return True, ""
        except Exception as e:
            return False, str(e)

    def import_manual_pricing(
        self,
        data: Dict[str, Any],
        source_file: str,
        source_row: int,
        batch_id: str,
        imported_by: str
    ) -> Tuple[bool, str]:
        try:
            pricing_no = data.get("pricing_no")
            if not pricing_no:
                return False, "缺少改价单号"

            if self.check_duplicate(DataSourceType.MANUAL_PRICING, "pricing_no", pricing_no):
                return False, f"改价单号 {pricing_no} 已存在"

            original_price = data.get("original_price", 0)
            modified_price = data.get("modified_price", 0)

            record = ManualPricing(
                pricing_no=pricing_no,
                style_code=data.get("style_code", ""),
                original_price=original_price,
                modified_price=modified_price,
                price_difference=modified_price - original_price,
                pricing_reason=data.get("pricing_reason", ""),
                approved_by=data.get("approved_by", ""),
                approved_date=datetime.fromisoformat(data["approved_date"]) if data.get("approved_date") else None,
                is_approved=data.get("is_approved", False),
                remarks=data.get("remarks"),
                source_file=source_file,
                source_row_number=source_row,
                original_raw_data=json.dumps(data, ensure_ascii=False),
                import_batch_id=batch_id,
                imported_by=imported_by
            )
            self.db.add(record)
            return True, ""
        except Exception as e:
            return False, str(e)

    def import_shift_record(
        self,
        data: Dict[str, Any],
        source_file: str,
        source_row: int,
        batch_id: str,
        imported_by: str
    ) -> Tuple[bool, str]:
        try:
            shift_no = data.get("shift_no")
            if not shift_no:
                return False, "缺少班次编号"

            if self.check_duplicate(DataSourceType.SHIFT_RECORD, "shift_no", shift_no):
                return False, f"班次编号 {shift_no} 已存在"

            record = ShiftRecord(
                shift_no=shift_no,
                shift_date=datetime.fromisoformat(data["shift_date"]) if data.get("shift_date") else None,
                shift_type=data.get("shift_type", ""),
                worker=data.get("worker", ""),
                worker_role=data.get("worker_role", ""),
                style_code=data.get("style_code", ""),
                work_content=data.get("work_content", ""),
                work_hours=data.get("work_hours", 0),
                output_quantity=data.get("output_quantity"),
                remarks=data.get("remarks"),
                source_file=source_file,
                source_row_number=source_row,
                original_raw_data=json.dumps(data, ensure_ascii=False),
                import_batch_id=batch_id,
                imported_by=imported_by
            )
            self.db.add(record)
            return True, ""
        except Exception as e:
            return False, str(e)

    def batch_import(
        self,
        source_type: str,
        source_file: str,
        records: List[Dict[str, Any]],
        imported_by: str
    ) -> ImportBatch:
        batch = self.create_import_batch(source_type, source_file, imported_by)
        batch.total_count = len(records)

        import_func_map = {
            DataSourceType.SAMPLE_TRANSFER: self.import_sample_transfer,
            DataSourceType.SIZE_MODIFICATION: self.import_size_modification,
            DataSourceType.FABRIC_INVENTORY: self.import_fabric_inventory,
            DataSourceType.MANUAL_PRICING: self.import_manual_pricing,
            DataSourceType.SHIFT_RECORD: self.import_shift_record,
        }

        import_func = import_func_map.get(source_type)
        if not import_func:
            raise ValueError(f"不支持的数据源类型: {source_type}")

        success_count = 0
        failed_count = 0
        error_details = []

        for idx, record_data in enumerate(records, start=2):
            success, error_msg = import_func(
                record_data,
                source_file,
                idx,
                batch.batch_id,
                imported_by
            )
            if success:
                success_count += 1
            else:
                failed_count += 1
                error_details.append({
                    "row_number": idx,
                    "data": record_data,
                    "error": error_msg
                })

        batch.success_count = success_count
        batch.failed_count = failed_count
        batch.error_details = error_details
        batch.completed_at = datetime.utcnow()

        if failed_count == 0:
            batch.import_result = ImportResult.SUCCESS
        elif success_count == 0:
            batch.import_result = ImportResult.FAILED
        else:
            batch.import_result = ImportResult.PARTIAL

        self.db.commit()

        if batch.import_result == ImportResult.PARTIAL:
            raise PartialImportFailure(success_count, failed_count)

        return batch

    def get_original_evidence(self, source_type: str, record_id: int) -> Dict[str, Any]:
        model_map = {
            DataSourceType.SAMPLE_TRANSFER: SampleTransfer,
            DataSourceType.SIZE_MODIFICATION: SizeModification,
            DataSourceType.FABRIC_INVENTORY: FabricInventory,
            DataSourceType.MANUAL_PRICING: ManualPricing,
            DataSourceType.SHIFT_RECORD: ShiftRecord,
        }

        model = model_map.get(source_type)
        if not model:
            raise ValueError(f"不支持的数据源类型: {source_type}")

        record = self.db.query(model).filter(model.id == record_id).first()
        if not record:
            raise ValueError(f"记录不存在: {record_id}")

        return {
            "source_file": record.source_file,
            "source_row_number": record.source_row_number,
            "original_raw_data": record.original_raw_data,
            "import_batch_id": record.import_batch_id,
            "imported_at": record.imported_at,
            "imported_by": record.imported_by,
        }

    def update_parsed_data(self, source_type: str, record_id: int, updates: Dict[str, Any], operator: str) -> None:
        raise OriginalEvidenceProtected()
