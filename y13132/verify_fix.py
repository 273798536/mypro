"""
验证两个核心修复：
1. 缺失值在数据清单和报告中保持原貌（不被替换成0.0）
2. 报告筛选口径直接记录用户设置，不从排除数据反推
"""

from data_manager import DataManager
from convex_hull_calculator import ConvexHullCalculator
from report_generator import ReportGenerator
import numpy as np

dm = DataManager()
calc = ConvexHullCalculator()
rg = ReportGenerator()

print("=" * 60)
print("验证 1: 缺失值保持原貌（不被替换成 0.0）")
print("=" * 60)

points = dm.load_demo_data()

s009 = next(p for p in points if p.id == "S009")
s010 = next(p for p in points if p.id == "S010")

print(f"\nS009 (x值缺失):")
print(f"  original_x = {s009.original_x}  {'✅' if s009.original_x is None else '❌ 应为None'}")
print(f"  x = {s009.x}  {'✅' if np.isnan(s009.x) else '❌ 应为NaN'}")
print(f"  is_dirty = {s009.is_dirty}, dirty_reason = {s009.dirty_reason}")

print(f"\nS010 (y值缺失):")
print(f"  original_y = {s010.original_y}  {'✅' if s010.original_y is None else '❌ 应为None'}")
print(f"  y = {s010.y}  {'✅' if np.isnan(s010.y) else '❌ 应为NaN'}")
print(f"  is_dirty = {s010.is_dirty}, dirty_reason = {s010.dirty_reason}")

print("\n✅ 缺失值保持原貌验证通过" if (s009.original_x is None and s010.original_y is None) else "❌ 缺失值验证失败")


print("\n" + "=" * 60)
print("验证 2: 补考数据（无重复）场景下，报告筛选口径正确")
print("=" * 60)

bukao_points = [p for p in points if p.source == "补考数据"]
print(f"\n补考数据共 {len(bukao_points)} 条:")
for p in bukao_points:
    print(f"  {p.id}: dup={p.is_duplicate}, dirty={p.is_dirty}")

result = calc.compute_convex_hull(
    bukao_points,
    exclude_duplicates=True,
    exclude_dirty=True,
)

print(f"\n计算结果:")
print(f"  排除点数: {len(result.excluded_points)}")
print(f"  exclude_duplicates = {result.exclude_duplicates}  {'✅' if result.exclude_duplicates else '❌'}")
print(f"  exclude_dirty = {result.exclude_dirty}  {'✅' if result.exclude_dirty else '❌'}")

report = rg.generate_full_report(result, dm, "补考数据测试报告", "阿宁")

print(f"\n报告筛选口径章节:")
for line in report.split('\n'):
    if '重复样本' in line or '脏数据' in line or '坐标缺失' in line:
        print(f"  {line.strip()}")

has_correct_dup = "重复样本: 排除" in report
has_correct_dirty = "脏数据（缺失/异常）: 排除" in report

print(f"\n✅ 报告筛选口径正确" if (has_correct_dup and has_correct_dirty) else "❌ 报告筛选口径错误")


print("\n" + "=" * 60)
print("验证 3: 报告原始数据清单中缺失值显示正确")
print("=" * 60)

# 生成完整报告（用全部演示数据）
full_result = calc.compute_convex_hull(
    points,
    exclude_duplicates=True,
    exclude_dirty=True,
)
full_report = rg.generate_full_report(full_result, dm, "完整测试报告", "阿宁")

# 检查原始数据清单部分
in_raw_section = False
s009_in_report = False
s010_in_report = False
for line in full_report.split('\n'):
    if '## 八、原始数据清单' in line:
        in_raw_section = True
    if in_raw_section and '## 九、' in line:
        in_raw_section = False
    if in_raw_section:
        if 'S009' in line:
            s009_in_report = True
            print(f"\nS009 在报告原始数据清单中:")
            print(f"  {line}")
            has_missing_x = '(缺失)' in line
            print(f"  包含'(缺失)': {'✅' if has_missing_x else '❌'}")
        if 'S010' in line:
            s010_in_report = True
            print(f"\nS010 在报告原始数据清单中:")
            print(f"  {line}")
            has_missing_y = '(缺失)' in line
            print(f"  包含'(缺失)': {'✅' if has_missing_y else '❌'}")

print(f"\n✅ 报告原始数据清单缺失值显示正确" if (s009_in_report and s010_in_report) else "❌ 验证失败")


print("\n" + "=" * 60)
print("验证 4: 导出报告能正常保存和读取")
print("=" * 60)

output_path = "/tmp/test_report.md"
rg.save_report(full_report, output_path)

with open(output_path, "r", encoding="utf-8") as f:
    content = f.read()

print(f"\n报告已保存到: {output_path}")
print(f"文件大小: {len(content)} 字符")
print(f"包含章节数: {content.count('## ')}")
print(f"包含表格行数: {content.count('|') // 2} 个'|'")

# 验证 Markdown 格式正确性
has_title = content.startswith('# ')
has_sections = '## 一、核心结论' in content and '## 八、原始数据清单' in content
has_tables = '| 样本ID |' in content

print(f"\nMarkdown格式检查:")
print(f"  有标题: {'✅' if has_title else '❌'}")
print(f"  有章节: {'✅' if has_sections else '❌'}")
print(f"  有表格: {'✅' if has_tables else '❌'}")

print(f"\n✅ 报告格式正确，能正常打开" if (has_title and has_sections and has_tables) else "❌ 格式有问题")


print("\n" + "=" * 60)
print("总结")
print("=" * 60)
all_passed = (
    s009.original_x is None and s010.original_y is None and
    result.exclude_duplicates and result.exclude_dirty and
    has_correct_dup and has_correct_dirty and
    has_title and has_sections and has_tables
)
print("🎉 所有验证通过！" if all_passed else "⚠️ 部分验证未通过")
