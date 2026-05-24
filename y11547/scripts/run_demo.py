import sys
import os
import subprocess
import time

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def run_command(cmd, description):
    print(f"\n{'='*60}")
    print(f"执行: {description}")
    print(f"命令: {cmd}")
    print("=" * 60)
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    return result.returncode == 0


def run_demo():
    print("\n" + "=" * 60)
    print("线下展会物料重试补偿队列 API - 完整流程演示")
    print("=" * 60)

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(base_dir)

    steps = [
        ("pip install -r requirements.txt", "安装依赖"),
        ("python scripts/init_db.py", "初始化数据库"),
        ("python scripts/seed_data.py", "导入样例数据"),
        ("python scripts/trigger_bad_data.py", "触发脏数据场景"),
    ]

    for cmd, desc in steps:
        if not run_command(cmd, desc):
            print(f"\n✗ 步骤失败: {desc}")
            return False
        time.sleep(1)

    print("\n" + "=" * 60)
    print("✓ 所有初始化步骤完成!")
    print("=" * 60)

    print("\n接下来请手动执行以下命令启动服务:")
    print("  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")

    print("\n服务启动后可访问:")
    print("  http://localhost:8000/docs  - API文档")
    print("  http://localhost:8000/api/v1/dashboard  - 项目经理仪表盘")
    print("  http://localhost:8000/health  - 健康检查")

    print("\n" + "=" * 60)
    print("完整流程验证步骤:")
    print("=" * 60)
    print("1. 查看仪表盘: GET /api/v1/dashboard")
    print("2. 查看脏数据列表: GET /api/v1/queue?is_dirty=true")
    print("3. 查看死信队列: GET /api/v1/queue?status=dead_letter")
    print("4. 导出Excel: POST /api/v1/export/excel")
    print("5. 人工修正: POST /api/v1/queue/{id}/manual-review")
    print("6. 死信恢复: POST /api/v1/queue/{id}/recover")
    print("7. 补偿入账: POST /api/v1/queue/{id}/compensate")
    print("8. 关闭队列项: POST /api/v1/queue/{id}/close")

    return True


if __name__ == "__main__":
    success = run_demo()
    sys.exit(0 if success else 1)
