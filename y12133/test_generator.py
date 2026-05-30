import numpy as np
import librosa
import soundfile as sf
import os
from typing import Dict, Tuple
from report import run_full_analysis


def generate_melody_tone(frequency: float, duration: float, sr: int = 22050,
                        amplitude: float = 0.5, harmonic: bool = True) -> np.ndarray:
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)

    if harmonic:
        tone = amplitude * (
            np.sin(2 * np.pi * frequency * t) +
            0.5 * np.sin(2 * np.pi * 2 * frequency * t) +
            0.25 * np.sin(2 * np.pi * 3 * frequency * t) +
            0.125 * np.sin(2 * np.pi * 4 * frequency * t)
        )
    else:
        tone = amplitude * np.sin(2 * np.pi * frequency * t)

    envelope = np.ones_like(tone)
    attack_samples = int(0.01 * sr)
    release_samples = int(0.02 * sr)
    envelope[:attack_samples] = np.linspace(0, 1, attack_samples)
    envelope[-release_samples:] = np.linspace(1, 0, release_samples)

    return tone * envelope


def generate_test_melody(base_freq: float, duration: float, sr: int = 22050,
                        bpm: float = 120.0) -> np.ndarray:
    beat_duration = 60.0 / bpm
    num_beats = int(duration / beat_duration)

    scale_intervals = [0, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 0]

    audio = np.zeros(int(sr * duration))

    for i in range(num_beats):
        interval = scale_intervals[i % len(scale_intervals)]
        freq = base_freq * (2 ** (interval / 12))
        tone = generate_melody_tone(freq, beat_duration * 0.9, sr)

        start_sample = int(i * beat_duration * sr)
        end_sample = min(start_sample + len(tone), len(audio))
        tone_len = end_sample - start_sample
        audio[start_sample:end_sample] += tone[:tone_len]

    return audio


def add_drum_track(audio: np.ndarray, bpm: float, sr: int = 22050,
                   amplitude: float = 0.3) -> np.ndarray:
    beat_duration = 60.0 / bpm
    num_beats = int(len(audio) / sr / beat_duration)

    result = audio.copy()

    for i in range(num_beats):
        if i % 4 == 0:
            kick = generate_melody_tone(60, 0.15, sr, amplitude, harmonic=False)
            start_sample = int(i * beat_duration * sr)
            end_sample = min(start_sample + len(kick), len(result))
            result[start_sample:end_sample] += kick[:end_sample - start_sample] * amplitude

        if i % 2 == 1:
            snare_noise = np.random.randn(int(0.1 * sr)) * amplitude * 0.5
            snare_env = np.exp(-np.linspace(0, 5, len(snare_noise)))
            snare = snare_noise * snare_env
            start_sample = int(i * beat_duration * sr)
            end_sample = min(start_sample + len(snare), len(result))
            result[start_sample:end_sample] += snare[:end_sample - start_sample]

        hihat = generate_melody_tone(8000, 0.05, sr, amplitude * 0.3, harmonic=False)
        start_sample = int((i + 0.5) * beat_duration * sr)
        end_sample = min(start_sample + len(hihat), len(result))
        result[start_sample:end_sample] += hihat[:end_sample - start_sample]

    return result


def generate_original_audio(output_dir: str, sr: int = 22050,
                            duration: float = 10.0, bpm: float = 120.0,
                            base_freq: float = 440.0) -> Tuple[str, np.ndarray]:
    os.makedirs(output_dir, exist_ok=True)

    melody = generate_test_melody(base_freq, duration, sr, bpm)
    full_audio = add_drum_track(melody, bpm, sr)

    full_audio = full_audio / np.max(np.abs(full_audio)) * 0.9

    file_path = os.path.join(output_dir, 'original.wav')
    sf.write(file_path, full_audio, sr)

    return file_path, full_audio


def generate_speed_changed(original: np.ndarray, sr: int, output_dir: str,
                           speed_factor: float = 1.2) -> str:
    os.makedirs(output_dir, exist_ok=True)

    y_stretched = librosa.effects.time_stretch(original, rate=speed_factor)
    y_stretched = y_stretched / np.max(np.abs(y_stretched)) * 0.9

    file_path = os.path.join(output_dir, f'speed_changed_{speed_factor:.2f}x.wav')
    sf.write(file_path, y_stretched, sr)

    return file_path


def generate_transposed(original: np.ndarray, sr: int, output_dir: str,
                        semitone_shift: int = 3) -> str:
    os.makedirs(output_dir, exist_ok=True)

    y_shifted = librosa.effects.pitch_shift(original, sr=sr, n_steps=semitone_shift)
    y_shifted = y_shifted / np.max(np.abs(y_shifted)) * 0.9

    file_path = os.path.join(output_dir, f'transposed_{semitone_shift:+d}semitones.wav')
    sf.write(file_path, y_shifted, sr)

    return file_path


def generate_both_changed(original: np.ndarray, sr: int, output_dir: str,
                          speed_factor: float = 1.15,
                          semitone_shift: int = -2) -> str:
    os.makedirs(output_dir, exist_ok=True)

    y_processed = librosa.effects.time_stretch(original, rate=speed_factor)
    y_processed = librosa.effects.pitch_shift(y_processed, sr=sr, n_steps=semitone_shift)
    y_processed = y_processed / np.max(np.abs(y_processed)) * 0.9

    file_path = os.path.join(output_dir, f'both_changed_speed{speed_factor:.2f}x_pitch{semitone_shift:+d}.wav')
    sf.write(file_path, y_processed, sr)

    return file_path


def generate_different_audio(output_dir: str, sr: int = 22050,
                             duration: float = 10.0, bpm: float = 100.0,
                             base_freq: float = 330.0) -> str:
    os.makedirs(output_dir, exist_ok=True)

    scale_intervals = [0, 3, 5, 7, 10, 12, 10, 7, 5, 3, 0, -2, 0]
    beat_duration = 60.0 / bpm
    num_beats = int(duration / beat_duration)

    audio = np.zeros(int(sr * duration))

    for i in range(num_beats):
        interval = scale_intervals[i % len(scale_intervals)]
        freq = base_freq * (2 ** (interval / 12))
        tone = generate_melody_tone(freq, beat_duration * 0.85, sr, amplitude=0.6)

        start_sample = int(i * beat_duration * sr)
        end_sample = min(start_sample + len(tone), len(audio))
        tone_len = end_sample - start_sample
        audio[start_sample:end_sample] += tone[:tone_len]

    audio = add_drum_track(audio, bpm, sr, amplitude=0.25)
    audio = audio / np.max(np.abs(audio)) * 0.9

    file_path = os.path.join(output_dir, 'different_audio.wav')
    sf.write(file_path, audio, sr)

    return file_path


def generate_all_test_cases(base_output_dir: str) -> Dict[str, Tuple[str, str]]:
    test_data_dir = os.path.join(base_output_dir, 'test_audio')
    os.makedirs(test_data_dir, exist_ok=True)

    print(f"🎵 生成测试音频数据至: {test_data_dir}\n")

    original_path, original_audio = generate_original_audio(test_data_dir)
    sr = 22050

    same_path = os.path.join(test_data_dir, 'original_copy.wav')
    sf.write(same_path, original_audio, sr)

    speed_path = generate_speed_changed(original_audio, sr, test_data_dir, speed_factor=1.2)
    transpose_path = generate_transposed(original_audio, sr, test_data_dir, semitone_shift=3)
    both_path = generate_both_changed(original_audio, sr, test_data_dir, speed_factor=1.15, semitone_shift=-2)
    different_path = generate_different_audio(test_data_dir)

    test_cases = {
        'same': (original_path, same_path),
        'speed': (original_path, speed_path),
        'transpose': (original_path, transpose_path),
        'both': (original_path, both_path),
        'different': (original_path, different_path)
    }

    print("✅ 测试音频生成完成:")
    for name, (f1, f2) in test_cases.items():
        print(f"  [{name}] {os.path.basename(f1)} vs {os.path.basename(f2)}")

    return test_cases


def run_test_case(case_name: str, file1: str, file2: str, output_dir: str,
                  expected_results: Dict) -> Dict:
    case_output = os.path.join(output_dir, f'case_{case_name}')

    print(f"\n{'='*70}")
    print(f"🧪 运行测试用例: {case_name.upper()}")
    print(f"{'='*70}")
    print(f"  预期: {expected_results['description']}")
    print(f"  文件1: {os.path.basename(file1)}")
    print(f"  文件2: {os.path.basename(file2)}")
    print()

    report = run_full_analysis(file1, file2, case_output)

    actual_results = {
        'overall_similarity': report['similarity']['overall'],
        'speed_detected': report['anomaly_detection']['speed_change']['is_speed_changed'],
        'transpose_detected': report['anomaly_detection']['transposition']['is_transposed'],
        'risk_level': report['verdict']['risk_level'],
        'risk_score': report['verdict']['risk_score'],
        'matched_segments_count': len(report['matched_segments']),
        'needs_manual_review': report['verdict']['needs_manual_review']
    }

    passed = True
    failures = []

    for key, expected in expected_results['checks'].items():
        actual = actual_results.get(key)
        if isinstance(expected, bool):
            check_passed = actual == expected
        elif isinstance(expected, str):
            check_passed = expected in str(actual)
        elif isinstance(expected, (int, float)):
            if expected > 0:
                check_passed = actual >= expected
            else:
                check_passed = actual <= expected
        else:
            check_passed = True

        if not check_passed:
            passed = False
            failures.append(f"    ❌ {key}: 期望 {expected}, 实际 {actual}")
        else:
            print(f"    ✓ {key}: {actual} (期望 {expected})")

    result = {
        'case_name': case_name,
        'passed': passed,
        'expected': expected_results,
        'actual': actual_results,
        'failures': failures,
        'report': report
    }

    print(f"\n  结果: {'✅ 通过' if passed else '❌ 失败'}")
    if failures:
        for f in failures:
            print(f)

    return result


def run_all_tests(output_dir: str = './test_output', specific_case: str = None):
    test_cases = generate_all_test_cases(output_dir)

    expected = {
        'same': {
            'description': '完全相同的音频，应检测到极高相似度，无异常',
            'checks': {
                'overall_similarity': 0.9,
                'speed_detected': False,
                'transpose_detected': False,
                'risk_level': 'HIGH_RISK',
                'matched_segments_count': 1
            }
        },
        'speed': {
            'description': '仅变速处理，应检测到变速异常和高相似度',
            'checks': {
                'overall_similarity': 0.7,
                'speed_detected': True,
                'transpose_detected': False,
                'risk_level': 'HIGH_RISK',
                'matched_segments_count': 1
            }
        },
        'transpose': {
            'description': '仅移调处理，应检测到移调异常和高相似度',
            'checks': {
                'overall_similarity': 0.7,
                'speed_detected': False,
                'transpose_detected': True,
                'risk_level': 'HIGH_RISK',
                'matched_segments_count': 1
            }
        },
        'both': {
            'description': '同时变速+移调，应检测到两种异常和高相似度',
            'checks': {
                'overall_similarity': 0.6,
                'speed_detected': True,
                'transpose_detected': True,
                'risk_level': 'MEDIUM_RISK',
                'matched_segments_count': 1
            }
        },
        'different': {
            'description': '完全不同的音频，应检测到低相似度，无异常',
            'checks': {
                'overall_similarity': -1.0,
                'speed_detected': False,
                'transpose_detected': False,
                'risk_level': 'NO_RISK',
                'matched_segments_count': 0
            }
        }
    }

    cases_to_run = [specific_case] if specific_case else list(test_cases.keys())

    print(f"\n{'#'*70}")
    print("# 开始运行端到端测试")
    print(f"{'#'*70}\n")

    results = []
    for case in cases_to_run:
        if case in test_cases and case in expected:
            f1, f2 = test_cases[case]
            result = run_test_case(case, f1, f2, output_dir, expected[case])
            results.append(result)

    print(f"\n{'#'*70}")
    print("# 测试汇总")
    print(f"{'#'*70}\n")

    passed_count = sum(1 for r in results if r['passed'])
    total_count = len(results)

    for r in results:
        status = '✅' if r['passed'] else '❌'
        print(f"  {status} {r['case_name']:<10} - 相似度: {r['actual']['overall_similarity']:.3f} | "
              f"风险: {r['actual']['risk_level']:<15} | "
              f"变速: {'⚠️' if r['actual']['speed_detected'] else '✓'} | "
              f"移调: {'⚠️' if r['actual']['transpose_detected'] else '✓'}")

    print(f"\n  总计: {passed_count}/{total_count} 测试通过")

    if passed_count == total_count:
        print("\n🎉 所有测试通过！系统运行正常。")
    else:
        print(f"\n⚠️  有 {total_count - passed_count} 个测试失败，请检查。")

    print(f"\n📁 所有测试结果已保存至: {os.path.abspath(output_dir)}")

    return results


if __name__ == '__main__':
    import sys
    output_dir = sys.argv[1] if len(sys.argv) > 1 else './test_output'
    specific_case = sys.argv[2] if len(sys.argv) > 2 else None
    run_all_tests(output_dir, specific_case)
