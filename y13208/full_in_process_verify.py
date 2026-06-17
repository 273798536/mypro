"""
进程内验证脚本：不依赖命令行终端，直接在当前 Python 进程中完成：
1. 模块导入验证
2. 语法检查
3. 核心逻辑验证（自包含）
4. 启动 Uvicorn 服务（后台线程）
5. API 调用验证（HTTP）

运行方式：在 IDE 中直接运行此文件
"""

import os
import sys
import time
import threading
import json
import urllib.request
import tempfile
import shutil

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

results = []
all_pass = True


def check(name, cond, detail=""):
    global all_pass
    status = "✅ PASS" if cond else "❌ FAIL"
    results.append((status, name, detail))
    print(f"{status} {name}")
    if not cond:
        all_pass = False
        if detail:
            print(f"   {detail}")
    return cond


def main():
    global all_pass
    print("=" * 60)
    print("🎙️  录音棚时码异常提醒 · 进程内完整验证")
    print("=" * 60)
    print()

    tmpdir = tempfile.mkdtemp(prefix="timecode_full_")
    db_path = os.path.join(tmpdir, "full_test.db")
    os.environ["TIMECODE_DB"] = db_path
    os.environ["TIMECODE_UPLOAD_DIR"] = os.path.join(tmpdir, "uploads")
    os.environ["TIMECODE_REPORT_DIR"] = os.path.join(tmpdir, "reports")
    os.environ["TIMECODE_STATIC_DIR"] = "static"

    for d in [os.environ["TIMECODE_UPLOAD_DIR"], os.environ["TIMECODE_REPORT_DIR"]]:
        os.makedirs(d, exist_ok=True)

    # 1. 模块导入验证
    print("\n--- 1. 模块导入验证")
    try:
        from models import (
            AnomalyStatus, AnomalyType, MatchStatus,
            TracklistItem, RecordingFile, RemarkHistory,
            StatusChange, Judgment, TimecodeAnomaly, ImportBatch
        )
        check("models.py 导入成功", True)

        from storage import Storage
        check("storage.py 导入成功", True)

        from anomaly_engine import AnomalyEngine
        check("anomaly_engine.py 导入成功", True)

        from report import ReportGenerator
        check("report.py 导入成功", True)

        from schemas import (
            TracklistRow, RecordingFileRow,
            ImportTracklistRequest, ImportFilesRequest,
            DetectionRequest, DetectionResultResponse,
            RemarkAppendRequest, JudgmentRequest, LicenseWaiveRequest,
            StatusChangeResponse, AnomalyResponse, AlignmentStatusResponse
        )
        check("schemas.py 导入成功", True)

        from main import app
        check("main.py 导入成功", True)
        check(f"FastAPI 路由数量: {len(app.routes)}", len(app.routes) >= 20)
    except Exception as e:
        check("模块导入", False, str(e))

    # 2. 核心逻辑验证（直连 Python API）
    print("\n--- 2. 核心逻辑验证（自包含）")
    try:
        from self_verify import run_self_verify
        ret = run_self_verify()
        check("自包含验证 25 项全部通过", ret == 0)
    except Exception as e:
        check("自包含验证", False, str(e))
        import traceback
        traceback.print_exc()

    # 3. 启动 Uvicorn 服务
    print("\n--- 3. 启动 FastAPI 服务")
    server_started = False
    server_thread = None
    import uvicorn

    def run_server():
        config = uvicorn.Config(
            app, host="127.0.0.1", port=8765,
            log_level="error"
        )
        server = uvicorn.Server(config)
        try:
            server.run()
        except:
            pass

    try:
        server_thread = threading.Thread(target=run_server, daemon=True)
        server_thread.start()

        # 等待服务启动
        for i in range(40):
            try:
                with urllib.request.urlopen("http://127.0.0.1:8765/api/health", timeout=1) as resp:
                    if resp.status == 200:
                        server_started = True
                        break
            except:
                time.sleep(0.25)
        check("服务启动成功", server_started)
    except Exception as e:
        check("服务启动", False, str(e))

    if server_started:
        # 4. API 验证
        print("\n--- 4. API 端点验证")
        base = "http://127.0.0.1:8765/api"

        def api_request(path, method="GET", data=None):
            url = base + path
            headers = {"Content-Type": "application/json"}
            body = json.dumps(data).encode("utf-8") if data else None
            req = urllib.request.Request(url, data=body, method=method, headers=headers)
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    return resp.status, json.loads(resp.read().decode("utf-8"))
            except urllib.error.HTTPError as e:
                return e.code, json.loads(e.read().decode("utf-8"))
            except Exception as e:
                return 0, {"error": str(e)}

        # 4.1 健康检查
        status, data = api_request("/health")
        check("GET /api/health 返回 200", status == 200)

        # 4.2 导入曲目表
        track_data = {
            "rows": [
                {"track_no": 1, "track_title": "序曲·黎明", "expected_filename": "01_序曲_黎明.wav", "duration": "03:15.00"},
                {"track_no": 2, "track_title": "第一幕·重逢", "expected_filename": "02_第一幕_重逢.wav", "duration": "04:28.50"},
                {"track_no": 3, "track_title": "间奏·夜雨", "expected_filename": "03_间奏_夜雨.wav", "duration": "02:56.00", "notes": "时码偏半拍待确认"}
            ],
            "source_ref": "进程内验证_曲目表.xlsx",
            "operator": "验证脚本"
        }
        status, data = api_request("/import/tracklist", "POST", track_data)
        check("POST /api/import/tracklist 成功", data.get("code") == 0)
        batch_trk = data.get("data", {}).get("batch_id") if data.get("code") == 0 else None
        if batch_trk:
            print(f"   曲目表批次: {batch_trk}")

        # 4.3 导入录音文件
        file_data = {
            "rows": [
                {"filename": "01_序曲_黎明.wav", "timecode": "03:15.00", "duration": "03:15.00"},
                {"filename": "02_第一幕_重逄.wav", "timecode": "04:28.50", "duration": "04:28.50"},
                {"filename": "03_间奏_夜雨_rev2.wav", "timecode": "02:56.50", "duration": "02:56.50"}
            ],
            "source_ref": "进程内验证_录音棚导出",
            "operator": "验证脚本"
        }
        status, data = api_request("/import/files", "POST", file_data)
        check("POST /api/import/files 成功", data.get("code") == 0)

        # 4.4 运行检测
        detect_data = {"operator": "进程内验证"}
        status, data = api_request("/detect", "POST", detect_data)
        check("POST /api/detect 成功", data.get("code") == 0)
        anomaly_count = data.get("data", {}).get("anomalies_created", 0) if data.get("code") == 0 else 0
        check(f"检测到 {anomaly_count} 条异常（预期 3）", anomaly_count == 3)

        # 4.5 查询异常列表
        status, data = api_request("/anomalies")
        check(f"GET /api/anomalies 返回 {len(data.get('data',[]))} 条", status == 200 and len(data.get("data", [])) == 3)
        anomalies = data.get("data", [])

        if anomalies:
            aid = anomalies[0]["id"]
            check(f"取异常 #{aid} 继续测试", True)

            # 4.6 追加后补备注
            remark_data = {
                "anomaly_id": aid,
                "content": "经核对：节拍器切换延迟导致半拍偏差，不影响演出",
                "source": "曲目表纸质版边注",
                "operator": "演出统筹阿蓝"
            }
            status, data = api_request(f"/anomalies/{aid}/remarks", "POST", remark_data)
            check(f"POST /anomalies/{aid}/remarks 追加备注成功", data.get("code") == 0)

            # 4.7 授权豁免
            waive_data = {
                "anomaly_id": aid,
                "license_remark": "【演出统筹阿蓝授权】曲目#3 间奏·夜雨的时码偏差0.5秒由录音棚确认系节拍器切换延迟，不影响现场演出节奏，现授权豁免此异常。文件、曲目表、最终清单以此对齐。",
                "operator": "演出统筹阿蓝",
                "source_ref": "社区公示前最终授权"
            }
            status, data = api_request(f"/anomalies/{aid}/waive", "POST", waive_data)
            check(f"POST /anomalies/{aid}/waive 授权豁免成功", data.get("code") == 0)
            check("状态转为已授权豁免",
                  data.get("data", {}).get("to_status") == "已授权豁免")

            # 4.8 解决另一条异常
            if len(anomalies) >= 2:
                aid2 = anomalies[1]["id"]
                resolve_data = {
                    "anomaly_id": aid2,
                    "judgment_text": "确认是同一文件，文件名繁体异体字「逄/逢」不影响曲目对应",
                    "source_ref": "录音棚导出命名规范",
                    "operator": "演出统筹阿蓝",
                    "impact_scope": "仅影响文件命名，清单按曲目#2对齐"
                }
                status, data = api_request(f"/anomalies/{aid2}/resolve", "POST", resolve_data)
                check(f"POST /anomalies/{aid2}/resolve 改判解决成功", data.get("code") == 0)

            # 4.9 异常详情
            status, data = api_request(f"/anomalies/{aid}")
            check(f"GET /anomalies/{aid} 详情查询成功", data.get("code") == 0)
            if data.get("code") == 0:
                d = data["data"]
                check(f"详情包含 {len(d['remarks'])} 条备注（预期 3）", len(d["remarks"]) == 3)
                check(f"详情包含 {len(d['status_history'])} 次状态流转（预期 2）", len(d["status_history"]) == 2)
                check(f"详情包含 {len(d['judgments'])} 次改判（预期 1）", len(d["judgments"]) == 1)

        # 4.10 三维对齐状态
        status, data = api_request("/alignment")
        check("GET /api/alignment 对齐状态查询成功", data.get("code") == 0)
        if data.get("code") == 0:
            align = data["data"]
            check(f"未匹配文件数 = {align.get('unmatched_file_count')}（预期 0）",
                  align.get("unmatched_file_count") == 0)
            check("DB 状态与历史末态一致",
                  align.get("consistency_check", {}).get("consistent") == True)

        # 4.11 生成报告
        report_data = {
            "report_title": "进程内验证报告",
            "include_resolved": True,
            "operator_context": "进程内自动化验证"
        }
        status, data = api_request("/report/generate", "POST", report_data)
        check("POST /api/report/generate 报告生成成功", data.get("code") == 0)
        if data.get("code") == 0:
            r = data["data"]
            word_count = r.get("word_count", 0)
            check(f"报告字数 {word_count} > 2000", word_count > 2000)
            download_url = r.get("download_url")
            check("报告下载 URL 存在", bool(download_url))
            if download_url:
                # 4.12 下载报告
                try:
                    with urllib.request.urlopen(f"http://127.0.0.1:8765{download_url}", timeout=10) as resp:
                        content = resp.read().decode("utf-8")
                        check("报告下载成功", resp.status == 200 and len(content) > 1000)
                        required = ["录音棚时码异常提醒", "时码偏半拍", "授权备注", "变化摘要", "历史留存完整性验证"]
                        missing = [k for k in required if k not in content]
                        check(f"报告包含 {len(required)-len(missing)}/{len(required)} 个关键字",
                              len(missing) == 0, f"缺失: {missing}")
                except Exception as e:
                    check("报告下载", False, str(e))

        # 4.13 错误处理
        status, data = api_request("/anomalies/99999999")
        check("不存在的异常返回 404", status == 404)

        # 4.14 状态快照
        status, data = api_request("/state")
        check("GET /api/state 状态快照成功", data.get("code") == 0)

        # 4.15 导入批次列表
        status, data = api_request("/batches")
        check("GET /api/batches 批次列表成功", data.get("code") == 0)

        # 5. 前端页面验证
        print("\n--- 5. 前端静态页面验证")
        try:
            with urllib.request.urlopen("http://127.0.0.1:8765/static/index.html", timeout=5) as resp:
                content = resp.read().decode("utf-8")
                check("前端页面可访问", resp.status == 200)
                check("页面包含标题「录音棚时码异常提醒」",
                      "录音棚时码异常提醒" in content)
                check("页面包含快捷操作按钮", "导入演示数据" in content)
                check("页面包含异常列表容器", "anomalyList" in content)
        except Exception as e:
            check("前端页面", False, str(e))

        # 6. Swagger API 文档
        print("\n--- 6. Swagger API 文档")
        try:
            with urllib.request.urlopen("http://127.0.0.1:8765/docs", timeout=5) as resp:
                content = resp.read().decode("utf-8")
                check("Swagger UI 可访问", resp.status == 200)
                check("文档标题正确", "FastAPI" in content or "录音棚时码异常提醒" in content)
        except Exception as e:
            check("Swagger UI", False, str(e))

    else:
        check("API 验证", False, "服务未启动，跳过")

    # 总结
    print("\n" + "=" * 60)
    print("📊 验证结果统计")
    print("=" * 60)
    pass_count = sum(1 for r in results if r[0] == "✅ PASS")
    fail_count = sum(1 for r in results if r[0] == "❌ FAIL")
    print(f"✅ 通过: {pass_count} 项")
    print(f"❌ 失败: {fail_count} 项")
    print(f"📝 总计: {len(results)} 项")

    if fail_count > 0:
        print("\n❌ 失败项:")
        for r in results:
            if r[0] == "❌ FAIL":
                print(f"   - {r[1]}")
                if r[2]:
                    print(f"     {r[2]}")

    print("\n" + "=" * 60)
    if all_pass and pass_count == len(results):
        print("🎉 全部验证通过！")
        print()
        print("📖 启动服务：")
        print("   chmod +x start.sh && ./start.sh  (macOS/Linux)")
        print("   start.bat  (Windows)")
        print("   或直接运行: uvicorn main:app --reload --port 8000")
        print()
        print("🌐 访问地址：")
        print("   前端页面:  http://localhost:8000/static/index.html")
        print("   API 文档:  http://localhost:8000/docs")
        print("   健康检查:  http://localhost:8000/api/health")
        print()
        print("🧪 测试脚本：")
        print("   python3 self_verify.py    直连 Python API 验证")
        print("   python3 end_to_end_test.py 端到端场景测试")
        print("   python3 api_verify.py     HTTP API 验证（需先启动服务）")

        # 清理
        shutil.rmtree(tmpdir, ignore_errors=True)
        return 0
    else:
        print("\n❌ 部分验证失败")
        print(f"   临时文件目录: {tmpdir}（保留供检查）")
        return 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\n⏹️  被用户中断")
        sys.exit(130)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"\n❌ 未预期错误: {e}")
        sys.exit(2)
