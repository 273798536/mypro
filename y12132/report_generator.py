"""
报告生成模块
生成分析报告并支持导出
"""
import os
import json
from datetime import datetime
from typing import Dict, List, Any
from jinja2 import Template

from config import Config, REPORT_DIR

class ReportGenerator:
    def __init__(self):
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    def generate_html_report(self, analysis_data: Dict[str, Any], 
                           output_file: str = None) -> str:
        """生成HTML格式的分析报告"""
        if output_file is None:
            output_file = os.path.join(REPORT_DIR, f"bottleneck_report_{self.timestamp}.html")
        
        html_template = self._get_html_template()
        template = Template(html_template)
        
        html_content = template.render(
            report_title="航线网络瓶颈分析报告",
            report_date=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            analysis_data=analysis_data,
            methodology_note=self._get_methodology_note()
        )
        
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(html_content)
        
        print(f"HTML报告已生成: {output_file}")
        return output_file
    
    def generate_json_report(self, analysis_data: Dict[str, Any],
                           output_file: str = None) -> str:
        """生成JSON格式的分析报告"""
        if output_file is None:
            output_file = os.path.join(REPORT_DIR, f"bottleneck_report_{self.timestamp}.json")
        
        report_data = {
            "report_info": {
                "title": "航线网络瓶颈分析报告",
                "generated_at": datetime.now().isoformat(),
                "version": "1.0.0"
            },
            "methodology": self._get_methodology_note(),
            "analysis_data": analysis_data
        }
        
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)
        
        print(f"JSON报告已生成: {output_file}")
        return output_file
    
    def _get_html_template(self) -> str:
        """获取HTML报告模板"""
        return """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ report_title }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; color: #333; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #1e3a5f, #2d5a87); color: white; padding: 30px 40px; }
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 14px; }
        .content { padding: 30px 40px; }
        .section { margin-bottom: 35px; }
        .section-title { font-size: 20px; color: #1e3a5f; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e8eef5; }
        .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .card { background: #f8fafc; border-radius: 8px; padding: 20px; border-left: 4px solid #3b82f6; }
        .card.high { border-left-color: #ef4444; }
        .card.medium { border-left-color: #f59e0b; }
        .card-value { font-size: 32px; font-weight: bold; color: #1e3a5f; }
        .card-label { font-size: 14px; color: #64748b; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f1f5f9; font-weight: 600; color: #475569; }
        tr:hover { background: #f8fafc; }
        .severity-high { color: #dc2626; font-weight: bold; }
        .severity-medium { color: #d97706; font-weight: bold; }
        .methodology { background: #fef3c7; border-radius: 8px; padding: 20px; margin-top: 30px; }
        .methodology h3 { color: #92400e; margin-bottom: 10px; }
        .methodology p { color: #78350f; font-size: 14px; line-height: 1.6; }
        .conflict-item { padding: 10px; background: #fef2f2; border-radius: 6px; margin-bottom: 8px; }
        .conflict-type { font-weight: bold; color: #dc2626; }
        .evidence { font-size: 13px; color: #64748b; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{ report_title }}</h1>
            <p>生成时间: {{ report_date }}</p>
        </div>
        <div class="content">
            <div class="section">
                <h2 class="section-title">数据概览</h2>
                <div class="summary-cards">
                    <div class="card">
                        <div class="card-value">{{ analysis_data.merge_report.summary.total_nodes }}</div>
                        <div class="card-label">节点总数</div>
                    </div>
                    <div class="card">
                        <div class="card-value">{{ analysis_data.merge_report.summary.total_routes }}</div>
                        <div class="card-label">航线条数</div>
                    </div>
                    <div class="card high">
                        <div class="card-value">{{ analysis_data.merge_report.summary.total_conflicts }}</div>
                        <div class="card-label">数据冲突数</div>
                    </div>
                    <div class="card">
                        <div class="card-value">{{ analysis_data.network_report.network_summary.node_count }}</div>
                        <div class="card-label">网络节点数</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">数据冲突明细 (需人工处理)</h2>
                {% if analysis_data.merge_report.high_priority_conflicts %}
                    {% for conflict in analysis_data.merge_report.high_priority_conflicts %}
                    <div class="conflict-item">
                        <span class="conflict-type">[{{ conflict.conflict_type }}]</span>
                        <strong>{{ conflict.airport_code }}</strong> - {{ conflict.field }}: 
                        节点值={{ conflict.node_value }}, 航班值={{ conflict.flight_value }}
                        <div class="evidence">影响记录数: {{ conflict.source_records_count }} 条</div>
                    </div>
                    {% endfor %}
                {% else %}
                    <p>无高优先级数据冲突</p>
                {% endif %}
            </div>
            
            <div class="section">
                <h2 class="section-title">瓶颈节点识别</h2>
                <div class="summary-cards">
                    <div class="card high">
                        <div class="card-value">{{ analysis_data.network_report.bottlenecks.high_severity }}</div>
                        <div class="card-label">高优先级瓶颈</div>
                    </div>
                    <div class="card medium">
                        <div class="card-value">{{ analysis_data.network_report.bottlenecks.medium_severity }}</div>
                        <div class="card-label">中优先级瓶颈</div>
                    </div>
                </div>
                
                {% if analysis_data.network_report.bottlenecks.details %}
                <table>
                    <thead>
                        <tr>
                            <th>机场代码</th>
                            <th>机场名称</th>
                            <th>瓶颈类型</th>
                            <th>瓶颈评分</th>
                            <th>严重程度</th>
                            <th>介数中心性</th>
                        </tr>
                    </thead>
                    <tbody>
                        {% for bn in analysis_data.network_report.bottlenecks.details %}
                        <tr>
                            <td><strong>{{ bn.airport_code }}</strong></td>
                            <td>{{ bn.airport_name }}</td>
                            <td>{{ bn.bottleneck_type }}</td>
                            <td>{{ bn.bottleneck_score }}</td>
                            <td class="severity-{{ bn.severity }}">{{ bn.severity }}</td>
                            <td>{{ "%.3f"|format(bn.betweenness_centrality) }}</td>
                        </tr>
                        {% endfor %}
                    </tbody>
                </table>
                {% endif %}
            </div>
            
            <div class="section">
                <h2 class="section-title">延误传播分析</h2>
                {% if analysis_data.propagation_report.summary %}
                <div class="summary-cards">
                    <div class="card">
                        <div class="card-value">{{ analysis_data.propagation_report.summary.total_propagation_paths }}</div>
                        <div class="card-label">传播路径数</div>
                    </div>
                    <div class="card">
                        <div class="card-value">{{ analysis_data.propagation_report.summary.unique_source_airports }}</div>
                        <div class="card-label">源机场数</div>
                    </div>
                </div>
                {% endif %}
            </div>
            
            <div class="methodology">
                <h3>分析口径说明</h3>
                <p>{{ methodology_note }}</p>
            </div>
        </div>
    </div>
</body>
</html>
        """
    
    def _get_methodology_note(self) -> str:
        """获取分析方法说明"""
        return """
        1. 网络中心性：采用度中心性、介数中心性、接近中心性和特征向量中心性四个维度综合评估。
        2. 瓶颈识别标准：介数中心性 ≥ 0.1 或 容量利用率 ≥ 70% 的节点被识别为瓶颈。
        3. 延误传播模型：基于航班频次计算传播系数，默认最大传播层数为3层。
        4. 数据冲突处理：所有冲突均已列出供人工确认，系统不自动选择任何一方数据。
        5. 所有分析结果均基于同一原始数据集，确保图表和数据的一致性。
        """
