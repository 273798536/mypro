#!/usr/bin/env python3
"""后端验证脚本 - 执行语法检查、venv创建、依赖安装、数据库初始化验证"""
import sys
import os
import subprocess
import venv
import tempfile
import shutil

WORKDIR = "/Users/mac/pro/solo/workspaces/y13127"
BACKEND_DIR = os.path.join(WORKDIR, "backend")
VENV_DIR = os.path.join(BACKEND_DIR, "venv")
REPORT_PATH = os.path.join(WORKDIR, "validation_report.txt")

results = {}
report_lines = []

def log(msg):
    print(msg)
    report_lines.append(msg)

def step_header(title):
    log("")
    log("=" * 60)
    log(f"  {title}")
    log("=" * 60)

# ============================================================
# 步骤 1: Python 语法检查
# ============================================================
step_header("【步骤 1】Python 语法检查 (python3 -m py_compile)")

py_files = [
    os.path.join(BACKEND_DIR, "database.py"),
    os.path.join(BACKEND_DIR, "schemas.py"),
    os.path.join(BACKEND_DIR, "services.py"),
    os.path.join(BACKEND_DIR, "excel_io.py"),
    os.path.join(BACKEND_DIR, "main.py"),
]

step1_pass = True
for fpath in py_files:
    fname = os.path.basename(fpath)
    try:
        result = subprocess.run(
            [sys.executable, "-m", "py_compile", fpath],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            log(f"  ✅ {fname}: 语法检查通过")
        else:
            log(f"  ❌ {fname}: 语法检查失败")
            log(f"     stderr: {result.stderr.strip()}")
            step1_pass = False
    except Exception as e:
        log(f"  ❌ {fname}: 执行异常 - {e}")
        step1_pass = False

results["step1"] = step1_pass
log("")
log(f"  步骤1 结果: {'✅ 全部通过' if step1_pass else '❌ 存在失败'}")

# ============================================================
# 步骤 2: 创建 venv 并安装依赖
# ============================================================
step_header("【步骤 2】创建 venv 并安装 requirements.txt 依赖")

step2_pass = True
venv_created = False
requirements_path = os.path.join(BACKEND_DIR, "requirements.txt")

if os.path.isdir(VENV_DIR):
    log("  ℹ️  venv 目录已存在，跳过创建")
else:
    log("  🔧 创建 venv 虚拟环境...")
    try:
        builder = venv.EnvBuilder(with_pip=True, clear=True)
        builder.create(VENV_DIR)
        log("  ✅ venv 创建成功")
        venv_created = True
    except Exception as e:
        log(f"  ❌ venv 创建失败: {e}")
        step2_pass = False

if step2_pass:
    # 确定 pip 和 python 路径
    if sys.platform == "win32":
        pip_path = os.path.join(VENV_DIR, "Scripts", "pip")
        venv_python = os.path.join(VENV_DIR, "Scripts", "python")
    else:
        pip_path = os.path.join(VENV_DIR, "bin", "pip")
        venv_python = os.path.join(VENV_DIR, "bin", "python")

    log(f"  📦 安装 requirements.txt 中的依赖...")
    try:
        result = subprocess.run(
            [pip_path, "install", "-r", requirements_path],
            capture_output=True, text=True, timeout=600
        )
        if result.returncode == 0:
            log("  ✅ 依赖安装成功")
            # 显示已安装的关键包
            list_result = subprocess.run(
                [pip_path, "list", "--format=freeze"],
                capture_output=True, text=True, timeout=30
            )
            packages = list_result.stdout.strip().split("\n")[:20]
            log("  📋 已安装的关键包 (前20个):")
            for pkg in packages:
                if pkg:
                    log(f"     - {pkg}")
        else:
            log("  ❌ 依赖安装失败")
            log(f"     stderr (最后30行):")
            for line in result.stderr.strip().split("\n")[-30:]:
                log(f"       {line}")
            step2_pass = False
    except subprocess.TimeoutExpired:
        log("  ❌ 依赖安装超时（超过10分钟）")
        step2_pass = False
    except Exception as e:
        log(f"  ❌ 依赖安装异常: {e}")
        step2_pass = False

results["step2"] = step2_pass
log("")
log(f"  步骤2 结果: {'✅ 成功' if step2_pass else '❌ 失败'}")

# ============================================================
# 步骤 3: 验证数据库初始化
# ============================================================
step_header("【步骤 3】验证数据库初始化")

step3_pass = True

# 选择使用的 Python
if os.path.isdir(VENV_DIR) and step2_pass:
    if sys.platform == "win32":
        python_to_use = os.path.join(VENV_DIR, "Scripts", "python")
    else:
        python_to_use = os.path.join(VENV_DIR, "bin", "python")
    log(f"  🐍 使用 venv 中的 Python: {python_to_use}")
else:
    python_to_use = sys.executable
    log(f"  🐍 使用系统 Python: {python_to_use}")

init_script = """
import sys
sys.path.insert(0, 'backend')
from database import init_db
init_db()
print('DB init OK')
"""

log("  🔄 执行数据库初始化 (init_db())...")
try:
    result = subprocess.run(
        [python_to_use, "-c", init_script],
        cwd=WORKDIR,
        capture_output=True, text=True, timeout=60
    )
    if result.returncode == 0:
        log("  ✅ 数据库初始化成功")
        log(f"     stdout: {result.stdout.strip()}")
        # 检查数据库文件
        db_path = os.path.join(BACKEND_DIR, "data", "bayesian_prior.db")
        if os.path.exists(db_path):
            size = os.path.getsize(db_path)
            log(f"     💾 数据库文件: {db_path}")
            log(f"     📊 文件大小: {size} bytes ({size/1024:.2f} KB)")
        else:
            log("     ⚠️  未找到数据库文件")
    else:
        log("  ❌ 数据库初始化失败")
        log(f"     stdout: {result.stdout.strip()}")
        log(f"     stderr: {result.stderr.strip()}")
        step3_pass = False
except subprocess.TimeoutExpired:
    log("  ❌ 数据库初始化超时")
    step3_pass = False
except Exception as e:
    log(f"  ❌ 数据库初始化异常: {e}")
    step3_pass = False

results["step3"] = step3_pass
log("")
log(f"  步骤3 结果: {'✅ 成功' if step3_pass else '❌ 失败'}")

# ============================================================
# 汇总报告
# ============================================================
step_header("验证结果汇总")
log(f"  步骤 1 - 语法检查:       {'✅ 全部通过' if results['step1'] else '❌ 存在失败'}")
log(f"  步骤 2 - venv+依赖安装:  {'✅ 成功' if results['step2'] else '❌ 失败'}")
log(f"  步骤 3 - 数据库初始化:   {'✅ 成功' if results['step3'] else '❌ 失败'}")
log("")

all_pass = all(results.values())
if all_pass:
    log("  🎉🎉🎉 全部验证通过！ 🎉🎉🎉")
else:
    log("  ⚠️  部分步骤失败，请检查上方详情")
log("=" * 60)

# 保存报告到文件
with open(REPORT_PATH, "w", encoding="utf-8") as f:
    f.write("\n".join(report_lines))
print(f"\n📄 报告已保存至: {REPORT_PATH}")
