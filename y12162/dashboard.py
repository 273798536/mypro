import streamlit as st
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import plotly.express as px
import plotly.graph_objects as go

from config import config, DATA_DIR, OUTPUT_DIR
from data_loader import load_data, get_bad_row_categories_summary
from quality_check import run_quality_checks
from energy_calculator import calculate_regenerative_braking_energy
from data_exporter import export_all_results, export_current_missing_path
from traceability import trace_single_result, create_trace_report

def set_page_config():
    st.set_page_config(
        page_title="列车再生制动能量分析系统",
        page_icon="🚇",
        layout="wide",
        initial_sidebar_state="expanded"
    )

def sidebar_upload():
    st.sidebar.title("🚇 列车再生制动能量分析")
    
    uploaded_file = st.sidebar.file_uploader(
        "上传数据文件 (CSV/Excel)",
        type=["csv", "xlsx", "xls"]
    )
    
    if uploaded_file is not None:
        file_path = DATA_DIR / uploaded_file.name
        with open(file_path, "wb") as f:
            f.write(uploaded_file.getbuffer())
        return str(file_path)
    
    st.sidebar.markdown("---")
    st.sidebar.subheader("测试数据")
    if st.sidebar.button("使用示例数据"):
        example_file = Path(__file__).parent / "examples" / "sample_train_data.csv"
        if example_file.exists():
            return str(example_file)
    
    return None

def display_data_quality(loaded_data, quality_result):
    st.header("📊 数据质量检查")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("总行数", loaded_data.metadata.get("总行数", 0))
    with col2:
        st.metric("有效行数", len(quality_result.valid_data))
    with col3:
        st.metric("坏行数", len(loaded_data.bad_rows))
    with col4:
        st.metric("质量问题数", quality_result.quality_report.get("total_issues", 0))
    
    st.markdown("---")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("坏行分类统计")
        bad_summary = get_bad_row_categories_summary(loaded_data.bad_rows)
        if not bad_summary.empty:
            st.dataframe(bad_summary, use_container_width=True)
        else:
            st.info("无坏行记录")
    
    with col2:
        st.subheader("数据质量问题")
        quality_issues = pd.DataFrame([
            {"问题类型": "电流缺采", "数量": len(quality_result.current_missing_data)},
            {"问题类型": "站间重复", "数量": len(quality_result.duplicate_section_data)},
            {"问题类型": "坡度版本错", "数量": len(quality_result.wrong_slope_data)}
        ])
        st.dataframe(quality_issues, use_container_width=True)
    
    st.markdown("---")
    
    tab1, tab2, tab3 = st.tabs(["电流缺采", "站间重复", "坡度版本错"])
    
    with tab1:
        if not quality_result.current_missing_data.empty:
            st.dataframe(quality_result.current_missing_data, use_container_width=True)
            
            if st.button("导出电流缺采失败路径"):
                output_path = export_current_missing_path(quality_result)
                st.success(f"已导出: {output_path}")
        else:
            st.info("未检测到电流缺采")
    
    with tab2:
        if not quality_result.duplicate_section_data.empty:
            st.dataframe(quality_result.duplicate_section_data, use_container_width=True)
        else:
            st.info("未检测到站间重复")
    
    with tab3:
        if not quality_result.wrong_slope_data.empty:
            st.dataframe(quality_result.wrong_slope_data, use_container_width=True)
        else:
            st.info("未检测到坡度版本错误")

def display_energy_analysis(energy_result):
    st.header("⚡ 再生制动能量分析")
    
    summary = energy_result.summary
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("总制动能量 (kWh)", f"{summary.get('总制动能量(kWh)', 0):.2f}")
    with col2:
        st.metric("总牵引能量 (kWh)", f"{summary.get('总牵引能量(kWh)', 0):.2f}")
    with col3:
        st.metric("平均能量回收率 (%)", f"{summary.get('平均能量回收率(%)', 0):.2f}%")
    with col4:
        st.metric("制动阶段数", summary.get("制动阶段数", 0))
    
    st.markdown("---")
    
    tab1, tab2, tab3, tab4 = st.tabs([
        "原始数据趋势", "区间能量汇总", "列车能量汇总", "损失估算"
    ])
    
    with tab1:
        if not energy_result.raw_energy_data.empty:
            train_list = energy_result.raw_energy_data["列车号"].unique()
            selected_train = st.selectbox("选择列车", ["全部"] + list(train_list))
            
            plot_data = energy_result.raw_energy_data
            if selected_train != "全部":
                plot_data = plot_data[plot_data["列车号"] == selected_train]
            
            fig = go.Figure()
            
            fig.add_trace(go.Scatter(
                x=plot_data["时间"],
                y=plot_data["速度"],
                name="速度 (km/h)",
                yaxis="y1",
                line=dict(color="blue")
            ))
            
            fig.add_trace(go.Scatter(
                x=plot_data["时间"],
                y=plot_data["功率"],
                name="功率 (kW)",
                yaxis="y2",
                line=dict(color="red")
            ))
            
            fig.update_layout(
                title="速度与功率趋势",
                xaxis_title="时间",
                yaxis=dict(title="速度 (km/h)"),
                yaxis2=dict(title="功率 (kW)", overlaying="y", side="right"),
                hovermode="x unified"
            )
            
            st.plotly_chart(fig, use_container_width=True)
            
            fig2 = go.Figure()
            fig2.add_trace(go.Scatter(
                x=plot_data["时间"],
                y=plot_data["累计制动能量(kWh)"],
                name="累计制动能量",
                fill="tozeroy"
            ))
            fig2.add_trace(go.Scatter(
                x=plot_data["时间"],
                y=plot_data["累计牵引能量(kWh)"],
                name="累计牵引能量",
                fill="tozeroy"
            ))
            fig2.update_layout(title="累计能量趋势", yaxis_title="能量 (kWh)")
            st.plotly_chart(fig2, use_container_width=True)
    
    with tab2:
        if not energy_result.section_energy.empty:
            st.dataframe(energy_result.section_energy, use_container_width=True)
            
            fig = px.bar(
                energy_result.section_energy,
                x="区间",
                y=["总制动能量(kWh)", "总牵引能量(kWh)"],
                title="各区间制动与牵引能量对比",
                barmode="group"
            )
            st.plotly_chart(fig, use_container_width=True)
    
    with tab3:
        if not energy_result.train_energy.empty:
            st.dataframe(energy_result.train_energy, use_container_width=True)
            
            fig = px.pie(
                energy_result.train_energy,
                values="总制动能量(kWh)",
                names="列车号",
                title="各列车制动能量占比"
            )
            st.plotly_chart(fig, use_container_width=True)
    
    with tab4:
        if not energy_result.loss_estimation.empty:
            st.dataframe(energy_result.loss_estimation, use_container_width=True)

def display_traceability(energy_result):
    st.header("🔍 数据追溯")
    
    if energy_result.section_energy.empty:
        st.info("无数据可供追溯")
        return
    
    col1, col2 = st.columns(2)
    
    with col1:
        train_list = energy_result.section_energy["列车号"].unique()
        selected_train = st.selectbox("选择列车", train_list)
    
    with col2:
        section_list = energy_result.section_energy[
            energy_result.section_energy["列车号"] == selected_train
        ]["区间"].unique()
        selected_section = st.selectbox("选择区间", section_list)
    
    if st.button("生成追溯报告"):
        trace_result = trace_single_result(energy_result, selected_train, selected_section)
        
        st.subheader("追溯结果")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("**能量回收层级**")
            st.json(trace_result["energy_recovery_summary"])
        
        with col2:
            st.markdown("**区间归集层级**")
            st.json(trace_result["section_aggregation_summary"])
        
        st.markdown("**损失估算层级**")
        st.json(trace_result["loss_estimation_summary"])
        
        st.info(f"关联原始数据点数: {trace_result['trace_count']}")
        st.write(f"前5个追溯ID: {trace_result['trace_ids']}")
    
    if st.button("导出完整追溯报告"):
        report_info = create_trace_report(energy_result, str(OUTPUT_DIR))
        st.success(f"已生成 {report_info['total_chains']} 条追溯链")
        st.write(f"JSON报告: {report_info['json_report']}")
        st.write(f"CSV摘要: {report_info['csv_summary']}")

def display_export(loaded_data, quality_result, energy_result):
    st.header("💾 数据导出")
    
    st.info("所有图表、明细和下载文件均来自同一批数据，确保数据一致性")
    
    col1, col2 = st.columns(2)
    
    with col1:
        export_formats = st.multiselect(
            "选择导出格式",
            ["csv", "xlsx", "json"],
            default=["csv", "xlsx"]
        )
    
    with col2:
        custom_output_dir = st.text_input("输出目录", value=str(OUTPUT_DIR))
    
    if st.button("导出所有结果", type="primary"):
        with st.spinner("正在导出数据..."):
            result = export_all_results(
                loaded_data, quality_result, energy_result,
                output_dir=custom_output_dir,
                formats=export_formats
            )
            
            st.success(f"成功导出 {result.summary['total_files_exported']} 个文件")
            
            st.subheader("已导出文件:")
            for f in result.files:
                st.write(f"- {f}")

def main():
    set_page_config()
    
    file_path = sidebar_upload()
    
    if not file_path:
        st.title("🚇 列车再生制动能量分析系统")
        st.markdown("---")
        st.info("请在左侧上传数据文件或点击'使用示例数据'开始分析")
        
        st.markdown("""
        ### 系统功能
        - **数据质量检查**: 检测空行、缺列、电流缺采、站间重复、坡度版本错误
        - **再生制动能量计算**: 功率、能量、制动阶段检测
        - **能量分析**: 区间归集、列车汇总、损失估算
        - **数据追溯**: 能量回收→区间归集→损失估算完整链路
        - **统一数据导出**: 图表、明细、下载文件来自同一批数据
        """)
        
        return
    
    try:
        with st.spinner("正在加载数据..."):
            loaded_data = load_data(file_path)
        
        with st.spinner("正在进行质量检查..."):
            quality_result = run_quality_checks(loaded_data.valid_data)
        
        with st.spinner("正在计算能量..."):
            energy_result = calculate_regenerative_braking_energy(quality_result.valid_data)
        
        tab1, tab2, tab3, tab4, tab5 = st.tabs([
            "📊 数据质量", "⚡ 能量分析", "🔍 数据追溯", "💾 导出数据", "📋 原始数据"
        ])
        
        with tab1:
            display_data_quality(loaded_data, quality_result)
        
        with tab2:
            display_energy_analysis(energy_result)
        
        with tab3:
            display_traceability(energy_result)
        
        with tab4:
            display_export(loaded_data, quality_result, energy_result)
        
        with tab5:
            st.subheader("有效数据")
            st.dataframe(quality_result.valid_data, use_container_width=True)
            
            if not loaded_data.bad_rows.empty:
                st.subheader("坏行记录")
                st.dataframe(loaded_data.bad_rows, use_container_width=True)
    
    except Exception as e:
        st.error(f"处理出错: {str(e)}")
        raise

if __name__ == "__main__":
    main()
