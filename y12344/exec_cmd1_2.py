import sys
import os
import subprocess
from click.testing import CliRunner

sys.path.insert(0, '/Users/mac/pro/solo/workspaces/y12344/src')
os.chdir('/Users/mac/pro/solo/workspaces/y12344')

all_results = []

# ========== 命令1: 安装包 ==========
print("\n" + "="*60)
print("命令1: python3 -m pip install -e .")
print("="*60 + "\n")

result = subprocess.run([sys.executable, '-m', 'pip', 'install', '-e', '.'], 
                       capture_output=True, text=True, timeout=120)
print(result.stdout)
if result.stderr:
    print("--- STDERR ---")
    print(result.stderr)
print(f"\n返回码: {result.returncode}")
cmd1_success = result.returncode == 0
print(f"成功: {'✅ 是' if cmd1_success else '❌ 否'}")

all_results.append({
    'cmd': 1, 'desc': 'python3 -m pip install -e .',
    'output': result.stdout, 'stderr': result.stderr,
    'exit_code': result.returncode, 'success': cmd1_success
})

# ========== 命令2: 生成示例数据 ==========
print("\n" + "="*60)
print("命令2: python3 -m projectile_estimator.cli template data --with-anomalies")
print("="*60 + "\n")

from projectile_estimator.cli import cli
runner = CliRunner()
result = runner.invoke(cli, ['template', 'data', '--with-anomalies'])
print(result.output)
stderr_out = result.stderr_bytes.decode() if result.stderr_bytes else ''
if stderr_out:
    print("--- STDERR ---")
    print(stderr_out)
print(f"\n返回码: {result.exit_code}")
cmd2_success = result.exit_code == 0
print(f"成功: {'✅ 是' if cmd2_success else '❌ 否'}")

all_results.append({
    'cmd': 2, 'desc': 'python3 -m projectile_estimator.cli template data --with-anomalies',
    'output': result.output, 'stderr': stderr_out,
    'exit_code': result.exit_code, 'success': cmd2_success
})

# 保存结果
import pickle
with open('/Users/mac/pro/solo/workspaces/y12344/results_cmd1_2.pkl', 'wb') as f:
    pickle.dump(all_results, f)

with open('/Users/mac/pro/solo/workspaces/y12344/output_cmd1_2.txt', 'w') as f:
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

print("\n✅ 命令1-2执行完成，结果已保存")
