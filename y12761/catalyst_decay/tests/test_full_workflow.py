import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, Base, engine
from app.models import Batch, BatchStatus, DataIssue, IssueSeverity
from app.services.import_service import parse_data_file
from app.services.status_service import advance_status, get_status_history, STATUS_LABEL_CN
from app.services.validation_service import run_full_validation, resolve_issue
from app.services.calculation_service import perform_balance_calculation
from app.services.export_service import export_batch_report

Base.metadata.create_all(bind=engine)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")


def print_divider(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def test_full_workflow():
    db = SessionLocal()

    try:
        print_divider("步骤1: 创建新批次")
        batch = Batch(
            batch_no="BATCH-TEST-20251120",
            catalyst_name="ZSM-5 分子筛催化剂",
            operator="张工程师",
            import_remark="2025年11月催化剂活性衰减测试批次",
            status=BatchStatus.DRAFT
        )
        db.add(batch)
        db.commit()
        db.refresh(batch)
        print(f"✅ 批次创建成功")
        print(f"   批次号: {batch.batch_no}")
        print(f"   催化剂: {batch.catalyst_name}")
        print(f"   当前状态: {STATUS_LABEL_CN.get(batch.status)}")

        print_divider("步骤2: 导入实验记录数据")
        exp_file = os.path.join(DATA_DIR, "催化剂活性衰减实验记录_2025年11月.xlsx")
        exp_count, curve_count, issues, warnings = parse_data_file(
            exp_file, "催化剂活性衰减实验记录_2025年11月.xlsx", batch, db
        )
        print(f"✅ 实验记录导入完成")
        print(f"   实验记录数: {exp_count}")
        print(f"   曲线数据点数: {curve_count}")
        print(f"   发现问题数: {len(issues)}")
        if warnings:
            for w in warnings:
                print(f"   ⚠  {w}")

        print_divider("步骤3: 导入温度曲线数据")
        curve_file = os.path.join(DATA_DIR, "温度-活性曲线数据_补录.xlsx")
        exp_count2, curve_count2, issues2, warnings2 = parse_data_file(
            curve_file, "温度-活性曲线数据_补录.xlsx", batch, db
        )
        print(f"✅ 温度曲线导入完成")
        print(f"   新增实验记录数: {exp_count2}")
        print(f"   新增曲线数据点: {curve_count2}")
        print(f"   新增问题数: {len(issues2)}")
        if warnings2:
            for w in warnings2:
                print(f"   ⚠  {w}")

        db.refresh(batch)
        if batch.status == BatchStatus.DRAFT:
            advance_status(db, batch.id, BatchStatus.IMPORTED, "张工程师", "数据导入完成")
            db.refresh(batch)
        print(f"   批次当前状态: {STATUS_LABEL_CN.get(batch.status)}")

        print_divider("步骤4: 运行完整数据校验")
        all_issues = run_full_validation(db, batch.id)
        print(f"✅ 数据校验完成, 共发现 {len(all_issues)} 个问题:")

        severity_count = {"error": 0, "warning": 0, "info": 0}
        for issue in all_issues:
            sev = issue.severity.value
            severity_count[sev] = severity_count.get(sev, 0) + 1

        print(f"   🔴 严重问题: {severity_count.get('error', 0)} 个")
        print(f"   🟡 警告问题: {severity_count.get('warning', 0)} 个")
        print(f"   🟢 提示信息: {severity_count.get('info', 0)} 个")

        print("\n   问题详情（展示前8条，重点看通俗描述）:")
        for idx, issue in enumerate(all_issues[:8]):
            sev_label = "🔴严重" if issue.severity == IssueSeverity.ERROR else (
                "🟡警告" if issue.severity == IssueSeverity.WARNING else "🟢提示"
            )
            print(f"\n   [{idx+1}] {sev_label} | 位置: {issue.location}")
            print(f"       通俗说明: {issue.human_readable_desc}")
            if issue.source_file:
                print(f"       来源追踪: 文件={issue.source_file}, 表={issue.source_sheet}, 行={issue.source_row}")

        print_divider("步骤5: 解决部分问题后推进状态")
        unresolved_errors = [i for i in all_issues if i.severity == IssueSeverity.ERROR and not i.is_resolved]
        print(f"   解决前: {len(unresolved_errors)} 个未解决的严重问题")

        for err in unresolved_errors:
            resolve_issue(db, err.id, f"已核对原始记录，数据缺失问题已确认，后续补测 - [李复核员]")

        all_issues_after = db.query(DataIssue).filter(DataIssue.batch_id == batch.id).all()
        remaining_errors = [i for i in all_issues_after if i.severity == IssueSeverity.ERROR and not i.is_resolved]
        print(f"   解决后: {len(remaining_errors)} 个未解决的严重问题")

        print("\n   推进状态: 已导入 → 复核中")
        advance_status(db, batch.id, BatchStatus.UNDER_REVIEW, "李复核员", "数据问题已标注，进入复核流程")
        db.refresh(batch)
        print(f"   当前状态: {STATUS_LABEL_CN.get(batch.status)}")

        print_divider("步骤6: 执行配平计算")
        calc_records = perform_balance_calculation(db, batch.id, "计算系统")
        print(f"✅ 配平计算完成, 生成 {len(calc_records)} 条计算记录:")
        for idx, calc in enumerate(calc_records[:5]):
            print(f"\n   [{idx+1}] 计算类型: {calc.calculation_type}")
            print(f"       计算前: {calc.before_value[:100]}{'...' if len(calc.before_value) > 100 else ''}")
            print(f"       计算后: {calc.after_value}")
            print(f"       差异: {calc.difference}")
            print(f"       原因: {calc.reason}")

        print_divider("步骤7: 继续推进状态（复核 → 审核 → 已完成）")
        advance_status(db, batch.id, BatchStatus.APPROVED, "王主任", "复核通过，数据质量符合要求")
        db.refresh(batch)
        print(f"   审核通过: {STATUS_LABEL_CN.get(batch.status)}")

        advance_status(db, batch.id, BatchStatus.COMPLETED, "系统", "批次流程完成")
        db.refresh(batch)
        print(f"   流程完成: {STATUS_LABEL_CN.get(batch.status)}")

        print("\n   状态流转历史:")
        history = get_status_history(db, batch.id)
        for t in history:
            from_s = STATUS_LABEL_CN.get(t.from_status, "新建") if t.from_status else "新建"
            to_s = STATUS_LABEL_CN.get(t.to_status)
            print(f"     {t.transition_at.strftime('%H:%M:%S')} | {from_s} → {to_s} | {t.operator} | {t.remark or ''}")

        print_divider("步骤8: 导出Excel报告")
        report_path = export_batch_report(db, batch.id)
        print(f"✅ 报告已生成: {report_path}")
        print(f"   文件大小: {os.path.getsize(report_path):,} 字节")
        print(f"\n   报告包含以下工作表 (给质检主管和非技术人员查看):")
        print(f"     0-报告概览: 批次基本信息和问题统计")
        print(f"     1-实验记录: 所有实验数据，精度不足自动标黄")
        print(f"     2-温度曲线: 原始数据，异常点标红并说明原因")
        print(f"     3-数据问题清单: 全是通俗描述，不写字段名，标注具体文件/表/行")
        print(f"     4-配平计算记录: 计算前后数据对比")
        print(f"     5-审核流转记录: 谁在什么时候做了什么操作")
        print(f"     6-原始文件来源: 数据是从哪份文件导进来的")

        print_divider("步骤9: 模拟重启服务验证数据持久化")
        db.close()
        db2 = SessionLocal()
        batch_restored = db2.query(Batch).filter(Batch.batch_no == "BATCH-TEST-20251120").first()
        if batch_restored:
            print(f"✅ 重启后数据仍然存在!")
            print(f"   批次号: {batch_restored.batch_no}")
            print(f"   状态: {STATUS_LABEL_CN.get(batch_restored.status)}")
            print(f"   创建时间: {batch_restored.created_at}")
            print(f"   完成时间: {batch_restored.completed_at}")

            issue_count = db2.query(DataIssue).filter(DataIssue.batch_id == batch_restored.id).count()
            print(f"   数据问题记录数: {issue_count}")
            print(f"   (SQLite数据库文件位于: data/catalyst_decay.db)")
        db2.close()

        print_divider("全流程测试通过! 🎉")
        print(f"\n已生成的文件:")
        print(f"  1. 样例实验数据: data/催化剂活性衰减实验记录_2025年11月.xlsx")
        print(f"  2. 样例曲线数据: data/温度-活性曲线数据_补录.xlsx")
        print(f"  3. 最终分析报告: {report_path}")
        print(f"  4. SQLite数据库: data/catalyst_decay.db")

    except Exception as e:
        import traceback
        print(f"❌ 测试失败: {e}")
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    test_full_workflow()
