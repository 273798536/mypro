import json
import os
from typing import List, Dict, Optional, Any
from datetime import datetime
from pathlib import Path
from collections import Counter

from .models import (
    HallucinationRecord,
    RecordStatus,
    HallucinationType,
    GroupMetric,
)


class MetricsCalculator:
    def __init__(self, storage_dir: Optional[str] = None):
        if storage_dir is None:
            storage_dir = Path(__file__).parent.parent / "data" / "metrics"
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def calculate_overall_metrics(self, records: List[HallucinationRecord]) -> Dict[str, Any]:
        total = len(records)
        if total == 0:
            return {
                "total_records": 0,
                "clean_count": 0,
                "hallucination_count": 0,
                "pending_count": 0,
                "duplicate_count": 0,
                "blocked_count": 0,
                "hallucination_rate": 0.0,
                "clean_rate": 0.0,
            }

        clean = sum(1 for r in records if r.status == RecordStatus.CONFIRMED_CLEAN)
        hallucination = sum(1 for r in records if r.status == RecordStatus.HALLUCINATION)
        pending = sum(1 for r in records if r.status == RecordStatus.PENDING_REVIEW)
        duplicate = sum(1 for r in records if r.status == RecordStatus.DUPLICATE)
        blocked = sum(1 for r in records if r.status == RecordStatus.SAFETY_BLOCKED)

        all_types = []
        for r in records:
            all_types.extend([t.value for t in r.hallucination_types])
        type_counts = Counter(all_types)
        top_types = [
            {"type": t, "count": c, "percentage": round(c / max(len(all_types), 1) * 100, 2)}
            for t, c in type_counts.most_common(5)
        ]

        avg_confidence = (
            round(sum(r.confidence_score for r in records) / total, 2)
            if total > 0 else 0.0
        )

        return {
            "total_records": total,
            "clean_count": clean,
            "hallucination_count": hallucination,
            "pending_count": pending,
            "duplicate_count": duplicate,
            "blocked_count": blocked,
            "hallucination_rate": round(hallucination / total * 100, 2),
            "clean_rate": round(clean / total * 100, 2),
            "pending_rate": round(pending / total * 100, 2),
            "top_hallucination_types": top_types,
            "avg_confidence_score": avg_confidence,
            "with_source_materials": sum(1 for r in records if r.source_materials),
            "with_corrections": sum(1 for r in records if r.corrections),
        }

    def calculate_group_metrics(self, records: List[HallucinationRecord],
                                group_dimension: str = "group_tags") -> List[GroupMetric]:
        groups: Dict[str, List[HallucinationRecord]] = {}

        for record in records:
            if group_dimension == "group_tags":
                tags = record.group_tags if record.group_tags else ["未分组"]
                for tag in tags:
                    if tag not in groups:
                        groups[tag] = []
                    groups[tag].append(record)
            elif group_dimension == "status":
                key = record.status.value
                if key not in groups:
                    groups[key] = []
                groups[key].append(record)
            elif group_dimension == "prompt_version":
                key = record.prompt_version_id
                if key not in groups:
                    groups[key] = []
                groups[key].append(record)
            elif group_dimension == "hallucination_type":
                types = [t.value for t in record.hallucination_types] if record.hallucination_types else ["无幻觉"]
                for t in types:
                    if t not in groups:
                        groups[t] = []
                    groups[t].append(record)

        metrics = []
        for group_name, group_records in groups.items():
            clean = sum(1 for r in group_records if r.status == RecordStatus.CONFIRMED_CLEAN)
            hallucination = sum(1 for r in group_records if r.status == RecordStatus.HALLUCINATION)
            pending = sum(1 for r in group_records if r.status == RecordStatus.PENDING_REVIEW)
            duplicate = sum(1 for r in group_records if r.status == RecordStatus.DUPLICATE)
            blocked = sum(1 for r in group_records if r.status == RecordStatus.SAFETY_BLOCKED)

            all_types = []
            for r in group_records:
                all_types.extend([t.value for t in r.hallucination_types])
            type_counts = Counter(all_types)
            top_types = [
                {"type": t, "count": c}
                for t, c in type_counts.most_common(3)
            ]

            metric = GroupMetric(
                group_name=group_name,
                group_dimension=group_dimension,
                total_records=len(group_records),
                clean_count=clean,
                hallucination_count=hallucination,
                pending_count=pending,
                duplicate_count=duplicate,
                blocked_count=blocked,
                hallucination_rate=round(hallucination / max(len(group_records), 1) * 100, 2),
                top_hallucination_types=top_types,
                calculated_at=datetime.now(),
            )
            metrics.append(metric)

        metrics.sort(key=lambda m: m.hallucination_rate, reverse=True)
        return metrics

    def calculate_trend_metrics(self, records: List[HallucinationRecord],
                                time_interval: str = "day") -> List[Dict[str, Any]]:
        from collections import defaultdict

        def get_time_key(dt: datetime) -> str:
            if time_interval == "hour":
                return dt.strftime("%Y-%m-%d %H:00")
            elif time_interval == "week":
                return dt.strftime("%Y-W%W")
            else:
                return dt.strftime("%Y-%m-%d")

        time_groups = defaultdict(list)
        for record in records:
            key = get_time_key(record.created_at)
            time_groups[key].append(record)

        trend = []
        for time_key in sorted(time_groups.keys()):
            group_records = time_groups[time_key]
            total = len(group_records)
            hallucination = sum(1 for r in group_records if r.status == RecordStatus.HALLUCINATION)
            clean = sum(1 for r in group_records if r.status == RecordStatus.CONFIRMED_CLEAN)

            trend.append({
                "time_period": time_key,
                "total_records": total,
                "hallucination_count": hallucination,
                "clean_count": clean,
                "hallucination_rate": round(hallucination / max(total, 1) * 100, 2),
            })

        return trend

    def save_metrics(self, metrics: List[GroupMetric], name: str) -> str:
        filepath = self.storage_dir / f"{name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        data = [m.model_dump() for m in metrics]
        for d in data:
            d["calculated_at"] = d["calculated_at"].isoformat()
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return str(filepath)

    def get_metrics_history(self) -> List[Dict[str, Any]]:
        history = []
        for file_path in self.storage_dir.glob("*.json"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                history.append({
                    "filename": file_path.name,
                    "filepath": str(file_path),
                    "created_at": datetime.fromtimestamp(file_path.stat().st_ctime),
                    "metrics_count": len(data),
                })
            except Exception:
                continue
        return sorted(history, key=lambda x: x["created_at"], reverse=True)
