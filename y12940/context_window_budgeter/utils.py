import re
import uuid
from typing import List, Optional, Tuple
import tiktoken


def generate_id(prefix: str = "rec") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def count_tokens(text: str, model: str = "gpt-4") -> int:
    try:
        encoder = tiktoken.encoding_for_model(model)
        return len(encoder.encode(text))
    except Exception:
        return len(text) // 4 + 1


def is_empty_or_whitespace(text: Optional[str]) -> bool:
    if text is None:
        return True
    return len(text.strip()) == 0


def has_mixed_notes(text: str) -> Tuple[bool, List[str]]:
    issues = []
    note_patterns = [
        (r"#.*", "包含井号备注"),
        (r"//.*", "包含双斜杠备注"),
        (r"--.*", "包含双减号备注"),
        (r"TODO|FIXME|NOTE", "包含开发标记"),
        (r"@.*\(.*\)", "包含@标注语法"),
        (r"\[.*\].*\{.*\}", "包含复杂标记语法"),
    ]
    for pattern, desc in note_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            issues.append(desc)
    return len(issues) > 0, issues


def detect_label_issues(label: str, allowed_labels: Optional[List[str]] = None) -> Tuple[bool, List[str]]:
    issues = []
    if is_empty_or_whitespace(label):
        issues.append("标签为空")
        return True, issues
    if allowed_labels and label.strip() not in allowed_labels:
        issues.append(f"标签不在允许列表中: {label}")
    if re.search(r"[,#;|]", label):
        issues.append("标签包含分隔符，疑似多标签混写")
    if re.search(r"不确定|待确认|可能", label):
        issues.append("标签包含不确定表述")
    return len(issues) > 0, issues


def detect_data_leak(prompt: str, response: str, leak_keywords: Optional[List[str]] = None) -> Tuple[bool, List[str]]:
    issues = []
    default_leaks = [
        "验证集", "测试集", "validation", "test set",
        "ground truth", "真实标签", "正确答案",
        "train_val", "train_test",
        "泄露", "leak",
    ]
    keywords = leak_keywords or default_leaks
    combined = f"{prompt} {response}"
    for kw in keywords:
        if re.search(re.escape(kw), combined, re.IGNORECASE):
            issues.append(f"疑似训练验证泄漏关键词: {kw}")
    return len(issues) > 0, issues


def has_duplicate_indicators(text: str) -> Tuple[bool, List[str]]:
    issues = []
    patterns = [
        (r"复制|副本|copy|duplicate", "包含复制标记"),
        (r"\(\d+\)$", "末尾带序号副本标记"),
        (r"^副本|^copy", "开头带副本标记"),
    ]
    for pattern, desc in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            issues.append(desc)
    return len(issues) > 0, issues


def sanitize_text(text: str) -> str:
    if text is None:
        return ""
    text = text.strip()
    text = re.sub(r"\s+", " ", text)
    return text


def fuzzy_match_score(a: str, b: str) -> float:
    a_clean = sanitize_text(a).lower()
    b_clean = sanitize_text(b).lower()
    if a_clean == b_clean:
        return 1.0
    if len(a_clean) == 0 or len(b_clean) == 0:
        return 0.0
    shorter, longer = (a_clean, b_clean) if len(a_clean) <= len(b_clean) else (b_clean, a_clean)
    if shorter in longer:
        return 0.85
    matches = sum(1 for c in shorter if c in longer)
    return matches / len(shorter) * 0.7
