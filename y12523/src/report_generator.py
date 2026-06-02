from typing import List
from datetime import datetime
from .models import TaxCalculationResult, AnomalyRecord, AnomalyType


class ReportGenerator:
    def __init__(self):
        self.boundary_note = """
【边界校验口径说明】
1. 边界值校验：当应纳税所得额接近税率级距边界（±0.01元）时，自动标记为异常
2. 扣除项校验：标准五险一金扣除项缺失时标记为异常
3. 补录标记：事后补录的扣除项单独标记并说明原因
4. 覆盖保护：历史数据被覆盖时记录旧值和新值，保留版本号
5. 单位校验：收入与扣除项单位不一致时提示
"""
    
    def generate_summary_text(self, results: List[TaxCalculationResult]) -> str:
        total_tax = sum(r.tax_amount for r in results)
        total_income = sum(r.total_income for r in results)
        anomaly_count = sum(len(r.anomalies) for r in results)
        
        report = f"""
{'='*60}
                个人所得税计算报告
{'='*60}

报告生成时间：{datetime.now().strftime('%Y年%m月%d日 %H:%M:%S')}
统计范围：{results[0].year}年{results[0].month}月（如有多个月份请查看明细）
员工人数：{len(results)} 人

【汇总数据】
  总收入合计：{total_income:,.2f} 元
  应缴个税合计：{total_tax:,.2f} 元
  异常记录数：{anomaly_count} 条

{'='*60}
                   员工个税明细
{'='*60}
"""
        for i, result in enumerate(results, 1):
            report += f"""
【{i}. {result.employee_name}（工号：{result.employee_id}）】
  所属月份：{result.year}年{result.month}月
  税前收入：{result.total_income:,.2f} 元
  扣除合计：{result.total_deductions:,.2f} 元（含起征点5000元）
  应纳税所得额：{result.taxable_income:,.2f} 元
  应缴个税：{result.tax_amount:,.2f} 元
  
  计算说明：
"""
            for log in result.calculation_log:
                report += f"    - {log}\n"
            
            if result.anomalies:
                report += f"\n  ⚠️  异常提示（{len(result.anomalies)}条）：\n"
                for anomaly in result.anomalies:
                    report += f"    【{anomaly.anomaly_type.value}】{anomaly.description}\n"
        
        report += f"\n{'='*60}"
        report += self.boundary_note
        return report
    
    def generate_simple_excel_data(self, results: List[TaxCalculationResult]) -> dict:
        normal_data = []
        anomaly_data = []
        
        for result in results:
            income_source = result.source_refs.get("income")
            source_type = income_source.source_type.value if income_source and hasattr(income_source, 'source_type') else "未知"
            row = {
                "员工姓名": result.employee_name,
                "工号": result.employee_id,
                "所属月份": f"{result.year}年{result.month}月",
                "税前收入": round(result.total_income, 2),
                "扣除合计": round(result.total_deductions, 2),
                "应纳税所得额": round(result.taxable_income, 2),
                "应缴个税": round(result.tax_amount, 2),
                "数据来源": source_type
            }
            normal_data.append(row)
            
            for anomaly in result.anomalies:
                anomaly_row = {
                    "异常类型": anomaly.anomaly_type.value,
                    "员工姓名": anomaly.employee_name,
                    "工号": anomaly.employee_id,
                    "所属月份": f"{anomaly.month}月",
                    "异常描述": anomaly.description,
                    "涉及字段": anomaly.related_field,
                    "旧值": anomaly.old_value,
                    "新值": anomaly.new_value,
                    "数据来源": anomaly.source.source_type.value,
                    "发现时间": anomaly.detected_time.strftime('%Y-%m-%d %H:%M:%S')
                }
                anomaly_data.append(anomaly_row)
        
        return {
            "个税明细": normal_data,
            "异常清单": anomaly_data
        }
    
    def generate_forwarding_note(self, results: List[TaxCalculationResult]) -> str:
        total_tax = sum(r.tax_amount for r in results)
        anomaly_count = sum(len(r.anomalies) for r in results)
        
        note = f"""各位好：

附件是{results[0].year}年{results[0].month}月的个税计算结果，共{len(results)}人，个税合计{total_tax:,.2f}元。

【重要说明】
1. 起征点按5000元/月计算
2. 税率表采用最新个人所得税综合所得税率
3. 附件中「异常清单」工作表列出了需要关注的事项，包括：
   - 接近税率边界的数据（请人工复核）
   - 缺失标准扣除项的记录
   - 事后补录的扣除项目
   - 被覆盖的历史数据

如有疑问，请随时联系。

财税助理
{datetime.now().strftime('%Y年%m月%d日')}
"""
        return note


def save_excel_report(data: dict, filepath: str):
    import pandas as pd
    
    with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
        for sheet_name, sheet_data in data.items():
            df = pd.DataFrame(sheet_data)
            df.to_excel(writer, sheet_name=sheet_name, index=False)
