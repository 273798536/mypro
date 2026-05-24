from datetime import datetime
from typing import Dict, Any, List, Optional
from collections import defaultdict

from .config import Config
from .storage import RecordStorage
from .models import DataSourceType, RecordStatus, RepairRecord


class DataChecker:
    def __init__(self, config: Config, storage: RecordStorage):
        self.config = config
        self.storage = storage
        self.issues: List[Dict[str, Any]] = []

    def check_all(self, order_no: Optional[str] = None,
                  source_type: Optional[str] = None) -> Dict[str, Any]:
        self.issues = []
        
        records = self.storage.get_all_records()
        
        if source_type:
            records = [r for r in records if r.source_type.value == source_type]
        
        if order_no:
            records = [r for r in records 
                      if r.current_value.get('order_no') == order_no]
        
        for record in records:
            if not record.is_frozen:
                self._check_record(record)
        
        summary = self._generate_summary()
        
        return {
            'check_time': datetime.now().isoformat(),
            'total_records': len(records),
            'issues_count': len(self.issues),
            'issues': self.issues,
            'summary': summary
        }

    def _check_record(self, record: RepairRecord) -> None:
        source_type = record.source_type
        
        if source_type == DataSourceType.DISPATCH_ORDER:
            self._check_dispatch_order(record)
        elif source_type == DataSourceType.VALVE_INVENTORY:
            self._check_valve_inventory(record)
        elif source_type == DataSourceType.SITE_PHOTO:
            self._check_site_photo(record)
        elif source_type == DataSourceType.SCAN_DETAIL:
            self._check_scan_detail(record)

    def _check_dispatch_order(self, record: RepairRecord) -> None:
        val = record.current_value
        issues = []
        
        if not val.get('order_no'):
            issues.append(("缺少工单编号", "error"))
        
        quantity = val.get('quantity', 0)
        if quantity <= 0:
            issues.append(("派工单数量异常", "warning"))
        
        self._add_issues(record, "dispatch_order_validation", issues)
        self._update_record_status(record, issues)

    def _check_valve_inventory(self, record: RepairRecord) -> None:
        val = record.current_value
        issues = []
        
        if not val.get('valve_code'):
            issues.append(("缺少阀门编码", "error"))
        
        quantity = val.get('quantity', 0)
        allow_negative = self.config.validation.get('allow_negative_inventory', False)
        
        if quantity < 0 and not allow_negative:
            issues.append(("库存为负，夜间抢修用料后补录导致", "warning"))
        
        max_qty = self.config.validation.get('max_quantity', 10000)
        if quantity > max_qty:
            issues.append(("库存数量超出合理范围", "warning"))
        
        self._add_issues(record, "inventory_validation", issues)
        self._update_record_status(record, issues)

    def _check_site_photo(self, record: RepairRecord) -> None:
        val = record.current_value
        issues = []
        
        if not val.get('order_no'):
            issues.append(("缺少关联工单编号", "error"))
        
        if not val.get('photo_path'):
            issues.append(("缺少照片路径", "error"))
        
        self._add_issues(record, "photo_validation", issues)
        self._update_record_status(record, issues)

    def _check_scan_detail(self, record: RepairRecord) -> None:
        val = record.current_value
        issues = []
        
        if not val.get('order_no'):
            issues.append(("缺少工单编号", "error"))
        
        if not val.get('material_code'):
            issues.append(("缺少材料编码", "error"))
        
        quantity = val.get('quantity', 0)
        if quantity <= 0:
            issues.append(("扫码数量异常", "warning"))
        
        self._add_issues(record, "scan_validation", issues)
        self._update_record_status(record, issues)

    def _add_issues(self, record: RepairRecord, issue_type: str,
                    issues: List[tuple]) -> None:
        for message, severity in issues:
            issue = {
                'record_id': record.record_id,
                'type': issue_type,
                'severity': severity,
                'message': message
            }
            
            if record.source_evidence:
                latest = record.source_evidence[-1]
                issue['source_file'] = latest.source_file
                issue['original_row'] = latest.original_row_number
            
            self.issues.append(issue)
            record.check_results.append(issue)

    def _update_record_status(self, record: RepairRecord,
                              issues: List[tuple]) -> None:
        has_error = any(s == 'error' for _, s in issues)
        has_warning = any(s == 'warning' for _, s in issues)
        
        if record.manual_judgment:
            record.status = RecordStatus.MANUAL_JUDGED
        elif has_error:
            record.status = RecordStatus.INVALID
        elif has_warning:
            record.status = RecordStatus.PENDING
        else:
            record.status = RecordStatus.VALID
        
        self.storage.save_record(record)

    def _generate_summary(self) -> Dict[str, Any]:
        summary = defaultdict(lambda: {'total': 0, 'valid': 0, 'invalid': 0, 'pending': 0})
        
        for st in DataSourceType:
            records = self.storage.get_all_records(source_type=st)
            summary[st.value]['total'] = len(records)
            
            for r in records:
                if r.status == RecordStatus.VALID:
                    summary[st.value]['valid'] += 1
                elif r.status == RecordStatus.INVALID:
                    summary[st.value]['invalid'] += 1
                elif r.status in [RecordStatus.PENDING, RecordStatus.FIXED]:
                    summary[st.value]['pending'] += 1
        
        return dict(summary)

    def cross_check_data(self) -> Dict[str, Any]:
        self.issues = []
        
        dispatch_records = self.storage.get_all_records(DataSourceType.DISPATCH_ORDER)
        inventory_records = self.storage.get_all_records(DataSourceType.VALVE_INVENTORY)
        photo_records = self.storage.get_all_records(DataSourceType.SITE_PHOTO)
        scan_records = self.storage.get_all_records(DataSourceType.SCAN_DETAIL)
        
        dispatch_orders = {r.current_value.get('order_no'): r for r in dispatch_records}
        
        for photo in photo_records:
            order_no = photo.current_value.get('order_no')
            if order_no and order_no not in dispatch_orders:
                self._add_cross_issue(photo, "照片关联工单不存在")
        
        for scan in scan_records:
            order_no = scan.current_value.get('order_no')
            if order_no and order_no not in dispatch_orders:
                self._add_cross_issue(scan, "扫码明细关联工单不存在")
        
        return {
            'cross_check_time': datetime.now().isoformat(),
            'issues': self.issues
        }

    def _add_cross_issue(self, record: RepairRecord, message: str) -> None:
        issue = {
            'record_id': record.record_id,
            'type': 'cross_check',
            'severity': 'warning',
            'message': message
        }
        if record.source_evidence:
            latest = record.source_evidence[-1]
            issue['source_file'] = latest.source_file
            issue['original_row'] = latest.original_row_number
        self.issues.append(issue)
