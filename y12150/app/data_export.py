import pandas as pd
import json
from datetime import datetime
from typing import Dict, Any
from pathlib import Path
from sqlalchemy.orm import Session
from .models import AnalysisResult, Inverter
from .config import EXPORT_DIR


def format_inverter_params(params: Dict[str, Any]) -> Dict[str, Any]:
    """
    格式化逆变器参数，确保导出文件、界面、终端摘要一致
    """
    return {
        '逆变器名称': params.get('inverter_name', ''),
        '额定功率(kW)': params.get('rated_power', 0),
        '直流容量(kWp)': params.get('dc_capacity', 0),
        '容配比': f"{params.get('dc_ac_ratio', 0)}:1",
        '最大实际功率(kW)': params.get('max_actual_power', 0),
        '削峰比例(%)': params.get('clipping_ratio', 0),
        '平均效率(%)': params.get('avg_efficiency', 0),
        '削峰时长(分钟)': params.get('clipping_duration_minutes', 0),
        '削峰次数': params.get('clipping_count', 0),
        '温度系数(%/℃)': params.get('temperature_coefficient', 0),
        '额定温度(℃)': params.get('nominal_temp', 0),
        '削峰阈值': params.get('clipping_threshold', 0)
    }


def export_to_csv(result_id: int, db: Session, include_details: bool = True) -> Path:
    """
    导出分析结果为CSV格式
    确保逆变器参数结论与界面一致
    """
    result = db.query(AnalysisResult).filter(AnalysisResult.id == result_id).first()
    if not result:
        raise ValueError(f"分析结果不存在: {result_id}")

    inverter = db.query(Inverter).filter(Inverter.id == result.inverter_id).first()

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"clipping_analysis_{result_id}_{timestamp}.csv"
    filepath = EXPORT_DIR / filename

    with open(filepath, 'w', encoding='utf-8-sig') as f:
        f.write("=== 光伏逆变器削峰分析报告 ===\n")
        f.write(f"导出时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"分析日期: {result.analysis_date.strftime('%Y-%m-%d')}\n")
        f.write(f"场景: {result.scenario}\n")
        f.write(f"状态: {result.status}\n\n")

        f.write("--- 逆变器参数结论 ---\n")
        if result.inverter_params:
            formatted_params = format_inverter_params(result.inverter_params)
            for key, value in formatted_params.items():
                f.write(f"{key},{value}\n")
        f.write("\n")

        f.write("--- 发电量汇总 ---\n")
        f.write("指标,数值,单位\n")
        f.write(f"理论发电量,{result.total_expected_energy:.3f},kWh\n")
        f.write(f"实际发电量,{result.total_actual_energy:.3f},kWh\n")
        f.write(f"损失电量,{result.total_loss_energy:.3f},kWh\n")
        f.write(f"损失率,{result.loss_rate:.2f},%\n\n")

        f.write("--- 损失分项 ---\n")
        f.write("损失类型,电量(kWh),占比(%)\n")
        total_loss = result.total_loss_energy if result.total_loss_energy > 0 else 1
        f.write(f"削峰损失,{result.clipping_loss:.3f},{result.clipping_loss/total_loss*100:.2f}\n")
        f.write(f"温度损失,{result.temperature_loss:.3f},{result.temperature_loss/total_loss*100:.2f}\n")
        f.write(f"限发损失,{result.curtailment_loss:.3f},{result.curtailment_loss/total_loss*100:.2f}\n")
        f.write(f"辐照缺口损失,{result.irradiance_gap_loss:.3f},{result.irradiance_gap_loss/total_loss*100:.2f}\n")
        f.write(f"其他损失,{result.other_loss:.3f},{result.other_loss/total_loss*100:.2f}\n\n")

        f.write("--- 削峰时段 ---\n")
        if result.peak_clipping_periods:
            f.write("开始时间,结束时间,时长(分钟),理论最大功率(kW),实际最大功率(kW),削峰损失(kWh),原因\n")
            for period in result.peak_clipping_periods:
                f.write(f"{period['start_time']},{period['end_time']},{period['duration_minutes']:.1f},"
                        f"{period['max_expected_power']:.3f},{period['max_actual_power']:.3f},"
                        f"{period['clipping_loss']:.3f},{period['cause']}\n")
        else:
            f.write("无削峰时段\n")
        f.write("\n")

        f.write("--- 分析摘要 ---\n")
        f.write(f"{result.summary}\n")

        if include_details and result.power_curve_data:
            f.write("\n--- 功率曲线明细 ---\n")
            f.write("时间,理论功率(kW),实际功率(kW),直流功率(kW),辐照度(W/m²),组件温度(℃)\n")
            curve = result.power_curve_data
            for i, ts in enumerate(curve['timestamps']):
                f.write(f"{ts},{curve['expected_power'][i]:.3f},{curve['actual_power'][i]:.3f},"
                        f"{curve['dc_power'][i]:.3f},{curve['irradiance'][i]:.1f},{curve['module_temp'][i]:.1f}\n")

        if include_details and result.loss_analysis:
            f.write("\n--- 损失明细 ---\n")
            f.write("时间,理论功率(kW),实际功率(kW),损失(kWh),限发中,组件温度(℃),原因\n")
            for detail in result.loss_analysis['details']:
                f.write(f"{detail['timestamp']},{detail['expected']:.3f},{detail['actual']:.3f},"
                        f"{detail['loss']:.3f},{detail['curtailment_active']},{detail['module_temp']:.1f},{detail['cause']}\n")

    return filepath


def export_to_excel(result_id: int, db: Session, include_details: bool = True) -> Path:
    """
    导出分析结果为Excel格式
    确保逆变器参数结论与界面一致
    """
    result = db.query(AnalysisResult).filter(AnalysisResult.id == result_id).first()
    if not result:
        raise ValueError(f"分析结果不存在: {result_id}")

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"clipping_analysis_{result_id}_{timestamp}.xlsx"
    filepath = EXPORT_DIR / filename

    with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
        summary_data = {
            '项目': [
                '分析日期', '场景', '状态',
                '理论发电量(kWh)', '实际发电量(kWh)', '损失电量(kWh)', '损失率(%)',
                '削峰损失(kWh)', '温度损失(kWh)', '限发损失(kWh)', '辐照缺口损失(kWh)', '其他损失(kWh)'
            ],
            '数值': [
                result.analysis_date.strftime('%Y-%m-%d'),
                result.scenario,
                result.status,
                round(result.total_expected_energy, 3),
                round(result.total_actual_energy, 3),
                round(result.total_loss_energy, 3),
                round(result.loss_rate, 2),
                round(result.clipping_loss, 3),
                round(result.temperature_loss, 3),
                round(result.curtailment_loss, 3),
                round(result.irradiance_gap_loss, 3),
                round(result.other_loss, 3)
            ]
        }
        pd.DataFrame(summary_data).to_excel(writer, sheet_name='汇总', index=False)

        if result.inverter_params:
            formatted_params = format_inverter_params(result.inverter_params)
            params_df = pd.DataFrame({
                '参数名称': list(formatted_params.keys()),
                '参数值': list(formatted_params.values())
            })
            params_df.to_excel(writer, sheet_name='逆变器参数', index=False)

        if result.peak_clipping_periods:
            periods_df = pd.DataFrame(result.peak_clipping_periods)
            periods_df.to_excel(writer, sheet_name='削峰时段', index=False)

        if include_details and result.power_curve_data:
            curve_df = pd.DataFrame({
                '时间': result.power_curve_data['timestamps'],
                '理论功率(kW)': result.power_curve_data['expected_power'],
                '实际功率(kW)': result.power_curve_data['actual_power'],
                '直流功率(kW)': result.power_curve_data['dc_power'],
                '辐照度(W/m²)': result.power_curve_data['irradiance'],
                '组件温度(℃)': result.power_curve_data['module_temp']
            })
            curve_df.to_excel(writer, sheet_name='功率曲线', index=False)

        if include_details and result.loss_analysis:
            loss_df = pd.DataFrame(result.loss_analysis['details'])
            loss_df.to_excel(writer, sheet_name='损失明细', index=False)

        summary_df = pd.DataFrame({'摘要': [result.summary]})
        summary_df.to_excel(writer, sheet_name='分析摘要', index=False)

    return filepath


def print_terminal_summary(result: AnalysisResult) -> str:
    """
    生成终端摘要，确保与导出文件、界面参数一致
    """
    lines = []
    lines.append("=" * 60)
    lines.append("光伏逆变器削峰分析报告")
    lines.append("=" * 60)
    lines.append(f"分析ID: {result.id}")
    lines.append(f"分析日期: {result.analysis_date.strftime('%Y-%m-%d')}")
    lines.append(f"场景: {result.scenario}")
    lines.append(f"状态: {result.status}")
    lines.append("")

    if result.inverter_params:
        lines.append("--- 逆变器参数 ---")
        p = result.inverter_params
        lines.append(f"  名称: {p['inverter_name']}")
        lines.append(f"  额定功率: {p['rated_power']} kW")
        lines.append(f"  直流容量: {p['dc_capacity']} kWp")
        lines.append(f"  容配比: {p['dc_ac_ratio']}:1")
        lines.append(f"  最大实际功率: {p['max_actual_power']:.2f} kW")
        lines.append(f"  削峰比例: {p['clipping_ratio']:.2f}%")
        lines.append(f"  平均效率: {p['avg_efficiency']:.2f}%")
        lines.append(f"  削峰时长: {p['clipping_duration_minutes']:.1f} 分钟")
        lines.append(f"  削峰次数: {p['clipping_count']} 次")
        lines.append("")

    lines.append("--- 发电量汇总 ---")
    lines.append(f"  理论发电量: {result.total_expected_energy:.2f} kWh")
    lines.append(f"  实际发电量: {result.total_actual_energy:.2f} kWh")
    lines.append(f"  损失电量: {result.total_loss_energy:.2f} kWh")
    lines.append(f"  损失率: {result.loss_rate:.2f}%")
    lines.append("")

    lines.append("--- 损失分项 ---")
    total = result.total_loss_energy if result.total_loss_energy > 0 else 1
    lines.append(f"  削峰损失: {result.clipping_loss:.2f} kWh ({result.clipping_loss/total*100:.1f}%)")
    lines.append(f"  温度损失: {result.temperature_loss:.2f} kWh ({result.temperature_loss/total*100:.1f}%)")
    lines.append(f"  限发损失: {result.curtailment_loss:.2f} kWh ({result.curtailment_loss/total*100:.1f}%)")
    lines.append(f"  辐照缺口: {result.irradiance_gap_loss:.2f} kWh ({result.irradiance_gap_loss/total*100:.1f}%)")
    lines.append(f"  其他损失: {result.other_loss:.2f} kWh ({result.other_loss/total*100:.1f}%)")
    lines.append("")

    if result.peak_clipping_periods:
        lines.append("--- 削峰时段 ---")
        for i, p in enumerate(result.peak_clipping_periods, 1):
            lines.append(f"  {i}. {p['start_time']} - {p['end_time']}")
            lines.append(f"     时长: {p['duration_minutes']:.0f}分钟, 原因: {p['cause']}")
            lines.append(f"     削峰损失: {p['clipping_loss']:.2f} kWh")
        lines.append("")

    lines.append("--- 分析摘要 ---")
    lines.append(f"  {result.summary}")
    lines.append("=" * 60)

    return "\n".join(lines)
