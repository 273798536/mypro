import os
import sys
import io
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))

from database import Base, engine, SessionLocal
from models import ParameterSheet, ParameterRow, RegressionResult, AnomalyPoint, ReviewStatus
from ingestor import ingest_parameter_sheet
from piecewise_regression import run_regression_for_sheet, piecewise_linear_fit, BadMaterialError

Base.metadata.create_all(bind=engine)

def test_empty_x_y():
    print("=== 测试 1: 空数组 piecewise_linear_fit ===")
    try:
        piecewise_linear_fit(np.array([]), np.array([]))
        print("  ✗ 应该抛出 BadMaterialError")
        return False
    except BadMaterialError as e:
        print(f"  ✓ 正确抛出: {e}")
        print(f"    details = {e.details}")
        assert e.details.get("total_points") == 0
    return True


def test_too_few_points():
    print("\n=== 测试 2: 只有 1 个点 ===")
    try:
        piecewise_linear_fit(np.array([1.0]), np.array([2.0]))
        print("  ✗ 应该抛出 BadMaterialError")
        return False
    except BadMaterialError as e:
        print(f"  ✓ 正确抛出: {e}")
        assert e.details.get("total_points") == 1
        assert e.details.get("min_required") == 2
    return True


def test_not_enough_for_segments():
    print("\n=== 测试 3: 3 个点但要求分 3 段 (每段至少 2 点需要 6 点) ===")
    try:
        piecewise_linear_fit(
            np.array([1.0, 2.0, 3.0]),
            np.array([2.0, 3.0, 4.0]),
            num_segments=3,
        )
        print("  ✗ 应该抛出 BadMaterialError")
        return False
    except BadMaterialError as e:
        print(f"  ✓ 正确抛出: {e}")
        assert e.details.get("total_points") == 3
        assert e.details.get("min_required") == 6
    return True


def test_sheet_with_zero_valid_rows():
    print("\n=== 测试 4: 参数表里所有行 X/Y 都为空 ===")
    db = SessionLocal()
    try:
        df = pd.DataFrame({
            "证券代码": ["600001.SH", "600002.SH", "600003.SH"],
            "证券名称": ["股票1", "股票2", "股票3"],
            "权重": [0.5, 0.3, 0.2],
            "Beta值": [None, None, None],
            "收益率(%)": [None, None, None],
        })
        sheet, _, _ = ingest_parameter_sheet(
            db, df, file_name="all_empty.xlsx", version="v0", uploaded_by="test"
        )
        print(f"  导入参数表 id={sheet.id}, 共 3 行")
        try:
            run_regression_for_sheet(db, sheet.id)
            print("  ✗ 应该抛出 BadMaterialError")
            return False
        except BadMaterialError as e:
            print(f"  ✓ 正确抛出: {e}")
            print(f"    details = {e.details}")
            assert e.details.get("total_rows") == 3
            assert e.details.get("valid_rows") == 0
            assert e.details.get("missing_x_rows") == 3
            assert e.details.get("missing_y_rows") == 3
            assert "suggestion" in e.details
        return True
    finally:
        db.close()


def test_normal_regression_still_works():
    print("\n=== 测试 5: 正常数据回归仍然能跑 ===")
    db = SessionLocal()
    try:
        n = 50
        np.random.seed(99)
        x = np.sort(np.random.uniform(0, 10, n))
        y = np.where(x < 5, 1 + 2 * x, 11 + 0.5 * x) + np.random.normal(0, 0.5, n)
        df = pd.DataFrame({
            "证券代码": [f"600{i:03d}.SH" for i in range(1, n + 1)],
            "证券名称": [f"股票{i}" for i in range(1, n + 1)],
            "权重": np.random.uniform(0.5, 2.0, n),
            "Beta值": x,
            "收益率(%)": y,
            "单位": ["%"] * n,
        })
        sheet, _, _ = ingest_parameter_sheet(
            db, df, file_name="normal.xlsx", version="v1", uploaded_by="test"
        )
        result = run_regression_for_sheet(db, sheet.id, num_segments=2)
        print(f"  ✓ 回归完成: R²={result.r_squared:.4f}, 样本数={result.total_points}, 断点={result.breakpoints}")
        anom_count = db.query(AnomalyPoint).filter(
            AnomalyPoint.result_id == result.id, AnomalyPoint.is_outlier == True
        ).count()
        print(f"    异常点: {anom_count}")
        assert result.total_points == n
        assert result.r_squared is not None and result.r_squared > 0.5
        return True
    finally:
        db.close()


def main():
    print("=" * 60)
    print("分段回归批量验算 - 坏材料边界情况 & 回归修复验证")
    print("=" * 60 + "\n")

    results = [
        test_empty_x_y(),
        test_too_few_points(),
        test_not_enough_for_segments(),
        test_sheet_with_zero_valid_rows(),
        test_normal_regression_still_works(),
    ]

    print("\n" + "=" * 60)
    passed = sum(1 for r in results if r)
    print(f"结果: {passed}/{len(results)} 测试通过")
    if passed == len(results):
        print("✓ 全部通过")
        sys.exit(0)
    else:
        print("✗ 有测试失败")
        sys.exit(1)


if __name__ == "__main__":
    main()
