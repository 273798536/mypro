import json
import os
import uuid
from datetime import datetime
from config import Config
import pandas as pd


class DataStore:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init_store()
        return cls._instance
    
    def _init_store(self):
        self.records_file = os.path.join(Config.PROCESSED_FOLDER, 'records.json')
        self.issues_file = os.path.join(Config.PROCESSED_FOLDER, 'issues.json')
        self.uploads_file = os.path.join(Config.PROCESSED_FOLDER, 'uploads.json')
        self.trace_log_file = os.path.join(Config.PROCESSED_FOLDER, 'trace_log.json')
        self.manual_edits_file = os.path.join(Config.PROCESSED_FOLDER, 'manual_edits.json')
        self._load_all()
    
    def _load_all(self):
        self.records = self._load_json(self.records_file, {})
        self.issues = self._load_json(self.issues_file, {})
        self.uploads = self._load_json(self.uploads_file, {})
        self.trace_log = self._load_json(self.trace_log_file, [])
        self.manual_edits = self._load_json(self.manual_edits_file, {})
    
    def _load_json(self, path, default):
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return default if not isinstance(default, list) else list(default)
        return json.loads(json.dumps(default))
    
    def _save_json(self, path, data):
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def save_all(self):
        self._save_json(self.records_file, self.records)
        self._save_json(self.issues_file, self.issues)
        self._save_json(self.uploads_file, self.uploads)
        self._save_json(self.trace_log_file, self.trace_log)
        self._save_json(self.manual_edits_file, self.manual_edits)
    
    def register_upload(self, filename, file_hash, row_count):
        upload_id = str(uuid.uuid4())[:8]
        self.uploads[upload_id] = {
            'upload_id': upload_id,
            'filename': filename,
            'file_hash': file_hash,
            'row_count': row_count,
            'upload_time': datetime.now().isoformat(),
            'status': 'processed'
        }
        self._add_trace(f'upload:{upload_id}', 'import', 
                       f'导入文件 {filename}，共 {row_count} 条记录')
        self.save_all()
        return upload_id
    
    def check_duplicate_upload(self, file_hash):
        for uid, up in self.uploads.items():
            if up.get('file_hash') == file_hash:
                return uid
        return None
    
    def add_records(self, upload_id, df):
        for idx, row in df.iterrows():
            rec_id = str(uuid.uuid4())[:8]
            record = {
                'record_id': rec_id,
                'upload_id': upload_id,
                'row_index': idx,
                'data': row.to_dict(),
                'data_status': None,
                'issues': [],
                'create_time': datetime.now().isoformat(),
                'last_updated': datetime.now().isoformat()
            }
            self.records[rec_id] = record
        self.save_all()
        return list(self.records.keys())
    
    def add_issue(self, record_id, issue_type, rule_name, details, severity, suggested_status):
        issue_id = str(uuid.uuid4())[:8]
        issue = {
            'issue_id': issue_id,
            'record_id': record_id,
            'issue_type': issue_type,
            'rule_name': rule_name,
            'details': details,
            'severity': severity,
            'suggested_status': suggested_status,
            'status': 'pending',
            'create_time': datetime.now().isoformat()
        }
        self.issues[issue_id] = issue
        if record_id in self.records:
            if issue_id not in self.records[record_id]['issues']:
                self.records[record_id]['issues'].append(issue_id)
        self._add_trace(f'record:{record_id}', 'issue_detected',
                       f'{rule_name}: {details}')
        self.save_all()
        return issue_id
    
    def set_record_status(self, record_id, status):
        if record_id in self.records:
            old_status = self.records[record_id].get('data_status')
            self.records[record_id]['data_status'] = status
            self.records[record_id]['last_updated'] = datetime.now().isoformat()
            self._add_trace(f'record:{record_id}', 'status_change',
                           f'状态变更: {old_status} -> {status}')
            self.save_all()
    
    def resolve_issue(self, issue_id, resolution, operator=None):
        if issue_id in self.issues:
            self.issues[issue_id]['status'] = 'resolved'
            self.issues[issue_id]['resolution'] = resolution
            self.issues[issue_id]['resolve_time'] = datetime.now().isoformat()
            self.issues[issue_id]['operator'] = operator or 'system'
            rec_id = self.issues[issue_id]['record_id']
            self._add_trace(f'record:{rec_id}', 'issue_resolved',
                           f'问题 {issue_id} 已处理: {resolution}')
            self.save_all()
    
    def record_manual_edit(self, record_id, field_name, old_value, new_value, operator):
        edit_id = str(uuid.uuid4())[:8]
        edit = {
            'edit_id': edit_id,
            'record_id': record_id,
            'field_name': field_name,
            'old_value': old_value,
            'new_value': new_value,
            'operator': operator,
            'edit_time': datetime.now().isoformat()
        }
        self.manual_edits[edit_id] = edit
        self._add_trace(f'record:{record_id}', 'manual_edit',
                       f'{operator} 修改 {field_name}: {old_value} -> {new_value}')
        if record_id in self.records:
            self.records[record_id]['last_updated'] = datetime.now().isoformat()
        self.save_all()
        return edit_id
    
    def _add_trace(self, target_id, action, description):
        self.trace_log.append({
            'trace_id': str(uuid.uuid4())[:8],
            'target_id': target_id,
            'action': action,
            'description': description,
            'timestamp': datetime.now().isoformat()
        })
    
    def get_trace_for_record(self, record_id):
        return [t for t in self.trace_log if t['target_id'] == f'record:{record_id}']
    
    def get_record_with_trace(self, record_id):
        if record_id not in self.records:
            return None
        rec = dict(self.records[record_id])
        rec['trace'] = self.get_trace_for_record(record_id)
        rec['issues_detail'] = [self.issues[iid] for iid in rec['issues'] if iid in self.issues]
        rec['manual_edits'] = [e for e in self.manual_edits.values() if e['record_id'] == record_id]
        return rec
    
    def get_all_records_summary(self):
        summary = {
            'total': len(self.records),
            'by_status': {},
            'by_issue_type': {},
            'issues_count': len(self.issues),
            'uploads': list(self.uploads.values())
        }
        for r in self.records.values():
            s = r.get('data_status') or 'unclassified'
            summary['by_status'][s] = summary['by_status'].get(s, 0) + 1
        for i in self.issues.values():
            t = i['issue_type']
            summary['by_issue_type'][t] = summary['by_issue_type'].get(t, 0) + 1
        return summary
    
    def get_issues_by_type(self, issue_type=None):
        if issue_type:
            return [i for i in self.issues.values() if i['issue_type'] == issue_type]
        return list(self.issues.values())
    
    def get_records_by_status(self, status=None):
        if status:
            return [r for r in self.records.values() if r.get('data_status') == status]
        return list(self.records.values())
