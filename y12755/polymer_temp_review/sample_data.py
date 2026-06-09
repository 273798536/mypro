from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import List


SAMPLE_MATERIALS = [
    {
        "material_id": "RM-2024-001",
        "name": "丙烯酸甲酯单体",
        "lot_no": "MA-240601-A",
        "supplier": "示例化工",
        "received_date": "2024-06-01T09:30:00",
    },
    {
        "material_id": "RM-2024-002",
        "name": "BPO引发剂",
        "lot_no": "BPO-240520-B",
        "supplier": "示例化工",
        "received_date": "2024-05-20T14:00:00",
    },
    {
        "material_id": "RM-2024-003",
        "name": "甲苯溶剂",
        "lot_no": "TOL-240605-C",
        "supplier": "示例化工",
        "received_date": "2024-06-05T10:15:00",
    },
]

SAMPLE_WEIGHING = [
    {
        "record_id": "W-20240610-001",
        "material_id": "RM-2024-001",
        "weighed_mass_g": 120.50,
        "operator": "张研究员",
        "timestamp": "2024-06-10T08:15:00",
    },
    {
        "record_id": "W-20240610-002",
        "material_id": "RM-2024-002",
        "weighed_mass_g": 1.25,
        "operator": "张研究员",
        "timestamp": "2024-06-10T08:20:00",
    },
    {
        "record_id": "W-20240610-003",
        "material_id": "RM-2024-003",
        "weighed_mass_g": 80.00,
        "operator": "张研究员",
        "timestamp": "2024-06-10T08:25:00",
    },
    {
        "record_id": "W-20240610-004",
        "material_id": "RM-2024-001",
        "weighed_mass_g": 118.75,
        "operator": "李研究员",
        "timestamp": "2024-06-10T13:05:00",
    },
]


def _make_temp_profile(target: float, plus: float = 2.0, minus: float = 2.0, seed: int = 0):
    """生成模拟温控数据，seed=0 为全部合格，非 0 为含超温点。"""
    import random
    rng = random.Random(seed)
    points = []
    for t in range(0, 181, 10):
        base = target + rng.uniform(-minus + 0.1, plus - 0.1)
        if seed != 0 and 60 <= t <= 80:
            base = target + plus + 0.8
        points.append({"elapsed_min": t, "temperature_c": round(base, 2)})
    return {
        "target_temp_c": target,
        "tolerance_plus_c": plus,
        "tolerance_minus_c": minus,
        "points": points,
    }


SAMPLE_BATCH_REPORTS = [
    {
        "batch_id": "B-20240610-01",
        "product_name": "聚丙烯酸甲酯 PMA-01",
        "report_version": 1,
        "reaction_condition": {
            "target_temp_c": 80.0,
            "reaction_time_min": 180,
            "initiator_type": "BPO",
            "solvent": "甲苯",
            "remarks": "正常反应",
        },
        "temperature_profile": _make_temp_profile(80.0, seed=0),
        "concentration": {
            "value": 48.5,
            "unit": "w/v%",
            "molecular_weight_g_mol": 86.09,
            "density_g_mL": 0.92,
        },
        "conclusion": {
            "passed": True,
            "summary": "反应温度稳定在目标范围，浓度合格",
            "reviewer": "王主管",
            "reviewed_at": "2024-06-10T17:00:00",
            "needs_retest": False,
        },
        "source_material_ids": ["RM-2024-001", "RM-2024-002", "RM-2024-003"],
        "weighing_record_ids": ["W-20240610-001", "W-20240610-002", "W-20240610-003"],
        "generated_at": "2024-06-10T18:00:00",
    },
    {
        "batch_id": "B-20240610-02",
        "product_name": "聚丙烯酸甲酯 PMA-02",
        "report_version": 2,
        "reaction_condition": {
            "target_temp_c": 80.0,
            "reaction_time_min": 180,
            "initiator_type": "BPO",
            "solvent": "甲苯",
            "remarks": "温控异常，中段超温",
        },
        "temperature_profile": _make_temp_profile(80.0, seed=1),
        "concentration": {
            "value": 1.15,
            "unit": "mol/L",
            "molecular_weight_g_mol": 86.09,
            "density_g_mL": 0.92,
        },
        "conclusion": {
            "passed": True,
            "summary": "反应温度正常，浓度合格",
            "reviewer": "王主管",
            "reviewed_at": "2024-06-10T17:30:00",
            "needs_retest": False,
        },
        "source_material_ids": ["RM-2024-001", "RM-2024-002", "RM-2024-003"],
        "weighing_record_ids": ["W-20240610-004"],
        "generated_at": "2024-06-10T18:30:00",
    },
    {
        "batch_id": "B-20240610-03",
        "product_name": "聚丙烯酸甲酯 PMA-03",
        "report_version": 1,
        "reaction_condition": {
            "target_temp_c": 80.0,
            "reaction_time_min": 180,
            "initiator_type": "BPO",
            "solvent": "甲苯",
            "remarks": "补样批次，称量单待补",
        },
        "temperature_profile": _make_temp_profile(80.0, seed=0),
        "concentration": {
            "value": 98.5,
            "unit": "mg/mL",
            "molecular_weight_g_mol": 86.09,
            "density_g_mL": 0.92,
        },
        "conclusion": {
            "passed": False,
            "summary": "称量单不齐，待复核",
            "reviewer": None,
            "reviewed_at": None,
            "needs_retest": True,
        },
        "source_material_ids": ["RM-2024-001", "RM-2024-999"],
        "weighing_record_ids": ["W-20240610-999"],
        "generated_at": "2024-06-10T19:00:00",
    },
]


def write_samples(input_dir: Path) -> List[Path]:
    """在 input_dir 下生成完整样例数据，返回所有写入文件路径。"""
    input_dir = Path(input_dir)
    written: List[Path] = []

    (input_dir / "materials").mkdir(parents=True, exist_ok=True)
    (input_dir / "weighing_records").mkdir(parents=True, exist_ok=True)
    (input_dir / "batch_reports").mkdir(parents=True, exist_ok=True)

    for m in SAMPLE_MATERIALS:
        fp = input_dir / "materials" / f"{m['material_id']}.json"
        fp.write_text(json.dumps(m, ensure_ascii=False, indent=2), encoding="utf-8")
        written.append(fp)

    for w in SAMPLE_WEIGHING:
        fp = input_dir / "weighing_records" / f"{w['record_id']}.json"
        fp.write_text(json.dumps(w, ensure_ascii=False, indent=2), encoding="utf-8")
        written.append(fp)

    for r in SAMPLE_BATCH_REPORTS:
        fp = input_dir / "batch_reports" / f"{r['batch_id']}.json"
        fp.write_text(json.dumps(r, ensure_ascii=False, indent=2), encoding="utf-8")
        written.append(fp)

    return written
