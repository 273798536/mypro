"""
验证脚本：测试录音棚时码清单归档系统的核心功能
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from models import (
    db, ArchiveSession, UploadedFile, ChannelRow, TrackRow,
    TimecodeEntry, Note, MatchResult,
    STATUS_NORMAL, STATUS_WARNING, STATUS_MISMATCH, STATUS_OLD_VERSION,
    STATUS_VERBAL_NOTE, STATUS_AUTHORIZED, STATUS_LABELS,
)
from file_service import create_session, save_uploaded_file, process_uploaded_file
from matcher import run_matching
from report_generator import generate_report

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), 'sample_data')


def test_full_workflow():
    app = create_app()

    with app.app_context():
        db.create_all()

        print('=' * 60)
        print('测试：录音棚时码清单归档系统')
        print('=' * 60)
        print()

        session = create_session(
            '2024春季音乐会（测试）',
            '这是一个自动化测试的归档，验证系统各项功能'
        )
        print(f'✅ 创建归档: {session.name} (ID: {session.id})')
        print()

        test_files = [
            ('舞台通道表.csv', 'channel', False),
            ('舞台通道表_旧版.csv', 'channel', True),
            ('曲目表.csv', 'track', False),
            ('时码清单.txt', 'timecode', False),
            ('现场备注.txt', 'note', False),
        ]

        for filename, category, is_old in test_files:
            filepath = os.path.join(SAMPLE_DIR, filename)
            if not os.path.exists(filepath):
                print(f'⚠️  跳过（文件不存在）: {filename}')
                continue

            uploaded_file = UploadedFile(
                session_id=session.id,
                filename=filename,
                file_type='spreadsheet' if filename.endswith('.csv') else 'text',
                file_path=filepath,
            )
            db.session.add(uploaded_file)
            db.session.commit()

            row_count, error = process_uploaded_file(
                uploaded_file, category, is_old
            )
            if error:
                print(f'❌ 解析失败: {filename} - {error}')
            else:
                tag = ' [旧版]' if is_old else ''
                print(f'✅ 解析成功: {filename}{tag} - {row_count} 条记录')

        print()

        channel_rows = ChannelRow.query.filter_by(session_id=session.id).all()
        old_channels = [c for c in channel_rows if c.is_old_version]
        normal_channels = [c for c in channel_rows if not c.is_old_version]
        track_rows = TrackRow.query.filter_by(session_id=session.id).all()
        timecode_entries = TimecodeEntry.query.filter_by(session_id=session.id).all()
        notes = Note.query.filter_by(session_id=session.id).all()
        auth_notes = [n for n in notes if n.is_authorization]
        verbal_notes = [n for n in notes if not n.is_authorization]

        print('📊 数据统计:')
        print(f'   舞台通道（当前）: {len(normal_channels)} 条')
        print(f'   舞台通道（旧版）: {len(old_channels)} 条')
        print(f'   曲目表记录: {len(track_rows)} 条')
        print(f'   时码清单条目: {len(timecode_entries)} 条')
        print(f'   授权备注: {len(auth_notes)} 条')
        print(f'   口头备注: {len(verbal_notes)} 条')
        print()

        print('⚙️  执行时码匹配...')
        results = run_matching(session)
        print(f'✅ 匹配完成，生成 {len(results)} 条结果')
        print()

        status_counts = {}
        for r in results:
            status_counts[r.status] = status_counts.get(r.status, 0) + 1

        print('📈 结果分类:')
        for status, count in sorted(status_counts.items()):
            label = STATUS_LABELS.get(status, status)
            print(f'   {label}: {count} 条')
        print()

        print('🔍 详细结果:')
        for r in results:
            label = STATUS_LABELS.get(r.status, r.status)
            entry_name = _get_entry_name(r)
            sources = r.sources or ''
            print(f'   [{label}] {entry_name}')
            print(f'          来源: {sources}')
            if r.time_diff_seconds and r.time_diff_seconds != 0:
                print(f'          时码差: {r.time_diff_seconds:.3f}s')
            if r.conclusion:
                conclusion_short = r.conclusion[:60] + '...' if len(r.conclusion) > 60 else r.conclusion
                print(f'          结论: {conclusion_short}')
        print()

        print('📝 生成 Markdown 报告...')
        report = generate_report(session)
        print(f'✅ 报告生成完成 ({len(report)} 字符)')
        print()

        print('🏷️  验证关键功能:')
        print()

        has_warning = any(r.status == STATUS_WARNING for r in results)
        print(f'   半拍偏差识别: {"✅ 正确识别为警告（非通过）" if has_warning else "❌ 未检测到警告状态"}')

        has_old = any(r.status == STATUS_OLD_VERSION for r in results)
        print(f'   旧版数据隔离: {"✅ 旧版数据单独标记" if has_old else "❌ 未检测到旧版标记"}')

        has_verbal = any(r.status == STATUS_VERBAL_NOTE for r in results)
        print(f'   口头备注保留: {"✅ 口头备注单独归类" if has_verbal else "❌ 未检测到口头备注"}')

        has_authorized = any(r.status == STATUS_AUTHORIZED for r in results)
        print(f'   授权对齐功能: {"✅ 授权备注可重新对齐" if has_authorized else "❌ 未检测到授权对齐"}')

        has_source = all(r.sources for r in results if r.status not in (STATUS_VERBAL_NOTE,))
        print(f'   数据溯源: {"✅ 每条结论都有来源标记" if has_source else "⚠️  部分结果缺少来源"}')

        print()

        overall_status = session.status
        overall_label = STATUS_LABELS.get(overall_status, overall_status)
        print(f'🎯 总体状态: {overall_label}')
        print()

        print('=' * 60)
        print('测试完成！')
        print('=' * 60)

        return session.id


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


if __name__ == '__main__':
    test_full_workflow()
