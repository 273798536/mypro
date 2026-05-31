from dataclasses import dataclass, field
from enum import Enum
from datetime import date, datetime
from typing import List, Dict, Optional
import uuid


class WorkOrderStatus(Enum):
    PENDING = "待处理"
    CHECKED = "已检查"
    BLOCKED = "受阻"
    READY = "可开工"
    IN_PROGRESS = "维修中"
    COMPLETED = "已完成"
    CANCELLED = "已取消"


@dataclass
class PartRequirement:
    part_name: str
    quantity: int
    locked: bool = False
    locked_at: Optional[datetime] = None
    work_order_id: Optional[str] = None


@dataclass
class InstrumentType:
    id: str
    name: str
    category: str
    common_parts: List[str] = field(default_factory=list)
    difficulty_level: int = 1

    @classmethod
    def from_dict(cls, data: Dict) -> "InstrumentType":
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            name=data["name"],
            category=data.get("category", "未分类"),
            common_parts=data.get("common_parts", []),
            difficulty_level=data.get("difficulty_level", 1),
        )


@dataclass
class PartInventory:
    id: str
    name: str
    stock_quantity: int
    min_stock: int = 0
    unit: str = "个"
    supplier: str = ""

    @classmethod
    def from_dict(cls, data: Dict) -> "PartInventory":
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            name=data["name"],
            stock_quantity=int(data.get("stock_quantity", 0)),
            min_stock=int(data.get("min_stock", 0)),
            unit=data.get("unit", "个"),
            supplier=data.get("supplier", ""),
        )

    def is_low_stock(self) -> bool:
        return self.stock_quantity <= self.min_stock


@dataclass
class Technician:
    id: str
    name: str
    skills: List[str] = field(default_factory=list)
    leave_dates: List[date] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: Dict) -> "Technician":
        leave_dates = []
        for d in data.get("leave_dates", []):
            if isinstance(d, str):
                leave_dates.append(date.fromisoformat(d))
            elif isinstance(d, date):
                leave_dates.append(d)
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            name=data["name"],
            skills=data.get("skills", []),
            leave_dates=leave_dates,
        )

    def is_on_leave(self, check_date: date) -> bool:
        return check_date in self.leave_dates


@dataclass
class WorkOrder:
    id: str
    customer_name: str
    instrument_type: str
    instrument_model: str
    issue_description: str
    status: WorkOrderStatus = WorkOrderStatus.PENDING
    assigned_technician: Optional[str] = None
    scheduled_date: Optional[date] = None
    parts_required: List[PartRequirement] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    notes: List[str] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: Dict) -> "WorkOrder":
        parts_required = []
        for pr in data.get("parts_required", []):
            if isinstance(pr, dict):
                parts_required.append(PartRequirement(
                    part_name=pr["part_name"],
                    quantity=int(pr["quantity"]),
                    locked=pr.get("locked", False),
                    locked_at=datetime.fromisoformat(pr["locked_at"]) if pr.get("locked_at") else None,
                    work_order_id=pr.get("work_order_id"),
                ))
            elif isinstance(pr, PartRequirement):
                parts_required.append(pr)

        scheduled_date = None
        if data.get("scheduled_date"):
            if isinstance(data["scheduled_date"], str):
                scheduled_date = date.fromisoformat(data["scheduled_date"])
            elif isinstance(data["scheduled_date"], date):
                scheduled_date = data["scheduled_date"]

        status = WorkOrderStatus.PENDING
        if data.get("status"):
            if isinstance(data["status"], str):
                for s in WorkOrderStatus:
                    if s.value == data["status"] or s.name == data["status"]:
                        status = s
                        break
            elif isinstance(data["status"], WorkOrderStatus):
                status = data["status"]

        return cls(
            id=data.get("id", str(uuid.uuid4())),
            customer_name=data["customer_name"],
            instrument_type=data["instrument_type"],
            instrument_model=data.get("instrument_model", ""),
            issue_description=data["issue_description"],
            status=status,
            assigned_technician=data.get("assigned_technician"),
            scheduled_date=scheduled_date,
            parts_required=parts_required,
            created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else datetime.now(),
            updated_at=datetime.fromisoformat(data["updated_at"]) if data.get("updated_at") else datetime.now(),
            notes=data.get("notes", []),
        )


@dataclass
class Notification:
    id: str
    work_order_id: str
    message: str
    type: str
    created_at: datetime = field(default_factory=datetime.now)
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolution_note: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict) -> "Notification":
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            work_order_id=data["work_order_id"],
            message=data["message"],
            type=data["type"],
            created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else datetime.now(),
            resolved=data.get("resolved", False),
            resolved_at=datetime.fromisoformat(data["resolved_at"]) if data.get("resolved_at") else None,
            resolution_note=data.get("resolution_note"),
        )


@dataclass
class RepairShopData:
    work_orders: List[WorkOrder] = field(default_factory=list)
    instrument_types: List[InstrumentType] = field(default_factory=list)
    part_inventories: List[PartInventory] = field(default_factory=list)
    technicians: List[Technician] = field(default_factory=list)
    notifications: List[Notification] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "work_orders": [wo.__dict__ for wo in self.work_orders],
            "instrument_types": [it.__dict__ for it in self.instrument_types],
            "part_inventories": [pi.__dict__ for pi in self.part_inventories],
            "technicians": [t.__dict__ for t in self.technicians],
            "notifications": [n.__dict__ for n in self.notifications],
        }
