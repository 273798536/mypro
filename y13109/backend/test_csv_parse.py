import sys
sys.path.insert(0, '.')

from app.services.file_service import parse_csv

print("=== 测试1: 解析 sample_matrices.csv ===")
try:
    with open('../sample_data/sample_matrices.csv', 'rb') as f:
        content = f.read()
    records = parse_csv(content, 'sample_matrices.csv')
    print(f'解析到 {len(records)} 条记录')
    for r in records:
        print(f'  - {r.name}: {r.matrix.rows}x{r.matrix.cols}, values={r.matrix.values}')
except Exception as e:
    print(f'错误: {type(e).__name__}: {e}')

print("\n=== 测试2: 直接查看pandas读取结果 ===")
import pandas as pd
import io
try:
    with open('../sample_data/sample_matrices.csv', 'rb') as f:
        content = f.read()
    df = pd.read_csv(io.BytesIO(content), header=None)
    print(f"行数: {len(df)}")
    print(f"列数: {len(df.columns)}")
    for idx, row in df.iterrows():
        print(f"  行{idx}: {row.tolist()}")
except Exception as e:
    print(f'错误: {type(e).__name__}: {e}')
