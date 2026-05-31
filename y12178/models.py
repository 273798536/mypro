from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict


class OrderStatus(Enum):
    PENDING = "待处理"
    LOCKED = "库存已锁定"
    SHIPPING = "发货中"
    SHIPPED = "已发货"
    CANCELLED = "已取消"
    ADDRESS_CHANGED = "地址已变更"


class GiftStatus(Enum):
    INCLUDED = "已包含"
    OUT_OF_STOCK = "赠品缺货"
    NOT_APPLICABLE = "无赠品"


class IssueType(Enum):
    SIGNATURE_DUPLICATE = "签名号重复"
    GIFT_OUT_OF_STOCK = "赠品缺货"
    ADDRESS_CHANGED = "订单改址"
    BAD_ROW = "坏行数据"
    MISSING_COLUMN = "缺列"


@dataclass
class InventoryItem:
    sku: str
    title: str
    artist: str
    edition: str
    signature_number: Optional[str] = None
    is_signed: bool = False
    quantity_available: int = 0
    quantity_locked: int = 0
    batch_id: Optional[str] = None
    location: Optional[str] = None
    received_date: Optional[datetime] = None
    notes: Optional[str] = None


@dataclass
class Customer:
    customer_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None


@dataclass
class Address:
    address_id: str
    street: str
    city: str
    state: str
    zip_code: str
    country: str
    is_original: bool = True


@dataclass
class GiftItem:
    gift_id: str
    name: str
    sku: str
    quantity: int = 1
    status: GiftStatus = GiftStatus.INCLUDED


@dataclass
class OrderItem:
    order_item_id: str
    sku: str
    title: str
    quantity: int = 1
    unit_price: float = 0.0
    signature_number: Optional[str] = None
    gifts: List[GiftItem] = field(default_factory=list)


@dataclass
class Order:
    order_id: str
    customer: Customer
    items: List[OrderItem]
    shipping_address: Address
    original_address: Optional[Address] = None
    status: OrderStatus = OrderStatus.PENDING
    order_date: Optional[datetime] = None
    notes: Optional[str] = None


@dataclass
class InventoryLock:
    lock_id: str
    order_id: str
    sku: str
    signature_number: Optional[str]
    quantity: int
    locked_at: datetime
    locked_by: Optional[str] = None
    notes: Optional[str] = None


@dataclass
class BatchTracking:
    batch_id: str
    sku: str
    signature_numbers: List[str] = field(default_factory=list)
    received_date: Optional[datetime] = None
    supplier: Optional[str] = None
    total_quantity: int = 0
    quality_check_passed: bool = True
    notes: Optional[str] = None


@dataclass
class ShippingReview:
    review_id: str
    order_id: str
    reviewer: Optional[str] = None
    review_date: Optional[datetime] = None
    items_verified: List[str] = field(default_factory=list)
    gifts_verified: List[str] = field(default_factory=list)
    signature_numbers_verified: List[str] = field(default_factory=list)
    issues_found: List[str] = field(default_factory=list)
    approved: bool = False
    notes: Optional[str] = None


@dataclass
class IssueRecord:
    issue_id: str
    issue_type: IssueType
    order_id: Optional[str] = None
    sku: Optional[str] = None
    signature_number: Optional[str] = None
    description: str = ""
    source_row: Optional[int] = None
    source_data: Optional[Dict] = None
    detected_at: datetime = field(default_factory=datetime.now)
    reviewed: bool = False
    reviewer: Optional[str] = None
    resolution: Optional[str] = None


@dataclass
class BadRowRecord:
    row_number: int
    raw_data: str
    issues: List[str]
    source_file: str
    processed_at: datetime = field(default_factory=datetime.now)


@dataclass
class TraceRecord:
    order_id: str
    order: Optional[Order] = None
    inventory_locks: List[InventoryLock] = field(default_factory=list)
    batch_tracking: List[BatchTracking] = field(default_factory=list)
    shipping_review: Optional[ShippingReview] = None
    issues: List[IssueRecord] = field(default_factory=list)
