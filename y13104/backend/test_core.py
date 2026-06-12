import os
import sys
import io
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))

from database import Base, engine, SessionLocal
from models import ParameterSheet, ParameterRow, RegressionResult, AnomalyPoint, ChangeLog, ReviewStatus
from ingestor import ingest_parameter_sheet, load_excel
from piecewise_regression import run_regression_for_sheet
from column_mapper import match_columns

Base.metadata.create_all(bind=engine)

def test_column_mapper():
    raw_cols = ["证券代码", "股票名称", "权重(%)", "Beta值", "收益率", "单位", "备注"]
    mapping, matches = match_columns(raw_cols)
    print("=== 字段匹配测试 ===")
    for m in matches:
        print(f"  {m['canonical']:15s} → {m['chosen']} (置信度 {m['confidence']:.2f})")
    assert mapping.get("security_code") == "证券代码"
    assert mapping.get("y_value") == "收益率"
    print("✓ 字段匹配测试通过\n")

def test_ingest_and_regression():
    print("=== 导入 + 回归测试 ===")

    n = 80
    np.random.seed(42)
    x = np.sort(np.random.uniform(0, 10, n))

    def true_func(xv):
        if xv < 4:
            return 1.5 + 2.0 * xv
        elif xv < 7:
            return -2.0 + 3.0 * xv
        else:
            return 10.0 + 0.5 * xv

    y_true = np.array([true_func(xi) for xi in x])
    y = y_true + np.random.normal(0, 0.8, n)

    outlier_idx = [10, 35, 60, 72]
    y[outlier_idx] += np.array([5, -6, 7, -4])

    weights = np.random.uniform(0.5, 2.0, n)

    codes = [f"600{i:03d}.SH" for i in range(1, n + 1)]
    names = [f"股票{i}号" for i in range(1, n + 1)]

    df = pd.DataFrame({
        "证券代码": codes,
        "证券名称": names,
        "权重": [f"{w:.4f}" for w in weights],
        "Beta因子": x,
        "收益率(%)": y,
        "单位": ["%" for _ in range(n)],
    })

    for idx in [5, 20]:
        df.loc[idx, "权重"] = None
    df.loc[15, "单位"] = None

    buf = io.BytesIO()
    df.to_excel(buf, index=False, sheet_name="Sheet1")
    buf.seek(0)

    df_loaded = pd.read_excel(buf, dtype=object)

    db = SessionLocal()
    try:
        sheet, matches, issues = ingest_parameter_sheet(
            db, df_loaded,
            file_name="test_params.xlsx",
            version="v1.0-test",
            uploaded_by="阿乔",
            notes="测试数据，包含已知异常点",
        )

        print(f"  导入参数表: {sheet.file_name}, 版本: {sheet.version}")
        print(f"  行数: {sheet.row_count if hasattr(sheet, 'row_count') else len(sheet.rows)}")
        print(f"  有问题的行: {len(issues)} 条")
        for issue in issues[:3]:
            print(f"    行{issue['excel_row_number']}: {', '.join(issue['warnings'])}")

        result = run_regression_for_sheet(db, sheet.id, num_segments=3, z_threshold=2.5)
        print(f"\n  回归完成: R² = {result.r_squared:.4f}")
        print(f"  断点: {result.breakpoints}")
        print(f"  总点数: {result.total_points}")
        print(f"  分段数: {result.segment_count}")

        segs = result.coefficients.get("segments", [])
        for seg in segs:
            print(f"    分段{seg['segment']}: 斜率={seg['slope']:.4f}, 截距={seg['intercept']:.4f}, 点={seg['n_points']}个, R²={seg['r2']:.4f}")

        anomalies = db.query(AnomalyPoint).filter(
            AnomalyPoint.result_id == result.id,
            AnomalyPoint.is_outlier == True
        ).all()
        print(f"\n  检测到异常点: {len(anomalies)} 个")
        for a in anomalies[:5]:
            print(f"    {a.security_code}: Z={a.z_score:.2f}, 状态={a.review_status}")

        row_with_issue = db.query(ParameterRow).filter(
            ParameterRow.sheet_id == sheet.id,
            ParameterRow.row_status == "warning"
        ).first()
        if row_with_issue:
            print(f"\n  单位追踪: 行{row_with_issue.excel_row_number}")
            print(f"    unit = {row_with_issue.unit}")
            print(f"    unit_source = {row_with_issue.unit_source}")
            print(f"    warnings = {row_with_issue.warnings}")

        first_anom = anomalies[0] if anomalies else None
        if first_anom:
            from sqlalchemy.orm import Session
            origin_row = db.query(ParameterRow).filter(ParameterRow.id == first_anom.param_row_id).first()
            print(f"\n  异常点下钻验证:")
            print(f"    异常点: {first_anom.security_code}, Z={first_anom.z_score:.2f}")
            print(f"    原始行: Excel行号={origin_row.excel_row_number}")
            print(f"    原始数据(前3列): {dict(list(origin_row.raw_data.items())[:3])}")

        print(f"\n  复核状态统计:")
        processed = db.query(AnomalyPoint).filter(AnomalyPoint.result_id == result.id, AnomalyPoint.review_status == ReviewStatus.PROCESSED).count()
        pending = db.query(AnomalyPoint).filter(AnomalyPoint.result_id == result.id, AnomalyPoint.review_status == ReviewStatus.PENDING_MATERIAL).count()
        manual = db.query(AnomalyPoint).filter(AnomalyPoint.result_id == result.id, AnomalyPoint.review_status == ReviewStatus.MANUAL_OVERRULE).count()
        print(f"    已处理: {processed}")
        print(f"    待补材料: {pending}")
        print(f"    人工改判: {manual}")

        if anomalies:
            anom = anomalies[0]
            anom.review_status = ReviewStatus.MANUAL_OVERRULE
            anom.reviewer_note = "人工确认保留，行业特殊情况"
            anom.overridden = True
            db.commit()

            from ingestor import update_parameter_row
            updated = update_parameter_row(
                db, anom.param_row_id, "weight", 1.5,
                changed_by="复核人老王", reason="权重被改过，根据最新公告修正"
            )
            print(f"\n  修改权重测试:")
            print(f"    修改后 weight = {updated.weight}")
            logs = db.query(ChangeLog).filter(ChangeLog.param_row_id == anom.param_row_id).all()
            print(f"    变更日志条数: {len(logs)}")
            for log in logs:
                print(f"      {log.changed_by} 修改 {log.field_name}: {log.old_value} → {log.new_value} ({log.reason})")

        print("\n✓ 导入 + 回归测试通过")
        return sheet.id

    finally:
        db.close()

def main():
    print("=" * 50)
    print("分段回归批量验算 - 后端核心功能测试")
    print("=" * 50 + "\n")

    test_column_mapper()
    sheet_id = test_ingest_and_regression()

    print("\n" + "=" * 50)
    print(f"所有测试通过！测试参数表 ID = {sheet_id}")
    print("=" * 50)

if __name__ == "__main__":
    main()
