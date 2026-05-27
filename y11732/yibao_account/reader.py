import os
import csv
from datetime import datetime
from pathlib import Path
from typing import List, Tuple
import pandas as pd

from .models import (
    DataSource,
    MedicalInsuranceFlow,
    OutpatientReceipt,
    SelfPayItem,
    AccountBalance,
    SupplementaryRequest,
    ExplanationDoc,
    TransactionType
)


class DataReader:
    def __init__(self, input_dir: str):
        self.input_dir = Path(input_dir)
        self.records = {
            'flows': [],
            'receipts': [],
            'self_pay_items': [],
            'balances': [],
            'supplementary': [],
            'explanations': []
        }

    def read_all(self) -> dict:
        self._read_medical_insurance_flows()
        self._read_outpatient_receipts()
        self._read_self_pay_items()
        self._read_account_balances()
        self._read_supplementary_requests()
        self._read_explanation_docs()
        return self.records

    def _parse_date(self, date_str: str) -> datetime:
        formats = [
            "%Y-%m-%d", "%Y/%m/%d", "%Y年%m月%d日",
            "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S"
        ]
        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except (ValueError, AttributeError):
                continue
        return None

    def _parse_float(self, value: str) -> float:
        if not value or pd.isna(value):
            return 0.0
        value = str(value).strip()
        value = value.replace('¥', '').replace('元', '').replace(',', '')
        try:
            return float(value)
        except ValueError:
            return 0.0

    def _read_medical_insurance_flows(self):
        file_path = self._find_file(['医保流水', 'medical_insurance_flow', 'flow'])
        if not file_path:
            return

        df = self._read_file(file_path)
        for _, row in df.iterrows():
            record = MedicalInsuranceFlow(
                source=DataSource.MEDICAL_INSURANCE_FLOW,
                source_file=file_path.name,
                patient_name=str(row.get('姓名', row.get('患者姓名', ''))),
                id_card=str(row.get('身份证号', row.get('ID', ''))),
                amount=self._parse_float(row.get('金额', row.get('amount', 0))),
                department=str(row.get('科室', row.get('department', ''))),
                hospital=str(row.get('医院', row.get('hospital', '')))
            )

            trans_type = str(row.get('类型', row.get('type', '')))
            if '自费' in trans_type:
                record.transaction_type = TransactionType.SELF_PAY
            elif '划拨' in trans_type:
                record.transaction_type = TransactionType.ACCOUNT_TRANSFER
            elif '补划' in trans_type:
                record.transaction_type = TransactionType.SUPPLEMENTARY
            else:
                record.transaction_type = TransactionType.REIMBURSEMENT

            record.transaction_date = self._parse_date(
                str(row.get('日期', row.get('date', '')))
            )
            self.records['flows'].append(record)

    def _read_outpatient_receipts(self):
        file_path = self._find_file(['门诊票据', 'outpatient_receipt', 'receipt'])
        if not file_path:
            return

        df = self._read_file(file_path)
        for _, row in df.iterrows():
            record = OutpatientReceipt(
                source=DataSource.OUTPATIENT_RECEIPT,
                source_file=file_path.name,
                patient_name=str(row.get('姓名', row.get('患者姓名', ''))),
                id_card=str(row.get('身份证号', row.get('ID', ''))),
                receipt_no=str(row.get('票据号', row.get('receipt_no', ''))),
                total_amount=self._parse_float(row.get('总金额', row.get('total', 0))),
                insurance_amount=self._parse_float(row.get('医保支付', row.get('insurance', 0))),
                self_pay_amount=self._parse_float(row.get('自费金额', row.get('self_pay', 0))),
                department=str(row.get('科室', row.get('department', ''))),
                hospital=str(row.get('医院', row.get('hospital', '')))
            )
            record.receipt_date = self._parse_date(
                str(row.get('日期', row.get('date', '')))
            )
            self.records['receipts'].append(record)

    def _read_self_pay_items(self):
        file_path = self._find_file(['自费项目', 'self_pay', 'selfpay'])
        if not file_path:
            return

        df = self._read_file(file_path)
        for _, row in df.iterrows():
            record = SelfPayItem(
                source=DataSource.SELF_PAY_ITEMS,
                source_file=file_path.name,
                patient_name=str(row.get('姓名', row.get('患者姓名', ''))),
                id_card=str(row.get('身份证号', row.get('ID', ''))),
                item_name=str(row.get('项目名称', row.get('item', ''))),
                item_code=str(row.get('项目编码', row.get('code', ''))),
                amount=self._parse_float(row.get('金额', row.get('amount', 0))),
                quantity=int(self._parse_float(row.get('数量', row.get('quantity', 1))))
            )
            is_self_pay = str(row.get('是否自费', row.get('is_self_pay', '是')))
            record.is_self_pay = '是' in is_self_pay or 'True' in is_self_pay
            record.item_date = self._parse_date(
                str(row.get('日期', row.get('date', '')))
            )
            self.records['self_pay_items'].append(record)

    def _read_account_balances(self):
        file_path = self._find_file(['账户余额', 'balance', 'account_balance'])
        if not file_path:
            return

        df = self._read_file(file_path)
        for _, row in df.iterrows():
            record = AccountBalance(
                source=DataSource.ACCOUNT_BALANCE,
                source_file=file_path.name,
                patient_name=str(row.get('姓名', row.get('患者姓名', ''))),
                id_card=str(row.get('身份证号', row.get('ID', ''))),
                previous_balance=self._parse_float(row.get('上期余额', row.get('prev_balance', 0))),
                current_balance=self._parse_float(row.get('当前余额', row.get('current_balance', 0))),
                monthly_allocation=self._parse_float(row.get('月划拨', row.get('monthly', 0)))
            )
            record.balance_date = self._parse_date(
                str(row.get('日期', row.get('date', '')))
            )
            self.records['balances'].append(record)

    def _read_supplementary_requests(self):
        file_path = self._find_file(['补划申请', 'supplementary', '补划'])
        if not file_path:
            return

        df = self._read_file(file_path)
        for _, row in df.iterrows():
            record = SupplementaryRequest(
                source=DataSource.SUPPLEMENTARY_REQUEST,
                source_file=file_path.name,
                patient_name=str(row.get('姓名', row.get('患者姓名', ''))),
                id_card=str(row.get('身份证号', row.get('ID', ''))),
                request_no=str(row.get('申请号', row.get('request_no', ''))),
                supplementary_amount=self._parse_float(row.get('补划金额', row.get('amount', 0))),
                reason=str(row.get('原因', row.get('reason', '')))
            )
            processed = str(row.get('已处理', row.get('processed', '否')))
            record.is_processed = '是' in processed or 'True' in processed
            record.request_date = self._parse_date(
                str(row.get('申请日期', row.get('date', '')))
            )
            self.records['supplementary'].append(record)

    def _read_explanation_docs(self):
        file_path = self._find_file(['解释单', 'explanation', '解释'])
        if not file_path:
            return

        df = self._read_file(file_path)
        for _, row in df.iterrows():
            record = ExplanationDoc(
                source=DataSource.EXPLANATION_DOC,
                source_file=file_path.name,
                patient_name=str(row.get('姓名', row.get('患者姓名', ''))),
                id_card=str(row.get('身份证号', row.get('ID', ''))),
                title=str(row.get('标题', row.get('title', ''))),
                content=str(row.get('内容', row.get('content', ''))),
                related_records=str(row.get('关联记录', row.get('related', ''))).split(',')
            )
            record.doc_date = self._parse_date(
                str(row.get('日期', row.get('date', '')))
            )
            self.records['explanations'].append(record)

    def _find_file(self, keywords: List[str]) -> Path:
        if not self.input_dir.exists():
            return None

        for file in self.input_dir.iterdir():
            if file.suffix.lower() in ['.csv', '.xlsx', '.xls']:
                for keyword in keywords:
                    if keyword.lower() in file.name.lower():
                        return file
        return None

    def _read_file(self, file_path: Path) -> pd.DataFrame:
        if file_path.suffix.lower() == '.csv':
            encodings = ['utf-8', 'gbk', 'gb2312']
            for encoding in encodings:
                try:
                    return pd.read_csv(file_path, encoding=encoding)
                except UnicodeDecodeError:
                    continue
            return pd.read_csv(file_path, encoding='utf-8', errors='ignore')
        else:
            return pd.read_excel(file_path)
