_FIELD_ALIASES = {
    "formula": ["formula", "公式", "表达式", "expression", "equation", "formula_text"],
    "expected_value": ["expected_value", "期望值", "标准答案", "answer", "expected", "result", "correct_answer", "ans", "标准值"],
    "unit": ["unit", "单位", "units", "量纲", "dimension", "单位符号"],
    "source_description": ["source_description", "题目描述", "description", "desc", "题干", "content", "问题描述", "题目内容"],
    "question_id": ["question_id", "id", "题目编号", "题号", "qid", "number", "no", "序号"],
}


def build_reverse_map(extra_aliases: dict | None = None) -> dict:
    reverse = {}
    aliases = dict(_FIELD_ALIASES)
    if extra_aliases:
        for std_name, alias_list in extra_aliases.items():
            if std_name in aliases:
                aliases[std_name] = aliases[std_name] + [
                    a for a in alias_list if a not in aliases[std_name]
                ]
            else:
                aliases[std_name] = alias_list
    for std_name, alias_list in aliases.items():
        for alias in alias_list:
            key = alias.lower().strip()
            if key not in reverse:
                reverse[key] = std_name
    return reverse


def map_record(record: dict, extra_aliases: dict | None = None) -> dict:
    reverse = build_reverse_map(extra_aliases)
    mapped = {}
    unmapped_keys = []
    source_fields = {}

    for key, value in record.items():
        lookup = key.lower().strip()
        if lookup in reverse:
            std_name = reverse[lookup]
            mapped[std_name] = value
        else:
            unmapped_keys.append(key)
            source_fields[key] = value

    mapped["source_fields"] = source_fields

    if unmapped_keys:
        mapped["_unmapped_keys"] = unmapped_keys

    return mapped
