from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Optional

from .models import AuditVersion, Severity


_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>概率保底抽卡审计报告</title>
<style>
:root {{
  --bg: #0d1117;
  --surface: #161b22;
  --border: #30363d;
  --text: #c9d1d9;
  --text-dim: #8b949e;
  --critical: #f85149;
  --critical-bg: #3d1214;
  --warning: #d29922;
  --warning-bg: #3b2e00;
  --info: #58a6ff;
  --info-bg: #0d2240;
  --ok: #3fb950;
  --ok-bg: #0d2818;
}}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  background: var(--bg); color: var(--text);
  line-height: 1.6; padding: 20px;
}}
.container {{ max-width: 1200px; margin: 0 auto; }}
h1 {{ font-size: 24px; margin-bottom: 4px; }}
h2 {{ font-size: 18px; margin: 24px 0 12px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }}
h3 {{ font-size: 15px; margin: 16px 0 8px; color: var(--text-dim); }}
.meta {{ color: var(--text-dim); font-size: 13px; margin-bottom: 20px; }}
.card {{
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; padding: 16px; margin-bottom: 12px;
}}
.card.critical {{ border-color: var(--critical); background: var(--critical-bg); }}
.card.warning {{ border-color: var(--warning); background: var(--warning-bg); }}
.card.info {{ border-color: var(--info); background: var(--info-bg); }}
.card.ok {{ border-color: var(--ok); background: var(--ok-bg); }}
.badge {{
  display: inline-block; font-size: 11px; font-weight: 700;
  padding: 2px 8px; border-radius: 12px; text-transform: uppercase;
}}
.badge.critical {{ background: var(--critical); color: #fff; }}
.badge.warning {{ background: var(--warning); color: #000; }}
.badge.info {{ background: var(--info); color: #fff; }}
.badge.ok {{ background: var(--ok); color: #000; }}
.summary-grid {{
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px; margin-bottom: 20px;
}}
.summary-item {{
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; padding: 12px; text-align: center;
}}
.summary-item .num {{ font-size: 28px; font-weight: 700; }}
.summary-item .label {{ font-size: 12px; color: var(--text-dim); }}
table {{
  width: 100%; border-collapse: collapse; margin: 8px 0;
  font-size: 13px;
}}
th, td {{
  padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--border);
}}
th {{ color: var(--text-dim); font-weight: 600; }}
tr:hover {{ background: rgba(255,255,255,0.03); }}
.bar-chart {{ margin: 12px 0; }}
.bar-row {{ display: flex; align-items: center; margin: 4px 0; }}
.bar-label {{ width: 100px; text-align: right; padding-right: 8px; font-size: 13px; }}
.bar-track {{ flex: 1; background: var(--border); border-radius: 4px; height: 20px; position: relative; }}
.bar-fill {{ height: 100%; border-radius: 4px; }}
.bar-value {{ font-size: 12px; margin-left: 8px; min-width: 80px; }}
.detail-toggle {{
  cursor: pointer; color: var(--info); font-size: 13px;
  margin-top: 8px; display: inline-block;
}}
.detail-content {{ display: none; margin-top: 8px; font-size: 12px; }}
.detail-content.show {{ display: block; }}
pre {{
  background: #0d1117; border: 1px solid var(--border);
  border-radius: 4px; padding: 8px; overflow-x: auto;
  font-size: 12px;
}}
.filter-info {{
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; padding: 12px; margin-bottom: 16px;
  font-size: 13px;
}}
.filter-info code {{
  background: var(--border); padding: 2px 6px; border-radius: 3px;
  font-size: 12px;
}}
.version-chain {{ font-size: 12px; color: var(--text-dim); margin-bottom: 12px; }}
.version-chain a {{ color: var(--info); text-decoration: none; }}
</style>
</head>
<body>
<div class="container">
{content}
</div>
<script>
function toggle(id) {{
  var el = document.getElementById(id);
  if (el) el.classList.toggle('show');
}}
</script>
</body>
</html>"""


class ReportExporter:
    def __init__(self, output_dir: str) -> None:
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def export_json(self, version: AuditVersion, filename: Optional[str] = None) -> str:
        if not filename:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"gacha_audit_{ts}.json"
        path = os.path.join(self.output_dir, filename)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(version.to_dict(), f, ensure_ascii=False, indent=2)
        return path

    def export_html(self, version: AuditVersion, filename: Optional[str] = None) -> str:
        if not filename:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"gacha_audit_{ts}.html"
        path = os.path.join(self.output_dir, filename)
        content = self._render_html(version)
        html = _HTML_TEMPLATE.replace("{content}", content)
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        return path

    def _render_html(self, version: AuditVersion) -> str:
        parts = []
        parts.append(self._render_header(version))
        parts.append(self._render_summary(version))
        parts.append(self._render_critical_issues(version))
        parts.append(self._render_all_issues(version))
        parts.append(self._render_prob_validation(version))
        parts.append(self._render_pity_tracking(version))
        parts.append(self._render_pity_snapshots(version))
        return "\n".join(parts)

    def _render_header(self, version: AuditVersion) -> str:
        supp = ""
        if version.supplemental_for:
            supp = f'<div class="version-chain">补充版本，基于 <code>{version.supplemental_for}</code></div>'
        filt = ""
        if version.filter_applied:
            items = [f"<code>{k}={v}</code>" for k, v in version.filter_applied.items()]
            filt = f'<div class="filter-info">筛选条件: {" & ".join(items)}</div>'
        return f"""
<h1>概率保底抽卡审计报告</h1>
<div class="meta">
  版本: <code>{version.version_id}</code> &middot;
  生成时间: {version.created_at} &middot;
  卡池数: {len(version.prob_configs)} &middot;
  保底规则数: {len(version.pity_rules)}
</div>
{supp}{filt}"""

    def _render_summary(self, version: AuditVersion) -> str:
        critical = sum(1 for i in version.issues if i.severity == Severity.CRITICAL)
        warning = sum(1 for i in version.issues if i.severity == Severity.WARNING)
        info = sum(1 for i in version.issues if i.severity == Severity.INFO)
        prob_issues = sum(1 for i in version.issues if i.category in ("概率未归一", "概率为负", "概率为零"))
        pity_issues = sum(1 for i in version.issues if i.category in ("保底超限", "保底异常重置"))
        anomaly_pity = sum(1 for s in version.pity_snapshots if s.is_anomaly)

        return f"""
<h2>审计摘要</h2>
<div class="summary-grid">
  <div class="summary-item">
    <div class="num" style="color:var(--{'critical' if critical else 'ok'})">{critical}</div>
    <div class="label">严重问题</div>
  </div>
  <div class="summary-item">
    <div class="num" style="color:var(--warning)">{warning}</div>
    <div class="label">警告</div>
  </div>
  <div class="summary-item">
    <div class="num" style="color:var(--info)">{info}</div>
    <div class="label">提示</div>
  </div>
  <div class="summary-item">
    <div class="num" style="color:var(--{'critical' if prob_issues else 'ok'})">{prob_issues}</div>
    <div class="label">概率异常</div>
  </div>
  <div class="summary-item">
    <div class="num" style="color:var(--{'critical' if pity_issues else 'ok'})">{pity_issues}</div>
    <div class="label">保底异常</div>
  </div>
  <div class="summary-item">
    <div class="num" style="color:var(--{'critical' if anomaly_pity else 'ok'})">{anomaly_pity}</div>
    <div class="label">保底计数异常</div>
  </div>
</div>"""

    def _render_critical_issues(self, version: AuditVersion) -> str:
        criticals = [i for i in version.issues if i.severity == Severity.CRITICAL]
        if not criticals:
            return '<h2>严重问题</h2><div class="card ok"><span class="badge ok">PASS</span> 无严重问题</div>'
        parts = ["<h2>⚠ 严重问题</h2>"]
        for idx, iss in enumerate(criticals):
            detail_id = f"crit-detail-{idx}"
            detail_html = ""
            if iss.detail:
                detail_html = f"""
<span class="detail-toggle" onclick="toggle('{detail_id}')">▶ 查看定位详情</span>
<div id="{detail_id}" class="detail-content"><pre>{json.dumps(iss.detail, ensure_ascii=False, indent=2)}</pre></div>"""
            parts.append(f"""
<div class="card critical">
  <span class="badge critical">{iss.category}</span>
  <div style="margin-top:8px"><strong>{iss.description}</strong></div>
  <div style="margin-top:4px;font-size:13px;color:var(--text-dim)">
    定位: <code>{iss.location}</code>
  </div>
  {detail_html}
</div>""")
        return "\n".join(parts)

    def _render_all_issues(self, version: AuditVersion) -> str:
        if not version.issues:
            return ""
        non_critical = [i for i in version.issues if i.severity != Severity.CRITICAL]
        if not non_critical:
            return ""
        parts = ["<h2>其他问题</h2>"]
        for idx, iss in enumerate(non_critical):
            css_class = "warning" if iss.severity == Severity.WARNING else "info"
            parts.append(f"""
<div class="card {css_class}">
  <span class="badge {css_class}">{iss.category}</span>
  <div style="margin-top:4px;font-size:13px">{iss.description}</div>
  <div style="font-size:12px;color:var(--text-dim)">定位: <code>{iss.location}</code></div>
</div>""")
        return "\n".join(parts)

    def _render_prob_validation(self, version: AuditVersion) -> str:
        if not version.prob_configs:
            return ""
        parts = ["<h2>概率校验</h2>"]
        for cfg in version.prob_configs:
            by_rarity: dict[str, float] = {}
            for e in cfg.entries:
                by_rarity[e.rarity] = by_rarity.get(e.rarity, 0.0) + e.probability
            total = sum(by_rarity.values())
            status = "ok" if abs(total - 1.0) < 1e-6 else "critical"
            badge = "PASS" if status == "ok" else "FAIL"
            parts.append(f"""
<div class="card {status}">
  <h3>{cfg.pool_name} ({cfg.pool_id}) v{cfg.version}</h3>
  <div style="margin:8px 0">
    <span class="badge {status}">{badge}</span>
    概率总和: <strong>{total:.6f}</strong>
    {f'(偏差: {abs(total - 1.0):.6f})' if status == 'critical' else ''}
  </div>
  <div class="bar-chart">""")
            max_prob = max(by_rarity.values()) if by_rarity else 1.0
            for rarity, prob in sorted(by_rarity.items(), key=lambda x: -x[1]):
                pct = (prob / max_prob * 100) if max_prob > 0 else 0
                color = "var(--ok)" if abs(prob - 1.0) < 1e-6 or len(by_rarity) > 1 else "var(--critical)"
                parts.append(f"""
    <div class="bar-row">
      <div class="bar-label">{rarity}</div>
      <div class="bar-track"><div class="bar-fill" style="width:{pct}%;background:{color}"></div></div>
      <div class="bar-value">{prob:.4f}</div>
    </div>""")
            parts.append("  </div>\n</div>")
        return "\n".join(parts)

    def _render_pity_tracking(self, version: AuditVersion) -> str:
        if not version.pity_rules:
            return ""
        parts = ["<h2>保底规则</h2>"]
        parts.append("<table><tr><th>卡池</th><th>保底类型</th><th>阈值</th><th>保底稀有度</th>")
        if any(r.soft_pity_start for r in version.pity_rules):
            parts.append("<th>软保底起始</th>")
        parts.append("</tr>")
        for rule in version.pity_rules:
            row = f"<tr><td>{rule.pool_id}</td><td>{rule.pity_type}</td><td>{rule.threshold}</td><td>{rule.guaranteed_rarity}</td>"
            if any(r.soft_pity_start for r in version.pity_rules):
                row += f"<td>{rule.soft_pity_start or '-'}</td>"
            row += "</tr>"
            parts.append(row)
        parts.append("</table>")
        return "\n".join(parts)

    def _render_pity_snapshots(self, version: AuditVersion) -> str:
        if not version.pity_snapshots:
            return ""
        parts = ["<h2>保底计数器快照</h2>"]
        anomaly = [s for s in version.pity_snapshots if s.is_anomaly]
        normal = [s for s in version.pity_snapshots if not s.is_anomaly]

        if anomaly:
            parts.append('<h3 style="color:var(--critical)">⚠ 异常保底计数</h3>')
            for s in anomaly:
                parts.append(f"""
<div class="card critical">
  玩家 <code>{s.player_id}</code> 卡池 <code>{s.pool_id}</code> [{s.pity_type}]
  当前计数: <strong>{s.current_count}</strong> / 阈值 {s.threshold}
  <span class="badge critical">超限</span>
  <div style="font-size:12px;color:var(--text-dim);margin-top:4px">
    {s.anomaly_reason or ''}
    {f' · 上次重置: seq={s.last_reset_seq}' if s.last_reset_seq else ''}
  </div>
</div>""")

        if normal:
            parts.append("<h3>正常保底计数</h3>")
            parts.append("<table><tr><th>玩家</th><th>卡池</th><th>类型</th><th>当前</th><th>阈值</th><th>上次重置</th></tr>")
            for s in normal:
                last = f"seq={s.last_reset_seq}" if s.last_reset_seq else "-"
                parts.append(f"<tr><td>{s.player_id}</td><td>{s.pool_id}</td><td>{s.pity_type}</td><td>{s.current_count}</td><td>{s.threshold}</td><td>{last}</td></tr>")
            parts.append("</table>")

        return "\n".join(parts)

    def export_version_history_html(
        self, versions: list[AuditVersion], filename: Optional[str] = None
    ) -> str:
        if not filename:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"gacha_audit_history_{ts}.html"

        parts = ["<h1>审计历史回放</h1>"]
        for v in versions:
            supp = f' (补充于 <code>{v.supplemental_for}</code>)' if v.supplemental_for else ""
            critical = sum(1 for i in v.issues if i.severity == Severity.CRITICAL)
            parts.append(f"""
<div class="card">
  <h3>{v.version_id}{supp}</h3>
  <div class="meta">{v.created_at} &middot; 严重问题: {critical}</div>
  <div>卡池: {", ".join(c.pool_name for c in v.prob_configs)}</div>
  <div>筛选: {v.filter_applied or "无"}</div>
</div>""")

        content = "\n".join(parts)
        html = _HTML_TEMPLATE.replace("{content}", content)
        path = os.path.join(self.output_dir, filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        return path
