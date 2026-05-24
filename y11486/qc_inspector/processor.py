import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
import pandas as pd

from .models import (
    ImportBatch, ReworkRecord, InspectionRecord, ShiftRecord, SupplierRecord,
    AsyncTask, TaskStatus, ImportStatus, ConflictStrategy, DataSource
)
from .database import log_audit


class DataValidator:
    @staticmethod
    def validate_rework(row: Dict[str, Any]) -> Tuple[bool, List[str]]:
        errors = []
        if not row.get("product_model"):
            errors.append("产品型号不能为空")
        if not row.get("serial_number"):
            errors.append("序列号不能为空")
        if row.get("yield_rate") is not None:
            try:
                yr = float(row["yield_rate"])
                if yr < 0 or yr > 100:
                    errors.append("良率应在0-100之间")
            except (ValueError, TypeError):
                errors.append("良率格式不正确")
        if row.get("rework_count") is not None:
            try:
                rc = int(row["rework_count"])
                if rc < 0:
                    errors.append("返工次数不能为负数")
            except (ValueError, TypeError):
                errors.append("返工次数格式不正确")
        return len(errors) == 0, errors

    @staticmethod
    def validate_inspection(row: Dict[str, Any]) -> Tuple[bool, List[str]]:
        errors = []
        if not row.get("product_model"):
            errors.append("产品型号不能为空")
        if row.get("sample_size") is not None and row.get("defect_count") is not None:
            try:
                ss = int(row["sample_size"])
                dc = int(row["defect_count"])
                if dc > ss:
                    errors.append("缺陷数不能大于样本数")
            except (ValueError, TypeError):
                pass
        return len(errors) == 0, errors

    @staticmethod
    def validate_shift(row: Dict[str, Any]) -> Tuple[bool, List[str]]:
        errors = []
        if not row.get("shift_name"):
            errors.append("班次名称不能为空")
        return len(errors) == 0, errors

    @staticmethod
    def validate_supplier(row: Dict[str, Any]) -> Tuple[bool, List[str]]:
        errors = []
        if not row.get("supplier_name"):
            errors.append("供应商名称不能为空")
        return len(errors) == 0, errors


class DataImporter:
    def __init__(self, db: Session, operator: str):
        self.db = db
        self.operator = operator

    def _parse_date(self, value: Any) -> Optional[datetime]:
        if pd.isna(value) or value is None or value == "":
            return None
        if isinstance(value, datetime):
            return value
        try:
            if isinstance(value, pd.Timestamp):
                return value.to_pydatetime()
            return pd.to_datetime(value).to_pydatetime()
        except Exception:
            return None

    def _find_existing_record(self, source: str, row: Dict[str, Any]):
        if source == DataSource.REWORK.value:
            serial = row.get("serial_number")
            if serial:
                return self.db.query(ReworkRecord).filter(
                    ReworkRecord.serial_number == serial
                ).first()
        elif source == DataSource.INSPECTION.value:
            model = row.get("product_model")
            date = self._parse_date(row.get("inspection_date"))
            if model and date:
                return self.db.query(InspectionRecord).filter(
                    InspectionRecord.product_model == model,
                    InspectionRecord.inspection_date == date
                ).first()
        elif source == DataSource.SHIFT.value:
            shift = row.get("shift_name")
            date = self._parse_date(row.get("shift_date"))
            machine = row.get("machine_id")
            if shift and date and machine:
                return self.db.query(ShiftRecord).filter(
                    ShiftRecord.shift_name == shift,
                    ShiftRecord.shift_date == date,
                    ShiftRecord.machine_id == machine
                ).first()
        elif source == DataSource.SUPPLIER.value:
            supplier = row.get("supplier_name")
            model = row.get("product_model")
            date = self._parse_date(row.get("invoice_date"))
            if supplier and model and date:
                return self.db.query(SupplierRecord).filter(
                    SupplierRecord.supplier_name == supplier,
                    SupplierRecord.product_model == model,
                    SupplierRecord.invoice_date == date
                ).first()
        return None

    def _apply_strategy(
        self,
        source: str,
        existing,
        new_data: Dict[str, Any],
        strategy: str,
        original_row: int
    ) -> Tuple[Any, str]:
        if not existing:
            return self._create_record(source, new_data, original_row), "created"

        if strategy == ConflictStrategy.IGNORE.value:
            return existing, "ignored"
        elif strategy == ConflictStrategy.APPEND.value:
            return self._create_record(source, new_data, original_row), "appended"
        elif strategy == ConflictStrategy.OVERWRITE.value:
            self._update_record(source, existing, new_data)
            return existing, "overwritten"
        return existing, "ignored"

    def _sanitize(self, value):
        if pd.isna(value):
            return None
        return value

    def _create_record(self, source: str, data: Dict[str, Any], original_row: int):
        if source == DataSource.REWORK.value:
            is_valid, errors = DataValidator.validate_rework(data)
            record = ReworkRecord(
                original_row=original_row,
                product_model=self._sanitize(data.get("product_model")),
                serial_number=self._sanitize(data.get("serial_number")),
                defect_type=self._sanitize(data.get("defect_type")),
                defect_description=self._sanitize(data.get("defect_description")),
                rework_action=self._sanitize(data.get("rework_action")),
                rework_result=self._sanitize(data.get("rework_result")),
                responsible_shift=self._sanitize(data.get("responsible_shift")),
                rework_count=int(data.get("rework_count", 1)) if not pd.isna(data.get("rework_count")) else None,
                yield_rate=float(data.get("yield_rate")) if not pd.isna(data.get("yield_rate")) and data.get("yield_rate") != "" else None,
                inspector=self._sanitize(data.get("inspector")),
                rework_date=self._parse_date(data.get("rework_date")),
                is_valid=is_valid,
                validation_errors="; ".join(errors) if errors else None
            )
        elif source == DataSource.INSPECTION.value:
            is_valid, errors = DataValidator.validate_inspection(data)
            record = InspectionRecord(
                original_row=original_row,
                product_model=self._sanitize(data.get("product_model")),
                inspection_date=self._parse_date(data.get("inspection_date")),
                sample_size=int(data.get("sample_size")) if not pd.isna(data.get("sample_size")) else None,
                defect_count=int(data.get("defect_count")) if not pd.isna(data.get("defect_count")) else None,
                defect_rate=float(data.get("defect_rate")) if not pd.isna(data.get("defect_rate")) else None,
                inspector=self._sanitize(data.get("inspector")),
                result=self._sanitize(data.get("result")),
                is_valid=is_valid,
                validation_errors="; ".join(errors) if errors else None
            )
        elif source == DataSource.SHIFT.value:
            is_valid, errors = DataValidator.validate_shift(data)
            record = ShiftRecord(
                original_row=original_row,
                shift_name=self._sanitize(data.get("shift_name")),
                shift_date=self._parse_date(data.get("shift_date")),
                machine_id=self._sanitize(data.get("machine_id")),
                operator=self._sanitize(data.get("operator")),
                output_count=int(data.get("output_count")) if not pd.isna(data.get("output_count")) else None,
                defect_count=int(data.get("defect_count")) if not pd.isna(data.get("defect_count")) else None,
                is_valid=is_valid,
                validation_errors="; ".join(errors) if errors else None
            )
        elif source == DataSource.SUPPLIER.value:
            is_valid, errors = DataValidator.validate_supplier(data)
            record = SupplierRecord(
                original_row=original_row,
                supplier_name=self._sanitize(data.get("supplier_name")),
                product_model=self._sanitize(data.get("product_model")),
                quantity=int(data.get("quantity")) if not pd.isna(data.get("quantity")) else None,
                unit_price=float(data.get("unit_price")) if not pd.isna(data.get("unit_price")) else None,
                total_amount=float(data.get("total_amount")) if not pd.isna(data.get("total_amount")) else None,
                invoice_date=self._parse_date(data.get("invoice_date")),
                payment_status=self._sanitize(data.get("payment_status")),
                is_valid=is_valid,
                validation_errors="; ".join(errors) if errors else None
            )
        else:
            raise ValueError(f"Unknown source: {source}")

        self.db.add(record)
        return record

    def _update_record(self, source: str, record, data: Dict[str, Any]):
        updates = {}
        if source == DataSource.REWORK.value:
            fields = ["product_model", "defect_type", "defect_description",
                      "rework_action", "rework_result", "responsible_shift",
                      "rework_count", "yield_rate", "inspector", "rework_date"]
        elif source == DataSource.INSPECTION.value:
            fields = ["product_model", "inspection_date", "sample_size",
                      "defect_count", "defect_rate", "inspector", "result"]
        elif source == DataSource.SHIFT.value:
            fields = ["shift_name", "shift_date", "machine_id", "operator",
                      "output_count", "defect_count"]
        elif source == DataSource.SUPPLIER.value:
            fields = ["supplier_name", "product_model", "quantity", "unit_price",
                      "total_amount", "invoice_date", "payment_status"]
        else:
            return

        for field in fields:
            new_val = data.get(field)
            if new_val is not None and new_val != "":
                old_val = getattr(record, field)
                if old_val != new_val:
                    updates[field] = (str(old_val), str(new_val))
                    setattr(record, field, new_val)

        is_valid, errors = getattr(DataValidator, f"validate_{source}")(data)
        record.is_valid = is_valid
        record.validation_errors = "; ".join(errors) if errors else None

        if updates:
            log_audit(
                self.db,
                action="IMPORT_OVERWRITE",
                operator=self.operator,
                reason=f"导入覆盖 - {source}",
                old_value=json.dumps(updates, ensure_ascii=False),
                change_source="import_overwrite",
                **{f"{source}_id": record.id}
            )

    def import_file(
        self,
        source: str,
        file_path: str,
        strategy: str = ConflictStrategy.IGNORE.value
    ) -> Dict[str, Any]:
        if file_path.endswith(".xlsx"):
            df = pd.read_excel(file_path)
        elif file_path.endswith(".csv"):
            df = pd.read_csv(file_path)
        else:
            raise ValueError(f"不支持的文件格式: {file_path}")

        df.columns = [c.lower().replace(" ", "_") for c in df.columns]

        batch = ImportBatch(
            source=source,
            file_name=file_path.split("/")[-1],
            strategy=strategy,
            status=ImportStatus.PROCESSING.value,
            operator=self.operator,
            total_rows=len(df)
        )
        self.db.add(batch)
        self.db.flush()

        success_count = 0
        failed_count = 0
        stats = {"created": 0, "ignored": 0, "overwritten": 0, "appended": 0, "failed": 0}

        for idx, row in df.iterrows():
            original_row = idx + 2
            row_dict = row.to_dict()

            try:
                existing = self._find_existing_record(source, row_dict)
                record, action = self._apply_strategy(
                    source, existing, row_dict, strategy, original_row
                )

                if action != "ignored":
                    record.batch_id = batch.id
                    self.db.flush()

                if not record.is_valid:
                    stats["failed"] += 1
                    failed_count += 1
                    self._create_failed_task(batch.id, source, record.id, original_row, record.validation_errors)
                else:
                    stats[action] += 1
                    success_count += 1

            except Exception as e:
                failed_count += 1
                stats["failed"] += 1
                self._create_failed_task(
                    batch.id, source, None, original_row,
                    f"导入异常: {str(e)}", TaskStatus.PERMANENT.value
                )

        batch.status = ImportStatus.PARTIAL.value if failed_count > 0 else ImportStatus.COMPLETED.value
        batch.success_rows = success_count
        batch.failed_rows = failed_count
        batch.completed_at = datetime.now()

        return {
            "batch_id": batch.id,
            "total": len(df),
            "success": success_count,
            "failed": failed_count,
            "stats": stats
        }

    def _create_failed_task(
        self,
        batch_id: int,
        source_type: str,
        source_id: Optional[int],
        original_row: int,
        error_msg: str,
        status: str = TaskStatus.MANUAL.value
    ):
        task = AsyncTask(
            batch_id=batch_id,
            source_type=source_type,
            source_id=source_id,
            task_type=f"{source_type}_import_row_{original_row}",
            status=status,
            error_message=error_msg,
            error_details=json.dumps({"original_row": original_row}, ensure_ascii=False),
            operator=self.operator,
            resume_token=str(uuid.uuid4())
        )
        self.db.add(task)


class TaskProcessor:
    def __init__(self, db: Session, operator: str):
        self.db = db
        self.operator = operator

    def process_pending_tasks(self) -> Dict[str, int]:
        pending_tasks = self.db.query(AsyncTask).filter(
            AsyncTask.status.in_([TaskStatus.PENDING.value, TaskStatus.RETRY.value])
        ).all()

        results = {"completed": 0, "retry_waiting": 0, "manual_required": 0, "permanent_failed": 0}

        for task in pending_tasks:
            try:
                success = self._retry_task(task)
                if success:
                    task.status = TaskStatus.COMPLETED.value
                    task.completed_at = datetime.now()
                    results["completed"] += 1
                else:
                    if task.retry_count >= task.max_retries:
                        task.status = TaskStatus.MANUAL.value
                        results["manual_required"] += 1
                    else:
                        task.status = TaskStatus.RETRY.value
                        task.retry_count += 1
                        results["retry_waiting"] += 1
            except Exception as e:
                if task.retry_count >= task.max_retries:
                    task.status = TaskStatus.PERMANENT.value
                    results["permanent_failed"] += 1
                else:
                    task.status = TaskStatus.RETRY.value
                    task.retry_count += 1
                task.error_details = f"{task.error_details}\n重试失败: {str(e)}"

        return results

    def _retry_task(self, task: AsyncTask) -> bool:
        if task.source_type == DataSource.REWORK.value and task.source_id:
            record = self.db.query(ReworkRecord).get(task.source_id)
            if record:
                is_valid, errors = DataValidator.validate_rework({
                    "product_model": record.product_model,
                    "serial_number": record.serial_number,
                    "yield_rate": record.yield_rate,
                    "rework_count": record.rework_count
                })
                record.is_valid = is_valid
                record.validation_errors = "; ".join(errors) if errors else None
                return is_valid
        return True

    def resume_from_token(self, resume_token: str) -> Optional[AsyncTask]:
        return self.db.query(AsyncTask).filter(
            AsyncTask.resume_token == resume_token
        ).first()
