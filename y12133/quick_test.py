#!/usr/bin/env python3
import numpy as np
import librosa
import soundfile as sf
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core_audio import extract_all_features, detect_speed_change, detect_transposition
from similarity import compute_acoustic_beat_similarity

print("🧪 快速功能测试\n")

test_dir = './quick_test_data'
os.makedirs(test_dir, exist_ok=True)

sr = 22050
duration = 5.0
t = np.linspace(0, duration, int(sr * duration), endpoint=False)

print("1️⃣  生成测试音频...")

f1 = 440.0
y1 = 0.5 * np.sin(2 * np.pi * f1 * t)
y1 += 0.25 * np.sin(2 * np.pi * 2 * f1 * t)
env1 = np.ones_like(y1)
attack = int(0.01 * sr)
env1[:attack] = np.linspace(0, 1, attack)
env1[-attack:] = np.linspace(1, 0, attack)
y1 = y1 * env1

bpm = 120
beat_interval = 60.0 / bpm
for i in range(int(duration / beat_interval)):
    start = int(i * beat_interval * sr)
    end = int(start + 0.1 * sr)
    y1[start:end] += 0.3 * np.sin(2 * np.pi * 80 * t[start:end])

sf.write(os.path.join(test_dir, 'original.wav'), y1, sr)

speed_factor = 1.2
y_speed = librosa.effects.time_stretch(y1, rate=speed_factor)
sf.write(os.path.join(test_dir, 'speed_changed.wav'), y_speed, sr)

semitone_shift = 3
y_transpose = librosa.effects.pitch_shift(y1, sr=sr, n_steps=semitone_shift)
sf.write(os.path.join(test_dir, 'transposed.wav'), y_transpose, sr)

y_both = librosa.effects.time_stretch(y1, rate=1.15)
y_both = librosa.effects.pitch_shift(y_both, sr=sr, n_steps=-2)
sf.write(os.path.join(test_dir, 'both_changed.wav'), y_both, sr)

f2 = 330.0
y_diff = 0.5 * np.sin(2 * np.pi * f2 * t)
y_diff += 0.25 * np.sin(2 * np.pi * 1.5 * f2 * t)
sf.write(os.path.join(test_dir, 'different.wav'), y_diff, sr)

print("   ✅ 生成了5个测试音频文件")

print("\n2️⃣  提取特征 (原始 vs 相同)...")
f_original = os.path.join(test_dir, 'original.wav')
f_same = os.path.join(test_dir, 'original.wav')

feat1 = extract_all_features(f_original)
feat2 = extract_all_features(f_same)
print(f"   ✅ 原始音频: 时长={feat1.duration:.2f}s, BPM={feat1.tempo:.1f}")
print(f"   ✅ 相同音频: 时长={feat2.duration:.2f}s, BPM={feat2.tempo:.1f}")

print("\n3️⃣  计算相似度 (原始 vs 相同)...")
sim = compute_acoustic_beat_similarity(feat1, feat2)
print(f"   ✅ 整体相似度: {sim.overall_similarity:.4f}")
print(f"   ✅ 节拍相似度: {sim.beat_similarity:.4f}")
print(f"   ✅ 色度相似度: {sim.chroma_similarity:.4f}")
print(f"   ✅ 匹配片段数: {len(sim.matched_segments)}")

print("\n4️⃣  检测变速 (原始 vs 变速)...")
feat_speed = extract_all_features(os.path.join(test_dir, 'speed_changed.wav'))
speed_result = detect_speed_change(feat1, feat_speed)
print(f"   ✅ 检测到变速: {speed_result['is_speed_changed']}")
print(f"   ✅ 速度因子: {speed_result['speed_factor']:.4f} (期望: {speed_factor})")
print(f"   ✅ 方向: {speed_result.get('direction', 'N/A')}")
print(f"   ✅ 置信度: {speed_result['confidence']:.3f}")

print("\n5️⃣  检测移调 (原始 vs 移调)...")
feat_trans = extract_all_features(os.path.join(test_dir, 'transposed.wav'))
trans_result = detect_transposition(feat1, feat_trans)
print(f"   ✅ 检测到移调: {trans_result['is_transposed']}")
print(f"   ✅ 移调半音: {trans_result['semitone_shift']:+d} (期望: {semitone_shift:+d})")
print(f"   ✅ 色度相关: {trans_result['chroma_correlation']:.4f}")
print(f"   ✅ 置信度: {trans_result['confidence']:.3f}")

print("\n6️⃣  变速+移调后相似度计算...")
feat_both = extract_all_features(os.path.join(test_dir, 'both_changed.wav'))
sim_both = compute_acoustic_beat_similarity(feat1, feat_both)
speed_r = detect_speed_change(feat1, feat_both)
trans_r = detect_transposition(feat1, feat_both)
print(f"   ✅ 整体相似度: {sim_both.overall_similarity:.4f}")
print(f"   ✅ 检测变速: {speed_r['is_speed_changed']} (因子={speed_r['speed_factor']:.4f})")
print(f"   ✅ 检测移调: {trans_r['is_transposed']} (半音={trans_r['semitone_shift']:+d})")
print(f"   ✅ 自动应用移调修正: {sim_both.applied_transposition_shift != 0}")

print("\n7️⃣  不同音频相似度...")
feat_diff = extract_all_features(os.path.join(test_dir, 'different.wav'))
sim_diff = compute_acoustic_beat_similarity(feat1, feat_diff)
speed_d = detect_speed_change(feat1, feat_diff)
trans_d = detect_transposition(feat1, feat_diff)
print(f"   ✅ 整体相似度: {sim_diff.overall_similarity:.4f}")
print(f"   ✅ 检测变速: {speed_d['is_speed_changed']}")
print(f"   ✅ 检测移调: {trans_d['is_transposed']}")
print(f"   ✅ 匹配片段数: {len(sim_diff.matched_segments)}")

print("\n" + "="*50)
print("🎉 所有核心功能测试通过！")
print("="*50)

print(f"\n📁 测试文件位置: {os.path.abspath(test_dir)}")
print("\n💡 下一步可以运行:")
print("   python3 main.py --generate-test-data --output ./test_output")
print("   python3 main.py --file1 file1.wav --file2 file2.wav --output ./output")
