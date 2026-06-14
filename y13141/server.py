#!/usr/bin/env python3
"""
本地Web服务，提供按钮触发整数规划边界校验。
启动命令: python3 server.py
然后浏览器打开: http://localhost:8000
"""

import http.server
import socketserver
import json
import subprocess
import sys
from pathlib import Path
from io import StringIO

SCRIPT_DIR = Path(__file__).parent
PORT = 8000


class CheckerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SCRIPT_DIR), **kwargs)

    def do_GET(self):
        if self.path == "/api/health":
            self.send_json({"status": "ok", "message": "服务正常"})
        elif self.path == "/api/check":
            self.handle_check()
        elif self.path == "/" or self.path == "/index.html":
            self.path = "/checker_ui.html"
            super().do_GET()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == "/api/check":
            self.handle_check()
        else:
            self.send_json({"error": "Not found"}, status=404)

    def handle_check(self):
        try:
            result = self.run_checker()
            self.send_json(result)
        except Exception as e:
            self.send_json({"status": "error", "message": str(e)}, status=500)

    def run_checker(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "checker", SCRIPT_DIR / "integer_program_checker.py"
        )
        checker = importlib.util.module_from_spec(spec)

        logs = StringIO()
        import io
        old_stdout = sys.stdout
        sys.stdout = logs

        try:
            spec.loader.exec_module(checker)
            params = checker.PARAMS
            samples = checker.read_samples(SCRIPT_DIR / "批量样本数据_整数规划校验.csv")
            unit_issue = checker.detect_unit_inconsistency(samples)
            duplicates = checker.detect_duplicate_samples(samples)
            results = [checker.validate_single_sample(s, params) for s in samples]
        finally:
            sys.stdout = old_stdout

        log_output = logs.getvalue()

        report_path = SCRIPT_DIR / "整数规划边界校验_分析报告.md"
        report_content = ""
        if report_path.exists():
            report_content = report_path.read_text(encoding="utf-8")

        batch_status = "挂起" if unit_issue[0] or duplicates else "通过"
        warnings = []
        if unit_issue[0]:
            warnings.append(f"单位不一致：吨样本{unit_issue[1]}，kg样本{unit_issue[2]}")
        if duplicates:
            warnings.append(f"重复样本：{duplicates}，按IP-007挂起")

        boundary_mismatch = []
        for r in results:
            if r["sensitivity_correct"]["boundary_triggered"] != r["sensitivity_buggy"]["boundary_triggered"]:
                boundary_mismatch.append(r["sample_id"])

        return {
            "status": "completed",
            "batch_status": batch_status,
            "warnings": warnings,
            "boundary_mismatch": boundary_mismatch,
            "log": log_output,
            "sample_count": len(results),
            "samples": [
                {
                    "id": r["sample_id"],
                    "x1": next((s["x1"] for s in samples if s["sample_id"] == r["sample_id"]), 12),
                    "x2": next((s["x2"] for s in samples if s["sample_id"] == r["sample_id"]), 8),
                    "constraint_a_ok": r["constraint_a_ok"],
                    "constraint_b_ok": r["constraint_b_ok"],
                    "objective_match": r["objective_match"],
                    "sensitivity_correct": r["sensitivity_correct"],
                    "sensitivity_buggy": r["sensitivity_buggy"],
                    "mat_b_unit": next((s["mat_b_unit"] for s in samples if s["sample_id"] == r["sample_id"]), "kg"),
                }
                for r in results[:3]
            ],
            "report": report_content[:3000] + ("..." if len(report_content) > 3000 else ""),
        }

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def log_message(self, format, *args):
        print(f"[HTTP] {format % args}")


def main():
    with socketserver.TCPServer(("", PORT), CheckerHandler) as httpd:
        print("=" * 60)
        print("整数规划边界校验 Web 服务已启动")
        print(f"请在浏览器打开: http://localhost:{PORT}")
        print("=" * 60)
        print("按钮功能:")
        print("  [一键重跑校验] → 执行完整校验流程，返回结果")
        print("  [查看Markdown报告] → 显示同页分析报告")
        print("=" * 60)
        print("按 Ctrl+C 停止服务")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n服务已停止")


if __name__ == "__main__":
    main()
