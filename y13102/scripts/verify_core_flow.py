import requests, json

BASE = "http://127.0.0.1:8000"

print("=" * 60)
print("核心交互路径验证")
print("=" * 60)

print("\n【验证1: 编辑参数API - 补录单位】")
print("GET /api/parameters/2 →")
d = requests.get(f"{BASE}/api/parameters/2").json()
print(f"  unit={repr(d.get('unit'))}  threshold_low={d.get('threshold_low')}")
print(f"  历史版本数={len(d.get('history', []))}")
for h in d.get('history', []):
    print(f"    v{h['version']}: {h.get('change_reason')} unit={h.get('unit')}")

print("\n【验证2: 重新试算API - 补单位后从挂起→正常】")
r = requests.post(f"{BASE}/api/calculate/", json={
    "parameter_id": 2,
    "sample_data": [
        {"x": 50, "y": 118}, {"x": 75, "y": 122}, {"x": 80, "y": 128},
        {"x": 95, "y": 132}, {"x": 140, "y": 150}, {"x": 160, "y": 162}
    ]
})
calc = r.json()
print(f"  status_code={r.status_code}")
print(f"  result_status={repr(calc.get('result_status'))}")
print(f"  result_value={calc.get('result_value')}")
print(f"  r_squared={calc.get('r_squared')}")
print(f"  suspend_reason={repr(calc.get('suspend_reason'))}")
print(f"  is_duplicate={calc.get('is_duplicate')}")
print(f"  segments count={len(calc.get('segments', []))}")
for s in calc.get('segments', []):
    print(f"    段{s['segment_index']+1} [{s['start_x']}~{s['end_x']}]: slope={s['slope']:.4f} R²={s['r_squared']:.4f} n={s['sample_count']}")

print("\n【验证3: 幂等性 - 第二次相同请求】")
r2 = requests.post(f"{BASE}/api/calculate/", json={
    "parameter_id": 2,
    "sample_data": [
        {"x": 50, "y": 118}, {"x": 75, "y": 122}, {"x": 80, "y": 128},
        {"x": 95, "y": 132}, {"x": 140, "y": 150}, {"x": 160, "y": 162}
    ]
})
dup = r2.json()
print(f"  is_duplicate={dup.get('is_duplicate')}  ← 期望=True")
print(f"  version={dup.get('version')}  ← 期望与上一条相同")

print("\n【验证4: 截图状态三分类】")
shots = requests.get(f"{BASE}/api/parameters/2/screenshots").json()
for s in shots:
    print(f"  id={s['id']} status={repr(s.get('status'))}")

print("\n【验证5: 心率跳变检测】")
hr_results = requests.get(f"{BASE}/api/parameters/3/results").json()
for r in hr_results:
    if r.get("is_jump"):
        print(f"  v{r['version']} jump=True cause={repr(r.get('jump_cause'))}")
        ja = requests.get(f"{BASE}/api/results/{r['id']}/jump-analysis").json()
        print(f"  变更溯源条目: {len(ja.get('change_traces', []))}")
        for t in ja.get("change_traces", []):
            print(f"    cause={repr(t.get('change_cause'))}  {t.get('field_name')}: {t.get('old_value')} → {t.get('new_value')}")

print("\n【验证6: 原始挂起结果现在应有segments】")
bp_results = requests.get(f"{BASE}/api/parameters/2/results").json()
suspended = [r for r in bp_results if r['result_status'] == '挂起']
if suspended:
    s = suspended[0]
    print(f"  v{s['version']} status={repr(s['result_status'])}")
    print(f"  segments count={len(s.get('segments', []))}  ← 期望>0（新逻辑：挂起也执行回归）")
    if s.get('segments'):
        print(f"  suspend_reason={repr(s.get('suspend_reason'))}")
