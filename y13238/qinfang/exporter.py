import csv
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Union
from . import ExceptionStatus
from .state_manager import StateManager
from .exception_queue import ExceptionQueue
from .note_manager import NoteManager


TYPE_LABEL_MAP = {
    "naming_inconsistent": "命名不一致",
    "alias_conflict": "曲名别名冲突",
    "version_mismatch": "版本错乱并存",
}
STATUS_LABEL_MAP = {
    ExceptionStatus.PENDING.value: "待补材料",
    ExceptionStatus.RESOLVED.value: "已处理",
    ExceptionStatus.MANUAL_OVERRIDE.value: "人工改判",
}
MATERIAL_STATUS_LABEL = {
    "normal": "正常",
    "anomalous": "异常",
    "supplemented": "已补材料",
}


class Exporter:
    def __init__(self, state_manager: StateManager):
        self.sm = state_manager
        self.eq = ExceptionQueue(state_manager)
        self.nm = NoteManager(state_manager)

    def _ensure_dir(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)

    def export_queue_json(self, output_path: Union[str, Path]) -> Path:
        self.sm.load()
        summary = self.eq.get_summary()
        payload = {
            "export_time": datetime.now(timezone.utc).isoformat(),
            "scope": "exception_queue",
            "summary": {
                "total": summary["total"],
                "pending": summary["pending"],
                "resolved": summary["resolved"],
                "manual_override": summary["manual_override"],
            },
            "items": summary["pending_items"] + summary["resolved_items"] + summary["manual_override_items"],
        }
        out = Path(output_path)
        self._ensure_dir(out)
        with open(out, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        return out

    def export_queue_csv(self, output_path: Union[str, Path]) -> Path:
        self.sm.load()
        summary = self.eq.get_summary()
        rows = []
        for kind, items in (
            ("待补材料", summary["pending_items"]),
            ("已处理", summary["resolved_items"]),
            ("人工改判", summary["manual_override_items"]),
        ):
            for it in items:
                rows.append({
                    "队列分类": kind,
                    "异常ID": it["id"],
                    "文件名": it["filename"],
                    "异常类型": TYPE_LABEL_MAP.get(it.get("type", ""), it.get("type", "")),
                    "原因": it.get("reason", ""),
                    "下一步": it.get("next_step", ""),
                    "处理人": it.get("resolved_by", ""),
                    "处理时间": it.get("resolved_at", ""),
                })
        out = Path(output_path)
        self._ensure_dir(out)
        with open(out, "w", encoding="utf-8-sig", newline="") as f:
            fieldnames = [
                "队列分类", "异常ID", "文件名", "异常类型",
                "原因", "下一步", "处理人", "处理时间",
            ]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        return out

    def export_delivery_json(self, output_path: Union[str, Path]) -> Path:
        self.sm.load()
        delivery = self.nm.get_delivery_list()
        payload = {
            "export_time": datetime.now(timezone.utc).isoformat(),
            "scope": "delivery_list",
            "material_count": len(delivery),
            "materials": delivery,
        }
        out = Path(output_path)
        self._ensure_dir(out)
        with open(out, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        return out

    def export_delivery_csv(self, output_path: Union[str, Path]) -> Path:
        self.sm.load()
        delivery = self.nm.get_delivery_list()
        rows = []
        for mat in delivery:
            notes_flat = "; ".join(
                f"[{n.get('type','')}]({n.get('author','')}){n.get('content','')}"
                for n in mat["notes"]
            ) if mat["notes"] else ""
            rows.append({
                "材料ID": mat["id"],
                "文件名": mat["filename"],
                "标准曲名": mat["canonical_name"],
                "别名": ",".join(mat["aliases"]) if mat["aliases"] else "",
                "版本": f"v{mat['version']}",
                "状态": MATERIAL_STATUS_LABEL.get(mat["status"], mat["status"]),
                "备注": notes_flat,
                "创建时间": mat.get("created_at", ""),
                "更新时间": mat.get("updated_at", ""),
            })
        out = Path(output_path)
        self._ensure_dir(out)
        with open(out, "w", encoding="utf-8-sig", newline="") as f:
            fieldnames = [
                "材料ID", "文件名", "标准曲名", "别名", "版本",
                "状态", "备注", "创建时间", "更新时间",
            ]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        return out

    def export_all(self, dir_path: Union[str, Path], prefix: Optional[str] = None) -> Dict[str, Path]:
        out_dir = Path(dir_path)
        out_dir.mkdir(parents=True, exist_ok=True)

        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        p = f"{prefix}_" if prefix else ""
        paths = {
            "queue_json": self.export_queue_json(out_dir / f"{p}exception_queue_{ts}.json"),
            "queue_csv": self.export_queue_csv(out_dir / f"{p}exception_queue_{ts}.csv"),
            "delivery_json": self.export_delivery_json(out_dir / f"{p}delivery_list_{ts}.json"),
            "delivery_csv": self.export_delivery_csv(out_dir / f"{p}delivery_list_{ts}.csv"),
        }
        return paths
