"""
生成示例数据文件，用于演示"录音棚时码清单归档"系统。

包含：
- 舞台通道表（当前版 + 旧版）
- 曲目表
- 时码清单（含正常记录、半拍偏移记录）
- 备注文件（口头备注 + 授权备注）
"""
import os
import csv


SAMPLE_DIR = os.path.join(os.path.dirname(__file__), 'sample_data')


def generate_channel_table():
    os.makedirs(SAMPLE_DIR, exist_ok=True)
    filepath = os.path.join(SAMPLE_DIR, '舞台通道表.csv')
    with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['通道名称', '对应曲目', '起始时码', '备注'])
        writer.writerow(['CH01_开场序曲', '开场序曲', '0:00.000', '主舞台'])
        writer.writerow(['CH02_第一首歌', '春风十里', '3:24.500', '独唱'])
        writer.writerow(['CH03_第二首歌', '夜空中最亮的星', '7:45.230', '乐队伴奏'])
        writer.writerow(['CH04_第三首歌', '海阔天空', '12:10.000', '合唱'])
        writer.writerow(['CH05_中场音乐', '中场过渡', '16:30.750', 'BGM'])
        writer.writerow(['CH06_第四首歌', '平凡之路', '19:05.300', '吉他弹唱'])
        writer.writerow(['CH07_第五首歌', '再见', '23:40.120', '结尾曲'])
    print(f'已生成: {filepath}')


def generate_old_channel_table():
    filepath = os.path.join(SAMPLE_DIR, '舞台通道表_旧版.csv')
    with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['通道名称', '对应曲目', '起始时码', '备注'])
        writer.writerow(['CH01_开场序曲', '开场序曲', '0:00.000', '旧版-主舞台'])
        writer.writerow(['CH02_第一首歌', '春风十里', '3:20.000', '旧版-时间不准'])
        writer.writerow(['CH03_第二首歌', '夜空中最亮的星', '7:40.000', '旧版'])
        writer.writerow(['CH99_已废弃通道', '废弃曲目', '10:00.000', '旧版-已删除'])
    print(f'已生成: {filepath}')


def generate_track_list():
    filepath = os.path.join(SAMPLE_DIR, '曲目表.csv')
    with open(filepath, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['序号', '曲目名称', '时长', '演唱者'])
        writer.writerow(['1', '开场序曲', '3:24', '管弦乐'])
        writer.writerow(['2', '春风十里', '4:20', '林老师'])
        writer.writerow(['3', '夜空中最亮的星', '4:25', '乐队'])
        writer.writerow(['4', '海阔天空', '4:20', '全体合唱'])
        writer.writerow(['5', '中场过渡', '2:35', 'BGM'])
        writer.writerow(['6', '平凡之路', '4:35', '王同学'])
        writer.writerow(['7', '再见', '3:50', '全体演员'])
    print(f'已生成: {filepath}')


def generate_timecode_list():
    filepath = os.path.join(SAMPLE_DIR, '时码清单.txt')
    lines = [
        '时码清单 - 2024春季音乐会',
        '',
        '开场序曲      0:00.000',
        '春风十里      3:24.500',
        '夜空中最亮的星  7:45.500',
        '海阔天空      12:10.030',
        '中场过渡      16:30.750',
        '平凡之路      19:05.800',
        '再见          23:40.120',
        '',
        '备注：部分曲目时码有微调',
    ]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'已生成: {filepath}')


def generate_notes():
    filepath = os.path.join(SAMPLE_DIR, '现场备注.txt')
    lines = [
        '林姐口头备注：第二首歌吉他SOLO部分录音有点小问题，但是不影响整体使用',
        '',
        '口头备注：中场音乐可以再拉长5秒，给演员更多换装时间',
        '',
        '授权备注：平凡之路时码偏移半拍是故意安排的，用于配合舞台灯光效果，已确认通过',
        '',
        '授权备注：夜空中最亮的星时码偏差是前期彩排时的调整，已获得音乐总监同意',
    ]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'已生成: {filepath}')


def generate_authorization_note():
    filepath = os.path.join(SAMPLE_DIR, '授权补录.txt')
    lines = [
        '授权备注：海阔天空时码差30毫秒是正常误差范围，授权通过，计入最终清单',
    ]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f'已生成: {filepath}')


if __name__ == '__main__':
    generate_channel_table()
    generate_old_channel_table()
    generate_track_list()
    generate_timecode_list()
    generate_notes()
    generate_authorization_note()
    print()
    print(f'示例数据已全部生成到: {SAMPLE_DIR}')
    print('包含文件：')
    print('  1. 舞台通道表.csv          - 当前使用的通道表')
    print('  2. 舞台通道表_旧版.csv     - 旧版通道表（文件名含"旧版"会自动识别）')
    print('  3. 曲目表.csv              - 节目单曲目')
    print('  4. 时码清单.txt            - 时码记录')
    print('  5. 现场备注.txt            - 含口头备注和授权备注')
    print('  6. 授权补录.txt            - 单独的授权备注，可后补')
    print()
    print('预期效果：')
    print('  - "夜空中最亮的星" 时码差 0.27s → 时码偏差（警告，非通过）')
    print('  - "平凡之路" 时码差 0.5s   → 时码偏差（半拍级别，警告）')
    print('  - 旧版通道表数据            → 标记为"旧版数据"，不影响结论')
    print('  - 口头备注                  → 单独归类，可溯源')
    print('  - 授权备注                  → 将对应异常记录转为"已授权对齐"')
