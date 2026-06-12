"""
样例数据 - 可复现
包含：
1. 正常记录若干
2. 一条重复上报记录（船队追问的场景）
3. 一条潮位时区错记录（验收倒查场景）
4. 一条气象异常记录（顺着异常往回查场景）
5. 一条轨迹速度异常记录
"""

from datetime import datetime, timezone, timedelta
from typing import List

from .models import ProcessingRecord


def generate_sample_records(batch_id: str = "BATCH_001") -> List[ProcessingRecord]:
    """
    生成一批可复现的样例记录。
    seed 固定，每次运行结果一样。
    """
    base_time = datetime(2026, 6, 10, 8, 0, 0, tzinfo=timezone.utc)

    records = []

    # 正常记录 1
    records.append(ProcessingRecord(
        batch_id=batch_id,
        vessel_id="V001",
        survey_time=base_time,
        longitude=118.5000,
        latitude=24.3000,
        depth=5.0,
        timezone_offset_hours=8,
    ))

    # 正常记录 2
    records.append(ProcessingRecord(
        batch_id=batch_id,
        vessel_id="V001",
        survey_time=base_time + timedelta(minutes=15),
        longitude=118.5050,
        latitude=24.3030,
        depth=7.2,
        timezone_offset_hours=8,
    ))

    # 正常记录 3
    records.append(ProcessingRecord(
        batch_id=batch_id,
        vessel_id="V001",
        survey_time=base_time + timedelta(minutes=30),
        longitude=118.5100,
        latitude=24.3060,
        depth=3.8,
        timezone_offset_hours=8,
    ))

    # 气象异常记录：时间调到深夜（风大浪大），验收时顺着异常往回查
    records.append(ProcessingRecord(
        batch_id=batch_id,
        vessel_id="V002",
        survey_time=datetime(2026, 6, 10, 22, 30, 0, tzinfo=timezone.utc),
        longitude=118.5200,
        latitude=24.3100,
        depth=6.5,
        timezone_offset_hours=8,
    ))

    # 潮位时区错记录：记录时区是 UTC+0，而潮位站是 UTC+8
    # 验收会拿这条倒查
    records.append(ProcessingRecord(
        batch_id=batch_id,
        vessel_id="V003",
        survey_time=datetime(2026, 6, 10, 10, 0, 0, tzinfo=timezone.utc),
        longitude=118.4900,
        latitude=24.2950,
        depth=4.5,
        timezone_offset_hours=0,
    ))

    # 轨迹速度异常：时间间隔很短但位置跳很远
    records.append(ProcessingRecord(
        batch_id=batch_id,
        vessel_id="V001",
        survey_time=base_time + timedelta(minutes=31),
        longitude=119.5100,
        latitude=25.3060,
        depth=10.0,
        timezone_offset_hours=8,
    ))

    # 深度异常
    records.append(ProcessingRecord(
        batch_id=batch_id,
        vessel_id="V001",
        survey_time=base_time + timedelta(minutes=45),
        longitude=118.5150,
        latitude=24.3090,
        depth=120.0,
        timezone_offset_hours=8,
    ))

    # 重复上报：和第1条记录指纹一致（同船同时间同位置）
    # 船队追问的场景：不能只给一句模糊提醒
    records.append(ProcessingRecord(
        batch_id=batch_id,
        vessel_id="V001",
        survey_time=base_time,
        longitude=118.5000,
        latitude=24.3000,
        depth=5.2,
        timezone_offset_hours=8,
        extra={"note": "duplicate upload test case"},
    ))

    # 正常记录 4
    records.append(ProcessingRecord(
        batch_id=batch_id,
        vessel_id="V002",
        survey_time=base_time + timedelta(minutes=5),
        longitude=118.5020,
        latitude=24.3010,
        depth=6.0,
        timezone_offset_hours=8,
    ))

    # 正常记录 5
    records.append(ProcessingRecord(
        batch_id=batch_id,
        vessel_id="V002",
        survey_time=base_time + timedelta(minutes=20),
        longitude=118.5080,
        latitude=24.3050,
        depth=4.2,
        timezone_offset_hours=8,
    ))

    return records


def sample_tide_stations():
    return [
        TideStation_default(),
    ]


def TideStation_default():
    from .tide import TideStation
    return TideStation(
        station_id="TIDE_XM_001",
        name="厦门潮位站",
        lon=118.5000,
        lat=24.3000,
        datum_m=0.0,
        timezone_offset_hours=8,
    )
