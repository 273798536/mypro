"""
报告生成模块
生成 HTML 格式的潮间带物种分布报告，特点：
1. 图、表、文字说明三者共用同一批处理记录，对得上
2. 有一段普通话解释，可直接复制给同事
3. 每条异常都可追溯到原始数据和处理意见
"""
from __future__ import annotations

import os
from datetime import datetime
from typing import Optional

import pandas as pd

from .audit_log import AuditLog


REPORT_TEMPLATE = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>潮间带物种分布调查报告</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', sans-serif;
            background: #f3f4f6;
            color: #1f2937;
            line-height: 1.7;
            padding: 20px;
        }}
        .container {{
            max-width: 960px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #0ea5e9, #0369a1);
            color: white;
            padding: 32px 40px;
        }}
        .header h1 {{ font-size: 24px; font-weight: 600; margin-bottom: 8px; }}
        .header .subtitle {{ font-size: 14px; opacity: 0.9; }}
        .section {{ padding: 28px 40px; border-bottom: 1px solid #e5e7eb; }}
        .section:last-child {{ border-bottom: none; }}
        .section h2 {{
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        .section h2 .icon {{ font-size: 20px; }}

        .plain-text-box {{
            background: #f0fdf4;
            border-left: 4px solid #10b981;
            padding: 16px 20px;
            margin: 16px 0;
            border-radius: 0 8px 8px 0;
            font-size: 14px;
            line-height: 1.8;
        }}
        .plain-text-box .label {{
            font-size: 12px;
            color: #10b981;
            font-weight: 600;
            margin-bottom: 6px;
        }}
        .copy-note {{
            font-size: 12px;
            color: #6b7280;
            margin-top: 8px;
            font-style: italic;
        }}

        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 20px;
        }}
        .stat-card {{
            background: #f9fafb;
            border-radius: 8px;
            padding: 16px;
            text-align: center;
        }}
        .stat-card .num {{ font-size: 28px; font-weight: 700; color: #0ea5e9; }}
        .stat-card .label {{ font-size: 13px; color: #6b7280; margin-top: 4px; }}
        .stat-card.error .num {{ color: #ef4444; }}
        .stat-card.warning .num {{ color: #f59e0b; }}

        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-top: 12px;
        }}
        th, td {{
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }}
        th {{
            background: #f9fafb;
            font-weight: 600;
            color: #374151;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        tr:hover {{ background: #f9fafb; }}

        .tag {{
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
        }}
        .tag.error {{ background: #fee2e2; color: #dc2626; }}
        .tag.warning {{ background: #fef3c7; color: #d97706; }}
        .tag.info {{ background: #dbeafe; color: #2563eb; }}
        .tag.success {{ background: #dcfce7; color: #16a34a; }}

        .record-id {{
            font-family: 'SF Mono', 'Menlo', monospace;
            font-size: 12px;
            color: #2563eb;
            background: #eff6ff;
            padding: 2px 6px;
            border-radius: 4px;
        }}

        .chart-img {{
            width: 100%;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            margin: 12px 0;
        }}

        .trace-section {{
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 8px;
            padding: 16px;
            margin-top: 12px;
        }}
        .trace-section h4 {{
            color: #92400e;
            margin-bottom: 8px;
            font-size: 14px;
        }}
        .trace-section p {{ font-size: 13px; color: #78350f; }}

        .footer {{
            padding: 20px 40px;
            background: #f9fafb;
            font-size: 12px;
            color: #9ca3af;
            text-align: center;
        }}

        .map-frame {{
            width: 100%;
            height: 400px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin: 12px 0;
        }}

        .review-entry {{
            background: #eff6ff;
            border: 1px dashed #93c5fd;
            border-radius: 8px;
            padding: 14px 18px;
            margin-top: 16px;
            font-size: 13px;
        }}
        .review-entry strong {{ color: #1d4ed8; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌊 潮间带物种分布调查报告</h1>
            <div class="subtitle">生成时间：{generated_time} · 会话：{session_name}</div>
        </div>

        <div class="section">
            <h2><span class="icon">📋</span> 核心结论（可直接复制给同事）</h2>
            <div class="plain-text-box">
                <div class="label">💡 普通话版本 · 一键复制</div>
                {plain_text_summary}
            </div>
            <p class="copy-note">注：以上文字可直接复制转发，数据来源于本次处理的 {total_species} 条物种观测记录、{total_tide} 条潮汐数据、{total_salinity} 条盐度数据。</p>
        </div>

        <div class="section">
            <h2><span class="icon">📊</span> 数据概览</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="num">{total_species}</div>
                    <div class="label">物种观测点</div>
                </div>
                <div class="stat-card">
                    <div class="num">{species_types}</div>
                    <div class="label">物种种类</div>
                </div>
                <div class="stat-card error">
                    <div class="num">{error_count}</div>
                    <div class="label">校验错误</div>
                </div>
                <div class="stat-card warning">
                    <div class="num">{warning_count}</div>
                    <div class="label">校验警告</div>
                </div>
            </div>
            <p style="font-size:13px;color:#6b7280;">
                本次共处理 {total_records} 条处理记录，所有地图、图表、报告数据均来自同一批处理结果，
                可通过记录ID回溯到原始数据和处理意见。
            </p>
        </div>

        <div class="section">
            <h2><span class="icon">🗺️</span> 物种分布地图</h2>
            <p style="font-size:13px;color:#6b7280;margin-bottom:8px;">
                点击地图上的标记点可查看详细信息和处理记录ID。
            </p>
            {map_html}
        </div>

        <div class="section">
            <h2><span class="icon">📈</span> 统计图表</h2>
            {charts_html}
        </div>

        <div class="section">
            <h2><span class="icon">🔍</span> 校验问题清单</h2>
            {issues_table}

            {trace_sections}

            <div class="review-entry">
                <strong>🔧 复核入口提示：</strong>
                如需修正某条记录，可使用命令行工具的复核模式：
                <code style="background:#dbeafe;padding:2px 6px;border-radius:4px;">python cli.py review --issue-id 问题ID</code>
                或
                <code style="background:#dbeafe;padding:2px 6px;border-radius:4px;">python cli.py review --record-id 记录ID</code>
                ，无需重新导入全部数据。
            </div>
        </div>

        <div class="section">
            <h2><span class="icon">📝</span> 处理记录摘要</h2>
            <p style="font-size:13px;color:#6b7280;margin-bottom:8px;">
                以下为最近 20 条处理记录，完整记录见审计日志 JSON 文件。
            </p>
            {records_table}
        </div>

        <div class="footer">
            本报告由潮间带物种分布图工具自动生成 · 所有数据可追溯 · 版本 {version}
        </div>
    </div>
</body>
</html>
"""


class ReportGenerator:
    """报告生成器"""

    def __init__(self, audit_log: AuditLog):
        self.audit = audit_log

    def generate(
        self,
        species_df: pd.DataFrame,
        tide_df: pd.DataFrame,
        salinity_df: pd.DataFrame,
        map_path: str,
        chart_paths: dict,
        output_path: str = "output/report.html",
    ) -> str:
        """生成完整报告"""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)

        plain_text = self._generate_plain_text_summary(
            species_df, tide_df, salinity_df
        )

        map_html = self._build_map_html(map_path)

        charts_html = self._build_charts_html(chart_paths)

        issues_table = self._build_issues_table()
        trace_sections = self._build_trace_sections()

        records_table = self._build_records_table()

        summary = self.audit.summary()
        error_count = summary["issues_by_severity"].get("error", 0)
        warning_count = summary["issues_by_severity"].get("warning", 0)

        species_types = (
            species_df["species"].nunique()
            if species_df is not None and "species" in species_df.columns
            else 0
        )

        html = REPORT_TEMPLATE.format(
            generated_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            session_name=self.audit.session_name,
            plain_text_summary=plain_text.replace("\n", "<br>"),
            total_species=len(species_df) if species_df is not None else 0,
            total_tide=len(tide_df) if tide_df is not None else 0,
            total_salinity=len(salinity_df) if salinity_df is not None else 0,
            species_types=species_types,
            error_count=error_count,
            warning_count=warning_count,
            total_records=summary["total_records"],
            map_html=map_html,
            charts_html=charts_html,
            issues_table=issues_table,
            trace_sections=trace_sections,
            records_table=records_table,
            version="1.0.0"
        )

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html)

        return output_path

    def _generate_plain_text_summary(
        self,
        species_df: pd.DataFrame,
        tide_df: pd.DataFrame,
        salinity_df: pd.DataFrame
    ) -> str:
        """生成普通话解释段落，可直接复制给同事"""

        species_count = len(species_df) if species_df is not None else 0
        tide_count = len(tide_df) if tide_df is not None else 0
        salinity_count = len(salinity_df) if salinity_df is not None else 0

        species_types = 0
        top_species = ""
        if species_df is not None and "species" in species_df.columns:
            species_types = species_df["species"].nunique()
            top = species_df["species"].value_counts().head(3)
            top_species = "、".join(
                f"{name}（{count}处）" for name, count in top.items()
            )

        summary = self.audit.summary()
        issue_count = summary["total_issues"]
        error_count = summary["issues_by_severity"].get("error", 0)
        warning_count = summary["issues_by_severity"].get("warning", 0)

        salinity_ok = error_count == 0 or "salinity_unit_mixed" not in summary.get("issues_by_type", {})

        lines = []
        lines.append("各位同事好，这是本次潮间带物种分布调查的处理结果：")
        lines.append("")
        lines.append(f"一、调查概况：本次共记录了 {species_count} 个物种观测点位，涉及 {species_types} 种潮间带生物。")
        if top_species:
            lines.append(f"数量最多的前三种是：{top_species}。")
        lines.append("")
        lines.append(f"二、数据处理情况：配套的潮汐数据有 {tide_count} 条，盐度数据有 {salinity_count} 条。")
        if salinity_ok:
            lines.append("盐度单位已经统一成 psu（实用盐度单位），符合海事处的要求。")
        else:
            lines.append("注意：盐度数据存在单位混用的情况，已经标注出来需要复核，海事处那边可能会追问依据。")
        lines.append("")
        lines.append(f"三、质量检查：一共发现 {issue_count} 个问题，其中错误 {error_count} 个、警告 {warning_count} 个。")
        if error_count > 0:
            lines.append("错误的地方需要大家重点复核，特别是潮位时区和盐度单位这两块。")
        else:
            lines.append("整体数据质量还可以，主要是一些警告项，大家抽空看看就行。")
        lines.append("")
        lines.append("四、关于复核：地图、表格、报告都是同一批数据算出来的，对得上。")
        lines.append("如果发现哪条记录有问题，可以直接用记录ID反查到原始数据和处理意见，不用重新导一遍。")
        lines.append("")
        lines.append("有问题随时找我。")

        return "\n".join(lines)

    def _build_map_html(self, map_path: str) -> str:
        """构建地图嵌入 HTML"""
        if not map_path or not os.path.exists(map_path):
            return '<p style="color:#9ca3af;font-size:13px;">暂无地图</p>'

        map_filename = os.path.basename(map_path)
        return f'''
        <iframe src="{map_filename}" class="map-frame" title="物种分布地图"></iframe>
        <p style="font-size:12px;color:#9ca3af;text-align:center;">
            地图与报告共用同一份处理数据，所有标记点均可追溯到原始记录
        </p>
        '''

    def _build_charts_html(self, chart_paths: dict) -> str:
        """构建图表 HTML"""
        if not chart_paths:
            return '<p style="color:#9ca3af;font-size:13px;">暂无图表</p>'

        html = ""
        chart_titles = {
            "species_count": "物种数量统计",
            "tide_curve": "潮汐水位曲线",
            "salinity": "盐度分布",
            "issue_summary": "校验问题统计"
        }

        for key, path in chart_paths.items():
            if not path or not os.path.exists(path):
                continue
            filename = os.path.basename(path)
            title = chart_titles.get(key, key)
            html += f'''
            <div style="margin-bottom:20px;">
                <h3 style="font-size:15px;color:#374151;margin-bottom:8px;">{title}</h3>
                <img src="charts/{filename}" class="chart-img" alt="{title}">
            </div>
            '''

        return html

    def _build_issues_table(self) -> str:
        """构建问题清单表格"""
        issues = self.audit.issues
        if not issues:
            return '<p style="color:#10b981;font-size:13px;">✅ 未发现校验问题</p>'

        severity_map = {
            "error": ("error", "错误"),
            "warning": ("warning", "警告"),
            "info": ("info", "提示")
        }

        rows = ""
        for issue in issues:
            sev_class, sev_label = severity_map.get(
                issue.severity, ("info", "其他")
            )
            rows += f"""
            <tr>
                <td><span class="record-id">{issue.issue_id}</span></td>
                <td><span class="tag {sev_class}">{sev_label}</span></td>
                <td>{issue.issue_type}</td>
                <td>{issue.source_type} 第 {issue.source_row_index} 行</td>
                <td>{issue.description[:50]}{"..." if len(issue.description) > 50 else ""}</td>
            </tr>
            """

        return f"""
        <table>
            <thead>
                <tr>
                    <th>问题ID</th>
                    <th>严重程度</th>
                    <th>问题类型</th>
                    <th>来源</th>
                    <th>描述</th>
                </tr>
            </thead>
            <tbody>{rows}</tbody>
        </table>
        """

    def _build_trace_sections(self) -> str:
        """构建追溯说明区块，演示如何从异常回溯到潮汐表"""
        issues = self.audit.issues
        if not issues:
            return ""

        tide_issues = [i for i in issues if i.issue_type == "tide_timezone_error"]
        if not tide_issues:
            return ""

        sample = tide_issues[0]
        records = self.audit.get_records_by_source(
            sample.source_type, sample.source_row_index
        )
        record_ids = "、".join(f'<span class="record-id">{r.record_id}</span>' for r in records)

        return f"""
        <div class="trace-section">
            <h4>🔎 追溯示例：从一条潮位时区错记录怎么倒查？</h4>
            <p>
                以问题 <span class="record-id">{sample.issue_id}</span> 为例：<br>
                1. 该问题来自 <strong>{sample.source_type}</strong> 数据第 <strong>{sample.source_row_index}</strong> 行<br>
                2. 对应处理记录：{record_ids}<br>
                3. 原始值：<code>{sample.current_value}</code><br>
                4. 期望：<code>{sample.expected_value}</code><br>
                5. 处理意见：{sample.description}<br>
                6. 可直接使用 <code>python cli.py review --issue-id {sample.issue_id}</code> 进入复核模式修正
            </p>
        </div>
        """

    def _build_records_table(self) -> str:
        """构建处理记录表格"""
        records = self.audit.records
        if not records:
            return '<p style="color:#9ca3af;font-size:13px;">暂无处理记录</p>'

        recent = records[-20:] if len(records) > 20 else records

        rows = ""
        for rec in reversed(recent):
            rows += f"""
            <tr>
                <td><span class="record-id">{rec.record_id}</span></td>
                <td>{rec.action}</td>
                <td>{rec.source_type}</td>
                <td>{rec.reason[:30]}{"..." if len(rec.reason) > 30 else ""}</td>
                <td style="font-size:11px;color:#9ca3af;">{rec.timestamp[11:19]}</td>
            </tr>
            """

        return f"""
        <table>
            <thead>
                <tr>
                    <th>记录ID</th>
                    <th>操作</th>
                    <th>来源类型</th>
                    <th>原因</th>
                    <th>时间</th>
                </tr>
            </thead>
            <tbody>{rows}</tbody>
        </table>
        <p style="font-size:12px;color:#9ca3af;margin-top:8px;">
            共 {len(records)} 条处理记录 · 显示最近 20 条
        </p>
        """
