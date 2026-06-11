#!/usr/bin/env python3
import sys
import os
import json
import time
import subprocess
import signal

BASE_URL = "http://localhost:5001/api"
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(PROJECT_DIR, "sample_data")

passed = 0
failed = 0
server_process = None

def log(msg, level="INFO"):
    timestamp = time.strftime("%H:%M:%S")
    print(f"[{timestamp}] [{level}] {msg}")

def check(condition, test_name):
    global passed, failed
    if condition:
        passed += 1
        log(f"✓ PASS: {test_name}", "OK")
        return True
    else:
        failed += 1
        log(f"✗ FAIL: {test_name}", "ERROR")
        return False

def curl(method, path, data=None, operator="system"):
    import urllib.request
    import urllib.parse
    url = f"{BASE_URL}{path}"
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-Operator": urllib.parse.quote(operator)
    }
    body = json.dumps(data, ensure_ascii=False).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return json.loads(e.read().decode("utf-8"))
    except UnicodeEncodeError as e:
        return {"error": f"编码错误: {str(e)}"}
    except Exception as e:
        return {"error": str(e)}

def start_server():
    global server_process
    log("启动 Flask 服务...")
    env = os.environ.copy()
    env["PYTHONPATH"] = PROJECT_DIR
    server_process = subprocess.Popen(
        [f"{PROJECT_DIR}/venv/bin/python", "app.py"],
        cwd=PROJECT_DIR,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    for i in range(30):
        time.sleep(1)
        try:
            result = curl("GET", "/health")
            if result.get("status") == "ok":
                log(f"服务已启动 (PID={server_process.pid})")
                return True
        except Exception as e:
            if i % 5 == 4:
                log(f"  等待服务... ({i+1}s) 上次错误: {str(e)[:50]}")
    try:
        stdout, stderr = server_process.communicate(timeout=2)
        log(f"服务输出 stdout: {stdout.decode()[-500:]}", "ERROR")
        log(f"服务输出 stderr: {stderr.decode()[-500:]}", "ERROR")
    except:
        pass
    log("服务启动超时！", "ERROR")
    return False

def stop_server():
    global server_process
    if server_process:
        try:
            server_process.terminate()
            server_process.wait(timeout=5)
            log("服务已停止")
        except:
            server_process.kill()

def cleanup():
    db_path = os.path.join(PROJECT_DIR, "blood_test.db")
    if os.path.exists(db_path):
        os.remove(db_path)
        log("已清理旧数据库")

def main():
    log("=" * 60)
    log("血液检验复测建议系统 - 自动化端到端测试")
    log("=" * 60)
    print()

    cleanup()

    if not start_server():
        log("无法启动服务，测试终止", "ERROR")
        return 1

    print()

    try:
        log("【测试1】健康检查")
        r = curl("GET", "/health")
        check(r.get("status") == "ok" and "血液检验" in r.get("service", ""),
              "服务健康检查正常")
        print()

        log("【测试2】导入第一批数据 (BATCH-20260601)")
        with open(os.path.join(DATA_DIR, "batch_20260601.json"), "r", encoding="utf-8") as f:
            data = json.load(f)
        r = curl("POST", "/import", data, operator="李技师")
        if r.get("status") != "success":
            log(f"导入返回: {json.dumps(r, ensure_ascii=False)}", "ERROR")
        check(r.get("status") == "success", "导入成功")
        check(r.get("summary", {}).get("total") == 4, "总记录4条")
        check(r.get("summary", {}).get("new") == 4, "新记录4条")
        check(r.get("summary", {}).get("duplicates") == 0, "无重复记录")
        check(r.get("summary", {}).get("with_low_quality") == 3, "3条含低质量读段")
        print()

        log("【测试3】低质量读段优先拎出 (质控第一关)")
        r = curl("GET", "/low-quality")
        check(r.get("count") == 3, "检测出3条含低质量读段的记录")
        records = r.get("records", [])
        s003 = next((x for x in records if x["sample_no"] == "S003"), None)
        check(s003 is not None, "S003(边界不清)在低质量列表中")
        if s003:
            check(len(s003.get("low_quality_reads", [])) >= 3, "S003低质量读段≥3条")
            check(len(s003.get("micrographs", [])) == 2, "S003有2张显微照片")
        print()

        log("【测试4】日常入口 - 分组统计")
        r = curl("GET", "/statistics/groups")
        check(r.get("count") == 1, "有1个批次")
        group = r.get("groups", [])[0]
        check(group.get("total_samples") == 4, "批次共4个样本")
        check(group.get("samples_with_low_quality") == 3, "3个含低质量")
        print()

        log("【测试5】创建复核会话 - 同轮整合低质量读段、显微照片、试剂批号")
        r = curl("POST", "/review/sessions", {
            "sample_batch_id": 1,
            "session_name": "20260601批次综合复核"
        }, operator="王质控")
        check(r.get("id") == 1, "复核会话创建成功")
        check(len(r.get("items", [])) == 4, "复核项共4条")
        items = r.get("items", [])
        needs_review = [x for x in items if x.get("needs_review") == 1]
        check(len(needs_review) == 4, "初始全部待复核")
        s003_item = next((x for x in items if x["sample_no"] == "S003"), None)
        check(s003_item is not None, "S003在复核列表中")
        if s003_item:
            check(s003_item.get("has_low_quality") == 1, "S003标记有低质量")
            check(s003_item.get("reagent_batch_no") == "REAG-2026-001", "关联试剂批号正确")
            check(s003_item.get("micrograph_count") == 2, "显微照片计数正确")
            check(len(s003_item.get("low_quality_reads", [])) > 0, "内嵌低质量读段数据")
            check(len(s003_item.get("micrographs", [])) == 2, "内嵌显微照片数据")
            check(s003_item.get("reagent_info") is not None, "内嵌试剂信息")
        print()

        log("【测试6】提交S003(边界不清)复核结论 - 建议复测")
        r = curl("POST", "/review/items/3", {
            "review_notes": "读段质量偏低，照片见杂菌形态不典型",
            "review_result": "可疑",
            "conclusion_text": "低质量读段占比高，疑似污染，建议复测",
            "conclusion_type": "suspicious",
            "retest_needed": True,
            "retest_reason": "低质量读段过多+疑似污染",
            "final_decision": "建议复测"
        }, operator="王质控")
        check(r.get("status") == "success", "复核提交成功")
        check(r.get("superseded_previous") == False, "首次提交，无旧结论")
        print()

        log("【测试7】提交S001复核结论 - 正常")
        r = curl("POST", "/review/items/1", {
            "review_notes": "低质量读段个别，不影响判断",
            "review_result": "正常",
            "conclusion_text": "检出金黄色葡萄球菌，无需复测",
            "conclusion_type": "normal",
            "retest_needed": False,
            "final_decision": "报告发出"
        }, operator="王质控")
        check(r.get("status") == "success", "S001复核提交成功")
        print()

        log("【测试8】全链路溯源 - S003(边界不清验收场景)")
        r = curl("GET", "/trace/record/3")
        check(r.get("sample_no") == "S003", "溯源到正确样本")
        check(r.get("reagent_no") == "REAG-2026-001", "溯源到试剂批号")
        check(r.get("import_source") is not None, "溯源到导入来源文件")
        check(r.get("import_operator") == "李技师", "溯源到导入操作人")
        check(len(r.get("sequencing_reads", [])) == 4, "溯源到全部4条读段")
        lowq = [x for x in r["sequencing_reads"] if x["is_low_quality"] == 1]
        check(len(lowq) == 3, "溯源到3条低质量读段")
        check(len(r.get("micrographs", [])) == 2, "溯源到2张显微照片")
        check(len(r.get("reviews", [])) >= 1, "溯源到复核历史")
        check(len(r.get("audit_trail", [])) > 0, "溯源到审计日志")
        has_insert = any(a["action"] == "INSERT" for a in r["audit_trail"])
        check(has_insert, "审计日志包含原始插入记录")
        print()

        log("【测试9】试剂批号反查结论 (REAG-2026-001)")
        r = curl("GET", "/trace/reagent/REAG-2026-001")
        check(r.get("count") >= 2, "查到≥2条关联结论")
        records = r.get("records", [])
        has_s001 = any(x["sample_no"] == "S001" for x in records)
        has_s003 = any(x["sample_no"] == "S003" for x in records)
        check(has_s001 and has_s003, "包含S001和S003的结论")
        print()

        log("【测试10】重复导入同一文件 - 应拒绝")
        with open(os.path.join(DATA_DIR, "batch_20260601.json"), "r", encoding="utf-8") as f:
            data = json.load(f)
        r = curl("POST", "/import", data, operator="误操作技师")
        check(r.get("status") == "duplicate_file", "正确识别重复文件")
        check("已在之前导入过" in r.get("message", ""), "提示信息正确")
        print()

        log("【测试11】导入含重复记录的文件 - 应跳过重复，导入新记录")
        dup_data = {
            "source_file": "dup_test.json",
            "batch_info": {"batch_no": "BATCH-20260601", "group_name": "临床检验一组", "collect_date": "2026-06-01"},
            "records": [
                {
                    "sample_no": "S001", "patient_id": "P1001",
                    "culture_type": "需氧菌培养", "culture_date": "2026-06-01",
                    "reagent_no": "REAG-2026-001",
                    "incubator_temp": 36.5, "incubator_humidity": 65,
                    "culture_result": "阳性",
                    "sequencing_reads": [{"read_id": "T1", "quality_score": 35, "sequence": "A", "gc_content": 50}]
                },
                {
                    "sample_no": "S005", "patient_id": "P1005",
                    "culture_type": "需氧菌培养", "culture_date": "2026-06-01",
                    "reagent_no": "REAG-2026-001",
                    "incubator_temp": 36.5, "incubator_humidity": 65,
                    "culture_result": "阴性",
                    "sequencing_reads": [{"read_id": "S005_1", "quality_score": 38, "sequence": "ATCG", "gc_content": 48}]
                }
            ]
        }
        r = curl("POST", "/import", dup_data, operator="测试员")
        check(r.get("summary", {}).get("total") == 2, "总记录2条")
        check(r.get("summary", {}).get("new") == 1, "新记录1条")
        check(r.get("summary", {}).get("duplicates") == 1, "跳过1条重复")
        print()

        log("【测试12】补录S001 - 原有结论应自动失效，防重复")
        r = curl("GET", "/conclusions/active/1")
        active_before = r.get("count", 0)
        check(active_before == 1, "补录前有1条有效结论")

        r = curl("POST", "/supplement/1", {
            "incubator_temp": 36.6,
            "culture_result": "阳性(确认)",
            "sequencing_reads": [
                {"read_id": "S001_NEW1", "quality_score": 40, "sequence": "GATC", "gc_content": 52}
            ],
            "micrographs": [
                {"image_path": "/new/S001_2.jpg", "capture_time": "2026-06-03", "magnification": "1000x", "annotation": "补拍"}
            ]
        }, operator="张技师")
        check(r.get("status") == "success", "补录成功")
        check(r.get("superseded_conclusions") == 1, "标记1条旧结论失效")

        r = curl("GET", "/conclusions/active/1")
        check(r.get("count") == 0, "补录后有效结论数为0，需重新复核")
        print()

        log("【测试13】重新复核S001 - 新结论替代旧结论，有替代链")
        r = curl("POST", "/review/items/1", {
            "review_notes": "补录后重新复核，新增证据支持原结论",
            "review_result": "正常",
            "conclusion_text": "补录数据确认金黄色葡萄球菌",
            "conclusion_type": "normal",
            "retest_needed": False,
            "final_decision": "报告发出"
        }, operator="王质控")
        check(r.get("superseded_previous") == True, "新结论标记了替代关系")

        r = curl("GET", "/conclusions/active/1")
        check(r.get("count") == 1, "重新复核后有1条有效结论")
        print()

        log("【测试14】月底质控视图 - 月度报告")
        r = curl("GET", "/statistics/monthly/2026-06")
        check(r.get("year_month") == "2026-06", "月份正确")
        summary = r.get("summary", {})
        check(summary.get("total_batches") == 1, "1个批次")
        check(summary.get("total_samples") == 5, "共5个样本(4+1新增)")
        check(summary.get("low_quality_samples") >= 3, "≥3个含低质量")
        check(summary.get("retest_needed") == 1, "1个需复测(S003)")
        print()

        log("=" * 60)
        log(f"测试完成: 通过 {passed}/{passed+failed}, 失败 {failed}")
        log("=" * 60)

        if failed > 0:
            log(f"有 {failed} 个测试失败，请检查！", "ERROR")
            return 1
        else:
            log("所有测试通过！✓", "OK")
            return 0

    except Exception as e:
        log(f"测试异常: {e}", "ERROR")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        stop_server()

if __name__ == "__main__":
    sys.exit(main())
