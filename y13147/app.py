"""
蒙特卡洛误差参数试算 - Web 界面
入口: streamlit run app.py
面向: 非开发人员也能直接上手
"""

import io
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from mc_engine import (
    run_single_trial,
    run_batch,
    REQUIRED_COLUMNS,
    STATUS_LABELS,
    ERROR_MESSAGES,
)

DATA_DIR = Path(__file__).parent / "data"
DEFAULT_CSV = DATA_DIR / "param_table.csv"

# =============================================================================
# 页面配置
# =============================================================================
st.set_page_config(
    page_title="蒙特卡洛误差参数试算",
    page_icon="📊",
    layout="wide",
)

st.markdown(
    """
    <style>
    .tag-processed    { background:#16a34a; color:white; padding:2px 10px; border-radius:10px; font-size:12px; display:inline-block; }
    .tag-warn         { background:#d97706; color:white; padding:2px 10px; border-radius:10px; font-size:12px; display:inline-block; }
    .tag-pending      { background:#2563eb; color:white; padding:2px 10px; border-radius:10px; font-size:12px; display:inline-block; }
    .tag-manual       { background:#dc2626; color:white; padding:2px 10px; border-radius:10px; font-size:12px; display:inline-block; }
    .err-box          { background:#fef2f2; border-left:4px solid #dc2626; padding:8px 12px; margin:4px 0; }
    .warn-box         { background:#fffbeb; border-left:4px solid #d97706; padding:8px 12px; margin:4px 0; }
    .trace-box        { background:#f0fdf4; border-left:4px solid #16a34a; padding:8px 12px; margin:4px 0; font-family:monospace; font-size:13px; }
    </style>
    """,
    unsafe_allow_html=True,
)


# =============================================================================
# 侧边栏：材料入口
# =============================================================================
with st.sidebar:
    st.header("📥 材料入口")
    st.markdown("**步骤 1**：上传参数表（CSV / Excel），或使用示例数据")

    use_sample = st.checkbox("使用示例参数表（10 条，含正常/边界/异常）", value=True)

    if use_sample:
        uploaded_file = None
        st.info(f"已加载示例：`{DEFAULT_CSV.name}`")
    else:
        uploaded_file = st.file_uploader(
            "拖拽或选择参数表文件",
            type=["csv", "xlsx", "xls"],
            help=f"必填列: {', '.join(REQUIRED_COLUMNS)}",
        )

    st.markdown("**步骤 2**：调整全局参数（可选）")
    seed = st.number_input("随机种子（保证结果可复现）", value=20260613, step=1)
    override_conf = st.checkbox("统一覆盖置信水平")
    conf_level = st.slider("置信水平", 0.80, 0.99, 0.95, 0.01, disabled=not override_conf)
    override_n = st.checkbox("统一覆盖抽样次数")
    sample_n = st.number_input(
        "抽样次数", 1000, 50000, 10000, 1000, disabled=not override_n
    )

    st.divider()
    st.markdown(
        """
        **🧭 异常出口说明**
        - 🟢 已处理 —— 可直接使用
        - 🟡 已处理（带警告） —— 数值可用，注意备注
        - 🔵 待补材料 —— 缺少测量数据，补齐后重算
        - 🔴 人工改判 —— 需工程师判断是否放行
        """
    )


# =============================================================================
# 加载数据
# =============================================================================
@st.cache_data(show_spinner=False)
def load_param_table(src) -> pd.DataFrame:
    if isinstance(src, Path):
        return pd.read_csv(src)
    if src.name.endswith(".csv"):
        return pd.read_csv(io.StringIO(src.getvalue().decode("utf-8")))
    return pd.read_excel(src)


def apply_overrides(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    if override_conf:
        df["confidence_level"] = conf_level
    if override_n:
        df["mc_sample_count"] = sample_n
    return df


data_src = DEFAULT_CSV if use_sample else uploaded_file
if data_src is None:
    st.stop()

param_df = load_param_table(data_src)
param_df = apply_overrides(param_df)

# =============================================================================
# 主标题
# =============================================================================
st.title("📊 蒙特卡洛误差参数试算")
st.caption("面向现场质检与过程能力评估 · 数字来源可追溯 · 异常自动分流")

# =============================================================================
# Tab 1: 汇总看板 (项目经理截图用)
# =============================================================================
tab_overview, tab_detail, tab_raw, tab_howto = st.tabs(
    ["📋 汇总看板", "🔍 明细与图表", "📑 参数原始表", "📖 怎么看数字"]
)

# ---- 跑批 ----
result_rows = [run_single_trial(row, seed=seed) for _, row in param_df.iterrows()]
summary_df = pd.DataFrame(
    [
        {
            "参数编号": r.param_id,
            "案例名称": r.case_name,
            "状态": r.status_label,
            "错误/警告码": "、".join(r.error_codes) if r.error_codes else "-",
            "均值估计": round(r.mean_estimated, 6) if r.mean_estimated is not None else "-",
            "标准差": round(r.std_estimated, 6) if r.std_estimated is not None else "-",
            "Cp": round(r.cp, 3) if r.cp is not None else "-",
            "Cpk": round(r.cpk, 3) if r.cpk is not None else "-",
            "超规格率": f"{r.out_of_spec_rate*100:.2f}%" if r.out_of_spec_rate is not None else "-",
            "材料来源": param_df[param_df["param_id"] == r.param_id]["material_source"].iloc[0]
            if not param_df[param_df["param_id"] == r.param_id].empty else "-",
        }
        for r in result_rows
    ]
)

with tab_overview:
    st.subheader("汇总看板（可截图给项目经理）")

    # 状态统计卡片
    col1, col2, col3, col4 = st.columns(4)
    cnt_proc = sum(1 for r in result_rows if r.status == "PROCESSED")
    cnt_warn = sum(1 for r in result_rows if r.status == "PROCESSED_WARN")
    cnt_pend = sum(1 for r in result_rows if r.status == "MATERIAL_PENDING")
    cnt_man = sum(1 for r in result_rows if r.status == "MANUAL_REVIEW")

    col1.metric("🟢 已处理", cnt_proc)
    col2.metric("🟡 已处理（带警告）", cnt_warn)
    col3.metric("🔵 待补材料", cnt_pend)
    col4.metric("🔴 人工改判", cnt_man)

    st.markdown("#### 处理结果总表")

    def _color_status(s):
        return [
            "background-color:#dcfce7" if v == "已处理"
            else "background-color:#fef3c7" if v == "已处理（带警告）"
            else "background-color:#dbeafe" if v == "待补材料"
            else "background-color:#fee2e2"
            for v in s
        ]

    st.dataframe(
        summary_df.style.apply(_color_status, subset=["状态"]),
        use_container_width=True,
        hide_index=True,
    )

    st.markdown("---")
    st.markdown("**截图说明（给项目经理）**")
    st.markdown(
        """
        | 颜色 | 含义 | 下一步动作 |
        |------|------|------------|
        | 🟢 绿色（已处理） | 参数齐全、蒙特卡洛模拟正常、过程能力稳定 | 直接采用，纳入日报 |
        | 🟡 黄色（带警告） | 已算出数值，但存在边界/抽样不足/排序不稳等问题 | 数值可参考，需关注备注，建议复核 |
        | 🔵 蓝色（待补材料） | 缺少重复性/再现性等关键测量数据 | 联系质检补齐后重新运行 |
        | 🔴 红色（人工改判） | 数据漂移或测量系统异常 | 转工程师人工判定是否放行 |
        """
    )

# =============================================================================
# Tab 2: 明细 & 图表 (点击图表点回明细)
# =============================================================================
with tab_detail:
    st.subheader("明细查看（点击图表中的点可跳到对应参数）")

    # 准备可画图数据
    plot_df = pd.DataFrame(
        [
            {
                "param_id": r.param_id,
                "case_name": r.case_name,
                "status": r.status_label,
                "cpk": r.cpk,
                "out_of_spec_rate": (r.out_of_spec_rate * 100 if r.out_of_spec_rate is not None else None),
                "mean": r.mean_estimated,
                "std": r.std_estimated,
                "error_codes": "、".join(r.error_codes) if r.error_codes else "无",
            }
            for r in result_rows
            if r.cpk is not None
        ]
    )

    if not plot_df.empty:
        color_map = {
            "已处理": "#16a34a",
            "已处理（带警告）": "#d97706",
            "待补材料": "#2563eb",
            "人工改判": "#dc2626",
        }
        fig = px.scatter(
            plot_df,
            x="cpk",
            y="out_of_spec_rate",
            color="status",
            color_discrete_map=color_map,
            hover_name="case_name",
            hover_data={"param_id": True, "error_codes": True, "mean": True, "std": True},
            title="Cpk vs 超规格率（点击圆点查看该参数分布）",
            labels={"cpk": "过程能力 Cpk", "out_of_spec_rate": "超规格率 (%)"},
        )
        fig.add_vline(x=1.33, line_dash="dash", line_color="gray", annotation_text="Cpk=1.33 (合格线)")
        fig.update_layout(height=480)
        event = st.plotly_chart(fig, use_container_width=True, on_select="rerun", key="scatter")

        selected_idx = None
        if event and event.get("selection") and event["selection"].get("point_indices"):
            selected_idx = event["selection"]["point_indices"][0]

        # 下方下拉（也可手动选）
        st.markdown("#### 选择参数查看分布图")
        options = [(r.param_id, r.case_name) for r in result_rows]
        labels = [f"{pid} — {name}" for pid, name in options]
        if selected_idx is not None and selected_idx < len(options):
            default_choice = labels[selected_idx]
        else:
            default_choice = labels[0]
        choice = st.selectbox("选择参数", labels, index=labels.index(default_choice) if default_choice in labels else 0)
        target_pid = choice.split(" — ")[0]
    else:
        st.warning("暂无足够数据绘制散点图")
        target_pid = result_rows[0].param_id if result_rows else None

    # ---- 单参数详情 ----
    if target_pid:
        r = next((x for x in result_rows if x.param_id == target_pid), None)
        row_src = param_df[param_df["param_id"] == target_pid].iloc[0]

        if r:
            st.markdown(f"---")
            status_color = {
                "PROCESSED": "tag-processed",
                "PROCESSED_WARN": "tag-warn",
                "MATERIAL_PENDING": "tag-pending",
                "MANUAL_REVIEW": "tag-manual",
            }.get(r.status, "tag-warn")
            st.markdown(
                f"### {r.param_id} · {r.case_name} &nbsp; <span class='{status_color}'>{r.status_label}</span>",
                unsafe_allow_html=True,
            )

            # 错误 / 警告
            if r.error_codes:
                for code in r.error_codes:
                    msg = ERROR_MESSAGES.get(code, code)
                    if code.startswith("ERR_MC_001") or code.startswith("ERR_MC_002") or code.startswith("ERR_MC_004"):
                        st.markdown(f"<div class='err-box'>❌ [{code}] {msg}</div>", unsafe_allow_html=True)
                    else:
                        st.markdown(f"<div class='warn-box'>⚠️ [{code}] {msg}</div>", unsafe_allow_html=True)

            # 数字指标
            if r.mean_estimated is not None:
                c1, c2, c3, c4, c5 = st.columns(5)
                c1.metric("均值估计", f"{r.mean_estimated:.6g}")
                c2.metric("标准差", f"{r.std_estimated:.6g}")
                c3.metric("置信区间", f"[{r.lower_bound:.4g}, {r.upper_bound:.4g}]")
                c4.metric("Cp", f"{r.cp:.3f}" if r.cp else "-")
                c5.metric("Cpk", f"{r.cpk:.3f}" if r.cpk else "-")
                st.metric("超规格率", f"{r.out_of_spec_rate*100:.3f}%")

                # 分布图
                spec_lo = float(row_src["spec_lower"])
                spec_hi = float(row_src["spec_upper"])
                fig_hist = go.Figure()
                fig_hist.add_trace(
                    go.Histogram(
                        x=r.samples, nbinsx=80, name="蒙特卡洛抽样",
                        marker_color="#60a5fa", opacity=0.7,
                    )
                )
                fig_hist.add_vline(x=spec_lo, line_dash="dash", line_color="#dc2626", annotation_text=f"规格下限 {spec_lo}")
                fig_hist.add_vline(x=spec_hi, line_dash="dash", line_color="#dc2626", annotation_text=f"规格上限 {spec_hi}")
                fig_hist.add_vline(x=r.mean_estimated, line_color="#16a34a", annotation_text=f"均值 {r.mean_estimated:.4g}")
                fig_hist.update_layout(
                    title=f"{r.case_name} — 蒙特卡洛抽样分布 (n={r.trace.sample_count if r.trace else '?'})",
                    xaxis_title="测量值", yaxis_title="频次", height=400,
                )
                st.plotly_chart(fig_hist, use_container_width=True)

            # ---- 数字来源线索 ----
            if r.trace:
                with st.expander("🧾 数字从哪来（点我展开）", expanded=True):
                    t = r.trace
                    st.markdown(
                        f"""
                        <div class="trace-box">
                        <b>分布类型：</b>{t.distribution_type}<br>
                        <b>名义值来源：</b>{t.nominal_source}<br>
                        <b>标准差合成：</b>{t.std_source}<br>
                        <b>合成公式：</b>{t.formula}<br>
                        <b>抽样数量：</b>{t.sample_count} 次 &nbsp;&nbsp;
                        <b>随机种子：</b>{t.random_seed}（复现用）
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )

            st.markdown(
                f"""
                **关联材料**：`{row_src.get('material_source', '-')}`  
                **备注**：{row_src.get('remark', '-')}
                """
            )

# =============================================================================
# Tab 3: 原始参数表
# =============================================================================
with tab_raw:
    st.subheader("参数原始表")
    st.dataframe(param_df, use_container_width=True, hide_index=True)
    st.download_button(
        "⬇️ 下载当前参数表为 CSV",
        param_df.to_csv(index=False),
        file_name="param_table_export.csv",
        mime="text/csv",
    )

# =============================================================================
# Tab 4: 怎么看 (给不看代码的人)
# =============================================================================
with tab_howto:
    st.subheader("怎么看这个工具（不看代码也能懂）")

    st.markdown("#### 1️⃣ 数字从哪里来？")
    st.markdown(
        """
        每一条参数都来自车间的**质检单**，质检单记录了一个零件的关键尺寸：

        - **名义值** —— 图纸上写的理想尺寸
        - **公差** —— 允许偏离名义值的范围
        - **重复性标准差** —— 同一个人、同一件零件，反复测多次的波动
        - **再现性标准差** —— 不同人、不同设备去测同一件零件的波动

        我们把这两个波动**合成**成一个总标准差，然后用电脑按正态分布随机抽几千到几万次
        （这就是"蒙特卡洛"），模拟真实生产中可能出现的情况。
        """
    )

    st.markdown("#### 2️⃣ 结果怎么看？")
    st.markdown(
        """
        | 指标 | 含义 | 多大算好 |
        |------|------|----------|
        | **均值** | 模拟出来的平均尺寸 | 越接近名义值越好 |
        | **标准差** | 波动大小 | 越小越稳定 |
        | **Cpk** | 过程能力指数 | ≥1.33 合格，≥1.67 优秀 |
        | **超规格率** | 模拟中不合格品比例 | 越低越好 |
        """
    )

    st.markdown("#### 3️⃣ 四种状态什么意思？")
    st.markdown(
        """
        - 🟢 **已处理** —— 数据齐全、模拟正常，直接用结果就行
        - 🟡 **已处理（带警告）** —— 结果算出来了，但有小问题：
            - 抽样次数太少（可能不够准）
            - "排序不稳定" —— 波动太大，多跑几次排名可能变
            - 遇到这类情况，结果可以参考，但最好和工程师确认一下
        - 🔵 **待补材料** —— 质检没把重复性/再现性数据交上来，跑不出来，找质检要
        - 🔴 **人工改判** —— 测量系统本身有问题（比如不同人测出来差太远），电脑说不准，必须工程师拍板
        """
    )

    st.markdown("#### 4️⃣ 日常怎么用？")
    st.markdown(
        """
        项目经理可以直接跑命令行脚本（`python run_daily.py`），
        也可以打开这个网页，左边上传参数表，右边直接看结果。
        结果支持下载成 CSV 贴到日报里。
        """
    )
