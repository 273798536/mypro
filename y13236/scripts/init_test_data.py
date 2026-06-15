from datetime import date, time
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.models import Repertoire, StageChannel, PianoSchedule


def init_test_data():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        rep1 = Repertoire(name="月光奏鸣曲", composer="贝多芬", duration_seconds=900)
        rep2 = Repertoire(name="匈牙利狂想曲", composer="李斯特", duration_seconds=720)
        rep3 = Repertoire(name="夜曲Op.9", composer="肖邦", duration_seconds=300)
        db.add_all([rep1, rep2, rep3])
        db.commit()

        ch1 = StageChannel(
            file_name="月光奏鸣曲_贝多芬_v3.wav",
            repertoire_id=rep1.id,
            track_number="CH1",
            start_timecode="00:09:00:00",
            end_timecode="00:10:30:00",
            raw_description="月光奏鸣曲第一乐章 彩排通道1 第15行",
            source_row=15,
        )
        ch2 = StageChannel(
            file_name="wrong_filename_abc.wav",
            repertoire_id=rep2.id,
            track_number="CH2",
            start_timecode="00:10:00:00",
            end_timecode="00:11:15:00",
            raw_description="匈牙利狂想曲 彩排通道2 文件名标记错误 第23行",
            source_row=23,
        )
        ch3 = StageChannel(
            file_name="夜曲Op9_Chopin.wav",
            repertoire_id=rep3.id,
            track_number="CH3",
            start_timecode="00:14:05:00",
            end_timecode="00:14:35:00",
            raw_description="肖邦夜曲 彩排通道3 第31行",
            source_row=31,
        )
        db.add_all([ch1, ch2, ch3])
        db.commit()

        test_date = date(2026, 6, 17)

        s1 = PianoSchedule(
            piano_room_id="A101",
            schedule_date=test_date,
            start_time=time(9, 0, 0),
            end_time=time(10, 30, 0),
            performer="张三",
            stage_channel_id=ch1.id,
            remark="彩排第一轮",
        )
        s2 = PianoSchedule(
            piano_room_id="A101",
            schedule_date=test_date,
            start_time=time(10, 0, 0),
            end_time=time(11, 15, 0),
            performer="李四",
            stage_channel_id=ch2.id,
            remark="与s1时间重叠30分钟",
        )
        s3 = PianoSchedule(
            piano_room_id="A102",
            schedule_date=test_date,
            start_time=time(14, 0, 0),
            end_time=time(14, 30, 0),
            performer="王五",
            stage_channel_id=ch3.id,
            remark="时码与舞台通道表差了5秒",
        )
        s4 = PianoSchedule(
            piano_room_id="A103",
            schedule_date=test_date,
            start_time=time(9, 30, 0),
            end_time=time(10, 30, 0),
            performer="张三",
            remark="与s1演奏者冲突",
        )
        s5 = PianoSchedule(
            piano_room_id="B201",
            schedule_date=test_date,
            start_time=time(15, 0, 0),
            end_time=time(16, 0, 0),
            performer="赵六",
            remark="正常排期 无冲突",
        )
        db.add_all([s1, s2, s3, s4, s5])
        db.commit()

        print("测试数据初始化完成！")
        print(f"曲目表: {rep1.name}, {rep2.name}, {rep3.name}")
        print(f"舞台通道: {ch1.file_name}, {ch2.file_name}(文件名不匹配), {ch3.file_name}")
        print(f"琴房排期: 共5条，包含时间冲突、文件名不匹配、时码偏差、演奏者冲突各一")
    finally:
        db.close()


if __name__ == "__main__":
    init_test_data()
