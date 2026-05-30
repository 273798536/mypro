import json
import os
from datetime import datetime
from config import LOG_DIR


class AuditLogger:
    def __init__(self, log_file='audit_log.json'):
        self.log_dir = LOG_DIR
        self.log_file = os.path.join(LOG_DIR, log_file)
        self._ensure_log_dir()
        self._logs = self._load_logs()
    
    def _ensure_log_dir(self):
        os.makedirs(self.log_dir, exist_ok=True)
    
    def _load_logs(self):
        if os.path.exists(self.log_file):
            try:
                with open(self.log_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return []
        return []
    
    def _save_logs(self):
        with open(self.log_file, 'w', encoding='utf-8') as f:
            json.dump(self._logs, f, ensure_ascii=False, indent=2)
    
    def log_action(self, action_type, operator, target_sku=None, details=None, reason=None):
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'action_type': action_type,
            'operator': operator,
            'target_sku': target_sku,
            'details': details or {},
            'reason': reason or ''
        }
        self._logs.append(log_entry)
        self._save_logs()
        return log_entry
    
    def log_classification_adjustment(self, operator, sku_id, original_class, new_class, reason):
        return self.log_action(
            action_type='classification_adjustment',
            operator=operator,
            target_sku=sku_id,
            details={
                'original_class': original_class,
                'new_class': new_class
            },
            reason=reason
        )
    
    def log_threshold_adjustment(self, operator, original_thresholds, new_thresholds, reason):
        return self.log_action(
            action_type='threshold_adjustment',
            operator=operator,
            details={
                'original_thresholds': original_thresholds,
                'new_thresholds': new_thresholds
            },
            reason=reason
        )
    
    def log_anomaly_override(self, operator, sku_id, anomaly_type, action, reason):
        return self.log_action(
            action_type='anomaly_override',
            operator=operator,
            target_sku=sku_id,
            details={
                'anomaly_type': anomaly_type,
                'action': action
            },
            reason=reason
        )
    
    def log_data_import(self, operator, file_name, record_count):
        return self.log_action(
            action_type='data_import',
            operator=operator,
            details={
                'file_name': file_name,
                'record_count': record_count
            }
        )
    
    def log_report_export(self, operator, file_name, report_type):
        return self.log_action(
            action_type='report_export',
            operator=operator,
            details={
                'file_name': file_name,
                'report_type': report_type
            }
        )
    
    def get_logs(self, action_type=None, target_sku=None, start_time=None, end_time=None):
        logs = self._logs
        
        if action_type:
            logs = [l for l in logs if l['action_type'] == action_type]
        
        if target_sku:
            logs = [l for l in logs if l['target_sku'] == target_sku]
        
        if start_time:
            start_dt = datetime.fromisoformat(start_time) if isinstance(start_time, str) else start_time
            logs = [l for l in logs if datetime.fromisoformat(l['timestamp']) >= start_dt]
        
        if end_time:
            end_dt = datetime.fromisoformat(end_time) if isinstance(end_time, str) else end_time
            logs = [l for l in logs if datetime.fromisoformat(l['timestamp']) <= end_dt]
        
        return logs
    
    def get_sku_audit_trail(self, sku_id):
        return [l for l in self._logs if l.get('target_sku') == sku_id]
    
    def get_manual_adjustments(self):
        return [l for l in self._logs if l['action_type'] in ['classification_adjustment', 'threshold_adjustment']]
    
    def format_log_entry(self, log_entry):
        ts = datetime.fromisoformat(log_entry['timestamp']).strftime('%Y-%m-%d %H:%M:%S')
        action = log_entry['action_type']
        operator = log_entry['operator']
        target = log_entry.get('target_sku', 'N/A')
        reason = log_entry.get('reason', '')
        
        details_str = ''
        if action == 'classification_adjustment':
            details = log_entry['details']
            details_str = f"{details['original_class']} → {details['new_class']}"
        elif action == 'threshold_adjustment':
            details = log_entry['details']
            details_str = f"阈值调整"
        elif action == 'anomaly_override':
            details = log_entry['details']
            details_str = f"{details['anomaly_type']}: {details['action']}"
        
        return f"[{ts}] {operator} - {action} - SKU:{target} - {details_str} - {reason}"
    
    def print_logs(self, logs=None):
        logs = logs or self._logs
        for log in logs:
            print(self.format_log_entry(log))
