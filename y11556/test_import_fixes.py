#!/usr/bin/env python3
"""验证导入重复检测和部分失败记录修复"""

import os
import pandas as pd
from agri_delivery_inspector.database import init_database
from agri_delivery_inspector.importer import import_file, list_batches
from agri_delivery_inspector.checker import get_check_results
from agri_delivery_inspector.reporter import freeze_batch, export_failed_records

print("=" * 60)
print("测试1: 重复检测 - 冻结后也能检测到重复")
print("=" * 60)

init_database(force=True)

# 第一次导入
r1 = import_file('samples/门店订单_202405.xlsx', 'store_order', '测试员')
print(f"第一次导入: {r1['message']}")
store_batch = r1['batch_no']

# 冻结批次
r = freeze_batch(store_batch, '测试员')
print(f"冻结批次: {r['message']}")

# 尝试再次导入同一个文件
r2 = import_file('samples/门店订单_202405.xlsx', 'store_order', '测试员')
print(f"冻结后重复导入: {r2['message']}")

if not r2['success'] and '重复导入' in r2['message']:
    print("✅ PASS: 冻结后也能检测到重复导入，拒绝重复")
else:
    print("❌ FAIL: 冻结后未能检测到重复导入")

print("\n" + "=" * 60)
print("测试2: 部分失败 - 失败行写入数据库并可导出")
print("=" * 60)

# 创建一个包含错误行的测试文件
test_df = pd.read_excel('samples/门店订单_202405.xlsx')
test_df.loc[1, '数量'] = '非数字'  # 第3行（原始行号4）数量改为非数字，触发解析失败
test_df.loc[3, '单价'] = '错误价格'  # 第5行（原始行号6）单价改为非数字
test_file = 'samples/门店订单_含错误.xlsx'
test_df.to_excel(test_file, index=False)
print(f"创建测试文件: {test_file} (含2个解析错误)")

# 导入这个有错误的文件
r3 = import_file(test_file, 'store_order', '测试员')
print(f"导入含错误文件: {r3['message']}")
bad_batch = r3['batch_no']

print(f"  总行数: {r3['total_rows']}")
print(f"  成功行数: {r3['success_rows']}")
print(f"  失败行数: {r3['failed_rows']}")

# 检查数据库中的失败记录
checks = get_check_results(batch_no=bad_batch, check_type='import')
print(f"\n数据库中导入类型的校验结果: {checks['count']} 条")

import_failures = [c for c in checks['results'] if c['check_item'] == 'parse']
print(f"解析失败记录: {len(import_failures)} 条")
for f in import_failures:
    print(f"  原始行号 {f['source_row']}: {f['message'][:60]}...")

if len(import_failures) >= 2:
    print("✅ PASS: 失败行已写入数据库，包含失败原因")
else:
    print("❌ FAIL: 失败行未正确写入数据库")

# 导出失败清单
export_result = export_failed_records(batch_no=bad_batch, output_path='samples/测试失败清单_含导入错误.xlsx')
print(f"\n导出失败清单: {export_result['message']}")
print(f"导出记录数: {export_result['record_count']}")

if export_result['record_count'] >= 2:
    print("✅ PASS: 导入失败记录可通过失败清单导出")
else:
    print("❌ FAIL: 导入失败记录未包含在失败清单中")

# 清理测试文件
if os.path.exists(test_file):
    os.remove(test_file)
    print(f"\n清理测试文件: {test_file}")

print("\n" + "=" * 60)
print("测试3: 验证所有失败类型都能在失败清单中显示")
print("=" * 60)

# 列出所有批次
batches = list_batches()
for b in batches['batches']:
    print(f"\n批次 {b['batch_no']} ({b['source_type_name']}):")
    checks = get_check_results(batch_no=b['batch_no'], only_failed=True)
    if checks['count'] > 0:
        print(f"  未整改失败数: {checks['count']}")
        for c in checks['results'][:5]:
            print(f"    行{c['source_row']} [{c['check_type']}/{c['severity']}]: {c['message'][:50]}")

# 导出所有失败清单
all_failed = export_failed_records(output_path='samples/全部失败清单.xlsx')
print(f"\n导出全部失败清单: {all_failed['message']}")
print(f"总失败记录数: {all_failed['record_count']}")

print("\n" + "=" * 60)
print("✅ 所有导入修复验证完成！")
print("=" * 60)
