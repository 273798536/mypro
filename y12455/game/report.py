import os
import json
import time
from datetime import datetime


BASIS_CN = {"+": "直线基(+)", "×": "对角基(×)"}


def generate_report(snapshot, export_dir="exports"):
    os.makedirs(export_dir, exist_ok=True)
    session_id = snapshot.get("results", {}).get("session_id", "unknown")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"report_{session_id}_{timestamp}.html"
    filepath = os.path.join(export_dir, filename)

    html = _build_html(snapshot)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)

    raw_path = os.path.join("data", f"session_{session_id}.json")
    return filepath, raw_path


def _build_html(snapshot):
    results = snapshot.get("results", {})
    analysis = snapshot.get("analysis", {})
    raw_events = snapshot.get("raw_events", [])

    session_id = results.get("session_id", "—")
    num_photons = results.get("num_photons", "—")
    ber_threshold = results.get("ber_threshold", "—")
    num_sifted = results.get("num_sifted", "—")
    num_test = results.get("num_test", "—")
    num_key_bits = results.get("num_key_bits", "—")
    test_errors = results.get("test_errors", "—")
    ber = results.get("ber", 0)
    ber_exceeded = results.get("ber_exceeded", False)
    final_key_alice = results.get("final_key_alice", "—")
    final_key_bob = results.get("final_key_bob", "—")
    key_match = results.get("key_match", False)
    started_at = results.get("started_at", 0)
    finished_at = results.get("finished_at", 0)
    duration = finished_at - started_at if started_at and finished_at else 0

    ber_display = f"{ber:.2%}"
    threshold_display = f"{ber_threshold:.2%}" if isinstance(ber_threshold, float) else str(ber_threshold)
    ber_class = "danger" if ber_exceeded else "safe"

    key_trace_html = _build_key_trace(raw_events)
    event_replay_html = _build_event_replay(raw_events)
    basis_confusion_html = _build_basis_confusion_section(analysis)
    ber_section_html = _build_ber_section(analysis)
    repeat_section_html = _build_repeat_section(analysis)
    summary_html = _build_summary(analysis)

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>量子密钥护送队 — 课堂报告</title>
<style>
:root {{
  --bg: #fafbfc; --fg: #1a1a2e; --muted: #6b7280;
  --accent: #4361ee; --danger: #ef4444; --safe: #10b981;
  --card: #ffffff; --border: #e5e7eb;
}}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
       background: var(--bg); color: var(--fg); padding: 2rem; line-height: 1.7; }}
.container {{ max-width: 900px; margin: 0 auto; }}
h1 {{ font-size: 1.6rem; margin-bottom: 0.3rem; }}
h2 {{ font-size: 1.25rem; margin: 2rem 0 0.8rem; border-left: 4px solid var(--accent); padding-left: 0.6rem; }}
h3 {{ font-size: 1.05rem; margin: 1rem 0 0.4rem; }}
.meta {{ color: var(--muted); font-size: 0.9rem; margin-bottom: 1.5rem; }}
.card {{ background: var(--card); border: 1px solid var(--border); border-radius: 8px;
         padding: 1.2rem 1.5rem; margin-bottom: 1rem; }}
.grid2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }}
.stat {{ text-align: center; }}
.stat .num {{ font-size: 1.8rem; font-weight: 700; }}
.stat .label {{ font-size: 0.85rem; color: var(--muted); }}
.danger {{ color: var(--danger); }}
.safe {{ color: var(--safe); }}
table {{ width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 0.5rem; }}
th, td {{ border: 1px solid var(--border); padding: 6px 10px; text-align: center; }}
th {{ background: #f3f4f6; font-weight: 600; }}
.explain {{ background: #fffbeb; border-left: 3px solid #f59e0b; padding: 0.8rem 1rem;
            margin-top: 0.5rem; font-size: 0.9rem; border-radius: 0 6px 6px 0; }}
.event-step {{ padding: 0.5rem 0; border-bottom: 1px dashed var(--border); font-size: 0.88rem; }}
.event-step:last-child {{ border-bottom: none; }}
.step-label {{ display: inline-block; background: var(--accent); color: #fff;
              border-radius: 4px; padding: 0 6px; font-size: 0.78rem; margin-right: 6px; }}
.tag {{ display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.78rem; font-weight: 600; }}
.tag-danger {{ background: #fef2f2; color: var(--danger); }}
.tag-safe {{ background: #ecfdf5; color: var(--safe); }}
.tag-warn {{ background: #fffbeb; color: #d97706; }}
.key-display {{ font-family: "SF Mono", "Fira Code", monospace; letter-spacing: 2px;
               background: #f8f9fa; padding: 0.6rem 1rem; border-radius: 6px; word-break: break-all; }}
.summary-box {{ background: linear-gradient(135deg, #eef2ff, #f0fdf4);
               border: 1px solid var(--border); border-radius: 8px; padding: 1.2rem 1.5rem; }}
@media print {{ body {{ padding: 0; }} .card {{ break-inside: avoid; }} }}
</style>
</head>
<body>
<div class="container">
<h1>量子密钥护送队 — 课堂报告</h1>
<p class="meta">
  会话 {session_id} &nbsp;|&nbsp;
  生成时间 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} &nbsp;|&nbsp;
  用时 {duration:.1f}s
</p>

<div class="card grid2">
  <div class="stat"><div class="num">{num_photons}</div><div class="label">发送光子</div></div>
  <div class="stat"><div class="num">{num_sifted}</div><div class="label">筛选保留</div></div>
  <div class="stat"><div class="num">{num_test}</div><div class="label">测试样本</div></div>
  <div class="stat"><div class="num">{num_key_bits}</div><div class="label">最终密钥位</div></div>
</div>

<div class="card">
  <h3>误码率判定</h3>
  <p>QBER = <strong class="{ber_class}">{ber_display}</strong>，
     阈值 = <strong>{threshold_display}</strong>
     <span class="tag {'tag-danger' if ber_exceeded else 'tag-safe'}">
       {'超标 — 可能存在窃听' if ber_exceeded else '安全'}
     </span>
  </p>
  <p>测试样本中 {test_errors} 位不一致。</p>
</div>

<div class="card">
  <h3>最终密钥</h3>
  <p style="font-size:0.85rem;color:var(--muted);margin-bottom:0.3rem;">Alice 端</p>
  <div class="key-display">{final_key_alice}</div>
  <p style="font-size:0.85rem;color:var(--muted);margin:0.5rem 0 0.3rem;">Bob 端</p>
  <div class="key-display">{final_key_bob}</div>
  <p style="margin-top:0.5rem;">
    密钥一致性：<span class="tag {'tag-safe' if key_match else 'tag-danger'}">
      {'一致' if key_match else '不一致'}
    </span>
  </p>
</div>

<h2>分类错误分析</h2>
{summary_html}
{basis_confusion_html}
{ber_section_html}
{repeat_section_html}

<h2>密钥生成追踪</h2>
<p style="color:var(--muted);font-size:0.88rem;margin-bottom:0.5rem;">
  以下表格展示每一颗光子从发送到筛选的完整路径，可以追溯密钥的每一位是怎么来的。
</p>
{key_trace_html}

<h2>事件回放</h2>
<p style="color:var(--muted);font-size:0.88rem;margin-bottom:0.5rem;">
  按时间顺序回放本局所有关键事件，展示协议执行的全过程。
</p>
{event_replay_html}

</div>
</body>
</html>"""


def _build_key_trace(raw_events):
    if not raw_events:
        return '<div class="card"><p>无数据</p></div>'
    rows = []
    for e in raw_events:
        alice_basis_cn = BASIS_CN.get(e.get("alice_basis"), e.get("alice_basis", ""))
        bob_basis_cn = BASIS_CN.get(e.get("bob_basis"), e.get("bob_basis", ""))
        eve_basis_cn = BASIS_CN.get(e.get("eve_basis"), e.get("eve_basis", ""))

        sifted_tag = ""
        if e.get("sifted"):
            if e.get("in_test_sample"):
                sifted_tag = '<span class="tag tag-warn">测试</span>'
            else:
                sifted_tag = '<span class="tag tag-safe">密钥</span>'
        else:
            sifted_tag = '<span class="tag" style="background:#f3f4f6;color:#9ca3af;">丢弃</span>'

        error_tag = ""
        if e.get("bit_error"):
            error_tag = '<span class="tag tag-danger">误码</span>'

        eve_col = "—"
        if e.get("eve_active"):
            mismatch = " ⚠" if e.get("eve_basis_mismatch") else " ✓"
            eve_col = f'{eve_basis_cn} → {e.get("eve_bit_after")}{mismatch}'

        rows.append(f"""<tr>
<td>{e.get('index')}</td>
<td>{e.get('alice_bit')}</td><td>{alice_basis_cn}</td><td>{e.get('photon_state')}</td>
<td>{eve_col}</td>
<td>{e.get('bob_bit')}</td><td>{bob_basis_cn}</td>
<td>{sifted_tag}</td>
<td>{error_tag}</td>
</tr>""")

    return f"""<div class="card" style="overflow-x:auto;">
<table>
<tr><th>#</th><th>Alice比特</th><th>Alice基</th><th>量子态</th>
    <th>拦截(Eve)</th><th>Bob比特</th><th>Bob基</th><th>筛选</th><th>误码</th></tr>
{''.join(rows)}
</table>
</div>"""


def _build_event_replay(raw_events):
    if not raw_events:
        return '<div class="card"><p>无数据</p></div>'

    steps = []
    for e in raw_events:
        idx = e.get("index")
        alice_basis_cn = BASIS_CN.get(e.get("alice_basis"), e.get("alice_basis", ""))
        bob_basis_cn = BASIS_CN.get(e.get("bob_basis"), e.get("bob_basis", ""))

        parts = [f'<span class="step-label">发送</span> Alice 发送光子 #{idx}：比特={e.get("alice_bit")}，基={alice_basis_cn}，态={e.get("photon_state")}']

        if e.get("eve_active"):
            eve_basis_cn = BASIS_CN.get(e.get("eve_basis"), e.get("eve_basis", ""))
            mismatch = "（基不匹配！）" if e.get("eve_basis_mismatch") else "（基匹配）"
            parts.append(
                f'<span class="step-label" style="background:#ef4444;">拦截</span> '
                f'Eve 用{eve_basis_cn}测量{mismatch}，结果={e.get("eve_bit_after")}'
            )

        parts.append(
            f'<span class="step-label" style="background:#6366f1;">测量</span> '
            f'Bob 用{bob_basis_cn}测量，结果={e.get("bob_bit")}'
        )

        if e.get("sifted"):
            if e.get("in_test_sample"):
                match = "一致" if e.get("test_bit_match") else "不一致 ⚠"
                parts.append(
                    f'<span class="step-label" style="background:#d97706;">测试</span> '
                    f'公开比对：{match}'
                )
            else:
                parts.append(
                    f'<span class="step-label" style="background:#10b981;">密钥</span> '
                    f'该位进入最终密钥'
                )
        else:
            parts.append(
                f'<span class="step-label" style="background:#9ca3af;">丢弃</span> '
                f'基不一致，丢弃'
            )

        if e.get("repeated"):
            parts.append(
                f'<span class="step-label" style="background:#ef4444;">重复</span> '
                f'与光子 #{e.get("repeat_of")} 编码相同'
            )

        steps.append(f'<div class="event-step">{"<br>".join(parts)}</div>')

    return f'<div class="card">{"".join(steps)}</div>'


def _build_basis_confusion_section(analysis):
    bc = analysis.get("basis_confusion", {})
    count = bc.get("count", 0)
    general = bc.get("general_explanation", "")
    details = bc.get("detail", [])

    detail_html = ""
    if details:
        items = [f"<li>{d.get('explanation', '')}</li>" for d in details]
        detail_html = f'<ul style="margin:0.5rem 0 0 1.2rem;font-size:0.88rem;">{"".join(items)}</ul>'

    return f"""<div class="card">
<h3>1. 测量基混淆 <span class="tag {'tag-danger' if count > 0 else 'tag-safe'}">
  {'发现 ' + str(count) + ' 次' if count > 0 else '未发现'}
</span></h3>
<div class="explain">{general}</div>
{detail_html}
</div>"""


def _build_ber_section(analysis):
    ba = analysis.get("ber_analysis", {})
    detail = ba.get("detail", {})
    general = ba.get("general_explanation", "")

    ber_val = f"{detail.get('ber', 0):.2%}"
    threshold_val = f"{detail.get('threshold', 0.11):.2%}"
    exceeded = detail.get("exceeded", False)
    explanation = detail.get("explanation", "")
    error_indices = detail.get("error_indices", [])

    indices_str = ", ".join(f"#{i}" for i in error_indices) if error_indices else "无"

    return f"""<div class="card">
<h3>2. 误码超限判定 <span class="tag {'tag-danger' if exceeded else 'tag-safe'}">
  {'QBER ' + ber_val + ' > ' + threshold_val if exceeded else 'QBER ' + ber_val + ' ≤ ' + threshold_val}
</span></h3>
<div class="explain">{general}</div>
<p style="margin-top:0.5rem;font-size:0.9rem;white-space:pre-line;">{explanation}</p>
<p style="font-size:0.85rem;color:var(--muted);">出错光子索引：{indices_str}</p>
</div>"""


def _build_repeat_section(analysis):
    ra = analysis.get("repeat_analysis", {})
    count = ra.get("count", 0)
    general = ra.get("general_explanation", "")
    details = ra.get("detail", [])

    detail_html = ""
    if details:
        items = [f"<li>{d.get('explanation', '')}</li>" for d in details]
        detail_html = f'<ul style="margin:0.5rem 0 0 1.2rem;font-size:0.88rem;">{"".join(items)}</ul>'

    return f"""<div class="card">
<h3>3. 重复传输检测 <span class="tag {'tag-warn' if count > 0 else 'tag-safe'}">
  {'发现 ' + str(count) + ' 对' if count > 0 else '未发现'}
</span></h3>
<div class="explain">{general}</div>
{detail_html}
</div>"""


def _build_summary(analysis):
    summary = analysis.get("summary", "无分析结果。")
    return f"""<div class="summary-box">
<strong>总评：</strong>{summary}
</div>"""
