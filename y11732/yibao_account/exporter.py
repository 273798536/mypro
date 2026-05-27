import os
import json
import csv
from pathlib import Path
from datetime import datetime
from typing import Dict, List
import pandas as pd

from .models import ProcessingResult, AccountLedger, RecordStatus


class ResultExporter:
    def __init__(self, output_dir: str, run_id: str):
        self.output_dir = Path(output_dir)
        self.run_id = run_id
        self.run_dir = self.output_dir / f"run_{run_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.run_dir.mkdir(parents=True, exist_ok=True)

    def export_all(self, result: ProcessingResult, records: dict):
        self._export_summary(result)
        self._export_ledgers(result.ledgers)
        self._export_warnings(result)
        self._export_records_by_status(records)
        self._export_transactions_detailed(result.ledgers)
        self._export_audit_trail(records)
        return str(self.run_dir)

    def _export_summary(self, result: ProcessingResult):
        summary = {
            'run_id': result.run_id,
            'run_time': result.run_time.isoformat(),
            'input_dir': result.input_dir,
            'output_dir': result.output_dir,
            'statistics': {
                'total_records': result.total_records,
                'pending': result.pending_records,
                'verified': result.verified_records,
                'corrected': result.corrected_records,
                'needs_review': result.needs_review_records,
                'cross_month': result.cross_month_records,
                'duplicate': result.duplicate_records
            },
            'warning_count': len(result.warnings),
            'ledger_count': len(result.ledgers)
        }

        with open(self.run_dir / 'summary.json', 'w', encoding='utf-8') as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)

        with open(self.run_dir / 'summary.txt', 'w', encoding='utf-8') as f:
            f.write("=" * 60 + "\n")
            f.write("医保个人账户划拨处理报告\n")
            f.write("=" * 60 + "\n\n")
            f.write(f"运行编号: {result.run_id}\n")
            f.write(f"运行时间: {result.run_time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"输入目录: {result.input_dir}\n\n")

            f.write("-" * 60 + "\n")
            f.write("统计概览\n")
            f.write("-" * 60 + "\n")
            f.write(f"总记录数: {result.total_records}\n")
            f.write(f"  - 未处理: {result.pending_records}\n")
            f.write(f"  - 已确认: {result.verified_records}\n")
            f.write(f"  - 已修正: {result.corrected_records}\n")
            f.write(f"  - 需人工确认: {result.needs_review_records}\n")
            f.write(f"  - 跨月报销: {result.cross_month_records}\n")
            f.write(f"  - 重复记录: {result.duplicate_records}\n\n")

            f.write(f"警告数量: {len(result.warnings)}\n")
            f.write(f"账户账本: {len(result.ledgers)}个\n")

    def _export_ledgers(self, ledgers: List[AccountLedger]):
        ledgers_dir = self.run_dir / 'ledgers'
        ledgers_dir.mkdir(exist_ok=True)

        summary_data = []
        for ledger in ledgers:
            summary_data.append({
                '患者姓名': ledger.patient_name,
                '身份证号': ledger.id_card,
                '期间': ledger.period,
                '期初余额': round(ledger.opening_balance, 2),
                '期末余额': round(ledger.closing_balance, 2),
                '医保报销': round(ledger.total_reimbursement, 2),
                '自费扣款': round(ledger.total_self_pay, 2),
                '月划拨': round(ledger.total_allocation, 2),
                '补划': round(ledger.total_supplementary, 2),
                '警告数': len(ledger.warnings),
                '差异数': len(ledger.discrepancies)
            })

            with open(ledgers_dir / f"{ledger.id_card}_{ledger.period}.txt", 'w', encoding='utf-8') as f:
                f.write(f"患者: {ledger.patient_name}\n")
                f.write(f"身份证: {ledger.id_card}\n")
                f.write(f"期间: {ledger.period}\n")
                f.write("-" * 40 + "\n")
                f.write(f"期初余额: {ledger.opening_balance:.2f}元\n")
                f.write(f"期末余额: {ledger.closing_balance:.2f}元\n")
                f.write(f"本月划拨: {ledger.total_allocation:.2f}元\n")
                f.write(f"补划金额: {ledger.total_supplementary:.2f}元\n")
                f.write(f"医保报销: {ledger.total_reimbursement:.2f}元\n")
                f.write(f"自费扣款: {ledger.total_self_pay:.2f}元\n\n")

                if ledger.discrepancies:
                    f.write("⚠️  差异记录:\n")
                    for d in ledger.discrepancies:
                        f.write(f"  - {d['message']}\n")
                    f.write("\n")

                if ledger.warnings:
                    f.write("⚠️  警告:\n")
                    for w in ledger.warnings:
                        f.write(f"  - {w['message']}\n")
                    f.write("\n")

                f.write("交易明细:\n")
                for t in ledger.transactions:
                    status_mark = ""
                    if t['status'] != RecordStatus.PENDING.value:
                        status_mark = f" [{t['status']}]"
                    f.write(f"  {t['date']} {t['type']} {t['amount']:.2f}元 - {t['source']}{status_mark}\n")

        df = pd.DataFrame(summary_data)
        df.to_excel(ledgers_dir / '账户账本汇总.xlsx', index=False)

    def _export_warnings(self, result: ProcessingResult):
        if not result.warnings:
            return

        warnings_dir = self.run_dir / 'warnings'
        warnings_dir.mkdir(exist_ok=True)

        warning_types = {}
        for w in result.warnings:
            wtype = w.get('type', 'unknown')
            if wtype not in warning_types:
                warning_types[wtype] = []
            warning_types[wtype].append(w)

        for wtype, warnings in warning_types.items():
            with open(warnings_dir / f"{wtype}.txt", 'w', encoding='utf-8') as f:
                f.write(f"类型: {wtype}\n")
                f.write(f"数量: {len(warnings)}\n")
                f.write("-" * 40 + "\n\n")
                for i, w in enumerate(warnings, 1):
                    f.write(f"[{i}] {w.get('message', '')}\n")
                    for k, v in w.items():
                        if k not in ['type', 'message']:
                            f.write(f"    {k}: {v}\n")
                    f.write("\n")

        df = pd.DataFrame(result.warnings)
        df.to_excel(warnings_dir / '全部警告.xlsx', index=False)

    def _export_records_by_status(self, records: dict):
        status_dir = self.run_dir / 'records_by_status'
        status_dir.mkdir(exist_ok=True)

        status_categories = {
            'needs_review': [],
            'cross_month': [],
            'duplicate': [],
            'corrected': [],
            'pending': []
        }

        for flow in records['flows']:
            self._add_to_status_category(flow, status_categories, '流水')

        for receipt in records['receipts']:
            self._add_to_status_category(receipt, status_categories, '票据')

        for item in records['self_pay_items']:
            self._add_to_status_category(item, status_categories, '自费项目')

        for balance in records['balances']:
            self._add_to_status_category(balance, status_categories, '余额')

        for supp in records['supplementary']:
            self._add_to_status_category(supp, status_categories, '补划申请')

        for status_name, status_records in status_categories.items():
            if not status_records:
                continue

            with open(status_dir / f"{status_name}.txt", 'w', encoding='utf-8') as f:
                f.write(f"{RecordStatus[status_name.upper()].value if status_name.upper() in RecordStatus.__members__ else status_name}记录\n")
                f.write(f"数量: {len(status_records)}\n")
                f.write("=" * 40 + "\n\n")

                for rec in status_records:
                    f.write(f"[{rec['category']}] {rec['patient']}\n")
                    f.write(f"  来源文件: {rec['source_file']}\n")
                    f.write(f"  记录ID: {rec['id']}\n")
                    if rec.get('notes'):
                        f.write(f"  备注: {'; '.join(rec['notes'])}\n")
                    f.write("\n")

    def _add_to_status_category(self, record, categories: dict, category_name: str):
        status_key = record.status.name.lower()
        if status_key in categories:
            categories[status_key].append({
                'id': record.id,
                'category': category_name,
                'patient': getattr(record, 'patient_name', '未知'),
                'source_file': record.source_file,
                'notes': record.notes,
                'record': record
            })

    def _export_transactions_detailed(self, ledgers: List[AccountLedger]):
        trans_dir = self.run_dir / 'transactions'
        trans_dir.mkdir(exist_ok=True)

        all_trans = []
        for ledger in ledgers:
            for trans in ledger.transactions:
                all_trans.append({
                    '患者姓名': ledger.patient_name,
                    '身份证号': ledger.id_card,
                    '期间': ledger.period,
                    '日期': trans['date'],
                    '类型': trans['type'],
                    '金额': trans['amount'],
                    '来源文件': trans['source'],
                    '状态': trans['status'],
                    '记录ID': trans['id']
                })

        if all_trans:
            df = pd.DataFrame(all_trans)
            df.to_excel(trans_dir / '交易明细.xlsx', index=False)

    def _export_audit_trail(self, records: dict):
        audit_dir = self.run_dir / 'audit_trail'
        audit_dir.mkdir(exist_ok=True)

        all_audits = []

        for category_name, category_records in [
            ('流水', records['flows']),
            ('票据', records['receipts']),
            ('自费项目', records['self_pay_items']),
            ('余额', records['balances']),
            ('补划申请', records['supplementary'])
        ]:
            for record in category_records:
                if record.audit_trail:
                    for audit in record.audit_trail:
                        all_audits.append({
                            '时间': audit.timestamp.isoformat(),
                            '操作': audit.action,
                            '操作员': audit.operator,
                            '说明': audit.note,
                            '原值': audit.previous_value,
                            '新值': audit.new_value,
                            '记录类型': category_name,
                            '记录ID': record.id,
                            '来源文件': record.source_file
                        })

        if all_audits:
            df = pd.DataFrame(all_audits)
            df.to_excel(audit_dir / '审计追踪.xlsx', index=False)

            with open(audit_dir / '审计追踪.txt', 'w', encoding='utf-8') as f:
                f.write("审计追踪记录\n")
                f.write(f"共 {len(all_audits)} 条修改记录\n")
                f.write("=" * 60 + "\n\n")

                for audit in all_audits:
                    f.write(f"[{audit['时间']}] {audit['操作']} - {audit['操作员']}\n")
                    f.write(f"  说明: {audit['说明']}\n")
                    if audit['原值']:
                        f.write(f"  {audit['原值']} → {audit['新值']}\n")
                    f.write(f"  记录: {audit['记录类型']} ({audit['记录ID']})\n")
                    f.write(f"  文件: {audit['来源文件']}\n\n")
