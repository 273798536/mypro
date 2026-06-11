#!/usr/bin/env python3
"""导出链路收尾验证脚本 —— 验证报告与数据库对齐"""
import sys
import re

sys.path.insert(0, ".")
from app import storage

storage.init_db()

print("=" * 72)
print("✅ 验证 1：报告中的预警编号（确认不再重复）")
print("=" * 72)
report_path = sorted([
    f for f in __import__("os").listdir("reports")
    if f.startswith("warning_report_20260609-01_CLEAN_")
])[-1]
report_path = f"reports/{report_path}"
print(f"报告文件: {report_path}")
with open(report_path) as f:
    content = f.read()
report_codes = re.findall(r'^\|\s*\d+\s*\|\s*(RW-\S+)\s*\|', content, re.M)
for i, code in enumerate(report_codes):
    print(f"  [{i+1}] {code}")
if len(report_codes) == len(set(report_codes)):
    print("✅ 报告内编号无重复")
else:
    seen = {}
    for i, c in enumerate(report_codes):
        seen.setdefault(c, []).append(i+1)
    dup = {k: v for k, v in seen.items() if len(v) > 1}
    print(f"❌ 报告内编号重复: {dup}")

print()
print("=" * 72)
print("✅ 验证 2：数据库预警ID ↔ 编号映射（确认一一对应）")
print("=" * 72)
codes = {}
for w in storage.get_all_warnings():
    codes.setdefault(w.warning_code, []).append(w.id)
    print(f"  预警ID={w.id:3d}  →  编号={w.warning_code:25s}  →  {w.description[:50]}")
dup = {k: v for k, v in codes.items() if len(v) > 1}
if dup:
    print(f"❌ 数据库中编号重复: {dup}")
else:
    print("✅ 数据库中所有预警编号全局唯一，无重复")

print()
print("=" * 72)
print("✅ 验证 3：报告 ↔ 数据库 编号对照（逐条比对）")
print("=" * 72)
db_codes = set(codes.keys())
report_codes_set = set(report_codes)
missing = db_codes - report_codes_set
extra = report_codes_set - db_codes
print(f"  数据库中编号 {len(db_codes)} 个: {sorted(db_codes)}")
print(f"  报告中编号 {len(report_codes_set)} 个: {sorted(report_codes_set)}")
if not missing and not extra:
    print("✅ 报告编号与数据库完全一致，无缺漏无多余")
else:
    if missing:
        print(f"❌ 报告缺少数据库中的编号: {missing}")
    if extra:
        print(f"❌ 报告多出数据库中不存在的编号: {extra}")

print()
print("=" * 72)
print("✅ 验证 4：Markdown 格式可正常解析（章节编号连续）")
print("=" * 72)
sections = re.findall(r'^##\s+([一二三四五六七八九十]+)、', content, re.M)
expected = ["一", "二", "三", "四", "五", "六", "七"]
print(f"  报告中找到章节: {sections}")
if sections == expected:
    print("✅ 章节编号一~七连续")
else:
    print(f"❌ 章节编号不连续！期望 {expected}，实际 {sections}")

print()
print("=" * 72)
print("✅ 验证 5：导出前一致性检查标记")
print("=" * 72)
m = re.search(r'导出前一致性检查:\s*([^\n]+)', content)
if m:
    mark = m.group(1).strip()
    print(f"  标记: {mark}")
    if "✅ PASS" in mark:
        print("✅ 报告头部一致性标记为 ✅ PASS")
    else:
        print("❌ 报告头部一致性标记不正确")

print()
print("=" * 72)
print("✅ 验证 6：未闭环章节（第六节）内容")
print("=" * 72)
m = re.search(r'## 六、⚠️ 未闭环问题.*?\n([\s\S]*?)(?=\n## 七|$)', content)
if m:
    sec6 = m.group(1).strip()
    print(f"  第六节内容前100字: {sec6[:100]}")
    if "(无)" in sec6:
        print("✅ 第六节显示 (无) —— 本批次全闭环")
    else:
        print("❌ 第六节还有未闭环项！")

print()
print("=" * 72)
print("  全部验证完成")
print("=" * 72)
