"""批改报告导出模块 - 分为未处理/已修正/需人工确认三类"""

import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import numpy as np


@dataclass
class ReportEntry:
    """报告条目"""
    category: str  # unprocessed, corrected, needs_review
    block_idx: Tuple[int, int]
    status: str
    message: str
    source_file: str = ''
    error: Optional[float] = None
    trace: List[dict] = field(default_factory=list)
    details: dict = field(default_factory=dict)


@dataclass
class CorrectionTrace:
    """修正痕迹"""
    timestamp: str
    action: str  # step_applied, error_detected, suggestion_generated, manual_review
    block_idx: Tuple[int, int]
    details: dict
    author: str = 'system'


class ReportGenerator:
    """报告生成器"""

    def __init__(self, tracker, analyzer, metadata: dict = None):
        self.tracker = tracker
        self.analyzer = analyzer
        self.metadata = metadata or {}
        self.entries: List[ReportEntry] = []
        self.traces: List[CorrectionTrace] = []
        self._timestamp = datetime.now().isoformat()

    def generate(self) -> dict:
        """生成完整报告"""
        self.entries = []
        self.traces = []

        self._classify_blocks()
        self._generate_traces()

        report = {
            'metadata': self._build_metadata(),
            'summary': self._build_summary(),
            'unprocessed': self._get_entries_by_category('unprocessed'),
            'corrected': self._get_entries_by_category('corrected'),
            'needs_review': self._get_entries_by_category('needs_review'),
            'error_categories': self._build_error_categories(),
            'suggestions': self._build_suggestions(),
            'traces': self._build_traces(),
            'raw_data': self._build_raw_data()
        }

        return report

    def _classify_blocks(self):
        """将分块分类到三个类别"""
        for (i, j), block_result in self.tracker.block_results.items():
            entry = ReportEntry(
                category='',
                block_idx=(i, j),
                status=block_result.status,
                message=block_result.message,
                source_file=self.metadata.get('source_file', ''),
                error=block_result.error,
                trace=block_result.correction_trace.copy()
            )

            if block_result.status == 'skipped':
                entry.category = 'unprocessed'
                entry.details['reason'] = '该分块未进行任何计算'
            elif block_result.status == 'mismatch':
                entry.category = 'unprocessed'
                entry.details['reason'] = '形状不匹配，无法自动处理'
            elif block_result.status == 'correct':
                entry.category = 'corrected'
                entry.details['verification'] = '已通过自动验证'
            elif block_result.status == 'incorrect':
                if block_result.error and block_result.error < 1e-3:
                    entry.category = 'corrected'
                    entry.details['note'] = '浮点误差，在可接受范围内'
                else:
                    entry.category = 'needs_review'
                    entry.details['note'] = '误差较大，需要人工确认'

            self.entries.append(entry)

    def _generate_traces(self):
        """生成修正痕迹"""
        for record in self.tracker.steps:
            trace = CorrectionTrace(
                timestamp=self._timestamp,
                action='step_applied',
                block_idx=(record.a_block[0], record.b_block[1]),
                details={
                    'step_number': record.step_number,
                    'a_block': record.a_block,
                    'b_block': record.b_block,
                    'a_rows': record.a_rows,
                    'a_cols': record.a_cols,
                    'b_rows': record.b_rows,
                    'b_cols': record.b_cols,
                    'is_valid': record.is_valid,
                    'issues': record.issues,
                    'line_number': record.line_number,
                    'comment': record.comment
                }
            )
            self.traces.append(trace)

        for suggestion in self.analyzer.suggestions:
            trace = CorrectionTrace(
                timestamp=self._timestamp,
                action='suggestion_generated',
                block_idx=suggestion.block_idx,
                details={
                    'suggestion': suggestion.suggested_fix,
                    'fix_type': suggestion.fix_type,
                    'confidence': suggestion.confidence,
                    'original_error': suggestion.original_error
                }
            )
            self.traces.append(trace)

        for entry in self.entries:
            if entry.category == 'needs_review':
                trace = CorrectionTrace(
                    timestamp=self._timestamp,
                    action='manual_review',
                    block_idx=entry.block_idx,
                    details={
                        'reason': '需要人工确认',
                        'status': entry.status,
                        'error': entry.error
                    }
                )
                self.traces.append(trace)

    def _get_entries_by_category(self, category: str) -> List[dict]:
        """获取指定类别的条目"""
        return [
            self._serialize_entry(e)
            for e in self.entries
            if e.category == category
        ]

    def _serialize_entry(self, entry: ReportEntry) -> dict:
        """序列化条目"""
        return {
            'block_idx': list(entry.block_idx),
            'status': entry.status,
            'message': entry.message,
            'source_file': entry.source_file,
            'error': entry.error,
            'trace': entry.trace,
            'details': entry.details
        }

    def _build_metadata(self) -> dict:
        """构建元数据"""
        summary = self.tracker.get_summary()
        return {
            'generated_at': self._timestamp,
            'block_size': self.tracker.block_size,
            'matrix_a_shape': list(summary['matrix_a_shape']),
            'matrix_b_shape': list(summary['matrix_b_shape']),
            'output_shape': list(summary['output_shape']),
            'error_threshold': self.analyzer.error_threshold,
            'source_file': self.metadata.get('source_file', 'N/A'),
            'student_name': self.metadata.get('student_name', 'N/A'),
            'assignment': self.metadata.get('assignment', 'N/A')
        }

    def _build_summary(self) -> dict:
        """构建摘要"""
        counts = {'unprocessed': 0, 'corrected': 0, 'needs_review': 0}
        for entry in self.entries:
            counts[entry.category] = counts.get(entry.category, 0) + 1

        summary = self.tracker.get_summary()
        error_summary = self.analyzer.get_error_summary()

        return {
            'total_blocks': summary['total_blocks'],
            'total_steps': summary['total_steps'],
            'by_category': counts,
            'status_counts': summary['status_counts'],
            'error_summary': error_summary,
            'completion_rate': self._calculate_completion_rate(counts)
        }

    def _calculate_completion_rate(self, counts: dict) -> dict:
        """计算完成率"""
        total = sum(counts.values())
        if total == 0:
            return {'percentage': 0, 'description': '无分块数据'}

        completed = counts.get('corrected', 0) + counts.get('needs_review', 0)
        rate = completed / total * 100

        return {
            'percentage': round(rate, 2),
            'completed': completed,
            'total': total,
            'description': f'{completed}/{total} 分块已处理 ({rate:.1f}%)'
        }

    def _build_error_categories(self) -> List[dict]:
        """构建错误分类"""
        result = []
        for cat in self.analyzer.categories:
            result.append({
                'category': cat.category,
                'severity': cat.severity,
                'message': cat.message,
                'affected_blocks': [list(b) for b in cat.affected_blocks],
                'details': cat.details,
                'suggestion': cat.suggestion
            })
        return result

    def _build_suggestions(self) -> List[dict]:
        """构建建议"""
        result = []
        for sug in self.analyzer.suggestions:
            result.append({
                'block_idx': list(sug.block_idx),
                'original_error': sug.original_error,
                'suggested_fix': sug.suggested_fix,
                'fix_type': sug.fix_type,
                'confidence': sug.confidence,
                'details': {
                    k: str(v) if isinstance(v, np.ndarray) else v
                    for k, v in sug.details.items()
                }
            })
        return result

    def _build_traces(self) -> List[dict]:
        """构建痕迹"""
        result = []
        for trace in self.traces:
            result.append({
                'timestamp': trace.timestamp,
                'action': trace.action,
                'block_idx': list(trace.block_idx),
                'details': trace.details,
                'author': trace.author
            })
        return result

    def _build_raw_data(self) -> dict:
        """构建原始数据（用于调试）"""
        data = {}
        for (i, j), block_result in self.tracker.block_results.items():
            key = f"C({i},{j})"
            data[key] = {
                'expected_shape': list(block_result.expected.shape),
                'expected_preview': self._matrix_preview(block_result.expected),
                'student_shape': list(block_result.student_result.shape) if block_result.student_result is not None else None,
                'student_preview': self._matrix_preview(block_result.student_result) if block_result.student_result is not None else None,
                'error': block_result.error,
                'status': block_result.status,
                'trace_count': len(block_result.correction_trace)
            }
        return data

    def _matrix_preview(self, matrix: np.ndarray, max_elements: int = 9) -> List[List[float]]:
        """获取矩阵预览（前3x3元素）"""
        if matrix is None:
            return []
        rows, cols = matrix.shape
        preview_rows = min(3, rows)
        preview_cols = min(3, cols)
        return matrix[:preview_rows, :preview_cols].tolist()

    def export_json(self, output_path: str) -> dict:
        """导出为JSON格式"""
        report = self.generate()

        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        with open(path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False, default=self._json_default)

        return report

    def export_text(self, output_path: str) -> str:
        """导出为文本格式"""
        report = self.generate()
        lines = []

        lines.append("=" * 70)
        lines.append("矩阵分块乘法校验报告")
        lines.append("=" * 70)
        lines.append(f"生成时间: {report['metadata']['generated_at']}")
        lines.append(f"分块大小: {report['metadata']['block_size']}")
        lines.append(f"矩阵A: {report['metadata']['matrix_a_shape']}")
        lines.append(f"矩阵B: {report['metadata']['matrix_b_shape']}")
        lines.append(f"输出C: {report['metadata']['output_shape']}")
        lines.append(f"误差阈值: {report['metadata']['error_threshold']:.2e}")
        lines.append("")

        summary = report['summary']
        lines.append("-" * 70)
        lines.append("摘要")
        lines.append("-" * 70)
        lines.append(f"总分块数: {summary['total_blocks']}")
        lines.append(f"总步骤数: {summary['total_steps']}")
        lines.append(f"完成率: {summary['completion_rate']['description']}")
        lines.append("")

        lines.append("分块状态统计:")
        for status, count in summary['status_counts'].items():
            lines.append(f"  {status}: {count}")
        lines.append("")

        lines.append("分块处理分类:")
        for cat, count in summary['by_category'].items():
            lines.append(f"  {cat}: {count}")
        lines.append("")

        lines.append("=" * 70)
        lines.append("【未处理】")
        lines.append("=" * 70)
        if report['unprocessed']:
            for entry in report['unprocessed']:
                idx = entry['block_idx']
                lines.append(f"\nC({idx[0]},{idx[1]}): {entry['message']}")
                lines.append(f"  状态: {entry['status']}")
                if entry['details'].get('reason'):
                    lines.append(f"  原因: {entry['details']['reason']}")
        else:
            lines.append("无")
        lines.append("")

        lines.append("=" * 70)
        lines.append("【已修正/已验证】")
        lines.append("=" * 70)
        if report['corrected']:
            for entry in report['corrected']:
                idx = entry['block_idx']
                lines.append(f"\nC({idx[0]},{idx[1]}): {entry['message']}")
                lines.append(f"  状态: {entry['status']}")
                if entry['error'] is not None:
                    lines.append(f"  误差: {entry['error']:.2e}")
                if entry['trace']:
                    lines.append(f"  贡献步骤数: {len(entry['trace'])}")
                    for t in entry['trace']:
                        lines.append(f"    步骤{t['step']}: A{t['a_block']} * B{t['b_block']}")
                if entry['details'].get('note'):
                    lines.append(f"  备注: {entry['details']['note']}")
        else:
            lines.append("无")
        lines.append("")

        lines.append("=" * 70)
        lines.append("【需要人工确认】")
        lines.append("=" * 70)
        if report['needs_review']:
            for entry in report['needs_review']:
                idx = entry['block_idx']
                lines.append(f"\nC({idx[0]},{idx[1]}): {entry['message']}")
                lines.append(f"  状态: {entry['status']}")
                if entry['error'] is not None:
                    lines.append(f"  误差: {entry['error']:.2e}")
                if entry['details'].get('note'):
                    lines.append(f"  备注: {entry['details']['note']}")
        else:
            lines.append("无")
        lines.append("")

        if report['error_categories']:
            lines.append("=" * 70)
            lines.append("错误分类")
            lines.append("=" * 70)
            for cat in report['error_categories']:
                lines.append(f"\n[{cat['severity'].upper()}] {cat['message']}")
                lines.append(f"  类型: {cat['category']}")
                lines.append(f"  影响分块: {[tuple(b) for b in cat['affected_blocks']]}")
                if cat['details']:
                    lines.append(f"  详情: {cat['details']}")
                if cat['suggestion']:
                    lines.append(f"  建议: {cat['suggestion']}")
            lines.append("")

        if report['suggestions']:
            lines.append("=" * 70)
            lines.append("修正建议")
            lines.append("=" * 70)
            for sug in report['suggestions']:
                idx = sug['block_idx']
                lines.append(f"\nC({idx[0]},{idx[1]}):")
                lines.append(f"  建议: {sug['suggested_fix']}")
                lines.append(f"  类型: {sug['fix_type']}")
                lines.append(f"  置信度: {sug['confidence']:.0%}")
                if sug['original_error'] != float('inf'):
                    lines.append(f"  原始误差: {sug['original_error']:.2e}")
            lines.append("")

        lines.append("=" * 70)
        lines.append("修正痕迹")
        lines.append("=" * 70)
        for trace in report['traces']:
            idx = trace['block_idx']
            lines.append(f"\n[{trace['timestamp']}] {trace['action']} @ C({idx[0]},{idx[1]})")
            if 'step_number' in trace['details']:
                lines.append(f"  步骤: {trace['details']['step_number']}")
                lines.append(f"  A块: {trace['details']['a_block']}")
                lines.append(f"  B块: {trace['details']['b_block']}")
                if trace['details']['issues']:
                    for issue in trace['details']['issues']:
                        lines.append(f"  问题: {issue}")
            lines.append("")

        text = '\n'.join(lines)

        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding='utf-8')

        return text

    def export_html(self, output_path: str) -> str:
        """导出为HTML格式"""
        report = self.generate()
        html = self._build_html(report)

        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(html, encoding='utf-8')

        return html

    def _build_html(self, report: dict) -> str:
        """构建HTML报告"""
        return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>矩阵分块乘法校验报告</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; background: #f5f5f5; }}
  .container {{ max-width: 1000px; margin: 0 auto; }}
  h1 {{ color: #333; border-bottom: 3px solid #4a90d9; padding-bottom: 10px; }}
  h2 {{ color: #555; margin-top: 30px; }}
  .card {{ background: white; border-radius: 8px; padding: 20px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
  .summary-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }}
  .stat {{ text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; }}
  .stat-number {{ font-size: 2em; font-weight: bold; color: #4a90d9; }}
  .stat-label {{ color: #666; font-size: 0.9em; }}
  .badge {{ display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.85em; font-weight: 500; }}
  .badge-correct {{ background: #d4edda; color: #155724; }}
  .badge-incorrect {{ background: #f8d7da; color: #721c24; }}
  .badge-skipped {{ background: #fff3cd; color: #856404; }}
  .badge-mismatch {{ background: #f8d7da; color: #721c24; }}
  .category-unprocessed {{ border-left: 4px solid #ffc107; }}
  .category-corrected {{ border-left: 4px solid #28a745; }}
  .category-needs-review {{ border-left: 4px solid #dc3545; }}
  table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
  th, td {{ padding: 8px 12px; text-align: left; border-bottom: 1px solid #eee; }}
  th {{ background: #f8f9fa; font-weight: 600; }}
  .trace-item {{ background: #f8f9fa; padding: 10px; margin: 8px 0; border-radius: 4px; font-family: monospace; font-size: 0.9em; }}
  .error-detail {{ color: #dc3545; font-weight: 500; }}
</style>
</head>
<body>
<div class="container">
  <h1>矩阵分块乘法校验报告</h1>
  
  <div class="card">
    <h2>基本信息</h2>
    <table>
      <tr><th>生成时间</th><td>{report['metadata']['generated_at']}</td></tr>
      <tr><th>分块大小</th><td>{report['metadata']['block_size']}</td></tr>
      <tr><th>矩阵A</th><td>{report['metadata']['matrix_a_shape']}</td></tr>
      <tr><th>矩阵B</th><td>{report['metadata']['matrix_b_shape']}</td></tr>
      <tr><th>输出C</th><td>{report['metadata']['output_shape']}</td></tr>
      <tr><th>误差阈值</th><td>{report['metadata']['error_threshold']:.2e}</td></tr>
    </table>
  </div>

  <div class="card">
    <h2>摘要</h2>
    <div class="summary-grid">
      <div class="stat">
        <div class="stat-number">{report['summary']['total_blocks']}</div>
        <div class="stat-label">总分块数</div>
      </div>
      <div class="stat">
        <div class="stat-number">{report['summary']['total_steps']}</div>
        <div class="stat-label">总步骤数</div>
      </div>
      <div class="stat">
        <div class="stat-number">{report['summary']['completion_rate']['percentage']}%</div>
        <div class="stat-label">完成率</div>
      </div>
      <div class="stat">
        <div class="stat-number">{len(report['needs_review'])}</div>
        <div class="stat-label">需人工确认</div>
      </div>
    </div>
  </div>

  <div class="card category-corrected">
    <h2>【已修正/已验证】 ({len(report['corrected'])})</h2>
    {self._build_entries_html(report['corrected'], 'corrected')}
  </div>

  <div class="card category-unprocessed">
    <h2>【未处理】 ({len(report['unprocessed'])})</h2>
    {self._build_entries_html(report['unprocessed'], 'unprocessed')}
  </div>

  <div class="card category-needs-review">
    <h2>【需要人工确认】 ({len(report['needs_review'])})</h2>
    {self._build_entries_html(report['needs_review'], 'needs_review')}
  </div>

  {self._build_error_categories_html(report['error_categories'])}
  {self._build_suggestions_html(report['suggestions'])}
  {self._build_traces_html(report['traces'])}

</div>
</body>
</html>"""

    def _build_entries_html(self, entries: list, category: str) -> str:
        """构建条目的HTML"""
        if not entries:
            return '<p style="color:#999;">无</p>'

        html = '<table><tr><th>分块</th><th>状态</th><th>信息</th><th>误差</th></tr>'
        for entry in entries:
            idx = entry['block_idx']
            badge_class = f'badge-{entry["status"]}'
            error_str = f'{entry["error"]:.2e}' if entry['error'] is not None else 'N/A'
            html += f"""
            <tr>
              <td>C({idx[0]},{idx[1]})</td>
              <td><span class="badge {badge_class}">{entry['status']}</span></td>
              <td>{entry['message']}</td>
              <td>{error_str}</td>
            </tr>"""
        html += '</table>'
        return html

    def _build_error_categories_html(self, categories: list) -> str:
        """构建错误分类的HTML"""
        if not categories:
            return ''

        html = '<div class="card"><h2>错误分类</h2>'
        for cat in categories:
            severity_color = {'error': '#dc3545', 'warning': '#ffc107', 'info': '#17a2b8'}.get(cat['severity'], '#666')
            html += f"""
            <div style="border-left: 4px solid {severity_color}; padding: 10px; margin: 10px 0;">
              <strong>[{cat['severity'].upper()}]</strong> {cat['message']}<br>
              <small>类型: {cat['category']}</small><br>
              <small>影响分块: {[tuple(b) for b in cat['affected_blocks']]}</small>
              {f'<br><small>详情: {cat["details"]}</small>' if cat['details'] else ''}
              {f'<br><small style="color:#28a745;">建议: {cat["suggestion"]}</small>' if cat['suggestion'] else ''}
            </div>"""
        html += '</div>'
        return html

    def _build_suggestions_html(self, suggestions: list) -> str:
        """构建建议的HTML"""
        if not suggestions:
            return ''

        html = '<div class="card"><h2>修正建议</h2>'
        for sug in suggestions:
            idx = sug['block_idx']
            confidence_color = '#28a745' if sug['confidence'] > 0.8 else '#ffc107' if sug['confidence'] > 0.5 else '#dc3545'
            html += f"""
            <div style="padding: 10px; margin: 10px 0; background: #f8f9fa; border-radius: 4px;">
              <strong>C({idx[0]},{idx[1]})</strong>: {sug['suggested_fix']}<br>
              <small>类型: {sug['fix_type']}</small> | 
              <small style="color:{confidence_color}">置信度: {sug['confidence']:.0%}</small>
            </div>"""
        html += '</div>'
        return html

    def _build_traces_html(self, traces: list) -> str:
        """构建痕迹的HTML"""
        if not traces:
            return ''

        html = '<div class="card"><h2>修正痕迹</h2>'
        for trace in traces:
            idx = trace['block_idx']
            action_icon = {'step_applied': '✓', 'error_detected': '⚠', 'suggestion_generated': '💡', 'manual_review': '👀'}.get(trace['action'], '•')
            html += f"""
            <div class="trace-item">
              {action_icon} [{trace['timestamp']}] <strong>{trace['action']}</strong> @ C({idx[0]},{idx[1]})
              {f'<br>步骤: {trace["details"].get("step_number", "N/A")}' if 'step_number' in trace['details'] else ''}
              {f'<br>A块: {trace["details"].get("a_block", "N/A")}, B块: {trace["details"].get("b_block", "N/A")}' if 'a_block' in trace['details'] else ''}
            </div>"""
        html += '</div>'
        return html

    @staticmethod
    def _json_default(obj):
        """JSON序列化默认处理"""
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        return str(obj)
