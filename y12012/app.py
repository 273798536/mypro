import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.data_processor import FeeDataProcessor
from src.report_generator import ReportGenerator

st.set_page_config(
    page_title='学校代收费退补分析看板',
    page_icon='💰',
    layout='wide'
)

def init_session_state():
    if 'processor' not in st.session_state:
        st.session_state.processor = None
    if 'data_loaded' not in st.session_state:
        st.session_state.data_loaded = False

def load_data(students_file, payments_file):
    students_path = 'data/temp_students.csv'
    payments_path = 'data/temp_payments.csv'
    
    with open(students_path, 'wb') as f:
        f.write(students_file.getbuffer())
    with open(payments_path, 'wb') as f:
        f.write(payments_file.getbuffer())
    
    processor = FeeDataProcessor()
    processor.process_all(students_path, payments_path)
    st.session_state.processor = processor
    st.session_state.data_loaded = True
    
    os.remove(students_path)
    os.remove(payments_path)
    
    return processor

def load_sample_data():
    processor = FeeDataProcessor()
    processor.process_all('data/students.csv', 'data/payments.csv')
    st.session_state.processor = processor
    st.session_state.data_loaded = True
    return processor

def main():
    init_session_state()
    
    st.title('💰 学校代收费退补分析看板')
    st.markdown('---')
    
    with st.sidebar:
        st.header('📁 数据导入')
        
        use_sample = st.checkbox('使用示例数据', value=True)
        
        if use_sample:
            if st.button('加载示例数据', type='primary'):
                load_sample_data()
                st.success('示例数据已加载！')
        else:
            students_file = st.file_uploader('上传学生名单 (CSV)', type=['csv'])
            payments_file = st.file_uploader('上传缴费流水 (CSV)', type=['csv'])
            
            if students_file and payments_file:
                if st.button('开始分析', type='primary'):
                    load_data(students_file, payments_file)
                    st.success('数据分析完成！')
        
        st.markdown('---')
        st.header('📊 快捷导航')
        page = st.radio(
            '选择页面',
            ['📈 总览仪表盘', '⚠️ 数据冲突', '🔍 异常追踪', 
             '📋 费用明细', '📑 生成报告']
        )
        
        st.markdown('---')
        st.caption(f'数据处理时间：{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    
    if not st.session_state.data_loaded:
        st.info('👈 请在左侧选择数据来源并加载数据开始分析')
        st.markdown('### 功能说明')
        st.markdown("""
        - **总览仪表盘**：费用归集整体情况
        - **数据冲突**：学生名单与缴费流水不一致的记录
        - **异常追踪**：重复缴费、项目取消、转班补差等
        - **费用明细**：按学生或项目查看详细记录
        - **生成报告**：导出 Excel 或文本报告
        """)
        return
    
    processor = st.session_state.processor
    
    if page == '📈 总览仪表盘':
        show_dashboard(processor)
    elif page == '⚠️ 数据冲突':
        show_conflicts(processor)
    elif page == '🔍 异常追踪':
        show_anomalies(processor)
    elif page == '📋 费用明细':
        show_details(processor)
    elif page == '📑 生成报告':
        show_reports(processor)

def show_dashboard(processor):
    st.header('📈 费用归集总览')
    
    fee_summary = processor.aggregate_fees()
    
    col1, col2, col3, col4 = st.columns(4)
    
    total_expected = fee_summary['应收金额'].sum()
    total_actual = fee_summary['实收金额'].sum()
    total_diff = total_actual - total_expected
    project_count = len(fee_summary)
    
    col1.metric('应收费总额', f'{total_expected:,.2f} 元')
    col2.metric('实际收费', f'{total_actual:,.2f} 元')
    col3.metric('总体差额', f'{total_diff:,.2f} 元', 
                delta=f'{total_diff:,.2f}' if total_diff != 0 else '平衡')
    col4.metric('项目数量', f'{project_count} 个')
    
    st.markdown('---')
    
    col_a, col_b = st.columns(2)
    
    with col_a:
        st.subheader('各项目应收实收对比')
        fig = go.Figure()
        fig.add_trace(go.Bar(
            name='应收金额',
            x=fee_summary['项目名称'],
            y=fee_summary['应收金额'],
            marker_color='lightgray'
        ))
        fig.add_trace(go.Bar(
            name='实收金额',
            x=fee_summary['项目名称'],
            y=fee_summary['实收金额'],
            marker_color='steelblue'
        ))
        fig.update_layout(barmode='group', height=400)
        st.plotly_chart(fig, use_container_width=True)
    
    with col_b:
        st.subheader('差额分析')
        diff_df = fee_summary.copy()
        diff_df['状态'] = diff_df['差额'].apply(
            lambda x: '多收' if x > 0.01 else ('少收' if x < -0.01 else '平衡')
        )
        fig = px.bar(diff_df, x='项目名称', y='差额', color='状态',
                     color_discrete_map={'多收': 'red', '少收': 'orange', '平衡': 'green'},
                     height=400)
        st.plotly_chart(fig, use_container_width=True)
    
    st.markdown('---')
    st.subheader('费用汇总表')
    display_df = fee_summary.copy()
    display_df = display_df.round(2)
    st.dataframe(display_df, use_container_width=True)
    
    st.markdown('---')
    col_c, col_d, col_e, col_f = st.columns(4)
    
    conflicts_count = len(processor.conflicts)
    duplicate_count = len(processor.anomalies.get('重复缴费', []))
    cancel_count = len(processor.anomalies.get('项目取消退款', []))
    transfer_count = len(processor.anomalies.get('转班记录', []))
    
    col_c.metric('数据冲突', f'{conflicts_count} 条', 
                 delta='需要关注' if conflicts_count > 0 else '正常',
                 delta_color='inverse')
    col_d.metric('重复缴费', f'{duplicate_count} 笔')
    col_e.metric('项目取消退款', f'{cancel_count} 笔')
    col_f.metric('转班记录', f'{transfer_count} 条')

def show_conflicts(processor):
    st.header('⚠️ 数据冲突检测')
    st.info('这里列出学生名单和缴费流水不一致的记录，**请务必人工核实**，不要自动选一边')
    
    conflicts_df = processor.get_conflicts_dataframe()
    
    if conflicts_df.empty:
        st.success('🎉 未发现数据冲突！')
        return
    
    conflict_types = conflicts_df['类型'].unique()
    selected_type = st.selectbox('筛选冲突类型', ['全部'] + list(conflict_types))
    
    if selected_type != '全部':
        conflicts_df = conflicts_df[conflicts_df['类型'] == selected_type]
    
    st.markdown(f'共发现 **{len(conflicts_df)}** 条冲突记录')
    
    for idx, row in conflicts_df.iterrows():
        with st.expander(f"【{row['类型']}】{row['姓名']} - {row['项目名称']}", expanded=True):
            col1, col2 = st.columns(2)
            with col1:
                st.markdown('#### 📋 学生名单')
                st.write(f"**学生ID：** {row['学生ID']}")
                st.write(f"**姓名：** {row['姓名']}")
                st.write(f"**项目：** {row['项目名称']}")
                if '应收金额' in row:
                    st.write(f"**应收金额：** {row['应收金额']} 元")
                st.write(f"**状态：** {row['学生名单状态']}")
            
            with col2:
                st.markdown('#### 💳 缴费流水')
                st.write(f"**学生ID：** {row['学生ID']}")
                st.write(f"**姓名：** {row['姓名']}")
                st.write(f"**项目：** {row['项目名称']}")
                if '实缴金额' in row:
                    st.write(f"**实缴金额：** {row['实缴金额']} 元")
                elif '缴费金额' in row:
                    st.write(f"**缴费金额：** {row['缴费金额']} 元")
                st.write(f"**状态：** {row['缴费流水状态']}")
            
            st.warning(f"📝 说明：{row['说明']}")
            st.markdown('---')
    
    st.markdown('### 冲突处理建议')
    st.markdown("""
    1. **有名单无缴费**：核实学生是否确实未缴费，或缴费记录是否遗漏
    2. **有缴费无名单**：核实是否漏登学生报名信息
    3. **金额不一致**：检查是否有分期缴费、补缴、减免等情况
    """)

def show_anomalies(processor):
    st.header('🔍 异常交易追踪')
    
    tabs = st.tabs(['重复缴费', '项目取消退款', '转班记录', '补缴记录', '退款记录'])
    
    with tabs[0]:
        show_anomaly_table(processor, '重复缴费', '🔄')
    
    with tabs[1]:
        st.subheader('项目取消退款')
        st.warning('⚠️ 项目取消一漏掉，后面基本就要返工！请务必逐一核对')
        show_anomaly_table(processor, '项目取消退款', '❌')
        
        st.markdown('---')
        st.markdown('### ❓ "为什么项目取消没过" 常见原因')
        reasons = [
            ('学生名单状态没有改成"已取消"', '需要在学生名单中将该生状态更新为"已取消"'),
            ('退款流水的备注里没有写"取消"字样', '请确保退款备注包含"取消"关键词'),
            ('退款金额与应收金额不一致', '检查是否是部分退款或有其他费用'),
            ('只有退款记录，但没有原始缴费记录', '核实原始缴费是否有记录')
        ]
        for reason, solution in reasons:
            with st.expander(f'🔍 {reason}'):
                st.write(solution)
    
    with tabs[2]:
        show_anomaly_table(processor, '转班记录', '🔀')
    
    with tabs[3]:
        show_anomaly_table(processor, '补缴记录', '➕')
    
    with tabs[4]:
        show_anomaly_table(processor, '退款记录', '💸')

def show_anomaly_table(processor, anomaly_type, icon):
    df = processor.get_anomalies_dataframe(anomaly_type)
    
    if df.empty:
        st.info(f'暂无{anomaly_type}记录')
        return
    
    st.markdown(f'#### {icon} {anomaly_type} ({len(df)} 条)')
    st.dataframe(df, use_container_width=True)
    
    st.markdown('##### 明细查看')
    if '学生ID' in df.columns and '姓名' in df.columns:
        selected_idx = st.selectbox(
            f'选择查看{anomaly_type}详情',
            range(len(df)),
            format_func=lambda x: f"{df.iloc[x]['姓名']} - {df.iloc[x].get('项目名称', '')}"
        )
        record = df.iloc[selected_idx]
        
        st.markdown('---')
        for col in df.columns:
            if col != '说明':
                st.write(f"**{col}：** {record[col]}")
        st.info(f"📝 {record.get('说明', '')}")

def show_details(processor):
    st.header('📋 费用明细查询')
    
    view_type = st.radio('查看方式', ['按学生查询', '按项目查询', '全部缴费记录'])
    
    if view_type == '按学生查询':
        if processor.students_df is not None:
            students = processor.students_df[['学生ID', '姓名']].drop_duplicates()
            student_options = [f"{row['学生ID']} - {row['姓名']}" for _, row in students.iterrows()]
            selected = st.selectbox('选择学生', student_options)
            student_id = selected.split(' - ')[0]
            
            detail = processor.get_student_fee_detail(student_id)
            
            if detail:
                col1, col2, col3 = st.columns(3)
                col1.metric('应缴总额', f"{detail['应缴总额']:,.2f} 元")
                col2.metric('实缴总额', f"{detail['实缴总额']:,.2f} 元")
                diff = detail['实缴总额'] - detail['应缴总额']
                col3.metric('差额', f"{diff:,.2f} 元", 
                           delta=f"{diff:,.2f}" if diff != 0 else '平衡')
                
                st.markdown('#### 报名项目')
                projects_df = pd.DataFrame(detail['报名项目'])
                st.dataframe(projects_df, use_container_width=True)
                
                st.markdown('#### 缴费记录')
                payments_df = pd.DataFrame(detail['缴费记录'])
                st.dataframe(payments_df, use_container_width=True)
    
    elif view_type == '按项目查询':
        fee_summary = processor.aggregate_fees()
        project_options = fee_summary['项目名称'].tolist()
        selected_project = st.selectbox('选择项目', project_options)
        
        project_data = fee_summary[fee_summary['项目名称'] == selected_project].iloc[0]
        
        col1, col2, col3 = st.columns(3)
        col1.metric('应收金额', f"{project_data['应收金额']:,.2f} 元")
        col2.metric('实收金额', f"{project_data['实收金额']:,.2f} 元")
        col3.metric('差额', f"{project_data['差额']:,.2f} 元")
        
        st.markdown('#### 该项目缴费记录')
        project_payments = processor.payments_df[
            processor.payments_df['项目名称'] == selected_project
        ]
        st.dataframe(project_payments, use_container_width=True)
    
    else:
        st.markdown('#### 全部缴费记录')
        st.dataframe(processor.payments_df, use_container_width=True)

def show_reports(processor):
    st.header('📑 报告导出')
    st.success('所有报告都基于同一批数据生成，确保图表、明细、下载文件一致')
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader('📊 Excel 完整报告')
        st.write('包含：费用汇总、冲突记录、异常记录、原始数据等多个工作表')
        
        if st.button('生成 Excel 报告', type='primary'):
            output_path = f'output/代收费退补报告_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
            generator = ReportGenerator(processor)
            generator.generate_excel_report(output_path)
            
            with open(output_path, 'rb') as f:
                st.download_button(
                    label='📥 下载 Excel 报告',
                    data=f,
                    file_name=os.path.basename(output_path),
                    mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
            st.success(f'报告已生成：{output_path}')
    
    with col2:
        st.subheader('📄 文字说明报告')
        st.write('适合非技术同事阅读的纯文本报告，"说人话"版本')
        
        if st.button('生成文字报告', type='primary'):
            generator = ReportGenerator(processor)
            report = generator.generate_plain_report()
            st.text_area('报告预览', report, height=400)
            
            output_path = f'output/代收费退补报告_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt'
            generator.save_plain_report(output_path)
            
            st.download_button(
                label='📥 下载文字报告',
                data=report,
                file_name=os.path.basename(output_path),
                mime='text/plain'
            )
    
    st.markdown('---')
    st.subheader('📋 报告预览')
    generator = ReportGenerator(processor)
    report = generator.generate_plain_report()
    with st.expander('展开查看完整文字报告'):
        st.text(report)

if __name__ == '__main__':
    main()
