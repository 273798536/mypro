import pandas as pd
from datetime import datetime
from typing import Dict, List
import os

class ReportGenerator:
    def __init__(self, processor):
        self.processor = processor
        
    def generate_excel_report(self, output_path: str) -> str:
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            fee_summary = self.processor.aggregate_fees()
            if not fee_summary.empty:
                fee_summary.to_excel(writer, sheet_name='费用汇总', index=False)
            
            conflicts_df = self.processor.get_conflicts_dataframe()
            if not conflicts_df.empty:
                conflicts_df.to_excel(writer, sheet_name='数据冲突', index=False)
            
            for anomaly_type, records in self.processor.anomalies.items():
                if records:
                    df = pd.DataFrame(records)
                    sheet_name = anomaly_type[:31]
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
            
            if self.processor.students_df is not None:
                self.processor.students_df.to_excel(writer, sheet_name='学生名单', index=False)
            
            if self.processor.payments_df is not None:
                self.processor.payments_df.to_excel(writer, sheet_name='缴费流水', index=False)
            
            self._generate_readme_sheet(writer)
            
        return output_path
    
    def _generate_readme_sheet(self, writer):
        readme_data = [
            ['学校代收费退补分析报告'],
            ['生成时间', datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
            [''],
            ['说明：'],
            ['1. 费用汇总：各项目应收实收对比及差额'],
            ['2. 数据冲突：学生名单与缴费流水不一致的记录'],
            ['   - 有名单无缴费：名单中有但未找到缴费记录（排除已取消/转班）'],
            ['   - 有缴费无名单：有缴费但名单中无对应报名'],
            ['   - 金额不一致：应收与实收金额有差异'],
            ['3. 重复缴费：同一学生同一项目多次缴费'],
            ['4. 项目取消退款：因项目取消产生的退款'],
            ['5. 转班记录：学生转班产生的退费或补差'],
            ['6. 补缴记录：学生后续补缴的费用'],
            ['7. 退款记录：其他原因产生的退款'],
            [''],
            ['重要提示：'],
            ['- 所有数据来自同一批原始数据导入'],
            ['- 冲突记录请人工核实后处理'],
            ['- 项目取消退款务必逐一核对，避免遗漏']
        ]
        
        readme_df = pd.DataFrame(readme_data)
        readme_df.to_excel(writer, sheet_name='报告说明', index=False, header=False)
    
    def generate_plain_report(self) -> str:
        report_lines = []
        
        report_lines.append('=' * 60)
        report_lines.append('学校代收费退补分析报告')
        report_lines.append(f'生成时间：{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
        report_lines.append('=' * 60)
        report_lines.append('')
        
        report_lines.append('一、费用归集汇总')
        report_lines.append('-' * 40)
        
        fee_summary = self.processor.aggregate_fees()
        if not fee_summary.empty:
            total_expected = fee_summary['应收金额'].sum()
            total_actual = fee_summary['实收金额'].sum()
            total_diff = total_actual - total_expected
            
            report_lines.append(f'应收费总额：{total_expected:,.2f} 元')
            report_lines.append(f'实际收费总额：{total_actual:,.2f} 元')
            report_lines.append(f'总体差额：{total_diff:,.2f} 元')
            report_lines.append('')
            
            for _, row in fee_summary.iterrows():
                diff = row['实收金额'] - row['应收金额']
                status = '✓' if abs(diff) < 0.01 else ('⚠️ 多收' if diff > 0 else '⚠️ 少收')
                report_lines.append(f"  {row['项目名称']}：")
                report_lines.append(f"    应收：{row['应收金额']:,.2f} 元（{row['应缴人数']}人）")
                report_lines.append(f"    实收：{row['实收金额']:,.2f} 元（{row['缴费人数']}人）")
                report_lines.append(f"    差额：{diff:,.2f} 元 {status}")
                report_lines.append('')
        
        report_lines.append('')
        report_lines.append('二、数据冲突情况')
        report_lines.append('-' * 40)
        
        conflicts = self.processor.conflicts
        if conflicts:
            report_lines.append(f'⚠️  发现 {len(conflicts)} 条数据冲突，请人工核实：')
            report_lines.append('')
            
            for conflict in conflicts:
                report_lines.append(f"【{conflict['类型']}】")
                report_lines.append(f"  学生：{conflict['姓名']}({conflict['学生ID']})")
                report_lines.append(f"  项目：{conflict['项目名称']}")
                report_lines.append(f"  说明：{conflict['说明']}")
                report_lines.append('')
        else:
            report_lines.append('✓ 未发现数据冲突')
            report_lines.append('')
        
        report_lines.append('')
        report_lines.append('三、异常交易明细')
        report_lines.append('-' * 40)
        
        for anomaly_type, records in self.processor.anomalies.items():
            if records:
                report_lines.append(f'')
                report_lines.append(f'【{anomaly_type}】({len(records)}条)')
                report_lines.append('~' * 30)
                
                for record in records:
                    if anomaly_type == '重复缴费':
                        report_lines.append(f"  {record['姓名']} - {record['项目名称']}")
                        report_lines.append(f"    缴费{record['缴费次数']}次，共{record['总金额']}元")
                        report_lines.append(f"    流水号：{record['流水号列表']}")
                    
                    elif anomaly_type == '项目取消退款':
                        report_lines.append(f"  {record['姓名']} - {record['项目名称']}")
                        report_lines.append(f"    退款金额：{record['退款金额']} 元")
                        report_lines.append(f"    退款日期：{record['退款日期']}")
                        report_lines.append(f"    流水号：{record['流水号']}")
                        report_lines.append(f"    备注：{record.get('备注', '')}")
                    
                    elif anomaly_type == '转班记录':
                        action = '补差' if record['变动金额'] > 0 else '退费'
                        report_lines.append(f"  {record['姓名']} - {record['项目名称']}")
                        report_lines.append(f"    {action}金额：{abs(record['变动金额'])} 元")
                        report_lines.append(f"    日期：{record['日期']}")
                        report_lines.append(f"    流水号：{record['流水号']}")
                        report_lines.append(f"    备注：{record.get('备注', '')}")
                    
                    elif anomaly_type == '补缴记录':
                        report_lines.append(f"  {record['姓名']} - {record['项目名称']}")
                        report_lines.append(f"    补缴金额：{record['补缴金额']} 元")
                        report_lines.append(f"    补缴日期：{record['补缴日期']}")
                        report_lines.append(f"    流水号：{record['流水号']}")
                        report_lines.append(f"    备注：{record.get('备注', '')}")
                    
                    elif anomaly_type == '退款记录':
                        report_lines.append(f"  {record['姓名']} - {record['项目名称']}")
                        report_lines.append(f"    退款金额：{record['退款金额']} 元")
                        report_lines.append(f"    退款日期：{record['退款日期']}")
                        report_lines.append(f"    流水号：{record['流水号']}")
                        report_lines.append(f"    备注：{record.get('备注', '')}")
                    
                    report_lines.append('')
        
        report_lines.append('')
        report_lines.append('四、项目取消核对说明')
        report_lines.append('-' * 40)
        report_lines.append('以下是"为什么项目取消没过"的说明（人话版）：')
        report_lines.append('')
        
        canceled_projects = self.processor.anomalies.get('项目取消退款', [])
        if canceled_projects:
            report_lines.append(f'本次共处理 {len(canceled_projects)} 笔项目取消退款：')
            report_lines.append('')
            for cp in canceled_projects:
                report_lines.append(f"  ✓ {cp['姓名']} 的 {cp['项目名称']}")
                report_lines.append(f"    → 已全额退款 {cp['退款金额']} 元（{cp['退款日期']}）")
                report_lines.append(f"    → 流水号：{cp['流水号']}")
                report_lines.append('')
        else:
            report_lines.append('本次没有项目取消退款记录')
            report_lines.append('')
        
        report_lines.append('如果发现"项目取消没过"，可能是以下原因：')
        report_lines.append('  1. 学生名单状态没有改成"已取消"')
        report_lines.append('  2. 退款流水的备注里没有写"取消"字样')
        report_lines.append('  3. 退款金额与应收金额不一致')
        report_lines.append('  4. 只有退款记录，但没有原始缴费记录')
        report_lines.append('')
        
        report_lines.append('=' * 60)
        report_lines.append('报告结束')
        report_lines.append('=' * 60)
        
        return '\n'.join(report_lines)
    
    def save_plain_report(self, output_path: str) -> str:
        report_content = self.generate_plain_report()
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        return output_path
