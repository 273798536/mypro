from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Tuple
from uuid import uuid4

from .models import (
    RecordStatus,
    TransactionType,
    AccountLedger,
    ProcessingResult,
    MedicalInsuranceFlow,
    OutpatientReceipt,
    SelfPayItem,
    AccountBalance,
    SupplementaryRequest
)


class RecordProcessor:
    def __init__(self, records: dict, input_dir: str, output_dir: str):
        self.records = records
        self.input_dir = input_dir
        self.output_dir = output_dir
        self.patients = defaultdict(lambda: defaultdict(list))
        self.processed_supplementary = set()

    def process(self) -> ProcessingResult:
        run_id = str(uuid4())[:8]
        result = ProcessingResult(
            run_id=run_id,
            run_time=datetime.now(),
            input_dir=self.input_dir,
            output_dir=self.output_dir
        )

        self._group_by_patient()
        self._detect_cross_month(result)
        self._detect_duplicate_supplementary(result)
        self._detect_self_pay_errors(result)
        self._build_ledgers(result)
        self._count_statuses(result)

        return result

    def _group_by_patient(self):
        for flow in self.records['flows']:
            key = flow.id_card or flow.patient_name
            if key:
                self.patients[key]['flows'].append(flow)

        for receipt in self.records['receipts']:
            key = receipt.id_card or receipt.patient_name
            if key:
                self.patients[key]['receipts'].append(receipt)

        for item in self.records['self_pay_items']:
            key = item.id_card or item.patient_name
            if key:
                self.patients[key]['self_pay_items'].append(item)

        for balance in self.records['balances']:
            key = balance.id_card or balance.patient_name
            if key:
                self.patients[key]['balances'].append(balance)

        for supp in self.records['supplementary']:
            key = supp.id_card or supp.patient_name
            if key:
                self.patients[key]['supplementary'].append(supp)

    def _detect_cross_month(self, result: ProcessingResult):
        for key, patient_data in self.patients.items():
            flows = patient_data.get('flows', [])
            receipts = patient_data.get('receipts', [])

            for flow in flows:
                if not flow.transaction_date:
                    continue
                flow_month = (flow.transaction_date.year, flow.transaction_date.month)

                for receipt in receipts:
                    if not receipt.receipt_date:
                        continue
                    receipt_month = (receipt.receipt_date.year, receipt.receipt_date.month)

                    if flow.patient_name == receipt.patient_name and flow_month != receipt_month:
                        if abs((flow.transaction_date - receipt.receipt_date).days) <= 30:
                            if flow.status == RecordStatus.PENDING:
                                flow.status = RecordStatus.CROSS_MONTH
                                flow.notes.append(f"跨月报销: 流水日期{flow.transaction_date.strftime('%Y-%m')}, 票据日期{receipt.receipt_date.strftime('%Y-%m')}")
                                result.warnings.append({
                                    'type': 'cross_month',
                                    'patient': flow.patient_name,
                                    'flow_date': flow.transaction_date.strftime('%Y-%m-%d'),
                                    'receipt_date': receipt.receipt_date.strftime('%Y-%m-%d'),
                                    'amount': flow.amount,
                                    'message': f"流水与票据跨月，需人工确认"
                                })

    def _detect_duplicate_supplementary(self, result: ProcessingResult):
        supplementary_by_key = defaultdict(list)

        for supp in self.records['supplementary']:
            key = (supp.id_card, supp.request_no, supp.supplementary_amount)
            supplementary_by_key[key].append(supp)

        for key, supps in supplementary_by_key.items():
            if len(supps) > 1:
                for i, supp in enumerate(supps):
                    if i == 0:
                        supp.is_processed = True
                    else:
                        supp.status = RecordStatus.DUPLICATE
                        supp.notes.append(f"重复补划申请: 与{supps[0].id}重复")
                        result.warnings.append({
                            'type': 'duplicate_supplementary',
                            'patient': supp.patient_name,
                            'request_no': supp.request_no,
                            'amount': supp.supplementary_amount,
                            'message': f"检测到重复补划申请，已标记为重复记录"
                        })

        supp_key_set = set()
        for supp in self.records['supplementary']:
            key = (supp.id_card, supp.supplementary_amount, supp.reason)
            if key in supp_key_set:
                if supp.status != RecordStatus.DUPLICATE:
                    supp.status = RecordStatus.NEEDS_REVIEW
                    supp.notes.append("疑似重复补划: 相同金额和原因")
                    result.warnings.append({
                        'type': 'possible_duplicate',
                        'patient': supp.patient_name,
                        'amount': supp.supplementary_amount,
                        'reason': supp.reason,
                        'message': "疑似重复补划，需人工确认"
                    })
            else:
                supp_key_set.add(key)

    def _detect_self_pay_errors(self, result: ProcessingResult):
        for key, patient_data in self.patients.items():
            flows = patient_data.get('flows', [])
            self_pay_items = patient_data.get('self_pay_items', [])

            for item in self_pay_items:
                if not item.is_self_pay:
                    continue

                for flow in flows:
                    if flow.transaction_type != TransactionType.REIMBURSEMENT:
                        continue

                    if not flow.transaction_date or not item.item_date:
                        continue

                    date_diff = abs((flow.transaction_date - item.item_date).days)
                    if date_diff <= 3 and abs(flow.amount - item.amount) < 0.01:
                        if not item.is_self_pay:
                            item.status = RecordStatus.CORRECTED
                            item.add_audit(
                                action="修正自费标记",
                                operator="system",
                                note="项目已在医保报销中支付，修正为非自费",
                                previous_value="自费=True",
                                new_value="自费=False"
                            )
                            item.is_self_pay = False
                            result.warnings.append({
                                'type': 'self_pay_correction',
                                'patient': item.patient_name,
                                'item': item.item_name,
                                'amount': item.amount,
                                'message': "发现已报销项目被标记为自费，已自动修正"
                            })

    def _build_ledgers(self, result: ProcessingResult):
        for key, patient_data in self.patients.items():
            self._build_patient_ledger(key, patient_data, result)

    def _build_patient_ledger(self, key: str, patient_data: dict, result: ProcessingResult):
        flows = patient_data.get('flows', [])
        balances = patient_data.get('balances', [])
        supplementary = patient_data.get('supplementary', [])
        self_pay_items = patient_data.get('self_pay_items', [])

        if not flows and not balances:
            return

        patient_name = ""
        id_card = key
        for flow in flows:
            if flow.patient_name:
                patient_name = flow.patient_name
                break
        for balance in balances:
            if balance.patient_name:
                patient_name = balance.patient_name
                if not id_card or id_card == patient_name:
                    id_card = balance.id_card
                break

        periods = set()
        for f in flows:
            if f.transaction_date:
                periods.add(f"{f.transaction_date.year}-{f.transaction_date.month:02d}")
        for b in balances:
            if b.balance_date:
                periods.add(f"{b.balance_date.year}-{b.balance_date.month:02d}")

        for period in sorted(periods):
            ledger = AccountLedger(
                patient_name=patient_name,
                id_card=id_card,
                period=period
            )

            period_flows = [f for f in flows if f.transaction_date and
                           f"{f.transaction_date.year}-{f.transaction_date.month:02d}" == period]
            period_balances = [b for b in balances if b.balance_date and
                             f"{b.balance_date.year}-{b.balance_date.month:02d}" == period]
            period_supp = [s for s in supplementary if (s.is_processed or s.status != RecordStatus.DUPLICATE) and
                          s.request_date and
                          f"{s.request_date.year}-{s.request_date.month:02d}" == period]
            period_self_pay = [s for s in self_pay_items if s.is_self_pay and
                              s.item_date and
                              f"{s.item_date.year}-{s.item_date.month:02d}" == period]

            if period_balances:
                ledger.opening_balance = period_balances[0].previous_balance
                ledger.closing_balance = period_balances[-1].current_balance
                ledger.total_allocation = sum(b.monthly_allocation for b in period_balances)

            for flow in period_flows:
                trans = {
                    'id': flow.id,
                    'date': flow.transaction_date.strftime('%Y-%m-%d') if flow.transaction_date else '',
                    'type': flow.transaction_type.value,
                    'amount': flow.amount,
                    'source': flow.source_file,
                    'status': flow.status.value
                }
                ledger.transactions.append(trans)

                if flow.transaction_type == TransactionType.REIMBURSEMENT:
                    ledger.total_reimbursement += flow.amount
                elif flow.transaction_type == TransactionType.SELF_PAY:
                    ledger.total_self_pay += flow.amount
                elif flow.transaction_type == TransactionType.SUPPLEMENTARY:
                    ledger.total_supplementary += flow.amount

            for item in period_self_pay:
                ledger.total_self_pay += item.amount

            for supp in period_supp:
                if not supp.is_processed:
                    ledger.total_supplementary += supp.supplementary_amount

            self._check_balance_discrepancy(ledger, result)
            self._add_warnings_to_ledger(ledger, period_flows, period_supp, period_self_pay)

            result.ledgers.append(ledger)

    def _check_balance_discrepancy(self, ledger: AccountLedger, result: ProcessingResult):
        if ledger.opening_balance == 0 and ledger.closing_balance == 0:
            return

        expected_closing = (
            ledger.opening_balance
            + ledger.total_allocation
            + ledger.total_supplementary
            - ledger.total_reimbursement
            - ledger.total_self_pay
        )

        discrepancy = abs(ledger.closing_balance - expected_closing)
        if discrepancy > 0.01:
            ledger.discrepancies.append({
                'type': 'balance_mismatch',
                'expected': round(expected_closing, 2),
                'actual': round(ledger.closing_balance, 2),
                'difference': round(discrepancy, 2),
                'message': f"账户余额差异: 预期{expected_closing:.2f}元，实际{ledger.closing_balance:.2f}元"
            })
            result.warnings.append({
                'type': 'balance_discrepancy',
                'patient': ledger.patient_name,
                'period': ledger.period,
                'expected': round(expected_closing, 2),
                'actual': round(ledger.closing_balance, 2),
                'difference': round(discrepancy, 2),
                'message': f"{ledger.patient_name} {ledger.period} 账户余额差异{discrepancy:.2f}元"
            })

    def _add_warnings_to_ledger(self, ledger: AccountLedger, flows, supplementary, self_pay_items):
        cross_month = [f for f in flows if f.status == RecordStatus.CROSS_MONTH]
        if cross_month:
            ledger.warnings.append({
                'type': 'cross_month',
                'count': len(cross_month),
                'message': f"存在{len(cross_month)}笔跨月报销记录"
            })

        needs_review = [f for f in flows if f.status == RecordStatus.NEEDS_REVIEW]
        if needs_review:
            ledger.warnings.append({
                'type': 'needs_review',
                'count': len(needs_review),
                'message': f"有{len(needs_review)}笔记录需要人工确认"
            })

        dup_supp = [s for s in supplementary if s.status == RecordStatus.DUPLICATE]
        if dup_supp:
            ledger.warnings.append({
                'type': 'duplicate_supplementary',
                'count': len(dup_supp),
                'message': f"检测到{len(dup_supp)}笔重复补划申请"
            })

    def _count_statuses(self, result: ProcessingResult):
        all_records = []
        for category in ['flows', 'receipts', 'self_pay_items', 'balances', 'supplementary']:
            all_records.extend(self.records[category])

        result.total_records = len(all_records)
        result.pending_records = sum(1 for r in all_records if r.status == RecordStatus.PENDING)
        result.verified_records = sum(1 for r in all_records if r.status == RecordStatus.VERIFIED)
        result.corrected_records = sum(1 for r in all_records if r.status == RecordStatus.CORRECTED)
        result.needs_review_records = sum(1 for r in all_records if r.status == RecordStatus.NEEDS_REVIEW)
        result.cross_month_records = sum(1 for r in all_records if r.status == RecordStatus.CROSS_MONTH)
        result.duplicate_records = sum(1 for r in all_records if r.status == RecordStatus.DUPLICATE)
