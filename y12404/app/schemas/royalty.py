from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal

from app.models.database import RoyaltyStatus, Currency, Platform, EventType


class ProducerBase(BaseModel):
    name: str = Field(..., max_length=200, description="制作人名称")
    contact: Optional[str] = Field(None, max_length=200, description="联系方式")
    email: Optional[str] = Field(None, max_length=200, description="邮箱")
    tax_id: Optional[str] = Field(None, max_length=100, description="税号")
    split_ratio: float = Field(1.0, ge=0, le=1, description="分成比例")


class ProducerCreate(ProducerBase):
    pass


class Producer(ProducerBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TrackBase(BaseModel):
    isrc: str = Field(..., max_length=12, description="ISRC编码")
    title: str = Field(..., max_length=200, description="曲目名称")
    artist: Optional[str] = Field(None, max_length=200, description="艺术家")
    album: Optional[str] = Field(None, max_length=200, description="专辑")
    producer_id: Optional[int] = Field(None, description="制作人ID")


class TrackCreate(TrackBase):
    pass


class Track(TrackBase):
    id: int
    created_at: datetime
    producer: Optional[Producer] = None

    class Config:
        from_attributes = True


class ExchangeRateBase(BaseModel):
    from_currency: Currency = Field(..., description="源币种")
    to_currency: Currency = Field(Currency.CNY, description="目标币种")
    rate: Decimal = Field(..., max_digits=15, decimal_places=6, description="汇率")
    rate_date: date = Field(..., description="汇率日期")
    source: str = Field(..., max_length=100, description="汇率来源")


class ExchangeRateCreate(ExchangeRateBase):
    pass


class ExchangeRate(ExchangeRateBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class PlayReportBase(BaseModel):
    platform: Platform = Field(..., description="平台")
    report_period: str = Field(..., max_length=20, description="报表期间，如2024Q1")
    report_date: date = Field(..., description="报表日期")
    currency: Currency = Field(..., description="币种")
    total_amount: Decimal = Field(..., max_digits=15, decimal_places=2, description="总金额")
    file_name: Optional[str] = Field(None, max_length=500, description="文件名")
    uploaded_by: Optional[str] = Field(None, max_length=100, description="上传人")


class PlayReportCreate(PlayReportBase):
    pass


class PlayReport(PlayReportBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class RoyaltyDetailBase(BaseModel):
    play_report_id: Optional[int] = Field(None, description="播放报表ID")
    track_id: Optional[int] = Field(None, description="曲目ID")
    producer_id: Optional[int] = Field(None, description="制作人ID")
    platform: Platform = Field(..., description="平台")
    report_period: str = Field(..., max_length=20, description="报表期间")
    streams: Optional[int] = Field(None, description="播放量")
    original_currency: Currency = Field(..., description="原始币种")
    original_amount: Decimal = Field(..., max_digits=15, decimal_places=4, description="原始金额")
    tax_rate: float = Field(0.0, ge=0, le=1, description="税率")
    notes: Optional[str] = Field(None, description="备注")


class RoyaltyDetailCreate(RoyaltyDetailBase):
    pass


class RoyaltyDetail(RoyaltyDetailBase):
    id: int
    exchange_rate: Optional[Decimal] = None
    cny_amount: Optional[Decimal] = None
    withholding_tax: Optional[Decimal] = None
    net_amount: Optional[Decimal] = None
    status: RoyaltyStatus
    created_at: datetime
    updated_at: datetime
    track: Optional[Track] = None
    producer: Optional[Producer] = None
    play_report: Optional[PlayReport] = None

    class Config:
        from_attributes = True


class RoyaltyDetailQuery(BaseModel):
    report_period: Optional[str] = Field(None, description="报表期间")
    platform: Optional[Platform] = Field(None, description="平台")
    producer_id: Optional[int] = Field(None, description="制作人ID")
    status: Optional[RoyaltyStatus] = Field(None, description="状态")
    track_title: Optional[str] = Field(None, description="曲目名称")
    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(50, ge=1, le=500, description="每页条数")


class RoyaltyStatusUpdate(BaseModel):
    status: RoyaltyStatus = Field(..., description="新状态")
    change_reason: str = Field(..., max_length=500, description="变更原因")
    operator: str = Field(..., max_length=100, description="操作人")


class RoyaltyAccrualBase(BaseModel):
    report_period: str = Field(..., max_length=20, description="报表期间")
    platform: Platform = Field(..., description="平台")
    created_by: str = Field(..., max_length=100, description="创建人")


class RoyaltyAccrualCreate(RoyaltyAccrualBase):
    detail_ids: List[int] = Field(..., description="版税明细ID列表")


class RoyaltyAccrual(BaseModel):
    id: int
    accrual_reference: str
    report_period: str
    platform: Platform
    total_original_amount: Decimal
    total_cny_amount: Decimal
    total_withholding_tax: Decimal
    total_net_amount: Decimal
    currency_conversion_note: Optional[str] = None
    status: str
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True


class RoyaltyHistoryBase(BaseModel):
    royalty_detail_id: int
    event_type: EventType
    change_reason: Optional[str] = Field(None, max_length=500)
    operator: str = Field(..., max_length=100)


class RoyaltyHistory(RoyaltyHistoryBase):
    id: int
    old_status: Optional[RoyaltyStatus] = None
    new_status: Optional[RoyaltyStatus] = None
    old_amount: Optional[Decimal] = None
    new_amount: Optional[Decimal] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RoyaltyTrialCalculateRequest(BaseModel):
    report_period: str = Field(..., description="报表期间")
    platform: Optional[Platform] = Field(None, description="平台")
    detail_ids: Optional[List[int]] = Field(None, description="指定明细ID，为空则按期间和平台筛选")


class RoyaltyTrialResult(BaseModel):
    total_records: int = Field(..., description="总记录数")
    total_original_amount: Decimal = Field(..., description="原始金额合计")
    total_cny_amount: Decimal = Field(..., description="人民币金额合计")
    total_withholding_tax: Decimal = Field(..., description="预提税合计")
    total_net_amount: Decimal = Field(..., description="净额合计")
    currency_breakdown: dict = Field(..., description="币种明细")
    conversion_note: str = Field(..., description="币种换算口径说明")
    details: List[RoyaltyDetail] = Field(..., description="明细列表")


class ExportLogResponse(BaseModel):
    id: int
    export_type: str
    file_name: str
    record_count: int
    exported_by: str
    created_at: datetime

    class Config:
        from_attributes = True


class ApiResponse(BaseModel):
    code: int = Field(200, description="响应码")
    message: str = Field("success", description="响应消息")
    data: Optional[dict] = Field(None, description="响应数据")


class ErrorDetail(BaseModel):
    error_code: str
    error_message: str
    user_friendly_message: str
