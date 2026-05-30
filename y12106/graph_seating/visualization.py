import os
import json
from typing import List, Dict, Optional, Any
from collections import defaultdict, Counter
from datetime import datetime

from .config import Config
from .exceptions import DataAnomaly, ConflictCycle
from .models import (
    Student, ConflictGraph, ColoringResult, SeatingPlan
)
from .traceability import TraceabilityManager


class Visualizer:
    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()
        self.chart_colors = [
            "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
            "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
            "#BB8FCE", "#85C1E9", "#F8B500", "#82E0AA"
        ]

    def generate_all_charts(self, students: List[Student],
                            graph: ConflictGraph,
                            coloring_result: ColoringResult,
                            seating_plan: SeatingPlan,
                            anomalies: List[DataAnomaly],
                            cycles: List[ConflictCycle],
                            trace_manager: TraceabilityManager,
                            output_dir: Optional[str] = None) -> Dict[str, str]:

        output_dir = output_dir or self.config.OUTPUT_DIR
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        generated_files = {}

        generated_files["conflict_graph"] = self._generate_conflict_graph_html(
            graph, coloring_result, output_dir, timestamp
        )

        generated_files["color_distribution"] = self._generate_color_distribution_chart(
            coloring_result, output_dir, timestamp
        )

        generated_files["capacity_utilization"] = self._generate_capacity_chart(
            seating_plan, output_dir, timestamp
        )

        generated_files["anomaly_report"] = self._generate_anomaly_chart(
            anomalies, output_dir, timestamp
        )

        generated_files["conflict_type_chart"] = self._generate_conflict_type_chart(
            graph, output_dir, timestamp
        )

        generated_files["leave_analysis"] = self._generate_leave_analysis_chart(
            students, seating_plan, output_dir, timestamp
        )

        generated_files["traceability_dashboard"] = self._generate_traceability_dashboard(
            trace_manager, output_dir, timestamp
        )

        generated_files["cycles_visualization"] = self._generate_cycles_visualization(
            cycles, graph, output_dir, timestamp
        )

        generated_files["dashboard_index"] = self._generate_dashboard_index(
            generated_files, students, graph, coloring_result, seating_plan,
            anomalies, cycles, trace_manager, output_dir, timestamp
        )

        return generated_files

    def _generate_conflict_graph_html(self, graph: ConflictGraph,
                                      coloring_result: ColoringResult,
                                      output_dir: str, timestamp: str) -> str:

        filename = os.path.join(output_dir, f"conflict_graph_{timestamp}.html")

        nodes_data = []
        for node_id, node in graph.nodes.items():
            color_assign = coloring_result.assignments.get(node_id)
            color_idx = color_assign.color if color_assign else -1
            color_hex = self.chart_colors[color_idx % len(self.chart_colors)] if color_idx >= 0 else "#CCCCCC"

            nodes_data.append({
                "id": node_id,
                "name": node.attributes.get("name", node_id),
                "degree": node.degree,
                "color": color_idx,
                "color_hex": color_hex,
                "group": color_idx if color_idx >= 0 else -1
            })

        edges_data = []
        for (a, b), edge in graph.edges.items():
            width = max(1, min(5, edge.weight * 5))
            color = "#FF0000" if edge.weight >= 0.9 else "#FF6600" if edge.weight >= 0.7 else "#FFCC00"

            edges_data.append({
                "source": a,
                "target": b,
                "weight": edge.weight,
                "type": edge.conflict_type,
                "width": width,
                "color": color
            })

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>冲突关系图 - {timestamp}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        h1 {{ color: #333; }}
        .legend {{ margin: 20px 0; }}
        .legend-item {{ display: inline-block; margin: 0 10px; }}
        .legend-color {{ display: inline-block; width: 20px; height: 20px; margin-right: 5px; vertical-align: middle; }}
        #graph-container {{ width: 100%; height: 600px; border: 1px solid #ddd; }}
        .node-info {{ margin-top: 20px; padding: 10px; background: #f5f5f5; }}
    </style>
</head>
<body>
    <h1>冲突关系可视化</h1>
    <div class="legend">
        <h3>图例:</h3>
        <div class="legend-item"><span class="legend-color" style="background:#FF0000;"></span>严重冲突 (>=0.9)</div>
        <div class="legend-item"><span class="legend-color" style="background:#FF6600;"></span>中等冲突 (0.7-0.9)</div>
        <div class="legend-item"><span class="legend-color" style="background:#FFCC00;"></span>轻微冲突 (<0.7)</div>
    </div>
    <div id="graph-container"></div>
    <div class="node-info" id="node-info">点击节点查看详情</div>

    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script>
        var nodes = {json.dumps(nodes_data, ensure_ascii=False)};
        var edges = {json.dumps(edges_data, ensure_ascii=False)};

        var width = document.getElementById('graph-container').clientWidth;
        var height = 600;

        var svg = d3.select("#graph-container")
            .append("svg")
            .attr("width", width)
            .attr("height", height);

        var simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(edges).id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collision", d3.forceCollide().radius(30));

        var link = svg.append("g")
            .selectAll("line")
            .data(edges)
            .enter().append("line")
            .attr("stroke", d => d.color)
            .attr("stroke-width", d => d.width)
            .attr("opacity", 0.6);

        var node = svg.append("g")
            .selectAll("circle")
            .data(nodes)
            .enter().append("circle")
            .attr("r", d => Math.max(8, Math.min(20, 8 + d.degree)))
            .attr("fill", d => d.color_hex)
            .attr("stroke", "#000")
            .attr("stroke-width", 1.5)
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended))
            .on("click", function(event, d) {{
                document.getElementById('node-info').innerHTML =
                    '<strong>学生ID:</strong> ' + d.id + '<br>' +
                    '<strong>姓名:</strong> ' + d.name + '<br>' +
                    '<strong>冲突数:</strong> ' + d.degree + '<br>' +
                    '<strong>颜色组:</strong> ' + (d.group >= 0 ? d.group : '未分配') + '<br>' +
                    '<strong>追溯链接:</strong> trace://' + d.id;
            }});

        var label = svg.append("g")
            .selectAll("text")
            .data(nodes)
            .enter().append("text")
            .text(d => d.name)
            .attr("font-size", "10px")
            .attr("dx", 12)
            .attr("dy", 4);

        simulation.on("tick", function() {{
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);

            label
                .attr("x", d => d.x)
                .attr("y", d => d.y);
        }});

        function dragstarted(event, d) {{
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }}

        function dragged(event, d) {{
            d.fx = event.x;
            d.fy = event.y;
        }}

        function dragended(event, d) {{
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }}
    </script>
</body>
</html>
"""

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(html_content)

        return filename

    def _generate_color_distribution_chart(self, coloring_result: ColoringResult,
                                           output_dir: str, timestamp: str) -> str:

        filename = os.path.join(output_dir, f"color_distribution_{timestamp}.html")
        distribution = coloring_result.get_color_distribution()

        labels = []
        values = []
        colors = []
        for color, count in sorted(distribution.items()):
            labels.append(f"颜色组 {color}")
            values.append(count)
            colors.append(self.chart_colors[color % len(self.chart_colors)])

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>颜色组分布 - {timestamp}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .chart-container {{ width: 600px; margin: 0 auto; }}
    </style>
</head>
<body>
    <h1 style="text-align:center;">颜色组分布</h1>
    <div class="chart-container">
        <canvas id="colorChart"></canvas>
    </div>
    <script>
        var ctx = document.getElementById('colorChart').getContext('2d');
        new Chart(ctx, {{
            type: 'bar',
            data: {{
                labels: {json.dumps(labels, ensure_ascii=False)},
                datasets: [{{
                    label: '学生数量',
                    data: {json.dumps(values, ensure_ascii=False)},
                    backgroundColor: {json.dumps(colors, ensure_ascii=False)},
                    borderColor: '#000',
                    borderWidth: 1
                }}]
            }},
            options: {{
                responsive: true,
                scales: {{
                    y: {{ beginAtZero: true }}
                }}
            }}
        }});
    </script>
</body>
</html>
"""

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(html_content)

        return filename

    def _generate_capacity_chart(self, seating_plan: SeatingPlan,
                                 output_dir: str, timestamp: str) -> str:

        filename = os.path.join(output_dir, f"capacity_utilization_{timestamp}.html")

        class_names = []
        current_counts = []
        max_capacities = []
        utilizations = []

        for class_id, cls in sorted(seating_plan.classes.items()):
            class_names.append(cls.class_name)
            current_counts.append(cls.current_count)
            max_capacities.append(cls.max_capacity)
            utilizations.append(round(cls.get_utilization() * 100, 2))

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>班级容量利用率 - {timestamp}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .chart-container {{ width: 700px; margin: 0 auto; }}
    </style>
</head>
<body>
    <h1 style="text-align:center;">班级容量利用率</h1>
    <div class="chart-container">
        <canvas id="capacityChart"></canvas>
    </div>
    <script>
        var ctx = document.getElementById('capacityChart').getContext('2d');
        new Chart(ctx, {{
            type: 'bar',
            data: {{
                labels: {json.dumps(class_names, ensure_ascii=False)},
                datasets: [
                    {{
                        label: '当前人数',
                        data: {json.dumps(current_counts, ensure_ascii=False)},
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }},
                    {{
                        label: '最大容量',
                        data: {json.dumps(max_capacities, ensure_ascii=False)},
                        backgroundColor: 'rgba(255, 99, 132, 0.3)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                        type: 'line'
                    }}
                ]
            }},
            options: {{
                responsive: true,
                scales: {{
                    y: {{ beginAtZero: true }}
                }}
            }}
        }});
    </script>
</body>
</html>
"""

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(html_content)

        return filename

    def _generate_anomaly_chart(self, anomalies: List[DataAnomaly],
                                output_dir: str, timestamp: str) -> str:

        filename = os.path.join(output_dir, f"anomaly_report_{timestamp}.html")

        severity_counts = Counter(a.severity for a in anomalies)
        type_counts = Counter(a.anomaly_type for a in anomalies)

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>数据异常分析 - {timestamp}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .chart-row {{ display: flex; justify-content: space-around; }}
        .chart-container {{ width: 45%; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #4CAF50; color: white; }}
        tr:nth-child(even) {{ background-color: #f2f2f2; }}
        .severity-error {{ color: red; font-weight: bold; }}
        .severity-warning {{ color: orange; font-weight: bold; }}
        .severity-info {{ color: blue; }}
    </style>
</head>
<body>
    <h1 style="text-align:center;">数据异常分析报告</h1>
    <div class="chart-row">
        <div class="chart-container">
            <h3>按严重程度分布</h3>
            <canvas id="severityChart"></canvas>
        </div>
        <div class="chart-container">
            <h3>按异常类型分布</h3>
            <canvas id="typeChart"></canvas>
        </div>
    </div>

    <h2>异常明细</h2>
    <table>
        <tr>
            <th>行号</th>
            <th>异常类型</th>
            <th>严重程度</th>
            <th>描述</th>
            <th>建议操作</th>
        </tr>
        {"".join(f'''
        <tr>
            <td>{a.row_index}</td>
            <td>{a.anomaly_type}</td>
            <td class="severity-{a.severity}">{a.severity}</td>
            <td>{a.description}</td>
            <td>{a.suggested_action}</td>
        </tr>
        ''' for a in anomalies[:50])}
    </table>
    {f'<p>... 还有 {len(anomalies) - 50} 条异常记录</p>' if len(anomalies) > 50 else ''}

    <script>
        new Chart(document.getElementById('severityChart'), {{
            type: 'doughnut',
            data: {{
                labels: {json.dumps(list(severity_counts.keys()), ensure_ascii=False)},
                datasets: [{{
                    data: {json.dumps(list(severity_counts.values()), ensure_ascii=False)},
                    backgroundColor: ['#FF6B6B', '#FFEAA7', '#74B9FF']
                }}]
            }}
        }});

        new Chart(document.getElementById('typeChart'), {{
            type: 'bar',
            data: {{
                labels: {json.dumps(list(type_counts.keys()), ensure_ascii=False)},
                datasets: [{{
                    label: '数量',
                    data: {json.dumps(list(type_counts.values()), ensure_ascii=False)},
                    backgroundColor: '#96CEB4'
                }}]
            }},
            options: {{ indexAxis: 'y' }}
        }});
    </script>
</body>
</html>
"""

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(html_content)

        return filename

    def _generate_conflict_type_chart(self, graph: ConflictGraph,
                                      output_dir: str, timestamp: str) -> str:

        filename = os.path.join(output_dir, f"conflict_type_distribution_{timestamp}.html")

        type_counts = defaultdict(int)
        for edge in graph.edges.values():
            type_counts[edge.conflict_type] += 1

        labels = list(type_counts.keys())
        values = list(type_counts.values())
        total = sum(values)

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>冲突类型分布 - {timestamp}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .chart-container {{ width: 600px; margin: 0 auto; }}
        .stats {{ text-align: center; margin: 20px 0; font-size: 18px; }}
    </style>
</head>
<body>
    <h1 style="text-align:center;">冲突类型分布</h1>
    <div class="stats">
        总冲突数: <strong>{len(graph.edges)}</strong> |
        涉及学生: <strong>{len(graph.nodes)}</strong> |
        平均度数: <strong>{graph.summary()['avg_degree']:.2f}</strong>
    </div>
    <div class="chart-container">
        <canvas id="conflictTypeChart"></canvas>
    </div>
    <script>
        new Chart(document.getElementById('conflictTypeChart'), {{
            type: 'pie',
            data: {{
                labels: {json.dumps(labels, ensure_ascii=False)},
                datasets: [{{
                    data: {json.dumps(values, ensure_ascii=False)},
                    backgroundColor: {json.dumps(self.chart_colors[:len(labels)], ensure_ascii=False)}
                }}]
            }},
            options: {{
                plugins: {{
                    legend: {{ position: 'right' }},
                    tooltip: {{
                        callbacks: {{
                            label: function(context) {{
                                var value = context.raw;
                                var total = {total};
                                var percentage = ((value / total) * 100).toFixed(1);
                                return context.label + ': ' + value + ' (' + percentage + '%)';
                            }}
                        }}
                    }}
                }}
            }}
        }});
    </script>
</body>
</html>
"""

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(html_content)

        return filename

    def _generate_leave_analysis_chart(self, students: List[Student],
                                       seating_plan: SeatingPlan,
                                       output_dir: str, timestamp: str) -> str:

        filename = os.path.join(output_dir, f"leave_analysis_{timestamp}.html")

        students_with_leave = [s for s in students if s.leave_records]
        leave_durations = [sum(lr.duration_days() for lr in s.leave_records) for s in students_with_leave]
        leave_types = Counter()
        for s in students_with_leave:
            for lr in s.leave_records:
                leave_types[lr.leave_type] += 1

        leave_by_class = defaultdict(int)
        for class_id, cls in seating_plan.classes.items():
            for sid in cls.students:
                student = next((s for s in students if s.student_id == sid), None)
                if student and student.leave_records:
                    leave_by_class[cls.class_name] += 1

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>请假分析 - {timestamp}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .chart-row {{ display: flex; justify-content: space-around; flex-wrap: wrap; }}
        .chart-container {{ width: 45%; margin: 20px 0; }}
    </style>
</head>
<body>
    <h1 style="text-align:center;">请假数据分析</h1>
    <div class="chart-row">
        <div class="chart-container">
            <h3>请假类型分布</h3>
            <canvas id="leaveTypeChart"></canvas>
        </div>
        <div class="chart-container">
            <h3>各班请假人数</h3>
            <canvas id="leaveByClassChart"></canvas>
        </div>
    </div>
    <div class="chart-container" style="width: 90%; margin: 0 auto;">
        <h3>请假天数分布 (Top 20)</h3>
        <canvas id="leaveDurationChart"></canvas>
    </div>

    <script>
        new Chart(document.getElementById('leaveTypeChart'), {{
            type: 'doughnut',
            data: {{
                labels: {json.dumps(list(leave_types.keys()), ensure_ascii=False)},
                datasets: [{{
                    data: {json.dumps(list(leave_types.values()), ensure_ascii=False)},
                    backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
                }}]
            }}
        }});

        new Chart(document.getElementById('leaveByClassChart'), {{
            type: 'bar',
            data: {{
                labels: {json.dumps(list(leave_by_class.keys()), ensure_ascii=False)},
                datasets: [{{
                    label: '请假人数',
                    data: {json.dumps(list(leave_by_class.values()), ensure_ascii=False)},
                    backgroundColor: '#DDA0DD'
                }}]
            }}
        }});

        var durations = {json.dumps(sorted(leave_durations, reverse=True)[:20], ensure_ascii=False)};
        new Chart(document.getElementById('leaveDurationChart'), {{
            type: 'bar',
            data: {{
                labels: durations.map((d, i) => '学生' + (i+1)),
                datasets: [{{
                    label: '请假总天数',
                    data: durations,
                    backgroundColor: '#F7DC6F'
                }}]
            }}
        }});
    </script>
</body>
</html>
"""

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(html_content)

        return filename

    def _generate_traceability_dashboard(self, trace_manager: TraceabilityManager,
                                         output_dir: str, timestamp: str) -> str:

        filename = os.path.join(output_dir, f"traceability_dashboard_{timestamp}.html")
        stats = trace_manager.get_trace_statistics()
        issues = trace_manager.get_all_students_with_issues()

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>追溯链路仪表板 - {timestamp}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .stats-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }}
        .stat-card {{ padding: 20px; background: #f5f5f5; border-radius: 8px; text-align: center; }}
        .stat-value {{ font-size: 32px; font-weight: bold; color: #2c3e50; }}
        .stat-label {{ font-size: 14px; color: #7f8c8d; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #3498db; color: white; }}
        .issue-row {{ background-color: #ffebee; }}
        a {{ color: #3498db; text-decoration: none; }}
        a:hover {{ text-decoration: underline; }}
    </style>
</head>
<body>
    <h1 style="text-align:center;">追溯链路仪表板</h1>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-value">{stats.get('total_students', 0)}</div>
            <div class="stat-label">学生总数</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">{stats.get('total_trace_records', 0)}</div>
            <div class="stat-label">追溯记录总数</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">{stats.get('total_seat_changes', 0)}</div>
            <div class="stat-label">换座次数</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">{stats.get('avg_records_per_student', 0):.1f}</div>
            <div class="stat-label">平均追溯记录/人</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">{stats.get('consistency_status', {}).get('consistent', 0)}</div>
            <div class="stat-label">数据一致</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">{len(issues)}</div>
            <div class="stat-label">需要关注</div>
        </div>
    </div>

    <h2>需要关注的学生</h2>
    <table>
        <tr>
            <th>学生ID</th>
            <th>问题数量</th>
            <th>约束违反</th>
            <th>人工调整</th>
            <th>操作</th>
        </tr>
        {''.join(f'''
        <tr class="issue-row">
            <td>{issue['student_id']}</td>
            <td>{len(issue.get('issues', []))}</td>
            <td>{len(issue.get('constraints_with_violations', []))}</td>
            <td>{len(issue.get('manual_changes', []))}</td>
            <td><a href="trace://{issue['student_id']}">查看详情</a></td>
        </tr>
        ''' for issue in issues)}
    </table>

    <h2>一致性状态分布</h2>
    <pre>{json.dumps(stats.get('consistency_status', {}), ensure_ascii=False, indent=2)}</pre>

    <h2>追溯查询</h2>
    <input type="text" id="studentId" placeholder="输入学生ID">
    <button onclick="queryTrace()">查询</button>
    <div id="traceResult" style="margin-top: 20px;"></div>

    <script>
        function queryTrace() {{
            var studentId = document.getElementById('studentId').value;
            window.location.href = 'trace://' + studentId;
        }}
    </script>
</body>
</html>
"""

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(html_content)

        return filename

    def _generate_cycles_visualization(self, cycles: List[ConflictCycle],
                                       graph: ConflictGraph,
                                       output_dir: str, timestamp: str) -> str:

        filename = os.path.join(output_dir, f"conflict_cycles_{timestamp}.html")

        cycles_data = []
        for cycle in cycles:
            node_names = []
            for nid in cycle.nodes:
                if nid in graph.nodes:
                    node_names.append(graph.nodes[nid].attributes.get("name", nid))
                else:
                    node_names.append(nid)

            cycles_data.append({
                "cycle_id": cycle.cycle_id,
                "nodes": cycle.nodes,
                "node_names": node_names,
                "weight": cycle.weight,
                "isolated": cycle.isolated,
                "detected_at": cycle.detected_at
            })

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>冲突闭环检测 - {timestamp}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .cycle-card {{ border: 2px solid #e74c3c; border-radius: 8px; padding: 15px; margin: 15px 0; }}
        .cycle-card.isolated {{ background-color: #ffebee; }}
        .cycle-header {{ font-weight: bold; font-size: 18px; color: #c0392b; }}
        .cycle-nodes {{ margin: 10px 0; font-family: monospace; }}
        .cycle-nodes span {{ display: inline-block; padding: 5px 10px; margin: 2px; background: #ff6b6b; color: white; border-radius: 4px; }}
        .cycle-edges {{ margin: 10px 0; color: #666; }}
        .badge {{ display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 12px; }}
        .badge-isolated {{ background: #e74c3c; color: white; }}
        .badge-active {{ background: #f39c12; color: white; }}
    </style>
</head>
<body>
    <h1 style="text-align:center;">冲突闭环检测结果</h1>
    <p style="text-align:center;color:{'#e74c3c' if cycles else '#27ae60'};font-size:18px;">
        检测到 {len(cycles)} 个冲突闭环，其中 {sum(1 for c in cycles if c.isolated)} 个已隔离
    </p>

    {''.join(f'''
    <div class="cycle-card {'isolated' if cycle['isolated'] else ''}">
        <div class="cycle-header">
            闭环 {cycle['cycle_id']}
            <span class="badge {'badge-isolated' if cycle['isolated'] else 'badge-active'}">
                {'已隔离' if cycle['isolated'] else '待处理'}
            </span>
        </div>
        <div class="cycle-nodes">
            {' -> '.join(f'<span>{name}</span>' for name in cycle['node_names'])}
        </div>
        <div class="cycle-edges">
            <strong>总权重:</strong> {cycle['weight']:.2f} |
            <strong>检测时间:</strong> {cycle['detected_at']} |
            <strong>节点数:</strong> {len(cycle['nodes'])}
        </div>
        <div style="margin-top:10px;">
            <strong>处理建议:</strong> 人工复核冲突关系，考虑单独成组或调整冲突关系
        </div>
    </div>
    ''' for cycle in cycles_data)}

    {'''<p style="text-align:center;color:#27ae60;font-size:18px;margin-top:30px;">
        ✓ 未检测到冲突闭环，数据质量良好
    </p>''' if not cycles else ''}
</body>
</html>
"""

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(html_content)

        return filename

    def _generate_dashboard_index(self, generated_files: Dict[str, str],
                                  students: List[Student],
                                  graph: ConflictGraph,
                                  coloring_result: ColoringResult,
                                  seating_plan: SeatingPlan,
                                  anomalies: List[DataAnomaly],
                                  cycles: List[ConflictCycle],
                                  trace_manager: TraceabilityManager,
                                  output_dir: str, timestamp: str) -> str:

        filename = os.path.join(output_dir, f"dashboard_{timestamp}.html")

        export_links = []
        chart_links = []
        for key, path in generated_files.items():
            if path.endswith('.html'):
                name = key.replace('_', ' ').title()
                link = f'<li><a href="{os.path.basename(path)}">{name}</a></li>'
                if 'graph' in key or 'chart' in key or 'distribution' in key or 'utilization' in key or 'anomaly' in key or 'type' in key or 'leave' in key or 'traceability' in key or 'cycle' in key:
                    chart_links.append(link)
                else:
                    export_links.append(link)

        if not export_links:
            export_links = ['<li>暂无导出文件</li>']
        if not chart_links:
            chart_links = ['<li>暂无图表文件</li>']

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>图论社团排座位 - 总览仪表板</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #ecf0f1; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px; }}
        .header h1 {{ margin: 0; }}
        .stats-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }}
        .stat-box {{ background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .stat-box .label {{ color: #7f8c8d; font-size: 14px; }}
        .stat-box .value {{ font-size: 28px; font-weight: bold; color: #2c3e50; }}
        .content-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }}
        .card {{ background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
        .card h2 {{ margin-top: 0; color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; }}
        ul {{ padding-left: 20px; }}
        a {{ color: #3498db; text-decoration: none; }}
        a:hover {{ text-decoration: underline; }}
        .status-ok {{ color: #27ae60; }}
        .status-warn {{ color: #f39c12; }}
        .status-error {{ color: #e74c3c; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>图论社团排座位系统 - 运行结果总览</h1>
        <p>生成时间: {datetime.now().isoformat()}</p>
    </div>

    <div class="stats-grid">
        <div class="stat-box">
            <div class="label">学生总数</div>
            <div class="value">{len(students)}</div>
        </div>
        <div class="stat-box">
            <div class="label">班级数量</div>
            <div class="value">{len(seating_plan.classes)}</div>
        </div>
        <div class="stat-box">
            <div class="label">冲突关系</div>
            <div class="value">{len(graph.edges)}</div>
        </div>
        <div class="stat-box">
            <div class="label">数据异常</div>
            <div class="value status-error">{len(anomalies)}</div>
        </div>
    </div>

    <div class="content-grid">
        <div class="card">
            <h2>📊 核心数据指标</h2>
            <ul>
                <li>有效学生: <strong class="status-ok">{sum(1 for s in students if s.is_valid)}</strong></li>
                <li>请假学生: <strong class="status-warn">{sum(1 for s in students if s.leave_records)}</strong></li>
                <li>有冲突关系: <strong>{sum(1 for s in students if s.conflict_with)}</strong></li>
                <li>检测到闭环: <strong class="status-error">{len(cycles)}</strong></li>
                <li>已隔离闭环: <strong class="status-warn">{sum(1 for c in cycles if c.isolated)}</strong></li>
                <li>着色成功率: <strong class="status-ok">{coloring_result.success}</strong></li>
                <li>未分配学生: <strong class="status-error">{len(seating_plan.unassigned_students)}</strong></li>
            </ul>
        </div>

        <div class="card">
            <h2>📁 生成的文件</h2>
            <h3>数据导出</h3>
            <ul>
                {''.join(export_links)}
            </ul>
            <h3>可视化图表</h3>
            <ul>
                {''.join(chart_links)}
            </ul>
        </div>
    </div>

    <div class="card" style="margin-top: 20px;">
        <h2>⚠️ 需要人工复核的事项</h2>
        <div class="content-grid">
            <div>
                <h3>数据质量问题</h3>
                {f'<ul><li class="status-error">有 {len(anomalies)} 条数据异常需要处理</li></ul>' if anomalies else '<p class="status-ok">✓ 数据质量良好</p>'}
            </div>
            <div>
                <h3>冲突闭环</h3>
                {f'<ul><li class="status-error">有 {len(cycles)} 个冲突闭环需要复核</li></ul>' if cycles else '<p class="status-ok">✓ 无冲突闭环</p>'}
            </div>
            <div>
                <h3>容量问题</h3>
                {f'<ul><li class="status-warn">有 {len(seating_plan.capacity_warnings)} 条容量告警</li></ul>' if seating_plan.capacity_warnings else '<p class="status-ok">✓ 容量分配正常</p>'}
            </div>
            <div>
                <h3>请假补位</h3>
                {f'<ul><li class="status-warn">有 {sum(1 for a in seating_plan.assignments.values() if a.is_leave_override)} 个请假补位需要确认</li></ul>' if any(a.is_leave_override for a in seating_plan.assignments.values()) else '<p class="status-ok">✓ 无请假补位</p>'}
            </div>
        </div>
    </div>

    <div class="card" style="margin-top: 20px;">
        <h2>🔗 数据链路验证</h2>
        <p>每条学生记录都可以追溯到：原始数据行 → 冲突图节点 → 颜色组分配 → 班级座位 → 换座历史</p>
        <p>使用 <code>trace://&lt;学生ID&gt;</code> 格式可快速定位学生的完整追溯链路</p>
        <p>数据一致性校验: <strong class="status-ok">{trace_manager.get_trace_statistics().get('consistency_status', {}).get('consistent', 0)}</strong> 条记录一致，
           <strong class="status-error">{trace_manager.get_trace_statistics().get('consistency_status', {}).get('inconsistent', 0)}</strong> 条需要关注</p>
    </div>
</body>
</html>
"""

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(html_content)

        return filename

    def generate_text_report(self, students: List[Student],
                             graph: ConflictGraph,
                             coloring_result: ColoringResult,
                             seating_plan: SeatingPlan,
                             anomalies: List[DataAnomaly],
                             cycles: List[ConflictCycle]) -> str:

        report_lines = []
        report_lines.append("=" * 70)
        report_lines.append("图论社团排座位 - 分析报告")
        report_lines.append("=" * 70)
        report_lines.append("")

        report_lines.append("1. 数据集概览")
        report_lines.append("-" * 50)
        report_lines.append(f"  总学生数: {len(students)}")
        report_lines.append(f"  有效学生: {sum(1 for s in students if s.is_valid)}")
        report_lines.append(f"  无效学生: {sum(1 for s in students if not s.is_valid)}")
        report_lines.append(f"  有请假记录: {sum(1 for s in students if s.leave_records)}")
        report_lines.append(f"  有明确冲突: {sum(1 for s in students if s.conflict_with)}")
        report_lines.append("")

        report_lines.append("2. 冲突图统计")
        report_lines.append("-" * 50)
        summary = graph.summary()
        for k, v in summary.items():
            report_lines.append(f"  {k}: {v}")
        report_lines.append("")

        report_lines.append("3. 图着色结果")
        report_lines.append("-" * 50)
        report_lines.append(f"  算法: {coloring_result.algorithm}")
        report_lines.append(f"  成功: {coloring_result.success}")
        report_lines.append(f"  使用颜色数: {coloring_result.colors_used}")
        report_lines.append(f"  未着色节点: {len(coloring_result.uncolored_nodes)}")
        report_lines.append(f"  回溯次数: {coloring_result.backtrack_count}")
        report_lines.append(f"  颜色分布: {coloring_result.get_color_distribution()}")
        report_lines.append("")

        report_lines.append("4. 冲突闭环检测")
        report_lines.append("-" * 50)
        report_lines.append(f"  检测到闭环: {len(cycles)}")
        report_lines.append(f"  已隔离闭环: {sum(1 for c in cycles if c.isolated)}")
        for cycle in cycles:
            report_lines.append(f"    - {cycle.cycle_id}: {cycle.nodes} (权重: {cycle.weight:.2f})")
        report_lines.append("")

        report_lines.append("5. 数据异常")
        report_lines.append("-" * 50)
        report_lines.append(f"  总异常数: {len(anomalies)}")
        by_severity = defaultdict(int)
        for a in anomalies:
            by_severity[a.severity] += 1
        for sev, count in by_severity.items():
            report_lines.append(f"    {sev}: {count}")
        report_lines.append("")

        report_lines.append("6. 座位分配")
        report_lines.append("-" * 50)
        util = seating_plan.get_utilization_report()
        report_lines.append(f"  总分配学生: {util['total_students']}")
        report_lines.append(f"  总容量: {util['total_capacity']}")
        report_lines.append(f"  整体利用率: {util['overall_utilization']:.2%}")
        report_lines.append(f"  未分配学生: {util['unassigned']}")
        report_lines.append("")
        for cid, info in util['by_class'].items():
            report_lines.append(f"    {cid} ({info['class_name']}): {info['current']}/{info['max']} "
                              f"({info['utilization']:.2%})")
        report_lines.append("")

        report_lines.append("=" * 70)
        report_lines.append("报告生成完毕")
        report_lines.append("=" * 70)

        return "\n".join(report_lines)
