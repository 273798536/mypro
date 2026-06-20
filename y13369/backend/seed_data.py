#!/usr/bin/env python3
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, Base, engine
from app import models
from datetime import datetime, timedelta
import random

Base.metadata.create_all(bind=engine)


def seed():
    db = SessionLocal()
    try:
        if db.query(models.EvaluationRun).count() > 0:
            print("数据库已有数据，跳过示例数据生成")
            return

        versions = ["v1.2.0", "v1.3.0"]
        evaluators = ["小林", "小张"]

        queries = [
            ("q001", "如何申请信用卡", ["doc_101", "doc_102"]),
            ("q002", "存款利率是多少", ["doc_201"]),
            ("q003", "贷款需要什么条件", ["doc_301", "doc_302", "doc_303"]),
            ("q004", "网银怎么开通", ["doc_401", "doc_402"]),
            ("q005", "忘记密码怎么办", ["doc_501", "doc_502"]),
            ("q006", "转账限额", ["doc_601"]),
            ("q007", "理财产品推荐", ["doc_701", "doc_702", "doc_703"]),
            ("q008", "挂失流程", ["doc_801", "doc_802"]),
            ("q009", "外汇买卖", ["doc_901"]),
            ("q010", "积分兑换", ["doc_1001", "doc_1002"]),
        ]

        for vi, version in enumerate(versions):
            run = models.EvaluationRun(
                model_version=version,
                evaluator=evaluators[vi % 2],
                source_file=f"seed_{version}.csv",
                original_filename=f"评测结果_{version}.csv",
                status="completed",
                notes=f"示例数据 - {version} 版本评测结果",
                created_at=datetime.utcnow() - timedelta(days=len(versions) - vi),
            )
            db.add(run)
            db.flush()

            for qi, (qid, qtext, expected) in enumerate(queries):
                base_recall = 0.7 if vi == 0 else 0.85
                base_precision = 0.6 if vi == 0 else 0.78
                jitter = (random.random() - 0.5) * 0.15

                recalled = expected[:]
                if random.random() < 0.3:
                    recalled.append(f"doc_noise_{random.randint(100, 999)}")
                if random.random() < (0.4 if vi == 0 else 0.2):
                    recalled = recalled[:-1] if recalled else recalled

                metrics = {
                    "recall_rate": round(max(0.0, min(1.0, base_recall + jitter)), 3),
                    "precision": round(max(0.0, min(1.0, base_precision + jitter * 0.8)), 3),
                    "f1": round(max(0.0, min(1.0, (base_recall + base_precision) / 2 + jitter * 0.5)), 3),
                }

                original_fields = {
                    "query_id_col": qid,
                    "query_col": qtext,
                    "golden_docs": ",".join(expected),
                    "recall_list": ",".join(recalled),
                    "召回率": metrics["recall_rate"],
                    "精确率": metrics["precision"],
                }

                anomaly_flag = ""
                anomaly_desc = ""
                if qid == "q003" and vi == 0:
                    anomaly_flag = "pollution"
                    anomaly_desc = "验证集污染：正例 doc_303 出现在训练集中，原始说法见 original_fields"
                if qid == "q007" and vi == 1:
                    anomaly_flag = "anomaly"
                    anomaly_desc = "召回结果异常，仅返回1条"

                rec = models.EvaluationRecord(
                    run_id=run.id,
                    query_id=qid,
                    query_text=qtext,
                    expected_docs=expected,
                    recalled_docs=recalled,
                    metrics=metrics,
                    original_fields=original_fields,
                    original_row_index=qi,
                    anomaly_flag=anomaly_flag,
                    anomaly_desc=anomaly_desc,
                    is_archived=False,
                )
                db.add(rec)
                db.flush()

                if anomaly_flag:
                    ar = models.AnomalyRecord(
                        record_id=rec.id,
                        anomaly_type=anomaly_flag,
                        original_description=anomaly_desc,
                        status="open" if vi == 1 else "resolved",
                        handler="" if vi == 1 else evaluators[0],
                        notes="已确认并归档" if vi == 0 else "待复核人确认",
                    )
                    db.add(ar)

                if qid == "q001" and vi == 0:
                    j = models.ManualJudgment(
                        record_id=rec.id,
                        judge_type="threshold",
                        before_value={"recall_rate": metrics["recall_rate"]},
                        after_value={"recall_rate": 0.95},
                        reason="阈值设置偏严，原召回结果中 doc_102 虽排在第4位但内容高度相关，应计入正例",
                        judge_name=evaluators[0],
                    )
                    db.add(j)

                if qid == "q005" and vi == 0:
                    j = models.ManualJudgment(
                        record_id=rec.id,
                        judge_type="formula",
                        before_value={"f1": metrics["f1"]},
                        after_value={"f1": round(max(0.0, metrics["f1"] + 0.12), 3)},
                        reason="公式计算错误：F1应使用加权而非简单平均",
                        judge_name=evaluators[0],
                    )
                    db.add(j)

        db.commit()
        print("示例数据生成完成！")
        print("  - 评测批次:", len(versions))
        print("  - 评测记录:", len(versions) * len(queries))
    finally:
        db.close()


if __name__ == "__main__":
    seed()
