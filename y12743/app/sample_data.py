import os
import pandas as pd
import numpy as np
from config import Config


def generate_sample_data():
    np.random.seed(42)
    
    data = []
    
    question_ids = [f'Q{i:03d}' for i in range(1, 21)]
    student_ids = [f'S{j:03d}' for j in range(1, 31)]
    batches = ['2026-05', '2026-06']
    
    for batch in batches:
        for qid in question_ids:
            for sid in student_ids[:10]:
                base_score = np.random.normal(75, 10)
                base_score = max(0, min(100, base_score))
                hist = base_score + np.random.normal(0, 5)
                extrap = base_score + np.random.normal(0, 8)
                
                data.append({
                    'question_id': qid,
                    'student_id': sid,
                    'score': round(base_score, 2),
                    'historical_value': round(hist, 2),
                    'extrapolated_value': round(extrap, 2),
                    'batch_id': batch,
                    'sample_date': '2026-05-15' if batch == '2026-05' else '2026-06-10'
                })
    
    df = pd.DataFrame(data)
    
    unstable_idx = df[
        (df['question_id'] == 'Q005') & 
        (df['student_id'] == 'S002') & 
        (df['batch_id'] == '2026-06')
    ].index
    for idx in unstable_idx:
        df.at[idx, 'score'] = 25.0
    
    oob_idx = df[
        (df['question_id'].isin(['Q003', 'Q012'])) &
        (df['student_id'].isin(['S005', 'S008']))
    ].index
    for i, idx in enumerate(oob_idx):
        if i % 2 == 0:
            df.at[idx, 'extrapolated_value'] = 135.5
        else:
            df.at[idx, 'extrapolated_value'] = -15.2
    
    missing_idx = df.sample(5, random_state=42).index
    for idx in missing_idx[:3]:
        df.at[idx, 'score'] = np.nan
    for idx in missing_idx[3:]:
        df.at[idx, 'sample_date'] = np.nan
    
    abnormal_idx = df.sample(3, random_state=123).index
    for idx in abnormal_idx:
        df.at[idx, 'score'] = 99.9
    
    return df


def save_sample_data():
    df = generate_sample_data()
    filepath = os.path.join(Config.UPLOAD_FOLDER, 'sample_data.csv')
    df.to_csv(filepath, index=False, encoding='utf-8-sig')
    return filepath, df


if __name__ == '__main__':
    path, df = save_sample_data()
    print(f"样例数据已生成: {path}")
    print(f"共 {len(df)} 条记录")
    print(df.head())
