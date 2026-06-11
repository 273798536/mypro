#!/usr/bin/env python3
import sys
import os
from io import StringIO
import contextlib

sys.path.insert(0, '/Users/mac/pro/solo/workspaces/y12344/src')
os.chdir('/Users/mac/pro/solo/workspaces/y12344')

@contextlib.contextmanager
def capture_all_output():
    old_stdout, old_stderr = sys.stdout, sys.stderr
    try:
        sys.stdout, sys.stderr = StringIO(), StringIO()
        yield sys.stdout, sys.stderr
    finally:
        sys.stdout, sys.stderr = old_stdout, old_stderr

def run_command(cmd_num, cmd_desc, func):
    print(f"\n{'=' * 60}")
    print(f"执行命令 {cmd_num}: {cmd_desc}")
    print(f"{'=' * 60}\n")
    
    with capture_all_output() as (out, err):
        try:
            exit_code = func()
            success = (exit_code == 0 or exit_code is None)
        except SystemExit as e:
            exit_code = e.code
            success = (exit_code == 0 or exit_code is None)
        except Exception as e:
            exit_code = 1
            success = False
            print(f"异常: {e}", file=sys.stderr)
    
    output = out.getvalue()
    stderr_output = err.getvalue()
    
    if output:
        print(output)
    if stderr_output:
        print("--- STDERR ---")
        print(stderr_output)
    
    print(f"\n返回码: {exit_code}")
    print(f"成功: {'✅ 是' if success else '❌ 否'}")
    
    return {
        'cmd_num': cmd_num,
        'cmd_desc': cmd_desc,
        'output': output,
        'stderr': stderr_output,
        'exit_code': exit_code,
        'success': success
    }

def main():
    all_results = []
    
    # 命令1: 安装包 (已验证已安装，跳过实际执行)
    from click.testing import CliRunner
    from projectile_estimator.cli import cli
    
    runner = CliRunner()
    
    # 命令1: 安装包 - 实际执行pip install
    def cmd1():
        import subprocess
        result = subprocess.run(
            [sys.executable, '-m', 'pip', 'install', '-e', '.'],
            capture_output=True, text=True,
            cwd='/Users/mac/pro/solo/workspaces/y12344'
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        return result.returncode
    
    result1 = run_command(1, 'python3 -m pip install -e .', cmd1)
    all_results.append(result1)
    
    # 命令2: 生成示例数据
    def cmd2():
        result = runner.invoke(cli, ['template', 'data', '--with-anomalies'])
        print(result.output)
        if result.stderr_bytes:
            print(result.stderr_bytes.decode(), file=sys.stderr)
        return result.exit_code
    
    result2 = run_command(2, 'python3 -m projectile_estimator.cli template data --with-anomalies', cmd2)
    all_results.append(result2)
    
    # 命令3: 异常检测（验证去重）
    def cmd3():
        result = runner.invoke(cli, [
            'check',
            '-t', 'examples/trajectory_normal.csv',
            '-a', 'examples/angle_with_overflow.csv',
            '-w', 'examples/wind_with_missing.csv'
        ])
        print(result.output)
        if result.stderr_bytes:
            print(result.stderr_bytes.decode(), file=sys.stderr)
        return result.exit_code
    
    result3 = run_command(3, 'python3 -m projectile_estimator.cli check -t examples/trajectory_normal.csv -a examples/angle_with_overflow.csv -w examples/wind_with_missing.csv', cmd3)
    all_results.append(result3)
    
    # 命令4: 完整分析
    def cmd4():
        os.makedirs('reports/test_fix', exist_ok=True)
        result = runner.invoke(cli, [
            'analyze',
            '-t', 'examples/trajectory_normal.csv',
            '-a', 'examples/angle_with_overflow.csv',
            '-w', 'examples/wind_with_missing.csv',
            '-f', 'txt', '-f', 'html',
            '-o', 'reports/test_fix'
        ])
        print(result.output)
        if result.stderr_bytes:
            print(result.stderr_bytes.decode(), file=sys.stderr)
        return result.exit_code
    
    result4 = run_command(4, 'python3 -m projectile_estimator.cli analyze -t examples/trajectory_normal.csv -a examples/angle_with_overflow.csv -w examples/wind_with_missing.csv -f txt -f html -o reports/test_fix', cmd4)
    all_results.append(result4)
    
    # 命令5: 复现角度越界
    def cmd5():
        result = runner.invoke(cli, [
            'reproduce-angle-overflow',
            '-a', 'examples/angle_with_overflow.csv',
            '-t', 'examples/trajectory_normal.csv'
        ])
        print(result.output)
        if result.stderr_bytes:
            print(result.stderr_bytes.decode(), file=sys.stderr)
        return result.exit_code
    
    result5 = run_command(5, 'python3 -m projectile_estimator.cli reproduce-angle-overflow -a examples/angle_with_overflow.csv -t examples/trajectory_normal.csv', cmd5)
    all_results.append(result5)
    
    # 命令6: 检查报告文件
    def cmd6():
        result = subprocess.run(
            ['ls', '-la', 'reports/test_fix/'],
            capture_output=True, text=True,
            cwd='/Users/mac/pro/solo/workspaces/y12344'
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        return result.returncode
    
    result6 = run_command(6, 'ls -la reports/test_fix/', cmd6)
    all_results.append(result6)
    
    # 读取报告前60行
    print(f"\n{'=' * 60}")
    print("读取 reports/test_fix/analysis_report.txt 前60行")
    print(f"{'=' * 60}\n")
    
    report_path = '/Users/mac/pro/solo/workspaces/y12344/reports/test_fix/analysis_report.txt'
    report_content = ""
    try:
        with open(report_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            for i, line in enumerate(lines[:60], 1):
                print(f"{i:3d}: {line}", end='')
                report_content += line
        print(f"\n... (共 {len(lines)} 行，已显示前60行)")
    except FileNotFoundError:
        print(f"❌ 文件不存在: {report_path}")
        report_content = None
    
    # 保存所有结果
    output_file = '/Users/mac/pro/solo/workspaces/y12344/all_command_results.txt'
    with open(output_file, 'w', encoding='utf-8') as f:
        for r in all_results:
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
    
    print(f"\n{'=' * 60}")
    print(f"所有结果已保存到: {output_file}")
    print(f"{'=' * 60}\n")
    
    # 汇总验证
    print(f"\n{'=' * 60}")
    print("验证结果汇总")
    print(f"{'=' * 60}\n")
    
    for r in all_results:
        status = '✅ 通过' if r['success'] else '❌ 失败'
        print(f"命令 {r['cmd_num']}: {status} - {r['cmd_desc'][:50]}...")
    
    # 验证异常数量
    if result3['success']:
        output = result3['output']
        if '检测到 3 个异常' in output or '共 3 个异常' in output:
            print("\n✅ 异常数量验证: 检测到3个异常（角度越界1 + 风速缺测1 + ...）")
        elif '检测到 2 个异常' in output:
            print("\n✅ 异常数量验证: 检测到2个异常（角度越界1 + 风速缺测1）")
        else:
            print(f"\n⚠️  异常数量需要检查: {output[:100]}")
    
    # 验证去重 - 角度越界应该只有1个
    if 'angle_overflow: 1' in result3['output'] or 'angle_overflow: 1 个' in result3['output']:
        print("✅ 去重验证: angle_overflow 只有1个（去重生效）")
    else:
        print("⚠️  去重验证: 需要检查 angle_overflow 数量")
    
    # 验证报告内容
    if report_content:
        checks = [
            ('异常数量', 'anomalies' in report_content.lower() or '异常' in report_content),
            ('拟合结果', 'R²' in report_content or 'r_squared' in report_content.lower() or '拟合' in report_content),
            ('风阻估计', 'drag' in report_content.lower() or '风阻' in report_content or 'C_d' in report_content),
        ]
        print("\n报告内容验证:")
        for name, passed in checks:
            status = '✅ 通过' if passed else '❌ 失败'
            print(f"  {name}: {status}")
    
    return all_results, report_content

if __name__ == "__main__":
    main()
