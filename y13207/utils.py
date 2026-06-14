import re
import os
import pandas as pd
from datetime import datetime


TIMECODE_PATTERNS = [
    re.compile(r'^(\d+):(\d{2}):(\d{2})[.:](\d{2,3})$'),
    re.compile(r'^(\d+):(\d{2})[.:](\d{2,3})$'),
    re.compile(r'^(\d+)[.](\d{2,3})$'),
    re.compile(r'^(\d+)m\s*(\d+)s$'),
    re.compile(r'^(\d+)秒$'),
    re.compile(r'^(\d+\.?\d*)$'),
]


def parse_timecode(tc_str):
    if not tc_str or not isinstance(tc_str, str):
        return 0.0, ''

    tc_str = tc_str.strip()
    if not tc_str:
        return 0.0, ''

    normalized = tc_str

    m = TIMECODE_PATTERNS[0].match(tc_str)
    if m:
        h, mi, s, ms = int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4)
        if len(ms) == 2:
            ms = int(ms) * 10
        else:
            ms = int(ms)
        return h * 3600 + mi * 60 + s + ms / 1000.0, normalized

    m = TIMECODE_PATTERNS[1].match(tc_str)
    if m:
        mi, s, ms = int(m.group(1)), int(m.group(2)), m.group(3)
        if len(ms) == 2:
            ms = int(ms) * 10
        else:
            ms = int(ms)
        return mi * 60 + s + ms / 1000.0, normalized

    m = TIMECODE_PATTERNS[2].match(tc_str)
    if m:
        s, ms = int(m.group(1)), m.group(2)
        if len(ms) == 2:
            ms_val = int(ms) * 10
        else:
            ms_val = int(ms)
        return s + ms_val / 1000.0, normalized

    m = TIMECODE_PATTERNS[3].match(tc_str)
    if m:
        mi, s = int(m.group(1)), int(m.group(2))
        return mi * 60 + s, f'{mi}:{s:02d}'

    m = TIMECODE_PATTERNS[4].match(tc_str)
    if m:
        s = int(m.group(1))
        return float(s), f'{s}'

    m = TIMECODE_PATTERNS[5].match(tc_str)
    if m:
        return float(m.group(1)), normalized

    return 0.0, normalized


def format_timecode(seconds):
    if seconds is None or seconds == 0:
        return '0:00.000'
    is_neg = seconds < 0
    seconds = abs(seconds)
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    ms = int((seconds - int(seconds)) * 1000)
    prefix = '-' if is_neg else ''
    return f'{prefix}{mins}:{secs:02d}.{ms:03d}'


def detect_file_type(filename):
    ext = os.path.splitext(filename)[1].lower()
    if ext in ('.csv', '.xlsx', '.xls'):
        return 'spreadsheet'
    elif ext in ('.txt', '.md'):
        return 'text'
    return 'unknown'


def guess_data_category(filename, content_preview=''):
    fn = filename.lower()
    if '通道' in filename or 'channel' in fn or 'stage' in fn or '舞台' in filename:
        return 'channel'
    if '曲目' in filename or 'track' in fn or 'song' in fn or '歌单' in filename:
        return 'track'
    if '时码' in filename or 'timecode' in fn or 'tc' in fn or '清单' in filename:
        return 'timecode'
    if '备注' in filename or 'note' in fn or 'remark' in fn or '说明' in filename:
        return 'note'
    if content_preview:
        if '通道' in content_preview[:500] or 'CHANNEL' in content_preview[:500]:
            return 'channel'
        if '曲目' in content_preview[:500] or 'TRACK' in content_preview[:500]:
            return 'track'
        if '时码' in content_preview[:500] or 'TIMECODE' in content_preview[:500]:
            return 'timecode'
    return 'unknown'


def parse_spreadsheet(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    if ext == '.csv':
        df = pd.read_csv(file_path, dtype=str)
    else:
        df = pd.read_excel(file_path, dtype=str)

    df = df.fillna('')
    rows = []
    for idx, row in df.iterrows():
        row_data = {col: str(row[col]).strip() for col in df.columns}
        row_data['_row_num'] = idx + 2
        rows.append(row_data)
    return rows, list(df.columns)


def parse_text_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    rows = []
    for idx, line in enumerate(lines):
        line = line.strip()
        if line:
            rows.append({
                'content': line,
                '_row_num': idx + 1,
            })
    return rows, ['content']


def find_column(columns, keywords):
    for col in columns:
        col_lower = col.lower()
        for kw in keywords:
            if kw.lower() in col_lower:
                return col
    return None


def detect_old_version(filename, content_preview=''):
    indicators = ['旧版', 'old', 'backup', '备份', 'v0', '草稿', 'draft']
    fn = filename.lower()
    for ind in indicators:
        if ind in fn:
            return True
    if content_preview:
        preview = content_preview[:1000].lower()
        for ind in indicators:
            if ind in preview:
                return True
    return False
