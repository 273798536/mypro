"""分析器模块 - 采样率错误检测和频段混叠分析"""

import numpy as np
from scipy import signal
from scipy.fft import fft, fftfreq
from pathlib import Path


class SamplerateAnalyzer:
    """采样率异常分析器"""
    
    def __init__(self, processor):
        self.processor = processor
        self.nyquist = processor.samplerate // 2
    
    def detect_issues(self):
        """检测采样率相关异常"""
        issues = []
        
        issues.extend(self._detect_resample_artifacts())
        issues.extend(self._detect_nyquist_violation())
        issues.extend(self._detect_sample_clocking())
        issues.extend(self._detect_mismatched_segments())
        
        return issues
    
    def _detect_resample_artifacts(self):
        """检测重采样伪影"""
        issues = []
        
        if self.processor.samplerate != self.processor.original_samplerate:
            f, t, Zxx = self.processor.compute_stft()
            magnitude = np.abs(Zxx)
            
            high_freq_content = magnitude[f > self.nyquist * 0.9, :]
            if np.mean(high_freq_content) > np.mean(magnitude) * 0.3:
                issues.append({
                    "type": "resample_artifact",
                    "description": f"重采样检测: 从 {self.processor.original_samplerate}Hz 到 {self.processor.samplerate}Hz",
                    "severity": "medium",
                    "source": f"重采样过程 (原始: {self.processor.original_samplerate}Hz)",
                    "time_position": "全程"
                })
        
        return issues
    
    def _detect_nyquist_violation(self):
        """检测奈奎斯特违规（频率超过奈奎斯特频率的内容）"""
        issues = []
        
        fft_vals, freqs = self.processor.compute_fft()
        magnitude = np.abs(fft_vals)
        
        near_nyquist = (np.abs(freqs) > self.nyquist * 0.95) & (np.abs(freqs) <= self.nyquist)
        near_nyquist_energy = np.sum(magnitude[near_nyquist] ** 2)
        total_energy = np.sum(magnitude ** 2)
        
        if near_nyquist_energy / total_energy > 0.1:
            issues.append({
                "type": "nyquist_violation",
                "description": f"接近奈奎斯特频率的能量过高 ({near_nyquist_energy/total_energy*100:.1f}%)",
                "severity": "high",
                "source": "原始录制材料 - 采样率不足",
                "time_position": "全程",
                "freq_range": f"{self.nyquist * 0.95:.0f}-{self.nyquist:.0f} Hz"
            })
        
        return issues
    
    def _detect_sample_clocking(self):
        """检测采样时钟抖动"""
        issues = []
        
        audio = self.processor.audio_data
        
        if len(audio) > 1000:
            amplitude_envelope = np.abs(signal.hilbert(audio))
            envelope_variation = np.std(amplitude_envelope) / np.mean(amplitude_envelope)
            
            if envelope_variation > 0.5:
                issues.append({
                    "type": "clock_jitter",
                    "description": f"检测到潜在时钟抖动 (包络变化率: {envelope_variation:.2f})",
                    "severity": "low",
                    "source": "录制设备时钟不稳定",
                    "time_position": "全程"
                })
        
        return issues
    
    def _detect_mismatched_segments(self):
        """检测不匹配的音频分段（可能来自不同采样率的材料拼接）"""
        issues = []
        
        segments = self.processor.get_time_segments(1.0)
        
        if len(segments) < 2:
            return issues
        
        spectral_centroids = []
        for seg in segments:
            fft_seg = fft(seg["data"])
            freqs_seg = fftfreq(len(seg["data"]), 1 / self.processor.samplerate)
            mag_seg = np.abs(fft_seg)
            if np.sum(mag_seg) > 0:
                centroid = np.sum(np.abs(freqs_seg) * mag_seg) / np.sum(mag_seg)
                spectral_centroids.append(centroid)
        
        if len(spectral_centroids) > 1:
            centroid_std = np.std(spectral_centroids)
            centroid_mean = np.mean(spectral_centroids)
            
            if centroid_std > centroid_mean * 0.3:
                anomaly_indices = [
                    i for i, c in enumerate(spectral_centroids)
                    if abs(c - centroid_mean) > centroid_mean * 0.5
                ]
                
                for idx in anomaly_indices[:3]:
                    issues.append({
                        "type": "segment_mismatch",
                        "description": f"第 {idx} 秒处频谱质心异常，可能来自不同采样率的拼接材料",
                        "severity": "medium",
                        "source": f"拼接材料 - 第 {idx} 段",
                        "time_position": f"{idx}-{idx+1} 秒"
                    })
        
        return issues


class AliasingAnalyzer:
    """频段混叠分析器"""
    
    def __init__(self, processor):
        self.processor = processor
        self.samplerate = processor.samplerate
        self.nyquist = processor.samplerate // 2
    
    def detect_aliasing(self):
        """检测频段混叠"""
        issues = []
        
        issues.extend(self._detect_frequency_folding())
        issues.extend(self._detect_harmonic_aliasing())
        issues.extend(self._detect_band_overlap())
        issues.extend(self._detect_mirror_frequencies())
        
        return issues
    
    def _detect_frequency_folding(self):
        """检测频率折叠"""
        issues = []
        
        fft_vals, freqs = self.processor.compute_fft()
        magnitude = np.abs(fft_vals)
        
        pos_freqs = freqs[freqs >= 0]
        pos_mag = magnitude[freqs >= 0]
        
        high_band_start = int(self.nyquist * 0.7)
        high_band = pos_freqs >= high_band_start
        
        if np.any(high_band):
            high_energy = np.sum(pos_mag[high_band] ** 2)
            total_energy = np.sum(pos_mag ** 2)
            
            if high_energy / total_energy > 0.15:
                issues.append({
                    "type": "frequency_folding",
                    "description": f"高频段能量集中，存在混叠风险 (高频能量占比: {high_energy/total_energy*100:.1f}%)",
                    "severity": "medium",
                    "freq_start": high_band_start,
                    "freq_end": self.nyquist,
                    "source": "原始信号频率超过奈奎斯特频率"
                })
        
        return issues
    
    def _detect_harmonic_aliasing(self):
        """检测谐波混叠"""
        issues = []
        
        f, t, Zxx = self.processor.compute_stft()
        magnitude = np.abs(Zxx)
        
        peaks = []
        for i in range(magnitude.shape[1]):
            col = magnitude[:, i]
            peak_idx = np.argmax(col)
            if col[peak_idx] > np.mean(col) * 2:
                peaks.append(f[peak_idx])
        
        if peaks:
            peak_freq = np.median(peaks)
            harmonic = peak_freq * 2
            
            while harmonic < self.nyquist:
                harmonic_idx = np.argmin(np.abs(f - harmonic))
                harmonic_mag = np.mean(magnitude[harmonic_idx, :])
                
                if harmonic_mag > np.mean(magnitude) * 0.5:
                    issues.append({
                        "type": "harmonic_aliasing",
                        "description": f"检测到 {harmonic:.0f}Hz 处的谐波成分可能存在混叠",
                        "severity": "low",
                        "freq_start": harmonic - 50,
                        "freq_end": harmonic + 50,
                        "source": f"基频 {peak_freq:.0f}Hz 的谐波"
                    })
                harmonic *= 2
        
        return issues[:3]
    
    def _detect_band_overlap(self):
        """检测频段重叠"""
        issues = []
        
        bands = [
            ("Sub-bass", 20, 60),
            ("Bass", 60, 250),
            ("Low Mid", 250, 500),
            ("Midrange", 500, 2000),
            ("Upper Mid", 2000, 4000),
            ("Presence", 4000, 6000),
            ("Brilliance", 6000, self.nyquist),
        ]
        
        fft_vals, freqs = self.processor.compute_fft()
        magnitude = np.abs(fft_vals)
        
        band_energies = []
        for name, start, end in bands:
            mask = (np.abs(freqs) >= start) & (np.abs(freqs) <= end)
            energy = np.sum(magnitude[mask] ** 2) if np.any(mask) else 0
            band_energies.append((name, start, end, energy))
        
        total_energy = sum(e for _, _, _, e in band_energies)
        
        for i in range(len(band_energies) - 1):
            name1, start1, end1, energy1 = band_energies[i]
            name2, start2, end2, energy2 = band_energies[i + 1]
            
            ratio1 = energy1 / total_energy if total_energy > 0 else 0
            ratio2 = energy2 / total_energy if total_energy > 0 else 0
            
            if abs(ratio1 - ratio2) < 0.02 and ratio1 > 0.1:
                issues.append({
                    "type": "band_overlap",
                    "description": f"{name1} ({end1}Hz) 和 {name2} ({start2}Hz) 频段能量相近，边界可能模糊",
                    "severity": "low",
                    "freq_start": end1 - 20,
                    "freq_end": start2 + 20,
                    "source": f"频段边界 {end1}Hz 处"
                })
        
        return issues[:2]
    
    def _detect_mirror_frequencies(self):
        """检测镜像频率（混叠的典型特征）"""
        issues = []
        
        fft_vals, freqs = self.processor.compute_fft()
        magnitude = np.abs(fft_vals)
        
        pos_mask = freqs >= 0
        pos_freqs = freqs[pos_mask]
        pos_mag = magnitude[pos_mask]
        
        mirrored_mag = pos_mag[::-1]
        correlation = np.correlate(pos_mag, mirrored_mag, mode="valid")[0]
        normalized_corr = correlation / (np.linalg.norm(pos_mag) * np.linalg.norm(mirrored_mag) + 1e-10)
        
        if normalized_corr > 0.7:
            issues.append({
                "type": "mirror_frequencies",
                "description": f"频谱对称性过高 (相关系数: {normalized_corr:.2f})，可能存在频率镜像混叠",
                "severity": "medium",
                "freq_start": 0,
                "freq_end": self.nyquist,
                "source": "采样率不足导致的频率折叠"
            })
        
        return issues
