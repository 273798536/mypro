#!/usr/bin/env python3
import copy
import hashlib
import json
import os
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple


class StepStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED_LEGACY = "skipped_legacy"


class AnomalyKind(str, Enum):
    DIRTY_DATA = "dirty_data"
    LEGACY_ALIAS = "legacy_alias"
    THRESHOLD_BREACH = "threshold_breach"
    MANUAL_OVERRIDE = "manual_override"
    METRIC_DRIFT = "metric_drift"
    SCHEMA_MISMATCH = "schema_mismatch"
    MISSING_FIELD = "missing_field"


class RunStatus(str, Enum):
    INIT = "init"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    INTERRUPTED = "interrupted"


@dataclass
class AnomalyRecord:
    record_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    kind: AnomalyKind = AnomalyKind.DIRTY_DATA
    step_name: str = ""
    description: str = ""
    original_value: Any = None
    current_value: Any = None
    source_path: str = ""
    is_resolved: bool = False
    resolved_by: str = ""
    notes: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict:
        return {
            "record_id": self.record_id,
            "kind": self.kind.value,
            "step_name": self.step_name,
            "description": self.description,
            "original_value": self.original_value,
            "current_value": self.current_value,
            "source_path": self.source_path,
            "is_resolved": self.is_resolved,
            "resolved_by": self.resolved_by,
            "notes": self.notes,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, d: Dict) -> "AnomalyRecord":
        return cls(
            record_id=d.get("record_id", uuid.uuid4().hex[:12]),
            kind=AnomalyKind(d.get("kind", "dirty_data")),
            step_name=d.get("step_name", ""),
            description=d.get("description", ""),
            original_value=d.get("original_value"),
            current_value=d.get("current_value"),
            source_path=d.get("source_path", ""),
            is_resolved=d.get("is_resolved", False),
            resolved_by=d.get("resolved_by", ""),
            notes=d.get("notes", []),
            created_at=d.get("created_at", datetime.now().isoformat()),
        )


@dataclass
class ReplayStep:
    step_name: str
    step_index: int
    status: StepStatus = StepStatus.PENDING
    params: Dict = field(default_factory=dict)
    input_snapshot: Any = None
    output_snapshot: Any = None
    anomalies: List[AnomalyRecord] = field(default_factory=list)
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    param_fingerprint: str = ""

    def _fingerprint(self, data: Any) -> str:
        raw = json.dumps(data, sort_keys=True, ensure_ascii=False, default=str)
        return hashlib.md5(raw.encode()).hexdigest()[:10]

    def compute_param_fingerprint(self):
        self.param_fingerprint = self._fingerprint(self.params)

    def to_dict(self) -> Dict:
        return {
            "step_name": self.step_name,
            "step_index": self.step_index,
            "status": self.status.value,
            "params": self.params,
            "input_snapshot": self.input_snapshot,
            "output_snapshot": self.output_snapshot,
            "anomalies": [a.to_dict() for a in self.anomalies],
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "param_fingerprint": self.param_fingerprint,
        }

    @classmethod
    def from_dict(cls, d: Dict) -> "ReplayStep":
        step = cls(
            step_name=d["step_name"],
            step_index=d["step_index"],
            status=StepStatus(d.get("status", "pending")),
            params=d.get("params", {}),
            input_snapshot=d.get("input_snapshot"),
            output_snapshot=d.get("output_snapshot"),
            anomalies=[AnomalyRecord.from_dict(a) for a in d.get("anomalies", [])],
            started_at=d.get("started_at"),
            finished_at=d.get("finished_at"),
            param_fingerprint=d.get("param_fingerprint", ""),
        )
        return step


@dataclass
class ReplayRun:
    run_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    status: RunStatus = RunStatus.INIT
    params: Dict = field(default_factory=dict)
    steps: List[ReplayStep] = field(default_factory=list)
    anomalies: List[AnomalyRecord] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    finished_at: Optional[str] = None

    def to_dict(self) -> Dict:
        return {
            "run_id": self.run_id,
            "status": self.status.value,
            "params": self.params,
            "steps": [s.to_dict() for s in self.steps],
            "anomalies": [a.to_dict() for a in self.anomalies],
            "notes": self.notes,
            "created_at": self.created_at,
            "finished_at": self.finished_at,
        }

    @classmethod
    def from_dict(cls, d: Dict) -> "ReplayRun":
        return cls(
            run_id=d.get("run_id", uuid.uuid4().hex[:12]),
            status=RunStatus(d.get("status", "init")),
            params=d.get("params", {}),
            steps=[ReplayStep.from_dict(s) for s in d.get("steps", [])],
            anomalies=[AnomalyRecord.from_dict(a) for a in d.get("anomalies", [])],
            notes=d.get("notes", []),
            created_at=d.get("created_at", datetime.now().isoformat()),
            finished_at=d.get("finished_at"),
        )


@dataclass
class RunDiff:
    run_a_id: str
    run_b_id: str
    param_diff: Dict = field(default_factory=dict)
    sample_diff: List[Dict] = field(default_factory=list)
    threshold_diff: List[Dict] = field(default_factory=list)
    manual_correction_diff: List[Dict] = field(default_factory=list)
    metric_diff: List[Dict] = field(default_factory=list)
    step_diffs: List[Dict] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "run_a_id": self.run_a_id,
            "run_b_id": self.run_b_id,
            "param_diff": self.param_diff,
            "sample_diff": self.sample_diff,
            "threshold_diff": self.threshold_diff,
            "manual_correction_diff": self.manual_correction_diff,
            "metric_diff": self.metric_diff,
            "step_diffs": self.step_diffs,
        }


STEP_PIPELINE = [
    "load_config",
    "validate_schema",
    "detect_legacy_aliases",
    "apply_thresholds",
    "apply_manual_corrections",
    "compute_metrics",
    "collect_anomalies",
]


class AnomalyReplay:
    def __init__(self, state_path: str = "ab_replay_state.json"):
        self.state_path = state_path
        self.run_history: List[ReplayRun] = []
        self.current_run: Optional[ReplayRun] = None
        self.anomaly_queue: List[AnomalyRecord] = []
        self._load_state()

    def _load_state(self):
        if os.path.exists(self.state_path):
            with open(self.state_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.run_history = [ReplayRun.from_dict(r) for r in data.get("run_history", [])]
            self.anomaly_queue = [AnomalyRecord.from_dict(a) for a in data.get("anomaly_queue", [])]
            if data.get("current_run"):
                self.current_run = ReplayRun.from_dict(data["current_run"])
            if self.current_run and self.current_run.status == RunStatus.RUNNING:
                self.current_run.status = RunStatus.INTERRUPTED
                self._persist()

    def _persist(self):
        data = {
            "run_history": [r.to_dict() for r in self.run_history],
            "anomaly_queue": [a.to_dict() for a in self.anomaly_queue],
            "current_run": self.current_run.to_dict() if self.current_run else None,
            "persisted_at": datetime.now().isoformat(),
        }
        with open(self.state_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)

    def validate_consistency(self) -> List[str]:
        issues = []
        all_anomalies = []
        for run in self.run_history:
            all_anomalies.extend(run.anomalies)
        if self.current_run:
            all_anomalies.extend(self.current_run.anomalies)
        queue_ids = {a.record_id for a in self.anomaly_queue}
        run_anomaly_ids = {a.record_id for a in all_anomalies}
        missing_in_queue = run_anomaly_ids - queue_ids
        extra_in_queue = queue_ids - run_anomaly_ids
        if missing_in_queue:
            issues.append(f"异常队列缺少 {len(missing_in_queue)} 条运行内异常记录")
        if extra_in_queue:
            issues.append(f"异常队列多出 {len(extra_in_queue)} 条无来源记录")
        for run in self.run_history:
            if run.status == RunStatus.RUNNING:
                issues.append(f"运行 {run.run_id} 状态为 running 但已在历史中，应为 completed/interrupted")
        if self.current_run:
            step_names = [s.step_name for s in self.current_run.steps]
            expected = set(STEP_PIPELINE)
            actual = set(step_names)
            if not expected.issubset(actual) and self.current_run.status == RunStatus.COMPLETED:
                missing = expected - actual
                issues.append(f"已完成运行缺少步骤: {missing}")
        return issues

    def new_run(self, params: Dict) -> ReplayRun:
        if self.current_run and self.current_run.status == RunStatus.RUNNING:
            self.current_run.status = RunStatus.INTERRUPTED
            self.run_history.append(self.current_run)
        run = ReplayRun(params=params)
        for i, step_name in enumerate(STEP_PIPELINE):
            step = ReplayStep(step_name=step_name, step_index=i)
            step.params = params.get("steps", {}).get(step_name, {})
            step.compute_param_fingerprint()
            run.steps.append(step)
        self.current_run = run
        self._persist()
        return run

    def _snapshot(self, data: Any) -> Any:
        try:
            return copy.deepcopy(data)
        except Exception:
            return json.loads(json.dumps(data, default=str))

    def _deep_diff(self, old: Any, new: Any, path: str = "") -> List[Dict]:
        diffs = []
        if isinstance(old, dict) and isinstance(new, dict):
            all_keys = set(list(old.keys()) + list(new.keys()))
            for k in all_keys:
                sub_path = f"{path}.{k}" if path else k
                if k not in old:
                    diffs.append({"path": sub_path, "change": "added", "old": None, "new": new[k]})
                elif k not in new:
                    diffs.append({"path": sub_path, "change": "removed", "old": old[k], "new": None})
                else:
                    diffs.extend(self._deep_diff(old[k], new[k], sub_path))
        elif isinstance(old, list) and isinstance(new, list):
            if old != new:
                diffs.append({"path": path, "change": "list_changed", "old": old, "new": new})
        else:
            if old != new:
                diffs.append({"path": path, "change": "value_changed", "old": old, "new": new})
        return diffs

    def _add_anomaly(self, anomaly: AnomalyRecord):
        self.anomaly_queue.append(anomaly)
        if self.current_run:
            self.current_run.anomalies.append(anomaly)
            for step in self.current_run.steps:
                if step.step_name == anomaly.step_name:
                    step.anomalies.append(anomaly)
                    break

    def run_step(self, step_name: str, input_data: Any) -> Any:
        if not self.current_run:
            raise RuntimeError("无当前运行，请先调用 new_run()")
        step = None
        for s in self.current_run.steps:
            if s.step_name == step_name:
                step = s
                break
        if step is None:
            raise ValueError(f"未知步骤: {step_name}")
        step.status = StepStatus.RUNNING
        step.started_at = datetime.now().isoformat()
        step.input_snapshot = self._snapshot(input_data)
        self.current_run.status = RunStatus.RUNNING
        self._persist()

        output = self._execute_step(step, input_data)

        step.output_snapshot = self._snapshot(output)
        step.finished_at = datetime.now().isoformat()
        if step.status == StepStatus.RUNNING:
            step.status = StepStatus.COMPLETED
        self._persist()
        return output

    def _execute_step(self, step: ReplayStep, input_data: Any) -> Any:
        step_name = step.step_name
        if step_name == "load_config":
            return self._step_load_config(step, input_data)
        elif step_name == "validate_schema":
            return self._step_validate_schema(step, input_data)
        elif step_name == "detect_legacy_aliases":
            return self._step_detect_legacy_aliases(step, input_data)
        elif step_name == "apply_thresholds":
            return self._step_apply_thresholds(step, input_data)
        elif step_name == "apply_manual_corrections":
            return self._step_apply_manual_corrections(step, input_data)
        elif step_name == "compute_metrics":
            return self._step_compute_metrics(step, input_data)
        elif step_name == "collect_anomalies":
            return self._step_collect_anomalies(step, input_data)
        else:
            raise ValueError(f"未实现步骤: {step_name}")

    def _step_load_config(self, step: ReplayStep, input_data: Any) -> Dict:
        config = input_data if isinstance(input_data, dict) else {}
        if not config:
            self._add_anomaly(AnomalyRecord(
                kind=AnomalyKind.MISSING_FIELD,
                step_name=step.step_name,
                description="灰度配置为空",
                original_value=None,
                current_value=None,
            ))
            return {"samples": [], "thresholds": {}, "metrics": {}, "_raw": config}
        config = self._snapshot(config)
        dirty_fields = []
        for key, val in list(config.items()):
            if val is None or val == "" or (isinstance(val, str) and val.strip() == ""):
                dirty_fields.append(key)
                self._add_anomaly(AnomalyRecord(
                    kind=AnomalyKind.DIRTY_DATA,
                    step_name=step.step_name,
                    description=f"字段 {key} 值为空或空白，保留原始值",
                    original_value=val,
                    current_value=val,
                    source_path=key,
                ))
        result = dict(config)
        result["_dirty_fields"] = dirty_fields
        result["_load_fingerprint"] = step._fingerprint(config)
        return result

    def _step_validate_schema(self, step: ReplayStep, input_data: Dict) -> Dict:
        result = self._snapshot(input_data)
        required = ["samples", "thresholds"]
        for field_name in required:
            if field_name not in result:
                self._add_anomaly(AnomalyRecord(
                    kind=AnomalyKind.SCHEMA_MISMATCH,
                    step_name=step.step_name,
                    description=f"缺少必要字段: {field_name}",
                    original_value=None,
                    current_value=None,
                    source_path=field_name,
                ))
                if field_name == "samples":
                    result["samples"] = []
                elif field_name == "thresholds":
                    result["thresholds"] = {}
        return result

    def _step_detect_legacy_aliases(self, step: ReplayStep, input_data: Dict) -> Dict:
        result = self._snapshot(input_data)
        legacy_markers = ["_old", "_backup", "_v1", "_deprecated", "_legacy"]
        samples = result.get("samples", [])
        for i, sample in enumerate(samples):
            if not isinstance(sample, dict):
                continue
            source = sample.get("source", "")
            name = sample.get("name", "")
            is_legacy = False
            for marker in legacy_markers:
                if marker in source.lower() or marker in name.lower():
                    is_legacy = True
                    break
            if source and not source.endswith(".json") and "/" not in source and "\\" not in source:
                is_legacy = True
            if is_legacy:
                sample["_legacy_detected"] = True
                sample["_legacy_status"] = "anomaly_legacy"
                self._add_anomaly(AnomalyRecord(
                    kind=AnomalyKind.LEGACY_ALIAS,
                    step_name=step.step_name,
                    description=f"样本 {name or i} 疑似版本别名或旧文件来源: {source}",
                    original_value=source,
                    current_value=source,
                    source_path=f"samples[{i}]",
                ))
        return result

    def _step_apply_thresholds(self, step: ReplayStep, input_data: Dict) -> Dict:
        result = self._snapshot(input_data)
        thresholds = result.get("thresholds", {})
        samples = result.get("samples", [])
        for i, sample in enumerate(samples):
            if not isinstance(sample, dict):
                continue
            value = sample.get("value")
            metric_name = sample.get("metric", "default")
            threshold = thresholds.get(metric_name)
            if threshold is not None and value is not None:
                try:
                    low = threshold.get("low") if isinstance(threshold, dict) else None
                    high = threshold.get("high") if isinstance(threshold, dict) else None
                    if low is not None and float(value) < float(low):
                        sample["_threshold_breach"] = "low"
                        self._add_anomaly(AnomalyRecord(
                            kind=AnomalyKind.THRESHOLD_BREACH,
                            step_name=step.step_name,
                            description=f"样本 {sample.get('name', i)} 值 {value} 低于下限 {low}",
                            original_value=value,
                            current_value=value,
                            source_path=f"samples[{i}].value",
                        ))
                    elif high is not None and float(value) > float(high):
                        sample["_threshold_breach"] = "high"
                        self._add_anomaly(AnomalyRecord(
                            kind=AnomalyKind.THRESHOLD_BREACH,
                            step_name=step.step_name,
                            description=f"样本 {sample.get('name', i)} 值 {value} 超过上限 {high}",
                            original_value=value,
                            current_value=value,
                            source_path=f"samples[{i}].value",
                        ))
                except (TypeError, ValueError):
                    pass
        return result

    def _step_apply_manual_corrections(self, step: ReplayStep, input_data: Dict) -> Dict:
        result = self._snapshot(input_data)
        corrections = result.get("manual_corrections", [])
        for correction in corrections:
            if not isinstance(correction, dict):
                continue
            target = correction.get("target", "")
            old_val = correction.get("old_value")
            new_val = correction.get("new_value")
            reason = correction.get("reason", "")
            self._add_anomaly(AnomalyRecord(
                kind=AnomalyKind.MANUAL_OVERRIDE,
                step_name=step.step_name,
                description=f"人工修正: {target} 从 {old_val} 改为 {new_val}，原因: {reason}",
                original_value=old_val,
                current_value=new_val,
                source_path=target,
            ))
            if target and "samples" in result:
                parts = target.replace("]", "").split("[")
                try:
                    idx = int(parts[1]) if len(parts) > 1 else None
                    field = parts[2] if len(parts) > 2 else None
                    if idx is not None and field and idx < len(result["samples"]):
                        sample = result["samples"][idx]
                        if isinstance(sample, dict):
                            sample[field] = new_val
                            sample["_manually_corrected"] = True
                            sample["_correction_reason"] = reason
                except (ValueError, IndexError, KeyError):
                    pass
        return result

    def _step_compute_metrics(self, step: ReplayStep, input_data: Dict) -> Dict:
        result = self._snapshot(input_data)
        samples = result.get("samples", [])
        metric_values: Dict[str, List] = {}
        for sample in samples:
            if not isinstance(sample, dict):
                continue
            metric_name = sample.get("metric", "default")
            value = sample.get("value")
            if value is not None:
                try:
                    metric_values.setdefault(metric_name, []).append(float(value))
                except (TypeError, ValueError):
                    pass
        computed = {}
        for name, values in metric_values.items():
            computed[name] = {
                "count": len(values),
                "mean": round(sum(values) / len(values), 6) if values else None,
                "min": min(values) if values else None,
                "max": max(values) if values else None,
            }
        result["_computed_metrics"] = computed
        return result

    def _step_collect_anomalies(self, step: ReplayStep, input_data: Dict) -> Dict:
        result = self._snapshot(input_data)
        collected = []
        for sample in result.get("samples", []):
            if not isinstance(sample, dict):
                continue
            flags = []
            if sample.get("_legacy_detected"):
                flags.append("legacy_alias")
            if sample.get("_threshold_breach"):
                flags.append(f"threshold_{sample['_threshold_breach']}")
            if sample.get("_manually_corrected"):
                flags.append("manual_correction")
            if sample.get("_dirty_fields") or any(
                k.startswith("_dirty") for k in sample.keys()
            ):
                flags.append("dirty_data")
            if flags:
                collected.append({
                    "sample_name": sample.get("name", "unknown"),
                    "flags": flags,
                    "status": "anomaly_legacy" if "legacy_alias" in flags else "anomaly",
                    "value": sample.get("value"),
                    "metric": sample.get("metric", ""),
                })
        result["_anomaly_summary"] = {
            "total": len(collected),
            "by_kind": {},
            "samples": collected,
        }
        for item in collected:
            for flag in item["flags"]:
                result["_anomaly_summary"]["by_kind"][flag] = result["_anomaly_summary"]["by_kind"].get(flag, 0) + 1
        return result

    def run_all(self, config: Dict, params: Optional[Dict] = None) -> ReplayRun:
        if params is None:
            params = {}
        run = self.new_run(params)
        data = config
        for step in run.steps:
            data = self.run_step(step.step_name, data)
        run.status = RunStatus.COMPLETED
        run.finished_at = datetime.now().isoformat()
        self.run_history.append(run)
        self.current_run = None
        self._persist()
        return run

    def diff_runs(self, run_a: ReplayRun, run_b: ReplayRun) -> RunDiff:
        diff = RunDiff(run_a_id=run_a.run_id, run_b_id=run_b.run_id)
        diff.param_diff = {
            "added": {k: v for k, v in run_b.params.items() if k not in run_a.params},
            "removed": {k: v for k, v in run_a.params.items() if k not in run_b.params},
            "changed": {
                k: {"old": run_a.params[k], "new": run_b.params[k]}
                for k in run_a.params
                if k in run_b.params and run_a.params[k] != run_b.params[k]
            },
        }
        def _extract_samples(run: ReplayRun) -> List[Dict]:
            for s in run.steps:
                if s.step_name == "collect_anomalies" and s.output_snapshot:
                    return s.output_snapshot.get("samples", [])
            return []

        def _extract_thresholds(run: ReplayRun) -> Dict:
            for s in run.steps:
                if s.step_name == "apply_thresholds" and s.output_snapshot:
                    return s.output_snapshot.get("thresholds", {})
            return {}

        def _extract_corrections(run: ReplayRun) -> List:
            for s in run.steps:
                if s.step_name == "apply_manual_corrections" and s.output_snapshot:
                    return s.output_snapshot.get("manual_corrections", [])
            return []

        def _extract_metrics(run: ReplayRun) -> Dict:
            for s in run.steps:
                if s.step_name == "compute_metrics" and s.output_snapshot:
                    return s.output_snapshot.get("_computed_metrics", {})
            return {}

        def _samples_to_map(samples: List[Dict]) -> Dict:
            return {s.get("name", f"idx_{i}"): s for i, s in enumerate(samples) if isinstance(s, dict)}

        sa = _samples_to_map(_extract_samples(run_a))
        sb = _samples_to_map(_extract_samples(run_b))
        all_names = set(list(sa.keys()) + list(sb.keys()))
        for name in all_names:
            if name not in sa:
                diff.sample_diff.append({"sample": name, "change": "added_in_b", "details": sb[name]})
            elif name not in sb:
                diff.sample_diff.append({"sample": name, "change": "removed_in_b", "details": sa[name]})
            else:
                changes = self._deep_diff(sa[name], sb[name])
                if changes:
                    diff.sample_diff.append({"sample": name, "change": "modified", "details": changes})

        ta = _extract_thresholds(run_a)
        tb = _extract_thresholds(run_b)
        for change in self._deep_diff(ta, tb):
            diff.threshold_diff.append(change)

        ca = _extract_corrections(run_a)
        cb = _extract_corrections(run_b)
        if ca != cb:
            diff.manual_correction_diff.append({"old": ca, "new": cb})

        ma = _extract_metrics(run_a)
        mb = _extract_metrics(run_b)
        for change in self._deep_diff(ma, mb):
            diff.metric_diff.append(change)

        step_diffs = []
        for sa_step in run_a.steps:
            for sb_step in run_b.steps:
                if sa_step.step_name == sb_step.step_name:
                    step_diffs.append({
                        "step_name": sa_step.step_name,
                        "param_fingerprint_a": sa_step.param_fingerprint,
                        "param_fingerprint_b": sb_step.param_fingerprint,
                        "params_changed": sa_step.param_fingerprint != sb_step.param_fingerprint,
                        "anomaly_count_a": len(sa_step.anomalies),
                        "anomaly_count_b": len(sb_step.anomalies),
                        "output_diff": self._deep_diff(
                            sa_step.output_snapshot or {},
                            sb_step.output_snapshot or {},
                        ),
                    })
        diff.step_diffs = step_diffs
        return diff

    def get_handoff_summary(self) -> Dict:
        latest_run = self.current_run or (self.run_history[-1] if self.run_history else None)
        if not latest_run:
            return {"error": "尚无运行记录"}
        result_data = None
        for step in latest_run.steps:
            if step.step_name == "collect_anomalies" and step.output_snapshot:
                result_data = step.output_snapshot
        samples_loc = "current_run.steps[collect_anomalies].output_snapshot.samples"
        anomalies_loc = "anomaly_queue"
        export_loc = self.state_path
        anomaly_summary = result_data.get("_anomaly_summary", {}) if result_data else {}
        return {
            "样例位置": samples_loc,
            "异常总数": anomaly_summary.get("total", 0),
            "异常分类": anomaly_summary.get("by_kind", {}),
            "异常位置": anomalies_loc,
            "导出方式": f"replay.export_json() -> {export_loc}",
            "运行ID": latest_run.run_id,
            "运行状态": latest_run.status.value,
        }

    def export_json(self, output_path: Optional[str] = None) -> str:
        if output_path is None:
            output_path = self.state_path.replace(".json", "_export.json")
        data = {
            "run_history": [r.to_dict() for r in self.run_history],
            "current_run": self.current_run.to_dict() if self.current_run else None,
            "anomaly_queue": [a.to_dict() for a in self.anomaly_queue],
            "handoff": self.get_handoff_summary(),
            "exported_at": datetime.now().isoformat(),
        }
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        return output_path


def main():
    import sys

    if len(sys.argv) < 2:
        print("用法: python ab_replay.py <config.json> [--params params.json] [--state state.json] [--diff run_a run_b]")
        print()
        print("子命令:")
        print("  python ab_replay.py <config.json>           运行完整回放")
        print("  python ab_replay.py --diff <run_a> <run_b>  对比两次运行")
        print("  python ab_replay.py --handoff               输出交接摘要")
        sys.exit(1)

    args = sys.argv[1:]
    state_path = "ab_replay_state.json"
    for i, a in enumerate(args):
        if a == "--state" and i + 1 < len(args):
            state_path = args[i + 1]

    replay = AnomalyReplay(state_path=state_path)

    if "--diff" in args:
        idx = args.index("--diff")
        if idx + 2 >= len(args):
            print("需要指定两个运行 ID")
            sys.exit(1)
        id_a, id_b = args[idx + 1], args[idx + 2]
        run_a = run_b = None
        for r in replay.run_history:
            if r.run_id == id_a:
                run_a = r
            if r.run_id == id_b:
                run_b = r
        if not run_a or not run_b:
            print(f"找不到运行: {id_a if not run_a else id_b}")
            sys.exit(1)
        diff = replay.diff_runs(run_a, run_b)
        print(json.dumps(diff.to_dict(), ensure_ascii=False, indent=2, default=str))
        return

    if "--handoff" in args:
        print(json.dumps(replay.get_handoff_summary(), ensure_ascii=False, indent=2))
        return

    config_path = args[0]
    params = {}
    for i, a in enumerate(args):
        if a == "--params" and i + 1 < len(args):
            with open(args[i + 1], "r", encoding="utf-8") as f:
                params = json.load(f)

    with open(config_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    run = replay.run_all(config, params)

    print(f"运行完成: {run.run_id}")
    print(f"状态: {run.status.value}")
    print(f"异常数: {len(run.anomalies)}")

    consistency = replay.validate_consistency()
    if consistency:
        print("\n一致性检查发现问题:")
        for issue in consistency:
            print(f"  - {issue}")
    else:
        print("一致性检查: 通过")

    handoff = replay.get_handoff_summary()
    print("\n交接摘要:")
    for k, v in handoff.items():
        print(f"  {k}: {v}")

    export_path = replay.export_json()
    print(f"\n导出: {export_path}")


if __name__ == "__main__":
    main()
