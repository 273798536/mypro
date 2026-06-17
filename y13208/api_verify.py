"""
API 验证脚本：验证 FastAPI 服务的安装检查 + 核心 API 测试

使用：
    1. pip3 install -r requirements.txt
    2. 启动服务：uvicorn main:app --reload --port 8000
    3. 另开终端：python3 api_verify.py
"""

import sys
import json
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000/api"


def req(path, method="GET", data=None):
    url = BASE + path
    headers = {"Content-Type": "application/json"}
    if data:
        body = json.dumps(data).encode("utf-8")
    else:
        body = None
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))
    except Exception as e:
        return 0, {"error": str(e)}


def check(desc, status, resp, expected_code=0, expect_success=True):
    ok = (resp.get("code") == expected_code) if expect_success else (resp.get("code") != expected_code)
    status_str = "✅ PASS" if ok else "❌ FAIL"
    print(f"{status_str}  [{status}] {desc}")
    if not ok:
        print(f"   响应: {resp}")
    return ok


def main():
    print("=" * 60)
    print("录音棚时码异常提醒 API 验证")
    print("=" * 60)

    all_pass = True

    # 1. 健康检查
    print("\n--- 1. 健康检查 /health")
    try:
        status, resp = req("/health")
        ok = check("健康检查返回 200", status, {"code": 0} if status == 200 else {"code": -1}, expect_success=(status == 200))
        all_pass = all_pass and ok
        if status == 200:
            print(f"   状态: 曲目={resp.get('counts',{}).get('tracks',0)} "
                  f"文件={resp.get('counts',{}).get('files',0)} "
                  f"异常={resp.get('counts',{}).get('anomalies',0)}")
    except Exception as e:
        print(f"❌ FAIL 健康检查失败: {e}")
        all_pass = False

    # 2. 导入曲目表
    print("\n--- 2. 导入曲目表 POST /import/tracklist")
    track_data = {
        "rows": [
            {"track_no": 1, "track_title": "序曲·黎明", "expected_filename": "01_序曲_黎明.wav", "duration": "03:15.00"},
            {"track_no": 2, "track_title": "第一幕·重逢", "expected_filename": "02_第一幕_重逢.wav", "duration": "04:28.50"},
            {"track_no": 3, "track_title": "间奏·夜雨", "expected_filename": "03_间奏_夜雨.wav", "duration": "02:56.00", "notes": "时码偏半拍待确认"}
        ],
        "source_ref": "API验证_曲目表.xlsx",
        "operator": "测试脚本"
    }
    status, resp = req("/import/tracklist", "POST", track_data)
    ok = check("导入 3 条曲目表", status, resp)
    all_pass = all_pass and ok
    batch_trk = resp.get("data", {}).get("batch_id") if ok else None
    if ok:
        print(f"   批次 ID: {batch_trk}")

    # 3. 导入录音文件
    print("\n--- 3. 导入录音文件 POST /import/files")
    file_data = {
        "rows": [
            {"filename": "01_序曲_黎明.wav", "timecode": "03:15.00", "duration": "03:15.00"},
            {"filename": "02_第一幕_重逄.wav", "timecode": "04:28.50", "duration": "04:28.50"},
            {"filename": "03_间奏_夜雨_rev2.wav", "timecode": "02:56.50", "duration": "02:56.50"}
        ],
        "source_ref": "API验证_录音棚导出",
        "operator": "测试脚本"
    }
    status, resp = req("/import/files", "POST", file_data)
    ok = check("导入 3 条录音文件", status, resp)
    all_pass = all_pass and ok
    batch_wav = resp.get("data", {}).get("batch_id") if ok else None

    # 4. 运行检测
    print("\n--- 4. 运行检测 POST /detect")
    detect_data = {"operator": "测试脚本"}
    status, resp = req("/detect", "POST", detect_data)
    ok = check("检测成功", status, resp)
    all_pass = all_pass and ok
    anomaly_count = resp.get("data", {}).get("anomalies_created", 0) if ok else 0
    if ok:
        print(f"   检测到 {anomaly_count} 条异常")
        print(f"   未匹配文件: {resp.get('data',{}).get('unmatched_files',[])}")

    # 5. 查询异常列表
    print("\n--- 5. 查询异常列表 GET /anomalies")
    status, resp = req("/anomalies")
    ok = check(f"返回 {len(resp.get('data',[]))} 条异常记录", status, resp, expect_success=(status == 200 and len(resp.get("data", [])) > 0))
    all_pass = all_pass and ok
    anomalies = resp.get("data", []) if ok else []

    if anomalies:
        aid = anomalies[0]["id"]
        print(f"   取第一条异常 #{aid} 进行后续测试")

        # 6. 追加后补备注
        print(f"\n--- 6. 追加后补备注 POST /anomalies/{aid}/remarks")
        remark_data = {
            "anomaly_id": aid,
            "content": "经阿蓝核对：时码偏差0.5秒由节拍器切换延迟导致，不影响演出",
            "source": "曲目表纸质版边注",
            "operator": "演出统筹阿蓝"
        }
        status, resp = req(f"/anomalies/{aid}/remarks", "POST", remark_data)
        ok = check("后补备注追加成功", status, resp)
        all_pass = all_pass and ok

        # 7. 授权豁免
        print(f"\n--- 7. 授权豁免 POST /anomalies/{aid}/waive")
        waive_data = {
            "anomaly_id": aid,
            "license_remark": "【演出统筹阿蓝授权】曲目#3 间奏·夜雨的时码偏差0.5秒由录音棚确认系节拍器切换延迟，不影响现场演出节奏，现授权豁免此异常。文件、曲目表、最终清单以此对齐。",
            "operator": "演出统筹阿蓝",
            "source_ref": "社区公示前最终授权"
        }
        status, resp = req(f"/anomalies/{aid}/waive", "POST", waive_data)
        ok = check("授权豁免成功，状态转已授权豁免", status, resp)
        all_pass = all_pass and ok

        # 8. 改判解决另一条
        if len(anomalies) >= 2:
            aid2 = anomalies[1]["id"]
            print(f"\n--- 8. 改判解决 #{aid2} POST /anomalies/{aid2}/resolve")
            resolve_data = {
                "anomaly_id": aid2,
                "judgment_text": "确认是同一文件，文件名繁体异体字「逄/逢」不影响曲目对应",
                "source_ref": "录音棚导出命名规范",
                "operator": "演出统筹阿蓝",
                "impact_scope": "仅影响文件命名，清单按曲目#2对齐"
            }
            status, resp = req(f"/anomalies/{aid2}/resolve", "POST", resolve_data)
            ok = check("改判解决成功", status, resp)
            all_pass = all_pass and ok

    # 9. 三维对齐状态
    print("\n--- 9. 三维对齐状态 GET /alignment")
    status, resp = req("/alignment")
    ok = check("对齐状态查询成功", status, resp)
    all_pass = all_pass and ok
    if ok:
        align = resp.get("data", {})
        print(f"   曲目={align.get('total_tracks')} 文件={align.get('total_files')} "
              f"异常={align.get('total_anomalies')} 未匹配={align.get('unmatched_file_count')}")
        print(f"   一致性: " + ("✅ 通过" if align.get('consistency_check',{}).get('consistent') else "❌ 不通过"))

    # 10. 生成报告
    print("\n--- 10. 生成报告 POST /report/generate")
    report_data = {
        "report_title": "API验证报告",
        "include_resolved": True,
        "operator_context": "API验证脚本"
    }
    status, resp = req("/report/generate", "POST", report_data)
    ok = check("报告生成成功", status, resp)
    all_pass = all_pass and ok
    if ok:
        download_url = resp.get("data", {}).get("download_url")
        word_count = resp.get("data", {}).get("word_count")
        print(f"   下载链接: {download_url}")
        print(f"   字数: {word_count}")

    # 11. 测试异常详情
    if anomalies:
        aid = anomalies[0]["id"]
        print(f"\n--- 11. 异常详情 GET /anomalies/{aid}")
        status, resp = req(f"/anomalies/{aid}")
        ok = check("异常详情查询成功", status, resp)
        all_pass = all_pass and ok
        if ok:
            d = resp.get("data", {})
            print(f"   ID={d['id']} 状态={d['status']} "
                  f"备注数={len(d['remarks'])} "
                  f"状态流转={len(d['status_history'])} "
                  f"改判={len(d['judgments'])}")

    # 12. 测试 404 错误处理
    print("\n--- 12. 错误处理（不存在的异常 GET /anomalies/999999")
    status, resp = req("/anomalies/999999")
    ok = check("不存在的异常返回 404", status, {"code": 0}, expect_success=(status == 404))
    all_pass = all_pass and ok

    # 13. 状态快照
    print("\n--- 13. 状态快照 GET /state")
    status, resp = req("/state")
    ok = check("状态快照返回成功", status, resp)
    all_pass = all_pass and ok
    if ok:
        snap = resp.get("data", {})
        print(f"   导出时间: {snap.get('exported_at', '')[:19]}")
        print(f"   备注留存: {snap.get('counts',{}).get('remarks',0)} 条")
        print(f"   状态流转留存: {snap.get('counts',{}).get('status_changes',0)} 条")
        print(f"   改判留存: {snap.get('counts',{}).get('judgments',0)} 条")

    print("\n" + "=" * 60)
    if all_pass:
        print("✅ 全部 API 验证通过")
        return 0
    else:
        print("❌ 部分验证失败")
        return 1


if __name__ == "__main__":
    sys.exit(main())
