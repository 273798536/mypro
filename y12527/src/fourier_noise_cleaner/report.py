"""报告生成模块"""

import json
from pathlib import Path
from datetime import datetime


class ReportGenerator:
    """报告生成器"""
    
    def __init__(self, processor):
        self.processor = processor
    
    def export_markdown(self, output_path: Path, sr_issues, aliasing_issues, clean_result):
        """导出Markdown格式报告"""
        content = []
        content.append(f"# 傅里叶噪声清洗报告")
        content.append("")
        content.append(f"**生成时间**: {datetime.now().isoformat()}")
        content.append(f"**文件**: {self.processor.audio_path.name}")
        content.append(f"**原始采样率**: {self.processor.original_samplerate} Hz")
        content.append(f"**处理采样率**: {self.processor.samplerate} Hz")
        content.append(f"**音频时长**: {self.processor.duration:.2f} 秒")
        content.append("")
        
        content.append("## 清洗参数")
        content.append("")
        content.append(f"- 阈值: {clean_result['threshold']}")
        content.append(f"- 频段范围: {clean_result['band_start']}Hz - {clean_result['band_end']}Hz")
        content.append(f"- 能量保留率: {clean_result['energy_ratio']*100:.1f}%")
        content.append("")
        
        if clean_result["over_filtered"]:
            content.append("## ⚠️ 过度滤波警告")
            content.append("")
            content.append(f"**影响**: {clean_result['filter_impact']}")
            content.append("")
            content.append("### 对后续处理的影响")
            content.append("")
            content.append("1. **音频清晰度下降**: 过度滤波可能去除重要的谐波成分")
            content.append("2. **音色失真**: 高频成分丢失导致音色变化")
            content.append("3. **分析偏差**: 后续的频谱分析结果可能不准确")
            content.append("4. **机器学习模型失效**: 如果用于训练，特征空间发生偏移")
            content.append("")
            content.append("### 建议")
            content.append("")
            content.append("- 降低阈值参数")
            content.append("- 缩小清洗频段范围")
            content.append("- 使用多轮渐进式清洗替代单次强清洗")
            content.append("")
        
        if sr_issues:
            content.append("## 采样率异常详情")
            content.append("")
            content.append("| 异常类型 | 时间位置 | 来源材料 | 严重程度 | 描述 |")
            content.append("|---------|---------|---------|---------|------|")
            for issue in sr_issues:
                content.append(
                    f"| {issue.get('type', 'N/A')} | "
                    f"{issue.get('time_position', '全程')} | "
                    f"{issue.get('source', '未知')} | "
                    f"{issue.get('severity', 'medium')} | "
                    f"{issue.get('description', '')} |"
                )
            content.append("")
        
        if aliasing_issues:
            content.append("## 频段混叠详情")
            content.append("")
            content.append("| 异常类型 | 频率范围 | 来源 | 严重程度 | 描述 |")
            content.append("|---------|---------|------|---------|------|")
            for issue in aliasing_issues:
                freq_range = f"{issue.get('freq_start', 0)}-{issue.get('freq_end', 0)}Hz"
                content.append(
                    f"| {issue.get('type', 'N/A')} | "
                    f"{freq_range} | "
                    f"{issue.get('source', '未知')} | "
                    f"{issue.get('severity', 'medium')} | "
                    f"{issue.get('description', '')} |"
                )
            content.append("")
        
        if clean_result["issues"]:
            content.append("## 清洗过程问题")
            content.append("")
            for issue in clean_result["issues"]:
                content.append(f"### {issue['type']}")
                content.append("")
                content.append(f"- **严重程度**: {issue.get('severity', 'medium')}")
                content.append(f"- **描述**: {issue['description']}")
                content.append("")
        
        content.append("## 异常点溯源说明")
        content.append("")
        content.append("本报告中的每个异常点均标注了其来源材料：")
        content.append("")
        content.append("- **重采样过程**: 采样率转换引入的伪影")
        content.append("- **原始录制材料**: 录制时采样率不足导致")
        content.append("- **拼接材料 - 第N段**: 多材料拼接时的不匹配")
        content.append("- **录制设备**: 硬件时钟不稳定")
        content.append("")
        
        content.append("## 异常总数统计")
        content.append("")
        content.append(f"- 采样率异常: {len(sr_issues)} 处")
        content.append(f"- 频段混叠: {len(aliasing_issues)} 处")
        content.append(f"- 清洗问题: {len(clean_result['issues'])} 处")
        content.append(f"- **总计: {len(sr_issues) + len(aliasing_issues) + len(clean_result['issues'])} 处**")
        content.append("")
        
        Path(output_path).write_text("\n".join(content), encoding="utf-8")
    
    def export_json(self, output_path: Path, sr_issues, aliasing_issues, clean_result=None):
        """导出JSON格式报告"""
        report = {
            "generated_at": datetime.now().isoformat(),
            "file": self.processor.audio_path.name,
            "audio_info": {
                "original_samplerate": self.processor.original_samplerate,
                "current_samplerate": self.processor.samplerate,
                "duration": self.processor.duration,
                "channels": self.processor.channels
            },
            "samplerate_issues": sr_issues,
            "aliasing_issues": aliasing_issues,
            "issue_summary": {
                "samplerate_issue_count": len(sr_issues),
                "aliasing_issue_count": len(aliasing_issues),
                "total_issues": len(sr_issues) + len(aliasing_issues)
            }
        }
        
        if clean_result:
            report["cleaning_result"] = {
                "threshold": clean_result["threshold"],
                "band_start": clean_result["band_start"],
                "band_end": clean_result["band_end"],
                "energy_ratio": clean_result["energy_ratio"],
                "over_filtered": clean_result["over_filtered"],
                "filter_impact": clean_result["filter_impact"],
                "cleaning_issues": clean_result["issues"]
            }
            report["issue_summary"]["cleaning_issue_count"] = len(clean_result["issues"])
            report["issue_summary"]["total_issues"] += len(clean_result["issues"])
        
        Path(output_path).write_text(
            json.dumps(report, indent=2, ensure_ascii=False),
            encoding="utf-8"
        )
