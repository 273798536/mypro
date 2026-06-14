import os
from datetime import datetime

from models import (
    db, ArchiveSession, MatchResult, ChannelRow, TrackRow, TimecodeEntry, Note,
    UploadedFile,
    STATUS_NORMAL, STATUS_WARNING, STATUS_MISMATCH, STATUS_OLD_VERSION,
    STATUS_VERBAL_NOTE, STATUS_AUTHORIZED, STATUS_LABELS,
)
from utils import format_timecode


def generate_report(session):
    session_id = session.id

    results = MatchResult.query.filter_by(session_id=session.id).all()
    uploaded_files = UploadedFile.query.filter_by(session_id=session.id).all()
    channel_rows = ChannelRow.query.filter_by(session_id=session.id).all()
    track_rows = TrackRow.query.filter_by(session_id=session.id).all()
    timecode_entries = TimecodeEntry.query.filter_by(session_id=session.id).all()
    notes = Note.query.filter_by(session_id=session.id).all()

    old_channels = [c for c in channel_rows if c.is_old_version]
    normal_channels = [c for c in channel_rows if not c.is_old_version]

    normal_results = [r for r in results if r.status == STATUS_NORMAL]
    warning_results = [r for r in results if r.status == STATUS_WARNING]
    mismatch_results = [r for r in results if r.status == STATUS_MISMATCH]
    old_results = [r for r in results if r.status == STATUS_OLD_VERSION]
    verbal_results = [r for r in results if r.status == STATUS_VERBAL_NOTE]
    authorized_results = [r for r in results if r.status == STATUS_AUTHORIZED]

    total_issues = len(warning_results) + len(mismatch_results)
    resolved_by_auth = len(authorized_results)

    lines = []

    lines.append(f'# 录音棚时码清单归档报告')
    lines.append('')
    lines.append(f'**归档名称**：{session.name}')
    lines.append('')
    if session.description:
        lines.append(f'**描述**：{session.description}')
        lines.append('')
    lines.append(f'**生成时间**：{datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    lines.append('')
    lines.append('---')
    lines.append('')

    lines.append('## 一、概览')
    lines.append('')
    lines.append('| 项目 | 数量 | 说明 |')
    lines.append('| --- | --- | --- |')
    lines.append(f'| 上传文件 | {len(uploaded_files)} | 包含通道表、曲目表、时码清单、备注等 |')
    lines.append(f'| 舞台通道（有效） | {len(normal_channels)} | 排除旧版数据后的有效通道 |')
    lines.append(f'| 舞台通道（旧版） | {len(old_channels)} | 来自旧版表格，仅供参考 |')
    lines.append(f'| 曲目表记录 | {len(track_rows)} | |')
    lines.append(f'| 时码清单条目 | {len(timecode_entries)} | |')
    lines.append(f'| 备注数量 | {len(notes)} | 含口头备注和授权备注 |')
    lines.append('')

    lines.append('### 结论统计')
    lines.append('')
    lines.append('| 状态 | 数量 | 标签 |')
    lines.append('| --- | --- | --- |')
    lines.append(f'| ✅ 正常通过 | {len(normal_results)} | `{STATUS_LABELS[STATUS_NORMAL]}` |')
    lines.append(f'| ⚠️ 时码偏差 | {len(warning_results)} | `{STATUS_LABELS[STATUS_WARNING]}` |')
    lines.append(f'| ❌ 不匹配 | {len(mismatch_results)} | `{STATUS_LABELS[STATUS_MISMATCH]}` |')
    lines.append(f'| 📜 旧版数据 | {len(old_results)} | `{STATUS_LABELS[STATUS_OLD_VERSION]}` |')
    lines.append(f'| 💬 口头备注 | {len(verbal_results)} | `{STATUS_LABELS[STATUS_VERBAL_NOTE]}` |')
    lines.append(f'| ✅ 已授权对齐 | {len(authorized_results)} | `{STATUS_LABELS[STATUS_AUTHORIZED]}` |')
    lines.append('')

    overall = STATUS_LABELS.get(session.status, session.status)
    lines.append(f'**总体状态**：{overall}')
    lines.append('')
    if resolved_by_auth > 0:
        lines.append(f'> 🔑 经授权备注对齐，{resolved_by_auth} 条异常记录已转为"已授权对齐"状态。')
        lines.append('')

    lines.append('---')
    lines.append('')

    if warning_results:
        lines.append('## 二、时码偏差（需关注）')
        lines.append('')
        lines.append('> ⚠️ 时码偏差在 0.05s ~ 0.5s 之间，接近半拍偏移。这些记录**不是正常通过**，需人工确认。')
        lines.append('')
        lines.append('| # | 条目 | 时码差 | 来源 | 说明 |')
        lines.append('| --- | --- | --- | --- | --- |')
        for i, r in enumerate(warning_results, 1):
            entry_name = _get_entry_name(r)
            diff = format_timecode(r.time_diff_seconds)
            sources = r.sources or ''
            conclusion = r.conclusion or ''
            if len(conclusion) > 50:
                conclusion = conclusion[:50] + '...'
            lines.append(f'| {i} | {entry_name} | {diff} | {sources} | {conclusion} |')
        lines.append('')

    if mismatch_results:
        lines.append('## 三、不匹配项')
        lines.append('')
        lines.append('> ❌ 时码差超过 0.5s 或未找到对应记录。')
        lines.append('')
        lines.append('| # | 条目 | 来源 | 说明 |')
        lines.append('| --- | --- | --- | --- |')
        for i, r in enumerate(mismatch_results, 1):
            entry_name = _get_entry_name(r)
            sources = r.sources or ''
            conclusion = r.conclusion or ''
            if len(conclusion) > 60:
                conclusion = conclusion[:60] + '...'
            lines.append(f'| {i} | {entry_name} | {sources} | {conclusion} |')
        lines.append('')

    if authorized_results:
        lines.append('## 四、已授权对齐')
        lines.append('')
        lines.append('> 🔑 经授权备注确认后转为正常的记录。原始异常状态已保留在备注中。')
        lines.append('')
        lines.append('| # | 条目 | 原状态 | 来源 | 授权说明 |')
        lines.append('| --- | --- | --- | --- | --- |')
        for i, r in enumerate(authorized_results, 1):
            entry_name = _get_entry_name(r)
            original_status = ''
            if r.notes and '原状态：' in r.notes:
                original_status = r.notes.split('原状态：')[-1]
                original_status = STATUS_LABELS.get(original_status, original_status)
            sources = r.sources or ''
            conclusion = r.conclusion or ''
            auth_note = ''
            if '授权备注：' in conclusion:
                auth_note = conclusion.split('授权备注：')[-1].rstrip('）)')
            lines.append(f'| {i} | {entry_name} | {original_status} | {sources} | {auth_note} |')
        lines.append('')

    if normal_results:
        lines.append('## 五、正常通过')
        lines.append('')
        lines.append('> ✅ 时码差在 ±0.05s 以内，对齐正常。')
        lines.append('')
        lines.append('| # | 条目 | 时码差 | 来源 |')
        lines.append('| --- | --- | --- | --- |')
        for i, r in enumerate(normal_results, 1):
            entry_name = _get_entry_name(r)
            diff = format_timecode(r.time_diff_seconds)
            sources = r.sources or ''
            lines.append(f'| {i} | {entry_name} | {diff} | {sources} |')
        lines.append('')

    if old_results:
        lines.append('## 六、旧版数据（仅供参考）')
        lines.append('')
        lines.append('> 📜 来自旧版舞台通道表的数据，不影响最终结论，但保留以供参考。')
        lines.append('')
        lines.append('| # | 通道名称 | 时码 | 原始行号 |')
        lines.append('| --- | --- | --- | --- |')
        for i, r in enumerate(old_results, 1):
            ch_name = ''
            tc = ''
            if r.channel_row_id:
                ch = ChannelRow.query.get(r.channel_row_id)
                if ch:
                    ch_name = ch.channel_name
                    tc = ch.timecode
            source_row = ''
            if r.sources and '第' in r.sources and '行' in r.sources:
                source_row = r.sources.split('第')[-1].split('行')[0]
            lines.append(f'| {i} | {ch_name} | {tc} | {source_row} |')
        lines.append('')

    if verbal_results or notes:
        lines.append('## 七、备注与说明')
        lines.append('')
        verbal_notes_list = [n for n in notes if not n.is_authorization]
        auth_notes_list = [n for n in notes if n.is_authorization]

        if auth_notes_list:
            lines.append('### 授权备注')
            lines.append('')
            for i, n in enumerate(auth_notes_list, 1):
                lines.append(f'{i}. 🔑 **{n.content}**')
                if n.related_entries:
                    lines.append(f'   - 关联条目 ID：{n.related_entries}')
            lines.append('')

        if verbal_notes_list:
            lines.append('### 口头备注')
            lines.append('')
            for i, n in enumerate(verbal_notes_list, 1):
                lines.append(f'{i}. 💬 {n.content}')
            lines.append('')

    lines.append('---')
    lines.append('')
    lines.append('## 八、数据溯源')
    lines.append('')
    lines.append('所有结论均标注了原始数据来源，便于回溯验证：')
    lines.append('')
    lines.append('| 文件 | 类型 | 行数 | 版本 |')
    lines.append('| --- | --- | --- | --- |')
    for f in uploaded_files:
        ftype_label = _get_file_type_label(f)
        version = f.version_tag or '当前版'
        lines.append(f'| {f.filename} | {ftype_label} | {f.row_count} | {version} |')
    lines.append('')
    lines.append('> 每条匹配结果中的「来源」列，指向原始表格的行号，可直接定位到原始数据。')
    lines.append('')

    lines.append('---')
    lines.append('')
    lines.append('*本报告由录音棚时码清单归档系统自动生成。*')
    lines.append('')

    report_content = '\n'.join(lines)

    session.report_content = report_content
    session.report_generated_at = datetime.now()
    db.session.commit()

    return report_content


def _get_entry_name(match_result):
    if match_result.timecode_entry_id:
        entry = TimecodeEntry.query.get(match_result.timecode_entry_id)
        if entry and entry.entry_name:
            return entry.entry_name
    if match_result.channel_row_id:
        ch = ChannelRow.query.get(match_result.channel_row_id)
        if ch and ch.channel_name:
            return ch.channel_name
    if match_result.track_row_id:
        tr = TrackRow.query.get(match_result.track_row_id)
        if tr and tr.track_name:
            return tr.track_name
    return '未命名'


def _get_file_type_label(uploaded_file):
    mapping = {
        'channel': '舞台通道表',
        'track': '曲目表',
        'timecode': '时码清单',
        'note': '备注文件',
        'spreadsheet': '表格文件',
        'text': '文本文件',
    }
    return mapping.get(uploaded_file.file_type, uploaded_file.file_type)


def save_report_to_file(session, report_folder):
    if not session.report_content:
        generate_report(session)

    os.makedirs(report_folder, exist_ok=True)
    filename = f'{session.id:04d}_{session.name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.md'
    safe_filename = filename.replace('/', '_').replace(' ', '_')
    file_path = os.path.join(report_folder, safe_filename)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(session.report_content)

    return file_path
