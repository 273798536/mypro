from main import IntegrationErrorPanel
import os
import warnings
warnings.filterwarnings('ignore')

print("=" * 70)
print("  积分近似误差分析面板 - 快速测试")
print("=" * 70)
print()

panel = IntegrationErrorPanel()

data_id = panel.submit_calculation('exp(x)', 0, 1, 8)
print()

panel.update_exact_value(
    data_id, 1.718281828459045, '解析积分 e - 1',
    changed_by='李助教', comment='补录精确值'
)
print()

output = panel.generate_outputs(data_id)
print()

print("=" * 70)
print("  输出文件清单")
print("=" * 70)
print(f"  报告: {output['report_file']}")
print(f"  图表:")
for name, path in output['charts'].items():
    print(f"    - {name}: {path}")
print(f"  数据文件:")
print(f"    - JSON: {output['json_file']}")
for name, path in output['csv_files'].items():
    print(f"    - CSV ({name}): {path}")
print()

print("=" * 70)
print("  数据状态")
print("=" * 70)
status = panel.get_status(data_id)
for k, v in status.items():
    print(f"  {k}: {v}")
print()

print("=" * 70)
print("  查看生成的报告前30行")
print("=" * 70)
with open(output['report_file'], 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i < 30:
            print(line.rstrip())
        else:
            break
print("  ... (更多内容请查看完整报告)")
print()

print("=" * 70)
print("  测试其他特殊案例")
print("=" * 70)

test_cases = [
    ('步长过大', 'sin(10*x)', 0, 1, 4, (1 - __import__('numpy').cos(10)) / 10),
    ('区间反向', 'x**2', 2, 0, 8, -8/3),
    ('奇点附近', '1/sqrt(x)', 0, 1, 16, 2),
]

for name, expr, a, b, n, exact in test_cases:
    print(f"\n【{name}】 f(x) = {expr}, [{a}, {b}], n={n}")
    tid = panel.submit_calculation(expr, a, b, n)
    panel.update_exact_value(tid, exact, '解析积分', changed_by='测试')
    tstatus = panel.get_status(tid)
    print(f"  状态: {tstatus['status']}")
    print(f"  建议动作: {tstatus['action']}")

print()
print("测试完成！")
