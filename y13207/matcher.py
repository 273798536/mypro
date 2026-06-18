from models import (
    db, ChannelRow, TrackRow, TimecodeEntry, Note, MatchResult,
    STATUS_NORMAL, STATUS_WARNING, STATUS_MISMATCH, STATUS_OLD_VERSION,
    STATUS_VERBAL_NOTE, STATUS_AUTHORIZED, STATUS_PENDING,
)
from utils import format_timecode


HALF_BEAT_THRESHOLD = 0.5
NORMAL_THRESHOLD = 0.05
FUZZY_MATCH_THRESHOLD = 0.4
MIN_MATCH_SCORE = 0.3


def simple_name_match(name_a, name_b):
    if not name_a or not name_b:
        return 0.0
    a = name_a.strip().lower()
    b = name_b.strip().lower()
    if a == b:
        return 1.0
    if a in b or b in a:
        shorter = min(len(a), len(b))
        longer = max(len(a), len(b))
        if longer == 0:
            return 0.0
        ratio = shorter / longer
        if ratio > 0.8:
            return 0.9
        elif ratio > 0.5:
            return 0.7
        else:
            return ratio * 0.6
    common_chars = len(set(a) & set(b))
    total_chars = len(set(a) | set(b))
    if total_chars == 0:
        return 0.0
    return common_chars / total_chars * 0.4


def _name_match_score(name, channel_row):
    score = 0.0
    score += simple_name_match(name, channel_row.track_name) * 0.7
    score += simple_name_match(name, channel_row.channel_name) * 0.3
    return score


def find_best_track_match(track_name, track_rows):
    best_match = None
    best_score = 0.0
    for tr in track_rows:
        score = simple_name_match(track_name, tr.track_name)
        if score > best_score:
            best_score = score
            best_match = tr
    if best_score < MIN_MATCH_SCORE:
        return None, 0.0
    return best_match, best_score


def find_best_channel_match(entry_name, channel_ref, entry_tc_seconds, channel_rows):
    best_match = None
    best_score = 0.0

    for cr in channel_rows:
        if cr.is_old_version:
            continue

        name_score = 0.0
        if entry_name:
            name_score = _name_match_score(entry_name, cr)
        if channel_ref:
            ref_score = simple_name_match(channel_ref, cr.channel_name) * 0.5 + \
                        simple_name_match(channel_ref, cr.track_name) * 0.3
            name_score = max(name_score, ref_score)

        tc_score = 0.0
        has_entry_tc = entry_tc_seconds is not None and isinstance(entry_tc_seconds, (int, float))
        has_channel_tc = cr.timecode_seconds is not None and isinstance(cr.timecode_seconds, (int, float))
        if has_entry_tc and has_channel_tc:
            diff = abs(entry_tc_seconds - cr.timecode_seconds)
            if diff <= NORMAL_THRESHOLD:
                tc_score = 1.0
            elif diff <= HALF_BEAT_THRESHOLD:
                tc_score = 0.7
            elif diff <= 5:
                tc_score = 0.4
            elif diff <= 30:
                tc_score = 0.2
            else:
                tc_score = 0.0

        if name_score > 0 and tc_score > 0:
            total_score = name_score * 0.6 + tc_score * 0.4
        elif name_score > 0:
            total_score = name_score * 0.7
        elif tc_score > 0.5:
            total_score = tc_score * 0.5
        else:
            total_score = 0.0

        if total_score > best_score:
            best_score = total_score
            best_match = cr

    if best_score < MIN_MATCH_SCORE:
        return None, 0.0
    return best_match, best_score


def classify_time_diff(time_diff_seconds):
    abs_diff = abs(time_diff_seconds)
    if abs_diff <= NORMAL_THRESHOLD:
        return STATUS_NORMAL
    elif abs_diff <= HALF_BEAT_THRESHOLD:
        return STATUS_WARNING
    else:
        return STATUS_MISMATCH


def run_matching(session):
    channel_rows = ChannelRow.query.filter_by(session_id=session.id).all()
    track_rows = TrackRow.query.filter_by(session_id=session.id).all()
    timecode_entries = TimecodeEntry.query.filter_by(session_id=session.id).all()
    notes = Note.query.filter_by(session_id=session.id).all()

    MatchResult.query.filter_by(session_id=session.id).delete()
    db.session.commit()

    auth_notes = [n for n in notes if n.is_authorization]
    verbal_notes = [n for n in notes if not n.is_authorization]

    results = []
    unmatched_channels = [c for c in channel_rows if not c.is_old_version]
    unmatched_tracks = list(track_rows)

    old_channels = [c for c in channel_rows if c.is_old_version]

    for entry in timecode_entries:
        match_result = MatchResult(
            session_id=session.id,
            timecode_entry_id=entry.id,
            status=STATUS_PENDING,
        )

        channel_match, channel_score = find_best_channel_match(
            entry.entry_name, entry.channel_ref, entry.timecode_seconds, channel_rows
        )

        track_match = None
        track_score = 0.0
        track_names_to_check = []
        if channel_match and channel_match.track_name:
            track_names_to_check.append(channel_match.track_name)
        if entry.entry_name:
            track_names_to_check.append(entry.entry_name)

        for tn in track_names_to_check:
            tm, ts = find_best_track_match(tn, unmatched_tracks)
            if tm and ts > track_score:
                track_match = tm
                track_score = ts
                break

        if not track_match and track_names_to_check:
            for tn in track_names_to_check:
                tm, ts = find_best_track_match(tn, track_rows)
                if tm and ts > track_score:
                    track_match = tm
                    track_score = ts
                    break

        if channel_match:
            match_result.channel_row_id = channel_match.id
            time_diff = entry.timecode_seconds - channel_match.timecode_seconds
            match_result.time_diff_seconds = time_diff
            match_result.match_confidence = channel_score

            tc_status = classify_time_diff(time_diff)
            match_result.status = tc_status

            if channel_match.is_old_version:
                match_result.status = STATUS_OLD_VERSION
                match_result.conclusion = (
                    f'匹配到旧版舞台通道表记录「{channel_match.channel_name}」，'
                    f'时码差异 {format_timecode(time_diff)}，此数据来自旧版本，不计入正式结论'
                )
                match_result.sources = f'旧版通道表第{channel_match.source_row}行'
            else:
                if tc_status == STATUS_NORMAL:
                    match_result.conclusion = (
                        f'时码对齐正常：「{entry.entry_name}」与通道「{channel_match.channel_name}」'
                        f'时码差 {format_timecode(time_diff)}，在允许范围内'
                    )
                elif tc_status == STATUS_WARNING:
                    match_result.conclusion = (
                        f'⚠️ 时码偏差：「{entry.entry_name}」与通道「{channel_match.channel_name}」'
                        f'时码差 {format_timecode(time_diff)}，接近半拍偏移，需人工确认'
                    )
                else:
                    match_result.conclusion = (
                        f'❌ 时码不匹配：「{entry.entry_name}」与通道「{channel_match.channel_name}」'
                        f'时码差 {format_timecode(time_diff)}，超出正常范围'
                    )

                match_result.sources = (
                    f'通道表第{channel_match.source_row}行 | 时码清单第{entry.source_row}行'
                )

            if channel_match in unmatched_channels:
                unmatched_channels.remove(channel_match)

        else:
            match_result.status = STATUS_MISMATCH
            match_result.conclusion = (
                f'未找到匹配的通道记录：「{entry.entry_name}」'
            )
            match_result.sources = f'时码清单第{entry.source_row}行'

        if track_match:
            match_result.track_row_id = track_match.id
            if track_match in unmatched_tracks:
                unmatched_tracks.remove(track_match)

        results.append(match_result)

    for ch in unmatched_channels:
        if ch.is_old_version:
            continue
        mr = MatchResult(
            session_id=session.id,
            channel_row_id=ch.id,
            status=STATUS_MISMATCH,
            conclusion=f'通道「{ch.channel_name}」未在时码清单中找到对应记录',
            sources=f'通道表第{ch.source_row}行',
        )
        if ch.track_name:
            tm, ts = find_best_track_match(ch.track_name, unmatched_tracks)
            if tm and ts >= 0.5:
                mr.track_row_id = tm.id
                unmatched_tracks.remove(tm)
        results.append(mr)

    for tr in unmatched_tracks:
        mr = MatchResult(
            session_id=session.id,
            track_row_id=tr.id,
            status=STATUS_MISMATCH,
            conclusion=f'曲目「{tr.track_name}」未与任何时码记录关联',
            sources=f'曲目表第{tr.source_row}行',
        )
        results.append(mr)

    for ch in old_channels:
        if not any(r.channel_row_id == ch.id for r in results):
            mr = MatchResult(
                session_id=session.id,
                channel_row_id=ch.id,
                status=STATUS_OLD_VERSION,
                conclusion=f'旧版通道记录：「{ch.channel_name}」来自旧版表格，仅供参考',
                sources=f'旧版通道表第{ch.source_row}行',
            )
            results.append(mr)

    for note in verbal_notes:
        mr = MatchResult(
            session_id=session.id,
            status=STATUS_VERBAL_NOTE,
            conclusion=f'口头备注：{note.content[:100]}',
            sources=f'备注文件',
            notes=f'备注类型：{note.note_type}',
        )
        results.append(mr)

    db.session.add_all(results)
    db.session.commit()

    if auth_notes:
        apply_authorization(session, auth_notes)

    overall_status = calculate_overall_status(session)
    session.status = overall_status
    db.session.commit()

    return results


def apply_authorization(session, auth_notes):
    if not auth_notes:
        return

    results = MatchResult.query.filter_by(session_id=session.id).all()

    for auth_note in auth_notes:
        related_ids = []
        if auth_note.related_entries:
            try:
                related_ids = [int(x.strip()) for x in auth_note.related_entries.split(',') if x.strip()]
            except (ValueError, TypeError):
                pass

        auth_content_lower = auth_note.content.lower()

        for mr in results:
            if mr.status in (STATUS_AUTHORIZED, STATUS_VERBAL_NOTE):
                continue

            should_authorize = False

            if related_ids and mr.id in related_ids:
                should_authorize = True

            if mr.timecode_entry_id:
                entry = TimecodeEntry.query.get(mr.timecode_entry_id)
                if entry and entry.entry_name:
                    if entry.entry_name in auth_note.content or auth_note.content in entry.entry_name:
                        should_authorize = True

            if mr.channel_row_id:
                ch = ChannelRow.query.get(mr.channel_row_id)
                if ch and ch.channel_name:
                    if ch.channel_name in auth_note.content or auth_note.content in ch.channel_name:
                        should_authorize = True

            if mr.track_row_id:
                tr = TrackRow.query.get(mr.track_row_id)
                if tr and tr.track_name:
                    if tr.track_name in auth_note.content or auth_note.content in tr.track_name:
                        should_authorize = True

            if '全部' in auth_note.content or 'all' in auth_content_lower:
                if mr.status in (STATUS_WARNING, STATUS_MISMATCH):
                    should_authorize = True

            if should_authorize and mr.status in (STATUS_WARNING, STATUS_MISMATCH, STATUS_OLD_VERSION):
                original_status = mr.status
                mr.status = STATUS_AUTHORIZED
                original_conclusion = mr.conclusion
                mr.conclusion = (
                    f'✅ 已授权对齐：{original_conclusion}'
                    f'（授权备注：{auth_note.content[:50]}）'
                )
                if mr.notes:
                    mr.notes += f' | 原状态：{original_status}'
                else:
                    mr.notes = f'原状态：{original_status}'

    db.session.commit()


def calculate_overall_status(session):
    results = MatchResult.query.filter_by(session_id=session.id).all()
    if not results:
        return STATUS_PENDING

    has_error = False
    has_warning = False
    has_authorized = False

    for r in results:
        if r.status == STATUS_MISMATCH:
            has_error = True
        elif r.status == STATUS_WARNING:
            has_warning = True
        elif r.status == STATUS_AUTHORIZED:
            has_authorized = True

    if has_error:
        return STATUS_MISMATCH
    elif has_warning and not has_authorized:
        return STATUS_WARNING
    elif has_authorized:
        return STATUS_AUTHORIZED
    else:
        return STATUS_NORMAL
