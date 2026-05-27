"""生成测试音频并验证工具可用性"""

import os
import struct
import sys
import wave

import numpy as np

TEST_DIR = os.path.join(os.path.dirname(__file__), "test_data")


def generate_test_wav(
    path: str,
    sample_rate: int = 44100,
    duration_sec: float = 3.0,
    freqs=None,
    add_noise: bool = True,
    add_silence: bool = False,
):
    """生成测试WAV文件"""
    if freqs is None:
        freqs = [440.0, 880.0, 1320.0]

    t = np.linspace(0, duration_sec, int(sample_rate * duration_sec), endpoint=False)
    signal = np.zeros_like(t)
    for f in freqs:
        signal += np.sin(2 * np.pi * f * t)
    signal /= len(freqs)

    if add_noise:
        noise = np.random.normal(0, 0.02, len(t))
        signal += noise

    if add_silence:
        signal[int(1.0 * sample_rate):int(1.5 * sample_rate)] = 0
        signal[int(2.2 * sample_rate):int(2.5 * sample_rate)] = 0

    signal = signal / np.max(np.abs(signal)) * 0.9

    int_signal = (signal * 32767).astype(np.int16)

    with wave.open(path, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(int_signal.tobytes())

    return path


def main():
    os.makedirs(TEST_DIR, exist_ok=True)

    test_normal = os.path.join(TEST_DIR, "test_normal.wav")
    test_noisy = os.path.join(TEST_DIR, "test_noisy.wav")
    test_silent = os.path.join(TEST_DIR, "test_silent.wav")
    test_lowfreq = os.path.join(TEST_DIR, "test_lowfreq.wav")

    print("[生成] 标准测试音频 (440Hz + 880Hz + 1320Hz)...")
    generate_test_wav(test_normal, freqs=[440, 880, 1320], add_noise=True)

    print("[生成] 高噪声测试音频...")
    generate_test_wav(test_noisy, freqs=[440, 880], add_noise=True)

    print("[生成] 含静音段测试音频...")
    generate_test_wav(test_silent, freqs=[440, 880], add_noise=True, add_silence=True)

    print("[生成] 低频测试音频 (60Hz + 120Hz)...")
    generate_test_wav(test_lowfreq, freqs=[60, 120, 180], add_noise=False)

    python_bin = sys.executable or "python3"

    print("\n[测试1] 标准音频分析...")
    os.system(f'cd "{os.path.dirname(__file__)}" && {python_bin} main.py analyze "{test_normal}" --import-mode overwrite')

    print("\n" + "=" * 60)
    print("[测试2] 重复导入（ignore模式）...")
    os.system(f'cd "{os.path.dirname(__file__)}" && {python_bin} main.py analyze "{test_normal}" --import-mode ignore')

    print("\n" + "=" * 60)
    print("[测试3] 含静音段音频分析...")
    os.system(f'cd "{os.path.dirname(__file__)}" && {python_bin} main.py analyze "{test_silent}" --import-mode overwrite')

    print("\n" + "=" * 60)
    print("[测试4] 列出所有已分析文件...")
    os.system(f'cd "{os.path.dirname(__file__)}" && {python_bin} main.py list')

    print("\n" + "=" * 60)
    print("[测试5] 低频分析...")
    os.system(f'cd "{os.path.dirname(__file__)}" && {python_bin} main.py analyze "{test_lowfreq}" --import-mode overwrite')

    print("\n" + "=" * 60)
    print("[测试6] 验证报告文件...")
    results_dir = os.path.join(os.path.dirname(__file__), "results")
    if os.path.exists(results_dir):
        for f in sorted(os.listdir(results_dir)):
            size = os.path.getsize(os.path.join(results_dir, f))
            print(f"  {f:40s} {size:>8d} 字节")

    print("\n✓ 所有测试完成！")


if __name__ == "__main__":
    main()
