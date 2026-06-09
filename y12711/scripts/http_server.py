#!/usr/bin/env python3
"""
超轻量本地 HTTP 包装，提供 curl 调用示例。
仅供同事体验 curl 示例，不做生产使用。

用法：
    python3 scripts/http_server.py [--port 8765]

然后开另一个终端执行：
    bash scripts/demo_via_curl.sh
"""
import argparse
import json
import os
import sys
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from multi_param_interpreter.db import Database
from multi_param_interpreter.importer import DataImporter
from multi_param_interpreter.engine import ParamEngine
from multi_param_interpreter.reviewer import Reviewer, ReviewAction
from multi_param_interpreter.report import ReportGenerator
from multi_param_interpreter.models import DataSource


def get_db() -> Database:
    return Database(os.path.join(ROOT, "demo_http.db"))


def _json(handler, obj, status=200):
    body = json.dumps(obj, ensure_ascii=False, indent=2).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _read_json(handler):
    length = int(handler.headers.get("Content-Length", "0") or 0)
    if length == 0:
        return {}
    raw = handler.rfile.read(length)
    try:
        return json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
        return {}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):  # 静默日志
        return

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        qs = urllib.parse.parse_qs(parsed.query)

        try:
            if path == "/api/init":
                db = get_db()
                db.reset()
                return _json(self, {"ok": True, "db": db.db_path})

            if path == "/api/report":
                db = get_db()
                rep = ReportGenerator(db)
                q = qs.get("question", [None])[0]
                if q:
                    return _json(self, rep.generate_question_report(q))
                return _json(self, rep.generate_executive_summary())

            if path == "/api/edges":
                db = get_db()
                return _json(self, db.list_edge_cases())

            if path == "/api/trace":
                q = qs.get("question", [None])[0]
                if not q:
                    return _json(self, {"error": "missing question"}, 400)
                db = get_db()
                reviewer = Reviewer(db)
                return _json(self, reviewer.get_formula_trace(q))

            return _json(self, {"error": "not found"}, 404)
        except Exception as e:
            return _json(self, {"error": f"{type(e).__name__}: {e}"}, 500)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        data = _read_json(self)

        try:
            if path == "/api/import":
                db = get_db()
                importer = DataImporter(db)
                file_path = data.get("file")
                source = data.get("source")
                if not file_path or not source:
                    return _json(self, {"error": "need file + source"}, 400)
                if not os.path.isabs(file_path):
                    file_path = os.path.join(ROOT, file_path)
                result = importer.import_file(file_path, DataSource(source))
                return _json(self, result)

            if path == "/api/run":
                db = get_db()
                engine = ParamEngine(db)
                q = data.get("question")
                if q:
                    recs = engine.run_question(q)
                    return _json(self, {
                        "question": q,
                        "calculations": [
                            {
                                "id": r.id,
                                "parameter": r.parameter_name,
                                "raw": r.raw_value,
                                "adjusted": r.adjusted_value,
                                "judgment_before": r.judgment_before.value,
                                "judgment_after": r.judgment_after.value,
                                "is_edge_case": r.is_edge_case,
                                "edge_type": r.edge_type,
                            }
                            for r in recs
                        ],
                    })
                return _json(self, engine.run_all())

            if path == "/api/review":
                db = get_db()
                reviewer = Reviewer(db)
                cid = int(data["calculation_id"])
                action = ReviewAction(data["action"])
                note = data.get("note", "")
                adj = data.get("parameter_adjustment")
                sup = data.get("supplementary_data")
                by = data.get("reviewed_by", "curl-user")
                return _json(self, reviewer.review(cid, action, note, adj, sup, by))

            return _json(self, {"error": "not found"}, 404)
        except Exception as e:
            return _json(self, {"error": f"{type(e).__name__}: {e}"}, 500)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8765)
    args = ap.parse_args()
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"[OK] 本地 HTTP 服务已启动: http://127.0.0.1:{args.port}")
    print("     新开一个终端，执行: bash scripts/demo_via_curl.sh")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n[OK] 已停止")


if __name__ == "__main__":
    main()
