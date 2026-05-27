from __future__ import annotations

import csv
import io
from typing import Dict, Any, List

from app.schemas.models import RecommendReport, SKU


def report_to_csv(report: RecommendReport) -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(
        [
            "order_id",
            "feasible",
            "box_id",
            "box_name",
            "sku_id",
            "qty",
            "orientation",
            "packed_volume_cm3",
            "box_used_volume_cm3",
            "box_total_volume_cm3",
            "weight_in_box_kg",
            "warnings",
        ]
    )
    for a in report.assignments:
        w.writerow(
            [
                report.order_id,
                report.feasible,
                a.box_id,
                a.box_name,
                a.sku_id,
                a.qty,
                a.orientation,
                a.packed_volume_cm3,
                a.box_used_volume_cm3,
                a.box_total_volume_cm3,
                a.weight_in_box_kg,
                "|".join(a.warnings),
            ]
        )
    return buf.getvalue()


def compare_reports(reports: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for r in reports:
        out.append(
            {
                "label": r.get("label"),
                "order_id": r.get("order_id"),
                "feasible": r.get("feasible"),
                "total_cost": r.get("total_cost"),
                "split_penalty_total": r.get("split_penalty_total"),
                "boxes_opened": r.get("boxes_opened"),
                "issues": r.get("issues", []),
            }
        )
    return out


def sku_trace_map(catalog: List[SKU]) -> Dict[str, Dict[str, Any]]:
    return {
        s.sku_id: {
            "source": s.source,
            "fragile": s.fragile,
            "bearing_capacity_kg": s.bearing_capacity_kg,
            "rotation_allowed": s.rotation_allowed,
            "note": s.note,
        }
        for s in catalog
    }
