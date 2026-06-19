import hashlib
import json
import os
import shutil
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional, List, Dict, Any


def _now_ts() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S_%f")


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


@dataclass
class SampleRecord:
    sample_id: str
    content: Dict[str, Any]
    source_file: str
    source_hash: str
    source_row: int
    imported_at: str
    import_batch_id: str

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "SampleRecord":
        return cls(**d)


@dataclass
class ManualJudgment:
    judgment_id: str
    sample_id: str
    model_version: str
    original_model_label: str
    manual_label: str
    operator: str
    note: str
    created_at: str
    batch_id: str
    is_overridden: bool = False
    overridden_by: Optional[str] = None
    overridden_at: Optional[str] = None
    override_reason: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "ManualJudgment":
        return cls(**d)


@dataclass
class JudgmentDiff:
    judgment_id_old: str
    judgment_id_new: str
    sample_id: str
    field_diffs: Dict[str, Dict[str, Any]]
    diff_at: str

    def to_dict(self) -> dict:
        return asdict(self)


class DataStore:
    def __init__(self, root_dir: str):
        self.root_dir = os.path.abspath(root_dir)
        self.samples_dir = os.path.join(self.root_dir, "samples")
        self.judgments_dir = os.path.join(self.root_dir, "judgments")
        self.batches_dir = os.path.join(self.root_dir, "batches")
        self.exports_dir = os.path.join(self.root_dir, "exports")
        self.logs_dir = os.path.join(self.root_dir, "logs")
        self._ensure_dirs()

    def _ensure_dirs(self):
        for d in [self.samples_dir, self.judgments_dir, self.batches_dir,
                  self.exports_dir, self.logs_dir]:
            os.makedirs(d, exist_ok=True)

    def _write_json(self, path: str, obj: Any):
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)
        os.replace(tmp, path)

    def _read_json(self, path: str) -> Any:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    # ========= Samples =========
    def samples_index_path(self) -> str:
        return os.path.join(self.samples_dir, "index.json")

    def load_samples_index(self) -> Dict[str, dict]:
        p = self.samples_index_path()
        if not os.path.exists(p):
            return {}
        return self._read_json(p)

    def save_samples_index(self, idx: Dict[str, dict]):
        self._write_json(self.samples_index_path(), idx)

    def sample_snapshot_dir(self, batch_id: str) -> str:
        d = os.path.join(self.samples_dir, "snapshots", batch_id)
        os.makedirs(d, exist_ok=True)
        return d

    def archive_sample_source(self, src_csv_path: str, batch_id: str) -> str:
        d = self.sample_snapshot_dir(batch_id)
        base = os.path.basename(src_csv_path)
        dst = os.path.join(d, f"{_now_ts()}_{base}")
        shutil.copy2(src_csv_path, dst)
        return dst

    def import_samples(self, samples: List[SampleRecord]) -> str:
        batch_id = samples[0].import_batch_id if samples else _now_ts()
        idx = self.load_samples_index()
        for s in samples:
            key = s.sample_id
            if key not in idx:
                idx[key] = {"history": []}
            idx[key]["history"].append(s.to_dict())
        self.save_samples_index(idx)
        return batch_id

    def get_sample_latest(self, sample_id: str) -> Optional[SampleRecord]:
        idx = self.load_samples_index()
        hist = idx.get(sample_id, {}).get("history", [])
        if not hist:
            return None
        return SampleRecord.from_dict(hist[-1])

    def get_sample_history(self, sample_id: str) -> List[SampleRecord]:
        idx = self.load_samples_index()
        hist = idx.get(sample_id, {}).get("history", [])
        return [SampleRecord.from_dict(h) for h in hist]

    # ========= Judgments =========
    def judgments_index_path(self) -> str:
        return os.path.join(self.judgments_dir, "index.json")

    def load_judgments_index(self) -> Dict[str, list]:
        p = self.judgments_index_path()
        if not os.path.exists(p):
            return {}
        return self._read_json(p)

    def save_judgments_index(self, idx: Dict[str, list]):
        self._write_json(self.judgments_index_path(), idx)

    def add_judgment(self, j: ManualJudgment) -> ManualJudgment:
        idx = self.load_judgments_index()
        sid = j.sample_id
        if sid not in idx:
            idx[sid] = []
        prev = idx[sid]
        if prev:
            last = ManualJudgment.from_dict(prev[-1])
            if not last.is_overridden:
                last.is_overridden = True
                last.overridden_by = j.judgment_id
                last.overridden_at = j.created_at
                last.override_reason = f"被新改判覆盖: {j.override_reason or '人工改判更新'}"
                prev[-1] = last.to_dict()
        jdict = j.to_dict()
        prev.append(jdict)
        idx[sid] = prev
        self.save_judgments_index(idx)
        batch_log = os.path.join(self.judgments_dir, f"batch_{j.batch_id}.json")
        bl = []
        if os.path.exists(batch_log):
            bl = self._read_json(batch_log)
        bl.append(jdict)
        self._write_json(batch_log, bl)
        return j

    def get_judgments_for_sample(self, sample_id: str) -> List[ManualJudgment]:
        idx = self.load_judgments_index()
        return [ManualJudgment.from_dict(d) for d in idx.get(sample_id, [])]

    def get_latest_judgment(self, sample_id: str) -> Optional[ManualJudgment]:
        js = self.get_judgments_for_sample(sample_id)
        active = [j for j in js if not j.is_overridden]
        return active[-1] if active else (js[-1] if js else None)

    def list_all_judgments(self) -> List[ManualJudgment]:
        idx = self.load_judgments_index()
        result = []
        for sid, lst in idx.items():
            for d in lst:
                result.append(ManualJudgment.from_dict(d))
        return result

    def list_active_judgments(self) -> List[ManualJudgment]:
        idx = self.load_judgments_index()
        result = []
        for sid, lst in idx.items():
            for d in lst:
                j = ManualJudgment.from_dict(d)
                if not j.is_overridden:
                    result.append(j)
        return result

    def get_judgments_by_batch(self, batch_id: str) -> List[ManualJudgment]:
        p = os.path.join(self.judgments_dir, f"batch_{batch_id}.json")
        if not os.path.exists(p):
            return []
        return [ManualJudgment.from_dict(d) for d in self._read_json(p)]

    # ========= Batches / Runs =========
    def record_run(self, run_type: str, params: Dict[str, Any],
                   success: bool, message: str = "",
                   artifacts: Optional[Dict[str, str]] = None) -> str:
        run_id = _now_ts()
        record = {
            "run_id": run_id,
            "run_type": run_type,
            "params": params,
            "success": success,
            "message": message,
            "artifacts": artifacts or {},
            "created_at": _now_ts()
        }
        p = os.path.join(self.batches_dir, f"run_{run_id}.json")
        self._write_json(p, record)
        return run_id

    def get_run(self, run_id: str) -> Optional[dict]:
        p = os.path.join(self.batches_dir, f"run_{run_id}.json")
        if not os.path.exists(p):
            return None
        return self._read_json(p)

    def list_runs(self) -> List[dict]:
        runs = []
        for name in sorted(os.listdir(self.batches_dir)):
            if name.startswith("run_") and name.endswith(".json"):
                runs.append(self._read_json(os.path.join(self.batches_dir, name)))
        return runs

    # ========= Audit / References =========
    def log_missing_reference(self, sample_id: str, judgment_id: str,
                               detail: str):
        p = os.path.join(self.logs_dir, "missing_refs.log")
        with open(p, "a", encoding="utf-8") as f:
            f.write(json.dumps({
                "sample_id": sample_id,
                "judgment_id": judgment_id,
                "detail": detail,
                "at": _now_ts()
            }, ensure_ascii=False) + "\n")

    def read_missing_refs(self) -> List[dict]:
        p = os.path.join(self.logs_dir, "missing_refs.log")
        if not os.path.exists(p):
            return []
        out = []
        with open(p, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    out.append(json.loads(line))
        return out
