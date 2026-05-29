from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import Any

from .models import AuditFinding, FindingSeverity, FindingStatus, Source


def _findings_to_fingerprint(f: AuditFinding) -> str:
    """生成发现的稳定指纹，用于状态匹配。"""
    return f"{f.rule_id}:{f.description[:100]}"


def _source_to_dict(s: Source) -> dict[str, Any]:
    return {"file": s.file, "sheet": s.sheet, "line_no": s.line_no}


def _dict_to_source(d: dict[str, Any]) -> Source:
    return Source(file=d["file"], sheet=d.get("sheet", ""), line_no=d.get("line_no", 0))


class StateStore:
    """保存和加载发现的复核状态。"""

    def __init__(self, state_file: str | Path):
        self.state_file = Path(state_file)

    def save(
        self,
        findings: list[AuditFinding],
        meta: dict[str, Any] | None = None,
    ):
        """保存发现的状态到 JSON 文件。"""
        data = {
            "meta": meta or {"version": 1},
            "findings": [
                {
                    "fingerprint": _findings_to_fingerprint(f),
                    "rule_id": f.rule_id,
                    "rule_name": f.rule_name,
                    "severity": f.severity.value,
                    "description": f.description,
                    "status": f.status.value,
                    "correction_note": f.correction_note,
                    "sources": [_source_to_dict(s) for s in f.sources],
                    "data_refs": f.data_refs,
                }
                for f in findings
            ],
        }
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        self.state_file.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def load(self) -> dict[str, dict[str, Any]]:
        """加载已保存的状态，返回 {指纹: 状态数据} 映射。"""
        if not self.state_file.exists():
            return {}

        data = json.loads(self.state_file.read_text(encoding="utf-8"))
        state_map: dict[str, dict[str, Any]] = {}
        for item in data.get("findings", []):
            fp = item.get("fingerprint")
            if fp:
                state_map[fp] = item
        return state_map

    def apply_saved_state(self, findings: list[AuditFinding]) -> list[AuditFinding]:
        """将已保存的状态应用到新的发现列表。"""
        state_map = self.load()
        for f in findings:
            fp = _findings_to_fingerprint(f)
            saved = state_map.get(fp)
            if saved:
                status_str = saved.get("status")
                if status_str:
                    for s in FindingStatus:
                        if s.value == status_str:
                            f.status = s
                            break
                note = saved.get("correction_note", "")
                if note:
                    f.correction_note = note
        return findings
