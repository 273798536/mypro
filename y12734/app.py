"""置信区间口径对比 - Streamlit 看板

按建模社助教的使用习惯设计：
1. 左侧：数据导入 / 快照选择 / 参数
2. 顶部：核心指标卡片 + 异常提示
3. 中部：异常面板（分"需补材料"和"需改口径"，每项附下一步操作）
4. 中下部：口径对比图表 + 明细表
5. 底部：导出按钮
"""
from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import streamlit as st
import plotly.graph_objects as go
from plotly.subplots import make_subplots

sys.path.insert(0, str(Path(__file__).parent))

from ci_compare.core.models import (
    CI_METHOD,
    ANOMALY_TYPE,
    ANOMALY_SEVERITY,
    StudentAnswer,
    ScoreRecord,
    DatasetSnapshot,
    SnapshotDiff,
    ComparisonSummary,
)
from ci_compare.core.data_import import (
    load_answers,
    load_dataframe,
    dataframe_to_answers,
    apply_score_records,
    save_snapshot,
    load_snapshot,
    list_snapshots,
    diff_snapshots,
)
from ci_compare.core.analysis import run_full_analysis
from ci_compare.core.ci_engine import results_to_pivot
from ci_compare.core.exporter import export_excel


st.set_page_config(
    page_title="置信区间口径对比",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

METHOD_COLORS = {
    CI_METHOD.WILSON.value: "#2E86AB",
    CI_METHOD.CLOPPER_PEARSON.value: "#1B998B",
    CI_METHOD.NORMAL_APPROX.value: "#E84855",
}

METHOD_MARKERS = {
    CI_METHOD.WILSON.value: "diamond",
    CI_METHOD.CLOPPER_PEARSON.value: "square",
    CI_METHOD.NORMAL_APPROX.value: "circle",
}

SEVERITY_COLORS = {
    ANOMALY_SEVERITY.CRITICAL: "#FF4B4B",
    ANOMALY_SEVERITY.WARNING: "#FFA500",
    ANOMALY_SEVERITY.INFO: "#4CAF50",
}


# ---------- 会话状态初始化 ----------

if "current_answers" not in st.session_state:
    st.session_state.current_answers = []
if "current_snapshot" not in st.session_state:
    st.session_state.current_snapshot = None
if "previous_snapshot" not in st.session_state:
    st.session_state.previous_snapshot = None
if "previous_answers" not in st.session_state:
    st.session_state.previous_answers = []
if "score_records" not in st.session_state:
    st.session_state.score_records = []
if "summary" not in st.session_state:
    st.session_state.summary = None


# ---------- 侧边栏 ----------

with st.sidebar:
    st.title("📊 置信区间口径对比")
    st.caption("建模社专用工具")

    st.subheader("① 导入数据")
    upload_tab, snapshot_tab = st.tabs(["上传文件", "选择历史快照"])

    with upload_tab:
        uploaded_file = st.file_uploader(
            "上传 Excel 或 CSV",
            type=["xlsx", "xls", "csv"],
            help="必填列：student_id（学生ID）、question_id（题目ID）；选填：is_correct、score、tags",
        )
        if uploaded_file is not None:
            if st.button("读取并保存为快照", type="primary", use_container_width=True):
                with st.spinner("正在导入数据..."):
                    tmp_path = Path("/tmp") / uploaded_file.name
                    tmp_path.write_bytes(uploaded_file.getbuffer())
                    answers = load_answers(tmp_path)
                    snapshot = save_snapshot(answers, source_name=uploaded_file.name)
                    st.session_state.current_answers = answers
                    st.session_state.current_snapshot = snapshot
                    st.session_state.score_records = []
                    st.session_state.summary = None

                    existing = list_snapshots()
                    if len(existing) > 1:
                        prev_snap = existing[1]
                        _, prev_answers = load_snapshot(prev_snap.snapshot_id)
                        st.session_state.previous_snapshot = prev_snap
                        st.session_state.previous_answers = prev_answers
                    else:
                        st.session_state.previous_snapshot = None
                        st.session_state.previous_answers = []

                    st.success(f"已导入 {len(answers)} 条记录，快照 ID: {snapshot.snapshot_id}")
                    tmp_path.unlink(missing_ok=True)

    with snapshot_tab:
        snapshots = list_snapshots()
        if snapshots:
            snap_options = {
                f"{s.created_at.strftime('%m-%d %H:%M')} | {s.source_name or '未命名'} | {s.record_count}条 | {s.snapshot_id}": s
                for s in snapshots
            }
            selected = st.selectbox(
                "选择快照",
                list(snap_options.keys()),
                index=0,
            )
            if st.button("加载此快照", use_container_width=True):
                with st.spinner("加载中..."):
                    snap = snap_options[selected]
                    _, answers = load_snapshot(snap.snapshot_id)
                    st.session_state.current_answers = answers
                    st.session_state.current_snapshot = snap
                    st.session_state.score_records = []
                    st.session_state.summary = None

                    all_snaps = list_snapshots()
                    idx = next((i for i, s in enumerate(all_snaps) if s.snapshot_id == snap.snapshot_id), -1)
                    if idx < len(all_snaps) - 1:
                        prev_snap = all_snaps[idx + 1]
                        _, prev_answers = load_snapshot(prev_snap.snapshot_id)
                        st.session_state.previous_snapshot = prev_snap
                        st.session_state.previous_answers = prev_answers
                    else:
                        st.session_state.previous_snapshot = None
                        st.session_state.previous_answers = []

                    st.success(f"已加载快照 {snap.snapshot_id}")
        else:
            st.info("暂无历史快照，请先上传文件")

    st.divider()
    st.subheader("② 评分补录")
    if st.session_state.current_answers:
        unrated = [a for a in st.session_state.current_answers if a.is_correct is None]
        if unrated:
            st.write(f"待评分记录：{len(unrated)} 条")
            st.caption("补录评分后，所有分析结果将自动更新。不会覆盖原始快照。")
            record_options = {
                f"{a.record_id} | {a.student_id} | {a.question_id}": a
                for a in unrated[:50]
            }
            sel_record = st.selectbox(
                "选择记录",
                list(record_options.keys()),
                disabled=not unrated,
            )
            col1, col2 = st.columns(2)
            with col1:
                is_correct = st.radio("判分", ["正确", "错误"], horizontal=True)
            with col2:
                score_val = st.number_input("得分", min_value=0.0, max_value=1.0, value=1.0 if is_correct == "正确" else 0.0, step=0.1)

            if st.button("添加评分记录", use_container_width=True):
                ans = record_options[sel_record]
                sr = ScoreRecord(
                    record_id=ans.record_id,
                    is_correct=(is_correct == "正确"),
                    score=score_val,
                    scored_at=datetime.now(),
                )
                st.session_state.score_records.append(sr)
                st.session_state.summary = None
                st.success(f"已补录：{ans.record_id}")
        else:
            st.success("所有记录均已评分 ✅")
    else:
        st.info("请先导入数据")

    st.divider()
    st.subheader("③ 计算参数")
    confidence = st.slider("置信水平", 0.80, 0.99, 0.95, 0.01, format="%.2f")
    min_sample = st.number_input("最小样本量", 1, 100, 10)
    error_thresh = st.slider("近似误差阈值", 0.01, 0.20, 0.05, 0.01, format="%.2f",
                             help="正态近似宽度与参考口径差异超过此值则拦截")
    decision_thresh = st.slider("决策阈值", 0.30, 0.90, 0.60, 0.05, format="%.2f",
                                help="判断正确率显著高于/低于此值")
    group_by = st.selectbox("分组维度", ["question_id", "student_id"], index=0,
                            format_func=lambda x: "按题目" if x == "question_id" else "按学生")


# ---------- 计算 ----------

if st.session_state.current_answers:

    answers_for_calc = apply_score_records(
        st.session_state.current_answers,
        st.session_state.score_records,
    ) if st.session_state.score_records else st.session_state.current_answers

    if st.session_state.summary is None:
        with st.spinner("正在计算置信区间..."):
            results = run_full_analysis(
                answers_for_calc,
                confidence=confidence,
                min_sample_size=min_sample,
                approx_error_threshold=error_thresh,
                decision_threshold=decision_thresh,
                group_by=group_by,
            )

            diff = None
            if st.session_state.previous_answers:
                diff = diff_snapshots(st.session_state.previous_answers, answers_for_calc)

            st.session_state.summary = ComparisonSummary(
                answers=answers_for_calc,
                ci_results=results["ci_results"],
                anomalies=results["anomalies"],
                error_analyses=results["error_analyses"],
                counter_examples=results["counter_examples"],
                snapshot=st.session_state.current_snapshot or DatasetSnapshot(
                    source_name="未命名",
                    record_count=len(answers_for_calc),
                ),
                previous_snapshot=st.session_state.previous_snapshot,
                diff=diff,
            )

    summary = st.session_state.summary
    pivot = results_to_pivot(summary.ci_results)
    blocked_groups = {e.group_key for e in summary.error_analyses if e.is_approx_error_too_large}
    affected_groups = set(summary.diff.affected_groups) if summary.diff else set()

    # ---------- 主内容区 ----------

    # --- 顶部版本变更提示 ---
    if summary.diff and summary.diff.has_changes:
        st.warning(
            f"📌 相对上一快照（{summary.previous_snapshot.snapshot_id if summary.previous_snapshot else '?'}）："
            f"新增 {len(summary.diff.added_records)} 条，"
            f"删除 {len(summary.diff.removed_records)} 条，"
            f"评分更新 {len(summary.diff.updated_records)} 条，"
            f"**影响 {len(summary.diff.affected_groups)} 个分组的结论**。"
            f"下方表格中「本次更新」列已标注。"
        )

    # --- KPI 卡片 ---
    n_total = len(summary.answers)
    n_rated = sum(1 for a in summary.answers if a.is_correct is not None)
    n_groups = len(pivot)
    n_anomalies = len(summary.anomalies)
    n_need_mat = sum(1 for a in summary.anomalies if a.anomaly_type == ANOMALY_TYPE.NEED_MATERIAL)
    n_need_met = sum(1 for a in summary.anomalies if a.anomaly_type == ANOMALY_TYPE.NEED_METHOD)
    n_blocked = len(blocked_groups)

    col_k1, col_k2, col_k3, col_k4, col_k5 = st.columns(5)
    col_k1.metric("答题记录", f"{n_total}", f"已评分 {n_rated}")
    col_k2.metric("分组数", f"{n_groups}")
    col_k3.metric("异常总数", f"{n_anomalies}",
                  delta=f"补{n_need_mat} / 改{n_need_met}",
                  delta_color="off")
    col_k4.metric("需补材料", f"{n_need_mat}", delta_color="off")
    col_k5.metric("需改口径", f"{n_need_met}",
                  delta=f"拦截 {n_blocked} 个", delta_color="inverse")

    st.divider()

    # --- 异常面板：分两栏展示 ---
    st.subheader("🚨 异常面板（按处理方式分类）")
    col_mat, col_met = st.columns(2)

    with col_mat:
        need_mat = [a for a in summary.anomalies if a.anomaly_type == ANOMALY_TYPE.NEED_MATERIAL]
        st.markdown(
            f'<div style="padding:12px; background:#FFF8E1; border-left:5px solid #FFA000; '
            f'border-radius:4px; margin-bottom:16px;">'
            f'<b style="font-size:16px;">📝 需补材料</b> &nbsp;&nbsp;'
            f'<span style="color:#666;">{len(need_mat)} 项 — 补完数据重算即可</span>'
            f'</div>',
            unsafe_allow_html=True,
        )
        if need_mat:
            for a in need_mat:
                color = SEVERITY_COLORS[a.severity]
                with st.expander(f"● {a.title}", expanded=a.severity == ANOMALY_SEVERITY.CRITICAL):
                    st.markdown(f"**严重程度：** <span style='color:{color};font-weight:bold;'>{a.severity.value}</span>", unsafe_allow_html=True)
                    st.markdown(f"**下一步：** {a.anomaly_type.action_hint}")
                    st.markdown(f"**说明：** {a.description}")
        else:
            st.success("无材料类异常 ✅")

    with col_met:
        need_met = [a for a in summary.anomalies if a.anomaly_type == ANOMALY_TYPE.NEED_METHOD]
        st.markdown(
            f'<div style="padding:12px; background:#FFEBEE; border-left:5px solid #E53935; '
            f'border-radius:4px; margin-bottom:16px;">'
            f'<b style="font-size:16px;">🔧 需改口径</b> &nbsp;&nbsp;'
            f'<span style="color:#666;">{len(need_met)} 项 — 评估方法或阈值</span>'
            f'</div>',
            unsafe_allow_html=True,
        )
        if need_met:
            for a in need_met:
                color = SEVERITY_COLORS[a.severity]
                with st.expander(f"● {a.title}", expanded=a.severity in (ANOMALY_SEVERITY.CRITICAL, ANOMALY_SEVERITY.WARNING)):
                    st.markdown(f"**严重程度：** <span style='color:{color};font-weight:bold;'>{a.severity.value}</span>", unsafe_allow_html=True)
                    st.markdown(f"**下一步：** {a.anomaly_type.action_hint}")
                    st.markdown(f"**说明：** {a.description}")
                    if a.affected_methods:
                        st.markdown(f"**受影响口径：** {', '.join(m.display_name for m in a.affected_methods)}")
        else:
            st.success("无口径类异常 ✅")

    st.divider()

    # --- 图表区 ---
    st.subheader("📈 口径对比图表")

    group_list = sorted(pivot.keys())

    chart_tab1, chart_tab2 = st.tabs(["区间对比图", "宽度散点图"])

    with chart_tab1:
        if group_list:
            n_show = st.slider("显示前 N 个分组", 5, min(50, len(group_list)), min(20, len(group_list)))
            show_groups = group_list[:n_show]

            fig = go.Figure()
            y_positions = list(range(len(show_groups)))

            for method in CI_METHOD:
                m_name = method.value
                lowers = []
                uppers = []
                for g in show_groups:
                    if m_name in pivot[g]:
                        lowers.append(pivot[g][m_name]["lower"])
                        uppers.append(pivot[g][m_name]["upper"])
                    else:
                        lowers.append(None)
                        uppers.append(None)

                for i, g in enumerate(show_groups):
                    if lowers[i] is not None and uppers[i] is not None:
                        is_blocked = (m_name == CI_METHOD.NORMAL_APPROX.value and g in blocked_groups)
                        fig.add_trace(go.Scatter(
                            x=[lowers[i], uppers[i]],
                            y=[y_positions[i], y_positions[i]],
                            mode="lines",
                            line=dict(
                                color=METHOD_COLORS[m_name],
                                width=3 if not is_blocked else 1,
                                dash="dot" if is_blocked else "solid",
                            ),
                            showlegend=False,
                            hoverinfo="skip",
                        ))

                centers = [(l + u) / 2 if l is not None and u is not None else None for l, u in zip(lowers, uppers)]
                fig.add_trace(go.Scatter(
                    x=centers,
                    y=y_positions,
                    mode="markers",
                    marker=dict(
                        symbol=METHOD_MARKERS[m_name],
                        size=9,
                        color=METHOD_COLORS[m_name],
                        line=dict(color="white", width=1),
                    ),
                    name=method.display_name,
                    hovertemplate=f"<b>{method.display_name}</b><br>"
                                  f"分组: %{{y}}<br>"
                                  f"下限: %{{x:.4f}}<extra></extra>",
                ))

            fig.add_vline(x=decision_thresh, line_dash="dash", line_color="gray",
                          annotation_text=f"决策阈值 {decision_thresh:.0%}", annotation_position="top")

            fig.update_layout(
                height=max(400, 30 * len(show_groups)),
                yaxis=dict(
                    tickmode="array",
                    tickvals=y_positions,
                    ticktext=[
                        g + (" ⚠️更新" if g in affected_groups else "") + (" 🔴拦截" if g in blocked_groups else "")
                        for g in show_groups
                    ],
                    autorange="reversed",
                ),
                xaxis_title="正确率 (含置信区间)",
                legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
                margin=dict(l=20, r=20, t=40, b=20),
            )
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("暂无数据")

    with chart_tab2:
        if summary.ci_results:
            df_plot = pd.DataFrame([
                {
                    "分组": r.group_key,
                    "口径": r.method.display_name,
                    "n": r.n,
                    "p": r.p,
                    "区间宽度": r.ci_width,
                    "被拦截": r.group_key in blocked_groups and r.method == CI_METHOD.NORMAL_APPROX,
                }
                for r in summary.ci_results
            ])
            fig2 = px = go.Figure()
            for method in CI_METHOD:
                sub = df_plot[df_plot["口径"] == method.display_name]
                fig2.add_trace(go.Scatter(
                    x=sub["n"], y=sub["区间宽度"],
                    mode="markers",
                    marker=dict(
                        color=METHOD_COLORS[method.value],
                        size=8,
                        symbol=METHOD_MARKERS[method.value],
                        opacity=0.7,
                        line=dict(color="white", width=0.5),
                    ),
                    name=method.display_name,
                    text=sub["分组"],
                    hovertemplate="<b>%{text}</b><br>n=%{x}<br>宽度=%{y:.4f}<extra></extra>",
                ))
            fig2.update_layout(
                xaxis_title="样本量 n",
                yaxis_title="置信区间宽度",
                height=450,
                legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
            )
            st.plotly_chart(fig2, use_container_width=True)

    st.divider()

    # --- 明细表 ---
    st.subheader("📋 口径对比明细")

    detail_rows = []
    for g in group_list:
        methods = pivot[g]
        first = list(methods.values())[0]
        row = {
            "分组": g,
            "n": first["n"],
            "p": round(first["p"], 4),
            "近似拦截": "🔴" if g in blocked_groups else "",
            "本次更新": "⚠️" if g in affected_groups else "",
        }
        for method in CI_METHOD:
            m = methods.get(method.value)
            if m:
                row[f"{method.display_name} 下限"] = round(m["lower"], 4)
                row[f"{method.display_name} 上限"] = round(m["upper"], 4)
                row[f"{method.display_name} 宽度"] = round(m["width"], 4)
        detail_rows.append(row)

    if detail_rows:
        df_detail = pd.DataFrame(detail_rows)

        col_s1, col_s2 = st.columns([1, 3])
        with col_s1:
            filter_opt = st.selectbox(
                "筛选",
                ["全部", "仅被拦截", "仅本次更新", "仅异常分组"],
            )
        with col_s2:
            search = st.text_input("搜索分组", "")

        if filter_opt == "仅被拦截":
            df_detail = df_detail[df_detail["近似拦截"] != ""]
        elif filter_opt == "仅本次更新":
            df_detail = df_detail[df_detail["本次更新"] != ""]
        elif filter_opt == "仅异常分组":
            anomaly_groups = set()
            for a in summary.anomalies:
                if a.group_key:
                    anomaly_groups.add(a.group_key)
            df_detail = df_detail[df_detail["分组"].isin(anomaly_groups)]

        if search:
            df_detail = df_detail[df_detail["分组"].astype(str).str.contains(search, case=False)]

        def _highlight_row(row):
            styles = [""] * len(row)
            if row["近似拦截"] == "🔴":
                styles = ["background-color: #FFC7CE"] * len(row)
            elif row["本次更新"] == "⚠️":
                styles = ["background-color: #FFEB9C"] * len(row)
            return styles

        st.dataframe(
            df_detail.style.apply(_highlight_row, axis=1),
            use_container_width=True,
            hide_index=True,
            height=420,
        )

        with st.expander("🔍 单组钻取", expanded=False):
            sel_group = st.selectbox("选择分组查看详情", group_list)
            if sel_group and sel_group in pivot:
                m_data = pivot[sel_group]
                col_d1, col_d2 = st.columns([1, 1])
                with col_d1:
                    st.markdown(f"**分组：** {sel_group}")
                    first = list(m_data.values())[0]
                    st.write(f"样本量 n = {first['n']}，正确数 k = {int(first['k'])}，点估计 p = {first['p']:.4f}")
                    if sel_group in blocked_groups:
                        st.error("⚠️ 该分组正态近似结果已被拦截（近似误差过大）")
                    if sel_group in affected_groups:
                        st.warning("📌 该分组结论受本次数据更新影响")

                    ce = next((c for c in summary.counter_examples if c.group_key == sel_group), None)
                    if ce:
                        st.error(f"🚨 反例 - {ce.description}")
                with col_d2:
                    drill_rows = []
                    for method in CI_METHOD:
                        m = m_data.get(method.value)
                        if m:
                            drill_rows.append({
                                "口径": method.display_name,
                                "下限": round(m["lower"], 5),
                                "上限": round(m["upper"], 5),
                                "宽度": round(m["width"], 5),
                            })
                    st.table(pd.DataFrame(drill_rows))

    st.divider()

    # --- 反例 & 误差 ---
    col_ex1, col_ex2 = st.columns(2)
    with col_ex1:
        st.subheader("🚩 反例清单")
        if summary.counter_examples:
            for ce in summary.counter_examples:
                impact_color = {"high": "#E53935", "medium": "#FFA000", "low": "#4CAF50"}[ce.impact_level]
                with st.expander(f"[{ce.impact_level.upper()}] {ce.group_key}"):
                    st.markdown(f"**影响级别：** <span style='color:{impact_color};font-weight:bold'>{ce.impact_level}</span>", unsafe_allow_html=True)
                    st.write(ce.description)
        else:
            st.success("未发现口径结论分歧的反例 ✅")

    with col_ex2:
        st.subheader("📐 近似误差分析")
        large = [e for e in summary.error_analyses if e.is_approx_error_too_large]
        if large:
            st.error(f"{len(large)} 个分组近似误差超过 {error_thresh:.0%}，正态近似结果已拦截")
        err_rows = []
        for e in sorted(summary.error_analyses, key=lambda x: -abs(x.width_diff))[:20]:
            err_rows.append({
                "分组": e.group_key,
                "宽度差异": round(e.width_diff, 4),
                "超限": "🔴" if e.is_approx_error_too_large else "",
            })
        st.dataframe(pd.DataFrame(err_rows), use_container_width=True, hide_index=True, height=300)

    st.divider()

    # --- 导出区 ---
    st.subheader("📤 导出报告")
    col_exp1, col_exp2 = st.columns([1, 3])
    with col_exp1:
        if st.button("生成 Excel 报告", type="primary", use_container_width=True):
            with st.spinner("生成报告中..."):
                export_path = export_excel(summary)
                with open(export_path, "rb") as f:
                    st.download_button(
                        label="下载 Excel 报告",
                        data=f.read(),
                        file_name=export_path.name,
                        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        use_container_width=True,
                    )
                st.success(f"报告已生成：{export_path.name}")
    with col_exp2:
        st.info(
            "💡 导出报告包含 6 个 Sheet：总览、口径对比明细、异常清单、近似误差分析、反例清单、说明。"
            "被拦截的记录会标红，异常按「需补材料/需改口径」分类，说明页解释了拦截原因——"
            "即使只看导出文件，运营同事也能明白。"
        )

else:
    st.info("👈 请在左侧上传数据文件或选择历史快照，开始置信区间口径对比分析。")
    st.markdown("---")
    st.subheader("快速使用指南")
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown("**① 启动**")
        st.caption("`streamlit run app.py` 打开浏览器")
    with col2:
        st.markdown("**② 导入**")
        st.caption("左侧上传 Excel/CSV，或选择历史快照")
    with col3:
        st.markdown("**③ 查异常**")
        st.caption("顶部异常面板分两类，每项附下一步操作")
    with col4:
        st.markdown("**④ 导出**")
        st.caption("底部生成 Excel 报告给运营同事")
