"""
凸包面积参数试算工具 - Streamlit 主界面
教研编辑阿宁的日常工作台
"""

import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from io import BytesIO, StringIO

from data_manager import DataManager
from convex_hull_calculator import ConvexHullCalculator
from history_manager import HistoryManager
from report_generator import ReportGenerator


st.set_page_config(
    page_title="凸包面积参数试算",
    page_icon="📐",
    layout="wide",
)

if "data_manager" not in st.session_state:
    st.session_state.data_manager = DataManager()
if "calculator" not in st.session_state:
    st.session_state.calculator = ConvexHullCalculator()
if "history_manager" not in st.session_state:
    st.session_state.history_manager = HistoryManager()
if "report_generator" not in st.session_state:
    st.session_state.report_generator = ReportGenerator()
if "current_result" not in st.session_state:
    st.session_state.current_result = None
if "weights" not in st.session_state:
    st.session_state.weights = {"x": 1.0, "y": 1.0}
if "last_confirmed_weights" not in st.session_state:
    st.session_state.last_confirmed_weights = {"x": 1.0, "y": 1.0}
if "data_loaded" not in st.session_state:
    st.session_state.data_loaded = False
if "operator_name" not in st.session_state:
    st.session_state.operator_name = "阿宁"

plt.rcParams["font.sans-serif"] = ["Arial Unicode MS", "SimHei", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False


def main():
    st.title("📐 凸包面积参数试算")
    st.caption("教研编辑工作台 · 保留原始数据 · 记录权重变更 · 导出复核报告")

    with st.sidebar:
        st.header("⚙️ 设置")
        st.session_state.operator_name = st.text_input("操作人姓名", value=st.session_state.operator_name)

        st.divider()
        st.subheader("📊 数据加载")

        use_demo = st.button("📦 加载演示数据", use_container_width=True, type="secondary")
        if use_demo:
            with st.spinner("加载演示数据中..."):
                st.session_state.data_manager.load_demo_data()
                st.session_state.data_loaded = True
                st.success("演示数据已加载！")

        uploaded_file = st.file_uploader("上传数据文件", type=["csv", "xlsx", "xls"])
        if uploaded_file is not None:
            try:
                if uploaded_file.name.endswith(".csv"):
                    st.session_state.data_manager.load_from_csv(
                        uploaded_file, source_name=uploaded_file.name
                    )
                else:
                    st.session_state.data_manager.load_from_excel(
                        uploaded_file, source_name=uploaded_file.name
                    )
                st.session_state.data_loaded = True
                st.success(f"已加载: {uploaded_file.name}")
            except Exception as e:
                st.error(f"加载失败: {str(e)}")

        st.divider()
        st.subheader("🎛️ 权重参数")

        x_weight = st.slider(
            "X 维度权重",
            min_value=0.1,
            max_value=3.0,
            value=float(st.session_state.weights.get("x", 1.0)),
            step=0.05,
            help="调整X维度的权重系数，用于缩放该维度对凸包面积的影响",
        )
        y_weight = st.slider(
            "Y 维度权重",
            min_value=0.1,
            max_value=3.0,
            value=float(st.session_state.weights.get("y", 1.0)),
            step=0.05,
            help="调整Y维度的权重系数",
        )

        st.session_state.weights["x"] = x_weight
        st.session_state.weights["y"] = y_weight

        last_confirmed = st.session_state.last_confirmed_weights
        weight_changed = (
            abs(last_confirmed["x"] - x_weight) > 0.001 or abs(last_confirmed["y"] - y_weight) > 0.001
        )

        if weight_changed:
            st.info(f"⚠️ 权重已调整（未确认），上次确认值：X={last_confirmed['x']:.2f}, Y={last_confirmed['y']:.2f}")

        change_reason = st.text_input("权重变更原因", placeholder="例如：教研会决定放大数学权重")

        col1, col2 = st.columns(2)
        with col1:
            apply_weight = st.button("✓ 确认权重变更", use_container_width=True, type="primary", disabled=not weight_changed)
        with col2:
            reset_weight = st.button("↺ 重置权重", use_container_width=True)

        if reset_weight:
            st.session_state.weights = {"x": 1.0, "y": 1.0}
            st.session_state.last_confirmed_weights = {"x": 1.0, "y": 1.0}
            st.rerun()

        st.divider()
        st.subheader("🔍 筛选口径")
        exclude_dup = st.checkbox("排除重复样本", value=True)
        exclude_dirty = st.checkbox("排除脏数据（缺失/异常）", value=True)

        st.divider()
        st.subheader("📋 筛选数据源")
        if st.session_state.data_loaded:
            sources = st.session_state.data_manager.get_sources()
            selected_sources = st.multiselect(
                "选择要包含的数据源",
                options=sources,
                default=sources,
            )
        else:
            st.info("请先加载数据")
            selected_sources = []

    if not st.session_state.data_loaded:
        show_welcome_screen()
        return

    data_manager = st.session_state.data_manager
    calculator = st.session_state.calculator
    history_manager = st.session_state.history_manager
    report_generator = st.session_state.report_generator
    weights = st.session_state.weights

    summary = data_manager.get_data_summary()

    points_to_use = data_manager.filter_points(
        exclude_duplicates=False,
        exclude_dirty=False,
        source_filter=selected_sources if selected_sources else None,
    )

    if apply_weight and weight_changed:
        old_area = 0.0
        if st.session_state.current_result:
            old_area = st.session_state.current_result.area

        new_result = calculator.compute_convex_hull(
            points_to_use,
            weights=weights,
            exclude_duplicates=exclude_dup,
            exclude_dirty=exclude_dirty,
        )
        new_area = new_result.area

        if change_reason:
            history_manager.record_weight_change(
                old_weights=st.session_state.last_confirmed_weights.copy(),
                new_weights=weights.copy(),
                operator=st.session_state.operator_name,
                reason=change_reason,
                area_before=old_area,
                area_after=new_area,
            )
            st.session_state.last_confirmed_weights = weights.copy()
            st.success(f"权重变更已确认并记录！原因：{change_reason}")
            st.rerun()
        else:
            st.warning("请先填写权重变更原因，再点击确认")

    result = calculator.compute_convex_hull(
        points_to_use,
        weights=weights,
        exclude_duplicates=exclude_dup,
        exclude_dirty=exclude_dirty,
    )
    st.session_state.current_result = result

    last_calc_key = st.session_state.get("last_calc_key", "")
    current_calc_key = f"{weights['x']:.4f}_{weights['y']:.4f}_{exclude_dup}_{exclude_dirty}_{summary['source']}"
    if current_calc_key != last_calc_key:
        history_manager.record_calculation(
            weights=weights.copy(),
            area=result.area,
            exclude_duplicates=exclude_dup,
            exclude_dirty=exclude_dirty,
            used_points_count=len(result.used_points),
            excluded_points_count=len(result.excluded_points),
            data_source=summary["source"],
            operator=st.session_state.operator_name,
        )
        st.session_state.last_calc_key = current_calc_key

    tab1, tab2, tab3, tab4 = st.tabs([
        "📊 计算结果",
        "📋 数据清单",
        "📜 历史记录",
        "📝 复盘说明",
    ])

    with tab1:
        show_result_tab(result, weights, summary)

    with tab2:
        show_data_tab(data_manager, result, data_manager.points)

    with tab3:
        show_history_tab(history_manager)

    with tab4:
        show_review_tab(report_generator, result, data_manager, history_manager)


def show_welcome_screen():
    st.info("👋 欢迎使用凸包面积参数试算工具")

    st.markdown("---")

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("🎯 这个工具能帮你")
        st.markdown("""
        - **保留原始数据**：脏数据、重复样本都留有痕迹，不会悄咪咪被修掉
        - **记录权重变更**：每次调权重都有记录，换班交接不抓瞎
        - **导出复核报告**：Markdown 报告自带筛选口径，数字和屏幕不脱节
        - **快速讲给别人听**：数字从哪来、怎么算的，报告里都有线索
        """)

    with col2:
        st.subheader("🚀 快速开始")
        st.markdown("""
        1. 点击左侧「📦 加载演示数据」看看效果
        2. 或者上传你自己的 CSV / Excel 文件
        3. 调整权重滑块，观察凸包面积变化
        4. 切换到「📝 复盘说明」导出报告
        """)

    st.divider()

    st.subheader("📦 演示数据包含")
    st.markdown("""
    - ✅ 正常样本 10 条
    - 🔄 重复样本 1 条（S005 重复录入）
    - ❌ 脏数据 3 条（缺失值、异常值各一）
    - 📝 后补备注 1 条（S012 补考数据）
    - 🔗 多来源数据（期中测试、补录、手工填写、补考）
    """)

    st.caption("演示数据特意做了不太干净的版本，方便你演练各种场景")


def show_result_tab(result, weights, summary):
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("凸包面积", f"{result.area:.4f}", delta=None)
    with col2:
        st.metric("参与计算点数", len(result.used_points))
    with col3:
        st.metric("排除点数", len(result.excluded_points))
    with col4:
        st.metric("凸包顶点数", len(result.hull_points))

    st.divider()

    col_chart, col_info = st.columns([2, 1])

    with col_chart:
        st.subheader("📈 凸包可视化")
        fig, ax = plt.subplots(figsize=(8, 6))

        used_x = [p.x for p in result.used_points]
        used_y = [p.y for p in result.used_points]
        ax.scatter(used_x, used_y, c="steelblue", label="有效样本", alpha=0.7, s=50)

        if result.hull_points:
            hull_x = [p[0] for p in result.hull_points]
            hull_y = [p[1] for p in result.hull_points]
            hull_x.append(hull_x[0])
            hull_y.append(hull_y[0])
            ax.plot(hull_x, hull_y, "r-", linewidth=2, label="凸包边界")
            ax.fill(hull_x, hull_y, "red", alpha=0.1)

        if result.excluded_points:
            excl_x = [p.x for p in result.excluded_points]
            excl_y = [p.y for p in result.excluded_points]
            ax.scatter(excl_x, excl_y, c="orange", marker="x", label="排除样本", s=60)

        ax.set_xlabel("X 维度（加权后）")
        ax.set_ylabel("Y 维度（加权后）")
        ax.set_title(f"凸包面积 = {result.area:.4f}")
        ax.legend()
        ax.grid(True, alpha=0.3)

        st.pyplot(fig)

    with col_info:
        st.subheader("🔧 当前参数")
        st.markdown(f"""
        **权重设置**
        - X 维度: `{weights['x']:.4f}`
        - Y 维度: `{weights['y']:.4f}`

        **筛选规则**
        - 重复样本: {'排除' if any('重复' in p.dirty_reason for p in result.excluded_points) else '保留'}
        - 脏数据: {'排除' if any(p.is_dirty for p in result.excluded_points) else '保留'}

        **数据来源**
        - {summary['source']}
        """)

        st.subheader("📐 凸包顶点")
        if result.hull_points:
            vertex_df = pd.DataFrame({
                "序号": range(1, len(result.hull_points) + 1),
                "X坐标": [f"{p[0]:.4f}" for p in result.hull_points],
                "Y坐标": [f"{p[1]:.4f}" for p in result.hull_points],
            })
            st.dataframe(vertex_df, hide_index=True, use_container_width=True)
        else:
            st.info("有效点数不足，无法生成凸包")

    st.divider()
    with st.expander("📜 计算过程日志", expanded=False):
        for line in result.calculation_trace:
            st.text(line)


def show_data_tab(data_manager, result, all_points):
    st.subheader("📋 完整数据清单")
    st.caption("保留所有原始数据，标记清洗状态，方便复核时追溯")

    st.info(
        f"共 {len(all_points)} 条记录 · "
        f"干净数据 {sum(1 for p in all_points if not p.is_dirty)} 条 · "
        f"脏数据 {sum(1 for p in all_points if p.is_dirty)} 条 · "
        f"重复样本 {sum(1 for p in all_points if p.is_duplicate)} 条"
    )

    rows = []
    for pt in all_points:
        status = "✅ 正常"
        if pt.is_duplicate and pt.is_dirty:
            status = "🔄 重复+脏数据"
        elif pt.is_duplicate:
            status = "🔄 重复"
        elif pt.is_dirty:
            status = "❌ 脏数据"

        # 显示原始值 - 严格保持原始状态，缺失显示 (缺失)
        disp_orig_x = pt.original_x if pt.original_x is not None else "(缺失)"
        disp_orig_y = pt.original_y if pt.original_y is not None else "(缺失)"
        # 显示加权后的值 - 也要处理缺失
        if np.isnan(pt.x):
            disp_weighted_x = "(缺失)"
        else:
            disp_weighted_x = f"{pt.x * (result.weights.get('x', 1.0) if result else 1.0):.4f}"
        if np.isnan(pt.y):
            disp_weighted_y = "(缺失)"
        else:
            disp_weighted_y = f"{pt.y * (result.weights.get('y', 1.0) if result else 1.0):.4f}"

        rows.append({
            "状态": status,
            "样本ID": pt.id,
            "原始X": disp_orig_x,
            "原始Y": disp_orig_y,
            "加权后X": disp_weighted_x,
            "加权后Y": disp_weighted_y,
            "脏数据原因": pt.dirty_reason if pt.dirty_reason else "-",
            "数据来源": pt.source,
            "备注": pt.note if pt.note else "-",
        })

    df = pd.DataFrame(rows)

    def highlight_status(row):
        if "重复" in row["状态"]:
            return ["background-color: #fff3cd"] * len(row)
        elif "脏数据" in row["状态"]:
            return ["background-color: #f8d7da"] * len(row)
        return [""] * len(row)

    st.dataframe(
        df.style.apply(highlight_status, axis=1),
        use_container_width=True,
        hide_index=True,
    )

    st.divider()

    col1, col2 = st.columns(2)

    with col1:
        st.subheader("🔴 脏数据明细")
        dirty_points = [p for p in all_points if p.is_dirty]
        if dirty_points:
            st.warning(f"共 {len(dirty_points)} 条脏数据，保留原始记录不做修改")
            dirty_rows = []
            for pt in dirty_points:
                dirty_rows.append({
                    "样本ID": pt.id,
                    "原始X": pt.original_x if pt.original_x is not None else "(缺失)",
                    "原始Y": pt.original_y if pt.original_y is not None else "(缺失)",
                    "原因": pt.dirty_reason,
                    "来源": pt.source,
                    "备注": pt.note,
                })
            st.dataframe(pd.DataFrame(dirty_rows), use_container_width=True, hide_index=True)
        else:
            st.success("没有脏数据")

    with col2:
        st.subheader("🔄 重复样本明细")
        dup_points = [p for p in all_points if p.is_duplicate]
        if dup_points:
            st.warning(f"共 {len(dup_points)} 条重复样本")
            dup_rows = []
            for pt in dup_points:
                dup_rows.append({
                    "样本ID": pt.id,
                    "X值": pt.original_x if pt.original_x is not None else pt.x,
                    "Y值": pt.original_y if pt.original_y is not None else pt.y,
                    "来源": pt.source,
                    "备注": pt.note,
                })
            st.dataframe(pd.DataFrame(dup_rows), use_container_width=True, hide_index=True)
        else:
            st.success("没有重复样本")

    st.divider()
    st.subheader("📤 原始数据下载")
    st.caption("导出保留所有原始标记的数据，方便存档和二次复核")

    csv_buffer = StringIO()
    df.to_csv(csv_buffer, index=False, encoding="utf-8-sig")
    st.download_button(
        "⬇️ 下载完整数据 CSV",
        data=csv_buffer.getvalue(),
        file_name="凸包原始数据.csv",
        mime="text/csv",
    )


def show_history_tab(history_manager):
    col1, col2 = st.columns(2)

    with col1:
        st.subheader("📜 权重变更历史")
        weight_changes = history_manager.get_weight_change_history(limit=20)

        if weight_changes:
            for i, record in enumerate(weight_changes):
                status = "✅ 已确认" if record.is_manual_confirmed else "⏳ 待确认"
                with st.expander(
                    f"{record.timestamp} | {record.operator} | {status}"
                ):
                    st.markdown(f"""
                    **变更原因**: {record.reason}

                    **权重变化**:
                    - X: {record.old_weights.get('x', 1):.4f} → {record.new_weights.get('x', 1):.4f}
                    - Y: {record.old_weights.get('y', 1):.4f} → {record.new_weights.get('y', 1):.4f}

                    **面积变化**: {record.area_before:.4f} → {record.area_after:.4f}
                    """)

                    if not record.is_manual_confirmed:
                        confirm_label = f"确认此变更_{i}"
                        if st.button(f"✓ 人工确认", key=confirm_label):
                            history_manager.confirm_weight_change(i, st.session_state.operator_name)
                            st.success("已确认")
                            st.rerun()
                    else:
                        st.info(f"确认人: {record.confirmed_by} | 确认时间: {record.confirmed_at}")
        else:
            st.info("暂无权重变更记录")

    with col2:
        st.subheader("🔢 计算历史")
        calc_history = history_manager.get_calculation_history(limit=20)

        if calc_history:
            rows = []
            for r in calc_history:
                rows.append({
                    "时间": r.timestamp,
                    "X权重": f"{r.weights.get('x', 1):.4f}",
                    "Y权重": f"{r.weights.get('y', 1):.4f}",
                    "面积": f"{r.area:.4f}",
                    "有效/排除": f"{r.used_points_count}/{r.excluded_points_count}",
                    "操作人": r.operator,
                })
            st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
        else:
            st.info("暂无计算记录")


def show_review_tab(report_generator, result, data_manager, history_manager):
    st.subheader("📝 换班复盘说明")
    st.caption("给不看代码的人讲清楚：数字从哪来、怎么算的、改了什么")

    daily = history_manager.get_daily_summary()

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("今日计算次数", daily["calculation_count"])
    with col2:
        st.metric("今日权重变更", daily["weight_change_count"])
    with col3:
        st.metric("待确认变更", daily["unconfirmed_changes"])

    st.divider()

    st.subheader("📑 生成复核报告")

    report_type = st.radio(
        "报告类型",
        ["完整报告", "摘要报告"],
        horizontal=True,
    )

    col_r1, col_r2 = st.columns(2)
    with col_r1:
        include_trace = st.checkbox("包含计算过程日志", value=True)
        include_raw = st.checkbox("包含完整原始数据", value=True)
    with col_r2:
        include_excluded = st.checkbox("包含排除数据详情", value=True)
        report_title = st.text_input("报告标题", value="凸包面积参数试算报告")

    if report_type == "完整报告":
        report_content = report_generator.generate_full_report(
            result=result,
            data_manager=data_manager,
            report_title=report_title,
            operator=st.session_state.operator_name,
            include_calculation_trace=include_trace,
            include_raw_data=include_raw,
            include_excluded_data=include_excluded,
        )
    else:
        report_content = report_generator.generate_summary_report(
            result=result,
            data_manager=data_manager,
            operator=st.session_state.operator_name,
        )

    st.download_button(
        "⬇️ 下载 Markdown 报告",
        data=report_content,
        file_name=f"{report_title}.md",
        mime="text/markdown",
        use_container_width=True,
        type="primary",
    )

    st.divider()

    with st.expander("👁️ 预览报告内容", expanded=False):
        st.markdown(report_content)

    st.divider()

    st.subheader("🗣️ 怎么讲给项目经理听")
    st.info(
        "**核心数据**：凸包面积是 **{:.4f}**，基于 **{}** 个有效样本计算。\n\n"
        "**数据来源**：原始数据来自「{}」，总共 {} 条记录，"
        "其中排除了 {} 条（{}条重复、{}条脏数据）。\n\n"
        "**权重设置**：X维度权重 {:.4f}，Y维度权重 {:.4f}。"
        "如果要调整权重，可以在左侧滑块操作，每次修改都会留记录。\n\n"
        "**怎么复核**：下载 Markdown 报告，里面有完整的原始数据清单、"
        "筛选口径、计算过程，每条排除的数据都标了原因。".format(
            result.area,
            len(result.used_points),
            data_manager.get_data_summary()["source"],
            len(result.all_points),
            len(result.excluded_points),
            sum(1 for p in result.excluded_points if p.is_duplicate),
            sum(1 for p in result.excluded_points if p.is_dirty and not p.is_duplicate),
            result.weights.get("x", 1.0),
            result.weights.get("y", 1.0),
        )
    )


if __name__ == "__main__":
    main()
