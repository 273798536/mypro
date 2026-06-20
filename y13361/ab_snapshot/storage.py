import os
import re
import glob
import json
from typing import Dict, List, Optional, Any
from .models import (
    VersionSnapshot, MaterialMeta, SampleRecord, MetricItem, ManualAdjustment,
    now_iso, compute_content_hash, save_json, load_json
)


DEFAULT_WORKSPACE = "./snapshot_workspace"
RAW_DIRNAME = "raw_materials"
SNAP_DIRNAME = "snapshots"
REPORT_DIRNAME = "reports"


def _ensure_dirs(root: str) -> Dict[str, str]:
    paths = {
        "root": root,
        "raw": os.path.join(root, RAW_DIRNAME),
        "snap": os.path.join(root, SNAP_DIRNAME),
        "report": os.path.join(root, REPORT_DIRNAME),
    }
    for p in paths.values():
        os.makedirs(p, exist_ok=True)
    return paths


def list_materials(workspace: str, version_tag: str) -> List[Dict[str, str]]:
    paths = _ensure_dirs(workspace)
    pattern = os.path.join(paths["raw"], f"{version_tag}_*")
    files = sorted(glob.glob(pattern))
    out = []
    for f in files:
        base = os.path.basename(f)
        m = re.match(rf"^{re.escape(version_tag)}_(.+?)\.(.+)$", base)
        mat_type = "unknown"
        if m:
            mat_type = m.group(1)
        out.append({"file": f, "name": base, "type": mat_type})
    return out


def _read_text_safe(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except UnicodeDecodeError:
        with open(path, "r", encoding="gbk", errors="ignore") as f:
            return f.read()


def _parse_samples(content: str) -> List[SampleRecord]:
    samples: List[SampleRecord] = []
    lines = content.strip().splitlines()
    header = None
    for ln in lines:
        ln = ln.strip()
        if not ln:
            continue
        if ln.startswith("sample_id") or ln.startswith("#"):
            header = [c.strip() for c in ln.lstrip("#").split("\t")]
            continue
        parts = ln.split("\t")
        if len(parts) < 3:
            continue
        sid = parts[0]
        features: Dict[str, Any] = {}
        label = parts[-2] if len(parts) >= 2 else None
        prediction = parts[-1] if len(parts) >= 1 else None
        latency = 0
        is_late = False
        evs: List[str] = []
        manual: Optional[Dict] = None
        for i, val in enumerate(parts[:-2] if len(parts) > 2 else parts):
            key = header[i] if header and i < len(header) else f"f{i}"
            if key == "latency_ms" or key == "feature_arrival_latency_ms":
                try:
                    latency = int(val)
                except ValueError:
                    latency = 0
                continue
            if key == "is_feature_late":
                is_late = str(val).lower() in ("1", "true", "yes", "y", "是")
                continue
            if key == "evidence" or key == "evidence_refs":
                evs = [v.strip() for v in val.split("|") if v.strip()]
                continue
            if key.startswith("manual_"):
                if manual is None:
                    manual = {}
                manual[key] = val
                continue
            features[key] = val
        samples.append(SampleRecord(
            sample_id=sid,
            features=features,
            label=label,
            prediction=prediction,
            feature_arrival_latency_ms=latency,
            is_feature_late=is_late,
            manual_correction=manual,
            evidence_refs=evs
        ))
    return samples


def _parse_metrics(content: str) -> List[MetricItem]:
    metrics: List[MetricItem] = []
    for line in content.strip().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = [p.strip() for p in line.split("\t")]
        if len(parts) < 2:
            continue
        name = parts[0]
        try:
            value = float(parts[1])
        except ValueError:
            continue
        threshold = None
        direction = "higher"
        pass_st = None
        if len(parts) >= 3 and parts[2]:
            try:
                threshold = float(parts[2])
            except ValueError:
                pass
        if len(parts) >= 4 and parts[3]:
            direction = parts[3]
        if threshold is not None:
            if direction == "higher":
                pass_st = value >= threshold
            else:
                pass_st = value <= threshold
        metrics.append(MetricItem(
            name=name, value=value, threshold=threshold,
            direction=direction, pass_status=pass_st
        ))
    return metrics


def _parse_manual_adjustments(content: str) -> List[ManualAdjustment]:
    adj: List[ManualAdjustment] = []
    for line in content.strip().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = [p.strip() for p in line.split("\t")]
        if len(parts) < 5:
            continue
        adj.append(ManualAdjustment(
            item_id=parts[0],
            field_name=parts[1],
            old_value=parts[2],
            new_value=parts[3],
            reason=parts[4],
            operator=parts[5] if len(parts) >= 6 else "unknown",
            adjusted_at=parts[6] if len(parts) >= 7 else now_iso()
        ))
    return adj


def build_snapshot_from_dir(workspace: str, version_tag: str) -> VersionSnapshot:
    paths = _ensure_dirs(workspace)
    mats_meta: List[MaterialMeta] = []
    training_log = ""
    samples: List[SampleRecord] = []
    metrics: List[MetricItem] = []
    adjustments: List[ManualAdjustment] = []
    notes = ""

    for entry in list_materials(workspace, version_tag):
        content = _read_text_safe(entry["file"])
        h = compute_content_hash(content)
        mats_meta.append(MaterialMeta(
            material_name=entry["name"],
            material_type=entry["type"],
            uploaded_at=now_iso(),
            content_hash=h,
            source=entry["file"]
        ))
        t = entry["type"].lower()
        if "log" in t or "training" in t:
            training_log = content
        elif "note" in t or "verbal" in t or "说明" in t:
            notes = content
        elif "sample" in t or "样本" in t or "normal" in t or "record" in t:
            samples.extend(_parse_samples(content))
        elif "metric" in t or "指标" in t or "score" in t:
            metrics.extend(_parse_metrics(content))
        elif "manual" in t or "修正" in t or "adjust" in t:
            adjustments.extend(_parse_manual_adjustments(content))

    snap = VersionSnapshot(
        version_tag=version_tag,
        created_at=now_iso(),
        materials=mats_meta,
        samples=samples,
        metrics=metrics,
        manual_adjustments=adjustments,
        raw_training_log=training_log,
        notes=notes
    )
    return snap


def save_snapshot(workspace: str, snapshot: VersionSnapshot) -> str:
    paths = _ensure_dirs(workspace)
    path = os.path.join(paths["snap"], f"snapshot_{snapshot.version_tag}.json")
    save_json(snapshot.to_dict(), path)
    return path


def load_snapshot(workspace: str, version_tag: str) -> Optional[VersionSnapshot]:
    paths = _ensure_dirs(workspace)
    path = os.path.join(paths["snap"], f"snapshot_{version_tag}.json")
    if not os.path.exists(path):
        return None
    data = load_json(path)
    return _dict_to_snapshot(data)


def _dict_to_snapshot(d: Dict[str, Any]) -> VersionSnapshot:
    mats = [MaterialMeta(**m) for m in d.get("materials", [])]
    samples = [SampleRecord(**s) for s in d.get("samples", [])]
    metrics = [MetricItem(**m) for m in d.get("metrics", [])]
    adjs = [ManualAdjustment(**a) for a in d.get("manual_adjustments", [])]
    return VersionSnapshot(
        version_tag=d["version_tag"],
        created_at=d["created_at"],
        materials=mats,
        samples=samples,
        metrics=metrics,
        manual_adjustments=adjs,
        raw_training_log=d.get("raw_training_log", ""),
        notes=d.get("notes", "")
    )


def list_saved_snapshots(workspace: str) -> List[str]:
    paths = _ensure_dirs(workspace)
    pattern = os.path.join(paths["snap"], "snapshot_*.json")
    out = []
    for f in sorted(glob.glob(pattern)):
        m = re.match(r"^snapshot_(.+)\.json$", os.path.basename(f))
        if m:
            out.append(m.group(1))
    return out


def get_report_path(workspace: str, snapshot_id: str) -> Optional[str]:
    paths = _ensure_dirs(workspace)
    html = os.path.join(paths["report"], f"review_{snapshot_id}.html")
    if os.path.exists(html):
        return html
    return None


def list_reports(workspace: str) -> List[str]:
    paths = _ensure_dirs(workspace)
    pattern = os.path.join(paths["report"], "review_*.html")
    out = []
    for f in sorted(glob.glob(pattern)):
        m = re.match(r"^review_(.+)\.html$", os.path.basename(f))
        if m:
            out.append(m.group(1))
    return out
