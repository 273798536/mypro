import streamlit as st
import pandas as pd
import numpy as np
import tempfile
import os
from datetime import datetime

from src import (
    DataManager,
    DataCleaner,
    NonlinearPricingFitter,
    PriceSensitivityAnalyzer,
    GroupAnalyzer,
    PricingVisualizer,
    ReportGenerator
)

st.set_page_config(
    page_title="非线性定价拟合器",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.title("📊 非线性定价拟合器")
st.markdown("---")

if 'data_manager' not in st.session_state:
    st.session_state.data_manager = DataManager()
if 'clean_result' not in st.session_state:
    st.session_state.clean_result = None
if 'fitter' not in st.session_state:
    st.session_state.fitter = None
if 'sensitivity_analyzer' not in st.session_state:
    st.session_state.sensitivity_analyzer = None
if 'group_analyzer' not in st.session_state:
    st.session_state.group_analyzer = None
if 'visualizer' not in st.session_state:
    st.session_state.visualizer = PricingVisualizer()
if 'report_generator' not in st.session_state:
    st.session_state.report_generator = ReportGenerator()
if 'analysis_completed' not in st.session_state:
    st.session_state.analysis_completed = False

with st.sidebar:
    st.header("📁 数据导入")
    
    uploaded_file = st.file_uploader("上传数据文件", type=['csv', 'xlsx', 'xls'])
    
    if uploaded_file is not None:
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(uploaded_file.name)[1]) as tmp:
            tmp.write(uploaded_file.getvalue())
            tmp_path = tmp.name
        
        data_source = st.text_input("数据来源", value=uploaded_file.name)
        data_description = st.text_input("数据描述", value="")
        
        if st.button("加载数据"):
            try:
                df, version = st.session_state.data_manager.load_data(
                    tmp_path, 
                    source=data_source,
                    description=data_description
                )
                st.success(f"✅ 数据加载成功！版本: {version.version_id}")
                st.session_state.analysis_completed = False
            except Exception as e:
                st.error(f"❌ 数据加载失败: {str(e)}")
            finally:
                os.unlink(tmp_path)
    
    st.markdown("---")
    st.header("⚙️ 分析设置")
    
    with st.expander("数据清洗参数"):
        iqr_threshold = st.slider("IQR异常值阈值", 1.0, 3.0, 1.5, 0.1)
        min_sample_per_price = st.slider("每价格点最小样本数", 1, 20, 5, 1)
    
    with st.expander("曲线拟合参数"):
        show_all_curves = st.checkbox("显示所有拟合曲线", value=False)
        confidence_level = st.slider("置信水平", 0.90, 0.99, 0.95, 0.01)
    
    with st.expander("分组分析"):
        enable_group_analysis = st.checkbox("启用分组分析", value=True)
        n_groups = st.slider("客户规模分组数", 2, 5, 3, 1)
    
    st.markdown("---")
    st.header("📋 历史版本")
    versions = st.session_state.data_manager.get_versions()
    if versions:
        version_options = [f"{v.version_id} - {v.source} ({v.timestamp.strftime('%Y-%m-%d %H:%M')})" for v in versions]
        selected_version = st.selectbox("选择历史版本", version_options)
        if st.button("加载选中版本"):
            vid = versions[version_options.index(selected_version)].version_id
            df = st.session_state.data_manager.load_version(vid)
            if df is not None:
                st.success(f"✅ 已加载版本 {vid}")
                st.session_state.analysis_completed = False
    else:
        st.info("暂无历史版本")

tabs = st.tabs(["📊 数据概览", "🧹 异常检测", "📈 曲线拟合", "🎯 敏感度分析", "👥 分组对比", "📑 完整报告"])

if st.session_state.data_manager.current_data is not None:
    df = st.session_state.data_manager.current_data
    
    is_valid, issues = st.session_state.data_manager.validate_schema(df)
    
    if not is_valid:
        st.error("❌ 数据格式验证失败:")
        for issue in issues:
            st.write(f"- {issue}")
    else:
        with tabs[0]:
            st.header("数据概览")
            
            col1, col2, col3, col4 = st.columns(4)
            summary = st.session_state.data_manager.get_data_summary()
            with col1:
                st.metric("总记录数", summary['total_rows'])
            with col2:
                st.metric("价格范围", f"{summary['price_range'][0]:.0f} - {summary['price_range'][1]:.0f}")
            with col3:
                st.metric("平均转化率", f"{summary['conversion_rate']:.2%}")
            with col4:
                st.metric("价格档位", summary['unique_prices'])
            
            st.subheader("价格分布")
            fig_price = st.session_state.visualizer.plot_price_conversion_scatter(
                st.session_state.fitter.price_points if st.session_state.fitter and st.session_state.fitter.price_points
                else []
            )
            if not st.session_state.fitter or not st.session_state.fitter.price_points:
                temp_fitter = NonlinearPricingFitter()
                pp = temp_fitter.aggregate_price_points(df, confidence_level)
                fig_price = st.session_state.visualizer.plot_price_conversion_scatter(pp)
            st.plotly_chart(fig_price, use_container_width=True)
            
            st.subheader("原始数据预览")
            st.dataframe(df.head(100), use_container_width=True)
            
            if st.button("开始完整分析", type="primary"):
                with st.spinner("正在进行数据分析..."):
                    cleaner = DataCleaner(
                        iqr_threshold=iqr_threshold,
                        min_sample_per_price=min_sample_per_price
                    )
                    st.session_state.clean_result = cleaner.clean_data(df)
                    
                    fitter = NonlinearPricingFitter()
                    fitter.aggregate_price_points(st.session_state.clean_result.cleaned_data, confidence_level)
                    fitter.fit_all_curves()
                    st.session_state.fitter = fitter
                    
                    sensitivity_analyzer = PriceSensitivityAnalyzer(fitter)
                    sensitivity_analyzer.analyze_sensitivity(include_ci=False)
                    st.session_state.sensitivity_analyzer = sensitivity_analyzer
                    
                    if enable_group_analysis:
                        group_analyzer = GroupAnalyzer(st.session_state.clean_result.cleaned_data)
                        group_analyzer.compare_by_size(n_groups)
                        st.session_state.group_analyzer = group_analyzer
                    else:
                        st.session_state.group_analyzer = None
                    
                    st.session_state.analysis_completed = True
                    st.success("✅ 分析完成！")
                    st.rerun()

        with tabs[1]:
            st.header("异常检测")
            
            if st.session_state.clean_result is None:
                st.info("请先在'数据概览'页面点击'开始完整分析'")
            else:
                cr = st.session_state.clean_result
                
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("原始记录", cr.original_row_count)
                with col2:
                    st.metric("清洗后记录", cr.cleaned_row_count)
                with col3:
                    st.metric("异常记录数", cr.original_row_count - cr.cleaned_row_count)
                
                st.subheader("异常检测结果")
                if cr.anomalies:
                    cleaner = DataCleaner()
                    anomaly_df = cleaner.get_anomaly_summary(cr.anomalies)
                    st.dataframe(anomaly_df, use_container_width=True)
                    
                    st.subheader("异常影响说明")
                    for anomaly in cr.anomalies:
                        with st.expander(f"{anomaly.anomaly_type} ({anomaly.count}条记录)"):
                            st.write(f"**描述**: {anomaly.description}")
                            st.write(f"**影响**: {anomaly.impact}")
                            st.write(f"**影响的记录索引**: {anomaly.affected_indices[:20]}{'...' if len(anomaly.affected_indices) > 20 else ''}")
                else:
                    st.success("✅ 未检测到明显异常")

        with tabs[2]:
            st.header("曲线拟合")
            
            if st.session_state.fitter is None or not st.session_state.fitter.fit_results:
                st.info("请先在'数据概览'页面点击'开始完整分析'")
            else:
                fitter = st.session_state.fitter
                
                st.subheader("拟合结果对比")
                fit_summary = fitter.get_fit_summary()
                st.dataframe(fit_summary, use_container_width=True)
                
                st.subheader("拟合曲线")
                fig_fit = st.session_state.visualizer.plot_fitted_curves(
                    fitter, show_all_curves=show_all_curves
                )
                st.plotly_chart(fig_fit, use_container_width=True)
                
                if fitter.best_fit:
                    st.subheader("最优拟合参数")
                    best_result = fitter.fit_results[fitter.best_fit]
                    col1, col2 = st.columns(2)
                    with col1:
                        st.write(f"**曲线类型**: {best_result.curve_type.value}")
                        st.write(f"**R²**: {best_result.r_squared:.4f}")
                        st.write(f"**RMSE**: {best_result.rmse:.4f}")
                    with col2:
                        st.write("**参数值**:")
                        for name, value in best_result.parameters.items():
                            st.write(f"- {name}: {value:.4f}")
                
                if fitter.best_fit:
                    st.subheader("残差分析")
                    fig_resid = st.session_state.visualizer.plot_residual_analysis(fitter)
                    st.plotly_chart(fig_resid, use_container_width=True)

        with tabs[3]:
            st.header("价格敏感度分析")
            
            if st.session_state.sensitivity_analyzer is None or st.session_state.sensitivity_analyzer.sensitivity_result is None:
                st.info("请先在'数据概览'页面点击'开始完整分析'")
            else:
                sa = st.session_state.sensitivity_analyzer
                sr = sa.sensitivity_result
                
                col1, col2 = st.columns(2)
                with col1:
                    st.metric("最敏感价格点", f"{sr.most_sensitive_price:.2f}")
                with col2:
                    st.metric("最不敏感价格点", f"{sr.least_sensitive_price:.2f}")
                
                st.subheader("敏感度图表")
                fig_sens = st.session_state.visualizer.plot_sensitivity_analysis(sr)
                st.plotly_chart(fig_sens, use_container_width=True)
                
                st.subheader("关键洞察")
                insights = sa.get_key_insights()
                for key, value in insights.items():
                    st.write(f"**{key}**: {value}")
                
                st.subheader("敏感度明细")
                sens_df = sa.get_sensitivity_summary()
                st.dataframe(sens_df, use_container_width=True)

        with tabs[4]:
            st.header("分组对比分析")
            
            if st.session_state.group_analyzer is None or st.session_state.group_analyzer.comparison_result is None:
                st.info("请先在'数据概览'页面启用分组分析并点击'开始完整分析'")
            else:
                ga = st.session_state.group_analyzer
                gr = ga.comparison_result
                
                st.subheader("分组对比图表")
                fig_group = st.session_state.visualizer.plot_group_comparison(gr)
                st.plotly_chart(fig_group, use_container_width=True)
                
                st.subheader("分组统计概览")
                groups_df = ga.get_groups_summary()
                st.dataframe(groups_df, use_container_width=True)
                
                st.subheader("分组曲线参数")
                params_df = ga.get_group_curve_parameters()
                if not params_df.empty:
                    st.dataframe(params_df, use_container_width=True)
                
                st.subheader("主要差异")
                for diff in gr.key_differences:
                    with st.expander(diff['指标']):
                        st.write(diff['描述'])
                
                if not gr.statistical_tests.empty:
                    st.subheader("统计显著性检验")
                    st.dataframe(gr.statistical_tests, use_container_width=True)

        with tabs[5]:
            st.header("完整分析报告")
            
            if not st.session_state.analysis_completed:
                st.info("请先在'数据概览'页面点击'开始完整分析'以生成报告")
            else:
                report_data = st.session_state.report_generator.generate_full_report(
                    data_manager=st.session_state.data_manager,
                    clean_result=st.session_state.clean_result,
                    fitter=st.session_state.fitter,
                    sensitivity_analyzer=st.session_state.sensitivity_analyzer,
                    group_result=st.session_state.group_analyzer.comparison_result if st.session_state.group_analyzer else None,
                    report_name=f"定价分析报告_{datetime.now().strftime('%Y%m%d')}"
                )
                
                st.subheader("📋 报告摘要")
                
                col1, col2 = st.columns(2)
                with col1:
                    st.write(f"**报告名称**: {report_data['report_info']['name']}")
                    st.write(f"**生成时间**: {report_data['report_info']['generated_at']}")
                    st.write(f"**数据版本**: {report_data['report_info']['data_version']}")
                    st.write(f"**数据来源**: {report_data['report_info']['data_source']}")
                
                with col2:
                    ds = report_data['data_summary']
                    st.write(f"**总记录数**: {ds['original_rows']}")
                    st.write(f"**有效记录数**: {ds['cleaned_rows']}")
                    st.write(f"**最优曲线**: {report_data['curve_fitting']['best_fit_curve']}")
                    if st.session_state.fitter and st.session_state.fitter.best_fit:
                        best_r2 = st.session_state.fitter.fit_results[st.session_state.fitter.best_fit].r_squared
                        st.write(f"**拟合优度 R²**: {best_r2:.4f}")
                
                st.markdown("---")
                st.subheader("📈 关键结论")
                
                col1, col2, col3 = st.columns(3)
                
                with col1:
                    st.info("💡 **最优价格区间**")
                    if st.session_state.fitter and st.session_state.fitter.best_fit:
                        optimal = st.session_state.fitter.get_optimal_price_range()
                        st.write(f"最高转化率价格: {optimal['corresponding_price']:.2f}")
                        st.write(f"最高转化率: {optimal['max_conversion']:.2%}")
                
                with col2:
                    st.warning("⚠️ **高敏感价格区间**")
                    if st.session_state.sensitivity_analyzer and st.session_state.sensitivity_analyzer.sensitivity_result:
                        thr = st.session_state.sensitivity_analyzer.sensitivity_result.sensitivity_thresholds
                        st.write(f"{thr['高敏感'][0]:.2f} - {thr['高敏感'][1]:.2f}")
                        st.write("此区间调价需谨慎")
                
                with col3:
                    st.success("✅ **低敏感价格区间**")
                    if st.session_state.sensitivity_analyzer and st.session_state.sensitivity_analyzer.sensitivity_result:
                        thr = st.session_state.sensitivity_analyzer.sensitivity_result.sensitivity_thresholds
                        st.write(f"{thr['低敏感'][0]:.2f} - {thr['低敏感'][1]:.2f}")
                        st.write("此区间调价空间较大")
                
                if st.session_state.group_analyzer and st.session_state.group_analyzer.comparison_result:
                    st.markdown("---")
                    st.subheader("👥 分组洞察")
                    for diff in st.session_state.group_analyzer.comparison_result.key_differences:
                        st.write(f"- **{diff['指标']}**: {diff['描述']}")
                
                st.markdown("---")
                st.subheader("📥 报告下载")
                
                col1, col2 = st.columns(2)
                
                with col1:
                    excel_data = st.session_state.report_generator.get_downloadable_excel(report_data)
                    st.download_button(
                        label="📊 下载 Excel 报告",
                        data=excel_data,
                        file_name=f"{report_data['report_info']['name']}.xlsx",
                        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        use_container_width=True
                    )
                
                with col2:
                    import json
                    json_str = json.dumps(report_data, indent=2, ensure_ascii=False, default=str)
                    st.download_button(
                        label="📋 下载 JSON 报告",
                        data=json_str,
                        file_name=f"{report_data['report_info']['name']}.json",
                        mime="application/json",
                        use_container_width=True
                    )

else:
    with tabs[0]:
        st.info("👈 请在左侧上传数据文件开始分析")
        st.markdown("""
        ### 📁 数据格式要求
        
        上传的 CSV 或 Excel 文件需要包含以下列：
        
        | 列名 | 类型 | 说明 |
        |------|------|------|
        | `price` | 数值 | 套餐价格 |
        | `converted` | 0/1 | 是否转化 (1=转化, 0=未转化) |
        | `customer_size` | 数值 | 客户规模指标 |
        
        ### 📊 分析功能
        
        1. **数据概览** - 查看价格分布和原始数据
        2. **异常检测** - 识别异常大客户、折扣记录等
        3. **曲线拟合** - 多种非线性曲线拟合
        4. **敏感度分析** - 识别价格敏感区间
        5. **分组对比** - 按客户规模分组对比
        6. **完整报告** - 导出分析结果
        
        ### 💡 快速开始
        
        点击下方按钮加载示例数据体验分析功能！
        """)
        
        if st.button("加载示例数据", type="primary"):
            with st.spinner("生成示例数据..."):
                np.random.seed(42)
                n_samples = 2000
                
                prices = np.random.choice([29, 49, 79, 99, 149, 199, 249, 299], size=n_samples)
                customer_size = np.random.lognormal(mean=3, sigma=1, size=n_samples).astype(int)
                
                base_conv = 0.6 * np.exp(-0.008 * prices)
                size_effect = 0.001 * (customer_size - customer_size.mean())
                noise = np.random.normal(0, 0.05, size=n_samples)
                conv_prob = np.clip(base_conv + size_effect + noise, 0.05, 0.9)
                
                converted = np.random.binomial(1, conv_prob)
                
                sample_df = pd.DataFrame({
                    'price': prices,
                    'converted': converted,
                    'customer_size': customer_size
                })
                
                sample_path = os.path.join('data', 'sample_data.csv')
                os.makedirs('data', exist_ok=True)
                sample_df.to_csv(sample_path, index=False)
                
                df, version = st.session_state.data_manager.load_data(
                    sample_path,
                    source='示例数据',
                    description='模拟的SaaS定价转化数据'
                )
                
                st.success("✅ 示例数据加载成功！")
                st.rerun()
    
    for tab in tabs[1:]:
        with tab:
            st.info("👈 请先在左侧上传数据文件或加载示例数据")
