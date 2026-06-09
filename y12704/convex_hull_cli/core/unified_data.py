import os
from dataclasses import dataclass
from typing import Any, Dict, List
from .models import CalculationResult, AnomalyAction


@dataclass
class UnifiedDataset:
    result: CalculationResult

    def chart_payload(self) -> Dict[str, Any]:
        return {
            "result_id": self.result.result_id,
            "points": [
                {"x": p.x, "y": p.y, "record_id": p.record_id, "unit": p.unit, "source": p.source}
                for p in self.result.points
            ],
            "hull_points": [{"x": h[0], "y": h[1]} for h in self.result.hull_points],
            "raw_area": self.result.raw_area,
            "unit": self.result.unit,
            "is_valid": self.result.is_valid,
            "parameter_version": self.result.parameter_version,
            "created_at": self.result.created_at.isoformat()
        }

    def detail_payload(self) -> Dict[str, Any]:
        blocking = self.result.blocking_anomalies
        warning = self.result.warning_anomalies
        by_action: Dict[str, List[Dict[str, Any]]] = {}
        for a in self.result.anomalies:
            key = a.action.value
            by_action.setdefault(key, []).append({
                "type": a.anomaly_type.value,
                "record_id": a.record_id,
                "description": a.description,
                "details": a.details,
                "affected_fields": a.affected_fields,
                "next_step": a.next_step,
                "is_blocking": a.is_blocking
            })

        return {
            "result_id": self.result.result_id,
            "created_at": self.result.created_at.isoformat(),
            "is_valid": self.result.is_valid,
            "summary": {
                "total_points": len(self.result.points),
                "hull_vertices": len(self.result.hull_points),
                "raw_area": self.result.raw_area,
                "converted_area": self.result.converted_area,
                "unit": self.result.unit,
                "parameter_version": self.result.parameter_version
            },
            "anomaly_summary": {
                "total": len(self.result.anomalies),
                "blocking": len(blocking),
                "warning": len(warning),
                "by_action": {k: len(v) for k, v in by_action.items()}
            },
            "anomalies_by_action": by_action,
            "points": [
                {
                    "record_id": p.record_id,
                    "x": p.x,
                    "y": p.y,
                    "unit": p.unit,
                    "source": p.source
                }
                for p in self.result.points
            ],
            "hull_points": [{"x": h[0], "y": h[1]} for h in self.result.hull_points],
            "notes": self.result.notes
        }

    def export_payload(self) -> Dict[str, Any]:
        return self.detail_payload()

    def ensure_consistency(self) -> bool:
        chart = self.chart_payload()
        detail = self.detail_payload()
        export = self.export_payload()
        return (
            chart["result_id"] == detail["result_id"] == export["result_id"]
            and chart["raw_area"] == detail["summary"]["raw_area"] == export["summary"]["raw_area"]
            and chart["hull_points"] == detail["hull_points"] == export["hull_points"]
        )
