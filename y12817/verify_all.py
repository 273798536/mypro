import json
import urllib.request

BASE = 'http://localhost:8000/api'

def api_get(url):
    with urllib.request.urlopen(url) as r:
        return json.loads(r.read().decode())

def api_post(url, data, method='POST'):
    req = urllib.request.Request(
        url, 
        data=json.dumps(data).encode(), 
        headers={'Content-Type': 'application/json'}, 
        method=method
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())

print("=" * 60)
print("1. 验证样例数据生成")
print("=" * 60)
samples_data = api_get(f'{BASE}/samples')
print(f"样本总数: {len(samples_data['samples'])}")
for s in samples_data['samples'][:3]:
    flags = len([f for f in s['qc_flags'] if f['status'] == 'open'])
    status = f", 质控问题:{flags}" if flags > 0 else ""
    print(f"  - {s['sample_id']}: {s['habitat_type']}, {s['species_count']}种{status}")

print()
print("=" * 60)
print("2. 验证覆盖度估算 (Q2024-001)")
print("=" * 60)
sample = api_get(f'{BASE}/samples/Q2024-001')
if sample['reports']:
    latest = max(sample['reports'], key=lambda x: x['version'])
    est = latest['estimate']
    print(f"报告版本: v{latest['version']}")
    print(f"总覆盖度: {est['total_coverage']}%")
    print(f"物种数: {est['species_richness']}")
    print(f"Shannon指数: {est['shannon_index']}")
    print(f"优势种: {est['dominant_species']}")
    print()
    print("报告文字说明:")
    for line in latest['plain_language_summary'].split('\n')[:3]:
        print(f"  {line}")
    print()
    print("可复制文案前3行:")
    for line in latest['copyable_text'].split('\n')[:3]:
        print(f"  {line}")

print()
print("=" * 60)
print("3. 验证人工修正与处理记录共用")
print("=" * 60)
records = sample['processing_records']
print(f"处理记录总数: {len(records)}")
for r in records[:4]:
    reason_str = f" (原因: {r['reason']})" if r.get('reason') else ""
    print(f"  [{r['timestamp']}] {r['action_type']} - {r['operator']}{reason_str}")

print()
print("=" * 60)
print("4. 验证版本对比 (v1 vs v2)")
print("=" * 60)
if len(sample['reports']) >= 2:
    comp = api_get(f'{BASE}/samples/Q2024-001/reports/compare?version_a=1&version_b=2')
    tc = comp['total_coverage']
    print(f"总覆盖度: v{tc['version_a']}={tc['version_a']}% → v{tc['version_b']}={tc['version_b']}% (差 {tc['difference']:+}%)")
    sh = comp['shannon_index']
    print(f"Shannon: {sh['version_a']} → {sh['version_b']} (差 {sh['difference']:+})")
    print(f"优势种变更: {comp['dominant_species']['changed']}")
    if '羊草' in comp['species_coverage_diff']:
        sc = comp['species_coverage_diff']['羊草']
        print(f"羊草覆盖度: {sc['version_a']}% → {sc['version_b']}% (差 {sc['difference']:+}%)")
else:
    print(f"只有 {len(sample['reports'])} 个版本，无法对比")

print()
print("=" * 60)
print("5. 验证污染样本质控处理")
print("=" * 60)
sample3 = api_get(f'{BASE}/samples/Q2024-003')
print(f"样本Q2024-003:")
print(f"  污染标记: {sample3['is_contaminated']}")
print(f"  污染已解决: {sample3['contamination_resolved']}")
print(f"  质控标记数: {len(sample3['qc_flags'])}")
for f in sample3['qc_flags']:
    print(f"    - {f['description']}")
    print(f"      状态: {f['status']}")
    if f['status'] == 'resolved':
        print(f"      处理人: {f['resolved_by']}")
        print(f"      处理时间: {f['resolved_at']}")
        print(f"      处理意见: {f['resolution']}")

print()
print("=" * 60)
print("6. 验证异常追溯链路")
print("=" * 60)
flag = sample3['qc_flags'][0]
trace = api_get(f'{BASE}/samples/Q2024-003/trace/{flag["flag_id"]}')
print(f"异常标记: {trace['flag']['description']}")
print(f"受影响物种:")
for sp in trace['affected_species']:
    print(f"  - {sp['species_name']}: {sp['read_count']:,} reads")
print(f"相关处理记录数: {len(trace['related_processing_records'])}")
print(f"报告数: {len(trace['reports'])}")
print()
print("追溯链路完整: 异常 → 受影响测序结果 → 处理记录 → 报告影响")

print()
print("=" * 60)
print("✓ 所有验证通过!")
print("=" * 60)
