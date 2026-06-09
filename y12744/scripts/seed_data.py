import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app import models
from app.engine import engine as conic_engine
from datetime import datetime


SAMPLE_RECORDS = [
    {
        "record_no": "CONIC-2026-001",
        "student_name": "张三",
        "question_id": "Q2026-HL-07",
        "curve_type": "ellipse",
        "a": 5.0,
        "b": 3.0,
        "eccentricity": 0.8,
        "unit": "cm",
        "raw_formula": "x²/25 + y²/9 = 1",
        "status": models.ReviewStatus.CONFIRMED,
        "chart_supplied": True,
        "answers": [
            {"answer_type": "student_answer", "answer_content": "a=5, b=3, c=4, 焦点在x轴上", "is_correct": True, "source": "当堂作业"},
            {"answer_type": "historical_answer", "answer_content": "a=5, b=3, e=0.8", "is_correct": True, "source": "2024年同期作业"},
        ],
        "issues": [],
        "remark": "参数完整、学生答案正确，作为顺利样例。",
    },
    {
        "record_no": "CONIC-2026-002",
        "student_name": "李四",
        "question_id": "Q2026-HL-07",
        "curve_type": "ellipse",
        "a": 5.0,
        "b": 4.0,
        "eccentricity": 0.6,
        "unit": None,
        "raw_formula": "x²/25 + y²/16 = 1",
        "status": models.ReviewStatus.PENDING_CONFIRM,
        "chart_supplied": False,
        "answers": [
            {"answer_type": "student_answer", "answer_content": "a=5, b=4, 离心率=4/5", "is_correct": False, "source": "当堂作业"},
            {"answer_type": "historical_answer", "answer_content": "a=5, b=4, e=3/5=0.6", "is_correct": True, "source": "2024年同期作业"},
            {"answer_type": "wrong_answer_sample", "answer_content": "误将c算成√(a²+b²)，得出e=√41/5", "is_correct": False, "source": "本班错题本"},
        ],
        "issues": [
            {
                "issue_type": "unit_missing",
                "severity": "blocker",
                "description": "单位缺失：圆锥曲线参数必须标注长度单位（如cm、m等），否则结论不具备物理意义，报告将被拦截导出。",
                "is_resolved": False,
            },
            {
                "issue_type": "student_mistake",
                "severity": "warning",
                "description": "学生混淆椭圆与双曲线的c计算公式，将c=√(a²-b²)误写为c=√(a²+b²)，需重点提醒。",
                "is_resolved": False,
            },
        ],
        "remark": "待确认样例：单位缺失导致报告无法导出，同时包含学生错题与历史正确答案对比。",
    },
    {
        "record_no": "CONIC-2026-003",
        "student_name": "王五",
        "question_id": "Q2026-HL-08",
        "curve_type": "ellipse",
        "a": 3.0,
        "b": -4.0,
        "eccentricity": 1.5,
        "unit": "m",
        "raw_formula": "x²/9 - y²/16 = 1",
        "status": models.ReviewStatus.REVIEWING,
        "chart_supplied": True,
        "answers": [
            {"answer_type": "student_answer", "answer_content": "椭圆 a=3, b=-4, e=1.5", "is_correct": False, "source": "当堂作业"},
            {"answer_type": "historical_answer", "answer_content": "应为双曲线：x²/9 - y²/16 = 1, a=3, b=4, e=5/3", "is_correct": True, "source": "2024年同期作业"},
            {"answer_type": "wrong_answer_sample", "answer_content": "b取值为负，与曲线类型(椭圆)冲突，a、b必须同为正", "is_correct": False, "source": "本班错题本"},
        ],
        "issues": [
            {
                "issue_type": "constraint_conflict",
                "severity": "error",
                "description": "椭圆参数a、b应同为正数，但当前b=-4.0",
                "is_resolved": False,
            },
            {
                "issue_type": "constraint_conflict",
                "severity": "error",
                "description": "椭圆离心率应为0<e<1，但当前e=1.5",
                "is_resolved": False,
            },
            {
                "issue_type": "curve_type_mismatch",
                "severity": "warning",
                "description": "填写曲线类型为椭圆，但标准方程 x²/9 - y²/16 = 1 实为双曲线，类型与方程不一致。",
                "is_resolved": False,
            },
        ],
        "remark": "明显坏数据样例：曲线类型、参数符号、离心率三者互相冲突，需在同一轮复核中集中呈现给投委会。",
    },
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for sample in SAMPLE_RECORDS:
            existing = db.query(models.ConicRecord).filter(
                models.ConicRecord.record_no == sample["record_no"]
            ).first()
            if existing:
                print(f"记录 {sample['record_no']} 已存在，跳过。")
                continue

            answers_data = sample.pop("answers", [])
            issues_data = sample.pop("issues", [])
            remark = sample.pop("remark", "")
            chart_supplied = sample.pop("chart_supplied", False)

            valid, auto_issues = conic_engine.validate_record(sample)
            record = models.ConicRecord(**sample)
            db.add(record)
            db.flush()

            computed = conic_engine.compute_results(
                record.a, record.b, record.c, record.focus_x, record.focus_y,
                record.directrix, record.eccentricity, record.curve_type, record.unit
            )
            version = models.RecordVersion(
                record_id=record.id,
                version_no=1,
                a=record.a,
                b=record.b,
                c=record.c,
                curve_type=computed.get("curve_type"),
                eccentricity=computed.get("eccentricity"),
                formula=computed.get("formula"),
                computed_results=computed,
                chart_supplied=chart_supplied,
                created_by="seed_script",
                remark=remark or "样例数据初始化"
            )
            db.add(version)

            seen_keys = set()
            merged_issues = []
            for issue_data in issues_data + auto_issues:
                key = (issue_data["issue_type"], issue_data["description"])
                if key not in seen_keys:
                    seen_keys.add(key)
                    merged_issues.append(issue_data)
            for issue_data in merged_issues:
                issue = models.ReviewIssue(
                    record_id=record.id,
                    issue_type=issue_data["issue_type"],
                    severity=issue_data.get("severity", "warning"),
                    description=issue_data["description"],
                    is_resolved=issue_data.get("is_resolved", False),
                    resolved_at=datetime.utcnow() if issue_data.get("is_resolved") else None,
                )
                db.add(issue)

            for ans in answers_data:
                answer = models.StudentAnswer(
                    record_id=record.id,
                    answer_type=ans["answer_type"],
                    answer_content=ans["answer_content"],
                    is_correct=ans.get("is_correct"),
                    source=ans.get("source"),
                )
                db.add(answer)

            db.commit()
            print(f"已导入样例记录：{record.record_no} ({record.student_name})")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("样例数据初始化完成。")
