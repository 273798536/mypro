import numpy as np
from scipy import signal
from scipy.fft import fft, ifft, fftfreq
import warnings


class FourierFilter:
    def __init__(self, sample_rate=None):
        self.sample_rate = sample_rate
        self.original_audio = None
        self.filtered_audio = None
        self.original_fft = None
        self.filtered_fft = None
        self.freqs = None
        self.mask = None
        self.quality_metrics = {}

    def load_audio(self, audio_data, sample_rate):
        self.original_audio = audio_data
        self.sample_rate = sample_rate
        return self

    def compute_fft(self, audio_data=None):
        if audio_data is None:
            audio_data = self.original_audio
        if audio_data is None:
            raise ValueError("No audio data loaded")
        
        n = len(audio_data)
        self.freqs = fftfreq(n, 1 / self.sample_rate)
        self.original_fft = fft(audio_data)
        return self.freqs, self.original_fft

    def spectral_subtraction(self, noise_threshold=0.1, preserve_bands=None):
        if self.original_fft is None:
            self.compute_fft()
        
        magnitude = np.abs(self.original_fft)
        phase = np.angle(self.original_fft)
        
        noise_floor = np.percentile(magnitude, noise_threshold * 100)
        self.mask = magnitude > noise_floor
        
        if preserve_bands:
            for low_freq, high_freq in preserve_bands:
                band_mask = (np.abs(self.freqs) >= low_freq) & (np.abs(self.freqs) <= high_freq)
                self.mask = self.mask | band_mask
        
        filtered_magnitude = magnitude * self.mask
        self.filtered_fft = filtered_magnitude * np.exp(1j * phase)
        self.filtered_audio = np.real(ifft(self.filtered_fft))
        
        self._compute_quality_metrics()
        return self.filtered_audio

    def bandpass_filter(self, low_freq, high_freq, order=5):
        if self.original_audio is None:
            raise ValueError("No audio data loaded")
        
        nyquist = 0.5 * self.sample_rate
        low = low_freq / nyquist
        high = high_freq / nyquist
        
        b, a = signal.butter(order, [low, high], btype='band')
        self.filtered_audio = signal.filtfilt(b, a, self.original_audio)
        
        self.compute_fft(self.original_audio)
        self.filtered_fft = fft(self.filtered_audio)
        self.mask = np.ones_like(self.original_fft, dtype=bool)
        
        self._compute_quality_metrics()
        return self.filtered_audio

    def wiener_filter(self, noise_estimation=None):
        if self.original_audio is None:
            raise ValueError("No audio data loaded")
        
        if noise_estimation is None:
            noise_estimation = np.mean(np.abs(self.original_audio[:int(self.sample_rate * 0.1)]))
        
        self.compute_fft()
        
        signal_power = np.abs(self.original_fft) ** 2
        noise_power = noise_estimation ** 2
        
        wiener_gain = signal_power / (signal_power + noise_power + 1e-10)
        self.mask = wiener_gain > 0.1
        
        self.filtered_fft = self.original_fft * wiener_gain
        self.filtered_audio = np.real(ifft(self.filtered_fft))
        
        self._compute_quality_metrics()
        return self.filtered_audio

    def _compute_quality_metrics(self):
        if self.original_audio is None or self.filtered_audio is None:
            return
        
        original_energy = np.sum(self.original_audio ** 2)
        filtered_energy = np.sum(self.filtered_audio ** 2)
        energy_ratio = filtered_energy / (original_energy + 1e-10)
        
        noise_reduction = 10 * np.log10((original_energy - filtered_energy + 1e-10) / (original_energy + 1e-10))
        
        original_spectrum = np.abs(self.original_fft)
        filtered_spectrum = np.abs(self.filtered_fft)
        
        spectral_distance = np.mean(np.abs(original_spectrum - filtered_spectrum))
        
        aliasing_score = self._detect_aliasing()
        
        self.quality_metrics = {
            'energy_ratio': energy_ratio,
            'noise_reduction_db': -noise_reduction if noise_reduction < 0 else noise_reduction,
            'spectral_distance': spectral_distance,
            'aliasing_score': aliasing_score,
            'over_filtered': energy_ratio < 0.3 or spectral_distance > np.mean(original_spectrum) * 0.5,
            'aliasing_detected': aliasing_score > 0.3
        }

    def _detect_aliasing(self):
        if self.freqs is None or self.filtered_fft is None:
            return 0.0
        
        nyquist = self.sample_rate / 2
        high_freq_mask = np.abs(self.freqs) > nyquist * 0.8
        
        high_freq_energy = np.sum(np.abs(self.filtered_fft[high_freq_mask]) ** 2)
        total_energy = np.sum(np.abs(self.filtered_fft) ** 2)
        
        return high_freq_energy / (total_energy + 1e-10)

    def get_quality_report(self):
        return self.quality_metrics

    def get_trace_data(self):
        return {
            'original_audio': self.original_audio,
            'filtered_audio': self.filtered_audio,
            'original_fft': self.original_fft,
            'filtered_fft': self.filtered_fft,
            'frequencies': self.freqs,
            'filter_mask': self.mask,
            'sample_rate': self.sample_rate
        }


class SampleRateValidator:
    def __init__(self, expected_sample_rates=None):
        self.expected_rates = expected_sample_rates or [44100, 48000, 22050, 16000]

    def validate(self, sample_rate, audio_data=None):
        errors = []
        warnings_list = []
        
        if sample_rate not in self.expected_rates:
            errors.append({
                'type': 'unexpected_sample_rate',
                'message': f'采样率 {sample_rate} Hz 不在预期范围内 {self.expected_rates}',
                'severity': 'error'
            })
        
        if sample_rate < 8000:
            errors.append({
                'type': 'sample_rate_too_low',
                'message': f'采样率 {sample_rate} Hz 过低，可能影响滤波质量',
                'severity': 'error'
            })
        
        if audio_data is not None:
            duration = len(audio_data) / sample_rate
            if duration < 0.1:
                warnings_list.append({
                    'type': 'audio_too_short',
                    'message': f'音频时长 {duration:.2f}s 过短，可能影响分析结果',
                    'severity': 'warning'
                })
            
            if np.max(np.abs(audio_data)) < 0.01:
                warnings_list.append({
                    'type': 'low_signal_level',
                    'message': '音频信号电平过低，可能包含噪声',
                    'severity': 'warning'
                })
        
        return {
            'sample_rate': sample_rate,
            'is_valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings_list
        }
