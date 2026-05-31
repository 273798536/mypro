#!/usr/bin/env python3
import os
import numpy as np
from pydub import AudioSegment
from pydub.generators import Sine, WhiteNoise


def generate_silence(duration_ms: int) -> AudioSegment:
    return AudioSegment.silent(duration=duration_ms)


def generate_voice(duration_ms: int, base_db: float = -20.0) -> AudioSegment:
    freq = np.random.uniform(100, 300)
    tone = Sine(freq).to_audio_segment(duration=duration_ms)
    noise = WhiteNoise().to_audio_segment(duration=duration_ms)
    voice = tone.overlay(noise - 20)
    voice = voice - (voice.dBFS - base_db)
    return voice


def generate_music(duration_ms: int, base_db: float = -15.0) -> AudioSegment:
    segment = AudioSegment.empty()
    remaining = duration_ms
    while remaining > 0:
        seg_duration = min(remaining, 500)
        freq = np.random.uniform(200, 800)
        tone = Sine(freq).to_audio_segment(duration=seg_duration)
        segment += tone
        remaining -= seg_duration
    segment = segment - (segment.dBFS - base_db)
    return segment


def generate_loud_music(duration_ms: int, base_db: float = -10.0) -> AudioSegment:
    return generate_music(duration_ms, base_db=base_db)


def generate_normal_podcast() -> AudioSegment:
    segments = [
        generate_voice(3000, -20),
        generate_silence(300),
        generate_voice(5000, -20),
        generate_music(2000, -25),
        generate_voice(4000, -20),
        generate_silence(200),
        generate_voice(3000, -20),
    ]
    result = AudioSegment.empty()
    for seg in segments:
        result += seg
    return result


def generate_dirty_sample_with_silence() -> AudioSegment:
    segments = [
        generate_voice(2000, -20),
        generate_silence(2500),
        generate_voice(3000, -20),
        generate_silence(800),
        generate_voice(2000, -20),
        generate_silence(1500),
        generate_voice(4000, -20),
    ]
    result = AudioSegment.empty()
    for seg in segments:
        result += seg
    return result


def generate_loud_music_sample() -> AudioSegment:
    segments = [
        generate_voice(2000, -20),
        generate_loud_music(3000, -10),
        generate_voice(2000, -20),
        generate_music(2000, -22),
        generate_voice(3000, -20),
        generate_loud_music(2500, -8),
        generate_voice(2000, -20),
    ]
    result = AudioSegment.empty()
    for seg in segments:
        result += seg
    return result


def generate_ad_missing_label_sample() -> AudioSegment:
    segments = [
        generate_voice(2000, -20),
        generate_music(3000, -12),
        generate_voice(2000, -20),
        generate_voice(3000, -18),
        generate_music(2000, -22),
        generate_voice(2000, -20),
    ]
    result = AudioSegment.empty()
    for seg in segments:
        result += seg
    return result


def generate_normal_markers(file_path: str) -> None:
    content = """1
00:00:00,000 --> 00:00:03,000
开场白

2
00:00:03,300 --> 00:00:08,300
话题介绍

3
00:00:08,300 --> 00:00:10,300
背景音乐

4
00:00:10,300 --> 00:00:14,300
主要内容

5
00:00:14,500 --> 00:00:17,500
结束语
"""
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)


def generate_dirty_markers(file_path: str) -> None:
    content = """1
00:00:00,000 --> 00:00:02,000
开始说话

2
00:00:02,000 --> 00:00:04,500
[静音] 这里可能需要剪辑

3
00:00:04,500 --> 00:00:07,500
继续说话

4
00:00:07,500 --> 00:00:08,300
短暂停顿

5
00:00:08,300 --> 00:00:10,300
说话中

6
00:00:10,300 --> 00:00:11,800
[静音] 呼吸停顿

7
00:00:11,800 --> 00:00:15,800
继续说话
"""
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)


def generate_loud_music_markers(file_path: str) -> None:
    content = """start,end,label,type
00:00:00,00:00:02,开场,voice
00:00:02,00:00:05,主题音乐,music
00:00:05,00:00:07,主持人介绍,voice
00:00:07,00:00:09,过渡音乐,music
00:00:09,00:00:12,正文,voice
00:00:12,00:00:14.5,结尾音乐,music
00:00:14.5,00:00:16.5,收尾,voice
"""
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)


def generate_ad_missing_markers(file_path: str) -> None:
    content = """00:00:00 - 00:00:02 开场
00:00:02 - 00:00:05 广告赞助商 - 这里是广告但电平像人声
00:00:05 - 00:00:07 继续节目
00:00:07 - 00:00:10 广告 - 这也是广告
00:00:10 - 00:00:12 过渡
00:00:12 - 00:00:14 正常内容
"""
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)


def generate_existing_report(file_path: str) -> None:
    content = """# 上次检查报告

## 文件: dirty_sample.wav
- 时长: 15.8秒
- 问题: 发现3处静音段

## 文件: loud_music_sample.wav
- 时长: 14.5秒
- 问题: 发现2处配乐过响

## 修正历史
- 2024-05-30: 将dirty_sample.wav中00:00:02-00:00:04.5标记为需要剪辑
"""
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)


def main():
    samples_dir = os.path.join(os.path.dirname(__file__), "samples")
    os.makedirs(samples_dir, exist_ok=True)

    print("正在生成测试音频样例...")

    normal_audio = generate_normal_podcast()
    normal_path = os.path.join(samples_dir, "normal_podcast.wav")
    normal_audio.export(normal_path, format="wav")
    print(f"  ✓ 生成正常记录: {normal_path}")

    dirty_audio = generate_dirty_sample_with_silence()
    dirty_path = os.path.join(samples_dir, "dirty_sample.wav")
    dirty_audio.export(dirty_path, format="wav")
    print(f"  ✓ 生成人声静音脏样例: {dirty_path}")

    loud_audio = generate_loud_music_sample()
    loud_path = os.path.join(samples_dir, "loud_music_sample.wav")
    loud_audio.export(loud_path, format="wav")
    print(f"  ✓ 生成配乐过响样例: {loud_path}")

    ad_missing_audio = generate_ad_missing_label_sample()
    ad_missing_path = os.path.join(samples_dir, "ad_missing_sample.wav")
    ad_missing_audio.export(ad_missing_path, format="wav")
    print(f"  ✓ 生成广告段漏标样例: {ad_missing_path}")

    print("\n正在生成时间段标记文件...")

    normal_srt = os.path.join(samples_dir, "normal_podcast.srt")
    generate_normal_markers(normal_srt)
    print(f"  ✓ 生成正常记录标记: {normal_srt}")

    dirty_srt = os.path.join(samples_dir, "dirty_sample.srt")
    generate_dirty_markers(dirty_srt)
    print(f"  ✓ 生成静音样例标记: {dirty_srt}")

    loud_csv = os.path.join(samples_dir, "loud_music_sample.csv")
    generate_loud_music_markers(loud_csv)
    print(f"  ✓ 生成配乐过响标记: {loud_csv}")

    ad_missing_txt = os.path.join(samples_dir, "ad_missing_sample.txt")
    generate_ad_missing_markers(ad_missing_txt)
    print(f"  ✓ 生成广告漏标标记: {ad_missing_txt}")

    old_report = os.path.join(samples_dir, "previous_report.md")
    generate_existing_report(old_report)
    print(f"  ✓ 生成旧检查报告: {old_report}")

    print(f"\n所有测试样例已生成到: {samples_dir}")
    print("\n样例说明:")
    print("  1. normal_podcast.wav - 正常记录, 无明显问题")
    print("  2. dirty_sample.wav - 人声静音脏样例, 包含多处超过2秒的静音")
    print("  3. loud_music_sample.wav - 配乐过响样例, 包含比人声高10dB的配乐")
    print("  4. ad_missing_sample.wav - 广告段漏标样例, 有人声电平的广告段未被标记")
    print("\n标记文件格式:")
    print("  - SRT格式 (normal_podcast.srt, dirty_sample.srt)")
    print("  - CSV格式 (loud_music_sample.csv)")
    print("  - TXT格式 (ad_missing_sample.txt)")
    print("\n运行命令:")
    print(f"  python -m podcast_level_checker.cli --input {samples_dir} --output ./output")


if __name__ == "__main__":
    main()
