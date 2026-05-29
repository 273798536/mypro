import json
import os
from datetime import datetime
from typing import List, Dict, Optional
from .models import (
    DisbursementRecord, DisbursementItem,
    ChangeDetail, ComparisonResult
)


class ChangeDetector:
    def __init__(self, history_dir: str):
        self.history_dir = history_dir
        self.history_file = os.path.join(history_dir, 'disbursement_history.json')
        self.history = self._load_history()
    
    def _load_history(self) -> Dict:
        if os.path.exists(self.history_file):
            with open(self.history_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {'records': [], 'batches': {}}
    
    def _save_history(self):
        os.makedirs(self.history_dir, exist_ok=True)
        with open(self.history_file, 'w', encoding='utf-8') as f:
            json.dump(self.history, f, ensure_ascii=False, indent=2, default=str)
    
    def save_run_records(self, records: List[DisbursementRecord], batch_no: str):
        for record in records:
            record_dict = self._record_to_dict(record)
            self.history['records'].append(record_dict)
        
        if batch_no not in self.history['batches']:
            self.history['batches'][batch_no] = {
                'timestamp': datetime.now().isoformat(),
                'record_ids': [r.disbursement_id for r in records]
            }
        
        self._save_history()
    
    def _record_to_dict(self, record: DisbursementRecord) -> Dict:
        return {
            'disbursement_id': record.disbursement_id,
            'project_id': record.project_id,
            'project_name': record.project_name,
            'account_id': record.account_id,
            'total_request_amount': record.total_request_amount,
            'total_approved_amount': record.total_approved_amount,
            'status': record.status.value,
            'run_batch_no': record.run_batch_no,
            'run_timestamp': record.run_timestamp.isoformat(),
            'items': [
                {
                    'item_id': item.item_id,
                    'node_id': item.node_id,
                    'node_name': item.node_name,
                    'invoice_id': item.invoice_id,
                    'invoice_amount': item.invoice_amount,
                    'node_completed_amount': item.node_completed_amount,
                    'applicable_ratio': item.applicable_ratio,
                    'request_amount': item.request_amount,
                    'approved_amount': item.approved_amount
                }
                for item in record.items
            ]
        }
    
    def compare_with_previous(
        self,
        current_records,
        previous_batch_no: Optional[str] = None
    ) -> List[ComparisonResult]:
        results = []
        
        previous_records = self._get_previous_records(previous_batch_no)
        
        for current in current_records:
            previous = self._find_matching_record(current, previous_records)
            changes = self._compare_records(current, previous)
            current_id = current.disbursement_id if hasattr(current, 'disbursement_id') else current.get('disbursement_id', '')
            results.append(ComparisonResult(
                disbursement_id=current_id,
                has_changes=len(changes) > 0,
                changes=changes
            ))
        
        return results
    
    def _get_previous_records(self, batch_no: Optional[str] = None) -> List[Dict]:
        if batch_no and batch_no in self.history['batches']:
            record_ids = self.history['batches'][batch_no]['record_ids']
            return [r for r in self.history['records'] if r['disbursement_id'] in record_ids]
        
        if self.history['batches']:
            batches = sorted(self.history['batches'].keys())
            if len(batches) >= 1:
                last_batch = batches[-1]
                record_ids = self.history['batches'][last_batch]['record_ids']
                return [r for r in self.history['records'] if r['disbursement_id'] in record_ids]
        
        return []
    
    def _find_matching_record(
        self,
        current,
        previous_records: List[Dict]
    ) -> Optional[Dict]:
        current_project_id = current.project_id if hasattr(current, 'project_id') else current.get('project_id', '')
        for prev in previous_records:
            if prev['project_id'] == current_project_id:
                return prev
        return None
    
    def _compare_records(
        self,
        current,
        previous: Optional[Dict]
    ) -> List[ChangeDetail]:
        changes = []
        
        if not previous:
            changes.append(ChangeDetail(
                field_name='拨付记录',
                old_value='无',
                new_value='新增记录',
                change_type='新增',
                reason='新项目首次计算'
            ))
            return changes
        
        current_total_req = current.total_request_amount if hasattr(current, 'total_request_amount') else current.get('total_request_amount', 0)
        current_total_approved = current.total_approved_amount if hasattr(current, 'total_approved_amount') else current.get('total_approved_amount', 0)
        current_items = current.get('items', []) if isinstance(current, dict) else current.items
        
        if abs(current_total_req - previous['total_request_amount']) > 0.01:
            changes.append(ChangeDetail(
                field_name='申请总额',
                old_value=f"{previous['total_request_amount']:.2f}",
                new_value=f"{current_total_req:.2f}",
                change_type='金额变更',
                reason=self._detect_amount_change_reason(current, previous)
            ))
        
        if abs(current_total_approved - previous['total_approved_amount']) > 0.01:
            changes.append(ChangeDetail(
                field_name='批准总额',
                old_value=f"{previous['total_approved_amount']:.2f}",
                new_value=f"{current_total_approved:.2f}",
                change_type='金额变更'
            ))
        
        item_changes = self._compare_items(current_items, previous['items'])
        changes.extend(item_changes)
        
        return changes
    
    def _compare_items(
        self,
        current_items,
        previous_items: List[Dict]
    ) -> List[ChangeDetail]:
        changes = []
        
        current_map = {}
        for item in current_items:
            if hasattr(item, 'node_id'):
                key = item.node_id + '_' + item.invoice_id
            else:
                key = item.get('node_id', '') + '_' + item.get('invoice_id', '')
            current_map[key] = item
        
        prev_map = {item['node_id'] + '_' + item['invoice_id']: item for item in previous_items}
        
        all_keys = set(current_map.keys()) | set(prev_map.keys())
        
        for key in all_keys:
            curr = current_map.get(key)
            prev = prev_map.get(key)
            
            if curr and not prev:
                curr_name = curr.node_name if hasattr(curr, 'node_name') else curr.get('node_name', '')
                curr_req = curr.request_amount if hasattr(curr, 'request_amount') else curr.get('request_amount', 0)
                changes.append(ChangeDetail(
                    field_name=f'拨付明细-{curr_name}',
                    old_value='无',
                    new_value=f'新增，金额: {curr_req:.2f}',
                    change_type='新增明细',
                    reason='新发票或新节点达标'
                ))
            elif not curr and prev:
                changes.append(ChangeDetail(
                    field_name=f'拨付明细-{prev["node_name"]}',
                    old_value=f'金额: {prev["request_amount"]:.2f}',
                    new_value='已移除',
                    change_type='移除明细',
                    reason='发票红冲或节点撤回'
                ))
            else:
                curr_req = curr.request_amount if hasattr(curr, 'request_amount') else curr.get('request_amount', 0)
                curr_name = curr.node_name if hasattr(curr, 'node_name') else curr.get('node_name', '')
                if abs(curr_req - prev['request_amount']) > 0.01:
                    changes.append(ChangeDetail(
                        field_name=f'拨付明细-{curr_name}',
                        old_value=f"{prev['request_amount']:.2f}",
                        new_value=f"{curr_req:.2f}",
                        change_type='明细金额变更',
                        reason=self._detect_item_change_reason(curr, prev)
                    ))
        
        return changes
    
    def _detect_amount_change_reason(self, current, previous: Dict) -> str:
        reasons = []
        
        current_items = current.get('items', []) if isinstance(current, dict) else current.items
        if len(current_items) != len(previous['items']):
            reasons.append('明细数量变化')
        
        curr_total_invoice = 0
        for item in current_items:
            if hasattr(item, 'invoice_amount'):
                curr_total_invoice += item.invoice_amount
            else:
                curr_total_invoice += item.get('invoice_amount', 0)
        prev_total_invoice = sum(item['invoice_amount'] for item in previous['items'])
        if abs(curr_total_invoice - prev_total_invoice) > 0.01:
            reasons.append('发票金额变化')
        
        curr_ratio_set = set()
        for item in current_items:
            if hasattr(item, 'applicable_ratio'):
                curr_ratio_set.add(item.applicable_ratio)
            else:
                curr_ratio_set.add(item.get('applicable_ratio', 0))
        prev_ratio_set = {item['applicable_ratio'] for item in previous['items']}
        if curr_ratio_set != prev_ratio_set:
            reasons.append('监管比例版本变更')
        
        return ', '.join(reasons) if reasons else '其他原因'
    
    def _detect_item_change_reason(self, curr, prev: Dict) -> str:
        reasons = []
        
        curr_inv_amt = curr.invoice_amount if hasattr(curr, 'invoice_amount') else curr.get('invoice_amount', 0)
        if abs(curr_inv_amt - prev['invoice_amount']) > 0.01:
            reasons.append('发票金额变更')
        
        curr_node_amt = curr.node_completed_amount if hasattr(curr, 'node_completed_amount') else curr.get('node_completed_amount', 0)
        if abs(curr_node_amt - prev['node_completed_amount']) > 0.01:
            reasons.append('节点完成金额变更')
        
        curr_ratio = curr.applicable_ratio if hasattr(curr, 'applicable_ratio') else curr.get('applicable_ratio', 0)
        if abs(curr_ratio - prev['applicable_ratio']) > 0.01:
            reasons.append('监管比例变更')
        
        return ', '.join(reasons) if reasons else '其他原因'
    
    def get_history_summary(self) -> Dict:
        return {
            'total_batches': len(self.history['batches']),
            'total_records': len(self.history['records']),
            'batches': list(self.history['batches'].keys())
        }
