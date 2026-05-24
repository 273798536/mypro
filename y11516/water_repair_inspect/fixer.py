from datetime import datetime
from typing import Dict, Any, List, Optional

from .config import Config
from .storage import RecordStorage
from .models import RecordStatus, RepairRecord


class DataFixer:
    def __init__(self, config: Config, storage: RecordStorage):
        self.config = config
        self.storage = storage

    def fix_all(self) -> Dict[str, Any]:
        result = {
            'processed': 0,
            'fixed': 0,
            'manual_required': 0,
            'skipped': 0
        }
        
        records = self.storage.get_all_records()
        
        for record in records:
            if record.is_frozen:
                result['skipped'] += 1
                continue
            
            if record.status in [RecordStatus.INVALID, RecordStatus.PENDING]:
                fix_result = self._try_auto_fix(record)
                result['processed'] += 1
                
                if fix_result['fixed']:
                    result['fixed'] += 1
                elif fix_result['manual_required']:
                    result['manual_required'] += 1
                else:
                    result['skipped'] += 1
        
        return result

    def fix_record(self, record_id: str) -> Dict[str, Any]:
        record = self.storage.get_record(record_id)
        if not record:
            raise ValueError(f"记录不存在: {record_id}")
        
        if record.is_frozen:
            raise ValueError("记录已冻结，无法修复")
        
        result = {
            'processed': 1,
            'fixed': 0,
            'manual_required': 0,
            'skipped': 0
        }
        
        fix_result = self._try_auto_fix(record)
        if fix_result['fixed']:
            result['fixed'] = 1
        elif fix_result['manual_required']:
            result['manual_required'] = 1
        
        return result

    def _try_auto_fix(self, record: RepairRecord) -> Dict[str, Any]:
        result = {
            'fixed': False,
            'manual_required': False,
            'actions': []
        }
        
        issues = record.check_results or []
        
        for issue in issues:
            if issue.get('severity') == 'error':
                action = self._fix_error(record, issue)
                if action:
                    result['actions'].append(action)
                    result['fixed'] = True
        
        if not result['actions']:
            for issue in issues:
                if issue.get('severity') == 'warning':
                    action = self._fix_warning(record, issue)
                    if action:
                        result['actions'].append(action)
                        result['fixed'] = True
        
        if not result['actions'] and issues:
            result['manual_required'] = True
        
        if result['fixed']:
            record.fix_history.append({
                'timestamp': datetime.now().isoformat(),
                'actions': result['actions'],
                'type': 'auto_fix'
            })
            record.status = RecordStatus.FIXED
            self.storage.save_record(record)
        
        return result

    def _fix_error(self, record: RepairRecord, issue: Dict) -> Optional[str]:
        msg = issue.get('message', '')
        val = record.current_value
        
        if '缺少工单编号' in msg:
            if record.source_evidence:
                for evidence in reversed(record.source_evidence):
                    orig_order_no = evidence.original_content.get('order_no')
                    if orig_order_no:
                        val['order_no'] = str(orig_order_no).strip()
                        return f"从原始证据恢复工单编号: {orig_order_no}"
            return None
        
        if '缺少阀门编码' in msg:
            if record.source_evidence:
                for evidence in reversed(record.source_evidence):
                    orig_code = evidence.original_content.get('valve_code')
                    if orig_code:
                        val['valve_code'] = str(orig_code).strip()
                        return f"从原始证据恢复阀门编码: {orig_code}"
            return None
        
        if '缺少照片路径' in msg:
            if record.source_evidence:
                for evidence in reversed(record.source_evidence):
                    orig_path = evidence.original_content.get('photo_path')
                    if orig_path:
                        val['photo_path'] = str(orig_path).strip()
                        return f"从原始证据恢复照片路径: {orig_path}"
            return None
        
        if '缺少材料编码' in msg:
            if record.source_evidence:
                for evidence in reversed(record.source_evidence):
                    orig_code = evidence.original_content.get('material_code')
                    if orig_code:
                        val['material_code'] = str(orig_code).strip()
                        return f"从原始证据恢复材料编码: {orig_code}"
            return None
        
        return None

    def _fix_warning(self, record: RepairRecord, issue: Dict) -> Optional[str]:
        msg = issue.get('message', '')
        val = record.current_value
        
        if '库存为负' in msg:
            val['inventory_note'] = '夜间抢修先用料后补录'
            return "标记负库存为夜间抢修正常情况"
        
        if '数量异常' in msg:
            precision = self.config.validation.get('quantity_precision', 2)
            if 'quantity' in val and isinstance(val['quantity'], float):
                original = val['quantity']
                val['quantity'] = round(original, precision)
                return f"数量精度修正: {original} -> {val['quantity']}"
        
        return None

    def manual_judge(self, record_id: str, judgment: str,
                     operator: str, override_value: Optional[Dict] = None) -> Dict[str, Any]:
        record = self.storage.get_record(record_id)
        if not record:
            raise ValueError(f"记录不存在: {record_id}")
        
        if record.is_frozen:
            raise ValueError("记录已冻结，无法改判")
        
        record.manual_judgment = {
            'judgment': judgment,
            'operator': operator,
            'timestamp': datetime.now().isoformat(),
            'override_value': override_value
        }
        
        if override_value:
            record.current_value.update(override_value)
        
        record.status = RecordStatus.MANUAL_JUDGED
        
        record.fix_history.append({
            'timestamp': datetime.now().isoformat(),
            'type': 'manual_judgment',
            'judgment': judgment,
            'operator': operator
        })
        
        self.storage.save_record(record)
        
        return {
            'record_id': record_id,
            'judgment': judgment,
            'operator': operator,
            'new_status': RecordStatus.MANUAL_JUDGED.value
        }

    def withdraw_record(self, record_id: str) -> Dict[str, Any]:
        record = self.storage.get_record(record_id)
        if not record:
            raise ValueError(f"记录不存在: {record_id}")
        
        if record.is_frozen:
            raise ValueError("记录已冻结，无法撤回")
        
        old_status = record.status.value
        record.status = RecordStatus.WITHDRAWN
        
        record.fix_history.append({
            'timestamp': datetime.now().isoformat(),
            'type': 'withdraw',
            'old_status': old_status
        })
        
        self.storage.save_record(record)
        
        return {
            'record_id': record_id,
            'old_status': old_status,
            'new_status': RecordStatus.WITHDRAWN.value
        }

    def reactivate_record(self, record_id: str) -> Dict[str, Any]:
        record = self.storage.get_record(record_id)
        if not record:
            raise ValueError(f"记录不存在: {record_id}")
        
        if record.is_frozen:
            raise ValueError("记录已冻结，无法恢复")
        
        if record.status != RecordStatus.WITHDRAWN:
            raise ValueError("只有撤回状态的记录可以恢复")
        
        old_status = record.status.value
        record.status = RecordStatus.PENDING
        
        record.fix_history.append({
            'timestamp': datetime.now().isoformat(),
            'type': 'reactivate',
            'old_status': old_status
        })
        
        self.storage.save_record(record)
        
        return {
            'record_id': record_id,
            'old_status': old_status,
            'new_status': RecordStatus.PENDING.value
        }
