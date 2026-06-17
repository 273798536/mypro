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
    try:
        print("[1/6] 加载实验记录 ...")
        exp_data = load_json(experiment_path)
        if not isinstance(exp_data, list):
            raise ValueError(f"实验记录格式错误：应为列表，实际为 {type(exp_data).__name__}")
        if len(exp_data) == 0:
            raise ValueError("实验记录为空")

        rooms: list[RoomData] = []
        for i, rec in enumerate(exp_data):
            if "room_id" not in rec:
                raise ValueError(f"第 {i} 条记录缺少 room_id 字段")
            rec.setdefault("row_index", i)
            try:
                room = build_room_from_record(rec, Path(experiment_path).name)
                rooms.append(room)
            except Exception as e:
                raise ValueError(f"第 {i} 条记录解析失败: {e}") from e
        print(f"      加载 {len(rooms)} 条房间记录")

        conflicts = []

        if late_attachment_path:
            print("[2/6] 合并晚到附件 ...")
            att_data = load_json(late_attachment_path)
            if not isinstance(att_data, list):
                raise ValueError(f"晚到附件格式错误：应为列表，实际为 {type(att_data).__name__}")
            att_conflicts = merge_late_attachment(rooms, att_data, Path(late_attachment_path).name)
            conflicts.extend(att_conflicts)
            print(f"      合并完成，发现 {len(att_conflicts)} 处冲突")
        else:
            print("[2/6] 无晚到附件，跳过")

        if oral_notes_path:
            print("[3/6] 合并口头说明 ...")
            notes_data = load_json(oral_notes_path)
            if not isinstance(notes_data, list):
                raise ValueError(f"口头说明格式错误：应为列表，实际为 {type(notes_data).__name__}")
            note_conflicts = merge_oral_notes(rooms, notes_data, Path(oral_notes_path).name)
            conflicts.extend(note_conflicts)
            print(f"      合并完成，发现 {len(note_conflicts)} 处修正")
        else:
            print("[3/6] 无口头说明，跳过")

        print("[4/6] 验证数据 & 隔离坏数据 ...")
        bad_refs, sampling_gaps = validate_all(rooms)
        bad_room_count = sum(1 for r in rooms if r.quality == DataQuality.BAD)
        print(f"      坏数据房间 {bad_room_count} 个，坏数据条目 {len(bad_refs)} 条，采样缺口 {len(sampling_gaps)} 处")

        print("[5/6] 误差归因计算 ...")
        attributed_errors: list[AttributedError] = []
        skip_count = 0
        for room in rooms:
            if room.quality == DataQuality.BAD:
                skip_count += 1
                print(f"      [跳过] 房间 {room.room_id} 标记为坏数据: {room.quality_reason}")
                continue
            total_a = room.total_absorption
            if total_a <= 0:
                skip_count += 1
                print(f"      [跳过] 房间 {room.room_id} 有效总吸声量为零")
                continue
            try:
                ae = attribute_error(room)
                attributed_errors.append(ae)
            except Exception as e:
                skip_count += 1
                print(f"      [错误] 房间 {room.room_id} 归因计算失败: {e}")
        print(f"      完成 {len(attributed_errors)} 条归因，跳过 {skip_count} 间")

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

        print(f"\n✓ 处理完成：{len(result.rooms)} 房间 / {len(result.attributed_errors)} 归因 / "
              f"{len(result.conflicts)} 冲突 / {len(result.sampling_gaps)} 缺口 / "
              f"{len(result.bad_data_refs)} 坏数据")

        return result

    except Exception as e:
        print(f"\n✗ 处理失败: {e}")
        raise
