from __future__ import annotations

import html
import json
from pathlib import Path

from .formulas import BOUNDARIES, SABINE_CONSTANT
from .models import (
    AttributedError,
    BadDataRef,
    ConflictRecord,
    DataQuality,
    PipelineResult,
    RoomData,
    SamplingGap,
)


def _esc(text: Any) -> str:
    return html.escape(str(text))


def _quality_badge(quality: DataQuality) -> str:
    colors = {
        DataQuality.OK: "#27ae60",
        DataQuality.SUSPECT: "#f39c12",
        DataQuality.BAD: "#e74c3c",
        DataQuality.MISSING: "#95a5a6",
    }
    labels = {
        DataQuality.OK: "正常",
        DataQuality.SUSPECT: "可疑",
        DataQuality.BAD: "坏数据",
        DataQuality.MISSING: "缺失",
    }
    color = colors.get(quality, "#95a5a6")
    label = labels.get(quality, quality.value)
    return f'<span style="background:{color};color:#fff;padding:2px 8px;border-radius:3px;font-size:12px;">{label}</span>'


def _render_boundary_table() -> str:
    rows = ""
    for field, b in BOUNDARIES.items():
        rows += f"""
        <tr>
            <td>{_esc(b['desc'])}</td>
            <td><code>{_esc(field)}</code></td>
            <td>{_esc(b['min'])}</td>
            <td>{_esc(b['max'])}</td>
            <td>{_esc(b['unit'])}</td>
        </tr>"""
    return f"""
    <table class="data-table">
        <thead>
            <tr><th>参数</th><th>字段名</th><th>下界</th><th>上界</th><th>单位</th></tr>
        </thead>
        <tbody>{rows}</tbody>
    </table>"""


def _render_conflicts(conflicts: list[ConflictRecord]) -> str:
    if not conflicts:
        return '<p style="color:#27ae60;">无材料冲突</p>'
    rows = ""
    for c in conflicts:
        rows += f"""
        <tr>
            <td>{_esc(c.room_id)}</td>
            <td><code>{_esc(c.field_name)}</code></td>
            <td>{_esc(c.value_a)}</td>
            <td><span style="color:#e74c3c;">{_esc(c.value_b)}</span></td>
            <td>{_esc(c.source_a)}<br/><small>v{c.source_a_version}</small></td>
            <td>{_esc(c.source_b)}<br/><small>v{c.source_b_version}</small></td>
            <td>{_esc(c.resolution)}</td>
        </tr>"""
    return f"""
    <table class="data-table">
        <thead>
            <tr><th>房间</th><th>字段</th><th>原值</th><th>冲突值</th><th>来源A</th><th>来源B</th><th>处理</th></tr>
        </thead>
        <tbody>{rows}</tbody>
    </table>"""


def _render_bad_data(bad_refs: list[BadDataRef]) -> str:
    if not bad_refs:
        return '<p style="color:#27ae60;">无坏数据</p>'
    rows = ""
    for bd in bad_refs:
        rows += f"""
        <tr class="bad-row">
            <td>{_esc(bd.room_id)}</td>
            <td><code>{_esc(bd.field_name)}</code></td>
            <td style="color:#e74c3c;">{_esc(bd.field_value)}</td>
            <td>{_esc(bd.boundary_min)}</td>
            <td>{_esc(bd.boundary_max)}</td>
            <td>{_esc(bd.source)}</td>
            <td>{_esc(bd.source_file)}</td>
            <td>{"第" + str(bd.original_row) + "行" if bd.original_row is not None else "-"}</td>
            <td>{_esc(bd.reason)}</td>
        </tr>"""
    return f"""
    <table class="data-table">
        <thead>
            <tr><th>房间</th><th>字段</th><th>值</th><th>下界</th><th>上界</th><th>来源</th><th>文件</th><th>原始行</th><th>原因</th></tr>
        </thead>
        <tbody>{rows}</tbody>
    </table>"""


def _render_sampling_gaps(gaps: list[SamplingGap]) -> str:
    if not gaps:
        return '<p style="color:#27ae60;">无采样缺口</p>'
    rows = ""
    for g in gaps:
        sev_color = "#e74c3c" if g.severity == "error" else "#f39c12"
        rows += f"""
        <tr>
            <td>{_esc(g.room_id)}</td>
            <td>{_esc(g.gap_type)}</td>
            <td>{_esc(g.description)}</td>
            <td>{', '.join(_esc(f) for f in g.affected_fields)}</td>
            <td><span style="color:{sev_color};">{_esc(g.severity)}</span></td>
        </tr>"""
    return f"""
    <table class="data-table">
        <thead>
            <tr><th>房间</th><th>类型</th><th>说明</th><th>涉及字段</th><th>严重度</th></tr>
        </thead>
        <tbody>{rows}</tbody>
    </table>"""


def _render_formula_chain(steps: list) -> str:
    rows = ""
    for i, step in enumerate(steps, 1):
        val_str = "<br/>".join(
            f"{_esc(k)} = {_esc(v)}" for k, v in step.values.items()
            if k not in ("partials",)
        )
        if "partials" in step.values:
            val_str += "<br/><details><summary>逐面展开</summary><table class='inner-table'><tr><th>材料</th><th>α</th><th>S (m²)</th><th>α·S (m²)</th></tr>"
            for p in step.values["partials"]:
                val_str += f"<tr><td>{_esc(p['material'])}</td><td>{_esc(p['alpha'])}</td><td>{_esc(p['S'])}</td><td>{_esc(p['alpha_S'])}</td></tr>"
            val_str += "</table></details>"

        rows += f"""
        <tr>
            <td>{i}</td>
            <td><strong>{_esc(step.name)}</strong></td>
            <td><code>{_esc(step.expression)}</code></td>
            <td>{val_str}</td>
            <td><strong>{_esc(round(step.result, 4) if isinstance(step.result, float) else step.result)}</strong> {_esc(step.unit)}</td>
            <td>{_esc(step.note)}</td>
        </tr>"""

    return f"""
    <table class="data-table formula-table">
        <thead>
            <tr><th>#</th><th>步骤</th><th>公式</th><th>代入值</th><th>结果</th><th>备注</th></tr>
        </thead>
        <tbody>{rows}</tbody>
    </table>"""


def _render_surface_contributions(contribs: list) -> str:
    rows = ""
    has_sens_only = any(c.is_sensitivity_only for c in contribs)
    if not has_sens_only:
        for sc in contribs:
            rows += f"""
        <tr>
            <td>{_esc(sc.material_name)}</td>
            <td>{_esc(sc.area_m2)} m²</td>
            <td>{_esc(sc.absorption_coeff)}</td>
            <td>{_esc(round(sc.absorption_area_m2, 4))} m²</td>
            <td>{_esc(round(sc.delta_alpha, 6)) if sc.delta_alpha else '<span style="color:#95a5a6;">-</span>'}</td>
            <td>{_esc(sc.delta_source) if sc.delta_source else '<span style="color:#95a5a6;">-</span>'}</td>
            <td style="color:{'#27ae60' if sc.contribution_s >= 0 else '#e74c3c'}; font-weight:600;">{_esc(round(sc.contribution_s, 4))} s</td>
            <td style="font-weight:600;">{_esc(round(sc.contribution_pct, 2))} %</td>
            <td>{"第" + str(sc.original_row) + "行" if sc.original_row is not None else "-"}</td>
        </tr>"""
        return f"""
    <h4>误差贡献（按绝对值归一化，合计≈100%）</h4>
    <table class="data-table">
        <thead>
            <tr><th>材料</th><th>面积</th><th>吸声系数</th><th>吸声量</th><th>偏差Δα</th><th>偏差来源</th><th>贡献(s)</th><th>贡献(%)</th><th>原始行</th></tr>
        </thead>
        <tbody>{rows}</tbody>
    </table>"""
    else:
        dev_rows = ""
        sens_rows = ""
        dev_count = 0
        sens_count = 0
        for sc in contribs:
            if not sc.is_sensitivity_only:
                dev_count += 1
                dev_rows += f"""
        <tr>
            <td>{_esc(sc.material_name)}</td>
            <td>{_esc(sc.area_m2)} m²</td>
            <td>{_esc(sc.absorption_coeff)}</td>
            <td>{_esc(round(sc.absorption_area_m2, 4))} m²</td>
            <td>{_esc(round(sc.delta_alpha, 6))}</td>
            <td>{_esc(sc.delta_source)}</td>
            <td style="color:{'#27ae60' if sc.contribution_s >= 0 else '#e74c3c'}; font-weight:600;">{_esc(round(sc.contribution_s, 4))} s</td>
            <td style="font-weight:600;">{_esc(round(sc.contribution_pct, 2))} %</td>
            <td>{"第" + str(sc.original_row) + "行" if sc.original_row is not None else "-"}</td>
        </tr>"""
            else:
                sens_count += 1
                sens_rows += f"""
        <tr class="sens-row">
            <td>{_esc(sc.material_name)}</td>
            <td>{_esc(sc.area_m2)} m²</td>
            <td>{_esc(sc.absorption_coeff)}</td>
            <td>{_esc(round(sc.absorption_area_m2, 4))} m²</td>
            <td colspan="2" style="color:#95a5a6; text-align:center;">无偏差</td>
            <td style="color:#95a5a6;">—</td>
            <td style="color:#95a5a6;">—</td>
            <td>{"第" + str(sc.original_row) + "行" if sc.original_row is not None else "-"}</td>
        </tr>
        <tr class="sens-detail">
            <td colspan="9" style="padding-left: 30px; background: #f8f9fa; font-size: 12px;">
                灵敏度: <strong>{_esc(round(sc.sensitivity_s_per_alpha, 4))} s/单位α</strong>
                （吸声系数每变 0.01，T60 变 {_esc(round(abs(sc.sensitivity_s_per_alpha) * 0.01, 4))} s）
            </td>
        </tr>"""

        html_parts = []
        if dev_count > 0:
            html_parts.append(f"""
    <h4>已归因贡献（有实际偏差，{dev_count} 项）</h4>
    <table class="data-table">
        <thead>
            <tr><th>材料</th><th>面积</th><th>吸声系数</th><th>吸声量</th><th>偏差Δα</th><th>偏差来源</th><th>贡献(s)</th><th>贡献(%)</th><th>原始行</th></tr>
        </thead>
        <tbody>{dev_rows}</tbody>
    </table>
    <p style="font-size:12px;color:#6c757d;margin-top:-8px;">
    注：贡献 = 偏导灵敏度 × 实际偏差；百分比按绝对值归一化（合计≈100%）
    </p>""")
        if sens_count > 0:
            html_parts.append(f"""
    <h4>灵敏度参考（无实际偏差，{sens_count} 项）</h4>
    <table class="data-table">
        <thead>
            <tr><th>材料</th><th>面积</th><th>吸声系数</th><th>吸声量</th><th colspan="2">偏差状态</th><th>贡献</th><th>占比</th><th>原始行</th></tr>
        </thead>
        <tbody>{sens_rows}</tbody>
    </table>
    <p style="font-size:12px;color:#6c757d;margin-top:-8px;">
    注：无偏差的材料仅展示灵敏度，不参与贡献占比统计
    </p>""")
        return "\n".join(html_parts)


def _render_room_detail(room: RoomData, ae: AttributedError | None) -> str:
    quality_badge = _quality_badge(room.quality)
    surface_rows = ""
    for s in room.surfaces:
        sq = _quality_badge(s.quality)
        delta_info = ""
        if s.has_coeff_deviation or s.has_area_deviation:
            parts = []
            if s.has_coeff_deviation:
                parts.append(f"Δα={s.delta_coeff:+.4f}")
            if s.has_area_deviation:
                parts.append(f"ΔS={s.delta_area:+.2f} m²")
            delta_info = f" <span style=\"color:#e67e22;font-size:12px;\">({', '.join(parts)})</span>"
        surface_rows += f"""
        <tr class="{'bad-row' if s.quality == DataQuality.BAD else ''}">
            <td>{_esc(s.material_name)}{delta_info}</td>
            <td>{_esc(s.area_m2)} m²</td>
            <td>{_esc(s.absorption_coeff)}</td>
            <td>{_esc(round(s.absorption_area, 4))} m²</td>
            <td>{sq}</td>
            <td>{_esc(s.provenance.source.value)}</td>
            <td>{_esc(s.provenance.source_file)}</td>
            <td>v{_esc(s.provenance.version)}</td>
            <td>{"第" + str(s.original_row) + "行" if s.original_row is not None else "-"}</td>
        </tr>"""

    surface_table = f"""
    <table class="data-table">
        <thead>
            <tr><th>材料</th><th>面积</th><th>吸声系数</th><th>吸声量</th><th>质量</th><th>来源</th><th>文件</th><th>版本</th><th>原始行</th></tr>
        </thead>
        <tbody>{surface_rows}</tbody>
    </table>"""

    attribution_section = ""
    if ae:
        mode_badge = ""
        if ae.attribution_mode == "full":
            mode_badge = '<span style="background:#27ae60;color:#fff;padding:2px 8px;border-radius:3px;font-size:12px;">完全归因</span>'
        else:
            mode_badge = '<span style="background:#95a5a6;color:#fff;padding:2px 8px;border-radius:3px;font-size:12px;">仅灵敏度</span>'

        attribution_section = f"""
        <h4>计算结果 {mode_badge}</h4>
        <div class="result-grid">
            <div class="result-card">
                <div class="result-label">计算 T60</div>
                <div class="result-value">{_esc(round(ae.calculated_t60_s, 4))} s</div>
            </div>
            <div class="result-card">
                <div class="result-label">实测 T60</div>
                <div class="result-value">{_esc(round(ae.measured_t60_s, 4))} s</div>
            </div>
            <div class="result-card">
                <div class="result-label">绝对误差</div>
                <div class="result-value" style="color:{'#27ae60' if ae.absolute_error_s >= 0 else '#e74c3c'};">{_esc(round(ae.absolute_error_s, 4))} s</div>
            </div>
            <div class="result-card">
                <div class="result-label">相对误差</div>
                <div class="result-value" style="color:{'#27ae60' if ae.relative_error_pct >= 0 else '#e74c3c'};">{_esc(round(ae.relative_error_pct, 2))} %</div>
            </div>
            <div class="result-card" style="background:{'#e8f8f0' if ae.explained_error_s >= 0 else '#fdf0f0'};">
                <div class="result-label">已解释误差</div>
                <div class="result-value">{_esc(round(ae.explained_error_s, 4))} s</div>
            </div>
            <div class="result-card" style="background:#fff8e1;">
                <div class="result-label">未解释残差</div>
                <div class="result-value" style="color:#f39c12;">{_esc(round(ae.unexplained_error_s, 4))} s</div>
            </div>
            <div class="result-card">
                <div class="result-label">容积贡献</div>
                <div class="result-value">{_esc(round(ae.volume_contribution_pct, 1))} %</div>
            </div>
            <div class="result-card">
                <div class="result-label">主导误差源</div>
                <div class="result-value" style="font-size:14px;">{_esc(ae.dominant_source)}</div>
            </div>
        </div>

        <h4>中间计算过程</h4>
        {_render_formula_chain(ae.formula_chain)}

        {_render_surface_contributions(ae.surface_contributions)}
        """
    else:
        attribution_section = f"""
        <div class="alert alert-error">
            该房间数据质量不合格，无法进行误差归因计算。原因：{_esc(room.quality_reason)}
        </div>"""

    volume_delta = ""
    if room.has_volume_deviation:
        volume_delta = f' <span style="color:#e67e22;">(原始 {room.original_volume_m3} m³, Δ={room.delta_volume:+.2f})</span>'
    t60_delta = ""
    if room.has_t60_deviation:
        t60_delta = f' <span style="color:#e67e22;">(原始 {room.original_measured_t60_s} s, Δ={room.delta_t60:+.3f})</span>'

    return f"""
    <div class="room-section">
        <h3>房间 {_esc(room.room_id)} {quality_badge}</h3>
        <div class="room-meta">
            <span>容积: <strong>{_esc(room.volume_m3)} m³</strong>{volume_delta}</span>
            <span>实测 T60: <strong>{_esc(room.measured_t60_s)} s</strong>{t60_delta}</span>
            <span>频率: <strong>{_esc(room.frequency_hz) if room.frequency_hz else '未指定'} Hz</strong></span>
            <span>来源: {_esc(room.provenance.source.value)} / {_esc(room.provenance.source_file)}</span>
            <span>版本: v{_esc(room.provenance.version)}</span>
            {f'<span style="color:#e74c3c;">{_esc(room.quality_reason)}</span>' if room.quality_reason else ''}
        </div>

        <h4>表面数据</h4>
        {surface_table}

        {attribution_section}
    </div>"""


def _render_summary(result: PipelineResult) -> str:
    total = len(result.rooms)
    ok_count = sum(1 for r in result.rooms if r.quality == DataQuality.OK)
    suspect_count = sum(1 for r in result.rooms if r.quality == DataQuality.SUSPECT)
    bad_count = sum(1 for r in result.rooms if r.quality == DataQuality.BAD)
    attr_count = len(result.attributed_errors)
    full_attr_count = sum(1 for ae in result.attributed_errors if ae.attribution_mode == "full")
    sens_count = sum(1 for ae in result.attributed_errors if ae.attribution_mode == "sensitivity_only")

    avg_error = 0.0
    if result.attributed_errors:
        avg_error = sum(ae.relative_error_pct for ae in result.attributed_errors) / len(result.attributed_errors)

    return f"""
    <div class="summary-grid">
        <div class="summary-card">
            <div class="summary-number">{total}</div>
            <div class="summary-label">总房间数</div>
        </div>
        <div class="summary-card">
            <div class="summary-number" style="color:#27ae60;">{ok_count}</div>
            <div class="summary-label">正常</div>
        </div>
        <div class="summary-card">
            <div class="summary-number" style="color:#f39c12;">{suspect_count}</div>
            <div class="summary-label">可疑</div>
        </div>
        <div class="summary-card">
            <div class="summary-number" style="color:#e74c3c;">{bad_count}</div>
            <div class="summary-label">坏数据</div>
        </div>
        <div class="summary-card">
            <div class="summary-number">{attr_count}</div>
            <div class="summary-label">已归因</div>
        </div>
        <div class="summary-card">
            <div class="summary-number" style="color:#27ae60;">{full_attr_count}</div>
            <div class="summary-label">完全归因</div>
        </div>
        <div class="summary-card">
            <div class="summary-number" style="color:#95a5a6;">{sens_count}</div>
            <div class="summary-label">仅灵敏度</div>
        </div>
        <div class="summary-card">
            <div class="summary-number">{_esc(round(avg_error, 2))}%</div>
            <div class="summary-label">平均相对误差</div>
        </div>
        <div class="summary-card">
            <div class="summary-number" style="color:#e74c3c;">{len(result.conflicts)}</div>
            <div class="summary-label">材料冲突</div>
        </div>
        <div class="summary-card">
            <div class="summary-number" style="color:#f39c12;">{len(result.sampling_gaps)}</div>
            <div class="summary-label">采样缺口</div>
        </div>
    </div>"""


def _render_delivery_note(result: PipelineResult) -> str:
    conflict_files = set()
    for c in result.conflicts:
        conflict_files.add(c.source_a)
        conflict_files.add(c.source_b)

    provenance_summary: dict[str, int] = {}
    for room in result.rooms:
        src = room.provenance.source.value
        provenance_summary[src] = provenance_summary.get(src, 0) + 1
        for s in room.surfaces:
            ssrc = s.provenance.source.value
            provenance_summary[ssrc] = provenance_summary.get(ssrc, 0) + 1

    prov_rows = ""
    for src, cnt in provenance_summary.items():
        prov_rows += f"<tr><td>{_esc(src)}</td><td>{cnt}</td></tr>"

    full_attr = sum(1 for ae in result.attributed_errors if ae.attribution_mode == "full")
    sens_attr = sum(1 for ae in result.attributed_errors if ae.attribution_mode == "sensitivity_only")

    return f"""
    <h3>交付说明</h3>
    <div class="delivery-note">
        <p><strong>处理对象：</strong>声学混响误差归因</p>
        <p><strong>处理时间：</strong>{_esc(result.timestamp)}</p>
        <p><strong>处理模式：</strong>
            完全归因 {full_attr} 间（有实际偏差可分解），
            仅灵敏度 {sens_attr} 间（无偏差，仅展示灵敏度参考）
        </p>
        <p><strong>材料构成：</strong></p>
        <table class="data-table">
            <thead><tr><th>来源类型</th><th>数据条数</th></tr></thead>
            <tbody>{prov_rows}</tbody>
        </table>
        <p><strong>口径变更：</strong>{"有" if conflict_files else "无"}（涉及来源: {', '.join(_esc(f) for f in conflict_files) if conflict_files else '-'}）</p>
        <p><strong>坏数据隔离：</strong>{len(result.bad_data_refs)} 条坏数据已标记并排除出计算，详见"坏数据"章节的原始行引用</p>
        <p><strong>采样缺口：</strong>{len(result.sampling_gaps)} 处，详见"采样缺口"章节</p>
        <p><strong>归因口径：</strong></p>
        <ul style="margin-left: 20px; margin-bottom: 10px;">
            <li>有实际偏差的参数：贡献 = 偏导灵敏度 × 实际偏差，按绝对值归一化（合计≈100%）</li>
            <li>无实际偏差的参数：仅展示灵敏度（单位参数变化对 T60 的影响量）</li>
            <li>已解释误差 = 容积偏差贡献 + 表面吸声偏差贡献之和（一阶近似）</li>
            <li>未解释残差 = 总绝对误差 - 已解释误差（含测量误差、模型假设、非线性交互）</li>
        </ul>
        <p><strong>对齐方式：</strong>实验记录 → 处理记录 → 页面摘要，三者按 room_id 一一对应；口径变更的房间/表面在溯源表中标注来源和版本号</p>
    </div>"""


def generate_html_report(result: PipelineResult, output_path: str) -> str:
    room_sections = ""
    for room in result.rooms:
        ae = None
        for a in result.attributed_errors:
            if a.room_id == room.room_id:
                ae = a
                break
        room_sections += _render_room_detail(room, ae)

    page = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>声学混响误差归因 - 处理报告</title>
<style>
:root {{
    --bg: #f8f9fa;
    --card-bg: #ffffff;
    --border: #dee2e6;
    --text: #212529;
    --muted: #6c757d;
    --accent: #2c3e50;
    --accent-light: #3498db;
}}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; padding: 20px; }}
.container {{ max-width: 1200px; margin: 0 auto; }}
h1 {{ color: var(--accent); border-bottom: 3px solid var(--accent); padding-bottom: 10px; margin-bottom: 20px; font-size: 24px; }}
h2 {{ color: var(--accent); margin: 30px 0 15px; font-size: 20px; border-left: 4px solid var(--accent-light); padding-left: 10px; }}
h3 {{ color: var(--accent); margin: 20px 0 10px; font-size: 17px; }}
h4 {{ color: var(--muted); margin: 15px 0 8px; font-size: 15px; }}
.data-table {{ width: 100%; border-collapse: collapse; background: var(--card-bg); border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 15px; font-size: 13px; }}
.data-table th {{ background: var(--accent); color: #fff; padding: 10px 8px; text-align: left; font-weight: 600; }}
.data-table td {{ padding: 8px; border-bottom: 1px solid var(--border); }}
.data-table tr:hover {{ background: #f0f4f8; }}
.data-table tr.bad-row {{ background: #fff5f5; }}
.data-table tr.bad-row:hover {{ background: #ffe8e8; }}
.formula-table td {{ vertical-align: top; }}
.inner-table {{ width: 100%; font-size: 12px; margin-top: 5px; }}
.inner-table th {{ background: #e9ecef; color: var(--text); padding: 4px 6px; }}
.inner-table td {{ padding: 4px 6px; border-bottom: 1px solid #eee; }}
code {{ background: #e9ecef; padding: 1px 5px; border-radius: 3px; font-family: "SF Mono", "Fira Code", monospace; font-size: 12px; }}
.summary-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 20px; }}
.summary-card {{ background: var(--card-bg); border-radius: 8px; padding: 15px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
.summary-number {{ font-size: 28px; font-weight: 700; color: var(--accent); }}
.summary-label {{ font-size: 12px; color: var(--muted); margin-top: 4px; }}
.result-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-bottom: 15px; }}
.result-card {{ background: #f0f4f8; border-radius: 6px; padding: 12px; }}
.result-label {{ font-size: 12px; color: var(--muted); }}
.result-value {{ font-size: 18px; font-weight: 600; color: var(--accent); }}
.room-section {{ background: var(--card-bg); border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }}
.room-meta {{ display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 15px; font-size: 14px; }}
.alert {{ padding: 12px 16px; border-radius: 6px; margin-bottom: 10px; }}
.alert-error {{ background: #ffe8e8; color: #c0392b; border-left: 4px solid #e74c3c; }}
.delivery-note {{ background: #f0f4f8; border-radius: 8px; padding: 20px; }}
.delivery-note p {{ margin-bottom: 10px; }}
details {{ margin-top: 5px; }}
details summary {{ cursor: pointer; color: var(--accent-light); font-size: 12px; }}
@media print {{ body {{ padding: 0; }} .room-section {{ break-inside: avoid; }} }}
</style>
</head>
<body>
<div class="container">
<h1>声学混响误差归因 - 处理报告</h1>
<p style="color:var(--muted);margin-bottom:20px;">生成时间: {_esc(result.timestamp)} | Sabine 常数 k = {_esc(SABINE_CONSTANT)} s/m</p>

<h2>页面摘要</h2>
{_render_summary(result)}

<h2>公式与边界值</h2>
<h3>核心公式</h3>
<table class="data-table">
<thead><tr><th>公式名称</th><th>表达式</th><th>变量说明</th><th>单位</th></tr></thead>
<tbody>
<tr><td>Sabine 混响时间</td><td><code>T60 = k &times; V / A</code></td><td>k=0.161 s/m (常数), V=容积(m³), A=总吸声量(m²)</td><td>s</td></tr>
<tr><td>总吸声量</td><td><code>A = &Sigma;(&alpha;i &times; Si)</code></td><td>&alpha;i=吸声系数(无量纲), Si=面积(m²)</td><td>m²</td></tr>
<tr><td>绝对误差</td><td><code>&Delta;T60 = T60_measured - T60_calculated</code></td><td>实测值 - 计算值</td><td>s</td></tr>
<tr><td>相对误差</td><td><code>&delta;T60 = &Delta;T60 / T60_calculated &times; 100%</code></td><td>绝对误差占计算值的百分比</td><td>%</td></tr>
<tr><td>容积偏导</td><td><code>&part;T60/&part;V = k/A</code></td><td>容积变化对 T60 的灵敏度</td><td>s/m³</td></tr>
<tr><td>吸声系数偏导</td><td><code>&part;T60/&part;&alpha;i = -k&times;V&times;Si / A&sup2;</code></td><td>第 i 面吸声系数变化对 T60 的灵敏度</td><td>s</td></tr>
</tbody>
</table>

<h3>边界值</h3>
{_render_boundary_table()}

<h2>材料冲突（口径变更）</h2>
{_render_conflicts(result.conflicts)}

<h2>采样缺口</h2>
{_render_sampling_gaps(result.sampling_gaps)}

<h2>坏数据</h2>
{_render_bad_data(result.bad_data_refs)}

<h2>逐房间归因</h2>
{room_sections}

{_render_delivery_note(result)}
</div>
</body>
</html>"""

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(page)

    return output_path
