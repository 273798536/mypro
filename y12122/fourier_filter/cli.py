import click
import soundfile as sf
import numpy as np
import json
import csv
from pathlib import Path
from tqdm import tqdm
import hashlib

from .core import FourierFilter, SampleRateValidator
from .parser import MaterialParser
from .visualizer import AudioVisualizer


class BatchProcessor:
    def __init__(self, output_dir='output', expected_sample_rates=None):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.filtered_dir = self.output_dir / 'filtered_audio'
        self.filtered_dir.mkdir(exist_ok=True)
        
        self.trace_dir = self.output_dir / 'trace_data'
        self.trace_dir.mkdir(exist_ok=True)
        
        self.review_dir = self.output_dir / 'needs_review'
        self.review_dir.mkdir(exist_ok=True)
        
        self.invalid_dir = self.output_dir / 'invalid_sample_rate'
        self.invalid_dir.mkdir(exist_ok=True)
        
        self.visualizer = AudioVisualizer(output_dir=self.output_dir / 'visualizations')
        self.sample_rate_validator = SampleRateValidator(expected_sample_rates)
        
        self.results = {
            'success': [],
            'needs_review': [],
            'invalid_sample_rate': [],
            'failed': []
        }

    def process_materials(self, materials_file, force=False):
        parser = MaterialParser()
        parse_result = parser.parse(materials_file)
        
        click.echo(f"材料解析完成: 共 {parse_result['total_lines']} 行")
        click.echo(f"  - 有效行: {parse_result['valid_count']}")
        click.echo(f"  - 坏行: {parse_result['bad_count']}")
        
        if parse_result['bad_rows']:
            bad_rows_file = self.output_dir / 'bad_rows_report.csv'
            self._save_bad_rows(parse_result['bad_rows'], bad_rows_file)
            click.echo(f"  - 坏行报告已保存到: {bad_rows_file}")
        
        click.echo("\n开始处理音频...")
        for row in tqdm(parse_result['valid_rows'], desc="处理中"):
            try:
                self._process_single_row(row['data'], row['line_number'], force)
            except Exception as e:
                self.results['failed'].append({
                    'line_number': row['line_number'],
                    'audio_file': row['data'].get('audio_file'),
                    'error': str(e)
                })
        
        self._save_summary()
        return self.results

    def _process_single_row(self, row_data, line_number, force=False):
        audio_file = Path(row_data['audio_file'])
        if not audio_file.exists():
            raise FileNotFoundError(f"音频文件不存在: {audio_file}")
        
        file_hash = self._get_file_hash(audio_file)
        output_filename = f"{audio_file.stem}_{file_hash[:8]}"
        
        filtered_path = self.filtered_dir / f"{output_filename}_filtered.wav"
        if filtered_path.exists() and not force:
            click.echo(f"跳过已处理文件: {audio_file.name}")
            return
        
        audio_data, sample_rate = sf.read(str(audio_file))
        
        if audio_data.ndim > 1:
            audio_data = np.mean(audio_data, axis=1)
        
        sr_validation = self.sample_rate_validator.validate(sample_rate, audio_data)
        
        if not sr_validation['is_valid']:
            self._handle_invalid_sample_rate(audio_file, row_data, sr_validation, output_filename, line_number)
            return
        
        filter_obj = FourierFilter(sample_rate)
        filter_obj.load_audio(audio_data, sample_rate)
        
        filter_method = row_data.get('filter_method', 'spectral_subtraction')
        
        if filter_method == 'spectral_subtraction':
            noise_threshold = row_data.get('noise_threshold', 0.1)
            preserve_bands = row_data.get('preserve_bands')
            filter_obj.spectral_subtraction(noise_threshold=noise_threshold, preserve_bands=preserve_bands)
        
        elif filter_method == 'bandpass':
            low_freq = row_data.get('low_freq', 20)
            high_freq = row_data.get('high_freq', 20000)
            filter_obj.bandpass_filter(low_freq=low_freq, high_freq=high_freq)
        
        elif filter_method == 'wiener':
            filter_obj.wiener_filter()
        
        else:
            raise ValueError(f"未知的滤波方法: {filter_method}")
        
        quality_metrics = filter_obj.get_quality_report()
        trace_data = filter_obj.get_trace_data()
        
        needs_review = quality_metrics.get('over_filtered', False) or quality_metrics.get('aliasing_detected', False)
        
        sf.write(str(filtered_path), filter_obj.filtered_audio, sample_rate)
        
        viz_paths = self.visualizer.generate_all(trace_data, output_filename)
        
        trace_path = self.trace_dir / f"{output_filename}_trace.json"
        self._save_trace_data(trace_data, quality_metrics, row_data, trace_path)
        
        result_entry = {
            'line_number': line_number,
            'audio_file': str(audio_file),
            'filtered_file': str(filtered_path),
            'sample_rate': sample_rate,
            'filter_method': filter_method,
            'quality_metrics': quality_metrics,
            'visualizations': viz_paths,
            'trace_file': str(trace_path),
            'spectrum_params': row_data.get('spectrum_params', ''),
            'listening_notes': row_data.get('listening_notes', '')
        }
        
        if needs_review:
            result_entry['review_reason'] = []
            if quality_metrics.get('over_filtered'):
                result_entry['review_reason'].append('过度滤波')
            if quality_metrics.get('aliasing_detected'):
                result_entry['review_reason'].append('频段混叠')
            
            review_path = self.review_dir / f"{output_filename}_filtered.wav"
            if not review_path.exists():
                review_path.symlink_to(filtered_path.resolve())
            self.results['needs_review'].append(result_entry)
        else:
            self.results['success'].append(result_entry)

    def _handle_invalid_sample_rate(self, audio_file, row_data, sr_validation, output_filename, line_number):
        invalid_audio_path = self.invalid_dir / f"{output_filename}.wav"
        if not invalid_audio_path.exists():
            audio_data, sr = sf.read(str(audio_file))
            sf.write(str(invalid_audio_path), audio_data, sr)
        
        self.results['invalid_sample_rate'].append({
            'line_number': line_number,
            'audio_file': str(audio_file),
            'sample_rate': sr_validation['sample_rate'],
            'errors': sr_validation['errors'],
            'warnings': sr_validation['warnings'],
            'copied_to': str(invalid_audio_path),
            'filter_method': row_data.get('filter_method', ''),
            'spectrum_params': row_data.get('spectrum_params', ''),
            'listening_notes': row_data.get('listening_notes', '')
        })

    def _get_file_hash(self, file_path):
        hash_obj = hashlib.md5()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b''):
                hash_obj.update(chunk)
        return hash_obj.hexdigest()

    def _save_trace_data(self, trace_data, quality_metrics, row_data, output_path):
        serializable_trace = {
            'sample_rate': trace_data['sample_rate'],
            'duration': len(trace_data['original_audio']) / trace_data['sample_rate'],
            'quality_metrics': quality_metrics,
            'input_parameters': row_data,
            'original_audio_stats': {
                'mean': float(np.mean(trace_data['original_audio'])),
                'std': float(np.std(trace_data['original_audio'])),
                'max': float(np.max(np.abs(trace_data['original_audio'])))
            },
            'filtered_audio_stats': {
                'mean': float(np.mean(trace_data['filtered_audio'])),
                'std': float(np.std(trace_data['filtered_audio'])),
                'max': float(np.max(np.abs(trace_data['filtered_audio'])))
            }
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(serializable_trace, f, indent=2, ensure_ascii=False)

    def _save_bad_rows(self, bad_rows, output_path):
        with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['行号', '错误类型', '错误信息', '原始内容'])
            for row in bad_rows:
                writer.writerow([
                    row['line_number'],
                    row['error_type'],
                    row['error_message'],
                    row.get('raw_content', '')[:200]
                ])

    def _save_summary(self):
        summary_path = self.output_dir / 'processing_summary.json'
        
        summary = {
            'total_processed': sum(len(v) for v in self.results.values()),
            'results': {
                'success_count': len(self.results['success']),
                'needs_review_count': len(self.results['needs_review']),
                'invalid_sample_rate_count': len(self.results['invalid_sample_rate']),
                'failed_count': len(self.results['failed'])
            },
            'details': self.results
        }
        
        with open(summary_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        click.echo(f"\n处理摘要已保存到: {summary_path}")


@click.group()
def main():
    """傅里叶噪声滤波器 - 音频噪声处理与质量分析工具"""
    pass


@main.command()
@click.argument('materials_file', type=click.Path(exists=True))
@click.option('--output-dir', '-o', default='output', help='输出目录')
@click.option('--force', '-f', is_flag=True, help='强制重新处理已处理过的文件')
@click.option('--expected-sample-rates', '-s', default='44100,48000,22050,16000', 
              help='预期采样率列表，用逗号分隔')
def batch(materials_file, output_dir, force, expected_sample_rates):
    """批量处理音频材料清单（CSV/TSV格式）"""
    rates = [int(r.strip()) for r in expected_sample_rates.split(',')]
    
    click.echo("=" * 60)
    click.echo("傅里叶噪声滤波器 - 批量处理")
    click.echo("=" * 60)
    click.echo(f"材料文件: {materials_file}")
    click.echo(f"输出目录: {output_dir}")
    click.echo(f"预期采样率: {rates}")
    click.echo()
    
    processor = BatchProcessor(output_dir=output_dir, expected_sample_rates=rates)
    results = processor.process_materials(materials_file, force=force)
    
    click.echo("\n" + "=" * 60)
    click.echo("处理完成！")
    click.echo("=" * 60)
    click.echo(f"成功处理: {len(results['success'])} 个文件")
    click.echo(f"需要复核: {len(results['needs_review'])} 个文件")
    click.echo(f"采样率错误: {len(results['invalid_sample_rate'])} 个文件")
    click.echo(f"处理失败: {len(results['failed'])} 个文件")
    click.echo()
    click.echo(f"输出目录: {output_dir}")
    click.echo("  - filtered_audio/: 正常滤波结果")
    click.echo("  - needs_review/: 需要复核的结果（符号链接）")
    click.echo("  - invalid_sample_rate/: 采样率错误的文件")
    click.echo("  - visualizations/: 可视化图表")
    click.echo("  - trace_data/: 追溯数据")
    click.echo("  - bad_rows_report.csv: 坏行报告")
    click.echo("  - processing_summary.json: 处理摘要")


@main.command()
@click.argument('audio_file', type=click.Path(exists=True))
@click.option('--output-dir', '-o', default='output', help='输出目录')
@click.option('--method', '-m', default='spectral_subtraction', 
              type=click.Choice(['spectral_subtraction', 'bandpass', 'wiener']),
              help='滤波方法')
@click.option('--noise-threshold', '-t', default=0.1, type=float, help='噪声阈值 (0-1)')
@click.option('--low-freq', default=20, type=float, help='带通滤波低频')
@click.option('--high-freq', default=20000, type=float, help='带通滤波高频')
@click.option('--sample-rate', type=int, help='强制指定采样率（不验证）')
def single(audio_file, output_dir, method, noise_threshold, low_freq, high_freq, sample_rate):
    """处理单个音频文件"""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    click.echo(f"处理文件: {audio_file}")
    
    audio_data, sr = sf.read(audio_file)
    if audio_data.ndim > 1:
        audio_data = np.mean(audio_data, axis=1)
    
    if sample_rate:
        sr = sample_rate
        click.echo(f"使用指定采样率: {sr} Hz")
    else:
        click.echo(f"检测到采样率: {sr} Hz")
    
    filter_obj = FourierFilter(sr)
    filter_obj.load_audio(audio_data, sr)
    
    if method == 'spectral_subtraction':
        click.echo(f"使用谱减法，阈值: {noise_threshold}")
        filter_obj.spectral_subtraction(noise_threshold=noise_threshold)
    elif method == 'bandpass':
        click.echo(f"使用带通滤波: {low_freq}-{high_freq} Hz")
        filter_obj.bandpass_filter(low_freq=low_freq, high_freq=high_freq)
    elif method == 'wiener':
        click.echo("使用维纳滤波")
        filter_obj.wiener_filter()
    
    quality = filter_obj.get_quality_report()
    click.echo("\n质量指标:")
    for k, v in quality.items():
        click.echo(f"  {k}: {v}")
    
    audio_name = Path(audio_file).stem
    filtered_path = output_path / f"{audio_name}_filtered.wav"
    sf.write(str(filtered_path), filter_obj.filtered_audio, sr)
    click.echo(f"\n滤波后音频已保存: {filtered_path}")
    
    viz = AudioVisualizer(output_dir=output_path / 'visualizations')
    trace_data = filter_obj.get_trace_data()
    viz_paths = viz.generate_all(trace_data, audio_name)
    click.echo("可视化文件:")
    for name, path in viz_paths.items():
        click.echo(f"  {name}: {path}")


@main.command()
@click.argument('output_dir', type=click.Path(), default='.')
def init(output_dir):
    """在指定目录初始化示例材料清单"""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    example_file = output_path / 'materials_example.csv'
    
    with open(example_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['audio_file', 'sample_rate', 'filter_method', 'noise_threshold', 
                        'low_freq', 'high_freq', 'preserve_bands', 'spectrum_params', 'listening_notes'])
        writer.writerow(['audio/sample1.wav', '44100', 'spectral_subtraction', '0.1', '', '', '200-3000;5000-8000', '参数A=1;参数B=2', '听感备注: 人声清晰'])
        writer.writerow(['audio/sample2.wav', '48000', 'bandpass', '', '100', '15000', '', '窗函数=hann', ''])
        writer.writerow([''])
        writer.writerow(['# 这是一条备注行'])
        writer.writerow(['audio/sample3.wav', '22050', 'wiener', '', '', '', '', '', ''])
    
    click.echo(f"示例材料清单已创建: {example_file}")
    click.echo("\n使用说明:")
    click.echo("  1. 编辑 materials_example.csv，填入实际音频文件路径")
    click.echo("  2. 运行: fourier-filter batch materials_example.csv")
    click.echo("\n支持的列:")
    click.echo("  - audio_file: 音频文件路径（必需）")
    click.echo("  - sample_rate: 采样率（可选，用于验证）")
    click.echo("  - filter_method: 滤波方法 (spectral_subtraction/bandpass/wiener)")
    click.echo("  - noise_threshold: 谱减法噪声阈值 (0-1)")
    click.echo("  - low_freq/high_freq: 带通滤波频率范围")
    click.echo("  - preserve_bands: 保护频段，格式: 低-高;低-高")
    click.echo("  - spectrum_params: 频谱参数备注")
    click.echo("  - listening_notes: 听感备注")


if __name__ == '__main__':
    main()
