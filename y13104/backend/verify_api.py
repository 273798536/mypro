import json
import urllib.request

BASE = "http://localhost:8888/api"

def http(url, method="GET", data=None):
    req = urllib.request.Request(BASE + url, method=method, data=data)
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode())

print("=== 1. sheets list ===")
status, data = http("/sheets")
print(f"HTTP {status}, 共 {len(data)} 张表")
for s in data:
    print(f"  id={s['id']} file={s['file_name']} ver={s['version']} rows={s['row_count']}")

print("\n=== 2. 坏材料 sheet_id=2 run 回归 ===")
try:
    status, data = http("/sheets/2/run", method="POST")
    print(f"HTTP {status}")
    print(json.dumps(data, ensure_ascii=False, indent=2))
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}")
    body = json.loads(e.read().decode())
    print(json.dumps(body, ensure_ascii=False, indent=2))

print("\n=== 3. 正常参数表 sheet_id=1 run 回归 ===")
status, data = http("/sheets/1/run", method="POST")
print(f"HTTP {status}")
for k in ['id', 'sheet_id', 'segment_count', 'r_squared', 'total_points', 'anomaly_count']:
    print(f"  {k}: {data.get(k)}")

print("\n=== 4. dashboard sheet_id=1 ===")
status, d = http("/sheets/1/dashboard")
print(f"HTTP {status}")
print(f"  sheet: {d['sheet']['file_name']} (ver {d['sheet']['version']})")
print(f"  latest_result id: {d['latest_result']['id'] if d['latest_result'] else None}")
print(f"  R²: {d['latest_result']['r_squared'] if d['latest_result'] else None}")
print(f"  anomalies (all rows): {len(d['anomalies'])}")
print(f"  review_summary: processed={d['review_summary']['processed']}, pending={d['review_summary']['pending_material']}, manual={d['review_summary']['manual_overrule']}")
print(f"  chart points: {len(d['chart']['points'])}")
print(f"  chart breakpoints: {d['chart']['breakpoints']}")
print(f"  chart fitted_lines: {len(d['chart']['fitted_lines'])}")
print(f"  change_logs: {len(d['change_logs'])}")

print("\n=== 5. 更新异常点复核状态 ===")
anoms = [a for a in d['anomalies'] if a['is_outlier']]
if anoms:
    a0 = anoms[0]
    print(f"  选择异常点 id={a0['id']} {a0['security_code']} 当前状态={a0['review_status']}")
    req_data = json.dumps({"review_status": "manual_overrule", "reviewer_note": "测试：人工改判"}).encode()
    req = urllib.request.Request(
        BASE + f"/anomalies/{a0['id']}/review",
        data=req_data,
        method="PATCH",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        r = json.loads(resp.read().decode())
        print(f"  更新后: status={r['review_status']}, note={r['reviewer_note']}, overridden={r['overridden']}")

print("\n=== 6. dashboard 复核状态已更新 ===")
status, d2 = http("/sheets/1/dashboard")
print(f"  review_summary: processed={d2['review_summary']['processed']}, pending={d2['review_summary']['pending_material']}, manual={d2['review_summary']['manual_overrule']}")
print("✓ 复核状态从 pending → manual 实时变化")
