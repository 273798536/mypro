from datetime import datetime, date
from typing import List, Dict, Optional, Tuple
from .models import Database


class ValidationResult:
    def __init__(self):
        self.issues: List[Dict] = []
        self.passed: bool = True

    def add_issue(self, issue_type: str, issue_detail: str, severity: str = 'warning',
                  batch_id: Optional[int] = None, farmer_id: Optional[int] = None,
                  invoice_id: Optional[int] = None, photo_id: Optional[int] = None):
        self.issues.append({
            'issue_type': issue_type,
            'issue_detail': issue_detail,
            'severity': severity,
            'batch_id': batch_id,
            'farmer_id': farmer_id,
            'invoice_id': invoice_id,
            'photo_id': photo_id
        })
        self.passed = False

    def summary(self) -> Dict:
        counts: Dict[str, int] = {}
        for issue in self.issues:
            key = issue['issue_type']
            counts[key] = counts.get(key, 0) + 1
        return {'total_issues': len(self.issues), 'by_type': counts}


class Validator:
    def __init__(self, db: Database):
        self.db = db

    def validate_qualification(self, farmer_id: int, reference_date: Optional[str] = None) -> List[Dict]:
        ref_date = date.today() if reference_date is None else date.fromisoformat(reference_date)
        farmer = self.db.query_one('SELECT * FROM farmer_profiles WHERE id = ? AND is_active = 1', (farmer_id,))
        if farmer is None:
            return [{'issue_type': '资格缺失', 'issue_detail': f'农户#{farmer_id} 不存在或已删除', 'severity': 'error'}]
        issues = []
        qual_end = date.fromisoformat(farmer['qualification_end'])
        if qual_end < ref_date:
            days_expired = (ref_date - qual_end).days
            issues.append({
                'issue_type': '资格过期',
                'issue_detail': f'农户 {farmer["farmer_name"]} 资格已于 {farmer["qualification_end"]} 过期({days_expired}天前)',
                'severity': 'error',
                'farmer_id': farmer_id
            })
        qual_start = date.fromisoformat(farmer['qualification_start'])
        if qual_start > ref_date:
            issues.append({
                'issue_type': '资格未生效',
                'issue_detail': f'农户 {farmer["farmer_name"]} 资格生效日为 {farmer["qualification_start"]}，尚未生效',
                'severity': 'warning',
                'farmer_id': farmer_id
            })
        return issues

    def validate_invoice_duplicate(self, invoice_number: str, exclude_id: Optional[int] = None) -> List[Dict]:
        sql = 'SELECT * FROM purchase_invoices WHERE invoice_number = ? AND is_active = 1'
        params: Tuple = (invoice_number,)
        if exclude_id is not None:
            sql += ' AND id != ?'
            params = (invoice_number, exclude_id)
        existing = self.db.query(sql, params)
        issues = []
        for row in existing:
            farmer = self.db.query_one('SELECT farmer_name FROM farmer_profiles WHERE id = ?', (row['farmer_id'],))
            name = farmer['farmer_name'] if farmer else '未知'
            issues.append({
                'issue_type': '发票重复',
                'issue_detail': f'发票号 {invoice_number} 已存在(记录#{row["id"]}，农户: {name})',
                'severity': 'error',
                'invoice_id': row['id']
            })
        return issues

    def validate_photo_machine_match(self, photo_id: int) -> List[Dict]:
        photo = self.db.query_one('SELECT * FROM inspection_photos WHERE id = ? AND is_active = 1', (photo_id,))
        if photo is None:
            return [{'issue_type': '照片缺失', 'issue_detail': f'验机照片#{photo_id} 不存在或已删除', 'severity': 'error'}]
        issues = []
        photo_model = photo['machine_model']
        if photo['invoice_id']:
            invoice = self.db.query_one('SELECT * FROM purchase_invoices WHERE id = ? AND is_active = 1', (photo['invoice_id'],))
            if invoice is not None:
                invoice_model = invoice['machine_model']
                if photo_model != invoice_model:
                    issues.append({
                        'issue_type': '照片机型不符',
                        'issue_detail': f'照片机型 {photo_model} 与发票机型 {invoice_model} 不一致(发票号: {invoice["invoice_number"]})',
                        'severity': 'error',
                        'photo_id': photo_id,
                        'invoice_id': photo['invoice_id']
                    })
            else:
                issues.append({
                    'issue_type': '照片无对应发票',
                    'issue_detail': f'验机照片#{photo_id} 关联的发票#{photo["invoice_id"]} 不存在',
                    'severity': 'warning',
                    'photo_id': photo_id
                })
        else:
            issues.append({
                'issue_type': '照片未关联发票',
                'issue_detail': f'验机照片#{photo_id} 未关联任何发票',
                'severity': 'warning',
                'photo_id': photo_id
            })
        return issues

    def validate_subsidy_standard(self, machine_model: str, amount: float, reference_date: Optional[str] = None) -> Tuple[bool, str]:
        ref_date = date.today() if reference_date is None else date.fromisoformat(reference_date)
        standards = self.db.query(
            'SELECT * FROM subsidy_standards WHERE machine_model = ? AND is_active = 1 AND effective_date <= ?',
            (machine_model, ref_date.isoformat())
        )
        for std in standards:
            expire = date.fromisoformat(std['expire_date']) if std['expire_date'] else None
            if expire is None or expire >= ref_date:
                return True, std['standard_amount']
        return False, f'机型 {machine_model} 在 {ref_date} 无有效补贴标准'

    def validate_full(self, batch_id: Optional[int] = None) -> ValidationResult:
        result = ValidationResult()
        invoices = self.db.query('SELECT * FROM purchase_invoices WHERE is_active = 1')
        for inv in invoices:
            for dup in self.validate_invoice_duplicate(inv['invoice_number'], exclude_id=inv['id']):
                result.add_issue(**dup, batch_id=batch_id)
        photos = self.db.query('SELECT * FROM inspection_photos WHERE is_active = 1')
        for photo in photos:
            for p_issue in self.validate_photo_machine_match(photo['id']):
                result.add_issue(**p_issue, batch_id=batch_id)
        if batch_id is not None:
            records = self.db.query(
                'SELECT * FROM disbursement_records WHERE batch_id = ?', (batch_id,)
            )
            for rec in records:
                for q_issue in self.validate_qualification(rec['farmer_id']):
                    result.add_issue(**q_issue, batch_id=batch_id)
        return result