import sys
import os
import subprocess
import time
from datetime import datetime
import json

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.services.export_service import ExportService
from app.services.dashboard_service import DashboardService
from app.schemas import ExportRequest


def run_command(cmd, description, env=None):
    print(f"\n{'='*60}")
    print(f"执行: {description}")
    print(f"命令: {cmd}")
    print("=" * 60)
    my_env = os.environ.copy()
    if env:
        my_env.update(env)
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, env=my_env)
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    return result.returncode == 0


def generate_reports():
    print("\n" + "=" * 60)
    print("正在生成报告...")
    print("=" * 60)

    db = SessionLocal()

    reports_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "reports")
    os.makedirs(reports_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print("\n1. 生成项目经理仪表盘报告...")
    dashboard = DashboardService.get_dashboard(db)
    dashboard_file = os.path.join(reports_dir, f"dashboard_{timestamp}.json")
    with open(dashboard_file, "w", encoding="utf-8") as f:
        json.dump(dashboard.model_dump(), f, ensure_ascii=False, indent=2, default=str)
    print(f"   ✓ 已保存: {dashboard_file}")

    print("\n2. 生成完整队列数据Excel报告...")
    excel_output = ExportService.export_to_excel(db, ExportRequest())
    excel_file = os.path.join(reports_dir, f"回执队列完整报告_{timestamp}.xlsx")
    with open(excel_file, "wb") as f:
        f.write(excel_output.getvalue())
    print(f"   ✓ 已保存: {excel_file}")

    print("\n3. 生成脏数据专项报告...")
    dirty_filter = ExportRequest(is_dirty=True)
    dirty_data = ExportService.get_export_data(db, dirty_filter)
    dirty_report = {
        "report_name": "脏数据专项报告",
        "generated_at": datetime.now().isoformat(),
        "total_dirty_records": len(dirty_data),
        "dirty_records": dirty_data
    }
    dirty_file = os.path.join(reports_dir, f"脏数据报告_{timestamp}.json")
    with open(dirty_file, "w", encoding="utf-8") as f:
        json.dump(dirty_report, f, ensure_ascii=False, indent=2, default=str)
    print(f"   ✓ 已保存: {dirty_file}, 脏记录数: {len(dirty_data)}")

    print("\n4. 按来源分类生成数据报告...")
    for source in ["material_list", "logistics", "borrow", "store_transfer"]:
        source_filter = ExportRequest(source_type=[source])
        source_data = ExportService.get_export_data(db, source_filter)
        if source_data:
            source_excel = ExportService.export_to_excel(db, source_filter)
            source_file = os.path.join(reports_dir, f"{source}_来源报告_{timestamp}.xlsx")
            with open(source_file, "wb") as f:
                f.write(source_excel.getvalue())
            print(f"   ✓ {source}: {len(source_data)}条记录 -> {os.path.basename(source_file)}")

    print("\n5. 生成项目经理汇总报告（文本）...")
    summary_file = os.path.join(reports_dir, f"项目经理汇总报告_{timestamp}.txt")
    with open(summary_file, "w", encoding="utf-8") as f:
        f.write("=" * 60 + "\n")
        f.write("线下展会物料重试补偿队列 - 项目经理汇总报告\n")
        f.write("=" * 60 + "\n")
        f.write(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

        stats = dashboard.stats
        f.write("【一、总体统计】\n")
        f.write(f"  总队列数: {stats.total_queue}\n")
        f.write(f"  待处理: {stats.pending}\n")
        f.write(f"  处理中: {stats.processing}\n")
        f.write(f"  重试中: {stats.retrying}\n")
        f.write(f"  人工审核: {stats.manual_review}\n")
        f.write(f"  已补偿: {stats.compensated}\n")
        f.write(f"  已关闭: {stats.closed}\n")
        f.write(f"  死信队列: {stats.dead_letter}\n")
        f.write(f"  脏数据总数: {stats.dirty_records}\n\n")

        f.write("【二、可重试分类统计】\n")
        if dashboard.retry_categories:
            for cat in dashboard.retry_categories:
                f.write(f"  - {cat.category}: {cat.count}条, 涉及金额 {cat.amount}元\n")
        else:
            f.write("  暂无重试分类数据\n")
        f.write("\n")

        f.write("【三、脏数据类型分布】\n")
        if dashboard.dirty_types:
            for dt in dashboard.dirty_types:
                type_names = {
                    "missing_field": "缺字段",
                    "cross_day": "跨日重复",
                    "name_changed": "改名不匹配",
                    "amount_conflict": "金额冲突",
                    "quantity_conflict": "数量冲突"
                }
                name = type_names.get(dt.dirty_type, dt.dirty_type)
                f.write(f"  - {name}: {dt.count}条\n")
        else:
            f.write("  暂无脏数据\n")
        f.write("\n")

        f.write("【四、数据来源统计】\n")
        if dashboard.sources:
            for src in dashboard.sources:
                source_names = {
                    "material_list": "物料清单",
                    "logistics": "物流签收",
                    "borrow": "现场借用",
                    "store_transfer": "门店交接"
                }
                name = source_names.get(src.source_type, src.source_type)
                f.write(f"  - {name}: {src.count}条, 金额 {src.amount}元\n")
        else:
            f.write("  暂无来源数据\n")
        f.write("\n")

        f.write("【五、重点关注事项】\n")
        if stats.dead_letter > 0:
            f.write(f"  ⚠ 有 {stats.dead_letter} 条记录在死信队列，需要人工介入恢复\n")
        if stats.manual_review > 0:
            f.write(f"  ⚠ 有 {stats.manual_review} 条记录等待人工审核\n")
        if stats.dirty_records > 0:
            f.write(f"  ⚠ 有 {stats.dirty_records} 条脏数据需要清理\n")
        if stats.dead_letter == 0 and stats.manual_review == 0 and stats.dirty_records == 0:
            f.write(f"  ✓ 所有数据正常，无需干预\n")

        f.write("\n" + "=" * 60 + "\n")
        f.write("报告生成完成\n")
        f.write("=" * 60 + "\n")

    print(f"   ✓ 已保存: {summary_file}")

    db.close()

    print("\n" + "=" * 60)
    print("✓ 所有报告生成完成!")
    print("=" * 60)
    print(f"\n报告目录: {reports_dir}")
    print(f"\n生成的文件:")
    for f in sorted(os.listdir(reports_dir)):
        if timestamp in f:
            filepath = os.path.join(reports_dir, f)
            size = os.path.getsize(filepath)
            print(f"  - {f} ({size} bytes)")

    return reports_dir


def run_demo():
    print("\n" + "=" * 60)
    print("线下展会物料重试补偿队列 API - 完整流程演示")
    print("=" * 60)

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(base_dir)

    env = {"PYTHONPATH": base_dir}
    python_cmd = sys.executable or "python3"

    steps = [
        (f"{python_cmd} scripts/init_db.py", "初始化数据库", env),
        (f"{python_cmd} scripts/seed_data.py", "导入样例数据", env),
        (f"{python_cmd} scripts/trigger_bad_data.py", "触发脏数据场景", env),
    ]

    for cmd, desc, step_env in steps:
        if not run_command(cmd, desc, step_env):
            print(f"\n✗ 步骤失败: {desc}")
            return False
        time.sleep(0.5)

    reports_dir = generate_reports()

    print("\n" + "=" * 60)
    print("✓ 完整流程演示完成!")
    print("=" * 60)

    print("\n启动服务命令:")
    print(f"  export PYTHONPATH={base_dir}")
    print(f"  {python_cmd} -m uvicorn app.main:app --host 0.0.0.0 --port 8000")

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
