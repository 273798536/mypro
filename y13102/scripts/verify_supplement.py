import requests, json

BASE = "http://127.0.0.1:8000"

print("=" * 60)
print("补录记录完整闭环验证")
print("=" * 60)

# 步骤1：先看当前状态
print("\n【初始状态】")
resp = requests.get(f"{BASE}/api/parameters/2")
p = resp.json()
print(f"参数: {p['param_name']}")
print(f"  单位: {p.get('unit') or '未设置（缺失）'}")
print(f"  阈值: {p.get('threshold_low')} ~ {p.get('threshold_high')}")
results = requests.get(f"{BASE}/api/parameters/2/results").json()
for r in results:
    print(f"  最新试算状态: {r['result_status']}, 原因: {r.get('suspend_reason')}")

# 步骤2：编辑参数，补录单位mmHg，并调整低阈值到80
print("\n【步骤1：复核人编辑参数 - 补录单位mmHg】")
resp = requests.put(f"{BASE}/api/parameters/2", json={
    "unit": "mmHg",
    "threshold_low": 80,
    "change_reason": "复核人补录单位并调整阈值",
    "changed_by": "复核人-小孟"
})
p2 = resp.json()
print(f"  新单位: {p2.get('unit')}")
print(f"  新低阈值: {p2.get('threshold_low')}")

# 步骤3：用充足的边界样本重新试算
print("\n【步骤2：复核人补充边界样本并重新试算】")
resp = requests.post(f"{BASE}/api/calculate/", json={
    "parameter_id": 2,
    "sample_data": [
        {"x": 50, "y": 118}, {"x": 75, "y": 122}, {"x": 80, "y": 128},
        {"x": 95, "y": 132}, {"x": 140, "y": 150}, {"x": 160, "y": 162}
    ]
})
result = resp.json()
print(f"  试算状态: {result['result_status']}")
if result.get('result_value'):
    print(f"  结果值: {result['result_value']:.4f}")
if result.get('r_squared'):
    print(f"  整体R²: {result['r_squared']:.4f}")
if result.get('segments'):
    print(f"  分段数: {len(result['segments'])}")
    for s in result['segments']:
        print(f"    段{s['segment_index']+1} [{s['start_x']}~{s['end_x']}]: slope={s['slope']:.4f}, R²={s['r_squared']:.4f}, n={s['sample_count']}")

# 步骤4：看历史版本是否正确保留
print("\n【步骤3：历史版本检查】")
resp = requests.get(f"{BASE}/api/parameters/2")
p3 = resp.json()
print(f"  历史版本数: {len(p3['history'])}")
for h in p3['history']:
    print(f"    v{h['version']}: {h.get('change_reason')} - 单位:{h.get('unit') or '-'} 阈值:{h.get('threshold_low')}~{h.get('threshold_high')}")

print("\n" + "=" * 60)
if result['result_status'] == '正常' and p2.get('unit') == 'mmHg':
    print("✅ 补录记录完整闭环验证通过！")
    print("   单位: 未设置 → mmHg")
    print("   状态: 挂起 → 正常")
else:
    print("❌ 验证失败")
print("=" * 60)
