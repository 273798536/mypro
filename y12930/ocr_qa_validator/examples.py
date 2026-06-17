"""样例数据加载模块 - 提供一键加载演示数据的功能"""

import json
from pathlib import Path
from typing import List

from .models import Sample, SourceTrace
from .storage import SampleStore


EXAMPLES_DIR = Path(__file__).parent.parent / "examples"


def load_demo_samples() -> List[Sample]:
    """加载演示样例数据

    Returns:
        三条演示样本列表：顺利记录、待确认记录、坏数据
    """
    demo_file = EXAMPLES_DIR / "demo_samples.json"
    if not demo_file.exists():
        raise FileNotFoundError(f"演示样例文件不存在: {demo_file}")

    with open(demo_file, "r", encoding="utf-8") as f:
        data_list = json.load(f)

    samples = []
    for data in data_list:
        source_trace_data = data.pop("source_trace", {})
        sample = Sample.from_dict(data)
        sample.source_trace = SourceTrace.from_dict(source_trace_data)
        samples.append(sample)

    return samples


def seed_demo_data(sample_store: SampleStore) -> List[Sample]:
    """将演示样例数据导入样本库

    Args:
        sample_store: 样本存储对象

    Returns:
        导入的样本列表
    """
    samples = load_demo_samples()
    for sample in samples:
        sample_store.save(sample)
    return samples


def get_demo_description() -> List[dict]:
    """获取演示样例的描述信息"""
    return [
        {
            "index": 1,
            "type": "顺利记录 (passed)",
            "description": "正常 OCR 问答样本，高置信度，来源清晰，可直接用于训练",
            "features": ["高置信度 0.95", "问题明确", "答案准确", "有完整来源追踪"],
        },
        {
            "index": 2,
            "type": "待确认记录 (needs_review)",
            "description": "中等置信度，答案表述不规范，需要知识库运营复核确认",
            "features": ["置信度偏低 0.55", "答案表述口语化", "来源有涂改痕迹备注", "需人工确认"],
        },
        {
            "index": 3,
            "type": "明显坏数据 (blocked)",
            "description": "低质量爬虫脏数据，置信度极低，包含问题内容，已被安全拦截",
            "features": ["极低置信度 0.12", "问题无意义", "含敏感关键词", "乱码/无效文本"],
        },
    ]
