"""演示数据生成。

生成一组不太干净的演示数据，包含：
1. 正常样本
2. 名称不一致的材料
3. 采样缺口
4. 极端值

跑完不能像只展示了正常样例。
"""

import csv
import os
import random
from typing import List, Dict, Any, Tuple


BEAM_IDS = [f"L{i:03d}" for i in range(1, 11)]
MEASURE_POINTS = ["1/4跨", "1/2跨", "3/4跨", "L/4", "L/2", "3L/4"]

NORMAL_MATERIALS = [
    "C50混凝土",
    "C50混凝土",
    "C50混凝土",
    "预应力C50",
    "C50混凝土",
]

INCONSISTENT_MATERIAL = "50号混凝土"

CONSTRUCTION_TEAMS = ["一班", "二班", "三班"]


def _generate_normal_value(base_ratio: float = 1.05, spread: float = 0.08) -> float:
    """生成正态分布的挠度比。"""
    return base_ratio + random.gauss(0, spread)


def generate_demo_csv(
    output_path: str,
    num_normal: int = 30,
    num_extreme: int = 3,
    num_gaps: int = 2,
    seed: int = 42,
) -> str:
    """生成演示CSV文件。

    包含：
    - 多数正常数据
    - 少数极端值（偏高和偏低）
    - 采样缺口
    - 材料名称不一致的记录
    """
    random.seed(seed)

    records = []

    for i in range(num_normal):
        beam_id = random.choice(BEAM_IDS)
        point = random.choice(MEASURE_POINTS[:3])
        material = random.choice(NORMAL_MATERIALS)
        team = random.choice(CONSTRUCTION_TEAMS)
        ratio = _generate_normal_value()
        design_val = 100.0
        measured_val = design_val * ratio

        records.append({
            "梁编号": beam_id,
            "测量截面": point,
            "检测日期": f"2025-0{(i % 9) + 1}-{(i % 28) + 1:02d}",
            "设计挠度(mm)": f"{design_val:.2f}",
            "实测挠度(mm)": f"{measured_val:.2f}",
            "挠度比": f"{ratio:.4f}",
            "材料名称": material,
            "材料批号": f"P2025{(i % 12) + 1:02d}{(i % 30) + 1:02d}",
            "施工班组": team,
            "备注": "",
        })

    for i in range(num_extreme):
        beam_id = f"E{i+1:03d}"
        point = random.choice(MEASURE_POINTS[:3])
        material = "C50混凝土"
        team = random.choice(CONSTRUCTION_TEAMS)

        if i % 2 == 0:
            ratio = 1.05 + 0.25 + random.random() * 0.1
        else:
            ratio = 1.05 - 0.25 - random.random() * 0.05

        design_val = 100.0
        measured_val = design_val * ratio

        records.append({
            "梁编号": beam_id,
            "测量截面": point,
            "检测日期": f"2025-10-{i+1:02d}",
            "设计挠度(mm)": f"{design_val:.2f}",
            "实测挠度(mm)": f"{measured_val:.2f}",
            "挠度比": f"{ratio:.4f}",
            "材料名称": material,
            "材料批号": f"E2025{i+1:02d}",
            "施工班组": team,
            "备注": "数值异常，待复核",
        })

    for i in range(num_gaps):
        beam_id = f"G{i+1:03d}"
        point = random.choice(MEASURE_POINTS[:3])
        team = random.choice(CONSTRUCTION_TEAMS)

        records.append({
            "梁编号": beam_id,
            "测量截面": point,
            "检测日期": f"2025-11-{i+5:02d}",
            "设计挠度(mm)": "100.00",
            "实测挠度(mm)": "--",
            "挠度比": "",
            "材料名称": "C50混凝土",
            "材料批号": f"G2025{i+1:02d}",
            "施工班组": team,
            "备注": "缺测，仪器故障",
        })

    inc_beam = "INC001"
    inc_point = "1/2跨"
    inc_ratio = _generate_normal_value()
    records.insert(len(records) // 2, {
        "梁编号": inc_beam,
        "测量截面": inc_point,
        "检测日期": "2025-09-15",
        "设计挠度(mm)": "100.00",
        "实测挠度(mm)": f"{100.0 * inc_ratio:.2f}",
        "挠度比": f"{inc_ratio:.4f}",
        "材料名称": INCONSISTENT_MATERIAL,
        "材料批号": "I20250915",
        "施工班组": "二班",
        "备注": "",
    })

    random.shuffle(records)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)) or ".", exist_ok=True)

    fieldnames = ["梁编号", "测量截面", "检测日期", "设计挠度(mm)", "实测挠度(mm)",
                   "挠度比", "材料名称", "材料批号", "施工班组", "备注"]
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    return output_path


def generate_demo_csv_v2(output_path: str) -> str:
    """生成另一种字段名的演示CSV，测试字段映射兼容性。

    字段名与第一个版本不同，但语义相同。
    """
    random.seed(123)

    records = []
    for i in range(15):
        beam_id = f"V2-{i+1:03d}"
        point = random.choice(["跨中", "四分之一跨", "四分之三跨"])
        ratio = _generate_normal_value()

        records.append({
            "girder_id": beam_id,
            "position": point,
            "date": f"2025-08-{i+1:02d}",
            "design_deflection": "100.00",
            "measured_deflection": f"{100.0 * ratio:.2f}",
            "material": "C50混凝土",
            "batch_no": f"B202508{i+1:02d}",
            "team": random.choice(CONSTRUCTION_TEAMS),
        })

    os.makedirs(os.path.dirname(os.path.abspath(output_path)) or ".", exist_ok=True)

    fieldnames = ["girder_id", "position", "date", "design_deflection",
                   "measured_deflection", "material", "batch_no", "team"]
    with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    return output_path


def generate_all_demo_data(target_dir: str) -> Dict[str, str]:
    """生成所有演示数据文件。"""
    os.makedirs(target_dir, exist_ok=True)

    files = {}
    files["demo_main"] = generate_demo_csv(
        os.path.join(target_dir, "demo_experiment_records.csv"),
        num_normal=30,
        num_extreme=3,
        num_gaps=2,
    )
    files["demo_v2"] = generate_demo_csv_v2(
        os.path.join(target_dir, "demo_experiment_v2.csv"),
    )

    return files


def get_demo_description() -> str:
    """获取演示数据说明。"""
    return """演示数据说明：
1. demo_experiment_records.csv - 主演示数据（中文表头）
   - 30条正常数据
   - 3条极端值（偏高/偏低）
   - 2条采样缺口（标记为"--"）
   - 1条材料名称不一致（"50号混凝土" 而非 "C50混凝土"）

2. demo_experiment_v2.csv - 字段名不同的版本（英文表头）
   - 用于测试字段名自适应映射功能
   - 字段如 girder_id, position, date 等

为什么故意弄脏数据？
- 真实世界的数据不会干净
- 极端值被平均后风险不明显，必须单独标记
- 采样缺口混在正常数据旁，容易被忽略
- 材料名称前后不一，是常见的实际问题
"""
