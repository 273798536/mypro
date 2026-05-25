#!/usr/bin/env python3
"""验证三个核心修复的测试脚本"""

from agri_delivery_inspector.database import init_database
from agri_delivery_inspector.importer import import_file
from agri_delivery_inspector.checker import run_all_checks
from agri_delivery_inspector.fixer import find_record_by_row, correct_field, override_check
from agri_delivery_inspector.reporter import freeze_batch
from agri_delivery_inspector.checker import get_check_results

print("=" * 60)
print("测试1: 验证CLI命令名称为 import (非 import-cmd)")
print("=" * 60)
import subprocess
result = subprocess.run(
    ['python3', '-m', 'agri_delivery_inspector.cli', '--help'],
    capture_output=True, text=True
)
print(result.stdout)
if 'import-cmd' in result.stdout:
    print("❌ FAIL: 命令名仍是 import-cmd")
elif '  import   ' in result.stdout:
    print("✅ PASS: 命令名已改为 import")
else:
    print("⚠️  需要检查命令输出")

print("\n" + "=" * 60)
print("测试2: 重新初始化数据库，导入数据")
print("=" * 60)

init_database(force=True)

r1 = import_file('samples/门店订单_202405.xlsx', 'store_order', '测试员')
print(f"订单导入: {r1['message']} 批次号={r1.get('batch_no','')}")
store_batch = r1['batch_no']

r2 = import_file('samples/司机轨迹_202405.xlsx', 'driver_track', '测试员')
print(f"轨迹导入: {r2['message']} 批次号={r2.get('batch_no','')}")

r3 = import_file('samples/签收欠条_202405.xlsx', 'sign_receipt', '测试员')
print(f"签收导入: {r3['message']} 批次号={r3.get('batch_no','')}")
sign_batch = r3['batch_no']

print("\n" + "=" * 60)
print("测试3: check all --batch 交叉校验是否跨批次")
print("=" * 60)

result = run_all_checks(store_batch)
print(f"全量校验: {result['message']}")
print(f"交叉校验范围: {result.get('cross_validate_scope', 'N/A')}")

cross_result = result['details']['cross_validate']
print(f"交叉校验问题数: {cross_result.get('issue_count', 0)}")
print("\n交叉校验问题清单:")
for issue in cross_result.get('check_results', [])[:10]:
    print(f"  {issue.get('order_no','')}: {issue['message']}")

missing_sign = 0
quantity_mismatch = 0
for issue in cross_result.get('check_results', []):
    if '缺少签收记录' in issue['message']:
        missing_sign += 1
    if 'vs 签收' in issue['message']:
        quantity_mismatch += 1

print(f"\n统计:")
print(f"  缺少签收记录: {missing_sign}")
print(f"  数量/金额不一致: {quantity_mismatch}")

if quantity_mismatch > 0:
    print("✅ PASS: 交叉校验跨批次工作正常，能发现不同批次间的数量/金额不一致")
else:
    print("❌ FAIL: 交叉校验可能未跨批次")

print("\n" + "=" * 60)
print("测试4: 冻结后是否无法修改字段")
print("=" * 60)

result = find_record_by_row(store_batch, 2)
if result['success']:
    record_id = result['record']['id']
    print(f"找到记录ID: {record_id}")
    
    r = correct_field(record_id, 'store_name', '测试修改', '测试', '测试员')
    print(f"未冻结时修改: {r['message']}")
    
    r = freeze_batch(store_batch, '测试员')
    print(f"冻结批次: {r['message']}")
    
    r = correct_field(record_id, 'store_name', '冻结后修改', '测试', '测试员')
    print(f"冻结后修改: {r['message']}")
    
    if '已冻结' in r['message'] and not r['success']:
        print("✅ PASS: 冻结后无法修改字段，符合预期")
    else:
        print("❌ FAIL: 冻结后仍能修改字段")

print("\n" + "=" * 60)
print("测试5: 冻结后是否无法改判")
print("=" * 60)

checks = get_check_results(batch_no=sign_batch, only_failed=True)
if checks['success'] and checks['count'] > 0:
    check_id = checks['results'][0]['id']
    print(f"找到校验结果ID: {check_id}")
    
    r = freeze_batch(sign_batch, '测试员')
    print(f"冻结签收批次: {r['message']}")
    
    r = override_check(check_id, '测试改判', '测试员')
    print(f"冻结后改判: {r['message']}")
    
    if '已冻结' in r['message'] and not r['success']:
        print("✅ PASS: 冻结后无法改判，符合预期")
    else:
        print("❌ FAIL: 冻结后仍能改判")

print("\n" + "=" * 60)
print("✅ 所有修复验证完成！")
print("=" * 60)
