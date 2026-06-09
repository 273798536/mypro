"""生成示例测试数据

生成两份 Excel：
1. sample_data_v1.xlsx - 初始数据（含部分未评分记录、小样本、极端概率等异常场景）
2. sample_data_v2.xlsx - 补充了晚到错题和评分补录（演示版本对比）
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

random.seed(42)
np.random.seed(42)

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)


def generate_dataset(n_students: int = 30, n_questions: int = 20, with_issues: bool = True) -> pd.DataFrame:
    """生成答题数据集

    with_issues=True 时特意构造各种异常场景：
    - 未评分记录
    - 小样本题目（n<10）
    - 极端正确率（0% 或 100%）
    - 不满足正态近似条件的题目
    - 近似误差过大的题目
    - 反例（口径结论分歧）
    """
    students = [f"S{i:03d}" for i in range(1, n_students + 1)]

    question_configs = []

    # 正常题目 - 10道
    for i in range(1, 11):
        p = np.random.uniform(0.4, 0.8)
        question_configs.append({
            "qid": f"Q{i:03d}",
            "p": p,
            "participation": 1.0,
            "tags": [f"知识点:领域{i % 3 + 1}", f"难度:{'简单' if p > 0.6 else '中等' if p > 0.4 else '困难'}"],
        })

    if with_issues:
        # 小样本题目 - 3道（只有少数学生做了）
        for i in range(11, 14):
            p = np.random.uniform(0.3, 0.7)
            question_configs.append({
                "qid": f"Q{i:03d}",
                "p": p,
                "participation": random.choice([0.1, 0.15, 0.2]),
                "tags": ["知识点:小样本区", "难度:中等"],
            })

        # 全对题目（极端概率 100%）
        question_configs.append({
            "qid": "Q014",
            "p": 1.0,
            "participation": 0.7,
            "tags": ["知识点:送分题", "难度:简单"],
        })

        # 全错题目（极端概率 0%）
        question_configs.append({
            "qid": "Q015",
            "p": 0.0,
            "participation": 0.5,
            "tags": ["知识点:超纲", "难度:困难"],
        })

        # 不满足正态近似（np < 5 或 n(1-p) < 5）
        question_configs.append({
            "qid": "Q016",
            "p": 0.1,
            "participation": 0.8,
            "tags": ["知识点:冷门", "难度:困难"],
        })
        question_configs.append({
            "qid": "Q017",
            "p": 0.9,
            "participation": 0.5,
            "tags": ["知识点:简单", "难度:简单"],
        })

        # 近似误差过大（n较小 + p接近0.5边缘）
        question_configs.append({
            "qid": "Q018",
            "p": 0.2,
            "participation": 0.3,
            "tags": ["知识点:易错", "难度:困难"],
        })

        # 反例候选（刚好卡在决策阈值附近，样本量适中偏小）
        question_configs.append({
            "qid": "Q019",
            "p": 0.55,
            "participation": 0.4,
            "tags": ["知识点:争议题", "难度:中等"],
        })
        question_configs.append({
            "qid": "Q020",
            "p": 0.68,
            "participation": 0.25,
            "tags": ["知识点:临界题", "难度:中等"],
        })

    rows = []
    base_time = datetime(2025, 6, 1, 10, 0, 0)

    unrated_students = set(random.sample(students, 5)) if with_issues else set()

    for student in students:
        for qconf in question_configs:
            if random.random() > qconf["participation"]:
                continue

            is_correct = random.random() < qconf["p"]

            if student in unrated_students and qconf["qid"] in ("Q003", "Q007", "Q011"):
                is_correct_val = None
                score_val = None
            else:
                is_correct_val = is_correct
                score_val = 1.0 if is_correct else (0.5 if random.random() < 0.1 else 0.0)

            answer_time = base_time + timedelta(
                minutes=random.randint(0, 180),
                seconds=random.randint(0, 60),
            )

            rows.append({
                "student_id": student,
                "question_id": qconf["qid"],
                "is_correct": is_correct_val,
                "score": score_val,
                "answer_time": answer_time,
                "tags": ",".join(qconf["tags"]),
            })

    return pd.DataFrame(rows)


def generate_v2_from_v1(df_v1: pd.DataFrame) -> pd.DataFrame:
    """在 v1 基础上添加晚到错题和评分补录"""
    records = df_v1.to_dict("records")

    # 1. 评分补录：找到 v1 中 is_correct 为 NaN 的记录并填上
    for r in records:
        if pd.isna(r["is_correct"]):
            r["is_correct"] = random.random() < 0.4
            r["score"] = 1.0 if r["is_correct"] else 0.0

    # 2. 晚到错题：新增 15 条记录，时间戳较晚
    late_students = [f"S{i:03d}" for i in range(25, 31)]
    late_questions = ["Q001", "Q002", "Q005", "Q008", "Q019"]
    for s in late_students:
        for q in late_questions:
            if random.random() < 0.5:
                is_correct = random.random() < 0.3
                records.append({
                    "student_id": s,
                    "question_id": q,
                    "is_correct": is_correct,
                    "score": 1.0 if is_correct else 0.0,
                    "answer_time": datetime(2025, 6, 3, 18, 0, 0),
                    "tags": "知识点:补交,晚到",
                })

    return pd.DataFrame(records)


def main():
    df_v1 = generate_dataset()
    df_v2 = generate_v2_from_v1(df_v1)

    path_v1 = DATA_DIR / "sample_data_v1.xlsx"
    path_v2 = DATA_DIR / "sample_data_v2.xlsx"

    df_v1.to_excel(path_v1, index=False)
    df_v2.to_excel(path_v2, index=False)

    print(f"✓ 生成 v1 数据: {path_v1} ({len(df_v1)} 条)")
    print(f"✓ 生成 v2 数据: {path_v2} ({len(df_v2)} 条，含晚到补录)")
    print()
    print("v1 数据列:", list(df_v1.columns))
    print("v1 未评分记录数:", df_v1["is_correct"].isna().sum())
    print("v1 题目数:", df_v1["question_id"].nunique())
    print("v1 学生数:", df_v1["student_id"].nunique())


if __name__ == "__main__":
    main()
