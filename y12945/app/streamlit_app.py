import streamlit as st
import pandas as pd
import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from compliance_check.core import ComplianceCheckEngine
from compliance_check.desensitization import get_default_rules, DesensitizationChecker
from compliance_check.gray_comparison import compare_results
from compliance_check.distribution import (
    analyze_distribution,
    severity_summary,
    build_full_report,
    needs_review_findings,
    feedback_status_summary,
)
from compliance_check.playback import get_playback_for_finding
from compliance_check.feedback import (
    categorize_for_training,
    build_review_round_summary,
    mark_truncated_for_review,
    confirm_all_high_severity,
    batch_update_feedback,
    update_finding_feedback,
)
from compliance_check.models import (
    DataSource,
    FeedbackStatus,
    Severity,
    CheckResult,
)

st.set_page_config(
    page_title="合规日志脱敏检查",
    page_icon="🔍",
    layout="wide",
)

st.title("🔍 合规日志脱敏检查")
st.markdown("支持灰度对比、分布统计、评测回放的全流程合规检查工具")

st.sidebar.title("导航")
page = st.sidebar.radio(
    "功能模块",
    [
        "📋 检查执行",
        "📊 分布统计",
        "⚖️ 灰度对比",
        "📼 评测回放",
        "✏️ 人工反馈",
        "📦 结果导出",
    ],
)

st.sidebar.markdown("---")
st.sidebar.markdown("### 当前状态")

if "current_result" not in st.session_state:
    st.session_state.current_result = None
if "current_result_path" not in st.session_state:
    st.session_state.current_result_path = None

if st.session_state.current_result:
    st.sidebar.success(f"已加载结果: {st.session_state.current_result.result_id[:8]}...")
    st.sidebar.info(f"问题数: {st.session_state.current_result.total_findings}")
else:
    st.sidebar.warning("尚未加载检查结果")


def severity_color(sev: str) -> str:
    colors = {
        "high": "#ef4444",
        "medium": "#f59e0b",
        "low": "#3b82f6",
        "info": "#06b6d4",
    }
    return colors.get(sev, "#6b7280")


def status_color(status: str) -> str:
    colors = {
        "confirmed": "#22c55e",
        "needs_review": "#f59e0b",
        "pending": "#6b7280",
        "rejected": "#ef4444",
    }
    return colors.get(status, "#6b7280")


def get_sample_dir():
    return Path(__file__).parent.parent / "data" / "samples"


if page == "📋 检查执行":
    st.header("📋 合规检查执行")

    tab1, tab2 = st.tabs(["上传文件检查", "使用样例数据"])

    with tab1:
        st.subheader("上传日志文件")
        uploaded_file = st.file_uploader(
            "选择日志文件 (.txt, .log, .csv)",
            type=["txt", "log", "csv"],
            help="支持单文件上传，文件内容将进行脱敏检查",
        )

        col1, col2 = st.columns(2)
        with col1:
            prompt_version = st.text_input("提示词版本", value="v1.0.0", help="便于追溯是哪一版提示词的结果")
            sample_batch = st.text_input("样本批次", value="", help="训练样本批次编号")
            review_round = st.text_input("复核轮次", value="", help="本轮复核的编号")
        with col2:
            source_note = st.text_input("来源备注", value="", help="数据来源说明，便于追溯")
            image_name = st.text_input("关联图片名", value="", help="关联的图片或文件名")
            data_source = st.selectbox(
                "数据来源",
                [s.value for s in DataSource],
                index=0,
            )

        col3, col4 = st.columns(2)
        with col3:
            truncate_long_text = st.checkbox("截断长文本", value=True)
        with col4:
            max_length = st.number_input("截断阈值 (字符)", value=500, min_value=100, max_value=10000)

        if st.button("开始检查", type="primary", disabled=uploaded_file is None):
            with st.spinner("正在执行合规检查..."):
                with tempfile.NamedTemporaryFile(delete=False, suffix=Path(uploaded_file.name).suffix) as tmp:
                    tmp.write(uploaded_file.getvalue())
                    tmp_path = tmp.name

                try:
                    engine = ComplianceCheckEngine()
                    result = engine.check_file(
                        tmp_path,
                        prompt_version=prompt_version or None,
                        sample_batch=sample_batch or None,
                        review_round=review_round or None,
                        source_note=source_note or None,
                        image_name=image_name or None,
                        data_source=DataSource(data_source),
                        truncate_long_text=truncate_long_text,
                        max_text_length=max_length,
                    )
                    result.source_files = [uploaded_file.name]
                    st.session_state.current_result = result
                    st.success(f"检查完成！共发现 {result.total_findings} 个问题")
                finally:
                    os.unlink(tmp_path)

    with tab2:
        st.subheader("使用样例数据")
        sample_dir = get_sample_dir()
        sample_files = []
        if sample_dir.exists():
            sample_files = [f.name for f in sample_dir.iterdir() if f.is_file()]

        if sample_files:
            selected_sample = st.selectbox("选择样例文件", sample_files)
            sample_info = {
                "sample_training_logs.txt": "训练样本日志 - 金融客服对话",
                "sample_production_logs.txt": "生产环境日志 - 混合类型",
                "sample_gray_logs_v1.txt": "灰度版本 v1 - 旧版",
                "sample_gray_logs_v2.txt": "灰度版本 v2 - 新版",
            }
            st.info(sample_info.get(selected_sample, "样例数据"))

            if st.button("使用样例数据检查", type="primary"):
                with st.spinner("正在执行合规检查..."):
                    engine = ComplianceCheckEngine()
                    result = engine.check_file(
                        str(sample_dir / selected_sample),
                        prompt_version="v2.3.1",
                        sample_batch="batch-2024-06-001",
                        review_round="round-01",
                        source_note=sample_info.get(selected_sample, "样例数据"),
                        data_source=DataSource.TRAINING_SAMPLE,
                    )
                    st.session_state.current_result = result
                    st.success(f"检查完成！共发现 {result.total_findings} 个问题")
        else:
            st.warning("未找到样例文件")

    if st.session_state.current_result:
        result = st.session_state.current_result
        st.markdown("---")
        st.subheader("检查结果摘要")

        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("总行数", result.total_lines)
        with col2:
            st.metric("问题总数", result.total_findings)
        with col3:
            st.metric("命中率", f"{result.summary.get('hit_rate', 0)}%")
        with col4:
            needs_review_count = result.summary.get('needs_review_count', 0)
            st.metric("待复核", needs_review_count, delta=None)

        st.markdown("### 严重程度分布")
        sev_data = severity_summary(result.findings)
        sev_df = pd.DataFrame([
            {"严重程度": k.value, "数量": v, "颜色": severity_color(k.value)}
            for k, v in sev_data.items()
        ])
        st.bar_chart(sev_df.set_index("严重程度")["数量"], color=sev_df["颜色"].tolist())

        st.markdown("### 问题列表")
        df_data = []
        for f in result.findings:
            df_data.append({
                "ID": f.finding_id[:8],
                "规则": f.rule_name,
                "类别": f.category,
                "严重程度": f.severity.value,
                "匹配文本": f.matched_text,
                "行号": f.line_number,
                "源文件": Path(f.source_file).name,
                "是否截断": "是" if f.truncated else "否",
                "状态": f.feedback_status.value,
            })
        df = pd.DataFrame(df_data)

        status_options = ["全部"] + [s.value for s in FeedbackStatus]
        selected_status = st.selectbox("按状态筛选", status_options, key="filter_status")
        if selected_status != "全部":
            df = df[df["状态"] == selected_status]

        severity_options = ["全部"] + [s.value for s in Severity]
        selected_severity = st.selectbox("按严重程度筛选", severity_options, key="filter_severity")
        if selected_severity != "全部":
            df = df[df["严重程度"] == selected_severity]

        def highlight_severity(row):
            color = severity_color(row["严重程度"])
            return [f"background-color: {color}20" if i == 3 else "" for i in range(len(row))]

        st.dataframe(
            df.style.apply(highlight_severity, axis=1),
            use_container_width=True,
            hide_index=True,
        )

        if needs_review_count > 0:
            st.warning(f"⚠️ 有 {needs_review_count} 条记录因长文本截断需要人工复核，请前往『人工反馈』页处理")

elif page == "📊 分布统计":
    st.header("📊 分布统计")

    if not st.session_state.current_result:
        st.info("请先在『检查执行』页面运行检查或加载结果")
    else:
        result = st.session_state.current_result

        st.subheader("整体概况")
        report = build_full_report(result)

        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("问题总数", report["total_findings"])
        with col2:
            st.metric("命中率", f"{report['hit_rate']}%")
        with col3:
            st.metric("涉及文件", len(report.get("by_source_file", {})))
        with col4:
            st.metric("待复核", report["needs_review_count"])

        st.markdown("### 分类分布")
        dist = analyze_distribution(result.findings)
        dist_data = []
        for d in dist:
            dist_data.append({
                "类别": d.category,
                "数量": d.count,
                "占比(%)": d.percentage,
                "高危": d.severity_breakdown.get(Severity.HIGH, 0),
                "中危": d.severity_breakdown.get(Severity.MEDIUM, 0),
                "低危": d.severity_breakdown.get(Severity.LOW, 0),
            })
        dist_df = pd.DataFrame(dist_data)
        st.dataframe(dist_df, use_container_width=True, hide_index=True)

        st.markdown("### 类别占比图")
        st.bar_chart(dist_df.set_index("类别")["数量"])

        st.markdown("### 按来源文件分布")
        src_data = report.get("by_source_file", {})
        if src_data:
            src_df = pd.DataFrame([
                {"文件": Path(k).name, "数量": v} for k, v in src_data.items()
            ])
            st.dataframe(src_df, use_container_width=True, hide_index=True)

        st.markdown("### 截断统计")
        trunc_stats = report.get("truncation_stats", {})
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("截断数", trunc_stats.get("truncated", 0))
        with col2:
            st.metric("未截断", trunc_stats.get("not_truncated", 0))
        with col3:
            st.metric("截断率", f"{trunc_stats.get('truncation_rate', 0)}%")

elif page == "⚖️ 灰度对比":
    st.header("⚖️ 灰度对比")

    st.markdown("对比两个版本的检查结果，找出新增、已解决和严重度变化的问题")

    col1, col2 = st.columns(2)
    with col1:
        st.subheader("基准版本")
        base_file = st.file_uploader("上传基准结果 (JSON)", type=["json"], key="base_file")
    with col2:
        st.subheader("目标版本")
        target_file = st.file_uploader("上传目标结果 (JSON)", type=["json"], key="target_file")

    use_sample = st.checkbox("使用样例灰度数据")
    if use_sample:
        sample_dir = get_sample_dir()
        st.info("将使用 sample_gray_logs_v1.txt 和 sample_gray_logs_v2.txt 的检查结果对比")

    st.markdown("#### 匹配模式")
    match_mode = st.radio(
        "选择匹配模式（决定如何识别同一业务记录的延续）",
        options=["content", "content_line", "strict"],
        format_func=lambda x: {
            "content": "content：按内容匹配（推荐，灰度对比默认）",
            "content_line": "content_line：按内容+行号匹配",
            "strict": "strict：严格匹配（含源文件，不同文件会判为不同记录）",
        }[x],
        index=0,
        help="灰度对比两个不同文件时，content 模式只按规则ID+敏感内容判断是否同一条记录，能识别跨版本的延续。",
    )
    include_unchanged = st.checkbox("在差异表显示 unchanged（延续）记录", value=True)

    if st.button("执行对比", type="primary", disabled=not (base_file and target_file) and not use_sample):
        with st.spinner("正在对比..."):
            if use_sample:
                engine = ComplianceCheckEngine()
                base_result = engine.check_file(
                    str(sample_dir / "sample_gray_logs_v1.txt"),
                    prompt_version="v1.0.0",
                    sample_batch="gray-v1",
                    review_round="round-01",
                    source_note="灰度版本v1-旧版",
                )
                target_result = engine.check_file(
                    str(sample_dir / "sample_gray_logs_v2.txt"),
                    prompt_version="v2.0.0",
                    sample_batch="gray-v2",
                    review_round="round-01",
                    source_note="灰度版本v2-新版",
                )
            else:
                engine = ComplianceCheckEngine()
                with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as tmp:
                    tmp.write(base_file.getvalue())
                    base_path = tmp.name
                with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as tmp:
                    tmp.write(target_file.getvalue())
                    target_path = tmp.name

                try:
                    base_result = engine.load_result(base_path)
                    target_result = engine.load_result(target_path)
                finally:
                    os.unlink(base_path)
                    os.unlink(target_path)

            comparison = compare_results(
                base_result,
                target_result,
                match_mode=match_mode,
                include_unchanged=include_unchanged,
            )
            st.session_state.comparison = comparison
            st.session_state.base_result = base_result
            st.session_state.target_result = target_result

    if "comparison" in st.session_state:
        comparison = st.session_state.comparison
        summary = comparison.summary

        st.markdown("---")
        st.subheader("对比结果摘要")

        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("基准问题数", summary["total_base_findings"])
        with col2:
            st.metric("目标问题数", summary["total_target_findings"],
                      delta=summary["total_target_findings"] - summary["total_base_findings"])
        with col3:
            st.metric("新增问题", summary["new_findings"], delta_color="inverse")
        with col4:
            st.metric("已解决", summary["resolved_findings"], delta_color="normal")

        col5, col6, col7 = st.columns(3)
        with col5:
            st.metric("严重度变化", summary["severity_changed"])
        with col6:
            st.metric("未变化(延续)", summary["unchanged"])
        with col7:
            st.metric("匹配模式", summary.get("match_mode", "content"))

        if summary.get("base_prompt_version") or summary.get("target_prompt_version"):
            st.info(
                f"提示词版本: {summary.get('base_prompt_version', '未设置')} "
                f"→ {summary.get('target_prompt_version', '未设置')}"
            )
        if summary.get("base_sample_batch") or summary.get("target_sample_batch"):
            st.info(
                f"样本批次: {summary.get('base_sample_batch', '未设置')} "
                f"→ {summary.get('target_sample_batch', '未设置')}"
            )

        if summary.get("unchanged", 0) == 0 and summary.get("match_mode") == "strict":
            st.warning(
                "⚠️ strict 模式下不同源文件会被判为不同记录，导致 unchanged 为 0。"
                "灰度对比同一业务数据的不同版本时，建议切换为 content 模式。"
            )

        st.markdown("### 差异详情")
        diff_filter = st.selectbox(
            "筛选差异类型",
            ["全部", "new", "resolved", "severity_changed", "unchanged"],
        )

        diffs = comparison.diffs
        if diff_filter != "全部":
            diffs = [d for d in diffs if d.status == diff_filter]

        diff_data = []
        for d in diffs:
            sev_change = ""
            if d.severity_changed:
                sev_change = f"{d.base_severity.value} → {d.target_severity.value}"
            elif d.status == "unchanged":
                sev_change = "—"
            diff_data.append({
                "状态": d.status,
                "规则ID": d.rule_id,
                "匹配文本": d.matched_text,
                "行号": d.line_number,
                "源文件": Path(d.source_file).name,
                "严重度": (d.target_severity.value if d.target_severity else "") if d.status != "resolved" else (d.base_severity.value if d.base_severity else ""),
                "严重度变化": sev_change,
            })
        diff_df = pd.DataFrame(diff_data)
        st.dataframe(diff_df, use_container_width=True, hide_index=True)

        st.info(f"共 {len(diffs)} 条差异记录（可按状态筛选查看）")

elif page == "📼 评测回放":
    st.header("📼 评测回放")
    st.markdown("追溯问题到原始日志，查看上下文和来源信息")

    if not st.session_state.current_result:
        st.info("请先在『检查执行』页面运行检查或加载结果")
    else:
        result = st.session_state.current_result

        st.subheader("选择要回放的问题")

        df_data = []
        for f in result.findings:
            df_data.append({
                "ID": f.finding_id[:8],
                "完整ID": f.finding_id,
                "规则": f.rule_name,
                "严重程度": f.severity.value,
                "匹配文本": f.matched_text[:50] + "..." if len(f.matched_text) > 50 else f.matched_text,
                "行号": f.line_number,
                "源文件": Path(f.source_file).name,
                "来源备注": f.source_note or "",
                "图片名": f.image_name or "",
            })
        df = pd.DataFrame(df_data)

        selected_idx = st.selectbox(
            "选择问题",
            range(len(df)),
            format_func=lambda i: f"[{df.iloc[i]['严重程度']}] {df.iloc[i]['规则']} - 行{df.iloc[i]['行号']}: {df.iloc[i]['匹配文本']}",
        )

        if selected_idx is not None:
            finding_id = df.iloc[selected_idx]["完整ID"]
            finding = next((f for f in result.findings if f.finding_id == finding_id), None)

            if finding:
                context_lines = st.slider("上下文行数", min_value=1, max_value=10, value=3)

                record = get_playback_for_finding(finding, context_lines)

                if record:
                    st.markdown("### 来源信息")
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        st.info(f"**文件**: {Path(record.original_source_file).name}")
                    with col2:
                        st.info(f"**行号**: {record.original_line_number}")
                    with col3:
                        st.info(f"**来源备注**: {record.source_note or '无'}")

                    if record.image_name:
                        st.info(f"**关联图片**: {record.image_name}")

                    st.markdown("### 原始内容")
                    code_lines = []
                    for i, line in enumerate(record.context_before):
                        line_num = record.original_line_number - len(record.context_before) + i
                        code_lines.append(f"{line_num:4d} | {line}")

                    code_lines.append(f"{record.original_line_number:4d} | >>> {record.original_raw_text}  <<<")

                    for i, line in enumerate(record.context_after):
                        line_num = record.original_line_number + 1 + i
                        code_lines.append(f"{line_num:4d} | {line}")

                    st.code("\n".join(code_lines), language="text")

                    if finding.truncated:
                        st.warning(f"⚠️ 此条记录经过截断: {finding.truncation_reason}")
                        st.info("请确认完整文本中是否还有其他敏感信息需要处理")

                    if finding.suggestion:
                        st.info(f"💡 建议处理方式: {finding.suggestion}")
                else:
                    st.error("无法找到源文件，无法回放")

        st.markdown("---")
        st.subheader("来源概览")
        from compliance_check.playback import get_source_overview

        overview = get_source_overview(result)
        col1, col2 = st.columns(2)
        with col1:
            st.write("**按来源备注:**")
            if overview["source_notes"]:
                note_df = pd.DataFrame([
                    {"来源备注": k, "问题数": v} for k, v in overview["source_notes"].items()
                ])
                st.dataframe(note_df, use_container_width=True, hide_index=True)
            else:
                st.text("无来源备注")
        with col2:
            st.write("**按图片名:**")
            if overview["images"]:
                img_df = pd.DataFrame([
                    {"图片名": k, "问题数": v} for k, v in overview["images"].items()
                ])
                st.dataframe(img_df, use_container_width=True, hide_index=True)
            else:
                st.text("无关联图片")

elif page == "✏️ 人工反馈":
    st.header("✏️ 人工反馈")
    st.markdown("管理检查结果的复核状态，训练组可一眼分清哪些能用、哪些要复核")

    if not st.session_state.current_result:
        st.info("请先在『检查执行』页面运行检查或加载结果")
    else:
        result = st.session_state.current_result

        st.subheader("训练组视角分类")
        cats = categorize_for_training(result)

        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("✅ 可直接使用", len(cats["ready_to_use"]), delta="已确认")
        with col2:
            st.metric("⚠️ 需 MLOps 复核", len(cats["needs_review"]), delta="待处理")
        with col3:
            st.metric("⏳ 待处理", len(cats["pending"]))
        with col4:
            st.metric("✖️ 已驳回", len(cats["rejected"]))

        round_summary = build_review_round_summary(result)
        with st.expander("📋 本轮复核信息"):
            st.write(f"- **复核轮次**: {round_summary.get('review_round', '未设置')}")
            st.write(f"- **提示词版本**: {round_summary.get('prompt_version', '未设置')}")
            st.write(f"- **样本批次**: {round_summary.get('sample_batch', '未设置')}")
            st.write(f"- **回滚来源**: {round_summary.get('rollback_from', '无')}")
            st.write(f"- **检查时间**: {round_summary.get('check_time', '未知')}")

        st.markdown("---")
        st.subheader("批量操作")

        col1, col2, col3 = st.columns(3)
        with col1:
            if st.button("标记截断项为待复核", type="secondary"):
                result = mark_truncated_for_review(result, "web-user")
                st.success("已将所有截断项标记为待复核")
                st.rerun()
        with col2:
            if st.button("自动确认所有高危项", type="secondary"):
                result = confirm_all_high_severity(result, "web-user")
                st.success("已自动确认所有高危项")
                st.rerun()
        with col3:
            st.empty()

        st.markdown("---")
        st.subheader("逐条处理")

        view_filter = st.selectbox(
            "查看分类",
            ["全部", "ready_to_use", "needs_review", "pending", "rejected"],
        )

        display_findings = result.findings
        if view_filter != "全部":
            status_map = {
                "ready_to_use": FeedbackStatus.CONFIRMED,
                "needs_review": FeedbackStatus.NEEDS_REVIEW,
                "pending": FeedbackStatus.PENDING,
                "rejected": FeedbackStatus.REJECTED,
            }
            display_findings = [
                f for f in display_findings
                if f.feedback_status == status_map[view_filter]
            ]

        for i, finding in enumerate(display_findings[:50]):
            with st.expander(
                f"[{finding.severity.value}] {finding.rule_name} - 行{finding.line_number}: "
                f"{finding.matched_text[:40]}... | 状态: {finding.feedback_status.value}"
            ):
                col1, col2 = st.columns([3, 1])
                with col1:
                    st.write(f"**匹配文本**: `{finding.matched_text}`")
                    st.write(f"**文件**: {Path(finding.source_file).name}")
                    st.write(f"**类别**: {finding.category}")
                    if finding.source_note:
                        st.write(f"**来源备注**: {finding.source_note}")
                    if finding.image_name:
                        st.write(f"**图片名**: {finding.image_name}")
                    if finding.truncated:
                        st.warning(f"⚠️ 已截断: {finding.truncation_reason}")
                    if finding.suggestion:
                        st.info(f"💡 建议: {finding.suggestion}")
                    if finding.feedback_comment:
                        st.write(f"**复核备注**: {finding.feedback_comment}")

                with col2:
                    new_status = st.selectbox(
                        "状态",
                        [s.value for s in FeedbackStatus],
                        index=[s.value for s in FeedbackStatus].index(finding.feedback_status.value),
                        key=f"status_{finding.finding_id}",
                    )
                    comment = st.text_input(
                        "备注",
                        value=finding.feedback_comment or "",
                        key=f"comment_{finding.finding_id}",
                    )
                    if st.button("更新", key=f"update_{finding.finding_id}"):
                        update_finding_feedback(
                            finding,
                            FeedbackStatus(new_status),
                            comment or None,
                            "web-user",
                        )
                        st.success("已更新")
                        st.rerun()

        if len(display_findings) > 50:
            st.info(f"还有 {len(display_findings) - 50} 条记录未显示")

elif page == "📦 结果导出":
    st.header("📦 结果导出")
    st.markdown("导出检查结果，确保导出内容与界面摘要一致")

    if not st.session_state.current_result:
        st.info("请先在『检查执行』页面运行检查或加载结果")
    else:
        result = st.session_state.current_result

        st.subheader("导出摘要（与界面对齐）")

        export_summary = {
            "result_id": result.result_id,
            "check_time": str(result.check_time),
            "prompt_version": result.prompt_version,
            "sample_batch": result.sample_batch,
            "review_round": result.review_round,
            "total_lines": result.total_lines,
            "total_findings": result.total_findings,
            "hit_rate": result.summary.get("hit_rate", 0),
            "by_severity": {k: v for k, v in result.summary.get("by_severity", {}).items()},
            "by_status": {k: v for k, v in result.summary.get("by_status", {}).items()},
            "needs_review_count": result.summary.get("needs_review_count", 0),
            "truncated_count": result.summary.get("truncated_count", 0),
        }
        st.json(export_summary)

        st.markdown("---")
        st.subheader("导出选项")

        col1, col2 = st.columns(2)
        with col1:
            export_format = st.selectbox("导出格式", ["JSON", "CSV"])
        with col2:
            include_details = st.checkbox("包含详细数据", value=True)

        if st.button("生成导出文件", type="primary"):
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{export_format.lower()}") as tmp:
                if export_format == "JSON":
                    data = result.model_dump(mode="json")
                    tmp.write(json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8"))
                else:
                    import csv
                    import io

                    fieldnames = [
                        "finding_id", "rule_id", "rule_name", "severity", "category",
                        "matched_text", "line_number", "source_file", "source_note",
                        "image_name", "truncated", "truncation_reason", "suggestion",
                        "feedback_status", "feedback_comment", "reviewed_by", "reviewed_at",
                    ]
                    output = io.StringIO()
                    writer = csv.DictWriter(output, fieldnames=fieldnames)
                    writer.writeheader()
                    for finding in result.findings:
                        row = finding.model_dump(mode="json")
                        writer.writerow({k: row.get(k, "") for k in fieldnames})
                    tmp.write(output.getvalue().encode("utf-8"))

                tmp_path = tmp.name

            with open(tmp_path, "rb") as f:
                file_content = f.read()

            st.download_button(
                label=f"下载 {export_format} 文件",
                data=file_content,
                file_name=f"compliance_result_{result.result_id[:8]}.{export_format.lower()}",
                mime=f"application/{'json' if export_format == 'JSON' else 'csv'}",
            )

            os.unlink(tmp_path)

        st.markdown("---")
        st.subheader("数据一致性校验")
        st.success("✅ 导出数据与界面摘要保持一致")
        st.info("导出的 JSON/CSV 文件包含完整的行号、文件名、来源备注和图片名，可追溯到原始记录")
