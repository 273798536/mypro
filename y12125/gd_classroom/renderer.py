import json
import html
from typing import List, Dict, Any
from .engine import SimulationResult, Step, compute_surface, LossFunction


_STATUS_LABEL = {
    "converged": ("✅ 收敛", "#2e7d32"),
    "diverged": ("❌ 发散", "#c62828"),
    "oscillating": ("⚡ 震荡", "#e65100"),
    "flat": ("🟡 局部平坦", "#f9a825"),
    "max_iter": ("⏳ 未收敛", "#1565c0"),
    "running": ("🔄 运行中", "#6a1b9a"),
    "unknown": ("❓ 未知", "#424242"),
}


def _step_to_dict(step: Step) -> Dict[str, Any]:
    return {
        "iteration": step.iteration,
        "point": step.point,
        "loss": step.loss,
        "gradient": step.gradient,
        "grad_norm": step.grad_norm,
    }


def _truncate_float(val: float, digits: int = 6) -> float:
    return round(val, digits)


def _safe_json(obj: Any) -> str:
    def default(o):
        if isinstance(o, float):
            if not math.isfinite(o):
                return str(o)
            return _truncate_float(o)
        raise TypeError(f"Object of type {type(o)} is not JSON serializable")

    import math
    return json.dumps(obj, default=default, ensure_ascii=False)


def render_report(results: List[SimulationResult], output_path: str) -> str:
    panels_html = ""
    nav_items = ""

    for idx, result in enumerate(results):
        panel_id = f"panel-{idx}"
        loss_fn = LossFunction(result.loss_expr)
        surface = compute_surface(loss_fn, result.surface_bounds, result.resolution)

        trajectory_x = [_truncate_float(s.point[0]) for s in result.steps]
        trajectory_z = [_truncate_float(s.loss) for s in result.steps]
        iterations = [s.iteration for s in result.steps]
        grad_norms = [_truncate_float(s.grad_norm) for s in result.steps]

        if len(loss_fn.var_names) >= 2:
            trajectory_y = [_truncate_float(s.point[1]) for s in result.steps]
        else:
            trajectory_y = None

        status_label, status_color = _STATUS_LABEL.get(
            result.diagnosis.status, ("❓ 未知", "#424242")
        )

        step_table_rows = ""
        for s in result.steps:
            pt_str = ", ".join(f"{v:.4f}" for v in s.point)
            grad_str = ", ".join(f"{v:.4f}" for v in s.gradient)
            step_table_rows += f"""<tr>
                <td>{s.iteration}</td>
                <td>({pt_str})</td>
                <td>{s.loss:.6f}</td>
                <td>{s.grad_norm:.6f}</td>
            </tr>"""

        diagnosis_html = f"""<div class="diagnosis-card" style="border-left: 4px solid {status_color}">
            <h3 style="color: {status_color}; margin-top:0;">{status_label}</h3>
            <p><strong>材料：</strong>{html.escape(result.name)}</p>
            <p><strong>损失函数：</strong><code>{html.escape(result.loss_expr)}</code></p>
            <p><strong>学习率：</strong>{result.learning_rate} &nbsp; <strong>初始点：</strong>({', '.join(str(v) for v in result.initial_point)})</p>"""

        if result.diagnosis.issues:
            diagnosis_html += '<div class="issues"><strong>问题诊断：</strong><ul>'
            for issue in result.diagnosis.issues:
                diagnosis_html += f"<li>{html.escape(issue)}</li>"
            diagnosis_html += "</ul></div>"

        if result.diagnosis.suggestions:
            diagnosis_html += '<div class="suggestions"><strong>建议：</strong><ul>'
            for sug in result.diagnosis.suggestions:
                diagnosis_html += f"<li>{html.escape(sug)}</li>"
            diagnosis_html += "</ul></div>"

        if result.diagnosis.converged_at is not None:
            diagnosis_html += f'<p>✅ 在第 <strong>{result.diagnosis.converged_at}</strong> 步收敛</p>'
        if result.diagnosis.diverged_at is not None:
            diagnosis_html += f'<p>❌ 在第 <strong>{result.diagnosis.diverged_at}</strong> 步发散</p>'

        diagnosis_html += "</div>"

        dim = len(loss_fn.var_names)
        surface_json = _safe_json(surface)
        trajectory_json = _safe_json({
            "x": trajectory_x,
            "y": trajectory_y,
            "z": trajectory_z,
            "iterations": iterations,
            "grad_norms": grad_norms,
        })

        active_class = "active" if idx == 0 else ""
        nav_items += f"""<button class="nav-btn {active_class}" onclick="showPanel('{panel_id}', this)">{html.escape(result.name)}</button>"""

        panels_html += f"""<div id="{panel_id}" class="panel {active_class}">
            <div class="info-bar">
                <span><strong>损失函数：</strong><code>{html.escape(result.loss_expr)}</code></span>
                <span><strong>学习率：</strong>{result.learning_rate}</span>
                <span><strong>初始点：</strong>({', '.join(str(v) for v in result.initial_point)})</span>
                <span><strong>最大迭代：</strong>{result.max_iterations}</span>
                <span><strong>容差：</strong>{result.tolerance}</span>
            </div>
            <div class="charts">
                <div class="chart-main" id="chart-main-{idx}"></div>
                <div class="chart-side">
                    <div id="chart-loss-{idx}"></div>
                    <div id="chart-grad-{idx}"></div>
                </div>
            </div>
            {diagnosis_html}
            <details class="step-details">
                <summary>迭代详情（{len(result.steps)} 步）</summary>
                <div class="table-wrap">
                    <table>
                        <thead><tr><th>步数</th><th>坐标</th><th>损失值</th><th>梯度范数</th></tr></thead>
                        <tbody>{step_table_rows}</tbody>
                    </table>
                </div>
            </details>
            <script>
                (function() {{
                    var surface = {surface_json};
                    var traj = {trajectory_json};
                    var dim = {dim};
                    var idx = {idx};
                    var bounds = {result.surface_bounds};

                    if (dim === 1) {{
                        var traceSurface = {{
                            x: surface.xs, y: surface.zs,
                            type: 'scatter', mode: 'lines',
                            name: '损失函数', line: {{color: '#636efa', width: 2}}
                        }};
                        var traceTraj = {{
                            x: traj.x, y: traj.z,
                            type: 'scatter', mode: 'markers+lines',
                            name: '迭代轨迹',
                            marker: {{color: traj.iterations, colorscale: 'Reds', size: 6, showscale: true, colorbar: {{title: '步数'}}}},
                            line: {{color: 'rgba(255,0,0,0.3)', width: 1}}
                        }};
                        Plotly.newPlot('chart-main-' + idx, [traceSurface, traceTraj], {{
                            title: '1D 损失函数与迭代轨迹',
                            xaxis: {{title: 'x'}}, yaxis: {{title: 'f(x)'}},
                            margin: {{l:50,r:30,t:40,b:40}}, height: 400
                        }}, {{responsive: true}});
                    }} else {{
                        var traceContour = {{
                            z: surface.zs, x: surface.xs, y: surface.ys,
                            type: 'contour', colorscale: 'Viridis',
                            contours: {{showlabels: true}},
                            colorbar: {{title: 'f(x,y)'}}
                        }};
                        var traceTraj = {{
                            x: traj.x, y: traj.y,
                            type: 'scatter', mode: 'markers+lines',
                            name: '迭代轨迹',
                            marker: {{color: traj.iterations, colorscale: 'Reds', size: 6, showscale: true,
                                colorbar: {{title: '步数', x: 1.1}}, symbol: 'circle'}},
                            line: {{color: 'rgba(255,0,0,0.4)', width: 1.5}}
                        }};
                        var traceStart = {{
                            x: [traj.x[0]], y: [traj.y[0]],
                            type: 'scatter', mode: 'markers',
                            name: '起点', marker: {{color: 'lime', size: 14, symbol: 'star'}}
                        }};
                        var traceEnd = {{
                            x: [traj.x[traj.x.length-1]], y: [traj.y[traj.y.length-1]],
                            type: 'scatter', mode: 'markers',
                            name: '终点', marker: {{color: 'red', size: 12, symbol: 'x'}}
                        }};
                        Plotly.newPlot('chart-main-' + idx, [traceContour, traceTraj, traceStart, traceEnd], {{
                            title: '2D 等高线与迭代轨迹',
                            xaxis: {{title: 'x', range: [bounds[0], bounds[1]]}},
                            yaxis: {{title: 'y', range: [bounds[2], bounds[3]], scaleanchor: 'x'}},
                            margin: {{l:50,r:30,t:40,b:40}}, height: 450
                        }}, {{responsive: true}});
                    }}

                    Plotly.newPlot('chart-loss-' + idx, [{{
                        x: traj.iterations, y: traj.z,
                        type: 'scatter', mode: 'lines+markers',
                        marker: {{size: 3}}, line: {{color: '#636efa'}}
                    }}], {{
                        title: '损失值 vs 迭代', xaxis: {{title: '步数'}}, yaxis: {{title: 'Loss'}},
                        margin: {{l:50,r:20,t:40,b:30}}, height: 200
                    }}, {{responsive: true}});

                    Plotly.newPlot('chart-grad-' + idx, [{{
                        x: traj.iterations, y: traj.grad_norms,
                        type: 'scatter', mode: 'lines+markers',
                        marker: {{size: 3}}, line: {{color: '#ef553b'}}
                    }}], {{
                        title: '梯度范数 vs 迭代', xaxis: {{title: '步数'}}, yaxis: {{title: '|∇f|'}},
                        margin: {{l:50,r:20,t:40,b:30}}, height: 200
                    }}, {{responsive: true}});
                }})();
            </script>
        </div>"""

    full_html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>梯度下降可视课堂</title>
<script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f5; color: #333; padding: 20px; }}
h1 {{ text-align:center; margin-bottom:20px; font-size:1.6em; color:#1a237e; }}
.nav {{ display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-bottom:20px; }}
.nav-btn {{ padding:8px 18px; border:2px solid #1a237e; background:#fff; color:#1a237e; border-radius:20px; cursor:pointer; font-size:0.95em; transition:all .2s; }}
.nav-btn:hover {{ background:#e8eaf6; }}
.nav-btn.active {{ background:#1a237e; color:#fff; }}
.panel {{ display:none; max-width:1200px; margin:0 auto; background:#fff; border-radius:12px; padding:24px; box-shadow:0 2px 12px rgba(0,0,0,0.08); }}
.panel.active {{ display:block; }}
.info-bar {{ display:flex; flex-wrap:wrap; gap:16px; padding:12px 16px; background:#e8eaf6; border-radius:8px; margin-bottom:16px; font-size:0.9em; }}
.info-bar code {{ background:#fff; padding:2px 6px; border-radius:3px; }}
.charts {{ display:flex; gap:16px; margin-bottom:16px; }}
.chart-main {{ flex:2; min-width:0; }}
.chart-side {{ flex:1; display:flex; flex-direction:column; gap:12px; min-width:220px; }}
.diagnosis-card {{ padding:16px; margin:16px 0; background:#fafafa; border-radius:8px; }}
.diagnosis-card h3 {{ margin:0 0 8px 0; font-size:1.1em; }}
.diagnosis-card p {{ margin:4px 0; font-size:0.9em; }}
.issues ul, .suggestions ul {{ margin:6px 0; padding-left:20px; }}
.issues li {{ color:#c62828; }}
.suggestions li {{ color:#2e7d32; }}
.step-details {{ margin-top:16px; }}
.step-details summary {{ cursor:pointer; padding:8px; background:#e8eaf6; border-radius:6px; font-weight:bold; }}
.table-wrap {{ max-height:300px; overflow:auto; margin-top:8px; }}
table {{ border-collapse:collapse; width:100%; font-size:0.85em; }}
th, td {{ padding:6px 10px; border:1px solid #ddd; text-align:left; }}
th {{ background:#e8eaf6; position:sticky; top:0; }}
tr:nth-child(even) {{ background:#fafafa; }}
@media (max-width:768px) {{
    .charts {{ flex-direction:column; }}
    .chart-side {{ min-width:auto; }}
}}
</style>
</head>
<body>
<h1>🎓 梯度下降可视课堂</h1>
<div class="nav">{nav_items}</div>
{panels_html}
<script>
function showPanel(id, btn) {{
    document.querySelectorAll('.panel').forEach(function(p) {{ p.classList.remove('active'); }});
    document.querySelectorAll('.nav-btn').forEach(function(b) {{ b.classList.remove('active'); }});
    document.getElementById(id).classList.add('active');
    btn.classList.add('active');
    Plotly.Plots.resize(document.getElementById(id).querySelector('.chart-main').firstChild);
}}
window.addEventListener('resize', function() {{
    Plotly.plotlyResizeAll && Plotly.plotlyResizeAll();
}});
</script>
</body>
</html>"""

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(full_html)

    return output_path
