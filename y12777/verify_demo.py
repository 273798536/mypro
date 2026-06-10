import json
import os
import sys
import time
import urllib.request
import urllib.error

from demo_data import DEMO_PAYLOAD

BASE_URL = "http://127.0.0.1:5000"


def http(method, path, data=None):
    url = BASE_URL + path
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data, ensure_ascii=False).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="ignore")
        return e.code, json.loads(raw) if raw else None
    except Exception as e:
        return 0, {"error": str(e)}


def print_step(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def main():
    print_step("1. 健康检查")
    code, data = http("GET", "/api/health")
    print(f"状态码: {code}")
    print(json.dumps(data, ensure_ascii=False, indent=2))

    print_step("2. 导入样例批次（含旧表、补录备注、漏填单位）")
    code, data = http("POST", "/api/import", DEMO_PAYLOAD)
    print(f"状态码: {code}")
    print(json.dumps(data, ensure_ascii=False, indent=2))
    if code != 201:
        print("导入失败，终止")
        return 1
    batch_id = data["batch_id"]
    batch_no = data["batch_no"]
    run_index = data["run_index"]
    print(f"  批次ID: {batch_id}, 批次号: {batch_no}, 运行轮次: {run_index}")

    print_step("3. 查询批次详情（验证持久化）")
    code, data = http("GET", f"/api/batches/{batch_id}")
    print(f"状态码: {code}")
    if code == 200:
        print(f"  批次整体状态: {data['batch']['overall_status']}")
        print(f"  样品数量: {len(data['samples'])}")
        for s in data["samples"]:
            print(f"    - {s['sample_no']} {s.get('product_name')} 状态={s['review_status']}  漏填字段={s.get('missing_fields')}")

    print_step("4. 执行批次自动复核")
    code, data = http("POST", f"/api/batches/{batch_id}/review")
    print(f"状态码: {code}")
    print(json.dumps(data, ensure_ascii=False, indent=2))

    print_step("5. 查询安全提示（与报告共用同一批记录）")
    code, data = http("GET", f"/api/batches/{batch_id}/safety")
    print(f"状态码: {code}")
    if code == 200:
        for a in data["safety_alerts"]:
            print(f"  [{a['severity']}] {a['title']}")
            print(f"     {a['description'][:80]}...")

    print_step("6. 人工确认一条安全提示")
    code, data = http("GET", f"/api/batches/{batch_id}/safety")
    if code == 200 and data["safety_alerts"]:
        alert_id = data["safety_alerts"][0]["id"]
        code2, data2 = http("POST", f"/api/safety/{alert_id}/acknowledge", {"operator": "陈主管"})
        print(f"确认提示 {alert_id}: 状态码={code2}, 结果={json.dumps(data2, ensure_ascii=False)}")

    print_step("7. 人工推进某条样品状态并给出复核意见")
    code, data = http("GET", f"/api/batches/{batch_id}")
    sample_ids = [s["id"] for s in data["samples"]]
    if sample_ids:
        sid = sample_ids[0]
        code2, data2 = http("PUT", f"/api/samples/{sid}/status", {
            "status": "复核中",
            "operator": "陈主管",
            "comment": "需要人工核对原始谱图",
        })
        print(f"样品 {sid} 状态推进: {json.dumps(data2, ensure_ascii=False)}")

    print_step("8. 报告预览（非技术人员可读版本）")
    code, data = http("GET", f"/api/batches/{batch_id}/report_preview")
    print(f"状态码: {code}")
    if code == 200:
        print(f"  建议文件名: {data['filename']}")
        print("-" * 50)
        print(data["content"][:2000])
        if len(data["content"]) > 2000:
            print(f"\n...（已截断，全文 {len(data['content'])} 字符）")

    print_step("9. 导出报告文件到 reports/ 目录")
    print("请在浏览器或 curl 中访问: " + f"{BASE_URL}/api/batches/{batch_id}/export")

    print_step("10. 查看运行历史（重启后仍可查到）")
    code, data = http("GET", "/api/history/runs")
    print(f"状态码: {code}")
    if code == 200:
        for r in data["runs"]:
            print(f"  批次 {r['batch_no']} (第{r['run_index']}轮)  状态={r['overall_status']}  样品数={r.get('sample_count')}  问题数={r.get('finding_count')}  导入于 {r['imported_at']}")

    print_step("11. 异常追溯：从一条复核问题反向查到温度曲线和处理意见")
    code, data = http("GET", f"/api/batches/{batch_id}")
    finding_id = None
    for s in data["samples"]:
        if s["findings"]:
            finding_id = s["findings"][0]["id"]
            break
    if finding_id:
        print(f"选中问题ID: {finding_id}")
        code2, data2 = http("GET", f"/api/history/trace/{finding_id}")
        if code2 == 200:
            print(f"  问题标题: {data2['finding']['title']}")
            print(f"  问题描述: {data2['finding']['description'][:100]}...")
            print(f"  所属样品: {data2['sample']['product_name']} ({data2['sample']['sample_no']})")
            print(f"  所属批次: {data2['batch']['batch_no']} 第{data2['batch']['run_index']}轮")
            print(f"  温度曲线点数: {len(data2['temperature_curve'])}")
            for t in data2["temperature_curve"]:
                flag = "⚠" if t["is_anomaly"] else " "
                print(f"    {flag} {t['time_min']:>6.1f}min  {t['temperature_c']:>5.2f}℃  {t.get('anomaly_note') or ''}")
            print(f"  审计记录数: {len(data2['audit_trail'])}")
            for a in data2["audit_trail"]:
                print(f"    {a['created_at']}  {a.get('from_status') or '-'} → {a['to_status']}  操作人={a['operator']}  {a.get('comment') or ''}")

    print_step("验证完成")
    print(f"  数据库文件: {os.path.abspath('dissolution.db')}")
    print(f"  报告目录  : {os.path.abspath('reports/')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
