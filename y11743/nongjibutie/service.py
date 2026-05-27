from datetime import datetime, date
from typing import List, Dict, Optional, Tuple
from .models import Database
from .validator import Validator, ValidationResult


DISBURSEMENT_STATUS_FLOW = {
    'pending': ['approved', 'rejected'],
    'approved': ['paid', 'rejected'],
    'paid': [],
    'rejected': ['pending']
}

BATCH_STATUS_FLOW = {
    'draft': ['reviewing', 'cancelled'],
    'reviewing': ['approved', 'cancelled'],
    'approved': ['paid', 'cancelled'],
    'paid': [],
    'cancelled': ['draft']
}


class SubsidyService:
    def __init__(self, db: Database):
        self.db = db
        self.validator = Validator(db)

    def create_batch(self, batch_name: str, batch_date: Optional[str] = None, source_file: str = 'manual') -> int:
        if batch_date is None:
            batch_date = date.today().isoformat()
        existing = self.db.query_one(
            'SELECT * FROM disbursement_batches WHERE batch_name = ?',
            (batch_name,)
        )
        if existing is not None:
            raise ValueError(f'批次名 {batch_name} 已存在')
        return self.db.insert('disbursement_batches', {
            'batch_name': batch_name,
            'batch_date': batch_date,
            'status': 'draft',
            'source_file': source_file
        })

    def update_batch_status(self, batch_id: int, new_status: str, operator: str = 'system'):
        batch = self.db.query_one('SELECT * FROM disbursement_batches WHERE id = ?', (batch_id,))
        if batch is None:
            raise ValueError(f'批次#{batch_id} 不存在')
        current = batch['status']
        allowed = BATCH_STATUS_FLOW.get(current, [])
        if new_status not in allowed:
            raise ValueError(f'批次状态 {current} 不能流转到 {new_status}，允许: {", ".join(allowed)}')
        self.db.update('disbursement_batches', batch_id, {'status': new_status}, corrected_by=operator, reason=f'批次状态变更: {current} -> {new_status}')
        if new_status == 'approved':
            self._approve_batch_records(batch_id, operator)
        elif new_status == 'paid':
            self._pay_batch_records(batch_id, operator)
        elif new_status == 'cancelled':
            self._cancel_batch_records(batch_id, operator)

    def _approve_batch_records(self, batch_id: int, operator: str):
        records = self.db.query(
            'SELECT * FROM disbursement_records WHERE batch_id = ? AND status = ?',
            (batch_id, 'pending')
        )
        for rec in records:
            flags = rec['issue_flags'] or ''
            has_error = any(sev in flags for sev in ['error'])
            if not has_error:
                self.update_record_status(rec['id'], 'approved', operator)

    def _pay_batch_records(self, batch_id: int, operator: str):
        records = self.db.query(
            'SELECT * FROM disbursement_records WHERE batch_id = ? AND status = ?',
            (batch_id, 'approved')
        )
        for rec in records:
            self.update_record_status(rec['id'], 'paid', operator)

    def _cancel_batch_records(self, batch_id: int, operator: str):
        records = self.db.query(
            'SELECT * FROM disbursement_records WHERE batch_id = ?',
            (batch_id,)
        )
        for rec in records:
            if rec['status'] != 'paid':
                self.update_record_status(rec['id'], 'rejected', operator)

    def add_record(self, batch_id: int, farmer_id: int, invoice_id: int, subsidy_amount: float,
                   source_file: str = 'manual', remark: str = '') -> int:
        batch = self.db.query_one('SELECT * FROM disbursement_batches WHERE id = ?', (batch_id,))
        if batch is None:
            raise ValueError(f'批次#{batch_id} 不存在')
        farmer = self.db.query_one('SELECT * FROM farmer_profiles WHERE id = ? AND is_active = 1', (farmer_id,))
        if farmer is None:
            raise ValueError(f'农户#{farmer_id} 不存在')
        invoice = self.db.query_one('SELECT * FROM purchase_invoices WHERE id = ? AND is_active = 1', (invoice_id,))
        if invoice is None:
            raise ValueError(f'发票#{invoice_id} 不存在')
        if invoice['farmer_id'] != farmer_id:
            raise ValueError(f'发票#{invoice_id} 不属于农户#{farmer_id}')
        standard_ok, std_msg = self.validator.validate_subsidy_standard(invoice['machine_model'], subsidy_amount)
        if not standard_ok:
            raise ValueError(f'补贴金额校验失败: {std_msg}')
        existing = self.db.query_one(
            'SELECT * FROM disbursement_records WHERE batch_id = ? AND invoice_id = ?',
            (batch_id, invoice_id)
        )
        if existing is not None:
            raise ValueError(f'发票#{invoice_id} 已在批次#{batch_id}中(记录#{existing["id"]})')
        return self.db.insert('disbursement_records', {
            'batch_id': batch_id,
            'farmer_id': farmer_id,
            'invoice_id': invoice_id,
            'subsidy_amount': subsidy_amount,
            'status': 'pending',
            'issue_flags': '',
            'remark': remark,
            'source_file': source_file
        })

    def update_record_status(self, record_id: int, new_status: str, operator: str = 'system'):
        record = self.db.query_one('SELECT * FROM disbursement_records WHERE id = ?', (record_id,))
        if record is None:
            raise ValueError(f'兑付记录#{record_id} 不存在')
        current = record['status']
        allowed = DISBURSEMENT_STATUS_FLOW.get(current, [])
        if new_status not in allowed:
            raise ValueError(f'记录状态 {current} 不能流转到 {new_status}，允许: {", ".join(allowed)}')
        self.db.update('disbursement_records', record_id, {'status': new_status}, corrected_by=operator, reason=f'记录状态变更: {current} -> {new_status}')

    def validate_and_mark(self, batch_id: int) -> ValidationResult:
        result = self.validator.validate_full(batch_id)
        for issue in result.issues:
            self.db.log_issue(**issue)
        records = self.db.query(
            'SELECT * FROM disbursement_records WHERE batch_id = ?',
            (batch_id,)
        )
        for rec in records:
            flags = self._compute_issue_flags(rec, result.issues)
            if flags:
                self.db.update('disbursement_records', rec['id'], {'issue_flags': ';'.join(flags)}, corrected_by='auto-validate', reason='自动校验更新问题标记')
        return result

    def _compute_issue_flags(self, record: Dict, all_issues: List[Dict]) -> List[str]:
        flags = []
        for issue in all_issues:
            if issue.get('invoice_id') == record['invoice_id'] or issue.get('farmer_id') == record['farmer_id']:
                sev = issue.get('severity', 'warning')
                itype = issue['issue_type']
                flags.append(f'{sev}:{itype}')
        return list(set(flags))

    def get_batch_summary(self, batch_id: int) -> Dict:
        batch = self.db.query_one('SELECT * FROM disbursement_batches WHERE id = ?', (batch_id,))
        if batch is None:
            raise ValueError(f'批次#{batch_id} 不存在')
        records = self.db.query(
            'SELECT * FROM disbursement_records WHERE batch_id = ?',
            (batch_id,)
        )
        total = len(records)
        by_status: Dict[str, int] = {}
        total_amount = 0.0
        paid_amount = 0.0
        flagged = 0
        for rec in records:
            s = rec['status']
            by_status[s] = by_status.get(s, 0) + 1
            total_amount += rec['subsidy_amount']
            if s == 'paid':
                paid_amount += rec['subsidy_amount']
            if rec['issue_flags']:
                flagged += 1
        issues = self.db.query(
            'SELECT * FROM issues WHERE batch_id = ? AND status = ?',
            (batch_id, 'open')
        )
        return {
            'batch_id': batch_id,
            'batch_name': batch['batch_name'],
            'batch_date': batch['batch_date'],
            'status': batch['status'],
            'total_records': total,
            'records_by_status': by_status,
            'total_amount': round(total_amount, 2),
            'paid_amount': round(paid_amount, 2),
            'flagged_records': flagged,
            'open_issues': len(issues),
            'issues': [dict(i) for i in issues]
        }

    def list_batches(self, status: Optional[str] = None) -> List[Dict]:
        sql = 'SELECT * FROM disbursement_batches'
        params: tuple = ()
        if status:
            sql += ' WHERE status = ?'
            params = (status,)
        sql += ' ORDER BY import_time DESC'
        rows = self.db.query(sql, params)
        return [dict(r) for r in rows]

    def list_issues(self, batch_id: Optional[int] = None, status: str = 'open') -> List[Dict]:
        sql = 'SELECT i.*, f.farmer_name, inv.invoice_number FROM issues i LEFT JOIN farmer_profiles f ON i.farmer_id = f.id LEFT JOIN purchase_invoices inv ON i.invoice_id = inv.id WHERE i.status = ?'
        params: list = [status]
        if batch_id is not None:
            sql += ' AND i.batch_id = ?'
            params.append(batch_id)
        sql += ' ORDER BY i.created_at DESC'
        rows = self.db.query(sql, tuple(params))
        return [dict(r) for r in rows]

    def get_correction_history(self, table_name: Optional[str] = None, record_id: Optional[int] = None) -> List[Dict]:
        sql = 'SELECT * FROM correction_logs WHERE 1=1'
        params: list = []
        if table_name:
            sql += ' AND table_name = ?'
            params.append(table_name)
        if record_id is not None:
            sql += ' AND record_id = ?'
            params.append(record_id)
        sql += ' ORDER BY corrected_at DESC'
        rows = self.db.query(sql, tuple(params))
        return [dict(r) for r in rows]