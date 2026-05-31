from sqlalchemy import Column, Integer, String, Date, DateTime, Float, Boolean, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base
from config import ROOM_STATUS, VERIFICATION_CATEGORY


class Contract(Base):
    __tablename__ = 'contracts'

    id = Column(Integer, primary_key=True, autoincrement=True)
    contract_no = Column(String(64), index=True, comment='合同编号')
    hotel_name = Column(String(128), comment='酒店名称')
    room_type = Column(String(64), comment='房型')
    checkin_date = Column(Date, index=True, comment='入住日期')
    checkout_date = Column(Date, comment='离店日期')
    contracted_nights = Column(Integer, comment='包销房晚数')
    contracted_rate = Column(Float, comment='协议价')
    guest_name = Column(String(64), comment='客人姓名')
    id_card = Column(String(32), comment='身份证号')
    contact_phone = Column(String(32), comment='联系电话')
    status = Column(String(32), default='CONTRACTED', comment='状态')
    old_remark = Column(Text, comment='旧系统备注')
    remark = Column(Text, comment='备注')
    source_file = Column(String(256), comment='来源文件')
    raw_data = Column(Text, comment='原始数据JSON')
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    stay_records = relationship('StayRecord', back_populates='contract', cascade='all, delete-orphan')
    reschedules = relationship('Reschedule', back_populates='contract', cascade='all, delete-orphan')
    cancellations = relationship('Cancellation', back_populates='contract', cascade='all, delete-orphan')
    verification_results = relationship('VerificationSheet', back_populates='contract')

    __table_args__ = (
        Index('idx_contract_date', 'contract_no', 'checkin_date'),
    )

    @property
    def actual_nights(self):
        if self.checkin_date and self.checkout_date:
            return (self.checkout_date - self.checkin_date).days
        return self.contracted_nights or 0


class StayRecord(Base):
    __tablename__ = 'stay_records'

    id = Column(Integer, primary_key=True, autoincrement=True)
    contract_id = Column(Integer, ForeignKey('contracts.id'), index=True, comment='关联合同ID')
    record_no = Column(String(64), index=True, comment='入住单号')
    hotel_name = Column(String(128), comment='酒店名称')
    room_type = Column(String(64), comment='房型')
    room_number = Column(String(32), comment='房号')
    guest_name = Column(String(64), comment='客人姓名')
    id_card = Column(String(32), comment='身份证号')
    checkin_date = Column(Date, index=True, comment='实际入住日期')
    checkout_date = Column(Date, comment='实际离店日期')
    actual_nights = Column(Integer, comment='实际房晚数')
    actual_rate = Column(Float, comment='实际房价')
    is_self_booked = Column(Boolean, default=False, comment='是否自营补房')
    is_no_show = Column(Boolean, default=False, comment='是否晚到未住')
    status = Column(String(32), default='CHECKED_IN', comment='状态')
    old_remark = Column(Text, comment='旧系统备注')
    remark = Column(Text, comment='备注')
    source_file = Column(String(256), comment='来源文件')
    raw_data = Column(Text, comment='原始数据JSON')
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    contract = relationship('Contract', back_populates='stay_records')
    dispute_notes = relationship('DisputeNote', back_populates='stay_record')

    __table_args__ = (
        Index('idx_stay_guest_date', 'guest_name', 'checkin_date'),
    )


class Reschedule(Base):
    __tablename__ = 'reschedules'

    id = Column(Integer, primary_key=True, autoincrement=True)
    contract_id = Column(Integer, ForeignKey('contracts.id'), index=True, comment='关联合同ID')
    reschedule_no = Column(String(64), index=True, comment='改期单号')
    hotel_name = Column(String(128), comment='酒店名称')
    guest_name = Column(String(64), comment='客人姓名')
    original_checkin = Column(Date, comment='原入住日期')
    original_checkout = Column(Date, comment='原离店日期')
    new_checkin = Column(Date, index=True, comment='新入住日期')
    new_checkout = Column(Date, comment='新离店日期')
    reschedule_nights = Column(Integer, comment='改期房晚数')
    is_cross_week = Column(Boolean, default=False, comment='是否跨周改期')
    is_revised = Column(Boolean, default=False, comment='是否已修正')
    revised_from_id = Column(Integer, comment='修正来源改期ID')
    operator = Column(String(64), comment='操作人')
    operate_time = Column(DateTime, comment='操作时间')
    status = Column(String(32), default='RESCHEDULED', comment='状态')
    old_remark = Column(Text, comment='旧系统备注')
    remark = Column(Text, comment='备注')
    source_file = Column(String(256), comment='来源文件')
    raw_data = Column(Text, comment='原始数据JSON')
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    contract = relationship('Contract', back_populates='reschedules')

    __table_args__ = (
        Index('idx_reschedule_dates', 'original_checkin', 'new_checkin'),
    )

    @property
    def weeks_difference(self):
        if self.original_checkin and self.new_checkin:
            orig_week = self.original_checkin.isocalendar()[1]
            new_week = self.new_checkin.isocalendar()[1]
            return new_week - orig_week
        return 0


class Cancellation(Base):
    __tablename__ = 'cancellations'

    id = Column(Integer, primary_key=True, autoincrement=True)
    contract_id = Column(Integer, ForeignKey('contracts.id'), index=True, comment='关联合同ID')
    cancel_no = Column(String(64), index=True, comment='取消单号')
    hotel_name = Column(String(128), comment='酒店名称')
    guest_name = Column(String(64), comment='客人姓名')
    checkin_date = Column(Date, index=True, comment='原入住日期')
    checkout_date = Column(Date, comment='原离店日期')
    cancel_nights = Column(Integer, comment='取消房晚数')
    cancel_type = Column(String(32), default='NORMAL', comment='取消类型：NORMAL正常，NO_SHOW晚到')
    cancel_time = Column(DateTime, comment='取消时间')
    operator = Column(String(64), comment='操作人')
    penalty_amount = Column(Float, default=0, comment='罚金')
    is_penalty_applied = Column(Boolean, default=True, comment='是否扣罚')
    status = Column(String(32), default='CANCELLED', comment='状态')
    old_remark = Column(Text, comment='旧系统备注')
    remark = Column(Text, comment='备注')
    source_file = Column(String(256), comment='来源文件')
    raw_data = Column(Text, comment='原始数据JSON')
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    contract = relationship('Contract', back_populates='cancellations')

    __table_args__ = (
        Index('idx_cancel_guest_date', 'guest_name', 'checkin_date'),
    )


class VerificationSheet(Base):
    __tablename__ = 'verification_sheets'

    id = Column(Integer, primary_key=True, autoincrement=True)
    contract_id = Column(Integer, ForeignKey('contracts.id'), index=True, comment='关联合同ID')
    sheet_no = Column(String(64), index=True, comment='核销单号')
    hotel_name = Column(String(128), comment='酒店名称')
    guest_name = Column(String(64), comment='客人姓名')
    checkin_date = Column(Date, index=True, comment='入住日期')
    checkout_date = Column(Date, comment='离店日期')
    verified_nights = Column(Integer, comment='核销房晚数')
    verified_amount = Column(Float, comment='核销金额')
    verification_date = Column(Date, comment='核销日期')
    category = Column(String(32), default='NORMAL', comment='核销分类')
    related_record_id = Column(Integer, comment='关联记录ID')
    related_record_type = Column(String(32), comment='关联记录类型：STAY/RESCHEDULE/CANCEL')
    sequence_no = Column(Integer, comment='处理顺序号')
    is_revised = Column(Boolean, default=False, comment='是否修正后核销')
    original_sheet_id = Column(Integer, comment='原核销单ID')
    hotel_confirm_no = Column(String(64), comment='酒店确认号')
    status = Column(String(32), default='VERIFIED', comment='状态')
    remark = Column(Text, comment='备注')
    source_file = Column(String(256), comment='来源文件')
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    contract = relationship('Contract', back_populates='verification_results')
    dispute_notes = relationship('DisputeNote', back_populates='verification_sheet')

    __table_args__ = (
        Index('idx_verify_guest_date', 'guest_name', 'checkin_date'),
    )


class DisputeNote(Base):
    __tablename__ = 'dispute_notes'

    id = Column(Integer, primary_key=True, autoincrement=True)
    stay_record_id = Column(Integer, ForeignKey('stay_records.id'), index=True, comment='关联入住ID')
    verification_sheet_id = Column(Integer, ForeignKey('verification_sheets.id'), index=True, comment='关联核销单ID')
    dispute_type = Column(String(32), comment='争议类型：DATE日期，AMOUNT金额，NIGHTS房晚等')
    dispute_content = Column(Text, comment='争议内容')
    handler = Column(String(64), comment='处理人')
    handle_result = Column(Text, comment='处理结果')
    handle_time = Column(DateTime, comment='处理时间')
    is_resolved = Column(Boolean, default=False, comment='是否已解决')
    old_remark = Column(Text, comment='历史备注')
    remark = Column(Text, comment='当前备注')
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    stay_record = relationship('StayRecord', back_populates='dispute_notes')
    verification_sheet = relationship('VerificationSheet', back_populates='dispute_notes')
    audit_logs = relationship('AuditLog', back_populates='dispute_note')


class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    dispute_note_id = Column(Integer, ForeignKey('dispute_notes.id'), index=True, comment='关联争议ID')
    operator = Column(String(64), comment='操作人')
    action = Column(String(64), comment='操作类型')
    old_value = Column(Text, comment='旧值')
    new_value = Column(Text, comment='新值')
    field_name = Column(String(64), comment='修改字段')
    remark = Column(Text, comment='修改说明')
    created_at = Column(DateTime, default=datetime.now)

    dispute_note = relationship('DisputeNote', back_populates='audit_logs')


class VerificationResult:
    def __init__(self):
        self.contract_no = None
        self.hotel_name = None
        self.guest_name = None
        self.id_card = None
        self.checkin_date = None
        self.checkout_date = None
        self.contracted_nights = 0
        self.verified_nights = 0
        self.verified_amount = 0.0
        self.category = None
        self.category_name = None
        self.status = None
        self.status_name = None
        self.sequence_no = 0
        self.related_record_type = None
        self.related_record_id = None
        self.is_cross_week = False
        self.weeks_diff = 0
        self.is_revised = False
        self.revised_from = None
        self.has_dispute = False
        self.dispute_content = None
        self.dispute_resolved = False
        self.cancel_type = None
        self.is_no_show = False
        self.is_self_booked = False
        self.penalty_amount = 0.0
        self.hotel_confirm_no = None
        self.sheet_no = None
        self.verification_date = None
        self.remark = None
        self.old_remark = None
        self.source_file = None
        self.trace_id = None

    @property
    def nights_diff(self):
        return self.verified_nights - self.contracted_nights

    def to_dict(self):
        return {
            '核销单号': self.sheet_no,
            '合同编号': self.contract_no,
            '酒店名称': self.hotel_name,
            '客人姓名': self.guest_name,
            '身份证号': self.id_card,
            '入住日期': self.checkin_date.strftime('%Y-%m-%d') if self.checkin_date else '',
            '离店日期': self.checkout_date.strftime('%Y-%m-%d') if self.checkout_date else '',
            '合同房晚': self.contracted_nights,
            '核销房晚': self.verified_nights,
            '房晚差异': self.nights_diff,
            '核销金额': self.verified_amount,
            '核销分类': self.category_name or VERIFICATION_CATEGORY.get(self.category, ''),
            '状态': self.status_name or ROOM_STATUS.get(self.status, ''),
            '处理顺序': self.sequence_no,
            '关联类型': self.related_record_type,
            '是否跨周': '是' if self.is_cross_week else '否',
            '跨周数': self.weeks_diff,
            '是否修正': '是' if self.is_revised else '否',
            '修正来源': self.revised_from or '',
            '是否晚到': '是' if self.is_no_show else '否',
            '取消类型': self.cancel_type or '',
            '是否自营补房': '是' if self.is_self_booked else '否',
            '罚金金额': self.penalty_amount,
            '有无争议': '是' if self.has_dispute else '否',
            '争议内容': self.dispute_content or '',
            '争议是否解决': '是' if self.dispute_resolved else '否',
            '酒店确认号': self.hotel_confirm_no or '',
            '核销日期': self.verification_date.strftime('%Y-%m-%d') if self.verification_date else '',
            '备注': self.remark or '',
            '旧系统备注': self.old_remark or '',
            '来源文件': self.source_file or '',
            '追踪ID': self.trace_id or ''
        }
