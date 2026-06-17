from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional

from prompt_impact.models import Report
from prompt_impact.store import Store


@dataclass
class ChangedFinding:
    id: str
    before_status: str
    after_status: str
    before_conclusion: str
    after_conclusion: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "before_status": self.before_status,
            "after_status": self.after_status,
            "before_conclusion": self.before_conclusion,
            "after_conclusion": self.after_conclusion,
        }


@dataclass
class DiffResult:
    added: List[str] = field(default_factory=list)
    removed: List[str] = field(default_factory=list)
    changed: List[ChangedFinding] = field(default_factory=list)
    duplicate_conclusions: List[str] = field(default_factory=list)
    verdict: str = "clean"

    def to_dict(self) -> dict:
        return {
            "added": self.added,
            "removed": self.removed,
            "changed": [c.to_dict() for c in self.changed],
            "duplicate_conclusions": self.duplicate_conclusions,
            "verdict": self.verdict,
        }


def load_baseline_report(baseline_dir: Path) -> Optional[Report]:
    path = baseline_dir / "report.json"
    if not path.exists():
        return None
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    return Report.from_dict(raw)


def diff(current: Store, baseline: Optional[Report]) -> DiffResult:
    result = DiffResult()
    base_findings: Dict[str, object] = {}
    if baseline is not None:
        base_findings = {f.id: f for f in baseline.findings}
    cur_ids = set(current.findings.keys())
    base_ids = set(base_findings.keys())
    result.added = sorted(cur_ids - base_ids)
    result.removed = sorted(base_ids - cur_ids)
    for fid in sorted(cur_ids & base_ids):
        cur = current.findings[fid]
        base = base_findings[fid]
        if cur.status != base.status or (cur.conclusion or "") != (base.conclusion or ""):
            result.changed.append(
                ChangedFinding(
                    id=fid,
                    before_status=base.status,
                    after_status=cur.status,
                    before_conclusion=base.conclusion,
                    after_conclusion=cur.conclusion,
                )
            )
    key_counts: Dict[str, int] = {}
    for f in current.findings_list():
        key = (f.kind, f.prompt_version, f.eval_run_id, f.sample_key)
        key_counts[str(key)] = key_counts.get(str(key), 0) + 1
    result.duplicate_conclusions = sorted(k for k, v in key_counts.items() if v > 1)
    if result.added or result.removed or result.changed:
        result.verdict = "changed"
    if result.duplicate_conclusions:
        result.verdict = "anomaly"
    return result


def render_diff(result: DiffResult, baseline_dir: Optional[Path]) -> str:
    lines = []
    lines.append("=" * 60)
    lines.append("复核差异 (重复导入/补录后)")
    lines.append("=" * 60)
    if baseline_dir is None:
        lines.append("未提供基线，仅做当前一致性自检。")
    lines.append(f"新增结论  : {len(result.added)}")
    lines.append(f"消失结论  : {len(result.removed)}（已解决或材料移除）")
    lines.append(f"变更结论  : {len(result.changed)}")
    lines.append(f"重复结论键: {len(result.duplicate_conclusions)}")
    if result.duplicate_conclusions:
        lines.append("⚠ 发现同一逻辑键出现多条结论:")
        for k in result.duplicate_conclusions:
            lines.append(f"  - {k}")
    else:
        lines.append("✓ 同一逻辑键仅有一份结论（无重复/无两份结论）")
    if result.changed:
        lines.append("变更明细:")
        for c in result.changed[:10]:
            lines.append(f"  - {c.id}: {c.before_status}/{c.before_conclusion} -> {c.after_status}/{c.after_conclusion}")
    lines.append(f"判定: {result.verdict}")
    lines.append("=" * 60)
    return "\n".join(lines)
