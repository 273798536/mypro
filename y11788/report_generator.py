import os
import json
import base64
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
import pandas as pd
from jinja2 import Environment, FileSystemLoader
from config import system_config
from models import (
    Route, Waypoint, CalculationResult, Anomaly, AnomalySeverity,
    AnomalyType
)

class ReportGenerator:
    def __init__(self, output_dir: str = None):
        self.output_dir = output_dir or system_config.OUTPUT_DIR
        os.makedirs(self.output_dir, exist_ok=True)
        
        template_dir = os.path.join(os.path.dirname(__file__), "templates")
        os.makedirs(template_dir, exist_ok=True)
        self.env = Environment(loader=FileSystemLoader(template_dir))
        
        self._ensure_template_exists(template_dir)
    
    def _ensure_template_exists(self, template_dir: str):
        template_path = os.path.join(template_dir, "report_template.html")
        if not os.path.exists(template_path):
            self._create_default_template(template_path)
    
    def _create_default_template(self, template_path: str):
        template_content = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>航线最小燃油规划报告</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
               padding: 20px; background: #f5f5f5; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; margin-bottom: 20px; }
        h2 { color: #34495e; margin: 25px 0 15px; border-left: 4px solid #3498db; padding-left: 10px; }
        h3 { color: #555; margin: 15px 0 10px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .summary-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db; }
        .summary-card .label { font-size: 0.9em; color: #666; }
        .summary-card .value { font-size: 1.5em; font-weight: bold; color: #2c3e50; margin-top: 5px; }
        .critical { border-left-color: #e74c3c !important; }
        .critical .value { color: #e74c3c; }
        .warning { border-left-color: #f39c12 !important; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #34495e; color: white; }
        tr:hover { background: #f8f9fa; }
        .anomaly-critical { background: #fee !important; }
        .anomaly-warning { background: #fff8e1 !important; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; }
        .badge-critical { background: #e74c3c; color: white; }
        .badge-warning { background: #f39c12; color: white; }
        .badge-info { background: #3498db; color: white; }
        .badge-valid { background: #27ae60; color: white; }
        .badge-invalid { background: #e74c3c; color: white; }
        .source-info { font-size: 0.85em; color: #666; font-family: monospace; }
        .chart-container { margin: 20px 0; text-align: center; }
        .chart-container img { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; }
        .data-sources { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .change-history { background: #fff8e1; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 0.9em; }
        .route-order { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 10px 0; }
        .waypoint-badge { background: #3498db; color: white; padding: 5px 12px; border-radius: 15px; font-weight: bold; }
        .arrow { color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <h1>✈️ 航线最小燃油规划报告</h1>
        
        <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <strong>报告编号:</strong> {{ result.result_id }}<br>
            <strong>生成时间:</strong> {{ result.timestamp.strftime('%Y-%m-%d %H:%M:%S') }}<br>
            <strong>计算耗时:</strong> {{ "%.2f"|format(result.calculation_time_ms) }} ms
        </div>
        
        <h2>📊 执行摘要</h2>
        <div class="summary-grid">
            <div class="summary-card">
                <div class="label">总能耗</div>
                <div class="value">{{ "%.1f"|format(route.total_energy_wh) }} Wh</div>
            </div>
            <div class="summary-card">
                <div class="label">总距离</div>
                <div class="value">{{ "%.2f"|format(route.total_distance_m / 1000) }} km</div>
            </div>
            <div class="summary-card">
                <div class="label">总飞行时间</div>
                <div class="value">{{ "%.1f"|format(route.total_flight_time_s / 60) }} min</div>
            </div>
            <div class="summary-card {{ 'critical' if not route.is_valid else '' }}">
                <div class="label">剩余电量</div>
                <div class="value">{{ "%.1f"|format(route.remaining_battery_wh) }} Wh</div>
            </div>
            <div class="summary-card">
                <div class="label">航点数量</div>
                <div class="value">{{ route.waypoint_order|length }}</div>
            </div>
            <div class="summary-card {{ 'warning' if route.anomalies else '' }}">
                <div class="label">异常数量</div>
                <div class="value">{{ route.anomalies|length }}</div>
            </div>
        </div>
        
        <div style="margin: 20px 0;">
            <strong>航线状态:</strong> 
            <span class="badge {{ 'badge-valid' if route.is_valid else 'badge-invalid' }}">
                {{ '✓ 可行' if route.is_valid else '✗ 存在问题' }}
            </span>
        </div>
        
        <h2>🛣️ 最优航线</h2>
        <div class="route-order">
            {% for wp_id in route.waypoint_order %}
                {% set wp = waypoints_by_id.get(wp_id) %}
                <span class="waypoint-badge">{{ loop.index }}. {{ wp.name if wp else wp_id }}</span>
                {% if not loop.last %}<span class="arrow">→</span>{% endif %}
            {% endfor %}
        </div>
        
        {% if charts.route_map %}
        <div class="chart-container">
            <h3>航线地图</h3>
            <img src="data:image/png;base64,{{ charts.route_map }}" alt="航线地图">
        </div>
        {% endif %}
        
        <h3>航段详情</h3>
        <table>
            <tr>
                <th>序号</th>
                <th>起点</th>
                <th>终点</th>
                <th>距离(m)</th>
                <th>地速(m/s)</th>
                <th>航向(°)</th>
                <th>逆风分量(m/s)</th>
                <th>能耗(Wh)</th>
                <th>异常</th>
            </tr>
            {% for seg in route.segments %}
            <tr class="{{ 'anomaly-critical' if seg.anomalies|selectattr('severity', 'equalto', 'critical')|list else '' }}">
                <td>{{ loop.index }}</td>
                <td>{{ waypoints_by_id.get(seg.start_waypoint_id, {}).name if waypoints_by_id.get(seg.start_waypoint_id) else seg.start_waypoint_id }}</td>
                <td>{{ waypoints_by_id.get(seg.end_waypoint_id, {}).name if waypoints_by_id.get(seg.end_waypoint_id) else seg.end_waypoint_id }}</td>
                <td>{{ "%.0f"|format(seg.distance_m) }}</td>
                <td>{{ "%.1f"|format(seg.ground_speed_m_s) }}</td>
                <td>{{ "%.1f"|format(seg.heading_deg) }}</td>
                <td style="color: {{ 'red' if seg.wind_component_m_s > 0 else 'green' }}">
                    {{ "%.1f"|format(seg.wind_component_m_s) }}
                </td>
                <td>{{ "%.2f"|format(seg.energy_used_wh) }}</td>
                <td>{{ seg.anomalies|length }}</td>
            </tr>
            {% endfor %}
        </table>
        
        {% if charts.energy_profile %}
        <div class="chart-container">
            <h3>能耗分析</h3>
            <img src="data:image/png;base64,{{ charts.energy_profile }}" alt="能耗分析">
        </div>
        {% endif %}
        
        <h2>⚠️ 异常报告</h2>
        {% if all_anomalies %}
        <table>
            <tr>
                <th>严重程度</th>
                <th>类型</th>
                <th>描述</th>
                <th>来源位置</th>
                <th>时间</th>
            </tr>
            {% for anomaly in all_anomalies %}
            <tr class="{{ 'anomaly-critical' if anomaly.severity.value == 'critical' else 'anomaly-warning' if anomaly.severity.value == 'warning' else '' }}">
                <td>
                    <span class="badge badge-{{ anomaly.severity.value }}">
                        {{ '严重' if anomaly.severity.value == 'critical' else '警告' if anomaly.severity.value == 'warning' else '信息' }}
                    </span>
                </td>
                <td>{{ anomaly.anomaly_type.value }}</td>
                <td>{{ anomaly.message }}</td>
                <td class="source-info">
                    {% if anomaly.source %}
                        {{ anomaly.source.file_name }}
                        {% if anomaly.source.line_number %}:行{{ anomaly.source.line_number }}{% endif %}
                    {% else %}
                        -
                    {% endif %}
                </td>
                <td>{{ anomaly.timestamp.strftime('%H:%M:%S') }}</td>
            </tr>
            {% endfor %}
        </table>
        
        {% if charts.anomalies %}
        <div class="chart-container">
            <img src="data:image/png;base64,{{ charts.anomalies }}" alt="异常统计">
        </div>
        {% endif %}
        {% else %}
        <p style="color: #27ae60; font-weight: bold;">✓ 无异常检测到</p>
        {% endif %}
        
        <h2>🔍 候选路线对比</h2>
        {% if charts.comparison %}
        <div class="chart-container">
            <img src="data:image/png;base64,{{ charts.comparison }}" alt="路线对比">
        </div>
        {% endif %}
        
        <table>
            <tr>
                <th>排名</th>
                <th>状态</th>
                <th>能耗(Wh)</th>
                <th>距离(km)</th>
                <th>时间(min)</th>
                <th>剩余电量(Wh)</th>
                <th>异常数</th>
            </tr>
            {% for r in candidate_routes[:5] %}
            <tr>
                <td>{{ loop.index }}</td>
                <td><span class="badge {{ 'badge-valid' if r.is_valid else 'badge-invalid' }}">{{ '可行' if r.is_valid else '不可行' }}</span></td>
                <td>{{ "%.1f"|format(r.total_energy_wh) }}</td>
                <td>{{ "%.2f"|format(r.total_distance_m / 1000) }}</td>
                <td>{{ "%.1f"|format(r.total_flight_time_s / 60) }}</td>
                <td>{{ "%.1f"|format(r.remaining_battery_wh) }}</td>
                <td>{{ r.anomalies|length }}</td>
            </tr>
            {% endfor %}
        </table>
        
        <h2>📁 数据来源追踪</h2>
        <div class="data-sources">
            {% for source_path, source_info in result.data_sources.items() %}
            <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px;">
                <strong>{{ source_info.file_name }}</strong> ({{ source_info.file_type }})<br>
                <span class="source-info">
                    文件哈希: {{ source_info.file_hash[:20] }}...<br>
                    导入时间: {{ source_info.import_time }}
                </span>
            </div>
            {% endfor %}
        </div>
        
        {% if result.change_history %}
        <h2>📝 修改历史</h2>
        <div class="change-history">
            {% for change in result.change_history %}
            <div style="margin-bottom: 8px;">
                <strong>{{ change.timestamp }}</strong> - {{ change.description }}<br>
                <span class="source-info">修改人: {{ change.user if change.user else '系统' }}</span>
            </div>
            {% endfor %}
        </div>
        {% endif %}
        
        <div class="footer">
            航线最小燃油规划系统 v{{ result.version }} | 
            报告生成于 {{ result.timestamp.strftime('%Y-%m-%d %H:%M:%S') }}
        </div>
    </div>
</body>
</html>
        """
        with open(template_path, 'w', encoding='utf-8') as f:
            f.write(template_content)
    
    def _image_to_base64(self, image_path: str) -> str:
        if not image_path or not os.path.exists(image_path):
            return ""
        with open(image_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    
    def generate_html_report(
        self,
        result: CalculationResult,
        waypoints: List[Waypoint],
        chart_files: Dict[str, str],
        filename: str = "route_planning_report.html"
    ) -> str:
        template = self.env.get_template("report_template.html")
        
        waypoints_by_id = {wp.waypoint_id: wp for wp in waypoints}
        
        charts_base64 = {}
        for key, path in chart_files.items():
            charts_base64[key] = self._image_to_base64(path)
        
        html_content = template.render(
            result=result,
            route=result.optimal_route,
            candidate_routes=result.candidate_routes,
            all_anomalies=result.all_anomalies,
            waypoints_by_id=waypoints_by_id,
            charts=charts_base64
        )
        
        filepath = os.path.join(self.output_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        return filepath
    
    def generate_csv_summary(
        self,
        result: CalculationResult,
        waypoints: List[Waypoint],
        filename: str = "route_summary.csv"
    ) -> str:
        if not result.optimal_route:
            return ""
        
        wp_map = {wp.waypoint_id: wp for wp in waypoints}
        
        rows = []
        for i, seg in enumerate(result.optimal_route.segments):
            start_wp = wp_map.get(seg.start_waypoint_id)
            end_wp = wp_map.get(seg.end_waypoint_id)
            
            row = {
                'segment_index': i + 1,
                'start_waypoint': start_wp.name if start_wp else seg.start_waypoint_id,
                'end_waypoint': end_wp.name if end_wp else seg.end_waypoint_id,
                'distance_m': round(seg.distance_m, 2),
                'ground_speed_m_s': round(seg.ground_speed_m_s, 2),
                'heading_deg': round(seg.heading_deg, 2),
                'wind_component_m_s': round(seg.wind_component_m_s, 2),
                'flight_time_s': round(seg.flight_time_s, 2),
                'energy_used_wh': round(seg.energy_used_wh, 2),
                'anomalies_count': len(seg.anomalies),
                'anomaly_types': ';'.join([a.anomaly_type.value for a in seg.anomalies])
            }
            rows.append(row)
        
        df = pd.DataFrame(rows)
        filepath = os.path.join(self.output_dir, filename)
        df.to_csv(filepath, index=False, encoding='utf-8-sig')
        
        return filepath
    
    def generate_json_report(
        self,
        result: CalculationResult,
        filename: str = "route_report.json"
    ) -> str:
        def to_dict(obj):
            if hasattr(obj, '__dict__'):
                return {k: to_dict(v) for k, v in obj.__dict__.items() 
                       if not k.startswith('_')}
            elif isinstance(obj, list):
                return [to_dict(item) for item in obj]
            elif isinstance(obj, datetime):
                return obj.isoformat()
            elif hasattr(obj, 'value'):
                return obj.value
            else:
                return obj
        
        report_dict = to_dict(result)
        filepath = os.path.join(self.output_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(report_dict, f, ensure_ascii=False, indent=2)
        
        return filepath
    
    def generate_all_reports(
        self,
        result: CalculationResult,
        waypoints: List[Waypoint],
        chart_files: Dict[str, str]
    ) -> Dict[str, str]:
        report_files = {}
        
        report_files['html'] = self.generate_html_report(
            result, waypoints, chart_files, "route_planning_report.html"
        )
        
        report_files['csv'] = self.generate_csv_summary(
            result, waypoints, "route_summary.csv"
        )
        
        report_files['json'] = self.generate_json_report(
            result, "route_report.json"
        )
        
        return report_files
