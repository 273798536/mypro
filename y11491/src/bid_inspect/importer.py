import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Tuple

import pandas as pd
from sqlalchemy.orm import Session

from .core import (
    RecordManager,
    FailureManager,
    DeduplicationManager,
    calculate_file_hash,
)
from .models import (
    RecordType,
    RecordStatus,
    ImportSession,
)


class ImportParser:
    REQUIRED_COLUMNS = {
        RecordType.QUALIFICATION: ["supplier_name", "qualification_type"],
        RecordType.PRICE_VERSION: ["supplier_name", "price_version", "total_amount"],
        RecordType.SEALED_SCAN: ["supplier_name", "scan_page"],
        RecordType.ANOMALY_PHOTO: ["supplier_name", "photo_path"],
    }

    def __init__(self, file_path: str, record_type: RecordType):
        self.file_path = file_path
        self.record_type = record_type
        self.file_name = Path(file_path).name

    def parse(self) -> Tuple[List[Dict], List[Dict]]:
        if not Path(self.file_path).exists():
            raise FileNotFoundError(f"文件不存在: {self.file_path}")

        df = self._read_file()
        records = []
        failures = []

        for idx, row in df.iterrows():
            source_row = idx + 2
            try:
                record = self._parse_row(row, source_row)
                records.append(record)
            except ValueError as e:
                failures.append({
                    "source_row": source_row,
                    "error_code": "PARSE_ERROR",
                    "error_message": str(e),
                    "raw_value": str(row.to_dict()),
                })

        return records, failures

    def _read_file(self) -> pd.DataFrame:
        if self.file_path.endswith(".csv"):
            return pd.read_csv(self.file_path, dtype=str)
        elif self.file_path.endswith((".xlsx", ".xls")):
            return pd.read_excel(self.file_path, dtype=str)
        else:
            raise ValueError(f"不支持的文件格式: {self.file_path}")

    def _parse_row(self, row: pd.Series, source_row: int) -> Dict[str, Any]:
        required = self.REQUIRED_COLUMNS.get(self.record_type, [])
        for col in required:
            if col not in row or pd.isna(row[col]) or str(row[col]).strip() == "":
                raise ValueError(f"缺少必填字段: {col} (行 {source_row})")

        data = {"source_row": source_row}

        if "supplier_name" in row:
            data["supplier_name"] = str(row["supplier_name"]).strip()

        if self.record_type == RecordType.QUALIFICATION:
            data["qualification_type"] = str(row.get("qualification_type", "")).strip()
            data["qualification_level"] = str(row.get("qualification_level", "")).strip()
            if "valid_until" in row and not pd.isna(row["valid_until"]):
                try:
                    data["valid_until"] = pd.to_datetime(row["valid_until"]).to_pydatetime()
                except Exception:
                    pass

        elif self.record_type == RecordType.PRICE_VERSION:
            data["price_version"] = str(row.get("price_version", "")).strip()
            try:
                amount = str(row.get("total_amount", "0")).replace(",", "")
                data["total_amount"] = float(amount)
            except (ValueError, TypeError):
                raise ValueError(f"无效的金额格式 (行 {source_row})")
            data["currency"] = str(row.get("currency", "CNY")).strip()

        elif self.record_type == RecordType.SEALED_SCAN:
            try:
                data["scan_page"] = int(float(str(row.get("scan_page", "0"))))
            except (ValueError, TypeError):
                raise ValueError(f"无效的页码格式 (行 {source_row})")
            data["scan_hash"] = str(row.get("scan_hash", "")).strip()

        elif self.record_type == RecordType.ANOMALY_PHOTO:
            data["photo_path"] = str(row.get("photo_path", "")).strip()
            data["anomaly_type"] = str(row.get("anomaly_type", "")).strip()

        if "remark" in row:
            data["remark"] = str(row.get("remark", "")).strip()
        if "customer_remark" in row:
            data["customer_remark"] = str(row.get("customer_remark", "")).strip()

        return data


class ImportService:
    def __init__(self, db: Session, operated_by: str):
        self.db = db
        self.operated_by = operated_by
        self.record_manager = RecordManager(db, operated_by)
        self.failure_manager = FailureManager(db)
        self.dedup_manager = DeduplicationManager(db)

    def import_file(
        self,
        file_path: str,
        record_type: RecordType,
        allow_duplicate: bool = False,
    ) -> Dict[str, Any]:
        file_hash = calculate_file_hash(file_path)
        file_name = Path(file_path).name

        if not allow_duplicate and self.dedup_manager.is_duplicate_file(file_path, file_hash):
            return {
                "session_id": None,
                "is_duplicate": True,
                "message": "该文件已导入过，使用 --force 参数强制重新导入",
                "total_rows": 0,
                "success_count": 0,
                "failure_count": 0,
            }

        parser = ImportParser(file_path, record_type)
        records, parse_failures = parser.parse()

        session_id = str(uuid.uuid4())
        success_count = 0
        update_count = 0
        failure_count = 0

        for record_data in records:
            source_row = record_data.pop("source_row")
            try:
                record, is_new = self.record_manager.create_or_update_record(
                    record_type=record_type,
                    data=record_data,
                    source_file=file_name,
                    source_row=source_row,
                )

                if self._validate_record(record):
                    record.status = RecordStatus.VALID
                else:
                    record.status = RecordStatus.INVALID

                if is_new:
                    success_count += 1
                else:
                    update_count += 1

                self.failure_manager.resolve_failures_by_source(
                    file_name,
                    source_row,
                    f"重新导入成功，记录ID: {record.id}"
                )

            except Exception as e:
                self.failure_manager.record_failure(
                    source_file=file_name,
                    source_row=source_row,
                    error_code="IMPORT_ERROR",
                    error_message=str(e),
                    raw_value=str(record_data),
                )
                failure_count += 1

        for failure in parse_failures:
            self.failure_manager.record_failure(
                source_file=file_name,
                source_row=failure["source_row"],
                error_code=failure["error_code"],
                error_message=failure["error_message"],
                raw_value=failure["raw_value"],
            )
            failure_count += 1

        session = ImportSession(
            session_id=session_id,
            import_type=record_type,
            source_file=file_name,
            file_hash=file_hash,
            total_rows=len(records) + len(parse_failures),
            success_count=success_count,
            failure_count=failure_count,
            imported_by=self.operated_by,
            is_duplicate=False,
        )
        self.db.add(session)
        self.db.commit()

        return {
            "session_id": session_id,
            "is_duplicate": False,
            "total_rows": session.total_rows,
            "success_count": success_count,
            "update_count": update_count,
            "failure_count": failure_count,
        }

    def _validate_record(self, record) -> bool:
        if record.record_type == RecordType.QUALIFICATION:
            return bool(record.supplier_name and record.qualification_type)
        elif record.record_type == RecordType.PRICE_VERSION:
            return bool(
                record.supplier_name
                and record.price_version
                and record.total_amount is not None
            )
        elif record.record_type == RecordType.SEALED_SCAN:
            return bool(record.supplier_name and record.scan_page is not None)
        elif record.record_type == RecordType.ANOMALY_PHOTO:
            return bool(record.supplier_name and record.photo_path)
        return False
