import json
import os
from typing import List, Dict, Optional, Any
from .models import DisbursementRecord


class QueryEngine:
    def __init__(self, history_dir: str):
        self.history_dir = history_dir
        self.history_file = os.path.join(history_dir, 'disbursement_history.json')
        self.history = self._load_history()
    
    def _load_history(self) -> Dict:
        if os.path.exists(self.history_file):
            with open(self.history_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {'records': [], 'batches': {}}
    
    def query_by_node(self, node_id: str) -> List[Dict]:
        results = []
        for record in self.history['records']:
            for item in record.get('items', []):
                if item.get('node_id') == node_id:
                    results.append({
                        'disbursement_id': record['disbursement_id'],
                        'project_id': record['project_id'],
                        'project_name': record['project_name'],
                        'account_id': record['account_id'],
                        'node_id': item['node_id'],
                        'node_name': item['node_name'],
                        'invoice_id': item['invoice_id'],
                        'amount': item['request_amount'],
                        'status': record['status'],
                        'batch_no': record['run_batch_no'],
                        'timestamp': record['run_timestamp']
                    })
        return results
    
    def query_by_account(self, account_id: str) -> List[Dict]:
        results = []
        for record in self.history['records']:
            if record.get('account_id') == account_id:
                results.append({
                    'disbursement_id': record['disbursement_id'],
                    'project_id': record['project_id'],
                    'project_name': record['project_name'],
                    'account_id': record['account_id'],
                    'total_amount': record['total_approved_amount'],
                    'status': record['status'],
                    'batch_no': record['run_batch_no'],
                    'timestamp': record['run_timestamp'],
                    'item_count': len(record.get('items', []))
                })
        return results
    
    def query_by_project(self, project_id: str) -> List[Dict]:
        results = []
        for record in self.history['records']:
            if record.get('project_id') == project_id:
                results.append({
                    'disbursement_id': record['disbursement_id'],
                    'project_id': record['project_id'],
                    'project_name': record['project_name'],
                    'account_id': record['account_id'],
                    'total_amount': record['total_approved_amount'],
                    'status': record['status'],
                    'batch_no': record['run_batch_no'],
                    'timestamp': record['run_timestamp'],
                    'item_count': len(record.get('items', []))
                })
        return results
    
    def query_by_invoice(self, invoice_id: str) -> List[Dict]:
        results = []
        for record in self.history['records']:
            for item in record.get('items', []):
                if item.get('invoice_id') == invoice_id:
                    results.append({
                        'disbursement_id': record['disbursement_id'],
                        'project_id': record['project_id'],
                        'project_name': record['project_name'],
                        'account_id': record['account_id'],
                        'node_id': item['node_id'],
                        'node_name': item['node_name'],
                        'invoice_id': item['invoice_id'],
                        'invoice_amount': item['invoice_amount'],
                        'disbursement_amount': item['request_amount'],
                        'status': record['status'],
                        'batch_no': record['run_batch_no'],
                        'timestamp': record['run_timestamp']
                    })
        return results
    
    def query_by_disbursement(self, disbursement_id: str) -> Optional[Dict]:
        for record in self.history['records']:
            if record.get('disbursement_id') == disbursement_id:
                return record
        return None
    
    def query_by_batch(self, batch_no: str) -> List[Dict]:
        if batch_no in self.history['batches']:
            record_ids = self.history['batches'][batch_no]['record_ids']
            return [r for r in self.history['records'] if r['disbursement_id'] in record_ids]
        return []
    
    def get_trace_path(self, node_id: str) -> Dict[str, Any]:
        node_results = self.query_by_node(node_id)
        
        if not node_results:
            return {'found': False, 'path': []}
        
        path = []
        for result in node_results:
            disbursement = self.query_by_disbursement(result['disbursement_id'])
            path.append({
                'step': '工程节点',
                'id': result['node_id'],
                'name': result['node_name'],
                'next': {
                    'step': '拨付记录',
                    'id': result['disbursement_id'],
                    'amount': result['amount'],
                    'next': {
                        'step': '监管账户',
                        'id': result['account_id'],
                        'project': result['project_name']
                    }
                }
            })
        
        return {'found': True, 'path': path}
    
    def get_reverse_trace_path(self, account_id: str) -> Dict[str, Any]:
        account_results = self.query_by_account(account_id)
        
        if not account_results:
            return {'found': False, 'path': []}
        
        path = []
        for result in account_results:
            disbursement = self.query_by_disbursement(result['disbursement_id'])
            items = disbursement.get('items', []) if disbursement else []
            
            item_paths = []
            for item in items:
                item_paths.append({
                    'step': '拨付明细',
                    'node_id': item['node_id'],
                    'node_name': item['node_name'],
                    'invoice_id': item['invoice_id'],
                    'amount': item['request_amount']
                })
            
            path.append({
                'step': '监管账户',
                'id': account_id,
                'project': result['project_name'],
                'next': {
                    'step': '拨付记录',
                    'id': result['disbursement_id'],
                    'total_amount': result['total_amount'],
                    'items': item_paths
                }
            })
        
        return {'found': True, 'path': path}
    
    def get_all_batches(self) -> List[str]:
        return sorted(self.history['batches'].keys())
    
    def get_red_flush_records(self) -> List[Dict]:
        results = []
        for record in self.history['records']:
            for item in record.get('items', []):
                if item.get('is_red_flushed', False):
                    results.append({
                        'disbursement_id': record['disbursement_id'],
                        'invoice_id': item['invoice_id'],
                        'node_name': item['node_name'],
                        'amount': item['request_amount'],
                        'batch_no': record['run_batch_no']
                    })
        return results
    
    def get_monthly_summary(self, year_month: str) -> Dict:
        total_amount = 0.0
        record_count = 0
        projects = set()
        
        for record in self.history['records']:
            if record['run_timestamp'].startswith(year_month):
                total_amount += record['total_approved_amount']
                record_count += 1
                projects.add(record['project_id'])
        
        return {
            'year_month': year_month,
            'total_amount': round(total_amount, 2),
            'record_count': record_count,
            'project_count': len(projects)
        }
