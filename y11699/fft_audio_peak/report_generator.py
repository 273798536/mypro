"""报告与图表输出 - JSON报告、频谱图、重复导入策略"""

import json
import os
import time
from dataclasses import asdict, dataclass, field
from typing import Dict, List, Optional

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from audio_reader import AudioData
from config import RESULTS_DIR, STATE_FILE, REPORT_META
from fft_analyzer import FFTAnalysisResult


@dataclass
class AnalysisState:
    analyzed_files: Dict[str, dict] = field(default_factory=dict)


def _load_state() -> AnalysisState:
    """加载分析状态文件"""
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return AnalysisState(analyzed_files=data.get("analyzed_files", {}))
        except (json.JSONDecodeError, KeyError):
            pass
    return AnalysisState()


def _save_state(state: AnalysisState):
    """保存分析状态"""
    os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(asdict(state), f, ensure_ascii=False, indent=2)


def check_duplicate(file_path: str) -> Optional[dict]:
    """
    检查文件是否已被分析过。

    返回已存在的分析记录（含时间戳、摘要），若不存在返回 None。
    """
    state = _load_state()
    abs_path = os.path.abspath(file_path)
    return state.analyzed_files.get(abs_path)


def record_analysis(file_path: str, summary: dict):
    """记录分析结果到状态文件"""
    state = _load_state()
    abs_path = os.path.abspath(file_path)
    state.analyzed_files[abs_path] = summary
    _save_state(state)


def remove_record(file_path: str):
    """从状态文件中移除某条记录（覆盖模式用）"""
    state = _load_state()
    abs_path = os.path.abspath(file_path)
    state.analyzed_files.pop(abs_path, None)
    _save_state(state)


def _to_python(obj):
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj


def _result_to_dict(
    audio: AudioData, result: FFTAnalysisResult, timestamp: str
) -> dict:
    """将分析结果转换为可序列化的字典"""
    peaks_data = []
    for p in result.peaks[:20]:
        peaks_data.append(
            {
                "frequency_hz": round(p.frequency_hz, 2),
                "magnitude_db": round(p.magnitude_db, 2),
                "is_harmonic": p.is_harmonic,
                "harmonic_of": round(p.harmonic_of, 2) if p.harmonic_of else None,
            }
        )

    buckets_data = []
    for b in result.noise_buckets:
        buckets_data.append(
            {
                "name": b.name,
                "range_hz": list(b.range_hz),
                "avg_db": round(b.avg_db, 2),
                "max_db": round(b.max_db, 2),
                "min_db": round(b.min_db, 2),
                "peak_count": b.peak_count,
                "energy_ratio": round(b.energy_ratio, 4),
            }
        )

    return {
        "meta": {
            **REPORT_META,
            "timestamp": timestamp,
            "source_file": audio.file_path,
            "source_basename": os.path.basename(audio.file_path),
        },
        "input": {
            "sample_rate": audio.sample_rate,
            "duration_sec": round(audio.duration_sec, 3),
            "channels": audio.channels,
            "samples_count": len(audio.samples),
        },
        "analysis": {
            "window_type": result.window_type,
            "nfft": result.nfft,
            "dominant_frequency_hz": round(result.dominant_freq, 2),
            "dominant_magnitude_db": round(result.dominant_db, 2),
            "noise_floor_db": round(result.noise_floor_db, 2),
            "snr_db": round(result.snr_db, 2),
            "peaks_detected": len(result.peaks),
            "peaks": peaks_data,
            "noise_buckets": buckets_data,
        },
        "leakage": {
            "detected": result.leakage.detected,
            "ratio": round(result.leakage.ratio, 4),
            "threshold": result.leakage.threshold,
            "details": result.leakage.details,
            "recommended_window": result.leakage.recommended_window,
        },
        "anomalies": result.anomalies,
        "corrections": result.corrections,
        "warnings": audio.warnings,
        "silent_segments": [
            {"start": round(s, 3), "end": round(e, 3)}
            for s, e in audio.silent_segments
        ],
    }


def generate_report(
    audio: AudioData,
    result: FFTAnalysisResult,
    output_dir: str,
    import_mode: str = "ignore",
) -> dict:
    """
    生成JSON报告和图表。

    import_mode: 'ignore' | 'overwrite' | 'append'
        - ignore: 如果已存在则跳过
        - overwrite: 覆盖已有结果
        - append: 保留历史，文件名加时间戳
    """
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    base_name = os.path.splitext(os.path.basename(audio.file_path))[0]

    existing = check_duplicate(audio.file_path)

    if existing and import_mode == "ignore":
        print(
            f"[跳过] 文件已分析: {audio.file_path} "
            f"(上次分析: {existing.get('timestamp', '未知')})"
        )
        return {"status": "skipped", "existing": existing}

    if existing and import_mode == "append":
        base_name = f"{base_name}_{timestamp}"

    os.makedirs(output_dir, exist_ok=True)

    json_path = os.path.join(output_dir, f"{base_name}_report.json")
    report_data = _result_to_dict(audio, result, timestamp)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report_data, f, ensure_ascii=False, indent=2, default=_to_python)

    _generate_spectrum_chart(result, audio, output_dir, base_name)
    _generate_noise_chart(result, output_dir, base_name)

    summary = {
        "timestamp": timestamp,
        "dominant_freq": round(result.dominant_freq, 2),
        "peaks_count": len(result.peaks),
        "report_path": json_path,
        "has_anomalies": len(result.anomalies) > 0,
    }

    if existing and import_mode == "overwrite":
        remove_record(audio.file_path)

    record_analysis(audio.file_path, summary)

    print(f"[完成] 报告已生成: {json_path}")
    print(f"[完成] 图表已生成: {output_dir}/")

    return {"status": "success", "report": report_data, "summary": summary}


def _generate_spectrum_chart(
    result: FFTAnalysisResult,
    audio: AudioData,
    output_dir: str,
    base_name: str,
):
    """生成频谱图"""
    if len(result.frequencies) == 0:
        return

    fig, ax = plt.subplots(figsize=(14, 6))

    ax.plot(
        result.frequencies,
        result.magnitude_db,
        color="#3498db",
        linewidth=0.6,
        alpha=0.8,
        label="Spectrum",
    )

    ax.axhline(
        y=result.noise_floor_db,
        color="#e67e22",
        linestyle="--",
        linewidth=1.0,
        alpha=0.8,
        label=f"Noise Floor ({result.noise_floor_db:.1f} dB)",
    )

    if result.dominant_freq > 0:
        ax.axvline(
            x=result.dominant_freq,
            color="#e74c3c",
            linestyle="-",
            linewidth=1.5,
            alpha=0.9,
            label=f"Dominant {result.dominant_freq:.1f} Hz ({result.dominant_db:.1f} dB)",
        )

    for p in result.peaks[:10]:
        marker = "o" if not p.is_harmonic else "s"
        color = "#27ae60" if p.is_harmonic else "#e74c3c"
        ax.plot(
            p.frequency_hz,
            p.magnitude_db,
            marker=marker,
            color=color,
            markersize=5,
            alpha=0.8,
            markeredgewidth=0.5,
            markeredgecolor="black",
        )

    for start, end in audio.silent_segments:
        ax.axvspan(
            start * 1,
            end * 1,
            alpha=0.1,
            color="gray",
        )

    ax.set_xlabel("Frequency (Hz)", fontsize=12)
    ax.set_ylabel("Magnitude (dBFS)", fontsize=12)
    ax.set_title(
        f"FFT Spectrum - {os.path.basename(audio.file_path)} "
        f"({result.window_type} window, {result.nfft} pts)",
        fontsize=13,
    )
    ax.legend(loc="upper right", fontsize=9)
    ax.grid(True, alpha=0.3)
    ax.set_xlim(0, min(result.frequencies[-1] if len(result.frequencies) > 0 else 20000, 20000))
    ax.set_ylim(
        max(-100, min(result.magnitude_db) - 10),
        max(result.magnitude_db) + 5 if len(result.magnitude_db) > 0 else 0,
    )

    plt.tight_layout()
    chart_path = os.path.join(output_dir, f"{base_name}_spectrum.png")
    fig.savefig(chart_path, dpi=150)
    plt.close(fig)


def _generate_noise_chart(
    result: FFTAnalysisResult, output_dir: str, base_name: str
):
    """生成噪声分桶柱状图"""
    if not result.noise_buckets:
        return

    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    names = [b.name for b in result.noise_buckets]
    avg_dbs = [b.avg_db for b in result.noise_buckets]
    max_dbs = [b.max_db for b in result.noise_buckets]
    ratios = [b.energy_ratio * 100 for b in result.noise_buckets]

    x = np.arange(len(names))
    width = 0.35

    bars1 = axes[0].bar(x - width / 2, avg_dbs, width, label="Avg", color="#3498db", alpha=0.8)
    bars2 = axes[0].bar(x + width / 2, max_dbs, width, label="Peak", color="#e74c3c", alpha=0.8)

    axes[0].set_xlabel("Frequency Band", fontsize=11)
    axes[0].set_ylabel("Magnitude (dBFS)", fontsize=11)
    axes[0].set_title("Noise Level per Band", fontsize=12)
    axes[0].set_xticks(x)
    axes[0].set_xticklabels(names, rotation=30, ha="right", fontsize=8)
    axes[0].legend()
    axes[0].grid(True, alpha=0.3, axis="y")

    colors = plt.cm.Set3(np.linspace(0, 1, len(names)))
    axes[1].pie(ratios, labels=names, colors=colors, autopct="%1.1f%%", startangle=90, textprops={"fontsize": 8})
    axes[1].set_title("Energy Ratio per Band", fontsize=12)

    plt.tight_layout()
    chart_path = os.path.join(output_dir, f"{base_name}_noise.png")
    fig.savefig(chart_path, dpi=150)
    plt.close(fig)


def print_summary(audio: AudioData, result: FFTAnalysisResult):
    """在终端打印分析摘要"""
    print("\n" + "=" * 60)
    print(f"  FFT音频峰值分析报告")
    print(f"  来源: {audio.file_path}")
    print("=" * 60)

    print(f"\n【输入信息】")
    print(f"  采样率:     {audio.sample_rate} Hz")
    print(f"  时长:       {audio.duration_sec:.3f} s")
    print(f"  声道数:     {audio.channels}")

    print(f"\n【分析结果】")
    print(f"  窗口函数:   {result.window_type}")
    print(f"  FFT点数:    {result.nfft}")
    print(f"  主频:       {result.dominant_freq:.2f} Hz  ({result.dominant_db:.1f} dB)")
    print(f"  噪声底:     {result.noise_floor_db:.1f} dB")
    print(f"  信噪比:     {result.snr_db:.1f} dB")
    print(f"  检测峰值:   {len(result.peaks)} 个")

    if result.peaks:
        print(f"\n【主要峰值（前5个）】")
        for i, p in enumerate(result.peaks[:5]):
            tag = "谐波" if p.is_harmonic else "基频"
            harmonic = f" (源于 {p.harmonic_of:.1f} Hz)" if p.is_harmonic else ""
            print(f"  #{i + 1}  {p.frequency_hz:8.2f} Hz  {p.magnitude_db:6.1f} dB  [{tag}]{harmonic}")

    if result.noise_buckets:
        print(f"\n【噪声分桶】")
        for b in result.noise_buckets:
            print(f"  {b.name:15s} {b.range_hz[0]:5.0f}-{b.range_hz[1]:6.0f} Hz  "
                  f"平均 {b.avg_db:5.1f} dB  能量 {b.energy_ratio * 100:5.1f}%")

    from fft_analyzer import format_anomalies

    anomaly_text = format_anomalies(result)
    if anomaly_text != "（无异常）":
        print(f"\n{anomaly_text}")

    if audio.warnings:
        print(f"\n【输入警告】")
        for w in audio.warnings:
            print(f"  ⚠ {w}")

    if audio.silent_segments:
        print(f"\n【静音段】")
        for s, e in audio.silent_segments:
            print(f"  {s:.3f}s - {e:.3f}s  (时长 {e - s:.3f}s)")

    print("\n" + "=" * 60)
