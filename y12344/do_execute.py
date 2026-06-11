#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import os
import subprocess
import pickle
import re

sys.path.insert(0, '/Users/mac/pro/solo/workspaces/y12344/src')
os.chdir('/Users/mac/pro/solo/workspaces/y12344')

from click.testing import CliRunner
from projectile_estimator.cli import cli

runner = CliRunner()
all_results = []

def run_cmd(cmd_num, desc, func):
    print(f"\n{'='*60}")
    print(f"命令 {cmd_num}: {desc}")
    print(f"{'='*60}\n")
    try:
        output, stderr, exit_code = func()
        success = (exit_code == 0 or exit_code is None)
    except Exception as e:
        output = ""
        stderr = str(e)
        exit_code = 1
        success = False
    
    if output:
        print(output)
    if stderr:
        print("--- STDERR ---")
        print(stderr)
    print(f"\n返回码: {exit_code}")
    print(f"成功: {'✅ 是' if success else '❌ 否'}")
    
    result = {
        'cmd': cmd_num, 'desc': desc,
        'output': output, 'stderr': stderr,
        'exit_code': exit_code, 'success': success
    }
    all_results.append(result)
    return result

# ========== 命令1 ==========
def cmd1():
    r = subprocess.run([sys.executable, '-m', 'pip', 'install', '-e', '.'],
                      capture_output=True, text=True, timeout=120)
    return r.stdout, r.stderr, r.returncode

run_cmd(1, 'python3 -m pip install -e .', cmd1)

# ========== 命令2 ==========
def cmd2():
    os.chdir('/Users/mac/pro/solo/workspaces/y12344')
    r = runner.invoke(cli, ['template', 'data', '--with-anomalies'])
    stderr = r.stderr_bytes.decode() if r.stderr_bytes else ''
    return r.output, stderr, r.exit_code

run_cmd(2, 'python3 -m projectile_estimator.cli template data --with-anomalies', cmd2)

# ========== 命令3 ==========
def cmd3():
    os.chdir('/Users/mac/pro/solo/workspaces/y12344')
    r = runner.invoke(cli, [
        'check',
        '-t', 'examples/trajectory_normal.csv',
        '-a', 'examples/angle_with_overflow.csv',
        '-w', 'examples/wind_with_missing.csv'
    ])
    stderr = r.stderr_bytes.decode() if r.stderr_bytes else ''
    return r.output, stderr, r.exit_code

run_cmd(3, 'check -t examples/trajectory_normal.csv -a examples/angle_with_overflow.csv -w examples/wind_with_missing.csv', cmd3)

# ========== 命令4 ==========
def cmd4():
    os.chdir('/Users/mac/pro/solo/workspaces/y12344')
    os.makedirs('reports/test_fix', exist_ok=True)
    r = runner.invoke(cli, [
        'analyze',
        '-t', 'examples/trajectory_normal.csv',
        '-a', 'examples/angle_with_overflow.csv',
        '-w', 'examples/wind_with_missing.csv',
        '-f', 'txt', '-f', 'html',
        '-o', 'reports/test_fix'
    ])
    stderr = r.stderr_bytes.decode() if r.stderr_bytes else ''
    return r.output, stderr, r.exit_code

run_cmd(4, 'analyze ... -f txt -f html -o reports/test_fix', cmd4)

# ========== 命令5 ==========
def cmd5():
    os.chdir('/Users/mac/pro/solo/workspaces/y12344')
    r = runner.invoke(cli, [
        'reproduce-angle-overflow',
        '-a', 'examples/angle_with_overflow.csv',
        '-t', 'examples/trajectory_normal.csv'
    ])
    stderr = r.stderr_bytes.decode() if r.stderr_bytes else ''
    return r.output, stderr, r.exit_code

run_cmd(5, 'reproduce-angle-overflow -a examples/angle_with_overflow.csv -t examples/trajectory_normal.csv', cmd5)

# ========== 命令6 ==========
def cmd6():
    r = subprocess.run(['ls', '-la', 'reports/test_fix/'],
                      capture_output=True, text=True)
    return r.stdout, r.stderr, r.returncode

run_cmd(6, 'ls -la reports/test_fix/', cmd6)

# ========== 读取报告 ==========
print(f"\n{'='*60}")
print("读取 reports/test_fix/analysis_report.txt 前60行")
print(f"{'='*60}\n")

report_path = 'reports/test_fix/analysis_report.txt'
report_content = ""
report_lines = []
if os.path.exists(report_path):
    with open(report_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        report_lines = lines
        for i, line in enumerate(lines[:60], 1):
            print(f"{i:3d}: {line}", end='')
            report_content += line
    print(f"\n... (共 {len(lines)} 行)")
else:
    print(f"❌ 文件不存在: {report_path}")
    report_content = None

# ========== 保存结果 ==========
with open('all_results.pkl', 'wb') as f:
    pickle.dump({'results': all_results, 'report': report_content}, f)

with open('all_results.txt', 'w', encoding='utf-8') as f:
    for r in all_results:
        f.write(f"\n{'='*60}\n")
        f.write(f"命令 {r['cmd']}: {r['desc']}\n")
        f.write(f"{'='*60}\n")
        f.write(r['output'])
        if r['stderr']:
            f.write("\n--- STDERR ---\n")
            f.write(r['stderr'])
        f.write(f"\n返回码: {r['exit_code']}\n")
        f.write(f"成功: {'是' if r['success'] else '否'}\n")
    
    if report_content:
        f.write(f"\n{'='*60}\n")
        f.write("analysis_report.txt 前60行:\n")
        f.write(f"{'='*60}\n")
        f.write(report_content)

# ========== 验证汇总 ==========
print(f"\n{'='*60}")
print("验证结果汇总")
print(f"{'='*60}\n")

for r in all_results:
    status = '✅ 通过' if r['success'] else '❌ 失败'
    print(f"命令 {r['cmd']}: {status} - {r['desc'][:50]}...")

# 验证异常数量
cmd3_out = all_results[2]['output'] if len(all_results) > 2 else ''
match = re.search(r'检测到\s+(\d+)\s+个异常', cmd3_out)
if match:
    count = match.group(1)
    print(f"\n✅ 异常数量: 检测到 {count} 个异常")
else:
    print("\n⚠️  未检测到异常数量统计")

# 验证去重
match = re.search(r'angle_overflow[:：]\s*(\d+)', cmd3_out)
if match:
    count = match.group(1)
    if count == '1':
        print("✅ 去重验证: angle_overflow 只有1个（去重生效）")
    else:
        print(f"⚠️  angle_overflow 有 {count} 个")
else:
    print("⚠️  未找到 angle_overflow 统计")

# 验证报告
if report_content:
    checks = [
        ('异常数量', '异常' in report_content),
        ('拟合结果', 'R²' in report_content or '拟合' in report_content),
        ('风阻估计', '风阻' in report_content or 'C_d' in report_content),
    ]
    print("\n报告内容验证:")
    for name, passed in checks:
        print(f"  {name}: {'✅ 通过' if passed else '❌ 失败'}")

# 检查报告文件
cmd6_out = all_results[5]['output'] if len(all_results) > 5 else ''
for fname in ['analysis_report.txt', 'analysis_report.html']:
    found = fname in cmd6_out
    print(f"  {fname}: {'✅ 存在' if found else '❌ 缺失'}")

print(f"\n{'='*60}")
print("执行完成！结果已保存到 all_results.txt")
print(f"{'='*60}\n")
