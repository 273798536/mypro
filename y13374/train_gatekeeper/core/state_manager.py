import json
import os
import shutil
from dataclasses import asdict
from typing import List, Optional, Dict, Any

from .models import (
    GateState,
    GateParams,
    ParamSnapshot,
    EvalResult,
    Note,
    NoteType,
    GateDecision,
)


STATE_DIR = ".state"
STATE_FILE = "gate_state.json"
RUNS_DIR = "runs"


class StateManager:
    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        self.state_dir = os.path.join(data_dir, STATE_DIR)
        self.state_path = os.path.join(self.state_dir, STATE_FILE)
        self.runs_dir = os.path.join(self.state_dir, RUNS_DIR)
        self._ensure_dirs()

    def _ensure_dirs(self):
        os.makedirs(self.state_dir, exist_ok=True)
        os.makedirs(self.runs_dir, exist_ok=True)

    def load_state(self) -> GateState:
        if not os.path.exists(self.state_path):
            state = GateState()
            self._save_state(state)
            return state
        try:
            with open(self.state_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return self._dict_to_state(data)
        except (json.JSONDecodeError, KeyError):
            state = GateState()
            self._save_state(state)
            return state

    def save_state(self, state: GateState):
        state.last_updated = self._now_iso()
        self._save_state(state)

    def _save_state(self, state: GateState):
        with open(self.state_path, "w", encoding="utf-8") as f:
            json.dump(state.to_dict(), f, ensure_ascii=False, indent=2)

    def update_params(self, params: GateParams, reason: str = "") -> ParamSnapshot:
        state = self.load_state()
        old_fingerprint = state.current_params.fingerprint()
        new_fingerprint = params.fingerprint()

        if old_fingerprint != new_fingerprint or not state.param_history:
            snapshot = ParamSnapshot(params=params, reason=reason)
            state.param_history.append(snapshot)
            state.current_params = params
            self.save_state(state)
            return snapshot
        return state.param_history[-1]

    def get_current_params(self) -> GateParams:
        state = self.load_state()
        return state.current_params

    def record_run(self, result: EvalResult):
        state = self.load_state()
        state.current_result = result
        self.save_state(state)

        run_path = os.path.join(self.runs_dir, f"{result.run_id}.json")
        with open(run_path, "w", encoding="utf-8") as f:
            json.dump(result.to_dict(), f, ensure_ascii=False, indent=2)

    def get_run(self, run_id: str) -> Optional[EvalResult]:
        run_path = os.path.join(self.runs_dir, f"{run_id}.json")
        if not os.path.exists(run_path):
            return None
        with open(run_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return self._dict_to_eval_result(data)

    def list_runs(self, limit: int = 10) -> List[str]:
        if not os.path.exists(self.runs_dir):
            return []
        files = [
            f for f in os.listdir(self.runs_dir)
            if f.endswith(".json")
        ]
        files.sort(reverse=True)
        return [f.replace(".json", "") for f in files[:limit]]

    def add_note(
        self,
        content: str,
        note_type: NoteType = NoteType.VERBAL,
        author: str = "anonymous",
        related_sample_ids: Optional[List[str]] = None,
    ) -> Note:
        state = self.load_state()
        note = Note(
            content=content,
            note_type=note_type,
            author=author,
            related_sample_ids=related_sample_ids or [],
        )
        state.notes.append(note)
        self.save_state(state)
        return note

    def list_notes(self, note_type: Optional[NoteType] = None) -> List[Note]:
        state = self.load_state()
        if note_type is None:
            return list(state.notes)
        return [n for n in state.notes if n.note_type == note_type]

    def verify_consistency(self) -> Dict[str, Any]:
        state = self.load_state()
        issues = []

        if state.current_result:
            if state.current_result.param_snapshot_id:
                snapshot_ids = [s.snapshot_id for s in state.param_history]
                if state.current_result.param_snapshot_id not in snapshot_ids:
                    issues.append(
                        f"当前评测结果关联的参数快照 {state.current_result.param_snapshot_id} 不在历史记录中"
                    )

        run_ids = self.list_runs(limit=100)
        if state.current_result and state.current_result.run_id not in run_ids:
            issues.append(
                f"当前结果 run_id={state.current_result.run_id} 在 runs 目录中找不到"
            )

        return {
            "consistent": len(issues) == 0,
            "issues": issues,
            "state_id": state.state_id,
            "last_updated": state.last_updated,
            "has_current_result": state.current_result is not None,
            "param_history_count": len(state.param_history),
            "note_count": len(state.notes),
            "run_count": len(run_ids),
        }

    def compare_params(
        self, old_snapshot_id: str, new_snapshot_id: str
    ) -> Dict[str, Any]:
        state = self.load_state()
        old_snap = None
        new_snap = None
        for s in state.param_history:
            if s.snapshot_id == old_snapshot_id:
                old_snap = s
            if s.snapshot_id == new_snapshot_id:
                new_snap = s

        if not old_snap or not new_snap:
            return {"found": False, "changes": []}

        old_params = asdict(old_snap.params)
        new_params = asdict(new_snap.params)

        changes = []
        all_keys = set(old_params.keys()) | set(new_params.keys())
        for key in sorted(all_keys):
            old_val = old_params.get(key)
            new_val = new_params.get(key)
            if old_val != new_val:
                changes.append({
                    "param": key,
                    "old": old_val,
                    "new": new_val,
                })

        return {
            "found": True,
            "old_snapshot_id": old_snapshot_id,
            "new_snapshot_id": new_snapshot_id,
            "old_created_at": old_snap.created_at,
            "new_created_at": new_snap.created_at,
            "changes": changes,
        }

    def _dict_to_state(self, data: Dict[str, Any]) -> GateState:
        state = GateState()
        state.state_id = data.get("state_id", state.state_id)
        state.last_updated = data.get("last_updated", state.last_updated)

        cp = data.get("current_params", {})
        state.current_params = GateParams(**cp)

        state.param_history = []
        for s in data.get("param_history", []):
            params = GateParams(**s["params"])
            snapshot = ParamSnapshot(
                snapshot_id=s["snapshot_id"],
                params=params,
                created_at=s["created_at"],
                reason=s.get("reason", ""),
            )
            state.param_history.append(snapshot)

        state.notes = []
        for n in data.get("notes", []):
            note = Note(
                note_id=n["note_id"],
                content=n["content"],
                note_type=NoteType(n["note_type"]),
                author=n["author"],
                created_at=n["created_at"],
                related_sample_ids=n.get("related_sample_ids", []),
            )
            state.notes.append(note)

        cr = data.get("current_result")
        if cr:
            state.current_result = self._dict_to_eval_result(cr)

        return state

    def _dict_to_eval_result(self, data: Dict[str, Any]) -> EvalResult:
        result = EvalResult()
        result.run_id = data["run_id"]
        result.decision = GateDecision(data["decision"])
        result.total_samples = data["total_samples"]
        result.correct_samples = data["correct_samples"]
        result.accuracy = data["accuracy"]
        result.fail_samples = data["fail_samples"]
        result.boundary_samples = data["boundary_samples"]
        result.old_queue_samples = data["old_queue_samples"]
        result.misjudge_samples = data["misjudge_samples"]
        result.param_errors = data["param_errors"]
        result.next_steps = data["next_steps"]
        result.param_snapshot_id = data["param_snapshot_id"]
        result.created_at = data["created_at"]
        return result

    @staticmethod
    def _now_iso() -> str:
        from datetime import datetime
        return datetime.now().isoformat(timespec="seconds")
