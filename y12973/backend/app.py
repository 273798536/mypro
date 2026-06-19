import os
import json
import hashlib
import sqlite3
import datetime
from io import BytesIO
from functools import wraps
from flask import Flask, request, jsonify, g, send_file
from flask_cors import CORS
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'data', 'review.db')
ALLOWED_ENTRY_POINTS = ['slow_query', 'backup_check', 'manual']

app = Flask(__name__)
CORS(app)


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.executescript('''
        CREATE TABLE IF NOT EXISTS snapshot_batch (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_no VARCHAR(64) NOT NULL UNIQUE,
            import_time DATETIME NOT NULL,
            import_user VARCHAR(64),
            source VARCHAR(32),
            data_hash VARCHAR(128) NOT NULL,
            status VARCHAR(16) DEFAULT 'active',
            remark TEXT,
            entry_point VARCHAR(32)
        );
        CREATE INDEX IF NOT EXISTS idx_snapshot_batch_hash ON snapshot_batch(data_hash);
        CREATE INDEX IF NOT EXISTS idx_snapshot_batch_entry ON snapshot_batch(entry_point);

        CREATE TABLE IF NOT EXISTS migration_script (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            script_name VARCHAR(256) NOT NULL,
            script_path VARCHAR(512) NOT NULL,
            script_hash VARCHAR(128) NOT NULL,
            related_tables TEXT,
            execute_time DATETIME,
            status VARCHAR(16) DEFAULT 'pending',
            created_at DATETIME NOT NULL,
            content TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_migration_script_hash ON migration_script(script_hash);

        CREATE TABLE IF NOT EXISTS table_schema_snapshot (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER NOT NULL,
            table_name VARCHAR(128) NOT NULL,
            schema_json TEXT NOT NULL,
            partition_info TEXT,
            checksum VARCHAR(128) NOT NULL,
            tenant_id VARCHAR(64),
            account_set VARCHAR(64),
            row_count BIGINT,
            data_size BIGINT,
            FOREIGN KEY (batch_id) REFERENCES snapshot_batch(id)
        );
        CREATE INDEX IF NOT EXISTS idx_schema_batch ON table_schema_snapshot(batch_id);
        CREATE INDEX IF NOT EXISTS idx_schema_table ON table_schema_snapshot(table_name);
        CREATE INDEX IF NOT EXISTS idx_schema_tenant ON table_schema_snapshot(tenant_id, account_set);

        CREATE TABLE IF NOT EXISTS review_conclusion (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER NOT NULL,
            table_snapshot_id INTEGER,
            conclusion_type VARCHAR(32) NOT NULL,
            conclusion_content TEXT NOT NULL,
            reviewer VARCHAR(64),
            review_time DATETIME NOT NULL,
            status VARCHAR(16) DEFAULT 'draft',
            correction_reason TEXT,
            migration_script_ref VARCHAR(128),
            is_latest BOOLEAN NOT NULL DEFAULT 1,
            parent_id INTEGER,
            FOREIGN KEY (batch_id) REFERENCES snapshot_batch(id),
            FOREIGN KEY (table_snapshot_id) REFERENCES table_schema_snapshot(id),
            FOREIGN KEY (parent_id) REFERENCES review_conclusion(id)
        );
        CREATE INDEX IF NOT EXISTS idx_conclusion_batch ON review_conclusion(batch_id);
        CREATE INDEX IF NOT EXISTS idx_conclusion_latest ON review_conclusion(is_latest);
        CREATE INDEX IF NOT EXISTS idx_conclusion_migration ON review_conclusion(migration_script_ref);

        CREATE TABLE IF NOT EXISTS review_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conclusion_id INTEGER NOT NULL,
            action_type VARCHAR(32) NOT NULL,
            old_value TEXT,
            new_value TEXT,
            operator VARCHAR(64),
            operate_time DATETIME NOT NULL,
            reason TEXT,
            FOREIGN KEY (conclusion_id) REFERENCES review_conclusion(id)
        );
        CREATE INDEX IF NOT EXISTS idx_history_conclusion ON review_history(conclusion_id);
    ''')

    conn.commit()
    conn.close()


def compute_data_hash(schema_list):
    sorted_schemas = sorted(schema_list, key=lambda x: (x.get('tenant_id', ''), x.get('account_set', ''), x.get('table_name', '')))
    raw = json.dumps(sorted_schemas, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def compute_table_checksum(table_item):
    raw = json.dumps({
        'table_name': table_item.get('table_name'),
        'schema_json': table_item.get('schema_json'),
        'partition_info': table_item.get('partition_info'),
        'tenant_id': table_item.get('tenant_id'),
        'account_set': table_item.get('account_set'),
    }, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def row_to_dict(row):
    if row is None:
        return None
    return dict(row)


def rows_to_dict_list(rows):
    return [row_to_dict(r) for r in rows]


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'time': datetime.datetime.now().isoformat()})


@app.route('/api/batches', methods=['GET'])
def list_batches():
    db = get_db()
    entry_point = request.args.get('entry_point')
    status = request.args.get('status')

    sql = "SELECT * FROM snapshot_batch WHERE 1=1"
    params = []
    if entry_point:
        sql += " AND entry_point = ?"
        params.append(entry_point)
    if status:
        sql += " AND status = ?"
        params.append(status)
    sql += " ORDER BY import_time DESC"

    rows = db.execute(sql, params).fetchall()
    batches = rows_to_dict_list(rows)

    for b in batches:
        b['table_count'] = db.execute(
            "SELECT COUNT(*) FROM table_schema_snapshot WHERE batch_id = ?",
            (b['id'],)
        ).fetchone()[0]
        b['conclusion_count'] = db.execute(
            "SELECT COUNT(*) FROM review_conclusion WHERE batch_id = ? AND is_latest = 1",
            (b['id'],)
        ).fetchone()[0]

    return jsonify({'code': 0, 'data': batches})


@app.route('/api/batches/<int:batch_id>', methods=['GET'])
def get_batch_detail(batch_id):
    db = get_db()
    batch = db.execute("SELECT * FROM snapshot_batch WHERE id = ?", (batch_id,)).fetchone()
    if not batch:
        return jsonify({'code': 404, 'msg': 'batch not found'}), 404

    result = row_to_dict(batch)
    result['tables'] = rows_to_dict_list(db.execute(
        "SELECT * FROM table_schema_snapshot WHERE batch_id = ? ORDER BY table_name",
        (batch_id,)
    ).fetchall())
    result['conclusions'] = rows_to_dict_list(db.execute(
        "SELECT * FROM review_conclusion WHERE batch_id = ? AND is_latest = 1 ORDER BY review_time DESC",
        (batch_id,)
    ).fetchall())

    for c in result['conclusions']:
        if c.get('migration_script_ref'):
            ms = db.execute(
                "SELECT * FROM migration_script WHERE script_hash = ? OR script_name = ?",
                (c['migration_script_ref'], c['migration_script_ref'])
            ).fetchone()
            c['migration_script'] = row_to_dict(ms)

    return jsonify({'code': 0, 'data': result})


@app.route('/api/batches/import', methods=['POST'])
def import_batch():
    db = get_db()
    data = request.get_json(force=True)
    import_user = data.get('import_user', 'system')
    source = data.get('source', 'api')
    remark = data.get('remark', '')
    entry_point = data.get('entry_point', 'manual')
    schemas = data.get('schemas', [])

    if entry_point not in ALLOWED_ENTRY_POINTS:
        return jsonify({'code': 400, 'msg': f'entry_point must be one of {ALLOWED_ENTRY_POINTS}'}), 400

    if not schemas:
        return jsonify({'code': 400, 'msg': 'schemas is required and cannot be empty'}), 400

    data_hash = compute_data_hash(schemas)

    existing = db.execute(
        "SELECT * FROM snapshot_batch WHERE data_hash = ? AND status = 'active' ORDER BY import_time DESC LIMIT 1",
        (data_hash,)
    ).fetchone()

    if existing:
        return jsonify({
            'code': 0,
            'data': {
                'action': 'skipped',
                'batch_id': existing['id'],
                'batch_no': existing['batch_no'],
                'message': 'Duplicate data_hash detected, returned existing batch',
                'data_hash': data_hash,
            }
        })

    now = datetime.datetime.now()
    batch_no = f"SNAP-{now.strftime('%Y%m%d%H%M%S')}-{os.urandom(2).hex().upper()}"

    cursor = db.cursor()
    cursor.execute(
        '''INSERT INTO snapshot_batch
           (batch_no, import_time, import_user, source, data_hash, status, remark, entry_point)
           VALUES (?, ?, ?, ?, ?, 'active', ?, ?)''',
        (batch_no, now.isoformat(), import_user, source, data_hash, remark, entry_point)
    )
    batch_id = cursor.lastrowid

    for schema_item in schemas:
        checksum = compute_table_checksum(schema_item)
        cursor.execute(
            '''INSERT INTO table_schema_snapshot
               (batch_id, table_name, schema_json, partition_info, checksum,
                tenant_id, account_set, row_count, data_size)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (
                batch_id,
                schema_item.get('table_name', ''),
                json.dumps(schema_item.get('schema_json', {}), ensure_ascii=False),
                json.dumps(schema_item.get('partition_info', {}), ensure_ascii=False) if schema_item.get('partition_info') else None,
                checksum,
                schema_item.get('tenant_id'),
                schema_item.get('account_set'),
                schema_item.get('row_count', 0),
                schema_item.get('data_size', 0),
            )
        )

    db.commit()

    return jsonify({
        'code': 0,
        'data': {
            'action': 'created',
            'batch_id': batch_id,
            'batch_no': batch_no,
            'data_hash': data_hash,
            'table_count': len(schemas),
        }
    })


@app.route('/api/conclusions', methods=['POST'])
def create_conclusion():
    db = get_db()
    data = request.get_json(force=True)
    batch_id = data.get('batch_id')
    table_snapshot_id = data.get('table_snapshot_id')
    conclusion_type = data.get('conclusion_type', 'general')
    conclusion_content = data.get('conclusion_content', '')
    reviewer = data.get('reviewer', 'sre')
    status = data.get('status', 'draft')
    correction_reason = data.get('correction_reason')
    migration_script_ref = data.get('migration_script_ref')
    parent_id = data.get('parent_id')

    if not batch_id:
        return jsonify({'code': 400, 'msg': 'batch_id is required'}), 400
    if not conclusion_content:
        return jsonify({'code': 400, 'msg': 'conclusion_content is required'}), 400

    batch = db.execute("SELECT id FROM snapshot_batch WHERE id = ?", (batch_id,)).fetchone()
    if not batch:
        return jsonify({'code': 404, 'msg': 'batch not found'}), 404

    now = datetime.datetime.now().isoformat()
    cursor = db.cursor()

    if parent_id:
        cursor.execute(
            "UPDATE review_conclusion SET is_latest = 0 WHERE id = ?",
            (parent_id,)
        )
        old_row = db.execute(
            "SELECT * FROM review_conclusion WHERE id = ?", (parent_id,)
        ).fetchone()
        if old_row:
            cursor.execute(
                '''INSERT INTO review_history
                   (conclusion_id, action_type, old_value, new_value, operator, operate_time, reason)
                   VALUES (?, 'correction', ?, ?, ?, ?, ?)''',
                (
                    parent_id,
                    old_row['conclusion_content'],
                    conclusion_content,
                    reviewer,
                    now,
                    correction_reason or 'manual correction',
                )
            )

    cursor.execute(
        '''INSERT INTO review_conclusion
           (batch_id, table_snapshot_id, conclusion_type, conclusion_content,
            reviewer, review_time, status, correction_reason, migration_script_ref,
            is_latest, parent_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)''',
        (
            batch_id, table_snapshot_id, conclusion_type, conclusion_content,
            reviewer, now, status, correction_reason, migration_script_ref,
            parent_id,
        )
    )
    conclusion_id = cursor.lastrowid

    cursor.execute(
        '''INSERT INTO review_history
           (conclusion_id, action_type, old_value, new_value, operator, operate_time, reason)
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        (
            conclusion_id,
            'create' if not parent_id else 'supersede',
            None,
            conclusion_content,
            reviewer,
            now,
            correction_reason or '',
        )
    )

    db.commit()

    return jsonify({
        'code': 0,
        'data': {'conclusion_id': conclusion_id, 'review_time': now}
    })


@app.route('/api/conclusions/<int:conclusion_id>/history', methods=['GET'])
def get_conclusion_history(conclusion_id):
    db = get_db()
    chain = []
    current = db.execute(
        "SELECT * FROM review_conclusion WHERE id = ?", (conclusion_id,)
    ).fetchone()

    visited = set()
    while current and current['id'] not in visited:
        visited.add(current['id'])
        current_dict = row_to_dict(current)
        current_dict['history_entries'] = rows_to_dict_list(db.execute(
            "SELECT * FROM review_history WHERE conclusion_id = ? ORDER BY operate_time",
            (current['id'],)
        ).fetchall())
        chain.append(current_dict)
        if current['parent_id']:
            current = db.execute(
                "SELECT * FROM review_conclusion WHERE id = ?", (current['parent_id'],)
            ).fetchone()
        else:
            current = None

    return jsonify({'code': 0, 'data': chain})


@app.route('/api/migration_scripts', methods=['POST'])
def register_migration_script():
    db = get_db()
    data = request.get_json(force=True)
    script_name = data.get('script_name')
    script_path = data.get('script_path')
    content = data.get('content', '')
    related_tables = data.get('related_tables')
    status = data.get('status', 'pending')

    if not script_name or not script_path:
        return jsonify({'code': 400, 'msg': 'script_name and script_path are required'}), 400

    raw = f"{script_name}|{script_path}|{content}"
    script_hash = hashlib.sha256(raw.encode('utf-8')).hexdigest()

    existing = db.execute(
        "SELECT * FROM migration_script WHERE script_hash = ?", (script_hash,)
    ).fetchone()
    if existing:
        return jsonify({
            'code': 0,
            'data': {
                'action': 'skipped',
                'script_id': existing['id'],
                'script_hash': script_hash,
                'message': 'Duplicate script detected',
            }
        })

    now = datetime.datetime.now().isoformat()
    cursor = db.cursor()
    cursor.execute(
        '''INSERT INTO migration_script
           (script_name, script_path, script_hash, related_tables, status, created_at, content)
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        (
            script_name, script_path, script_hash,
            json.dumps(related_tables, ensure_ascii=False) if related_tables else None,
            status, now, content,
        )
    )
    db.commit()

    return jsonify({
        'code': 0,
        'data': {
            'action': 'created',
            'script_id': cursor.lastrowid,
            'script_hash': script_hash,
        }
    })


@app.route('/api/migration_scripts/<identifier>', methods=['GET'])
def get_migration_script(identifier):
    db = get_db()
    row = db.execute(
        "SELECT * FROM migration_script WHERE script_hash = ? OR script_name = ? OR id = ?",
        (identifier, identifier, identifier if identifier.isdigit() else -1)
    ).fetchone()
    if not row:
        return jsonify({'code': 404, 'msg': 'script not found'}), 404

    result = row_to_dict(row)
    result['linked_conclusions'] = rows_to_dict_list(db.execute(
        '''SELECT rc.*, sb.batch_no, sb.import_time
           FROM review_conclusion rc
           JOIN snapshot_batch sb ON rc.batch_id = sb.id
           WHERE rc.migration_script_ref = ? OR rc.migration_script_ref = ?
           ORDER BY rc.review_time DESC''',
        (row['script_hash'], row['script_name'])
    ).fetchall())

    return jsonify({'code': 0, 'data': result})


@app.route('/api/dashboard/stats', methods=['GET'])
def dashboard_stats():
    db = get_db()
    entry_point = request.args.get('entry_point')

    sql_total = "SELECT COUNT(*) FROM snapshot_batch"
    sql_active = "SELECT COUNT(*) FROM snapshot_batch WHERE status = 'active'"
    sql_concluded = "SELECT COUNT(DISTINCT batch_id) FROM review_conclusion WHERE status = 'confirmed' AND is_latest = 1"
    params = []
    params_ep = []
    if entry_point:
        sql_total += " WHERE entry_point = ?"
        sql_active += " AND entry_point = ?" if 'WHERE' in sql_active else " WHERE entry_point = ?"
        sql_concluded += " AND batch_id IN (SELECT id FROM snapshot_batch WHERE entry_point = ?)"
        params = [entry_point]
        params_ep = [entry_point]

    total_batches = db.execute(sql_total, params).fetchone()[0]
    active_batches = db.execute(sql_active, params if 'WHERE' in sql_active else []).fetchone()[0]
    concluded_batches = db.execute(sql_concluded, params_ep).fetchone()[0]

    by_type = rows_to_dict_list(db.execute(
        '''SELECT conclusion_type, COUNT(*) as cnt
           FROM review_conclusion
           WHERE is_latest = 1
           GROUP BY conclusion_type'''
    ).fetchall())

    by_entry = rows_to_dict_list(db.execute(
        '''SELECT entry_point, COUNT(*) as cnt
           FROM snapshot_batch
           GROUP BY entry_point'''
    ).fetchall())

    recent_batches = rows_to_dict_list(db.execute(
        '''SELECT sb.*,
                  (SELECT COUNT(*) FROM table_schema_snapshot WHERE batch_id = sb.id) as table_count,
                  (SELECT COUNT(*) FROM review_conclusion WHERE batch_id = sb.id AND is_latest = 1) as conclusion_count
           FROM snapshot_batch sb
           ORDER BY sb.import_time DESC
           LIMIT 10'''
    ).fetchall())

    return jsonify({
        'code': 0,
        'data': {
            'total_batches': total_batches,
            'active_batches': active_batches,
            'concluded_batches': concluded_batches,
            'unreviewed_batches': active_batches - concluded_batches,
            'by_type': by_type,
            'by_entry_point': by_entry,
            'recent_batches': recent_batches,
        }
    })


@app.route('/api/batches/<int:batch_id>/download', methods=['GET'])
def download_batch(batch_id):
    db = get_db()
    batch = db.execute("SELECT * FROM snapshot_batch WHERE id = ?", (batch_id,)).fetchone()
    if not batch:
        return jsonify({'code': 404, 'msg': 'batch not found'}), 404

    fmt = request.args.get('format', 'csv')

    tables = rows_to_dict_list(db.execute(
        '''SELECT tss.*, sb.batch_no, sb.import_time, sb.entry_point
           FROM table_schema_snapshot tss
           JOIN snapshot_batch sb ON tss.batch_id = sb.id
           WHERE tss.batch_id = ?
           ORDER BY tss.table_name''',
        (batch_id,)
    ).fetchall())

    for t in tables:
        try:
            t['schema_json'] = json.dumps(json.loads(t['schema_json']), ensure_ascii=False, indent=2)
        except Exception:
            pass
        try:
            if t.get('partition_info'):
                t['partition_info'] = json.dumps(json.loads(t['partition_info']), ensure_ascii=False, indent=2)
        except Exception:
            pass

    conclusions = rows_to_dict_list(db.execute(
        '''SELECT rc.*, sb.batch_no
           FROM review_conclusion rc
           JOIN snapshot_batch sb ON rc.batch_id = sb.id
           WHERE rc.batch_id = ? AND rc.is_latest = 1
           ORDER BY rc.review_time DESC''',
        (batch_id,)
    ).fetchall())

    output = BytesIO()
    if fmt == 'xlsx':
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            pd.DataFrame(tables).to_excel(writer, sheet_name='表结构快照', index=False)
            pd.DataFrame(conclusions).to_excel(writer, sheet_name='复核结论', index=False)
            batch_df = pd.DataFrame([row_to_dict(batch)])
            batch_df.to_excel(writer, sheet_name='批次信息', index=False)
        filename = f"review_batch_{batch['batch_no']}.xlsx"
        mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    else:
        csv_parts = []
        csv_parts.append("# 批次信息")
        csv_parts.append(pd.DataFrame([row_to_dict(batch)]).to_csv(index=False))
        csv_parts.append("\n# 表结构快照")
        csv_parts.append(pd.DataFrame(tables).to_csv(index=False))
        csv_parts.append("\n# 复核结论")
        csv_parts.append(pd.DataFrame(conclusions).to_csv(index=False))
        output.write('\n'.join(csv_parts).encode('utf-8'))
        filename = f"review_batch_{batch['batch_no']}.csv"
        mimetype = 'text/csv; charset=utf-8'

    output.seek(0)
    return send_file(
        output,
        mimetype=mimetype,
        as_attachment=True,
        download_name=filename,
    )


@app.route('/api/compare_batches', methods=['GET'])
def compare_batches():
    db = get_db()
    batch_a = request.args.get('batch_a')
    batch_b = request.args.get('batch_b')
    if not batch_a or not batch_b:
        return jsonify({'code': 400, 'msg': 'batch_a and batch_b are required'}), 400

    def fetch_tables(bid):
        return {
            r['table_name']: row_to_dict(r)
            for r in db.execute(
                "SELECT * FROM table_schema_snapshot WHERE batch_id = ?", (bid,)
            ).fetchall()
        }

    ta = fetch_tables(batch_a)
    tb = fetch_tables(batch_b)

    all_tables = sorted(set(ta.keys()) | set(tb.keys()))
    diffs = []
    for name in all_tables:
        a = ta.get(name)
        b = tb.get(name)
        status = 'same'
        changes = []
        if a and b:
            if a['checksum'] != b['checksum']:
                status = 'modified'
                for field in ['schema_json', 'partition_info', 'tenant_id', 'account_set']:
                    va = a.get(field)
                    vb = b.get(field)
                    if va != vb:
                        changes.append({'field': field, 'from': va, 'to': vb})
            for field in ['row_count', 'data_size']:
                va = a.get(field)
                vb = b.get(field)
                if va != vb:
                    status = 'modified'
                    changes.append({'field': field, 'from': va, 'to': vb})
        elif a and not b:
            status = 'removed'
        elif b and not a:
            status = 'added'
        diffs.append({
            'table_name': name,
            'status': status,
            'changes': changes or None,
        })

    return jsonify({
        'code': 0,
        'data': {
            'batch_a': batch_a,
            'batch_b': batch_b,
            'diffs': diffs,
            'summary': {
                'added': sum(1 for d in diffs if d['status'] == 'added'),
                'removed': sum(1 for d in diffs if d['status'] == 'removed'),
                'modified': sum(1 for d in diffs if d['status'] == 'modified'),
                'same': sum(1 for d in diffs if d['status'] == 'same'),
            }
        }
    })


if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5010))
    app.run(host='127.0.0.1', port=port, debug=False)
