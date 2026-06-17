"""示例数据生成器 - 构造包含模板、泄漏、重复的测试样本."""

from typing import List
import json
import os

from .models import QASample, SplitType


def generate_demo_samples() -> List[QASample]:
    samples = []

    samples.append(QASample(
        question="请问深度学习和机器学习有什么区别？",
        answer="好的，深度学习是机器学习的一个子集，主要基于神经网络。希望能帮到你。",
        split=SplitType.TRAIN,
        group="机器学习基础",
        source="内部题库v1",
    ))

    samples.append(QASample(
        question="你好请问如何理解梯度下降算法？",
        answer="没问题，梯度下降是一种迭代优化算法，用于寻找损失函数的最小值。",
        split=SplitType.TRAIN,
        group="机器学习基础",
        source="内部题库v1",
    ))

    leak_q_train = "请解释一下 Transformer 模型中的自注意力机制"
    leak_a_train = "自注意力机制允许模型在处理每个词时关注输入序列中的其他所有位置"
    s_train = QASample(
        question=leak_q_train,
        answer=leak_a_train,
        split=SplitType.TRAIN,
        group="NLP 进阶",
        source="评测题库",
    )
    s_train.add_human_note("这个例子是同事小李从论文里摘的，记得标注来源", author="算法PM")
    samples.append(s_train)

    s_val = QASample(
        question="请解释一下 Transformer 模型中的自注意力机制",
        answer=leak_a_train,
        split=SplitType.VAL,
        group="NLP 进阶",
        source="评测题库补录",
    )
    s_val.add_human_note("这条和训练集那条好像重复了，等下人工核对一下", author="标注员小王")
    samples.append(s_val)

    samples.append(QASample(
        question="什么是过拟合，怎么防止过拟合？",
        answer="过拟合是指模型在训练集上表现很好，但在测试集上表现较差。常用方法有正则化、数据增强、早停等。",
        split=SplitType.TRAIN,
        group="机器学习基础",
        source="内部题库v1",
    ))

    samples.append(QASample(
        question="什么是过拟合，怎么防止过拟合？",
        answer="过拟合是指模型在训练集上表现很好，但在测试集上表现较差。常用方法有正则化、数据增强、早停等。",
        split=SplitType.TRAIN,
        group="机器学习基础",
        source="内部题库v2",
    ))

    samples.append(QASample(
        question="请说明 CNN 和 RNN 的主要区别",
        answer="CNN 擅长处理空间结构数据，RNN 擅长处理序列数据。",
        split=SplitType.VAL,
        group="深度学习基础",
        source="评测题库",
    ))

    samples.append(QASample(
        question="BERT 模型的预训练任务有哪些？",
        answer="BERT 的预训练任务主要包括掩码语言模型（MLM）和下一句预测（NSP）。",
        split=SplitType.TEST,
        group="NLP 进阶",
        source="评测题库",
    ))

    samples.append(QASample(
        question="你好，请问什么是词嵌入？谢谢！",
        answer="好的，词嵌入是将词汇映射为低维稠密向量的技术。如有疑问请随时追问。",
        split=SplitType.TRAIN,
        group="NLP 基础",
        source="内部题库v1",
    ))

    samples.append(QASample(
        question="请解释一下什么是词向量",
        answer="词向量和词嵌入是同一概念，将词表示为向量。",
        split=SplitType.VAL,
        group="NLP 基础",
        source="评测题库",
    ))

    return samples


def save_demo_samples(file_path: str):
    samples = generate_demo_samples()
    data = [s.to_dict() for s in samples]
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return file_path


def generate_incremental_samples() -> List[QASample]:
    samples = []

    s = QASample(
        question="请解释一下 Transformer 模型中的自注意力机制，详细一点",
        answer="自注意力机制允许模型在处理每个词时关注输入序列中的其他所有位置，通过计算 Query、Key、Value 的相似度得到注意力权重。",
        split=SplitType.VAL,
        group="NLP 进阶",
        source="评测题库补录第二批",
    )
    s.add_human_note("这是补录的，注意检查是否和训练集冲突", author="标注员小张")
    samples.append(s)

    samples.append(QASample(
        question="请简要说明学习率调度器的作用",
        answer="学习率调度器用于在训练过程中动态调整学习率，常见的有 StepLR、CosineAnnealing 等。",
        split=SplitType.TRAIN,
        group="深度学习基础",
        source="内部题库补录",
    ))

    return samples
