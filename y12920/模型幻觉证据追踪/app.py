import os
import sys
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import streamlit as st
import pandas as pd

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from core import (
    HallucinationRecord,
    RecordStatus,
    HallucinationType,
    PromptVersion,
    HumanCorrection,
    SourceMaterial,
    PromptVersionImporter,
    SampleDeduplicator,
    SafetyGuard,
    ReportExporter,
    MetricsCalculator,
)


def init_session_state():
    if "records" not in st.session_state:
        st.session_state.records = []
    if "current_tab" not in st.session_state:
        st.session_state.current_tab = "overview"
    if "version_importer" not in st.session_state:
        st.session_state.version_importer = PromptVersionImporter()
    if "deduplicator" not in st.session_state:
        st.session_state.deduplicator = SampleDeduplicator()
    if "safety_guard" not in st.session_state:
        st.session_state.safety_guard = SafetyGuard()
    if "report_exporter" not in st.session_state:
        st.session_state.report_exporter = ReportExporter()
    if "metrics_calculator" not in st.session_state:
        st.session_state.metrics_calculator = MetricsCalculator()


def load_example_data():
    example_path = project_root / "samples" / "example_records.json"
    if example_path.exists():
        with open(example_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        records = []
        for item in data:
            source_materials = [
                SourceMaterial(**sm) for sm in item.get("source_materials", [])
            ]
            corrections = [
                HumanCorrection(**c) for c in item.get("corrections", [])
            ]
            safety_checks = []
            for sc in item.get("safety_checks", []):
                safety_checks.append(sc)

            item["source_materials"] = source_materials
            item["corrections"] = corrections
            item["safety_checks"] = safety_checks
            item["hallucination_types"] = [
                HallucinationType(t) for t in item.get("hallucination_types", [])
            ]
            item["status"] = RecordStatus(item["status"])
            if isinstance(item["created_at"], str):
                item["created_at"] = datetime.fromisoformat(item["created_at"])
            if isinstance(item["updated_at"], str):
                item["updated_at"] = datetime.fromisoformat(item["updated_at"])

            for corr in corrections:
                if isinstance(corr.corrected_at, str):
                    corr.corrected_at = datetime.fromisoformat(corr.corrected_at)
                if corr.approved_at and isinstance(corr.approved_at, str):
                    corr.approved_at = datetime.fromisoformat(corr.approved_at)

            record = HallucinationRecord(**item)
            record.safety_checks = safety_checks
            records.append(record)

        st.session_state.records = records

        version_path = project_root / "samples" / "prompt_versions" / "v1_baseline.json"
        if version_path.exists():
            st.session_state.version_importer.import_from_json(str(version_path))

        return True
    return False


def render_sidebar():
    with st.sidebar:
        st.title("🔍 模型幻觉证据追踪")
        st.caption("AI/ML 工作流工具")

        st.divider()

        st.markdown("### 功能导航")
        pages = [
            "📊 总览",
            "📝 记录管理",
            "🔄 样本去重",
            "🛡️ 安全检测",
            "📈 分组指标",
            "📑 版本管理",
            "� 报告导出",
        ]
        for page in pages:
            st.markdown(f"- {page}")

        st.divider()

        if st.button("📂 加载样例数据", type="primary", use_container_width=True):
            if load_example_data():
                st.success("✅ 样例数据加载成功！")
                st.rerun()
            else:
                st.error("❌ 样例数据文件不存在")

        st.divider()
        st.caption(f"当前记录数: {len(st.session_state.records)}")


def render_overview():
    st.header("📊 总览")

    if not st.session_state.records:
        st.info("👋 欢迎使用模型幻觉证据追踪系统！\n\n请点击左侧「加载样例数据」查看演示数据，或手动添加记录。")
        return

    metrics = st.session_state.metrics_calculator.calculate_overall_metrics(st.session_state.records)

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("样本总数", metrics["total_records"])
    col2.metric("✅ 可直接使用", metrics["clean_count"], f"{metrics['clean_rate']}%")
    col3.metric("⏳ 待工程师复核", metrics["pending_count"] + metrics["hallucination_count"] + metrics["blocked_count"])
    col4.metric("❌ 幻觉率", f"{metrics['hallucination_rate']}%")

    st.subheader("业务方快速视图")
    st.info(
        "📌 **使用说明**：\n"
        "- ✅ **绿色** 标记的记录可以直接使用\n"
        "- ⏳ **橙色** 标记的记录需要模型训练工程师复核\n"
        "- ❌ **红色** 标记的记录存在幻觉，请不要直接使用\n"
        "- 🔄 **蓝色** 标记的是重复样本，以第一条为准\n"
        "- 🛡️ **紫色** 标记的被安全拦截，存在数据风险"
    )

    display_data = []
    for record in st.session_state.records:
        status_info = record.get_business_status()
        display_data.append({
            "状态": status_info["label"],
            "可直接使用": "是" if status_info["can_use_directly"] else "否",
            "需工程师复核": "是" if status_info["needs_engineer_review"] else "否",
            "记录ID": record.record_id,
            "输入查询": record.input_query,
            "模型输出": record.model_output[:100] + "..." if len(record.model_output) > 100 else record.model_output,
            "置信度": f"{record.confidence_score}%",
            "来源材料数": len(record.source_materials),
            "更新时间": record.updated_at.strftime("%Y-%m-%d %H:%M"),
        })

    df = pd.DataFrame(display_data)

    def highlight_status(s):
        colors = {
            "✅ 可直接使用": "background-color: #d1fae5; color: #065f46",
            "⏳ 待工程师复核": "background-color: #fde68a; color: #92400e",
            "❌ 存在幻觉": "background-color: #fecaca; color: #991b1b",
            "🔄 重复样本": "background-color: #bfdbfe; color: #1e40af",
            "🛡️ 安全拦截": "background-color: #ddd6fe; color: #5b21b6",
        }
        return [colors.get(s["状态"], "") for _ in s]

    st.dataframe(
        df.style.apply(highlight_status, axis=1),
        use_container_width=True,
        hide_index=True,
    )

    st.subheader("幻觉类型分布")
    if metrics["top_hallucination_types"]:
        type_df = pd.DataFrame(metrics["top_hallucination_types"])
        type_df.columns = ["幻觉类型", "数量", "占比(%)"]
        type_cn = {
            "factual_invention": "事实捏造",
            "entity_hallucination": "实体幻觉",
            "date_confusion": "日期混淆",
            "attribute_mismatch": "属性不匹配",
            "logical_contradiction": "逻辑矛盾",
            "reference_fabrication": "引用伪造",
            "unknown": "未知类型",
        }
        type_df["幻觉类型"] = type_df["幻觉类型"].map(type_cn).fillna(type_df["幻觉类型"])
        st.bar_chart(type_df.set_index("幻觉类型")["数量"])

    st.subheader("时间趋势")
    trend = st.session_state.metrics_calculator.calculate_trend_metrics(st.session_state.records)
    if trend:
        trend_df = pd.DataFrame(trend)
        trend_df = trend_df.set_index("time_period")
        st.line_chart(trend_df[["hallucination_rate", "total_records"]])


def render_record_management():
    st.header("📝 记录管理")

    tab1, tab2 = st.tabs(["查看记录", "添加记录"])

    with tab1:
        if not st.session_state.records:
            st.info("暂无记录，请先加载样例数据或添加新记录。")
            return

        selected_id = st.selectbox(
            "选择记录",
            options=[r.record_id for r in st.session_state.records],
            format_func=lambda x: f"{x} - {next(r.input_query[:30] for r in st.session_state.records if r.record_id == x)}",
        )

        if selected_id:
            record = next(r for r in st.session_state.records if r.record_id == selected_id)
            render_record_detail(record)

    with tab2:
        render_add_record_form()


def render_record_detail(record: HallucinationRecord):
    status_info = record.get_business_status()

    status_colors = {
        "green": "#10b981",
        "orange": "#f59e0b",
        "red": "#ef4444",
        "blue": "#3b82f6",
        "purple": "#8b5cf6",
        "gray": "#6b7280",
    }
    color = status_colors.get(status_info["color"], "#6b7280")

    st.markdown(
        f"""
        <div style="padding: 15px; border-radius: 10px; background-color: {color}20; border-left: 4px solid {color}; margin-bottom: 20px;">
            <h3 style="margin: 0; color: {color};">{status_info["label"]}</h3>
            <p style="margin: 5px 0 0 0; color: #666;">
                {'✅ 可直接用于生产' if status_info['can_use_directly'] else '⏳ 请联系模型训练工程师复核'}
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    col1, col2 = st.columns(2)
    with col1:
        st.subheader("输入查询")
        st.info(record.input_query)
    with col2:
        st.subheader("置信度")
        st.metric("置信度", f"{record.confidence_score}%")

    st.subheader("模型输出")
    st.write(record.model_output)

    if record.expected_output:
        st.subheader("预期输出")
        st.success(record.expected_output)

    st.subheader("幻觉类型")
    type_cn = {
        "factual_invention": "事实捏造",
        "entity_hallucination": "实体幻觉",
        "date_confusion": "日期混淆",
        "attribute_mismatch": "属性不匹配",
        "logical_contradiction": "逻辑矛盾",
        "reference_fabrication": "引用伪造",
        "unknown": "未知类型",
    }
    if record.hallucination_types:
        for t in record.hallucination_types:
            st.markdown(f"- 🔴 {type_cn.get(t.value, t.value)}")
    else:
        st.markdown("- ✅ 无幻觉")

    st.subheader("来源材料")
    for i, source in enumerate(record.source_materials):
        with st.expander(f"📄 来源 {i+1}: {source.material_id} ({source.source_type})"):
            st.write(source.content)
            if source.metadata:
                st.json(source.metadata)

    if record.safety_checks:
        st.subheader("安全检测")
        for check in record.safety_checks:
            check_dict = check if isinstance(check, dict) else check.model_dump()
            status_icon = "✅" if check_dict["passed"] else "❌"
            severity_color = {
                "low": "blue",
                "medium": "orange",
                "high": "red",
                "critical": "purple",
            }.get(check_dict.get("severity", "low"), "gray")

            with st.expander(f"{status_icon} {check_dict['check_name']} - {check_dict['message']}"):
                if not check_dict["passed"]:
                    if check_dict.get("actionable_guidance"):
                        guidance = check_dict['actionable_guidance']
                        guidance_html = guidance.replace('\n', '<br>')
                        st.markdown(
                            f"""
                            <div style="padding: 10px; background-color: #fff3cd; border-radius: 5px; margin: 10px 0;">
                                <strong>👉 可操作建议：</strong><br>
                                {guidance_html}
                            </div>
                            """,
                            unsafe_allow_html=True,
                        )
                    if check_dict.get("missing_resources"):
                        st.warning(f"缺失资源: {', '.join(check_dict['missing_resources'])}")
                if check_dict.get("details"):
                    st.json(check_dict["details"])

    if record.corrections:
        st.subheader("人工修正")
        for corr in record.corrections:
            corr_dict = corr.model_dump() if hasattr(corr, "model_dump") else dict(corr)
            status = "✅ 已批准" if corr_dict["is_approved"] else "⏳ 待批准"
            with st.expander(f"✏️ {corr_dict['correction_id']} - {status}"):
                st.write(f"**修正内容：** {corr_dict['corrected_content']}")
                st.write(f"**修正说明：** {corr_dict['correction_note']}")
                st.write(f"**修正人：** {corr_dict['corrected_by']}")
                if corr_dict.get("approver"):
                    st.write(f"**批准人：** {corr_dict['approver']}")

    st.subheader("状态变更")
    new_status = st.selectbox(
        "更新状态",
        options=[s for s in RecordStatus],
        format_func=lambda s: RecordStatus.get_status_label(s),
        index=list(RecordStatus).index(record.status),
    )
    if st.button("保存状态"):
        record.status = new_status
        record.updated_at = datetime.now()
        st.success("状态已更新！")
        st.rerun()

    if record.notes:
        st.subheader("备注")
        st.info(record.notes)

    st.caption(f"记录ID: {record.record_id} | 创建时间: {record.created_at.strftime('%Y-%m-%d %H:%M:%S')}")


def render_add_record_form():
    st.subheader("添加新记录")

    with st.form("add_record_form"):
        col1, col2 = st.columns(2)
        with col1:
            record_id = st.text_input("记录ID", value=f"REC_{uuid.uuid4().hex[:8].upper()}")
            input_query = st.text_area("输入查询", height=100)
            prompt_version = st.selectbox(
                "提示词版本",
                options=[v.version_id for v in st.session_state.version_importer.list_versions()],
            )
        with col2:
            model_output = st.text_area("模型输出", height=100)
            expected_output = st.text_area("预期输出（可选）", height=100)
            confidence = st.slider("置信度", 0, 100, 50)

        status = st.selectbox(
            "初始状态",
            options=[s for s in RecordStatus],
            format_func=lambda s: RecordStatus.get_status_label(s),
            index=1,
        )

        hallucination_types = st.multiselect(
            "幻觉类型（如有）",
            options=[t for t in HallucinationType],
            format_func=lambda t: t.value,
        )

        group_tags = st.text_input("分组标签（逗号分隔）", value="待分类")

        notes = st.text_area("备注", height=80)

        submitted = st.form_submit_button("添加记录", type="primary")
        if submitted and input_query and model_output:
            new_record = HallucinationRecord(
                record_id=record_id,
                input_query=input_query,
                model_output=model_output,
                expected_output=expected_output if expected_output else None,
                prompt_version_id=prompt_version,
                status=status,
                hallucination_types=hallucination_types,
                confidence_score=float(confidence),
                group_tags=[t.strip() for t in group_tags.split(",") if t.strip()],
                notes=notes if notes else None,
            )
            st.session_state.records.append(new_record)
            st.success("记录添加成功！")
            st.rerun()


def render_deduplication():
    st.header("🔄 样本去重")

    if not st.session_state.records:
        st.info("请先加载数据后再进行去重检测。")
        return

    col1, col2 = st.columns(2)
    with col1:
        threshold = st.slider("相似度阈值", 0.5, 1.0, 0.85, 0.05)
    with col2:
        st.info(f"阈值越高，检测越严格。推荐值：0.85")

    if st.button("🔍 检测重复样本", type="primary"):
        with st.spinner("正在检测重复样本..."):
            groups = st.session_state.deduplicator.find_duplicates(
                st.session_state.records, threshold=threshold
            )
            st.session_state.records = st.session_state.deduplicator.mark_duplicates(
                st.session_state.records, groups
            )
        st.success(f"检测完成！发现 {len(groups)} 组重复样本，涉及 {sum(len(g.duplicate_record_ids) for g in groups)} 条记录。")

    stats = st.session_state.deduplicator.get_statistics()
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("重复组数量", stats["total_duplicate_groups"])
    col2.metric("重复记录数", stats["total_duplicate_records"])
    col3.metric("精确匹配组", stats["exact_match_groups"])
    col4.metric("模糊匹配组", stats["fuzzy_match_groups"])

    if st.session_state.deduplicator.duplicate_groups:
        st.subheader("重复组详情")
        for group_id, group in st.session_state.deduplicator.duplicate_groups.items():
            match_type_label = "🎯 精确匹配" if group.match_type == "exact" else "🔍 模糊匹配"
            with st.expander(f"{match_type_label} - 相似度: {group.similarity_score:.2%} - {group.primary_record_id}"):
                primary = next((r for r in st.session_state.records if r.record_id == group.primary_record_id), None)
                if primary:
                    st.markdown(f"**主记录：** {primary.input_query}")
                    st.markdown(f"**输出：** {primary.model_output[:150]}...")

                st.markdown("**重复记录：**")
                for dup_id in group.duplicate_record_ids:
                    dup = next((r for r in st.session_state.records if r.record_id == dup_id), None)
                    if dup:
                        st.markdown(f"- 🔄 {dup_id}: {dup.input_query[:50]}...")
                        trail = st.session_state.deduplicator.get_source_trail(dup, st.session_state.records)
                        with st.expander(f"查看来源追溯 - {dup_id}"):
                            st.json(trail)

    st.subheader("测试去重")
    st.info("💡 提示：可以添加两条相似的记录来测试去重功能")
    with st.form("test_duplicate_form"):
        test_query = st.text_input("测试输入查询", value="北京是哪一年成为中国首都的？")
        test_output = st.text_input("测试模型输出", value="北京在1949年成为中华人民共和国的首都。")
        if st.form_submit_button("添加测试记录"):
            test_record = HallucinationRecord(
                record_id=f"TEST_{uuid.uuid4().hex[:6].upper()}",
                input_query=test_query,
                model_output=test_output,
                prompt_version_id="V202401_PROD",
                status=RecordStatus.PENDING_REVIEW,
                confidence_score=75.0,
                group_tags=["测试"],
            )
            st.session_state.records.append(test_record)
            st.success("测试记录已添加！")
            st.rerun()


def render_safety():
    st.header("🛡️ 安全检测")

    if not st.session_state.records:
        st.info("请先加载数据后再进行安全检测。")
        return

    st.subheader("检测项配置")
    col1, col2 = st.columns(2)
    with col1:
        train_log_model = st.text_input("训练集日志模型名", value="default")
    with col2:
        val_log_model = st.text_input("验证集日志模型名", value="default")

    auto_block = st.checkbox("自动拦截高危记录", value=True)

    st.warning(
        "📝 **关于训练验证泄漏检测**\n\n"
        "如果缺失模型日志文件，系统会给出可操作的错误提示，告诉你需要准备哪些文件。\n"
        "日志格式要求：每行一个样本的JSON，包含 `input_query` 和 `model_output` 字段。"
    )

    selected_record = st.selectbox(
        "选择要检测的记录",
        options=[r.record_id for r in st.session_state.records],
        format_func=lambda x: f"{x} - {next(r.input_query[:30] for r in st.session_state.records if r.record_id == x)}",
    )

    if st.button("🔬 运行安全检测", type="primary"):
        record = next(r for r in st.session_state.records if r.record_id == selected_record)
        with st.spinner("正在进行安全检测..."):
            checks = st.session_state.safety_guard.run_all_checks(
                record,
                train_log_model_name=train_log_model,
                val_log_model_name=val_log_model,
                auto_block=auto_block,
            )

        passed = 0
        for c in checks:
            if isinstance(c, dict):
                if c["passed"]:
                    passed += 1
            else:
                if c.passed:
                    passed += 1
        total = len(checks)
        st.success(f"检测完成！通过 {passed}/{total} 项")

        for check in checks:
            check_dict = check if isinstance(check, dict) else check.model_dump()
            status_icon = "✅" if check_dict["passed"] else "❌"
            severity = check_dict.get("severity", "low")
            severity_label = {
                "low": "低",
                "medium": "中",
                "high": "高",
                "critical": "严重",
            }.get(severity, severity)

            with st.expander(
                f"{status_icon} [{severity_label}] {check_dict['check_name']}: {check_dict['message']}",
                expanded=not check_dict["passed"],
            ):
                if not check_dict["passed"]:
                    if check_dict.get("actionable_guidance"):
                        guidance_html = check_dict['actionable_guidance'].replace('\n', '<br>')
                        st.markdown(
                            f"""
                            <div style="padding: 15px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 10px 0;">
                                <strong>👉 可操作建议：</strong><br><br>
                                {guidance_html}
                            </div>
                            """,
                            unsafe_allow_html=True,
                        )
                    if check_dict.get("missing_resources"):
                        st.error(
                            "📋 **缺失的资源文件：**\n\n"
                            + "\n".join([f"- `{r}`" for r in check_dict["missing_resources"]])
                        )
                if check_dict.get("details"):
                    with st.expander("查看详细信息"):
                        st.json(check_dict["details"])

    st.subheader("批量检测")
    if st.button("🚀 对所有记录运行安全检测"):
        progress = st.progress(0)
        for i, record in enumerate(st.session_state.records):
            st.session_state.safety_guard.run_all_checks(
                record,
                train_log_model_name=train_log_model,
                val_log_model_name=val_log_model,
                auto_block=auto_block,
            )
            progress.progress((i + 1) / len(st.session_state.records))
        st.success("✅ 所有记录检测完成！")
        st.rerun()

    st.subheader("检测历史")
    if selected_record:
        history = st.session_state.safety_guard.get_check_history(selected_record)
        if history:
            st.write(f"共 {len(history)} 次检测记录")
        else:
            st.info("暂无检测历史")


def render_metrics():
    st.header("📈 分组指标")

    if not st.session_state.records:
        st.info("请先加载数据后再计算指标。")
        return

    group_dimension = st.selectbox(
        "选择分组维度",
        options=["group_tags", "status", "prompt_version", "hallucination_type"],
        format_func=lambda x: {
            "group_tags": "分组标签",
            "status": "状态",
            "prompt_version": "提示词版本",
            "hallucination_type": "幻觉类型",
        }[x],
    )

    metrics = st.session_state.metrics_calculator.calculate_group_metrics(
        st.session_state.records, group_dimension=group_dimension
    )

    display_metrics = []
    for m in metrics:
        display_metrics.append({
            "分组名称": m.group_name,
            "样本总数": m.total_records,
            "✅ 可直接使用": m.clean_count,
            "❌ 存在幻觉": m.hallucination_count,
            "⏳ 待确认": m.pending_count,
            "🔄 重复样本": m.duplicate_count,
            "🛡️ 安全拦截": m.blocked_count,
            "幻觉率(%)": m.hallucination_rate,
        })

    df = pd.DataFrame(display_metrics)
    st.dataframe(
        df.style.highlight_max(subset=["幻觉率(%)"], color="#fecaca")
          .highlight_min(subset=["幻觉率(%)"], color="#d1fae5"),
        use_container_width=True,
        hide_index=True,
    )

    chart_df = pd.DataFrame({
        "分组": [m.group_name for m in metrics],
        "幻觉率(%)": [m.hallucination_rate for m in metrics],
        "样本数": [m.total_records for m in metrics],
    })
    st.bar_chart(chart_df.set_index("分组")[["幻觉率(%)", "样本数"]])

    st.subheader("幻觉类型分布（按分组）")
    type_cn = {
        "factual_invention": "事实捏造",
        "entity_hallucination": "实体幻觉",
        "date_confusion": "日期混淆",
        "attribute_mismatch": "属性不匹配",
        "logical_contradiction": "逻辑矛盾",
        "reference_fabrication": "引用伪造",
        "unknown": "未知类型",
    }

    for m in metrics:
        if m.top_hallucination_types:
            with st.expander(f"📊 {m.group_name} - 主要幻觉类型"):
                for t in m.top_hallucination_types:
                    type_name = type_cn.get(t["type"], t["type"])
                    st.write(f"- {type_name}: {t['count']} 次")

    if st.button("💾 保存当前指标"):
        path = st.session_state.metrics_calculator.save_metrics(metrics, group_dimension)
        st.success(f"指标已保存至: {path}")


def render_version_management():
    st.header("📑 提示词版本管理")

    tab1, tab2, tab3 = st.tabs(["版本列表", "导入版本", "版本对比"])

    with tab1:
        versions = st.session_state.version_importer.list_versions()
        if not versions:
            st.info("暂无版本，请先导入提示词版本。")
        else:
            for v in versions:
                with st.expander(f"📝 {v.version_name} ({v.version_id})"):
                    st.write(f"**创建时间：** {v.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
                    st.write(f"**创建人：** {v.created_by}")
                    if v.description:
                        st.write(f"**描述：** {v.description}")
                    if v.system_prompt:
                        st.markdown("**系统提示词：**")
                        st.code(v.system_prompt)
                    st.markdown("**提示词模板：**")
                    st.code(v.prompt_template)
                    if v.metadata:
                        st.markdown("**元数据：**")
                        st.json(v.metadata)

                    if st.button(f"删除版本 {v.version_id}", key=f"del_{v.version_id}"):
                        if st.session_state.version_importer.delete_version(v.version_id):
                            st.success("版本已删除")
                            st.rerun()

    with tab2:
        st.subheader("导入提示词版本")
        import_method = st.radio("导入方式", ["JSON文件", "手动输入"])

        if import_method == "JSON文件":
            uploaded_file = st.file_uploader("上传JSON文件", type=["json"])
            if uploaded_file:
                content = json.load(uploaded_file)
                if isinstance(content, list):
                    for item in content:
                        st.session_state.version_importer.import_from_dict(item)
                else:
                    st.session_state.version_importer.import_from_dict(content)
                st.success("导入成功！")
                st.rerun()

            sample_path = project_root / "samples" / "prompt_versions" / "v1_baseline.json"
            if sample_path.exists():
                if st.button("📂 从样例文件导入"):
                    st.session_state.version_importer.import_from_json(str(sample_path))
                    st.success("样例版本导入成功！")
                    st.rerun()

        else:
            with st.form("manual_version_form"):
                version_name = st.text_input("版本名称", placeholder="V3 - 优化版")
                system_prompt = st.text_area("系统提示词（可选）", height=100)
                prompt_template = st.text_area("提示词模板", height=200, placeholder="{{question}}")
                description = st.text_input("版本描述")
                created_by = st.text_input("创建人", value="模型训练工程师")

                if st.form_submit_button("创建版本", type="primary"):
                    if version_name and prompt_template:
                        v = st.session_state.version_importer.import_from_text(
                            prompt_text=prompt_template,
                            version_name=version_name,
                            system_prompt=system_prompt if system_prompt else None,
                            description=description if description else None,
                            created_by=created_by,
                        )
                        st.success(f"版本 {v.version_id} 创建成功！")
                        st.rerun()

    with tab3:
        st.subheader("版本对比")
        versions = st.session_state.version_importer.list_versions()
        if len(versions) < 2:
            st.info("至少需要2个版本才能进行对比。")
        else:
            col1, col2 = st.columns(2)
            with col1:
                v1_id = st.selectbox("版本1", [v.version_id for v in versions], format_func=lambda x: next(v.version_name for v in versions if v.version_id == x))
            with col2:
                v2_id = st.selectbox("版本2", [v.version_id for v in versions], index=1, format_func=lambda x: next(v.version_name for v in versions if v.version_id == x))

            if st.button("🔄 对比版本"):
                diff = st.session_state.version_importer.get_version_diff(v1_id, v2_id)
                col1, col2 = st.columns(2)
                with col1:
                    st.markdown("**旧版本**")
                    st.code(diff["old_version"]["prompt_template"])
                with col2:
                    st.markdown("**新版本**")
                    st.code(diff["new_version"]["prompt_template"])

                if diff.get("prompt_diff"):
                    st.info(f"提示词长度变化：{diff['prompt_diff']['length_change']:+d} 字符")


def render_export():
    st.header("📤 报告导出")

    if not st.session_state.records:
        st.info("请先加载数据后再导出报告。")
        return

    metrics = st.session_state.metrics_calculator.calculate_group_metrics(st.session_state.records)

    col1, col2 = st.columns(2)
    with col1:
        export_format = st.selectbox("导出格式", ["HTML", "Excel", "JSON"])
    with col2:
        include_metrics = st.checkbox("包含分组指标", value=True)

    preview = st.session_state.report_exporter._generate_business_summary(st.session_state.records)
    st.subheader("报告预览")
    st.markdown(
        f"""
        <div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px;">
            <h3 style="margin: 0;">📊 报告概览</h3>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">
                共 {preview['total_records']} 条记录，
                ✅ 可用 {preview['can_use_directly']} 条 ({preview['available_rate']}%)，
                ⏳ 待复核 {preview['needs_engineer_review']} 条 ({preview['needs_review_rate']}%)，
                ❌ 幻觉 {preview['hallucination_count']} 条 ({preview['hallucination_rate']}%)
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    if st.button(f"📥 导出 {export_format} 报告", type="primary", use_container_width=True):
        with st.spinner("正在生成报告..."):
            if export_format == "HTML":
                path = st.session_state.report_exporter.export_to_html(
                    st.session_state.records,
                    metrics=metrics if include_metrics else None,
                    prompt_versions=st.session_state.version_importer.list_versions(),
                )
            elif export_format == "Excel":
                path = st.session_state.report_exporter.export_to_excel(
                    st.session_state.records,
                    metrics=metrics if include_metrics else None,
                )
            else:
                path = st.session_state.report_exporter.export_to_json(
                    st.session_state.records,
                    metrics=metrics if include_metrics else None,
                )

        st.success(f"✅ 报告导出成功！\n\n文件路径: `{path}`")

        with open(path, "rb") as f:
            btn = st.download_button(
                label="⬇️ 下载报告",
                data=f,
                file_name=Path(path).name,
                mime={
                    "HTML": "text/html",
                    "Excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "JSON": "application/json",
                }[export_format],
            )

    st.subheader("历史导出")
    exports = st.session_state.report_exporter.get_available_exports()
    if exports:
        export_df = pd.DataFrame(exports)[["filename", "format", "size_kb", "created_at"]]
        export_df.columns = ["文件名", "格式", "大小(KB)", "创建时间"]
        st.dataframe(export_df, use_container_width=True, hide_index=True)
    else:
        st.info("暂无导出历史")


def main():
    st.set_page_config(
        page_title="模型幻觉证据追踪",
        page_icon="🔍",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    init_session_state()
    render_sidebar()

    st.markdown(
        """
        <style>
        .stApp {
            background-color: #fafafa;
        }
        .stButton button {
            border-radius: 8px;
        }
        .stSelectbox [data-baseweb="select"] {
            border-radius: 8px;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )

    page = st.sidebar.radio(
        "选择功能",
        [
            "📊 总览",
            "📝 记录管理",
            "🔄 样本去重",
            "🛡️ 安全检测",
            "📈 分组指标",
            "📑 版本管理",
            "📤 报告导出",
        ],
        label_visibility="hidden",
    )

    if page == "📊 总览":
        render_overview()
    elif page == "📝 记录管理":
        render_record_management()
    elif page == "🔄 样本去重":
        render_deduplication()
    elif page == "🛡️ 安全检测":
        render_safety()
    elif page == "📈 分组指标":
        render_metrics()
    elif page == "📑 版本管理":
        render_version_management()
    elif page == "📤 报告导出":
        render_export()


if __name__ == "__main__":
    main()
