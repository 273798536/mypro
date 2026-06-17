import os
from datetime import datetime
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import JSON

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(BASE_DIR, 'data', 'misjudgment.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'misjudgment-secret-key-2024'

os.makedirs(os.path.join(BASE_DIR, 'data'), exist_ok=True)

db = SQLAlchemy(app)


class Sample(db.Model):
    __tablename__ = 'sample'
    id = db.Column(db.Integer, primary_key=True)
    case_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    original_summary = db.Column(db.Text, nullable=False)
    original_source_url = db.Column(db.String(512))
    original_system = db.Column(db.String(64))
    customer_service_id = db.Column(db.String(64))
    customer_id = db.Column(db.String(64))
    conversation_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    is_duplicate_evaluation = db.Column(db.Boolean, default=False, index=True)
    duplicate_of_task_id = db.Column(db.Integer, db.ForeignKey('evaluation_task.id'))
    dirty_data_flag = db.Column(db.Boolean, default=False)
    dirty_data_note = db.Column(db.String(256))
    raw_original_data = db.Column(JSON)

    results = db.relationship('EvaluationResult', back_populates='sample', cascade='all, delete-orphan')


class EvaluationTask(db.Model):
    __tablename__ = 'evaluation_task'
    id = db.Column(db.Integer, primary_key=True)
    task_name = db.Column(db.String(128), nullable=False)
    threshold_config = db.Column(JSON, nullable=False)
    status = db.Column(db.String(32), default='pending', index=True)
    created_by = db.Column(db.String(64), default='system')
    created_at = db.Column(db.DateTime, default=datetime.now, index=True)
    completed_at = db.Column(db.DateTime)
    rerun_of_task_id = db.Column(db.Integer, db.ForeignKey('evaluation_task.id'))
    version = db.Column(db.Integer, default=1)
    data_checksum = db.Column(db.String(64))
    overall_score = db.Column(db.Float, default=0.0)
    overall_judgment = db.Column(db.String(32))
    total_samples = db.Column(db.Integer, default=0)
    misjudged_count = db.Column(db.Integer, default=0)

    rerun_of = db.relationship('EvaluationTask', remote_side=[id], backref='reruns')
    results = db.relationship('EvaluationResult', back_populates='task', cascade='all, delete-orphan')
    corrections = db.relationship('ManualCorrection', back_populates='task', cascade='all, delete-orphan')
    threshold_changes = db.relationship('ThresholdChange', back_populates='task', cascade='all, delete-orphan')
    remarks = db.relationship('Remark', back_populates='task', cascade='all, delete-orphan')
    reports = db.relationship('MarkdownReport', back_populates='task', cascade='all, delete-orphan')


class EvaluationResult(db.Model):
    __tablename__ = 'evaluation_result'
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('evaluation_task.id'), nullable=False, index=True)
    sample_id = db.Column(db.Integer, db.ForeignKey('sample.id'), nullable=False, index=True)
    auto_score = db.Column(db.Float, default=0.0)
    auto_judgment = db.Column(db.String(32))
    final_judgment = db.Column(db.String(32), index=True)
    influence_score = db.Column(db.Float, default=0.0)
    evidence_links = db.Column(JSON)
    evidence_details = db.Column(JSON)
    version = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    task = db.relationship('EvaluationTask', back_populates='results')
    sample = db.relationship('Sample', back_populates='results')
    corrections = db.relationship('ManualCorrection', back_populates='result', cascade='all, delete-orphan')
    remarks = db.relationship('Remark', back_populates='result', cascade='all, delete-orphan')


class ManualCorrection(db.Model):
    __tablename__ = 'manual_correction'
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('evaluation_task.id'), nullable=False, index=True)
    result_id = db.Column(db.Integer, db.ForeignKey('evaluation_result.id'), nullable=False, index=True)
    before_judgment = db.Column(db.String(32))
    after_judgment = db.Column(db.String(32))
    before_score = db.Column(db.Float)
    after_score = db.Column(db.Float)
    corrected_by = db.Column(db.String(64), default='老唐')
    corrected_at = db.Column(db.DateTime, default=datetime.now, index=True)
    correction_reason = db.Column(db.String(512))
    raw_snapshot_before = db.Column(JSON)
    raw_snapshot_after = db.Column(JSON)
    source_trace_note = db.Column(db.String(512))
    original_verbal_statement = db.Column(db.String(1024))

    task = db.relationship('EvaluationTask', back_populates='corrections')
    result = db.relationship('EvaluationResult', back_populates='corrections')
    relations = db.relationship('ConclusionRelation', back_populates='correction', cascade='all, delete-orphan')


class ThresholdChange(db.Model):
    __tablename__ = 'threshold_change'
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('evaluation_task.id'), nullable=False, index=True)
    old_threshold = db.Column(JSON, nullable=False)
    new_threshold = db.Column(JSON, nullable=False)
    changed_by = db.Column(db.String(64), default='运营主管')
    changed_at = db.Column(db.DateTime, default=datetime.now, index=True)
    change_reason = db.Column(db.String(512))
    affected_sample_count = db.Column(db.Integer, default=0)
    affected_sample_ids = db.Column(JSON)

    task = db.relationship('EvaluationTask', back_populates='threshold_changes')
    relations = db.relationship('ConclusionRelation', back_populates='threshold_change', cascade='all, delete-orphan')


class ConclusionRelation(db.Model):
    __tablename__ = 'conclusion_relation'
    id = db.Column(db.Integer, primary_key=True)
    relation_type = db.Column(db.String(32), nullable=False, index=True)
    correction_id = db.Column(db.Integer, db.ForeignKey('manual_correction.id'), index=True)
    threshold_change_id = db.Column(db.Integer, db.ForeignKey('threshold_change.id'), index=True)
    old_conclusion = db.Column(db.String(32))
    new_conclusion = db.Column(db.String(32))
    ambiguous_note = db.Column(db.String(1024))
    related_sample_ids = db.Column(JSON)
    created_at = db.Column(db.DateTime, default=datetime.now)

    correction = db.relationship('ManualCorrection', back_populates='relations')
    threshold_change = db.relationship('ThresholdChange', back_populates='relations')


class Remark(db.Model):
    __tablename__ = 'remark'
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('evaluation_task.id'), index=True)
    result_id = db.Column(db.Integer, db.ForeignKey('evaluation_result.id'), index=True)
    content = db.Column(db.Text, nullable=False)
    author = db.Column(db.String(64), default='system')
    created_at = db.Column(db.DateTime, default=datetime.now)
    version = db.Column(db.Integer, default=1)
    status_snapshot = db.Column(JSON)

    task = db.relationship('EvaluationTask', back_populates='remarks')
    result = db.relationship('EvaluationResult', back_populates='remarks')


class MarkdownReport(db.Model):
    __tablename__ = 'markdown_report'
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey('evaluation_task.id'), nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    content_hash = db.Column(db.String(64), nullable=False)
    generated_at = db.Column(db.DateTime, default=datetime.now)
    status_version = db.Column(db.Integer, default=1)
    generated_by = db.Column(db.String(64), default='system')
    report_checksum = db.Column(db.String(64))

    task = db.relationship('EvaluationTask', back_populates='reports')


class AuditLog(db.Model):
    __tablename__ = 'audit_log'
    id = db.Column(db.Integer, primary_key=True)
    action_type = db.Column(db.String(64), nullable=False, index=True)
    operator = db.Column(db.String(64), default='system')
    operated_at = db.Column(db.DateTime, default=datetime.now, index=True)
    action_detail = db.Column(JSON)
    target_type = db.Column(db.String(32))
    target_id = db.Column(db.Integer)


def init_db():
    with app.app_context():
        db.create_all()
        _seed_initial_data()


def _seed_initial_data():
    if Sample.query.first():
        return

    import json
    from datetime import timedelta

    samples_data = [
        {
            'case_id': 'CASE20240101001',
            'original_summary': '用户反映充值不到账，客服让用户等待24小时，用户不满投诉升级。客服态度有问题，语气不耐烦。',
            'original_source_url': 'https://crm.example.com/case/CASE20240101001',
            'original_system': 'CRM工单系统',
            'customer_service_id': 'CS001',
            'customer_id': 'CUST001',
            'conversation_date': datetime(2024, 1, 1, 10, 30),
            'raw_original_data': {
                'original_ticket': '原工单内容:【用户充值100元未到账，客服回复："你等着就行，催什么催"】',
                'tags': ['充值', '态度问题', '投诉'],
                'dirty_fields': {}
            }
        },
        {
            'case_id': 'CASE20240101002',
            'original_summary': '用户咨询退货政策，客服回答不清楚，让用户自己看网页。客服业务能力不足。',
            'original_source_url': 'https://crm.example.com/case/CASE20240101002',
            'original_system': 'CRM工单系统',
            'customer_service_id': 'CS002',
            'customer_id': 'CUST002',
            'conversation_date': datetime(2024, 1, 1, 14, 20),
            'raw_original_data': {
                'original_ticket': '用户问7天无理由退货，客服回复："自己去帮助中心看"',
                'tags': ['退货', '业务不熟'],
                'dirty_fields': {}
            }
        },
        {
            'case_id': 'CASE20240102003',
            'original_summary': '用户反馈物流慢，客服主动帮忙催促物流，并给了优惠券补偿。客服服务好。',
            'original_source_url': 'https://crm.example.com/case/CASE20240102003',
            'original_system': 'CRM工单系统',
            'customer_service_id': 'CS003',
            'customer_id': 'CUST003',
            'conversation_date': datetime(2024, 1, 2, 9, 15),
            'raw_original_data': {
                'original_ticket': '客服：已帮您催促物流，给您发了5元优惠券',
                'tags': ['物流', '好评'],
                'dirty_fields': {}
            }
        },
        {
            'case_id': 'CASE20240102004',
            'original_summary': '用户反映质量问题要求换货，客服推诿责任，说是用户自己弄坏的。客服违规。',
            'original_source_url': 'https://crm.example.com/case/CASE20240102004',
            'original_system': '在线客服系统',
            'customer_service_id': 'CS004',
            'customer_id': 'CUST004',
            'conversation_date': datetime(2024, 1, 2, 16, 45),
            'dirty_data_flag': True,
            'dirty_data_note': '摘要被前序处理人修改过，原始记录有歧义',
            'raw_original_data': {
                'original_ticket': '原始记录有被覆盖痕迹，用户说收到就是坏的，客服说是人为损坏',
                'tags': ['质量问题', '推诿', '脏数据'],
                'dirty_fields': {'summary': '被前序处理人于2024-01-03修改'}
            }
        },
        {
            'case_id': 'CASE20240103005',
            'original_summary': '用户咨询会员权益，客服耐心解答，用户表示感谢。客服无问题。',
            'original_source_url': 'https://crm.example.com/case/CASE20240103005',
            'original_system': '在线客服系统',
            'customer_service_id': 'CS005',
            'customer_id': 'CUST005',
            'conversation_date': datetime(2024, 1, 3, 11, 0),
            'raw_original_data': {
                'original_ticket': '完整对话记录，客服逐条解答会员权益',
                'tags': ['会员', '好评'],
                'dirty_fields': {}
            }
        },
        {
            'case_id': 'CASE20240103006',
            'original_summary': '用户多次投诉未解决，客服说"爱上哪告上哪告"。态度极其恶劣，严重违规。',
            'original_source_url': 'https://crm.example.com/case/CASE20240103006',
            'original_system': 'CRM工单系统',
            'customer_service_id': 'CS001',
            'customer_id': 'CUST006',
            'conversation_date': datetime(2024, 1, 3, 15, 30),
            'raw_original_data': {
                'original_ticket': '有录音为证：客服原话"爱上哪告上哪告"',
                'tags': ['投诉升级', '态度恶劣', '严重违规'],
                'dirty_fields': {}
            }
        },
        {
            'case_id': 'CASE20240104007',
            'original_summary': '用户问退款多久到账，客服答非所问，重复了三遍也没说清楚。效率低。',
            'original_source_url': 'https://crm.example.com/case/CASE20240104007',
            'original_system': '在线客服系统',
            'customer_service_id': 'CS002',
            'customer_id': 'CUST007',
            'conversation_date': datetime(2024, 1, 4, 10, 0),
            'raw_original_data': {
                'original_ticket': '对话记录显示客服答非所问3次',
                'tags': ['退款', '答非所问'],
                'dirty_fields': {}
            }
        },
        {
            'case_id': 'CASE20240104008',
            'original_summary': '用户反馈APP闪退，客服引导清除缓存，问题解决。客服正常。',
            'original_source_url': 'https://crm.example.com/case/CASE20240104008',
            'original_system': 'CRM工单系统',
            'customer_service_id': 'CS003',
            'customer_id': 'CUST008',
            'conversation_date': datetime(2024, 1, 4, 14, 0),
            'raw_original_data': {
                'original_ticket': '客服按标准流程指导，问题解决',
                'tags': ['APP问题', '已解决'],
                'dirty_fields': {}
            }
        },
    ]

    for i, sd in enumerate(samples_data):
        sample = Sample(**sd)
        db.session.add(sample)

    db.session.flush()

    default_threshold = {
        'misjudgment_severity': {
            'normal': {'min': 0, 'max': 30, 'label': '无问题'},
            'mild': {'min': 30, 'max': 60, 'label': '轻微问题'},
            'moderate': {'min': 60, 'max': 80, 'label': '一般问题'},
            'severe': {'min': 80, 'max': 100, 'label': '严重问题'}
        },
        'influence_weight': {
            'attitude': 0.3,
            'efficiency': 0.2,
            'compliance': 0.35,
            'professionalism': 0.15
        }
    }

    task1 = EvaluationTask(
        task_name='2024年1月第一周客服摘要误判回放',
        threshold_config=default_threshold,
        status='completed',
        created_by='运营主管',
        created_at=datetime(2024, 1, 5, 9, 0),
        completed_at=datetime(2024, 1, 5, 11, 30),
        version=1,
        total_samples=8,
        misjudged_count=5,
        overall_score=54.5,
        overall_judgment='一般问题'
    )
    db.session.add(task1)
    db.session.flush()

    task1.data_checksum = _calculate_checksum(f'task_{task1.id}_v1')

    results_data = [
        (1, 85.0, '严重问题', '严重问题', 0.28, {'录音': 'https://rec.example.com/CASE20240101001', '工单': 'https://crm.example.com/case/CASE20240101001'},
         {'证据1': '语气不耐烦录音片段，第3分15秒', '证据2': '用户投诉记录，升级为主管介入'}),
        (2, 62.0, '一般问题', '一般问题', 0.15, {'工单': 'https://crm.example.com/case/CASE20240101002'},
         {'证据1': '客服回复"自己去帮助中心看"截图'}),
        (3, 10.0, '无问题', '无问题', 0.02, {'工单': 'https://crm.example.com/case/CASE20240102003'},
         {'证据1': '客服主动补偿优惠券记录'}),
        (4, 75.0, '一般问题', '一般问题', 0.18, {'工单': 'https://crm.example.com/case/CASE20240102004'},
         {'证据1': '有脏数据标记，摘要被修改记录', '证据2': '用户与客服各执一词对话记录'}),
        (5, 5.0, '无问题', '无问题', 0.01, {'工单': 'https://crm.example.com/case/CASE20240103005'},
         {'证据1': '用户感谢截图'}),
        (6, 95.0, '严重问题', '严重问题', 0.32, {'录音': 'https://rec.example.com/CASE20240103006', '工单': 'https://crm.example.com/case/CASE20240103006'},
         {'证据1': '"爱上哪告上哪告"原话录音，第8分40秒', '证据2': '用户升级投诉至12315记录'}),
        (7, 55.0, '轻微问题', '轻微问题', 0.04, {'工单': 'https://crm.example.com/case/CASE20240104007'},
         {'证据1': '三次答非所问对话记录'}),
        (8, 8.0, '无问题', '无问题', 0.00, {'工单': 'https://crm.example.com/case/CASE20240104008'},
         {'证据1': '问题已解决用户确认记录'}),
    ]

    for i, (sample_id, score, auto_jud, final_jud, influence, links, details) in enumerate(results_data):
        result = EvaluationResult(
            task_id=task1.id,
            sample_id=sample_id,
            auto_score=score,
            auto_judgment=auto_jud,
            final_judgment=final_jud,
            influence_score=influence,
            evidence_links=links,
            evidence_details=details
        )
        db.session.add(result)

    db.session.flush()

    correction1 = ManualCorrection(
        task_id=task1.id,
        result_id=4,
        before_judgment='一般问题',
        after_judgment='轻微问题',
        before_score=75.0,
        after_score=45.0,
        corrected_by='老唐',
        corrected_at=datetime(2024, 1, 5, 10, 15),
        correction_reason='考虑到有脏数据，摘要被修改过，原始记录有歧义，降档处理',
        raw_snapshot_before={'judgment': '一般问题', 'score': 75.0, 'source': 'auto_v1'},
        raw_snapshot_after={'judgment': '轻微问题', 'score': 45.0, 'source': 'manual_老唐'},
        source_trace_note='原始记录CASE20240102004，客服与用户各执一词，前序处理人改了摘要',
        original_verbal_statement='老唐原话："这条我记得，当时是客服和用户各说各的，前序还改过摘要，不能按一般问题算，算轻微就够了"'
    )
    db.session.add(correction1)

    correction2 = ManualCorrection(
        task_id=task1.id,
        result_id=7,
        before_judgment='轻微问题',
        after_judgment='一般问题',
        before_score=55.0,
        after_score=65.0,
        corrected_by='老唐',
        corrected_at=datetime(2024, 1, 5, 10, 30),
        correction_reason='虽然是效率问题，但答非所问三次，影响了用户体验，应该升档',
        raw_snapshot_before={'judgment': '轻微问题', 'score': 55.0, 'source': 'auto_v1'},
        raw_snapshot_after={'judgment': '一般问题', 'score': 65.0, 'source': 'manual_老唐'},
        source_trace_note='原始对话记录CASE20240104007，连续三次答非所问',
        original_verbal_statement='老唐原话："三次都答非所问，不是轻微了，要按一般问题处理，不然不长记性"'
    )
    db.session.add(correction2)

    db.session.flush()

    relation1 = ConclusionRelation(
        relation_type='correction',
        correction_id=correction1.id,
        old_conclusion='一般问题',
        new_conclusion='轻微问题',
        ambiguous_note='脏数据导致原结论说不清：摘要被前序处理人修改过，原始对话双方各执一词，无法完全还原事实。修正后倾向于保护客服，但保留原始标记。',
        related_sample_ids=[4]
    )
    db.session.add(relation1)

    relation2 = ConclusionRelation(
        relation_type='correction',
        correction_id=correction2.id,
        old_conclusion='轻微问题',
        new_conclusion='一般问题',
        ambiguous_note='原结论偏轻：连续三次答非所问不应按轻微算，但原阈值下55分确实在轻微区间。修正后更符合实际影响。',
        related_sample_ids=[7]
    )
    db.session.add(relation2)

    threshold_change1 = ThresholdChange(
        task_id=task1.id,
        old_threshold=default_threshold,
        new_threshold={
            'misjudgment_severity': {
                'normal': {'min': 0, 'max': 35, 'label': '无问题'},
                'mild': {'min': 35, 'max': 55, 'label': '轻微问题'},
                'moderate': {'min': 55, 'max': 75, 'label': '一般问题'},
                'severe': {'min': 75, 'max': 100, 'label': '严重问题'}
            },
            'influence_weight': {
                'attitude': 0.35,
                'efficiency': 0.2,
                'compliance': 0.3,
                'professionalism': 0.15
            }
        },
        changed_by='运营主管',
        changed_at=datetime(2024, 1, 5, 10, 45),
        change_reason='无问题和轻微的边界太低了，稍微抬一下，避免小问题被漏掉；态度问题权重提高',
        affected_sample_count=3,
        affected_sample_ids=[1, 2, 7]
    )
    db.session.add(threshold_change1)

    db.session.flush()

    relation3 = ConclusionRelation(
        relation_type='threshold',
        threshold_change_id=threshold_change1.id,
        old_conclusion='受影响样本原结论：CASE1严重/CASE2一般/CASE7轻微',
        new_conclusion='阈值改后受影响样本：CASE1仍严重/CASE2变轻微/CASE7变一般',
        ambiguous_note='阈值改动后旧结论说不清：主要是边界上的样本(55-65分区间)变动大。CASE2从一般变轻微，因为阈值拉高了；CASE7从轻微变一般，也是边界效应。需要结合人工修正一起看。',
        related_sample_ids=[1, 2, 7]
    )
    db.session.add(relation3)

    remark1 = Remark(
        task_id=task1.id,
        content='本期整体问题集中在CS001态度问题和CS002业务能力问题，建议针对性培训。',
        author='运营主管',
        version=1,
        status_snapshot={'overall_score': 52.5, 'misjudged_count': 4, 'status': 'completed'}
    )
    remark2 = Remark(
        task_id=task1.id,
        result_id=4,
        content='这条有脏数据标记，处理时务必注意保留原始来源，别覆盖。',
        author='老唐',
        version=1,
        status_snapshot={'final_judgment': '轻微问题', 'corrected': True}
    )
    db.session.add_all([remark1, remark2])

    audit_entries = [
        ('create_task', 'system', {'task_id': 1, 'name': '2024年1月第一周客服摘要误判回放'}, 'evaluation_task', 1),
        ('run_evaluation', 'system', {'samples_count': 8}, 'evaluation_task', 1),
        ('manual_correction', '老唐', {'result_id': 4, 'from': '一般问题', 'to': '轻微问题'}, 'evaluation_result', 4),
        ('manual_correction', '老唐', {'result_id': 7, 'from': '轻微问题', 'to': '一般问题'}, 'evaluation_result', 7),
        ('threshold_change', '运营主管', {'samples_affected': 3}, 'evaluation_task', 1),
        ('add_remark', '运营主管', {'remark_id': 1}, 'evaluation_task', 1),
    ]
    for action, op, detail, ttype, tid in audit_entries:
        log = AuditLog(
            action_type=action,
            operator=op,
            action_detail=detail,
            target_type=ttype,
            target_id=tid
        )
        db.session.add(log)

    db.session.commit()

    task2 = EvaluationTask(
        task_name='2024年1月第一周客服摘要误判回放(重复评测-老唐复核版)',
        threshold_config=threshold_change1.new_threshold,
        status='completed',
        created_by='老唐',
        created_at=datetime(2024, 1, 5, 13, 0),
        completed_at=datetime(2024, 1, 5, 14, 30),
        rerun_of_task_id=task1.id,
        version=2,
        total_samples=8,
        misjudged_count=5,
        overall_score=56.8,
        overall_judgment='一般问题'
    )
    db.session.add(task2)
    db.session.flush()

    all_samples = Sample.query.all()
    for s in all_samples:
        if s.id in [1, 2, 4, 6, 7]:
            s.is_duplicate_evaluation = True
            s.duplicate_of_task_id = task2.id

    dup_results = [
        (1, 88.0, '严重问题', '严重问题', 0.30),
        (2, 58.0, '轻微问题', '轻微问题', 0.10),
        (3, 12.0, '无问题', '无问题', 0.02),
        (4, 48.0, '轻微问题', '轻微问题', 0.10),
        (5, 5.0, '无问题', '无问题', 0.01),
        (6, 96.0, '严重问题', '严重问题', 0.35),
        (7, 68.0, '一般问题', '一般问题', 0.12),
        (8, 8.0, '无问题', '无问题', 0.00),
    ]

    for sid, score, auto_jud, final_jud, influence in dup_results:
        orig_result = EvaluationResult.query.filter_by(task_id=task1.id, sample_id=sid).first()
        r = EvaluationResult(
            task_id=task2.id,
            sample_id=sid,
            auto_score=score,
            auto_judgment=auto_jud,
            final_judgment=final_jud,
            influence_score=influence,
            evidence_links=orig_result.evidence_links,
            evidence_details=orig_result.evidence_details,
            version=2
        )
        db.session.add(r)

    db.session.commit()

    _generate_reports(task1.id)
    _generate_reports(task2.id)


def _generate_reports(task_id):
    from hashlib import sha256
    task = EvaluationTask.query.get(task_id)
    results = EvaluationResult.query.filter_by(task_id=task_id).all()
    corrections = ManualCorrection.query.filter_by(task_id=task_id).all()
    threshold_changes = ThresholdChange.query.filter_by(task_id=task_id).all()
    relations = ConclusionRelation.query.all()

    lines = []
    lines.append(f"# 客服摘要误判回放报告 - {task.task_name}\n")
    lines.append(f"**生成时间**: {task.completed_at.strftime('%Y-%m-%d %H:%M:%S') if task.completed_at else '未完成'}  ")
    lines.append(f"**任务版本**: v{task.version}  ")
    lines.append(f"**执行人**: {task.created_by}  ")
    if task.rerun_of_task_id:
        lines.append(f"**关联任务**: 重复评测，基于任务#{task.rerun_of_task_id}  ")
    lines.append("")
    lines.append("## 一、整体指标\n")
    lines.append(f"- 评测样本总数: **{task.total_samples}** 条")
    lines.append(f"- 判定存在问题数: **{task.misjudged_count}** 条")
    lines.append(f"- 综合误判评分: **{task.overall_score}** 分")
    lines.append(f"- 整体判定等级: **{task.overall_judgment}**")
    lines.append("")

    lines.append("## 二、拉偏结论的关键样本\n")
    lines.append("> 按影响力从大到小排序，这些样本最影响整体结论。\n")
    sorted_results = sorted(results, key=lambda r: r.influence_score, reverse=True)
    for idx, r in enumerate(sorted_results[:5], 1):
        sample = Sample.query.get(r.sample_id)
        lines.append(f"### {idx}. {sample.case_id} (影响力权重: {r.influence_score:.2%})\n")
        lines.append(f"- 摘要: {sample.original_summary[:80]}...")
        lines.append(f"- 自动评分: {r.auto_score}分 / 结论: **{r.auto_judgment}**")
        lines.append(f"- 最终结论: **{r.final_judgment}**")
        if sample.is_duplicate_evaluation:
            lines.append(f"- ⚠️ **重复评测标记**: 是")
        if sample.dirty_data_flag:
            lines.append(f"- ⚠️ **脏数据标记**: {sample.dirty_data_note or '原始数据有疑问'}")
        lines.append(f"- [查看样本详情](#/sample/{sample.id})")
        lines.append("")

    lines.append("## 三、人工修正记录\n")
    lines.append("> 保留修正前后原始快照，可追溯原始说法。\n")
    if corrections:
        for c in corrections:
            sample = Sample.query.get(EvaluationResult.query.get(c.result_id).sample_id)
            lines.append(f"### 修正 #{c.id}: {sample.case_id}\n")
            lines.append(f"- **修正人**: {c.corrected_by} ({c.corrected_at.strftime('%Y-%m-%d %H:%M')})")
            lines.append(f"- **结论变动**: {c.before_judgment} → **{c.after_judgment}**")
            lines.append(f"- **分数变动**: {c.before_score}分 → **{c.after_score}分**")
            lines.append(f"- **修正理由**: {c.correction_reason}")
            lines.append(f"- **原始说法溯源**: {c.source_trace_note}")
            lines.append(f"- **修正人原话**: > {c.original_verbal_statement}")
            lines.append(f"- [查看修正关系详情](#/relation/correction/{c.id})")
            lines.append("")
    else:
        lines.append("本期无人工修正。\n")

    lines.append("## 四、阈值变更记录\n")
    lines.append("> 记录每一次阈值改动及影响范围。\n")
    if threshold_changes:
        for tc in threshold_changes:
            lines.append(f"### 阈值变更 #{tc.id}\n")
            lines.append(f"- **修改人**: {tc.changed_by} ({tc.changed_at.strftime('%Y-%m-%d %H:%M')})")
            lines.append(f"- **修改原因**: {tc.change_reason}")
            lines.append(f"- **影响样本数**: {tc.affected_sample_count} 条")
            lines.append(f"- [查看阈值变更关系详情](#/relation/threshold/{tc.id})")
            lines.append("")
    else:
        lines.append("本期无阈值变更。\n")

    lines.append("## 五、说不清的结论关系\n")
    lines.append("> 人工修正和阈值改后，旧结论说不清的地方都记录在此。\n")
    related_rels = [r for r in relations if (r.correction and r.correction.task_id == task_id) or (r.threshold_change and r.threshold_change.task_id == task_id)]
    if related_rels:
        for idx, rel in enumerate(related_rels, 1):
            lines.append(f"### {idx}. [{rel.relation_type}] {rel.old_conclusion} → {rel.new_conclusion}\n")
            lines.append(f"- **说不清的说明**: {rel.ambiguous_note}")
            lines.append(f"- **关联样本**: {', '.join([f'CASE{s}' for s in (rel.related_sample_ids or [])])}")
            lines.append("")
    else:
        lines.append("本期无说不清的结论关系。\n")

    lines.append("## 六、历史备注记录\n")
    remarks = Remark.query.filter_by(task_id=task_id).all()
    if remarks:
        for r in remarks:
            lines.append(f"- **[{r.author}] v{r.version}** ({r.created_at.strftime('%Y-%m-%d %H:%M')}): {r.content}")
    else:
        lines.append("无备注。")
    lines.append("")

    lines.append("## 七、交接说明\n")
    lines.append("> 风控运营交接用：如何从人工修正找到原始说法，如何从报告讲清处理结果。\n")
    lines.append('1. **找原始说法**: 第三节人工修正记录中，每条修正下方的"原始说法溯源"和"修正人原话"字段，可直接对应到当时老唐的判断依据。')
    lines.append('2. **找样本证据**: 第二节关键样本列表中，点击"查看样本详情"可跳转到带证据链接的样本页面，有录音、工单、截图等原始证据。')
    lines.append('3. **找说不清的关系**: 第五节专门列了因为修正和阈值改动导致旧结论说不清的地方，交接时不用再口头解释。')
    lines.append('4. **看重复评测**: 样本旁有⚠️重复评测标记，可与原始评测(任务#1)对比查看。')
    lines.append("")

    report_content = "\n".join(lines)
    content_hash = sha256(report_content.encode('utf-8')).hexdigest()
    checksum = _calculate_checksum(f'report_{task_id}_v{task.version}_{content_hash[:16]}')

    report = MarkdownReport(
        task_id=task_id,
        content=report_content,
        content_hash=content_hash,
        status_version=task.version,
        generated_by='system',
        report_checksum=checksum
    )
    db.session.add(report)
    db.session.commit()


def _calculate_checksum(data_str):
    from hashlib import sha256
    return sha256(data_str.encode('utf-8')).hexdigest()[:32]


if __name__ == '__main__':
    init_db()
    print("数据库初始化完成！")
