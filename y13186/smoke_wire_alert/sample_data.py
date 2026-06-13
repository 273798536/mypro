from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import List, Dict, Any

from .models import (
    WindTunnelSmokeAlert,
    AlertAttachment,
    ManualNote,
)


def build_sample_records() -> List[WindTunnelSmokeAlert]:
    base_time = datetime.now() - timedelta(hours=2)

    a1 = WindTunnelSmokeAlert(
        id="rec001",
        source="一号风洞A1传感器",
        record_time=(base_time + timedelta(minutes=0)).isoformat(),
        raw_fields={
            "烟线浓度": "25.0",
            "烟浓度单位": "mg/m3",
            "风速": "12",
            "风速单位": "m/s",
            "风向": "180",
            "预警高阈值": "50",
            "预警低阈值": "5",
            "阈值单位": "mg/m^3",
            "计算公式": "smoke_density",
        },
        manual_notes=[
            ManualNote(
                author="阿岑",
                content="巡检时观察到烟色正常，传感器读数偏低，怀疑正常范围",
                judgment="正常",
                timestamp=(base_time + timedelta(minutes=8)).isoformat(),
            ),
        ],
    )

    a2 = WindTunnelSmokeAlert(
        id="rec002",
        source="一号风洞A1传感器",
        record_time=(base_time + timedelta(minutes=30)).isoformat(),
        raw_fields={
            "smoke_concentration": "68.5",
            "smoke_density_unit": "mg/m^3",
            "wind_speed": "8.5",
            "wind_speed_unit": "km/h",
            "wind_direction": "270",
            "threshold_high": "50",
            "threshold_low": "5",
            "threshold_unit": "mg/m^3",
            "formula": "smoke_density",
        },
        manual_notes=[
            ManualNote(
                author="阿岑",
                content="现场目视烟雾明显，传感器读数偏高",
                judgment="报警",
                timestamp=(base_time + timedelta(minutes=38)).isoformat(),
            ),
        ],
    )

    a3 = WindTunnelSmokeAlert(
        id="rec003",
        source="二号风洞B2传感器",
        record_time=(base_time + timedelta(hours=1)).isoformat(),
        raw_fields={
            "烟浓度": "待校准_公式缺失",
            "烟浓度单位": "不认识的单位",
            "风速": "10",
            "风向": "90",
        },
    )

    a4 = WindTunnelSmokeAlert(
        id="rec004",
        source="三号风洞C3传感器",
        record_time=(base_time + timedelta(hours=1, minutes=15)).isoformat(),
        raw_fields={
            "风洞烟线浓度": "30",
            "烟线浓度单位": "mg/m^3",
            "风速": "5",
            "风速单位": "m/s",
            "风向": "-90",
        },
        manual_notes=[
            ManualNote(
                author="阿岑",
                content="风向昨晚设备被踢了一下符号，待确认",
                judgment="暂不处理",
                timestamp=(base_time + timedelta(hours=1, minutes=25)).isoformat(),
            ),
        ],
    )

    a5 = WindTunnelSmokeAlert(
        id="rec005",
        source="二号风洞B2传感器",
        record_time=(base_time + timedelta(hours=1, minutes=45)).isoformat(),
        raw_fields={
            "烟浓度": "18",
            "烟浓度单位": "mg/m3",
            "风速": "10",
            "风向": "135",
        },
    )

    return [a1, a2, a3, a4, a5]


def build_late_attachment_for_rec002() -> AlertAttachment:
    return AlertAttachment(
        id="att_late_001",
        name="B2传感器延迟数据包",
        content={
            "阈值上限": "20",
            "阈值下限": "2",
            "阈值单位": "mg/m^3",
            "计算公式": "smoke_density * 1.2",
        },
        arrived_at=datetime.now().isoformat(),
        is_late=True,
        fields_affected=["threshold_high", "threshold_low", "formula"],
    )


def save_samples_to_json(path: str) -> str:
    records = build_sample_records()
    data = [r.to_dict() for r in records]
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return path
