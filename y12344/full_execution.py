#!/usr/bin/env python3
import sys
import os
import subprocess
from io import StringIO
from collections import Counter

sys.path.insert(0, '/Users/mac/pro/solo/workspaces/y12344/src')
os.chdir('/Users/mac/pro/solo/workspaces/y12344')

results = []

def save_result(cmd_num, cmd_desc, output, stderr, exit_code, success):
    result = {
        'cmd_num': cmd_num,
        'cmd_desc': cmd_desc,
        'output': output,
        'stderr': stderr,
        'exit_code': exit_code,
        'success': success
    }
    results.append(result)
    
    print(f"\n{'=' * 60}")
    print(f"命令 {cmd_num}: {cmd_desc}")
    print(f"{'=' * 60}\n")
    if output:
        print(output)
    if stderr:
        print("--- STDERR ---")
        print(stderr)
    print(f"\n返回码: {exit_code}")
    print(f"成功: {'✅ 是' if success else '❌ 否'}")
    
    with open(f'/Users/mac/pro/solo/workspaces/y12344/cmd{cmd_num}_output.txt', 'w') as f:
        f.write(output)
        if stderr:
            f.write("\n--- STDERR ---")
            f.write(stderr)
        f.write(f"\n返回码: {exit_code}\n")
        f.write(f"成功: {'是' if success else '否'}\n")

# 命令1: 安装包
print("执行命令1...")
try:
    result = subprocess.run(
        [sys.executable, '-m', 'pip', 'install', '-e', '.'],
        capture_output=True, text=True,
        cwd='/Users/mac/pro/solo/workspaces/y12344',
        timeout=120
    )
    save_result(1, 'python3 -m pip install -e .', 
                result.stdout, result.stderr, 
                result.returncode, result.returncode == 0)
except Exception as e:
    save_result(1, 'python3 -m pip install -e .', 
                '', str(e), 1, False)

# 命令2: 生成示例数据
print("\n执行命令2...")
try:
    from click.testing import CliRunner
    from projectile_estimator.cli import cli
    
    runner = CliRunner()
    old_cwd = os.getcwd()
    os.chdir('/Users/mac/pro/solo/workspaces/y12344')
    
    result = runner.invoke(cli, ['template', 'data', '--with-anomalies'])
    os.chdir(old_cwd)
    
    stderr_out = result.stderr_bytes.decode() if result.stderr_bytes else ''
    save_result(2, 'python3 -m projectile_estimator.cli template data --with-anomalies',
                result.output, stderr_out,
                result.exit_code, result.exit_code == 0)
except Exception as e:
    save_result(2, 'python3 -m projectile_estimator.cli template data --with-anomalies',
                '', str(e), 1, False)

# 命令3: 异常检测
print("\n执行命令3...")
try:
    from click.testing import CliRunner
    from projectile_estimator.cli import cli
    
    runner = CliRunner()
    old_cwd = os.getcwd()
    os.chdir('/Users/mac/pro/solo/workspaces/y12344')
    
    result = runner.invoke(cli, [
        'check',
        '-t', 'examples/trajectory_normal.csv',
        '-a', 'examples/angle_with_overflow.csv',
        '-w', 'examples/wind_with_missing.csv'
    ])
    os.chdir(old_cwd)
    
    stderr_out = result.stderr_bytes.decode() if result.stderr_bytes else ''
    save_result(3, 'python3 -m projectile_estimator.cli check -t examples/trajectory_normal.csv -a examples/angle_with_overflow.csv -w examples/wind_with_missing.csv',
                result.output, stderr_out,
                result.exit_code, result.exit_code == 0)
except Exception as e:
    save_result(3, 'python3 -m projectile_estimator.cli check ...',
                '', str(e), 1, False)

# 命令4: 完整分析
print("\n执行命令4...")
try:
    from click.testing import CliRunner
    from projectile_estimator.cli import cli
    
    os.makedirs('/Users/mac/pro/solo/workspaces/y12344/reports/test_fix', exist_ok=True)
    
    runner = CliRunner()
    old_cwd = os.getcwd()
    os.chdir('/Users/mac/pro/solo/workspaces/y12344')
    
    result = runner.invoke(cli, [
        'analyze',
        '-t', 'examples/trajectory_normal.csv',
        '-a', 'examples/angle_with_overflow.csv',
        '-w', 'examples/wind_with_missing.csv',
        '-f', 'txt', '-f', 'html',
        '-o', 'reports/test_fix'
    ])
    os.chdir(old_cwd)
    
    stderr_out = result.stderr_bytes.decode() if result.stderr_bytes else ''
    save_result(4, 'python3 -m projectile_estimator.cli analyze ... -o reports/test_fix',
                result.output, stderr_out,
                result.exit_code, result.exit_code == 0)
except Exception as e:
    save_result(4, 'python3 -m projectile_estimator.cli analyze ...',
                '', str(e), 1, False)

# 命令5: 复现角度越界
print("\n执行命令5...")
try:
    from click.testing import CliRunner
    from projectile_estimator.cli import cli
    
    runner = CliRunner()
    old_cwd = os.getcwd()
    os.chdir('/Users/mac/pro/solo/workspaces/y12344')
    
    result = runner.invoke(cli, [
        'reproduce-angle-overflow',
        '-a', 'examples/angle_with_overflow.csv',
        '-t', 'examples/trajectory_normal.csv'
    ])
    os.chdir(old_cwd)
    
    stderr_out = result.stderr_bytes.decode() if result.stderr_bytes else ''
    save_result(5, 'python3 -m projectile_estimator.cli reproduce-angle-overflow ...',
                result.output, stderr_out,
                result.exit_code, result.exit_code == 0)
except Exception as e:
    save_result(5, 'python3 -m projectile_estimator.cli reproduce-angle-overflow ...',
                '', str(e), 1, False)

# 命令6: 检查报告文件
print("\n执行命令6...")
try:
    result = subprocess.run(
        ['ls', '-la', 'reports/test_fix/'],
        capture_output=True, text=True,
        cwd='/Users/mac/pro/solo/workspaces/y12344'
    )
    save_result(6, 'ls -la reports/test_fix/',
                result.stdout, result.stderr,
                result.returncode, result.returncode == 0)
except Exception as e:
    save_result(6, 'ls -la reports/test_fix/',
                '', str(e), 1, False)

# 读取报告前60行
print(f"\n{'=' * 60}")
print("读取 reports/test_fix/analysis_report.txt 前60行")
print(f"{'=' * 60}\n")

report_path = '/Users/mac/pro/solo/workspaces/y12344/reports/test_fix/analysis_report.txt'
report_content = ""
report_lines = []
try:
    with open(report_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        report_lines = lines
        for i, line in enumerate(lines[:60], 1):
            print(f"{i:3d}: {line}", end='')
            report_content += line
    print(f"\n... (共 {len(lines)} 行，已显示前60行)")
except FileNotFoundError:
    print(f"❌ 文件不存在: {report_path}")
    report_content = None

# 保存完整结果
print(f"\n{'=' * 60}")
print("保存完整结果到 final_results.txt")
print(f"{'=' * 60}\n")

with open('/Users/mac/pro/solo/workspaces/y12344/final_results.txt', 'w', encoding='utf-8') as f:
    for r in results:
        f.write(f"\n{'=' * 60}\n")
        f.write(f"命令 {r['cmd_num']}: {r['cmd_desc']}\n")
        f.write(f"{'=' * 60}\n")
        f.write(r['output'])
        if r['stderr']:
            f.write("\n--- STDERR ---\n")
            f.write(r['stderr'])
        f.write(f"\n返回码: {r['exit_code']}\n")
        f.write(f"成功: {'是' if r['success'] else '否'}\n\n")
    
    if report_content:
        f.write(f"\n{'=' * 60}\n")
        f.write("reports/test_fix/analysis_report.txt 前60行:\n")
        f.write(f"{'=' * 60}\n")
        f.write(report_content)

# 验证汇总
print(f"\n{'=' * 60}")
print("验证结果汇总")
print(f"{'=' * 60}\n")

for r in results:
    status = '✅ 通过' if r['success'] else '❌ 失败'
    print(f"命令 {r['cmd_num']}: {status} - {r['cmd_desc'][:60]}...")

# 验证异常数量
cmd3_output = results[2]['output'] if len(results) > 2 else ''
if '检测到 3 个异常' in cmd3_output or '共 3 个异常' in cmd3_output:
    print("\n✅ 异常数量验证: 检测到3个异常")
elif '检测到 2 个异常' in cmd3_output:
    print("\n✅ 异常数量验证: 检测到2个异常（角度越界1 + 风速缺测1）")
else:
    # 提取异常数量
    import re
    match = re.search(r'检测到\s+(\d+)\s+个异常', cmd3_output)
    if match:
        print(f"\n⚠️  异常数量: 检测到 {match.group(1)} 个异常")
    else:
        print(f"\n⚠️  异常数量需要检查")

# 验证去重
if 'angle_overflow: 1' in cmd3_output or 'angle_overflow: 1 个' in cmd3_output:
    print("✅ 去重验证: angle_overflow 只有1个（去重生效）")
else:
    import re
    match = re.search(r'angle_overflow[:：]\s*(\d+)', cmd3_output)
    if match:
        count = match.group(1)
        if count == '1':
            print("✅ 去重验证: angle_overflow 只有1个（去重生效）")
        else:
            print(f"⚠️  去重验证: angle_overflow 有 {count} 个，需要检查")
    else:
        print("⚠️  去重验证: 未找到 angle_overflow 统计")

# 验证报告内容
if report_content:
    checks = [
        ('异常数量', '异常' in report_content or 'anomalies' in report_content.lower()),
        ('拟合结果', 'R²' in report_content or '拟合' in report_content or 'r_squared' in report_content.lower()),
        ('风阻估计', '风阻' in report_content or 'drag' in report_content.lower() or 'C_d' in report_content),
    ]
    print("\n报告内容验证:")
    for name, passed in checks:
        status = '✅ 通过' if passed else '❌ 失败'
        print(f"  {name}: {status}")

# 检查报告文件
cmd6_output = results[5]['output'] if len(results) > 5 else ''
expected_files = ['analysis_report.txt', 'analysis_report.html']
print("\n报告文件检查:")
for fname in expected_files:
    found = fname in cmd6_output
    status = '✅ 存在' if found else '❌ 缺失'
    print(f"  {fname}: {status}")

print(f"\n{'=' * 60}")
print("执行完成！结果已保存到 final_results.txt")
print(f"{'=' * 60}\n")
