from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Student(db.Model):
    __tablename__ = 'students'

    id = db.Column(db.Integer, primary_key=True)
    student_no = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    grade = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    wrong_questions = db.relationship('WrongQuestion', backref='student', lazy=True)


class WrongQuestion(db.Model):
    __tablename__ = 'wrong_questions'

    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(db.String(100), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    subject = db.Column(db.String(50), nullable=False)
    knowledge_point = db.Column(db.String(200))
    wrong_count = db.Column(db.Integer, default=1)
    first_wrong_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_wrong_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='pending')
    status_reason = db.Column(db.String(500))
    data_status = db.Column(db.String(20), default='available')
    batch_id = db.Column(db.String(100), nullable=False)
    import_hash = db.Column(db.String(64), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    corrections = db.relationship('CorrectionLog', backref='wrong_question', lazy=True)
    path_nodes = db.relationship('WalkPathNode', backref='wrong_question', lazy=True)

    __table_args__ = (
        db.UniqueConstraint('student_id', 'question_id', 'batch_id', name='_student_question_batch_uc'),
    )


class CorrectionLog(db.Model):
    __tablename__ = 'correction_logs'

    id = db.Column(db.Integer, primary_key=True)
    wrong_question_id = db.Column(db.Integer, db.ForeignKey('wrong_questions.id'), nullable=False)
    old_status = db.Column(db.String(20), nullable=False)
    new_status = db.Column(db.String(20), nullable=False)
    old_wrong_count = db.Column(db.Integer)
    new_wrong_count = db.Column(db.Integer)
    reason = db.Column(db.String(500), nullable=False)
    operator = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class WalkPathNode(db.Model):
    __tablename__ = 'walk_path_nodes'

    id = db.Column(db.Integer, primary_key=True)
    wrong_question_id = db.Column(db.Integer, db.ForeignKey('wrong_questions.id'), nullable=False)
    step_order = db.Column(db.Integer, nullable=False)
    from_knowledge = db.Column(db.String(200))
    to_knowledge = db.Column(db.String(200))
    transition_prob = db.Column(db.Float, default=0.0)
    visit_count = db.Column(db.Integer, default=1)
    batch_id = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ImportBatch(db.Model):
    __tablename__ = 'import_batches'

    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.String(100), unique=True, nullable=False)
    file_name = db.Column(db.String(255))
    total_records = db.Column(db.Integer, default=0)
    new_records = db.Column(db.Integer, default=0)
    updated_records = db.Column(db.Integer, default=0)
    skipped_records = db.Column(db.Integer, default=0)
    operator = db.Column(db.String(100))
    note = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
