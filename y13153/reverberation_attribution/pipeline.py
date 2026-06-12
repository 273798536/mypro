from __future__ import annotations

from pathlib import Path

from .formulas import attribute_error
from .models import AttributedError, DataQuality, PipelineResult, RoomData
from .provenance import (
    build_room_from_record,
    detect_provenance_changes,
    load_json,
    merge_late_attachment,
    merge_oral_notes,
)
from .validators import validate_all


def run_pipeline(
    experiment_path: str,
    late_attachment_path: str | None = None,
    oral_notes_path: str | None = None,
) -> PipelineResult:
    print("[1/6] 加载实验记录 ...")
    exp_data = load_json(experiment_path)
    rooms: list[RoomData] = []
    for i, rec in enumerate(exp_data):
        rec.setdefault("row_index", i)
        room = build_room_from_record(rec, Path(experiment_path).name)
        rooms.append(room)
    print(f"      加载 {len(rooms)} 条房间记录")

    conflicts = []

    if late_attachment_path:
        print("[2/6] 合并晚到附件 ...")
        att_data = load_json(late_attachment_path)
        att_conflicts = merge_late_attachment(rooms, att_data, Path(late_attachment_path).name)
        conflicts.extend(att_conflicts)
        print(f"      合并完成，发现 {len(att_conflicts)} 处冲突")
    else:
        print("[2/6] 无晚到附件，跳过")

    if oral_notes_path:
        print("[3/6] 合并口头说明 ...")
        notes_data = load_json(oral_notes_path)
        note_conflicts = merge_oral_notes(rooms, notes_data, Path(oral_notes_path).name)
        conflicts.extend(note_conflicts)
        print(f"      合并完成，发现 {len(note_conflicts)} 处修正")
    else:
        print("[3/6] 无口头说明，跳过")

    print("[4/6] 验证数据 & 隔离坏数据 ...")
    bad_refs, sampling_gaps = validate_all(rooms)
    print(f"      坏数据 {len(bad_refs)} 条，采样缺口 {len(sampling_gaps)} 处")

    print("[5/6] 误差归因计算 ...")
    attributed_errors: list[AttributedError] = []
    for room in rooms:
        if room.quality == DataQuality.BAD:
            print(f"      房间 {room.room_id} 标记为坏数据，跳过归因")
            continue
        total_a = room.total_absorption
        if total_a <= 0:
            print(f"      房间 {room.room_id} 有效总吸声量为零，跳过归因")
            continue
        ae = attribute_error(room)
        attributed_errors.append(ae)
    print(f"      完成 {len(attributed_errors)} 条归因")

    print("[6/6] 溯源变更检测 ...")
    provenance_changes = detect_provenance_changes(rooms)
    if provenance_changes:
        print(f"      检测到 {len(provenance_changes)} 处口径变更")
        for pc in provenance_changes:
            print(f"        - {pc['note']}")
    else:
        print("      无口径变更")

    result = PipelineResult(
        rooms=rooms,
        attributed_errors=attributed_errors,
        conflicts=conflicts,
        sampling_gaps=sampling_gaps,
        bad_data_refs=bad_refs,
    )

    return result
