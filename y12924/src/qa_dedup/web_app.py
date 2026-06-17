"""本地 Web 预览服务 - 用 Python 内置 HTTP 服务器实现，无需额外依赖."""

import http.server
import urllib.parse
import json
import os
import cgi
import io
from typing import Optional, List, Dict, Any

from .workflow import WorkflowManager
from .report_exporter import ReportExporter
from .demo_data import generate_demo_samples, generate_incremental_samples
from .models import QASample, SplitType


HTML_HEADER = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>问答样本去模板化 - 本地预览</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
       background: #f5f7fa; color: #303133; line-height: 1.6; }
.container { max-width: 960px; margin: 0 auto; padding: 24px 16px; }
.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
         color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; }
.header h1 { font-size: 24px; font-weight: 600; margin-bottom: 6px; }
.header p { opacity: 0.9; font-size: 14px; }
.card { background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px;
         box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.card h2 { font-size: 18px; margin-bottom: 16px; color: #303133; border-left: 4px solid #667eea; padding-left: 12px; }
.card h3 { font-size: 16px; margin: 16px 0 12px; color: #606266; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 16px; }
.stat-item { background: #f8f9fc; border-radius: 8px; padding: 16px; text-align: center; }
.stat-num { font-size: 28px; font-weight: 700; color: #667eea; }
.stat-label { font-size: 13px; color: #909399; margin-top: 4px; }
.stat-item.warn .stat-num { color: #e6a23c; }
.stat-item.danger .stat-num { color: #f56c6c; }
.stat-item.success .stat-num { color: #67c23a; }
.btn { display: inline-block; padding: 10px 20px; background: #667eea; color: white;
       border: none; border-radius: 8px; cursor: pointer; font-size: 14px; text-decoration: none; }
.btn:hover { background: #5a67d8; }
.btn.secondary { background: #909399; }
.btn.secondary:hover { background: #73767a; }
.btn.success { background: #67c23a; }
.btn.success:hover { background: #529b2e; }
.btn + .btn { margin-left: 8px; }
.actions { margin: 16px 0; }
.leak-item { border-left: 3px solid #f56c6c; background: #fef0f0; padding: 12px 16px;
            border-radius: 0 8px 8px 0; margin-bottom: 12px; }
.leak-item h4 { color: #f56c6c; margin-bottom: 8px; font-size: 15px; }
.leak-meta { font-size: 13px; color: #909399; margin-bottom: 8px; }
.leak-explain { background: white; border-radius: 6px; padding: 12px;
               font-size: 13px; color: #606266; white-space: pre-wrap;
               border: 1px dashed #f56c6c; }
.dedup-item { border-left: 3px solid #e6a23c; background: #fdf6ec; padding: 12px 16px;
              border-radius: 0 8px 8px 0; margin-bottom: 12px; }
.dedup-item h4 { color: #e6a23c; margin-bottom: 8px; font-size: 15px; }
.nav { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.nav a { padding: 8px 16px; background: white; border-radius: 8px;
        text-decoration: none; color: #606266; font-size: 14px;
        border: 1px solid #dcdfe6; }
.nav a.active { background: #667eea; color: white; border-color: #667eea; }
form { margin: 16px 0; }
form label { display: block; margin-bottom: 8px; font-size: 14px; color: #606266; }
form input[type="file"] { display: block; margin-bottom: 12px; }
form textarea { width: 100%; min-height: 120px; padding: 10px;
                border: 1px solid #dcdfe6; border-radius: 8px; font-family: monospace; font-size: 13px; }
select { padding: 8px 12px; border: 1px solid #dcdfe6; border-radius: 6px; font-size: 14px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #ebeef5; }
th { background: #f5f7fa; font-weight: 600; color: #606266; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
.badge.danger { background: #fef0f0; color: #f56c6c; }
.badge.warning { background: #fdf6ec; color: #e6a23c; }
.badge.success { background: #f0f9eb; color: #67c23a; }
.badge.info { background: #ecf5ff; color: #409eff; }
</style>
</head>
<body>
<div class="container">
"""

HTML_FOOTER = """
</div>
</body>
</html>
"""


def render_header(title="问答样本去模板化", subtitle="AI/ML 工作流工具 - 本地预览") -> str:
    return HTML_HEADER.replace("问答样本去模板化 - 本地预览", title + " - 本地预览")


def render_nav(active: str = "dashboard") -> str:
    items = [
        ("dashboard", "仪表盘", "/"),
        ("report", "训练组报告", "/report"),
        ("leaks", "泄漏详情", "/leaks"),
        ("upload", "上传/补录", "/upload"),
        ("demo", "加载示例", "/demo"),
    ]
    nav = '<div class="nav">'
    for key, label, url in items:
        cls = ' class="active"' if key == active else ''
        nav += f'<a href="{url}"{cls}>{label}</a>'
    nav += '</div>'
    return nav


def render_dashboard(wf: Optional[WorkflowManager], report=None) -> str:
    html = render_header("仪表盘")
    html += render_nav("dashboard")
    if wf is None:
        html += """
        <div class="card">
        <h2>欢迎使用</h2>
        <p>问答样本去模板化工具已就绪。点击下方按钮加载示例数据开始体验。</p>
        <div class="actions">
        <a class="btn" href="/demo">加载示例数据并运行</a>
        <a class="btn secondary" href="/upload">上传自己的样本</a>
        </div>
        </div>
        """
    else:
        total = len(wf.samples)
        if report:
            usable = report.total_usable if not report.is_incremental else report.cumulative_usable
            blocked = report.total_blocked if not report.is_incremental else report.cumulative_blocked
            leak_count = len(report.leak_records)
            dedup_count = len(report.dedup_records)
            template_count = report.template_removed_count
        else:
            usable = total
            blocked = 0
            leak_count = 0
            dedup_count = 0
            template_count = 0
        html += f"""
        <div class="header">
        <h1>问答样本去模板化</h1>
        <p>版本 {wf.version_tag} · 共 {total} 条样本</p>
        </div>
        <div class="card">
        <h2>数据总览</h2>
        <div class="stats">
        <div class="stat-item"><div class="stat-num">{total}</div><div class="stat-label">样本总数</div></div>
        <div class="stat-item success"><div class="stat-num">{usable}</div><div class="stat-label">可用样本</div></div>
        <div class="stat-item danger"><div class="stat-num">{blocked}</div><div class="stat-label">拦截样本</div></div>
        <div class="stat-item warn"><div class="stat-num">{leak_count}</div><div class="stat-label">训练验证泄漏</div></div>
        <div class="stat-item warn"><div class="stat-num">{dedup_count}</div><div class="stat-label">重复样本</div></div>
        <div class="stat-item"><div class="stat-num">{template_count}</div><div class="stat-label">模板化清理</div></div>
        </div>
        <div class="actions">
        <a class="btn" href="/report">查看训练组报告</a>
        <a class="btn success" href="/leaks">泄漏详情</a>
        <a class="btn secondary" href="/upload">增量补录</a>
        </div>
        </div>
        """
        if report and report.group_metrics:
            html += '<div class="card"><h2>分组明细</h2><table>'
            html += "<tr><th>分组</th><th>总数</th><th>可用</th><th>拦截</th><th>泄漏</th><th>重复</th><th>模板化</th></tr>"
            for gm in report.group_metrics:
                html += f"<tr><td>{gm.group_name}</td><td>{gm.total_samples}</td>"
                html += f'<td><span class="badge success">{gm.usable_samples}</span></td>'
                html += f'<td><span class="badge danger">{gm.blocked_samples}</span></td>'
                html += f"<td>{gm.leak_count}</td><td>{gm.duplicate_count}</td><td>{gm.template_count}</td></tr>"
            html += "</table></div>"
    html += HTML_FOOTER
    return html


def render_report_page(report) -> str:
    html = render_header("训练组专用报告")
    html += render_nav("report")
    exporter = ReportExporter(report)
    text = exporter.export_text_report()
    html += f"""
    <div class="card">
    <h2>训练组专用报告</h2>
    <p style="margin-bottom: 12px;">
    <span class="badge {'info' if not report.is_incremental else 'warning'}">
    {'增量补录报告' if report.is_incremental else '全量报告'}
    </span>
    版本 {report.version_tag} · 生成于 {report.generated_at}
    </p>
    <div style="background: #f5f7fa; padding: 16px; border-radius: 8px;
         font-family: monospace; font-size: 13px; white-space: pre-wrap;
         border: 1px solid #ebeef5;">
    {_escape_html(text)}
    </div>
    <div class="actions">
    <a class="btn" href="/report_txt">下载 TXT 版</a>
    <a class="btn secondary" href="/report_json">下载 JSON 版</a>
    {_render_csv_btns(report)}
    </div>
    </div>
    """
    html += HTML_FOOTER
    return html


def _render_csv_btns(report) -> str:
    if report is None:
        return ""
    if report.is_incremental:
        return f"""
    <div style="margin-top: 12px;">
      <p style="font-size: 13px; color: #909399; margin-bottom: 8px;">
      【本次新增补录】针对刚补录的 2 条 &nbsp;|&nbsp;
      【累计情况】合并基线后全量 {report.cumulative_total} 条
      </p>
      <a class="btn success" href="/csv_blocked_inc">CSV: 新增拦截样本 ({len(report.newly_blocked_ids)}条)</a>
      <a class="btn" href="/csv_usable_inc">CSV: 新增可用样本 ({len(report.newly_usable_ids)}条)</a>
      <div style="height: 8px;"></div>
      <a class="btn success secondary" href="/csv_blocked_cum">CSV: 累计拦截样本 ({len(report.blocked_sample_ids)}条)</a>
      <a class="btn secondary" href="/csv_usable_cum">CSV: 累计可用样本 ({len(report.usable_sample_ids)}条)</a>
    </div>
    """
    return f"""
    <div style="margin-top: 12px;">
      <a class="btn success" href="/csv_blocked">CSV: 拦截样本 ({len(report.blocked_sample_ids)}条)</a>
      <a class="btn secondary" href="/csv_usable">CSV: 可用样本 ({len(report.usable_sample_ids)}条)</a>
    </div>
    """


def render_leaks_page(report) -> str:
    html = render_header("训练验证泄漏详情")
    html += render_nav("leaks")
    if not report or not report.leak_records:
        html += """
        <div class="card">
        <h2>训练验证泄漏</h2>
        <p>未检测到训练验证泄漏 🎉</p>
        </div>
        """
    else:
        html += f"""
        <div class="card">
        <h2>训练验证泄漏详情</h2>
        <p>共 {len(report.leak_records)} 条泄漏记录，以下是具体情况：</p>
        """
        for i, lr in enumerate(report.leak_records, 1):
            sev_class = "danger" if lr.severity.value == "blocker" else "warning"
            html += f"""
            <div class="leak-item">
            <h4>#{i} · 相似度 {int(lr.similarity_score * 100)}%
            <span class="badge {sev_class}">{lr.severity.value}</span>
            </h4>
            <div class="leak-meta">
            训练集 ID：{lr.train_sample_id}<br>
            训练集问题：{_escape_html(lr.train_question_preview)}<br>
            验证集 ID：{lr.val_sample_id}<br>
            验证集问题：{_escape_html(lr.val_question_preview)}
            </div>
            <p style="font-size: 13px; color: #606266; margin-bottom: 8px;">
            <b>技术原因：</b>{_escape_html(lr.leak_reason)}
            </p>
            <details>
            <summary style="cursor: pointer; color: #667eea; font-size: 14px;">
            点击查看普通话解释（可直接复制给同事）
            </summary>
            <div class="leak-explain">
            {_escape_html(lr.plain_text_explanation)}
            </div>
            </details>
            """
            if lr.preserved_human_notes:
                html += """
                <details style="margin-top: 8px;">
                <summary style="cursor: pointer; color: #e6a23c; font-size: 13px;">
                相关人工备注（原话保留）
                </summary>
                <div style="margin-top: 8px; font-size: 13px; color: #909399;">
                """
                for j, note in enumerate(lr.preserved_human_notes, 1):
                    html += f'<p>备注 {j}：{_escape_html(note)}</p>'
                html += "</div></details>"
            html += "</div>"
        html += "</div>"
    html += HTML_FOOTER
    return html


def render_upload_page(msg: str = "") -> str:
    html = render_header("上传/补录样本")
    html += render_nav("upload")
    if msg:
        html += f'<div class="card"><p style="color:#67c23a;">{msg}</p></div>'
    html += f"""
    <div class="card">
    <h2>上传样本文件</h2>
    <p style="margin-bottom: 12px; font-size: 13px; color: #909399;">
    支持 JSON 格式，数组格式，每个元素包含 question、answer、split（可选，train/val/test）、group（可选）等字段。
    </p>
    <form method="POST" action="/upload" enctype="multipart/form-data">
    <label>选择 JSON 文件：</label>
    <input type="file" name="file" accept=".json,application/json">
    <label>处理模式：</label>
    <select name="mode">
    <option value="full">全量处理（替换当前数据）</option>
    <option value="incremental">增量补录（追加到当前数据）</option>
    </select>
    <br><br>
    <button type="submit" class="btn">上传并处理</button>
    </form>
    </div>

    <div class="card">
    <h2>快速测试</h2>
    <p>使用内置示例数据体验增量补录效果：</p>
    <div class="actions">
    <a class="btn success" href="/demo">加载示例数据并运行全量</a>
    <a class="btn secondary" href="/add_incremental">追加示例增量数据</a>
    </div>
    </div>
    """
    html += HTML_FOOTER
    return html


def _escape_html(text: str) -> str:
    if not text:
        return ""
    return (text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace('"', "&quot;"))


_g_wf: Optional[WorkflowManager] = None
_g_latest_report = None
_g_output_dir: str = "./output"


class QADedupHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _send_html(self, content: str, status: int = 200):
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(content.encode("utf-8"))

    def _send_text(self, content: str, filename: str = "report.txt", content_type: Optional[str] = None):
        self.send_response(200)
        ct = content_type or "text/plain; charset=utf-8"
        self.send_header("Content-Type", ct)
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.end_headers()
        encoded = content.encode("utf-8")
        if "csv" in ct and "utf-8-sig" not in ct:
            encoded = "\ufeff".encode("utf-8") + encoded
        if "utf-8-sig" in ct:
            encoded = "\ufeff".encode("utf-8") + content.encode("utf-8")
        self.wfile.write(encoded)

    def _send_json(self, data: Any, filename: str = "report.json"):
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8"))

    def _redirect(self, path: str):
        self.send_response(302)
        self.send_header("Location", path)
        self.end_headers()

    def do_GET(self):
        global _g_wf, _g_latest_report
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/" or path == "":
            self._send_html(render_dashboard(_g_wf, _g_latest_report))

        elif path == "/report":
            if _g_latest_report:
                self._send_html(render_report_page(_g_latest_report))
            else:
                self._redirect("/")

        elif path == "/report_txt":
            if _g_latest_report:
                exporter = ReportExporter(_g_latest_report)
                self._send_text(exporter.export_text_report(),
                                f"qa_report_{_g_latest_report.version_tag}.txt")
            else:
                self._redirect("/")

        elif path == "/report_json":
            if _g_latest_report:
                exporter = ReportExporter(_g_latest_report)
                self._send_text(exporter.export_json(),
                               f"qa_report_{_g_latest_report.version_tag}.json",
                               content_type="application/json; charset=utf-8")
            else:
                self._redirect("/")

        elif path.startswith("/csv_"):
            if _g_latest_report:
                exporter = ReportExporter(_g_latest_report)
                mode = "incremental" if _g_latest_report.is_incremental else "full"
                csv_map = {}
                if _g_latest_report.is_incremental:
                    csv_map = {
                        "/csv_blocked_inc": ("blocked_incremental", ["sample_id", "block_reason", "severity"],
                                            exporter._build_blocked_rows("incremental")),
                        "/csv_blocked_cum": ("blocked_cumulative", ["sample_id", "block_reason", "severity"],
                                            exporter._build_blocked_rows("cumulative")),
                        "/csv_usable_inc": ("usable_incremental", ["sample_id"],
                                           exporter._build_usable_rows("incremental")),
                        "/csv_usable_cum": ("usable_cumulative", ["sample_id"],
                                           exporter._build_usable_rows("cumulative")),
                    }
                else:
                    csv_map = {
                        "/csv_blocked": ("blocked", ["sample_id", "block_reason", "severity"],
                                        exporter._build_blocked_rows("full")),
                        "/csv_usable": ("usable", ["sample_id"],
                                       exporter._build_usable_rows("full")),
                    }
                key = path
                if key in csv_map:
                    fname, header, rows = csv_map[key]
                    buf = io.StringIO()
                    import csv
                    writer = csv.writer(buf)
                    writer.writerow(header)
                    writer.writerows(rows)
                    filename = f"qa_{fname}_{_g_latest_report.version_tag}.csv"
                    self._send_text(buf.getvalue(), filename,
                                    content_type="text/csv; charset=utf-8-sig")
                    return
                self._send_html("<h1>404 Not Found</h1>", 404)
            else:
                self._redirect("/")

        elif path == "/leaks":
            self._send_html(render_leaks_page(_g_latest_report))

        elif path == "/upload":
            self._send_html(render_upload_page())

        elif path == "/demo":
            _g_wf = WorkflowManager(version_tag="v1")
            samples = generate_demo_samples()
            _g_wf.load_samples(samples)
            _g_latest_report = _g_wf.run_full_workflow()
            self._redirect("/")

        elif path == "/add_incremental":
            if _g_wf is None or not _g_wf.samples:
                _g_wf = WorkflowManager(version_tag="v1")
                samples = generate_demo_samples()
                _g_wf.load_samples(samples)
                _g_wf.run_full_workflow()
            inc_samples = generate_incremental_samples()
            _g_latest_report = _g_wf.run_incremental_workflow(inc_samples)
            self._redirect("/")

        else:
            self._send_html("<h1>404 Not Found</h1>", 404)

    def do_POST(self):
        global _g_wf, _g_latest_report
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/upload":
            ctype, pdict = cgi.parse_header(self.headers.get("Content-Type", ""))
            if ctype == "multipart/form-data":
                pdict["boundary"] = bytes(pdict["boundary"], "utf-8") if isinstance(pdict.get("boundary"), str) else pdict["boundary"]
                fs = cgi.FieldStorage(
                    fp=self.rfile,
                    headers=self.headers,
                    environ={"REQUEST_METHOD": "POST",
                              "CONTENT_TYPE": self.headers.get("Content-Type", "")},
                    keep_blank_values=True
                )
                if "file" in fs:
                    file_item = fs["file"]
                    file_data = file_item.file.read()
                    try:
                        data = json.loads(file_data.decode("utf-8"))
                        samples = [QASample.from_dict(d) for d in data]
                        mode = fs.getvalue("mode", "full")
                        if mode == "incremental" and _g_wf and _g_wf.samples:
                            _g_latest_report = _g_wf.run_incremental_workflow(samples)
                        else:
                            _g_wf = WorkflowManager(version_tag="v1")
                            _g_wf.load_samples(samples)
                            _g_latest_report = _g_wf.run_full_workflow()
                        self._send_html(render_dashboard(_g_wf, _g_latest_report))
                        return
                    except Exception as e:
                        self._send_html(render_upload_page(f"解析失败：{str(e)}"))
                        return
            self._redirect("/upload")
        else:
            self._send_html("<h1>404 Not Found</h1>", 404)


def start_server(port: int = 8765, output_dir: str = "./output"):
    global _g_output_dir
    _g_output_dir = output_dir
    server_address = ("", port)
    httpd = http.server.HTTPServer(server_address, QADedupHandler)
    print(f"=" * 50)
    print(f"问答样本去模板化 - 本地预览服务已启动")
    print(f"访问地址：http://localhost:{port}")
    print(f"=" * 50)
    print(f"提示：")
    print(f"  1. 打开浏览器访问上面的地址")
    print(f"  2. 点击「加载示例数据并运行」快速体验")
    print(f"  3. 或点击「上传/补录」使用自己的数据")
    print(f"  4. 按 Ctrl+C 停止服务")
    print(f"=" * 50)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已停止")
        httpd.server_close()


if __name__ == "__main__":
    start_server()
