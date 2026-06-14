import json
import os
import time
from typing import List, Dict, Any, Optional
from convex_hull import HullResult


class DraftEntry:
    def __init__(self, note: str, timestamp: float, judgments_changed: List[str]):
        self.note = note
        self.timestamp = timestamp
        self.judgments_changed = judgments_changed


class _LazyHullResult:
    def __init__(self, data: Dict[str, Any]):
        self._data = data
        self.area = data.get("area", 0.0)
        self.area_unit = data.get("area_unit", "px")
        self.area_converted = data.get("area_converted")
        self.converted_unit = data.get("converted_unit")
        self.conversion_factor = data.get("conversion_factor")
        self.hull = [tuple(v) for v in data.get("hull_vertices", [])]
        self.sort_order = data.get("sort_order", [])
        self.collinear_groups = data.get("collinear_groups", [])
        self.intermediate_steps = data.get("intermediate_steps", [])
        self.failures = data.get("failures", [])
        self.parameters = data.get("parameters", {})


class SessionRecord:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.created_at: float = time.time()
        self.parameters: Dict[str, Any] = {}
        self.hull_result: Optional[HullResult] = None
        self.draft_notes: List[DraftEntry] = []
        self.status: str = "processed"
        self.manual_override: Optional[str] = None
        self.unstable_records: List[Dict[str, Any]] = []
        self.stable_records: List[Dict[str, Any]] = []

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {
            "session_id": self.session_id,
            "created_at": self.created_at,
            "parameters": self.parameters,
            "status": self.status,
        }
        if self.hull_result is not None:
            d["area"] = self.hull_result.area
            d["area_unit"] = self.hull_result.area_unit
            if self.hull_result.area_converted is not None:
                d["area_converted"] = self.hull_result.area_converted
                d["converted_unit"] = self.hull_result.converted_unit
                d["conversion_factor"] = self.hull_result.conversion_factor
            d["hull_vertices"] = [list(p) for p in self.hull_result.hull]
            d["sort_order"] = self.hull_result.sort_order
            d["collinear_groups"] = self.hull_result.collinear_groups
            d["intermediate_steps"] = self._serialize_steps(self.hull_result.intermediate_steps)
            d["failures"] = self.hull_result.failures
        if self.manual_override:
            d["manual_override"] = self.manual_override
        d["draft_notes"] = [
            {
                "note": dn.note,
                "timestamp": dn.timestamp,
                "judgments_changed": dn.judgments_changed,
            }
            for dn in self.draft_notes
        ]
        d["unstable_records"] = self.unstable_records
        d["stable_records"] = self.stable_records
        return d

    @staticmethod
    def _serialize_steps(steps: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        result = []
        for step in steps:
            s = dict(step)
            if "check_points" in s:
                s["check_points"] = [list(p) for p in s["check_points"]]
            if "terms" in s:
                s["terms"] = [
                    {k: (list(v) if isinstance(v, tuple) else v) for k, v in t.items()}
                    for t in s["terms"]
                ]
            result.append(s)
        return result


class DraftTracker:
    def __init__(self, store_dir: str = ".hull_sessions"):
        self.store_dir = store_dir
        self.sessions: Dict[str, SessionRecord] = {}
        os.makedirs(store_dir, exist_ok=True)
        self._load_all()

    def _session_path(self, session_id: str) -> str:
        return os.path.join(self.store_dir, f"{session_id}.json")

    def _load_all(self):
        if not os.path.isdir(self.store_dir):
            return
        for fname in os.listdir(self.store_dir):
            if not fname.endswith(".json"):
                continue
            sid = fname[:-5]
            path = self._session_path(sid)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                rec = SessionRecord(sid)
                rec.created_at = data.get("created_at", rec.created_at)
                rec.parameters = data.get("parameters", {})
                rec.status = data.get("status", "processed")
                rec.manual_override = data.get("manual_override")
                for dn in data.get("draft_notes", []):
                    rec.draft_notes.append(
                        DraftEntry(
                            note=dn["note"],
                            timestamp=dn["timestamp"],
                            judgments_changed=dn.get("judgments_changed", []),
                        )
                    )
                if "area" in data:
                    rec.hull_result = _LazyHullResult(data)
                rec.unstable_records = data.get("unstable_records", [])
                rec.stable_records = data.get("stable_records", [])
                self.sessions[sid] = rec
            except (json.JSONDecodeError, KeyError):
                continue

    def save(self, session_id: str):
        rec = self.sessions.get(session_id)
        if rec is None:
            return
        path = self._session_path(session_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(rec.to_dict(), f, ensure_ascii=False, indent=2)

    def register(
        self,
        session_id: str,
        parameters: Dict[str, Any],
        hull_result: HullResult,
    ) -> SessionRecord:
        rec = SessionRecord(session_id)
        rec.parameters = parameters
        rec.hull_result = hull_result
        if hull_result.failures:
            rec.status = "pending"
        self.sessions[session_id] = rec
        self.save(session_id)
        return rec

    def add_draft_note(
        self,
        session_id: str,
        note: str,
        judgments_changed: List[str],
    ) -> DraftEntry:
        rec = self.sessions.get(session_id)
        if rec is None:
            raise ValueError(f"会话 {session_id} 不存在")
        entry = DraftEntry(
            note=note,
            timestamp=time.time(),
            judgments_changed=judgments_changed,
        )
        rec.draft_notes.append(entry)
        self.save(session_id)
        return entry

    def mark_manual_override(self, session_id: str, reason: str):
        rec = self.sessions.get(session_id)
        if rec is None:
            raise ValueError(f"会话 {session_id} 不存在")
        rec.manual_override = reason
        rec.status = "manual_override"
        self.save(session_id)

    def mark_processed(self, session_id: str):
        rec = self.sessions.get(session_id)
        if rec is None:
            raise ValueError(f"会话 {session_id} 不存在")
        rec.status = "processed"
        self.save(session_id)

    def compare_parameters(self, sid_a: str, sid_b: str) -> Dict[str, Any]:
        rec_a = self.sessions.get(sid_a)
        rec_b = self.sessions.get(sid_b)
        if rec_a is None or rec_b is None:
            raise ValueError("比较的会话ID不存在")
        comparison: Dict[str, Any] = {
            "session_a": sid_a,
            "session_b": sid_b,
            "param_diff": {},
            "area_diff": None,
        }
        all_keys = set(list(rec_a.parameters.keys()) + list(rec_b.parameters.keys()))
        for k in sorted(all_keys):
            va = rec_a.parameters.get(k)
            vb = rec_b.parameters.get(k)
            if va != vb:
                comparison["param_diff"][k] = {"a": va, "b": vb}
        if rec_a.hull_result and rec_b.hull_result:
            aa = rec_a.hull_result.area
            ab = rec_b.hull_result.area
            comparison["area_diff"] = {
                "a": aa,
                "b": ab,
                "delta": ab - aa,
                "ratio": ab / aa if aa != 0 else None,
            }
        return comparison

    def list_sessions(self) -> List[Dict[str, Any]]:
        result = []
        for sid, rec in sorted(self.sessions.items()):
            result.append({
                "session_id": sid,
                "status": rec.status,
                "created_at": rec.created_at,
                "area": rec.hull_result.area if rec.hull_result else None,
            })
        return result
