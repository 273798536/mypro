import json
import os
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory, render_template_string
from init_db import init_db, seed_data

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'private_placement.db')

app = Flask(__name__, static_folder='static', static_url_path='/static')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d


def parse_dt(s):
    if not s:
        return None
    try:
        return datetime.strptime(s, '%Y-%m-%d %H:%M:%S')
    except (ValueError, TypeError):
        try:
            return datetime.strptime(s, '%Y-%m-%d')
        except (ValueError, TypeError):
            return None


def get_risk_label(level):
    labels = {1: 'C1-保守型', 2: 'C2-稳健型', 3: 'C3-平衡型', 4: 'C4-进取型', 5: 'C5-专业型'}
    return labels.get(level, '未知')


def get_product_risk_label(level):
    labels = {1: 'R1-低风险', 2: 'R2-中低风险', 3: 'R3-中风险', 4: 'R4-中高风险', 5: 'R5-高风险'}
    return labels.get(level, '未知')


@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


@app.route('/api/investors', methods=['GET'])
def list_investors():
    conn = get_db()
    conn.row_factory = dict_factory
    rows = conn.execute("SELECT * FROM investors ORDER BY id").fetchall()
    conn.close()
    return jsonify(rows)


@app.route('/api/investors', methods=['POST'])
def add_investor():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO investors (name, id_type, id_number, investor_type, contact, phone) VALUES (?,?,?,?,?,?)",
        (data['name'], data.get('id_type', '身份证'), data.get('id_number', ''),
         data.get('investor_type', '自然人'), data.get('contact', ''), data.get('phone', ''))
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': new_id, 'status': 'ok'})


@app.route('/api/investors/<int:investor_id>', methods=['PUT'])
def update_investor(investor_id):
    data = request.json
    conn = get_db()
    conn.execute(
        "UPDATE investors SET name=?, id_type=?, id_number=?, investor_type=?, contact=?, phone=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
        (data['name'], data.get('id_type', '身份证'), data.get('id_number', ''),
         data.get('investor_type', '自然人'), data.get('contact', ''), data.get('phone', ''), investor_id)
    )
    conn.commit()
    conn.close()
    return jsonify({'status': 'ok'})


@app.route('/api/investors/<int:investor_id>', methods=['DELETE'])
def delete_investor(investor_id):
    conn = get_db()
    conn.execute("DELETE FROM investors WHERE id=?", (investor_id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'ok'})


@app.route('/api/investors/<int:investor_id>/detail', methods=['GET'])
def investor_detail(investor_id):
    conn = get_db()
    conn.row_factory = dict_factory
    investor = conn.execute("SELECT * FROM investors WHERE id=?", (investor_id,)).fetchone()
    if not investor:
        conn.close()
        return jsonify({'error': 'not found'}), 404
    assessments = conn.execute(
        "SELECT * FROM risk_assessments WHERE investor_id=? ORDER BY assessment_date DESC", (investor_id,)
    ).fetchall()
    docs = conn.execute(
        "SELECT * FROM supporting_docs WHERE investor_id=? ORDER BY id DESC", (investor_id,)
    ).fetchall()
    conn.close()
    return jsonify({'investor': investor, 'assessments': assessments, 'docs': docs})


@app.route('/api/products', methods=['GET'])
def list_products():
    conn = get_db()
    conn.row_factory = dict_factory
    rows = conn.execute("SELECT * FROM products ORDER BY id").fetchall()
    conn.close()
    return jsonify(rows)


@app.route('/api/products', methods=['POST'])
def add_product():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    risk_level = data.get('risk_level', 1)
    cursor.execute(
        "INSERT INTO products (product_code, product_name, risk_level, risk_label, status) VALUES (?,?,?,?,?)",
        (data['product_code'], data['product_name'], risk_level,
         get_product_risk_label(risk_level), data.get('status', '在售'))
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': new_id, 'status': 'ok'})


@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    data = request.json
    conn = get_db()
    risk_level = data.get('risk_level', 1)
    conn.execute(
        "UPDATE products SET product_code=?, product_name=?, risk_level=?, risk_label=?, status=? WHERE id=?",
        (data['product_code'], data['product_name'], risk_level,
         get_product_risk_label(risk_level), data.get('status', '在售'), product_id)
    )
    conn.commit()
    conn.close()
    return jsonify({'status': 'ok'})


@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    conn = get_db()
    conn.execute("DELETE FROM products WHERE id=?", (product_id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'ok'})


@app.route('/api/risk-assessments', methods=['POST'])
def add_assessment():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    risk_level = data.get('risk_level', 1)
    assess_date = data.get('assessment_date', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    expiry_date = data.get('expiry_date') or (
        datetime.strptime(assess_date, '%Y-%m-%d %H:%M:%S') + timedelta(days=365)
    ).strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute(
        "INSERT INTO risk_assessments (investor_id, risk_score, risk_level, risk_label, assessment_date, expiry_date, source) VALUES (?,?,?,?,?,?,?)",
        (data['investor_id'], data.get('risk_score', 0), risk_level,
         get_risk_label(risk_level), assess_date, expiry_date, data.get('source', '线上测评'))
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': new_id, 'status': 'ok'})


@app.route('/api/risk-assessments/<int:assess_id>', methods=['DELETE'])
def delete_assessment(assess_id):
    conn = get_db()
    conn.execute("DELETE FROM risk_assessments WHERE id=?", (assess_id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'ok'})


@app.route('/api/supporting-docs', methods=['POST'])
def add_supporting_doc():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO supporting_docs (investor_id, doc_type, doc_name, doc_desc, source, verified, verified_by, verified_at) VALUES (?,?,?,?,?,?,?,?)",
        (data['investor_id'], data['doc_type'], data.get('doc_name', ''),
         data.get('doc_desc', ''), data.get('source', '投资者上传'), 0, None, None)
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': new_id, 'status': 'ok'})


@app.route('/api/supporting-docs/<int:doc_id>/verify', methods=['POST'])
def verify_doc(doc_id):
    data = request.json
    conn = get_db()
    conn.execute(
        "UPDATE supporting_docs SET verified=1, verified_by=?, verified_at=CURRENT_TIMESTAMP WHERE id=?",
        (data.get('verified_by', '系统管理员'), doc_id)
    )
    conn.commit()
    conn.close()
    return jsonify({'status': 'ok'})


@app.route('/api/supporting-docs/<int:doc_id>', methods=['DELETE'])
def delete_doc(doc_id):
    conn = get_db()
    conn.execute("DELETE FROM supporting_docs WHERE id=?", (doc_id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'ok'})


@app.route('/api/cooling-periods', methods=['POST'])
def add_cooling_period():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    start_date = data.get('start_date', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    end_date = data.get('end_date') or (
        datetime.strptime(start_date, '%Y-%m-%d %H:%M:%S') + timedelta(days=22)
    ).strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute(
        "INSERT INTO cooling_periods (investor_id, product_id, start_date, end_date, status) VALUES (?,?,?,?,?)",
        (data['investor_id'], data['product_id'], start_date, end_date, data.get('status', '进行中'))
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': new_id, 'status': 'ok'})


@app.route('/api/cooling-periods/<int:cp_id>', methods=['PUT'])
def update_cooling_period(cp_id):
    data = request.json
    conn = get_db()
    conn.execute(
        "UPDATE cooling_periods SET status=? WHERE id=?",
        (data.get('status', '进行中'), cp_id)
    )
    conn.commit()
    conn.close()
    return jsonify({'status': 'ok'})


@app.route('/api/cooling-periods/<int:cp_id>', methods=['DELETE'])
def delete_cooling_period(cp_id):
    conn = get_db()
    conn.execute("DELETE FROM cooling_periods WHERE id=?", (cp_id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'ok'})


@app.route('/api/investors/<int:investor_id>/products/<int:product_id>/cooling-status', methods=['GET'])
def check_cooling_status(investor_id, product_id):
    conn = get_db()
    conn.row_factory = dict_factory
    cps = conn.execute(
        "SELECT * FROM cooling_periods WHERE investor_id=? AND product_id=? ORDER BY start_date DESC",
        (investor_id, product_id)
    ).fetchall()
    conn.close()
    now = datetime.now()
    cooling_ok = False
    current_cp = None
    for cp in cps:
        end_dt = parse_dt(cp['end_date'])
        if end_dt and now >= end_dt:
            if cp['status'] == '已完成':
                cooling_ok = True
            elif cp['status'] != '已取消':
                current_cp = cp
        elif end_dt and now < end_dt and cp['status'] == '进行中':
            current_cp = cp
            break
    return jsonify({
        'cooling_ok': cooling_ok,
        'current_cooling': current_cp,
        'history': cps
    })


def check_assessment_expiry(assessments):
    if not assessments:
        return {'valid': False, 'reason': '无风险测评记录', 'current': None}
    now = datetime.now()
    latest = assessments[0]
    expiry = parse_dt(latest['expiry_date'])
    if expiry and now > expiry:
        return {'valid': False, 'reason': f"风险测评已过期（过期时间：{latest['expiry_date']}）", 'current': latest}
    return {'valid': True, 'reason': '', 'current': latest}


def check_docs_complete(docs):
    required_docs = {
        '自然人': ['身份证明', '资产证明', '收入证明'],
        '机构': ['营业执照', '资产证明'],
    }
    if not docs:
        return {'complete': False, 'missing': ['无材料'], 'verified_count': 0}
    doc_types = set()
    verified_count = 0
    for d in docs:
        if d.get('verified') == 1:
            verified_count += 1
            doc_types.add(d['doc_type'])
    required = required_docs.get('自然人', required_docs['自然人'])
    missing = [r for r in required if r not in doc_types]
    return {'complete': len(missing) == 0, 'missing': missing, 'verified_count': verified_count}


def check_risk_match(investor_level, product_level):
    if investor_level >= product_level:
        return {'match': True, 'detail': f"投资者等级C{investor_level} ≥ 产品风险R{product_level}"}
    return {'match': False, 'detail': f"投资者等级C{investor_level} < 产品风险R{product_level}，需要确认"}


@app.route('/api/suitability/check', methods=['POST'])
def check_suitability():
    data = request.json
    investor_id = data['investor_id']
    product_id = data['product_id']

    conn = get_db()
    conn.row_factory = dict_factory

    investor = conn.execute("SELECT * FROM investors WHERE id=?", (investor_id,)).fetchone()
    if not investor:
        conn.close()
        return jsonify({'error': '投资者不存在'}), 404
    product = conn.execute("SELECT * FROM products WHERE id=?", (product_id,)).fetchone()
    if not product:
        conn.close()
        return jsonify({'error': '产品不存在'}), 404

    assessments = conn.execute(
        "SELECT * FROM risk_assessments WHERE investor_id=? ORDER BY assessment_date DESC", (investor_id,)
    ).fetchall()
    docs = conn.execute(
        "SELECT * FROM supporting_docs WHERE investor_id=? ORDER BY id DESC", (investor_id,)
    ).fetchall()

    cps = conn.execute(
        "SELECT * FROM cooling_periods WHERE investor_id=? AND product_id=? ORDER BY start_date DESC",
        (investor_id, product_id)
    ).fetchall()
    conn.close()

    assess_status = check_assessment_expiry(assessments)
    doc_status = check_docs_complete(docs)

    now = datetime.now()
    cooling_ok = False
    current_cp = None
    for cp in cps:
        end_dt = parse_dt(cp['end_date'])
        if end_dt and now >= end_dt and cp['status'] == '已完成':
            cooling_ok = True
        elif end_dt and now < end_dt and cp['status'] == '进行中':
            current_cp = cp

    risk_status = {'match': False, 'detail': '无有效测评'}
    if assess_status['valid'] and assess_status['current']:
        risk_status = check_risk_match(assess_status['current']['risk_level'], product['risk_level'])

    issues = []
    if not assess_status['valid']:
        issues.append(assess_status['reason'])
    if not doc_status['complete']:
        issues.append(f"材料缺失：{', '.join(doc_status['missing'])}")
    if not cooling_ok:
        if current_cp:
            end_str = current_cp['end_date']
            issues.append(f"冷静期未满（到期：{end_str}）")
        else:
            issues.append("未设置冷静期或冷静期未完成")
    if not risk_status['match']:
        issues.append(risk_status['detail'])

    all_ok = assess_status['valid'] and doc_status['complete'] and cooling_ok and risk_status['match']
    need_manual = (not risk_status['match']) or (not doc_status['complete'])

    return jsonify({
        'investor': investor,
        'product': product,
        'assessment': assess_status,
        'docs': doc_status,
        'cooling': {'cooling_ok': cooling_ok, 'current_cooling': current_cp, 'history': cps},
        'risk_match': risk_status,
        'issues': issues,
        'all_ok': all_ok,
        'need_manual': need_manual,
        'overall': '通过' if all_ok else ('需人工确认' if need_manual and not all_ok else '不通过')
    })


@app.route('/api/suitability-reports', methods=['GET'])
def list_reports():
    conn = get_db()
    conn.row_factory = dict_factory
    investor_id = request.args.get('investor_id', type=int)
    product_id = request.args.get('product_id', type=int)
    status = request.args.get('status')
    sql = "SELECT sr.*, i.name as investor_name, p.product_name, p.product_code, p.risk_level as product_risk_level FROM suitability_reports sr LEFT JOIN investors i ON sr.investor_id = i.id LEFT JOIN products p ON sr.product_id = p.id WHERE 1=1"
    params = []
    if investor_id:
        sql += " AND sr.investor_id = ?"
        params.append(investor_id)
    if product_id:
        sql += " AND sr.product_id = ?"
        params.append(product_id)
    if status:
        sql += " AND sr.overall_result = ?"
        params.append(status)
    sql += " ORDER BY sr.id DESC"
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return jsonify(rows)


@app.route('/api/suitability-reports', methods=['POST'])
def create_report():
    data = request.json
    investor_id = data['investor_id']
    product_id = data['product_id']
    operator = data.get('operator', '系统管理员')

    result, error = check_suitability_data(investor_id, product_id)
    if error:
        return jsonify({'error': error}), 404

    conn = get_db()
    cursor = conn.cursor()
    issues_str = json.dumps(result[0], ensure_ascii=False)

    cursor.execute(
        "INSERT INTO suitability_reports (investor_id, product_id, match_level, assessment_id, risk_match, docs_complete, cooling_ok, overall_result, issues, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (investor_id, product_id, result[1], result[2],
         1 if result[3] else 0, 1 if result[4] else 0, 1 if result[5] else 0,
         result[6], issues_str, operator)
    )
    report_id = cursor.lastrowid

    cursor.execute(
        "INSERT INTO review_history (report_id, action, action_desc, operator, old_value, new_value) VALUES (?,?,?,?,?,?)",
        (report_id, '生成报告', '自动生成适当性报告', operator, '', result[6])
    )
    conn.commit()
    conn.close()
    return jsonify({'id': report_id, 'status': 'ok', 'overall': result[6]})


def check_suitability_data(investor_id, product_id):
    conn = get_db()
    conn.row_factory = dict_factory
    investor = conn.execute("SELECT * FROM investors WHERE id=?", (investor_id,)).fetchone()
    if not investor:
        conn.close()
        return None, "投资者不存在"
    product = conn.execute("SELECT * FROM products WHERE id=?", (product_id,)).fetchone()
    if not product:
        conn.close()
        return None, "产品不存在"
    assessments = conn.execute(
        "SELECT * FROM risk_assessments WHERE investor_id=? ORDER BY assessment_date DESC", (investor_id,)
    ).fetchall()
    docs = conn.execute(
        "SELECT * FROM supporting_docs WHERE investor_id=?", (investor_id,)
    ).fetchall()
    cps = conn.execute(
        "SELECT * FROM cooling_periods WHERE investor_id=? AND product_id=? ORDER BY start_date DESC",
        (investor_id, product_id)
    ).fetchall()
    conn.close()

    assess_status = check_assessment_expiry(assessments)
    doc_status = check_docs_complete(docs)
    now = datetime.now()
    cooling_ok = False
    for cp in cps:
        end_dt = parse_dt(cp['end_date'])
        if end_dt and now >= end_dt and cp['status'] == '已完成':
            cooling_ok = True

    risk_match = False
    if assess_status['valid'] and assess_status['current']:
        risk_match = assess_status['current']['risk_level'] >= product['risk_level']

    issues = []
    if not assess_status['valid']:
        issues.append(assess_status['reason'])
    if not doc_status['complete']:
        issues.append(f"材料缺失：{', '.join(doc_status['missing'])}")
    if not cooling_ok:
        issues.append("冷静期未满")
    if not risk_match:
        issues.append("风险等级不匹配")

    all_ok = assess_status['valid'] and doc_status['complete'] and cooling_ok and risk_match
    overall = '通过' if all_ok else ('待人工确认' if (not risk_match or not doc_status['complete']) else '不通过')

    match_level = f"C{assess_status['current']['risk_level'] if assess_status['current'] else 0}/R{product['risk_level']}"
    assess_id = assess_status['current']['id'] if assess_status['current'] else None

    return (issues, match_level, assess_id, risk_match, doc_status['complete'], cooling_ok, overall), None


@app.route('/api/suitability-reports/<int:report_id>', methods=['GET'])
def get_report(report_id):
    conn = get_db()
    conn.row_factory = dict_factory
    report = conn.execute(
        "SELECT sr.*, i.name as investor_name, i.investor_type, p.product_name, p.product_code, p.risk_level as product_risk_level, p.risk_label as product_risk_label FROM suitability_reports sr LEFT JOIN investors i ON sr.investor_id = i.id LEFT JOIN products p ON sr.product_id = p.id WHERE sr.id=?",
        (report_id,)
    ).fetchone()
    if not report:
        conn.close()
        return jsonify({'error': 'not found'}), 404

    history = conn.execute(
        "SELECT * FROM review_history WHERE report_id=? ORDER BY id", (report_id,)
    ).fetchall()
    corrections = conn.execute(
        "SELECT * FROM corrections WHERE report_id=? ORDER BY id", (report_id,)
    ).fetchall()

    investor = conn.execute("SELECT * FROM investors WHERE id=?", (report['investor_id'],)).fetchone()
    product = conn.execute("SELECT * FROM products WHERE id=?", (report['product_id'],)).fetchone()
    assessments = conn.execute(
        "SELECT * FROM risk_assessments WHERE investor_id=? ORDER BY assessment_date DESC", (report['investor_id'],)
    ).fetchall()
    docs = conn.execute(
        "SELECT * FROM supporting_docs WHERE investor_id=?", (report['investor_id'],)
    ).fetchall()
    cps = conn.execute(
        "SELECT * FROM cooling_periods WHERE investor_id=? AND product_id=? ORDER BY start_date DESC",
        (report['investor_id'], report['product_id'])
    ).fetchall()
    conn.close()

    issues = []
    if report.get('issues'):
        try:
            issues = json.loads(report['issues'])
        except (json.JSONDecodeError, TypeError):
            issues = [report['issues']]

    return jsonify({
        'report': report,
        'issues': issues,
        'history': history,
        'corrections': corrections,
        'investor': investor,
        'product': product,
        'assessments': assessments,
        'docs': docs,
        'cooling_periods': cps
    })


@app.route('/api/suitability-reports/<int:report_id>/status', methods=['PUT'])
def update_report_status(report_id):
    data = request.json
    new_status = data.get('overall_result')
    operator = data.get('operator', '系统管理员')
    reason = data.get('reason', '')

    if new_status not in ['通过', '不通过', '待人工确认', '待处理', '已修正']:
        return jsonify({'error': '无效状态'}), 400

    conn = get_db()
    old_report = conn.execute("SELECT * FROM suitability_reports WHERE id=?", (report_id,)).fetchone()
    if not old_report:
        conn.close()
        return jsonify({'error': 'not found'}), 404

    old_status = old_report['overall_result']
    conn.execute(
        "UPDATE suitability_reports SET overall_result=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
        (new_status, report_id)
    )

    if old_status != new_status:
        if reason:
            conn.execute(
                "INSERT INTO corrections (report_id, field, reason, corrected_by) VALUES (?,?,?,?)",
                (report_id, 'overall_result', reason, operator)
            )
        conn.execute(
            "INSERT INTO review_history (report_id, action, action_desc, operator, old_value, new_value) VALUES (?,?,?,?,?,?)",
            (report_id, '状态变更', reason or '人工复核', operator, old_status, new_status)
        )

    conn.commit()
    conn.close()
    return jsonify({'status': 'ok'})


@app.route('/api/suitability-reports/<int:report_id>', methods=['DELETE'])
def delete_report(report_id):
    conn = get_db()
    conn.execute("DELETE FROM suitability_reports WHERE id=?", (report_id,))
    conn.commit()
    conn.close()
    return jsonify({'status': 'ok'})


@app.route('/api/suitability-reports/<int:report_id>/export', methods=['GET'])
def export_report(report_id):
    conn = get_db()
    conn.row_factory = dict_factory
    report = conn.execute(
        "SELECT sr.*, i.name as investor_name, i.id_number, i.investor_type, i.phone, i.contact, p.product_name, p.product_code, p.risk_level as product_risk_level, p.risk_label as product_risk_label FROM suitability_reports sr LEFT JOIN investors i ON sr.investor_id = i.id LEFT JOIN products p ON sr.product_id = p.id WHERE sr.id=?",
        (report_id,)
    ).fetchone()
    if not report:
        conn.close()
        return jsonify({'error': 'not found'}), 404

    history = conn.execute(
        "SELECT * FROM review_history WHERE report_id=? ORDER BY id", (report_id,)
    ).fetchall()
    corrections = conn.execute(
        "SELECT * FROM corrections WHERE report_id=? ORDER BY id", (report_id,)
    ).fetchall()
    assessments = conn.execute(
        "SELECT * FROM risk_assessments WHERE investor_id=? ORDER BY assessment_date DESC", (report['investor_id'],)
    ).fetchall()
    docs = conn.execute(
        "SELECT * FROM supporting_docs WHERE investor_id=?", (report['investor_id'],)
    ).fetchall()
    cps = conn.execute(
        "SELECT * FROM cooling_periods WHERE investor_id=? AND product_id=? ORDER BY start_date DESC",
        (report['investor_id'], report['product_id'])
    ).fetchall()
    conn.close()

    issues = []
    if report.get('issues'):
        try:
            issues = json.loads(report['issues'])
        except (json.JSONDecodeError, TypeError):
            issues = [report['issues']]

    lines = []
    lines.append("=" * 60)
    lines.append("  私募投资者适当性评估报告")
    lines.append("=" * 60)
    lines.append("")
    lines.append(f"报告编号：SR-{report['id']:06d}")
    lines.append(f"生成时间：{report['created_at']}")
    lines.append(f"最后更新：{report['updated_at']}")
    lines.append("")
    lines.append("-" * 40)
    lines.append("一、投资者信息")
    lines.append("-" * 40)
    lines.append(f"  姓名/名称：{report['investor_name']}")
    lines.append(f"  类型：{report['investor_type']}")
    lines.append(f"  证件号：{report['id_number']}")
    lines.append(f"  联系方式：{report['phone']}")
    lines.append(f"  地址：{report['contact']}")
    lines.append("")
    lines.append("-" * 40)
    lines.append("二、产品信息")
    lines.append("-" * 40)
    lines.append(f"  产品名称：{report['product_name']}")
    lines.append(f"  产品代码：{report['product_code']}")
    lines.append(f"  风险等级：{report['product_risk_label']}")
    lines.append("")
    lines.append("-" * 40)
    lines.append("三、风险测评")
    lines.append("-" * 40)
    for a in assessments[:3]:
        lines.append(f"  测评日期：{a['assessment_date']}")
        lines.append(f"  风险等级：{a['risk_label']}")
        lines.append(f"  分数：{a['risk_score']}")
        lines.append(f"  有效期至：{a['expiry_date']}")
        lines.append(f"  来源：{a['source']}")
        lines.append("")
    if not assessments:
        lines.append("  （无测评记录）")
        lines.append("")
    lines.append("-" * 40)
    lines.append("四、证明材料")
    lines.append("-" * 40)
    for d in docs:
        ver = "已核实" if d['verified'] == 1 else "未核实"
        lines.append(f"  [{ver}] {d['doc_type']}：{d['doc_name'] or d['doc_desc']}")
        if d['verified'] == 1:
            lines.append(f"    核实人：{d['verified_by']}（{d['verified_at']}）")
        lines.append(f"    来源：{d['source']}")
    if not docs:
        lines.append("  （无材料）")
    lines.append("")
    lines.append("-" * 40)
    lines.append("五、冷静期")
    lines.append("-" * 40)
    for cp in cps:
        lines.append(f"  起始：{cp['start_date']}")
        lines.append(f"  结束：{cp['end_date']}")
        lines.append(f"  状态：{cp['status']}")
        lines.append("")
    if not cps:
        lines.append("  （无冷静期记录）")
        lines.append("")
    lines.append("-" * 40)
    lines.append("六、匹配结果")
    lines.append("-" * 40)
    lines.append(f"  匹配等级：{report['match_level']}")
    lines.append(f"  风险匹配：{'是' if report['risk_match'] else '否'}")
    lines.append(f"  材料完整：{'是' if report['docs_complete'] else '否'}")
    lines.append(f"  冷静期完成：{'是' if report['cooling_ok'] else '否'}")
    lines.append(f"  总体结论：{report['overall_result']}")
    lines.append("")
    lines.append("-" * 40)
    lines.append("七、问题清单")
    lines.append("-" * 40)
    if issues:
        for idx, issue in enumerate(issues, 1):
            lines.append(f"  {idx}. {issue}")
    else:
        lines.append("  （无问题）")
    lines.append("")
    lines.append("-" * 40)
    lines.append("八、复核记录")
    lines.append("-" * 40)
    for h in history:
        lines.append(f"  [{h['created_at']}] {h['action']}")
        if h['action_desc']:
            lines.append(f"    说明：{h['action_desc']}")
        if h['operator']:
            lines.append(f"    操作人：{h['operator']}")
        if h['old_value'] or h['new_value']:
            lines.append(f"    {h['old_value']} → {h['new_value']}")
        lines.append("")
    if not history:
        lines.append("  （无复核记录）")
        lines.append("")
    lines.append("-" * 40)
    lines.append("九、修正记录")
    lines.append("-" * 40)
    for c in corrections:
        lines.append(f"  [{c['created_at']}] 字段：{c['field']}")
        lines.append(f"    原因：{c['reason']}")
        lines.append(f"    操作人：{c['corrected_by']}")
        lines.append("")
    if not corrections:
        lines.append("  （无修正记录）")
        lines.append("")
    lines.append("=" * 60)
    lines.append("  报告结束")
    lines.append("=" * 60)

    content = "\n".join(lines)
    return jsonify({
        'content': content,
        'filename': f"适当性报告_SR{report_id:06d}_{report['created_at'][:10]}.txt"
    })


@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    conn = get_db()
    conn.row_factory = dict_factory
    total_investors = conn.execute("SELECT COUNT(*) as cnt FROM investors").fetchone()['cnt']
    total_products = conn.execute("SELECT COUNT(*) as cnt FROM products").fetchone()['cnt']
    total_reports = conn.execute("SELECT COUNT(*) as cnt FROM suitability_reports").fetchone()['cnt']
    pending = conn.execute("SELECT COUNT(*) as cnt FROM suitability_reports WHERE overall_result='待处理'").fetchone()['cnt']
    passed = conn.execute("SELECT COUNT(*) as cnt FROM suitability_reports WHERE overall_result='通过'").fetchone()['cnt']
    manual = conn.execute("SELECT COUNT(*) as cnt FROM suitability_reports WHERE overall_result='待人工确认'").fetchone()['cnt']
    corrected = conn.execute("SELECT COUNT(*) as cnt FROM suitability_reports WHERE overall_result='已修正'").fetchone()['cnt']
    failed = conn.execute("SELECT COUNT(*) as cnt FROM suitability_reports WHERE overall_result='不通过'").fetchone()['cnt']

    now = datetime.now()
    expiry_soon = conn.execute(
        "SELECT ra.*, i.name as investor_name FROM risk_assessments ra JOIN investors i ON ra.investor_id = i.id"
    ).fetchall()
    expiring = []
    for a in expiry_soon:
        exp = parse_dt(a['expiry_date'])
        if exp and 0 <= (exp - now).days <= 90:
            a['days_left'] = (exp - now).days
            a['investor_name'] = a.get('investor_name', '')
            expiring.append(a)

    unverified_docs = conn.execute(
        "SELECT sd.*, i.name as investor_name FROM supporting_docs sd JOIN investors i ON sd.investor_id = i.id WHERE sd.verified=0"
    ).fetchall()

    active_cooling = conn.execute(
        "SELECT cp.*, i.name as investor_name, p.product_name FROM cooling_periods cp JOIN investors i ON cp.investor_id = i.id JOIN products p ON cp.product_id = p.id WHERE cp.status='进行中'"
    ).fetchall()
    cooling_list = []
    for cp in active_cooling:
        end = parse_dt(cp['end_date'])
        cp['days_remaining'] = (end - now).days if end else 0
        cp['investor_name'] = cp.get('investor_name', '')
        cp['product_name'] = cp.get('product_name', '')
        cooling_list.append(cp)

    recent_reports = conn.execute(
        "SELECT sr.*, i.name as investor_name, p.product_name FROM suitability_reports sr JOIN investors i ON sr.investor_id = i.id JOIN products p ON sr.product_id = p.id ORDER BY sr.id DESC LIMIT 10"
    ).fetchall()

    conn.close()
    return jsonify({
        'stats': {
            'total_investors': total_investors,
            'total_products': total_products,
            'total_reports': total_reports,
            'pending': pending,
            'passed': passed,
            'manual': manual,
            'corrected': corrected,
            'failed': failed,
        },
        'expiring_assessments': expiring[:10],
        'unverified_docs': unverified_docs[:10],
        'active_cooling': cooling_list[:10],
        'recent_reports': recent_reports,
    })


if __name__ == '__main__':
    if not os.path.exists(DB_PATH):
        init_db()
        seed_data()
    app.run(debug=True, port=5000)
