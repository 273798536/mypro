#!/usr/bin/env python3
import sys
import os
import subprocess
import re
import pickle
from collections import Counter

sys.path.insert(0, '/Users/mac/pro/solo/workspaces/y12344/src')
os.chdir('/Users/mac/pro/solo/workspaces/y12344')

OUTPUT_DIR = '/Users/mac/pro/solo/workspaces/y12344'
all_results = []

def save_cmd_output(cmd_num, output, stderr, exit_code, success):
    result = {
        'cmd': cmd_num,
        'output': output,
        'stderr': stderr,
        'exit_code': exit_code,
        'success': success
    }
    all_results.append(result)
    
    with open(f'{OUTPUT_DIR}/cmd{cmd_num}_result.txt', 'w', encoding='utf-8') as f:
        f.write(f"命令 {cmd_num}\n")
        f.write("="*60 + "\n")
        f.write(output)
        if stderr:
            f.write("\n--- STDERR ---\n")
            f.write(stderr)
        f.write(f"\n返回码: {exit_code}\n")
        f.write(f"成功: {'是' if success else '否'}\n")

# ========== 命令1: 安装包 ==========
print("执行命令1...")
try:
    r = subprocess.run([sys.executable, '-m', 'pip', 'install', '-e', '.'],
                      capture_output=True, text=True, timeout=120)
    save_cmd_output(1, r.stdout, r.stderr, r.returncode, r.returncode == 0)
except Exception as e:
    save_cmd_output(1, '', str(e), 1, False)

# ========== 命令2: 生成示例数据 ==========
print("执行命令2...")
try:
    from click.testing import CliRunner
    from projectile_estimator.cli import cli
    runner = CliRunner()
    r = runner.invoke(cli, ['template', 'data', '--with-anomalies'])
    stderr = r.stderr_bytes.decode() if r.stderr_bytes else ''
    save_cmd_output(2, r.output, stderr, r.exit_code, r.exit_code == 0)
except Exception as e:
    save_cmd_output(2, '', str(e), 1, False)

# ========== 命令3: 异常检测 ==========
print("执行命令3...")
try:
    r = runner.invoke(cli, [
        'check',
        '-t', 'examples/trajectory_normal.csv',
        '-a', 'examples/angle_with_overflow.csv',
        '-w', 'examples/wind_with_missing.csv'
    ])
    stderr = r.stderr_bytes.decode() if r.stderr_bytes else ''
    save_cmd_output(3, r.output, stderr, r.exit_code, r.exit_code == 0)
except Exception as e:
    save_cmd_output(3, '', str(e), 1, False)

# ========== 命令4: 完整分析 ==========
print("执行命令4...")
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
    stderr = r.stderr_bytes.decode() if r.stderr_bytes else ''
    save_cmd_output(4, r.output, stderr, r.exit_code, r.exit_code == 0)
except Exception as e:
    save_cmd_output(4, '', str(e), 1, False)

# ========== 命令5: 复现角度越界 ==========
print("执行命令5...")
try:
    r = runner.invoke(cli, [
        'reproduce-angle-overflow',
        '-a', 'examples/angle_with_overflow.csv',
        '-t', 'examples/trajectory_normal.csv'
    ])
    stderr = r.stderr_bytes.decode() if r.stderr_bytes else ''
    save_cmd_output(5, r.output, stderr, r.exit_code, r.exit_code == 0)
except Exception as e:
    save_cmd_output(5, '', str(e), 1, False)

# ========== 命令6: 检查报告文件 ==========
print("执行命令6...")
try:
    r = subprocess.run(['ls', '-la', 'reports/test_fix/'],
                      capture_output=True, text=True)
    save_cmd_output(6, r.stdout, r.stderr, r.returncode, r.returncode == 0)
except Exception as e:
    save_cmd_output(6, '', str(e), 1, False)

# ========== 读取报告前60行 ==========
print("读取报告...")
report_path = 'reports/test_fix/analysis_report.txt'
report_content = ""
if os.path.exists(report_path):
    with open(report_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        for i, line in enumerate(lines[:60], 1):
            report_content += f"{i:3d}: {line}"
        report_content += f"\n... (共 {len(lines)} 行，已显示前60行)\n"
    
    with open(f'{OUTPUT_DIR}/report_head.txt', 'w', encoding='utf-8') as f:
        f.write(report_content)

# ========== 验证汇总 ==========
print("生成验证结果...")
summary = []
summary.append("="*60)
summary.append("验证结果汇总")
summary.append("="*60)
summary.append("")

cmd_descs = [
    'python3 -m pip install -e .',
    'python3 -m projectile_estimator.cli template data --with-anomalies',
    'check -t examples/trajectory_normal.csv -a examples/angle_with_overflow.csv -w examples/wind_with_missing.csv',
    'analyze ... -f txt -f html -o reports/test_fix',
    'reproduce-angle-overflow -a examples/angle_with_overflow.csv -t examples/trajectory_normal.csv',
    'ls -la reports/test_fix/'
]

for i, desc in enumerate(cmd_descs, 1):
    res = all_results[i-1] if len(all_results) >= i else None
    if res:
        status = '✅ 通过' if res['success'] else '❌ 失败'
        summary.append(f"命令 {i}: {status} - {desc[:50]}...")
    else:
        summary.append(f"命令 {i}: ❌ 未执行 - {desc[:50]}...")

# 验证异常数量
cmd3_out = all_results[2]['output'] if len(all_results) > 2 else ''
match = re.search(r'检测到\s+(\d+)\s+个异常', cmd3_out)
if match:
    count = match.group(1)
    summary.append(f"\n✅ 异常数量: 检测到 {count} 个异常")
else:
    summary.append("\n⚠️  未检测到异常数量统计")

# 验证去重
match = re.search(r'angle_overflow[:：]\s*(\d+)', cmd3_out)
if match:
    count = match.group(1)
    if count == '1':
        summary.append("✅ 去重验证: angle_overflow 只有1个（去重生效）")
    else:
        summary.append(f"⚠️  去重验证: angle_overflow 有 {count} 个，需要检查")
else:
    summary.append("⚠️  去重验证: 未找到 angle_overflow 统计")

# 验证报告内容
if report_content:
    checks = [
        ('异常数量', '异常' in report_content),
        ('拟合结果', 'R²' in report_content or '拟合' in report_content),
        ('风阻估计', '风阻' in report_content or 'C_d' in report_content),
    ]
    summary.append("\n报告内容验证:")
    for name, passed in checks:
        status = '✅ 通过' if passed else '❌ 失败'
        summary.append(f"  {name}: {status}")

# 检查报告文件
cmd6_out = all_results[5]['output'] if len(all_results) > 5 else ''
summary.append("\n报告文件检查:")
for fname in ['analysis_report.txt', 'analysis_report.html']:
    found = fname in cmd6_out
    status = '✅ 存在' if found else '❌ 缺失'
    summary.append(f"  {fname}: {status}")

summary.append("\n" + "="*60)
summary.append("执行完成！结果已保存到 cmd*_result.txt 文件")
summary.append("="*60)

with open(f'{OUTPUT_DIR}/summary.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(summary))

# 保存所有结果
with open(f'{OUTPUT_DIR}/all_results.pkl', 'wb') as f:
    pickle.dump({'results': all_results, 'report': report_content, 'summary': '\n'.join(summary)}, f)

print("完成！请查看生成的结果文件。")
