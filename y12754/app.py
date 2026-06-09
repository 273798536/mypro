from flask import Flask, request, jsonify, Response
from database import get_conn, init_db, seed_sample_data
from audit_service import run_audit, add_safety_remark
from report_generator import generate_report
from datetime import datetime
import json

app = Flask(__name__)


@app.route('/api/reagents', methods=['GET'])
def list_reagents():
    conn = get_conn()
    rows = conn.execute('SELECT * FROM reagents ORDER BY id').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/requisitions', methods=['POST'])
def create_requisition():
    data = request.get_json(force=True)
    required = ['reagent_id', 'concentration', 'quantity', 'project_group', 'applicant', 'apply_date']
    for f in required:
        if f not in data:
            return jsonify({'error': f'缺少必填字段: {f}'}), 400

    conn = get_conn()
    reagent = conn.execute('SELECT * FROM reagents WHERE id = ?', (data['reagent_id'],)).fetchone()
    if not reagent:
        conn.close()
        return jsonify({'error': '试剂不存在'}), 404

    req_no = data.get('req_no') or f"REQ{datetime.now().strftime('%Y%m%d%H%M%S')}"

    cur = conn.execute('''
        INSERT INTO requisitions (req_no, reagent_id, reagent_name, concentration, ph_value,
                                   quantity, unit, project_group, applicant, apply_date, purpose)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        req_no, data['reagent_id'], reagent['name'], data['concentration'],
        data.get('ph_value'), data['quantity'], data.get('unit', 'g'),
        data['project_group'], data['applicant'], data['apply_date'], data.get('purpose', '')
    ))
    req_id = cur.lastrowid

    conn.execute('''
        INSERT INTO audit_logs (requisition_id, action, detail, operator)
        VALUES (?, ?, ?, ?)
    ''', (req_id, 'requisition_created', f"创建领用单{req_no}", data.get('applicant', 'system')))

    conn.commit()
    conn.close()

    anomalies = run_audit(req_id)

    return jsonify({
        'id': req_id,
        'req_no': req_no,
        'status': 'rejected' if anomalies else 'approved',
        'anomalies': anomalies
    }), 201


@app.route('/api/requisitions', methods=['GET'])
def list_requisitions():
    conn = get_conn()
    rows = conn.execute('SELECT * FROM requisitions ORDER BY id DESC').fetchall()
    result = []
    for r in rows:
        d = dict(r)
        unresolved = conn.execute(
            'SELECT COUNT(*) FROM anomalies WHERE requisition_id = ? AND is_resolved = 0',
            (r['id'],)
        ).fetchone()[0]
        d['unresolved_anomalies'] = unresolved
        result.append(d)
    conn.close()
    return jsonify(result)


@app.route('/api/requisitions/<int:req_id>', methods=['GET'])
def get_requisition(req_id):
    conn = get_conn()
    req = conn.execute('SELECT * FROM requisitions WHERE id = ?', (req_id,)).fetchone()
    if not req:
        conn.close()
        return jsonify({'error': '领用记录不存在'}), 404
    result = dict(req)
    result['anomalies'] = [dict(a) for a in conn.execute(
        'SELECT * FROM anomalies WHERE requisition_id = ? ORDER BY created_at', (req_id,)
    ).fetchall()]
    result['remarks'] = [dict(r) for r in conn.execute(
        'SELECT * FROM safety_remarks WHERE requisition_id = ? ORDER BY created_at', (req_id,)
    ).fetchall()]
    result['balance_calculations'] = [dict(b) for b in conn.execute(
        'SELECT * FROM balance_calculations WHERE requisition_id = ? ORDER BY version', (req_id,)
    ).fetchall()]
    result['audit_logs'] = [dict(l) for l in conn.execute(
        'SELECT * FROM audit_logs WHERE requisition_id = ? ORDER BY created_at', (req_id,)
    ).fetchall()]
    conn.close()
    return jsonify(result)


@app.route('/api/requisitions/<int:req_id>/audit', methods=['POST'])
def rerun_audit(req_id):
    conn = get_conn()
    req = conn.execute('SELECT id FROM requisitions WHERE id = ?', (req_id,)).fetchone()
    conn.close()
    if not req:
        return jsonify({'error': '领用记录不存在'}), 404
    anomalies = run_audit(req_id)
    return jsonify({'anomalies': anomalies})


@app.route('/api/requisitions/<int:req_id>/remarks', methods=['POST'])
def add_remark(req_id):
    data = request.get_json(force=True)
    if 'remark_text' not in data or 'operator' not in data:
        return jsonify({'error': '缺少remark_text或operator字段'}), 400
    conn = get_conn()
    req = conn.execute('SELECT id FROM requisitions WHERE id = ?', (req_id,)).fetchone()
    conn.close()
    if not req:
        return jsonify({'error': '领用记录不存在'}), 404
    remark_id = add_safety_remark(req_id, data['remark_text'], data['operator'])
    return jsonify({'remark_id': remark_id, 'status': 'ok'}), 201


@app.route('/api/requisitions/<int:req_id>/report', methods=['GET'])
def get_report(req_id):
    report_text = generate_report(req_id)
    if report_text is None:
        return jsonify({'error': '领用记录不存在'}), 404
    fmt = request.args.get('format', 'text')
    if fmt == 'json':
        conn = get_conn()
        req = conn.execute('SELECT * FROM requisitions WHERE id = ?', (req_id,)).fetchone()
        anomalies = [dict(a) for a in conn.execute(
            'SELECT * FROM anomalies WHERE requisition_id = ? ORDER BY created_at', (req_id,)
        ).fetchall()]
        remarks = [dict(r) for r in conn.execute(
            'SELECT * FROM safety_remarks WHERE requisition_id = ? ORDER BY created_at', (req_id,)
        ).fetchall()]
        balances = [dict(b) for b in conn.execute(
            'SELECT * FROM balance_calculations WHERE requisition_id = ? ORDER BY version DESC', (req_id,)
        ).fetchall()]
        conn.close()
        return jsonify({
            'requisition': dict(req),
            'anomalies': anomalies,
            'remarks': remarks,
            'balance_calculations': balances,
            'plain_explanation': _extract_plain_explanation(report_text)
        })
    return Response(report_text, mimetype='text/plain; charset=utf-8')


def _extract_plain_explanation(report_text):
    start = report_text.find('【四、普通话说明')
    end = report_text.find('【五、')
    if start == -1 or end == -1:
        return ''
    section = report_text[start:end]
    lines = section.split('\n')[2:]
    return '\n'.join(l.strip() for l in lines if l.strip())


if __name__ == '__main__':
    init_db()
    seed_sample_data()
    app.run(host='0.0.0.0', port=5001, debug=False)
