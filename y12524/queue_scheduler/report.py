import os
import json
import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Dict, Optional
from jinja2 import Environment, FileSystemLoader, select_autoescape

from .models import SimulationResult, QueueConfig
from .errors import MissingDataError


class ReportGenerator:
    def __init__(self, output_dir: str = "output"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

        template_dir = os.path.join(os.path.dirname(__file__), 'templates')
        os.makedirs(template_dir, exist_ok=True)

        self.env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(['html', 'xml'])
        )

    def _generate_summary(self, result: SimulationResult, data_summary: Dict) -> Dict:
        intervals = result.intervals
        if not intervals:
            raise MissingDataError(
                "没有模拟结果可生成报告",
                suggestion="请先运行排队模拟"
            )

        total_offered = sum(i.offered_calls for i in intervals)
        total_answered = sum(i.answered_calls for i in intervals)
        total_abandoned = sum(i.abandoned_calls for i in intervals)

        avg_wait = np.mean([i.avg_wait_time for i in intervals])
        max_wait = max(i.max_wait_time for i in intervals)
        avg_sl = np.mean([i.service_level for i in intervals])
        avg_util = np.mean([i.agent_utilization for i in intervals])

        sl_target_met = sum(1 for i in intervals
                           if i.service_level >= result.config.target_service_level)

        wait_times = np.array(result.wait_time_distribution)
        p50 = np.percentile(wait_times, 50) if len(wait_times) > 0 else 0
        p80 = np.percentile(wait_times, 80) if len(wait_times) > 0 else 0
        p95 = np.percentile(wait_times, 95) if len(wait_times) > 0 else 0

        return {
            "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "period": f"{intervals[0].interval_start.strftime('%Y-%m-%d')} "
                     f"{intervals[0].interval_start.strftime('%H:%M')} - "
                     f"{intervals[-1].interval_end.strftime('%H:%M')}",
            "config": {
                "target_service_level": f"{result.config.target_service_level * 100:.0f}%",
                "target_wait_seconds": f"{result.config.target_wait_seconds:.0f}秒",
                "max_abandon_rate": f"{result.config.max_abandon_rate * 100:.1f}%",
                "sim_iterations": result.config.sim_iterations,
            },
            "metrics": {
                "total_offered": total_offered,
                "total_answered": total_answered,
                "total_abandoned": total_abandoned,
                "abandon_rate": f"{total_abandoned / total_offered * 100:.1f}%" if total_offered > 0 else "0%",
                "avg_wait_seconds": f"{avg_wait:.1f}秒",
                "max_wait_seconds": f"{max_wait:.1f}秒",
                "avg_service_level": f"{avg_sl * 100:.1f}%",
                "avg_agent_utilization": f"{avg_util * 100:.1f}%",
                "intervals_met_target": f"{sl_target_met}/{len(intervals)}",
                "p50_wait": f"{p50:.1f}秒",
                "p80_wait": f"{p80:.1f}秒",
                "p95_wait": f"{p95:.1f}秒",
            },
            "recommendations": self._generate_recommendations(result),
            "data_sources": data_summary.get('数据来源', {}),
            "agent_config_note": self._generate_agent_config_note(result),
        }

    def _generate_recommendations(self, result: SimulationResult) -> List[str]:
        recommendations = []
        intervals = result.intervals
        config = result.config

        low_sl_intervals = [i for i in intervals
                           if i.service_level < config.target_service_level]

        if low_sl_intervals:
            worst_interval = max(low_sl_intervals, key=lambda x: x.avg_wait_time)
            recommendations.append(
                f"⚠️  共有 {len(low_sl_intervals)} 个时段服务水平未达标，"
                f"最严重时段为 {worst_interval.interval_start.strftime('%H:%M')}，"
                f"服务水平仅 {worst_interval.service_level * 100:.1f}%"
            )

        high_util_intervals = [i for i in intervals if i.agent_utilization > 0.9]
        if high_util_intervals:
            recommendations.append(
                f"💡 有 {len(high_util_intervals)} 个时段坐席利用率超过90%，"
                f"建议增加备用坐席以防突发来电"
            )

        long_wait_intervals = [i for i in intervals
                              if i.avg_wait_time > config.target_wait_seconds * 2]
        if long_wait_intervals:
            avg_extra = np.mean([i.avg_wait_time for i in long_wait_intervals])
            recommendations.append(
                f"⏰ 有 {len(long_wait_intervals)} 个时段平均等待超过目标的2倍，"
                f"平均等待 {avg_extra:.0f}秒，建议每时段增加1-2个坐席"
            )

        overstaffed_intervals = [i for i in intervals
                                if i.agent_utilization < 0.3 and i.offered_calls > 0]
        if overstaffed_intervals:
            recommendations.append(
                f"📊 有 {len(overstaffed_intervals)} 个时段坐席利用率低于30%，"
                f"可考虑安排培训或其他行政工作提高效率"
            )

        if not recommendations:
            recommendations.append("✅ 当前排班方案表现良好，所有指标均达到目标")

        return recommendations

    def _generate_agent_config_note(self, result: SimulationResult) -> str:
        config = result.config
        intervals = result.intervals

        if not intervals:
            return ""

        max_agents = max(i.num_agents for i in intervals)
        min_agents = min(i.num_agents for i in intervals)
        avg_agents = np.mean([i.num_agents for i in intervals])

        total_agent_hours = sum(
            (i.interval_end - i.interval_start).total_seconds() / 3600 * i.num_agents
            for i in intervals
        )

        note = (
            f"📋 坐席配置口径说明：\n"
            f"• 服务水平目标：{config.target_service_level * 100:.0f}% 的电话在 {config.target_wait_seconds:.0f}秒内接听\n"
            f"• 坐席数量范围：{min_agents:.0f} - {max_agents:.0f} 人，平均 {avg_agents:.1f} 人\n"
            f"• 总计坐席工时：{total_agent_hours:.1f} 人·小时\n"
            f"• 模拟假设：通话时长服从指数分布，到达服从泊松分布，客户等待超过3分钟可能放弃\n"
            f"• 数据来源：基于历史来电规律和节假日调整系数计算"
        )
        return note

    def export_to_excel(self, result: SimulationResult, data_summary: Dict,
                        filename: str = "simulation_report.xlsx") -> str:
        filepath = os.path.join(self.output_dir, filename)

        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            summary = self._generate_summary(result, data_summary)

            summary_df = pd.DataFrame([
                {"项目": "统计时段", "数值": summary['period']},
                {"项目": "总来电量", "数值": summary['metrics']['total_offered']},
                {"项目": "总接听量", "数值": summary['metrics']['total_answered']},
                {"项目": "总放弃量", "数值": summary['metrics']['total_abandoned']},
                {"项目": "放弃率", "数值": summary['metrics']['abandon_rate']},
                {"项目": "平均等待时间", "数值": summary['metrics']['avg_wait_seconds']},
                {"项目": "最大等待时间", "数值": summary['metrics']['max_wait_seconds']},
                {"项目": "P50等待时间", "数值": summary['metrics']['p50_wait']},
                {"项目": "P80等待时间", "数值": summary['metrics']['p80_wait']},
                {"项目": "P95等待时间", "数值": summary['metrics']['p95_wait']},
                {"项目": "平均服务水平", "数值": summary['metrics']['avg_service_level']},
                {"项目": "平均坐席利用率", "数值": summary['metrics']['avg_agent_utilization']},
                {"项目": "达标时段数", "数值": summary['metrics']['intervals_met_target']},
                {"项目": "生成时间", "数值": summary['generated_at']},
            ])
            summary_df.to_excel(writer, sheet_name='概要', index=False)

            detail_df = result.to_dataframe()
            detail_df.to_excel(writer, sheet_name='时段明细', index=False)

            config_df = pd.DataFrame([
                {"参数": "目标服务水平", "数值": summary['config']['target_service_level']},
                {"参数": "目标等待时间", "数值": summary['config']['target_wait_seconds']},
                {"参数": "最大放弃率", "数值": summary['config']['max_abandon_rate']},
                {"参数": "模拟迭代次数", "数值": summary['config']['sim_iterations']},
            ])
            config_df.to_excel(writer, sheet_name='配置参数', index=False)

            rec_df = pd.DataFrame({"优化建议": summary['recommendations']})
            rec_df.to_excel(writer, sheet_name='优化建议', index=False)

            note_df = pd.DataFrame({"说明": [summary['agent_config_note']]})
            note_df.to_excel(writer, sheet_name='坐席配置口径', index=False)

        return filepath

    def export_to_csv(self, result: SimulationResult,
                      filename: str = "simulation_details.csv") -> str:
        filepath = os.path.join(self.output_dir, filename)
        df = result.to_dataframe()
        df.to_csv(filepath, index=False, encoding='utf-8-sig')
        return filepath

    def export_to_json(self, result: SimulationResult, data_summary: Dict,
                       filename: str = "simulation_report.json") -> str:
        filepath = os.path.join(self.output_dir, filename)

        summary = self._generate_summary(result, data_summary)
        intervals_data = [i.to_dict() for i in result.intervals]

        full_report = {
            "summary": summary,
            "intervals": intervals_data,
            "wait_time_distribution": {
                "p50": float(np.percentile(result.wait_time_distribution, 50)) if result.wait_time_distribution else 0,
                "p80": float(np.percentile(result.wait_time_distribution, 80)) if result.wait_time_distribution else 0,
                "p95": float(np.percentile(result.wait_time_distribution, 95)) if result.wait_time_distribution else 0,
                "mean": float(np.mean(result.wait_time_distribution)) if result.wait_time_distribution else 0,
                "max": float(np.max(result.wait_time_distribution)) if result.wait_time_distribution else 0,
            }
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(full_report, f, ensure_ascii=False, indent=2)

        return filepath

    def export_to_html(self, result: SimulationResult, data_summary: Dict,
                       charts: Dict[str, str] = None,
                       filename: str = "simulation_report.html") -> str:
        filepath = os.path.join(self.output_dir, filename)

        summary = self._generate_summary(result, data_summary)
        intervals_data = [i.to_dict() for i in result.intervals]

        html_content = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>客服排班分析报告</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
               background: #f5f7fa; color: #2c3e50; line-height: 1.6; }}
        .container {{ max-width: 1400px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #3498db, #2980b9); color: white;
                  padding: 30px; border-radius: 10px; margin-bottom: 20px; }}
        .header h1 {{ font-size: 28px; margin-bottom: 10px; }}
        .header .sub {{ opacity: 0.9; font-size: 14px; }}
        .card {{ background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px;
                 box-shadow: 0 2px 10px rgba(0,0,0,0.05); }}
        .card h2 {{ color: #3498db; margin-bottom: 15px; font-size: 20px;
                   border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; }}
        .metrics-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                         gap: 15px; }}
        .metric {{ background: #f8f9fa; padding: 15px; border-radius: 8px;
                  border-left: 4px solid #3498db; }}
        .metric .label {{ font-size: 12px; color: #7f8c8d; margin-bottom: 5px; }}
        .metric .value {{ font-size: 24px; font-weight: bold; color: #2c3e50; }}
        .metric.success {{ border-left-color: #2ecc71; }}
        .metric.warning {{ border-left-color: #f39c12; }}
        .metric.danger {{ border-left-color: #e74c3c; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
        th, td {{ padding: 10px; text-align: left; border-bottom: 1px solid #ecf0f1; }}
        th {{ background: #f8f9fa; font-weight: 600; color: #34495e; }}
        tr:hover {{ background: #f8f9fa; }}
        .sl-good {{ color: #2ecc71; font-weight: bold; }}
        .sl-bad {{ color: #e74c3c; font-weight: bold; }}
        .recommendations {{ list-style: none; }}
        .recommendations li {{ padding: 10px; margin-bottom: 8px; background: #fff9e6;
                              border-radius: 6px; border-left: 4px solid #f39c12; }}
        .charts {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
                   gap: 20px; }}
        .chart img {{ width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        .chart h3 {{ margin: 10px 0; font-size: 16px; color: #34495e; }}
        .config-note {{ background: #e8f5e9; padding: 15px; border-radius: 8px;
                       border-left: 4px solid #2ecc71; white-space: pre-line; font-size: 14px; }}
        .tag {{ display: inline-block; padding: 3px 10px; border-radius: 12px;
               font-size: 12px; margin-right: 5px; }}
        .tag.green {{ background: #d5f4e6; color: #2ecc71; }}
        .tag.orange {{ background: #feefd6; color: #f39c12; }}
        .tag.red {{ background: #fde2e2; color: #e74c3c; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 客服排班分析报告</h1>
            <div class="sub">
                统计时段：{summary['period']} | 生成时间：{summary['generated_at']}
            </div>
        </div>

        <div class="card">
            <h2>🎯 核心指标</h2>
            <div class="metrics-grid">
                <div class="metric">
                    <div class="label">总来电量</div>
                    <div class="value">{summary['metrics']['total_offered']:,}</div>
                </div>
                <div class="metric">
                    <div class="label">总接听量</div>
                    <div class="value">{summary['metrics']['total_answered']:,}</div>
                </div>
                <div class="metric">
                    <div class="label">放弃率</div>
                    <div class="value">{summary['metrics']['abandon_rate']}</div>
                </div>
                <div class="metric">
                    <div class="label">平均等待时间</div>
                    <div class="value">{summary['metrics']['avg_wait_seconds']}</div>
                </div>
                <div class="metric">
                    <div class="label">最大等待时间</div>
                    <div class="value">{summary['metrics']['max_wait_seconds']}</div>
                </div>
                <div class="metric {'success' if float(summary['metrics']['avg_service_level'].rstrip('%')) >= result.config.target_service_level * 100 else 'danger'}">
                    <div class="label">平均服务水平</div>
                    <div class="value">{summary['metrics']['avg_service_level']}</div>
                </div>
                <div class="metric">
                    <div class="label">达标时段数</div>
                    <div class="value">{summary['metrics']['intervals_met_target']}</div>
                </div>
                <div class="metric">
                    <div class="label">平均坐席利用率</div>
                    <div class="value">{summary['metrics']['avg_agent_utilization']}</div>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>⏱️ 等待时间分布</h2>
            <div class="metrics-grid">
                <div class="metric">
                    <div class="label">P50 (中位数)</div>
                    <div class="value">{summary['metrics']['p50_wait']}</div>
                </div>
                <div class="metric">
                    <div class="label">P80 (80%客户)</div>
                    <div class="value">{summary['metrics']['p80_wait']}</div>
                </div>
                <div class="metric">
                    <div class="label">P95 (95%客户)</div>
                    <div class="value">{summary['metrics']['p95_wait']}</div>
                </div>
            </div>
        </div>

        <div class="card">
            <h2>💡 优化建议</h2>
            <ul class="recommendations">
                {''.join(f'<li>{r}</li>' for r in summary['recommendations'])}
            </ul>
        </div>
"""

        if charts:
            html_content += """
        <div class="card">
            <h2>📈 可视化图表</h2>
            <div class="charts">
"""
            for title, chart_path in charts.items():
                if os.path.exists(chart_path):
                    rel_path = os.path.basename(chart_path)
                    html_content += f"""
                <div class="chart">
                    <h3>{title}</h3>
                    <img src="{rel_path}" alt="{title}">
                </div>
"""
            html_content += """
            </div>
        </div>
"""

        html_content += f"""
        <div class="card">
            <h2>📋 时段明细</h2>
            <div style="overflow-x: auto;">
                <table>
                    <thead>
                        <tr>
                            <th>时段</th>
                            <th>坐席数</th>
                            <th>来电数</th>
                            <th>接听数</th>
                            <th>放弃数</th>
                            <th>平均等待</th>
                            <th>最大等待</th>
                            <th>服务水平</th>
                            <th>坐席利用率</th>
                        </tr>
                    </thead>
                    <tbody>
"""

        for row in intervals_data:
            sl_class = 'sl-good' if row['服务水平'] >= result.config.target_service_level * 100 else 'sl-bad'
            util_class = 'sl-good' if row['坐席利用率'] < 90 else 'sl-bad'
            html_content += f"""
                        <tr>
                            <td>{row['时段']}</td>
                            <td><span class="tag orange">{row['坐席数']}人</span></td>
                            <td>{row['来电数']}</td>
                            <td>{row['接听数']}</td>
                            <td>{row['放弃数']}</td>
                            <td>{row['平均等待(秒)']}s</td>
                            <td>{row['最大等待(秒)']}s</td>
                            <td class="{sl_class}">{row['服务水平']}%</td>
                            <td class="{util_class}">{row['坐席利用率']}%</td>
                        </tr>
"""

        html_content += f"""
                    </tbody>
                </table>
            </div>
        </div>

        <div class="card">
            <h2>📝 坐席配置口径说明</h2>
            <div class="config-note">{summary['agent_config_note']}</div>
        </div>

        <div class="card">
            <h2>⚙️ 配置参数</h2>
            <div class="metrics-grid">
                <div class="metric">
                    <div class="label">目标服务水平</div>
                    <div class="value">{summary['config']['target_service_level']}</div>
                </div>
                <div class="metric">
                    <div class="label">目标等待时间</div>
                    <div class="value">{summary['config']['target_wait_seconds']}</div>
                </div>
                <div class="metric">
                    <div class="label">最大放弃率</div>
                    <div class="value">{summary['config']['max_abandon_rate']}</div>
                </div>
                <div class="metric">
                    <div class="label">模拟迭代次数</div>
                    <div class="value">{summary['config']['sim_iterations']}</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
"""

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html_content)

        return filepath

    def export_all(self, result: SimulationResult, data_summary: Dict,
                   charts: Dict[str, str] = None,
                   prefix: str = "simulation") -> Dict[str, str]:
        outputs = {}

        outputs['excel'] = self.export_to_excel(
            result, data_summary, f"{prefix}_report.xlsx"
        )
        outputs['csv'] = self.export_to_csv(
            result, f"{prefix}_details.csv"
        )
        outputs['json'] = self.export_to_json(
            result, data_summary, f"{prefix}_report.json"
        )
        outputs['html'] = self.export_to_html(
            result, data_summary, charts, f"{prefix}_report.html"
        )

        return outputs
