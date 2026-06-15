from datetime import datetime, date, time
from sqlalchemy import Column, Integer, String, DateTime, Date, Time, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship

from app.database import Base


class Repertoire(Base):
    __tablename__ = "repertoires"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, comment="曲目名称")
    composer = Column(String(255), comment="作曲")
    duration_seconds = Column(Integer, comment="时长（秒）")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    stage_channels = relationship("StageChannel", back_populates="repertoire")


class StageChannel(Base):
    __tablename__ = "stage_channels"

    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String(500), nullable=False, comment="文件名")
    repertoire_id = Column(Integer, ForeignKey("repertoires.id"), nullable=True, comment="关联曲目ID")
    track_number = Column(String(50), comment="通道号")
    start_timecode = Column(String(20), comment="起始时码，格式 HH:MM:SS:FF")
    end_timecode = Column(String(20), comment="结束时码，格式 HH:MM:SS:FF")
    start_seconds = Column(Integer, comment="起始时码转秒")
    end_seconds = Column(Integer, comment="结束时码转秒")
    raw_description = Column(Text, comment="舞台通道表原始描述，用于时码偏差溯源")
    source_row = Column(Integer, comment="原始表格行号，便于溯源")
    is_active = Column(Boolean, default=True, comment="是否有效")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    repertoire = relationship("Repertoire", back_populates="stage_channels")
    schedules = relationship("PianoSchedule", back_populates="stage_channel")


class PianoSchedule(Base):
    __tablename__ = "piano_schedules"

    id = Column(Integer, primary_key=True, index=True)
    piano_room_id = Column(String(50), nullable=False, comment="琴房编号")
    schedule_date = Column(Date, nullable=False, comment="排期日期")
    start_time = Column(Time, nullable=False, comment="开始时间")
    end_time = Column(Time, nullable=False, comment="结束时间")
    performer = Column(String(255), comment="演奏者")
    stage_channel_id = Column(Integer, ForeignKey("stage_channels.id"), nullable=True, comment="关联舞台通道ID")
    remark = Column(Text, comment="备注")
    is_withdrawn = Column(Boolean, default=False, comment="是否已撤回")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    stage_channel = relationship("StageChannel", back_populates="schedules")
    withdrawals = relationship("WithdrawalRecord", back_populates="schedule")
    operation_histories = relationship("OperationHistory", back_populates="schedule")


class ConflictType:
    ROOM_TIME_OVERLAP = "room_time_overlap"
    FILE_REPERTOIRE_MISMATCH = "file_repertoire_mismatch"
    TIMECODE_DEVIATION = "timecode_deviation"
    PERFORMER_OVERLAP = "performer_overlap"


CONFLICT_TYPE_CHOICES = [
    ConflictType.ROOM_TIME_OVERLAP,
    ConflictType.FILE_REPERTOIRE_MISMATCH,
    ConflictType.TIMECODE_DEVIATION,
    ConflictType.PERFORMER_OVERLAP,
]


class ConflictStatus:
    PENDING = "pending"
    RESOLVED = "resolved"
    IGNORED = "ignored"
    WITHDRAWN = "withdrawn"


class ConflictRecord(Base):
    __tablename__ = "conflict_records"

    id = Column(Integer, primary_key=True, index=True)
    conflict_type = Column(String(50), nullable=False, comment="冲突类型")
    schedule_id = Column(Integer, ForeignKey("piano_schedules.id"), nullable=False, comment="主排期ID")
    related_schedule_id = Column(Integer, ForeignKey("piano_schedules.id"), nullable=True, comment="关联排期ID（如时间冲突的另一方）")
    stage_channel_id = Column(Integer, ForeignKey("stage_channels.id"), nullable=True, comment="关联舞台通道ID")
    description = Column(Text, nullable=False, comment="冲突描述")
    raw_source = Column(Text, comment="原始来源描述，用于时码偏差溯源到舞台通道表原始说法")
    timecode_deviation_seconds = Column(Integer, nullable=True, comment="时码偏差秒数")
    filter_criteria = Column(JSON, comment="筛选口径快照，异常队列和导出共用")
    status = Column(String(20), default=ConflictStatus.PENDING, comment="状态")
    conclusion = Column(Text, comment="最后结论，与撤回记录关联")
    operator = Column(String(100), comment="处理人")
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    schedule = relationship("PianoSchedule", foreign_keys=[schedule_id])
    related_schedule = relationship("PianoSchedule", foreign_keys=[related_schedule_id])
    stage_channel = relationship("StageChannel")
    withdrawal = relationship("WithdrawalRecord", back_populates="conflict", uselist=False)


class WithdrawalRecord(Base):
    __tablename__ = "withdrawal_records"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("piano_schedules.id"), nullable=False, comment="撤回的排期ID")
    conflict_id = Column(Integer, ForeignKey("conflict_records.id"), nullable=True, comment="关联冲突记录ID，撤回记录与最后结论连起来")
    reason = Column(Text, nullable=False, comment="撤回原因")
    operator = Column(String(100), nullable=False, comment="操作人")
    conclusion = Column(Text, comment="最后结论")
    created_at = Column(DateTime, default=datetime.now)

    schedule = relationship("PianoSchedule", back_populates="withdrawals")
    conflict = relationship("ConflictRecord", back_populates="withdrawal")


class OperationField:
    REMARK = "remark"
    JUDGMENT = "judgment"
    CONCLUSION = "conclusion"
    STATUS = "status"


class OperationHistory(Base):
    __tablename__ = "operation_histories"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("piano_schedules.id"), nullable=True, comment="关联排期ID")
    conflict_id = Column(Integer, ForeignKey("conflict_records.id"), nullable=True, comment="关联冲突记录ID")
    field_name = Column(String(50), nullable=False, comment="修改字段：remark/judgment/conclusion/status")
    old_value = Column(Text, comment="旧值")
    new_value = Column(Text, comment="新值")
    operator = Column(String(100), nullable=False, comment="操作人（如厂牌运营小孟）")
    created_at = Column(DateTime, default=datetime.now)

    schedule = relationship("PianoSchedule", back_populates="operation_histories")
