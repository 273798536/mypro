import sys, os, time, subprocess, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

p = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8765"],
    cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
)
time.sleep(4)

import requests
BASE = "http://127.0.0.1:8765"

print("=== 1. 参数列表 ===")
r = requests.get(f"{BASE}/api/parameters/")
params = r.json()
for p in params:
    print(f"  ID={p['id']} key={p['param_key']} unit={repr(p.get('unit'))}")

print("\n=== 2. 血压参数详情 ===")
r = requests.get(f"{BASE}/api/parameters/2")
d = r.json()
print(f"  unit={repr(d.get('unit'))}")
lr = d.get("latest_result")
if lr:
    print(f"  latest_result.result_status={repr(lr.get('result_status'))}")
    print(f"  latest_result.suspend_reason={repr(lr.get('suspend_reason'))}")
    print(f"  latest_result.segments type={type(lr.get('segments'))}")
    print(f"  latest_result.r_squared={repr(lr.get('r_squared'))}")
else:
    print("  no latest_result")

print("\n=== 3. 试算结果列表 ===")
r = requests.get(f"{BASE}/api/parameters/2/results")
results = r.json()
for res in results:
    print(f"  v{res['version']} status={repr(res['result_status'])} jump={res['is_jump']} cause={repr(res.get('jump_cause'))}")

print("\n=== 4. 截图列表 ===")
r = requests.get(f"{BASE}/api/parameters/2/screenshots")
shots = r.json()
for s in shots:
    print(f"  id={s['id']} status={repr(s.get('status'))}")

print("\n=== 5. 计算API返回格式 ===")
r = requests.post(f"{BASE}/api/calculate/", json={
    "parameter_id": 2,
    "sample_data": [{"x": 1, "y": 118}, {"x": 2, "y": 122}, {"x": 3, "y": 128}]
})
calc = r.json()
print(f"  status_code={r.status_code}")
print(f"  result_status={repr(calc.get('result_status'))}")
print(f"  is_duplicate={repr(calc.get('is_duplicate'))}")
print(f"  has_id={'id' in calc}")
print(f"  has_version={'version' in calc}")
print(f"  all_keys={sorted(calc.keys())}")

print("\n=== 6. 心率跳变 ===")
r = requests.get(f"{BASE}/api/parameters/3/results")
hr_results = r.json()
for res in hr_results:
    print(f"  v{res['version']} jump={res['is_jump']} cause={repr(res.get('jump_cause'))}")
    if res.get("is_jump"):
        r2 = requests.get(f"{BASE}/api/results/{res['id']}/jump-analysis")
        ja = r2.json()
        for t in ja.get("change_traces", []):
            print(f"    cause={repr(t.get('change_cause'))} old={repr(t.get('old_value'))} new={repr(t.get('new_value'))}")

print("\n=== 7. 幂等性检查 ===")
r = requests.post(f"{BASE}/api/calculate/", json={
    "parameter_id": 2,
    "sample_data": [{"x": 1, "y": 118}, {"x": 2, "y": 122}, {"x": 3, "y": 128}]
})
dup = r.json()
print(f"  is_duplicate={repr(dup.get('is_duplicate'))}")

print("\n=== 8. 补录单位后重新试算 ===")
r = requests.put(f"{BASE}/api/parameters/2", json={
    "unit": "mmHg",
    "threshold_low": 80,
    "change_reason": "复核人补录单位",
    "changed_by": "小孟"
})
print(f"  更新后unit={repr(r.json().get('unit'))}")

r = requests.post(f"{BASE}/api/calculate/", json={
    "parameter_id": 2,
    "sample_data": [{"x": 50, "y": 118}, {"x": 75, "y": 122}, {"x": 80, "y": 128},
                    {"x": 95, "y": 132}, {"x": 140, "y": 150}, {"x": 160, "y": 162}]
})
recalc = r.json()
print(f"  重算后status={repr(recalc.get('result_status'))}")
print(f"  r_squared={repr(recalc.get('r_squared'))}")
print(f"  segments count={len(recalc.get('segments', []))}")

p.terminate()
