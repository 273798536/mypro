import sys
import os
import json
from flask import Flask, request, jsonify

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.db import init_database, execute_query
from src.data_import import DataImporter
from src.lineage_analyzer import LineageAnalyzer
from src.migration_manager import MigrationManager
from src.permission_manager import PermissionManager

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')


def get_user_id():
    return request.headers.get('X-User-Id', 'U001')


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': '报表口径血缘追踪API服务运行中'})


@app.route('/api/init', methods=['POST'])
def init_db():
    result = init_database()
    return jsonify({
        'status': 'success',
        'initialized': result,
        'message': '数据库初始化完成' if result else '数据库已存在'
    })


@app.route('/api/import/slow-logs', methods=['POST'])
def import_slow_logs():
    user_id = get_user_id()
    data = request.get_json() or {}
    mode = data.get('mode', 'standard')
    file_path = data.get('file_path', os.path.join(DATA_DIR, 'slow_query_logs.json'))
    
    if not os.path.exists(file_path):
        return jsonify({'status': 'error', 'reason': f'文件不存在: {file_path}'}), 400
    
    importer = DataImporter()
    result = importer.import_slow_query_logs(file_path, user_id, mode=mode)
    
    return jsonify({
        'status': 'success',
        'mode': mode,
        'batch_id': importer.batch_id,
        'stats': result
    })


@app.route('/api/import/dictionary', methods=['POST'])
def import_dictionary():
    file_path = os.path.join(DATA_DIR, 'data_dictionary.json')
    importer = DataImporter()
    result = importer.import_data_dictionary(file_path)
    return jsonify({'status': 'success', 'stats': result})


@app.route('/api/import/migrations', methods=['POST'])
def import_migrations():
    file_path = os.path.join(DATA_DIR, 'migrations.json')
    importer = DataImporter()
    result = importer.import_migrations(file_path)
    return jsonify({'status': 'success', 'stats': result})


@app.route('/api/import/permissions', methods=['POST'])
def import_permissions():
    file_path = os.path.join(DATA_DIR, 'permissions.json')
    importer = DataImporter()
    result = importer.import_permissions(file_path)
    return jsonify({'status': 'success', 'stats': result})


@app.route('/api/slow-logs', methods=['GET'])
def list_slow_logs():
    include_dirty = request.args.get('include_dirty', 'false').lower() == 'true'
    
    if include_dirty:
        logs = execute_query("SELECT * FROM slow_query_logs ORDER BY execution_date DESC")
    else:
        logs = execute_query("SELECT * FROM slow_query_logs WHERE is_dirty = 0 ORDER BY execution_date DESC")
    
    return jsonify({
        'status': 'success',
        'count': len(logs),
        'data': logs
    })


@app.route('/api/slow-logs/<log_id>/confirm', methods=['POST'])
def confirm_slow_log(log_id):
    user_id = get_user_id()
    data = request.get_json() or {}
    corrected_fields = data.get('corrected_fields')
    reason = data.get('reason', '人工确认')
    
    importer = DataImporter()
    result = importer.manually_confirm(log_id, user_id, corrected_fields, reason)
    
    return jsonify(result)


@app.route('/api/analyze/<log_id>', methods=['POST'])
def analyze_log(log_id):
    user_id = get_user_id()
    analyzer = LineageAnalyzer(user_id)
    result = analyzer.analyze_log(log_id)
    return jsonify(result)


@app.route('/api/analyze/all', methods=['POST'])
def analyze_all():
    user_id = get_user_id()
    data = request.get_json() or {}
    include_dirty = data.get('include_dirty', False)
    
    analyzer = LineageAnalyzer(user_id)
    result = analyzer.analyze_all(include_dirty=include_dirty)
    return jsonify(result)


@app.route('/api/lineage', methods=['GET'])
def list_lineage():
    report_name = request.args.get('report_name')
    
    if report_name:
        lineages = execute_query(
            "SELECT * FROM lineage_tracking WHERE report_name = ? AND is_active = 1 ORDER BY analysis_version DESC",
            (report_name,)
        )
    else:
        lineages = execute_query(
            "SELECT * FROM lineage_tracking WHERE is_active = 1 ORDER BY report_name, analysis_version DESC"
        )
    
    return jsonify({
        'status': 'success',
        'count': len(lineages),
        'data': lineages
    })


@app.route('/api/lineage/report/<report_name>', methods=['GET'])
def get_report_lineage(report_name):
    user_id = get_user_id()
    analyzer = LineageAnalyzer(user_id)
    result = analyzer.get_report_lineage(report_name)
    return jsonify(result)


@app.route('/api/lineage/<lineage_id>/confirm', methods=['POST'])
def confirm_lineage(lineage_id):
    user_id = get_user_id()
    analyzer = LineageAnalyzer(user_id)
    result = analyzer.confirm_lineage(lineage_id, user_id)
    return jsonify(result)


@app.route('/api/snapshot', methods=['POST'])
def create_snapshot():
    user_id = get_user_id()
    data = request.get_json() or {}
    report_name = data.get('report_name')
    snapshot_type = data.get('snapshot_type', 'analysis')
    baseline_id = data.get('baseline_snapshot_id')
    
    analyzer = LineageAnalyzer(user_id)
    result = analyzer.create_snapshot(report_name, snapshot_type, baseline_id)
    return jsonify(result)


@app.route('/api/snapshot/compare', methods=['POST'])
def compare_snapshots():
    user_id = get_user_id()
    data = request.get_json() or {}
    snapshot1 = data.get('snapshot_id_1')
    snapshot2 = data.get('snapshot_id_2')
    
    if not snapshot1 or not snapshot2:
        return jsonify({'status': 'error', 'reason': '需要提供两个快照ID'}), 400
    
    analyzer = LineageAnalyzer(user_id)
    result = analyzer.compare_snapshots(snapshot1, snapshot2)
    return jsonify(result)


@app.route('/api/snapshots', methods=['GET'])
def list_snapshots():
    snapshots = execute_query(
        "SELECT * FROM analysis_snapshots ORDER BY created_at DESC"
    )
    return jsonify({
        'status': 'success',
        'count': len(snapshots),
        'data': snapshots
    })


@app.route('/api/migrations', methods=['GET'])
def list_migrations():
    manager = MigrationManager()
    result = manager.get_migration_history()
    return jsonify(result)


@app.route('/api/migration/<migration_id>/execute', methods=['POST'])
def execute_migration(migration_id):
    user_id = get_user_id()
    data = request.get_json() or {}
    simulate = data.get('simulate', False)
    
    manager = MigrationManager(user_id)
    result = manager.execute_migration(migration_id, simulate=simulate)
    return jsonify(result)


@app.route('/api/migration/<migration_id>/rollback', methods=['POST'])
def rollback_migration(migration_id):
    user_id = get_user_id()
    data = request.get_json() or {}
    reason = data.get('reason', '')
    
    manager = MigrationManager(user_id)
    result = manager.rollback_migration(migration_id, reason)
    return jsonify(result)


@app.route('/api/rollback-history', methods=['GET'])
def list_rollback_history():
    manager = MigrationManager()
    original_migration_id = request.args.get('original_migration_id')
    result = manager.get_rollback_history(original_migration_id)
    return jsonify(result)


@app.route('/api/rollback/<rollback_id>/diff', methods=['GET'])
def get_rollback_diff(rollback_id):
    manager = MigrationManager()
    result = manager.get_rollback_diff(rollback_id)
    return jsonify(result)


@app.route('/api/permission/check', methods=['POST'])
def check_permission():
    data = request.get_json() or {}
    user_id = data.get('user_id')
    action = data.get('action')
    resource_type = data.get('resource_type')
    resource_id = data.get('resource_id')
    
    if not user_id or not action:
        return jsonify({'status': 'error', 'reason': '需要user_id和action参数'}), 400
    
    pm = PermissionManager()
    result = pm.check_permission(user_id, action, resource_type, resource_id)
    return jsonify(result)


@app.route('/api/permission/override', methods=['POST'])
def override_permission():
    data = request.get_json() or {}
    override_user_id = get_user_id()
    target_user_id = data.get('target_user_id') or data.get('user_id')
    action = data.get('action')
    resource_type = data.get('resource_type')
    resource_id = data.get('resource_id')
    audit_note = data.get('audit_note', '')
    
    if not target_user_id or not action:
        return jsonify({'status': 'error', 'reason': '需要target_user_id和action参数'}), 400
    
    pm = PermissionManager()
    result = pm.override_permission(override_user_id, action, resource_type, resource_id, audit_note, target_user_id)
    return jsonify(result)


@app.route('/api/permission/boundary-test', methods=['GET'])
def list_boundary_tests():
    pm = PermissionManager()
    return jsonify({
        'status': 'success',
        'test_cases': pm.get_boundary_test_cases()
    })


@app.route('/api/permission/boundary-test/<case_id>/run', methods=['POST'])
def run_boundary_test(case_id):
    data = request.get_json() or {}
    override = data.get('override', False)
    
    pm = PermissionManager()
    result = pm.run_boundary_test(case_id, override=override)
    return jsonify(result)


@app.route('/api/permission/audit-log', methods=['GET'])
def get_audit_log():
    user_id = request.args.get('user_id')
    pm = PermissionManager()
    result = pm.get_audit_log(user_id)
    return jsonify(result)


@app.route('/api/manual-confirmations', methods=['GET'])
def list_manual_confirmations():
    confirmations = execute_query(
        "SELECT * FROM manual_confirmations ORDER BY created_at DESC"
    )
    return jsonify({
        'status': 'success',
        'count': len(confirmations),
        'data': confirmations
    })


@app.route('/api/dictionary', methods=['GET'])
def list_dictionary():
    table_name = request.args.get('table_name')
    
    if table_name:
        dicts = execute_query(
            "SELECT * FROM data_dictionary WHERE table_name = ? ORDER BY version DESC",
            (table_name,)
        )
    else:
        dicts = execute_query(
            "SELECT * FROM data_dictionary ORDER BY table_name, version DESC"
        )
    
    return jsonify({
        'status': 'success',
        'count': len(dicts),
        'data': dicts
    })


@app.route('/api/stats', methods=['GET'])
def get_stats():
    log_stats = execute_query(
        "SELECT COUNT(*) as total, SUM(CASE WHEN is_dirty = 1 THEN 1 ELSE 0 END) as dirty, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active FROM slow_query_logs"
    )
    
    lineage_stats = execute_query(
        "SELECT COUNT(*) as total, SUM(CASE WHEN is_manual_confirmed = 1 THEN 1 ELSE 0 END) as confirmed FROM lineage_tracking WHERE is_active = 1"
    )
    
    migration_stats = execute_query(
        "SELECT status, COUNT(*) as count FROM migration_records GROUP BY status"
    )
    
    return jsonify({
        'status': 'success',
        'slow_logs': log_stats[0] if log_stats else {},
        'lineage': lineage_stats[0] if lineage_stats else {},
        'migrations': {m['status']: m['count'] for m in migration_stats}
    })


@app.errorhandler(404)
def not_found(e):
    return jsonify({'status': 'error', 'reason': '接口不存在'}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({'status': 'error', 'reason': f'服务器错误: {str(e)}'}), 500


if __name__ == '__main__':
    print("启动报表口径血缘追踪API服务...")
    print("服务地址: http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
