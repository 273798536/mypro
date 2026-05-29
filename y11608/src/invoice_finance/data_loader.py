"""数据加载器"""
import json
import csv
from datetime import datetime, date
from typing import List, Dict, Any
import os

from .models import (
    Invoice, BuyerConfirmation, CreditPool, RepaymentFlow,
    WriteOffApplication, OccupationRecord, DataSource, InvoiceStatus,
    ConfirmationStatus, OccupationStatus, WriteOffStatus, CorrectionTrace
)


class DataLoader:
    """JSON/CSV数据加载器"""

    def __init__(self):
        pass

    def load_from_json(self, filepath: str) -> Dict[str, Any]:
        """从JSON文件加载数据"""
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)

    def load_invoices(self, data: List[Dict[str, Any]]) -> List[Invoice]:
        """加载发票数据"""
        invoices = []
        for item in data:
            corrections = []
            if 'corrections' in item:
                corrections = [
                    CorrectionTrace(
                        trace_id=c['trace_id'],
                        field_name=c['field_name'],
                        old_value=c['old_value'],
                        new_value=c['new_value'],
                        operator=c['operator'],
                        operated_at=datetime.fromisoformat(c['operated_at']) if c.get('operated_at') else datetime.now(),
                        reason=c.get('reason', ''),
                        source=DataSource(c.get('source', DataSource.MANUAL_CORRECTION))
                    )
                    for c in item.get('corrections', [])
                ]

            invoice = Invoice(
                id=item['id'],
                source=DataSource(item.get('source', DataSource.INVOICE_SYSTEM)),
                invoice_no=item['invoice_no'],
                invoice_code=item['invoice_code'],
                amount=float(item['amount']),
                invoice_date=date.fromisoformat(item['invoice_date']),
                buyer_name=item['buyer_name'],
                seller_name=item['seller_name'],
                status=InvoiceStatus(item.get('status', InvoiceStatus.PENDING)),
                verified_at=datetime.fromisoformat(item['verified_at']) if item.get('verified_at') else None,
                verified_by=item.get('verified_by'),
                verification_note=item.get('verification_note'),
                corrections=corrections,
                created_by=item.get('created_by')
            )
            invoices.append(invoice)
        return invoices

    def load_confirmations(self, data: List[Dict[str, Any]]) -> List[BuyerConfirmation]:
        """加载买方确认数据"""
        confirmations = []
        for item in data:
            conf = BuyerConfirmation(
                id=item['id'],
                source=DataSource(item.get('source', DataSource.BUYER_CONFIRM)),
                invoice_id=item['invoice_id'],
                buyer_name=item['buyer_name'],
                confirmed_amount=float(item['confirmed_amount']),
                status=ConfirmationStatus(item.get('status', ConfirmationStatus.PENDING)),
                confirmed_at=datetime.fromisoformat(item['confirmed_at']) if item.get('confirmed_at') else None,
                revoked_at=datetime.fromisoformat(item['revoked_at']) if item.get('revoked_at') else None,
                revoker=item.get('revoker'),
                revocation_reason=item.get('revocation_reason'),
                created_by=item.get('created_by')
            )
            confirmations.append(conf)
        return confirmations

    def load_credit_pools(self, data: List[Dict[str, Any]]) -> List[CreditPool]:
        """加载额度池数据"""
        pools = []
        for item in data:
            pool = CreditPool(
                id=item['id'],
                source=DataSource(item.get('source', DataSource.CREDIT_POOL)),
                pool_id=item['pool_id'],
                pool_name=item['pool_name'],
                total_credit=float(item['total_credit']),
                used_credit=float(item.get('used_credit', 0)),
                frozen_credit=float(item.get('frozen_credit', 0)),
                effective_date=date.fromisoformat(item['effective_date']),
                expire_date=date.fromisoformat(item['expire_date']),
                created_by=item.get('created_by')
            )
            pools.append(pool)
        return pools

    def load_repayments(self, data: List[Dict[str, Any]]) -> List[RepaymentFlow]:
        """加载回款流水数据"""
        repayments = []
        for item in data:
            repayment = RepaymentFlow(
                id=item['id'],
                source=DataSource(item.get('source', DataSource.REPAYMENT_FLOW)),
                flow_no=item['flow_no'],
                invoice_id=item['invoice_id'],
                amount=float(item['amount']),
                repayment_date=date.fromisoformat(item['repayment_date']),
                payer_account=item['payer_account'],
                payer_name=item['payer_name'],
                created_by=item.get('created_by')
            )
            repayments.append(repayment)
        return repayments

    def load_write_offs(self, data: List[Dict[str, Any]]) -> List[WriteOffApplication]:
        """加载核销申请数据"""
        write_offs = []
        for item in data:
            corrections = []
            if 'corrections' in item:
                corrections = [
                    CorrectionTrace(
                        trace_id=c['trace_id'],
                        field_name=c['field_name'],
                        old_value=c['old_value'],
                        new_value=c['new_value'],
                        operator=c['operator'],
                        operated_at=datetime.fromisoformat(c['operated_at']) if c.get('operated_at') else datetime.now(),
                        reason=c.get('reason', ''),
                        source=DataSource(c.get('source', DataSource.MANUAL_CORRECTION))
                    )
                    for c in item.get('corrections', [])
                ]

            wo = WriteOffApplication(
                id=item['id'],
                source=DataSource(item.get('source', DataSource.WRITE_OFF_APPLY)),
                apply_no=item['apply_no'],
                invoice_id=item['invoice_id'],
                amount=float(item['amount']),
                apply_date=date.fromisoformat(item['apply_date']),
                status=WriteOffStatus(item.get('status', WriteOffStatus.PENDING)),
                approved_amount=float(item['approved_amount']) if item.get('approved_amount') is not None else None,
                approved_at=datetime.fromisoformat(item['approved_at']) if item.get('approved_at') else None,
                approver=item.get('approver'),
                rejection_reason=item.get('rejection_reason'),
                corrections=corrections,
                created_by=item.get('created_by')
            )
            write_offs.append(wo)
        return write_offs

    def load_occupations(self, data: List[Dict[str, Any]]) -> List[OccupationRecord]:
        """加载额度占用记录"""
        occupations = []
        for item in data:
            corrections = []
            if 'corrections' in item:
                corrections = [
                    CorrectionTrace(
                        trace_id=c['trace_id'],
                        field_name=c['field_name'],
                        old_value=c['old_value'],
                        new_value=c['new_value'],
                        operator=c['operator'],
                        operated_at=datetime.fromisoformat(c['operated_at']) if c.get('operated_at') else datetime.now(),
                        reason=c.get('reason', ''),
                        source=DataSource(c.get('source', DataSource.MANUAL_CORRECTION))
                    )
                    for c in item.get('corrections', [])
                ]

            occ = OccupationRecord(
                id=item['id'],
                source=DataSource(item.get('source', DataSource.OCCUPATION_REPORT)),
                occupation_no=item['occupation_no'],
                invoice_id=item['invoice_id'],
                amount=float(item['amount']),
                status=OccupationStatus(item.get('status', OccupationStatus.LOCKED)),
                locked_at=datetime.fromisoformat(item['locked_at']) if item.get('locked_at') else datetime.now(),
                occupied_at=datetime.fromisoformat(item['occupied_at']) if item.get('occupied_at') else None,
                released_at=datetime.fromisoformat(item['released_at']) if item.get('released_at') else None,
                release_reason=item.get('release_reason'),
                corrections=corrections,
                created_by=item.get('created_by')
            )
            occupations.append(occ)
        return occupations

    def load_all(self, data_dir: str) -> Dict[str, List]:
        """从目录加载所有数据"""
        result = {
            'invoices': [],
            'confirmations': [],
            'credit_pools': [],
            'repayments': [],
            'write_offs': [],
            'occupations': []
        }

        files = {
            'invoices.json': ('invoices', self.load_invoices),
            'confirmations.json': ('confirmations', self.load_confirmations),
            'credit_pools.json': ('credit_pools', self.load_credit_pools),
            'repayments.json': ('repayments', self.load_repayments),
            'write_offs.json': ('write_offs', self.load_write_offs),
            'occupations.json': ('occupations', self.load_occupations)
        }

        for filename, (key, loader) in files.items():
            filepath = os.path.join(data_dir, filename)
            if os.path.exists(filepath):
                data = self.load_from_json(filepath)
                result[key] = loader(data)

        return result
