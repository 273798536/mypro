"""快速演示脚本 - 直接运行，不依赖CLI"""
import sys
import os
from pathlib import Path
from io import StringIO

workspace = Path("/Users/mac/pro/solo/workspaces/y13144")
sys.path.insert(0, str(workspace))
os.chdir(str(workspace))

output_lines = []

def log(msg=""):
    print(msg)
    output_lines.append(str(msg))

deps = ['pandas', 'numpy', 'matplotlib', 'seaborn', 'openpyxl', 'click', 'pydantic']
need_install = []

log("=" * 60)
log("检查依赖")
log("=" * 60)
log()

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
    import subprocess
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
log("=" * 60)
log("运行 quick_demo.py - 整数规划批量验算演示")
log("=" * 60)
log()

from src.ip_checker.pipeline import VerificationPipeline

examples_dir = workspace / 'examples'
examples_dir.mkdir(exist_ok=True)

pipeline = VerificationPipeline(output_dir=str(examples_dir))

demo_out = StringIO()
old_stdout = sys.stdout
sys.stdout = demo_out
try:
    result_df, report_files = pipeline.run_full_demo()
finally:
    sys.stdout = old_stdout

demo_output = demo_out.getvalue()
print(demo_output)
output_lines.extend(demo_output.split('\n'))

log()
log("=" * 60)
log("生成文件清单")
log("=" * 60)
for key, value in report_files.items():
    if isinstance(value, list):
        for v in value:
            log(f"  {key}: {Path(v).name}")
    else:
        log(f"  {key}: {Path(value).name}")

log()
log("details 目录下的异常追溯文件:")
details_dir = examples_dir / 'details'
if details_dir.exists():
    traces = sorted(details_dir.glob('*_trace.txt'))
    log(f"  共 {len(traces)} 条追溯记录")

log()
log("=" * 60)
log("examples 目录下所有生成的文件")
log("=" * 60)
log()

if examples_dir.exists():
    all_files = list(examples_dir.rglob('*'))
    all_files = [f for f in all_files if f.is_file()]
    all_files.sort()
    
    log(f"examples 目录下共有 {len(all_files)} 个文件:")
    log()
    for f in all_files:
        rel_path = f.relative_to(workspace)
        size = f.stat().st_size
        log(f"  {rel_path} ({size} 字节)")
else:
    log("examples 目录不存在")

log()
log("=" * 60)
log("演示完成！输出已保存到 output.txt")
log("=" * 60)

final_output = "\n".join(output_lines)

with open(workspace / 'output.txt', 'w', encoding='utf-8') as f:
    f.write(final_output)
