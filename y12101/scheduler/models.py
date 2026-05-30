"""

数据模型定义

包含订单、设备、物料、库存、生产计划等核心数据结构

"""

from dataclasses import dataclass, field

from datetime import datetime, date

from typing import List, Dict, Optional, Any

from enum import Enum

class OrderStatus(Enum):

    PENDING = "待排产"

    SCHEDULED = "已排产"

    IN_PROGRESS = "生产中"

    COMPLETED = "已完成"

    DELAYED = "已延期"

class MachineStatus(Enum):

    AVAILABLE = "可用"

    BUSY = "忙碌"

    MAINTENANCE = "维护中"

    BROKEN = "故障"

@dataclass

class Material:

    """物料定义"""

    material_id: str

    name: str

    unit: str

    lead_time_days: int = 0

    safety_stock: float = 0.0

    def to_dict(self) -> Dict[str, Any]:

        return {

            "material_id": self.material_id,

            "name": self.name,

            "unit": self.unit,

            "lead_time_days": self.lead_time_days,

            "safety_stock": self.safety_stock,

        }

@dataclass

class Inventory:

    """库存记录"""

    material_id: str

    quantity: float

    location: str = "默认仓库"

    last_updated: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:

        return {

            "material_id": self.material_id,

            "quantity": self.quantity,

            "location": self.location,

            "last_updated": self.last_updated.isoformat(),

        }

@dataclass

class Machine:

    """设备定义"""

    machine_id: str

    name: str

    capacity_per_hour: float

    available_hours_per_day: float = 8.0

    status: MachineStatus = MachineStatus.AVAILABLE

    maintenance_dates: List[date] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:

        return {

            "machine_id": self.machine_id,

            "name": self.name,

            "capacity_per_hour": self.capacity_per_hour,

            "available_hours_per_day": self.available_hours_per_day,

            "status": self.status.value,

            "maintenance_dates": [d.isoformat() for d in self.maintenance_dates],

        }

@dataclass

class Order:

    """订单定义"""

    order_id: str

    product_name: str

    quantity: float

    due_date: date

    priority: int = 1

    status: OrderStatus = OrderStatus.PENDING

    material_requirements: Dict[str, float] = field(default_factory=dict)

    required_machine: Optional[str] = None

    process_hours_per_unit: float = 1.0

    notes: str = ""

    def to_dict(self) -> Dict[str, Any]:

        return {

            "order_id": self.order_id,

            "product_name": self.product_name,

            "quantity": self.quantity,

            "due_date": self.due_date.isoformat(),

            "priority": self.priority,

            "status": self.status.value,

            "material_requirements": self.material_requirements,

            "required_machine": self.required_machine,

            "process_hours_per_unit": self.process_hours_per_unit,

            "notes": self.notes,

        }

@dataclass

class ScheduledTask:

    """排产任务"""

    order_id: str

    machine_id: str

    start_date: date

    end_date: date

    quantity: float

    hours_needed: float

    is_delayed: bool = False

    delay_reason: str = ""

    def to_dict(self) -> Dict[str, Any]:

        return {

            "order_id": self.order_id,

            "machine_id": self.machine_id,

            "start_date": self.start_date.isoformat(),

            "end_date": self.end_date.isoformat(),

            "quantity": self.quantity,

            "hours_needed": self.hours_needed,

            "is_delayed": self.is_delayed,

            "delay_reason": self.delay_reason,

        }

@dataclass

class ProductionPlan:

    """生产计划"""

    plan_id: str

    name: str

    created_at: datetime = field(default_factory=datetime.now)

    start_date: date = field(default_factory=lambda: date.today())

    end_date: Optional[date] = None

    scheduled_tasks: List[ScheduledTask] = field(default_factory=list)

    unscheduled_orders: List[str] = field(default_factory=list)

    constraints_violated: List[Dict[str, Any]] = field(default_factory=list)

    objective_value: float = 0.0

    is_feasible: bool = True

    def to_dict(self) -> Dict[str, Any]:

        return {

            "plan_id": self.plan_id,

            "name": self.name,

            "created_at": self.created_at.isoformat(),

            "start_date": self.start_date.isoformat(),

            "end_date": self.end_date.isoformat() if self.end_date else None,

            "scheduled_tasks": [t.to_dict() for t in self.scheduled_tasks],

            "unscheduled_orders": self.unscheduled_orders,

            "constraints_violated": self.constraints_violated,

            "objective_value": self.objective_value,

            "is_feasible": self.is_feasible,

        }

