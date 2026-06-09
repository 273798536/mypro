from __future__ import annotations

import csv
import json
from datetime import datetime, timedelta
from pathlib import Path

import yaml


def create_sample_bundle(out_dir: str | Path) -> Path:
    """生成一批现实风格的几何投影校验样例材料。

    包含：
    - 参数表（有人维护的痕迹）
    - 题目清单（带历史旧备注、边界标记、一条占位空题）
    - 评分记录（混入坏数据：坐标格式脏、分数缺、拼写奇怪）
    - 图表前后快照 JSON（after 有几处故意改动）
    - 空集合占位：空的 extra_questions.csv 与 extra_scores.csv
    """
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    params = {
        "projection_type": "orthographic",
        "focal_length": None,
        "view_angle_deg": 0.0,
        "scale_factor": 1.0,
        "origin_x": 0.0,
        "origin_y": 0.0,
        "tolerance_px": 2.0,
        "maintained_by": "王工 (投影组)",
        "maintained_at": (datetime.now() - timedelta(days=7)).isoformat(timespec="seconds"),
        "notes": [
            "沿用Q3版本坐标系；投委会要求放宽到2px",
            "上次会议遗留：origin_y是否需要修正-0.5？待确认",
        ],
    }
    with open(out / "params.yaml", "w", encoding="utf-8") as f:
        yaml.safe_dump(params, f, allow_unicode=True, sort_keys=False)

    questions_rows = [
        {
            "item_id": "Q-001",
            "content": "主塔顶点投影",
            "expected": "(100.0, 200.0)",
            "legacy_note": "旧版本基准为 (99.8, 199.9)，2024-11 调整；边界",
            "tags": "结构;边界",
            "placeholder": "",
        },
        {
            "item_id": "Q-002",
            "content": "左侧悬索中点",
            "expected": "40.5, 150.3",
            "legacy_note": "",
            "tags": "悬索",
            "placeholder": "",
        },
        {
            "item_id": "Q-003",
            "content": "桥面中心点",
            "expected": "[100, 100]",
            "legacy_note": "2024-08 投委会通过基准值；边界样例",
            "tags": "桥面;boundary",
            "placeholder": "",
        },
        {
            "item_id": "Q-004",
            "content": "右塔顶投影",
            "expected": "159.7, 200.1",
            "legacy_note": "",
            "tags": "结构",
            "placeholder": "",
        },
        {
            "item_id": "Q-005",
            "content": "锚碇左侧",
            "expected": "5.0, 50.0",
            "legacy_note": "",
            "tags": "锚碇",
            "placeholder": "",
        },
        {
            "item_id": "Q-006",
            "content": "",
            "expected": "",
            "legacy_note": "待补充题目内容（旧流程遗留占位）",
            "tags": "",
            "placeholder": "true",
        },
        {
            "item_id": "Q-007",
            "content": "风嘴几何中心",
            "expected": "100.0, 120.0",
            "legacy_note": "边界；2024-10 新增",
            "tags": "空气动力学;边界",
            "placeholder": "",
        },
    ]
    with open(out / "questions.csv", "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["item_id", "content", "expected", "legacy_note", "tags", "placeholder"])
        writer.writeheader()
        writer.writerows(questions_rows)

    now = datetime.now()
    scores_rows = [
        {
            "item_id": "Q-001",
            "scorer": "张三",
            "projected": "100.3, 200.1",
            "score": "0.92",
            "scored_at": (now - timedelta(hours=3)).isoformat(timespec="seconds"),
            "note": "",
        },
        {
            "item_id": "Q-002",
            "scorer": "李四",
            "projected": "(41.2, 151.0)",
            "score": "0.85",
            "scored_at": (now - timedelta(hours=2, minutes=20)).isoformat(timespec="seconds"),
            "note": "手工微调约0.5px",
        },
        {
            "item_id": "Q-003",
            "scorer": "王五",
            "projected": "100.0, 104.5",
            "score": "0.70",
            "scored_at": (now - timedelta(hours=2)).isoformat(timespec="seconds"),
            "note": "明显偏下，可能材料有误",
        },
        {
            "item_id": "Q-003",
            "scorer": "赵六",
            "projected": "99.9, 99.8",
            "score": "0.95",
            "scored_at": (now - timedelta(hours=1, minutes=50)).isoformat(timespec="seconds"),
            "note": "与王五差距较大",
        },
        {
            "item_id": "Q-004",
            "scorer": "张三",
            "projected": "160.5, 200.3",
            "score": "0.1",
            "scored_at": (now - timedelta(hours=1, minutes=40)).isoformat(timespec="seconds"),
            "note": "低分但投影接近基准，疑似误填（典型坏数据）",
        },
        {
            "item_id": "Q-005",
            "scorer": "李四",
            "projected": "垃圾字符_没法解析",
            "score": "0.80",
            "scored_at": (now - timedelta(hours=1, minutes=30)).isoformat(timespec="seconds"),
            "note": "粘贴时带了表头（典型坏数据）",
        },
        {
            "item_id": "Q-005",
            "scorer": "王五",
            "projected": "5.1, 49.7",
            "score": "",
            "scored_at": (now - timedelta(hours=1, minutes=20)).isoformat(timespec="seconds"),
            "note": "分数漏填",
        },
        {
            "item_id": "Q-006",
            "scorer": "赵六",
            "projected": "0,0",
            "score": "0.0",
            "scored_at": (now - timedelta(minutes=50)).isoformat(timespec="seconds"),
            "note": "占位题随便填了个(0,0)",
        },
    ]
    with open(out / "scores.csv", "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["item_id", "scorer", "projected", "score", "scored_at", "note"])
        writer.writeheader()
        writer.writerows(scores_rows)

    chart_before = {
        "captured_by": "截图工具 v2.3",
        "captured_at": (now - timedelta(days=1)).isoformat(timespec="seconds"),
        "points": {
            "Q-001": [100.0, 200.0],
            "Q-002": [40.5, 150.3],
            "Q-003": [100.0, 100.0],
            "Q-004": [159.7, 200.1],
            "Q-005": [5.0, 50.0],
            "Q-OLD-9": [50.0, 50.0],
        },
    }
    with open(out / "chart_before.json", "w", encoding="utf-8") as f:
        json.dump(chart_before, f, ensure_ascii=False, indent=2)

    chart_after = {
        "captured_by": "截图工具 v2.3 (重新导出)",
        "captured_at": now.isoformat(timespec="seconds"),
        "points": {
            "Q-001": [100.0, 200.0],
            "Q-002": [42.0, 150.3],
            "Q-003": [100.0, 100.0],
            "Q-004": [159.7, 202.0],
            "Q-005": [5.0, 50.0],
            "Q-NEW-8": [77.0, 88.0],
        },
    }
    with open(out / "chart_after.json", "w", encoding="utf-8") as f:
        json.dump(chart_after, f, ensure_ascii=False, indent=2)

    with open(out / "extra_questions.csv", "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["item_id", "content", "expected", "legacy_note", "tags", "placeholder"])
        writer.writeheader()

    with open(out / "extra_scores.csv", "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["item_id", "scorer", "projected", "score", "scored_at", "note"])
        writer.writeheader()

    return out
