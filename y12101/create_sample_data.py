"""

创建样例数据Excel文件

用于演示线性规划排产解释器的功能

"""

import pandas as pd

from datetime import date, timedelta

import json

today = date.today()

orders_data = [

    {

        "order_id": "ORD001",

        "product_name": "车架A",

        "quantity": 50,

        "due_date": today + timedelta(days=7),

        "priority": 2,

        "status": "待排产",

        "material_requirements": json.dumps({"MAT001": 2, "MAT002": 1, "MAT003": 8}),

        "required_machine": None,

        "process_hours_per_unit": 2,

        "notes": "重点客户订单",

    },

    {

        "order_id": "ORD002",

        "product_name": "车架B",

        "quantity": 30,

        "due_date": today + timedelta(days=5),

        "priority": 1,

        "status": "待排产",

        "material_requirements": json.dumps({"MAT001": 3, "MAT003": 12}),

        "required_machine": None,

        "process_hours_per_unit": 3,

        "notes": "加急订单",

    },

    {

        "order_id": "ORD003",

        "product_name": "支架",

        "quantity": 100,

        "due_date": today + timedelta(days=10),

        "priority": 3,

        "status": "待排产",

        "material_requirements": json.dumps({"MAT002": 0.5, "MAT003": 4}),

        "required_machine": None,

        "process_hours_per_unit": 0.5,

        "notes": "",

    },

    {

        "order_id": "ORD004",

        "product_name": "外壳",

        "quantity": 40,

        "due_date": today + timedelta(days=3),

        "priority": 1,

        "status": "待排产",

        "material_requirements": json.dumps({"MAT001": 1, "MAT004": 0.5}),

        "required_machine": None,

        "process_hours_per_unit": 1.5,

        "notes": "",

    },

]

machines_data = [

    {

        "machine_id": "M001",

        "name": "数控车床",

        "capacity_per_hour": 10,

        "available_hours_per_day": 8,

        "status": "可用",

        "maintenance_dates": "",

    },

    {

        "machine_id": "M002",

        "name": "铣床",

        "capacity_per_hour": 8,

        "available_hours_per_day": 8,

        "status": "可用",

        "maintenance_dates": "",

    },

    {

        "machine_id": "M003",

        "name": "焊接机",

        "capacity_per_hour": 5,

        "available_hours_per_day": 8,

        "status": "可用",

        "maintenance_dates": "",

    },

]

materials_data = [

    {"material_id": "MAT001", "name": "钢板", "unit": "张", "lead_time_days": 3, "safety_stock": 50},

    {"material_id": "MAT002", "name": "钢管", "unit": "根", "lead_time_days": 5, "safety_stock": 30},

    {"material_id": "MAT003", "name": "螺丝", "unit": "个", "lead_time_days": 1, "safety_stock": 200},

    {"material_id": "MAT004", "name": "油漆", "unit": "升", "lead_time_days": 2, "safety_stock": 100},

]

inventory_data = [

    {"material_id": "MAT001", "quantity": 100, "location": "默认仓库"},

    {"material_id": "MAT002", "quantity": 0, "location": "默认仓库"},

    {"material_id": "MAT003", "quantity": 500, "location": "默认仓库"},

    {"material_id": "MAT004", "quantity": 50, "location": "默认仓库"},

]

with pd.ExcelWriter("样例数据.xlsx", engine="openpyxl") as writer:

    pd.DataFrame(orders_data).to_excel(writer, sheet_name="orders", index=False)

    pd.DataFrame(machines_data).to_excel(writer, sheet_name="machines", index=False)

    pd.DataFrame(materials_data).to_excel(writer, sheet_name="materials", index=False)

    pd.DataFrame(inventory_data).to_excel(writer, sheet_name="inventory", index=False)

print("✅ 样例数据已创建: 样例数据.xlsx")

print("   - 4个订单 (包含交期冲突和物料需求)")

print("   - 3台设备")

print("   - 4种物料 (其中钢管库存为0，用于演示库存警告)")

print("   - 库存数据 (MAT002库存为0，故意设置用于演示)")

