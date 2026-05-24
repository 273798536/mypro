import json
from .database import get_connection
from .checker import ISSUE_TYPES


def generate_report(session_id=None, batch_no=None, report_type='summary'):
    with get_connection() as conn:
        cursor = conn.cursor()
        
        report = {
            'report_type': report_type,
            'generated_at': None,
            'summary': {},
            'failed_records': [],
            'fixed_records': [],
            'batch_tracking': []
        }
        
        if session_id:
            cursor.execute("""
                SELECT s.*, COUNT(DISTINCT r.id) as record_count
                FROM import_sessions s
                LEFT JOIN raw_records r ON s.id = r.session_id
                WHERE s.id = ?
                GROUP BY s.id
            """, (session_id,))
            session = cursor.fetchone()
            
            if session:
                report['session'] = dict(session)
                
                cursor.execute("""
                    SELECT ri.id, ri.record_id, ri.issue_type, ri.issue_field,
                           ri.issue_description, ri.severity, ri.status,
                           r.original_line_no, r.batch_no, r.store_id, r.raw_data
                    FROM record_issues ri
                    JOIN raw_records r ON ri.record_id = r.id
                    WHERE r.session_id = ?
                    ORDER BY ri.severity DESC, r.original_line_no
                """, (session_id,))
                issues = [dict(row) for row in cursor.fetchall()]
                
                for issue in issues:
                    issue['issue_type_name'] = ISSUE_TYPES.get(issue['issue_type'], issue['issue_type'])
                    if issue['status'] == 'open':
                        report['failed_records'].append(issue)
                    elif issue['status'] == 'fixed':
                        report['fixed_records'].append(issue)
                
                report['summary'] = {
                    'total_records': session['total_rows'],
                    'valid_records': session['total_rows'] - len(set(i['record_id'] for i in issues if i['status'] == 'open')),
                    'failed_records': len(set(i['record_id'] for i in issues if i['status'] == 'open')),
                    'fixed_records': len(set(i['record_id'] for i in issues if i['status'] == 'fixed')),
                    'total_issues': len(issues),
                    'open_issues': len([i for i in issues if i['status'] == 'open']),
                    'fixed_issues': len([i for i in issues if i['status'] == 'fixed']),
                    'error_count': len([i for i in issues if i['severity'] == 'error' and i['status'] == 'open']),
                    'warning_count': len([i for i in issues if i['severity'] == 'warning' and i['status'] == 'open'])
                }
        
        if batch_no:
            cursor.execute("""
                SELECT DISTINCT bt.batch_no, bt.store_id, bt.source_type,
                       bt.tracking_type, bt.created_at,
                       s.file_name, s.imported_by,
                       r.original_line_no, r.status as record_status
                FROM batch_tracking bt
                LEFT JOIN raw_records r ON bt.record_id = r.id
                LEFT JOIN import_sessions s ON r.session_id = s.id
                WHERE bt.batch_no = ?
                ORDER BY bt.created_at
            """, (batch_no,))
            tracking = [dict(row) for row in cursor.fetchall()]
            report['batch_tracking'] = tracking
            
            affected_stores = set(t['store_id'] for t in tracking if t['store_id'])
            report['batch_info'] = {
                'batch_no': batch_no,
                'affected_stores': list(affected_stores),
                'store_count': len(affected_stores),
                'tracking_records': len(tracking)
            }
            
            cursor.execute("""
                SELECT 'sample' as type, COUNT(*) as count
                FROM sample_labels WHERE batch_no = ?
                UNION ALL
                SELECT 'temperature', COUNT(*) FROM temperature_records WHERE batch_no = ?
                UNION ALL
                SELECT 'complaint', COUNT(*) FROM store_complaints WHERE batch_no = ?
            """, (batch_no, batch_no, batch_no))
            for row in cursor.fetchall():
                report['batch_info'][f"{row['type']}_count"] = row['count']
        
        cursor.execute("SELECT CURRENT_TIMESTAMP as time")
        report['generated_at'] = cursor.fetchone()['time']
        
        return report


def get_daily_summary(date_str=None):
    with get_connection() as conn:
        cursor = conn.cursor()
        
        if date_str:
            sql = """
                SELECT DATE(imported_at) as import_date,
                       source_type,
                       COUNT(*) as session_count,
                       SUM(total_rows) as total_records,
                       SUM(valid_rows) as valid_records,
                       SUM(invalid_rows) as invalid_records
                FROM import_sessions
                WHERE DATE(imported_at) = ?
                GROUP BY DATE(imported_at), source_type
                ORDER BY import_date DESC, source_type
            """
            params = (date_str,)
        else:
            sql = """
                SELECT DATE(imported_at) as import_date,
                       source_type,
                       COUNT(*) as session_count,
                       SUM(total_rows) as total_records,
                       SUM(valid_rows) as valid_records,
                       SUM(invalid_rows) as invalid_records
                FROM import_sessions
                GROUP BY DATE(imported_at), source_type
                ORDER BY import_date DESC, source_type
                LIMIT 30
            """
            params = ()
        
        cursor.execute(sql, params)
        return [dict(row) for row in cursor.fetchall()]


def get_supervisor_dashboard():
    with get_connection() as conn:
        cursor = conn.cursor()
        
        dashboard = {}
        
        cursor.execute("""
            SELECT COUNT(*) as pending_sessions
            FROM import_sessions WHERE status IN ('imported', 'checked')
        """)
        dashboard['pending_sessions'] = cursor.fetchone()['pending_sessions']
        
        cursor.execute("""
            SELECT COUNT(*) as open_issues
            FROM record_issues WHERE status = 'open'
        """)
        dashboard['open_issues'] = cursor.fetchone()['open_issues']
        
        cursor.execute("""
            SELECT severity, COUNT(*) as count
            FROM record_issues
            WHERE status = 'open'
            GROUP BY severity
        """)
        dashboard['issues_by_severity'] = {row['severity']: row['count'] for row in cursor.fetchall()}
        
        cursor.execute("""
            SELECT issue_type, COUNT(*) as count
            FROM record_issues
            WHERE status = 'open'
            GROUP BY issue_type
            ORDER BY count DESC
            LIMIT 5
        """)
        dashboard['top_issues'] = [dict(row) for row in cursor.fetchall()]
        
        cursor.execute("""
            SELECT s.id, s.source_type, s.file_name, s.imported_by,
                   s.imported_at, s.status, s.invalid_rows
            FROM import_sessions s
            WHERE s.status != 'verified'
            ORDER BY s.imported_at DESC
            LIMIT 10
        """)
        dashboard['recent_sessions'] = [dict(row) for row in cursor.fetchall()]
        
        return dashboard
