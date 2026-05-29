from dataclasses import dataclass, field
from datetime import date, datetime
from typing import List, Optional, Dict
from enum import Enum


class OrderType(Enum):
    FULL_DAY = "full_day"
    HALF_DAY = "half_day"
    HOUR_ROOM = "hour_room"


class ChannelType(Enum):
    OTA = "ota"
    GROUPON = "groupon"
    MEMBER_DIRECT = "member_direct"


@dataclass
class OrderRecord:
    order_id: str
    channel: str
    channel_type: ChannelType
    guest_name: str
    checkin_date: date
    checkout_date: date
    room_nights: float
    order_type: OrderType
    room_rate: float
    total_amount: float
    refund_amount: float
    refund_date: Optional[date] = None
    is_weekend: bool = False
    is_holiday: bool = False
    actual_checkin: Optional[date] = None
    actual_checkout: Optional[date] = None
    notes: str = ""
    
    @property
    def net_amount(self) -> float:
        return self.total_amount - self.refund_amount


@dataclass
class ChannelContract:
    channel: str
    channel_type: ChannelType
    commission_rate: float
    half_day_commission_rate: Optional[float] = None
    weekend_surcharge: float = 0.0
    holiday_surcharge: float = 0.0
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    notes: str = ""
    
    def get_commission_rate(self, order_type: OrderType, is_weekend: bool = False, is_holiday: bool = False) -> float:
        rate = self.commission_rate
        
        if order_type == OrderType.HALF_DAY and self.half_day_commission_rate is not None:
            rate = self.half_day_commission_rate
        
        if is_holiday:
            rate += self.holiday_surcharge
        elif is_weekend:
            rate += self.weekend_surcharge
        
        return rate


@dataclass
class DailyRate:
    rate_date: date
    base_rate: float
    is_weekend: bool
    is_holiday: bool
    holiday_name: str = ""


@dataclass
class CommissionResult:
    order_id: str
    channel: str
    channel_type: ChannelType
    checkin_date: date
    checkout_date: date
    order_type: OrderType
    room_nights: float
    total_amount: float
    refund_amount: float
    net_amount: float
    contract_rate: float
    calculated_commission: float
    expected_commission: float = 0.0
    difference: float = 0.0
    issues: List[str] = field(default_factory=list)
    source_materials: List[str] = field(default_factory=list)
    
    @property
    def has_issues(self) -> bool:
        return len(self.issues) > 0
    
    @property
    def has_difference(self) -> bool:
        return abs(self.difference) > 0.01


@dataclass
class ValidationIssue:
    severity: str
    message: str
    source_file: str
    row_number: Optional[int] = None
    field_name: Optional[str] = None
    order_id: Optional[str] = None
