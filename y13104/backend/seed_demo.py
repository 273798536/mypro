import os
import sys
import io
import pandas as pd
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))

from database import Base, engine, SessionLocal
from models import ParameterSheet
from ingestor import ingest_parameter_sheet
from piecewise_regression import run_regression_for_sheet

Base.metadata.create_all(bind=engine)
db = SessionLocal()

existing = db.query(ParameterSheet).count()
print(f"已有 {existing} 张参数表")

if existing == 0:
    n = 50
    np.random.seed(42)
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
        db, df, file_name="demo_50points.xlsx", version="v1.0-demo", uploaded_by="阿乔", notes="演示数据"
    )
    result = run_regression_for_sheet(db, sheet.id)
    print(f"创建演示参数表 id={sheet.id}, 回归 R²={result.r_squared:.4f}")

    df_empty = pd.DataFrame({
        "证券代码": ["600901.SH", "600902.SH", "600903.SH"],
        "证券名称": ["坏票1", "坏票2", "坏票3"],
        "权重": [0.5, 0.3, 0.2],
        "Beta值": [None, None, None],
        "收益率(%)": [None, None, None],
    })
    sheet2, _, _ = ingest_parameter_sheet(
        db, df_empty, file_name="bad_material.xlsx", version="v0.0-bad", uploaded_by="test", notes="全空 X/Y 的坏材料"
    )
    print(f"创建坏材料参数表 id={sheet2.id} (全空 X/Y)")

db.close()
print("done")
