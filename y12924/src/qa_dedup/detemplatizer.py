"""样本去模板化引擎 - 识别并移除问答样本中的模板化内容."""

import re
from typing import List, Tuple, Optional, Dict, Any
from dataclasses import dataclass

from .models import QASample


@dataclass
class TemplateMatchResult:
    matched: bool
    template_type: str
    original_question: str
    cleaned_question: str
    original_answer: str
    cleaned_answer: str
    matched_patterns: List[str]


DEFAULT_QUESTION_TEMPLATES = [
    (r"^(请问|你好请问|您好请问|亲问|麻烦问一下|我想请问)\s*", "greeting_prefix"),
    (r"^(你好|您好|hi|hello|Hi|Hello)\s*[,，]?\s*", "greeting_prefix"),
    (r"\s*(谢谢|感谢|多谢|thx|thanks|Thank you)\s*[。.!！]?$", "thanks_suffix"),
    (r"\s*(麻烦了|辛苦了|拜托了)\s*[。.!！]?$", "polite_suffix"),
    (r"^请\s*(解释一下|说明一下|介绍一下|告诉一下|回答一下)\s*", "please_prefix"),
    (r"\s*(可以吗|行不行|好不好|对不对)\s*[?？]?$", "tag_question"),
    (r"^[问请]\s*[:：]\s*", "colon_prefix"),
    (r"^Q\s*[:：]\s*", "q_colon_prefix"),
    (r"^问题\s*[:：]\s*", "question_colon_prefix"),
    (r"^题目\s*[：:]\s*", "topic_colon_prefix"),
]

DEFAULT_ANSWER_TEMPLATES = [
    (r"^(好的|好哒|没问题|当然可以|没问题的|没问题哈)\s*[,，。.!！]?\s*", "ack_prefix"),
    (r"^以下是|下面是|下边是|给你|给您|我来|让我来\s*", "intro_prefix"),
    (r"^答\s*[:：]\s*", "a_colon_prefix"),
    (r"^A\s*[:：]\s*", "a_colon_prefix"),
    (r"^回答\s*[:：]\s*", "answer_colon_prefix"),
    (r"^参考答案\s*[:：]\s*", "ref_answer_prefix"),
    (r"\s*(希望能帮到你|希望对你有帮助|希望可以帮到您)\s*[。.!！]?$", "help_suffix"),
    (r"\s*(如有疑问|如有问题|如果有问题|如果有疑问)\s*[,，]?\s*(请随时|可以|欢迎)\s*(追问|提问|咨询|联系)\s*[。.!！]?$", "followup_suffix"),
    (r"\s*(以上就是|上述就是|以上是|上述是)\s*(我的回答|全部内容|相关内容|解答)?\s*[。.!！]?$", "closing_suffix"),
]


class Detemplatizer:
    """去模板化引擎，支持自定义模板模式."""

    def __init__(
        self,
        question_patterns: Optional[List[Tuple[str, str]]] = None,
        answer_patterns: Optional[List[Tuple[str, str]]] = None,
        min_content_length: int = 2,
    ):
        self.question_patterns = question_patterns or DEFAULT_QUESTION_TEMPLATES
        self.answer_patterns = answer_patterns or DEFAULT_ANSWER_TEMPLATES
        self.min_content_length = min_content_length
        self._compiled_q = [(re.compile(p), name) for p, name in self.question_patterns]
        self._compiled_a = [(re.compile(p), name) for p, name in self.answer_patterns]

    def add_question_pattern(self, pattern: str, name: str):
        self.question_patterns.append((pattern, name))
        self._compiled_q.append((re.compile(pattern), name))

    def add_answer_pattern(self, pattern: str, name: str):
        self.answer_patterns.append((pattern, name))
        self._compiled_a.append((re.compile(pattern), name))

    def clean_question(self, text: str) -> Tuple[str, List[str]]:
        if not text:
            return "", []
        matched_names = []
        cleaned = text.strip()
        changed = True
        iterations = 0
        max_iterations = 5
        while changed and iterations < max_iterations:
            changed = False
            iterations += 1
            for pattern, name in self._compiled_q:
                new_cleaned = pattern.sub("", cleaned).strip()
                if new_cleaned != cleaned:
                    matched_names.append(name)
                    cleaned = new_cleaned
                    changed = True
        if len(cleaned) < self.min_content_length and len(text) >= self.min_content_length:
            return text.strip(), []
        return cleaned, matched_names

    def clean_answer(self, text: str) -> Tuple[str, List[str]]:
        if not text:
            return "", []
        matched_names = []
        cleaned = text.strip()
        changed = True
        iterations = 0
        max_iterations = 5
        while changed and iterations < max_iterations:
            changed = False
            iterations += 1
            for pattern, name in self._compiled_a:
                new_cleaned = pattern.sub("", cleaned).strip()
                if new_cleaned != cleaned:
                    matched_names.append(name)
                    cleaned = new_cleaned
                    changed = True
        if len(cleaned) < self.min_content_length and len(text) >= self.min_content_length:
            return text.strip(), []
        return cleaned, matched_names

    def process_sample(self, sample: QASample) -> TemplateMatchResult:
        original_q = sample.question
        original_a = sample.answer
        cleaned_q, q_matched = self.clean_question(original_q)
        cleaned_a, a_matched = self.clean_answer(original_a)
        all_matched = q_matched + a_matched
        template_detected = len(all_matched) > 0 or (cleaned_q != original_q) or (cleaned_a != original_a)
        template_type = ",".join(sorted(set(all_matched))) if all_matched else "none"
        result = TemplateMatchResult(
            matched=template_detected,
            template_type=template_type,
            original_question=original_q,
            cleaned_question=cleaned_q,
            original_answer=original_a,
            cleaned_answer=cleaned_a,
            matched_patterns=all_matched,
        )
        if template_detected:
            sample.original_question = original_q
            sample.original_answer = original_a
            sample.question = cleaned_q
            sample.answer = cleaned_a
            sample.template_removed = True
            if "template_patterns" not in sample.metadata:
                sample.metadata["template_patterns"] = []
            sample.metadata["template_patterns"].extend(all_matched)
        return result

    def process_batch(self, samples: List[QASample]) -> Dict[str, Any]:
        total = len(samples)
        templated_count = 0
        pattern_stats: Dict[str, int] = {}
        for sample in samples:
            result = self.process_sample(sample)
            if result.matched:
                templated_count += 1
                for p in result.matched_patterns:
                    pattern_stats[p] = pattern_stats.get(p, 0) + 1
        return {
            "total": total,
            "templated_count": templated_count,
            "clean_count": total - templated_count,
            "pattern_stats": pattern_stats,
        }
