import re
import json
import uuid
from datetime import datetime
from .db import execute_query, execute_insert


class LineageAnalyzer:
    def __init__(self, user_id='system'):
        self.user_id = user_id
        self.analysis_version = 1

    def parse_sql_caliber(self, sql):
        tables = self._extract_tables(sql)
        columns = self._extract_columns(sql)
        aggregation = self._extract_aggregation(sql)
        filters = self._extract_filters(sql)
        
        return {
            'tables': tables,
            'columns': columns,
            'aggregation': aggregation,
            'filters': filters,
            'caliber_expression': self._generate_caliber_expression(tables, columns, aggregation, filters)
        }

    def _extract_tables(self, sql):
        sql_lower = sql.lower()
        tables = []
        
        from_match = re.search(r'from\s+([\w\.,\s]+?)(?:\s+where|\s+group|\s+order|\s+join|\s+limit|$)', sql_lower)
        if from_match:
            for table in re.split(r',', from_match.group(1).strip()):
                table = table.strip().split()[0]
                if table:
                    tables.append(table)
        
        join_matches = re.finditer(r'join\s+([\w\.]+)', sql_lower)
        for match in join_matches:
            tables.append(match.group(1))
        
        insert_match = re.search(r'into\s+([\w\.]+)', sql_lower)
        if insert_match:
            tables.append(insert_match.group(1))
        
        create_match = re.search(r'create\s+table\s+([\w\.]+)', sql_lower)
        if create_match:
            tables.append(create_match.group(1))
        
        return list(set(tables))

    def _extract_columns(self, sql):
        columns = []
        select_match = re.search(r'select\s+(.+?)\s+from', sql.lower())
        if select_match:
            select_clause = select_match.group(1)
            col_matches = re.findall(r'(\w+)\s*[\.,\)]|\b(\w+)\s+as\s+(\w+)', select_clause)
            for match in col_matches:
                for col in match:
                    if col and col not in ['sum', 'count', 'avg', 'max', 'min', 'distinct', 'case', 'when', 'then', 'else', 'end']:
                        columns.append(col)
        
        where_match = re.search(r'where\s+(.+?)(?:\s+group|\s+order|\s+limit|$)', sql.lower())
        if where_match:
            where_clause = where_match.group(1)
            where_cols = re.findall(r'(\w+)\s*[=<>]', where_clause)
            columns.extend(where_cols)
        
        return list(set([c for c in columns if c and len(c) > 1]))

    def _extract_aggregation(self, sql):
        sql_lower = sql.lower()
        aggregations = []
        
        agg_funcs = re.findall(r'(sum|count|avg|max|min)\s*\((.+?)\)', sql_lower)
        for func, expr in agg_funcs:
            aggregations.append({
                'function': func.upper(),
                'expression': expr.strip()
            })
        
        group_match = re.search(r'group\s+by\s+(.+?)(?:\s+order|\s+having|\s+limit|$)', sql_lower)
        group_by = []
        if group_match:
            group_by = [g.strip() for g in group_match.group(1).split(',')]
        
        return {
            'aggregations': aggregations,
            'group_by': group_by
        }

    def _extract_filters(self, sql):
        sql_lower = sql.lower()
        filters = []
        
        where_match = re.search(r'where\s+(.+?)(?:\s+group|\s+order|\s+limit|$)', sql_lower)
        if where_match:
            where_clause = where_match.group(1)
            conditions = re.split(r'\s+and\s+|\s+or\s+', where_clause)
            for cond in conditions:
                filters.append(cond.strip())
        
        return filters

    def _generate_caliber_expression(self, tables, columns, aggregation, filters):
        parts = []
        
        if aggregation['aggregations']:
            for agg in aggregation['aggregations']:
                parts.append(f"{agg['function']}({agg['expression']})")
        
        if filters:
            parts.append(f"WHERE {' AND '.join(filters)}")
        
        if aggregation['group_by']:
            parts.append(f"GROUP BY {', '.join(aggregation['group_by'])}")
        
        return ' '.join(parts) if parts else 'SELECT *'

    def analyze_log(self, log_id):
        log = execute_query(
            "SELECT * FROM slow_query_logs WHERE log_id = ? AND is_active = 1",
            (log_id,)
        )
        
        if not log:
            return {'status': 'error', 'reason': '日志不存在或已失效'}
        
        log = log[0]
        
        if log['is_dirty']:
            return {'status': 'error', 'reason': f'脏数据，无法分析: {log["dirty_reason"]}'}
        
        existing = execute_query(
            "SELECT id FROM lineage_tracking WHERE slow_query_log_id = ? AND is_active = 1",
            (log['id'],)
        )
        
        if existing:
            self.analysis_version = execute_query(
                "SELECT MAX(analysis_version) as v FROM lineage_tracking WHERE slow_query_log_id = ?",
                (log['id'],)
            )[0]['v'] + 1
        
        parsed = self.parse_sql_caliber(log['query_sql'])
        
        source_tables = [t for t in parsed['tables'] if t != log.get('target_table')]
        target_table = log.get('target_table') or parsed['tables'][-1] if parsed['tables'] else None
        
        target_column = None
        if parsed['columns']:
            agg_cols = [a['expression'] for a in parsed['aggregation']['aggregations']]
            target_column = agg_cols[0] if agg_cols else parsed['columns'][0]
        
        dependency_depth = self._calculate_dependency_depth(source_tables)
        
        lineage_id = f"LIN-{uuid.uuid4().hex[:12]}"
        
        execute_insert(
            """INSERT INTO lineage_tracking 
               (lineage_id, report_name, caliber_expression, source_tables, source_columns,
                target_table, target_column, dependency_depth, slow_query_log_id, analysis_version)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                lineage_id,
                log.get('report_name', '未命名报表'),
                parsed['caliber_expression'],
                ','.join(source_tables),
                ','.join(parsed['columns']),
                target_table,
                target_column,
                dependency_depth,
                log['id'],
                self.analysis_version
            )
        )
        
        return {
            'status': 'success',
            'lineage_id': lineage_id,
            'report_name': log.get('report_name'),
            'analysis_version': self.analysis_version,
            'caliber': parsed
        }

    def _calculate_dependency_depth(self, tables):
        depth = 0
        visited = set()
        
        def get_dependencies(table, current_depth):
            nonlocal depth
            if table in visited:
                return
            visited.add(table)
            depth = max(depth, current_depth)
            
            deps = execute_query(
                """SELECT source_tables FROM lineage_tracking 
                   WHERE target_table = ? AND is_active = 1
                   ORDER BY analysis_version DESC LIMIT 1""",
                (table,)
            )
            
            if deps and deps[0]['source_tables']:
                for dep in deps[0]['source_tables'].split(','):
                    get_dependencies(dep.strip(), current_depth + 1)
        
        for table in tables:
            get_dependencies(table, 1)
        
        return depth

    def analyze_all(self, include_dirty=False):
        logs = execute_query(
            "SELECT log_id FROM slow_query_logs WHERE is_active = 1",
        )
        
        if not include_dirty:
            logs = execute_query(
                "SELECT log_id FROM slow_query_logs WHERE is_active = 1 AND is_dirty = 0",
            )
        
        results = []
        for log in logs:
            result = self.analyze_log(log['log_id'])
            results.append(result)
        
        return {
            'total': len(logs),
            'success': len([r for r in results if r.get('status') == 'success']),
            'failed': len([r for r in results if r.get('status') == 'error']),
            'details': results
        }

    def create_snapshot(self, report_name=None, snapshot_type='analysis', baseline_snapshot_id=None):
        lineage_ids = []
        log_ids = []
        analysis_results = []
        
        if report_name:
            lineages = execute_query(
                "SELECT * FROM lineage_tracking WHERE report_name = ? AND is_active = 1 ORDER BY analysis_version DESC",
                (report_name,)
            )
        else:
            lineages = execute_query(
                "SELECT * FROM lineage_tracking WHERE is_active = 1 ORDER BY report_name, analysis_version DESC"
            )
        
        for lin in lineages:
            lineage_ids.append(lin['lineage_id'])
            if lin['slow_query_log_id']:
                log_ids.append(str(lin['slow_query_log_id']))
            analysis_results.append({
                'lineage_id': lin['lineage_id'],
                'report_name': lin['report_name'],
                'caliber_expression': lin['caliber_expression'],
                'source_tables': lin['source_tables'],
                'target_table': lin['target_table'],
                'analysis_version': lin['analysis_version'],
                'is_manual_confirmed': bool(lin['is_manual_confirmed'])
            })
        
        snapshot_id = f"SNAP-{uuid.uuid4().hex[:12]}"
        
        execute_insert(
            """INSERT INTO analysis_snapshots 
               (snapshot_id, snapshot_type, baseline_snapshot_id, report_name,
                slow_query_log_ids, lineage_ids, analysis_result, created_by)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                snapshot_id,
                snapshot_type,
                baseline_snapshot_id,
                report_name,
                ','.join(log_ids),
                ','.join(lineage_ids),
                json.dumps(analysis_results, ensure_ascii=False),
                self.user_id
            )
        )
        
        return {'status': 'success', 'snapshot_id': snapshot_id, 'lineage_count': len(lineage_ids)}

    def compare_snapshots(self, snapshot_id_1, snapshot_id_2):
        snap1 = execute_query(
            "SELECT * FROM analysis_snapshots WHERE snapshot_id = ?",
            (snapshot_id_1,)
        )
        
        snap2 = execute_query(
            "SELECT * FROM analysis_snapshots WHERE snapshot_id = ?",
            (snapshot_id_2,)
        )
        
        if not snap1 or not snap2:
            return {'status': 'error', 'reason': '快照不存在'}
        
        result1 = json.loads(snap1[0]['analysis_result'])
        result2 = json.loads(snap2[0]['analysis_result'])
        
        report_map1 = {r['report_name']: r for r in result1}
        report_map2 = {r['report_name']: r for r in result2}
        
        all_reports = set(report_map1.keys()) | set(report_map2.keys())
        
        comparison = []
        for report in sorted(all_reports):
            r1 = report_map1.get(report)
            r2 = report_map2.get(report)
            
            has_change = False
            change_details = []
            
            if r1 and r2:
                if r1['caliber_expression'] != r2['caliber_expression']:
                    has_change = True
                    change_details.append({
                        'field': 'caliber_expression',
                        'old': r1['caliber_expression'],
                        'new': r2['caliber_expression']
                    })
                if r1['source_tables'] != r2['source_tables']:
                    has_change = True
                    change_details.append({
                        'field': 'source_tables',
                        'old': r1['source_tables'],
                        'new': r2['source_tables']
                    })
                if r1['target_table'] != r2['target_table']:
                    has_change = True
                    change_details.append({
                        'field': 'target_table',
                        'old': r1['target_table'],
                        'new': r2['target_table']
                    })
                if r1['analysis_version'] != r2['analysis_version']:
                    has_change = True
                    change_details.append({
                        'field': 'analysis_version',
                        'old': r1['analysis_version'],
                        'new': r2['analysis_version']
                    })
            
            comparison.append({
                'report_name': report,
                'status': 'changed' if has_change else 'unchanged' if (r1 and r2) else 'added' if r2 else 'removed',
                'old': r1,
                'new': r2,
                'changes': change_details
            })
        
        changed_count = len([c for c in comparison if c['status'] == 'changed'])
        added_count = len([c for c in comparison if c['status'] == 'added'])
        removed_count = len([c for c in comparison if c['status'] == 'removed'])
        
        return {
            'status': 'success',
            'snapshot1': {
                'id': snapshot_id_1,
                'created_at': snap1[0]['created_at'],
                'report_count': len(result1)
            },
            'snapshot2': {
                'id': snapshot_id_2,
                'created_at': snap2[0]['created_at'],
                'report_count': len(result2)
            },
            'summary': {
                'total_reports': len(all_reports),
                'changed': changed_count,
                'added': added_count,
                'removed': removed_count,
                'unchanged': len(all_reports) - changed_count - added_count - removed_count
            },
            'comparison': comparison
        }

    def get_report_lineage(self, report_name):
        lineages = execute_query(
            """SELECT lt.*, sql.log_id, sql.query_sql, sql.execution_date
               FROM lineage_tracking lt
               LEFT JOIN slow_query_logs sql ON lt.slow_query_log_id = sql.id
               WHERE lt.report_name = ? AND lt.is_active = 1
               ORDER BY lt.analysis_version DESC""",
            (report_name,)
        )
        
        if not lineages:
            return {'status': 'error', 'reason': '报表不存在'}
        
        versions = []
        for lin in lineages:
            versions.append({
                'lineage_id': lin['lineage_id'],
                'analysis_version': lin['analysis_version'],
                'caliber_expression': lin['caliber_expression'],
                'source_tables': lin['source_tables'],
                'target_table': lin['target_table'],
                'dependency_depth': lin['dependency_depth'],
                'is_manual_confirmed': bool(lin['is_manual_confirmed']),
                'confirmed_by': lin['confirmed_by'],
                'confirmed_at': lin['confirmed_at'],
                'source_log_id': lin['log_id'],
                'source_sql': lin['query_sql'],
                'execution_date': lin['execution_date'],
                'created_at': lin['created_at']
            })
        
        return {
            'status': 'success',
            'report_name': report_name,
            'version_count': len(versions),
            'versions': versions
        }

    def confirm_lineage(self, lineage_id, user_id):
        lin = execute_query(
            "SELECT * FROM lineage_tracking WHERE lineage_id = ?",
            (lineage_id,)
        )
        
        if not lin:
            return {'status': 'error', 'reason': '血缘记录不存在'}
        
        execute_query(
            """UPDATE lineage_tracking 
               SET is_manual_confirmed = 1, confirmed_by = ?, confirmed_at = CURRENT_TIMESTAMP
               WHERE lineage_id = ?""",
            (user_id, lineage_id),
            fetch=False
        )
        
        return {'status': 'success', 'lineage_id': lineage_id, 'confirmed_by': user_id}
