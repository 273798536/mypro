import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import engine, SessionLocal, Base
from app.models import Experiment, NodeMarking, AuditLog
from app.audit import log_change

Base.metadata.create_all(bind=engine)


def seed():
    db = SessionLocal()
    try:
        if db.query(Experiment).count() > 0:
            print("Seed data already exists, skipping to avoid duplicates.")
            return

        e1 = Experiment(
            title="基础驻波-开放管第3谐波",
            frequency_hz=515.0,
            pipe_length_m=1.0,
            temperature_c=20.0,
            temperature_corrected=False,
            temperature_correction_applied=0.0,
            classroom_notes="课堂演示，常温下测量，未做温度修正",
            source_ref="2024-秋季-物理3班-实验01",
        )
        db.add(e1)
        db.flush()

        n1_1 = NodeMarking(experiment_id=e1.id, position_m=0.25, is_antinode=False)
        n1_2 = NodeMarking(experiment_id=e1.id, position_m=0.50, is_antinode=True)
        n1_3 = NodeMarking(experiment_id=e1.id, position_m=0.75, is_antinode=False)
        db.add_all([n1_1, n1_2, n1_3])
        db.flush()

        log_change(db, e1.id, "experiment", e1.id,
                   "created", None, f"id={e1.id}", reason="seed: 温度修正漏算案例")

        log_change(db, e1.id, "experiment", e1.id,
                   "temperature_corrected", None, "False",
                   reason="seed: 标记未修正温度，此处应做但漏算")

        e2 = Experiment(
            title="节点误标-封闭管基频",
            frequency_hz=172.0,
            pipe_length_m=0.5,
            temperature_c=22.5,
            temperature_corrected=True,
            temperature_correction_applied=1.5,
            classroom_notes="学生标记节点时将波节标为波腹，后人工修正",
            source_ref="2024-秋季-物理2班-实验03",
        )
        db.add(e2)
        db.flush()

        n2_1 = NodeMarking(experiment_id=e2.id, position_m=0.0, is_antinode=False)
        n2_2 = NodeMarking(
            experiment_id=e2.id,
            position_m=0.25,
            is_antinode=False,
            manual_override=True,
            override_reason="原标为波腹，实际为波节，人工修正",
            original_position_m=0.25,
            original_is_antinode=True,
        )
        n2_3 = NodeMarking(experiment_id=e2.id, position_m=0.50, is_antinode=True)
        db.add_all([n2_1, n2_2, n2_3])
        db.flush()

        log_change(db, e2.id, "experiment", e2.id,
                   "created", None, f"id={e2.id}", reason="seed: 节点误标案例")
        log_change(db, e2.id, "node", n2_2.id,
                   "is_antinode", "True", "False",
                   reason="seed: 学生将波节误标为波腹，教师人工修正")
        log_change(db, e2.id, "experiment", e2.id,
                   "temperature_correction_applied", "0", "1.5",
                   reason="seed: 从20°C修正至22.5°C")

        e3 = Experiment(
            title="频率跳变-开放管异常读数",
            frequency_hz=860.0,
            pipe_length_m=1.2,
            temperature_c=19.0,
            temperature_corrected=True,
            temperature_correction_applied=-0.6,
            classroom_notes="相邻两次读数从428Hz跳到860Hz，怀疑仪器共振干扰或拾取了高次谐波",
            source_ref="2024-秋季-物理1班-实验07",
        )
        db.add(e3)
        db.flush()

        n3_1 = NodeMarking(experiment_id=e3.id, position_m=0.171, is_antinode=False)
        n3_2 = NodeMarking(
            experiment_id=e3.id,
            position_m=0.343,
            is_antinode=True,
            manual_override=True,
            override_reason="原读数0.300偏移，手工对齐至理论λ/4位置",
            original_position_m=0.300,
            original_is_antinode=True,
        )
        n3_3 = NodeMarking(experiment_id=e3.id, position_m=0.514, is_antinode=False)
        n3_4 = NodeMarking(experiment_id=e3.id, position_m=0.686, is_antinode=True)
        n3_5 = NodeMarking(experiment_id=e3.id, position_m=0.857, is_antinode=False)
        db.add_all([n3_1, n3_2, n3_3, n3_4, n3_5])
        db.flush()

        log_change(db, e3.id, "experiment", e3.id,
                   "created", None, f"id={e3.id}", reason="seed: 频率跳变案例")
        log_change(db, e3.id, "node", n3_2.id,
                   "position_m", "0.300", "0.343",
                   reason="seed: 测量偏移修正至理论位置")

        e4 = Experiment(
            title="正常对照-开放管基频",
            frequency_hz=172.5,
            pipe_length_m=1.0,
            temperature_c=20.0,
            temperature_corrected=False,
            temperature_correction_applied=0.0,
            classroom_notes="标准条件下基频测量，作为对照组",
            source_ref="2024-秋季-物理3班-实验01-对照",
        )
        db.add(e4)
        db.flush()

        n4_1 = NodeMarking(experiment_id=e4.id, position_m=0.50, is_antinode=True)
        db.add(n4_1)
        db.flush()

        log_change(db, e4.id, "experiment", e4.id,
                   "created", None, f"id={e4.id}", reason="seed: 正常对照案例")

        db.commit()
        print(f"Seed complete: 4 experiments, {db.query(NodeMarking).count()} nodes, {db.query(AuditLog).count()} audit entries.")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
