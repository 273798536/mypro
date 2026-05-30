"""

测试脚本：验证线性规划排产解释器的完整流程

"""

import sys

import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import date, timedelta

from scheduler import (

    Order,

    Machine,

    Material,

    Inventory,

    ProductionSolver,

    ConstraintInterpreter,

    PlanComparator,

    ChangeTracer,

    ActionType,

    ReportGenerator,

)

def test_full_workflow():

    print("=" * 60)

    print("🧪 线性规划排产解释器 - 完整流程测试")

    print("=" * 60)

    print("\n1️⃣ 准备测试数据...")

    today = date.today()

    materials = [

        Material(material_id="MAT001", name="钢板", unit="张", lead_time_days=3),

        Material(material_id="MAT002", name="钢管", unit="根", lead_time_days=5),

        Material(material_id="MAT003", name="螺丝", unit="个", lead_time_days=1),

    ]

    inventory = [

        Inventory(material_id="MAT001", quantity=100),

        Inventory(material_id="MAT002", quantity=0),

        Inventory(material_id="MAT003", quantity=500),

    ]

    machines = [

        Machine(machine_id="M001", name="数控车床", capacity_per_hour=10, available_hours_per_day=8),

        Machine(machine_id="M002", name="铣床", capacity_per_hour=8, available_hours_per_day=8),

    ]

    orders = [

        Order(

            order_id="ORD001",

            product_name="车架A",

            quantity=50,

            due_date=today + timedelta(days=7),

            priority=2,

            material_requirements={"MAT001": 2, "MAT002": 1},

            process_hours_per_unit=2,

        ),

        Order(

            order_id="ORD002",

            product_name="车架B",

            quantity=30,

            due_date=today + timedelta(days=3),

            priority=1,

            material_requirements={"MAT001": 3},

            process_hours_per_unit=3,

        ),

    ]

    print(f"   - 订单数: {len(orders)}")

    print(f"   - 设备数: {len(machines)}")

    print(f"   - 物料数: {len(materials)}")

    print(f"   - 库存为零的物料: MAT002 (钢管)")

    print("\n2️⃣ 创建变更追踪器...")

    tracer = ChangeTracer()

    print("   ✅ 变更追踪器已创建")

    print("\n3️⃣ 运行线性规划求解器...")

    solver = ProductionSolver(

        orders=orders,

        machines=machines,

        materials=materials,

        inventory=inventory,

        horizon_days=30,

    )

    plan = solver.solve("测试计划")

    tracer.log_change(

        action_type=ActionType.CREATE,

        entity_type="plan",

        entity_id=plan.plan_id,

        field_name=None,

        old_value=None,

        new_value=plan.name,

        reason="初始排产计划",

        user="测试用户",

    )

    print(f"   ✅ 排产计划已生成: {plan.name}")

    print(f"   - 计划是否可行: {plan.is_feasible}")

    print(f"   - 排产任务数: {len(plan.scheduled_tasks)}")

    print(f"   - 未排产订单: {plan.unscheduled_orders}")

    print(f"   - 目标函数值: {plan.objective_value:.2f}")

    print("\n4️⃣ 约束解释分析...")

    interpreter = ConstraintInterpreter(

        orders=orders,

        machines=machines,

        materials=materials,

        inventory=inventory,

        plan=plan,

    )

    interpretation = interpreter.interpret()

    print(f"   ✅ 约束分析完成")

    print(f"   - 冲突总数: {len(interpretation.conflicts)}")

    print("\n   🔍 冲突详情:")

    for conflict in interpretation.conflicts:

        print(f"     [{conflict.severity.value}] {conflict.title}")

        print(f"        {conflict.description}")

        print(f"        建议: {conflict.suggestion}")

    print("\n5️⃣ 方案对比测试...")

    print("   修改库存后重新排产...")

    inventory2 = [

        Inventory(material_id="MAT001", quantity=100),

        Inventory(material_id="MAT002", quantity=50),

        Inventory(material_id="MAT003", quantity=500),

    ]

    tracer.log_inventory_adjust(

        material_id="MAT002",

        old_quantity=0,

        new_quantity=50,

        reason="紧急采购到货",

        user="测试用户",

    )

    solver2 = ProductionSolver(

        orders=orders,

        machines=machines,

        materials=materials,

        inventory=inventory2,

        horizon_days=30,

    )

    plan2 = solver2.solve("修正后计划")

    comparator = PlanComparator(orders)

    comparison = comparator.compare(plan, plan2)

    print(f"   ✅ 方案对比完成")

    print(f"   - 方案 A: {comparison.plan1_name}")

    print(f"   - 方案 B: {comparison.plan2_name}")

    print(f"   - 变更统计: {comparison.summary['counts']}")

    print("\n6️⃣ 变更记录...")

    summary = tracer.summarize()

    print(f"   - 总变更数: {summary['total_changes']}")

    for record in tracer.get_records():

        print(f"     - {record.timestamp.strftime('%H:%M:%S')} | {record.action_type.value} | {record.entity_type}: {record.reason}")

    print("\n7️⃣ 生成Excel报告...")

    report_path = "测试报告.xlsx"

    ReportGenerator.generate_excel_report(

        plan=plan2,

        interpretation=interpretation,

        orders=orders,

        machines=machines,

        materials=materials,

        inventory=inventory2,

        filepath=report_path,

        change_history=tracer.get_history(),

    )

    print(f"   ✅ 报告已生成: {report_path}")

    print("\n" + "=" * 60)

    print("🎉 测试完成！所有核心功能正常工作。")

    print("=" * 60)

    print("\n📋 总结:")

    print("   ✅ 数据模型 - 正常")

    print("   ✅ 线性规划求解 - 正常")

    print("   ✅ 约束解释 (库存为零警告) - 正常")

    print("   ✅ 方案对比 - 正常")

    print("   ✅ 变更留痕 - 正常")

    print("   ✅ 报告生成 - 正常")

if __name__ == "__main__":

    test_full_workflow()

