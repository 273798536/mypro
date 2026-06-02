"""测试样例生成模块"""

import numpy as np
import soundfile as sf
from pathlib import Path
import json
import csv
from datetime import datetime, timedelta


def create_test_samples(output_dir: Path):
    """创建测试样例"""
    sample_info = []
    
    sample_info.extend(_create_audio_samples(output_dir))
    sample_info.extend(_create_cleaning_reports(output_dir))
    sample_info.extend(_create_samplerate_samples(output_dir))
    
    return sample_info


def _create_audio_samples(output_dir: Path):
    """创建音频样例"""
    samples = []
    
    sr_normal = 44100
    sr_low = 8000
    duration = 3.0
    
    t_normal = np.linspace(0, duration, int(sr_normal * duration), endpoint=False)
    t_low = np.linspace(0, duration, int(sr_low * duration), endpoint=False)
    
    clean_signal = 0.5 * np.sin(2 * np.pi * 440 * t_normal)
    clean_signal += 0.3 * np.sin(2 * np.pi * 880 * t_normal)
    clean_file = output_dir / "clean_tone_44100Hz.wav"
    sf.write(str(clean_file), clean_signal, sr_normal)
    samples.append({
        "name": clean_file.name,
        "description": "纯净音调信号，44100Hz采样率"
    })
    
    noisy_signal = clean_signal + 0.1 * np.random.randn(len(clean_signal))
    noisy_file = output_dir / "noisy_tone_44100Hz.wav"
    sf.write(str(noisy_file), noisy_signal, sr_normal)
    samples.append({
        "name": noisy_file.name,
        "description": "带高斯噪声的音调信号，用于测试噪声清洗"
    })
    
    low_sr_signal = 0.5 * np.sin(2 * np.pi * 440 * t_low)
    low_sr_signal += 0.3 * np.sin(2 * np.pi * 880 * t_low)
    low_sr_file = output_dir / "low_samplerate_8000Hz.wav"
    sf.write(str(low_sr_file), low_sr_signal, sr_low)
    samples.append({
        "name": low_sr_file.name,
        "description": "低采样率音频（8000Hz），用于测试采样率错误检测"
    })
    
    seg1 = 0.5 * np.sin(2 * np.pi * 440 * t_normal[:int(sr_normal * 1.5)])
    seg2_sr = 22050
    t2 = np.linspace(0, 1.5, int(seg2_sr * 1.5), endpoint=False)
    seg2 = 0.5 * np.sin(2 * np.pi * 880 * t2)
    seg2_resampled = np.interp(
        np.linspace(0, 1.5, int(sr_normal * 1.5)),
        np.linspace(0, 1.5, len(seg2)),
        seg2
    )
    mismatched_signal = np.concatenate([seg1, seg2_resampled])
    mismatch_file = output_dir / "mismatched_segments.wav"
    sf.write(str(mismatch_file), mismatched_signal, sr_normal)
    samples.append({
        "name": mismatch_file.name,
        "description": "不同采样率拼接的音频，用于测试分段不匹配检测"
    })
    
    high_freq_noise = 0.5 * np.sin(2 * np.pi * 440 * t_normal)
    high_freq_noise += 0.2 * np.sin(2 * np.pi * 20000 * t_normal)
    high_freq_noise += 0.15 * np.sin(2 * np.pi * 21000 * t_normal)
    aliasing_file = output_dir / "potential_aliasing.wav"
    sf.write(str(aliasing_file), high_freq_noise, sr_normal)
    samples.append({
        "name": aliasing_file.name,
        "description": "含高频成分的音频，用于测试频段混叠检测"
    })
    
    return samples


def _create_cleaning_reports(output_dir: Path):
    """创建清洗报告样例"""
    reports = []
    
    report_data = {
        "report_id": "RPT-2024-001",
        "created_at": "2024-01-15T10:30:00",
        "file": "lecture_recording.wav",
        "original_samplerate": 44100,
        "records": [
            {
                "id": 1,
                "timestamp": "00:00:15",
                "type": "samplerate_mismatch",
                "source": "导入材料-第2段",
                "severity": "high",
                "description": "采样率从44100Hz突变为22050Hz",
                "status": "resolved",
                "resolved_at": "2024-01-15T11:00:00",
                "note": "重采样至统一44100Hz"
            },
            {
                "id": 2,
                "timestamp": "00:02:30",
                "type": "frequency_folding",
                "source": "原始录制",
                "severity": "medium",
                "description": "检测到频率折叠，奈奎斯特频率附近能量异常",
                "status": "pending",
                "note": ""
            },
            {
                "id": 3,
                "timestamp": "00:05:00",
                "type": "over_filtering",
                "source": "清洗过程",
                "severity": "high",
                "description": "能量保留率仅25%，过度滤波",
                "status": "resolved",
                "resolved_at": "2024-01-15T14:20:00",
                "note": "阈值从0.3调整为0.15"
            },
            {
                "id": 4,
                "timestamp": "00:07:45",
                "type": "band_overlap",
                "source": "频段边界",
                "severity": "low",
                "description": "Bass和Low Mid频段边界模糊",
                "status": "resolved",
                "resolved_at": "2024-01-15T15:30:00",
                "note": "调整边界从250Hz至260Hz"
            }
        ],
        "summary": {
            "total_issues": 4,
            "resolved": 3,
            "pending": 1,
            "high_severity": 2,
            "medium_severity": 1,
            "low_severity": 1
        }
    }
    
    report_file = output_dir / "cleaning_report_sample.json"
    report_file.write_text(json.dumps(report_data, indent=2, ensure_ascii=False))
    reports.append({
        "name": report_file.name,
        "description": "清洗报告JSON样例，包含完整记录"
    })
    
    csv_file = output_dir / "cleaning_log.csv"
    with open(csv_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(["记录ID", "时间点", "异常类型", "来源材料", "严重程度", 
                         "描述", "状态", "解决时间", "备注"])
        
        writer.writerow(["1", "00:00:15", "samplerate_mismatch", "导入材料-第2段", "high",
                         "采样率从44100Hz突变为22050Hz", "resolved", "2024-01-15 11:00", 
                         "重采样至统一44100Hz"])
        
        writer.writerow(["2", "00:02:30", "frequency_folding", "", "medium",
                         "检测到频率折叠，奈奎斯特频率附近能量异常", "pending", "", 
                         ""])
        
        writer.writerow(["3", "", "over_filtering", "清洗过程", "high",
                         "能量保留率仅25%，过度滤波", "resolved", "2024-01-15 14:20", 
                         "阈值从0.3调整为0.15"])
        
        writer.writerow(["4", "00:07:45", "band_overlap", "频段边界", "low",
                         "Bass和Low Mid频段边界模糊", "resolved", "", 
                         "调整边界从250Hz至260Hz [备注修改]"])
        
        writer.writerow(["5", "00:10:00", "clock_jitter", "录制设备", "low",
                         "检测到轻微时钟抖动", "resolved", "2024-01-16 09:15", 
                         "【晚补记录】次日确认不影响质量"])
    
    reports.append({
        "name": csv_file.name,
        "description": "清洗日志CSV样例，含缺字段、晚补记录、修改过的备注"
    })
    
    return reports


def _create_samplerate_samples(output_dir: Path):
    """创建采样率样例配置"""
    samples = []
    
    config_data = {
        "samplerate_options": [
            {"rate": 8000, "label": "电话质量", "nyquist": 4000},
            {"rate": 22050, "label": "低质量音频", "nyquist": 11025},
            {"rate": 44100, "label": "CD质量", "nyquist": 22050},
            {"rate": 48000, "label": "专业音频", "nyquist": 24000},
            {"rate": 96000, "label": "高分辨率", "nyquist": 48000}
        ],
        "error_triggers": [
            {
                "trigger": "mix_samplerate_sources",
                "description": "混合不同采样率的音频源",
                "howto": "将44100Hz和22050Hz的音频拼接在一起",
                "detection": "segment_mismatch检测器会识别频谱质心突变"
            },
            {
                "trigger": "insufficient_samplerate",
                "description": "使用过低的采样率录制高频信号",
                "howto": "用8000Hz采样率录制包含5kHz以上频率的信号",
                "detection": "nyquist_violation和mirror_frequencies检测器触发"
            },
            {
                "trigger": "incorrect_resample",
                "description": "错误的重采样操作",
                "howto": "强制将低采样率音频重采样到高频而不进行抗混叠滤波",
                "detection": "resample_artifact检测器识别高频伪影"
            }
        ]
    }
    
    config_file = output_dir / "samplerate_guide.json"
    config_file.write_text(json.dumps(config_data, indent=2, ensure_ascii=False))
    samples.append({
        "name": config_file.name,
        "description": "采样率配置和错误触发指南"
    })
    
    return samples
