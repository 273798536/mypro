import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

SAMPLES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "samples")
os.makedirs(SAMPLES_DIR, exist_ok=True)


SEED = 42


def generate_tide_samples() -> str:
    np.random.seed(SEED)
    base_date = datetime(2026, 6, 10)
    stations = ["东沙港", "东沙港", "北礁码头", "南岛锚地"]
    rows = []

    patterns = [
        ("2026-06-10 02:15:00", 3.8, "高潮", "", ""),
        ("2026/06/10 08:42", 1.2, "低潮", "", ""),
        ("2026-06-10 14:28:00", 4.1, "高潮", "", ""),
        ("2026年06月10日 20时55分", 0.9, "低潮", "", ""),
        ("2026-06-11 03:02", 3.5, "高潮", "", ""),
        ("2026-06-11 09:30", 1.5, "低潮", "", ""),
        ("2026-06-11 15:18", 3.9, "高潮", "", ""),
        ("2026-06-11 21:45", 1.1, "低潮", "", ""),
        ("2026-06-12 03:50", 3.6, "高潮", "", ""),
        ("2026-06-12 10:15", 1.3, "低潮", "", ""),
        ("2026-06-12 16:05", 4.0, "高潮", "", ""),
        ("2026-06-12 22:30", 1.0, "低潮", "", ""),
    ]

    idx = 0
    for station in stations:
        for tm, h, ttype, _, _ in patterns:
            row = {"站点": station, "潮时": tm, "潮高": h, "潮型": ttype, "备注": "", "时区": ""}

            if idx == 3:
                row["潮高"] = ""
            if idx == 7:
                row["潮时"] = ""
            if idx == 11:
                row["潮型"] = ""
                row["备注"] = "实际低潮，人工记录"
            if idx == 15:
                row["时区"] = "UTC"
                row["备注"] = "原始数据UTC，需转北京时"
            if idx == 19:
                row["备注"] = "高潮数据，参考上月表"
                row["潮型"] = ""
            if idx == 23:
                row["潮高"] = "3.2米"
            if idx == 27:
                row["潮时"] = "2026-06-11 03:02"
                row["站点"] = stations[0]
                row["潮高"] = 3.5
                row["潮型"] = "高潮"
            if idx == 31:
                row["时区"] = "东京"
                row["备注"] = "日方提供数据"
            if idx == 35:
                row["潮高"] = 99.0
            if idx == 39:
                row["备注"] = "高潮，设备故障后补录"
                row["潮型"] = ""

            rows.append(row)
            idx += 1

    df = pd.DataFrame(rows)
    path = os.path.join(SAMPLES_DIR, "tide_data_dirty.csv")
    df.to_csv(path, index=False, encoding="utf-8-sig")
    return path


def generate_trajectory_samples() -> str:
    np.random.seed(SEED)
    rows = [
        {
            "船名": "浙渔供668",
            "船舶编号": "ZYG-0668",
            "到港时间": "2026-06-11 02:30",
            "离港时间": "2026-06-11 14:00",
            "淡水需求(吨)": 80,
            "航线": "舟山-东沙",
            "备注": "渔汛期加急",
        },
        {
            "船名": "闽运水12",
            "船舶编号": "MYS-0012",
            "到港时间": "2026-06-11 12:00",
            "离港时间": "2026-06-12 06:00",
            "淡水需求(吨)": 120,
            "航线": "厦门-北礁",
            "备注": "",
        },
        {
            "船名": "琼补给003",
            "船舶编号": "QBJ-0003",
            "到港时间": "2026-06-12 08:00",
            "离港时间": "2026-06-12 20:00",
            "淡水需求(吨)": 60,
            "航线": "三亚-南岛",
            "备注": "常规补给",
        },
        {
            "船名": "粤水船21",
            "船舶编号": "YSC-0021",
            "到港时间": "2026-06-12 14:30",
            "离港时间": "2026-06-13 02:00",
            "淡水需求(吨)": 95,
            "航线": "广州-东沙",
            "备注": "临时加单",
        },
        {
            "船名": "浙渔供668",
            "船舶编号": "ZYG-0668",
            "到港时间": "2026-06-11 02:30",
            "离港时间": "2026-06-11 14:00",
            "淡水需求(吨)": 80,
            "航线": "舟山-东沙",
            "备注": "重复导入测试",
        },
        {
            "船名": "沪航补88",
            "船舶编号": "HHB-0088",
            "到港时间": "2026-06-13 06:00",
            "离港时间": "2026-06-13 18:00",
            "淡水需求(吨)": 150,
            "航线": "上海-北礁",
            "备注": "",
        },
    ]
    df = pd.DataFrame(rows)
    path = os.path.join(SAMPLES_DIR, "vessel_trajectories.csv")
    df.to_csv(path, index=False, encoding="utf-8-sig")
    return path


def generate_all_samples() -> dict:
    tide_path = generate_tide_samples()
    traj_path = generate_trajectory_samples()
    return {
        "tide_csv": tide_path,
        "trajectory_csv": traj_path,
    }


if __name__ == "__main__":
    paths = generate_all_samples()
    print("样例数据生成完毕:")
    for k, v in paths.items():
        print(f"  {k}: {v}")
