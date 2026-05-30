import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pathlib import Path


class AudioVisualizer:
    def __init__(self, output_dir='visualizations', dpi=100):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.dpi = dpi

    def generate_all(self, trace_data, file_prefix='audio'):
        paths = {}
        paths['waveform'] = self.plot_waveform_comparison(trace_data, file_prefix)
        paths['fft'] = self.plot_fft_comparison(trace_data, file_prefix)
        paths['spectrum'] = self.plot_spectrum_analysis(trace_data, file_prefix)
        return paths

    def plot_waveform_comparison(self, trace_data, file_prefix):
        original = trace_data['original_audio']
        filtered = trace_data['filtered_audio']
        sample_rate = trace_data['sample_rate']

        time = np.arange(len(original)) / sample_rate

        fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(12, 10))

        ax1.plot(time, original, color='#3498db', linewidth=0.5)
        ax1.set_title('原始波形', fontsize=12, fontweight='bold')
        ax1.set_ylabel('振幅')
        ax1.set_xlabel('时间 (秒)')
        ax1.grid(True, alpha=0.3)
        ax1.set_ylim([-1, 1])

        ax2.plot(time, filtered, color='#2ecc71', linewidth=0.5)
        ax2.set_title('滤波后波形', fontsize=12, fontweight='bold')
        ax2.set_ylabel('振幅')
        ax2.set_xlabel('时间 (秒)')
        ax2.grid(True, alpha=0.3)
        ax2.set_ylim([-1, 1])

        diff = original - filtered
        ax3.plot(time, diff, color='#e74c3c', linewidth=0.5)
        ax3.set_title('差值波形 (原始 - 滤波后)', fontsize=12, fontweight='bold')
        ax3.set_ylabel('振幅差')
        ax3.set_xlabel('时间 (秒)')
        ax3.grid(True, alpha=0.3)

        plt.tight_layout()
        output_path = self.output_dir / f'{file_prefix}_waveform_comparison.png'
        plt.savefig(output_path, dpi=self.dpi, bbox_inches='tight')
        plt.close()

        return str(output_path)

    def plot_fft_comparison(self, trace_data, file_prefix):
        freqs = trace_data['frequencies']
        original_fft = np.abs(trace_data['original_fft'])
        filtered_fft = np.abs(trace_data['filtered_fft'])
        mask = trace_data['filter_mask']

        positive_mask = freqs >= 0
        freqs_pos = freqs[positive_mask]
        original_pos = original_fft[positive_mask]
        filtered_pos = filtered_fft[positive_mask]
        mask_pos = mask[positive_mask] if mask is not None else None

        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8))

        ax1.plot(freqs_pos, original_pos, color='#3498db', linewidth=0.8, label='原始')
        ax1.set_title('FFT频谱对比', fontsize=12, fontweight='bold')
        ax1.set_ylabel('幅度')
        ax1.set_xlabel('频率 (Hz)')
        ax1.grid(True, alpha=0.3)
        ax1.legend()
        ax1.set_xscale('log')

        ax2.plot(freqs_pos, filtered_pos, color='#2ecc71', linewidth=0.8, label='滤波后')
        if mask_pos is not None:
            ax2.fill_between(freqs_pos, 0, filtered_pos.max(), where=~mask_pos, 
                           color='red', alpha=0.2, label='过滤频段')
        ax2.set_ylabel('幅度')
        ax2.set_xlabel('频率 (Hz)')
        ax2.grid(True, alpha=0.3)
        ax2.legend()
        ax2.set_xscale('log')

        plt.tight_layout()
        output_path = self.output_dir / f'{file_prefix}_fft_comparison.png'
        plt.savefig(output_path, dpi=self.dpi, bbox_inches='tight')
        plt.close()

        return str(output_path)

    def plot_spectrum_analysis(self, trace_data, file_prefix):
        freqs = trace_data['frequencies']
        original_fft = np.abs(trace_data['original_fft'])
        filtered_fft = np.abs(trace_data['filtered_fft'])

        positive_mask = (freqs >= 20) & (freqs <= 20000)
        freqs_pos = freqs[positive_mask]
        original_db = 20 * np.log10(original_fft[positive_mask] + 1e-10)
        filtered_db = 20 * np.log10(filtered_fft[positive_mask] + 1e-10)

        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8))

        ax1.plot(freqs_pos, original_db, color='#3498db', linewidth=0.8, label='原始')
        ax1.plot(freqs_pos, filtered_db, color='#2ecc71', linewidth=0.8, alpha=0.7, label='滤波后')
        ax1.set_title('频谱分析 (dB)', fontsize=12, fontweight='bold')
        ax1.set_ylabel('幅度 (dB)')
        ax1.set_xlabel('频率 (Hz)')
        ax1.grid(True, alpha=0.3)
        ax1.legend()
        ax1.set_xscale('log')

        diff_db = original_db - filtered_db
        ax2.plot(freqs_pos, diff_db, color='#9b59b6', linewidth=0.8)
        ax2.axhline(y=0, color='r', linestyle='--', linewidth=0.5, alpha=0.5)
        ax2.set_title('滤波增益 (原始 - 滤波后)', fontsize=12, fontweight='bold')
        ax2.set_ylabel('增益 (dB)')
        ax2.set_xlabel('频率 (Hz)')
        ax2.grid(True, alpha=0.3)
        ax2.set_xscale('log')

        plt.tight_layout()
        output_path = self.output_dir / f'{file_prefix}_spectrum_analysis.png'
        plt.savefig(output_path, dpi=self.dpi, bbox_inches='tight')
        plt.close()

        return str(output_path)

    def create_trace_report(self, trace_data, quality_metrics, file_prefix):
        viz_paths = self.generate_all(trace_data, file_prefix)
        
        report = {
            'visualizations': viz_paths,
            'quality_metrics': quality_metrics,
            'trace_id': file_prefix,
            'sample_rate': trace_data['sample_rate'],
            'duration': len(trace_data['original_audio']) / trace_data['sample_rate']
        }
        
        return report
