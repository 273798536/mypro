from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from app import db


ROLE_STUDENT = 'student'
ROLE_TEACHER = 'teacher'
ROLE_ANALYST = 'analyst'


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    real_name = db.Column(db.String(64), nullable=False)
    role = db.Column(db.String(20), nullable=False, default=ROLE_STUDENT)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    samples = db.relationship('Sample', backref='owner', lazy='dynamic',
                              foreign_keys='Sample.owner_id')
    reviews = db.relationship('ReviewRecord', backref='reviewer', lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def is_student(self):
        return self.role == ROLE_STUDENT

    @property
    def is_teacher(self):
        return self.role == ROLE_TEACHER

    @property
    def is_analyst(self):
        return self.role == ROLE_ANALYST

    def can_review(self):
        return self.role in (ROLE_TEACHER, ROLE_ANALYST)


SAMPLE_STATUS_PENDING = 'pending'
SAMPLE_STATUS_DUPLICATE = 'duplicate'
SAMPLE_STATUS_CALCULATED = 'calculated'
SAMPLE_STATUS_REVIEWED = 'reviewed'
SAMPLE_STATUS_INVALID = 'invalid'


class Sample(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sample_no = db.Column(db.String(64), unique=True, nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    arrival_rate = db.Column(db.Float, nullable=False)
    service_rate = db.Column(db.Float, nullable=False)
    window_count = db.Column(db.Integer, nullable=False, default=1)
    queue_model = db.Column(db.String(20), nullable=False, default='M/M/c')
    description = db.Column(db.Text, default='')

    chart_filename = db.Column(db.String(256))
    chart_uploaded_at = db.Column(db.DateTime)

    status = db.Column(db.String(20), nullable=False, default=SAMPLE_STATUS_PENDING)
    duplicate_of_id = db.Column(db.Integer, db.ForeignKey('sample.id'))
    duplicate_reason = db.Column(db.String(500))

    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    calculation = db.relationship('CalculationResult', backref='sample',
                                  uselist=False, cascade='all, delete-orphan')
    reviews = db.relationship('ReviewRecord', backref='sample', lazy='dynamic',
                              cascade='all, delete-orphan')
    duplicates = db.relationship('Sample', backref=db.backref('duplicate_of', remote_side=[id]),
                                 lazy='dynamic')
    history_answers = db.relationship('HistoryAnswer', backref='sample', lazy='dynamic',
                                      cascade='all, delete-orphan')

    def has_chart(self):
        return self.chart_filename is not None

    def is_calculation_stale(self):
        if self.calculation is None:
            return True
        if self.chart_uploaded_at is None:
            return False
        return self.calculation.created_at < self.chart_uploaded_at

    def get_affected_conclusions(self):
        affected = []
        if self.is_calculation_stale():
            affected.append('系统利用率')
            affected.append('平均排队长度')
            affected.append('平均等待时间')
            affected.append('系统平均逗留时间')
        return affected


class CalculationResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sample_id = db.Column(db.Integer, db.ForeignKey('sample.id'), nullable=False, unique=True)
    utilization = db.Column(db.Float)
    avg_queue_length = db.Column(db.Float)
    avg_wait_time = db.Column(db.Float)
    avg_system_time = db.Column(db.Float)
    idle_probability = db.Column(db.Float)
    service_level = db.Column(db.Float)
    raw_data = db.Column(db.Text)

    explanation = db.Column(db.Text)
    stale_warning = db.Column(db.Text)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


REVIEW_STATUS_APPROVED = 'approved'
REVIEW_STATUS_REJECTED = 'rejected'
REVIEW_STATUS_PENDING = 'pending'


class ReviewRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sample_id = db.Column(db.Integer, db.ForeignKey('sample.id'), nullable=False)
    reviewer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    status = db.Column(db.String(20), nullable=False, default=REVIEW_STATUS_PENDING)
    comment = db.Column(db.Text, default='')
    batch_id = db.Column(db.String(64), db.ForeignKey('batch_review.batch_id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class BatchReview(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    name = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'))

    reviews = db.relationship('ReviewRecord', backref='batch', lazy='dynamic')


class HistoryAnswer(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sample_id = db.Column(db.Integer, db.ForeignKey('sample.id'), nullable=False)
    answer_text = db.Column(db.Text, nullable=False)
    source = db.Column(db.String(100), default='manual')
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow)
    recorded_by = db.Column(db.Integer, db.ForeignKey('user.id'))


def init_db():
    if User.query.count() == 0:
        users = [
            ('admin', '系统管理员', ROLE_ANALYST, 'admin123'),
            ('teacher01', '王老师', ROLE_TEACHER, 'teacher123'),
            ('student01', '张三', ROLE_STUDENT, 'student123'),
            ('student02', '李四', ROLE_STUDENT, 'student123'),
        ]
        for username, real_name, role, pwd in users:
            u = User(username=username, real_name=real_name, role=role)
            u.set_password(pwd)
            db.session.add(u)
        db.session.commit()
