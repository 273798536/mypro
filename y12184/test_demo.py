#!/usr/bin/env python3
"""
音频素材去重CLI工具 - 演示脚本

此脚本模拟一个完整的去重工作流程，用于演示目的。
由于需要真实的音频文件才能运行完整功能，这里主要展示API的使用方式。
"""

import os
import sys
import json
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from audio_dedup.fingerprint import FingerprintExtractor, FingerprintComparator
from audio_dedup.deduplicator import AudioDeduplicator
from audio_dedup.reference_tracker import ReferenceTracker
from audio_dedup import reporter


def demo_fingerprint_api():
    """演示指纹提取和比较API的使用"""
    print("=" * 60)
    print("演示1: 音频指纹API")
    print("=" * 60)
    
    extractor = FingerprintExtractor(sample_rate=22050)
    print(f"✓ 指纹提取器初始化完成")
    print(f"  - 采样率: {extractor.sample_rate}")
    print(f"  - MFCC系数: {extractor.n_mfcc}")
    
    print("\n指纹特征说明:")
    print("  - Chroma CQT: 12维色度特征，用于检测变速相似")
    print("  - MFCC: 20维梅尔倒谱系数，用于音色匹配")
    print("  - Spectral Contrast: 7维频谱对比度，辅助区分")
    print("  - Tempo: 节拍估计，辅助节奏检测")
    
    print("\n相似度计算权重:")
    print("  总相似度 = Chroma(40%) + MFCC(40%) + 频谱(20%)")


def demo_deduplication_workflow():
    """演示去重检测工作流程"""
    print("\n" + "=" * 60)
    print("演示2: 去重检测工作流程")
    print("=" * 60)
    
    dedup = AudioDeduplicator()
    print("✓ 去重检测器初始化完成")
    
    print("\n重复类型分类:")
    print("  1. 精确重复 (相似度 ≥ 95%) - 自动确认")
    print("  2. 近重复 (70% ~ 95%) - 待人工确认")
    print("  3. 变速版本 (Chroma > 85% + 时长变化) - 设计师确认")
    print("  4. 同名异声 - 策划核对命名规范")
    print("  5. 短音频误报 - 建议人工试听")
    
    print("\n检测完成后可获取:")
    print("  - result.exact_duplicates: 精确重复列表")
    print("  - result.near_duplicates: 近重复列表")
    print("  - result.speed_variations: 变速版本列表")
    print("  - result.unique_files: 唯一文件列表")


def demo_reference_tracking():
    """演示引用追踪功能"""
    print("\n" + "=" * 60)
    print("演示3: 引用追踪系统")
    print("=" * 60)
    
    tracker = ReferenceTracker()
    print("✓ 引用追踪器初始化完成")
    
    print("\n数据来源:")
    print("  1. 代码扫描 - 自动检测项目代码中的音频引用")
    print("  2. 标签表导入 - 从JSON/YAML导入元数据")
    print("  3. 人工补录 - add_usage_record()")
    
    print("\n修改追踪:")
    print("  - 所有字段变更均记录时间戳和操作人")
    print("  - 可查询单个文件的完整修改历史")
    
    tag_file = "examples/tag_table_sample.json"
    if os.path.exists(tag_file):
        print(f"\n导入示例标签表: {tag_file}")
        with open(tag_file, 'r') as f:
            tags = json.load(f)
        print(f"  包含 {len(tags)} 个音频文件的标签数据")


def demo_report_generation():
    """演示报告生成功能"""
    print("\n" + "=" * 60)
    print("演示4: 报告生成")
    print("=" * 60)
    
    print("支持的报告格式:")
    print("  1. HTML - 美观的可视化报告，包含图表")
    print("  2. Markdown - 纯文本格式，便于版本控制")
    print("  3. JSON - 结构化数据，便于程序处理")
    
    print("\n报告内容:")
    print("  - 技术原理说明（音频指纹和引用追踪）")
    print("  - 去重检测统计和详细结果")
    print("  - 引用追踪结果和修改历史")
    print("  - 处理建议和下一步指引")


def cli_usage_examples():
    """CLI命令使用示例"""
    print("\n" + "=" * 60)
    print("CLI命令使用示例")
    print("=" * 60)
    
    print("\n1. 一键完整流程（推荐）:")
    print("  python -m audio_dedup.cli full ./audio_assets \\")
    print("    --project-dir ./game_project \\")
    print("    --tag-file ./tags.json \\")
    print("    --format html")
    
    print("\n2. 分步执行:")
    print("  # 扫描音频文件")
    print("  audio-dedup scan ./audio_assets")
    print("  ")
    print("  # 导入标签表")
    print("  audio-dedup import-tags ./tags.json")
    print("  ")
    print("  # 扫描项目引用")
    print("  audio-dedup scan-project ./game_project")
    print("  ")
    print("  # 检测重复")
    print("  audio-dedup check")
    print("  ")
    print("  # 生成报告")
    print("  audio-dedup report --format all")
    
    print("\n3. 补录使用记录:")
    print("  audio-dedup add-usage jump.wav PlayerController --user designer_a")
    
    print("\n4. 查看修改历史:")
    print("  audio-dedup history jump.wav")


def main():
    print("🎵 音频素材去重CLI工具 - 功能演示")
    print(f"演示时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    demo_fingerprint_api()
    demo_deduplication_workflow()
    demo_reference_tracking()
    demo_report_generation()
    cli_usage_examples()
    
    print("\n" + "=" * 60)
    print("演示完成！")
    print("=" * 60)
    print("\n快速开始:")
    print("  1. pip install -r requirements.txt")
    print("  2. pip install -e .")
    print("  3. audio-dedup --help")
    print("\n注意: 实际运行需要真实的音频文件")


if __name__ == "__main__":
    main()
