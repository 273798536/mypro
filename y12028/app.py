import os
from datetime import datetime, date
from flask import Flask, render_template, jsonify, request, send_file
from models import (
    db, GameSession, SessionSplit, SplitDetail, DataConflict,
    AnomalyRecord, DM, Script, ScriptAuthorization, Order, Coupon, CouponVerification
)
from split_logic import SplitCalculator, ConflictDetector, AnomalyDetector, run_full_split_process
from report_exporter import ReportExporter
from sample_data import create_sample_data

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(app.root_path, 'data', 'juben.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JSON_AS_ASCII'] = False

db.init_app(app)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/init', methods=['POST'])
def init_data():
    with app.app_context():
        stats = create_sample_data()
        return jsonify({'success': True, 'stats': stats})


@app.route('/api/dashboard')
def get_dashboard():
    sessions = GameSession.query.filter_by(status='completed').all()
    splits = SessionSplit.query.all()
    conflicts = DataConflict.query.filter_by(status='pending').all()
    anomalies = AnomalyRecord.query.filter_by(status='open').all()

    total_revenue = sum(s.total_revenue for s in splits)
    total_dm_fee = sum(s.dm_fee for s in splits)
    total_auth_fee = sum(s.authorization_fee for s in splits)
    total_store_share = sum(s.store_share for s in splits)
    total_coupon_discount = sum(s.total_coupon_discount for s in splits)

    daily_stats = {}
    for split in splits:
        day = split.split_date.strftime('%Y-%m-%d')
        if day not in daily_stats:
            daily_stats[day] = {
                'revenue': 0, 'dm_fee': 0, 'auth_fee': 0, 'store_share': 0, 'session_count': 0
            }
        daily_stats[day]['revenue'] += split.total_revenue
        daily_stats[day]['dm_fee'] += split.dm_fee
        daily_stats[day]['auth_fee'] += split.authorization_fee
        daily_stats[day]['store_share'] += split.store_share
        daily_stats[day]['session_count'] += 1

    dm_stats = {}
    for split in splits:
        session = split.session
        dm_id = session.actual_dm_id or session.scheduled_dm_id
        dm = DM.query.get(dm_id)
        if dm:
            if dm_id not in dm_stats:
                dm_stats[dm_id] = {'name': dm.name, 'total_fee': 0, 'session_count': 0}
            dm_stats[dm_id]['total_fee'] += split.dm_fee
            dm_stats[dm_id]['session_count'] += 1

    anomaly_by_type = {}
    for anomaly in anomalies:
        t = anomaly.anomaly_type
        if t not in anomaly_by_type:
            anomaly_by_type[t] = 0
        anomaly_by_type[t] += 1

    return jsonify({
        'summary': {
            'session_count': len(sessions),
            'split_count': len(splits),
            'total_revenue': total_revenue,
            'total_dm_fee': total_dm_fee,
            'total_auth_fee': total_auth_fee,
            'total_store_share': total_store_share,
            'total_coupon_discount': total_coupon_discount,
            'pending_conflict_count': len(conflicts),
            'open_anomaly_count': len(anomalies)
        },
        'daily_stats': daily_stats,
        'dm_stats': list(dm_stats.values()),
        'anomaly_by_type': anomaly_by_type
    })


@app.route('/api/sessions')
def get_sessions():
    sessions = GameSession.query.order_by(GameSession.session_date.desc()).all()
    return jsonify([s.to_dict() for s in sessions])


@app.route('/api/sessions/<int:session_id>')
def get_session_detail(session_id):
    session = GameSession.query.get_or_404(session_id)
    orders = Order.query.filter_by(session_id=session_id).all()
    split = SessionSplit.query.filter_by(session_id=session_id).first()
    split_details = SplitDetail.query.filter_by(split_id=split.id).all() if split else []
    verifications = CouponVerification.query.join(Order).filter(Order.session_id == session_id).all()

    return jsonify({
        'session': session.to_dict(),
        'orders': [o.to_dict() for o in orders],
        'split': split.to_dict() if split else None,
        'split_details': [d.to_dict() for d in split_details],
        'coupon_verifications': [v.to_dict() for v in verifications]
    })


@app.route('/api/split/<int:session_id>', methods=['POST'])
def calculate_session_split(session_id):
    try:
        force = request.args.get('force', 'false').lower() == 'true'
        calc = SplitCalculator(session_id)
        split = calc.calculate_split(force_recalculate=force)

        ConflictDetector(session_id).detect_all_conflicts()
        AnomalyDetector(session_id).detect_all_anomalies()

        return jsonify({'success': True, 'split': split.to_dict()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/split/run-all', methods=['POST'])
def run_all_splits():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if start_date:
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
    if end_date:
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()

    result = run_full_split_process(start_date, end_date)
    return jsonify({'success': True, 'result': result})


@app.route('/api/conflicts')
def get_conflicts():
    status = request.args.get('status', 'all')
    query = DataConflict.query
    if status != 'all':
        query = query.filter_by(status=status)
    conflicts = query.order_by(DataConflict.detected_at.desc()).all()
    return jsonify([c.to_dict() for c in conflicts])


@app.route('/api/conflicts/<int:conflict_id>/resolve', methods=['POST'])
def resolve_conflict(conflict_id):
    data = request.get_json()
    conflict = DataConflict.query.get_or_404(conflict_id)
    conflict.status = 'resolved'
    conflict.resolution_note = data.get('note', '')
    db.session.commit()
    return jsonify({'success': True, 'conflict': conflict.to_dict()})


@app.route('/api/anomalies')
def get_anomalies():
    status = request.args.get('status', 'all')
    query = AnomalyRecord.query
    if status != 'all':
        query = query.filter_by(status=status)
    anomalies = query.order_by(AnomalyRecord.severity.desc(), AnomalyRecord.detected_at.desc()).all()
    return jsonify([a.to_dict() for a in anomalies])


@app.route('/api/anomalies/<int:anomaly_id>/handle', methods=['POST'])
def handle_anomaly(anomaly_id):
    data = request.get_json()
    anomaly = AnomalyRecord.query.get_or_404(anomaly_id)
    anomaly.status = data.get('status', 'resolved')
    anomaly.handled_by = data.get('handled_by', '')
    anomaly.handled_at = datetime.now()
    anomaly.handling_note = data.get('note', '')
    db.session.commit()
    return jsonify({'success': True, 'anomaly': anomaly.to_dict()})


@app.route('/api/detect-conflicts', methods=['POST'])
def detect_conflicts():
    detector = ConflictDetector()
    conflicts = detector.detect_all_conflicts()
    return jsonify({'success': True, 'count': len(conflicts)})


@app.route('/api/detect-anomalies', methods=['POST'])
def detect_anomalies():
    detector = AnomalyDetector()
    anomalies = detector.detect_all_anomalies()
    return jsonify({'success': True, 'count': len(anomalies)})


@app.route('/api/export/excel')
def export_excel():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    exporter = ReportExporter()
    output = exporter.export_monthly_report(start_date, end_date)

    filename = f'剧本杀分账报告_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename
    )


@app.route('/api/splits')
def get_splits():
    splits = SessionSplit.query.order_by(SessionSplit.split_date.desc()).all()
    result = []
    for split in splits:
        split_dict = split.to_dict()
        if split.session:
            split_dict['script_name'] = split.session.script.name if split.session.script else ''
            split_dict['actual_dm_name'] = split.session.actual_dm.name if split.session.actual_dm else \
                (split.session.scheduled_dm.name if split.session.scheduled_dm else '')
            split_dict['session_date'] = split.session.session_date.strftime('%Y-%m-%d') if split.session.session_date else ''
        result.append(split_dict)
    return jsonify(result)


@app.route('/api/reference/dms')
def get_dms():
    dms = DM.query.all()
    return jsonify([d.to_dict() for d in dms])


@app.route('/api/reference/scripts')
def get_scripts():
    scripts = Script.query.all()
    return jsonify([s.to_dict() for s in scripts])


@app.route('/api/reference/authorizations')
def get_authorizations():
    auths = ScriptAuthorization.query.all()
    return jsonify([a.to_dict() for a in auths])


@app.route('/api/reference/coupons')
def get_coupons():
    coupons = Coupon.query.all()
    return jsonify([c.to_dict() for c in coupons])


if __name__ == '__main__':
    with app.app_context():
        if not os.path.exists(os.path.join(app.root_path, 'data', 'juben.db')):
            db.create_all()
    app.run(debug=True, port=5000)
