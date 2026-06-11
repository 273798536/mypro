#!/usr/bin/env python3
import sys
import os
import subprocess
import re
import pickle

sys.path.insert(0, '/Users/mac/pro/solo/workspaces/y12344/src')
os.chdir('/Users/mac/pro/solo/workspaces/y12344')

output_file = '/Users/mac/pro/solo/workspaces/y12344/full_output.txt'
f = open(output_file, 'w', encoding='utf-8')

results = []

def print_both(text):
    print(text)
    f.write(text + '\n')

# ========== 命令1: 安装包 ==========
print_both("\n" + "="*60)
print_both("命令1: python3 -m pip install -e .")
print_both("="*60)

try:
    r = subprocess.run([sys.executable, '-m', 'pip', 'install', '-e', '.'],
                      capture_output=True, text=True, timeout=120)
    if r.stdout:
        print_both(r.stdout)
    if r.stderr:
        print_both("--- STDERR ---")
        print_both(r.stderr)
    cmd1_success = r.returncode == 0
    print_both(f"\n返回码: {r.returncode}")
    print_both(f"成功: {'✅ 是' if cmd1_success else '❌ 否'}")
except Exception as e:
    print_both(f"异常: {e}")
    cmd1_success = False

results.append({
    'cmd': 1,
    'desc': 'python3 -m pip install -e .',
    'success': cmd1_success,
    'output': r.stdout if 'r' in dir() else '',
    'stderr': r.stderr if 'r' in dir() else str(e)
})

# ========== 命令2: 生成示例数据 ==========
print_both("\n" + "="*60)
print_both("命令2: python3 -m projectile_estimator.cli template data --with-anomalies")
print_both("="*60)

try:
    from click.testing import CliRunner
    from projectile_estimator.cli import cli
    runner = CliRunner()
    r = runner.invoke(cli, ['template', 'data', '--with-anomalies'])
    if r.output:
        print_both(r.output)
    stderr = r.stderr_bytes.decode() if r.stderr_bytes else ''
    if stderr:
        print_both("--- STDERR ---")
        print_both(stderr)
    cmd2_success = r.exit_code == 0
    print_both(f"\n返回码: {r.exit_code}")
    print_both(f"成功: {'✅ 是' if cmd2_success else '❌ 否'}")
except Exception as e:
    print_both(f"异常: {e}")
    cmd2_success = False
    stderr = str(e)

results.append({
    'cmd': 2,
    'desc': 'python3 -m projectile_estimator.cli template data --with-anomalies',
    'success': cmd2_success,
    'output': r.output if 'r' in dir() else '',
    'stderr': stderr
})

# ========== 命令3: 异常检测 ==========
print_both("\n" + "="*60)
print_both("命令3: python3 -m projectile_estimator.cli check -t examples/trajectory_normal.csv -a examples/angle_with_overflow.csv -w examples/wind_with_missing.csv")
print_both("="*60)

try:
    r = runner.invoke(cli, [
        'check',
        '-t', 'examples/trajectory_normal.csv',
        '-a', 'examples/angle_with_overflow.csv',
        '-w', 'examples/wind_with_missing.csv'
    ])
    if r.output:
        print_both(r.output)
    stderr = r.stderr_bytes.decode() if r.stderr_bytes else ''
    if stderr:
        print_both("--- STDERR ---")
        print_both(stderr)
    cmd3_success = r.exit_code == 0
    print_both(f"\n返回码: {r.exit_code}")
    print_both(f"成功: {'✅ 是' if cmd3_success else '❌ 否'}")
except Exception as e:
    print_both(f"异常: {e}")
    cmd3_success = False
    stderr = str(e)

results.append({
    'cmd': 3,
    'desc': 'check -t examples/trajectory_normal.csv -a examples/angle_with_overflow.csv -w examples/wind_with_missing.csv',
    'success': cmd3_success,
    'output': r.output if 'r' in dir() else '',
    'stderr': stderr
})

# ========== 命令4: 完整分析 ==========
print_both("\n" + "="*60)
print_both("命令4: python3 -m projectile_estimator.cli analyze ... -f txt -f html -o reports/test_fix")
print_both("="*60)

try:
    os.makedirs('reports/test_fix', exist_ok=True)
    r = runner.invoke(cli, [
        'analyze',
        '-t', 'examples/trajectory_normal.csv',
        '-a', 'examples/angle_with_overflow.csv',
        '-w', 'examples/wind_with_missing.csv',
        '-f', 'txt', '-f', 'html',
        '-o', 'reports/test_fix'
    ])
    if r.output:
        print_both(r.output)
    stderr = r.stderr_bytes.decode() if r.stderr_bytes else ''
    if stderr:
        print_both("--- STDERR ---")
        print_both(stderr)
    cmd4_success = r.exit_code == 0
    print_both(f"\n返回码: {r.exit_code}")
    print_both(f"成功: {'✅ 是' if cmd4_success else '❌ 否'}")
except Exception as e:
    print_both(f"异常: {e}")
    cmd4_success = False
    stderr = str(e)

results.append({
    'cmd': 4,
    'desc': 'analyze ... -f txt -f html -o reports/test_fix',
    'success': cmd4_success,
    'output': r.output if 'r' in dir() else '',
    'stderr': stderr
})

# ========== 命令5: 复现角度越界 ==========
print_both("\n" + "="*60)
print_both("命令5: python3 -m projectile_estimator.cli reproduce-angle-overflow -a examples/angle_with_overflow.csv -t examples/trajectory_normal.csv")
print_both("="*60)

try:
    r = runner.invoke(cli, [
        'reproduce-angle-overflow',
        '-a', 'examples/angle_with_overflow.csv',
        '-t', 'examples/trajectory_normal.csv'
    ])
    if r.output:
        print_both(r.output)
    stderr = r.stderr_bytes.decode() if r.stderr_bytes else ''
    if stderr:
        print_both("--- STDERR ---")
        print_both(stderr)
    cmd5_success = r.exit_code == 0
    print_both(f"\n返回码: {r.exit_code}")
    print_both(f"成功: {'✅ 是' if cmd5_success else '❌ 否'}")
except Exception as e:
    print_both(f"异常: {e}")
    cmd5_success = False
    stderr = str(e)

results.append({
    'cmd': 5,
    'desc': 'reproduce-angle-overflow -a examples/angle_with_overflow.csv -t examples/trajectory_normal.csv',
    'success': cmd5_success,
    'output': r.output if 'r' in dir() else '',
    'stderr': stderr
})

# ========== 命令6: 检查报告文件 ==========
print_both("\n" + "="*60)
print_both("命令6: ls -la reports/test_fix/")
print_both("="*60)

try:
    r = subprocess.run(['ls', '-la', 'reports/test_fix/'],
                      capture_output=True, text=True)
    if r.stdout:
        print_both(r.stdout)
    if r.stderr:
        print_both("--- STDERR ---")
        print_both(r.stderr)
    cmd6_success = r.returncode == 0
    print_both(f"\n返回码: {r.returncode}")
    print_both(f"成功: {'✅ 是' if cmd6_success else '❌ 否'}")
except Exception as e:
    print_both(f"异常: {e}")
    cmd6_success = False

results.append({
    'cmd': 6,
    'desc': 'ls -la reports/test_fix/',
    'success': cmd6_success,
    'output': r.stdout if 'r' in dir() else '',
    'stderr': r.stderr if 'r' in dir() else str(e)
})

# ========== 读取报告前60行 ==========
print_both("\n" + "="*60)
print_both("读取 reports/test_fix/analysis_report.txt 前60行")
print_both("="*60)

report_path = 'reports/test_fix/analysis_report.txt'
report_content = ""
if os.path.exists(report_path):
    with open(report_path, 'r', encoding='utf-8') as rf:
        lines = rf.readlines()
        for i, line in enumerate(lines[:60], 1):
            print_both(f"{i:3d}: {line.rstrip()}")
            report_content += line
        print_both(f"\n... (共 {len(lines)} 行，已显示前60行)")
else:
    print_both(f"❌ 文件不存在: {report_path}")
    report_content = None

# ========== 验证汇总 ==========
print_both("\n" + "="*60)
print_both("验证结果汇总")
print_both("="*60)

for res in results:
    status = '✅ 通过' if res['success'] else '❌ 失败'
    print_both(f"命令 {res['cmd']}: {status} - {res['desc'][:50]}...")

# 验证异常数量
cmd3_out = results[2]['output'] if len(results) > 2 else ''
match = re.search(r'检测到\s+(\d+)\s+个异常', cmd3_out)
if match:
    count = match.group(1)
    print_both(f"\n✅ 异常数量: 检测到 {count} 个异常")
else:
    print_both("\n⚠️  未检测到异常数量统计")

# 验证去重
match = re.search(r'angle_overflow[:：]\s*(\d+)', cmd3_out)
if match:
    count = match.group(1)
    if count == '1':
        print_both("✅ 去重验证: angle_overflow 只有1个（去重生效）")
    else:
        print_both(f"⚠️  去重验证: angle_overflow 有 {count} 个，需要检查")
else:
    print_both("⚠️  去重验证: 未找到 angle_overflow 统计")

# 验证报告内容
if report_content:
    checks = [
        ('异常数量', '异常' in report_content),
        ('拟合结果', 'R²' in report_content or '拟合' in report_content),
        ('风阻估计', '风阻' in report_content or 'C_d' in report_content),
    ]
    print_both("\n报告内容验证:")
    for name, passed in checks:
        status = '✅ 通过' if passed else '❌ 失败'
        print_both(f"  {name}: {status}")

# 检查报告文件
cmd6_out = results[5]['output'] if len(results) > 5 else ''
print_both("\n报告文件检查:")
for fname in ['analysis_report.txt', 'analysis_report.html']:
    found = fname in cmd6_out
    status = '✅ 存在' if found else '❌ 缺失'
    print_both(f"  {fname}: {status}")

# 保存结果
with open('/Users/mac/pro/solo/workspaces/y12344/results.pkl', 'wb') as pf:
    pickle.dump({'results': results, 'report': report_content}, pf)

print_both("\n" + "="*60)
print_both("执行完成！结果已保存到 full_output.txt")
print_both("="*60)

f.close()
print("\n执行完成，请查看 full_output.txt 文件")
