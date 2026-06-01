from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class OrderStatus(Enum):
    PENDING = "待发货"
    PARTIAL = "部分发货"
    SHIPPED = "已发货"
    CANCELLED = "已取消"


class RiskType(Enum):
    VERSION_MISMATCH = "版本漏配"
    SIGNED_SHORTAGE = "签名缺货"
    ORDER_SPLIT = "订单拆分"


@dataclass
class PreOrder:
    order_id: str
    customer_name: str
    album_name: str
    version: str
    quantity: int
    is_signed: bool
    order_date: datetime
    status: OrderStatus = OrderStatus.PENDING
    source: str = "预售"
    remarks: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "订单编号": self.order_id,
            "客户名称": self.customer_name,
            "专辑名称": self.album_name,
            "版本": self.version,
            "数量": self.quantity,
            "是否签名": "是" if self.is_signed else "否",
            "下单日期": self.order_date.strftime("%Y-%m-%d"),
            "状态": self.status.value,
            "来源": self.source,
            "备注": self.remarks or ""
        }


@dataclass
class VersionItem:
    album_name: str
    version: str
    is_signed: bool
    pressing_quantity: int
    pressing_date: Optional[datetime] = None
    expected_arrival: Optional[datetime] = None
    remarks: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "专辑名称": self.album_name,
            "版本": self.version,
            "是否签名": "是" if self.is_signed else "否",
            "压盘数量": self.pressing_quantity,
            "压盘日期": self.pressing_date.strftime("%Y-%m-%d") if self.pressing_date else "",
            "预计到货": self.expected_arrival.strftime("%Y-%m-%d") if self.expected_arrival else "",
            "备注": self.remarks or ""
        }


@dataclass
class SleeveInventory:
    album_name: str
    version: str
    quantity: int
    location: str
    last_updated: datetime = field(default_factory=datetime.now)
    remarks: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "专辑名称": self.album_name,
            "版本": self.version,
            "库存数量": self.quantity,
            "存放位置": self.location,
            "更新日期": self.last_updated.strftime("%Y-%m-%d"),
            "备注": self.remarks or ""
        }


@dataclass
class ShippingItem:
    shipping_id: str
    order_id: str
    customer_name: str
    album_name: str
    version: str
    quantity: int
    is_signed: bool
    shipping_date: Optional[datetime] = None
    tracking_number: Optional[str] = None
    status: str = "待发货"
    source_records: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self, include_source: bool = True) -> Dict[str, Any]:
        result = {
            "发货单号": self.shipping_id,
            "订单编号": self.order_id,
            "客户名称": self.customer_name,
            "专辑名称": self.album_name,
            "版本": self.version,
            "发货数量": self.quantity,
            "是否签名": "是" if self.is_signed else "否",
            "发货日期": self.shipping_date.strftime("%Y-%m-%d") if self.shipping_date else "",
            "快递单号": self.tracking_number or "",
            "状态": self.status
        }
        if include_source and self.source_records:
            result["来源明细"] = self.source_records
        return result


@dataclass
class RiskAlert:
    risk_id: str
    risk_type: RiskType
    album_name: str
    version: str
    description: str
    affected_orders: List[str] = field(default_factory=list)
    shortage_quantity: int = 0
    created_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "风险编号": self.risk_id,
            "风险类型": self.risk_type.value,
            "专辑名称": self.album_name,
            "版本": self.version,
            "风险描述": self.description,
            "影响订单数": len(self.affected_orders),
            "影响订单": ", ".join(self.affected_orders),
            "缺货数量": self.shortage_quantity,
            "创建时间": self.created_at.strftime("%Y-%m-%d %H:%M")
        }


@dataclass
class VersionSnapshot:
    snapshot_id: str
    snapshot_time: datetime
    version_list: List[VersionItem]
    pre_orders: List[PreOrder]
    sleeve_inventory: List[SleeveInventory]
    description: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "快照编号": self.snapshot_id,
            "快照时间": self.snapshot_time.strftime("%Y-%m-%d %H:%M:%S"),
            "描述": self.description,
            "版本清单数量": len(self.version_list),
            "预售订单数量": len(self.pre_orders),
            "封套库存数量": len(self.sleeve_inventory)
        }
