from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from enum import Enum

db = SQLAlchemy()

class ChannelType(Enum):
    HUAWEI = '华为'
    XIAOMI = '小米'
    OPPO = 'OPPO'
    VIVO = 'VIVO'
    TENCENT = '应用宝'
    BILIBILI = 'B站'
    TAPTAP = 'TapTap'
    OTHER = '其他'

class DeductionType(Enum):
    GUARANTEE = '保底抵扣'
    AD_COST = '买量抵扣'
    SERVICE_FEE = '服务费'
    TAX = '税费'
    OTHER = '其他'

class AnomalyType(Enum):
    GUARANTEE_EXHAUSTED = '保底用尽'
    DUPLICATE_DEDUCTION = '抵扣重复'
    CONTRACT_FLOW_MISMATCH = '合同流水不一致'
    MANUAL_CORRECTION = '手动修正'

class SettlementStatus(Enum):
    PENDING = '待结算'
    SETTLED = '已结算'
    DISPUTED = '有争议'
    CORRECTED = '已修正'

class Channel(db.Model):
    __tablename__ = 'channels'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    channel_type = db.Column(db.String(50), nullable=False)
    contact_person = db.Column(db.String(100))
    contact_email = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    contracts = db.relationship('Contract', backref='channel', lazy=True)
    game_flows = db.relationship('GameFlow', backref='channel', lazy=True)
    prepayments = db.relationship('Prepayment', backref='channel', lazy=True)

class Contract(db.Model):
    __tablename__ = 'contracts'
    
    id = db.Column(db.Integer, primary_key=True)
    channel_id = db.Column(db.Integer, db.ForeignKey('channels.id'), nullable=False)
    contract_no = db.Column(db.String(100), unique=True, nullable=False)
    game_name = db.Column(db.String(200), nullable=False)
    guarantee_amount = db.Column(db.Numeric(15, 2), nullable=False)
    revenue_share_ratio = db.Column(db.Numeric(5, 4), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date)
    is_active = db.Column(db.Boolean, default=True)
    deduction_rules = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    game_flows = db.relationship('GameFlow', backref='contract', lazy=True)

class GameFlow(db.Model):
    __tablename__ = 'game_flows'
    
    id = db.Column(db.Integer, primary_key=True)
    channel_id = db.Column(db.Integer, db.ForeignKey('channels.id'), nullable=False)
    contract_id = db.Column(db.Integer, db.ForeignKey('contracts.id'))
    game_name = db.Column(db.String(200), nullable=False)
    flow_date = db.Column(db.Date, nullable=False)
    total_flow = db.Column(db.Numeric(15, 2), nullable=False)
    channel_fee = db.Column(db.Numeric(15, 2), default=0)
    tax_amount = db.Column(db.Numeric(15, 2), default=0)
    net_flow = db.Column(db.Numeric(15, 2), nullable=False)
    settlement_month = db.Column(db.String(7), nullable=False)
    status = db.Column(db.String(20), default='PENDING')
    remark = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    deductions = db.relationship('Deduction', backref='game_flow', lazy=True)
    corrections = db.relationship('FlowCorrection', backref='original_flow', lazy=True, 
                                  foreign_keys='FlowCorrection.original_flow_id')

class Prepayment(db.Model):
    __tablename__ = 'prepayments'
    
    id = db.Column(db.Integer, primary_key=True)
    channel_id = db.Column(db.Integer, db.ForeignKey('channels.id'), nullable=False)
    contract_id = db.Column(db.Integer, db.ForeignKey('contracts.id'))
    prepayment_no = db.Column(db.String(100), unique=True, nullable=False)
    prepayment_type = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    used_amount = db.Column(db.Numeric(15, 2), default=0)
    remaining_amount = db.Column(db.Numeric(15, 2), nullable=False)
    effective_date = db.Column(db.Date, nullable=False)
    expiry_date = db.Column(db.Date)
    is_exhausted = db.Column(db.Boolean, default=False)
    remark = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    deductions = db.relationship('Deduction', backref='prepayment', lazy=True)

class Deduction(db.Model):
    __tablename__ = 'deductions'
    
    id = db.Column(db.Integer, primary_key=True)
    game_flow_id = db.Column(db.Integer, db.ForeignKey('game_flows.id'), nullable=False)
    prepayment_id = db.Column(db.Integer, db.ForeignKey('prepayments.id'))
    deduction_type = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    deduction_date = db.Column(db.Date, nullable=False)
    is_duplicate = db.Column(db.Boolean, default=False)
    related_deduction_id = db.Column(db.Integer, db.ForeignKey('deductions.id'))
    evidence = db.Column(db.Text)
    operator = db.Column(db.String(100))
    remark = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    related_deduction = db.relationship('Deduction', remote_side=[id])

class AnomalyRecord(db.Model):
    __tablename__ = 'anomaly_records'
    
    id = db.Column(db.Integer, primary_key=True)
    anomaly_type = db.Column(db.String(50), nullable=False)
    related_type = db.Column(db.String(50))
    related_id = db.Column(db.Integer)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    evidence_data = db.Column(db.Text)
    is_resolved = db.Column(db.Boolean, default=False)
    resolved_by = db.Column(db.String(100))
    resolved_at = db.Column(db.DateTime)
    resolution_note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class OperationHistory(db.Model):
    __tablename__ = 'operation_history'
    
    id = db.Column(db.Integer, primary_key=True)
    operation_type = db.Column(db.String(50), nullable=False)
    related_type = db.Column(db.String(50))
    related_id = db.Column(db.Integer)
    operator = db.Column(db.String(100), nullable=False)
    before_data = db.Column(db.Text)
    after_data = db.Column(db.Text)
    change_summary = db.Column(db.String(500))
    impact_result = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class FlowCorrection(db.Model):
    __tablename__ = 'flow_corrections'
    
    id = db.Column(db.Integer, primary_key=True)
    original_flow_id = db.Column(db.Integer, db.ForeignKey('game_flows.id'), nullable=False)
    corrected_by = db.Column(db.String(100), nullable=False)
    correction_reason = db.Column(db.Text)
    
    original_total_flow = db.Column(db.Numeric(15, 2))
    original_channel_fee = db.Column(db.Numeric(15, 2))
    original_tax_amount = db.Column(db.Numeric(15, 2))
    original_net_flow = db.Column(db.Numeric(15, 2))
    original_status = db.Column(db.String(20))
    
    new_total_flow = db.Column(db.Numeric(15, 2))
    new_channel_fee = db.Column(db.Numeric(15, 2))
    new_tax_amount = db.Column(db.Numeric(15, 2))
    new_net_flow = db.Column(db.Numeric(15, 2))
    new_status = db.Column(db.String(20))
    
    is_applied = db.Column(db.Boolean, default=False)
    applied_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
