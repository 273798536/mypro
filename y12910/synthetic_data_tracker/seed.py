import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import init_db, get_connection
from services.record_service import create_record, transition_status, update_record
from models import RecordCreate, RecordUpdate


def reset_all():
    init_db()
    conn = get_connection()
    conn.execute("DELETE FROM source_traces")
    conn.execute("DELETE FROM version_logs")
    conn.execute("DELETE FROM records")
    conn.execute("DELETE FROM sqlite_sequence WHERE name IN ('records','version_logs','source_traces')")
    conn.commit()
    conn.close()


def seed():
    reset_all()

    r1 = create_record(RecordCreate(
        source_material="合成数据集v2.1/prompt_v3",
        prompt_version="v3",
        content="请根据以下医学文献摘要，生成一份面向患者的健康科普说明，要求语言通俗易懂，不超过300字。",
        feedback="生成质量优秀，语言通顺，信息准确",
        notes="第3轮提示词优化后的结果",
    ))
    transition_status(r1.id, "pending_review", changed_by="张评测", reason="初步审核通过")
    transition_status(r1.id, "confirmed", changed_by="张评测", reason="复核确认，可直接用于评测题库")
    print(f"[1] 顺利记录 id={r1.id}, status=confirmed (ready)")

    r2 = create_record(RecordCreate(
        source_material="合成数据集v2.1/prompt_v2",
        prompt_version="v2",
        content="请根据以下法律条文，生成一组模拟法庭辩论的问题和回答，要求覆盖正反两方观点。",
        feedback="正方论点偏弱，需要补充反方论据",
        notes="待评测负责人确认反方论据是否充分  备注：李工说可以补两条例子",
    ))
    transition_status(r2.id, "pending_review", changed_by="张评测", reason="提交复核")
    print(f"[2] 待确认记录 id={r2.id}, status=pending_review (needs_review)")

    r3 = create_record(RecordCreate(
        source_material="",
        prompt_version="",
        content="",
        feedback="",
        notes="备注混写：来源不明/疑似重复/空值测试||负责人说先标坏数据",
    ))
    transition_status(r3.id, "pending_review", changed_by="张评测", reason="标记待复核")
    transition_status(r3.id, "rejected", changed_by="张评测", reason="内容为空，来源材料缺失，标记为坏数据")
    print(f"[3] 明显坏数据 id={r3.id}, status=rejected (rejected)")

    update_record(r3.id, RecordUpdate(feedback="空值记录，无来源、无内容、无提示词版本"), changed_by="张评测")
    print("样例数据写入完成。预期报告分类：ready=1, needs_review=1, rejected=1")


if __name__ == "__main__":
    seed()
