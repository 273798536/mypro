"""长文本截断检测与解释。

模型评审会只看导出报告时，也能看懂"长文本截断为什么被拦下来"：
给出该样本被拦的具体原因(超长多少、尾部丢了什么类型的信息)。
"""

from __future__ import annotations

from typing import Optional

from graycity.models import TrainingSample
from graycity.store import DataStore, MAX_LEN


def detect(store: DataStore) -> list[TrainingSample]:
    """返回所有因长度超限被截断的样本。"""
    return [s for s in store.samples if s.truncated or len(s.text) > MAX_LEN]


def explain(store: DataStore, sample_id: str) -> Optional[str]:
    """单条截断解释：为什么被拦、尾部丢了什么。"""
    sample = store.sample_by_id(sample_id)
    if sample is None:
        return None
    if not (sample.truncated or len(sample.text) > MAX_LEN):
        return f"{sample_id}: 未截断(length={len(sample.text)}<=max_len={MAX_LEN})。"
    over = len(sample.text) - MAX_LEN
    tail = sample.text[MAX_LEN:]
    ann = store.annotation_for(sample_id)
    lines = [
        f"{sample_id}({sample.city}) 长文本截断被拦：",
        f"  length={len(sample.text)} 超出 max_len={MAX_LEN}，尾部被截掉 {over} 字。",
        f'  被截尾部内容："{tail}"',
        f"  判定影响：尾部信息丢失，预测({sample.prompt_version})不计入转化率，单独列为异常。",
    ]
    if ann is not None:
        # 人工备注原话保留，不做改写
        lines.append(f'  人工备注(原话)："{ann.note}" —— {ann.author}')
    prompt = next(
        (p for p in store.prompt_versions if p.version == sample.prompt_version), None
    )
    if prompt is not None:
        lines.append(f"  提示词版本 {prompt.version}：{prompt.content}")
    return "\n".join(lines)
