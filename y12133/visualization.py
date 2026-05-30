import numpy as np
import librosa
import librosa.display
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib import rcParams
from typing import Dict, List
import os
from core_audio import AudioFeatures
from similarity import SimilarityResult

rcParams['font.sans-serif'] = ['Arial Unicode MS', 'DejaVu Sans', 'SimHei']
rcParams['axes.unicode_minus'] = False

COLORS = {
    'file1': '#2196F3',
    'file2': '#FF5722',
    'beat1': '#1565C0',
    'beat2': '#D84315',
    'matched': '#4CAF50',
    'warning': '#FF9800',
    'error': '#F44336',
    'high_sim': '#4CAF50',
    'med_sim': '#FF9800',
    'low_sim': '#F44336'
}


def _format_time(seconds: float) -> str:
    mins = int(seconds // 60)
    secs = seconds % 60
    return f"{mins}:{secs:06.3f}"


def _get_sim_color(sim: float) -> str:
    if sim >= 0.8:
        return COLORS['high_sim']
    elif sim >= 0.6:
        return COLORS['med_sim']
    else:
        return COLORS['low_sim']


def plot_waveform_comparison(feat1: AudioFeatures, feat2: AudioFeatures,
                             similarity: SimilarityResult,
                             speed_change: Dict, transposition: Dict,
                             output_dir: str) -> str:
    fig, axes = plt.subplots(4, 1, figsize=(16, 12), sharex=False)
    fig.suptitle('音频波形与节拍点对比分析', fontsize=16, fontweight='bold', y=0.995)

    times1 = np.arange(len(feat1.y)) / feat1.sr
    times2 = np.arange(len(feat2.y)) / feat2.sr

    ax = axes[0]
    ax.plot(times1, feat1.y, color=COLORS['file1'], alpha=0.7, linewidth=0.5, label='原始音频')
    for bt in feat1.beat_times:
        ax.axvline(x=bt, color=COLORS['beat1'], linestyle='--', alpha=0.6, linewidth=1)
        ax.plot(bt, 0, 'v', color=COLORS['beat1'], markersize=6, zorder=5)
    ax.set_ylabel('振幅')
    ax.set_title(f'文件1: {os.path.basename(feat1.file_path)}  |  BPM: {feat1.tempo:.1f}  |  时长: {feat1.duration:.2f}s',
                 fontsize=11, backgroundcolor=COLORS['file1'] + '30')
    ax.grid(alpha=0.3)
    ax.legend(loc='upper right')

    ax = axes[1]
    ax.plot(times2, feat2.y, color=COLORS['file2'], alpha=0.7, linewidth=0.5, label='待检测音频')
    for bt in feat2.beat_times:
        ax.axvline(x=bt, color=COLORS['beat2'], linestyle='--', alpha=0.6, linewidth=1)
        ax.plot(bt, 0, 'v', color=COLORS['beat2'], markersize=6, zorder=5)
    ax.set_ylabel('振幅')
    title = f'文件2: {os.path.basename(feat2.file_path)}  |  BPM: {feat2.tempo:.1f}  |  时长: {feat2.duration:.2f}s'
    bg_color = COLORS['warning'] + '30' if speed_change['is_speed_changed'] or transposition['is_transposed'] else COLORS['file2'] + '30'
    ax.set_title(title, fontsize=11, backgroundcolor=bg_color)
    ax.grid(alpha=0.3)
    ax.legend(loc='upper right')

    ax = axes[2]
    max_beats = max(len(feat1.beat_times), len(feat2.beat_times))
    x_axis = np.arange(max_beats)
    intervals1 = np.diff(feat1.beat_times) if len(feat1.beat_times) > 1 else np.array([0])
    intervals2 = np.diff(feat2.beat_times) if len(feat2.beat_times) > 1 else np.array([0])
    ax.bar(x_axis[:len(intervals1)] - 0.2, intervals1, 0.4, color=COLORS['file1'], alpha=0.7, label='文件1 节拍间隔')
    ax.bar(x_axis[:len(intervals2)] + 0.2, intervals2, 0.4, color=COLORS['file2'], alpha=0.7, label='文件2 节拍间隔')
    ax.set_xlabel('节拍编号')
    ax.set_ylabel('间隔时长 (秒)')
    ax.set_title(f'节拍间隔对比  |  节拍相似度: {similarity.beat_similarity:.3f}', fontsize=11)
    ax.grid(alpha=0.3, axis='y')
    ax.legend()

    ax = axes[3]
    if similarity.matched_segments:
        for i, seg in enumerate(similarity.matched_segments):
            color = _get_sim_color(seg['avg_similarity'])
            ax.barh(y=[i], width=[seg['file1_duration']], left=[seg['file1_start_time']],
                    height=0.3, color=color, alpha=0.7, label=f'文件1 匹配段 {i+1} (相似度:{seg["avg_similarity"]:.2f})')
            ax.barh(y=[i + 0.4], width=[seg['file2_duration']], left=[seg['file2_start_time']],
                    height=0.3, color=color, alpha=0.5, hatch='///', label=f'文件2 匹配段 {i+1}')
            ax.text(seg['file1_start_time'] + seg['file1_duration'] / 2, i,
                   f'文件1: {_format_time(seg["file1_start_time"])}-{_format_time(seg["file1_end_time"])}',
                   ha='center', va='center', fontsize=8, color='black')
            ax.text(seg['file2_start_time'] + seg['file2_duration'] / 2, i + 0.4,
                   f'文件2: {_format_time(seg["file2_start_time"])}-{_format_time(seg["file2_end_time"])}',
                   ha='center', va='center', fontsize=8, color='black')
        ax.set_xlabel('时间 (秒)')
        ax.set_yticks(np.arange(len(similarity.matched_segments)) + 0.2)
        ax.set_yticklabels([f'匹配片段 {i+1}' for i in range(len(similarity.matched_segments))])
        ax.set_title(f'检测到 {len(similarity.matched_segments)} 个高度相似片段', fontsize=11)
        ax.grid(alpha=0.3, axis='x')
        if len(similarity.matched_segments) <= 3:
            ax.legend(loc='upper right', fontsize=8)
    else:
        ax.text(0.5, 0.5, '未检测到长度超过0.5秒的连续匹配片段',
                ha='center', va='center', fontsize=12, alpha=0.6, transform=ax.transAxes)
        ax.set_title('匹配片段检测结果', fontsize=11)
        ax.set_yticks([])

    plt.tight_layout(rect=[0, 0, 1, 0.98])
    output_path = os.path.join(output_dir, '01_waveform_beat_comparison.png')
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    return output_path


def plot_melody_contour(feat1: AudioFeatures, feat2: AudioFeatures,
                        similarity: SimilarityResult,
                        transposition: Dict,
                        output_dir: str) -> str:
    fig, axes = plt.subplots(3, 1, figsize=(16, 10))
    fig.suptitle('旋律轮廓与色度特征对比', fontsize=16, fontweight='bold', y=0.995)

    ax = axes[0]
    pitch1_midi = np.array([librosa.hz_to_midi(p) if p > 0 else np.nan for p in feat1.pitch_contour])
    pitch2_midi = np.array([librosa.hz_to_midi(p) if p > 0 else np.nan for p in feat2.pitch_contour])

    if transposition['is_transposed']:
        shift = transposition['semitone_shift']
        pitch2_midi_adj = pitch2_midi - shift
        ax.plot(feat2.pitch_times, pitch2_midi_adj, color=COLORS['file2'], alpha=0.7,
                linewidth=0.8, label=f'文件2 (已修正移调 -{shift}半音)')
    else:
        ax.plot(feat2.pitch_times, pitch2_midi, color=COLORS['file2'], alpha=0.7,
                linewidth=0.8, label='文件2')

    ax.plot(feat1.pitch_times, pitch1_midi, color=COLORS['file1'], alpha=0.8,
            linewidth=0.8, label='文件1')
    ax.set_ylabel('音高 (MIDI)')
    ax.set_title(f'旋律轮廓对比  |  旋律相似度: {similarity.melody_similarity:.3f}', fontsize=11)
    ax.grid(alpha=0.3)
    ax.legend(loc='upper right')

    ax = axes[1]
    img1 = librosa.display.specshow(feat1.chroma, x_axis='time', y_axis='chroma',
                                   sr=feat1.sr, hop_length=512, ax=ax, cmap='coolwarm')
    for bt in feat1.beat_times:
        ax.axvline(x=bt, color='white', linestyle='-', alpha=0.4, linewidth=0.5)
    ax.set_title(f'文件1 - 色度特征图 (Chroma)  |  节拍点已标记', fontsize=11)
    plt.colorbar(img1, ax=ax, format='%+2.0f dB')

    ax = axes[2]
    chroma2_display = feat2.chroma
    title_suffix = ''
    if transposition['is_transposed']:
        chroma2_display = np.roll(feat2.chroma, transposition['semitone_shift'], axis=0)
        title_suffix = f' (已修正移调 {transposition["direction"]})'
    img2 = librosa.display.specshow(chroma2_display, x_axis='time', y_axis='chroma',
                                   sr=feat2.sr, hop_length=512, ax=ax, cmap='coolwarm')
    for bt in feat2.beat_times:
        ax.axvline(x=bt, color='white', linestyle='-', alpha=0.4, linewidth=0.5)
    ax.set_title(f'文件2 - 色度特征图{title_suffix}  |  色度相似度: {similarity.chroma_similarity:.3f}', fontsize=11)
    plt.colorbar(img2, ax=ax, format='%+2.0f dB')

    plt.tight_layout(rect=[0, 0, 1, 0.98])
    output_path = os.path.join(output_dir, '02_melody_chroma_comparison.png')
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    return output_path


def plot_dtw_alignment(feat1: AudioFeatures, feat2: AudioFeatures,
                       similarity: SimilarityResult,
                       output_dir: str) -> str:
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle('DTW 动态时间规整与节拍对齐分析', fontsize=16, fontweight='bold', y=0.995)

    ax = axes[0, 0]
    warp_path = similarity.warp_path
    if len(warp_path) > 0:
        ax.plot(warp_path[:, 0], warp_path[:, 1], color=COLORS['matched'],
                linewidth=1.5, label='规整路径')
        ax.plot([0, max(warp_path[-1][0], warp_path[-1][1])],
                [0, max(warp_path[-1][0], warp_path[-1][1])],
                'k--', alpha=0.5, label='理想线性对齐')
    ax.set_xlabel('文件1 帧索引')
    ax.set_ylabel('文件2 帧索引')
    ax.set_title(f'DTW 规整路径  |  距离: {similarity.dtw_distance:.4f}  |  对齐质量: {similarity.beat_alignment_quality:.3f}',
                 fontsize=10)
    ax.grid(alpha=0.3)
    ax.legend(loc='lower right')
    ax.set_aspect('equal')

    ax = axes[0, 1]
    aligned_intervals1 = []
    aligned_intervals2 = []
    for i, j in warp_path:
        if i < len(feat1.beat_times) and j < len(feat2.beat_times):
            aligned_intervals1.append(feat1.beat_times[i])
            aligned_intervals2.append(feat2.beat_times[j])

    if aligned_intervals1 and aligned_intervals2:
        for t1, t2 in zip(aligned_intervals1, aligned_intervals2):
            ax.plot([0, 1], [t1, t2], color=COLORS['matched'], alpha=0.3, linewidth=0.5)
        ax.scatter(np.zeros(len(aligned_intervals1)), aligned_intervals1,
                  color=COLORS['file1'], s=20, label='文件1 节拍点')
        ax.scatter(np.ones(len(aligned_intervals2)), aligned_intervals2,
                  color=COLORS['file2'], s=20, label='文件2 节拍点')
    ax.set_xlim(-0.2, 1.2)
    ax.set_xticks([0, 1])
    ax.set_xticklabels(['文件1', '文件2'])
    ax.set_ylabel('时间 (秒)')
    ax.set_title('对齐后的节拍点映射', fontsize=10)
    ax.grid(alpha=0.3, axis='y')
    ax.legend(loc='upper right')

    ax = axes[1, 0]
    sim_components = [
        ('整体相似度', similarity.overall_similarity),
        ('节拍相似度', similarity.beat_similarity),
        ('旋律相似度', similarity.melody_similarity),
        ('色度相似度', similarity.chroma_similarity),
        ('音色相似度', similarity.timbre_similarity),
        ('节奏相似度', similarity.rhythmic_similarity),
    ]
    colors = [_get_sim_color(s) for _, s in sim_components]
    y_pos = np.arange(len(sim_components))
    bars = ax.barh(y_pos, [s for _, s in sim_components], color=colors, alpha=0.8)
    ax.set_yticks(y_pos)
    ax.set_yticklabels([name for name, _ in sim_components])
    ax.set_xlim(0, 1)
    ax.set_xlabel('相似度 (0-1)')
    ax.set_title(f'多维度相似度分解  |  置信度: {similarity.confidence:.3f}', fontsize=10)
    for bar, (_, sim) in zip(bars, sim_components):
        ax.text(bar.get_width() + 0.01, bar.get_y() + bar.get_height() / 2,
               f'{sim:.3f}', va='center', fontsize=9)
    ax.grid(alpha=0.3, axis='x')

    ax = axes[1, 1]
    if similarity.matched_segments:
        for i, seg in enumerate(similarity.matched_segments):
            sim_scores = seg['sim_scores']
            ax.plot(range(len(sim_scores)), sim_scores,
                   marker='o', markersize=3, linewidth=1.5,
                   color=_get_sim_color(seg['avg_similarity']),
                   label=f'片段 {i+1} (平均:{seg["avg_similarity"]:.2f}, 时长:{seg["file1_duration"]:.2f}s)')
        ax.axhline(y=0.7, color=COLORS['warning'], linestyle='--', alpha=0.7, label='高相似度阈值 (0.7)')
        ax.axhline(y=0.8, color=COLORS['high_sim'], linestyle='--', alpha=0.7, label='极高相似度阈值 (0.8)')
        ax.set_xlabel('帧索引')
        ax.set_ylabel('余弦相似度')
        ax.set_title(f'匹配片段内逐帧相似度变化', fontsize=10)
        ax.grid(alpha=0.3)
        ax.legend(loc='lower left', fontsize=8)
        ax.set_ylim(0, 1.05)
    else:
        ax.text(0.5, 0.5, '无匹配片段数据', ha='center', va='center', fontsize=12, alpha=0.6)
        ax.set_title('匹配片段相似度变化', fontsize=10)
        ax.set_ylim(0, 1.05)

    plt.tight_layout(rect=[0, 0, 1, 0.98])
    output_path = os.path.join(output_dir, '03_dtw_alignment_analysis.png')
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    return output_path


def plot_anomaly_detection(speed_change: Dict, transposition: Dict,
                           similarity: SimilarityResult,
                           feat1: AudioFeatures, feat2: AudioFeatures,
                           output_dir: str) -> str:
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle('⚠️ 异常检测 - 变速与移调分析', fontsize=16, fontweight='bold',
                 color='darkred', y=0.995)

    ax = axes[0, 0]
    speed_detected = speed_change['is_speed_changed']
    status_color = COLORS['error'] if speed_detected else COLORS['high_sim']
    status_text = '⚠️ 检测到变速' if speed_detected else '✓ 速度一致'

    ax.text(0.5, 0.85, status_text, ha='center', va='center',
            fontsize=16, fontweight='bold', color=status_color,
            transform=ax.transAxes,
            bbox=dict(boxstyle='round,pad=0.5', facecolor=status_color + '20',
                     edgecolor=status_color, linewidth=2))

    if speed_detected:
        info_text = (
            f"速度因子: {speed_change['speed_factor']:.4f}\n"
            f"方向: {speed_change.get('direction', '未知')}\n"
            f"严重程度: {speed_change.get('severity', '未知')}\n"
            f"文件1 BPM: {speed_change['tempo1_bpm']:.1f}\n"
            f"文件2 BPM: {speed_change['tempo2_bpm']:.1f}\n"
            f"节拍间隔比: {speed_change['interval_ratio']:.4f}\n"
            f"时长比: {speed_change['duration_ratio']:.4f}\n"
            f"检测置信度: {speed_change['confidence']:.3f}"
        )
    else:
        info_text = (
            f"速度因子: {speed_change['speed_factor']:.4f}\n"
            f"文件1 BPM: {speed_change['tempo1_bpm']:.1f}\n"
            f"文件2 BPM: {speed_change['tempo2_bpm']:.1f}\n"
            f"检测置信度: {speed_change['confidence']:.3f}"
        )

    ax.text(0.5, 0.35, info_text, ha='center', va='center', fontsize=11,
            transform=ax.transAxes, linespacing=1.8)
    ax.set_title('变速检测结果', fontsize=12, fontweight='bold')
    ax.set_xticks([])
    ax.set_yticks([])
    for spine in ax.spines.values():
        spine.set_linewidth(2)
        spine.set_color(status_color)

    ax = axes[0, 1]
    trans_detected = transposition['is_transposed']
    status_color = COLORS['error'] if trans_detected else COLORS['high_sim']
    status_text = '⚠️ 检测到移调' if trans_detected else '✓ 调式一致'

    ax.text(0.5, 0.85, status_text, ha='center', va='center',
            fontsize=16, fontweight='bold', color=status_color,
            transform=ax.transAxes,
            bbox=dict(boxstyle='round,pad=0.5', facecolor=status_color + '20',
                     edgecolor=status_color, linewidth=2))

    if trans_detected:
        info_text = (
            f"移调半音数: {transposition['semitone_shift']:+d}\n"
            f"方向: {transposition.get('direction', '未知')}\n"
            f"严重程度: {transposition.get('severity', '未知')}\n"
            f"色度相关系数: {transposition['chroma_correlation']:.4f}\n"
            f"移调方向验证: {'✓ 一致' if transposition.get('shift_confirmed') else '✗ 待确认'}\n"
            f"检测置信度: {transposition['confidence']:.3f}\n"
            f"已自动修正移调进行相似度计算"
        )
    else:
        info_text = (
            f"最佳移调匹配: {transposition['semitone_shift']:+d} 半音\n"
            f"色度相关系数: {transposition['chroma_correlation']:.4f}\n"
            f"检测置信度: {transposition['confidence']:.3f}\n"
            f"无需移调修正"
        )

    ax.text(0.5, 0.35, info_text, ha='center', va='center', fontsize=11,
            transform=ax.transAxes, linespacing=1.8)
    ax.set_title('移调检测结果', fontsize=12, fontweight='bold')
    ax.set_xticks([])
    ax.set_yticks([])
    for spine in ax.spines.values():
        spine.set_linewidth(2)
        spine.set_color(status_color)

    ax = axes[1, 0]
    evidence = ['tempo_ratio', 'interval_ratio', 'duration_ratio']
    values = [speed_change[e] for e in evidence]
    labels = ['BPM比', '节拍间隔比', '时长比']
    colors = [COLORS['warning'] if abs(v - 1.0) > 0.08 else COLORS['high_sim'] for v in values]
    bars = ax.bar(labels, values, color=colors, alpha=0.8)
    ax.axhline(y=1.0, color='black', linestyle='--', alpha=0.5, label='正常值 (1.0)')
    ax.axhspan(0.92, 1.08, alpha=0.15, color=COLORS['high_sim'], label='正常范围')
    for bar, val in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.01,
               f'{val:.3f}', ha='center', va='bottom', fontsize=10)
    ax.set_ylabel('比值 (文件2/文件1)')
    ax.set_title('变速检测多重证据', fontsize=11, fontweight='bold')
    ax.grid(alpha=0.3, axis='y')
    ax.legend(loc='lower right', fontsize=9)

    ax = axes[1, 1]
    shifts = list(range(12))
    correlations = []
    chroma1_mean = np.mean(feat1.chroma, axis=1)
    chroma2_mean = np.mean(feat2.chroma, axis=1)
    for s in shifts:
        corr = np.corrcoef(chroma1_mean, np.roll(chroma2_mean, s, axis=0))[0, 1]
        correlations.append(corr)

    bar_colors = []
    for s, c in zip(shifts, correlations):
        actual_shift = s if s <= 6 else s - 12
        if s == transposition['raw_shift'] and trans_detected:
            bar_colors.append(COLORS['error'])
        elif c > 0.7:
            bar_colors.append(COLORS['warning'])
        else:
            bar_colors.append(COLORS['file1'])

    bars = ax.bar([str(s if s <= 6 else s - 12) for s in shifts], correlations,
                  color=bar_colors, alpha=0.8)
    ax.axhline(y=0.7, color=COLORS['warning'], linestyle='--', alpha=0.7, label='高相关阈值 (0.7)')
    ax.set_xlabel('移调半音数')
    ax.set_ylabel('色度相关系数')
    ax.set_title('各移调档位相关性扫描 (移调不变性验证)', fontsize=10, fontweight='bold')
    ax.grid(alpha=0.3, axis='y')
    ax.legend(loc='upper right', fontsize=9)

    for bar, val in zip(bars, correlations):
        if val > 0.7:
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.01,
                   f'{val:.2f}', ha='center', va='bottom', fontsize=8)

    plt.tight_layout(rect=[0, 0, 1, 0.96])
    output_path = os.path.join(output_dir, '04_anomaly_detection.png')
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    return output_path


def generate_all_plots(feat1: AudioFeatures, feat2: AudioFeatures,
                       similarity: SimilarityResult,
                       speed_change: Dict, transposition: Dict,
                       output_dir: str) -> List[str]:
    os.makedirs(output_dir, exist_ok=True)

    plots = []
    plots.append(plot_waveform_comparison(feat1, feat2, similarity, speed_change, transposition, output_dir))
    plots.append(plot_melody_contour(feat1, feat2, similarity, transposition, output_dir))
    plots.append(plot_dtw_alignment(feat1, feat2, similarity, output_dir))
    plots.append(plot_anomaly_detection(speed_change, transposition, similarity, feat1, feat2, output_dir))

    return plots
