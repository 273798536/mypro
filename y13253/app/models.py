from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class PlanCompare(db.Model):
    __tablename__ = 'plan_compares'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False, default='夜市外摆方案比选')
    status = db.Column(db.String(50), nullable=False, default='draft')
    current_version = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)
    need_confirm = db.Column(db.Boolean, nullable=False, default=False)
    confirm_reason = db.Column(db.Text, nullable=True)
    next_step = db.Column(db.Text, nullable=True)

    versions = db.relationship('PlanVersion', backref='plan_compare', lazy='dynamic',
                               order_by='PlanVersion.version_num.desc()')
    records = db.relationship('InspectionRecord', backref='plan_compare', lazy='dynamic')
    remarks = db.relationship('Remark', backref='plan_compare', lazy='dynamic',
                              order_by='Remark.created_at.desc()')

    def get_current_version(self):
        return self.versions.filter_by(version_num=self.current_version).first()

    def __repr__(self):
        return f'<PlanCompare {self.id} v{self.current_version} {self.status}>'


class PlanVersion(db.Model):
    __tablename__ = 'plan_versions'

    id = db.Column(db.Integer, primary_key=True)
    plan_compare_id = db.Column(db.Integer, db.ForeignKey('plan_compares.id'), nullable=False)
    version_num = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    source = db.Column(db.String(50), nullable=False, default='current')
    created_by = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    items = db.relationship('PlanItem', backref='version', lazy='dynamic',
                            order_by='PlanItem.sort_order.asc()')

    def __repr__(self):
        return f'<PlanVersion v{self.version_num} {self.source}>'


class PlanItem(db.Model):
    __tablename__ = 'plan_items'

    id = db.Column(db.Integer, primary_key=True)
    version_id = db.Column(db.Integer, db.ForeignKey('plan_versions.id'), nullable=False)
    sort_order = db.Column(db.Integer, nullable=False, default=0)
    location = db.Column(db.String(200), nullable=False)
    booth_count = db.Column(db.Integer, nullable=False, default=0)
    area = db.Column(db.Float, nullable=False, default=0.0)
    business_type = db.Column(db.String(100), nullable=True)
    operating_hours = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(50), nullable=False, default='pending')
    impact_factor = db.Column(db.String(200), nullable=True)
    original_source = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f'<PlanItem {self.location}>'


class InspectionRecord(db.Model):
    __tablename__ = 'inspection_records'

    id = db.Column(db.Integer, primary_key=True)
    plan_compare_id = db.Column(db.Integer, db.ForeignKey('plan_compares.id'), nullable=False)
    record_type = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    source = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now)
    is_old_version = db.Column(db.Boolean, nullable=False, default=False)
    affects_conclusion = db.Column(db.Boolean, nullable=False, default=False)
    related_item_id = db.Column(db.Integer, nullable=True)

    def __repr__(self):
        return f'<InspectionRecord {self.record_type}: {self.title}>'


class Remark(db.Model):
    __tablename__ = 'remarks'

    id = db.Column(db.Integer, primary_key=True)
    plan_compare_id = db.Column(db.Integer, db.ForeignKey('plan_compares.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    author = db.Column(db.String(100), nullable=True)
    remark_type = db.Column(db.String(50), nullable=False, default='normal')
    source = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now)
    is_merged = db.Column(db.Boolean, nullable=False, default=False)
    merged_from = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f'<Remark {self.author}: {self.content[:30]}>'
