from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from datetime import datetime
import json
import os
import numpy as np
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.graphics.shapes import Drawing, Line, String
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics import renderPDF
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io


class ReportExporter:
    def __init__(self, output_dir: str = "data/processed"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate_report_filename(self, prefix: str = "pk_report") -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"{prefix}_{timestamp}"

    def export_to_pdf(self, simulation_result: Dict[str, Any],
                      validation_result: Optional[Dict[str, Any]] = None,
                      pk_parameters: Optional[Dict[str, Any]] = None,
                      sampling_points: Optional[List[Dict[str, Any]]] = None,
                      operation_history: Optional[List[Dict[str, Any]]] = None,
                      data_lineage: Optional[List[Dict[str, Any]]] = None,
                      filename: Optional[str] = None) -> str:
        if filename is None:
            filename = self.generate_report_filename("pk_simulation")
        filepath = os.path.join(self.output_dir, f"{filename}.pdf")

        doc = SimpleDocTemplate(filepath, pagesize=A4,
                               leftMargin=2*cm, rightMargin=2*cm,
                               topMargin=2*cm, bottomMargin=2*cm)

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('CustomTitle',
                                   parent=styles['Heading1'],
                                   fontSize=18,
                                   spaceAfter=12,
                                   textColor=colors.HexColor('#2c3e50'))
        section_style = ParagraphStyle('CustomSection',
                                      parent=styles['Heading2'],
                                      fontSize=14,
                                      spaceAfter=8,
                                      textColor=colors.HexColor('#34495e'))
        normal_style = ParagraphStyle('CustomNormal',
                                     parent=styles['BodyText'],
                                     fontSize=10,
                                     leading=14)
        highlight_style = ParagraphStyle('Highlight',
                                        parent=styles['BodyText'],
                                        fontSize=10,
                                        leading=14,
                                        backColor=colors.HexColor('#fff3cd'))

        story = []

        story.append(Paragraph("药代动力学微分方程模拟报告", title_style))
        story.append(Paragraph(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", normal_style))
        story.append(Paragraph(f"计算哈希: {simulation_result.get('computation_hash', 'N/A')}", normal_style))
        story.append(Spacer(1, 0.5*cm))

        story.append(Paragraph("一、模拟状态", section_style))
        if simulation_result.get('success'):
            status_text = '<font color="green">模拟成功 ✓</font>'
        else:
            status_text = '<font color="red">模拟失败 ✗</font>'
        story.append(Paragraph(f"状态: {status_text}", normal_style))
        story.append(Paragraph(f"求解方法: {simulation_result.get('solver_method', 'N/A')}", normal_style))
        story.append(Paragraph(f"模型类型: {self._translate_model_type(simulation_result.get('model_type', ''))}", normal_style))

        if not simulation_result.get('success') and simulation_result.get('error_message'):
            story.append(Paragraph("错误详情:", highlight_style))
            for line in simulation_result['error_message'].split('\n'):
                story.append(Paragraph(line, normal_style))

        if simulation_result.get('warnings'):
            story.append(Paragraph("警告信息:", highlight_style))
            for warning in simulation_result['warnings']:
                story.append(Paragraph(f"• {warning}", normal_style))
        story.append(Spacer(1, 0.3*cm))

        story.append(Paragraph("二、输入参数", section_style))
        params = simulation_result.get('parameters', {})
        param_data = [['参数名称', '数值', '单位', '说明']]
        param_descriptions = {
            'half_life': ('消除半衰期', 'hours'),
            'vd': ('分布容积', 'L'),
            'vd_per_kg': ('分布容积(按体重)', 'L/kg'),
            'ke': ('消除速率常数', '1/h'),
            'ka': ('吸收速率常数', '1/h'),
            'f': ('生物利用度', 'fraction'),
            'weight': ('体重', 'kg'),
            'v1': ('中央室容积', 'L'),
            'v1_per_kg': ('中央室容积(按体重)', 'L/kg'),
            'k10': ('中央室消除速率', '1/h'),
            'k12': ('中央→周边速率', '1/h'),
            'k21': ('周边→中央速率', '1/h'),
        }
        for key, value in params.items():
            desc, unit = param_descriptions.get(key, (key, ''))
            if isinstance(value, float):
                value_str = f"{value:.4f}"
            else:
                value_str = str(value)
            param_data.append([desc, value_str, unit, ''])
        param_table = Table(param_data, colWidths=[4*cm, 3*cm, 3*cm, 5*cm])
        param_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498db')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8f9fa')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#dee2e6')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f3f5')]),
        ]))
        story.append(param_table)
        story.append(Spacer(1, 0.3*cm))

        story.append(Paragraph("三、给药计划", section_style))
        dosing_plan = simulation_result.get('dosing_plan', {})
        events = dosing_plan.get('events', [])
        route_translation = {
            'iv_bolus': '静脉推注',
            'iv_infusion': '静脉滴注',
            'oral': '口服',
            'sc': '皮下注射',
            'im': '肌肉注射'
        }
        if events:
            dose_data = [['序号', '时间(h)', '剂量(mg)', '给药途径', '持续时间(h)']]
            for i, event in enumerate(events, 1):
                route = route_translation.get(event.get('route', ''), event.get('route', ''))
                duration = event.get('duration', '-') if event.get('route') == 'iv_infusion' else '-'
                dose_data.append([str(i), str(event.get('time', '')),
                                 str(event.get('dose', '')), route, str(duration)])
            dose_table = Table(dose_data, colWidths=[2*cm, 3*cm, 3*cm, 4*cm, 3*cm])
            dose_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#27ae60')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#dee2e6')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f3f5')]),
            ]))
            story.append(dose_table)
        story.append(Spacer(1, 0.3*cm))

        if simulation_result.get('success') and 'time_points' in simulation_result:
            story.append(Paragraph("四、浓度-时间曲线", section_style))
            chart_path = self._generate_concentration_chart(simulation_result, sampling_points)
            if chart_path and os.path.exists(chart_path):
                story.append(Image(chart_path, width=16*cm, height=10*cm))
                story.append(Spacer(1, 0.3*cm))

        if pk_parameters:
            story.append(Paragraph("五、药代动力学参数", section_style))
            pk_data = [['参数', '数值', '单位']]
            pk_descriptions = {
                'c_max': ('峰浓度(Cmax)', 'mg/L'),
                't_max': ('达峰时间(Tmax)', 'h'),
                'auc_0_t': ('AUC(0-t)', 'mg·h/L'),
                'terminal_half_life': ('末端半衰期(t½)', 'h'),
                'clearance': ('清除率(CL)', 'L/h'),
                'volume_of_distribution_ss': ('稳态分布容积(Vss)', 'L'),
            }
            for key, value in pk_parameters.items():
                if key in pk_descriptions and value is not None:
                    desc, unit = pk_descriptions[key]
                    if isinstance(value, float):
                        value_str = f"{value:.4f}"
                    else:
                        value_str = str(value)
                    pk_data.append([desc, value_str, unit])
            pk_table = Table(pk_data, colWidths=[5*cm, 4*cm, 3*cm])
            pk_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#9b59b6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#dee2e6')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f3f5')]),
            ]))
            story.append(pk_table)
            story.append(Spacer(1, 0.3*cm))

        if validation_result and (validation_result.get('issues') or validation_result.get('warnings')):
            story.append(Paragraph("六、参数校验结果", section_style))
            for issue in validation_result.get('issues', []):
                severity = issue.get('severity', 'error')
                color = 'red' if severity == 'error' else 'orange'
                story.append(Paragraph(
                    f'<font color="{color}">●</font> <b>{issue.get("field", "")}</b>: {issue.get("message", "")}',
                    normal_style
                ))
                if issue.get('next_action'):
                    story.append(Paragraph(f'  建议: {issue.get("next_action")}', normal_style))
            for warning in validation_result.get('warnings', []):
                story.append(Paragraph(
                    f'<font color="orange">●</font> <b>{warning.get("field", "")}</b>: {warning.get("message", "")}',
                    normal_style
                ))
            story.append(Spacer(1, 0.3*cm))

        if sampling_points:
            story.append(Paragraph("七、采样点影响分析", section_style))
            impact_analysis = self._analyze_sampling_impact(simulation_result, sampling_points)
            for item in impact_analysis:
                story.append(Paragraph(
                    f"• 采样时间 {item['time']}h: "
                    f"浓度 {item['concentration']:.4f} mg/L, "
                    f"影响程度: {item['impact_level']}",
                    normal_style
                ))
                if item.get('affected_details'):
                    for detail in item['affected_details']:
                        story.append(Paragraph(f"  - {detail}", normal_style))
            story.append(Spacer(1, 0.3*cm))

        if data_lineage:
            story.append(Paragraph("八、数据来源追踪", section_style))
            for item in data_lineage:
                source_icon = '📄' if item.get('is_original') else '🔄'
                story.append(Paragraph(
                    f"{source_icon} <b>{item.get('category', '')}</b> "
                    f"({item.get('source', '')}): {item.get('created_at', '')}",
                    normal_style
                ))
                if item.get('source_info'):
                    for k, v in item['source_info'].items():
                        story.append(Paragraph(f"  {k}: {v}", normal_style))
            story.append(Spacer(1, 0.3*cm))

        if operation_history:
            story.append(Paragraph("九、操作历史", section_style))
            op_data = [['时间', '操作类型', '状态', '触发人', '备注']]
            status_colors = {
                'completed': colors.green,
                'failed': colors.red,
                'validation_error': colors.orange,
                'running': colors.blue,
            }
            for op in operation_history[:10]:
                status = op.get('status', '')
                op_data.append([
                    op.get('timestamp', '')[:19],
                    self._translate_operation_type(op.get('operation_type', '')),
                    status,
                    op.get('triggered_by', 'N/A'),
                    op.get('notes', '')[:30]
                ])
            op_table = Table(op_data, colWidths=[3.5*cm, 3*cm, 2.5*cm, 2.5*cm, 5*cm])
            op_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e67e22')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#dee2e6')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f1f3f5')]),
            ]))
            story.append(op_table)

        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph("--- 报告结束 ---", normal_style))
        story.append(Paragraph("本报告由微分方程药量模拟系统自动生成，计算结果可复现。",
                              ParagraphStyle('Small', parent=styles['BodyText'], fontSize=8, textColor=colors.gray)))

        doc.build(story)
        return filepath

    def _generate_concentration_chart(self, simulation_result: Dict[str, Any],
                                     sampling_points: Optional[List[Dict[str, Any]]] = None) -> Optional[str]:
        try:
            t = np.array(simulation_result.get('time_points', []))
            concentrations = simulation_result.get('concentrations', {})
            if len(t) == 0 or 'central' not in concentrations:
                return None

            c_central = np.array(concentrations['central'])

            fig, ax = plt.subplots(figsize=(10, 6))
            ax.plot(t, c_central, 'b-', linewidth=2, label='中央室浓度')

            if 'peripheral' in concentrations:
                c_peripheral = np.array(concentrations['peripheral'])
                ax.plot(t, c_peripheral, 'r--', linewidth=1.5, label='周边室浓度')

            events = simulation_result.get('dosing_plan', {}).get('events', [])
            for event in events:
                event_time = event.get('time', 0)
                if event_time <= t[-1]:
                    ax.axvline(x=event_time, color='gray', linestyle=':', alpha=0.5)
                    ax.annotate(f"给药\n{event.get('dose', '')}mg",
                               xy=(event_time, ax.get_ylim()[1] * 0.9),
                               ha='center', fontsize=8, color='gray')

            if sampling_points:
                for sp in sampling_points:
                    sp_time = sp.get('time', 0)
                    if sp_time <= t[-1]:
                        idx = np.argmin(np.abs(t - sp_time))
                        sp_conc = c_central[idx]
                        ax.plot(sp_time, sp_conc, 'ro', markersize=8, zorder=5)
                        ax.annotate(f"{sp_time}h\n{sp_conc:.2f}",
                                   xy=(sp_time, sp_conc),
                                   xytext=(10, 10), textcoords='offset points',
                                   fontsize=8, color='red')

            ax.set_xlabel('时间 (hours)', fontsize=12)
            ax.set_ylabel('浓度 (mg/L)', fontsize=12)
            ax.set_title('药物浓度-时间曲线', fontsize=14, fontweight='bold')
            ax.grid(True, alpha=0.3)
            ax.legend(fontsize=10)
            ax.tick_params(axis='both', labelsize=10)

            filepath = os.path.join(self.output_dir, f"chart_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png")
            plt.tight_layout()
            plt.savefig(filepath, dpi=150, bbox_inches='tight')
            plt.close(fig)
            return filepath
        except Exception as e:
            print(f"Error generating chart: {e}")
            return None

    def _analyze_sampling_impact(self, simulation_result: Dict[str, Any],
                                sampling_points: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        t = np.array(simulation_result.get('time_points', []))
        c = np.array(simulation_result.get('concentrations', {}).get('central', []))
        if len(t) == 0 or len(c) == 0:
            return []

        c_max = np.max(c)
        t_max = t[np.argmax(c)]
        auc_total = np.trapz(c, t)

        results = []
        for sp in sampling_points:
            sp_time = sp.get('time', 0)
            idx = np.argmin(np.abs(t - sp_time))
            sp_conc = c[idx]

            conc_ratio = sp_conc / c_max if c_max > 0 else 0
            if conc_ratio > 0.9:
                impact_level = "高 (峰值附近，影响Cmax计算)"
            elif conc_ratio > 0.5:
                impact_level = "中 (吸收/消除相，影响曲线形态)"
            elif conc_ratio > 0.1:
                impact_level = "中 (消除相，影响半衰期计算)"
            else:
                impact_level = "低 (末端消除相，影响较小)"

            affected_details = []
            if abs(sp_time - t_max) < 0.5:
                affected_details.append("该采样点接近达峰时间Tmax，影响峰浓度Cmax的准确测定")
            if sp_time > t[-1] * 0.7:
                affected_details.append("该采样点位于末端消除相，影响末端半衰期的计算")
            if abs(sp_time - t_max) < 2 and abs(sp_conc - c_max) < c_max * 0.1:
                affected_details.append("建议在此时间点附近增加采样以准确捕获峰浓度")

            results.append({
                "time": sp_time,
                "concentration": float(sp_conc),
                "impact_level": impact_level,
                "affected_details": affected_details,
                "concentration_ratio": float(conc_ratio)
            })
        return results

    def export_to_excel(self, simulation_result: Dict[str, Any],
                       pk_parameters: Optional[Dict[str, Any]] = None,
                       filename: Optional[str] = None) -> str:
        if filename is None:
            filename = self.generate_report_filename("pk_simulation")
        filepath = os.path.join(self.output_dir, f"{filename}.xlsx")

        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            t = np.array(simulation_result.get('time_points', []))
            concentrations = simulation_result.get('concentrations', {})
            df_data = {'时间(h)': t}
            for comp, conc in concentrations.items():
                comp_name = '中央室浓度(mg/L)' if comp == 'central' else '周边室浓度(mg/L)'
                df_data[comp_name] = np.array(conc)
            df_conc = pd.DataFrame(df_data)
            df_conc.to_excel(writer, sheet_name='浓度时间数据', index=False)

            if pk_parameters:
                df_pk = pd.DataFrame(list(pk_parameters.items()), columns=['参数', '数值'])
                df_pk['说明'] = df_pk['参数'].map({
                    'c_max': '峰浓度(mg/L)',
                    't_max': '达峰时间(h)',
                    'auc_0_t': 'AUC(0-t)(mg·h/L)',
                    'terminal_half_life': '末端半衰期(h)',
                    'clearance': '清除率(L/h)',
                    'volume_of_distribution_ss': '稳态分布容积(L)',
                })
                df_pk.to_excel(writer, sheet_name='PK参数', index=False)

            params = simulation_result.get('parameters', {})
            df_params = pd.DataFrame(list(params.items()), columns=['参数名称', '数值'])
            df_params.to_excel(writer, sheet_name='输入参数', index=False)

            events = simulation_result.get('dosing_plan', {}).get('events', [])
            if events:
                df_events = pd.DataFrame(events)
                df_events.to_excel(writer, sheet_name='给药计划', index=False)

            summary_data = {
                '项目': ['模拟状态', '模型类型', '求解方法', '计算哈希', '时间点数量',
                        '总模拟时长(h)', '警告数量'],
                '内容': [
                    '成功' if simulation_result.get('success') else '失败',
                    self._translate_model_type(simulation_result.get('model_type', '')),
                    simulation_result.get('solver_method', 'N/A'),
                    simulation_result.get('computation_hash', 'N/A'),
                    len(t),
                    simulation_result.get('dosing_plan', {}).get('total_duration', 'N/A'),
                    len(simulation_result.get('warnings', []))
                ]
            }
            df_summary = pd.DataFrame(summary_data)
            df_summary.to_excel(writer, sheet_name='摘要', index=False)

        return filepath

    def export_to_json(self, simulation_result: Dict[str, Any],
                      validation_result: Optional[Dict[str, Any]] = None,
                      pk_parameters: Optional[Dict[str, Any]] = None,
                      sampling_impact: Optional[List[Dict[str, Any]]] = None,
                      filename: Optional[str] = None) -> str:
        if filename is None:
            filename = self.generate_report_filename("pk_simulation")
        filepath = os.path.join(self.output_dir, f"{filename}.json")

        export_data = {
            "export_metadata": {
                "export_time": datetime.now().isoformat(),
                "system_version": "1.0.0",
                "report_type": "pk_simulation_full"
            },
            "simulation_result": simulation_result,
            "validation_result": validation_result,
            "pk_parameters": pk_parameters,
            "sampling_impact_analysis": sampling_impact
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False, default=str)
        return filepath

    def _translate_model_type(self, model_type: str) -> str:
        translations = {
            'one_compartment': '一室模型',
            'two_compartment': '二室模型'
        }
        return translations.get(model_type, model_type)

    def _translate_operation_type(self, op_type: str) -> str:
        translations = {
            'parameter_import': '参数导入',
            'dosing_plan_import': '给药计划导入',
            'validation': '参数校验',
            'simulation': '模拟计算',
            'report_export': '报告导出',
            'sampling_point_add': '采样点添加',
            'data_import': '数据导入'
        }
        return translations.get(op_type, op_type)
