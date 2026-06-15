from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models import (
    PianoSchedule, StageChannel, Repertoire, ConflictRecord,
    ConflictType, ConflictStatus
)


def time_to_seconds(t) -> int:
    return t.hour * 3600 + t.minute * 60 + t.second


def timecode_to_seconds(timecode: str) -> Optional[int]:
    if not timecode:
        return None
    parts = timecode.split(":")
    if len(parts) < 3:
        return None
    try:
        h = int(parts[0])
        m = int(parts[1])
        s = int(parts[2])
        f = int(parts[3]) if len(parts) > 3 else 0
        return h * 3600 + m * 60 + s + f // 25
    except (ValueError, IndexError):
        return None


def compute_stage_channel_seconds(channel: StageChannel) -> Tuple[Optional[int], Optional[int]]:
    start = timecode_to_seconds(channel.start_timecode)
    end = timecode_to_seconds(channel.end_timecode)
    return start, end


def detect_room_time_overlap(db: Session, filter_criteria: Dict[str, Any]) -> List[ConflictRecord]:
    conflicts = []
    schedules = db.query(PianoSchedule).filter(
        PianoSchedule.is_withdrawn == False
    ).all()

    schedules.sort(key=lambda s: (s.schedule_date, s.piano_room_id, s.start_time))

    for i in range(len(schedules)):
        s1 = schedules[i]
        for j in range(i + 1, len(schedules)):
            s2 = schedules[j]
            if s1.schedule_date != s2.schedule_date:
                break
            if s1.piano_room_id != s2.piano_room_id:
                continue
            s1_start = time_to_seconds(s1.start_time)
            s1_end = time_to_seconds(s1.end_time)
            s2_start = time_to_seconds(s2.start_time)
            s2_end = time_to_seconds(s2.end_time)
            if s1_start < s2_end and s2_start < s1_end:
                overlap_min = (min(s1_end, s2_end) - max(s1_start, s2_start)) // 60
                desc = (
                    f"琴房{s1.piano_room_id}在{s1.schedule_date}存在时间冲突："
                    f"{s1.start_time.strftime('%H:%M')}-{s1.end_time.strftime('%H:%M')} "
                    f"({s1.performer or '未安排'}) 与 "
                    f"{s2.start_time.strftime('%H:%M')}-{s2.end_time.strftime('%H:%M')} "
                    f"({s2.performer or '未安排'}) 重叠{overlap_min}分钟"
                )
                conflicts.append(ConflictRecord(
                    conflict_type=ConflictType.ROOM_TIME_OVERLAP,
                    schedule_id=s1.id,
                    related_schedule_id=s2.id,
                    description=desc,
                    status=ConflictStatus.PENDING,
                    filter_criteria=filter_criteria,
                ))
    return conflicts


def detect_file_repertoire_mismatch(db: Session, filter_criteria: Dict[str, Any]) -> List[ConflictRecord]:
    conflicts = []
    channels = db.query(StageChannel).filter(
        StageChannel.is_active == True
    ).all()

    for channel in channels:
        if not channel.repertoire_id:
            continue
        repertoire = db.query(Repertoire).filter(Repertoire.id == channel.repertoire_id).first()
        if not repertoire:
            continue
        file_name_clean = channel.file_name.lower().replace("_", " ").replace("-", " ")
        rep_name_clean = repertoire.name.lower().replace("_", " ").replace("-", " ")
        if rep_name_clean not in file_name_clean and file_name_clean not in rep_name_clean:
            matched_schedules = db.query(PianoSchedule).filter(
                PianoSchedule.stage_channel_id == channel.id,
                PianoSchedule.is_withdrawn == False
            ).all()
            for sched in matched_schedules:
                desc = (
                    f"文件名与曲目表不匹配：文件名「{channel.file_name}」与关联曲目「{repertoire.name}」对不上。"
                    f"舞台通道表原始行号：第{channel.source_row}行"
                )
                conflicts.append(ConflictRecord(
                    conflict_type=ConflictType.FILE_REPERTOIRE_MISMATCH,
                    schedule_id=sched.id,
                    stage_channel_id=channel.id,
                    description=desc,
                    raw_source=channel.raw_description or f"文件:{channel.file_name}, 曲目ID:{channel.repertoire_id}",
                    status=ConflictStatus.PENDING,
                    filter_criteria=filter_criteria,
                ))
    return conflicts


TIMECODE_DEVIATION_THRESHOLD = 2


def detect_timecode_deviation(db: Session, filter_criteria: Dict[str, Any]) -> List[ConflictRecord]:
    conflicts = []
    schedules = db.query(PianoSchedule).filter(
        PianoSchedule.is_withdrawn == False,
        PianoSchedule.stage_channel_id.isnot(None)
    ).all()

    for sched in schedules:
        channel = db.query(StageChannel).filter(StageChannel.id == sched.stage_channel_id).first()
        if not channel:
            continue
        if not channel.start_timecode or not channel.end_timecode:
            continue
        ch_start, ch_end = compute_stage_channel_seconds(channel)
        if ch_start is None or ch_end is None:
            continue
        sched_start = time_to_seconds(sched.start_time)
        sched_end = time_to_seconds(sched.end_time)
        deviation_start = abs(sched_start - ch_start)
        deviation_end = abs(sched_end - ch_end)
        max_deviation = max(deviation_start, deviation_end)
        if max_deviation >= TIMECODE_DEVIATION_THRESHOLD:
            desc = (
                f"时码偏差检测：排期{sched.start_time.strftime('%H:%M:%S')}-"
                f"{sched.end_time.strftime('%H:%M:%S')} 与舞台通道表时码"
                f"({channel.start_timecode}-{channel.end_timecode}) "
                f"偏差{max_deviation}秒（超过{TIMECODE_DEVIATION_THRESHOLD}秒阈值）"
            )
            raw_src = (
                f"舞台通道表原始描述：{channel.raw_description} | "
                f"原始时码：{channel.start_timecode}-{channel.end_timecode} | "
                f"原始行号：第{channel.source_row}行"
            )
            conflicts.append(ConflictRecord(
                conflict_type=ConflictType.TIMECODE_DEVIATION,
                schedule_id=sched.id,
                stage_channel_id=channel.id,
                description=desc,
                raw_source=raw_src,
                timecode_deviation_seconds=max_deviation,
                status=ConflictStatus.PENDING,
                filter_criteria=filter_criteria,
            ))
    return conflicts


def detect_performer_overlap(db: Session, filter_criteria: Dict[str, Any]) -> List[ConflictRecord]:
    conflicts = []
    schedules = db.query(PianoSchedule).filter(
        PianoSchedule.is_withdrawn == False,
        PianoSchedule.performer.isnot(None)
    ).all()

    schedules.sort(key=lambda s: (s.schedule_date, s.performer, s.start_time))

    for i in range(len(schedules)):
        s1 = schedules[i]
        for j in range(i + 1, len(schedules)):
            s2 = schedules[j]
            if s1.schedule_date != s2.schedule_date:
                break
            if s1.performer != s2.performer:
                continue
            s1_start = time_to_seconds(s1.start_time)
            s1_end = time_to_seconds(s1.end_time)
            s2_start = time_to_seconds(s2.start_time)
            s2_end = time_to_seconds(s2.end_time)
            if s1_start < s2_end and s2_start < s1_end:
                overlap_min = (min(s1_end, s2_end) - max(s1_start, s2_start)) // 60
                desc = (
                    f"演奏者{s1.performer}在{s1.schedule_date}存在排期冲突："
                    f"琴房{s1.piano_room_id} {s1.start_time.strftime('%H:%M')}-{s1.end_time.strftime('%H:%M')} 与 "
                    f"琴房{s2.piano_room_id} {s2.start_time.strftime('%H:%M')}-{s2.end_time.strftime('%H:%M')} "
                    f"重叠{overlap_min}分钟"
                )
                conflicts.append(ConflictRecord(
                    conflict_type=ConflictType.PERFORMER_OVERLAP,
                    schedule_id=s1.id,
                    related_schedule_id=s2.id,
                    description=desc,
                    status=ConflictStatus.PENDING,
                    filter_criteria=filter_criteria,
                ))
    return conflicts


def run_all_detections(db: Session, filter_criteria: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if filter_criteria is None:
        filter_criteria = {"source": "system_auto_run", "timestamp": datetime.now().isoformat()}

    db.query(ConflictRecord).filter(
        ConflictRecord.status == ConflictStatus.PENDING
    ).delete()
    db.commit()

    all_conflicts = []
    all_conflicts.extend(detect_room_time_overlap(db, filter_criteria))
    all_conflicts.extend(detect_file_repertoire_mismatch(db, filter_criteria))
    all_conflicts.extend(detect_timecode_deviation(db, filter_criteria))
    all_conflicts.extend(detect_performer_overlap(db, filter_criteria))

    db.add_all(all_conflicts)
    db.commit()

    by_type = {}
    for c in all_conflicts:
        by_type[c.conflict_type] = by_type.get(c.conflict_type, 0) + 1

    return {
        "total_conflicts": len(all_conflicts),
        "new_conflicts": len(all_conflicts),
        "by_type": by_type,
        "filter_criteria": filter_criteria,
    }
