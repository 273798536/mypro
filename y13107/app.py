import io
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go

from src.calculator import batch_compute_condition_numbers, results_to_dataframe
from src.anomaly import (
    run_all_anomaly_detection,
    anomalies_to_dataframe,
    anomaly_summary,
    AnomalySeverity,
)
from src.history import (
    load_history_answers,
    compare_with_history,
    comparisons_to_dataframe,
    build_calculation_trace,
    find_by_id,
)

st.set_page_config(
    page_title="矩阵条件数参数试算",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
    .main .block-container {padding-top: 2rem;}
    .stMetric {background-color: #f0f2f6; padding: 1rem; border-radius: 0.5rem;}
    .critical-tag {background-color: #ff4b4b; color: white; padding: 0.2rem 0.6rem; border-radius: 0.3rem; font-size: 0.8rem;}
    .warning-tag {background-color: #ffaa00; color: white; padding: 0.2rem 0.6rem; border-radius: 0.3rem; font-size: 0.8rem;}
    .info-tag {background-color: #4bb4ff; color: white; padding: 0.2rem 0.6rem; border-radius: 0.3rem; font-size: 0.8rem;}
</style>
""", unsafe_allow_html=True)

EXAMPLE_INPUT_PATH = "examples/example_input.csv"
EXAMPLE_HISTORY_PATH = "examples/example_history.csv"
DATA_INPUT_DIR = "data/input"
DATA_HISTORY_DIR = "data/history"
DATA_OUTPUT_DIR = "data/output"


def load_example_data():
    df = pd.read_csv(EXAMPLE_INPUT_PATH)
    hist = pd.read_csv(EXAMPLE_HISTORY_PATH)
    return df, hist


def read_uploaded_file(uploaded_file):
    if uploaded_file is None:
        return None
    filename = uploaded_file.name
    if filename.endswith(".csv"):
        return pd.read_csv(uploaded_file)
    elif filename.endswith((".xlsx", ".xls")):
        return pd.read_excel(uploaded_file)
    else:
        st.error(f"不支持的文件格式: {filename}")
        return None


def run_calculation(df_input, df_history, near_threshold, tolerance):
    results = batch_compute_condition_numbers(df_input, matrix_prefix="a", id_col="id")
    anomalies = run_all_anomaly_detection(df_input, results, matrix_prefix="a", near_singular_threshold=near_threshold)

    comparisons = []
    hist_anomalies = []
    if df_history is not None and not df_history.empty:
        history_answers = load_history_answers(
            df_history,
            id_col="id",
            cond_col="condition_number",
            source_col="source",
            version_col="version"
        )
        comparisons, hist_anomalies = compare_with_history(results, history_answers, tolerance=tolerance)
        anomalies.extend(hist_anomalies)

    anomalies.sort(key=lambda x: (
        0 if x.severity == AnomalySeverity.CRITICAL else 1 if x.severity == AnomalySeverity.WARNING else 2,
        x.source_row
    ))

    return results, anomalies, comparisons


def make_condition_chart(results_df, anomalies):
    df = results_df.copy()
    df["条件数(2-范数)"] = df["条件数(2-范数)"].fillna(np.inf)
    df["显示值"] = df["条件数(2-范数)"].replace([np.inf, -np.inf], np.nan)

    anomaly_ids = set(a.matrix_id for a in anomalies)
    df["是否异常"] = df["矩阵ID"].apply(lambda x: "异常" if x in anomaly_ids else "正常")

    fig = px.bar(
        df,
        x="矩阵ID",
        y="显示值",
        color="是否异常",
        color_discrete_map={"正常": "#4bb4ff", "异常": "#ff4b4b"},
        title="各矩阵2-范数条件数",
        labels={"显示值": "条件数 (log刻度)", "矩阵ID": "矩阵ID"},
        hover_data=["行号", "是否奇异", "错误/异常"],
    )
    fig.update_yaxes(type="log")
    fig.update_layout(height=400, clickmode="event+select")
    return fig


def make_singular_values_chart(result):
    if result.singular_values is None or len(result.singular_values) == 0:
        return None
    svals = result.singular_values
    df = pd.DataFrame({
        "奇异值序号": list(range(1, len(svals) + 1)),
        "奇异值": svals,
    })
    fig = px.bar(
        df,
        x="奇异值序号",
        y="奇异值",
        title=f"矩阵 {result.matrix_id} 的奇异值分布",
        log_y=True,
        color="奇异值",
        color_continuous_scale="Blues",
    )
    fig.update_layout(height=350)
    return fig


def severity_tag(severity):
    if severity == AnomalySeverity.CRITICAL:
        return '<span class="critical-tag">严重</span>'
    elif severity == AnomalySeverity.WARNING:
        return '<span class="warning-tag">警告</span>'
    else:
        return '<span class="info-tag">提示</span>'


def clear_calculation_results():
    st.session_state.results = None
    st.session_state.anomalies = None
    st.session_state.comparisons = None
    st.session_state.selected_matrix_id = None
    st.session_state.needs_recalc = True


def main():
    st.title("📊 矩阵条件数参数试算")

    if "df_input" not in st.session_state:
        st.session_state.df_input = None
    if "df_history" not in st.session_state:
        st.session_state.df_history = None
    if "results" not in st.session_state:
        st.session_state.results = None
    if "anomalies" not in st.session_state:
        st.session_state.anomalies = None
    if "comparisons" not in st.session_state:
        st.session_state.comparisons = None
    if "selected_matrix_id" not in st.session_state:
        st.session_state.selected_matrix_id = None
    if "needs_recalc" not in st.session_state:
        st.session_state.needs_recalc = True
    if "prev_near_threshold" not in st.session_state:
        st.session_state.prev_near_threshold = None
    if "prev_tolerance" not in st.session_state:
        st.session_state.prev_tolerance = None
    if "last_input_upload_id" not in st.session_state:
        st.session_state.last_input_upload_id = None
    if "last_history_upload_id" not in st.session_state:
        st.session_state.last_history_upload_id = None

    with st.sidebar:
        st.header("⚙️ 操作")

        st.subheader("快速开始")
        col1, col2 = st.columns(2)
        with col1:
            if st.button("📁 放样例", use_container_width=True, type="primary"):
                df_in, df_hist = load_example_data()
                st.session_state.df_input = df_in
                st.session_state.df_history = df_hist
                clear_calculation_results()
                st.rerun()
        with col2:
            if st.button("🔄 重跑", use_container_width=True):
                if st.session_state.df_input is not None:
                    clear_calculation_results()
                    st.rerun()
                else:
                    st.warning("请先上传数据或放样例")

        st.divider()

        st.subheader("上传数据")
        uploaded_input = st.file_uploader("输入数据 (CSV/Excel)", type=["csv", "xlsx", "xls"], key="input_upload")
        if uploaded_input is not None:
            upload_id = f"{uploaded_input.name}_{uploaded_input.size}_{uploaded_input.last_modified}"
            if upload_id != st.session_state.last_input_upload_id:
                st.session_state.last_input_upload_id = upload_id
                df = read_uploaded_file(uploaded_input)
                if df is not None:
                    st.session_state.df_input = df
                    clear_calculation_results()
                    st.rerun()

        uploaded_history = st.file_uploader("历史答案 (可选)", type=["csv", "xlsx", "xls"], key="hist_upload")
        if uploaded_history is not None:
            upload_id = f"{uploaded_history.name}_{uploaded_history.size}_{uploaded_history.last_modified}"
            if upload_id != st.session_state.last_history_upload_id:
                st.session_state.last_history_upload_id = upload_id
                df = read_uploaded_file(uploaded_history)
                if df is not None:
                    st.session_state.df_history = df
                    clear_calculation_results()
                    st.rerun()

        st.caption("📂 默认材料放在 data/input 和 data/history 目录")

        st.divider()

        st.subheader("参数设置")
        near_threshold = st.number_input(
            "高条件数阈值",
            value=1e10,
            min_value=1.0,
            format="%.1e",
            help="超过此值判定为接近奇异"
        )
        tolerance = st.number_input(
            "历史对比容差(相对误差)",
            value=1e-6,
            min_value=1e-12,
            format="%.1e",
            help="与历史答案的相对误差超过此值标记为异常"
        )

        if (st.session_state.prev_near_threshold is not None and
            near_threshold != st.session_state.prev_near_threshold):
            clear_calculation_results()
        if (st.session_state.prev_tolerance is not None and
            tolerance != st.session_state.prev_tolerance):
            clear_calculation_results()

        st.session_state.prev_near_threshold = near_threshold
        st.session_state.prev_tolerance = tolerance

        st.divider()

        st.subheader("导出")
        if st.session_state.results is not None:
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine="openpyxl") as writer:
                results_df = results_to_dataframe(st.session_state.results)
                results_df.to_excel(writer, sheet_name="计算结果", index=False)

                if st.session_state.anomalies:
                    anom_df = anomalies_to_dataframe(st.session_state.anomalies)
                    anom_df.to_excel(writer, sheet_name="异常队列", index=False)

                if st.session_state.comparisons:
                    comp_df = comparisons_to_dataframe(st.session_state.comparisons)
                    comp_df.to_excel(writer, sheet_name="历史对比", index=False)

            st.download_button(
                "📥 导出结果Excel",
                data=output.getvalue(),
                file_name="矩阵条件数试算结果.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                use_container_width=True,
            )
        else:
            st.info("完成计算后可导出")

        st.caption("📂 导出的结果也可存到 data/output 目录")

        st.divider()
        with st.expander("📖 使用说明"):
            st.markdown("""
**3件事快速上手：**
1. **放样例**：点左上角「放样例」按钮加载样例数据
2. **重跑**：改完参数点「重跑」重新计算
3. **查看异常队列**：在下方「异常队列」标签页看所有异常

**数字从哪来？**
- 点图表上的柱子，下方会显示该矩阵的计算溯源
- 每个异常都标有来源行号和原始数据
- 历史答案对比中保留原始来源列
""")

    if st.session_state.df_input is None:
        st.info("👋 请在左侧点「放样例」快速体验，或上传你的数据文件")
        st.markdown("""
### 这个工具做什么？
- 批量计算多个矩阵的**2-范数条件数**
- 自动检测**空集合、奇异矩阵（除零边界）、脏数据**等异常
- 与**历史答案**对比，标出不一致的条目
- 保留**原始数据痕迹**，脏数据不自动修复
- 每个数字都可**追溯来源**

### 数据格式要求
**输入数据**需包含：
- `id` 列：矩阵编号
- `a11, a12, a21, a22...` 列：矩阵元素（列名以 `a` 开头）

**历史答案**（可选）需包含：
- `id` 列：矩阵编号
- `condition_number` 列：历史条件数
- `source`、`version` 列：来源和版本（追溯用）
""")
        return

    df_input = st.session_state.df_input
    df_history = st.session_state.df_history

    if st.session_state.needs_recalc or st.session_state.results is None:
        with st.spinner("正在计算..."):
            results, anomalies, comparisons = run_calculation(
                df_input, df_history, near_threshold, tolerance
            )
            st.session_state.results = results
            st.session_state.anomalies = anomalies
            st.session_state.comparisons = comparisons
            st.session_state.needs_recalc = False

    results = st.session_state.results
    anomalies = st.session_state.anomalies
    comparisons = st.session_state.comparisons

    summary = anomaly_summary(anomalies) if anomalies else {"total": 0, "critical": 0, "warning": 0, "info": 0, "by_type": {}}

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("矩阵总数", len(results))
    with col2:
        st.metric("异常总数", summary["total"])
    with col3:
        st.metric("严重异常", summary["critical"], delta_color="inverse")
    with col4:
        n_singular = sum(1 for r in results if r.is_singular)
        st.metric("奇异矩阵", n_singular, delta_color="inverse")

    tab1, tab2, tab3, tab4 = st.tabs(["📈 条件数图表", "📋 计算结果", "⚠️ 异常队列", "📜 历史对比"])

    with tab1:
        st.subheader("条件数分布图（点击柱子查看详情）")
        results_df = results_to_dataframe(results)
        fig = make_condition_chart(results_df, anomalies)

        event = st.plotly_chart(fig, use_container_width=True, on_select="rerun", key="cond_chart")

        selected_ids = []
        if event.selection and event.selection.points:
            selected_ids = [p["x"] for p in event.selection.points]

        if selected_ids:
            st.session_state.selected_matrix_id = selected_ids[0]
        elif st.session_state.selected_matrix_id is None and results:
            st.session_state.selected_matrix_id = results[0].matrix_id

        selected_id = st.session_state.selected_matrix_id
        if selected_id:
            selected_result = find_by_id(results, selected_id)
            if selected_result:
                st.divider()
                st.subheader(f"🔍 矩阵 {selected_id} 详细信息")

                col_a, col_b = st.columns(2)
                with col_a:
                    st.metric("2-范数条件数",
                              f"{selected_result.condition_number_2:.4e}" if selected_result.condition_number_2 else "inf (奇异)")
                    st.metric("是否奇异", "是" if selected_result.is_singular else "否")
                    st.metric("来源行号", selected_result.source_row)

                with col_b:
                    svals_chart = make_singular_values_chart(selected_result)
                    if svals_chart:
                        st.plotly_chart(svals_chart, use_container_width=True)
                    else:
                        st.info("无奇异值数据")

                with st.expander("📐 计算溯源", expanded=True):
                    trace = build_calculation_trace(selected_result, df_input)
                    st.markdown(f"**计算方法**：{trace['calculation_method']}")
                    st.markdown(f"**公式**：`{trace['formula']}`")
                    st.markdown(f"**矩阵形状**：{trace['matrix_shape'][0]} × {trace['matrix_shape'][1]}")

                    if trace['singular_values']:
                        st.markdown(f"**最大奇异值 σ_max** = {trace['singular_values'][0]:.6e}")
                        st.markdown(f"**最小奇异值 σ_min** = {trace['singular_values'][-1]:.6e}")

                with st.expander("📋 原始数据（保留痕迹）"):
                    raw_df = pd.DataFrame([selected_result.raw_data])
                    st.dataframe(raw_df, use_container_width=True)
                    st.caption("⚠️ 原始数据不做自动修复，脏数据原样保留")

                anom_for_matrix = [a for a in anomalies if a.matrix_id == selected_id]
                if anom_for_matrix:
                    with st.expander(f"⚠️ 关联异常 ({len(anom_for_matrix)}条)", expanded=True):
                        for a in anom_for_matrix:
                            st.markdown(f"{severity_tag(a.severity)} **{a.anomaly_type.value}** — {a.description}", unsafe_allow_html=True)
                            st.markdown(f"&nbsp;&nbsp;&nbsp;&nbsp;影响范围：{a.impact_scope}")
                            if a.raw_value:
                                st.markdown(f"&nbsp;&nbsp;&nbsp;&nbsp;原始值：`{a.raw_value}`")

    with tab2:
        st.subheader("计算结果表")
        results_df = results_to_dataframe(results)
        st.dataframe(results_df, use_container_width=True, hide_index=True)

    with tab3:
        st.subheader("异常队列")
        if not anomalies:
            st.success("✅ 未检测到异常")
        else:
            st.caption(f"共 {len(anomalies)} 条异常，严重 {summary['critical']} 条，警告 {summary['warning']} 条，提示 {summary['info']} 条")

            for i, a in enumerate(anomalies):
                with st.container():
                    col1, col2, col3 = st.columns([1, 4, 2])
                    with col1:
                        st.markdown(severity_tag(a.severity), unsafe_allow_html=True)
                    with col2:
                        st.markdown(f"**{a.anomaly_type.value}** — 矩阵 `{a.matrix_id}` (来源行 {a.source_row})")
                        st.markdown(f"{a.description}")
                    with col3:
                        if st.button(f"查看详情 #{i+1}", key=f"anom_btn_{i}", use_container_width=True):
                            st.session_state.selected_matrix_id = a.matrix_id
                            st.rerun()

                    with st.expander("📂 影响范围与来源"):
                        st.markdown(f"**影响范围**：{a.impact_scope}")
                        if a.raw_value:
                            st.markdown(f"**原始值**：`{a.raw_value}`")
                        if a.affected_columns:
                            st.markdown(f"**涉及列**：{', '.join(a.affected_columns[:10])}{'...' if len(a.affected_columns) > 10 else ''}")
                        if a.calculation_context:
                            st.markdown("**计算上下文**：")
                            for k, v in a.calculation_context.items():
                                st.markdown(f"- {k}: `{v}`")

                    st.divider()

    with tab4:
        st.subheader("历史答案对比")
        if not comparisons:
            st.info("请上传历史答案文件以进行对比")
        else:
            comp_df = comparisons_to_dataframe(comparisons)
            st.dataframe(comp_df, use_container_width=True, hide_index=True)

            n_match = sum(1 for c in comparisons if c.is_match)
            n_mismatch = len(comparisons) - n_match
            col_a, col_b = st.columns(2)
            with col_a:
                st.metric("一致", n_match)
            with col_b:
                st.metric("不一致/无对照", n_mismatch, delta_color="inverse")


if __name__ == "__main__":
    main()
