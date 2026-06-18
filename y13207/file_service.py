import os
import json
from datetime import datetime
from werkzeug.utils import secure_filename

from models import (
    db, UploadedFile, ChannelRow, TrackRow, TimecodeEntry, Note,
    ArchiveSession, STATUS_NORMAL, STATUS_OLD_VERSION, STATUS_VERBAL_NOTE,
)
from utils import (
    parse_timecode, detect_file_type, guess_data_category,
    parse_spreadsheet, parse_text_file, find_column, detect_old_version,
)


ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls', 'txt', 'md'}


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def save_uploaded_file(file_storage, session_id, upload_folder):
    if not file_storage or file_storage.filename == '':
        return None, '没有选择文件'

    if not allowed_file(file_storage.filename):
        return None, f'不支持的文件格式：{file_storage.filename}'

    filename = secure_filename(file_storage.filename)
    session_upload_dir = os.path.join(upload_folder, f'session_{session_id}')
    os.makedirs(session_upload_dir, exist_ok=True)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    base, ext = os.path.splitext(filename)
    saved_filename = f'{timestamp}_{base}{ext}'
    file_path = os.path.join(session_upload_dir, saved_filename)

    file_storage.save(file_path)

    file_type = detect_file_type(filename)

    uploaded_file = UploadedFile(
        session_id=session_id,
        filename=filename,
        file_type=file_type,
        file_path=file_path,
    )
    db.session.add(uploaded_file)
    db.session.commit()

    return uploaded_file, None


def process_uploaded_file(uploaded_file, data_category=None, is_old_version=False):
    file_path = uploaded_file.file_path
    filename = uploaded_file.filename

    if not os.path.exists(file_path):
        return 0, '文件不存在'

    if data_category is None:
        content_preview = ''
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content_preview = f.read(1000)
        except Exception:
            pass
        data_category = guess_data_category(filename, content_preview)

    if is_old_version is False:
        is_old_version = detect_old_version(filename)

    file_type = uploaded_file.file_type
    row_count = 0

    if file_type == 'spreadsheet':
        rows, columns = parse_spreadsheet(file_path)
        row_count = len(rows)

        if data_category == 'channel':
            _parse_channel_rows(rows, columns, uploaded_file, is_old_version)
        elif data_category == 'track':
            _parse_track_rows(rows, columns, uploaded_file)
        elif data_category == 'timecode':
            _parse_timecode_rows(rows, columns, uploaded_file)
        elif data_category == 'note':
            _parse_note_rows_from_spreadsheet(rows, columns, uploaded_file)
        else:
            _parse_generic_spreadsheet(rows, columns, uploaded_file)

    elif file_type == 'text':
        rows, columns = parse_text_file(file_path)
        row_count = len(rows)

        if data_category == 'note':
            _parse_note_from_text(rows, uploaded_file)
        elif data_category == 'timecode':
            _parse_timecode_from_text(rows, uploaded_file)
        else:
            _parse_generic_text(rows, uploaded_file)

    uploaded_file.row_count = row_count
    if is_old_version:
        uploaded_file.version_tag = '旧版'
    db.session.commit()

    return row_count, None


def _parse_channel_rows(rows, columns, uploaded_file, is_old_version):
    ch_col = find_column(columns, ['通道名称', '通道名', 'channel_name', 'channel', '通道', '声道', 'CH', 'ch'])
    track_col = find_column(columns, ['对应曲目', '曲目名称', '曲目名', '曲目', 'track_name', 'track', '歌曲名', '歌曲', '名称', 'name'], exclude=[ch_col] if ch_col else None)
    tc_col = find_column(columns, ['起始时码', '起始时间', '时码', '时间码', 'timecode', 'TC', 'tc', '起始', 'start'], exclude=[ch_col, track_col])
    note_col = find_column(columns, ['备注', '说明', 'note', 'remark'], exclude=[ch_col, track_col, tc_col])

    for row_data in rows:
        channel_name = row_data.get(ch_col, '') if ch_col else ''
        track_name = row_data.get(track_col, '') if track_col else ''
        timecode = row_data.get(tc_col, '') if tc_col else ''
        note_text = row_data.get(note_col, '') if note_col else ''

        if not channel_name and not track_name and not timecode:
            continue

        tc_seconds, normalized = parse_timecode(timecode)

        ch_row = ChannelRow(
            session_id=uploaded_file.session_id,
            source_file_id=uploaded_file.id,
            source_row=row_data.get('_row_num', 0),
            channel_name=channel_name,
            track_name=track_name,
            timecode=timecode if timecode else normalized,
            timecode_seconds=tc_seconds,
            is_old_version=is_old_version,
            status=STATUS_OLD_VERSION if is_old_version else STATUS_NORMAL,
            raw_data=json.dumps(row_data, ensure_ascii=False),
            notes=note_text,
        )
        db.session.add(ch_row)


def _parse_track_rows(rows, columns, uploaded_file):
    name_col = find_column(columns, ['曲目名称', '曲目名', '曲名', '曲目', 'track_name', 'track', '歌曲名', '歌曲', '名称', 'name'])
    num_col = find_column(columns, ['曲目编号', '曲目序号', 'track_num', '编号', '序号', 'number', 'no'], exclude=[name_col] if name_col else None)
    dur_col = find_column(columns, ['曲目时长', '时长', 'duration', '长度', '时间'], exclude=[name_col, num_col])
    note_col = find_column(columns, ['备注', '说明', 'note', 'remark'], exclude=[name_col, num_col, dur_col])

    for row_data in rows:
        track_name = row_data.get(name_col, '') if name_col else ''
        track_number = row_data.get(num_col, '') if num_col else ''
        duration = row_data.get(dur_col, '') if dur_col else ''
        note_text = row_data.get(note_col, '') if note_col else ''

        if not track_name:
            continue

        dur_seconds, _ = parse_timecode(duration)

        tr = TrackRow(
            session_id=uploaded_file.session_id,
            source_file_id=uploaded_file.id,
            source_row=row_data.get('_row_num', 0),
            track_name=track_name,
            track_number=track_number,
            duration=duration,
            duration_seconds=dur_seconds,
            status=STATUS_NORMAL,
            raw_data=json.dumps(row_data, ensure_ascii=False),
            notes=note_text,
        )
        db.session.add(tr)


def _parse_timecode_rows(rows, columns, uploaded_file):
    tc_col = find_column(columns, ['起始时码', '时码', '时间码', 'timecode', 'TC', 'tc', '时间'])
    name_col = find_column(columns, ['条目名称', '条目', '名称', 'name', '标题', 'title', '曲目'], exclude=[tc_col] if tc_col else None)
    ch_col = find_column(columns, ['关联通道', '对应通道', '通道', 'channel', '声道', '关联'], exclude=[tc_col, name_col])
    note_col = find_column(columns, ['备注', '说明', 'note', 'remark'], exclude=[tc_col, name_col, ch_col])

    for row_data in rows:
        entry_name = row_data.get(name_col, '') if name_col else ''
        timecode = row_data.get(tc_col, '') if tc_col else ''
        channel_ref = row_data.get(ch_col, '') if ch_col else ''
        note_text = row_data.get(note_col, '') if note_col else ''

        if not entry_name and not timecode:
            continue

        tc_seconds, normalized = parse_timecode(timecode)

        te = TimecodeEntry(
            session_id=uploaded_file.session_id,
            source_file_id=uploaded_file.id,
            source_row=row_data.get('_row_num', 0),
            entry_name=entry_name,
            timecode=timecode if timecode else normalized,
            timecode_seconds=tc_seconds,
            channel_ref=channel_ref,
            status='pending',
            raw_data=json.dumps(row_data, ensure_ascii=False),
            notes=note_text,
        )
        db.session.add(te)


def _parse_note_rows_from_spreadsheet(rows, columns, uploaded_file):
    content_col = find_column(columns, ['备注内容', '备注正文', '内容', 'content', '正文', '备注', '说明', 'note'])
    type_col = find_column(columns, ['备注类型', '类型', 'type', '类别'], exclude=[content_col] if content_col else None)
    auth_col = find_column(columns, ['是否授权', '授权标记', '授权', 'authorization', 'auth'], exclude=[content_col, type_col])

    for row_data in rows:
        content = row_data.get(content_col, '') if content_col else ''
        if not content:
            continue

        note_type = row_data.get(type_col, 'verbal') if type_col else 'verbal'
        is_auth = False
        if auth_col:
            val = row_data.get(auth_col, '').lower()
            is_auth = val in ('是', 'true', 'yes', '1', '授权')

        if '授权' in content and not is_auth:
            is_auth = True

        note = Note(
            session_id=uploaded_file.session_id,
            source_file_id=uploaded_file.id,
            note_type=note_type,
            content=content,
            is_authorization=is_auth,
            status='authorized' if is_auth else STATUS_VERBAL_NOTE,
        )
        db.session.add(note)


def _parse_note_from_text(rows, uploaded_file):
    for row_data in rows:
        content = row_data.get('content', '').strip()
        if not content:
            continue

        is_auth = '授权' in content or 'authorization' in content.lower()

        note = Note(
            session_id=uploaded_file.session_id,
            source_file_id=uploaded_file.id,
            note_type='verbal',
            content=content,
            is_authorization=is_auth,
            status='authorized' if is_auth else STATUS_VERBAL_NOTE,
        )
        db.session.add(note)


def _parse_timecode_from_text(rows, uploaded_file):
    for row_data in rows:
        content = row_data.get('content', '').strip()
        if not content:
            continue

        entry_name, timecode_str = _split_name_and_timecode(content)
        if not entry_name and not timecode_str:
            continue

        tc_seconds, normalized = parse_timecode(timecode_str)

        if tc_seconds == 0 and not timecode_str:
            if '时码' in content or '清单' in content or '备注' in content:
                continue

        te = TimecodeEntry(
            session_id=uploaded_file.session_id,
            source_file_id=uploaded_file.id,
            source_row=row_data.get('_row_num', 0),
            entry_name=entry_name or content[:50],
            timecode=timecode_str if timecode_str else normalized,
            timecode_seconds=tc_seconds,
            status='pending',
            raw_data=content,
        )
        db.session.add(te)


def _split_name_and_timecode(line):
    import re as _re

    tc_patterns = [
        _re.compile(r'(\d+:\d{2}:\d{2}[.:]\d{2,3})'),
        _re.compile(r'(\d+:\d{2}[.:]\d{2,3})'),
        _re.compile(r'\b(\d+[.]\d{2,3})\b'),
    ]

    for pattern in tc_patterns:
        m = pattern.search(line)
        if m:
            tc_str = m.group(1)
            name_part = line[:m.start()].strip()
            name_part = name_part.rstrip('-_:：\t ')
            return name_part, tc_str

    parts = line.split()
    if len(parts) >= 2:
        for i, part in enumerate(parts):
            secs, _ = parse_timecode(part)
            if secs > 0:
                name = ' '.join(parts[:i]).strip()
                return name, part

    return line, ''


def _parse_generic_spreadsheet(rows, columns, uploaded_file):
    first_col = columns[0] if columns else None
    if first_col:
        has_timecode = any(
            parse_timecode(row.get(first_col, ''))[0] > 0 for row in rows[:5]
        )
        if has_timecode:
            _parse_timecode_rows(rows, columns, uploaded_file)
            return
    _parse_channel_rows(rows, columns, uploaded_file, is_old_version=False)


def _parse_generic_text(rows, uploaded_file):
    sample = '\n'.join([r.get('content', '') for r in rows[:5]])
    if '时码' in sample or 'TC' in sample or '时间码' in sample:
        _parse_timecode_from_text(rows, uploaded_file)
    else:
        _parse_note_from_text(rows, uploaded_file)


def create_session(name, description=''):
    session = ArchiveSession(
        name=name,
        description=description,
    )
    db.session.add(session)
    db.session.commit()
    return session


def get_session_list():
    sessions = ArchiveSession.query.order_by(ArchiveSession.updated_at.desc()).all()
    return [s.to_dict() for s in sessions]


def get_session_detail(session_id):
    session = ArchiveSession.query.get(session_id)
    if not session:
        return None

    data = session.to_dict()
    data['uploaded_files'] = [f.to_dict() for f in session.uploaded_files]
    data['channel_rows'] = [r.to_dict() for r in session.channel_rows]
    data['track_rows'] = [r.to_dict() for r in session.track_rows]
    data['timecode_entries'] = [r.to_dict() for r in session.timecode_entries]
    data['notes'] = [n.to_dict() for n in session.notes]
    data['match_results'] = [r.to_dict() for r in session.match_results]

    return data


def delete_session(session_id):
    session = ArchiveSession.query.get(session_id)
    if not session:
        return False
    db.session.delete(session)
    db.session.commit()
    return True
