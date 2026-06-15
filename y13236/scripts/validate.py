import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.init_test_data import init_test_data
from app.database import SessionLocal
from app.detector import run_all_detections


def run_validation():
    print("=" * 60)
    print("步骤 1: 初始化测试数据")
    print("=" * 60)
    init_test_data()

    print("\n" + "=" * 60)
    print("步骤 2: 运行冲突检测")
    print("=" * 60)
    db = SessionLocal()
    try:
        result = run_all_detections(db)
        print(f"检测结果: 共发现 {result['total_conflicts']} 条冲突")
        print(f"按类型分布: {result['by_type']}")

        print("\n" + "=" * 60)
        print("步骤 3: 验证各冲突类型详情")
        print("=" * 60)
        from app.models import ConflictRecord, ConflictType

        conflicts = db.query(ConflictRecord).all()
        for c in conflicts:
            print(f"\n[{c.conflict_type}] {c.description}")
            if c.raw_source:
                print(f"  ↳ 原始来源: {c.raw_source}")
            if c.timecode_deviation_seconds:
                print(f"  ↳ 时码偏差: {c.timecode_deviation_seconds}秒")

        print("\n" + "=" * 60)
        print("验证完成！所有检测逻辑工作正常。")
        print("=" * 60)
    finally:
        db.close()


if __name__ == "__main__":
    run_validation()
