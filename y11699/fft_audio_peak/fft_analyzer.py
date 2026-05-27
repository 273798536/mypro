"""FFT分析核心 - 窗口函数、频谱计算、峰值检测、噪声分桶、泄漏检测"""

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
from scipy.signal import find_peaks, get_window

from config import (
    DEFAULT_NFFT,
    DEFAULT_NOVERLAP,
    DEFAULT_WINDOW,
    NOISE_BUCKET_RANGES,
    PEAK_MIN_DISTANCE,
    PEAK_MIN_HEIGHT,
    SUPPORTED_WINDOWS,
    WINDOW_LEAKAGE_RATIO_THRESHOLD,
)


@dataclass
class PeakInfo:
    frequency_hz: float
    magnitude_db: float
    bin_index: int
    is_harmonic: bool
    harmonic_of: Optional[int]


@dataclass
class NoiseBucket:
    name: str
    range_hz: Tuple[float, float]
    avg_db: float
    max_db: float
    min_db: float
    peak_count: int
    energy_ratio: float


@dataclass
class LeakageInfo:
    detected: bool
    ratio: float
    threshold: float
    details: str
    recommended_window: str


@dataclass
class FFTAnalysisResult:
    frequencies: np.ndarray
    magnitude_db: np.ndarray
    peaks: List[PeakInfo]
    noise_buckets: List[NoiseBucket]
    window_type: str
    nfft: int
    sample_rate: int
    dominant_freq: float
    dominant_db: float
    noise_floor_db: float
    snr_db: float
    leakage: LeakageInfo
    anomalies: List[str]
    corrections: List[str]


def _apply_window(signal: np.ndarray, window_type: str) -> np.ndarray:
    """应用窗口函数，返回加窗后的信号"""
    if window_type not in SUPPORTED_WINDOWS:
        raise ValueError(
            f"不支持的窗口函数: {window_type}。可选: {SUPPORTED_WINDOWS}"
        )
    if window_type == "rect":
        return signal.copy()
    window = get_window(window_type, len(signal))
    return signal * window


def compute_spectrum(
    signal: np.ndarray,
    sample_rate: int,
    window_type: str = DEFAULT_WINDOW,
    nfft: int = DEFAULT_NFFT,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    计算单边幅度谱（dBFS）。

    返回 (频率数组, 幅度数组)
    """
    if len(signal) == 0:
        return np.array([]), np.array([])

    actual_nfft = min(nfft, len(signal))
    windowed = _apply_window(signal[:actual_nfft], window_type)
    spectrum = np.fft.rfft(windowed, n=actual_nfft)
    freqs = np.fft.rfftfreq(actual_nfft, d=1.0 / sample_rate)
    magnitude = np.abs(spectrum)

    if window_type == "rect":
        correction = 2.0 / actual_nfft
    elif window_type == "hann":
        correction = 2.0 / actual_nfft / 0.5
    elif window_type == "hamming":
        correction = 2.0 / actual_nfft / 0.54
    elif window_type == "blackman":
        correction = 2.0 / actual_nfft / 0.42
    elif window_type == "blackmanharris":
        correction = 2.0 / actual_nfft / 0.36
    else:
        correction = 2.0 / actual_nfft

    magnitude = magnitude * correction
    magnitude_db = np.where(
        magnitude > 1e-12, 20.0 * np.log10(magnitude), -200.0
    )
    return freqs, magnitude_db


def _detect_window_leakage(
    freqs: np.ndarray, magnitude_db: np.ndarray, window_type: str
) -> LeakageInfo:
    """检测频谱泄漏：通过分析主频附近能量集中度判断"""
    if len(magnitude_db) < 5:
        return LeakageInfo(
            detected=False,
            ratio=0.0,
            threshold=WINDOW_LEAKAGE_RATIO_THRESHOLD,
            details="频谱数据不足，无法检测泄漏",
            recommended_window=window_type,
        )

    peak_idx = int(np.argmax(magnitude_db))
    peak_mag = magnitude_db[peak_idx]
    if peak_mag < -60:
        return LeakageInfo(
            detected=False,
            ratio=0.0,
            threshold=WINDOW_LEAKAGE_RATIO_THRESHOLD,
            details="信号幅度过低，无法检测泄漏",
            recommended_window=window_type,
        )

    half_width = 10
    left = max(0, peak_idx - half_width)
    right = min(len(magnitude_db), peak_idx + half_width + 1)
    local_segment = magnitude_db[left:right]
    local_linear = 10 ** (local_segment / 20.0)
    total_local_energy = np.sum(local_linear)
    peak_linear = 10 ** (peak_mag / 20.0)
    concentration = peak_linear / total_local_energy if total_local_energy > 0 else 0

    expected_concentration = {
        "rect": 0.15,
        "hann": 0.35,
        "hamming": 0.40,
        "blackman": 0.25,
        "blackmanharris": 0.20,
        "triang": 0.30,
    }.get(window_type, 0.30)

    expected_width = {
        "rect": 2,
        "hann": 3,
        "hamming": 3,
        "blackman": 4,
        "blackmanharris": 4,
        "triang": 3,
    }.get(window_type, 3)

    below_3db = 0
    for j in range(peak_idx, min(len(magnitude_db), peak_idx + half_width + 1)):
        if magnitude_db[j] >= peak_mag - 3:
            below_3db += 1
        else:
            break
    for j in range(peak_idx - 1, max(-1, peak_idx - half_width - 1), -1):
        if magnitude_db[j] >= peak_mag - 3:
            below_3db += 1
        else:
            break

    ratio = below_3db / max(1, expected_width)
    detected = ratio > 1.8 or concentration < expected_concentration * 0.5

    details = (
        f"主峰-3dB宽度 {below_3db} 个bin（预期约 {expected_width} 个），"
        f"能量集中度 {concentration:.2%}（预期约 {expected_concentration:.0%}）。"
        + ("检测到频谱泄漏，信号未与窗口对齐或噪声较强。" if detected else "窗口泄漏在可接受范围内。")
    )

    better = window_type
    if detected:
        if window_type in ("rect", "hann", "hamming"):
            better = "blackmanharris" if concentration < 0.15 else "blackman"

    return LeakageInfo(
        detected=detected,
        ratio=ratio,
        threshold=1.8,
        details=details,
        recommended_window=better,
    )


def _find_peaks(
    freqs: np.ndarray,
    magnitude_db: np.ndarray,
    sample_rate: int,
    min_height_db: float,
    min_distance_hz: float,
) -> List[PeakInfo]:
    """检测频谱峰值并判断谐波关系"""
    if len(freqs) < 2:
        return []

    min_height_linear = 10 ** (min_height_db / 20.0)
    peak_indices, properties = find_peaks(
        magnitude_db,
        height=min_height_db,
        distance=max(1, int(min_distance_hz / (freqs[1] - freqs[0]))),
    )

    if len(peak_indices) == 0:
        return []

    peaks: List[PeakInfo] = []
    sorted_idx = np.argsort(magnitude_db[peak_indices])[::-1]

    for rank, pi in enumerate(peak_indices[sorted_idx]):
        freq = freqs[pi]
        mag = magnitude_db[pi]
        is_harmonic = False
        harmonic_of = None

        for pp in peaks:
            if pp.frequency_hz > 0:
                ratio = freq / pp.frequency_hz
                harmonic_num = round(ratio)
                if 1.5 <= harmonic_num <= 16 and abs(ratio - harmonic_num) < 0.05:
                    is_harmonic = True
                    harmonic_of = pp.frequency_hz
                    break

        peaks.append(
            PeakInfo(
                frequency_hz=freq,
                magnitude_db=mag,
                bin_index=int(pi),
                is_harmonic=is_harmonic,
                harmonic_of=harmonic_of,
            )
        )

    return peaks


def _analyze_noise_buckets(
    freqs: np.ndarray, magnitude_db: np.ndarray
) -> List[NoiseBucket]:
    """将频谱分桶分析噪声能量"""
    buckets: List[NoiseBucket] = []
    total_energy = np.sum(10 ** (magnitude_db / 20.0))

    for name, (low, high) in NOISE_BUCKET_RANGES.items():
        mask = (freqs >= low) & (freqs < high)
        if not np.any(mask):
            continue
        segment_db = magnitude_db[mask]
        segment_energy = np.sum(10 ** (segment_db / 20.0))
        energy_ratio = segment_energy / total_energy if total_energy > 0 else 0.0

        buckets.append(
            NoiseBucket(
                name=name,
                range_hz=(low, high),
                avg_db=float(np.mean(segment_db)),
                max_db=float(np.max(segment_db)),
                min_db=float(np.min(segment_db)),
                peak_count=int(np.sum(segment_db > np.median(segment_db))),
                energy_ratio=float(energy_ratio),
            )
        )

    return buckets


def analyze(
    signal: np.ndarray,
    sample_rate: int,
    window_type: str = DEFAULT_WINDOW,
    nfft: int = DEFAULT_NFFT,
    min_peak_height_db: float = PEAK_MIN_HEIGHT * 100,
    min_peak_distance_hz: float = 50.0,
    exclude_silent: bool = True,
    silent_segments: Optional[List[Tuple[float, float]]] = None,
) -> FFTAnalysisResult:
    """
    执行完整的FFT分析流程。

    参数:
        signal: 音频采样数据
        sample_rate: 采样率
        window_type: 窗口函数类型
        nfft: FFT点数
        min_peak_height_db: 峰值最小幅度（dBFS）
        min_peak_distance_hz: 峰值间最小频率间隔
        exclude_silent: 是否排除静音段
        silent_segments: 静音段列表
    """
    anomalies: List[str] = []
    corrections: List[str] = []

    if sample_rate <= 0:
        anomalies.append("采样率无效（<= 0），分析结果不可靠")
        sample_rate = 44100
        corrections.append(f"采样率修正为默认值 {sample_rate} Hz")

    if len(signal) == 0:
        anomalies.append("信号为空")
        return FFTAnalysisResult(
            frequencies=np.array([]),
            magnitude_db=np.array([]),
            peaks=[],
            noise_buckets=[],
            window_type=window_type,
            nfft=nfft,
            sample_rate=sample_rate,
            dominant_freq=0.0,
            dominant_db=-200.0,
            noise_floor_db=-200.0,
            snr_db=0.0,
            leakage=LeakageInfo(
                detected=False,
                ratio=0.0,
                threshold=WINDOW_LEAKAGE_RATIO_THRESHOLD,
                details="信号为空",
                recommended_window=window_type,
            ),
            anomalies=anomalies,
            corrections=corrections,
        )

    effective_signal = signal.copy()
    if exclude_silent and silent_segments:
        total_samples = len(effective_signal)
        for start_sec, end_sec in silent_segments:
            start_idx = int(start_sec * sample_rate)
            end_idx = int(end_sec * sample_rate)
            start_idx = max(0, min(start_idx, total_samples - 1))
            end_idx = max(start_idx + 1, min(end_idx, total_samples))
            effective_signal[start_idx:end_idx] = 0.0

    if np.max(np.abs(effective_signal)) < 1e-10:
        anomalies.append("有效信号幅度极低（接近静音），分析结果无意义")
        return FFTAnalysisResult(
            frequencies=np.array([0.0]),
            magnitude_db=np.array([-200.0]),
            peaks=[],
            noise_buckets=[],
            window_type=window_type,
            nfft=nfft,
            sample_rate=sample_rate,
            dominant_freq=0.0,
            dominant_db=-200.0,
            noise_floor_db=-200.0,
            snr_db=0.0,
            leakage=LeakageInfo(
                detected=False,
                ratio=0.0,
                threshold=WINDOW_LEAKAGE_RATIO_THRESHOLD,
                details="信号幅度过低",
                recommended_window=window_type,
            ),
            anomalies=anomalies,
            corrections=corrections,
        )

    if nfft > len(effective_signal):
        old_nfft = nfft
        nfft = len(effective_signal)
        corrections.append(f"FFT点数 {old_nfft} 超过信号长度，自动调整为 {nfft}")

    freqs, magnitude_db = compute_spectrum(
        effective_signal, sample_rate, window_type, nfft
    )

    leakage = _detect_window_leakage(freqs, magnitude_db, window_type)
    if leakage.detected:
        anomalies.append(
            f"检测到频谱泄漏（宽度比 {leakage.ratio:.2f}），"
            f"建议改用 '{leakage.recommended_window}' 窗口"
        )
        corrections.append(
            f"窗口函数建议: '{window_type}' → '{leakage.recommended_window}'"
        )

    peaks = _find_peaks(
        freqs, magnitude_db, sample_rate, min_peak_height_db, min_peak_distance_hz
    )

    if not peaks:
        anomalies.append("未检测到明显频谱峰值")
        noise_floor = float(np.median(magnitude_db))
        return FFTAnalysisResult(
            frequencies=freqs,
            magnitude_db=magnitude_db,
            peaks=[],
            noise_buckets=_analyze_noise_buckets(freqs, magnitude_db),
            window_type=window_type,
            nfft=nfft,
            sample_rate=sample_rate,
            dominant_freq=0.0,
            dominant_db=-200.0,
            noise_floor_db=noise_floor,
            snr_db=0.0,
            leakage=leakage,
            anomalies=anomalies,
            corrections=corrections,
        )

    dominant = peaks[0]
    noise_floor = float(np.median(magnitude_db))
    snr = dominant.magnitude_db - noise_floor

    if snr < 3.0:
        anomalies.append(
            f"信噪比极低（{snr:.1f} dB），主频可能不可靠"
        )

    result = FFTAnalysisResult(
        frequencies=freqs,
        magnitude_db=magnitude_db,
        peaks=peaks,
        noise_buckets=_analyze_noise_buckets(freqs, magnitude_db),
        window_type=window_type,
        nfft=nfft,
        sample_rate=sample_rate,
        dominant_freq=dominant.frequency_hz,
        dominant_db=dominant.magnitude_db,
        noise_floor_db=noise_floor,
        snr_db=snr,
        leakage=leakage,
        anomalies=anomalies,
        corrections=corrections,
    )

    return result


def format_anomalies(result: FFTAnalysisResult) -> str:
    """将异常和修正信息格式化为可读文本"""
    lines: List[str] = []
    if result.anomalies:
        lines.append("【异常警告】")
        for a in result.anomalies:
            lines.append(f"  ⚠ {a}")
    if result.corrections:
        lines.append("【自动修正】")
        for c in result.corrections:
            lines.append(f"  ✓ {c}")
    return "\n".join(lines) if lines else "（无异常）"
