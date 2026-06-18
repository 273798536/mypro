import json
import os
import uuid
import re
from datetime import datetime
from .db import get_db_connection, execute_query, execute_insert, row_to_dict


class DataImporter:
    def __init__(self, batch_id=None):
        self.batch_id = batch_id or f"BATCH-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        self.import_stats = {
            'total': 0,
            'success': 0,
            'skipped': 0,
            'dirty': 0,
            'errors': []
        }

    def import_slow_query_logs(self, json_file, user_id, mode='standard'):
        with open(json_file, 'r', encoding='utf-8') as f:
            logs = json.load(f)
        
        self.import_stats['total'] = len(logs)
        
        for log in logs:
            result = self._import_single_log(log, user_id, mode)
            if result['status'] == 'success':
                self.import_stats['success'] += 1
            elif result['status'] == 'skipped':
                self.import_stats['skipped'] += 1
            elif result['status'] == 'dirty':
                self.import_stats['dirty'] += 1
            else:
                self.import_stats['errors'].append(result)
        
        return self.import_stats

    def _import_single_log(self, log, user_id, mode):
        log_id = log.get('log_id')
        
        if not log_id:
            return {'status': 'error', 'log_id': 'unknown', 'reason': 'log_id缺失'}
        
        existing = execute_query(
            "SELECT id, is_active FROM slow_query_logs WHERE log_id = ?",
            (log_id,)
        )
        
        if existing and mode == 'standard':
            return {'status': 'skipped', 'log_id': log_id, 'reason': '已存在，跳过'}
        
        if existing and mode == 'supplement':
            return self._supplement_log(log, existing[0]['id'], user_id)
        
        is_dirty, dirty_reason = self._validate_log(log)
        
        if is_dirty and mode == 'clean_only':
            return {'status': 'skipped', 'log_id': log_id, 'reason': f'脏数据: {dirty_reason}'}
        
        try:
            if existing and mode == 'overwrite':
                execute_query(
                    """UPDATE slow_query_logs 
                       SET query_sql = ?, query_db = ?, execution_time = ?, execution_date = ?,
                           execution_user = ?, report_name = ?, source_table = ?, target_table = ?,
                           import_batch_id = ?, is_dirty = ?, dirty_reason = ?, updated_at = CURRENT_TIMESTAMP
                       WHERE log_id = ?""",
                    (
                        log.get('query_sql', ''),
                        log.get('query_db', ''),
                        log.get('execution_time', 0),
                        log.get('execution_date', ''),
                        log.get('execution_user'),
                        log.get('report_name'),
                        log.get('source_table'),
                        log.get('target_table'),
                        self.batch_id,
                        1 if is_dirty else 0,
                        dirty_reason,
                        log_id
                    ),
                    fetch=False
                )
            else:
                execute_insert(
                    """INSERT INTO slow_query_logs 
                       (log_id, query_sql, query_db, execution_time, execution_date, execution_user,
                        report_name, source_table, target_table, import_batch_id, is_dirty, dirty_reason)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        log_id,
                        log.get('query_sql', ''),
                        log.get('query_db', ''),
                        log.get('execution_time', 0),
                        log.get('execution_date', ''),
                        log.get('execution_user'),
                        log.get('report_name'),
                        log.get('source_table'),
                        log.get('target_table'),
                        self.batch_id,
                        1 if is_dirty else 0,
                        dirty_reason
                    )
                )
            
            return {'status': 'dirty' if is_dirty else 'success', 'log_id': log_id, 'dirty_reason': dirty_reason}
        
        except Exception as e:
            return {'status': 'error', 'log_id': log_id, 'reason': str(e)}

    def _supplement_log(self, log, existing_id, user_id):
        original_data = execute_query(
            "SELECT * FROM slow_query_logs WHERE id = ?",
            (existing_id,)
        )[0]
        
        corrected_data = {}
        for key in ['query_sql', 'report_name', 'source_table', 'target_table', 'execution_user']:
            if log.get(key) and not original_data.get(key):
                corrected_data[key] = log[key]
        
        if not corrected_data:
            return {'status': 'skipped', 'log_id': log['log_id'], 'reason': '无缺失字段可补录'}
        
        confirmation_id = f"CONF-{uuid.uuid4().hex[:12]}"
        execute_insert(
            """INSERT INTO manual_confirmations 
               (confirmation_id, business_type, business_id, original_data, corrected_data,
                confirmation_reason, confirmed_by, is_supplement)
               VALUES (?, ?, ?, ?, ?, ?, ?, 1)""",
            (
                confirmation_id,
                'slow_query_log',
                str(existing_id),
                json.dumps({k: original_data[k] for k in corrected_data.keys()}, ensure_ascii=False),
                json.dumps(corrected_data, ensure_ascii=False),
                '数据补录',
                user_id
            )
        )
        
        update_sql = "UPDATE slow_query_logs SET "
        update_params = []
        for key, value in corrected_data.items():
            update_sql += f"{key} = ?, "
            update_params.append(value)
        update_sql += "updated_at = CURRENT_TIMESTAMP WHERE id = ?"
        update_params.append(existing_id)
        
        execute_query(update_sql, tuple(update_params), fetch=False)
        
        return {'status': 'success', 'log_id': log['log_id'], 'supplemented_fields': list(corrected_data.keys())}

    def _validate_log(self, log):
        reasons = []
        
        if not log.get('query_sql') or len(log['query_sql'].strip()) == 0:
            reasons.append('SQL语句为空')
        
        if not log.get('execution_user'):
            reasons.append('执行用户为空')
        
        if log.get('execution_time', 0) > 10000:
            reasons.append(f'执行时间异常: {log["execution_time"]}秒')
        
        if log.get('execution_date'):
            if not re.match(r'^\d{4}-\d{2}-\d{2}$', log['execution_date']):
                reasons.append(f'日期格式不规范: {log["execution_date"]}')
        
        if log.get('source_table') and 'inventory' in log['source_table'].lower():
            if 'inventroy' in log['source_table'].lower():
                reasons.append(f'表名拼写疑似错误: {log["source_table"]}')
        
        if log.get('query_sql'):
            if re.search(r'SELECT\s+\w+\s+\w+\(', log['query_sql']):
                reasons.append('SQL语法疑似错误：字段间缺少逗号')
        
        if log.get('is_dirty'):
            reasons.append(log.get('dirty_reason', '标记为脏数据'))
        
        if reasons:
            return True, '; '.join(reasons)
        return False, None

    def manually_confirm(self, log_id, user_id, corrected_fields=None, confirmation_reason='人工确认'):
        log = execute_query(
            "SELECT * FROM slow_query_logs WHERE log_id = ?",
            (log_id,)
        )
        
        if not log:
            return {'status': 'error', 'reason': '日志不存在'}
        
        log = log[0]
        confirmation_id = f"CONF-{uuid.uuid4().hex[:12]}"
        
        original_data = {
            'query_sql': log['query_sql'],
            'report_name': log['report_name'],
            'is_dirty': bool(log['is_dirty']),
            'dirty_reason': log['dirty_reason']
        }
        
        corrected_data = corrected_fields or {}
        corrected_data['is_dirty'] = 0
        corrected_data['dirty_reason'] = None
        
        execute_insert(
            """INSERT INTO manual_confirmations 
               (confirmation_id, business_type, business_id, original_data, corrected_data,
                confirmation_reason, confirmed_by, is_supplement)
               VALUES (?, ?, ?, ?, ?, ?, ?, 0)""",
            (
                confirmation_id,
                'slow_query_log',
                str(log['id']),
                json.dumps(original_data, ensure_ascii=False),
                json.dumps(corrected_data, ensure_ascii=False),
                confirmation_reason,
                user_id
            )
        )
        
        if corrected_fields:
            update_sql = "UPDATE slow_query_logs SET "
            update_params = []
            for key, value in corrected_fields.items():
                update_sql += f"{key} = ?, "
                update_params.append(value)
            update_sql += "is_dirty = 0, dirty_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE log_id = ?"
            update_params.append(log_id)
            execute_query(update_sql, tuple(update_params), fetch=False)
        else:
            execute_query(
                "UPDATE slow_query_logs SET is_dirty = 0, dirty_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE log_id = ?",
                (log_id,),
                fetch=False
            )
        
        return {'status': 'success', 'confirmation_id': confirmation_id, 'log_id': log_id}

    def import_data_dictionary(self, json_file):
        with open(json_file, 'r', encoding='utf-8') as f:
            dicts = json.load(f)
        
        stats = {'total': len(dicts), 'imported': 0, 'skipped': 0}
        
        for item in dicts:
            existing = execute_query(
                "SELECT id FROM data_dictionary WHERE table_name = ? AND column_name = ? AND version = ?",
                (item['table_name'], item['column_name'], item.get('version', 1))
            )
            
            if existing:
                stats['skipped'] += 1
                continue
            
            execute_insert(
                """INSERT INTO data_dictionary 
                   (table_name, column_name, data_type, business_caliber, technical_definition,
                    owner_department, is_obsolete, version)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    item['table_name'],
                    item['column_name'],
                    item['data_type'],
                    item.get('business_caliber'),
                    item.get('technical_definition'),
                    item.get('owner_department'),
                    item.get('is_obsolete', 0),
                    item.get('version', 1)
                )
            )
            stats['imported'] += 1
        
        return stats

    def import_migrations(self, json_file):
        with open(json_file, 'r', encoding='utf-8') as f:
            migrations = json.load(f)
        
        stats = {'total': len(migrations), 'imported': 0, 'skipped': 0}
        
        for item in migrations:
            existing = execute_query(
                "SELECT id FROM migration_records WHERE migration_id = ?",
                (item['migration_id'],)
            )
            
            if existing:
                stats['skipped'] += 1
                continue
            
            execute_insert(
                """INSERT INTO migration_records 
                   (migration_id, migration_name, migration_type, source_sql, target_sql,
                    manual_remark, status, executor)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    item['migration_id'],
                    item['migration_name'],
                    item['migration_type'],
                    item['source_sql'],
                    item.get('target_sql'),
                    item.get('manual_remark'),
                    item.get('status', 'pending'),
                    item['executor']
                )
            )
            stats['imported'] += 1
        
        return stats

    def import_permissions(self, json_file):
        with open(json_file, 'r', encoding='utf-8') as f:
            permissions = json.load(f)
        
        stats = {'total': len(permissions), 'imported': 0, 'skipped': 0}
        
        for item in permissions:
            existing = execute_query(
                "SELECT id FROM permissions WHERE user_id = ? AND role = ? AND permission_scope = ?",
                (item['user_id'], item['role'], item['permission_scope'])
            )
            
            if existing:
                stats['skipped'] += 1
                continue
            
            execute_insert(
                """INSERT INTO permissions 
                   (user_id, user_name, role, permission_scope, allowed_actions)
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    item['user_id'],
                    item['user_name'],
                    item['role'],
                    item['permission_scope'],
                    item['allowed_actions']
                )
            )
            stats['imported'] += 1
        
        return stats
