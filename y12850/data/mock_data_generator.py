import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os


def generate_tide_table(output_path: str = None) -> pd.DataFrame:
    """
    生成模拟潮汐表数据，包含正常数据和异常数据（如潮位时区错）

    数据字段说明：
    - source_row: 原始行号（Excel中的行号，从第2行开始，第1行为表头）
    - station_id: 潮位站编号
    - station_name: 潮位站名称
    - obs_time_str: 观测时间字符串（原始记录，可能带有时区错误）
    - reported_timezone: 上报的时区
    - actual_timezone: 实际正确的时区（用于验证，生产环境中不可用）
    - tide_level_cm: 潮位（厘米）
    - is_high_tide: 是否为高潮
    - source_file: 来源文件名
    - source_note: 来源备注
    - has_timezone_error: 标记是否存在时区错误（模拟异常）
    """
    np.random.seed(42)

    stations = [
        ("T001", "东港养殖场一号站", "Asia/Shanghai"),
        ("T002", "东港养殖场二号站", "Asia/Shanghai"),
        ("T003", "南岛礁观测站", "Asia/Shanghai"),
        ("T004", "西湾深水站", "Asia/Shanghai"),
        ("T005", "北堤外海站", "Asia/Shanghai"),
    ]

    base_date = datetime(2024, 6, 15)
    records = []
    row_num = 2

    for station_id, station_name, correct_tz in stations:
        for day_offset in range(3):
            for tide_type in ["high", "low"]:
                current_date = base_date + timedelta(days=day_offset)
                hour = 2 if tide_type == "high" else 8
                minute = np.random.randint(0, 60)
                correct_time = current_date.replace(hour=hour, minute=minute)

                has_timezone_error = False
                reported_tz = correct_tz
                obs_time_display = correct_time

                if (station_id == "T003" and day_offset == 1) or (station_id == "T002" and day_offset == 2):
                    has_timezone_error = True
                    reported_tz = "UTC"
                    obs_time_display = correct_time - timedelta(hours=8)

                tide_level = np.random.randint(80, 320) if tide_type == "high" else np.random.randint(20, 90)

                records.append({
                    "source_row": row_num,
                    "station_id": station_id,
                    "station_name": station_name,
                    "obs_time_str": obs_time_display.strftime("%Y-%m-%d %H:%M"),
                    "reported_timezone": reported_tz,
                    "actual_timezone": correct_tz,
                    "tide_level_cm": tide_level,
                    "is_high_tide": 1 if tide_type == "high" else 0,
                    "source_file": "tide_table_20240615.xlsx",
                    "source_note": "场长办公室提供，原件扫描版第{}页".format((row_num - 2) // 10 + 1),
                    "has_timezone_error": 1 if has_timezone_error else 0,
                })
                row_num += 1

    df = pd.DataFrame(records)

    if output_path:
        df.to_csv(output_path, index=False, encoding="utf-8-sig")
        print(f"潮汐表已生成: {output_path}，共 {len(df)} 条记录")

    return df


def generate_ship_trajectory(output_path: str = None) -> pd.DataFrame:
    """
    生成模拟船舶轨迹数据

    数据字段说明：
    - source_row: 原始行号
    - ship_id: 船舶编号
    - ship_name: 船舶名称
    - record_time: 记录时间
    - longitude: 经度
    - latitude: 纬度
    - speed_kn: 航速（节）
    - heading_deg: 航向（度）
    - water_depth_m: 水深（米）
    - source_file: 来源文件名
    - source_note: 来源备注
    """
    np.random.seed(123)

    ships = [
        ("S001", "浙象渔001"),
        ("S002", "浙象渔023"),
        ("S003", "浙象渔088"),
        ("S004", "养殖运输船01"),
    ]

    base_lon = 121.95
    base_lat = 29.28

    records = []
    row_num = 2

    for ship_id, ship_name in ships:
        start_lon = base_lon + np.random.uniform(-0.1, 0.1)
        start_lat = base_lat + np.random.uniform(-0.08, 0.08)
        current_lon = start_lon
        current_lat = start_lat
        base_time = datetime(2024, 6, 15, 5, 0)

        for i in range(20):
            record_time = base_time + timedelta(minutes=i * 15)
            current_lon += np.random.uniform(-0.005, 0.008)
            current_lat += np.random.uniform(-0.004, 0.006)
            speed = np.random.uniform(2.0, 8.5)
            heading = np.random.randint(0, 360)
            water_depth = np.random.uniform(3.5, 18.0)

            records.append({
                "source_row": row_num,
                "ship_id": ship_id,
                "ship_name": ship_name,
                "record_time": record_time.strftime("%Y-%m-%d %H:%M"),
                "longitude": round(current_lon, 6),
                "latitude": round(current_lat, 6),
                "speed_kn": round(speed, 2),
                "heading_deg": heading,
                "water_depth_m": round(water_depth, 2),
                "source_file": "AIS轨迹_20240615.csv",
                "source_note": "船队调度系统导出，船舶{}_{}".format(
                    ship_id, record_time.strftime("%H%M")
                ),
            })
            row_num += 1

    df = pd.DataFrame(records)

    if output_path:
        df.to_csv(output_path, index=False, encoding="utf-8-sig")
        print(f"船舶轨迹已生成: {output_path}，共 {len(df)} 条记录")

    return df


if __name__ == "__main__":
    data_dir = os.path.dirname(os.path.abspath(__file__))
    generate_tide_table(os.path.join(data_dir, "tide_table_sample.csv"))
    generate_ship_trajectory(os.path.join(data_dir, "ship_trajectory_sample.csv"))
    print("模拟数据生成完成")
