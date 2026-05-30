import json
import csv
import os
from datetime import datetime
from dataclasses import asdict
from typing import Dict, List
import numpy as np
from core_audio import AudioFeatures, detect_speed_change, detect_transposition
from similarity import SimilarityResult


def generate_anomaly_report(feat1: AudioFeatures, feat2: AudioFeatures,
                            similarity: SimilarityResult,
                            speed_change: Dict, transposition: Dict) -> Dict:
    issues = []
    warnings = []

    if speed_change['is_speed_changed']:
        severity_map = {'轻微': 'low', '中度': 'medium', '显著': 'high'}
        severity = severity_map.get(speed_change.get('severity', '未知'), 'unknown')
        issues.append({
            'type': 'speed_change',
            'severity': severity,
            'confidence': speed_change['confidence'],
            'title': f"⚠️ 检测到{speed_change.get('direction', '变速')} ({speed_change.get('severity', '未知')})",
            'description': f"文件2相对于文件1存在{speed_change.get('direction', '变速')}处理，"
                          f"速度因子为 {speed_change['speed_factor']:.4f}。"
                          f"文件1 BPM: {speed_change['tempo1_bpm']:.1f}, "
                          f"文件2 BPM: {speed_change['tempo2_bpm']:.1f}。",
            'evidence': {
                'tempo_ratio': speed_change['tempo_ratio'],
                'interval_ratio': speed_change['interval_ratio'],
                'duration_ratio': speed_change['duration_ratio']
            },
            'material_ref': {
                'file': feat2.file_path,
                'note': '此文件被识别为变速版本，请核对原始素材来源'
            }
        })

    if transposition['is_transposed']:
        severity_map = {'轻微': 'low', '中度': 'medium', '显著': 'high'}
        severity = severity_map.get(transposition.get('severity', '未知'), 'unknown')
        issues.append({
            'type': 'transposition',
            'severity': severity,
            'confidence': transposition['confidence'],
            'title': f"⚠️ 检测到{transposition.get('direction', '移调')} ({transposition.get('severity', '未知')})",
            'description': f"文件2相对于文件1存在{transposition.get('direction', '移调')}处理，"
                          f"移调幅度为 {transposition['semitone_shift']:+d} 个半音。"
                          f"色度相关系数: {transposition['chroma_correlation']:.4f}。",
            'evidence': {
                'semitone_shift': transposition['semitone_shift'],
                'chroma_correlation': transposition['chroma_correlation'],
                'pitch_based_shift': transposition['pitch_based_shift'],
                'shift_confirmed': transposition['shift_confirmed']
            },
            'material_ref': {
                'file': feat2.file_path,
                'note': '此文件被识别为移调片段，相似度计算已自动修正移调影响'
            }
        })

    high_sim_segments = [s for s in similarity.matched_segments if s['avg_similarity'] >= 0.85]
    if high_sim_segments:
        total_matched_duration = sum(s['file1_duration'] for s in high_sim_segments)
        issues.append({
            'type': 'high_similarity_segments',
            'severity': 'high' if total_matched_duration >= 2.0 else 'medium',
            'confidence': min(1.0, np.mean([s['avg_similarity'] for s in high_sim_segments])),
            'title': f"⚠️ 检测到 {len(high_sim_segments)} 个高度相似片段 (≥0.85)",
            'description': f"累计匹配时长: {total_matched_duration:.2f} 秒。"
                          f"请人工复核这些片段是否构成实质性相似。",
            'segments': high_sim_segments,
            'material_ref': {
                'file1': feat1.file_path,
                'file2': feat2.file_path,
                'note': '请重点核对这些时间段内的音频内容'
            }
        })

    if similarity.overall_similarity >= 0.7:
        warnings.append({
            'type': 'high_overall_similarity',
            'title': f"整体相似度较高: {similarity.overall_similarity:.3f}",
            'description': '两首音频的整体相似度超过0.7的警戒阈值，建议进行完整人工复核。'
        })

    if similarity.beat_alignment_quality < 0.5:
        warnings.append({
            'type': 'low_alignment_quality',
            'title': f"节拍对齐质量偏低: {similarity.beat_alignment_quality:.3f}",
            'description': 'DTW动态时间规整的对齐质量较低，相似度计算结果可能存在偏差，建议谨慎参考。'
        })

    if similarity.confidence < 0.6:
        warnings.append({
            'type': 'low_confidence',
            'title': f"分析置信度偏低: {similarity.confidence:.3f}",
            'description': '分析结果的整体置信度较低，可能由于音频质量差、节拍不明显或内容差异大导致。'
        })

    aligned_beats = {
        'file1_beat_times': [round(t, 4) for t in feat1.beat_times.tolist()],
        'file2_beat_times': [round(t, 4) for t in feat2.beat_times.tolist()],
        'alignment_quality': round(similarity.beat_alignment_quality, 4),
        'beat_similarity': round(similarity.beat_similarity, 4),
        'warp_path_length': len(similarity.warp_path)
    }

    report = {
        'analysis_id': datetime.now().strftime('%Y%m%d_%H%M%S'),
        'analysis_time': datetime.now().isoformat(),
        'files': {
            'file1': feat1.summary(),
            'file2': feat2.summary()
        },
        'similarity': {
            'overall': round(similarity.overall_similarity, 4),
            'beat': round(similarity.beat_similarity, 4),
            'melody': round(similarity.melody_similarity, 4),
            'chroma': round(similarity.chroma_similarity, 4),
            'timbre': round(similarity.timbre_similarity, 4),
            'rhythmic': round(similarity.rhythmic_similarity, 4),
            'dtw_distance': round(similarity.dtw_distance, 4),
            'confidence': round(similarity.confidence, 4),
            'transposition_correction_applied': similarity.applied_transposition_shift != 0,
            'applied_transposition_shift': similarity.applied_transposition_shift,
            'speed_normalization_applied': similarity.applied_speed_factor != 1.0,
            'applied_speed_factor': round(similarity.applied_speed_factor, 4)
        },
        'anomaly_detection': {
            'speed_change': speed_change,
            'transposition': transposition
        },
        'beat_alignment': aligned_beats,
        'matched_segments': similarity.matched_segments,
        'issues': issues,
        'warnings': warnings,
        'verdict': generate_verdict(similarity, speed_change, transposition)
    }

    return report


def generate_verdict(similarity: SimilarityResult,
                     speed_change: Dict, transposition: Dict) -> Dict:
    overall_sim = similarity.overall_similarity
    confidence = similarity.confidence
    has_issues = speed_change['is_speed_changed'] or transposition['is_transposed']
    has_high_sim_segments = any(s['avg_similarity'] >= 0.85 for s in similarity.matched_segments)

    if overall_sim >= 0.8 and confidence >= 0.7:
        if has_issues:
            level = 'HIGH_RISK'
            recommendation = '高度疑似抄袭，存在变速/移调伪装。建议立即启动版权复核流程，重点核对检测到的异常片段。'
        else:
            level = 'HIGH_RISK'
            recommendation = '高度疑似抄袭，相似度极高且无明显伪装处理。建议立即启动版权复核流程。'
    elif overall_sim >= 0.65 and confidence >= 0.6:
        if has_high_sim_segments or has_issues:
            level = 'MEDIUM_RISK'
            recommendation = '中度疑似抄袭，存在部分高度相似片段或变速/移调处理。建议进行人工复核，重点关注标记的匹配时段。'
        else:
            level = 'LOW_MEDIUM_RISK'
            recommendation = '存在一定相似性，但无明显抄袭特征。建议进行快速人工复核，确认是否为巧合或合理使用。'
    elif overall_sim >= 0.5:
        level = 'LOW_RISK'
        recommendation = '相似性较低，大概率为巧合或普通音乐共性。可酌情进行抽样复核。'
    else:
        level = 'NO_RISK'
        recommendation = '无明显相似性，排除抄袭嫌疑。'

    risk_score = calculate_risk_score(similarity, speed_change, transposition)

    return {
        'risk_level': level,
        'risk_score': risk_score,
        'recommendation': recommendation,
        'needs_manual_review': level in ['HIGH_RISK', 'MEDIUM_RISK', 'LOW_MEDIUM_RISK']
    }


def calculate_risk_score(similarity: SimilarityResult,
                         speed_change: Dict, transposition: Dict) -> int:
    score = 0

    score += int(similarity.overall_similarity * 50)

    if speed_change['is_speed_changed']:
        score += int(speed_change['confidence'] * 15)
    if transposition['is_transposed']:
        score += int(transposition['confidence'] * 15)

    high_sim_segments = [s for s in similarity.matched_segments if s['avg_similarity'] >= 0.85]
    if high_sim_segments:
        total_duration = sum(s['file1_duration'] for s in high_sim_segments)
        score += min(20, int(total_duration * 5))

    score += int(similarity.confidence * 10)

    return min(100, max(0, score))


def export_to_json(report: Dict, output_path: str) -> str:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2, default=str)
    return output_path


def export_to_csv(report: Dict, output_dir: str) -> List[str]:
    os.makedirs(output_dir, exist_ok=True)
    files = []

    summary_path = os.path.join(output_dir, 'summary_report.csv')
    with open(summary_path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['项目', '内容'])
        writer.writerow(['分析ID', report['analysis_id']])
        writer.writerow(['分析时间', report['analysis_time']])
        writer.writerow([])
        writer.writerow(['文件1路径', report['files']['file1']['file_path']])
        writer.writerow(['文件1时长(秒)', report['files']['file1']['duration_seconds']])
        writer.writerow(['文件1 BPM', report['files']['file1']['tempo_bpm']])
        writer.writerow([])
        writer.writerow(['文件2路径', report['files']['file2']['file_path']])
        writer.writerow(['文件2时长(秒)', report['files']['file2']['duration_seconds']])
        writer.writerow(['文件2 BPM', report['files']['file2']['tempo_bpm']])
        writer.writerow([])
        writer.writerow(['整体相似度', report['similarity']['overall']])
        writer.writerow(['节拍相似度', report['similarity']['beat']])
        writer.writerow(['旋律相似度', report['similarity']['melody']])
        writer.writerow(['色度相似度', report['similarity']['chroma']])
        writer.writerow(['音色相似度', report['similarity']['timbre']])
        writer.writerow(['节奏相似度', report['similarity']['rhythmic']])
        writer.writerow(['DTW距离', report['similarity']['dtw_distance']])
        writer.writerow(['分析置信度', report['similarity']['confidence']])
        writer.writerow([])
        writer.writerow(['是否检测到变速', report['anomaly_detection']['speed_change']['is_speed_changed']])
        writer.writerow(['速度因子', report['anomaly_detection']['speed_change']['speed_factor']])
        writer.writerow(['变速检测置信度', report['anomaly_detection']['speed_change']['confidence']])
        writer.writerow([])
        writer.writerow(['是否检测到移调', report['anomaly_detection']['transposition']['is_transposed']])
        writer.writerow(['移调半音数', report['anomaly_detection']['transposition']['semitone_shift']])
        writer.writerow(['移调检测置信度', report['anomaly_detection']['transposition']['confidence']])
        writer.writerow([])
        writer.writerow(['风险等级', report['verdict']['risk_level']])
        writer.writerow(['风险分值', report['verdict']['risk_score']])
        writer.writerow(['是否需要人工复核', report['verdict']['needs_manual_review']])
        writer.writerow(['建议', report['verdict']['recommendation']])
    files.append(summary_path)

    beats_path = os.path.join(output_dir, 'beat_alignment.csv')
    with open(beats_path, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow(['节拍编号', '文件1节拍时间(秒)', '文件2节拍时间(秒)', '间隔差(秒)'])
        beats1 = report['beat_alignment']['file1_beat_times']
        beats2 = report['beat_alignment']['file2_beat_times']
        max_len = max(len(beats1), len(beats2))
        for i in range(max_len):
            b1 = beats1[i] if i < len(beats1) else ''
            b2 = beats2[i] if i < len(beats2) else ''
            diff = round(abs(float(b1) - float(b2)), 4) if b1 and b2 else ''
            writer.writerow([i+1, b1, b2, diff])
    files.append(beats_path)

    if report['matched_segments']:
        segments_path = os.path.join(output_dir, 'matched_segments.csv')
        with open(segments_path, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['片段编号', '文件1开始(秒)', '文件1结束(秒)', '文件1时长(秒)',
                           '文件2开始(秒)', '文件2结束(秒)', '文件2时长(秒)',
                           '平均相似度', '帧数量'])
            for i, seg in enumerate(report['matched_segments']):
                writer.writerow([
                    i+1,
                    seg['file1_start_time'], seg['file1_end_time'], seg['file1_duration'],
                    seg['file2_start_time'], seg['file2_end_time'], seg['file2_duration'],
                    seg['avg_similarity'], seg['num_frames']
                ])
        files.append(segments_path)

    if report['issues']:
        issues_path = os.path.join(output_dir, 'issues.csv')
        with open(issues_path, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['序号', '类型', '严重程度', '置信度', '标题', '描述', '关联文件'])
            for i, issue in enumerate(report['issues']):
                material = issue.get('material_ref', {})
                file_ref = material.get('file', material.get('file1', '') + ' / ' + material.get('file2', ''))
                writer.writerow([
                    i+1,
                    issue['type'],
                    issue['severity'],
                    issue['confidence'],
                    issue['title'],
                    issue['description'],
                    file_ref
                ])
        files.append(issues_path)

    return files


def print_console_report(report: Dict) -> None:
    sep = '=' * 70
    print(sep)
    print('🎵 声学节拍相似度分析报告'.center(60))
    print(sep)

    print(f"\n📄 分析信息:")
    print(f"  分析ID: {report['analysis_id']}")
    print(f"  分析时间: {report['analysis_time']}")

    print(f"\n📁 文件信息:")
    f1 = report['files']['file1']
    f2 = report['files']['file2']
    print(f"  [文件1] {os.path.basename(f1['file_path'])}")
    print(f"         时长: {f1['duration_seconds']:.2f}s  |  BPM: {f1['tempo_bpm']:.1f}  |  节拍数: {f1['num_beats']}")
    print(f"  [文件2] {os.path.basename(f2['file_path'])}")
    print(f"         时长: {f2['duration_seconds']:.2f}s  |  BPM: {f2['tempo_bpm']:.1f}  |  节拍数: {f2['num_beats']}")

    sim = report['similarity']
    print(f"\n📊 相似度分析:")
    print(f"  整体相似度: {sim['overall']:.3f}  {'⚠️' if sim['overall'] >= 0.7 else ''}")
    print(f"  节拍相似度: {sim['beat']:.3f}")
    print(f"  旋律相似度: {sim['melody']:.3f}")
    print(f"  色度相似度: {sim['chroma']:.3f}")
    print(f"  音色相似度: {sim['timbre']:.3f}")
    print(f"  节奏相似度: {sim['rhythmic']:.3f}")
    print(f"  DTW距离:    {sim['dtw_distance']:.4f}")
    print(f"  分析置信度: {sim['confidence']:.3f}")

    if sim['transposition_correction_applied']:
        print(f"  ℹ️  已自动修正移调: {sim['applied_transposition_shift']:+d} 半音")
    if sim['speed_normalization_applied'] and sim['applied_speed_factor'] != 1.0:
        print(f"  ℹ️  已应用速度归一化: {sim['applied_speed_factor']:.4f}x")

    print(f"\n🔍 异常检测:")
    sc = report['anomaly_detection']['speed_change']
    tp = report['anomaly_detection']['transposition']

    if sc['is_speed_changed']:
        speed_indicator = '🚨' if sc.get('severity') in ['显著', '中度'] else '⚠️'
        print(f"  {speed_indicator} 变速检测: {sc.get('direction', '检测到变速')} ({sc.get('severity', '未知')})")
        print(f"     速度因子: {sc['speed_factor']:.4f}  |  置信度: {sc['confidence']:.3f}")
        print(f"     文件1 BPM: {sc['tempo1_bpm']:.1f} → 文件2 BPM: {sc['tempo2_bpm']:.1f}")
    else:
        print(f"  ✓ 速度检测: 一致 (因子: {sc['speed_factor']:.4f}, 置信度: {sc['confidence']:.3f})")

    if tp['is_transposed']:
        trans_indicator = '🚨' if tp.get('severity') in ['显著', '中度'] else '⚠️'
        print(f"  {trans_indicator} 移调检测: {tp.get('direction', '检测到移调')} ({tp.get('severity', '未知')})")
        print(f"     移调幅度: {tp['semitone_shift']:+d} 半音  |  置信度: {tp['confidence']:.3f}")
        print(f"     色度相关: {tp['chroma_correlation']:.4f}  |  验证: {'✓ 一致' if tp.get('shift_confirmed') else '✗ 待确认'}")
    else:
        print(f"  ✓ 移调检测: 一致 (最佳匹配: {tp['semitone_shift']:+d}半音, 相关: {tp['chroma_correlation']:.4f})")

    if report['matched_segments']:
        print(f"\n🎯 匹配片段 ({len(report['matched_segments'])} 个):")
        for i, seg in enumerate(report['matched_segments']):
            color = '🔴' if seg['avg_similarity'] >= 0.85 else '🟠' if seg['avg_similarity'] >= 0.7 else '🟡'
            print(f"  {color} 片段 {i+1}: 相似度={seg['avg_similarity']:.3f}")
            print(f"     文件1: {seg['file1_start_time']:.3f}s → {seg['file1_end_time']:.3f}s (时长: {seg['file1_duration']:.3f}s)")
            print(f"     文件2: {seg['file2_start_time']:.3f}s → {seg['file2_end_time']:.3f}s (时长: {seg['file2_duration']:.3f}s)")
    else:
        print(f"\n🎯 匹配片段: 未检测到长度≥0.5秒的连续匹配片段")

    verdict = report['verdict']
    print(f"\n⚖️  分析结论:")
    risk_colors = {'HIGH_RISK': '🔴 高风险', 'MEDIUM_RISK': '🟠 中风险',
                   'LOW_MEDIUM_RISK': '🟡 中低风险', 'LOW_RISK': '🟢 低风险', 'NO_RISK': '✅ 无风险'}
    print(f"  风险等级: {risk_colors.get(verdict['risk_level'], verdict['risk_level'])}")
    print(f"  风险分值: {verdict['risk_score']}/100")
    print(f"  人工复核: {'✅ 需要' if verdict['needs_manual_review'] else '❌ 无需'}")
    print(f"  建议: {verdict['recommendation']}")

    if report['warnings']:
        print(f"\n⚠️  注意事项:")
        for w in report['warnings']:
            print(f"  - {w['title']}")
            print(f"    {w['description']}")

    print(f"\n{sep}\n")


def run_full_analysis(file1_path: str, file2_path: str,
                      output_dir: str = './analysis_output',
                      enable_transposition_invariance: bool = True,
                      enable_speed_normalization: bool = True) -> Dict:
    from core_audio import extract_all_features
    from similarity import compute_acoustic_beat_similarity
    from visualization import generate_all_plots

    print(f"\n🔄 开始分析:")
    print(f"  文件1: {file1_path}")
    print(f"  文件2: {file2_path}")
    print(f"  输出目录: {output_dir}\n")

    print("  📥 加载并提取文件1特征...", end='', flush=True)
    feat1 = extract_all_features(file1_path)
    print(f" ✓ 完成 (时长: {feat1.duration:.2f}s, BPM: {feat1.tempo:.1f})")

    print("  📥 加载并提取文件2特征...", end='', flush=True)
    feat2 = extract_all_features(file2_path)
    print(f" ✓ 完成 (时长: {feat2.duration:.2f}s, BPM: {feat2.tempo:.1f})")

    print("  ⚡ 检测变速处理...", end='', flush=True)
    speed_change = detect_speed_change(feat1, feat2)
    speed_status = '⚠️ 检测到变速' if speed_change['is_speed_changed'] else '✓ 速度一致'
    print(f" {speed_status} (因子: {speed_change['speed_factor']:.4f})")

    print("  🎼 检测移调处理...", end='', flush=True)
    transposition = detect_transposition(feat1, feat2)
    trans_status = '⚠️ 检测到移调' if transposition['is_transposed'] else '✓ 调式一致'
    print(f" {trans_status} ({transposition['semitone_shift']:+d}半音, 相关: {transposition['chroma_correlation']:.4f})")

    print("  🧮 计算声学节拍相似度...", end='', flush=True)
    similarity = compute_acoustic_beat_similarity(
        feat1, feat2,
        enable_transposition_invariance=enable_transposition_invariance,
        enable_speed_normalization=enable_speed_normalization,
        speed_factor=speed_change['speed_factor'] if enable_speed_normalization else None
    )
    print(f" ✓ 完成 (整体相似度: {similarity.overall_similarity:.3f})")

    print("  📊 生成可视化图表...", end='', flush=True)
    plots = generate_all_plots(feat1, feat2, similarity, speed_change, transposition, output_dir)
    print(f" ✓ 完成 ({len(plots)} 张图表)")

    print("  📝 生成分析报告...", end='', flush=True)
    report = generate_anomaly_report(feat1, feat2, similarity, speed_change, transposition)
    print(" ✓ 完成")

    print("  💾 导出JSON报告...", end='', flush=True)
    json_path = os.path.join(output_dir, 'full_report.json')
    export_to_json(report, json_path)
    print(f" ✓ 完成 ({json_path})")

    print("  💾 导出CSV表格...", end='', flush=True)
    csv_files = export_to_csv(report, output_dir)
    print(f" ✓ 完成 ({len(csv_files)} 个文件)")

    print("\n✅ 分析完成!\n")

    print_console_report(report)

    report['output_files'] = {
        'plots': plots,
        'json_report': json_path,
        'csv_files': csv_files
    }

    return report
