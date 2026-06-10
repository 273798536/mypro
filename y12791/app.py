import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px

from src.sample_data import generate_all_sample_data
from src.validator import (
    run_full_validation, get_validation_without_safety,
    check_blank_control, check_ph_range, check_feeding_order,
    check_reaction_time, check_weighing_completeness, apply_safety_notes
)
from src.report_exporter import generate_excel_report, SEVERITY_ZH, ISSUE_TYPE_ZH


st.set_page_config(
    page_title="反应釜投料顺序校验看板",
    page_icon="🧪",
    layout="wide",
    initial_sidebar_state="expanded"
)


@st.cache_data(show_spinner=False)
def load_data():
    return generate_all_sample_data()


def severity_color(sev: str) -> str:
    return {"high": "#ff4b4b", "medium": "#ffa726", "low": "#42a5f5"}.get(sev, "#9e9e9e")


def pass_fail_icon(is_ok: bool) -> str:
    return "✅" if is_ok else "❌"


data = load_data()
reagents = data["reagents"]
experiment = data["experiment"]
weighing_records = data["weighing_records"]
safety_notes = data["safety_notes"]
batch_id = data["batch_id"]
reagent_map = {r.reagent_id: r for r in reagents}

result_before, result_after, applied_notes = get_validation_without_safety(
    experiment, reagents, weighing_records, safety_notes
)
all_issues_raw = result_before.issues
final_issues = result_after.issues

excel_bytes = generate_excel_report(
    experiment, reagents, weighing_records, safety_notes,
    result_after, result_before
)


with st.sidebar:
    st.title("🧪 反应釜投料校验")
    st.markdown("---")
    st.markdown(f"**批次编号**：`{batch_id}`")
    st.markdown(f"**实验编号**：`{experiment.experiment_id}`")
    st.markdown(f"**反应名称**：{experiment.reaction_name}")
    st.markdown(f"**实验日期**：{experiment.experiment_date}")
    st.markdown("---")

    st.download_button(
        label="📥 导出完整报告 (Excel)",
        data=excel_bytes,
        file_name=f"投料校验报告_{batch_id}.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        use_container_width=True
    )

    st.markdown("---")
    st.markdown("### 校验开关")
    show_before_after = st.toggle("显示安全备注前后对比", value=True)
    show_manager_view = st.toggle("质检主管视图", value=True)


st.title(f"反应釜投料顺序校验 — {batch_id}")
st.caption(f"生成时间：{result_after.generated_at}")

tab_overview, tab_issues, tab_ph, tab_steps, tab_weighing, tab_safety, tab_chromatogram, tab_reagents = st.tabs([
    "📊 总览", "⚠️ 问题清单", "🧪 pH校验明细",
    "📋 投料步骤", "⚖️ 称量记录", "🛡️ 安全备注",
    "📈 谱图对比", "📚 试剂台账"
])


with tab_overview:
    col1, col2, col3, col4 = st.columns(4)

    final_status = "通过" if result_after.is_pass else "未通过"
    col1.metric("最终校验结论", final_status,
                delta=f"{len(final_issues)} 条待处理",
                delta_color="normal" if result_after.is_pass else "inverse")

    if show_before_after:
        col2.metric("原始问题数 / 处理后",
                    f"{len(all_issues_raw)} / {len(final_issues)}",
                    delta=f"-{len(all_issues_raw) - len(final_issues)} 因备注豁免",
                    delta_color="normal")
    else:
        col2.metric("待处理问题总数", len(final_issues))

    high_count = sum(1 for i in final_issues if i.severity == "high")
    med_count = sum(1 for i in final_issues if i.severity == "medium")
    low_count = sum(1 for i in final_issues if i.severity == "low")
    col3.metric("风险分布", f"高{high_count} / 中{med_count} / 低{low_count}")

    col4.metric("投料步骤数", len(experiment.feeding_steps),
                delta=f"{len(weighing_records)} 条称量记录")

    st.markdown("---")

    sub1, sub2 = st.columns(2)

    with sub1:
        st.markdown("#### 分项校验结果")
        checks = [
            ("空白对照", result_after.blank_control_ok),
            ("pH值范围", result_after.ph_all_ok),
            ("投料顺序与时间", result_after.feeding_order_ok),
            ("反应时间完整性", result_after.reaction_time_ok),
            ("称量记录完整", result_after.weighing_complete)
        ]
        for name, ok in checks:
            st.markdown(f"- {pass_fail_icon(ok)} **{name}**：{'合格' if ok else '存在异常'}")

    with sub2:
        if len(final_issues) > 0:
            st.markdown("#### 问题严重度分布")
            fig_pie = go.Figure(data=[go.Pie(
                labels=[SEVERITY_ZH.get(s, s) for s in ["high", "medium", "low"]],
                values=[high_count, med_count, low_count],
                marker=dict(colors=["#ff4b4b", "#ffa726", "#42a5f5"]),
                hole=0.5,
                textinfo="label+percent+value"
            )])
            fig_pie.update_layout(height=280, margin=dict(l=10, r=10, t=10, b=10), showlegend=True)
            st.plotly_chart(fig_pie, use_container_width=True)
        else:
            st.success("🎉 本批次未发现任何问题，所有校验项均合格。")

    st.markdown("---")

    st.markdown("#### 各步投料pH趋势")
    steps_sorted = sorted(experiment.feeding_steps, key=lambda s: s.step_no)
    ph_vals = [s.ph_value for s in steps_sorted]
    step_labels = [f"第{s.step_no}步\n{s.reagent_name}" for s in steps_sorted]

    fig_ph = go.Figure()
    for s in steps_sorted:
        r = reagent_map.get(s.reagent_id)
        if r and r.ph_range_min is not None and r.ph_range_max is not None:
            fig_ph.add_hrect(
                y0=r.ph_range_min, y1=r.ph_range_max,
                fillcolor="rgba(76,175,80,0.08)", line_width=0,
                annotation_text=f"{s.reagent_name}范围",
                annotation_position="inside left"
            )

    color_list = []
    for s in steps_sorted:
        r = reagent_map.get(s.reagent_id)
        c = "#2196f3"
        if s.ph_value is None:
            c = "#9e9e9e"
        elif r and r.ph_range_min is not None:
            if s.ph_value < r.ph_range_min or s.ph_value > r.ph_range_max:
                is_exempt = any(
                    i.affected_step == s.step_no and i.safety_related
                    for i in final_issues
                )
                c = "#ffc107" if is_exempt else "#f44336"
        color_list.append(c)

    fig_ph.add_trace(go.Scatter(
        x=list(range(len(steps_sorted))),
        y=ph_vals,
        mode="markers+lines",
        marker=dict(size=14, color=color_list, line=dict(width=2, color="white")),
        line=dict(color="#607d8b", width=2),
        text=step_labels,
        hovertemplate="%{text}<br>pH: %{y}<extra></extra>"
    ))
    fig_ph.update_xaxes(
        tickvals=list(range(len(steps_sorted))),
        ticktext=[f"第{s.step_no}步" for s in steps_sorted]
    )
    fig_ph.update_yaxes(title="pH值")
    fig_ph.update_layout(height=360, margin=dict(l=20, r=20, t=10, b=10), showlegend=False)
    st.plotly_chart(fig_ph, use_container_width=True)

    if show_manager_view:
        st.markdown("---")
        st.markdown("### 👔 质检主管复核视图")
        m1, m2 = st.columns(2)

        with m1:
            st.markdown("#### pH越界精确定位")
            ph_issues = [i for i in final_issues if "ph" in i.issue_type.lower()]
            if ph_issues:
                for issue in ph_issues:
                    step = next((s for s in experiment.feeding_steps if s.step_no == issue.affected_step), None)
                    r = reagent_map.get(step.reagent_id) if step else None
                    ph_range = "—"
                    if r and r.ph_range_min is not None:
                        ph_range = f"{r.ph_range_min} ~ {r.ph_range_max}"
                    actual_ph = str(step.ph_value) if step and step.ph_value else "未记录"
                    status = "🛡️ 已豁免" if issue.safety_related else "⚠️ 待处理"
                    with st.expander(f"{status} 第{issue.affected_step}步 — {issue.affected_material} (pH={actual_ph})", expanded=True):
                        st.markdown(f"**允许范围**：{ph_range}")
                        st.markdown(f"**问题说明**：{issue.readable_description}")
                        st.markdown(f"**处理建议**：{issue.suggestion}")
            else:
                st.info("本批次无 pH 越界问题。")

        with m2:
            st.markdown("#### 本轮复核包含记录")
            st.markdown(f"- 实验记录：`{experiment.experiment_id}` — {experiment.reaction_name}")
            st.markdown(f"- 投料步骤：{len(experiment.feeding_steps)} 步")
            st.markdown(f"- 称量记录：{len(weighing_records)} 条")
            st.markdown(f"- 安全备注：{len(safety_notes)} 条（影响判定：{sum(1 for n in safety_notes if n.affects_judgment)} 条）")
            if experiment.old_remark:
                st.markdown(f"- 📝 历史旧备注：{experiment.old_remark}")
            if experiment.current_remark:
                st.markdown(f"- ✏️ 本次补录备注：{experiment.current_remark}")

            st.markdown("#### 复核关注点")
            concerns = []
            if not result_after.blank_control_ok:
                concerns.append("🔴 空白对照缺失，需关注本底影响")
            if sum(1 for n in safety_notes if n.affects_judgment) > 0:
                concerns.append("🟡 存在安全备注修改判定，请确认理由充分")
            if not result_after.reaction_time_ok:
                concerns.append("🔴 反应时间记录不全")
            if not result_after.weighing_complete:
                concerns.append("🟡 称量存在缺项（如漏填单位）")
            if concerns:
                for c in concerns:
                    st.markdown(c)
            else:
                st.success("无特别关注点。")


with tab_issues:
    st.markdown("### 问题清单")

    if show_before_after:
        c_b, c_a = st.columns(2)
        with c_b:
            st.markdown(f"#### 安全备注生效前 — 共 {len(all_issues_raw)} 条")
            if all_issues_raw:
                rows = []
                for i in all_issues_raw:
                    rows.append({
                        "风险等级": SEVERITY_ZH.get(i.severity, i.severity),
                        "类别": ISSUE_TYPE_ZH.get(i.issue_type, i.issue_type),
                        "位置": f"第{i.affected_step}步 · {i.affected_material}" if i.affected_step else (i.affected_material or "整批次"),
                        "说明": i.readable_description
                    })
                df = pd.DataFrame(rows)
                def style_row(s):
                    color_map = {"高风险": "background-color:#ffebee", "中风险": "background-color:#fff8e1", "低风险": "background-color:#e3f2fd"}
                    return [color_map.get(s.get("风险等级", ""), "") for _ in s]
                st.dataframe(df.style.apply(style_row, axis=1), use_container_width=True, hide_index=True)
            else:
                st.info("无问题")

        with c_a:
            st.markdown(f"#### 安全备注生效后 — 共 {len(final_issues)} 条（最终）")
            if final_issues:
                rows = []
                for i in final_issues:
                    rows.append({
                        "风险等级": SEVERITY_ZH.get(i.severity, i.severity),
                        "类别": ISSUE_TYPE_ZH.get(i.issue_type, i.issue_type),
                        "位置": f"第{i.affected_step}步 · {i.affected_material}" if i.affected_step else (i.affected_material or "整批次"),
                        "已豁免": "是" if i.safety_related else "否",
                        "说明": i.readable_description,
                        "建议": i.suggestion or ""
                    })
                df = pd.DataFrame(rows)
                st.dataframe(df.style.apply(
                    lambda s: ["background-color:#fff8e1" if s.get("已豁免") == "是" else "" for _ in s],
                    axis=1
                ), use_container_width=True, hide_index=True)
            else:
                st.success("无待处理问题")

        if len(all_issues_raw) != len(final_issues):
            st.markdown("---")
            st.markdown(f"#### 🛡️ 因安全备注撤销的问题（{len(all_issues_raw) - len(final_issues)} 条）")
            removed_ids = {i.issue_id for i in all_issues_raw} - {i.issue_id for i in final_issues}
            removed = [i for i in all_issues_raw if i.issue_id in removed_ids]
            for i in removed:
                note = applied_notes.get(i.issue_id)
                with st.expander(f"[{SEVERITY_ZH.get(i.severity)}] {ISSUE_TYPE_ZH.get(i.issue_type, i.issue_type)} — {i.affected_material}"):
                    st.markdown(f"**原问题说明**：{i.readable_description}")
                    if note:
                        st.markdown(f"**安全备注填写人**：{note.created_by}")
                        st.markdown(f"**备注内容**：{note.content}")
                        st.markdown(f"**判定变更理由**：{note.judgment_change_reason}")
    else:
        if final_issues:
            rows = []
            for i in final_issues:
                rows.append({
                    "风险等级": SEVERITY_ZH.get(i.severity, i.severity),
                    "类别": ISSUE_TYPE_ZH.get(i.issue_type, i.issue_type),
                    "位置": f"第{i.affected_step}步 · {i.affected_material}" if i.affected_step else (i.affected_material or "整批次"),
                    "说明": i.readable_description,
                    "建议": i.suggestion or ""
                })
            st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
        else:
            st.success("本批次未发现任何问题。")


with tab_ph:
    st.markdown("### pH 校验明细")
    rows = []
    for s in sorted(experiment.feeding_steps, key=lambda x: x.step_no):
        r = reagent_map.get(s.reagent_id)
        ph_range = "—"
        if r and r.ph_range_min is not None and r.ph_range_max is not None:
            ph_range = f"{r.ph_range_min} ~ {r.ph_range_max}"
        actual_ph = s.ph_value
        status = "合格"
        color = "green"
        related_issue = None
        for issue in final_issues:
            if issue.affected_step == s.step_no and "ph" in issue.issue_type.lower():
                related_issue = issue
                if issue.safety_related:
                    status = "已豁免"
                    color = "orange"
                else:
                    status = "异常"
                    color = "red"
                break
        if actual_ph is None:
            status = "未记录"
            color = "gray"
        rows.append({
            "步骤": f"第{s.step_no}步",
            "物料": s.reagent_name,
            "pH允许范围": ph_range,
            "实测pH": str(actual_ph) if actual_ph is not None else "—",
            "判定": status,
            "_color": color,
            "备注": (related_issue.readable_description if related_issue else "") or (s.remark or "")
        })
    df = pd.DataFrame(rows)
    def color_status(s):
        m = {"green": "color:green", "red": "color:red", "orange": "color:orange", "gray": "color:gray"}
        return [m.get(s.get("_color", ""), "") for _ in s]
    df_show = df.drop(columns=["_color"])
    st.dataframe(df_show.style.apply(color_status, axis=1), use_container_width=True, hide_index=True)

    st.markdown("---")
    st.markdown("#### pH 数据与试剂台账联动")
    sel_idx = st.selectbox("选择投料步骤查看详情", range(len(steps_sorted)),
                           format_func=lambda i: f"第{steps_sorted[i].step_no}步 — {steps_sorted[i].reagent_name}")
    sel_step = steps_sorted[sel_idx]
    sel_reagent = reagent_map.get(sel_step.reagent_id)
    col_a, col_b = st.columns(2)
    with col_a:
        st.markdown(f"**投料步骤**")
        st.markdown(f"- 步骤号：第{sel_step.step_no}步")
        st.markdown(f"- 物料名称：{sel_step.reagent_name}")
        st.markdown(f"- 计划时间：{sel_step.planned_time or '—'}")
        st.markdown(f"- 实际时间：{sel_step.actual_time or '—'}")
        st.markdown(f"- 投料人：{sel_step.operator or '—'}")
        st.markdown(f"- 实测 pH：{sel_step.ph_value}")
    with col_b:
        if sel_reagent:
            st.markdown(f"**试剂台账信息**")
            st.markdown(f"- 物料编号：{sel_reagent.reagent_id}")
            st.markdown(f"- 批号：{sel_reagent.batch_no or '—'}")
            st.markdown(f"- 纯度：{sel_reagent.purity} {sel_reagent.purity_unit or ''}" if sel_reagent.purity else "- 纯度：未记录")
            ph_min = sel_reagent.ph_range_min
            ph_max = sel_reagent.ph_range_max
            if ph_min is not None and ph_max is not None:
                st.markdown(f"- pH范围：{ph_min} ~ {ph_max}")
            else:
                st.markdown("- pH范围：台账未规定")
            st.markdown(f"- 供应商：{sel_reagent.supplier or '—'}")
            if sel_reagent.remark:
                st.markdown(f"- 台账备注：{sel_reagent.remark}")


with tab_steps:
    st.markdown("### 投料步骤记录")
    rows = []
    for s in sorted(experiment.feeding_steps, key=lambda x: x.step_no):
        rows.append({
            "步骤": f"第{s.step_no}步",
            "物料": s.reagent_name,
            "计划投料时间": s.planned_time or "—",
            "实际投料时间": s.actual_time or "⚠️ 未记录",
            "投料人": s.operator or "—",
            "温度(°C)": str(s.temperature) if s.temperature is not None else "—",
            "pH": str(s.ph_value) if s.ph_value is not None else "—",
            "空白对照": "是" if s.is_blank_control else "否",
            "备注": s.remark or ""
        })
    st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)

    st.markdown("---")
    st.markdown("### 投料时间顺序校验")
    times_rows = []
    sorted_s = sorted(experiment.feeding_steps, key=lambda x: x.step_no)
    for i, s in enumerate(sorted_s):
        prev_t = sorted_s[i - 1].actual_time if i > 0 else "—"
        ok = True
        detail = ""
        if i > 0 and sorted_s[i - 1].actual_time and s.actual_time:
            from datetime import datetime
            try:
                t1 = datetime.strptime(sorted_s[i - 1].actual_time, "%Y-%m-%d %H:%M")
                t2 = datetime.strptime(s.actual_time, "%Y-%m-%d %H:%M")
                ok = t2 >= t1
                detail = "✅ 顺序正常" if ok else "❌ 顺序颠倒"
            except Exception:
                detail = "时间格式异常"
        times_rows.append({
            "步骤": f"第{s.step_no}步",
            "物料": s.reagent_name,
            "上一步投料时间": prev_t,
            "本步投料时间": s.actual_time or "未记录",
            "顺序校验": detail
        })
    st.dataframe(pd.DataFrame(times_rows), use_container_width=True, hide_index=True)

    st.markdown("---")
    st.markdown("### 实验记录基本信息")
    c1, c2, c3 = st.columns(3)
    c1.markdown(f"**实验编号**：{experiment.experiment_id}")
    c1.markdown(f"**批次编号**：{experiment.batch_id}")
    c1.markdown(f"**反应名称**：{experiment.reaction_name}")
    c2.markdown(f"**反应釜**：{experiment.reactor_id or '—'}")
    c2.markdown(f"**实验日期**：{experiment.experiment_date or '—'}")
    c2.markdown(f"**操作人员**：{experiment.operator or '—'}")
    c3.markdown(f"**计划开始**：{experiment.planned_start_time or '—'}")
    c3.markdown(f"**实际开始**：{experiment.actual_start_time or '—'}")
    c3.markdown(f"**复核人员**：{experiment.reviewer or '—'}")
    if experiment.old_remark:
        st.info(f"📝 历史旧备注（旧系统带入）：{experiment.old_remark}")
    if experiment.current_remark:
        st.warning(f"✏️ 本次补录备注：{experiment.current_remark}")


with tab_weighing:
    st.markdown("### 称量记录")
    rows = []
    for wr in weighing_records:
        theory = f"{wr.theoretical_amount} {wr.theoretical_unit or ''}".strip() if wr.theoretical_amount else "⚠️ 未记录"
        if wr.theoretical_amount and not wr.theoretical_unit:
            theory += " ⚠️缺单位"
        actual = f"{wr.weighed_amount} {wr.amount_unit or ''}".strip() if wr.weighed_amount else "⚠️ 未记录"
        if wr.weighed_amount and not wr.amount_unit:
            actual += " ⚠️缺单位"
        rows.append({
            "物料名称": wr.reagent_name,
            "理论用量": theory,
            "实际称量量": actual,
            "称量时间": wr.weigh_time or "—",
            "操作人": wr.operator or "—",
            "天平编号": wr.balance_id or "—",
            "备注": wr.remark or ""
        })
    st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)


with tab_safety:
    st.markdown("### 安全备注记录")
    for i, note in enumerate(safety_notes, 1):
        r = reagent_map.get(note.reagent_id or "")
        material = r.name if r else (note.reagent_id or "整批次")
        type_zh = {
            "reagent_warning": "🟡 物料警示",
            "operation_reminder": "🔵 操作提醒",
            "judgment_change": "🟠 判定变更",
            "general": "⚪ 通用备注"
        }.get(note.note_type, note.note_type)
        with st.expander(f"{type_zh} — {material}", expanded=note.affects_judgment):
            st.markdown(f"**备注内容**：{note.content}")
            st.markdown(f"**填写人**：{note.created_by or '未记录'}  |  **填写时间**：{note.created_at or '未记录'}")
            st.markdown(f"**是否影响判定**：{'是' if note.affects_judgment else '否'}")
            if note.judgment_change_reason:
                st.markdown(f"**判定变更理由**：{note.judgment_change_reason}")


with tab_chromatogram:
    st.markdown("### 谱图判读对比")
    c_sel1, c_sel2 = st.columns(2)
    show_before = c_sel1.toggle("显示处理前谱图", value=True)
    show_after = c_sel2.toggle("显示处理后谱图", value=True)

    fig = go.Figure()
    if show_before and experiment.chromatogram_before:
        peaks = experiment.chromatogram_before["peaks"]
        x = [p["retention_time"] for p in peaks]
        y = [p["area"] for p in peaks]
        fig.add_trace(go.Bar(
            x=x, y=y, name=f"处理前 (主成分纯度 {experiment.chromatogram_before['main_purity']}%)",
            marker_color="#90caf9", opacity=0.8,
            text=[p["label"] for p in peaks], textposition="outside"
        ))
    if show_after and experiment.chromatogram_after:
        peaks = experiment.chromatogram_after["peaks"]
        x = [p["retention_time"] for p in peaks]
        y = [p["area"] for p in peaks]
        fig.add_trace(go.Bar(
            x=x, y=y, name=f"处理后 (主成分纯度 {experiment.chromatogram_after['main_purity']}%)",
            marker_color="#66bb6a", opacity=0.8,
            text=[p["label"] for p in peaks], textposition="outside"
        ))
    fig.update_layout(barmode="group", height=400, xaxis_title="保留时间 (分钟)", yaxis_title="峰面积")
    st.plotly_chart(fig, use_container_width=True)

    st.markdown("---")
    c1, c2 = st.columns(2)
    if experiment.chromatogram_before:
        with c1:
            st.markdown("#### 处理前峰表")
            rows = []
            for idx, p in enumerate(experiment.chromatogram_before["peaks"], 1):
                rows.append({"峰号": idx, "保留时间": p["retention_time"], "峰面积": p["area"], "归属": p["label"]})
            st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
            st.metric("主成分纯度 (%)", experiment.chromatogram_before["main_purity"])
    if experiment.chromatogram_after:
        with c2:
            st.markdown("#### 处理后峰表")
            rows = []
            for idx, p in enumerate(experiment.chromatogram_after["peaks"], 1):
                rows.append({"峰号": idx, "保留时间": p["retention_time"], "峰面积": p["area"], "归属": p["label"]})
            st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
            st.metric("主成分纯度 (%)", experiment.chromatogram_after["main_purity"])

    if show_before_after and experiment.chromatogram_before and experiment.chromatogram_after:
        st.markdown("---")
        delta = experiment.chromatogram_after["main_purity"] - experiment.chromatogram_before["main_purity"]
        st.markdown(f"#### 📊 谱图处理前后差异：主成分纯度 {'上升' if delta >= 0 else '下降'} {abs(delta):.1f}%")


with tab_reagents:
    st.markdown("### 试剂台账")
    rows = []
    for r in reagents:
        purity = f"{r.purity} {r.purity_unit or ''}".strip() if r.purity else "⚠️ 未记录"
        ph_range = "—"
        if r.ph_range_min is not None and r.ph_range_max is not None:
            ph_range = f"{r.ph_range_min} ~ {r.ph_range_max}"
        else:
            ph_range = "⚠️ 未规定"
        rows.append({
            "物料编号": r.reagent_id,
            "物料名称": r.name,
            "分子式": r.formula or "—",
            "纯度": purity,
            "pH允许范围": ph_range,
            "供应商": r.supplier or "—",
            "批号": r.batch_no or "—",
            "收到日期": r.received_date or "—",
            "有效期至": r.expiry_date or "—",
            "储存条件": r.storage_condition or "—",
            "备注": r.remark or ""
        })
    st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
