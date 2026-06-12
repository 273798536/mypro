import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Any
from .models import Question, WeightRecord, RawDataSource


class ChangeHistory:
    def __init__(self, storage_path: Optional[str] = None):
        self.storage_path = Path(storage_path) if storage_path else None
        self._question_history: List[Dict[str, Any]] = []
        self._weight_history: List[Dict[str, Any]] = []

    def log_question_list_change(
        self,
        old_questions: List[Question],
        new_questions: List[Question],
        changed_by: str = "unknown",
        reason: str = "",
    ) -> None:
        old_ids = {q.qid for q in old_questions}
        new_ids = {q.qid for q in new_questions}
        added = new_ids - old_ids
        removed = old_ids - new_ids

        entry = {
            "timestamp": datetime.now().isoformat(timespec="seconds"),
            "changed_by": changed_by,
            "change_type": "question_list",
            "added_qids": sorted(list(added)),
            "removed_qids": sorted(list(removed)),
            "old_count": len(old_questions),
            "new_count": len(new_questions),
            "reason": reason,
        }
        self._question_history.append(entry)
        self._persist()

    def log_weight_change(
        self,
        record: WeightRecord,
        qid: str,
        changed_by: str,
        reason: str = "",
    ) -> None:
        entry = {
            "timestamp": record.changed_at.isoformat(timespec="seconds"),
            "changed_by": changed_by,
            "change_type": "weight",
            "qid": qid,
            "previous_weight": record.previous_weight,
            "new_weight": record.weight,
            "delta": None if record.previous_weight is None else record.weight - record.previous_weight,
            "reason": reason,
        }
        self._weight_history.append(entry)
        self._persist()

    def log_raw_source(self, source: RawDataSource) -> None:
        entry = {
            "timestamp": source.ingested_at.isoformat(timespec="seconds"),
            "change_type": "raw_source",
            "source_name": source.source_name,
            "raw_content": source.raw_content,
            "notes": source.notes,
        }
        self._question_history.append(entry)
        self._persist()

    def get_weight_changes_by_qid(self, qid: str) -> List[Dict[str, Any]]:
        return [e for e in self._weight_history if e.get("qid") == qid]

    def get_all_weight_changes(self) -> List[Dict[str, Any]]:
        return list(self._weight_history)

    def get_all_question_changes(self) -> List[Dict[str, Any]]:
        return list(self._question_history)

    def get_changes_relationship(self) -> Dict[str, Any]:
        q_changes = {}
        for e in self._question_history:
            if e.get("change_type") == "question_list":
                for qid in e.get("added_qids", []):
                    if qid not in q_changes:
                        q_changes[qid] = {"added_at": e["timestamp"], "weight_changes": []}
                for qid in e.get("removed_qids", []):
                    if qid in q_changes:
                        q_changes[qid]["removed_at"] = e["timestamp"]

        for e in self._weight_history:
            qid = e.get("qid")
            if qid:
                if qid not in q_changes:
                    q_changes[qid] = {"added_at": "unknown", "weight_changes": []}
                q_changes[qid]["weight_changes"].append(
                    {
                        "at": e["timestamp"],
                        "from": e["previous_weight"],
                        "to": e["new_weight"],
                        "by": e["changed_by"],
                    }
                )

        return {
            "relationship": q_changes,
            "total_q_list_changes": len([e for e in self._question_history if e.get("change_type") == "question_list"]),
            "total_weight_changes": len(self._weight_history),
        }

    def _persist(self) -> None:
        if not self.storage_path:
            return
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "question_history": self._question_history,
            "weight_history": self._weight_history,
        }
        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load(self) -> None:
        if not self.storage_path or not self.storage_path.exists():
            return
        with open(self.storage_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        self._question_history = data.get("question_history", [])
        self._weight_history = data.get("weight_history", [])

    def print_summary(self) -> None:
        rel = self.get_changes_relationship()
        print("=== 题目清单 ↔ 权重变更 关系记录 ===")
        print(f"题目清单修改次数: {rel['total_q_list_changes']}")
        print(f"权重变更次数: {rel['total_weight_changes']}")
        print()
        for qid, info in rel["relationship"].items():
            added = info.get("added_at", "unknown")
            removed = info.get("removed_at", "-")
            w_count = len(info.get("weight_changes", []))
            print(f"  题目 {qid}: 加入={added}, 移除={removed}, 权重变更={w_count}次")
            for wc in info.get("weight_changes", []):
                print(f"    ↳ {wc['at']} by {wc['by']}: {wc['from']} → {wc['to']}")
        print()
