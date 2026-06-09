import io
import os
import sys
import tempfile
import zipfile
from datetime import datetime
from typing import List, Optional, Tuple

import numpy as np
import pandas as pd
import streamlit as st

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from normality_checker import (
    DataProcessor,
    NormalityTester,
    NormalityVisualizer,
    ReportGenerator,
)
from normality_checker.core import CombinedTestResult, NormalityVerdict
from normality_checker.data_processor import ProcessedData
from normality_checker.report_generator import BatchReport
from normality_checker.visualizer import VisualizationResult


st.set_page_config(
    page_title="正态性检验说明器 | 建模社工具",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

VERDICT_COLORS = {
    "正态": "#2ECC71",
    "非正态": "#E74C3C",
    "无法判断": "#F39C12",
    "跳过": "#95A5A6",
    "错误": "#E67E22",
}


def init_session():
    if "datasets" not in st.session_state:
        st.session_state.datasets = []
    if "processed_list" not in st.session_state:
        st.session_state.processed_list = []
    if "results_list" not in st.session_state:
        st.session_state.results_list = []
    if "vis_list" not in st.session_state:
        st.session_state.vis_list = []
    if "current_report" not in st.session_state:
        st.session_state.current_report = None


def verdict_badge(text: str) -> str:
    color = VERDICT_COLORS.get(text, "#7F8C8D")
    return (
        f'<span style="background-color:{color};color:white;padding:3px 12px;'
        f'border-radius:12px;font-weight:bold;font-size:13px;">{text}</span>'
    )


def load_edge_cases() -> List[dict]:
    return DataProcessor.create_edge_case_datasets()


def sidebar_controls():
    with st.sidebar:
        st.title("⚙️ 检验参数设置")
        st.subheader("显著性水平")
        alpha = st.slider("α (默认 0.05)", 0.01, 0.10, 0.05, 0.01,
                          help="P值大于α则不拒绝正态原假设")

        st.subheader("数据预处理")
        remove_outliers = st.checkbox("移除异常值", value=True,
                                      help="使用IQR方法检测并移除异常值")
        iqr_factor = st.slider("IQR倍数", 1.0, 3.0, 1.5, 0.1,
                               help="IQR×该倍数之外视为异常值")
        outlier_method = st.radio("异常值检测方法", ["IQR", "Z-score"], index=0)

        st.subheader("可视化")
        show_comparison = st.checkbox("显示清洗前后对比图", value=True)
        dpi = st.slider("图像DPI", 80, 200, 120, 10)

        st.divider()
        st.subheader("报告")
        author = st.text_input("编制人", value="建模社助教")
        include_raw = st.checkbox("报告中包含原始数据", value=True)

        return {
            "alpha": alpha,
            "remove_outliers": remove_outliers,
            "iqr_factor": iqr_factor,
            "outlier_method": outlier_method.lower(),
            "show_comparison": show_comparison,
            "dpi": dpi,
            "author": author,
            "include_raw": include_raw,
        }


def render_data_input(params: dict):
    st.header("📋 数据输入")
    st.caption("支持：粘贴文本、上传文件、或加载内置边界测试样例")

    tab1, tab2, tab3 = st.tabs(["📝 手动/粘贴输入", "📁 上传文件", "🧪 加载边界样例"])

    with tab1:
        col_a, col_b = st.columns([2, 1])
        with col_a:
            name1 = st.text_input("数据集名称", value="我的数据", key="name1")
            source1 = st.text_input("来源材料（用于报告追踪）",
                                    value="手动输入", key="source1")
            data_text = st.text_area(
                "输入数值（用逗号、空格或换行分隔）",
                height=150,
                placeholder="例如：1.2, 3.4, 5.6, 7.8 ...",
                key="data_text",
            )
            gaps1 = st.text_area(
                "已知材料缺口（每行一条，可选）",
                height=80,
                placeholder="例如：\n第5行缺失\n图表截图待补充",
                key="gaps1",
            )
        with col_b:
            st.markdown("**输入提示**")
            st.info(
                "✅ 有效输入示例：\n"
                "- `1.2, 3.4, 5.6, 7.8`\n"
                "- `10 20 30 40 50`\n"
                "- 每行一个数\n\n"
                "❌ 会被标记为缺口的情况：\n"
                "- 空字符串\n"
                "- `N/A`、`缺失`等文本\n"
                "- 纯空输入"
            )

        if st.button("➕ 添加此数据集", type="primary", key="add_text"):
            gap_list = [g.strip() for g in gaps1.split("\n") if g.strip()] if gaps1 else []
            st.session_state.datasets.append({
                "name": name1 or "未命名",
                "source": source1 or "未知材料",
                "data": data_text if data_text else "",
                "gaps": gap_list,
            })
            st.success(f"已添加：{name1 or '未命名'}")
            st.rerun()

    with tab2:
        col_a, col_b = st.columns([2, 1])
        with col_a:
            uploaded = st.file_uploader(
                "上传 CSV / Excel 文件",
                type=["csv", "xlsx", "xls"],
                accept_multiple_files=True,
                key="file_uploader",
            )
            if uploaded:
                for f in uploaded:
                    try:
                        if f.name.endswith(".csv"):
                            df = pd.read_csv(f)
                        else:
                            df = pd.read_excel(f)
                        st.write(f"✅ 已读取 `{f.name}` ({len(df)}行)")
                        with st.expander(f"预览 {f.name}", expanded=False):
                            st.dataframe(df.head(10), use_container_width=True)

                        name2 = st.text_input(f"数据集名称 [{f.name}]",
                                              value=os.path.splitext(f.name)[0],
                                              key=f"name_{f.name}")
                        source2 = st.text_input(f"来源材料 [{f.name}]",
                                                value=f.name,
                                                key=f"source_{f.name}")
                        gaps2 = st.text_area(
                            f"已知缺口 [{f.name}]",
                            height=60,
                            key=f"gaps_{f.name}",
                        )
                        if st.button(f"➕ 添加 {f.name}", key=f"add_file_{f.name}"):
                            gap_list = [g.strip() for g in gaps2.split("\n") if g.strip()] if gaps2 else []
                            numeric_col = df.select_dtypes(include=[np.number]).columns
                            if len(numeric_col) > 0:
                                data_arr = df[numeric_col[0]].dropna().tolist()
                            else:
                                data_arr = df.iloc[:, 0].dropna().tolist()
                            st.session_state.datasets.append({
                                "name": name2 or f.name,
                                "source": source2 or f.name,
                                "data": data_arr,
                                "gaps": gap_list,
                            })
                            st.success(f"已添加：{name2 or f.name}")
                            st.rerun()
                    except Exception as e:
                        st.error(f"读取 {f.name} 失败: {e}")

    with tab3:
        st.markdown("### 🧪 边界样例（模拟真实计算草稿）")
        st.info(
            "这些样例模拟了建模社真实计算草稿中常见的问题：\n"
            "- **空集合**：完全空、全NaN、非数值占位符\n"
            "- **样本不足**：仅2个数据点\n"
            "- **坏数据**：混入录入错误(999/-999)、常数列\n"
            "- **正常/非正态对照**：用于对比参考"
        )
        edge_cases = load_edge_cases()
        for i, case in enumerate(edge_cases):
            with st.expander(f"{i+1}. {case['name']}  —  来源: {case['source']}"):
                st.write(f"**缺口说明**: {case['gaps'] if case['gaps'] else '无'}")
                preview = case["data"][:10] if case["data"] else []
                st.write(f"**数据预览** (前10个): {preview}")
                if len(case["data"]) > 10:
                    st.caption(f"... 共 {len(case['data'])} 个值")
                if st.button(f"➕ 添加此样例", key=f"add_edge_{i}"):
                    st.session_state.datasets.append({
                        "name": case["name"],
                        "source": case["source"],
                        "data": case["data"],
                        "gaps": case["gaps"],
                    })
                    st.success(f"已添加样例：{case['name']}")
                    st.rerun()

    if st.session_state.datasets:
        st.divider()
        col1, col2 = st.columns([3, 1])
        with col1:
            st.subheader(f"📦 已添加数据集 ({len(st.session_state.datasets)})")
        with col2:
            if st.button("🗑️ 清空全部"):
                st.session_state.datasets = []
                st.session_state.processed_list = []
                st.session_state.results_list = []
                st.session_state.vis_list = []
                st.session_state.current_report = None
                st.rerun()

        for i, ds in enumerate(st.session_state.datasets):
            with st.container(border=True):
                c1, c2, c3 = st.columns([3, 4, 1])
                with c1:
                    st.markdown(f"**{i+1}. {ds['name']}**")
                    st.caption(f"来源: {ds['source']}")
                with c2:
                    if isinstance(ds["data"], str):
                        snippet = ds["data"][:60]
                    else:
                        snippet = str(list(ds["data"])[:8])
                    st.code(f"数据: {snippet}...", language=None)
                    if ds["gaps"]:
                        st.caption(f"已知缺口: {len(ds['gaps'])} 项")
                with c3:
                    if st.button("❌", key=f"remove_{i}"):
                        st.session_state.datasets.pop(i)
                        if i < len(st.session_state.processed_list):
                            st.session_state.processed_list.pop(i)
                        if i < len(st.session_state.results_list):
                            st.session_state.results_list.pop(i)
                        if i < len(st.session_state.vis_list):
                            st.session_state.vis_list.pop(i)
                        st.rerun()


def run_processing(params: dict):
    if not st.session_state.datasets:
        return

    st.header("⚙️ 运行检验")
    if st.button("🚀 开始批量处理 & 检验", type="primary", use_container_width=True):
        processor = DataProcessor(
            remove_outliers=params["remove_outliers"],
            outlier_method=params["outlier_method"],
            iqr_factor=params["iqr_factor"],
        )
        tester = NormalityTester(alpha=params["alpha"])
        visualizer = NormalityVisualizer(dpi=params["dpi"])
        reporter = ReportGenerator(author=params["author"])

        processed_list: List[ProcessedData] = []
        results_list: List[Optional[CombinedTestResult]] = []
        vis_list: List[VisualizationResult] = []

        progress = st.progress(0.0, text="初始化...")
        total = len(st.session_state.datasets)

        for i, ds in enumerate(st.session_state.datasets):
            progress.progress((i) / total,
                              text=f"处理中: {ds['name']} ({i+1}/{total})")

            processed = processor.process(
                ds["data"], ds["name"], ds["source"],
                known_gaps=ds.get("gaps", [])
            )
            processed_list.append(processed)

            if processed.can_test:
                result = tester.run_all_tests(
                    processed.cleaned_data,
                    processed.dataset_name,
                    processed.source_material,
                    gaps=processed.gaps,
                )
                results_list.append(result)

                vis = visualizer.generate_all(
                    processed, result,
                    include_comparison=params["show_comparison"],
                )
                vis_list.append(vis)
            else:
                results_list.append(None)
                vis_empty = visualizer.generate_all(processed, None)
                vis_list.append(vis_empty)

        progress.progress(1.0, text="✅ 完成！")

        st.session_state.processed_list = processed_list
        st.session_state.results_list = results_list
        st.session_state.vis_list = vis_list

        report = reporter.generate_batch_report(processed_list, results_list)
        st.session_state.current_report = report

        st.success(f"✅ 处理完成！共 {total} 个数据集，"
                   f"成功检验 {report.n_success} 个，"
                   f"空集合 {report.n_empty} 个，"
                   f"含缺口 {report.n_with_gaps} 个")


def render_results(params: dict):
    if not st.session_state.processed_list:
        return

    reporter = ReportGenerator(author=params["author"])
    report: BatchReport = st.session_state.current_report
    processed_list = st.session_state.processed_list
    results_list = st.session_state.results_list
    vis_list = st.session_state.vis_list

    st.header("📊 检验结果")

    with st.container(border=True):
        st.subheader("📈 汇总总览")
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("数据集总数", report.n_datasets)
        c2.metric("成功得出结论", report.n_success)
        c3.metric("空集合", report.n_empty,
                  delta=None if report.n_empty == 0 else f"需补录")
        c4.metric("含材料缺口", report.n_with_gaps,
                  delta=None if report.n_with_gaps == 0 else f"需补充")

        st.dataframe(report.summary_df, use_container_width=True, hide_index=True)

    if len(report.gap_df) > 0 or len(report.issues_df) > 0:
        with st.container(border=True):
            st.subheader("⚠️ 需关注事项")
            tab_g, tab_i = st.tabs(["📋 材料缺口清单", "❌ 问题清单"])
            with tab_g:
                st.dataframe(report.gap_df, use_container_width=True, hide_index=True)
                st.warning("以上缺口需建模社助教补充完整后，投委会复核时才能认定材料齐全")
            with tab_i:
                st.dataframe(report.issues_df, use_container_width=True, hide_index=True)

    st.subheader("🔍 逐数据集详情")
    for i, (processed, result, vis) in enumerate(
        zip(processed_list, results_list, vis_list)
    ):
        with st.expander(f"{i+1}. {processed.dataset_name}  —  "
                         f"结论: {result.overall_verdict.value if result else '未执行'}",
                         expanded=(i == 0)):

            col_l, col_r = st.columns([1, 1])
            with col_l:
                st.markdown("#### 📝 数据与检验信息")
                info_cols = st.columns(2)
                info_cols[0].markdown(f"**来源材料**: {processed.source_material}")
                info_cols[1].markdown(f"**是否空集**: {'是' if processed.is_empty else '否'}")
                info_cols[0].markdown(f"**原始样本量**: {processed.n_raw}")
                info_cols[1].markdown(f"**清洗后样本量**: {processed.n_clean}")
                info_cols[0].markdown(f"**移除NaN**: {processed.n_removed_nan}")
                info_cols[1].markdown(f"**移除异常值**: {processed.n_removed_outliers}")

                if processed.preprocessing_changed_verdict:
                    st.warning("⚠️ **预处理可能改变结论** — 清洗前后统计特征差异显著，"
                               "请检查下方对比图确认")

                if result is not None:
                    st.markdown("---")
                    st.markdown(f"#### ✅ 总体结论: "
                                f"{verdict_badge(result.overall_verdict.value)} "
                                f"(置信度 {result.overall_confidence:.1%})")
                    st.caption(f"成功检验 {result.n_tests_run} 项 | "
                               f"跳过 {result.n_tests_skipped} 项 | "
                               f"错误 {result.n_tests_error} 项")

                    detail_df = reporter.generate_detail_dataframe(processed, result)
                    st.dataframe(detail_df, use_container_width=True, hide_index=True)

                if processed.gaps:
                    st.markdown("#### 📋 材料缺口（来自原始草稿）")
                    for g in processed.gaps:
                        st.markdown(f"- 📌 {g}")

                if result and result.issues:
                    st.markdown("#### ❌ 检验中发现的问题")
                    for issue in result.issues:
                        st.markdown(f"- ⚠️ {issue}")

            with col_r:
                st.markdown("#### 📊 图表展示")
                fig_names = vis.list_figures()
                if fig_names:
                    tabs = st.tabs(fig_names)
                    for j, fname in enumerate(fig_names):
                        with tabs[j]:
                            fig = vis.get_figure(fname)
                            if fig:
                                st.pyplot(fig, use_container_width=True)

                if vis.failed_figures:
                    st.error("以下图表生成失败（不影响报告输出）：")
                    for fn in vis.failed_figures:
                        st.markdown(f"- ❌ {fn}")
                    st.caption("提示：这些缺失项已记录在报告的缺口清单中，"
                               "可在导出后补充截图")

            raw_df = reporter.generate_raw_data_dataframe(processed)
            if len(raw_df) > 0:
                with st.expander("🔢 查看原始数据与清洗标记"):
                    st.dataframe(raw_df, use_container_width=True, hide_index=True)


def render_download(params: dict):
    if not st.session_state.current_report:
        return

    reporter = ReportGenerator(author=params["author"])
    report: BatchReport = st.session_state.current_report
    vis_list = st.session_state.vis_list
    processed_list = st.session_state.processed_list

    st.header("📥 导出报告与图表")

    col1, col2, col3 = st.columns(3)

    with col1:
        st.subheader("📄 Excel报告")
        excel_buf = io.BytesIO()
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
            tmp_path = tmp.name
        try:
            reporter.export_to_excel(report, tmp_path, include_raw_data=params["include_raw"])
            with open(tmp_path, "rb") as f:
                excel_data = f.read()
            st.download_button(
                "⬇️ 下载 Excel (.xlsx)",
                data=excel_data,
                file_name=f"{report.report_id}_正态性检验报告.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                use_container_width=True,
            )
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    with col2:
        st.subheader("📑 CSV报告")
        csv_buf = io.BytesIO()
        with zipfile.ZipFile(csv_buf, "w", zipfile.ZIP_DEFLATED) as zf:
            csv_files = reporter.export_to_csv(report, tempfile.mkdtemp(),
                                               include_raw_data=params["include_raw"])
            for fp in csv_files:
                with open(fp, "rb") as f:
                    zf.writestr(os.path.basename(fp), f.read())
        csv_buf.seek(0)
        st.download_button(
            "⬇️ 下载 CSV 压缩包",
            data=csv_buf.getvalue(),
            file_name=f"{report.report_id}_CSV报告.zip",
            mime="application/zip",
            use_container_width=True,
        )

    with col3:
        st.subheader("🖼️ 图表图片")
        img_buf = io.BytesIO()
        visualizer = NormalityVisualizer(dpi=params["dpi"])
        with zipfile.ZipFile(img_buf, "w", zipfile.ZIP_DEFLATED) as zf:
            all_saved = []
            all_failed = []
            for i, (processed, vis) in enumerate(zip(processed_list, vis_list)):
                saved, failed = visualizer.save_all(
                    vis, tempfile.mkdtemp(), fmt="png"
                )
                all_saved.extend(saved)
                all_failed.extend(failed)
            for fp in all_saved:
                with open(fp, "rb") as f:
                    zf.writestr(os.path.basename(fp), f.read())
            if all_failed:
                fail_text = "以下图表生成失败，需手动补充截图：\n" + "\n".join(all_failed)
                zf.writestr("图表生成失败说明.txt", fail_text)
        img_buf.seek(0)
        st.download_button(
            "⬇️ 下载图表 PNG 压缩包",
            data=img_buf.getvalue(),
            file_name=f"{report.report_id}_图表.zip",
            mime="application/zip",
            use_container_width=True,
        )

    st.divider()
    st.subheader("📝 文字版摘要（可直接复制）")
    text_summary = reporter.generate_text_summary(report)
    st.code(text_summary, language=None)

    col1, col2 = st.columns([1, 5])
    with col1:
        st.download_button(
            "⬇️ 下载 TXT",
            data=text_summary,
            file_name=f"{report.report_id}_摘要.txt",
            mime="text/plain",
        )


def main():
    init_session()

    st.title("📊 正态性检验说明器")
    st.caption("建模社助教专用工具 · 支持批量处理、空集合边界检测、图表前后对比、材料追踪报告")

    params = sidebar_controls()

    render_data_input(params)

    if st.session_state.datasets:
        run_processing(params)
        render_results(params)
        render_download(params)

    st.divider()
    with st.expander("ℹ️ 使用说明", expanded=False):
        st.markdown(
            """
            ### 主要功能
            1. **多源数据输入**：粘贴文本、上传CSV/Excel、或加载内置边界样例
            2. **边界情况处理**：自动检测空集合、全NaN、非数值、录入错误等问题
            3. **多种检验方法**：Shapiro-Wilk、Kolmogorov-Smirnov、Anderson-Darling、
               Jarque-Bera、D'Agostino-Pearson 五种方法联合判断
            4. **图表前后对比**：清洗前/清洗后的直方图、Q-Q图对比，异常值标注
            5. **材料追踪报告**：每份数据标注来源材料，缺口清单指向具体文件，
               投委会仅看报告也能知道哪份材料缺数据
            6. **容错机制**：图表生成失败不中断整体流程，缺口单独列出供助教补录

            ### 典型工作流
            1. 在侧边栏设置参数（保持默认即可）
            2. 在「数据输入」区添加计算草稿中的数据（建议用"加载边界样例"试试）
            3. 点击「开始批量处理 & 检验」
            4. 查看结果，特别注意「需关注事项」中的缺口
            5. 在「导出报告与图表」下载Excel和图表包，提交投委会
            """
        )


if __name__ == "__main__":
    main()
