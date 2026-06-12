from __future__ import annotations

import json
from typing import Any

from .models import (
    ConflictRecord,
    MaterialSource,
    ProvenanceEntry,
    RoomData,
    SurfaceData,
)


def load_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_room_from_record(record: dict, source_file: str) -> RoomData:
    provenance = ProvenanceEntry(
        source=MaterialSource.EXPERIMENT_RECORD,
        source_file=source_file,
        row_index=record.get("row_index"),
        timestamp=record.get("timestamp"),
    )
    raw_data = {k: v for k, v in record.items() if k != "row_index"}
    provenance.update_version(raw_data)

    surfaces: list[SurfaceData] = []
    for i, surf in enumerate(record.get("surfaces", [])):
        sp = ProvenanceEntry(
            source=MaterialSource.EXPERIMENT_RECORD,
            source_file=source_file,
            row_index=record.get("row_index"),
            timestamp=record.get("timestamp"),
        )
        sp.update_version(surf)
        surfaces.append(SurfaceData(
            material_name=surf["material_name"],
            area_m2=surf["area_m2"],
            absorption_coeff=surf["absorption_coeff"],
            provenance=sp,
            original_row=record.get("row_index"),
        ))

    return RoomData(
        room_id=record["room_id"],
        volume_m3=record["volume_m3"],
        measured_t60_s=record["measured_t60_s"],
        surfaces=surfaces,
        provenance=provenance,
        original_row=record.get("row_index"),
        frequency_hz=record.get("frequency_hz"),
    )


def merge_late_attachment(rooms: list[RoomData], attachment_data: list[dict], source_file: str) -> list[ConflictRecord]:
    conflicts: list[ConflictRecord] = []
    room_map = {r.room_id: r for r in rooms}

    for i, att in enumerate(attachment_data):
        room_id = att["room_id"]
        if room_id not in room_map:
            provenance = ProvenanceEntry(
                source=MaterialSource.LATE_ATTACHMENT,
                source_file=source_file,
                row_index=i,
                timestamp=att.get("timestamp"),
            )
            provenance.update_version(att)
            surfaces: list[SurfaceData] = []
            for surf in att.get("surfaces", []):
                sp = ProvenanceEntry(
                    source=MaterialSource.LATE_ATTACHMENT,
                    source_file=source_file,
                    row_index=i,
                )
                sp.update_version(surf)
                surfaces.append(SurfaceData(
                    material_name=surf["material_name"],
                    area_m2=surf["area_m2"],
                    absorption_coeff=surf["absorption_coeff"],
                    provenance=sp,
                    original_row=i,
                ))
            rooms.append(RoomData(
                room_id=room_id,
                volume_m3=att["volume_m3"],
                measured_t60_s=att.get("measured_t60_s", 0.0),
                surfaces=surfaces,
                provenance=provenance,
                original_row=i,
                frequency_hz=att.get("frequency_hz"),
            ))
            continue

        existing = room_map[room_id]

        if "volume_m3" in att and att["volume_m3"] != existing.volume_m3:
            conflicts.append(ConflictRecord(
                room_id=room_id,
                field_name="volume_m3",
                value_a=existing.volume_m3,
                value_b=att["volume_m3"],
                source_a=existing.provenance.source.value,
                source_b=MaterialSource.LATE_ATTACHMENT.value,
                source_a_version=existing.provenance.version,
                source_b_version=1,
                resolution="保留实验记录原始值，附件值标记为备选",
            ))

        if "measured_t60_s" in att and att.get("measured_t60_s") != existing.measured_t60_s:
            conflicts.append(ConflictRecord(
                room_id=room_id,
                field_name="measured_t60_s",
                value_a=existing.measured_t60_s,
                value_b=att["measured_t60_s"],
                source_a=existing.provenance.source.value,
                source_b=MaterialSource.LATE_ATTACHMENT.value,
                source_a_version=existing.provenance.version,
                source_b_version=1,
                resolution="保留实验记录原始值，附件值标记为备选",
            ))

        for surf in att.get("surfaces", []):
            mat_name = surf["material_name"]
            found = False
            for es in existing.surfaces:
                if es.material_name == mat_name:
                    found = True
                    if surf.get("absorption_coeff") != es.absorption_coeff:
                        conflicts.append(ConflictRecord(
                            room_id=room_id,
                            field_name=f"surfaces.{mat_name}.absorption_coeff",
                            value_a=es.absorption_coeff,
                            value_b=surf["absorption_coeff"],
                            source_a=es.provenance.source.value,
                            source_b=MaterialSource.LATE_ATTACHMENT.value,
                            source_a_version=es.provenance.version,
                            source_b_version=1,
                            resolution="保留实验记录原始值，附件值标记为备选",
                        ))
                    if surf.get("area_m2") != es.area_m2:
                        conflicts.append(ConflictRecord(
                            room_id=room_id,
                            field_name=f"surfaces.{mat_name}.area_m2",
                            value_a=es.area_m2,
                            value_b=surf["area_m2"],
                            source_a=es.provenance.source.value,
                            source_b=MaterialSource.LATE_ATTACHMENT.value,
                            source_a_version=es.provenance.version,
                            source_b_version=1,
                            resolution="保留实验记录原始值，附件值标记为备选",
                        ))
                    break
            if not found:
                sp = ProvenanceEntry(
                    source=MaterialSource.LATE_ATTACHMENT,
                    source_file=source_file,
                    row_index=i,
                )
                sp.update_version(surf)
                existing.surfaces.append(SurfaceData(
                    material_name=surf["material_name"],
                    area_m2=surf["area_m2"],
                    absorption_coeff=surf["absorption_coeff"],
                    provenance=sp,
                    original_row=i,
                ))

    return conflicts


def merge_oral_notes(rooms: list[RoomData], notes_data: list[dict], source_file: str) -> list[ConflictRecord]:
    conflicts: list[ConflictRecord] = []
    room_map = {r.room_id: r for r in rooms}

    for i, note in enumerate(notes_data):
        room_id = note["room_id"]
        if room_id not in room_map:
            continue

        existing = room_map[room_id]

        if "override_volume_m3" in note:
            conflicts.append(ConflictRecord(
                room_id=room_id,
                field_name="volume_m3",
                value_a=existing.volume_m3,
                value_b=note["override_volume_m3"],
                source_a=existing.provenance.source.value,
                source_b=MaterialSource.ORAL_NOTE.value,
                source_a_version=existing.provenance.version,
                source_b_version=1,
                resolution="口头说明优先：采用口头修正值",
            ))
            existing.volume_m3 = note["override_volume_m3"]
            existing.provenance.source = MaterialSource.ORAL_NOTE
            existing.provenance.source_file = source_file
            existing.provenance.version += 1

        if "override_t60_s" in note:
            conflicts.append(ConflictRecord(
                room_id=room_id,
                field_name="measured_t60_s",
                value_a=existing.measured_t60_s,
                value_b=note["override_t60_s"],
                source_a=existing.provenance.source.value,
                source_b=MaterialSource.ORAL_NOTE.value,
                source_a_version=existing.provenance.version,
                source_b_version=1,
                resolution="口头说明优先：采用口头修正值",
            ))
            existing.measured_t60_s = note["override_t60_s"]

        for surf_note in note.get("surface_corrections", []):
            mat_name = surf_note["material_name"]
            for es in existing.surfaces:
                if es.material_name == mat_name:
                    if "absorption_coeff" in surf_note and surf_note["absorption_coeff"] != es.absorption_coeff:
                        conflicts.append(ConflictRecord(
                            room_id=room_id,
                            field_name=f"surfaces.{mat_name}.absorption_coeff",
                            value_a=es.absorption_coeff,
                            value_b=surf_note["absorption_coeff"],
                            source_a=es.provenance.source.value,
                            source_b=MaterialSource.ORAL_NOTE.value,
                            source_a_version=es.provenance.version,
                            source_b_version=1,
                            resolution="口头说明优先：采用口头修正值",
                        ))
                        es.absorption_coeff = surf_note["absorption_coeff"]
                        es.provenance.source = MaterialSource.ORAL_NOTE
                        es.provenance.source_file = source_file
                        es.provenance.version += 1
                    break

    return conflicts


def detect_provenance_changes(rooms: list[RoomData]) -> list[dict]:
    changes: list[dict] = []
    for room in rooms:
        if room.provenance.version > 1:
            changes.append({
                "room_id": room.room_id,
                "field": "room_level",
                "current_source": room.provenance.source.value,
                "version": room.provenance.version,
                "note": f"房间 {room.room_id} 数据经过 {room.provenance.version} 次变更，当前来源: {room.provenance.source.value}",
            })
        for surf in room.surfaces:
            if surf.provenance.version > 1:
                changes.append({
                    "room_id": room.room_id,
                    "field": f"surfaces.{surf.material_name}",
                    "current_source": surf.provenance.source.value,
                    "version": surf.provenance.version,
                    "note": f"房间 {room.room_id} 表面 {surf.material_name} 经过 {surf.provenance.version} 次变更，当前来源: {surf.provenance.source.value}",
                })
    return changes
