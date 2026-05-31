from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional

from .models import MIDIFragment, Measure, Motif, Note, AuditEntry
from .audit import AuditLog


class MotifImporter:
    def __init__(self, audit_log: AuditLog) -> None:
        self.audit_log = audit_log
        self.fragments: list[MIDIFragment] = []
        self.motifs: list[Motif] = []
        self.measures: list[Measure] = []
        self._pending_measures: list[dict[str, Any]] = []

    def import_fragment(self, data: dict[str, Any], source_file: str = "") -> MIDIFragment:
        notes = []
        for nd in data.get("notes", []):
            notes.append(Note(
                pitch=nd["pitch"],
                onset=nd["onset"],
                duration=nd["duration"],
                velocity=nd.get("velocity", 80),
            ))

        fragment = MIDIFragment(
            id=data.get("id", f"frag_{len(self.fragments)}"),
            source_file=source_file,
            notes=notes,
            remarks=data.get("remarks", []),
            measure_offset=data.get("measure_offset"),
        )

        self.fragments.append(fragment)
        self.audit_log.log(
            action="import_fragment",
            target_type="MIDIFragment",
            target_id=fragment.id,
            after={"note_count": len(notes), "remarks": fragment.remarks},
            detail=f"从 {source_file} 导入片段，含 {len(notes)} 个音符、{len(fragment.remarks)} 条备注",
        )

        if "motif" in data:
            motif_data = data["motif"]
            motif = fragment.to_motif(
                motif_id=motif_data.get("id", f"motif_from_{fragment.id}"),
                name=motif_data.get("name", ""),
                tags=motif_data.get("tags"),
                metadata=motif_data.get("metadata"),
            )
            self.motifs.append(motif)
            self.audit_log.log(
                action="extract_motif",
                target_type="Motif",
                target_id=motif.id,
                after={"missing_fields": motif.missing_fields},
                detail=f"从片段 {fragment.id} 提取动机，缺失字段: {motif.missing_fields or '无'}",
            )

        return fragment

    def import_measures(self, data: dict[str, Any], source_file: str = "", arrived_late: bool = False) -> list[Measure]:
        measures: list[Measure] = []
        for md in data.get("measures", []):
            measure = Measure(
                index=md["index"],
                start_beat=md["start_beat"],
                end_beat=md["end_beat"],
                time_signature=md.get("time_signature", "4/4"),
                arrived_late=arrived_late,
            )
            measures.append(measure)

        self.measures.extend(measures)
        self.audit_log.log(
            action="import_measures",
            target_type="Measure",
            target_id=f"batch_{len(measures)}",
            after={"count": len(measures), "arrived_late": arrived_late},
            detail=f"从 {source_file} 导入 {len(measures)} 个小节，晚到: {'是' if arrived_late else '否'}",
        )
        return measures

    def apply_late_measures(self, measures_data: dict[str, Any], source_file: str = "") -> list[Measure]:
        return self.import_measures(measures_data, source_file=source_file, arrived_late=True)

    def load_json(self, path: str) -> dict[str, Any]:
        p = Path(path)
        if not p.exists():
            raise FileNotFoundError(f"样例文件不存在: {path}")
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)

    def import_from_file(self, path: str) -> list[MIDIFragment | Measure]:
        data = self.load_json(path)
        source = Path(path).name
        results: list[MIDIFragment | Measure] = []

        if "fragments" in data:
            for frag_data in data["fragments"]:
                frag = self.import_fragment(frag_data, source_file=source)
                results.append(frag)
        elif "notes" in data:
            frag = self.import_fragment(data, source_file=source)
            results.append(frag)

        if "measures" in data:
            late = data.get("arrived_late", False)
            ms = self.import_measures(data, source_file=source, arrived_late=late)
            results.extend(ms)

        return results

    def fill_missing_motif_field(self, motif_id: str, field_name: str, value: Any, operator: str = "manual") -> Motif:
        motif = self._find_motif(motif_id)
        if motif is None:
            raise ValueError(f"动机不存在: {motif_id}")

        before = getattr(motif, field_name, None)
        setattr(motif, field_name, value)
        if field_name in motif.missing_fields:
            motif.missing_fields.remove(field_name)

        self.audit_log.log(
            action=f"fill_missing_field:{field_name}",
            target_type="Motif",
            target_id=motif_id,
            before=before,
            after=value,
            operator=operator,
            detail=f"人工补全动机 {motif_id} 的 {field_name} 字段",
        )
        return motif

    def apply_measure_offset(self, fragment_id: str, offset: int, operator: str = "manual") -> MIDIFragment:
        frag = self._find_fragment(fragment_id)
        if frag is None:
            raise ValueError(f"片段不存在: {fragment_id}")

        before = frag.measure_offset
        frag.measure_offset = offset

        self.audit_log.log(
            action="apply_measure_offset",
            target_type="MIDIFragment",
            target_id=fragment_id,
            before=before,
            after=offset,
            operator=operator,
            detail=f"人工设定片段 {fragment_id} 小节偏移为 {offset}",
        )
        return frag

    def _find_motif(self, motif_id: str) -> Optional[Motif]:
        for m in self.motifs:
            if m.id == motif_id:
                return m
        return None

    def _find_fragment(self, fragment_id: str) -> Optional[MIDIFragment]:
        for f in self.fragments:
            if f.id == fragment_id:
                return f
        return None
