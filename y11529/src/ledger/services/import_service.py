import hashlib
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from io import BytesIO
from sqlalchemy.orm import Session
import pandas as pd

from ..models import (
    ImportSource, LedgerRecord, RecordType, RecordStatus,
    Role, DeclarationForm, TaxNotice, TraceNode,
    ActionType, NodeType, TaxNoticeType
)
from .record_service import RecordService


class ImportResult:
    def __init__(self):
        self.success_count = 0
        self.failed_count = 0
        self.errors: List[Dict[str, Any]] = []
        self.created_records: List[LedgerRecord] = []

    def add_success(self, record: LedgerRecord):
        self.success_count += 1
        self.created_records.append(record)

    def add_error(self, row_number: int, error: str, raw_data: Dict[str, Any]):
        self.failed_count += 1
        self.errors.append({
            "row_number": row_number,
            "error": error,
            "raw_data": raw_data,
        })

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success_count": self.success_count,
            "failed_count": self.failed_count,
            "errors": self.errors,
            "created_record_ids": [r.id for r in self.created_records],
            "created_record_nos": [r.record_no for r in self.created_records],
        }


class ImportService:
    def __init__(self, db: Session):
        self.db = db
        self.record_service = RecordService(db)

    def _calculate_file_hash(self, content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

    def _read_excel(self, file_content: bytes, sheet_name: Optional[str] = None) -> pd.DataFrame:
        excel_file = BytesIO(file_content)
        if sheet_name:
            return pd.read_excel(excel_file, sheet_name=sheet_name)
        return pd.read_excel(excel_file)

    def _read_csv(self, file_content: bytes) -> pd.DataFrame:
        return pd.read_csv(BytesIO(file_content))

    def import_from_file(
        self,
        filename: str,
        file_content: bytes,
        record_type: RecordType,
        imported_by: str,
        imported_by_role: Role,
        sheet_name: Optional[str] = None,
    ) -> Tuple[ImportSource, ImportResult]:
        file_hash = self._calculate_file_hash(file_content)

        import_source = ImportSource(
            filename=filename,
            file_hash=file_hash,
            uploaded_by=imported_by,
            raw_content=file_content.decode("utf-8", errors="ignore")[:10000],
        )
        self.db.add(import_source)
        self.db.flush()

        result = ImportResult()

        try:
            if filename.endswith((".xlsx", ".xls")):
                df = self._read_excel(file_content, sheet_name)
            elif filename.endswith(".csv"):
                df = self._read_csv(file_content)
            else:
                raise ValueError(f"Unsupported file format: {filename}")

            import_source.total_rows = len(df)

            for idx, row in df.iterrows():
                row_number = idx + 2
                raw_data = row.to_dict()

                try:
                    record = self._create_record_from_row(
                        row=row,
                        raw_data=raw_data,
                        row_number=row_number,
                        record_type=record_type,
                        import_source_id=import_source.id,
                        imported_by=imported_by,
                        imported_by_role=imported_by_role,
                    )
                    result.add_success(record)

                except Exception as e:
                    result.add_error(row_number, str(e), raw_data)

            import_source.success_rows = result.success_count
            import_source.failed_rows = result.failed_count

            self.db.commit()
            self.db.refresh(import_source)

        except Exception as e:
            self.db.rollback()
            raise

        return import_source, result

    def _create_record_from_row(
        self,
        row: pd.Series,
        raw_data: Dict[str, Any],
        row_number: int,
        record_type: RecordType,
        import_source_id: int,
        imported_by: str,
        imported_by_role: Role,
    ) -> LedgerRecord:
        tracking_no = self._get_value(row, ["tracking_no", "运单号", "物流单号"], "")
        if not tracking_no:
            raise ValueError("tracking_no is required")

        record_kwargs = {
            "package_no": self._get_value(row, ["package_no", "包裹号"], None),
            "customs_no": self._get_value(row, ["customs_no", "海关编号"], None),
        }

        if record_type == RecordType.DECLARATION:
            record_kwargs.update({
                "declaration_no": self._get_value(row, ["declaration_no", "报关单号"], None),
                "hs_code": self._get_value(row, ["hs_code", "HS编码"], None),
                "goods_description": self._get_value(row, ["goods_description", "商品名称", "品名"], None),
                "quantity": self._get_float_value(row, ["quantity", "数量"], 0),
                "unit": self._get_value(row, ["unit", "单位"], None),
                "declared_value": self._get_float_value(row, ["declared_value", "申报价值"], 0),
                "currency": self._get_value(row, ["currency", "币种"], "CNY"),
                "weight": self._get_float_value(row, ["weight", "重量"], 0),
                "origin_country": self._get_value(row, ["origin_country", "原产国"], None),
                "destination_country": self._get_value(row, ["destination_country", "目的国"], None),
                "tax_amount": self._get_float_value(row, ["tax_amount", "税费"], 0),
                "duty_amount": self._get_float_value(row, ["duty_amount", "关税"], 0),
                "vat_amount": self._get_float_value(row, ["vat_amount", "增值税"], 0),
                "is_exception": self._get_bool_value(row, ["is_exception", "是否异常"], False),
                "exception_note": self._get_value(row, ["exception_note", "异常备注"], None),
                "exception_owner": self._get_value(row, ["exception_owner", "异常责任人"], None),
                "declarant": imported_by,
            })

        elif record_type == RecordType.TAX_NOTICE:
            record_kwargs.update({
                "notice_no": self._get_value(row, ["notice_no", "补税通知号"], None),
                "original_tax": self._get_float_value(row, ["original_tax", "原税费"], 0),
                "supplementary_tax": self._get_float_value(row, ["supplementary_tax", "补税费"], 0),
                "late_fee": self._get_float_value(row, ["late_fee", "滞纳金"], 0),
                "total_tax": self._get_float_value(row, ["total_tax", "总税费"], 0),
                "payer": self._get_value(row, ["payer", "缴款人"], imported_by),
            })

        elif record_type == RecordType.TRACE_NODE:
            node_type_str = self._get_value(row, ["node_type", "节点类型"], None)
            node_type = None
            if node_type_str:
                for nt in NodeType:
                    if nt.value == node_type_str or nt.name == node_type_str:
                        node_type = nt
                        break
            if not node_type:
                node_type = NodeType.CUSTOMS_DECLARATION

            record_kwargs.update({
                "node_type": node_type,
                "node_location": self._get_value(row, ["node_location", "节点位置"], None),
                "operator": self._get_value(row, ["operator", "操作人"], imported_by),
                "node_note": self._get_value(row, ["node_note", "节点备注"], None),
            })

        record = self.record_service.create_record(
            record_type=record_type,
            tracking_no=tracking_no,
            created_by=imported_by,
            created_by_role=imported_by_role,
            **record_kwargs,
        )

        record.import_source_id = import_source_id
        record.import_row_number = row_number
        record.import_raw_data = json.dumps(raw_data, ensure_ascii=False, default=str)

        self.db.commit()
        self.db.refresh(record)

        return record

    def _get_value(self, row: pd.Series, possible_keys: List[str], default: Any) -> Any:
        for key in possible_keys:
            if key in row and pd.notna(row[key]):
                return str(row[key]).strip()
        return default

    def _get_float_value(self, row: pd.Series, possible_keys: List[str], default: float) -> float:
        for key in possible_keys:
            if key in row and pd.notna(row[key]):
                try:
                    return float(row[key])
                except (ValueError, TypeError):
                    continue
        return default

    def _get_bool_value(self, row: pd.Series, possible_keys: List[str], default: bool) -> bool:
        for key in possible_keys:
            if key in row and pd.notna(row[key]):
                val = str(row[key]).lower().strip()
                if val in ["true", "1", "yes", "是"]:
                    return True
                elif val in ["false", "0", "no", "否"]:
                    return False
        return default

    def get_import_source(self, source_id: int) -> Optional[ImportSource]:
        return self.db.query(ImportSource).filter(ImportSource.id == source_id).first()

    def get_records_by_source(self, source_id: int) -> List[LedgerRecord]:
        return (
            self.db.query(LedgerRecord)
            .filter(LedgerRecord.import_source_id == source_id)
            .order_by(LedgerRecord.import_row_number)
            .all()
        )

    def check_duplicate_import(self, file_hash: str) -> Optional[ImportSource]:
        return (
            self.db.query(ImportSource)
            .filter(ImportSource.file_hash == file_hash)
            .order_by(ImportSource.created_at.desc())
            .first()
        )
