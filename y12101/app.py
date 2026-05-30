"""

线性规划排产解释器 - Web界面

使用Streamlit构建的交互式界面，支持数据导入、排产求解、约束解释、方案对比和报告输出

"""

import streamlit as st

import pandas as pd

from datetime import date, datetime, timedelta

import json

import os

import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

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

    DataImporter,

    ReportGenerator,

    OrderStatus,

    MachineStatus,

)

st.set_page_config(

    page_title="线性规划排产解释器",

    page_icon="📋",

    layout="wide",

    initial_sidebar_state="expanded",

)

if "orders" not in st.session_state:

    st.session_state.orders = []

if "machines" not in st.session_state:

    st.session_state.machines = []

if "materials" not in st.session_state:

    st.session_state.materials = []

if "inventory" not in st.session_state:

    st.session_state.inventory = []

if "current_plan" not in st.session_state:

    st.session_state.current_plan = None

if "current_interpretation" not in st.session_state:

    st.session_state.current_interpretation = None

if "previous_plan" not in st.session_state:

    st.session_state.previous_plan = None

if "tracer" not in st.session_state:

    st.session_state.tracer = ChangeTracer()

if "user_name" not in st.session_state:

    st.session_state.user_name = "计划员"

def load_sample_data():

    today = date.today()

    materials = [

        Material(material_id="MAT001", name="钢板", unit="张", lead_time_days=3, safety_stock=50),

        Material(material_id="MAT002", name="钢管", unit="根", lead_time_days=5, safety_stock=30),

        Material(material_id="MAT003", name="螺丝", unit="个", lead_time_days=1, safety_stock=200),

        Material(material_id="MAT004", name="油漆", unit="升", lead_time_days=2, safety_stock=100),

    ]

    inventory = [

        Inventory(material_id="MAT001", quantity=100),

        Inventory(material_id="MAT002", quantity=0),

        Inventory(material_id="MAT003", quantity=500),

        Inventory(material_id="MAT004", quantity=50),

    ]

    machines = [

        Machine(machine_id="M001", name="数控车床", capacity_per_hour=10, available_hours_per_day=8),

        Machine(machine_id="M002", name="铣床", capacity_per_hour=8, available_hours_per_day=8),

        Machine(machine_id="M003", name="焊接机", capacity_per_hour=5, available_hours_per_day=8),

    ]

    orders = [

        Order(

            order_id="ORD001",

            product_name="车架A",

            quantity=50,

            due_date=today + timedelta(days=7),

            priority=2,

            material_requirements={"MAT001": 2, "MAT002": 1, "MAT003": 8},

            process_hours_per_unit=2,

        ),

        Order(

            order_id="ORD002",

            product_name="车架B",

            quantity=30,

            due_date=today + timedelta(days=5),

            priority=1,

            material_requirements={"MAT001": 3, "MAT003": 12},

            process_hours_per_unit=3,

        ),

        Order(

            order_id="ORD003",

            product_name="支架",

            quantity=100,

            due_date=today + timedelta(days=10),

            priority=3,

            material_requirements={"MAT002": 0.5, "MAT003": 4},

            process_hours_per_unit=0.5,

        ),

        Order(

            order_id="ORD004",

            product_name="外壳",

            quantity=40,

            due_date=today + timedelta(days=3),

            priority=1,

            material_requirements={"MAT001": 1, "MAT004": 0.5},

            process_hours_per_unit=1.5,

        ),

    ]

    st.session_state.materials = materials

    st.session_state.inventory = inventory

    st.session_state.machines = machines

    st.session_state.orders = orders

    st.success("✅ 样例数据已加载！包含4个订单、3台设备、4种物料。")

def run_solver(plan_name: str = "生产计划"):

    if not st.session_state.orders:

        st.error("❌ 请先加载订单数据")

        return

    if not st.session_state.machines:

        st.error("❌ 请先加载设备数据")

        return

    with st.spinner("🔄 正在求解线性规划模型..."):

        solver = ProductionSolver(

            orders=st.session_state.orders,

            machines=st.session_state.machines,

            materials=st.session_state.materials,

            inventory=st.session_state.inventory,

            horizon_days=30,

        )

        plan = solver.solve(plan_name)

        interpreter = ConstraintInterpreter(

            orders=st.session_state.orders,

            machines=st.session_state.machines,

            materials=st.session_state.materials,

            inventory=st.session_state.inventory,

            plan=plan,

        )

        interpretation = interpreter.interpret()

        if st.session_state.current_plan:

            st.session_state.previous_plan = st.session_state.current_plan

        st.session_state.current_plan = plan

        st.session_state.current_interpretation = interpretation

        st.session_state.tracer.log_change(

            action_type=ActionType.CREATE,

            entity_type="plan",

            entity_id=plan.plan_id,

            field_name=None,

            old_value=None,

            new_value=plan.name,

            reason="生成新的排产计划",

            user=st.session_state.user_name,

        )

    return plan, interpretation

def get_severity_color(severity: str) -> str:

    colors = {

        "严重": "#FF4B4B",

        "高": "#FF914D",

        "中": "#FFD93D",

        "低": "#6BCB77",

    }

    return colors.get(severity, "#808080")

def main():

    st.title("📋 线性规划排产解释器")

    st.markdown("---")

    with st.sidebar:

        st.header("⚙️ 操作")

        st.session_state.user_name = st.text_input("用户名", value=st.session_state.user_name)

        st.markdown("---")

        st.subheader("📥 数据导入")

        if st.button("📊 加载样例数据", type="secondary"):

            load_sample_data()

        uploaded_file = st.file_uploader("上传Excel文件", type=["xlsx"])

        if uploaded_file:

            try:

                data = DataImporter.import_all_from_excel(uploaded_file)

                st.session_state.orders = data["orders"]

                st.session_state.machines = data["machines"]

                st.session_state.materials = data["materials"]

                st.session_state.inventory = data["inventory"]

                st.success("✅ Excel数据已导入！")

            except Exception as e:

                st.error(f"❌ 导入失败: {e}")

        st.markdown("---")

        st.subheader("🚀 排产求解")

        plan_name = st.text_input("计划名称", value=f"计划_{date.today().strftime('%m%d')}")

        if st.button("▶️ 运行排产", type="primary", use_container_width=True):

            if st.session_state.orders and st.session_state.machines:

                run_solver(plan_name)

            else:

                st.warning("⚠️ 请先加载数据")

        st.markdown("---")

        st.subheader("📤 报告导出")

        if st.button("📥 导出Excel报告", disabled=not st.session_state.current_plan):

            if st.session_state.current_plan and st.session_state.current_interpretation:

                report_path = f"排产报告_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

                ReportGenerator.generate_excel_report(

                    plan=st.session_state.current_plan,

                    interpretation=st.session_state.current_interpretation,

                    orders=st.session_state.orders,

                    machines=st.session_state.machines,

                    materials=st.session_state.materials,

                    inventory=st.session_state.inventory,

                    filepath=report_path,

                    change_history=st.session_state.tracer.get_history(),

                )

                st.success(f"✅ 报告已导出: {report_path}")

    tab1, tab2, tab3, tab4, tab5 = st.tabs([

        "📊 数据总览",

        "🎯 排产结果",

        "⚠️ 冲突分析",

        "🔄 方案对比",

        "📝 变更记录",

    ])

    with tab1:

        st.subheader("📋 订单列表")

        if st.session_state.orders:

            orders_data = []

            for o in st.session_state.orders:

                orders_data.append({

                    "订单ID": o.order_id,

                    "产品名称": o.product_name,

                    "数量": o.quantity,

                    "交期": o.due_date,

                    "优先级": o.priority,

                    "单位工时": o.process_hours_per_unit,

                    "物料需求": json.dumps(o.material_requirements, ensure_ascii=False),

                })

            df_orders = pd.DataFrame(orders_data)

            st.dataframe(df_orders, use_container_width=True)

        else:

            st.info("💡 请从左侧加载样例数据或上传Excel文件")

        col1, col2 = st.columns(2)

        with col1:

            st.subheader("⚙️ 设备列表")

            if st.session_state.machines:

                machines_data = []

                for m in st.session_state.machines:

                    machines_data.append({

                        "设备ID": m.machine_id,

                        "名称": m.name,

                        "产能/小时": m.capacity_per_hour,

                        "日可用工时": m.available_hours_per_day,

                        "状态": m.status.value,

                    })

                df_machines = pd.DataFrame(machines_data)

                st.dataframe(df_machines, use_container_width=True)

        with col2:

            st.subheader("📦 库存状态")

            if st.session_state.inventory:

                materials_dict = {m.material_id: m for m in st.session_state.materials}

                inv_data = []

                for inv in st.session_state.inventory:

                    mat = materials_dict.get(inv.material_id)

                    inv_data.append({

                        "物料ID": inv.material_id,

                        "名称": mat.name if mat else "-",

                        "当前库存": inv.quantity,

                        "单位": mat.unit if mat else "-",

                        "采购周期": f"{mat.lead_time_days}天" if mat else "-",

                    })

                df_inv = pd.DataFrame(inv_data)

                st.dataframe(df_inv, use_container_width=True)

        if st.session_state.inventory:

            zero_inv = [inv for inv in st.session_state.inventory if inv.quantity <= 0]

            if zero_inv:

                st.error(f"⚠️ 警告：有 {len(zero_inv)} 种物料库存为零！")

                for inv in zero_inv:

                    mat = materials_dict.get(inv.material_id)

                    st.markdown(f"- **{mat.name if mat else inv.material_id}** ({inv.material_id})")

    with tab2:

        st.subheader("🎯 排产结果")

        if st.session_state.current_plan and st.session_state.current_interpretation:

            plan = st.session_state.current_plan

            interpretation = st.session_state.current_interpretation

            col1, col2, col3, col4 = st.columns(4)

            with col1:

                st.metric("订单总数", interpretation.summary["total_orders"])

            with col2:

                st.metric("已排产", interpretation.summary["scheduled_orders"])

            with col3:

                st.metric("延期订单", interpretation.summary["delayed_orders"])

            with col4:

                st.metric("准交率", f"{interpretation.summary['on_time_rate']:.1%}")

            st.markdown("---")

            st.subheader("📅 排产明细")

            orders_dict = {o.order_id: o for o in st.session_state.orders}

            machines_dict = {m.machine_id: m for m in st.session_state.machines}

            schedule_data = []

            for task in plan.scheduled_tasks:

                order = orders_dict.get(task.order_id)

                machine = machines_dict.get(task.machine_id)

                schedule_data.append({

                    "订单ID": task.order_id,

                    "产品": order.product_name if order else "-",

                    "设备": machine.name if machine else task.machine_id,

                    "开始日期": task.start_date,

                    "结束日期": task.end_date,

                    "数量": round(task.quantity, 1),

                    "工时": round(task.hours_needed, 1),

                    "状态": "⚠️ 延期" if task.is_delayed else "✅ 正常",

                })

            df_schedule = pd.DataFrame(schedule_data)

            st.dataframe(df_schedule, use_container_width=True)

            if plan.unscheduled_orders:

                st.warning(f"⚠️ 以下订单无法排产: {', '.join(plan.unscheduled_orders)}")

        else:

            st.info("💡 请先运行排产以查看结果")

    with tab3:

        st.subheader("⚠️ 冲突分析")

        if st.session_state.current_interpretation:

            interpretation = st.session_state.current_interpretation

            if interpretation.conflicts:

                for conflict in interpretation.conflicts:

                    color = get_severity_color(conflict.severity.value)

                    with st.expander(f"{conflict.title}", expanded=(conflict.severity.value in ["严重", "高"])):

                        st.markdown(f"""

                        <div style="padding: 10px; border-left: 4px solid {color}; background-color: {color}20; border-radius: 4px;">

                            <p><strong>类型:</strong> {conflict.conflict_type.value}</p>

                            <p><strong>描述:</strong> {conflict.description}</p>

                            <p><strong>影响订单:</strong> {', '.join(conflict.affected_orders) if conflict.affected_orders else '无'}</p>

                            <p><strong>影响物料:</strong> {', '.join(conflict.affected_materials) if conflict.affected_materials else '无'}</p>

                            <p><strong>影响设备:</strong> {', '.join(conflict.affected_machines) if conflict.affected_machines else '无'}</p>

                            <p><strong>💡 建议:</strong> {conflict.suggestion}</p>

                        </div>

                        """, unsafe_allow_html=True)

            else:

                st.success("✅ 没有发现约束冲突！")

            st.markdown("---")

            st.subheader("🔍 瓶颈识别")

            if interpretation.bottlenecks:

                for bottleneck in interpretation.bottlenecks:

                    st.warning(f"""

                    **{bottleneck['type']}**

                    {bottleneck['description']}

                    {bottleneck['impact']}

                    """)

            else:

                st.info("未识别到明显瓶颈")

        else:

            st.info("💡 请先运行排产以分析约束冲突")

    with tab4:

        st.subheader("🔄 方案对比")

        if st.session_state.previous_plan and st.session_state.current_plan:

            comparator = PlanComparator(st.session_state.orders)

            comparison = comparator.compare(

                st.session_state.previous_plan,

                st.session_state.current_plan,

            )

            col1, col2 = st.columns(2)

            with col1:

                st.info(f"**方案 A:** {comparison.plan1_name}")

            with col2:

                st.info(f"**方案 B:** {comparison.plan2_name}")

            st.markdown("---")

            metrics = comparison.metrics_diff

            col1, col2, col3 = st.columns(3)

            with col1:

                diff = metrics["task_count"]["diff"]

                st.metric(

                    "排产任务数",

                    f"{metrics['task_count']['plan2']}",

                    delta=f"+{diff}" if diff > 0 else str(diff),

                )

            with col2:

                diff = metrics["delayed_count"]["diff"]

                st.metric(

                    "延期任务数",

                    f"{metrics['delayed_count']['plan2']}",

                    delta=f"+{diff}" if diff > 0 else str(diff),

                    delta_color="inverse",

                )

            with col3:

                diff = metrics["makespan"]["diff"]

                st.metric(

                    "生产周期",

                    f"{metrics['makespan']['plan2']} 天",

                    delta=f"+{diff}天" if diff > 0 else f"{diff}天",

                    delta_color="inverse",

                )

            st.markdown("---")

            st.subheader("📋 变更明细")

            for change in comparison.task_changes:

                if change.change_type.value == "未变":

                    continue

                icon = "➕" if change.change_type.value == "新增" else "➖" if change.change_type.value == "移除" else "✏️"

                with st.expander(f"{icon} {change.change_type.value} - 订单 {change.order_id}"):

                    if change.field_changes:

                        for field, values in change.field_changes.items():

                            st.write(f"**{field}:** {values['old']} → {values['new']}")

        elif st.session_state.current_plan:

            st.info("💡 运行第二次排产后可进行方案对比")

        else:

            st.info("💡 请先运行排产")

    with tab5:

        st.subheader("📝 变更记录")

        history = st.session_state.tracer.get_history()

        if history:

            summary = st.session_state.tracer.summarize()

            st.write(f"**总变更数:** {summary['total_changes']}")

            col1, col2 = st.columns(2)

            with col1:

                st.write("**按操作类型:**")

                for action, count in summary["action_counts"].items():

                    st.write(f"- {action}: {count}")

            with col2:

                st.write("**按实体类型:**")

                for entity, count in summary["entity_counts"].items():

                    st.write(f"- {entity}: {count}")

            st.markdown("---")

            history_data = []

            for record in reversed(history):

                history_data.append({

                    "时间": record["timestamp"],

                    "用户": record["user"],

                    "操作": record["action_type"],

                    "实体": record["entity_type"],

                    "ID": record["entity_id"],

                    "字段": record["field_name"] or "-",

                    "原因": record["reason"],

                })

            df_history = pd.DataFrame(history_data)

            st.dataframe(df_history, use_container_width=True)

        else:

            st.info("💡 暂无变更记录")

    st.markdown("---")

    st.caption("💡 提示：库存为零和交期冲突会在冲突分析中以醒目的方式显示")

if __name__ == "__main__":

    main()

