import json
from datetime import datetime
from typing import List
from collections import defaultdict

from .models import ExperimentRecord, OverlapCase, PeakStatus
from .spectrum_analyzer import AnalysisResult


class ReportGenerator:
    """生成面向环境监测员和课题组的分析报告"""

    def generate_html(
        self,
        records: List[ExperimentRecord],
        results: List[AnalysisResult],
        warnings: List[str],
    ) -> str:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        changed_count = sum(1 for r in results if r.result_changed)
        total = len(results)

        overlap_summary = self._build_overlap_summary(results)

        sections = []
        sections.append(self._html_header())
        sections.append(f"""
        <div class="summary-card">
            <h2>分析总览</h2>
            <p><strong>分析时间:</strong> {now}</p>
            <p><strong>实验记录总数:</strong> {total} 条</p>
            <p><strong>复核后结论有变化:</strong>
                <span class="badge changed">{changed_count}</span> 条
                (占 {changed_count/total*100:.1f}% 当 {total}>0 时)
            </p>
            <p><strong>数据加载警告:</strong> {len(warnings)} 条</p>
        </div>
        """)

        if overlap_summary:
            sections.append("""
            <div class="summary-card overlap-card">
                <h2>谱峰重叠涉及材料总览 <span class="subtitle">（课题组一眼看出卡在哪）</span></h2>
                <table class="data-table">
                    <tr><th>材料名称</th><th>涉及样品数</th><th>涉及重叠峰位数</th><th>备注</th></tr>
            """)
            for material, info in sorted(overlap_summary.items()):
                sections.append(f"""
                <tr>
                    <td class="material-name">{material}</td>
                    <td>{info['sample_count']}</td>
                    <td>{info['peak_count']}</td>
                    <td>{info['samples']}</td>
                </tr>
                """)
            sections.append("</table></div>")

        if warnings:
            sections.append("""
            <div class="warning-card">
                <h2>数据加载警告</h2>
                <ul>
            """)
            for w in warnings:
                sections.append(f"<li>{w}</li>")
            sections.append("</ul></div>")

        for rec, res in zip(records, results):
            sections.append(self._html_record_section(rec, res))

        sections.append(self._html_footer())

        return "\n".join(sections)

    def _html_header(self) -> str:
        return """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>电池电解液配比实验 - 谱图复核分析报告</title>
<style>
    body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
           max-width: 1100px; margin: 20px auto; padding: 0 20px; color: #222; line-height: 1.6; }
    h1 { color: #1a5276; border-bottom: 3px solid #2980b9; padding-bottom: 8px; }
    h2 { color: #2980b9; margin-top: 30px; }
    h3 { color: #2c3e50; }
    .subtitle { color: #7f8c8d; font-size: 0.85em; font-weight: normal; }
    .summary-card { background: #f8f9fa; border-left: 4px solid #2980b9;
                    padding: 15px 20px; border-radius: 4px; margin: 15px 0; }
    .overlap-card { background: #fef5e7; border-left-color: #e67e22; }
    .changed-card { background: #fdedec; border-left-color: #e74c3c; }
    .normal-card { background: #eafaf1; border-left-color: #27ae60; }
    .warning-card { background: #fef9e7; border-left: 4px solid #f39c12;
                    padding: 15px 20px; border-radius: 4px; margin: 15px 0; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 12px;
             font-weight: bold; font-size: 0.9em; }
    .badge.changed { background: #e74c3c; color: white; }
    .badge.overlap { background: #e67e22; color: white; }
    .badge.normal  { background: #27ae60; color: white; }
    .data-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    .data-table th { background: #2980b9; color: white; }
    .data-table tr:nth-child(even) { background: #f8f9fa; }
    .material-name { font-weight: bold; color: #c0392b; }
    .diff-before { color: #7f8c8d; text-decoration: line-through; }
    .diff-after  { color: #e74c3c; font-weight: bold; }
    .retest-box { background: #fdfefe; border: 1px dashed #bdc3c7;
                  padding: 12px 16px; border-radius: 4px; margin: 10px 0; white-space: pre-line; }
    .formula-tag { display: inline-block; background: #d6eaf8; padding: 2px 8px;
                   border-radius: 4px; margin: 2px; font-size: 0.9em; }
    .problem-tag { display: inline-block; background: #f5b7b1; color: #922b21;
                   padding: 2px 8px; border-radius: 4px; margin: 2px; font-size: 0.85em; }
</style>
</head>
<body>
<h1>电池电解液配比实验 - 谱图复核分析报告</h1>
<p class="subtitle">面向环境监测员与课题组，自动整合旧表、谱图、备注、反应条件</p>
        """

    def _html_footer(self) -> str:
        return """
<hr style="margin-top:40px;">
<p class="subtitle" style="text-align:center;">由 battery-electrolyte-tool 自动生成</p>
</body>
</html>
        """

    def _build_overlap_summary(self, results: List[AnalysisResult]) -> dict:
        summary = defaultdict(lambda: {"sample_count": 0, "peak_count": 0, "samples": []})
        for r in results:
            if not r.overlap_materials:
                continue
            for m in r.overlap_materials:
                summary[m]["sample_count"] += 1
                summary[m]["samples"].append(r.sample_id)
            for p in r.rechecked_peaks:
                if p.status == PeakStatus.OVERLAP:
                    if p.material:
                        summary[p.material]["peak_count"] += 1
                    for om in p.overlap_with:
                        summary[om]["peak_count"] += 1
        for m in summary:
            summary[m]["samples"] = ", ".join(sorted(set(summary[m]["samples"])))
        return dict(summary)

    def _html_record_section(self, rec: ExperimentRecord, res: AnalysisResult) -> str:
        parts = []
        if res.result_changed:
            parts.append(f'<div class="summary-card changed-card">')
            parts.append(f'<h3>样品 {rec.sample_id} '
                         f'<span class="badge changed">结论已变更</span></h3>')
        else:
            parts.append(f'<div class="summary-card normal-card">')
            parts.append(f'<h3>样品 {rec.sample_id} '
                         f'<span class="badge normal">结论无变化</span></h3>')

        parts.append(f"<p><strong>日期:</strong> {rec.date or '未填写'} &nbsp;&nbsp; "
                     f"<strong>操作员:</strong> {rec.operator or '未填写'}</p>")

        temp_str = f"{rec.temperature}{rec.temperature_unit}" if rec.temperature is not None else "未填写"
        hum_str = f"{rec.humidity}%" if rec.humidity is not None else "未填写"
        parts.append(f"<p><strong>温度:</strong> {temp_str} &nbsp;&nbsp; "
                     f"<strong>湿度:</strong> {hum_str}</p>")

        if rec.formulation:
            tags = " ".join(
                f'<span class="formula-tag">{k}: {v}</span>'
                for k, v in rec.formulation.items()
            )
            parts.append(f"<p><strong>配方:</strong> {tags}</p>")
        else:
            parts.append("<p><strong>配方:</strong> <em>未解析到</em></p>")

        if rec.problems:
            tags = " ".join(f'<span class="problem-tag">{p}</span>' for p in rec.problems)
            parts.append(f"<p><strong>数据问题:</strong> {tags}</p>")

        if rec.formulation_notes:
            parts.append(f"<p><strong>配方备注:</strong> {rec.formulation_notes}</p>")
        if rec.spectrum and rec.spectrum.manual_notes:
            parts.append(f"<p><strong>谱图人工备注:</strong> {rec.spectrum.manual_notes}</p>")

        parts.append("<h4>结论对比 <span class='subtitle'>（课题组可看到前后差别）</span></h4>")
        if res.result_changed:
            parts.append(f"<p><strong>原始结论:</strong> "
                         f"<span class='diff-before'>{res.before_conclusion}</span></p>")
            parts.append(f"<p><strong>复核结论:</strong> "
                         f"<span class='diff-after'>{res.after_conclusion}</span></p>")
        else:
            parts.append(f"<p><strong>结论:</strong> {res.after_conclusion}</p>")

        if res.rechecked_peaks:
            parts.append("<h4>谱峰详情</h4>")
            parts.append('<table class="data-table">')
            parts.append("<tr><th>峰位(ppm)</th><th>强度</th><th>原始归属</th>"
                         "<th>复核归属</th><th>状态</th><th>重叠涉及材料</th></tr>")
            for orig, rechk in zip(res.original_peaks, res.rechecked_peaks):
                orig_mat = orig.material or "(未标)"
                rechk_mat = rechk.material or "(未确定)"
                status_badge = ""
                if rechk.status == PeakStatus.OVERLAP:
                    status_badge = '<span class="badge overlap">重叠</span>'
                elif rechk.status == PeakStatus.SUSPICIOUS:
                    status_badge = '<span class="badge changed">存疑</span>'
                else:
                    status_badge = '<span class="badge normal">正常</span>'

                mat_cell = rechk_mat
                if orig_mat != rechk_mat:
                    mat_cell = (f'<span class="diff-before">{orig_mat}</span> → '
                                f'<span class="diff-after">{rechk_mat}</span>')
                else:
                    mat_cell = rechk_mat

                overlap_str = ", ".join(rechk.overlap_with) if rechk.overlap_with else "-"
                parts.append(
                    f"<tr><td>{rechk.position:.3f}</td><td>{rechk.intensity:.0f}</td>"
                    f"<td>{orig_mat}</td><td>{mat_cell}</td>"
                    f"<td>{status_badge}</td><td>{overlap_str}</td></tr>"
                )
            parts.append("</table>")

        if res.retest_suggestion and res.result_changed:
            parts.append("<h4>复测建议 <span class='subtitle'>（含前后差别）</span></h4>")
            parts.append(f'<div class="retest-box">{res.retest_suggestion}</div>')

        parts.append("</div>")
        return "\n".join(parts)

    def generate_text(
        self,
        records: List[ExperimentRecord],
        results: List[AnalysisResult],
        warnings: List[str],
    ) -> str:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        lines: List[str] = []
        lines.append("=" * 70)
        lines.append("电池电解液配比实验 - 谱图复核分析报告")
        lines.append(f"生成时间: {now}")
        lines.append("=" * 70)

        changed = sum(1 for r in results if r.result_changed)
        lines.append(f"实验记录总数: {len(results)} 条")
        lines.append(f"复核后结论有变化: {changed} 条")
        lines.append(f"数据加载警告: {len(warnings)} 条")

        overlap_summary = self._build_overlap_summary(results)
        if overlap_summary:
            lines.append("")
            lines.append("-" * 70)
            lines.append("谱峰重叠涉及材料总览")
            lines.append("-" * 70)
            lines.append(f"{'材料':<10} {'样品数':>6} {'峰位数':>6}  涉及样品")
            for m, info in sorted(overlap_summary.items()):
                lines.append(f"{m:<10} {info['sample_count']:>6} {info['peak_count']:>6}  {info['samples']}")

        if warnings:
            lines.append("")
            lines.append("-" * 70)
            lines.append("数据加载警告:")
            for w in warnings:
                lines.append(f"  ! {w}")

        for rec, res in zip(records, results):
            lines.append("")
            lines.append("=" * 70)
            mark = " 【结论变更】" if res.result_changed else ""
            lines.append(f"样品 {rec.sample_id}{mark}")
            lines.append("-" * 70)
            lines.append(f"  日期: {rec.date or '未填写'}  操作员: {rec.operator or '未填写'}")
            temp_str = f"{rec.temperature}{rec.temperature_unit}" if rec.temperature is not None else "未填写"
            hum_str = f"{rec.humidity}%" if rec.humidity is not None else "未填写"
            lines.append(f"  温度: {temp_str}  湿度: {hum_str}")
            if rec.formulation:
                form_str = "  ".join(f"{k}:{v}" for k, v in rec.formulation.items())
                lines.append(f"  配方: {form_str}")
            if rec.problems:
                lines.append(f"  数据问题: {'; '.join(rec.problems)}")
            if rec.formulation_notes:
                lines.append(f"  配方备注: {rec.formulation_notes}")
            if rec.spectrum and rec.spectrum.manual_notes:
                lines.append(f"  谱图备注: {rec.spectrum.manual_notes}")

            lines.append(f"  原始结论: {res.before_conclusion}")
            lines.append(f"  复核结论: {res.after_conclusion}")

            if res.rechecked_peaks:
                lines.append("  谱峰详情:")
                lines.append(f"    {'峰位(ppm)':>10} {'强度':>8} {'原始':>10} {'复核':>10} {'状态':>6} 重叠材料")
                for orig, rechk in zip(res.original_peaks, res.rechecked_peaks):
                    orig_m = orig.material or "-"
                    rechk_m = rechk.material or "-"
                    if rechk.status == PeakStatus.OVERLAP:
                        st = "重叠"
                    elif rechk.status == PeakStatus.SUSPICIOUS:
                        st = "存疑"
                    else:
                        st = "正常"
                    overlap = ",".join(rechk.overlap_with) if rechk.overlap_with else "-"
                    lines.append(f"    {rechk.position:>10.3f} {rechk.intensity:>8.0f} {orig_m:>10} {rechk_m:>10} {st:>6} {overlap}")

            if res.retest_suggestion and res.result_changed:
                lines.append("  复测建议:")
                for ln in res.retest_suggestion.split("\n"):
                    lines.append(f"    {ln}")

        lines.append("")
        lines.append("=" * 70)
        lines.append("报告结束")
        return "\n".join(lines)

    def generate_json(
        self,
        records: List[ExperimentRecord],
        results: List[AnalysisResult],
        warnings: List[str],
    ) -> str:
        data = {
            "generated_at": datetime.now().isoformat(),
            "warnings": warnings,
            "summary": {
                "total_records": len(results),
                "changed_count": sum(1 for r in results if r.result_changed),
                "overlap_summary": self._build_overlap_summary(results),
            },
            "records": [],
        }
        for rec, res in zip(records, results):
            rec_dict = {
                "sample_id": rec.sample_id,
                "date": rec.date,
                "operator": rec.operator,
                "temperature": rec.temperature,
                "temperature_unit": rec.temperature_unit,
                "humidity": rec.humidity,
                "formulation": rec.formulation,
                "problems": rec.problems,
                "original_conclusion": res.before_conclusion,
                "rechecked_conclusion": res.after_conclusion,
                "result_changed": res.result_changed,
                "overlap_materials": res.overlap_materials,
                "retest_suggestion": res.retest_suggestion,
                "peaks": [],
            }
            for rechk in res.rechecked_peaks:
                rec_dict["peaks"].append({
                    "position": rechk.position,
                    "intensity": rechk.intensity,
                    "material": rechk.material,
                    "status": rechk.status.value,
                    "overlap_with": rechk.overlap_with,
                    "original_interpretation": rechk.original_interpretation,
                    "rechecked_interpretation": rechk.rechecked_interpretation,
                })
            data["records"].append(rec_dict)
        return json.dumps(data, ensure_ascii=False, indent=2)

    def generate_cases_html(self, cases: List[OverlapCase]) -> str:
        parts = []
        parts.append(self._html_header().replace(
            "谱图复核分析报告", "谱峰重叠典型边界案例（3例）"
        ))
        parts.append("""
        <div class="summary-card">
            <h2>典型边界案例说明</h2>
            <p>以下 <strong>3 个案例</strong> 均来自真实实验场景中的边界情况。
               每个案例中，谱峰重叠<strong>真实地改变了最终判定结论</strong>，
               可用于环境监测员复核培训、课题组会议讨论。</p>
            <p class="subtitle">环境监测员提示: 这 3 例为最常见的重叠陷阱，遇到时请直接套用案例流程。</p>
        </div>
        """)
        for case in cases:
            card_class = "changed-card" if case.result_changed else "normal-card"
            parts.append(f'<div class="summary-card {card_class}">')
            parts.append(f"<h3>案例 {case.case_id}</h3>")
            parts.append(f"<p><strong>场景描述:</strong> {case.description}</p>")
            parts.append(f"<p><strong>涉及材料:</strong> "
                         f"{'、'.join(case.material_involved)}</p>")
            parts.append("<h4>结论变化</h4>")
            parts.append(f"<p><strong>判读前:</strong> "
                         f"<span class='diff-before'>{case.before_conclusion}</span></p>")
            parts.append(f"<p><strong>判读后:</strong> "
                         f"<span class='diff-after'>{case.after_conclusion}</span></p>")

            parts.append("<h4>谱峰对比</h4>")
            parts.append('<table class="data-table">')
            parts.append("<tr><th>峰位(ppm)</th><th>强度</th>"
                         "<th>原始归属</th><th>复核归属</th>"
                         "<th>状态</th><th>重叠材料</th></tr>")
            for orig, rechk in zip(case.peaks_original, case.peaks_rechecked):
                orig_m = orig.material or "-"
                rechk_m = rechk.material or "-"
                st = "重叠" if rechk.status == PeakStatus.OVERLAP else \
                     ("存疑" if rechk.status == PeakStatus.SUSPICIOUS else "正常")
                overlap = ",".join(rechk.overlap_with) if rechk.overlap_with else "-"
                if rechk_m != orig_m:
                    rechk_cell = (f'<span class="diff-before">{orig_m}</span> → '
                                  f'<span class="diff-after">{rechk_m}</span>')
                else:
                    rechk_cell = rechk_m
                parts.append(
                    f"<tr><td>{rechk.position:.3f}</td><td>{rechk.intensity:.0f}</td>"
                    f"<td>{orig_m}</td><td>{rechk_cell}</td>"
                    f"<td>{st}</td><td>{overlap}</td></tr>"
                )
            parts.append("</table>")
            parts.append("</div>")
        parts.append(self._html_footer())
        return "\n".join(parts)

    def generate_cases_text(self, cases: List[OverlapCase]) -> str:
        lines: List[str] = []
        lines.append("=" * 70)
        lines.append("谱峰重叠典型边界案例（3例，均真实改变判定结果）")
        lines.append("=" * 70)
        lines.append("环境监测员提示: 以下为最常见的重叠陷阱，遇到时直接套用流程。")
        for case in cases:
            lines.append("")
            lines.append("-" * 70)
            mark = " 【结论变更】" if case.result_changed else ""
            lines.append(f"案例 {case.case_id}{mark}")
            lines.append(f"  场景: {case.description}")
            lines.append(f"  涉及材料: {'、'.join(case.material_involved)}")
            lines.append(f"  判读前: {case.before_conclusion}")
            lines.append(f"  判读后: {case.after_conclusion}")
            lines.append("  谱峰:")
            lines.append(f"    {'峰位':>8} {'强度':>6} {'原始':>10} {'复核':>10} {'状态':>6} 重叠")
            for orig, rechk in zip(case.peaks_original, case.peaks_rechecked):
                orig_m = orig.material or "-"
                rechk_m = rechk.material or "-"
                st = "重叠" if rechk.status == PeakStatus.OVERLAP else \
                     ("存疑" if rechk.status == PeakStatus.SUSPICIOUS else "正常")
                overlap = ",".join(rechk.overlap_with) if rechk.overlap_with else "-"
                lines.append(f"    {rechk.position:>8.3f} {rechk.intensity:>6.0f} {orig_m:>10} {rechk_m:>10} {st:>6} {overlap}")
        lines.append("")
        lines.append("=" * 70)
        return "\n".join(lines)
