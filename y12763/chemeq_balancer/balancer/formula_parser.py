"""
化学式解析模块
============

负责将分子式字符串 (如 H2O, C6H12O6, Ca(OH)2) 解析为元素计数 dict。
支持:
    - 元素符号 (1-2 字母, 首字母大写)
    - 数字下标 (单字符或多位)
    - 圆括号嵌套
    - 水合物中点号分隔 (CuSO4·5H2O)
"""

import re
from typing import Dict
from .exceptions import ParseError

ELEMENT_PATTERN = re.compile(r"([A-Z][a-z]?)(\d*)")


def parse_formula(formula: str) -> Dict[str, int]:
    """
    解析化学式字符串为元素计数字典。

    Args:
        formula: 化学式字符串, 例如 "H2O", "Ca(OH)2", "C6H12O6"

    Returns:
        Dict[str, int]: 元素符号 -> 原子数, 例如 {"H": 2, "O": 1}

    Raises:
        ParseError: 化学式格式不合法时抛出
    """
    if not formula or not formula.strip():
        raise ParseError("化学式为空", hint="请输入非空的化学式, 例如 H2O")

    formula = formula.strip()

    if "·" in formula:
        return _parse_hydrate(formula)

    try:
        element_counts, _ = _parse_group(formula, 0)
    except ParseError:
        raise
    except Exception as e:
        raise ParseError(
            f"解析化学式 '{formula}' 时发生错误: {e}",
            raw_text=formula,
            hint="请检查括号是否匹配、元素符号是否正确",
        )

    return element_counts


def _parse_hydrate(formula: str) -> Dict[str, int]:
    """解析含结晶水的化学式, 如 CuSO4·5H2O"""
    parts = formula.split("·")
    total_counts: Dict[str, int] = {}

    for i, part in enumerate(parts):
        if i == 0:
            part_counts = _parse_group(part, 0)[0]
        else:
            m = re.match(r"^(\d*)(.+)$", part)
            if not m:
                raise ParseError(f"结晶水部分格式错误: '{part}'", raw_text=formula)
            multiplier = int(m.group(1)) if m.group(1) else 1
            sub_counts = _parse_group(m.group(2), 0)[0]
            part_counts = {k: v * multiplier for k, v in sub_counts.items()}

        for elem, count in part_counts.items():
            total_counts[elem] = total_counts.get(elem, 0) + count

    return total_counts


def _parse_group(formula: str, start: int):
    """
    解析一组化学式 (可能含括号), 返回 (元素计数字典, 结束位置)
    """
    counts: Dict[str, int] = {}
    i = start
    n = len(formula)

    while i < n:
        ch = formula[i]

        if ch == "(":
            sub_counts, i = _parse_group(formula, i + 1)
            if i >= n or formula[i] != ")":
                raise ParseError(
                    "括号不匹配", position=i, raw_text=formula, hint="检查左括号是否有对应的右括号"
                )
            i += 1
            multiplier, i = _parse_number(formula, i)
            for elem, c in sub_counts.items():
                counts[elem] = counts.get(elem, 0) + c * multiplier

        elif ch == ")":
            return counts, i

        elif ch.isupper():
            m = ELEMENT_PATTERN.match(formula, i)
            if not m:
                raise ParseError(
                    f"无效的元素符号位置", position=i, raw_text=formula, hint="元素符号首字母必须大写"
                )
            elem = m.group(1)
            num_str = m.group(2)
            count = int(num_str) if num_str else 1
            counts[elem] = counts.get(elem, 0) + count
            i = m.end()

        else:
            raise ParseError(
                f"意外字符 '{ch}'", position=i, raw_text=formula,
                hint="化学式只能包含元素符号、数字和圆括号",
            )

    return counts, i


def _parse_number(formula: str, start: int):
    """从 start 位置开始解析数字, 返回 (数字值, 结束位置)"""
    i = start
    n = len(formula)
    while i < n and formula[i].isdigit():
        i += 1
    if i == start:
        return 1, start
    return int(formula[start:i]), i


def count_elements(compounds: list) -> Dict[str, int]:
    """
    统计一组化合物的总元素数。

    Args:
        compounds: [(formula, coefficient), ...] 列表

    Returns:
        Dict[str, int]: 元素 -> 总原子数
    """
    total: Dict[str, int] = {}
    for formula, coef in compounds:
        elem_counts = parse_formula(formula)
        for elem, c in elem_counts.items():
            total[elem] = total.get(elem, 0) + c * coef
    return total
