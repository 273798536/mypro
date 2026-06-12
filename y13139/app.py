import os
from flask import Flask, request, jsonify, render_template_string, redirect, url_for
import storage
from models import (
    BatchState, new_batch_id,
    RECORD_STATUS_SORT_UNSTABLE, RECORD_STATUS_EVIDENCE_NEEDED, RECORD_STATUS_PROCESSED,
    RECORD_STATUS_CLEAN, RECORD_STATUS_RAW,
)
from markov_engine import (
    ingest_record, run_batch, DEFAULT_PARAM_A, DEFAULT_PARAM_B,
)


app = Flask(__name__)


INDEX_HTML = """
<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>马尔可夫链批量验算</title>
<style>
body{font-family:-apple-system,"PingFang SC",sans-serif;max-width:1100px;margin:24px auto;padding:0 16px;color:#222}
h1{font-size:20px;margin:0 0 8px}
.sub{color:#666;margin-bottom:20px;font-size:13px}
.card{border:1px solid #e3e3e3;border-radius:8px;padding:14px 16px;margin-bottom:14px;background:#fafafa}
.row{display:flex;gap:16px;flex-wrap:wrap}
.stat{flex:1;min-width:120px;border:1px solid #ddd;border-radius:6px;padding:10px 12px;background:#fff}
.stat b{display:block;font-size:22px}
.stat span{color:#666;font-size:12px}
.tag{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;margin-right:6px}
.t-raw{background:#f5f5f5;color:#555}
.t-clean{background:#e7f3ff;color:#1d4e89}
.t-unstable{background:#fff4e5;color:#a55b00}
.t-processed{background:#e6f7ec;color:#1f7a3a}
.t-evidence{background:#fdeaea;color:#a32121}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:10px}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #eee;vertical-align:top}
th{background:#f0f0f0}
details{margin-top:6px}
textarea{width:100%;height:110px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px}
input[type=text]{padding:4px 6px;font-size:13px;width:100%;box-sizing:border-box}
button{padding:6px 14px;font-size:13px;cursor:pointer;border:1px solid #333;background:#fff;border-radius:4px}
button.primary{background:#1d4e89;color:#fff;border-color:#1d4e89}
button.danger{background:#a32121;color:#fff;border-color:#a32121}
a{color:#1d4e89;text-decoration:none}
a:hover{text-decoration:underline}
.timeline{font-size:12px;color:#555;max-height:140px;overflow:auto;background:#fff;border:1px solid #eee;border-radius:4px;padding:6px 10px}
.timeline div{padding:2px 0;border-bottom:1px dashed #f0f0f0}
.timeline div:last-child{border-bottom:none}
.tabs{margin:12px 0 8px;border-bottom:2px solid #eee}
.tabs a{display:inline-block;padding:6px 12px;margin-right:4px;border:1px solid #eee;border-bottom:none;border-radius:4px 4px 0 0;background:#f5f5f5;color:#555}
.tabs a.active{background:#fff;border-bottom:2px solid #fff;margin-bottom:-2px;color:#1d4e89;font-weight:600}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}
code{background:#f0f0f0;padding:1px 4px;border-radius:3px;font-size:12px}
.issue{color:#a32121;font-size:12px}
.step{background:#fff;border:1px solid #eee;border-radius:4px;padding:4px 8px;margin:3px 0;font-size:12px}
.step b{color:#1d4e89}
</style>
</head>
<body>
<h1>马尔可夫链批量验算</h1>
<div class="sub">
状态持久化 · 原始数据保留 · 排序不稳定隔离 · 中间计算过程可见 · 参数A/B对照
</div>

{% if batch %}
<div class="card">
<div class="row" style="align-items:center">
<div style="flex:1">
批次 <b>{{ batch.batch_id }}</b>
<span class="tag t-{{ batch.status }}">{{ batch.status }}</span>
创建于 {{ batch.created_at }} · 最近更新 {{ batch.updated_at }}
</div>
<div>
<a href="{{ url_for('index') }}"><button>刷新/重载上次</button></a>
<form method="post" action="{{ url_for('new_batch') }}" style="display:inline" onsubmit="return confirm('确定开新批次？当前批次仍会保存在 data/state.jsonl')">
<button class="primary" type="submit">开新批次</button>
</form>
</div>
</div>
</div>

<div class="card">
<div class="row">
<div class="stat"><b>{{ counts.total }}</b><span>总记录</span></div>
<div class="stat"><b style="color:#1f7a3a">{{ counts.processed }}</b><span>已处理</span></div>
<div class="stat"><b style="color:#a32121">{{ counts.evidence_needed }}</b><span>需补证据</span></div>
<div class="stat"><b style="color:#a55b00">{{ counts.sort_unstable }}</b><span>排序不稳定</span></div>
<div class="stat"><b>{{ counts.clean }}</b><span>待运算</span></div>
</div>
</div>

<div class="card">
<div class="tabs">
<a href="#ingest" class="active">① 录入/导入</a>
<a href="#params">② 参数A/B</a>
<a href="#run">③ 执行运算</a>
<a href="#results">④ 结果总览</a>
<a href="#timeline">⑤ 历史时间线</a>
</div>

<div id="ingest">
<h3 style="margin:6px 0">录入学生错题记录</h3>
<form method="post" action="{{ url_for('ingest_one') }}">
<div class="cols">
<div>
<label>来源（例如：三班-5月第2周.xlsx / 错题拍照-张老师）</label><br>
<input type="text" name="raw_source" placeholder="三班-5月第2周" required>
</div>
<div>
<label>学号 student_id</label><br>
<input type="text" name="student_id" placeholder="S001" required>
</div>
<div>
<label>时间戳 timestamp（用于稳定排序）</label><br>
<input type="text" name="timestamp" placeholder="2026-05-12 10:30" required>
</div>
<div>
<label>错题序列（逗号分隔，值域：粗心/审题/计算/概念）</label><br>
<input type="text" name="sequence" placeholder="粗心,审题,计算,粗心,概念" required>
</div>
</div>
<br>
<button class="primary" type="submit">录入一条</button>
</form>
<br>
<h3 style="margin:10px 0 4px">批量导入 JSON</h3>
<div style="font-size:12px;color:#666">每行一个对象，字段至少含 <code>raw_source</code>、<code>student_id</code>、<code>timestamp</code>、<code>sequence</code>。
缺字段的记录会被标为<strong>排序不稳定</strong>或<strong>需补证据</strong>，原始内容不会被修改。</div>
<form method="post" action="{{ url_for('ingest_bulk') }}">
<textarea name="bulk" placeholder='{"raw_source":"导入来源","student_id":"S001","timestamp":"2026-05-12","sequence":["粗心","审题","计算"]}
{"raw_source":"导入来源","student_id":"S???","timestamp":"","sequence":["粗心","???","计算"]}'></textarea>
<br>
<button type="submit">批量导入</button>
</form>
</div>

<div id="params" style="margin-top:16px">
<h3 style="margin:6px 0">参数对照（A / B）</h3>
<form method="post" action="{{ url_for('set_params') }}">
<div class="cols">
<div>
<label>参数集 A（JSON）</label>
<textarea name="param_set_a">{{ param_a_json }}</textarea>
</div>
<div>
<label>参数集 B（JSON）</label>
<textarea name="param_set_b">{{ param_b_json }}</textarea>
</div>
</div>
<button type="submit">保存参数</button>
</form>
</div>

<div id="run" style="margin-top:16px">
<h3 style="margin:6px 0">执行批量验算</h3>
<form method="post" action="{{ url_for('run') }}">
<button class="primary" type="submit">运行运算</button>
<span style="font-size:12px;color:#666;margin-left:8px">
排序不稳定记录不会被运算；合法记录会同时用参数A/B计算，中间过程保存在每条记录中。
</span>
</form>
</div>

<div id="results" style="margin-top:16px">
<h3 style="margin:6px 0">结果总览</h3>
<table>
<tr><th style="width:120px">状态</th><th>记录ID / 来源</th><th>原始序列（保留不动）</th><th>问题/排序不稳定原因</th><th>运算结果 & 中间过程</th></tr>
{% for r in records %}
<tr>
<td><span class="tag t-{{ r.status }}">{{ r.status }}</span></td>
<td>
<small><code>{{ r.record_id }}</code></small><br>
<small>来源: {{ r.raw_source }}</small><br>
<small>排序键: {{ r.sort_key or '-' }}</small>
</td>
<td><small>{{ r.raw_payload }}</small></td>
<td>
{% if r.issues %}
{% for i in r.issues %}<div class="issue">· {{ i }}</div>{% endfor %}
{% else %}-{% endif %}
</td>
<td>
{% if r.result %}
<div><b>A 通过:</b> {{ '是' if r.result.param_set_a.passed else '否' }}
{% if r.result.param_set_a.deviations %}<span class="issue">偏差 {{ r.result.param_set_a.deviations|length }} 项</span>{% endif %}
</div>
<div><b>B 通过:</b> {{ '是' if r.result.param_set_b.passed else '否' }}
{% if r.result.param_set_b.deviations %}<span class="issue">偏差 {{ r.result.param_set_b.deviations|length }} 项</span>{% endif %}
</div>
<details>
<summary>查看 {{ r.calc_steps|length }} 步中间计算 / 单位换算</summary>
{% for s in r.calc_steps %}
<div class="step">
<b>{{ s.name }}</b>
{% if s.value_before is not none %} → {{ s.value_after }}
{% if s.unit_before %}({{ s.unit_before }} → {{ s.unit_after }}){% endif %}
{% endif %}
{% if s.note %}<br><small style="color:#666">{{ s.note }}</small>{% endif %}
</div>
{% endfor %}
</details>
{% else %}
<small style="color:#888">未运算</small>
{% endif %}
</td>
</tr>
{% endfor %}
</table>
</div>

<div id="timeline" style="margin-top:16px">
<h3 style="margin:6px 0">历史时间线（服务重启后仍可查看）</h3>
<div class="timeline">
{% for e in batch.timeline|reverse %}
<div><b>{{ e.ts }}</b> · {{ e.event }}{% if e.detail %} · <span style="color:#888">{{ e.detail }}</span>{% endif %}</div>
{% endfor %}
{% if not batch.timeline %}<div style="color:#888">暂无事件</div>{% endif %}
</div>
</div>

</div>

{% else %}
<div class="card">
<p>暂无批次。服务重启后会自动恢复最近一个批次。</p>
<form method="post" action="{{ url_for('new_batch') }}">
<button class="primary" type="submit">新建批次开始</button>
</form>
</div>
{% endif %}

{% if all_batches and all_batches|length > 1 %}
<div class="card">
<h3 style="margin:0 0 8px;font-size:14px">历史批次（保存在 data/state.jsonl）</h3>
<table>
<tr><th>批次</th><th>状态</th><th>创建</th><th>记录数</th><th></th></tr>
{% for b in all_batches %}
<tr>
<td><code>{{ b.batch_id }}</code></td>
<td><span class="tag t-{{ b.status }}">{{ b.status }}</span></td>
<td>{{ b.created_at }}</td>
<td>{{ b.records|length }}</td>
<td>
<form method="post" action="{{ url_for('switch_batch', batch_id=b.batch_id) }}" style="display:inline">
<button type="submit">切换</button>
</form>
<form method="post" action="{{ url_for('del_batch', batch_id=b.batch_id) }}" style="display:inline" onsubmit="return confirm('删除该批次？')">
<button class="danger" type="submit">删除</button>
</form>
</td>
</tr>
{% endfor %}
</table>
</div>
{% endif %}

</body>
</html>
"""


def _dict_to_json(d: dict) -> str:
    import json
    return json.dumps(d, ensure_ascii=False, indent=2)


@app.route("/")
def index():
    batch = storage.load_last()
    all_batches = storage.load_all()
    if batch is None:
        return render_template_string(INDEX_HTML, batch=None, counts={}, records=[],
                                      all_batches=all_batches,
                                      param_a_json=_dict_to_json(DEFAULT_PARAM_A),
                                      param_b_json=_dict_to_json(DEFAULT_PARAM_B))
    counts = batch.counts()
    records = sorted(batch.records.values(), key=lambda r: (r.status, r.created_at))
    return render_template_string(INDEX_HTML, batch=batch, counts=counts, records=records,
                                  all_batches=all_batches,
                                  param_a_json=_dict_to_json(batch.param_set_a or DEFAULT_PARAM_A),
                                  param_b_json=_dict_to_json(batch.param_set_b or DEFAULT_PARAM_B))


@app.route("/batch/new", methods=["POST"])
def new_batch():
    import json
    batch = BatchState(
        batch_id=new_batch_id(),
        param_set_a=dict(DEFAULT_PARAM_A),
        param_set_b=dict(DEFAULT_PARAM_B),
    )
    batch.add_event("batch_created", "新批次初始化，参数A/B已加载默认值")
    storage.save_snapshot(batch)
    storage._write_meta({"last_batch_id": batch.batch_id, "last_updated": batch.updated_at})
    return redirect(url_for("index"))


@app.route("/batch/switch/<batch_id>", methods=["POST"])
def switch_batch(batch_id):
    b = storage.load_batch(batch_id)
    if b:
        storage._write_meta({"last_batch_id": batch_id, "last_updated": b.updated_at})
    return redirect(url_for("index"))


@app.route("/batch/delete/<batch_id>", methods=["POST"])
def del_batch(batch_id):
    storage.delete_batch(batch_id)
    meta = storage.read_meta()
    if meta.get("last_batch_id") == batch_id:
        remaining = storage.load_all()
        if remaining:
            storage._write_meta({"last_batch_id": remaining[0].batch_id,
                                 "last_updated": remaining[0].updated_at})
        else:
            storage._write_meta({})
    return redirect(url_for("index"))


@app.route("/ingest/one", methods=["POST"])
def ingest_one():
    batch = storage.load_last()
    if not batch:
        return redirect(url_for("new_batch"))
    f = request.form
    payload = {
        "student_id": f.get("student_id", ""),
        "timestamp": f.get("timestamp", ""),
        "sequence": f.get("sequence", ""),
    }
    ingest_record(batch, f.get("raw_source", "manual"), payload)
    storage.save_snapshot(batch)
    return redirect(url_for("index"))


@app.route("/ingest/bulk", methods=["POST"])
def ingest_bulk():
    import json
    batch = storage.load_last()
    if not batch:
        return redirect(url_for("new_batch"))
    text = request.form.get("bulk", "")
    ok, bad = 0, 0
    for ln in text.splitlines():
        ln = ln.strip()
        if not ln:
            continue
        try:
            obj = json.loads(ln)
            src = obj.pop("raw_source", "bulk")
            ingest_record(batch, src, obj)
            ok += 1
        except Exception as e:
            bad += 1
            batch.add_event("ingest_error", f"行解析失败: {e}")
    batch.add_event("ingest_bulk", f"成功 {ok} 条, 失败 {bad} 条")
    storage.save_snapshot(batch)
    return redirect(url_for("index"))


@app.route("/params", methods=["POST"])
def set_params():
    import json
    batch = storage.load_last()
    if not batch:
        return redirect(url_for("new_batch"))
    try:
        a = json.loads(request.form.get("param_set_a", "{}"))
        b = json.loads(request.form.get("param_set_b", "{}"))
        batch.param_set_a = a
        batch.param_set_b = b
        batch.add_event("params_updated", f"A keys={list(a.keys())} B keys={list(b.keys())}")
    except Exception as e:
        batch.add_event("params_error", str(e))
    storage.save_snapshot(batch)
    return redirect(url_for("index"))


@app.route("/run", methods=["POST"])
def run():
    batch = storage.load_last()
    if not batch:
        return redirect(url_for("new_batch"))
    run_batch(batch)
    storage.save_snapshot(batch)
    return redirect(url_for("index"))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
