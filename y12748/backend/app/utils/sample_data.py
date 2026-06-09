import pandas as pd
from typing import List, Dict, Any
import random
from datetime import datetime, timedelta


class SampleDataGenerator:

    @staticmethod
    def generate_question_records() -> List[Dict[str, Any]]:
        materials = [
            ("环氧树脂EP-202", "热固性树脂"),
            ("硅橡胶SR-150", "弹性体"),
            ("聚碳酸酯PC-301", "工程塑料"),
            ("氧化铝陶瓷Al2O3-95", "结构陶瓷"),
            ("铜合金CuSn6", "金属材料"),
            ("聚丙烯PP-R500", "通用塑料"),
            ("聚酰亚胺PI-100", "高性能聚合物"),
            ("氮化硅Si3N4", "结构陶瓷")
        ]

        records = []

        for i in range(1, 25):
            material_name, material_type = random.choice(materials)
            stress_level = round(random.uniform(50, 200), 1)
            temperature = round(random.uniform(25, 180), 1)

            if i == 1:
                lifetime = ""
                unit = ""
            elif i == 2:
                lifetime = "5000小时左右"
                unit = ""
            elif i == 3:
                lifetime = 8500
                unit = ""
            elif i == 4:
                lifetime = 12000
                unit = "h"
            else:
                lifetime = round(random.uniform(1000, 20000), 0)
                unit = random.choice(["h", "小时", ""])

            if i == 5:
                student_answer = "3200h，比预期偏低"
            else:
                student_answer = f"{round(random.uniform(500, 18000), 0)}h"

            correct_answer = f"{round(lifetime if isinstance(lifetime, (int, float)) else random.uniform(1000, 20000), 0)}h"

            constraint_options = [
                "温度不超过150℃",
                "应力水平<150MPa",
                "湿度<80%RH",
                "温度不超过150℃且应力<150MPa",
                ""
            ]
            constraint = constraint_options[i % len(constraint_options)]

            remark_options = [
                "",
                "典型工况数据",
                "加速试验数据，温度120℃",
                "需复核",
                ""
            ]
            remark = remark_options[i % len(remark_options)]

            record = {
                "question_id": f"Q{2024000 + i}",
                "question_content": f"某{material_name}试样在应力{stress_level}MPa、温度{temperature}℃条件下进行寿命试验，测得平均寿命为{lifetime}{unit if unit else '小时'}。试分析其可靠性特征。",
                "material_name": material_name,
                "material_type": material_type,
                "stress_level": stress_level,
                "temperature": temperature,
                "lifetime_hours": lifetime if isinstance(lifetime, (int, float)) else None,
                "unit": unit,
                "student_answer": student_answer,
                "correct_answer": correct_answer,
                "constraint_condition": constraint,
                "remark": remark,
                "source": "2024年春季学期期末考试" if i <= 12 else "2024年秋季学期平时作业"
            }
            records.append(record)

        for i in range(25, 28):
            dup_record = records[i - 25].copy()
            dup_record["question_id"] = dup_record["question_id"]
            dup_record["remark"] = "重复导入，需核对"
            records.append(dup_record)

        conflict_rec = records[10].copy()
        conflict_rec["lifetime_hours"] = conflict_rec["lifetime_hours"] * 0.7 if conflict_rec["lifetime_hours"] else 5000
        conflict_rec["remark"] = "答案与正确答案冲突"
        records.append(conflict_rec)

        return records

    @staticmethod
    def generate_sample_batch() -> Dict[str, Any]:
        return {
            "batch_name": "示例数据 - 2024年可靠性工程课程作业",
            "file_name": "reliability_sample_data.xlsx",
            "remark": "首次打开系统时自动加载的示例数据，包含学生错题、历史答案和约束冲突等典型情况"
        }

    @staticmethod
    def generate_sample_review_session(batch_id: int) -> Dict[str, Any]:
        return {
            "batch_id": batch_id,
            "session_name": "示例复核 - 课堂讲解用",
            "session_type": "classroom",
            "include_wrong_answers": True,
            "include_historical_answers": True,
            "include_conflicts": True,
            "remark": "此复核包含学生错题、历史答案和约束冲突，用于课堂讲解演示"
        }

    @staticmethod
    def records_to_dataframe(records: List[Dict[str, Any]]) -> pd.DataFrame:
        return pd.DataFrame(records)
