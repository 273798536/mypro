from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from prompt_impact.models import Finding, HistoryEntry, Material, SourceRef

STATE_DIR = ".state"
STORE_FILE = "store.json"
HISTORY_FILE = "history.jsonl"
SCHEMA_VERSION = 1


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _merge_evidence(existing: List[SourceRef], incoming: List[SourceRef]) -> List[SourceRef]:
    by_key: List[SourceRef] = []
    seen = set()
    for ref in list(existing) + list(incoming):
        sig = (ref.path, ref.line_start, ref.line_end, ref.material_key)
        if sig in seen:
            continue
        seen.add(sig)
        by_key.append(ref)
    by_key.sort(key=lambda r: (r.path, r.line_start or 0, r.line_end or 0))
    return by_key


@dataclass
class Store:
    output_dir: Path
    last_run_id: str = ""
    materials: Dict[str, Material] = field(default_factory=dict)
    findings: Dict[str, Finding] = field(default_factory=dict)
    history: List[HistoryEntry] = field(default_factory=list)

    @property
    def state_dir(self) -> Path:
        return self.output_dir / STATE_DIR

    @property
    def store_path(self) -> Path:
        return self.state_dir / STORE_FILE

    @property
    def history_path(self) -> Path:
        return self.state_dir / HISTORY_FILE

    @classmethod
    def load(cls, output_dir: Path) -> "Store":
        store = cls(output_dir=output_dir)
        if store.store_path.exists():
            try:
                raw = json.loads(store.store_path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                return store
            store.last_run_id = raw.get("last_run_id", "")
            for k, v in raw.get("materials", {}).items():
                store.materials[k] = Material.from_dict(v)
            for k, v in raw.get("findings", {}).items():
                store.findings[k] = Finding.from_dict(v)
        if store.history_path.exists():
            for line in store.history_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                store.history.append(
                    HistoryEntry(
                        run_id=obj.get("run_id", ""),
                        at=obj.get("at", ""),
                        action=obj.get("action", ""),
                        finding_id=obj.get("finding_id", ""),
                        before=obj.get("before"),
                        after=obj.get("after"),
                        note=obj.get("note", ""),
                    )
                )
        return store

    def upsert_material(self, material: Material) -> Tuple[bool, bool]:
        existing = self.materials.get(material.material_key)
        if existing is None:
            self.materials[material.material_key] = material
            return True, True
        if material.fingerprint not in existing.versions:
            existing.versions.append(material.fingerprint)
        if existing.fingerprint != material.fingerprint:
            existing.fingerprint = material.fingerprint
            existing.ingested_at = material.ingested_at
            return True, True
        existing.ingested_at = material.ingested_at
        return False, False

    def _record(self, entry: HistoryEntry) -> None:
        self.history.append(entry)
        self.state_dir.mkdir(parents=True, exist_ok=True)
        with open(self.history_path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry.to_dict(), ensure_ascii=False) + "\n")

    def upsert_finding(self, finding: Finding, run_id: str, now: str) -> Tuple[str, Optional[HistoryEntry]]:
        existing = self.findings.get(finding.id)
        if existing is None:
            finding.first_seen_run = run_id
            finding.last_updated_run = run_id
            finding.last_run_id = run_id
            self.findings[finding.id] = finding
            return "new", None

        merged = _merge_evidence(existing.evidence, finding.evidence)
        evidence_changed = len(merged) != len(existing.evidence)
        status_changed = existing.status != finding.status
        conclusion_changed = (existing.conclusion or "") != (finding.conclusion or "")
        reopened = existing.resolved and not finding.resolved

        updated = Finding(
            id=existing.id,
            kind=finding.kind,
            status=finding.status if (status_changed or reopened) else existing.status,
            severity=finding.severity if (status_changed or reopened) else existing.severity,
            prompt_version=finding.prompt_version or existing.prompt_version,
            eval_run_id=finding.eval_run_id or existing.eval_run_id,
            sample_key=finding.sample_key or existing.sample_key,
            summary=finding.summary or existing.summary,
            conclusion=finding.conclusion if (conclusion_changed or reopened) else existing.conclusion,
            evidence=merged,
            first_seen_run=existing.first_seen_run,
            last_updated_run=run_id if (status_changed or conclusion_changed or evidence_changed or reopened) else existing.last_updated_run,
            last_run_id=run_id,
            resolved=False if reopened else existing.resolved,
        )

        entry: Optional[HistoryEntry] = None
        if reopened:
            entry = HistoryEntry(
                run_id=run_id, at=now, action="reopened", finding_id=finding.id,
                before=f"{existing.status}/resolved", after=finding.status,
                note="来源材料重新出现，结论重新打开（未新增重复记录）",
            )
        elif status_changed or conclusion_changed:
            entry = HistoryEntry(
                run_id=run_id, at=now, action="status_change", finding_id=finding.id,
                before=existing.status, after=finding.status,
                note="结论更新（已合并为新证据，未产生第二份结论）",
            )
        elif evidence_changed:
            entry = HistoryEntry(
                run_id=run_id, at=now, action="evidence_added", finding_id=finding.id,
                note="补录/重复导入后证据合并（结论不变）",
            )

        self.findings[finding.id] = updated
        if entry is not None:
            self._record(entry)
        action = "new" if False else (
            "reopened" if reopened else
            ("updated" if (status_changed or conclusion_changed or evidence_changed) else "unchanged")
        )
        return action, entry

    def resolve_orphans(self, touched_ids: set, run_id: str, now: str) -> List[str]:
        resolved_ids: List[str] = []
        current_material_keys = set(self.materials.keys())
        for fid, finding in list(self.findings.items()):
            if fid in touched_ids or finding.resolved:
                continue
            evidence_keys = {e.material_key for e in finding.evidence if e.material_key}
            orphan_sources = evidence_keys and not (evidence_keys & current_material_keys)
            if not evidence_keys or orphan_sources:
                finding.resolved = True
                finding.status = "resolved"
                finding.last_run_id = run_id
                resolved_ids.append(fid)
                self._record(HistoryEntry(
                    run_id=run_id, at=now, action="resolved", finding_id=fid,
                    before=finding.status, after="resolved",
                    note="来源材料缺失或变更，该结论标记为已解决（保留记录可追溯）",
                ))
        return resolved_ids

    def save(self, run_id: str) -> None:
        self.last_run_id = run_id
        self.state_dir.mkdir(parents=True, exist_ok=True)
        payload = {
            "schema_version": SCHEMA_VERSION,
            "last_run_id": run_id,
            "materials": {k: v.to_dict() for k, v in self.materials.items()},
            "findings": {k: v.to_dict() for k, v in self.findings.items()},
        }
        tmp = self.store_path.with_suffix(".tmp")
        tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(self.store_path)

    def findings_list(self) -> List[Finding]:
        return list(self.findings.values())
