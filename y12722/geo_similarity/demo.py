import os
import csv

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")


def generate_demo_csv() -> str:
    os.makedirs(DATA_DIR, exist_ok=True)
    path = os.path.join(DATA_DIR, "demo_input.csv")
    headers = [
        "t1_label", "t1_a", "t1_b", "t1_c", "t1_angle_A", "t1_angle_B", "t1_angle_C",
        "t2_label", "t2_a", "t2_b", "t2_c", "t2_angle_A", "t2_angle_B", "t2_angle_C",
        "unit", "method",
    ]
    rows = [
        {
            "t1_label": "等边△1", "t1_a": 3, "t1_b": 3, "t1_c": 3,
            "t1_angle_A": 60, "t1_angle_B": 60, "t1_angle_C": 60,
            "t2_label": "等边△2", "t2_a": 6, "t2_b": 6, "t2_c": 6,
            "t2_angle_A": 60, "t2_angle_B": 60, "t2_angle_C": 60,
            "unit": "cm", "method": "AUTO",
        },
        {
            "t1_label": "直角△3-4-5", "t1_a": 3, "t1_b": 4, "t1_c": 5,
            "t1_angle_A": "", "t1_angle_B": "", "t1_angle_C": "",
            "t2_label": "直角△6-8-10", "t2_a": 6, "t2_b": 8, "t2_c": 10,
            "t2_angle_A": "", "t2_angle_B": "", "t2_angle_C": "",
            "unit": "cm", "method": "SSS",
        },
        {
            "t1_label": "△5-6-7", "t1_a": 5, "t1_b": 6, "t1_c": 7,
            "t1_angle_A": "", "t1_angle_B": "", "t1_angle_C": "",
            "t2_label": "△10-12-14", "t2_a": 10, "t2_b": 12, "t2_c": 14,
            "t2_angle_A": "", "t2_angle_B": "", "t2_angle_C": "",
            "unit": "cm", "method": "SSS",
        },
        {
            "t1_label": "△3-4-5", "t1_a": 3, "t1_b": 4, "t1_c": 5,
            "t1_angle_A": "", "t1_angle_B": "", "t1_angle_C": "",
            "t2_label": "△4-5-6(不相似)", "t2_a": 4, "t2_b": 5, "t2_c": 6,
            "t2_angle_A": "", "t2_angle_B": "", "t2_angle_C": "",
            "unit": "cm", "method": "SSS",
        },
        {
            "t1_label": "AA角30-60", "t1_a": "", "t1_b": "", "t1_c": "",
            "t1_angle_A": 30, "t1_angle_B": 60, "t1_angle_C": "",
            "t2_label": "AA角30-60", "t2_a": "", "t2_b": "", "t2_c": "",
            "t2_angle_A": 30, "t2_angle_B": 60, "t2_angle_C": "",
            "unit": "cm", "method": "AA",
        },
        {
            "t1_label": "AA角45-45", "t1_a": 1, "t1_b": 1, "t1_c": 1.414,
            "t1_angle_A": 45, "t1_angle_B": 45, "t1_angle_C": 90,
            "t2_label": "AA角45-44(不相似)", "t2_a": 1, "t2_b": 1, "t2_c": 1.414,
            "t2_angle_A": 45, "t2_angle_B": 44, "t2_angle_C": 91,
            "unit": "cm", "method": "AA",
        },
        {
            "t1_label": "近似误差大", "t1_a": 3.0, "t1_b": 4.0, "t1_c": 5.0,
            "t1_angle_A": "", "t1_angle_B": "", "t1_angle_C": "",
            "t2_label": "近似6.1-8.2-10.3", "t2_a": 6.1, "t2_b": 8.2, "t2_c": 10.3,
            "t2_angle_A": "", "t2_angle_B": "", "t2_angle_C": "",
            "unit": "cm", "method": "SSS",
        },
        {
            "t1_label": "非法三角形", "t1_a": 1, "t1_b": 1, "t1_c": 3,
            "t1_angle_A": "", "t1_angle_B": "", "t1_angle_C": "",
            "t2_label": "任意△", "t2_a": 2, "t2_b": 3, "t2_c": 4,
            "t2_angle_A": "", "t2_angle_B": "", "t2_angle_C": "",
            "unit": "cm", "method": "AUTO",
        },
        {
            "t1_label": "SAS夹角60°", "t1_a": 2, "t1_b": 4, "t1_c": "",
            "t1_angle_A": "", "t1_angle_B": 60, "t1_angle_C": "",
            "t2_label": "SAS夹角60°", "t2_a": 4, "t2_b": 8, "t2_c": "",
            "t2_angle_A": "", "t2_angle_B": 60, "t2_angle_C": "",
            "unit": "cm", "method": "SAS",
        },
        {
            "t1_label": "边界小误差", "t1_a": 3.0, "t1_b": 4.0, "t1_c": 5.0,
            "t1_angle_A": "", "t1_angle_B": "", "t1_angle_C": "",
            "t2_label": "6.001-8.001-10.002", "t2_a": 6.001, "t2_b": 8.001, "t2_c": 10.002,
            "t2_angle_A": "", "t2_angle_B": "", "t2_angle_C": "",
            "unit": "cm", "method": "SSS",
        },
    ]
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        for r in rows:
            writer.writerow(r)
    return path
