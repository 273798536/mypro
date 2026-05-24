import csv
import json
import re
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
import io

from .models import (
    ReimbursementRecord,
    RecordStatus,
    SourceType,
    SourceEvidence,
    generate_record_id
)


class BaseImporter:
    def __init__(self, source_type: SourceType):
        self.source_type = source_type

    def parse(self, file_path: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        raise NotImplementedError


class InvoicePDFImporter(BaseImporter):
    def __init__(self):
        super().__init__(SourceType.INVOICE_PDF)

    def parse(self, file_path: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        records = []
        errors = []
        file_path = Path(file_path)
        
        try:
            if file_path.suffix.lower() == '.csv':
                return self._parse_csv(file_path)
            elif file_path.suffix.lower() == '.json':
                return self._parse_json(file_path)
            else:
                return self._parse_text_based(file_path)
        except Exception as e:
            errors.append({
                "line": 0,
                "error": str(e),
                "raw": ""
            })
        
        return records, errors

    def _parse_csv(self, file_path: Path) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        records = []
        errors = []
        
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for line_num, row in enumerate(reader, start=2):
                try:
                    record = self._extract_invoice_data(row, line_num, file_path.name)
                    if record:
                        records.append(record)
                except Exception as e:
                    errors.append({
                        "line": line_num,
                        "error": str(e),
                        "raw": json.dumps(row, ensure_ascii=False)
                    })
        
        return records, errors

    def _parse_json(self, file_path: Path) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        records = []
        errors = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        invoices = data.get('invoices', [data] if isinstance(data, dict) else data)
        
        for line_num, invoice in enumerate(invoices, start=1):
            try:
                record = self._extract_invoice_data(invoice, line_num, file_path.name)
                if record:
                    records.append(record)
            except Exception as e:
                errors.append({
                    "line": line_num,
                    "error": str(e),
                    "raw": json.dumps(invoice, ensure_ascii=False)
                })
        
        return records, errors

    def _parse_text_based(self, file_path: Path) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        records = []
        errors = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        invoice_pattern = re.compile(
            r'(?:发票|invoice).*?(?:员工|employee)[:：]\s*(\w+).*?'
            r'(?:金额|amount)[:：]\s*([\d.]+).*?'
            r'(?:日期|date)[:：]\s*([\d-]+).*?'
            r'(?:类型|type)[:：]\s*(\w+)',
            re.DOTALL | re.IGNORECASE
        )
        
        for match_num, match in enumerate(invoice_pattern.finditer(content), start=1):
            try:
                record = {
                    "source_type": SourceType.INVOICE_PDF.value,
                    "source_file": file_path.name,
                    "original_line": match_num,
                    "raw_value": match.group(0),
                    "employee_id": match.group(1),
                    "employee_name": match.group(1),
                    "expense_type": match.group(4),
                    "amount": float(match.group(2)),
                    "currency": "CNY",
                    "expense_date": match.group(3),
                    "invoice_number": f"INV-{match_num:04d}"
                }
                records.append(record)
            except Exception as e:
                errors.append({
                    "line": match_num,
                    "error": str(e),
                    "raw": match.group(0)
                })
        
        return records, errors

    def _extract_invoice_data(self, data: Dict[str, Any], line_num: int, filename: str) -> Optional[Dict[str, Any]]:
        def get_key(*keys):
            for k in keys:
                if k in data:
                    return data[k]
            return None

        employee_id = get_key('employee_id', '员工ID', '工号', 'emp_id') or get_key('employee_name', '员工姓名', '姓名')
        employee_name = get_key('employee_name', '员工姓名', '姓名') or employee_id
        expense_type = get_key('expense_type', '费用类型', '类型', 'type')
        amount = get_key('amount', '金额', 'amount')
        currency = get_key('currency', '货币', '币种') or 'CNY'
        expense_date = get_key('expense_date', '费用日期', '日期', 'date')
        invoice_number = get_key('invoice_number', '发票号', '发票号码')

        if not all([employee_id, amount, expense_date]):
            raise ValueError(f"Missing required fields: employee_id={employee_id}, amount={amount}, date={expense_date}")

        return {
            "source_type": SourceType.INVOICE_PDF.value,
            "source_file": filename,
            "original_line": line_num,
            "raw_value": json.dumps(data, ensure_ascii=False),
            "employee_id": str(employee_id),
            "employee_name": str(employee_name),
            "expense_type": str(expense_type) if expense_type else "其他",
            "amount": float(amount),
            "currency": str(currency),
            "expense_date": str(expense_date),
            "invoice_number": str(invoice_number) if invoice_number else None
        }


class TravelRequestImporter(BaseImporter):
    def __init__(self):
        super().__init__(SourceType.TRAVEL_REQUEST)

    def parse(self, file_path: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        records = []
        errors = []
        file_path = Path(file_path)
        
        try:
            if file_path.suffix.lower() == '.csv':
                return self._parse_csv(file_path)
            elif file_path.suffix.lower() == '.json':
                return self._parse_json(file_path)
            else:
                errors.append({"line": 0, "error": "Unsupported file format", "raw": ""})
        except Exception as e:
            errors.append({"line": 0, "error": str(e), "raw": ""})
        
        return records, errors

    def _parse_csv(self, file_path: Path) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        records = []
        errors = []
        
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for line_num, row in enumerate(reader, start=2):
                try:
                    record = self._extract_travel_data(row, line_num, file_path.name)
                    if record:
                        records.append(record)
                except Exception as e:
                    errors.append({
                        "line": line_num,
                        "error": str(e),
                        "raw": json.dumps(row, ensure_ascii=False)
                    })
        
        return records, errors

    def _parse_json(self, file_path: Path) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        records = []
        errors = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        requests = data.get('requests', [data] if isinstance(data, dict) else data)
        
        for line_num, req in enumerate(requests, start=1):
            try:
                record = self._extract_travel_data(req, line_num, file_path.name)
                if record:
                    records.append(record)
            except Exception as e:
                errors.append({
                    "line": line_num,
                    "error": str(e),
                    "raw": json.dumps(req, ensure_ascii=False)
                })
        
        return records, errors

    def _extract_travel_data(self, data: Dict[str, Any], line_num: int, filename: str) -> Optional[Dict[str, Any]]:
        def get_key(*keys):
            for k in keys:
                if k in data:
                    return data[k]
            return None

        employee_id = get_key('employee_id', '员工ID', '工号', 'emp_id') or get_key('employee_name', '员工姓名', '姓名')
        employee_name = get_key('employee_name', '员工姓名', '姓名') or employee_id
        trip_id = get_key('trip_id', '行程ID', 'shared_trip_id', '共享行程ID')
        expense_type = get_key('expense_type', '费用类型', '类型', 'type')
        amount = get_key('amount', '申请金额', '金额', 'amount')
        start_date = get_key('start_date', '开始日期', '出发日期')
        end_date = get_key('end_date', '结束日期', '返回日期')
        destination = get_key('destination', '目的地', 'location')

        if not all([employee_id, amount]):
            raise ValueError(f"Missing required fields: employee_id={employee_id}, amount={amount}")

        return {
            "source_type": SourceType.TRAVEL_REQUEST.value,
            "source_file": filename,
            "original_line": line_num,
            "raw_value": json.dumps(data, ensure_ascii=False),
            "employee_id": str(employee_id),
            "employee_name": str(employee_name),
            "expense_type": str(expense_type) if expense_type else "差旅",
            "amount": float(amount),
            "currency": "CNY",
            "expense_date": str(start_date) if start_date else str(end_date) if end_date else datetime.now().strftime('%Y-%m-%d'),
            "trip_id": str(trip_id) if trip_id else None,
            "start_date": str(start_date) if start_date else None,
            "end_date": str(end_date) if end_date else None,
            "destination": str(destination) if destination else None
        }


class PaymentFlowImporter(BaseImporter):
    def __init__(self):
        super().__init__(SourceType.PAYMENT_FLOW)

    def parse(self, file_path: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        records = []
        errors = []
        file_path = Path(file_path)
        
        try:
            if file_path.suffix.lower() == '.csv':
                return self._parse_csv(file_path)
            elif file_path.suffix.lower() == '.json':
                return self._parse_json(file_path)
            elif file_path.suffix.lower() in ['.xlsx', '.xls']:
                return self._parse_excel(file_path)
            else:
                errors.append({"line": 0, "error": "Unsupported file format", "raw": ""})
        except Exception as e:
            errors.append({"line": 0, "error": str(e), "raw": ""})
        
        return records, errors

    def _parse_csv(self, file_path: Path) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        records = []
        errors = []
        
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for line_num, row in enumerate(reader, start=2):
                try:
                    record = self._extract_payment_data(row, line_num, file_path.name)
                    if record:
                        records.append(record)
                except Exception as e:
                    errors.append({
                        "line": line_num,
                        "error": str(e),
                        "raw": json.dumps(row, ensure_ascii=False)
                    })
        
        return records, errors

    def _parse_json(self, file_path: Path) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        records = []
        errors = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        payments = data.get('payments', data.get('flows', [data] if isinstance(data, dict) else data))
        
        for line_num, payment in enumerate(payments, start=1):
            try:
                record = self._extract_payment_data(payment, line_num, file_path.name)
                if record:
                    records.append(record)
            except Exception as e:
                errors.append({
                    "line": line_num,
                    "error": str(e),
                    "raw": json.dumps(payment, ensure_ascii=False)
                })
        
        return records, errors

    def _parse_excel(self, file_path: Path) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        try:
            import pandas as pd
        except ImportError:
            return [], [{"line": 0, "error": "pandas not installed for Excel support", "raw": ""}]
        
        records = []
        errors = []
        
        df = pd.read_excel(file_path)
        
        for line_num, (_, row) in enumerate(df.iterrows(), start=2):
            try:
                row_dict = row.to_dict()
                record = self._extract_payment_data(row_dict, line_num, file_path.name)
                if record:
                    records.append(record)
            except Exception as e:
                errors.append({
                    "line": line_num,
                    "error": str(e),
                    "raw": str(row_dict)
                })
        
        return records, errors

    def _extract_payment_data(self, data: Dict[str, Any], line_num: int, filename: str) -> Optional[Dict[str, Any]]:
        def get_key(*keys):
            for k in keys:
                if k in data and data[k] is not None and str(data[k]).strip():
                    return data[k]
            return None

        employee_id = get_key('employee_id', '员工ID', '工号', 'emp_id', '收款人ID')
        employee_name = get_key('employee_name', '员工姓名', '姓名', '收款人') or employee_id
        expense_type = get_key('expense_type', '费用类型', '类型', 'type', '交易类型')
        amount = get_key('amount', '金额', '付款金额', '交易金额', 'payment_amount')
        currency = get_key('currency', '货币', '币种') or 'CNY'
        payment_date = get_key('payment_date', '付款日期', '交易日期', '日期', 'date')
        transaction_id = get_key('transaction_id', '交易流水号', '流水号', 'payment_id')

        if not all([amount]):
            raise ValueError(f"Missing required fields: amount={amount}")

        return {
            "source_type": SourceType.PAYMENT_FLOW.value,
            "source_file": filename,
            "original_line": line_num,
            "raw_value": json.dumps(data, ensure_ascii=False, default=str),
            "employee_id": str(employee_id) if employee_id else "UNKNOWN",
            "employee_name": str(employee_name) if employee_name else "未知",
            "expense_type": str(expense_type) if expense_type else "付款",
            "amount": float(amount),
            "currency": str(currency),
            "expense_date": str(payment_date) if payment_date else datetime.now().strftime('%Y-%m-%d'),
            "transaction_id": str(transaction_id) if transaction_id else None
        }


class SupervisorNoteImporter(BaseImporter):
    def __init__(self):
        super().__init__(SourceType.SUPERVISOR_NOTE)

    def parse(self, file_path: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        records = []
        errors = []
        file_path = Path(file_path)
        
        try:
            if file_path.suffix.lower() == '.csv':
                return self._parse_csv(file_path)
            elif file_path.suffix.lower() == '.json':
                return self._parse_json(file_path)
            elif file_path.suffix.lower() == '.txt':
                return self._parse_text(file_path)
            else:
                errors.append({"line": 0, "error": "Unsupported file format", "raw": ""})
        except Exception as e:
            errors.append({"line": 0, "error": str(e), "raw": ""})
        
        return records, errors

    def _parse_csv(self, file_path: Path) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        records = []
        errors = []
        
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for line_num, row in enumerate(reader, start=2):
                try:
                    record = self._extract_note_data(row, line_num, file_path.name)
                    if record:
                        records.append(record)
                except Exception as e:
                    errors.append({
                        "line": line_num,
                        "error": str(e),
                        "raw": json.dumps(row, ensure_ascii=False)
                    })
        
        return records, errors

    def _parse_json(self, file_path: Path) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        records = []
        errors = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        notes = data.get('notes', data.get('approvals', [data] if isinstance(data, dict) else data))
        
        for line_num, note in enumerate(notes, start=1):
            try:
                record = self._extract_note_data(note, line_num, file_path.name)
                if record:
                    records.append(record)
            except Exception as e:
                errors.append({
                    "line": line_num,
                    "error": str(e),
                    "raw": json.dumps(note, ensure_ascii=False)
                })
        
        return records, errors

    def _parse_text(self, file_path: Path) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        records = []
        errors = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        note_pattern = re.compile(
            r'(?:REC-\w+|记录ID[:：]\s*(\S+)).*?'
            r'(?:批注|意见|approval|note)[:：]\s*(.+?)(?:\n|$)',
            re.IGNORECASE
        )
        
        for line_num, line in enumerate(lines, start=1):
            match = note_pattern.search(line)
            if match:
                try:
                    record = {
                        "source_type": SourceType.SUPERVISOR_NOTE.value,
                        "source_file": file_path.name,
                        "original_line": line_num,
                        "raw_value": line.strip(),
                        "record_id": match.group(1),
                        "note": match.group(2).strip(),
                        "supervisor": "主管",
                        "approval_date": datetime.now().strftime('%Y-%m-%d')
                    }
                    records.append(record)
                except Exception as e:
                    errors.append({
                        "line": line_num,
                        "error": str(e),
                        "raw": line.strip()
                    })
        
        return records, errors

    def _extract_note_data(self, data: Dict[str, Any], line_num: int, filename: str) -> Optional[Dict[str, Any]]:
        def get_key(*keys):
            for k in keys:
                if k in data:
                    return data[k]
            return None

        record_id = get_key('record_id', '记录ID', '报销单ID')
        note = get_key('note', '批注', '意见', 'comment', 'approval_note')
        supervisor = get_key('supervisor', '主管', '审批人', 'approver')
        approval_date = get_key('approval_date', '审批日期', '日期')
        approval_status = get_key('status', '审批状态', '状态')

        if not record_id and not note:
            raise ValueError("Missing record_id or note content")

        return {
            "source_type": SourceType.SUPERVISOR_NOTE.value,
            "source_file": filename,
            "original_line": line_num,
            "raw_value": json.dumps(data, ensure_ascii=False),
            "record_id": str(record_id) if record_id else None,
            "note": str(note) if note else "",
            "supervisor": str(supervisor) if supervisor else "主管",
            "approval_date": str(approval_date) if approval_date else datetime.now().strftime('%Y-%m-%d'),
            "approval_status": str(approval_status) if approval_status else None
        }


def get_importer(source_type: SourceType) -> BaseImporter:
    importers = {
        SourceType.INVOICE_PDF: InvoicePDFImporter,
        SourceType.TRAVEL_REQUEST: TravelRequestImporter,
        SourceType.PAYMENT_FLOW: PaymentFlowImporter,
        SourceType.SUPERVISOR_NOTE: SupervisorNoteImporter
    }
    return importers[source_type]()


def detect_source_type(file_path: str) -> Optional[SourceType]:
    path = Path(file_path)
    name = path.name.lower()
    
    if any(k in name for k in ['invoice', '发票', 'fapiao']):
        return SourceType.INVOICE_PDF
    elif any(k in name for k in ['travel', 'trip', '差旅', '行程', '申请']):
        return SourceType.TRAVEL_REQUEST
    elif any(k in name for k in ['payment', 'flow', '付款', '流水', 'bank']):
        return SourceType.PAYMENT_FLOW
    elif any(k in name for k in ['note', 'approval', '批注', '主管', '审批']):
        return SourceType.SUPERVISOR_NOTE
    
    return None
