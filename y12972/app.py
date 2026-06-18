import os
import csv
import io
import json
from datetime import datetime
from flask import Flask, request, jsonify, send_file, make_response
from flask_sqlalchemy import SQLAlchemy

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, 'data_correction.db')

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_PATH}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)


class WorkOrder(db.Model):
    __tablename__ = 'work_orders'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    applicant = db.Column(db.String(100), nullable=False)
    target_table = db.Column(db.String(100), nullable=False)
    sql_statement = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.now)
    anomalies = db.relationship('AnomalyRecord', backref='work_order', lazy=True)


class AnomalyRecord(db.Model):
    __tablename__ = 'anomaly_records'
    id = db.Column(db.Integer, primary_key=True)
    work_order_id = db.Column(db.Integer, db.ForeignKey('work_orders.id'), nullable=False)
    anomaly_type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=False)
    severity = db.Column(db.String(20), default='warning')
    status = db.Column(db.String(20), default='open')
    batch_id = db.Column(db.String(50))
    reviewed_by = db.Column(db.String(100))
    reviewed_at = db.Column(db.DateTime)
    review_reason = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)
    processing_records = db.relationship('ProcessingRecord', backref='anomaly', lazy=True)
    audit_logs = db.relationship('AuditLog', backref='anomaly', lazy=True)


class ProcessingRecord(db.Model):
    __tablename__ = 'processing_records'
    id = db.Column(db.Integer, primary_key=True)
    anomaly_id = db.Column(db.Integer, db.ForeignKey('anomaly_records.id'), nullable=False)
    batch_id = db.Column(db.String(50), nullable=False)
    action_type = db.Column(db.String(30), nullable=False)
    operator = db.Column(db.String(100), nullable=False)
    detail = db.Column(db.Text)
    affected_rows = db.Column(db.Integer, default=0)
    rollback_available = db.Column(db.Boolean, default=False)
    rollback_sql = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    id = db.Column(db.Integer, primary_key=True)
    anomaly_id = db.Column(db.Integer, db.ForeignKey('anomaly_records.id'), nullable=False)
    field_changed = db.Column(db.String(50), nullable=False)
    old_value = db.Column(db.Text)
    new_value = db.Column(db.Text)
    operator = db.Column(db.String(100), nullable=False)
    reason = db.Column(db.Text)
    changed_at = db.Column(db.DateTime, default=datetime.now)


def seed_sample_data():
    if WorkOrder.query.count() > 0:
        return
    wo1 = WorkOrder(
        title='用户手机号格式订正',
        applicant='zhangsan',
        target_table='user_profile',
        sql_statement="UPDATE user_profile SET phone = '13800138000' WHERE id = 1001",
        status='reviewing'
    )
    wo2 = WorkOrder(
        title='订单金额异常修正',
        applicant='lisi',
        target_table='order_main',
        sql_statement="UPDATE order_main SET amount = 99.00 WHERE order_no = 'ORD20260101'",
        status='pending'
    )
    db.session.add_all([wo1, wo2])
    db.session.flush()
    a1 = AnomalyRecord(
        work_order_id=wo1.id,
        anomaly_type='backup_gap',
        description='目标表 user_profile 在 2026-06-10 至 2026-06-12 期间存在备份缺口，无法确认回滚点',
        severity='critical',
        status='open',
        batch_id='BATCH-20260618-001'
    )
    a2 = AnomalyRecord(
        work_order_id=wo1.id,
        anomaly_type='fk_broken',
        description='订单表 order_item 中 order_id=9999 关联的 order_main 记录不存在，疑似外键断链',
        severity='warning',
        status='reviewed',
        batch_id='BATCH-20260618-001',
        reviewed_by='wangwu',
        reviewed_at=datetime(2026, 6, 17, 14, 30),
        review_reason='该订单为测试数据，已在线下完成清理，不影响生产'
    )
    a3 = AnomalyRecord(
        work_order_id=wo2.id,
        anomaly_type='backup_gap',
        description='order_main 表 2026-06-01 的增量备份缺失',
        severity='high',
        status='open',
        batch_id='BATCH-20260618-002'
    )
    db.session.add_all([a1, a2, a3])
    db.session.flush()
    pr1 = ProcessingRecord(
        anomaly_id=a2.id,
        batch_id='BATCH-20260618-001',
        action_type='review_pass',
        operator='wangwu',
        detail='外键断链复核通过，属历史测试数据',
        affected_rows=0,
        rollback_available=False
    )
    pr2 = ProcessingRecord(
        anomaly_id=a1.id,
        batch_id='BATCH-20260618-001',
        action_type='report_export',
        operator='zhaoliu',
        detail='异常报告导出',
        affected_rows=0,
        rollback_available=False
    )
    db.session.add_all([pr1, pr2])
    al1 = AuditLog(
        anomaly_id=a2.id,
        field_changed='status',
        old_value='open',
        new_value='reviewed',
        operator='wangwu',
        reason='该订单为测试数据，已在线下完成清理'
    )
    db.session.add(al1)
    db.session.commit()


@app.before_request
def log_request_info():
    pass


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'time': datetime.now().isoformat()})


@app.route('/api/work-orders', methods=['GET'])
def list_work_orders():
    status = request.args.get('status')
    query = WorkOrder.query
    if status:
        query = query.filter_by(status=status)
    orders = query.order_by(WorkOrder.created_at.desc()).all()
    return jsonify([{
        'id': o.id,
        'title': o.title,
        'applicant': o.applicant,
        'target_table': o.target_table,
        'status': o.status,
        'created_at': o.created_at.isoformat(),
        'anomaly_count': len(o.anomalies)
    } for o in orders])


@app.route('/api/work-orders/<int:wo_id>', methods=['GET'])
def get_work_order(wo_id):
    o = WorkOrder.query.get_or_404(wo_id)
    return jsonify({
        'id': o.id,
        'title': o.title,
        'applicant': o.applicant,
        'target_table': o.target_table,
        'sql_statement': o.sql_statement,
        'status': o.status,
        'created_at': o.created_at.isoformat(),
        'anomalies': [{
            'id': a.id,
            'anomaly_type': a.anomaly_type,
            'description': a.description,
            'severity': a.severity,
            'status': a.status,
            'batch_id': a.batch_id,
            'reviewed_by': a.reviewed_by,
            'reviewed_at': a.reviewed_at.isoformat() if a.reviewed_at else None,
            'review_reason': a.review_reason,
            'created_at': a.created_at.isoformat()
        } for a in o.anomalies]
    })


@app.route('/api/work-orders', methods=['POST'])
def create_work_order():
    data = request.get_json()
    wo = WorkOrder(
        title=data['title'],
        applicant=data['applicant'],
        target_table=data['target_table'],
        sql_statement=data['sql_statement'],
        status=data.get('status', 'pending')
    )
    db.session.add(wo)
    db.session.commit()
    return jsonify({'id': wo.id, 'message': 'created'}), 201


@app.route('/api/anomalies', methods=['GET'])
def list_anomalies():
    anomaly_type = request.args.get('type')
    status = request.args.get('status')
    query = AnomalyRecord.query
    if anomaly_type:
        query = query.filter_by(anomaly_type=anomaly_type)
    if status:
        query = query.filter_by(status=status)
    anomalies = query.order_by(AnomalyRecord.created_at.desc()).all()
    return jsonify([{
        'id': a.id,
        'work_order_id': a.work_order_id,
        'work_order_title': a.work_order.title,
        'anomaly_type': a.anomaly_type,
        'description': a.description,
        'severity': a.severity,
        'status': a.status,
        'batch_id': a.batch_id,
        'created_at': a.created_at.isoformat()
    } for a in anomalies])


@app.route('/api/anomalies/<int:anomaly_id>', methods=['GET'])
def get_anomaly(anomaly_id):
    a = AnomalyRecord.query.get_or_404(anomaly_id)
    return jsonify({
        'id': a.id,
        'work_order_id': a.work_order_id,
        'work_order_title': a.work_order.title,
        'anomaly_type': a.anomaly_type,
        'description': a.description,
        'severity': a.severity,
        'status': a.status,
        'batch_id': a.batch_id,
        'reviewed_by': a.reviewed_by,
        'reviewed_at': a.reviewed_at.isoformat() if a.reviewed_at else None,
        'review_reason': a.review_reason,
        'created_at': a.created_at.isoformat(),
        'processing_records': [{
            'id': pr.id,
            'batch_id': pr.batch_id,
            'action_type': pr.action_type,
            'operator': pr.operator,
            'detail': pr.detail,
            'affected_rows': pr.affected_rows,
            'rollback_available': pr.rollback_available,
            'created_at': pr.created_at.isoformat()
        } for pr in a.processing_records],
        'audit_logs': [{
            'id': al.id,
            'field_changed': al.field_changed,
            'old_value': al.old_value,
            'new_value': al.new_value,
            'operator': al.operator,
            'reason': al.reason,
            'changed_at': al.changed_at.isoformat()
        } for al in a.audit_logs]
    })


@app.route('/api/anomalies/<int:anomaly_id>/review', methods=['POST'])
def review_anomaly(anomaly_id):
    a = AnomalyRecord.query.get_or_404(anomaly_id)
    data = request.get_json()
    old_status = a.status
    a.status = 'reviewed'
    a.reviewed_by = data['operator']
    a.reviewed_at = datetime.now()
    a.review_reason = data['reason']
    db.session.add(AuditLog(
        anomaly_id=a.id,
        field_changed='status',
        old_value=old_status,
        new_value='reviewed',
        operator=data['operator'],
        reason=data['reason']
    ))
    batch_id = a.batch_id or f'BATCH-{datetime.now().strftime("%Y%m%d")}-{a.id:03d}'
    db.session.add(ProcessingRecord(
        anomaly_id=a.id,
        batch_id=batch_id,
        action_type='review_pass',
        operator=data['operator'],
        detail=data['reason'],
        affected_rows=0,
        rollback_available=False
    ))
    db.session.commit()
    return jsonify({'message': 'reviewed', 'batch_id': batch_id})


@app.route('/api/anomalies/<int:anomaly_id>/process', methods=['POST'])
def process_anomaly(anomaly_id):
    a = AnomalyRecord.query.get_or_404(anomaly_id)
    data = request.get_json()
    batch_id = a.batch_id or f'BATCH-{datetime.now().strftime("%Y%m%d")}-{a.id:03d}'
    pr = ProcessingRecord(
        anomaly_id=a.id,
        batch_id=batch_id,
        action_type=data['action_type'],
        operator=data['operator'],
        detail=data.get('detail', ''),
        affected_rows=data.get('affected_rows', 0),
        rollback_available=data.get('rollback_available', False),
        rollback_sql=data.get('rollback_sql')
    )
    db.session.add(pr)
    db.session.commit()
    return jsonify({'id': pr.id, 'batch_id': batch_id})


@app.route('/api/report/export', methods=['GET'])
def export_report():
    batch_id = request.args.get('batch_id')
    anomaly_type = request.args.get('type')
    query = ProcessingRecord.query
    if batch_id:
        query = query.filter_by(batch_id=batch_id)
    if anomaly_type:
        query = query.join(AnomalyRecord).filter(AnomalyRecord.anomaly_type == anomaly_type)
    records = query.order_by(ProcessingRecord.created_at.desc()).all()
    if not records:
        return jsonify({'message': 'no records'}), 404
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['批次号', '异常ID', '异常类型', '动作类型', '操作人', '详情', '影响行数', '可回滚', '操作时间'])
    for pr in records:
        a = pr.anomaly
        writer.writerow([
            pr.batch_id,
            a.id,
            a.anomaly_type,
            pr.action_type,
            pr.operator,
            pr.detail,
            pr.affected_rows,
            '是' if pr.rollback_available else '否',
            pr.created_at.isoformat()
        ])
    output.seek(0)
    resp = make_response(output.getvalue())
    resp.headers['Content-Type'] = 'text/csv; charset=utf-8'
    filename = batch_id or f'report_{datetime.now().strftime("%Y%m%d%H%M%S")}'
    resp.headers['Content-Disposition'] = f'attachment; filename={filename}.csv'
    first_batch = records[0].batch_id
    if not ProcessingRecord.query.filter_by(batch_id=first_batch, action_type='report_export').first():
        db.session.add(ProcessingRecord(
            anomaly_id=records[0].anomaly_id,
            batch_id=first_batch,
            action_type='report_export',
            operator='system',
            detail=f'导出批次 {first_batch} 的异常处理报告',
            affected_rows=0,
            rollback_available=False
        ))
        db.session.commit()
    return resp


@app.route('/api/rollback/<int:pr_id>', methods=['POST'])
def rollback(pr_id):
    pr = ProcessingRecord.query.get_or_404(pr_id)
    if not pr.rollback_available:
        return jsonify({'message': '该记录不支持回滚'}), 400
    data = request.get_json()
    rb = ProcessingRecord(
        anomaly_id=pr.anomaly_id,
        batch_id=pr.batch_id,
        action_type='rollback',
        operator=data['operator'],
        detail=f'回滚操作 #{pr.id}：{pr.detail}',
        affected_rows=pr.affected_rows,
        rollback_available=False,
        rollback_sql=pr.rollback_sql
    )
    db.session.add(rb)
    db.session.commit()
    return jsonify({'id': rb.id, 'batch_id': pr.batch_id})


@app.route('/api/batch/<batch_id>', methods=['GET'])
def get_batch(batch_id):
    records = ProcessingRecord.query.filter_by(batch_id=batch_id).order_by(ProcessingRecord.created_at.asc()).all()
    anomalies = AnomalyRecord.query.filter_by(batch_id=batch_id).all()
    return jsonify({
        'batch_id': batch_id,
        'anomalies': [{
            'id': a.id,
            'type': a.anomaly_type,
            'status': a.status,
            'description': a.description
        } for a in anomalies],
        'processing_records': [{
            'id': pr.id,
            'action_type': pr.action_type,
            'operator': pr.operator,
            'detail': pr.detail,
            'created_at': pr.created_at.isoformat()
        } for pr in records]
    })


def init_db():
    with app.app_context():
        db.create_all()
        seed_sample_data()


if __name__ == '__main__':
    init_db()
    app.run(host='127.0.0.1', port=5000, debug=True)
else:
    init_db()
