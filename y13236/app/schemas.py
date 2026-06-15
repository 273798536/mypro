from datetime import datetime, date, time
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class RepertoireBase(BaseModel):
    name: str = Field(..., description="曲目名称")
    composer: Optional[str] = Field(None, description="作曲")
    duration_seconds: Optional[int] = Field(None, description="时长（秒）")


class RepertoireCreate(RepertoireBase):
    pass


class Repertoire(RepertoireBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StageChannelBase(BaseModel):
    file_name: str = Field(..., description="文件名")
    repertoire_id: Optional[int] = Field(None, description="关联曲目ID")
    track_number: Optional[str] = Field(None, description="通道号")
    start_timecode: Optional[str] = Field(None, description="起始时码 HH:MM:SS:FF")
    end_timecode: Optional[str] = Field(None, description="结束时码 HH:MM:SS:FF")
    raw_description: Optional[str] = Field(None, description="舞台通道表原始描述")
    source_row: Optional[int] = Field(None, description="原始表格行号")


class StageChannelCreate(StageChannelBase):
    pass


class StageChannel(StageChannelBase):
    id: int
    start_seconds: Optional[int] = None
    end_seconds: Optional[int] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    repertoire: Optional[Repertoire] = None

    class Config:
        from_attributes = True


class PianoScheduleBase(BaseModel):
    piano_room_id: str = Field(..., description="琴房编号")
    schedule_date: date = Field(..., description="排期日期")
    start_time: time = Field(..., description="开始时间")
    end_time: time = Field(..., description="结束时间")
    performer: Optional[str] = Field(None, description="演奏者")
    stage_channel_id: Optional[int] = Field(None, description="关联舞台通道ID")
    remark: Optional[str] = Field(None, description="备注")


class PianoScheduleCreate(PianoScheduleBase):
    pass


class PianoScheduleUpdate(BaseModel):
    remark: Optional[str] = Field(None, description="备注")
    operator: str = Field(..., description="操作人")


class PianoSchedule(PianoScheduleBase):
    id: int
    is_withdrawn: bool = False
    created_at: datetime
    updated_at: datetime
    stage_channel: Optional[StageChannel] = None

    class Config:
        from_attributes = True


class ConflictRecordBase(BaseModel):
    conflict_type: str
    description: str
    status: str = "pending"
    conclusion: Optional[str] = None


class ConflictRecordUpdate(BaseModel):
    status: Optional[str] = None
    conclusion: Optional[str] = None
    operator: str = Field(..., description="操作人")


class ConflictRecord(ConflictRecordBase):
    id: int
    schedule_id: int
    related_schedule_id: Optional[int] = None
    stage_channel_id: Optional[int] = None
    raw_source: Optional[str] = None
    timecode_deviation_seconds: Optional[int] = None
    filter_criteria: Optional[Dict[str, Any]] = None
    operator: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    schedule: Optional[PianoSchedule] = None
    related_schedule: Optional[PianoSchedule] = None
    stage_channel: Optional[StageChannel] = None

    class Config:
        from_attributes = True


class WithdrawalRecordBase(BaseModel):
    schedule_id: int
    reason: str
    operator: str
    conflict_id: Optional[int] = None
    conclusion: Optional[str] = None


class WithdrawalRecordCreate(WithdrawalRecordBase):
    pass


class WithdrawalRecord(WithdrawalRecordBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class OperationHistoryBase(BaseModel):
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    operator: str


class OperationHistory(OperationHistoryBase):
    id: int
    schedule_id: Optional[int] = None
    conflict_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConflictQueueFilter(BaseModel):
    conflict_type: Optional[str] = None
    status: Optional[str] = None
    schedule_date_from: Optional[date] = None
    schedule_date_to: Optional[date] = None
    piano_room_id: Optional[str] = None
    performer: Optional[str] = None
    operator: Optional[str] = None


class DetectionRunResult(BaseModel):
    total_conflicts: int
    new_conflicts: int
    by_type: Dict[str, int]
    filter_criteria: Dict[str, Any]
