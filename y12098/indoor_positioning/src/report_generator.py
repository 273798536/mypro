import os
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from typing import Dict
import json


class ReportGenerator:
    def __init__(self, output_dir: str = 'output'):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def generate_complete_report(self, df: pd.DataFrame, clean_stats: Dict, 
                                 anomaly_stats: Dict, fig_3d: go.Figure,
                                 floor_views: Dict[int, go.Figure]) -> str:
        report_html = self._build_html_report(df, clean_stats, anomaly_stats, 
                                              fig_3d, floor_views)
        
        filepath = os.path.join(self.output_dir, 'analysis_report.html')
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(report_html)
        
        print(f"Complete report saved to: {filepath}")
        return filepath
    
    def _build_html_report(self, df: pd.DataFrame, clean_stats: Dict,
                           anomaly_stats: Dict, fig_3d: go.Figure,
                           floor_views: Dict[int, go.Figure]) -> str:
        fig_3d_html = fig_3d.to_html(full_html=False, include_plotlyjs='cdn')
        
        floor_views_html = ''
        for floor, fig in floor_views.items():
            floor_views_html += f'''
            <div class="floor-view">
                <h3>{floor}层平面图</h3>
                {fig.to_html(full_html=False, include_plotlyjs=False)}
            </div>
            '''
        
        html = f'''
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>室内定位信号地图 - 异常分析报告</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: 'Microsoft YaHei', 'SimHei', Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }}
        .container {{
            max-width: 1400px;
            margin: 0 auto;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        .header h1 {{
            font-size: 28px;
            margin-bottom: 10px;
        }}
        .header .subtitle {{
            font-size: 14px;
            opacity: 0.9;
        }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }}
        .stat-card {{
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-left: 4px solid #667eea;
        }}
        .stat-card.warning {{
            border-left-color: #ff6b6b;
        }}
        .stat-card.success {{
            border-left-color: #51cf66;
        }}
        .stat-card.info {{
            border-left-color: #4dabf7;
        }}
        .stat-value {{
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 5px;
        }}
        .stat-value.danger {{
            color: #ff6b6b;
        }}
        .stat-label {{
            font-size: 14px;
            color: #666;
        }}
        .section {{
            background: white;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .section h2 {{
            color: #333;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #eee;
            font-size: 20px;
        }}
        .anomaly-list {{
            list-style: none;
        }}
        .anomaly-item {{
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 8px;
            border-left: 4px solid;
        }}
        .anomaly-item.floor-jump {{
            background: #fff5f5;
            border-color: #ff6b6b;
        }}
        .anomaly-item.beacon {{
            background: #fff9db;
            border-color: #ffd43b;
        }}
        .anomaly-item.drift {{
            background: #f3f0ff;
            border-color: #9775fa;
        }}
        .anomaly-title {{
            font-weight: bold;
            margin-bottom: 5px;
        }}
        .anomaly-desc {{
            color: #666;
            font-size: 14px;
        }}
        .anomaly-meta {{
            margin-top: 8px;
            font-size: 12px;
            color: #999;
        }}
        .legend {{
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            margin-bottom: 15px;
        }}
        .legend-item {{
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        .legend-marker {{
            width: 20px;
            height: 20px;
            border-radius: 3px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            color: white;
        }}
        .screenshot-hint {{
            background: #e3f2fd;
            border: 1px solid #90caf9;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
        }}
        .screenshot-hint strong {{
            color: #1565c0;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }}
        th {{
            background: #f8f9fa;
            font-weight: bold;
        }}
        tr:hover {{
            background: #f8f9fa;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📍 室内定位信号地图 - 异常分析报告</h1>
            <div class="subtitle">物联网工程质量检测 | 楼层串跳检测 | 信标重号 | 轨迹漂移分析</div>
        </div>
        
        <div class="screenshot-hint">
            <strong>📸 截图提示：</strong>
            本报告所有图表均支持截图使用。3D视图可拖动旋转，图例和标注清晰，便于会议演示。
            异常点使用文字标注 + 特殊符号，不依赖颜色区分。
        </div>
        
        <div class="stats-grid">
            <div class="stat-card success">
                <div class="stat-value">{anomaly_stats.get('normal_points', 0)}</div>
                <div class="stat-label">✅ 正常定位点</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-value danger">{anomaly_stats.get('anomaly_points', 0)}</div>
                <div class="stat-label">⚠️ 异常点总数</div>
            </div>
            <div class="stat-card warning">
                <div class="stat-value danger">{anomaly_stats.get('floor_jumps', 0)}</div>
                <div class="stat-label">🚨 楼层串跳</div>
            </div>
            <div class="stat-card info">
                <div class="stat-value">{anomaly_stats.get('beacon_duplicates', 0)}</div>
                <div class="stat-label">🔶 信标重号</div>
            </div>
            <div class="stat-card info">
                <div class="stat-value">{anomaly_stats.get('trajectory_drifts', 0)}</div>
                <div class="stat-label">🔺 轨迹漂移</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{anomaly_stats.get('anomaly_percentage', 0):.1f}%</div>
                <div class="stat-label">异常率</div>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">{clean_stats.get('empty_rows', 0)}</div>
                <div class="stat-label">空行</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{clean_stats.get('comment_rows', 0)}</div>
                <div class="stat-label">备注行</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{clean_stats.get('missing_columns_rows', 0)}</div>
                <div class="stat-label">缺列行</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{clean_stats.get('invalid_value_rows', 0)}</div>
                <div class="stat-label">无效值行</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📊 3D轨迹总览</h2>
            <div class="legend">
                <div class="legend-item">
                    <span class="legend-marker" style="background: #ff0000;">×</span>
                    <span>楼层串跳 (红色X)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-marker" style="background: #ff9900;">◆</span>
                    <span>信标重号 (橙色菱形)</span>
                </div>
                <div class="legend-item">
                    <span class="legend-marker" style="background: #9900ff;">▲</span>
                    <span>轨迹漂移 (紫色三角)</span>
                </div>
            </div>
            {fig_3d_html}
        </div>
        
        <div class="section">
            <h2>🚨 楼层串跳详情</h2>
            {self._build_anomaly_table(anomaly_stats.get('floor_jump_details', []), 'floor_jump')}
        </div>
        
        <div class="section">
            <h2>🔶 信标重号详情</h2>
            {self._build_anomaly_table(anomaly_stats.get('beacon_duplicate_details', []), 'beacon')}
        </div>
        
        <div class="section">
            <h2>🔺 轨迹漂移详情</h2>
            {self._build_anomaly_table(anomaly_stats.get('trajectory_drift_details', []), 'drift')}
        </div>
        
        <div class="section">
            <h2>🗺️ 分层平面图</h2>
            {floor_views_html}
        </div>
        
        <div class="section">
            <h2>📋 坏行记录</h2>
            <p style="color: #666; margin-bottom: 15px;">
                以下数据行已被排除，不参与正常轨迹计算。详细内容请查看 output/ 目录下的 bad_rows.csv 等文件。
            </p>
            {self._build_bad_rows_table(clean_stats)}
        </div>
    </div>
</body>
</html>
        '''
        return html
    
    def _build_anomaly_table(self, anomalies: list, anomaly_type: str) -> str:
        if not anomalies:
            return '<p style="color: #51cf66; padding: 20px; background: #ebfbee; border-radius: 8px;">✅ 未检测到此类异常</p>'
        
        table_class = {
            'floor_jump': 'floor-jump',
            'beacon': 'beacon',
            'drift': 'drift'
        }.get(anomaly_type, '')
        
        html = f'''
        <table>
            <thead>
                <tr>
                    <th>序号</th>
                    <th>原始行号</th>
                    <th>时间戳</th>
                    <th>详细描述</th>
                </tr>
            </thead>
            <tbody>
        '''
        
        for i, anomaly in enumerate(anomalies, 1):
            html += f'''
            <tr class="anomaly-item {table_class}">
                <td>{i}</td>
                <td>{anomaly.get('original_line', 'N/A')}</td>
                <td>{anomaly.get('timestamp', 'N/A'):.1f}s</td>
                <td>{anomaly.get('description', 'N/A')}</td>
            </tr>
            '''
        
        html += '</tbody></table>'
        return html
    
    def _build_bad_rows_table(self, clean_stats: Dict) -> str:
        bad_rows = clean_stats.get('bad_rows_details', [])
        if not bad_rows:
            return '<p style="color: #51cf66;">✅ 无坏行记录</p>'
        
        html = '''
        <table>
            <thead>
                <tr>
                    <th>原始行号</th>
                    <th>类型</th>
                    <th>内容</th>
                </tr>
            </thead>
            <tbody>
        '''
        
        for row in bad_rows[:20]:
            row_type = '空行' if 'empty' in str(row.get('content', '')) else \
                       '备注' if str(row.get('content', '')).startswith('#') else \
                       '缺列' if 'expected_cols' in row else '无效值'
            
            html += f'''
            <tr>
                <td>{row.get('original_line', 'N/A')}</td>
                <td>{row_type}</td>
                <td>{str(row.get('content', ''))[:100]}</td>
            </tr>
            '''
        
        if len(bad_rows) > 20:
            html += f'<tr><td colspan="3" style="text-align: center; color: #999;">... 还有 {len(bad_rows) - 20} 条记录，详见 bad_rows.csv</td></tr>'
        
        html += '</tbody></table>'
        return html
