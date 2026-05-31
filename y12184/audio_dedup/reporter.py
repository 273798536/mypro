import json
import os
from datetime import datetime
from typing import List, Dict, Optional

from .deduplicator import DedupResult, DuplicateMatch, DuplicateType, ConfirmStatus
from .reference_tracker import ReferenceTracker, AudioReference
from .fingerprint import AudioFingerprint


def save_fingerprints(fingerprints: List[AudioFingerprint], output_path: str):
    """保存指纹数据到JSON文件"""
    data = []
    for fp in fingerprints:
        data.append({
            "file_path": fp.file_path,
            "file_name": fp.file_name,
            "duration": fp.duration,
            "sample_rate": fp.sample_rate,
            "hash_str": fp.hash_str,
            "file_size": fp.file_size,
            "tempo": fp.tempo,
            "chroma_fingerprint": fp.chroma_fingerprint.tolist(),
            "mfcc_fingerprint": fp.mfcc_fingerprint.tolist(),
            "spectral_contrast": fp.spectral_contrast.tolist()
        })
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _match_to_dict(match: DuplicateMatch) -> Dict:
    return {
        "file1": {
            "path": match.fingerprint1.file_path,
            "name": match.fingerprint1.file_name,
            "duration": match.fingerprint1.duration,
            "hash": match.fingerprint1.hash_str
        },
        "file2": {
            "path": match.fingerprint2.file_path,
            "name": match.fingerprint2.file_name,
            "duration": match.fingerprint2.duration,
            "hash": match.fingerprint2.hash_str
        },
        "duplicate_type": match.duplicate_type.value,
        "similarity": match.similarity,
        "chroma_similarity": match.chroma_similarity,
        "mfcc_similarity": match.mfcc_similarity,
        "speed_ratio": match.speed_ratio,
        "confirm_status": match.confirm_status.value,
        "notes": match.notes,
        "next_action": match.get_next_action()
    }


def generate_json_report(result: Optional[DedupResult], 
                        tracker: Optional[ReferenceTracker], 
                        output_path: str):
    """生成JSON格式报告"""
    report_data = {
        "report_info": {
            "generated_at": datetime.now().isoformat(),
            "version": "0.1.0"
        },
        "fingerprint_methodology": {
            "description": "基于多特征融合的音频指纹技术",
            "features": [
                "Chroma CQT (恒定Q变换色度特征) - 捕捉音高分布，对变速鲁棒",
                "MFCC (梅尔频率倒谱系数) - 捕捉音色特征",
                "Spectral Contrast (频谱对比度) - 捕捉频谱能量分布",
                "Tempo (节拍) - 捕捉节奏特征"
            ],
            "similarity_calculation": "加权综合相似度：Chroma(40%) + MFCC(40%) + Spectral Contrast(20%)",
            "thresholds": {
                "exact_duplicate": ">= 0.95",
                "near_duplicate": "0.7 ~ 0.95",
                "speed_variation": "Chroma > 0.85 且时长比在 0.5~2.0 之间"
            }
        },
        "reference_tracking": {
            "description": "多来源引用追踪系统",
            "sources": [
                "代码扫描 - 自动检测项目代码中的音频引用",
                "标签表导入 - 从元数据标签文件导入",
                "人工补录 - 支持手动添加使用记录"
            ],
            "modification_tracking": "所有字段修改均记录时间戳、操作人和变更前后值"
        }
    }
    
    if result:
        report_data["deduplication"] = {
            "statistics": {
                "total_files": len(result.all_fingerprints),
                "unique_files": len(result.unique_files),
                "exact_duplicates": len(result.exact_duplicates),
                "near_duplicates": len(result.near_duplicates),
                "speed_variations": len(result.speed_variations),
                "same_name_different": len(result.same_name_different),
                "short_audio_candidates": len(result.short_audio_candidates)
            },
            "exact_duplicates": [_match_to_dict(m) for m in result.exact_duplicates],
            "near_duplicates": [_match_to_dict(m) for m in result.near_duplicates],
            "speed_variations": [_match_to_dict(m) for m in result.speed_variations],
            "same_name_different": [_match_to_dict(m) for m in result.same_name_different],
            "short_audio_candidates": [_match_to_dict(m) for m in result.short_audio_candidates],
            "unique_files": [
                {
                    "path": fp.file_path,
                    "name": fp.file_name,
                    "duration": fp.duration,
                    "hash": fp.hash_str
                } for fp in result.unique_files
            ]
        }
    
    if tracker:
        report_data["reference_tracking"]["data"] = {
            "total_references": len(tracker.references),
            "references": {k: v.to_dict() for k, v in tracker.references.items()},
            "unused_files": [r.to_dict() for r in tracker.get_unused_files()],
            "modification_history": [m.to_dict() for m in tracker.modification_history]
        }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report_data, f, ensure_ascii=False, indent=2)


def generate_markdown_report(result: Optional[DedupResult], 
                            tracker: Optional[ReferenceTracker],
                            output_path: str):
    """生成Markdown格式报告"""
    lines = []
    
    lines.append("# 音频素材去重报告")
    lines.append("")
    lines.append(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")
    
    lines.append("## 一、技术原理说明")
    lines.append("")
    lines.append("### 1.1 音频指纹技术")
    lines.append("")
    lines.append("本系统基于多特征融合的音频指纹技术，包含以下核心特征：")
    lines.append("")
    lines.append("- **Chroma CQT (恒定Q变换色度特征)**")
    lines.append("  - 作用：捕捉音高分布特征")
    lines.append("  - 优势：对音频变速具有鲁棒性，用于检测变速版本")
    lines.append("")
    lines.append("- **MFCC (梅尔频率倒谱系数)**")
    lines.append("  - 作用：捕捉音色和频谱包络特征")
    lines.append("  - 优势：对内容变化敏感，用于精确重复检测")
    lines.append("")
    lines.append("- **Spectral Contrast (频谱对比度)**")
    lines.append("  - 作用：捕捉各频率子带的能量分布差异")
    lines.append("  - 优势：辅助区分音色相近的音频")
    lines.append("")
    lines.append("- **Tempo (节拍特征)**")
    lines.append("  - 作用：估算音频的BPM（每分钟节拍数）")
    lines.append("  - 优势：辅助检测节奏相似的音频")
    lines.append("")
    
    lines.append("### 1.2 相似度计算方法")
    lines.append("")
    lines.append("综合相似度采用加权平均计算：")
    lines.append("```")
    lines.append("总相似度 = Chroma相似度 × 40% + MFCC相似度 × 40% + 频谱对比度 × 20%")
    lines.append("```")
    lines.append("")
    
    lines.append("### 1.3 判定阈值")
    lines.append("")
    lines.append("| 类型 | 阈值 | 说明 |")
    lines.append("|------|------|------|")
    lines.append("| 精确重复 | ≥ 95% | 内容几乎完全一致 |")
    lines.append("| 近重复 | 70% ~ 95% | 内容相似但有差异 |")
    lines.append("| 变速版本 | Chroma > 85% 且时长比在 0.5~2.0 | 可能是变速处理 |")
    lines.append("")
    
    lines.append("### 1.4 引用追踪原理")
    lines.append("")
    lines.append("引用追踪支持三种数据来源：")
    lines.append("")
    lines.append("1. **代码扫描**：通过正则表达式自动检测项目代码中的音频引用")
    lines.append("2. **标签表导入**：从JSON/YAML格式的元数据文件导入标签和备注")
    lines.append("3. **人工补录**：支持手动添加使用记录，记录修改历史")
    lines.append("")
    
    if result:
        lines.append("## 二、去重检测结果")
        lines.append("")
        
        lines.append("### 2.1 总体统计")
        lines.append("")
        lines.append("| 指标 | 数量 |")
        lines.append("|------|------|")
        lines.append(f"| 总文件数 | {len(result.all_fingerprints)} |")
        lines.append(f"| 唯一文件 | {len(result.unique_files)} |")
        lines.append(f"| 精确重复 | {len(result.exact_duplicates)} |")
        lines.append(f"| 近重复 | {len(result.near_duplicates)} |")
        lines.append(f"| 变速版本 | {len(result.speed_variations)} |")
        lines.append(f"| 同名异声 | {len(result.same_name_different)} |")
        lines.append(f"| 短音待确认 | {len(result.short_audio_candidates)} |")
        lines.append("")
        
        def format_matches_section(matches: List[DuplicateMatch], title: str):
            if not matches:
                return []
            section = [f"### {title}", ""]
            for i, m in enumerate(matches, 1):
                section.append(f"#### [{i}] {m.fingerprint1.file_name} ↔ {m.fingerprint2.file_name}")
                section.append("")
                section.append(f"- **相似度**: {m.similarity:.2%}")
                section.append(f"- **Chroma相似度**: {m.chroma_similarity:.2%}")
                section.append(f"- **MFCC相似度**: {m.mfcc_similarity:.2%}")
                if m.speed_ratio:
                    section.append(f"- **变速比**: {m.speed_ratio:.2f}x")
                section.append(f"- **状态**: {m.confirm_status.value}")
                section.append(f"- **说明**: {m.notes}")
                section.append(f"- **下一步**: {m.get_next_action()}")
                section.append("")
            return section
        
        lines.extend(format_matches_section(result.exact_duplicates, "2.2 精确重复"))
        lines.extend(format_matches_section(result.near_duplicates, "2.3 近重复（待确认）"))
        lines.extend(format_matches_section(result.speed_variations, "2.4 变速版本（待设计师确认）"))
        lines.extend(format_matches_section(result.same_name_different, "2.5 同名异声（待策划核对）"))
        lines.extend(format_matches_section(result.short_audio_candidates, "2.6 短音频（建议试听确认）"))
    
    if tracker and tracker.references:
        lines.append("## 三、引用追踪结果")
        lines.append("")
        lines.append(f"**追踪文件总数**: {len(tracker.references)}")
        lines.append("")
        
        unused = tracker.get_unused_files()
        if unused:
            lines.append(f"### 3.1 未使用文件 ({len(unused)} 个)")
            lines.append("")
            for ref in unused:
                lines.append(f"- {ref.file_name}")
            lines.append("")
        
        lines.append("### 3.2 修改历史")
        lines.append("")
        if tracker.modification_history:
            for mod in tracker.modification_history:
                lines.append(f"- **[{mod.timestamp}]** {mod.user} - {mod.action}")
                lines.append(f"  - 文件: {mod.file_path}")
                lines.append(f"  - 字段: {mod.field}")
                lines.append(f"  - 变更: `{mod.old_value}` → `{mod.new_value}`")
                lines.append("")
        else:
            lines.append("暂无修改记录")
            lines.append("")
    
    lines.append("## 四、处理建议")
    lines.append("")
    lines.append("1. **精确重复**：可直接删除重复项，保留引用数较多的版本")
    lines.append("2. **变速版本**：请声音设计师试听，确认是否需要保留不同速度版本")
    lines.append("3. **同名异声**：请策划和声音设计师核对，统一命名规范")
    lines.append("4. **短音频**：由于特征较少容易误报，建议人工试听确认")
    lines.append("")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))


def generate_html_report(result: Optional[DedupResult], 
                        tracker: Optional[ReferenceTracker],
                        output_path: str):
    """生成HTML格式报告"""
    html_template = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>音频素材去重报告</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f5f7fa;
            color: #333;
            line-height: 1.6;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 12px;
            margin-bottom: 30px;
        }}
        .header h1 {{
            font-size: 28px;
            margin-bottom: 10px;
        }}
        .header .meta {{
            opacity: 0.9;
            font-size: 14px;
        }}
        .section {{
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
        }}
        .section h2 {{
            color: #2c3e50;
            font-size: 20px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
        }}
        .section h3 {{
            color: #34495e;
            font-size: 16px;
            margin: 20px 0 15px;
        }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }}
        .stat-card {{
            background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%);
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }}
        .stat-card .number {{
            font-size: 32px;
            font-weight: bold;
            color: #667eea;
        }}
        .stat-card .label {{
            font-size: 13px;
            color: #666;
            margin-top: 5px;
        }}
        .match-card {{
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            border-left: 4px solid #667eea;
        }}
        .match-card.exact {{ border-left-color: #27ae60; }}
        .match-card.near {{ border-left-color: #f39c12; }}
        .match-card.speed {{ border-left-color: #9b59b6; }}
        .match-card.name {{ border-left-color: #e74c3c; }}
        .match-card.short {{ border-left-color: #3498db; }}
        .match-header {{
            font-weight: 600;
            margin-bottom: 10px;
            color: #2c3e50;
        }}
        .match-details {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            font-size: 13px;
        }}
        .match-detail {{
            display: flex;
            justify-content: space-between;
        }}
        .match-detail .label {{ color: #666; }}
        .match-detail .value {{ font-weight: 500; }}
        .next-action {{
            margin-top: 10px;
            padding: 8px 12px;
            background: #fff3cd;
            border-radius: 4px;
            font-size: 13px;
            color: #856404;
        }}
        .methodology {{
            background: #e8f4fd;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 15px;
        }}
        .methodology h4 {{
            color: #2980b9;
            margin-bottom: 8px;
        }}
        .methodology ul {{
            padding-left: 20px;
            font-size: 14px;
        }}
        .badge {{
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            margin-left: 8px;
        }}
        .badge.pending {{ background: #ffeaa7; color: #d35400; }}
        .badge.confirmed {{ background: #55efc4; color: #00b894; }}
        .badge.auto {{ background: #74b9ff; color: #0984e3; }}
        .history-item {{
            padding: 10px;
            background: #f8f9fa;
            border-radius: 6px;
            margin-bottom: 8px;
            font-size: 13px;
        }}
        .history-time {{
            color: #666;
            font-size: 12px;
        }}
        .history-change {{
            font-family: monospace;
            background: white;
            padding: 2px 6px;
            border-radius: 3px;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e0e0e0;
        }}
        th {{
            background: #f8f9fa;
            font-weight: 600;
            color: #2c3e50;
        }}
        .progress-bar {{
            height: 8px;
            background: #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
        }}
        .progress-fill {{
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s;
        }}
        .progress-fill.high {{ background: #27ae60; }}
        .progress-fill.med {{ background: #f39c12; }}
        .progress-fill.low {{ background: #e74c3c; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎵 音频素材去重报告</h1>
            <div class="meta">生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
        </div>
"""
    
    html_template += """
        <div class="section">
            <h2>🔬 技术原理</h2>
            
            <div class="methodology">
                <h4>音频指纹技术</h4>
                <ul>
                    <li><strong>Chroma CQT</strong>: 恒定Q变换色度特征，捕捉音高分布，对变速鲁棒</li>
                    <li><strong>MFCC</strong>: 梅尔频率倒谱系数，捕捉音色特征</li>
                    <li><strong>Spectral Contrast</strong>: 频谱对比度，捕捉能量分布</li>
                    <li><strong>Tempo</strong>: 节拍特征，估算BPM</li>
                </ul>
            </div>
            
            <div class="methodology">
                <h4>相似度计算</h4>
                <p style="margin-bottom:10px;">加权综合相似度：</p>
                <code style="background:white;padding:8px 12px;border-radius:4px;display:block;">
                    总相似度 = Chroma(40%) + MFCC(40%) + 频谱对比度(20%)
                </code>
            </div>
            
            <h3>判定阈值</h3>
            <table>
                <tr><th>类型</th><th>阈值</th><th>说明</th></tr>
                <tr><td>精确重复</td><td>≥ 95%</td><td>内容几乎完全一致</td></tr>
                <tr><td>近重复</td><td>70% ~ 95%</td><td>内容相似但有差异</td></tr>
                <tr><td>变速版本</td><td>Chroma > 85%</td><td>时长比在 0.5~2.0 之间</td></tr>
            </table>
        </div>
"""
    
    if result:
        html_template += f"""
        <div class="section">
            <h2>📊 去重检测结果</h2>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="number">{len(result.all_fingerprints)}</div>
                    <div class="label">总文件数</div>
                </div>
                <div class="stat-card">
                    <div class="number">{len(result.unique_files)}</div>
                    <div class="label">唯一文件</div>
                </div>
                <div class="stat-card">
                    <div class="number">{len(result.exact_duplicates)}</div>
                    <div class="label">精确重复</div>
                </div>
                <div class="stat-card">
                    <div class="number">{len(result.near_duplicates)}</div>
                    <div class="label">近重复</div>
                </div>
                <div class="stat-card">
                    <div class="number">{len(result.speed_variations)}</div>
                    <div class="label">变速版本</div>
                </div>
                <div class="stat-card">
                    <div class="number">{len(result.same_name_different)}</div>
                    <div class="label">同名异声</div>
                </div>
            </div>
        """
        
        def render_matches(matches, title, css_class):
            if not matches:
                return ""
            html = f'<h3>{title}</h3>'
            for i, m in enumerate(matches, 1):
                badge_class = 'auto' if m.confirm_status.value == 'auto_confirmed' else 'pending'
                badge_text = '自动确认' if m.confirm_status.value == 'auto_confirmed' else '待确认'
                progress_class = 'high' if m.similarity >= 0.9 else 'med' if m.similarity >= 0.7 else 'low'
                
                html += f'''
                <div class="match-card {css_class}">
                    <div class="match-header">
                        [{i}] {m.fingerprint1.file_name} ↔ {m.fingerprint2.file_name}
                        <span class="badge {badge_class}">{badge_text}</span>
                    </div>
                    <div class="match-details">
                        <div class="match-detail">
                            <span class="label">综合相似度</span>
                            <span class="value">{m.similarity:.2%}</span>
                        </div>
                        <div style="grid-column: 1 / -1;">
                            <div class="progress-bar">
                                <div class="progress-fill {progress_class}" style="width: {m.similarity*100}%"></div>
                            </div>
                        </div>
                        <div class="match-detail">
                            <span class="label">Chroma相似度</span>
                            <span class="value">{m.chroma_similarity:.2%}</span>
                        </div>
                        <div class="match-detail">
                            <span class="label">MFCC相似度</span>
                            <span class="value">{m.mfcc_similarity:.2%}</span>
                        </div>
                '''
                if m.speed_ratio:
                    html += f'''
                        <div class="match-detail">
                            <span class="label">变速比</span>
                            <span class="value">{m.speed_ratio:.2f}x</span>
                        </div>
                    '''
                html += f'''
                    </div>
                    <div class="next-action">
                        💡 {m.notes}<br>
                        <strong>下一步:</strong> {m.get_next_action()}
                    </div>
                </div>
                '''
            return html
        
        html_template += render_matches(result.exact_duplicates, "✅ 精确重复 (可自动处理)", "exact")
        html_template += render_matches(result.near_duplicates, "⚠️ 近重复 (需要人工确认)", "near")
        html_template += render_matches(result.speed_variations, "🎚️ 变速版本 (设计师确认)", "speed")
        html_template += render_matches(result.same_name_different, "❌ 同名异声 (策划核对)", "name")
        html_template += render_matches(result.short_audio_candidates, "🔍 短音频待确认 (建议试听)", "short")
        html_template += '</div>'
    
    if tracker and tracker.references:
        html_template += f'''
        <div class="section">
            <h2>🔗 引用追踪</h2>
            <p>追踪文件总数: <strong>{len(tracker.references)}</strong></p>
        '''
        
        unused = tracker.get_unused_files()
        if unused:
            html_template += f'''
            <h3>未使用文件 ({len(unused)} 个)</h3>
            <ul style="padding-left:20px;">
                {"".join([f'<li>{r.file_name}</li>' for r in unused])}
            </ul>
            '''
        
        if tracker.modification_history:
            html_template += '<h3>修改历史</h3>'
            for mod in tracker.modification_history:
                html_template += f'''
                <div class="history-item">
                    <div class="history-time">{mod.timestamp}</div>
                    <div><strong>{mod.user}</strong> - {mod.action}</div>
                    <div>文件: {mod.file_path}</div>
                    <div>
                        变更: 
                        <span class="history-change">{mod.old_value}</span>
                        →
                        <span class="history-change">{mod.new_value}</span>
                    </div>
                </div>
                '''
        
        html_template += '</div>'
    
    html_template += """
        <div class="section">
            <h2>💡 处理建议</h2>
            <ol style="padding-left:20px;">
                <li><strong>精确重复</strong>：可直接删除重复项，保留引用数较多的版本</li>
                <li><strong>变速版本</strong>：请声音设计师试听，确认是否需要保留不同速度版本</li>
                <li><strong>同名异声</strong>：请策划和声音设计师核对，统一命名规范</li>
                <li><strong>短音频</strong>：由于特征较少容易误报，建议人工试听确认</li>
            </ol>
        </div>
    </div>
</body>
</html>
    """
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_template)
