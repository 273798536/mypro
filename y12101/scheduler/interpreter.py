"""

约束解释器

分析排产结果，解释约束冲突原因，重点定位库存为零和交期冲突问题

"""

from datetime import date, timedelta

from typing import List, Dict, Any, Optional, Tuple

from dataclasses import dataclass

from enum import Enum

from .models import Order, Machine, Material, Inventory, ProductionPlan, ScheduledTask

class ConflictType(Enum):

    INSUFFICIENT_INVENTORY = "物料不足"

    ZERO_INVENTORY = "库存为零"

    DUE_DATE_CONFLICT = "交期冲突"

    MACHINE_CAPACITY = "产能不足"

    MAINTENANCE_CONFLICT = "设备维护冲突"

    UNSCHEDULED_ORDER = "订单未排产"

class Severity(Enum):

    CRITICAL = "严重"

    HIGH = "高"

    MEDIUM = "中"

    LOW = "低"

@dataclass

class ConflictDetail:

    conflict_type: ConflictType

    severity: Severity

    title: str

    description: str

    affected_orders: List[str]

    affected_materials: List[str]

    affected_machines: List[str]

    suggestion: str

    data: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:

        return {

            "conflict_type": self.conflict_type.value,

            "severity": self.severity.value,

            "title": self.title,

            "description": self.description,

            "affected_orders": self.affected_orders,

            "affected_materials": self.affected_materials,

            "affected_machines": self.affected_machines,

            "suggestion": self.suggestion,

            "data": self.data,

        }

@dataclass

class InterpretationResult:

    is_feasible: bool

    conflicts: List[ConflictDetail]

    summary: Dict[str, Any]

    bottlenecks: List[Dict[str, Any]]

    def to_dict(self) -> Dict[str, Any]:

        return {

            "is_feasible": self.is_feasible,

            "conflicts": [c.to_dict() for c in self.conflicts],

            "summary": self.summary,

            "bottlenecks": self.bottlenecks,

        }

class ConstraintInterpreter:

    def __init__(

        self,

        orders: List[Order],

        machines: List[Machine],

        materials: List[Material],

        inventory: List[Inventory],

        plan: ProductionPlan,

    ):

        self.orders = {o.order_id: o for o in orders}

        self.machines = {m.machine_id: m for m in machines}

        self.materials = {m.material_id: m for m in materials}

        self.inventory = {inv.material_id: inv.quantity for inv in inventory}

        self.plan = plan

        self.conflicts: List[ConflictDetail] = []

    def interpret(self) -> InterpretationResult:

        self._check_zero_inventory()

        self._check_insufficient_inventory()

        self._check_due_date_conflicts()

        self._check_machine_capacity()

        self._check_unscheduled_orders()

        summary = self._generate_summary()

        bottlenecks = self._identify_bottlenecks()

        return InterpretationResult(

            is_feasible=self.plan.is_feasible and len([c for c in self.conflicts if c.severity in [Severity.CRITICAL, Severity.HIGH]]) == 0,

            conflicts=sorted(self.conflicts, key=lambda x: self._severity_order(x.severity)),

            summary=summary,

            bottlenecks=bottlenecks,

        )

    def _severity_order(self, severity: Severity) -> int:

        order = {Severity.CRITICAL: 0, Severity.HIGH: 1, Severity.MEDIUM: 2, Severity.LOW: 3}

        return order.get(severity, 99)

    def _check_zero_inventory(self):

        for material_id, quantity in self.inventory.items():

            if quantity <= 0:

                material = self.materials.get(material_id)

                material_name = material.name if material else material_id

                affected_orders = []

                for order_id, order in self.orders.items():

                    if material_id in order.material_requirements:

                        affected_orders.append(order_id)

                conflict = ConflictDetail(

                    conflict_type=ConflictType.ZERO_INVENTORY,

                    severity=Severity.CRITICAL,

                    title=f"⚠️ 库存为零: {material_name}",

                    description=(

                        f"物料 '{material_name}' ({material_id}) 当前库存为 {quantity}，"

                        f"无法满足任何生产需求。"

                    ),

                    affected_orders=affected_orders,

                    affected_materials=[material_id],

                    affected_machines=[],

                    suggestion=(

                        f"紧急采购 '{material_name}'，预计到货周期 "

                        f"{material.lead_time_days if material else '未知'} 天。"

                    ),

                    data={

                        "material_id": material_id,

                        "material_name": material_name,

                        "current_inventory": quantity,

                        "lead_time_days": material.lead_time_days if material else 0,

                    },

                )

                self.conflicts.append(conflict)

    def _check_insufficient_inventory(self):

        material_consumption: Dict[str, Dict[str, Any]] = {}

        for task in self.plan.scheduled_tasks:

            order = self.orders.get(task.order_id)

            if not order:

                continue

            for material_id, req_per_unit in order.material_requirements.items():

                if material_id not in material_consumption:

                    material_consumption[material_id] = {

                        "total_required": 0,

                        "affected_orders": set(),

                        "by_date": {},

                    }

                total_req = task.quantity * req_per_unit

                material_consumption[material_id]["total_required"] += total_req

                material_consumption[material_id]["affected_orders"].add(task.order_id)

                date_key = task.start_date.isoformat()

                if date_key not in material_consumption[material_id]["by_date"]:

                    material_consumption[material_id]["by_date"][date_key] = 0

                material_consumption[material_id]["by_date"][date_key] += total_req

        for material_id, data in material_consumption.items():

            available = self.inventory.get(material_id, 0)

            required = data["total_required"]

            if required > available:

                material = self.materials.get(material_id)

                material_name = material.name if material else material_id

                shortage = required - available

                conflict = ConflictDetail(

                    conflict_type=ConflictType.INSUFFICIENT_INVENTORY,

                    severity=Severity.HIGH,

                    title=f"📦 物料不足: {material_name}",

                    description=(

                        f"物料 '{material_name}' 库存 {available} 无法满足生产需求 {required:.2f}，"

                        f"缺口 {shortage:.2f}。"

                    ),

                    affected_orders=list(data["affected_orders"]),

                    affected_materials=[material_id],

                    affected_machines=[],

                    suggestion=(

                        f"需要补充 {shortage:.2f} 单位的 '{material_name}'，"

                        f"或调整生产计划减少相关订单产量。"

                    ),

                    data={

                        "material_id": material_id,

                        "material_name": material_name,

                        "available": available,

                        "required": required,

                        "shortage": shortage,

                    },

                )

                self.conflicts.append(conflict)

    def _check_due_date_conflicts(self):

        delayed_tasks = [task for task in self.plan.scheduled_tasks if task.is_delayed]

        if not delayed_tasks:

            return

        order_delays: Dict[str, List[ScheduledTask]] = {}

        for task in delayed_tasks:

            if task.order_id not in order_delays:

                order_delays[task.order_id] = []

            order_delays[task.order_id].append(task)

        for order_id, tasks in order_delays.items():

            order = self.orders.get(order_id)

            if not order:

                continue

            last_task = max(tasks, key=lambda t: t.end_date)

            due_date = order.due_date

            actual_end = last_task.end_date

            delay_days = (actual_end - due_date).days

            conflict = ConflictDetail(

                conflict_type=ConflictType.DUE_DATE_CONFLICT,

                severity=Severity.HIGH if delay_days > 3 else Severity.MEDIUM,

                title=f"⏰ 交期冲突: 订单 {order_id}",

                description=(

                    f"订单 '{order_id}' ({order.product_name}) 预计 {actual_end} 完成，"

                    f"比交期 {due_date} 晚 {delay_days} 天。"

                ),

                affected_orders=[order_id],

                affected_materials=[],

                affected_machines=[t.machine_id for t in tasks],

                suggestion=(

                    f"考虑增加设备产能、优先安排此订单、或与客户协商延后交期。"

                ),

                data={

                    "order_id": order_id,

                    "product_name": order.product_name,

                    "due_date": due_date.isoformat(),

                    "actual_end": actual_end.isoformat(),

                    "delay_days": delay_days,

                },

            )

            self.conflicts.append(conflict)

    def _check_machine_capacity(self):

        machine_utilization: Dict[str, Dict[str, Any]] = {}

        for task in self.plan.scheduled_tasks:

            machine_id = task.machine_id

            if machine_id not in machine_utilization:

                machine = self.machines.get(machine_id)

                machine_utilization[machine_id] = {

                    "machine_name": machine.name if machine else machine_id,

                    "total_hours": 0,

                    "tasks": [],

                }

            machine_utilization[machine_id]["total_hours"] += task.hours_needed

            machine_utilization[machine_id]["tasks"].append(task)

        for machine_id, data in machine_utilization.items():

            machine = self.machines.get(machine_id)

            if not machine:

                continue

            total_available = machine.available_hours_per_day * self._get_working_days()

            utilization = data["total_hours"] / total_available if total_available > 0 else 1

            if utilization > 0.95:

                conflict = ConflictDetail(

                    conflict_type=ConflictType.MACHINE_CAPACITY,

                    severity=Severity.HIGH if utilization > 1.1 else Severity.MEDIUM,

                    title=f"⚙️ 产能紧张: {data['machine_name']}",

                    description=(

                        f"设备 '{data['machine_name']}' 利用率达 {utilization:.1%}，"

                        f"已接近或超过最大产能。"

                    ),

                    affected_orders=list({t.order_id for t in data["tasks"]}),

                    affected_materials=[],

                    affected_machines=[machine_id],

                    suggestion=(

                        f"考虑增加工作时间、分流任务到其他设备、或推迟非紧急订单。"

                    ),

                    data={

                        "machine_id": machine_id,

                        "machine_name": data["machine_name"],

                        "utilization": utilization,

                        "total_hours": data["total_hours"],

                        "available_hours": total_available,

                    },

                )

                self.conflicts.append(conflict)

    def _check_unscheduled_orders(self):

        for order_id in self.plan.unscheduled_orders:

            order = self.orders.get(order_id)

            if not order:

                continue

            conflict = ConflictDetail(

                conflict_type=ConflictType.UNSCHEDULED_ORDER,

                severity=Severity.CRITICAL,

                title=f"❌ 无法排产: 订单 {order_id}",

                description=(

                    f"订单 '{order_id}' ({order.product_name}, 数量 {order.quantity}) "

                    f"无法在计划周期内安排生产。"

                ),

                affected_orders=[order_id],

                affected_materials=[],

                affected_machines=[],

                suggestion=(

                    f"检查物料是否充足、设备是否可用、或延长计划周期。"

                ),

                data={

                    "order_id": order_id,

                    "product_name": order.product_name,

                    "quantity": order.quantity,

                    "due_date": order.due_date.isoformat(),

                },

            )

            self.conflicts.append(conflict)

    def _get_working_days(self) -> int:

        if not self.plan.scheduled_tasks:

            return 30

        start = self.plan.start_date

        end = max(task.end_date for task in self.plan.scheduled_tasks)

        return (end - start).days + 1

    def _generate_summary(self) -> Dict[str, Any]:

        severity_counts = {

            "CRITICAL": 0,

            "HIGH": 0,

            "MEDIUM": 0,

            "LOW": 0,

        }

        type_counts: Dict[str, int] = {}

        for conflict in self.conflicts:

            severity_counts[conflict.severity.name] += 1

            type_name = conflict.conflict_type.value

            type_counts[type_name] = type_counts.get(type_name, 0) + 1

        total_orders = len(self.orders)

        scheduled_count = len({t.order_id for t in self.plan.scheduled_tasks})

        delayed_count = len({t.order_id for t in self.plan.scheduled_tasks if t.is_delayed})

        return {

            "total_orders": total_orders,

            "scheduled_orders": scheduled_count,

            "unscheduled_orders": len(self.plan.unscheduled_orders),

            "delayed_orders": delayed_count,

            "on_time_rate": (scheduled_count - delayed_count) / total_orders if total_orders > 0 else 0,

            "severity_counts": severity_counts,

            "type_counts": type_counts,

            "total_conflicts": len(self.conflicts),

        }

    def _identify_bottlenecks(self) -> List[Dict[str, Any]]:

        bottlenecks = []

        inventory_conflicts = [

            c for c in self.conflicts

            if c.conflict_type in [ConflictType.ZERO_INVENTORY, ConflictType.INSUFFICIENT_INVENTORY]

        ]

        if inventory_conflicts:

            bottlenecks.append({

                "type": "物料瓶颈",

                "description": "物料供应是主要制约因素",

                "materials": [m for c in inventory_conflicts for m in c.affected_materials],

                "impact": f"影响 {len(set(o for c in inventory_conflicts for o in c.affected_orders))} 个订单",

            })

        capacity_conflicts = [

            c for c in self.conflicts if c.conflict_type == ConflictType.MACHINE_CAPACITY

        ]

        if capacity_conflicts:

            bottlenecks.append({

                "type": "产能瓶颈",

                "description": "设备产能是主要制约因素",

                "machines": [m for c in capacity_conflicts for m in c.affected_machines],

                "impact": f"影响 {len(set(o for c in capacity_conflicts for o in c.affected_orders))} 个订单",

            })

        return bottlenecks

