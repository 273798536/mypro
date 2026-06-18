import json
import uuid
from datetime import datetime
from .db import execute_query, execute_insert
from .lineage_analyzer import LineageAnalyzer


class MigrationManager:
    def __init__(self, user_id='system'):
        self.user_id = user_id
        self.analyzer = LineageAnalyzer(user_id)

    def execute_migration(self, migration_id, simulate=False):
        migration = execute_query(
            "SELECT * FROM migration_records WHERE migration_id = ?",
            (migration_id,)
        )
        
        if not migration:
            return {'status': 'error', 'reason': '迁移记录不存在'}
        
        migration = migration[0]
        
        if migration['status'] == 'executed':
            return {'status': 'error', 'reason': '迁移已执行，如需变更请先回滚'}
        
        if migration['status'] == 'rolled_back':
            return {'status': 'error', 'reason': '迁移已回滚，如需重新执行请创建新的迁移记录'}
        
        before_snapshot = self._get_migration_impact(migration['source_sql'])
        
        if simulate:
            return {
                'status': 'success',
                'mode': 'simulate',
                'migration_id': migration_id,
                'before_impact': before_snapshot,
                'estimated_impact': self._estimate_impact(migration)
            }
        
        new_status = 'executed'
        affected_rows = self._calculate_affected_rows(migration)
        
        before_data = json.dumps(before_snapshot, ensure_ascii=False)
        
        execute_query(
            """UPDATE migration_records 
               SET status = ?, execution_time = CURRENT_TIMESTAMP, 
                   affected_rows = ?, updated_at = CURRENT_TIMESTAMP
               WHERE migration_id = ?""",
            (new_status, affected_rows, migration_id),
            fetch=False
        )
        
        after_snapshot = self._get_migration_impact(migration['target_sql'] or migration['source_sql'])
        after_data = json.dumps(after_snapshot, ensure_ascii=False)
        
        self._reanalyze_affected_lineages(migration)
        
        return {
            'status': 'success',
            'mode': 'execute',
            'migration_id': migration_id,
            'old_status': migration['status'],
            'new_status': new_status,
            'affected_rows': affected_rows,
            'before_impact': before_snapshot,
            'after_impact': after_snapshot,
            'data_comparison': self._compare_data(before_snapshot, after_snapshot)
        }

    def rollback_migration(self, migration_id, rollback_reason=''):
        migration = execute_query(
            "SELECT * FROM migration_records WHERE migration_id = ?",
            (migration_id,)
        )
        
        if not migration:
            return {'status': 'error', 'reason': '迁移记录不存在'}
        
        migration = migration[0]
        
        if migration['status'] != 'executed':
            return {'status': 'error', 'reason': f'当前状态为{migration["status"]}，只有executed状态可以回滚'}
        
        before_status = migration['status']
        after_status = 'rolled_back'
        
        before_snapshot = self._get_migration_impact(migration['target_sql'] or migration['source_sql'])
        before_data = json.dumps(before_snapshot, ensure_ascii=False)
        
        rollback_migration_id = f"{migration_id}_ROLLBACK_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        execute_insert(
            """INSERT INTO migration_records 
               (migration_id, migration_name, migration_type, source_sql, target_sql,
                manual_remark, status, executor, parent_migration_id, is_rollback, rollback_from_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)""",
            (
                rollback_migration_id,
                f"回滚: {migration['migration_name']}",
                'rollback',
                migration['target_sql'] or migration['source_sql'],
                migration['source_sql'],
                f"回滚操作，原始迁移ID: {migration_id}",
                'executed',
                self.user_id,
                migration_id,
                migration['id']
            )
        )
        
        execute_query(
            """UPDATE migration_records 
               SET status = ?, is_rollback = 1, updated_at = CURRENT_TIMESTAMP
               WHERE migration_id = ?""",
            (after_status, migration_id),
            fetch=False
        )
        
        after_snapshot = self._get_migration_impact(migration['source_sql'])
        after_data = json.dumps(after_snapshot, ensure_ascii=False)
        
        execute_insert(
            """INSERT INTO rollback_history 
               (migration_id, original_migration_id, before_status, after_status,
                before_data_snapshot, after_data_snapshot, rollback_reason, executor)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                rollback_migration_id,
                migration['id'],
                before_status,
                after_status,
                before_data,
                after_data,
                rollback_reason,
                self.user_id
            )
        )
        
        self._reanalyze_affected_lineages(migration, rollback=True)
        
        return {
            'status': 'success',
            'rollback_migration_id': rollback_migration_id,
            'original_migration_id': migration_id,
            'before_status': before_status,
            'after_status': after_status,
            'rollback_reason': rollback_reason,
            'before_impact': before_snapshot,
            'after_impact': after_snapshot,
            'data_comparison': self._compare_data(before_snapshot, after_snapshot, rollback=True)
        }

    def _get_migration_impact(self, sql):
        if not sql:
            return {'tables': [], 'columns': [], 'caliber': ''}
        
        parsed = self.analyzer.parse_sql_caliber(sql)
        
        impact = {
            'tables': parsed['tables'],
            'columns': parsed['columns'],
            'caliber': parsed['caliber_expression'],
            'aggregation': parsed['aggregation'],
            'filters': parsed['filters']
        }
        
        related_reports = execute_query(
            """SELECT DISTINCT report_name FROM lineage_tracking 
               WHERE is_active = 1 AND (
               source_tables LIKE ? OR target_table = ?)""",
            (f"%{parsed['tables'][0]}%" if parsed['tables'] else '%',
             parsed['tables'][0] if parsed['tables'] else '')
        )
        
        impact['affected_reports'] = [r['report_name'] for r in related_reports]
        
        return impact

    def _estimate_impact(self, migration):
        source_tables = self.analyzer.parse_sql_caliber(migration['source_sql'])['tables']
        
        estimated_rows = 0
        for table in source_tables:
            count = execute_query(
                "SELECT COUNT(*) as cnt FROM slow_query_logs WHERE source_table LIKE ? OR target_table = ?",
                (f"%{table}%", table)
            )
            estimated_rows += count[0]['cnt'] if count else 0
        
        lineage_count = execute_query(
            "SELECT COUNT(*) as cnt FROM lineage_tracking WHERE source_tables LIKE ? OR target_table = ?",
            (f"%{source_tables[0]}%" if source_tables else '%',
             source_tables[0] if source_tables else '')
        )
        
        return {
            'estimated_affected_logs': estimated_rows,
            'estimated_affected_lineages': lineage_count[0]['cnt'] if lineage_count else 0,
            'migration_type': migration['migration_type']
        }

    def _calculate_affected_rows(self, migration):
        source_tables = self.analyzer.parse_sql_caliber(migration['source_sql'])['tables']
        
        affected = execute_query(
            "SELECT COUNT(*) as cnt FROM slow_query_logs WHERE source_table LIKE ? OR target_table = ?",
            (f"%{source_tables[0]}%" if source_tables else '%',
             source_tables[0] if source_tables else '')
        )
        
        return affected[0]['cnt'] if affected else 0

    def _compare_data(self, before, after, rollback=False):
        changes = []
        
        before_tables = set(before.get('tables', []))
        after_tables = set(after.get('tables', []))
        
        if before_tables != after_tables:
            changes.append({
                'type': 'tables',
                'action': 'rollback' if rollback else 'change',
                'removed': list(before_tables - after_tables),
                'added': list(after_tables - before_tables)
            })
        
        if before.get('caliber') != after.get('caliber'):
            changes.append({
                'type': 'caliber',
                'action': 'rollback' if rollback else 'change',
                'before': before.get('caliber'),
                'after': after.get('caliber')
            })
        
        before_reports = set(before.get('affected_reports', []))
        after_reports = set(after.get('affected_reports', []))
        
        if before_reports != after_reports:
            changes.append({
                'type': 'reports',
                'action': 'rollback' if rollback else 'change',
                'removed': list(before_reports - after_reports),
                'added': list(after_reports - before_reports),
                'common': list(before_reports & after_reports)
            })
        
        return changes

    def _reanalyze_affected_lineages(self, migration, rollback=False):
        sql = migration['target_sql'] if (not rollback and migration['target_sql']) else migration['source_sql']
        parsed = self.analyzer.parse_sql_caliber(sql)
        
        for table in parsed['tables']:
            affected_logs = execute_query(
                "SELECT log_id FROM slow_query_logs WHERE source_table LIKE ? AND is_active = 1 AND is_dirty = 0",
                (f"%{table}%",)
            )
            
            for log in affected_logs:
                self.analyzer.analyze_log(log['log_id'])

    def get_migration_history(self, migration_id=None):
        if migration_id:
            migrations = execute_query(
                "SELECT * FROM migration_records WHERE migration_id = ? OR parent_migration_id = ? ORDER BY created_at",
                (migration_id, migration_id)
            )
        else:
            migrations = execute_query(
                "SELECT * FROM migration_records ORDER BY created_at DESC"
            )
        
        return {
            'status': 'success',
            'count': len(migrations),
            'migrations': migrations
        }

    def get_rollback_history(self, original_migration_id=None):
        if original_migration_id:
            history = execute_query(
                "SELECT * FROM rollback_history WHERE original_migration_id = ? ORDER BY created_at",
                (original_migration_id,)
            )
        else:
            history = execute_query(
                "SELECT * FROM rollback_history ORDER BY created_at DESC"
            )
        
        for item in history:
            if item['before_data_snapshot']:
                item['before_data_snapshot'] = json.loads(item['before_data_snapshot'])
            if item['after_data_snapshot']:
                item['after_data_snapshot'] = json.loads(item['after_data_snapshot'])
        
        return {
            'status': 'success',
            'count': len(history),
            'rollback_history': history
        }

    def get_rollback_diff(self, rollback_id):
        rollback = execute_query(
            "SELECT * FROM rollback_history WHERE id = ?",
            (rollback_id,)
        )
        
        if not rollback:
            return {'status': 'error', 'reason': '回滚记录不存在'}
        
        rollback = rollback[0]
        
        before_data = json.loads(rollback['before_data_snapshot']) if rollback['before_data_snapshot'] else {}
        after_data = json.loads(rollback['after_data_snapshot']) if rollback['after_data_snapshot'] else {}
        
        diff = self._generate_side_by_side_diff(before_data, after_data)
        
        return {
            'status': 'success',
            'rollback_id': rollback_id,
            'migration_id': rollback['migration_id'],
            'executor': rollback['executor'],
            'rollback_reason': rollback['rollback_reason'],
            'before_status': rollback['before_status'],
            'after_status': rollback['after_status'],
            'side_by_side_diff': diff,
            'created_at': rollback['created_at']
        }

    def _generate_side_by_side_diff(self, before, after):
        diff_lines = []
        
        all_keys = set(list(before.keys()) + list(after.keys()))
        
        for key in sorted(all_keys):
            before_val = before.get(key, '')
            after_val = after.get(key, '')
            
            if isinstance(before_val, list):
                before_val = ', '.join(before_val)
            if isinstance(after_val, list):
                after_val = ', '.join(after_val)
            if isinstance(before_val, dict):
                before_val = json.dumps(before_val, ensure_ascii=False)
            if isinstance(after_val, dict):
                after_val = json.dumps(after_val, ensure_ascii=False)
            
            changed = str(before_val) != str(after_val)
            
            diff_lines.append({
                'field': key,
                'before': str(before_val),
                'after': str(after_val),
                'changed': changed
            })
        
        return diff_lines
