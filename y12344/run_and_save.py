#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, '/Users/mac/pro/solo/workspaces/y12344/src')
os.chdir('/Users/mac/pro/solo/workspaces/y12344')

log_file = '/Users/mac/pro/solo/workspaces/y12344/execution_output.log'
f = open(log_file, 'w', encoding='utf-8')
old_stdout = sys.stdout
old_stderr = sys.stderr
sys.stdout = f
sys.stderr = f

try:
    import subprocess
    import pickle
    import re
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

    # 命令1
    def cmd1():
        r = subprocess.run([sys.executable, '-m', 'pip', 'install', '-e', '.'],
                          capture_output=True, text=True, timeout=120)
        return r.stdout, r.stderr, r.returncode
    run_cmd(1, 'python3 -m pip install -e .', cmd1)

    # 命令2
    def cmd2():
        r = runner.invoke(cli, ['template', 'data', '--with-anomalies'])
        stderr = r.stderr_bytes.decode() if r.stderr_bytes else ''
        return r.output, stderr, r.exit_code
    run_cmd(2, 'python3 -m projectile_estimator.cli template data --with-anomalies', cmd2)

    # 命令3
    def cmd3():
        r = runner.invoke(cli, [
            'check',
            '-t', 'examples/trajectory_normal.csv',
            '-a', 'examples/angle_with_overflow.csv',
            '-w', 'examples/wind_with_missing.csv'
        ])
        stderr = r.stderr_bytes.decode() if r.stderr_bytes else ''
        return r.output, stderr, r.exit_code
    run_cmd(3, 'check -t examples/trajectory_normal.csv -a examples/angle_with_overflow.csv -w examples/wind_with_missing.csv', cmd3)

    # 命令4
    def cmd4():
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

    # 命令5
    def cmd5():
        r = runner.invoke(cli, [
            'reproduce-angle-overflow',
            '-a', 'examples/angle_with_overflow.csv',
            '-t', 'examples/trajectory_normal.csv'
        ])
        stderr = r.stderr_bytes.decode() if r.stderr_bytes else ''
        return r.output, stderr, r.exit_code
    run_cmd(5, 'reproduce-angle-overflow -a examples/angle_with_overflow.csv -t examples/trajectory_normal.csv', cmd5)

    # 命令6
    def cmd6():
        r = subprocess.run(['ls', '-la', 'reports/test_fix/'],
                          capture_output=True, text=True)
        return r.stdout, r.stderr, r.returncode
    run_cmd(6, 'ls -la reports/test_fix/', cmd6)

    # 读取报告
    print(f"\n{'='*60}")
    print("读取 reports/test_fix/analysis_report.txt 前60行")
    print(f"{'='*60}\n")

    report_path = 'reports/test_fix/analysis_report.txt'
    report_content = ""
    if os.path.exists(report_path):
        with open(report_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            for i, line in enumerate(lines[:60], 1):
                print(f"{i:3d}: {line}", end='')
                report_content += line
        print(f"\n... (共 {len(lines)} 行)")
    else:
        print(f"❌ 文件不存在: {report_path}")
        report_content = None

    # 保存结果
    with open('all_results.pkl', 'wb') as pf:
        pickle.dump({'results': all_results, 'report': report_content}, pf)

    with open('all_results.txt', 'w', encoding='utf-8') as tf:
        for r in all_results:
            tf.write(f"\n{'='*60}\n")
            tf.write(f"命令 {r['cmd']}: {r['desc']}\n")
            tf.write(f"{'='*60}\n")
            tf.write(r['output'])
            if r['stderr']:
                tf.write("\n--- STDERR ---\n")
                tf.write(r['stderr'])
            tf.write(f"\n返回码: {r['exit_code']}\n")
            tf.write(f"成功: {'是' if r['success'] else '否'}\n")
        
        if report_content:
            tf.write(f"\n{'='*60}\n")
            tf.write("analysis_report.txt 前60行:\n")
            tf.write(f"{'='*60}\n")
            tf.write(report_content)

    # 验证汇总
    print(f"\n{'='*60}")
    print("验证结果汇总")
    print(f"{'='*60}\n")

    for r in all_results:
        status = '✅ 通过' if r['success'] else '❌ 失败'
        print(f"命令 {r['cmd']}: {status} - {r['desc'][:50]}...")

    cmd3_out = all_results[2]['output'] if len(all_results) > 2 else ''
    match = re.search(r'检测到\s+(\d+)\s+个异常', cmd3_out)
    if match:
        count = match.group(1)
        print(f"\n✅ 异常数量: 检测到 {count} 个异常")

    match = re.search(r'angle_overflow[:：]\s*(\d+)', cmd3_out)
    if match and match.group(1) == '1':
        print("✅ 去重验证: angle_overflow 只有1个（去重生效）")

    if report_content:
        print("\n报告内容验证:")
        print(f"  异常数量: {'✅ 通过' if '异常' in report_content else '❌ 失败'}")
        print(f"  拟合结果: {'✅ 通过' if ('R²' in report_content or '拟合' in report_content) else '❌ 失败'}")
        print(f"  风阻估计: {'✅ 通过' if ('风阻' in report_content or 'C_d' in report_content) else '❌ 失败'}")

    cmd6_out = all_results[5]['output'] if len(all_results) > 5 else ''
    for fname in ['analysis_report.txt', 'analysis_report.html']:
        found = fname in cmd6_out
        print(f"  {fname}: {'✅ 存在' if found else '❌ 缺失'}")

    print(f"\n{'='*60}")
    print("执行完成！")
    print(f"{'='*60}\n")

finally:
    sys.stdout = old_stdout
    sys.stderr = old_stderr
    f.close()
    print("执行完成，输出已保存到 execution_output.log")
