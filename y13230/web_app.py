"""
采样包素材版本复核 —— Web UI（零依赖，Python3 原生 http.server）

启动：
    cd /Users/mac/pro/solo/workspaces/y13230
    python3 web_app.py
    # 然后浏览器打开 http://127.0.0.1:8765/
"""
import json
import os
import sys
import html
import urllib.parse
import cgi
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from models import (
    TrackItem, ContractScan, AudioFile, ReviewStatus, IssueType,
    compute_file_hash, compute_content_hash
)
from review_engine import ReviewStore, now_iso, parse_filename
from report_generator import generate_markdown_report, save_report

DEFAULT_PORT = 8765
STORE = ReviewStore()


def _status_badge(status: ReviewStatus) -> str:
    return {
        ReviewStatus.PENDING: '<span class="badge badge-pending">⏳ 待复核</span>',
        ReviewStatus.PASSED: '<span class="badge badge-ok">✅ 可放行</span>',
        ReviewStatus.NEEDS_SUPPLEMENT: '<span class="badge badge-err">⚠️ 需补材料</span>',
        ReviewStatus.AMBIGUOUS: '<span class="badge badge-warn">❓ 存疑待确认</span>',
    }.get(status, '<span class="badge">•</span>')


def _severity_icon(severity: str) -> str:
    return {"error": "🔴", "warning": "🟡", "info": "🟢"}.get(severity, "⚪")


def _level_text(severity: str) -> str:
    return {"error": "必须补", "warning": "请确认", "info": "小修正"}.get(severity, "提示")


PAGE_HEAD = """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>采样包素材版本复核</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
         max-width: 1080px; margin: 0 auto; padding: 24px; background: #fafafa; color: #222; }
  h1 { font-size: 22px; margin: 0 0 8px; }
  h2 { font-size: 18px; margin: 32px 0 12px; border-left: 4px solid #ffb020; padding-left: 10px; }
  h3 { font-size: 15px; margin: 20px 0 8px; }
  a { color: #1a73e8; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .sub { color: #666; font-size: 13px; margin-bottom: 20px; }
  .card { background: #fff; border-radius: 8px; padding: 16px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 14px; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; }
  .badge-ok { background: #e6f4ea; color: #137333; }
  .badge-err { background: #fce8e6; color: #c5221f; }
  .badge-warn { background: #fef7e0; color: #b06000; }
  .badge-pending { background: #e8f0fe; color: #1967d2; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 14px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
  th { background: #f5f5f5; font-weight: 600; }
  .row { display: flex; gap: 16px; flex-wrap: wrap; }
  .col { flex: 1; min-width: 280px; }
  label { display: block; font-size: 13px; margin: 8px 0 4px; color: #333; }
  input, textarea, select { width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; font-family: inherit; }
  textarea { min-height: 90px; }
  button { background: #1a73e8; color: #fff; border: none; padding: 9px 18px; border-radius: 6px;
           font-size: 14px; cursor: pointer; margin-top: 12px; }
  button:hover { background: #1765cc; }
  button.secondary { background: #f1f3f4; color: #333; }
  button.secondary:hover { background: #e5e7ea; }
  .issue { padding: 10px 14px; margin: 6px 0; border-radius: 6px; background: #fff; border-left: 4px solid #ccc; }
  .issue-error { border-left-color: #c5221f; background: #fef7f7; }
  .issue-warn { border-left-color: #f9ab00; background: #fffaf0; }
  .issue-info { border-left-color: #34a853; background: #f6fbf7; }
  .issue-title { font-weight: 600; margin-bottom: 4px; font-size: 14px; }
  .issue-body { font-size: 13px; color: #444; line-height: 1.6; }
  .hint { background: #fffbe6; border: 1px solid #ffe58f; padding: 8px 12px; border-radius: 6px; font-size: 13px; color: #614700; margin: 10px 0; }
  pre { background: #272822; color: #f8f8f2; padding: 14px; border-radius: 6px;
        overflow-x: auto; font-size: 13px; line-height: 1.5; }
  .nav { margin-bottom: 18px; }
  .nav a { margin-right: 14px; color: #555; font-size: 14px; }
  .nav a.active { color: #1a73e8; font-weight: 600; }
  .meta { color: #777; font-size: 12px; }
  .remark { background: #f0f7ff; border-left: 4px solid #1a73e8; padding: 10px 14px; border-radius: 4px; margin: 8px 0; }
  .remark-meta { font-size: 12px; color: #555; margin-bottom: 4px; }
  .remark-delta { font-size: 12px; color: #174ea6; margin-top: 6px; padding-left: 12px; }
  .track-row-ok { background: #f6fbf7; }
  .track-row-bad { background: #fef7f7; }
  .track-row-warn { background: #fffaf0; }
</style>
</head>
<body>
"""

PAGE_TAIL = "\n</body>\n</html>\n"


def render_home() -> str:
    pkgs = STORE.list_packages()
    body = ["<div class='nav'><a class='active' href='/'>🏠 首页</a><a href='/submit'>➕ 提交新包</a></div>"]
    body.append("<h1>🎵 采样包素材版本复核</h1>")
    body.append("<div class='sub'>合同扫描件、文件名、曲目表三方对账 · 自动去重 · 备注留痕 · 人话报告</div>")

    if not pkgs:
        body.append("<div class='hint'>还没有任何复核记录。先去 <a href='/submit'>提交一个采样包</a> 试试吧。</div>")
    else:
        body.append(f"<h2>全部采样包（{len(pkgs)}）</h2>")
        body.append("<div class='card'><table><thead><tr><th>采样包</th><th>状态</th><th>提交次数</th><th>问题数</th><th>更新时间</th><th>操作</th></tr></thead><tbody>")
        for p in pkgs:
            r = STORE.get_record(p)
            body.append(f"<tr><td><a href='/pkg/{urllib.parse.quote(p)}'>{html.escape(p)}</a></td>"
                        f"<td>{_status_badge(r.status)}</td>"
                        f"<td>{r.submission_count}</td>"
                        f"<td>{len(r.issues)}</td>"
                        f"<td class='meta'>{html.escape(r.updated_at)}</td>"
                        f"<td><a href='/pkg/{urllib.parse.quote(p)}'>查看</a> · <a href='/report/{urllib.parse.quote(p)}'>Markdown</a></td></tr>")
        body.append("</tbody></table></div>")

    body.append("<h2>快速上手</h2>")
    body.append("""<div class='card'><pre># 1. 跑一遍自带自动化测试
python3 test_scenarios.py

# 2. 命令行提交
python3 main.py submit "古典民乐精选-Vol1" --tracklist sample_tracklist.json --report

# 3. 补备注（第二天复盘用）
python3 main.py remark "古典民乐精选-Vol1" "已与王总确认第4首合同另附" --resolve-issues 4 --report

# 4. 浏览器打开当前页面，点右上角"提交新包"也能走全流程
</pre></div>""")
    return PAGE_HEAD + "\n".join(body) + PAGE_TAIL


def render_submit_form(msg: str = "") -> str:
    body = ["<div class='nav'><a href='/'>🏠 首页</a><a class='active' href='/submit'>➕ 提交新包</a></div>"]
    body.append("<h1>➕ 提交或追加采样包材料</h1>")
    body.append("<div class='sub'>同名采样包多次提交会自动去重：内容相同的合同/音频不会重复计数。</div>")
    if msg:
        body.append(f"<div class='hint'>{html.escape(msg)}</div>")

    body.append("""<form method='post' action='/submit'>
<div class='row'>
  <div class='col'>
    <label>采样包名称（必填，同名视为同一个包）</label>
    <input name='package' required placeholder='例如：古典民乐精选-Vol1'>
    <label>参考曲目表 JSON（必填，格式见 sample_tracklist.json）</label>
    <textarea name='tracklist_json' required placeholder='{"tracks":[{"track_no":1,"title":"曲名","aliases":[]}]}'></textarea>
    <label>合同扫描件路径（可选，多个用换行分隔，会自动按内容 hash 去重）</label>
    <textarea name='contract_paths' placeholder='每行一个文件绝对路径&#10;/path/to/contract_A.pdf&#10;/path/to/contract_B.pdf'></textarea>
    <label>音频文件路径（可选，多个用换行分隔，会自动按内容 hash 去重）</label>
    <textarea name='audio_paths' placeholder='每行一个文件绝对路径&#10;/path/to/01_xxx.wav&#10;/path/to/02_xxx.wav'></textarea>
  </div>
  <div class='col'>
    <label>或者直接贴一段示例 JSON（点一下就自动填到左边曲目表）</label>
    <textarea id='sample_area' readonly>
{
  "tracks": [
    {"track_no": 1, "title": "春江花月夜", "aliases": ["夕阳箫鼓"]},
    {"track_no": 2, "title": "十面埋伏", "aliases": ["霸王卸甲"]},
    {"track_no": 3, "title": "高山流水", "aliases": []}
  ]
}
    </textarea>
    <button type='button' class='secondary' onclick='document.querySelector("textarea[name=tracklist_json]").value=document.getElementById("sample_area").value.trim();document.querySelector("input[name=package]").value="古典民乐精选-Vol1-示例";'>📋 填入示例曲目表</button>
  </div>
</div>
<button type='submit'>🔍 提交并复核</button>
</form>""")
    return PAGE_HEAD + "\n".join(body) + PAGE_TAIL


def render_package(pkg_name: str) -> str:
    rec = STORE.get_record(pkg_name)
    if rec is None:
        return render_home() + f"<div class='hint'>没有找到采样包「{html.escape(pkg_name)}」，<a href='/submit'>去提交一个</a>。</div>"

    body = [f"<div class='nav'><a href='/'>🏠 首页</a><a href='/submit'>➕ 提交新包</a>"
            f"<a class='active' href='/pkg/{urllib.parse.quote(pkg_name)}'>📋 详情</a></div>"]
    body.append(f"<h1>📋 {html.escape(pkg_name)}</h1>")
    body.append(f"<div class='sub'>记录编号 <code>{html.escape(rec.record_id)}</code> · "
                f"创建 {html.escape(rec.created_at)} · 更新 {html.escape(rec.updated_at)} · "
                f"累计提交 {rec.submission_count} 次</div>")
    body.append(f"<div class='card'>总体状态：{_status_badge(rec.status)}</div>")

    body.append("<h2>🎯 一句话结论</h2>")
    if rec.status == ReviewStatus.PASSED:
        body.append("<div class='card'>🎉 <b>本包材料齐全，可以直接交接给演出/发行同事。</b></div>")
    elif rec.status == ReviewStatus.NEEDS_SUPPLEMENT:
        must = len([i for i in rec.issues if i.severity == "error"])
        body.append(f"<div class='card'>⚠️ <b>还有 {must} 项必须补的材料</b>，补完才能交接。请先处理下方【必须补】清单。</div>")
    elif rec.status == ReviewStatus.AMBIGUOUS:
        warn = len([i for i in rec.issues if i.severity == "warning"])
        body.append(f"<div class='card'>❓ 没有硬伤，但有 {warn} 项存疑的地方需要人工确认。确认清楚后可以放行。</div>")

    body.append("<h2>🎼 曲目逐条过审清单</h2>")
    track_errs = {}
    track_warns = {}
    for iss in rec.issues:
        no = iss.related_track_no
        if no is None:
            continue
        if iss.severity == "error":
            track_errs.setdefault(no, []).append(iss)
        elif iss.severity == "warning":
            track_warns.setdefault(no, []).append(iss)
    body.append("<div class='card'><table><thead><tr><th>#</th><th>曲名</th><th>别名</th><th>结论</th><th>问题摘要</th></tr></thead><tbody>")
    for t in rec.reference_tracklist:
        errs = track_errs.get(t.track_no, [])
        warns = track_warns.get(t.track_no, [])
        row_cls = "track-row-ok"
        tag = "✅ 可放行"
        if errs:
            row_cls = "track-row-bad"
            tag = "🔴 不能放行"
        elif warns:
            row_cls = "track-row-warn"
            tag = "🟡 有疑点需确认"
        ali = "、".join(t.aliases) if t.aliases else "—"
        probs = [f"[{_level_text(i.severity)}] {html.escape(i.human_reason)}" for i in errs + warns]
        prob_str = "；".join(probs) if probs else "无异常"
        body.append(f"<tr class='{row_cls}'><td>{t.track_no}</td><td>{html.escape(t.title)}</td>"
                    f"<td class='meta'>{html.escape(ali)}</td><td>{tag}</td><td>{prob_str}</td></tr>")
    body.append("</tbody></table></div>")

    body.append("<h2>🔧 需要处理的问题（按优先级）</h2>")
    if not rec.issues:
        body.append("<div class='card'>👍 没有需要处理的问题，所有材料一致。</div>")
    else:
        sorted_issues = sorted(rec.issues, key=lambda i: ({"error": 0, "warning": 1, "info": 2}.get(i.severity, 9), i.related_track_no or 9999))
        for iss in sorted_issues:
            track_hint = f"（第 {iss.related_track_no} 首）" if iss.related_track_no is not None else ""
            body.append(f"<div class='issue issue-{iss.severity}'>"
                        f"<div class='issue-title'>{_severity_icon(iss.severity)} {_level_text(iss.severity)}{track_hint}：{html.escape(iss.issue_type.value)}</div>"
                        f"<div class='issue-body'><b>人话解释：</b>{html.escape(iss.human_reason)}<br>"
                        f"<b>技术细节：</b>{html.escape(iss.description)}<br>")
            if iss.resolution_hint:
                body.append(f"<b>怎么处理：</b>{html.escape(iss.resolution_hint)}")
            body.append("</div></div>")

    body.append("<h2>📝 备注与判断变更</h2>")
    if rec.remarks:
        for r in rec.remarks:
            body.append(f"<div class='remark'>"
                        f"<div class='remark-meta'>{html.escape(r.added_at)} · {html.escape(r.author)}</div>"
                        f"<div>{html.escape(r.content)}</div>")
            if r.judgment_deltas:
                body.append("<div class='remark-delta'><b>备注改变了哪些判断：</b><ul>")
                for d in r.judgment_deltas:
                    body.append(f"<li>{html.escape(d)}</li>")
                body.append("</ul></div>")
            body.append("</div>")
    else:
        body.append("<div class='card meta'>暂无备注。</div>")

    body.append("<h2>➕ 追加备注（可同时标记某些问题已确认）</h2>")
    body.append(f"<form method='post' action='/remark'>")
    body.append(f"<input type='hidden' name='package' value='{html.escape(pkg_name)}'>")
    body.append("<div class='row'><div class='col'>")
    body.append("<label>备注内容</label>")
    body.append("<textarea name='content' required placeholder='例如：已与王总确认第4首合同另附在HT-2024-02中，音频下周补发'></textarea>")
    body.append("<label>备注人（默认：老许）</label>")
    body.append("<input name='author' value='老许'>")
    body.append("</div><div class='col'>")
    body.append("<label>一并确认哪些问题（勾上的就不再算问题）</label>")
    if rec.issues:
        for idx, iss in enumerate(rec.issues):
            k = compute_content_hash(iss.issue_type.value + "|" + iss.description)
            track_hint = f"（第{iss.related_track_no}首）" if iss.related_track_no else ""
            body.append(f"<div style='padding:4px 0;'><input type='checkbox' name='resolve_key' value='{html.escape(k)}' id='rk{idx}'> "
                        f"<label for='rk{idx}' style='display:inline;'>{_severity_icon(iss.severity)} {html.escape(iss.issue_type.value)}{track_hint}：{html.escape(iss.human_reason[:60])}</label></div>")
    else:
        body.append("<div class='meta'>当前没有问题可以确认</div>")
    body.append("</div></div>")
    body.append("<button type='submit'>💾 保存备注</button> <a class='button secondary' href='/report/"+urllib.parse.quote(pkg_name)+"'>📄 生成 Markdown 报告</a>")
    body.append("</form>")

    body.append("<h2>📊 状态流转历史</h2>")
    if rec.status_history:
        body.append("<div class='card'><table><thead><tr><th>时间</th><th>原状态</th><th>新状态</th><th>触发原因</th></tr></thead><tbody>")
        for h in rec.status_history:
            old_s = html.escape(h.old_status.value) if h.old_status else "（无）"
            body.append(f"<tr><td class='meta'>{html.escape(h.changed_at)}</td><td>{old_s}</td>"
                        f"<td>{_status_badge(h.new_status)}</td><td>{html.escape(h.trigger)}</td></tr>")
        body.append("</tbody></table></div>")
    else:
        body.append("<div class='card meta'>暂无流转记录</div>")

    return PAGE_HEAD + "\n".join(body) + PAGE_TAIL


def render_markdown_report(pkg_name: str) -> tuple:
    rec = STORE.get_record(pkg_name)
    if rec is None:
        return (404, "text/plain; charset=utf-8", f"未找到采样包 {pkg_name}".encode("utf-8"))
    md = generate_markdown_report(rec)
    headers = {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": f"attachment; filename*=UTF-8''REVIEW_{urllib.parse.quote(pkg_name)}.md",
    }
    return (200, headers, md.encode("utf-8"))


def handle_submit_post(form) -> tuple:
    package = (form.getfirst("package") or "").strip()
    tracklist_json = (form.getfirst("tracklist_json") or "").strip()
    contract_paths = [p.strip() for p in (form.getfirst("contract_paths") or "").splitlines() if p.strip()]
    audio_paths = [p.strip() for p in (form.getfirst("audio_paths") or "").splitlines() if p.strip()]

    if not package or not tracklist_json:
        return ("redirect", "/submit?msg=采样包名称和曲目表必填")

    try:
        tl_data = json.loads(tracklist_json)
    except Exception as e:
        return ("redirect", f"/submit?msg=曲目表JSON解析失败：{html.escape(str(e))}")

    reference_tracklist = []
    for item in tl_data.get("tracks", []):
        reference_tracklist.append(TrackItem(
            track_no=int(item["track_no"]),
            title=item["title"],
            aliases=list(item.get("aliases", []) or []),
            duration=item.get("duration"),
            iswc=item.get("iswc"),
        ))

    contracts = []
    for cp in contract_paths:
        cid = os.path.splitext(os.path.basename(cp))[0]
        fhash = compute_file_hash(cp)
        ct_tracks = []
        meta_path = cp + ".tracks.json"
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    ctd = json.load(f)
                for item in ctd.get("tracks", []):
                    ct_tracks.append(TrackItem(
                        track_no=int(item["track_no"]),
                        title=item["title"],
                        aliases=list(item.get("aliases", []) or []),
                    ))
            except Exception:
                pass
        contracts.append(ContractScan(
            contract_id=cid, file_path=cp, file_hash=fhash,
            submitted_at=now_iso(), tracks=ct_tracks, raw_text="",
        ))

    audios = []
    for ap in audio_paths:
        fhash = compute_file_hash(ap)
        p_no, p_title = parse_filename(os.path.basename(ap))
        audios.append(AudioFile(
            file_path=ap, file_name=os.path.basename(ap), file_hash=fhash,
            submitted_at=now_iso(), parsed_track_no=p_no, parsed_title=p_title,
        ))

    rec, stats = STORE.create_or_update(
        package_name=package,
        reference_tracklist=reference_tracklist,
        contract_scans=contracts,
        audio_files=audios,
    )
    return ("redirect", f"/pkg/{urllib.parse.quote(package)}")


def handle_remark_post(form) -> tuple:
    package = (form.getfirst("package") or "").strip()
    content = (form.getfirst("content") or "").strip()
    author = (form.getfirst("author") or "老许").strip()
    resolve_keys = form.getlist("resolve_key") or []

    if not package or not content:
        return ("redirect", "/")

    STORE.add_remark(
        package_name=package,
        author=author,
        content=content,
        override_issue_keys=resolve_keys if resolve_keys else None,
    )
    return ("redirect", f"/pkg/{urllib.parse.quote(package)}")


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[web] {self.address_string()} - {format % args}")

    def _send(self, code: int, content_type: str, body: bytes, extra_headers: dict = None):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        qs = urllib.parse.parse_qs(parsed.query)

        if path == "/" or path == "/index.html":
            body = render_home().encode("utf-8")
            self._send(200, "text/html; charset=utf-8", body)
            return
        if path == "/submit":
            msg = (qs.get("msg", [""])[0]) if qs else ""
            body = render_submit_form(msg).encode("utf-8")
            self._send(200, "text/html; charset=utf-8", body)
            return
        if path.startswith("/pkg/"):
            pkg = urllib.parse.unquote(path[len("/pkg/"):])
            body = render_package(pkg).encode("utf-8")
            self._send(200, "text/html; charset=utf-8", body)
            return
        if path.startswith("/report/"):
            pkg = urllib.parse.unquote(path[len("/report/"):])
            code, ct_or_headers, content = render_markdown_report(pkg)
            if isinstance(ct_or_headers, dict):
                self._send(code, ct_or_headers.get("Content-Type", "text/plain"), content,
                           {k: v for k, v in ct_or_headers.items() if k.lower() != "content-type"})
            else:
                self._send(code, ct_or_headers, content)
            return
        body = "Not Found".encode("utf-8")
        self._send(404, "text/plain; charset=utf-8", body)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={"REQUEST_METHOD": "POST", "CONTENT_TYPE": self.headers.get("Content-Type", "")},
            keep_blank_values=True,
        )

        if path == "/submit":
            action, target = handle_submit_post(form)
        elif path == "/remark":
            action, target = handle_remark_post(form)
        else:
            action, target = "redirect", "/"

        self.send_response(302)
        self.send_header("Location", target)
        self.send_header("Content-Length", "0")
        self.end_headers()


def main():
    port = int(os.environ.get("PORT", DEFAULT_PORT))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print("=" * 60)
    print(f"🎵 采样包素材版本复核 Web UI 已启动")
    print(f"   浏览器打开：http://127.0.0.1:{port}/")
    print(f"   Ctrl+C 退出")
    print("=" * 60)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[web] 已停止")
        server.server_close()


if __name__ == "__main__":
    main()
