import os
import pandas as pd
from datetime import datetime
from typing import Dict, Any, List
from .fitter import FitResult, SternVolmerFitter
from .safety import SafetyReport, SafetyAlert, SafetyAnalyzer
from .data_loader import DataLoader


class Reporter:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate_data_table(self, df: pd.DataFrame, issues: Dict[str, Any]) -> str:
        abnormal_rows = set(x['row_id'] for x in issues.get('abnormal_intensity', []))
        time_missing_rows = set(x['row_id'] for x in issues.get('time_missing', []))
        dup_batches = set()
        for d in issues.get('duplicate_batches', []):
            dup_batches.add(d['batch_no'])
        unit_missing_rows = set(x['row_id'] for x in issues.get('unit_missing', []))
        sup_rows = set(x['row_id'] for x in issues.get('supplementary_records', []))

        display_cols = ['_row_id', 'idx', 'batch_no', 'material', 'concentration',
                        'conc_unit', 'intensity', 'reaction_time', 'time_unit',
                        'remark']
        col_names = {
            '_row_id': '行号',
            'idx': '序号',
            'batch_no': '样品批号',
            'material': '材料名称',
            'concentration': '猝灭剂浓度',
            'conc_unit': '单位',
            'intensity': '荧光强度',
            'reaction_time': '反应时间',
            'time_unit': '时间单位',
            'remark': '备注'
        }

        html_parts = []
        html_parts.append('<table class="data-table">')
        html_parts.append('<thead><tr>')
        for c in display_cols:
            html_parts.append(f'<th>{col_names.get(c, c)}</th>')
        html_parts.append('<th>质量标记</th>')
        html_parts.append('</tr></thead><tbody>')

        for _, row in df.iterrows():
            rid = row['_row_id']
            tags = []
            row_class = ''

            if rid in abnormal_rows:
                tags.append('<span class="tag tag-danger">异常强度</span>')
                row_class = 'row-danger'
            if rid in time_missing_rows:
                tags.append('<span class="tag tag-warning">缺反应时间</span>')
                row_class = 'row-warning' if not row_class else row_class
            if row['batch_no'] in dup_batches:
                tags.append('<span class="tag tag-warning">批号重复</span>')
                if not row_class:
                    row_class = 'row-warning'
            if rid in unit_missing_rows:
                tags.append('<span class="tag tag-info">缺单位</span>')
            if rid in sup_rows:
                tags.append('<span class="tag tag-info">补录/旧表</span>')

            html_parts.append(f'<tr class="{row_class}">')
            for c in display_cols:
                val = row.get(c, '')
                if pd.isna(val):
                    val = '<span class="missing">—</span>'
                html_parts.append(f'<td>{val}</td>')
            html_parts.append(f'<td>{" ".join(tags) if tags else "✓ 正常"}</td>')
            html_parts.append('</tr>')

        html_parts.append('</tbody></table>')
        return '\n'.join(html_parts)

    def generate_fit_table(self, fit_before: FitResult, fit_after: FitResult,
                           comparison: Dict[str, Any]) -> str:
        rows = [
            ('拟合方法', fit_before.method, fit_after.method),
            ('参与拟合点数', str(fit_before.n_points), str(fit_after.n_points)),
            ('Ksv (L/mmol)', f'{fit_before.ksv:.6f} ± {fit_before.ksv_err:.6f}',
             f'{fit_after.ksv:.6f} ± {fit_after.ksv_err:.6f}'),
            ('Ksv变化', '—',
             f'{comparison["ksv_diff"]:+.6f} ({comparison["ksv_pct_change"]:+.2f}%)'),
            ('截距', f'{fit_before.intercept:.4f} ± {fit_before.intercept_err:.4f}',
             f'{fit_after.intercept:.4f} ± {fit_after.intercept_err:.4f}'),
            ('相关系数 R²', f'{fit_before.r_squared:.6f}', f'{fit_after.r_squared:.6f}'),
            ('调整 R²', f'{fit_before.adj_r_squared:.6f}', f'{fit_after.adj_r_squared:.6f}'),
            ('均方根误差 RMSE', f'{fit_before.rmse:.6f}', f'{fit_after.rmse:.6f}'),
            ('R²变化', '—', f'{comparison["r2_diff"]:+.6f}'),
            ('I0 估计值', f'{fit_before.i0:.2f}', f'{fit_after.i0:.2f}'),
            ('质量判定',
             f'<span class="judge {"judge-ok" if "合格" in comparison["judgment_before"] or "基本" in comparison["judgment_before"] else "judge-bad"}">{comparison["judgment_before"]}</span>',
             f'<span class="judge {"judge-ok" if "合格" in comparison["judgment_after"] or "基本" in comparison["judgment_after"] else "judge-bad"}">{comparison["judgment_after"]}</span>')
        ]

        html = ['<table class="fit-table">']
        html.append('<thead><tr><th>参数</th><th>配平前</th><th>配平后</th></tr></thead>')
        html.append('<tbody>')
        for name, v1, v2 in rows:
            highlight = ''
            if name == '质量判定' and comparison['judgment_changed']:
                highlight = 'highlight-change'
            elif name in ('Ksv变化', 'R²变化'):
                highlight = 'highlight-diff'
            html.append(f'<tr class="{highlight}"><td class="param-name">{name}</td><td>{v1}</td><td>{v2}</td></tr>')
        html.append('</tbody></table>')

        if comparison['judgment_changed']:
            html.append('<div class="alert alert-danger">')
            html.append('<strong>⚠ 判定改变：</strong>')
            html.append(f'配平前为「{comparison["judgment_before"]}」，配平后为「{comparison["judgment_after"]}」。')
            html.append('数据问题对结果有实质性影响，请质检主管重点关注异常数据来源。')
            html.append('</div>')
        else:
            html.append('<div class="alert alert-info">')
            html.append(f'<strong>✓ 判定一致：</strong>')
            html.append(f'配平前后均判定为「{comparison["judgment_after"]}」。但仍建议复核异常记录。')
            html.append('</div>')

        return '\n'.join(html)

    def generate_alerts_table(self, analyzer: SafetyAnalyzer) -> str:
        safety = analyzer.report
        if not safety.alerts:
            return '<p class="muted">未检测到数据质量问题。</p>'

        html = ['<table class="alert-table">']
        html.append('<thead><tr><th>风险</th><th>类别</th><th>批号</th><th>材料</th><th>行号</th><th>问题说明</th></tr></thead>')
        html.append('<tbody>')

        level_class = {'高风险': 'level-high', '中风险': 'level-mid',
                       '低风险': 'level-low', '提示': 'level-info'}

        for a in safety.alerts:
            html.append(f'<tr class="{level_class.get(a.level, "")}">')
            html.append(f'<td><span class="level-badge {level_class.get(a.level, "")}">{a.level}</span></td>')
            html.append(f'<td>{a.category}</td>')
            html.append(f'<td>{", ".join(a.affected_batches)}</td>')
            html.append(f'<td>{", ".join(a.affected_materials) if a.affected_materials else "—"}</td>')
            html.append(f'<td>{", ".join(str(r) for r in a.affected_rows)}</td>')
            html.append(f'<td>{a.detail}</td>')
            html.append('</tr>')

        html.append('</tbody></table>')

        time_alerts = [a for a in safety.alerts if a.category == '反应时间漏记']
        dup_alerts = [a for a in safety.alerts if a.category == '批号重复']

        if time_alerts or dup_alerts:
            html.append('<div class="manager-box">')
            html.append('<h4>📋 质检主管快速定位清单</h4>')

            if time_alerts:
                html.append('<p class="manager-title">【反应时间漏记】— 卡在哪份材料？</p>')
                html.append('<ul>')
                for a in time_alerts:
                    mats = '、'.join(a.affected_materials) if a.affected_materials else '未标注'
                    batches = '、'.join(a.affected_batches)
                    rows = '、'.join(str(r) for r in a.affected_rows)
                    extra = f"（{a.evidence}）" if a.evidence and a.evidence != '无' else ''
                    html.append(
                        f'<li>材料<b>【{mats}】</b>，批号<b>【{batches}】</b>，'
                        f'数据行<b>{rows}</b>{extra}</li>'
                    )
                html.append('</ul>')

            if dup_alerts:
                html.append('<p class="manager-title">【批号重复】— 卡在哪份材料？</p>')
                html.append('<ul>')
                for a in dup_alerts:
                    mats = '、'.join(a.affected_materials) if a.affected_materials else '未标注'
                    batches = '、'.join(a.affected_batches)
                    rows = '、'.join(str(r) for r in a.affected_rows)
                    html.append(
                        f'<li>材料<b>【{mats}】</b>，批号<b>【{batches}】</b>，'
                        f'数据行<b>{rows}</b>'
                    )
                html.append('</ul>')

            html.append('</div>')

        return '\n'.join(html)

    def generate_html_report(self, data_loader: DataLoader, fit_before: FitResult,
                             fit_after: FitResult, analyzer: SafetyAnalyzer,
                             plot_files: Dict[str, str],
                             report_filename: str = 'report.html') -> str:
        css = """
        <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
            line-height: 1.7; color: #333; max-width: 1100px; margin: 0 auto;
            padding: 30px; background: #fafafa;
        }
        h1 { color: #1f4e79; font-size: 26px; border-bottom: 3px solid #1f4e79;
             padding-bottom: 10px; margin-bottom: 25px; }
        h2 { color: #2e75b6; font-size: 20px; margin: 30px 0 15px 0;
             padding-left: 10px; border-left: 4px solid #2e75b6; }
        h3 { color: #404040; font-size: 16px; margin: 20px 0 10px 0; }
        h4 { color: #404040; font-size: 15px; margin-bottom: 12px; }
        .section { background: white; border-radius: 8px; padding: 22px;
                   margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .exec-summary { background: linear-gradient(135deg, #1f4e79, #2e75b6);
                        color: white; padding: 22px; border-radius: 8px;
                        margin-bottom: 25px; }
        .exec-summary h2 { color: white; border-color: white; margin-top: 0; }
        .exec-summary p { font-size: 15px; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0;
                font-size: 13.5px; }
        th { background: #1f4e79; color: white; padding: 10px 12px;
             text-align: left; font-weight: 600; }
        td { padding: 9px 12px; border-bottom: 1px solid #e0e0e0; }
        tr:nth-child(even) { background: #f8f9fb; }
        tr:hover { background: #eef4fb; }
        .data-table .row-danger { background: #fff2f2 !important; }
        .data-table .row-warning { background: #fff8e6 !important; }
        .data-table .row-danger:hover, .data-table .row-warning:hover { opacity: 0.85; }
        .tag { display: inline-block; padding: 2px 8px; border-radius: 10px;
               font-size: 11px; margin: 1px 2px; font-weight: 500; }
        .tag-danger { background: #fde4e4; color: #c00000; }
        .tag-warning { background: #fff4cc; color: #806000; }
        .tag-info { background: #d9e8fa; color: #1f4e79; }
        .missing { color: #bbb; font-style: italic; }
        .fit-table .param-name { font-weight: 600; color: #1f4e79; }
        .fit-table .highlight-change { background: #fff2f2 !important; }
        .fit-table .highlight-change td { font-weight: bold; color: #c00000; }
        .fit-table .highlight-diff td { color: #1f4e79; font-style: italic; }
        .judge { padding: 3px 10px; border-radius: 4px; font-weight: 600; }
        .judge-ok { background: #e2efd9; color: #375623; }
        .judge-bad { background: #fde4e4; color: #c00000; }
        .alert { padding: 14px 18px; border-radius: 6px; margin: 15px 0;
                 font-size: 14px; }
        .alert-danger { background: #fde4e4; border-left: 4px solid #c00000; color: #5c0000; }
        .alert-info { background: #d9e8fa; border-left: 4px solid #2e75b6; color: #0f3b66; }
        .alert strong { margin-right: 6px; }
        .alert-table tr.level-high { background: #fff2f2; }
        .alert-table tr.level-mid { background: #fff8e6; }
        .alert-table tr.level-low { background: #e2efd9; }
        .alert-table tr.level-info { background: #eef4fb; }
        .level-badge { padding: 3px 10px; border-radius: 4px; font-size: 12px;
                       font-weight: 600; display: inline-block; }
        .level-badge.level-high { background: #c00000; color: white; }
        .level-badge.level-mid { background: #ed7d31; color: white; }
        .level-badge.level-low { background: #70ad47; color: white; }
        .level-badge.level-info { background: #2e75b6; color: white; }
        .manager-box { background: #fff8e6; border: 2px solid #ffc000;
                       border-radius: 8px; padding: 18px; margin-top: 18px; }
        .manager-box h4 { color: #806000; margin-bottom: 12px; }
        .manager-title { font-weight: 600; color: #806000; margin: 10px 0 6px 0; }
        .manager-box ul { padding-left: 20px; }
        .manager-box li { margin: 5px 0; }
        .fig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px;
                    margin: 15px 0; }
        .fig-grid.single { grid-template-columns: 1fr; }
        .fig-box { background: #f8f9fb; padding: 12px; border-radius: 6px;
                   text-align: center; }
        .fig-box img { max-width: 100%; border: 1px solid #ddd; border-radius: 4px; }
        .fig-caption { color: #666; font-size: 13px; margin-top: 8px;
                       font-style: italic; }
        .muted { color: #999; font-style: italic; }
        .footer { text-align: center; color: #999; font-size: 12px;
                  margin-top: 40px; padding-top: 18px; border-top: 1px solid #ddd; }
        .warning-list { background: #fff8e6; padding: 12px 20px; border-radius: 6px;
                        margin: 10px 0; }
        .warning-list li { margin: 4px 0; }
        </style>
        """

        html = [f'<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">']
        html.append('<title>荧光猝灭曲线拟合分析报告</title>')
        html.append(css)
        html.append('</head><body>')

        html.append('<h1>🔬 荧光猝灭 Stern-Volmer 曲线拟合分析报告</h1>')

        safety = analyzer.report
        html.append('<div class="exec-summary">')
        html.append('<h2>📊 质检主管摘要</h2>')
        html.append(f'<p>{analyzer.get_executive_for_manager()}</p>')
        comp = safety.comparison
        html.append(f'<p>拟合结果：Ksv = {fit_after.ksv:.4f} ± {fit_after.ksv_err:.4f} L/mmol | '
                    f'R² = {fit_after.r_squared:.4f} | 最终判定：{comp["judgment_after"]}</p>')
        total_alerts = len(safety.alerts)
        high = sum(1 for a in safety.alerts if a.level == '高风险')
        mid = sum(1 for a in safety.alerts if a.level == '中风险')
        html.append(f'<p>安全风险提示：共 {total_alerts} 项（高风险 {high} 项 / 中风险 {mid} 项），'
                    f'详见下方安全分析部分。</p>')
        html.append('</div>')

        html.append('<div class="section">')
        html.append('<h2>1️⃣ 数据质量安全分析</h2>')
        html.append(self.generate_alerts_table(analyzer))
        html.append('</div>')

        html.append('<div class="section">')
        html.append('<h2>2️⃣ 原始数据明细</h2>')
        html.append('<p class="muted">表格中已用不同颜色和标签标记各类数据问题，方便逐行核对。</p>')
        html.append(self.generate_data_table(data_loader.clean_data, data_loader.issues))
        html.append('</div>')

        html.append('<div class="section">')
        html.append('<h2>3️⃣ 拟合参数对比（配平前 vs 配平后）</h2>')
        comparison = safety.comparison
        html.append(self.generate_fit_table(fit_before, fit_after, comparison))
        if fit_before.warnings or fit_after.warnings:
            html.append('<h3>拟合警告</h3>')
            html.append('<ul class="warning-list">')
            for w in fit_before.warnings:
                html.append(f'<li>配平前：{w}</li>')
            for w in fit_after.warnings:
                if w not in fit_before.warnings:
                    html.append(f'<li>配平后：{w}</li>')
            html.append('</ul>')
        html.append('</div>')

        html.append('<div class="section">')
        html.append('<h2>4️⃣ 可视化图表</h2>')

        html.append('<h3>4.1 Stern-Volmer 拟合曲线对比</h3>')
        html.append('<div class="fig-grid single">')
        if 'stern_volmer' in plot_files:
            html.append('<div class="fig-box">')
            html.append(f'<img src="{os.path.basename(plot_files["stern_volmer"])}" alt="拟合曲线">')
            html.append('<p class="fig-caption">图1：配平前后Stern-Volmer拟合对比。'
                        '异常点（红色×）、时间漏记（橙色△）、补录（绿色◇）均已在图中标出。</p>')
            html.append('</div>')
        html.append('</div>')

        html.append('<h3>4.2 原始荧光强度分布</h3>')
        html.append('<div class="fig-grid single">')
        if 'raw_intensity' in plot_files:
            html.append('<div class="fig-box">')
            html.append(f'<img src="{os.path.basename(plot_files["raw_intensity"])}" alt="原始强度">')
            html.append('<p class="fig-caption">图2：各数据行的原始荧光强度柱状图。'
                        '红色为异常值、橙色为反应时间漏记记录。灰色虚线为均值和3σ控制线。</p>')
            html.append('</div>')
        html.append('</div>')

        html.append('<h3>4.3 残差分析对比</h3>')
        html.append('<div class="fig-grid single">')
        if 'residuals' in plot_files:
            html.append('<div class="fig-box">')
            html.append(f'<img src="{os.path.basename(plot_files["residuals"])}" alt="残差分析">')
            html.append('<p class="fig-caption">图3：配平前后残差分布对比。绿色区域为±RMSE区间，'
                        '理想情况下残差应随机分布在0附近。</p>')
            html.append('</div>')
        html.append('</div>')

        html.append('<h3>4.4 数据问题统计 & 拟合质量雷达图</h3>')
        html.append('<div class="fig-grid">')
        if 'issue_summary' in plot_files:
            html.append('<div class="fig-box">')
            html.append(f'<img src="{os.path.basename(plot_files["issue_summary"])}" alt="问题统计">')
            html.append('<p class="fig-caption">图4：数据质量各类问题数量统计。红色为高风险、橙色为中风险。</p>')
            html.append('</div>')
        if 'comparison_radar' in plot_files:
            html.append('<div class="fig-box">')
            html.append(f'<img src="{os.path.basename(plot_files["comparison_radar"])}" alt="雷达图">')
            html.append('<p class="fig-caption">图5：拟合质量四维雷达图。绿色（配平后）越往外越好。</p>')
            html.append('</div>')
        html.append('</div>')

        html.append('</div>')

        html.append('<div class="section">')
        html.append('<h2>5️⃣ 拟合结果文本说明</h2>')
        html.append('<h3>配平前拟合结果</h3>')
        html.append(f'<pre style="background:#f8f9fb;padding:15px;border-radius:6px;'
                    f'font-family:Consolas,monospace;font-size:13px;overflow-x:auto;">'
                    f'{SternVolmerFitter.format_fit_report(fit_before)}</pre>')
        html.append('<h3>配平后拟合结果</h3>')
        html.append(f'<pre style="background:#f8f9fb;padding:15px;border-radius:6px;'
                    f'font-family:Consolas,monospace;font-size:13px;overflow-x:auto;">'
                    f'{SternVolmerFitter.format_fit_report(fit_after)}</pre>')
        html.append('<h3>数据质量检查报告</h3>')
        html.append(f'<pre style="background:#f8f9fb;padding:15px;border-radius:6px;'
                    f'font-family:Consolas,monospace;font-size:13px;overflow-x:auto;">'
                    f'{data_loader.get_issue_summary()}</pre>')
        html.append('</div>')

        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        html.append(f'<div class="footer">报告生成时间：{now} | 荧光猝灭曲线拟合系统 v1.0</div>')
        html.append('</body></html>')

        filepath = os.path.join(self.output_dir, report_filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(html))

        print(f'[报告] HTML报告已生成: {filepath}')
        return filepath

    def generate_text_report(self, data_loader: DataLoader, fit_before: FitResult,
                             fit_after: FitResult, analyzer: SafetyAnalyzer,
                             report_filename: str = 'report.txt') -> str:
        safety = analyzer.report
        lines = []
        lines.append('=' * 80)
        lines.append('荧光猝灭 Stern-Volmer 曲线拟合分析报告')
        lines.append('=' * 80)
        lines.append(f'报告生成时间: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
        lines.append('')

        lines.append('【质检主管摘要】')
        lines.append(analyzer.get_executive_for_manager())
        comp = safety.comparison
        lines.append(f'最终拟合: Ksv = {fit_after.ksv:.4f} ± {fit_after.ksv_err:.4f} L/mmol, '
                     f'R² = {fit_after.r_squared:.4f}, 判定 = {comp["judgment_after"]}')
        lines.append('')

        lines.append('=' * 80)
        lines.append('一、数据质量安全分析')
        lines.append('=' * 80)
        lines.append(analyzer.format_alerts_table())
        lines.append('')

        time_alerts = [a for a in safety.alerts if a.category == '反应时间漏记']
        dup_alerts = [a for a in safety.alerts if a.category == '批号重复']
        if time_alerts or dup_alerts:
            lines.append('>>> 质检主管快速定位清单 <<<')
            if time_alerts:
                lines.append('[反应时间漏记] 卡在哪份材料？')
                for a in time_alerts:
                    mats = '、'.join(a.affected_materials) if a.affected_materials else '未标注'
                    batches = '、'.join(a.affected_batches)
                    rows = '、'.join(str(r) for r in a.affected_rows)
                    extra = f"（{a.evidence}）" if a.evidence and a.evidence != '无' else ''
                    lines.append(f'  → 材料【{mats}】| 批号【{batches}】| 行号 {rows}{extra}')
            if dup_alerts:
                lines.append('[批号重复] 卡在哪份材料？')
                for a in dup_alerts:
                    mats = '、'.join(a.affected_materials) if a.affected_materials else '未标注'
                    batches = '、'.join(a.affected_batches)
                    rows = '、'.join(str(r) for r in a.affected_rows)
                    lines.append(f'  → 材料【{mats}】| 批号【{batches}】| 行号 {rows}')
            lines.append('')

        lines.append('=' * 80)
        lines.append('二、拟合参数对比（配平前 vs 配平后）')
        lines.append('=' * 80)
        lines.append(f'{"参数":<20} {"配平前":<28} {"配平后":<28}')
        lines.append('─' * 76)
        lines.append(f'{"Ksv (L/mmol)":<20} {fit_before.ksv:.6f} ± {fit_before.ksv_err:.6f}   '
                     f'{fit_after.ksv:.6f} ± {fit_after.ksv_err:.6f}')
        lines.append(f'{"Ksv变化":<20} {"—":<28} '
                     f'{comp["ksv_diff"]:+.6f} ({comp["ksv_pct_change"]:+.2f}%)')
        lines.append(f'{"截距":<20} {fit_before.intercept:.4f} ± {fit_before.intercept_err:.4f}      '
                     f'{fit_after.intercept:.4f} ± {fit_after.intercept_err:.4f}')
        lines.append(f'{"R²":<20} {fit_before.r_squared:.6f}                   '
                     f'{fit_after.r_squared:.6f}')
        lines.append(f'{"RMSE":<20} {fit_before.rmse:.6f}                   '
                     f'{fit_after.rmse:.6f}')
        lines.append(f'{"参与点数":<20} {fit_before.n_points:<28} {fit_after.n_points:<28}')
        lines.append(f'{"质量判定":<20} {comp["judgment_before"]:<28} {comp["judgment_after"]:<28}')
        if comp['judgment_changed']:
            lines.append('>>> ⚠ 判定结果改变！请重点关注数据异常点 <<<')
        lines.append('')

        lines.append('=' * 80)
        lines.append('三、配平前拟合详情')
        lines.append('=' * 80)
        lines.append(SternVolmerFitter.format_fit_report(fit_before))
        lines.append('')

        lines.append('=' * 80)
        lines.append('四、配平后拟合详情')
        lines.append('=' * 80)
        lines.append(SternVolmerFitter.format_fit_report(fit_after))
        lines.append('')

        lines.append('=' * 80)
        lines.append('五、数据质量检查')
        lines.append('=' * 80)
        lines.append(data_loader.get_issue_summary())
        lines.append('')

        filepath = os.path.join(self.output_dir, report_filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))

        print(f'[报告] 文本报告已生成: {filepath}')
        return filepath
