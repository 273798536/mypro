import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.services import IdempotencyService, StateMachine, ReportService
from app.models import ExceptionStatus, RecordStatus
from tests.test_data import generate_test_schedules, generate_test_leaves

DATABASE_URL = "sqlite:///./test_scheduling_exception.db"


def test_full_workflow():
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()

    try:
        print("=" * 60)
        print("测试1: 导入排班数据（幂等测试）")
        print("=" * 60)
        idemp_service = IdempotencyService(db)

        schedules = generate_test_schedules()
        result = idemp_service.batch_import_schedules(schedules)
        print(f"首次导入 - 创建: {result['created']}, 更新: {result['updated']}")

        result2 = idemp_service.batch_import_schedules(schedules)
        print(f"重复导入 - 创建: {result2['created']}, 更新: {result2['updated']}")
        assert result2["created"] == 0, "幂等失败：重复导入不应创建新记录"
        print("✓ 幂等测试通过")

        print("\n" + "=" * 60)
        print("测试2: 导入请假单数据")
        print("=" * 60)
        leaves = generate_test_leaves()
        leave_result = idemp_service.batch_import_leaves(leaves)
        print(f"请假单导入 - 创建: {leave_result['created']}, 更新: {leave_result['updated']}")
        print("✓ 请假单导入成功")

        print("\n" + "=" * 60)
        print("测试3: 创建异常批次")
        print("=" * 60)
        state_machine = StateMachine(db)
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        batch = state_machine.create_batch(
            branch_id="B001",
            branch_name="朝阳支行",
            batch_date=today,
            start_date=today,
            end_date=today + timedelta(days=7),
            operator="测试员",
        )

        print(f"批次号: {batch.batch_no}")
        print(f"状态: {batch.status}")
        print(f"总记录数: {batch.total_records}")
        print(f"  - 未处理: {batch.unprocessed_records}")
        print(f"  - 已修正: {batch.corrected_records}")
        print(f"  - 需人工确认: {batch.need_manual_confirm_records}")
        print(f"  - 失败: {batch.failed_records}")
        assert batch.status == ExceptionStatus.DRAFT
        print("✓ 批次创建成功")

        print("\n" + "=" * 60)
        print("测试4: 批次状态流转")
        print("=" * 60)

        batch = state_machine.submit_for_review(batch.id, "审核员A")
        print(f"提交审核后状态: {batch.status}")
        assert batch.status == ExceptionStatus.PENDING_REVIEW

        batch = state_machine.review_approve(batch.id, "主管B", "审核通过")
        print(f"审核通过后状态: {batch.status}")
        assert batch.status == ExceptionStatus.APPROVED

        batch = state_machine.freeze_batch(batch.id, "风险控管员", "例行审计冻结")
        print(f"冻结后状态: {batch.status}")
        print(f"冻结原因: {batch.frozen_reason}")
        assert batch.status == ExceptionStatus.FROZEN

        batch = state_machine.unfreeze_batch(batch.id, "风险控管员")
        print(f"解冻后状态: {batch.status}")
        assert batch.status == ExceptionStatus.APPROVED

        batch = state_machine.settle_batch(batch.id, "结算员")
        print(f"结算后状态: {batch.status}")
        assert batch.status == ExceptionStatus.SETTLED

        batch = state_machine.archive_batch(batch.id, "档案管理员")
        print(f"归档后状态: {batch.status}")
        assert batch.status == ExceptionStatus.ARCHIVED
        print("✓ 状态流转测试通过")

        print("\n" + "=" * 60)
        print("测试5: 复核改判功能")
        print("=" * 60)

        batch2 = state_machine.create_batch(
            branch_id="B001",
            branch_name="朝阳支行",
            batch_date=today + timedelta(days=1),
            start_date=today,
            end_date=today + timedelta(days=7),
            operator="测试员",
        )

        from app.models import ExceptionRecord

        records = db.query(ExceptionRecord).filter(ExceptionRecord.batch_id == batch2.id).all()
        if records:
            record = records[0]
            print(f"原始状态: {record.status}")

            updated_record = state_machine.modify_judgment(
                record_id=record.id,
                operator="复核员",
                new_status=RecordStatus.CORRECTED,
                manual_reason="经核实，该冲突已通过调班解决",
            )

            print(f"改判后状态: {updated_record.status}")
            print(f"人工理由: {updated_record.manual_reason}")
            print(f"复核人: {updated_record.reviewer}")
            assert updated_record.status == RecordStatus.CORRECTED
            assert updated_record.manual_reason is not None
            print("✓ 复核改判测试通过")

        print("\n" + "=" * 60)
        print("测试6: 行长视图报表")
        print("=" * 60)

        report_service = ReportService(db)
        dashboard = report_service.get_manager_dashboard("B001")

        print(f"总批次数: {dashboard.total_batches}")
        print(f"总异常记录数: {dashboard.total_records}")
        print(f"  - 未处理: {dashboard.unprocessed_records}")
        print(f"  - 已修正: {dashboard.corrected_records}")
        print(f"  - 需人工确认: {dashboard.need_manual_confirm_records}")
        print(f"各状态批次数:")
        print(f"  - 草稿: {dashboard.draft_batches}")
        print(f"  - 待审核: {dashboard.pending_review_batches}")
        print(f"  - 已通过: {dashboard.approved_batches}")
        print(f"  - 已冻结: {dashboard.frozen_batches}")
        print(f"  - 已结算: {dashboard.settled_batches}")
        print(f"  - 已归档: {dashboard.archived_batches}")
        print("✓ 行长视图报表测试通过")

        print("\n" + "=" * 60)
        print("测试7: 导出Excel")
        print("=" * 60)

        export_path = report_service.export_to_excel()
        print(f"导出文件路径: {export_path}")
        assert os.path.exists(export_path)
        print("✓ Excel导出测试通过")

        print("\n" + "=" * 60)
        print("✅ 所有测试通过!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback

        traceback.print_exc()
        raise
    finally:
        db.close()
        if os.path.exists("./test_scheduling_exception.db"):
            os.remove("./test_scheduling_exception.db")


if __name__ == "__main__":
    test_full_workflow()
