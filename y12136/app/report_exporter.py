from datetime import datetime
from typing import Optional
import pandas as pd
from io import BytesIO
from sqlalchemy.orm import Session

from .crud import generate_efficiency_report
from .schemas import EfficiencyReport


class ReportExporter:
    @staticmethod
    def export_to_excel(
        db: Session,
        start_time: datetime,
        end_time: datetime,
        equipment_id: Optional[str] = None
    ) -> BytesIO:
        report = generate_efficiency_report(db, start_time, end_time, equipment_id)

        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            ReportExporter._write_summary_sheet(writer, report)
            ReportExporter._write_detail_sheet(writer, report)
            ReportExporter._write_condition_summary_sheet(writer, report)

        output.seek(0)
        return output

    @staticmethod
    def _write_summary_sheet(writer: pd.ExcelWriter, report: EfficiencyReport):
        summary_data = {
            '项目': [
                '报告周期',
                '开始时间',
                '结束时间',
                '总记录数',
                '有效记录数',
                '估算记录数',
                '异常记录数',
                '平均COP',
                '平均额定COP',
                '平均偏差率(%)',
                '生成时间'
            ],
            '数值': [
                report.report_period,
                report.start_time.strftime('%Y-%m-%d %H:%M:%S'),
                report.end_time.strftime('%Y-%m-%d %H:%M:%S'),
                report.total_records,
                report.valid_records,
                report.estimated_records,
                report.anomaly_records,
                report.average_cop,
                report.average_rated_cop,
                report.average_deviation,
                report.generated_at.strftime('%Y-%m-%d %H:%M:%S')
            ]
        }
        df_summary = pd.DataFrame(summary_data)
        df_summary.to_excel(writer, sheet_name='汇总', index=False)

    @staticmethod
    def _write_detail_sheet(writer: pd.ExcelWriter, report: EfficiencyReport):
        detail_data = []
        for item in report.items:
            detail_data.append({
                '记录时间': item.record_time.strftime('%Y-%m-%d %H:%M:%S'),
                '设备ID': item.equipment_id,
                '设备名称': item.equipment_name,
                '运行模式': item.operating_mode,
                '工况分组': item.operating_condition_group,
                '室外温度(℃)': item.outdoor_temp,
                '进出水温差(℃)': item.water_temp_diff,
                '流量(m³/h)': item.flow_rate,
                '换热量(kW)': item.heating_capacity,
                '功率消耗(kW)': item.power_consumption,
                'COP': item.cop,
                '额定COP': item.rated_cop,
                '偏差率(%)': item.cop_deviation,
                '是否异常': '是' if item.has_anomaly else '否',
                '是否估算': '是' if item.is_estimated else '否',
                '异常类型': item.anomaly_type,
                '异常说明': item.anomaly_description,
                '计算方式': item.calculation_method,
                '设备档案版本': item.equipment_version
            })

        df_detail = pd.DataFrame(detail_data)
        df_detail.to_excel(writer, sheet_name='明细数据', index=False)

    @staticmethod
    def _write_condition_summary_sheet(writer: pd.ExcelWriter, report: EfficiencyReport):
        condition_data = []
        for group_name, stats in report.operating_condition_summary.items():
            condition_data.append({
                '工况分组': group_name,
                '记录数': stats['count'],
                '平均COP': stats['avg_cop'],
                '异常数': stats['anomaly_count'],
                '异常率(%)': round(stats['anomaly_count'] / stats['count'] * 100, 2) if stats['count'] > 0 else 0
            })

        df_condition = pd.DataFrame(condition_data)
        df_condition.to_excel(writer, sheet_name='工况分组统计', index=False)

    @staticmethod
    def generate_text_report(
        db: Session,
        start_time: datetime,
        end_time: datetime,
        equipment_id: Optional[str] = None
    ) -> str:
        report = generate_efficiency_report(db, start_time, end_time, equipment_id)

        lines = []
        lines.append("=" * 80)
        lines.append("热泵换热效率分析报告")
        lines.append("=" * 80)
        lines.append("")
        lines.append(f"报告周期: {report.report_period}")
        lines.append(f"生成时间: {report.generated_at.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")
        lines.append("-" * 80)
        lines.append("一、运行概览")
        lines.append("-" * 80)
        lines.append(f"  总记录数: {report.total_records}")
        lines.append(f"  有效记录数: {report.valid_records}")
        lines.append(f"  估算记录数: {report.estimated_records}")
        lines.append(f"  异常记录数: {report.anomaly_records}")
        lines.append(f"  平均COP: {report.average_cop}")
        lines.append(f"  平均额定COP: {report.average_rated_cop}")
        lines.append(f"  平均偏差率: {report.average_deviation}%")
        lines.append("")
        lines.append("-" * 80)
        lines.append("二、工况分组统计")
        lines.append("-" * 80)
        for group_name, stats in report.operating_condition_summary.items():
            anomaly_rate = round(stats['anomaly_count'] / stats['count'] * 100, 2) if stats['count'] > 0 else 0
            lines.append(f"  {group_name}:")
            lines.append(f"    记录数: {stats['count']}, 平均COP: {stats['avg_cop']}")
            lines.append(f"    异常数: {stats['anomaly_count']}, 异常率: {anomaly_rate}%")
        lines.append("")
        lines.append("-" * 80)
        lines.append("三、详细数据")
        lines.append("-" * 80)
        lines.append(
            f"{'记录时间':<20} {'设备':<15} {'模式':<6} {'工况':<10} "
            f"{'室外温':<8} {'温差':<8} {'流量':<8} {'COP':<8} "
            f"{'额定COP':<10} {'偏差':<8} {'异常':<6} {'估算':<6}"
        )
        lines.append("-" * 120)

        for item in report.items:
            lines.append(
                f"{item.record_time.strftime('%m-%d %H:%M'):<20} "
                f"{item.equipment_name:<15} "
                f"{item.operating_mode:<6} "
                f"{item.operating_condition_group:<10} "
                f"{f'{item.outdoor_temp:.1f}':<8} "
                f"{f'{item.water_temp_diff:.1f}':<8} "
                f"{f'{item.flow_rate:.1f}':<8} "
                f"{f'{item.cop:.3f}':<8} "
                f"{f'{item.rated_cop:.3f}' if item.rated_cop else '-':<10} "
                f"{f'{item.cop_deviation:.1f}%' if item.cop_deviation else '-':<8} "
                f"{'是' if item.has_anomaly else '否':<6} "
                f"{'是' if item.is_estimated else '否':<6}"
            )
            if item.anomaly_description:
                lines.append(f"  异常说明: [{item.anomaly_type}] {item.anomaly_description}")
            if item.calculation_method:
                lines.append(f"  计算方式: {item.calculation_method} (设备档案版本: v{item.equipment_version})")
            lines.append("")

        lines.append("=" * 80)
        lines.append("报告结束")
        lines.append("=" * 80)

        return "\n".join(lines)
