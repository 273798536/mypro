"""

数据导入导出工具

支持Excel/CSV格式的样例数据导入和报告导出

"""

import json

from datetime import date, datetime

from typing import List, Dict, Any, Optional, Tuple

import pandas as pd

from .models import Order, Machine, Material, Inventory, ProductionPlan, ScheduledTask, OrderStatus, MachineStatus

class DataImporter:

    @staticmethod

    def import_orders_from_excel(filepath: str) -> List[Order]:

        df = pd.read_excel(filepath, sheet_name="orders")

        orders = []

        for _, row in df.iterrows():

            material_reqs = {}

            if "material_requirements" in row and pd.notna(row["material_requirements"]):

                try:

                    material_reqs = json.loads(row["material_requirements"])

                except:

                    pass

            order = Order(

                order_id=str(row.get("order_id", "")),

                product_name=str(row.get("product_name", "")),

                quantity=float(row.get("quantity", 0)),

                due_date=pd.to_datetime(row.get("due_date", date.today())).date(),

                priority=int(row.get("priority", 1)),

                status=OrderStatus(str(row.get("status", "待排产"))),

                material_requirements=material_reqs,

                required_machine=str(row.get("required_machine")) if pd.notna(row.get("required_machine")) else None,

                process_hours_per_unit=float(row.get("process_hours_per_unit", 1)),

                notes=str(row.get("notes", "")),

            )

            orders.append(order)

        return orders

    @staticmethod

    def import_machines_from_excel(filepath: str) -> List[Machine]:

        df = pd.read_excel(filepath, sheet_name="machines")

        machines = []

        for _, row in df.iterrows():

            maintenance_dates = []

            if "maintenance_dates" in row and pd.notna(row["maintenance_dates"]):

                try:

                    dates_str = row["maintenance_dates"]

                    if isinstance(dates_str, str):

                        maintenance_dates = [

                            datetime.strptime(d.strip(), "%Y-%m-%d").date()

                            for d in dates_str.split(",")

                        ]

                except:

                    pass

            machine = Machine(

                machine_id=str(row.get("machine_id", "")),

                name=str(row.get("name", "")),

                capacity_per_hour=float(row.get("capacity_per_hour", 0)),

                available_hours_per_day=float(row.get("available_hours_per_day", 8)),

                status=MachineStatus(str(row.get("status", "可用"))),

                maintenance_dates=maintenance_dates,

            )

            machines.append(machine)

        return machines

    @staticmethod

    def import_materials_from_excel(filepath: str) -> List[Material]:

        df = pd.read_excel(filepath, sheet_name="materials")

        materials = []

        for _, row in df.iterrows():

            material = Material(

                material_id=str(row.get("material_id", "")),

                name=str(row.get("name", "")),

                unit=str(row.get("unit", "")),

                lead_time_days=int(row.get("lead_time_days", 0)),

                safety_stock=float(row.get("safety_stock", 0)),

            )

            materials.append(material)

        return materials

    @staticmethod

    def import_inventory_from_excel(filepath: str) -> List[Inventory]:

        df = pd.read_excel(filepath, sheet_name="inventory")

        inventory = []

        for _, row in df.iterrows():

            inv = Inventory(

                material_id=str(row.get("material_id", "")),

                quantity=float(row.get("quantity", 0)),

                location=str(row.get("location", "默认仓库")),

            )

            inventory.append(inv)

        return inventory

    @staticmethod

    def import_all_from_excel(filepath: str) -> Dict[str, Any]:

        return {

            "orders": DataImporter.import_orders_from_excel(filepath),

            "machines": DataImporter.import_machines_from_excel(filepath),

            "materials": DataImporter.import_materials_from_excel(filepath),

            "inventory": DataImporter.import_inventory_from_excel(filepath),

        }

class ReportGenerator:

    @staticmethod

    def generate_excel_report(

        plan: ProductionPlan,

        interpretation: Any,

        orders: List[Order],

        machines: List[Machine],

        materials: List[Material],

        inventory: List[Inventory],

        filepath: str,

        change_history: Optional[List[Dict[str, Any]]] = None,

    ):

        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:

            ReportGenerator._write_summary_sheet(writer, plan, interpretation, orders)

            ReportGenerator._write_schedule_sheet(writer, plan, orders, machines)

            ReportGenerator._write_conflicts_sheet(writer, interpretation)

            ReportGenerator._write_orders_sheet(writer, orders)

            ReportGenerator._write_inventory_sheet(writer, inventory, materials)

            if change_history:

                ReportGenerator._write_changelog_sheet(writer, change_history)

    @staticmethod

    def _write_summary_sheet(writer, plan, interpretation, orders):

        summary_data = []

        summary_data.append({"项目": "计划名称", "值": plan.name})

        summary_data.append({"项目": "计划ID", "值": plan.plan_id})

        summary_data.append({"项目": "创建时间", "值": plan.created_at.strftime("%Y-%m-%d %H:%M:%S")})

        summary_data.append({"项目": "开始日期", "值": plan.start_date.isoformat()})

        summary_data.append({"项目": "结束日期", "值": plan.end_date.isoformat() if plan.end_date else "-"})

        summary_data.append({"项目": "是否可行", "值": "是" if plan.is_feasible else "否"})

        summary_data.append({"项目": "目标函数值", "值": round(plan.objective_value, 2)})

        summary_data.append({})

        summary_data.append({"项目": "订单总数", "值": len(orders)})

        summary_data.append({"项目": "已排产订单", "值": interpretation.summary["scheduled_orders"]})

        summary_data.append({"项目": "未排产订单", "值": interpretation.summary["unscheduled_orders"]})

        summary_data.append({"项目": "延期订单", "值": interpretation.summary["delayed_orders"]})

        summary_data.append({"项目": "准交率", "值": f"{interpretation.summary['on_time_rate']:.1%}"})

        summary_data.append({})

        summary_data.append({"项目": "冲突总数", "值": interpretation.summary["total_conflicts"]})

        severity = interpretation.summary["severity_counts"]

        summary_data.append({"项目": "严重冲突", "值": severity.get("CRITICAL", 0)})

        summary_data.append({"项目": "高优先级冲突", "值": severity.get("HIGH", 0)})

        summary_data.append({"项目": "中优先级冲突", "值": severity.get("MEDIUM", 0)})

        summary_data.append({"项目": "低优先级冲突", "值": severity.get("LOW", 0)})

        df = pd.DataFrame(summary_data)

        df.to_excel(writer, sheet_name="概览", index=False)

    @staticmethod

    def _write_schedule_sheet(writer, plan, orders, machines):

        orders_dict = {o.order_id: o for o in orders}

        machines_dict = {m.machine_id: m for m in machines}

        data = []

        for task in plan.scheduled_tasks:

            order = orders_dict.get(task.order_id, None)

            machine = machines_dict.get(task.machine_id, None)

            data.append({

                "订单ID": task.order_id,

                "产品名称": order.product_name if order else "-",

                "设备ID": task.machine_id,

                "设备名称": machine.name if machine else "-",

                "开始日期": task.start_date.isoformat(),

                "结束日期": task.end_date.isoformat(),

                "数量": round(task.quantity, 2),

                "所需工时": round(task.hours_needed, 2),

                "是否延期": "是" if task.is_delayed else "否",

                "延期原因": task.delay_reason,

            })

        df = pd.DataFrame(data)

        df.to_excel(writer, sheet_name="排产计划", index=False)

    @staticmethod

    def _write_conflicts_sheet(writer, interpretation):

        data = []

        for conflict in interpretation.conflicts:

            data.append({

                "严重程度": conflict.severity.value,

                "类型": conflict.conflict_type.value,

                "标题": conflict.title,

                "描述": conflict.description,

                "影响订单": ", ".join(conflict.affected_orders),

                "影响物料": ", ".join(conflict.affected_materials),

                "影响设备": ", ".join(conflict.affected_machines),

                "建议": conflict.suggestion,

            })

        df = pd.DataFrame(data)

        df.to_excel(writer, sheet_name="冲突分析", index=False)

    @staticmethod

    def _write_orders_sheet(writer, orders):

        data = []

        for order in orders:

            data.append({

                "订单ID": order.order_id,

                "产品名称": order.product_name,

                "数量": order.quantity,

                "交期": order.due_date.isoformat(),

                "优先级": order.priority,

                "状态": order.status.value,

                "物料需求": json.dumps(order.material_requirements, ensure_ascii=False),

                "指定设备": order.required_machine or "-",

                "单位工时": order.process_hours_per_unit,

                "备注": order.notes,

            })

        df = pd.DataFrame(data)

        df.to_excel(writer, sheet_name="订单列表", index=False)

    @staticmethod

    def _write_inventory_sheet(writer, inventory, materials):

        materials_dict = {m.material_id: m for m in materials}

        data = []

        for inv in inventory:

            material = materials_dict.get(inv.material_id, None)

            data.append({

                "物料ID": inv.material_id,

                "物料名称": material.name if material else "-",

                "单位": material.unit if material else "-",

                "当前库存": inv.quantity,

                "安全库存": material.safety_stock if material else 0,

                "采购周期(天)": material.lead_time_days if material else 0,

                "仓库": inv.location,

                "更新时间": inv.last_updated.strftime("%Y-%m-%d %H:%M:%S"),

            })

        df = pd.DataFrame(data)

        df.to_excel(writer, sheet_name="库存状态", index=False)

    @staticmethod

    def _write_changelog_sheet(writer, change_history):

        data = []

        for record in change_history:

            data.append({

                "记录ID": record["record_id"],

                "操作类型": record["action_type"],

                "时间": record["timestamp"],

                "用户": record["user"],

                "实体类型": record["entity_type"],

                "实体ID": record["entity_id"],

                "字段": record["field_name"] or "-",

                "原值": str(record["old_value"]) if record["old_value"] is not None else "-",

                "新值": str(record["new_value"]) if record["new_value"] is not None else "-",

                "原因": record["reason"],

            })

        df = pd.DataFrame(data)

        df.to_excel(writer, sheet_name="变更记录", index=False)

