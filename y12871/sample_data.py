"""
真实感样例数据
==============

包含日常材料中常见的"小麻烦":
  - 部分浮标数据字段缺失 (风速/风向/流速等)
  - 个别浮标完全失效 (传感器故障)
  - 波高数据经常缺
  - 有些点漂移速度异常 (可能是误报)
  - 部分数据时间戳滞后 (风险通报晚到)
  - 漂移路径偶尔穿越禁航区
  - 巡检照片位置估算有误差
"""

from datetime import datetime, timedelta

from models import (
    BuoyData, Position, RestrictedZone,
    DriftStatus
)


def create_sample_buoys(base_time: datetime) -> list:
    """
    创建一批真实感的浮标数据

    包含的"小麻烦":
      - BUOY-001: 数据完整, 位置靠北
      - BUOY-002: 缺少波高数据 (很常见)
      - BUOY-003: 缺少风向 (传感器卡住了)
      - BUOY-004: 完全失效 (通信故障)
      - BUOY-005: 数据完整, 位置靠东
      - BUOY-006: 只有流速流向, 没风数据 (风传感器坏了)
    """
    buoys = []

    buoys.append(BuoyData(
        buoy_id="BUOY-001",
        position=Position(lat=31.23, lon=122.30, timestamp=base_time),
        wind_speed=15.2,
        wind_direction=45.0,
        current_speed=1.2,
        current_direction=120.0,
        wave_height=1.8,
        is_valid=True
    ))

    buoys.append(BuoyData(
        buoy_id="BUOY-002",
        position=Position(lat=30.85, lon=122.10, timestamp=base_time),
        wind_speed=12.8,
        wind_direction=30.0,
        current_speed=0.8,
        current_direction=100.0,
        wave_height=None,  # 波高数据缺失 - 常见问题
        is_valid=True
    ))

    buoys.append(BuoyData(
        buoy_id="BUOY-003",
        position=Position(lat=30.50, lon=122.50, timestamp=base_time),
        wind_speed=18.5,
        wind_direction=None,  # 风向传感器卡住了
        current_speed=1.5,
        current_direction=90.0,
        wave_height=2.2,
        is_valid=True
    ))

    buoys.append(BuoyData(
        buoy_id="BUOY-004",
        position=Position(lat=31.00, lon=123.00, timestamp=base_time),
        wind_speed=None,
        wind_direction=None,
        current_speed=None,
        current_direction=None,
        wave_height=None,
        is_valid=False,  # 浮标完全失效 - 通信故障
        invalid_reason="通信中断超过24小时, 数据不可用"
    ))

    buoys.append(BuoyData(
        buoy_id="BUOY-005",
        position=Position(lat=30.20, lon=122.80, timestamp=base_time),
        wind_speed=20.3,
        wind_direction=60.0,
        current_speed=2.0,
        current_direction=135.0,
        wave_height=3.1,
        is_valid=True
    ))

    buoys.append(BuoyData(
        buoy_id="BUOY-006",
        position=Position(lat=31.50, lon=122.60, timestamp=base_time),
        wind_speed=None,  # 风传感器坏了
        wind_direction=None,
        current_speed=1.0,
        current_direction=110.0,
        wave_height=None,
        is_valid=True
    ))

    return buoys


def create_sample_restricted_zones() -> list:
    """
    创建样例禁航区

    包含:
      - 航道禁航区
      - 军事演习区
      - 水产养殖区
    """
    zones = []

    zones.append(RestrictedZone(
        zone_id="RZ-001",
        name="长江口深水航道禁航区",
        polygon=[
            (31.10, 122.20),
            (31.10, 122.50),
            (30.90, 122.50),
            (30.90, 122.20),
        ],
        reason="航道施工, 禁止无关船舶进入"
    ))

    zones.append(RestrictedZone(
        zone_id="RZ-002",
        name="东海军事演习区",
        polygon=[
            (30.60, 122.60),
            (30.60, 122.90),
            (30.30, 122.90),
            (30.30, 122.60),
        ],
        reason="军事演习, 严禁进入"
    ))

    zones.append(RestrictedZone(
        zone_id="RZ-003",
        name="嵊泗水产养殖区",
        polygon=[
            (30.80, 122.40),
            (30.80, 122.65),
            (30.60, 122.65),
            (30.60, 122.40),
        ],
        reason="水产养殖区, 注意避让"
    ))

    return zones


def create_sample_photos(base_time: datetime) -> list:
    """
    创建样例巡检照片

    包含日常常见的小问题:
      - PHOTO-001: 位置估算较准, 时间正确
      - PHOTO-002: 位置有点偏差, 时间戳晚了2小时 (通报晚到)
      - PHOTO-003: 位置估算有较大误差, 需要人工复核
    """
    photos = []

    photos.append({
        "photo_id": "PHOTO-001",
        "photo_path": "/photos/20240612/IMG_0845.jpg",
        "capture_time": base_time,
        "estimated_position": Position(lat=31.0, lon=122.3, timestamp=base_time),
        "notes": "海事巡逻艇拍摄, 疑似救生艇残骸"
    })

    photos.append({
        "photo_id": "PHOTO-002",
        "photo_path": "/photos/20240612/IMG_0856.jpg",
        "capture_time": base_time - timedelta(hours=2),  # 晚到通报 - 很真实的问题
        "estimated_position": Position(lat=30.7, lon=122.5,
                                        timestamp=base_time - timedelta(hours=2)),
        "notes": "渔船转报照片, 时间有延迟, 位置大概准"
    })

    photos.append({
        "photo_id": "PHOTO-003",
        "photo_path": "/photos/20240612/IMG_0872.jpg",
        "capture_time": base_time - timedelta(hours=1),
        "estimated_position": Position(lat=30.4, lon=122.7,
                                        timestamp=base_time - timedelta(hours=1)),
        "notes": "无人机航拍, 位置可能有±2海里误差, 待核实"
    })

    return photos


def get_sample_description() -> str:
    """返回样例数据的说明"""
    return """
【样例数据说明】

这批样例数据模拟了日常海上搜救工作中常见的真实情况:

  浮标数据 (6个):
    - BUOY-001: 数据完整, 靠北
    - BUOY-002: 缺波高数据 (传感器常见故障)
    - BUOY-003: 缺风向 (风向传感器卡住)
    - BUOY-004: 完全失效 (通信中断)
    - BUOY-005: 数据完整, 靠东
    - BUOY-006: 只有海流数据, 风传感器全坏

  禁航区 (3个):
    - RZ-001: 长江口深水航道禁航区
    - RZ-002: 东海军事演习区
    - RZ-003: 嵊泗水产养殖区

  巡检照片 (3张):
    - PHOTO-001: 位置较准, 时间正常
    - PHOTO-002: 时间滞后2小时 (风险通报晚到)
    - PHOTO-003: 位置估算有±2海里误差

这些"小麻烦"都是日常材料里常混进来的情况,
可以用来测试系统的容错处理、降级计算和人工复核流程。
"""


if __name__ == "__main__":
    base = datetime(2024, 6, 12, 8, 0, 0)
    buoys = create_sample_buoys(base)
    print(f"生成了 {len(buoys)} 个浮标样例数据")
    for b in buoys:
        print(f"  {b.buoy_id}: 完整度 {b.completeness_score()*100:.0f}%, "
              f"{'有效' if b.is_valid else '失效'}")
