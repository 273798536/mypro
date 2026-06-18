import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from models import (
    db, ChannelRow, TrackRow,
    STATUS_LABELS,
)
from file_service import create_session, process_uploaded_file
from models import UploadedFile
from matcher import run_matching
from report_generator import generate_report

SAMPLE_DIR = os.path.join(os.path.dirname(__file__), 'sample_data')


def main():
    app = create_app()
    with app.app_context():
        db.create_all()

        session = create_session('修复验证-曲目关联', '验证列识别修复和曲目关联')

        test_files = [
            ('舞台通道表.csv', 'channel', False),
            ('舞台通道表_旧版.csv', 'channel', True),
            ('曲目表.csv', 'track', False),
            ('时码清单.txt', 'timecode', False),
            ('现场备注.txt', 'note', False),
        ]

        for filename, category, is_old in test_files:
            filepath = os.path.join(SAMPLE_DIR, filename)
            uploaded_file = UploadedFile(
                session_id=session.id,
                filename=filename,
                file_type='spreadsheet' if filename.endswith('.csv') else 'text',
                file_path=filepath,
            )
            db.session.add(uploaded_file)
            db.session.commit()
            row_count, error = process_uploaded_file(uploaded_file, category, is_old)
            tag = ' [旧版]' if is_old else ''
            print(f'✅ {filename}{tag}: {row_count} 条')

        print()

        print('=== 验证：通道表的 track_name 是否正确 ===')
        channel_rows = ChannelRow.query.filter_by(session_id=session.id, is_old_version=False).all()
        ok_count = 0
        bad_count = 0
        for ch in channel_rows:
            is_bad = ch.track_name.startswith('CH') or '通道' in ch.track_name
            if is_bad:
                print(f'  ❌ 错误：通道「{ch.channel_name}」的 track_name={ch.track_name!r}（应该是曲目名）')
                bad_count += 1
            else:
                print(f'  ✅ 正确：通道「{ch.channel_name}」→ 曲目「{ch.track_name}」')
                ok_count += 1
        print(f'  结果：{ok_count} 正确 / {bad_count} 错误')
        print()

        results = run_matching(session)

        status_counts = {}
        for r in results:
            status_counts[r.status] = status_counts.get(r.status, 0) + 1

        print('=== 匹配结果统计 ===')
        for s, c in sorted(status_counts.items()):
            print(f'  {STATUS_LABELS.get(s, s)}: {c}')
        print()

        print('=== 曲目关联验证 ===')
        track_rows = TrackRow.query.filter_by(session_id=session.id).all()
        matched_track_ids = set()
        for r in results:
            if r.track_row_id:
                matched_track_ids.add(r.track_row_id)

        total_tracks = len(track_rows)
        matched = len(matched_track_ids)
        print(f'  曲目总数: {total_tracks}')
        print(f'  已关联: {matched}')
        print(f'  未关联: {total_tracks - matched}')

        for tr in track_rows:
            status_str = '✅ 已关联' if tr.id in matched_track_ids else '❌ 未关联'
            print(f'  {status_str} - 「{tr.track_name}」')

        print()

        report = generate_report(session)
        print(f'=== 报告生成: {len(report)} 字符 ===')
        print()

        if bad_count == 0 and (total_tracks - matched) <= 1:
            print('🎉 修复验证通过！')
        else:
            print('⚠️  仍有问题需排查')


if __name__ == '__main__':
    main()
