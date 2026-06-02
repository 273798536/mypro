"""核心音频处理模块 - 傅里叶变换和噪声清洗"""

import numpy as np
import soundfile as sf
from scipy import signal
from scipy.fft import fft, ifft, fftfreq
from pathlib import Path


class AudioProcessor:
    """音频处理器"""
    
    def __init__(self, audio_path: Path, target_samplerate: int = None):
        self.audio_path = Path(audio_path)
        self.audio_data, self.original_samplerate = sf.read(str(audio_path))
        
        if self.audio_data.ndim > 1:
            self.audio_data = self.audio_data.mean(axis=1)
        
        self.samplerate = target_samplerate or self.original_samplerate
        
        if target_samplerate and target_samplerate != self.original_samplerate:
            self.audio_data = self._resample(self.audio_data, self.original_samplerate, target_samplerate)
        
        self.duration = len(self.audio_data) / self.samplerate
        self.channels = 1
        self._fft_cache = None
        self._freqs_cache = None
    
    def _resample(self, data, orig_sr, target_sr):
        """重采样音频"""
        ratio = target_sr / orig_sr
        new_length = int(len(data) * ratio)
        return signal.resample(data, new_length)
    
    def compute_fft(self):
        """计算傅里叶变换"""
        if self._fft_cache is None:
            n = len(self.audio_data)
            self._fft_cache = fft(self.audio_data)
            self._freqs_cache = fftfreq(n, 1 / self.samplerate)
        return self._fft_cache, self._freqs_cache
    
    def get_spectrum(self):
        """获取频谱"""
        fft_vals, freqs = self.compute_fft()
        magnitude = np.abs(fft_vals)
        phase = np.angle(fft_vals)
        return magnitude, phase, freqs
    
    def compute_stft(self, nperseg=1024, noverlap=512):
        """计算短时傅里叶变换"""
        f, t, Zxx = signal.stft(
            self.audio_data, 
            fs=self.samplerate,
            nperseg=nperseg,
            noverlap=noverlap
        )
        return f, t, Zxx
    
    def noise_reduction(self, threshold=0.1, band_start=0, band_end=None):
        """
        基于傅里叶变换的噪声降噪
        
        Args:
            threshold: 噪声阈值 (0.0-1.0)
            band_start: 起始频段 (Hz)
            band_end: 结束频段 (Hz)
        
        Returns:
            dict: 包含清洗后音频和分析结果
        """
        if band_end is None:
            band_end = self.samplerate // 2
        
        fft_vals, freqs = self.compute_fft()
        magnitude = np.abs(fft_vals)
        phase = np.angle(fft_vals)
        
        max_mag = np.max(magnitude)
        normalized_mag = magnitude / max_mag
        
        band_mask = (freqs >= band_start) & (freqs <= band_end)
        band_mask = band_mask | (freqs <= -band_start) & (freqs >= -band_end)
        
        noise_mask = (normalized_mag < threshold) & band_mask
        
        cleaned_magnitude = magnitude.copy()
        cleaned_magnitude[noise_mask] = 0
        
        original_energy = np.sum(magnitude ** 2)
        cleaned_energy = np.sum(cleaned_magnitude ** 2)
        energy_ratio = cleaned_energy / original_energy if original_energy > 0 else 1
        
        over_filtered = energy_ratio < 0.3
        filter_impact = self._assess_filter_impact(energy_ratio, band_start, band_end)
        
        cleaned_fft = cleaned_magnitude * np.exp(1j * phase)
        cleaned_audio = np.real(ifft(cleaned_fft))
        
        issues = self._detect_cleaning_issues(noise_mask, freqs, magnitude)
        
        return {
            "cleaned_audio": cleaned_audio,
            "over_filtered": over_filtered,
            "filter_impact": filter_impact,
            "energy_ratio": energy_ratio,
            "noise_mask": noise_mask,
            "issues": issues,
            "band_start": band_start,
            "band_end": band_end,
            "threshold": threshold
        }
    
    def _assess_filter_impact(self, energy_ratio, band_start, band_end):
        """评估滤波影响"""
        if energy_ratio > 0.7:
            return "轻微 - 主要去除低幅值噪声"
        elif energy_ratio > 0.5:
            return "中等 - 去除了部分背景噪声，可能影响微弱信号"
        elif energy_ratio > 0.3:
            return "较重 - 显著能量去除，可能影响音频清晰度"
        else:
            return "严重 - 过度滤波！可能丢失重要音频内容，建议降低阈值或缩小频段范围"
    
    def _detect_cleaning_issues(self, noise_mask, freqs, magnitude):
        """检测清洗过程中的问题"""
        issues = []
        
        significant_freqs = freqs[noise_mask & (magnitude > np.mean(magnitude) * 0.5)]
        if len(significant_freqs) > 100:
            issues.append({
                "type": "high_freq_removal",
                "description": f"移除了 {len(significant_freqs)} 个显著频率分量",
                "severity": "medium"
            })
        
        nyquist = self.samplerate // 2
        high_freq_band = (freqs > nyquist * 0.8) | (freqs < -nyquist * 0.8)
        high_freq_removed = np.sum(noise_mask & high_freq_band)
        if high_freq_removed > np.sum(high_freq_band) * 0.5:
            issues.append({
                "type": "high_band_removal",
                "description": "高频段移除比例超过50%，可能影响临场感",
                "severity": "medium"
            })
        
        return issues
    
    def save_audio(self, output_path: Path, audio_data=None):
        """保存音频文件"""
        if audio_data is None:
            audio_data = self.audio_data
        
        audio_data = np.asarray(audio_data)
        if np.issubdtype(audio_data.dtype, np.floating):
            audio_data = np.clip(audio_data, -1.0, 1.0)
        
        sf.write(str(output_path), audio_data, self.samplerate)
    
    def get_time_segments(self, duration_seconds=1.0):
        """获取音频时间分段"""
        samples_per_segment = int(duration_seconds * self.samplerate)
        segments = []
        
        for i in range(0, len(self.audio_data), samples_per_segment):
            segment_data = self.audio_data[i:i + samples_per_segment]
            segments.append({
                "index": len(segments),
                "start_time": i / self.samplerate,
                "end_time": (i + len(segment_data)) / self.samplerate,
                "data": segment_data
            })
        
        return segments
