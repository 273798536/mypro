"""音频读取模块 - 加载音频文件、检测采样率、识别静音片段"""

import os
import struct
import wave
import warnings
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import numpy as np


@dataclass
class AudioData:
    samples: np.ndarray
    sample_rate: int
    duration_sec: float
    file_path: str
    channels: int
    warnings: List[str] = field(default_factory=list)
    silent_segments: List[Tuple[float, float]] = field(default_factory=list)


def _read_wav_header(file_path: str) -> Optional[dict]:
    """从WAV文件头读取元数据，不依赖soundfile"""
    try:
        with open(file_path, "rb") as f:
            riff = f.read(4)
            if riff != b"RIFF":
                return None
            f.read(4)
            wave_tag = f.read(4)
            if wave_tag != b"WAVE":
                return None
            fmt_found = False
            info = {}
            while True:
                chunk_id = f.read(4)
                if len(chunk_id) < 4:
                    break
                chunk_size = struct.unpack("<I", f.read(4))[0]
                if chunk_id == b"fmt ":
                    audio_format = struct.unpack("<H", f.read(2))[0]
                    channels = struct.unpack("<H", f.read(2))[0]
                    sample_rate = struct.unpack("<I", f.read(4))[0]
                    byte_rate = struct.unpack("<I", f.read(4))[0]
                    block_align = struct.unpack("<H", f.read(2))[0]
                    bits_per_sample = struct.unpack("<H", f.read(2))[0]
                    info = {
                        "audio_format": audio_format,
                        "channels": channels,
                        "sample_rate": sample_rate,
                        "byte_rate": byte_rate,
                        "block_align": block_align,
                        "bits_per_sample": bits_per_sample,
                    }
                    fmt_found = True
                    if chunk_size > 16:
                        f.read(chunk_size - 16)
                elif chunk_id == b"data":
                    data_size = chunk_size
                    info["data_size"] = data_size
                    if fmt_found:
                        info["num_samples"] = data_size // (
                            info["channels"] * (info["bits_per_sample"] // 8)
                        )
                        info["duration"] = info["num_samples"] / info["sample_rate"]
                    break
                else:
                    f.read(chunk_size)
            return info if fmt_found else None
    except Exception:
        return None


def _detect_sample_rate(file_path: str) -> Optional[int]:
    """尝试从文件头检测采样率，用于缺少库时的降级"""
    header = _read_wav_header(file_path)
    if header:
        return header.get("sample_rate")
    return None


def _detect_silent_segments(
    samples: np.ndarray,
    sample_rate: int,
    threshold_db: float = -60.0,
    min_duration_sec: float = 0.1,
) -> List[Tuple[float, float]]:
    """检测静音片段，返回 [(开始秒, 结束秒), ...]"""
    if sample_rate <= 0:
        return []
    threshold_linear = 10 ** (threshold_db / 20.0)
    is_silent = np.abs(samples) < threshold_linear
    min_samples = int(min_duration_sec * sample_rate)
    segments = []
    in_silence = False
    start = 0
    for i in range(len(samples)):
        if is_silent[i] and not in_silence:
            in_silence = True
            start = i
        elif not is_silent[i] and in_silence:
            in_silence = False
            if (i - start) >= min_samples:
                segments.append((start / sample_rate, i / sample_rate))
    if in_silence and (len(samples) - start) >= min_samples:
        segments.append((start / sample_rate, len(samples) / sample_rate))
    return segments


def load_audio(
    file_path: str,
    sample_rate_hint: Optional[int] = None,
    silence_threshold_db: float = -60.0,
) -> AudioData:
    """
    加载音频文件并返回 AudioData。

    参数:
        file_path: 音频文件路径
        sample_rate_hint: 采样率提示（文件头缺失时使用）
        silence_threshold_db: 静音判定阈值（dBFS）
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"音频文件不存在: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()
    warnings_list: List[str] = []
    samples = None
    sr = None
    channels = 1

    try:
        import soundfile as sf

        data, sr = sf.read(file_path, always_2d=False)
        if data.ndim > 1:
            channels = data.shape[1]
            samples = data.mean(axis=1)
        else:
            channels = 1
            samples = data
    except ImportError:
        pass
    except Exception as e:
        warnings_list.append(f"soundfile读取失败: {e}，尝试用wave模块...")

    if samples is None:
        try:
            with wave.open(file_path, "rb") as wf:
                sr = wf.getframerate()
                channels = wf.getnchannels()
                nframes = wf.getnframes()
                sampwidth = wf.getsampwidth()
                raw = wf.readframes(nframes)
                dtype_map = {1: np.int8, 2: np.int16, 4: np.int32}
                dtype = dtype_map.get(sampwidth)
                if dtype is None:
                    raise ValueError(f"不支持的采样位宽: {sampwidth}")
                data = np.frombuffer(raw, dtype=dtype)
                if channels > 1:
                    data = data.reshape(-1, channels)
                    samples = data.mean(axis=1)
                else:
                    samples = data.astype(np.float64)
                max_val = float(np.iinfo(dtype).max)
                samples = samples / max_val
        except Exception as e2:
            header_info = _read_wav_header(file_path)
            if header_info:
                sr = header_info.get("sample_rate")
                warnings_list.append(
                    f"无法解码音频数据，但从文件头检测到采样率: {sr} Hz"
                )
            raise RuntimeError(
                f"无法读取音频文件 '{file_path}': {e2}。"
                f"请安装soundfile库或提供WAV格式文件。"
            ) from e2

    if sr is None:
        if sample_rate_hint:
            sr = sample_rate_hint
            warnings_list.append(
                f"无法从文件读取采样率，使用提示值: {sr} Hz"
            )
        else:
            header_sr = _detect_sample_rate(file_path)
            if header_sr:
                sr = header_sr
                warnings_list.append(
                    f"无法从文件读取采样率，从WAV头推断: {sr} Hz"
                )
            else:
                warnings_list.append(
                    "采样率缺失！请使用 --sample-rate 参数指定，结果可能不准确。"
                )
                sr = 44100

    if not np.issubdtype(samples.dtype, np.floating):
        samples = samples.astype(np.float64)

    if np.max(np.abs(samples)) > 1.0:
        samples = samples / np.max(np.abs(samples))

    duration = len(samples) / sr if sr > 0 else 0.0

    silent = _detect_silent_segments(samples, sr, silence_threshold_db)
    if silent:
        total_silent = sum(end - start for start, end in silent)
        pct = (total_silent / duration * 100) if duration > 0 else 0
        warnings_list.append(
            f"检测到 {len(silent)} 段静音，总时长 {total_silent:.2f}s "
            f"({pct:.1f}%)。静音段将从峰值分析中排除。"
        )

    return AudioData(
        samples=samples,
        sample_rate=sr,
        duration_sec=duration,
        file_path=file_path,
        channels=channels,
        warnings=warnings_list,
        silent_segments=silent,
    )
