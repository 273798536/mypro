"""报告导出模块."""

import json
import os
from datetime import datetime
from pathlib import Path
from uuid import uuid4

import numpy as np
import pandas as pd
from jinja2 import Environment, FileSystemLoader

from .anomaly_detector import detect_anomalies, find_boundary_samples, highlight_extremes
from .data_loader import to_buoy_dataframe
from .models import (
    AnomalyRecord,
    BuoyData,
    CalculationParams,
    ConfirmationRequest,
    MaintenanceNote,
    ReportResult,
)
from .sensitivity import analyze_param_sensitivity


def generate_report(
    buoys: list[BuoyData],
    notes: list[MaintenanceNote],
    params: CalculationParams,
    confirmations: list[ConfirmationRequest],
    output_dir: str,
) -> ReportResult:
    """生成完整报告."""
    os.makedirs(output_dir, exist_ok=True)
    report_id = f"BUOY-{datetime.now().strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"

    anomalies = detect_anomalies(buoys, notes, params)
    df = to_buoy_dataframe(buoys)
    df_highlighted = highlight_extremes(df, anomalies)
    boundaries = find_boundary_samples(df, anomalies, params)
    sensitivity = analyze_param_sensitivity(buoys, notes, params)

    html_path = _render_html(
        report_id, buoys, notes, anomalies, params, confirmations,
        df_highlighted, boundaries, sensitivity, output_dir
    )
    _export_excel(df_highlighted, anomalies, notes, boundaries, output_dir, report_id)
    api_response = _save_api_response(
        report_id, buoys, anomalies, notes, params, confirmations,
        boundaries, sensitivity, output_dir
    )

    return ReportResult(
        report_id=report_id,
        generated_at=datetime.now(),
        params_used=params,
        buoy_count=len(buoys),
        anomaly_count=len(anomalies),
        notes_count=len(notes),
        output_path=html_path,
        needs_confirmation=len(confirmations) > 0,
        confirmations=confirmations,
        boundary_samples=boundaries,
        param_sensitivity=sensitivity,
    )


def _render_html(
    report_id: str,
    buoys: list[BuoyData],
    notes: list[MaintenanceNote],
    anomalies: list[AnomalyRecord],
    params: CalculationParams,
    confirmations: list[ConfirmationRequest],
    df_highlighted: pd.DataFrame,
    boundaries: list[dict],
    sensitivity: dict,
    output_dir: str,
) -> str:
    """渲染HTML报告."""
    template_dir = Path(__file__).parent / "templates"
    env = Environment(loader=FileSystemLoader(str(template_dir)))
    template = env.get_template("report.html")

    anomaly_locations = _add_locations_to_anomalies(anomalies, buoys)
    buoy_table = df_highlighted.to_dict("records")

    html = template.render(
        report_id=report_id,
        generated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        needs_confirmation=len(confirmations) > 0,
        confirmations=confirmations,
        buoy_count=len(buoys),
        anomaly_count=len(anomalies),
        notes_count=len(notes),
        boundary_count=len(boundaries),
        params_used=params.describe(),
        formulas=params.formulas(),
        sensitivity=sensitivity,
        anomalies=anomaly_locations,
        boundaries=boundaries,
        notes=sorted(notes, key=lambda n: (n.device_id, n.timestamp)),
        buoy_table=buoy_table,
        version="1.0.0",
    )

    output_path = Path(output_dir) / f"{report_id}.html"
    output_path.write_text(html, encoding="utf-8")
    return str(output_path)


def _export_excel(
    df_highlighted: pd.DataFrame,
    anomalies: list[AnomalyRecord],
    notes: list[MaintenanceNote],
    boundaries: list[dict],
    output_dir: str,
    report_id: str,
) -> None:
    """导出Excel数据."""
    output_path = Path(output_dir) / f"{report_id}_data.xlsx"

    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        df_highlighted.to_excel(writer, sheet_name="浮标数据", index=False)

        anomaly_df = pd.DataFrame(
            [
                {
                    "时间": a.timestamp,
                    "设备": a.device_id,
                    "指标": a.metric,
                    "数值": a.value,
                    "期望范围": f"{a.expected_range[0]:.2f}-{a.expected_range[1]:.2f}",
                    "严重程度": a.severity,
                    "关联备注": a.linked_note_id or "",
                    "说明": a.description,
                }
                for a in anomalies
            ]
        )
        anomaly_df.to_excel(writer, sheet_name="异常记录", index=False)

        notes_df = pd.DataFrame(
            [
                {
                    "时间": n.timestamp,
                    "设备": n.device_id,
                    "版本": n.version,
                    "内容": n.content,
                    "提交人": n.author,
                    "是否当前有效": n.is_original,
                    "被替代备注": n.replaced_by or "",
                }
                for n in notes
            ]
        )
        notes_df.to_excel(writer, sheet_name="维修备注", index=False)

        boundary_df = pd.DataFrame(boundaries)
        boundary_df.to_excel(writer, sheet_name="边界样本", index=False)


def _save_api_response(
    report_id: str,
    buoys: list[BuoyData],
    anomalies: list[AnomalyRecord],
    notes: list[MaintenanceNote],
    params: CalculationParams,
    confirmations: list[ConfirmationRequest],
    boundaries: list[dict],
    sensitivity: dict,
    output_dir: str,
) -> str:
    """保存模拟的API返回结果，便于调试查看."""
    response = {
        "code": 200,
        "message": "报告生成成功" if not confirmations else "报告生成，需人工确认",
        "data": {
            "report_id": report_id,
            "generated_at": datetime.now().isoformat(),
            "stats": {
                "buoy_count": len(buoys),
                "anomaly_count": len(anomalies),
                "notes_count": len(notes),
                "boundary_count": len(boundaries),
                "confirmation_count": len(confirmations),
            },
            "params": params.describe(),
            "formulas": params.formulas(),
            "needs_confirmation": len(confirmations) > 0,
            "confirmations": [
                {
                    "request_id": c.request_id,
                    "device_id": c.device_id,
                    "reason": c.reason,
                    "next_step": c.next_step,
                    "affected_count": c.affected_data_count,
                }
                for c in confirmations
            ],
            "anomalies": [
                {
                    "anomaly_id": a.anomaly_id,
                    "device_id": a.device_id,
                    "timestamp": a.timestamp.isoformat(),
                    "metric": a.metric,
                    "value": a.value,
                    "severity": a.severity,
                    "linked_note": a.linked_note_id,
                }
                for a in anomalies
            ],
            "boundary_samples": boundaries,
            "sensitivity_summary": sensitivity["summary"],
        },
    }

    output_path = Path(output_dir) / f"{report_id}_api_response.json"
    output_path.write_text(
        json.dumps(response, indent=2, ensure_ascii=False, default=_json_default),
        encoding="utf-8",
    )
    return str(output_path)


def _json_default(obj: object) -> object:
    """处理 datetime / pd.Timestamp / numpy 标量等 JSON 不可序列化对象."""
    if isinstance(obj, (datetime, pd.Timestamp)):
        return obj.isoformat()
    if isinstance(obj, np.generic):
        return obj.item()
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


def _add_locations_to_anomalies(
    anomalies: list[AnomalyRecord], buoys: list[BuoyData]
) -> list[dict]:
    """为异常记录添加空间位置和来源文件."""
    buoy_map = {(b.device_id, b.timestamp): b for b in buoys}
    result = []

    for a in anomalies:
        key = (a.device_id, a.timestamp)
        buoy = buoy_map.get(key)
        result.append(
            {
                **a.__dict__,
                "location": (
                    f"({buoy.longitude:.4f}°, {buoy.latitude:.4f}°)" if buoy else "未知"
                ),
                "source_file": buoy.source_file if buoy else "未知",
            }
        )

    return result
