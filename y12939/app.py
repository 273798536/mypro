import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import datetime

from data.store import get_store
from data.models import RecordStatus, AnnotationRecord, FailureCategory
from core.engine import SafetyRuleEngine, RetryEngine
from core.statistics import StatisticsService
from core.exporter import ReportExporter

st.set_page_config(
    page_title="训练失败重试编排 - 安全规则视角",
    page_icon="🛡️",
    layout="wide",
)

store = get_store()
safety_engine = SafetyRuleEngine()
retry_engine = RetryEngine(safety_engine)
stats = StatisticsService()
exporter = ReportExporter()

st.title("🛡️ 训练失败重试编排")
st.caption("围绕安全规则这条线，图、表、文字说明三者对得上；人工备注保留原话，不改写。")

tab_overview, tab_safety, tab_annotate, tab_handoff, tab_export = st.tabs([
    "📊 总览仪表盘",
    "🔍 安全规则详情",
    "✍️ 人工标注补录",
    "📦 月底转交视图",
    "📤 导出报告",
])


def get_current_records():
    return store.get_all_records()


with tab_overview:
    records = get_current_records()
    snapshot = stats.build_snapshot(records)

    st.markdown("### 📈 核心指标")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("记录总数", snapshot.total_records)
    c2.metric(
        "安全规则问题占比",
        f"{snapshot.safety_missing_rate * 100:.1f}%",
        help="含安全规则漏配和安全规则与题库不匹配",
    )
    c3.metric("可重试率", f"{snapshot.retryable_rate * 100:.1f}%")
    blocked = snapshot.by_status.get(RecordStatus.BLOCKED.value, 0)
    c4.metric("被拦截数", blocked)

    col_left, col_right = st.columns([1, 1])

    with col_left:
        st.markdown("#### 按状态分布（图）")
        status_df = pd.DataFrame([
            {"状态": k, "数量": v} for k, v in snapshot.by_status.items()
        ])
        fig_status = px.bar(
            status_df, x="状态", y="数量",
            color="状态",
            color_discrete_map={
                RecordStatus.BLOCKED.value: "#c0392b",
                RecordStatus.RETRYABLE.value: "#27ae60",
                RecordStatus.PENDING.value: "#f39c12",
                RecordStatus.PASSED.value: "#2980b9",
            },
            text="数量",
        )
        fig_status.update_layout(showlegend=False, height=320)
        st.plotly_chart(fig_status, use_container_width=True)

    with col_right:
        st.markdown("#### 按失败类别分布（图）")
        fail_df = pd.DataFrame([
            {"失败类别": k, "数量": v} for k, v in snapshot.by_failure_category.items()
        ])
        fig_fail = px.pie(
            fail_df, names="失败类别", values="数量", hole=0.4,
            color_discrete_sequence=px.colors.qualitative.Set2,
        )
        fig_fail.update_layout(height=320)
        st.plotly_chart(fig_fail, use_container_width=True)

    st.markdown("#### 📋 状态分布表 + 文字说明")
    status_table_df = stats.status_dataframe(records)
    st.dataframe(status_table_df, use_container_width=True, hide_index=True)

    with st.expander("📝 分布文字说明（与上图、上表对得上）"):
        total = snapshot.total_records
        st.markdown(f"""
- 共 **{total}** 条训练失败记录进入重试编排。
- 按状态：
  - 被拦截 **{snapshot.by_status.get(RecordStatus.BLOCKED.value, 0)}** 条，
    可重试 **{snapshot.by_status.get(RecordStatus.RETRYABLE.value, 0)}** 条，
    待判定 **{snapshot.by_status.get(RecordStatus.PENDING.value, 0)}** 条，
    通过 **{snapshot.by_status.get(RecordStatus.PASSED.value, 0)}** 条。
- 按失败类别：
  - 安全规则漏配 **{snapshot.by_failure_category.get(FailureCategory.SAFETY_RULE_MISSING.value, 0)}** 条；
  - 安全规则与题库不匹配 **{snapshot.by_failure_category.get(FailureCategory.SAFETY_RULE_MISMATCH.value, 0)}** 条；
  - 其余为数据质量、资源超时、未知原因。
- 安全规则相关问题合计占比 **{snapshot.safety_missing_rate * 100:.1f}%**，
  是训练失败重试被拦下来的主要原因。
        """)


with tab_safety:
    records = get_current_records()
    st.markdown("### 🔍 安全规则问题详情")
    st.info(
        "围绕安全规则这条线：每条记录都说明「为什么被拦下来 / 安全规则和评测题库是什么关系」。"
        "人工备注保持原话，不做标准化改写。"
    )

    safety_df = stats.safety_issue_dataframe(records)
    if safety_df.empty:
        st.warning("当前没有安全规则相关问题的记录。")
    else:
        st.markdown("#### 安全规则问题总表")
        st.dataframe(safety_df, use_container_width=True, hide_index=True)

        st.markdown("---")
        st.markdown("#### 逐条详情（图 + 文字说明对得上）")

        qtype_counter = pd.DataFrame([
            {"题型": r.question_type, "数量": 1}
            for r in records
            if r.failure_category in (
                FailureCategory.SAFETY_RULE_MISSING,
                FailureCategory.SAFETY_RULE_MISMATCH,
            )
        ])
        if not qtype_counter.empty:
            qtype_agg = qtype_counter.groupby("题型", as_index=False).sum()
            fig_qtype = px.bar(
                qtype_agg, x="题型", y="数量", color="题型",
                title="安全规则问题按题型分布",
                text="数量",
            )
            fig_qtype.update_layout(showlegend=False, height=300)
            st.plotly_chart(fig_qtype, use_container_width=True)

        for r in records:
            if r.failure_category not in (
                FailureCategory.SAFETY_RULE_MISSING,
                FailureCategory.SAFETY_RULE_MISMATCH,
            ):
                continue
            decision = retry_engine.decide(r)
            issues = safety_engine.analyze_safety_issues(r)

            with st.expander(
                f"**{r.record_id}** | {r.question_type} | "
                f"{r.failure_category.value} | "
                f"{'可重试' if decision.can_retry else '不可重试'}",
                expanded=False,
            ):
                c1, c2 = st.columns([2, 1])
                with c1:
                    st.markdown(f"**批次**：{r.batch_id}  ｜  **任务**：{r.task_name}")
                    st.markdown(f"**题目内容**：{r.question_content}")
                    st.markdown(
                        f"**已匹配安全规则**："
                        f"{', '.join(r.safety_rule_ids) if r.safety_rule_ids else '❌ 无（漏配）'}"
                    )
                    st.markdown(
                        f"**评测题库是否匹配**："
                        f"{'✅ 是' if r.matched_question_bank else '❌ 否'}"
                    )
                    st.markdown(f"**重试次数**：{r.retry_count} / 3")
                with c2:
                    mini_df = pd.DataFrame([
                        {"指标": "失败类别", "值": r.failure_category.value},
                        {"指标": "当前状态", "值": r.current_status.value},
                        {"指标": "能否重试", "值": "可" if decision.can_retry else "否"},
                    ])
                    st.table(mini_df)

                st.markdown("**为什么被拦下来（安全规则分析）**：")
                for issue in issues:
                    st.markdown(f"- {issue}")
                if not issues:
                    st.markdown(f"- {r.failure_detail}")

                st.markdown("**系统判定与修复建议**：")
                st.markdown(f"- 判定结论：{decision.reason}")
                if decision.required_fixes:
                    for fix in decision.required_fixes:
                        st.markdown(f"- 修复动作：{fix}")

                if r.raw_manual_note:
                    st.markdown("**人工备注（原话保留，不自动改写）**：")
                    st.info(r.raw_manual_note)

                if r.annotations:
                    st.markdown("**历史标注记录**：")
                    for ann in r.annotations:
                        st.caption(
                            f"[{ann.annotated_at.strftime('%Y-%m-%d %H:%M')}] "
                            f"{ann.annotator} → {ann.final_decision.value}"
                        )
                        if ann.reason:
                            st.markdown(f"> {ann.reason}")


with tab_annotate:
    records = get_current_records()
    st.markdown("### ✍️ 人工标注补录")
    st.warning(
        "注意：人工修正不是一次性判断。新增标注记录后，上方总览和分布统计会实时更新。"
        "人工备注会原样保存，不会被自动改写成更整齐的句子。"
    )

    record_options = [f"{r.record_id} | {r.question_type} | {r.failure_category.value}" for r in records]
    selected_idx = st.selectbox("选择要补录标注的记录", range(len(record_options)), format_func=lambda i: record_options[i])
    target = records[selected_idx]

    st.markdown("---")
    col_a, col_b = st.columns(2)
    with col_a:
        st.markdown(f"**记录ID**：{target.record_id}")
        st.markdown(f"**题型**：{target.question_type}")
        st.markdown(f"**失败类别**：{target.failure_category.value}")
        st.markdown(f"**当前状态**：{target.current_status.value}")
    with col_b:
        st.markdown(f"**已匹配安全规则**：{', '.join(target.safety_rule_ids) if target.safety_rule_ids else '无'}")
        st.markdown(f"**题库匹配**：{'是' if target.matched_question_bank else '否'}")
        st.markdown(f"**重试次数**：{target.retry_count}")

    if target.raw_manual_note:
        st.markdown("**已有备注（原话）**：")
        st.info(target.raw_manual_note)

    st.markdown("#### 新增标注")
    annotator = st.text_input("标注人", value="", placeholder="请输入标注人姓名")
    new_note = st.text_area(
        "人工备注（将原样保留，不自动改写）",
        value="",
        height=100,
        placeholder="直接写你想说的话，系统不会自动修正措辞或句式",
    )
    decision_map = {
        "被拦截（不可重试）": RecordStatus.BLOCKED,
        "可重试": RecordStatus.RETRYABLE,
        "待判定": RecordStatus.PENDING,
        "通过": RecordStatus.PASSED,
    }
    decision_label = st.radio(
        "本次判定结果",
        list(decision_map.keys()),
        index=0,
    )
    reason_text = st.text_input(
        "判定原因（可选）",
        value="",
        placeholder="简述判定理由",
    )

    if st.button("提交标注（补录记录，统计将自动更新）", type="primary"):
        if not annotator.strip():
            st.error("请填写标注人姓名。")
        else:
            final_decision = decision_map[decision_label]
            ann = AnnotationRecord(
                annotator=annotator.strip(),
                manual_note=new_note,
                final_decision=final_decision,
                reason=reason_text,
            )
            ok = store.add_annotation(target.record_id, ann)
            if new_note.strip():
                store.update_manual_note(target.record_id, new_note.strip())
            if ok:
                st.success(
                    f"已为 {target.record_id} 补录标注。总览和分布统计已更新，"
                    "可在「总览仪表盘」和「月底转交视图」查看最新分布。"
                )
                st.rerun()
            else:
                st.error("提交失败。")

    st.markdown("---")
    st.markdown("#### 已补录的标注记录（实时更新）")
    annotated = [r for r in get_current_records() if r.annotations]
    if not annotated:
        st.caption("暂无人为补录的标注记录。")
    else:
        rows = []
        for r in annotated:
            for ann in r.annotations:
                rows.append({
                    "记录ID": r.record_id,
                    "题型": r.question_type,
                    "标注人": ann.annotator,
                    "时间": ann.annotated_at.strftime("%Y-%m-%d %H:%M"),
                    "判定": ann.final_decision.value,
                    "备注(原话)": ann.manual_note,
                    "判定原因": ann.reason,
                })
        st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)


with tab_handoff:
    records = get_current_records()
    st.markdown("### 📦 月底转交视图")
    st.markdown(
        "> 训练组月底转交时更关心 **哪些记录不能用**，而不是系统有多少菜单。"
        "本页只围绕安全规则这条线，聚焦不可用记录。"
    )

    unusable = store.get_unusable_records()
    all_blocked = [r for r in records if r.current_status == RecordStatus.BLOCKED]

    c1, c2, c3 = st.columns(3)
    c1.metric("不可用记录（严格判定）", len(unusable))
    c2.metric("被拦截总数", len(all_blocked))
    c3.metric("涉及安全规则问题", len([
        r for r in unusable
        if r.failure_category in (
            FailureCategory.SAFETY_RULE_MISSING,
            FailureCategory.SAFETY_RULE_MISMATCH,
        )
    ]))

    st.markdown("---")
    st.markdown("#### ❌ 不可用记录明细表（训练组请重点关注）")
    if not unusable:
        st.info("当前没有严格判定为不可用的记录。")
    else:
        handoff_rows = []
        for r in unusable:
            decision = retry_engine.decide(r)
            handoff_rows.append({
                "记录ID": r.record_id,
                "批次": r.batch_id,
                "题型": r.question_type,
                "失败类别": r.failure_category.value,
                "安全规则": ", ".join(r.safety_rule_ids) if r.safety_rule_ids else "漏配",
                "题库匹配": "是" if r.matched_question_bank else "否",
                "重试次数": r.retry_count,
                "能否再试": "否" if not decision.can_retry else "可",
                "拦截原因": r.failure_detail,
                "人工备注(原话)": r.raw_manual_note,
            })
        hd = pd.DataFrame(handoff_rows)
        st.dataframe(hd, use_container_width=True, hide_index=True)

        st.markdown("##### 📝 文字说明（与上表对得上）")
        safety_unusable = [
            r for r in unusable
            if r.failure_category in (
                FailureCategory.SAFETY_RULE_MISSING,
                FailureCategory.SAFETY_RULE_MISMATCH,
            )
        ]
        st.markdown(f"""
- 本批次共有 **{len(unusable)}** 条记录判定为不可用，不建议训练组再次重试。
- 其中 **{len(safety_unusable)}** 条的根本原因是安全规则问题：
  - 安全规则漏配：题型未匹配到任何安全规则，或匹配到的规则覆盖度不足；
  - 安全规则与评测题库不匹配：规则版本与题库版本不一致导致匹配失效。
- 这些记录被拦下来的判断依据：
  1. 已达最大重试次数（≥2次）且仍被拦截；或
  2. 安全规则漏配 / 不匹配 且 未匹配评测题库。
- 训练组如需再次启用这些记录，请先与安全规则组和数据标注组对齐，
  完成安全规则配置补齐或题库同步后再进行重试。
        """)

    st.markdown("---")
    st.markdown("#### 🔁 可重试记录参考")
    retryable = [
        r for r in records
        if retry_engine.decide(r).can_retry
    ]
    if not retryable:
        st.caption("当前无可重试记录。")
    else:
        rows = []
        for r in retryable:
            d = retry_engine.decide(r)
            rows.append({
                "记录ID": r.record_id,
                "题型": r.question_type,
                "失败类别": r.failure_category.value,
                "重试次数": r.retry_count,
                "重试理由": d.reason,
            })
        st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)


with tab_export:
    records = get_current_records()
    st.markdown("### 📤 导出报告")
    st.markdown(
        "> 只看导出报告，训练组也应该能明白安全规则漏配为什么被拦下来。"
        "报告中所有人工备注保留原话，不做标准化改写。"
    )

    st.markdown("#### 报告预览（Markdown）")
    md_text = exporter.export_markdown(records)
    with st.expander("展开查看 Markdown 全文", expanded=True):
        st.markdown(md_text)

    st.markdown("---")
    st.markdown("#### 下载报告")
    col_dl1, col_dl2, col_dl3 = st.columns(3)

    col_dl1.download_button(
        label="⬇️ 下载 Markdown 报告",
        data=md_text,
        file_name=f"训练失败重试编排_安全规则报告_{datetime.now().strftime('%Y%m%d')}.md",
        mime="text/markdown",
        use_container_width=True,
    )

    html_text = exporter.export_html(records)
    col_dl2.download_button(
        label="⬇️ 下载 HTML 报告",
        data=html_text,
        file_name=f"训练失败重试编排_安全规则报告_{datetime.now().strftime('%Y%m%d')}.html",
        mime="text/html",
        use_container_width=True,
    )

    excel_bytes = exporter.export_excel(records)
    col_dl3.download_button(
        label="⬇️ 下载 Excel 报告",
        data=excel_bytes,
        file_name=f"训练失败重试编排_安全规则报告_{datetime.now().strftime('%Y%m%d')}.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        use_container_width=True,
    )

    with st.expander("📋 Excel 报告包含哪些 Sheet？"):
        st.markdown("""
- **统计汇总**：核心指标、状态分布、失败类别分布
- **全部记录**：所有训练失败记录明细
- **安全规则问题**：安全规则漏配 / 不匹配的专项明细（含问题描述、能否重试、人工备注原话）
- **不可用记录**：月底转交时判定为不可重试的记录
- **批次汇总**：按批次维度的统计概览
        """)
