import sys
import os
from pathlib import Path
from io import StringIO
import subprocess

workspace = Path("/Users/mac/pro/solo/workspaces/y13144")
sys.path.insert(0, str(workspace))
os.chdir(str(workspace))

output = []

def log(msg=""):
    output.append(str(msg))

examples_dir = workspace / 'examples'
examples_dir.mkdir(exist_ok=True)

log("=" * 80)
log("任务 1: 运行 pip install -r requirements.txt 安装依赖")
log("=" * 80)
log()

deps = ['pandas', 'numpy', 'matplotlib', 'seaborn', 'openpyxl', 'click', 'pydantic', 'dateutil']
need_install = []

for dep in deps:
    try:
        mod = __import__(dep)
        version = getattr(mod, '__version__', 'N/A')
        log(f"✓ {dep} 已安装 (版本: {version})")
    except ImportError:
        log(f"✗ {dep} 未安装")
        need_install.append(dep)

log()

if need_install:
    log("正在安装缺失的依赖...")
    log()
    try:
        proc = subprocess.run(
            [sys.executable, '-m', 'pip', 'install', '-r', str(workspace / 'requirements.txt')],
            capture_output=True,
            text=True,
            cwd=str(workspace)
        )
        log("pip install 输出:")
        log(proc.stdout)
        if proc.stderr:
            log("错误输出:")
            log(proc.stderr)
        log(f"返回码: {proc.returncode}")
    except Exception as e:
        log(f"安装失败: {e}")
else:
    log("所有依赖已安装，无需安装！")

log()
log("=" * 80)
log("任务 2: 运行 python cli.py demo 执行完整演示")
log("=" * 80)
log()

try:
    from src.ip_checker.pipeline import VerificationPipeline
    
    pipeline = VerificationPipeline(output_dir=str(examples_dir))
    
    demo_out = StringIO()
    old_stdout = sys.stdout
    sys.stdout = demo_out
    try:
        result_df, report_files = pipeline.run_full_demo()
    finally:
        sys.stdout = old_stdout
    
    log(demo_out.getvalue())
    
    log()
    log("演示执行完成！")
    log("生成的报告文件:")
    for key, value in report_files.items():
        if isinstance(value, list):
            for v in value:
                log(f"  {key}: {v}")
        else:
            log(f"  {key}: {value}")
except Exception as e:
    log(f"演示执行失败: {e}")
    import traceback
    log(traceback.format_exc())

log()
log("=" * 80)
log("任务 3: 运行 python cli.py test 运行测试")
log("=" * 80)
log()

try:
    import pytest
    
    test_file = workspace / 'tests' / 'test_core_features.py'
    
    test_out = StringIO()
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    sys.stdout = test_out
    sys.stderr = test_out
    try:
        exit_code = pytest.main(['-v', str(test_file)])
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr
    
    log(test_out.getvalue())
    log(f"测试返回码: {exit_code}")
except Exception as e:
    log(f"测试执行失败: {e}")
    import traceback
    log(traceback.format_exc())

log()
log("=" * 80)
log("任务 4: 列出 examples 目录下生成的所有文件")
log("=" * 80)
log()

if examples_dir.exists():
    files = list(examples_dir.rglob('*'))
    files = [f for f in files if f.is_file()]
    files.sort()
    
    log(f"examples 目录下共有 {len(files)} 个文件:")
    log()
    for f in files:
        rel_path = f.relative_to(workspace)
        size = f.stat().st_size
        log(f"  {rel_path} ({size} 字节)")
else:
    log("examples 目录不存在")

log()
log("=" * 80)
log("所有任务完成！")
log("=" * 80)

final_output = "\n".join(output)

with open(workspace / 'output.txt', 'w', encoding='utf-8') as f:
    f.write(final_output)

print(final_output)
