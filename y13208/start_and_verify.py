"""
启动服务并运行完整验证：
1. 线程启动 Uvicorn
2. 运行完整 API 测试
3. 停止服务
运行方式：python3 start_and_verify.py
"""

import os
import sys
import time
import threading
import json
import urllib.request
import tempfile
import uvicorn

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

    tmpdir = tempfile.mkdtemp(prefix="timecode_live_")
    db_path = os.path.join(tmpdir, "live_test.db")
    os.environ["TIMECODE_DB"] = db_path
    os.environ["TIMECODE_UPLOAD_DIR"] = os.path.join(tmpdir, "uploads")
    os.environ["TIMECODE_REPORT_DIR"] = os.path.join(tmpdir, "reports")
    os.environ["TIMECODE_STATIC_DIR"] = "static"

    for d in [os.environ["TIMECODE_UPLOAD_DIR"], os.environ["TIMECODE_REPORT_DIR"]]:
        os.makedirs(d, exist_ok=True)

    print("=" * 60)
    print("🎙️  录音棚时码异常提醒 · 启动服务 + 完整验证")
    print(f"临时目录: {tmpdir}")
    print("=" * 60)

    print("\n--- 启动 FastAPI 服务（线程内启动）---")
    from main import app

    config = uvicorn.Config(
        app, host="127.0.0.1", port=8765,
        log_level="warning"
    )
    server = uvicorn.Server(config)

    def run_server():
        try:
            server.run()
        except:
            pass

    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    server_ready = False
    for i in range(40):
        try:
            with urllib.request.urlopen("http://127.0.0.1:8765/api/health", timeout=1) as resp:
                if resp.status == 200:
                    server_ready = True
                    break
        except:
            time.sleep(0.25)
    check("服务启动成功", server_ready)

    if not server_ready:
        print("❌ 服务启动失败，停止验证")
        return 1

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

    print("\n--- 1. 健康检查 /health")
    status, data = api_request("/health")
    check("健康检查返回 200", status == 200)
    if status == 200:
        print(f"   DB: {data.get('counts',{}).get('tracks',0)} 曲目 / {data.get('counts',{}).get('files',0)} 文件 / {data.get('counts',{}).get('anomalies',0)} 异常")

    print("\n--- 2. 导入曲目表 POST /import/tracklist")
    track_data = {
        "rows": [
            {"track_no": 1, "track_title": "序曲·黎明", "expected_filename": "01_序曲_黎明.wav", "duration": "03:15.00", "notes": "初版通过"},
            {"track_no": 2, "track_title": "第一幕·重逢", "expected_filename": "02_第一幕_重逢.wav", "duration": "04:28.50"},
            {"track_no": 3, "track_title": "间奏·夜雨", "expected_filename": "03_间奏_夜雨.wav", "duration": "02:56.00", "notes": "时码偏半拍待确认", "version_screenshot_path": "screenshots/v1_track03.png"},
            {"track_no": 4, "track_title": "第二幕·山海", "expected_filename": "04_第二幕_山海.wav", "duration": "05:12.25", "notes": "结尾加钟声采样", "version_screenshot_path": "screenshots/v2_track04.png"},
            {"track_no": 5, "track_title": "终曲·归途", "expected_filename": "05_终曲_归途.wav", "duration": "04:45.00"}
        ],
        "source_ref": "曲目表_v1.xlsx 第A2-A6行",
        "operator": "演出统筹阿蓝",
        "note": "实时 API 测试"
    }
    status, data = api_request("/import/tracklist", "POST", track_data)
    check("导入 5 条曲目表成功", data.get("code") == 0)
    batch_trk = data.get("data", {}).get("batch_id") if data.get("code") == 0 else None
    if batch_trk:
        print(f"   批次 ID: {batch_trk}")

    print("\n--- 3. 导入录音文件 POST /import/files")
    file_data = {
        "rows": [
            {"filename": "01_序曲_黎明.wav", "timecode": "03:15.00", "duration": "03:15.00"},
            {"filename": "02_第一幕_重逄.wav", "timecode": "04:28.50", "duration": "04:28.50"},
            {"filename": "03_间奏_夜雨_rev2.wav", "timecode": "02:56.50", "duration": "02:56.50"},
            {"filename": "04_第二幕_山河_final.wav", "timecode": "05:12.25", "duration": "05:12.25"},
            {"filename": "05_终曲_归途.wav", "timecode": "04:45.00", "duration": "04:45.00"}
        ],
        "source_ref": "录音棚/stems/ 目录扫描 2026-06-20",
        "operator": "录音棚导出",
        "note": "实时 API 测试"
    }
    status, data = api_request("/import/files", "POST", file_data)
    check("导入 5 条录音文件成功", data.get("code") == 0)

    print("\n--- 4. 运行匹配与异常检测 POST /detect")
    detect_data = {"operator": "实时 API 测试"}
    status, data = api_request("/detect", "POST", detect_data)
    check("检测成功", data.get("code") == 0)
    anomaly_count = data.get("data", {}).get("anomalies_created", 0)
    check(f"检测到 {anomaly_count} 条异常（预期 3）", anomaly_count == 3)
    unmatched = data.get("data", {}).get("unmatched_files", [])
    print(f"   未匹配文件: {unmatched}")

    print("\n--- 5. 查询异常列表 GET /anomalies")
    status, data = api_request("/anomalies")
    anomalies = data.get("data", [])
    check(f"返回 {len(anomalies)} 条异常记录", status == 200 and len(anomalies) == 3)

    if anomalies:
        aid_offbeat = next((a for a in anomalies if a["anomaly_type"] == "时码偏半拍"), None)
        aid_typo = next((a for a in anomalies if "重逄" in a.get("matched_filename", "")), None)
        aid_shanhe = next((a for a in anomalies if a["id"] not in (aid_offbeat["id"] if aid_offbeat else 0, aid_typo["id"] if aid_typo else 0)), None)

        if aid_offbeat:
            aid = aid_offbeat["id"]
            print(f"\n--- 6. 时码偏半拍异常 #{aid} 后续操作")

            print(f"   6.1 追加后补备注 POST /anomalies/{aid}/remarks")
            remark_data = {
                "anomaly_id": aid,
                "content": "经阿蓝与录音棚核对：当时因节拍器切换延迟，确实有半拍偏差，但不影响现场演出节奏，可接受。",
                "source": "曲目表纸质版第3条边注（6月20日）",
                "operator": "演出统筹阿蓝",
                "attachment_path": "screenshots/paper_note_track03.jpg"
            }
            status, data = api_request(f"/anomalies/{aid}/remarks", "POST", remark_data)
            check(f"   后补备注追加成功", data.get("code") == 0)
            if data.get("code") == 0:
                print(f"      备注 ID: {data.get('data',{}).get('id')}")

            print(f"   6.2 授权豁免 POST /anomalies/{aid}/waive")
            waive_data = {
                "anomaly_id": aid,
                "license_remark": "【演出统筹阿蓝授权】曲目#3 间奏·夜雨的时码偏差0.5秒由录音棚确认系节拍器切换延迟所致，不影响现场演出节奏，现授权豁免此异常。文件「03_间奏_夜雨_rev2.wav」、曲目表第3条、最终清单第3项以此对齐。",
                "operator": "演出统筹阿蓝",
                "source_ref": "社区公示前最终授权"
            }
            status, data = api_request(f"/anomalies/{aid}/waive", "POST", waive_data)
            check(f"   授权豁免成功", data.get("code") == 0 and data.get("data",{}).get("to_status") == "已授权豁免")

        if aid_typo:
            aid2 = aid_typo["id"]
            print(f"\n--- 7. 文件名异体字异常 #{aid2} 改判解决")
            resolve_data = {
                "anomaly_id": aid2,
                "judgment_text": "确认是同一文件，文件名繁体异体字「逄/逢」不影响曲目对应",
                "source_ref": "录音棚导出命名规范（允许异体字）",
                "operator": "演出统筹阿蓝",
                "impact_scope": "仅影响文件命名，清单按曲目#2对齐"
            }
            status, data = api_request(f"/anomalies/{aid2}/resolve", "POST", resolve_data)
            check(f"   改判解决成功", data.get("code") == 0)

        if aid_shanhe:
            aid3 = aid_shanhe["id"]
            print(f"\n--- 8. 山河/山海笔误异常 #{aid3} 改判解决")
            resolve_data2 = {
                "anomaly_id": aid3,
                "judgment_text": "确认是同一曲目，录音棚笔误「山河/山海」不影响对应关系",
                "source_ref": "录音棚 v2 版本说明",
                "operator": "演出统筹阿蓝",
                "impact_scope": "仅影响文件映射，清单按曲目#4对齐"
            }
            status, data = api_request(f"/anomalies/{aid3}/resolve", "POST", resolve_data2)
            check(f"   改判解决成功", data.get("code") == 0)

    print("\n--- 9. 三维对齐状态 GET /alignment")
    status, data = api_request("/alignment")
    check("对齐状态查询成功", data.get("code") == 0)
    if data.get("code") == 0:
        align = data["data"]
        check(f"未匹配文件数 = {align.get('unmatched_file_count')}（预期 0）", align.get("unmatched_file_count") == 0)
        check("DB 状态与历史末态一致", align.get("consistency_check", {}).get("consistent") == True)
        print(f"   曲目={align.get('total_tracks')} 文件={align.get('total_files')} 异常={align.get('total_anomalies')}")
        print(f"   按状态分布: {align.get('anomalies_by_status')}")
        print(f"   备注留存: {align.get('consistency_check',{}).get('total_remarks_preserved')} 条")

    if anomalies:
        aid = anomalies[0]["id"]
        print(f"\n--- 10. 异常详情 GET /anomalies/{aid}")
        status, data = api_request(f"/anomalies/{aid}")
        check("异常详情查询成功", data.get("code") == 0)
        if data.get("code") == 0:
            d = data["data"]
            check(f"详情包含 {len(d['remarks'])} 条备注", len(d["remarks"]) >= 1)
            check(f"详情包含 {len(d['status_history'])} 次状态流转", len(d["status_history"]) >= 1)
            print(f"   异常 #{d['id']} 状态={d['status']} 备注={len(d['remarks'])} 流转={len(d['status_history'])} 改判={len(d['judgments'])}")

    print("\n--- 11. 生成报告 POST /report/generate")
    report_data = {
        "report_title": "实时 API 验证报告",
        "include_resolved": True,
        "operator_context": "实时 API 测试 · 阿蓝已补授权备注"
    }
    status, data = api_request("/report/generate", "POST", report_data)
    check("报告生成成功", data.get("code") == 0)
    download_url = ""
    if data.get("code") == 0:
        r = data["data"]
        check(f"报告字数 {r.get('word_count',0)} > 2000", r.get("word_count", 0) > 2000)
        download_url = r.get("download_url", "")
        check("报告下载 URL 存在", bool(download_url))
        if download_url:
            print(f"   下载链接: http://127.0.0.1:8765{download_url}")

            print("\n--- 12. 下载报告")
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:8765{download_url}", timeout=10) as resp:
                    content = resp.read().decode("utf-8")
                    check("报告下载成功", resp.status == 200 and len(content) > 1000)
                    required_keywords = ["录音棚时码异常提醒", "时码偏半拍", "授权备注", "后补备注", "变化摘要", "历史留存完整性验证", "节拍器切换延迟", "已授权豁免"]
                    missing = [k for k in required_keywords if k not in content]
                    check(f"报告包含 {len(required_keywords)-len(missing)}/{len(required_keywords)} 个关键字", len(missing) == 0, f"缺失: {missing}")
            except Exception as e:
                check("报告下载", False, str(e))

    print("\n--- 13. 报告列表 GET /reports")
    status, data = api_request("/reports")
    check("报告列表查询成功", data.get("code") == 0)

    print("\n--- 14. 导入批次列表 GET /batches")
    status, data = api_request("/batches")
    check("批次列表查询成功", data.get("code") == 0)

    print("\n--- 15. 状态快照 GET /state")
    status, data = api_request("/state")
    check("状态快照查询成功", data.get("code") == 0)
    if data.get("code") == 0:
        snap = data["data"]
        print(f"   备注留存: {snap.get('counts',{}).get('remarks',0)} 条")
        print(f"   状态流转留存: {snap.get('counts',{}).get('status_changes',0)} 条")
        print(f"   改判留存: {snap.get('counts',{}).get('judgments',0)} 条")

    print("\n--- 16. 前端静态页面")
    try:
        with urllib.request.urlopen("http://127.0.0.1:8765/static/index.html", timeout=5) as resp:
            content = resp.read().decode("utf-8")
            check("前端页面可访问", resp.status == 200)
            check("页面包含标题「录音棚时码异常提醒」", "录音棚时码异常提醒" in content)
            check("页面包含快捷操作按钮", "导入演示数据" in content)
            print(f"   页面大小: {len(content)} 字节")
    except Exception as e:
        check("前端页面", False, str(e))

    print("\n--- 17. Swagger API 文档")
    try:
        with urllib.request.urlopen("http://127.0.0.1:8765/docs", timeout=5) as resp:
            content = resp.read().decode("utf-8")
            check("Swagger UI 可访问", resp.status == 200)
    except Exception as e:
        check("Swagger UI", False, str(e))

    print("\n--- 18. 错误处理（404 测试）")
    status, data = api_request("/anomalies/99999999")
    check("不存在的异常返回 404", status == 404)

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
        print("📖 手动启动服务命令：")
        print("   uvicorn main:app --reload --port 8000")
        print()
        print("🌐 访问地址：")
        print("   前端页面:  http://localhost:8000/static/index.html")
        print("   API 文档:  http://localhost:8000/docs")
        print("   健康检查:  http://localhost:8000/api/health")
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
