import csv
from pathlib import Path
from typing import List, Dict
from .models import CalculationResult, ComboItem


class CSVExporter:
    STATUS_LABEL_MAP = {
        "normal": "正常",
        "error": "异常-外推越界",
    }

    @classmethod
    def _status_to_label(cls, status: str) -> str:
        return cls.STATUS_LABEL_MAP.get(status, status)

    @classmethod
    def _label_to_status(cls, label: str) -> str:
        for s, l in cls.STATUS_LABEL_MAP.items():
            if l == label:
                return s
        return label

    @classmethod
    def export_details(cls, result: CalculationResult, output_path: str) -> str:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "组合ID",
                "包含题目",
                "题目数量",
                "组合权重",
                "出现次数",
                "状态(页面显示)",
                "状态(内部编码)",
                "运行ID",
                "计算时间",
            ])

            for item in result.combo_items:
                writer.writerow([
                    item.combo_id,
                    ";".join(item.question_ids),
                    len(item.question_ids),
                    f"{item.combined_weight:.4f}",
                    item.count,
                    cls._status_to_label(item.status),
                    item.status,
                    result.run_id,
                    result.calculated_at.isoformat(timespec="seconds"),
                ])

        return str(path)

    @classmethod
    def export_summary(cls, result: CalculationResult, output_path: str) -> str:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        status_counts = result.status_counts()

        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["指标", "数值", "备注"])
            writer.writerow(["运行ID", result.run_id, ""])
            writer.writerow(["计算时间", result.calculated_at.isoformat(timespec="seconds"), ""])
            writer.writerow(["题目总数", len(result.questions), ""])
            writer.writerow(["总组合数", result.total_combos, ""])
            writer.writerow(["总权重", f"{result.total_weight:.4f}", ""])
            writer.writerow(["图表与明细一致", "是" if result.is_consistent() else "否", ""])
            writer.writerow(["外推越界错误数", len(result.errors), ""])

            for status, count in sorted(status_counts.items()):
                writer.writerow([
                    f"状态-{cls._status_to_label(status)}",
                    count,
                    f"内部编码: {status}",
                ])

            for i, err in enumerate(result.errors, 1):
                writer.writerow([
                    f"错误{i}",
                    err.qid,
                    str(err),
                ])

        return str(path)

    @classmethod
    def export_weight_changes(cls, history_data: Dict, output_path: str) -> str:
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "题目ID",
                "变更时间",
                "变更人",
                "原值",
                "新值",
                "差值",
                "变更原因",
            ])

            rel = history_data.get("relationship", {})
            for qid in sorted(rel.keys()):
                info = rel[qid]
                for wc in info.get("weight_changes", []):
                    writer.writerow([
                        qid,
                        wc["at"],
                        wc["by"],
                        wc["from"],
                        wc["to"],
                        "" if wc["from"] is None else f"{wc['to'] - wc['from']:.4f}",
                        "",
                    ])

        return str(path)

    @classmethod
    def verify_csv_consistency(cls, csv_path: str, result: CalculationResult) -> Dict:
        path = Path(csv_path)
        if not path.exists():
            return {"exists": False, "is_consistent": False}

        csv_statuses: Dict[str, int] = {}
        csv_total = 0

        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                status_label = row.get("状态(页面显示)", "")
                status_code = row.get("状态(内部编码)", "")
                count = int(row.get("出现次数", "0"))

                csv_total += count
                csv_statuses[status_code] = csv_statuses.get(status_code, 0) + count

                if cls._status_to_label(status_code) != status_label:
                    return {
                        "exists": True,
                        "is_consistent": False,
                        "error": f"状态不一致: 内部编码={status_code}, 页面显示={status_label}",
                    }

        detail_total = sum(item.count for item in result.combo_items)
        detail_statuses = result.status_counts()

        return {
            "exists": True,
            "is_consistent": (csv_total == detail_total and csv_statuses == detail_statuses),
            "csv_total": csv_total,
            "detail_total": detail_total,
            "csv_status_counts": csv_statuses,
            "detail_status_counts": detail_statuses,
        }
