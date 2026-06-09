"""
化学方程式配平核心算法
====================

提供两种配平策略:
    1. MATRIX (矩阵消元法, 默认): 将质量守恒转化为齐次线性方程组,
       用 sympy.nullspace 求解零空间, 归一化为最小正整数解。
       适用范围广, 支持大多数常规反应。

    2. LCM (最小公倍数法): 对简单反应逐元素配平, 快速直接。

失败原因说明:
    - PARSE_ERROR:       输入字符串格式无法解析 (括号不匹配、元素符号错误等)
    - ELEMENT_MISMATCH:  反应物和产物的元素集合不一致 (违反质量守恒)
    - NO_SOLUTION:       线性方程组仅有零解, 方程不可能配平
    - INFINITE_SOLUTIONS:零空间维度 > 1, 可能是多步独立反应未拆分
    - OVERFLOW:          系数过大超过上限 (默认 10000), 可能是异常反应
"""

import re
import math
from enum import Enum
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Union
from fractions import Fraction

try:
    import numpy as np
    from sympy import Matrix, Rational
    _HAS_SYMPY = True
except ImportError:
    _HAS_SYMPY = False

from .formula_parser import parse_formula, count_elements
from .exceptions import (
    BalancerError,
    ParseError,
    NoSolutionError,
    InfiniteSolutionsError,
    ValidationError,
)


class BalanceMethod(str, Enum):
    """配平方法枚举"""
    MATRIX = "matrix"
    LCM = "lcm"
    AUTO = "auto"


@dataclass
class ChemicalEquation:
    """
    化学方程式数据结构

    Attributes:
        reactants:  反应物列表, [(formula, coefficient), ...]
        products:   产物列表,   [(formula, coefficient), ...]
        raw_text:   原始输入文本 (用于追溯)
    """
    reactants: List[Tuple[str, int]]
    products: List[Tuple[str, int]]
    raw_text: str = ""

    def get_all_elements(self) -> set:
        """获取方程式中出现的所有元素"""
        elements = set()
        for formula, _ in self.reactants + self.products:
            elements.update(parse_formula(formula).keys())
        return elements

    def check_element_conservation(self) -> Tuple[bool, list, list]:
        """检查反应物和产物元素集合是否一致"""
        reactant_elements = set()
        product_elements = set()
        for formula, _ in self.reactants:
            reactant_elements.update(parse_formula(formula).keys())
        for formula, _ in self.products:
            product_elements.update(parse_formula(formula).keys())
        missing = list(product_elements - reactant_elements)
        extra = list(reactant_elements - product_elements)
        return (len(missing) == 0 and len(extra) == 0), missing, extra


@dataclass
class BalanceResult:
    """
    配平结果数据结构

    Attributes:
        success:      是否配平成功
        equation:     原始 ChemicalEquation 对象
        balanced_eq:  配平后的 ChemicalEquation
        coefficients: 完整系数列表 (反应物 + 产物), 产物系数为正 (内部存储用绝对值)
        method:       实际使用的配平方法
        fail_reason:  失败原因代码 (若失败)
        fail_message: 失败原因详细说明
        warnings:     警告信息列表
    """
    success: bool
    equation: ChemicalEquation
    balanced_eq: Optional[ChemicalEquation] = None
    coefficients: List[int] = field(default_factory=list)
    method: BalanceMethod = BalanceMethod.AUTO
    fail_reason: Optional[str] = None
    fail_message: str = ""
    warnings: List[str] = field(default_factory=list)

    def format_equation(self) -> str:
        """格式化输出配平后的方程式"""
        if not self.success or not self.balanced_eq:
            return self.equation.raw_text or "(无法配平)"
        return format_balanced_equation(self.balanced_eq)

    def element_table(self) -> Dict[str, Dict[str, int]]:
        """生成元素守恒表用于展示: {元素: {反应物总数, 产物总数, 是否守恒}}"""
        if not self.balanced_eq:
            return {}
        reactant_counts = count_elements(self.balanced_eq.reactants)
        product_counts = count_elements(self.balanced_eq.products)
        all_elements = sorted(set(list(reactant_counts.keys()) + list(product_counts.keys())))
        result = {}
        for elem in all_elements:
            r = reactant_counts.get(elem, 0)
            p = product_counts.get(elem, 0)
            result[elem] = {"reactants": r, "products": p, "conserved": r == p}
        return result


_EQUATION_SPLIT_RE = re.compile(r"\s*(?:->|→|=|═)\s*")
_COMPOUND_SPLIT_RE = re.compile(r"\s*\+\s*")
_COMPOUND_RE = re.compile(r"^\s*(\d*)\s*([A-Za-z0-9()·]+)\s*$")


def parse_equation(text: str) -> ChemicalEquation:
    """
    解析化学方程式字符串。

    支持的格式:
        - H2 + O2 -> H2O
        - CH4 + 2 O2 = CO2 + 2 H2O
        - 2H2+O2→2H2O
        - 带括号的 Ca(OH)2 + HCl -> CaCl2 + H2O

    Args:
        text: 方程式字符串

    Returns:
        ChemicalEquation 对象

    Raises:
        ParseError: 格式错误
    """
    if not text or not text.strip():
        raise ParseError("方程式为空", hint="请输入完整的化学方程式, 例如 H2 + O2 -> H2O")

    raw = text.strip()
    parts = _EQUATION_SPLIT_RE.split(raw)
    if len(parts) != 2:
        raise ParseError(
            "方程式格式错误: 未找到反应物/产物分隔符",
            raw_text=raw,
            hint="请使用 -> 或 = 分隔反应物和产物, 例如 A + B -> C + D",
        )

    left_text, right_text = parts
    reactants = _parse_side(left_text, raw)
    products = _parse_side(right_text, raw)

    if not reactants:
        raise ParseError("反应物为空", raw_text=raw, hint="请在分隔符左侧填写反应物")
    if not products:
        raise ParseError("产物为空", raw_text=raw, hint="请在分隔符右侧填写产物")

    return ChemicalEquation(reactants=reactants, products=products, raw_text=raw)


def _parse_side(side_text: str, raw_text: str) -> List[Tuple[str, int]]:
    """解析方程式一侧 (反应物或产物)"""
    compounds: List[Tuple[str, int]] = []
    for item in _COMPOUND_SPLIT_RE.split(side_text):
        item = item.strip()
        if not item:
            continue
        m = _COMPOUND_RE.match(item)
        if not m:
            raise ParseError(
                f"无法解析物质: '{item}'",
                raw_text=raw_text,
                hint="物质格式应为 [系数]化学式, 例如 2H2O 或 NaCl",
            )
        coef_str, formula = m.group(1), m.group(2)
        coef = int(coef_str) if coef_str else 1
        if coef < 0:
            raise ParseError(f"系数不能为负数: {coef_str}", raw_text=raw_text)
        parse_formula(formula)
        compounds.append((formula, coef))
    return compounds


def format_balanced_equation(eq: ChemicalEquation) -> str:
    """将已配平的方程式格式化为字符串"""
    def format_side(compounds):
        parts = []
        for formula, coef in compounds:
            if coef == 1:
                parts.append(formula)
            elif coef == 0:
                continue
            else:
                parts.append(f"{coef}{formula}")
        return " + ".join(parts)

    left = format_side(eq.reactants)
    right = format_side(eq.products)
    return f"{left} -> {right}"


def _lcm(a: int, b: int) -> int:
    """最小公倍数"""
    return abs(a * b) // math.gcd(a, b) if a and b else 0


def _lcm_list(nums: List[int]) -> int:
    """多个数的最小公倍数"""
    result = 1
    for n in nums:
        if n:
            result = _lcm(result, n)
    return result


def _gcd_list(nums: List[int]) -> int:
    """多个数的最大公约数"""
    result = 0
    for n in nums:
        result = math.gcd(result, abs(n))
    return result


def _normalize_to_integers(ratios: List[Fraction], max_coef: int = 10000) -> List[int]:
    """将分数比例向量归一化为最小正整数"""
    if not ratios:
        return []
    denoms = [r.denominator for r in ratios if r != 0]
    if not denoms:
        return [0] * len(ratios)
    common_denom = _lcm_list(denoms)
    ints = [int(r * common_denom) for r in ratios]
    sign = 1 if any(x > 0 for x in ints) else -1
    ints = [sign * x for x in ints]
    g = _gcd_list(ints)
    if g > 1:
        ints = [x // g for x in ints]
    if any(abs(x) > max_coef for x in ints):
        raise ValidationError(
            f"配平系数超过上限 {max_coef}",
            hint="该反应可能需要人工确认或拆分为多步反应",
        )
    return ints


def balance_equation(
    equation: Union[ChemicalEquation, str],
    method: BalanceMethod = BalanceMethod.AUTO,
    max_coef: int = 10000,
) -> BalanceResult:
    """
    配平化学方程式。

    Args:
        equation:  ChemicalEquation 对象或方程式字符串
        method:    配平方法 (默认 AUTO, 自动选择)
        max_coef:  系数上限 (超过则判定为异常)

    Returns:
        BalanceResult 对象
    """
    if isinstance(equation, str):
        try:
            equation = parse_equation(equation)
        except ParseError as e:
            return BalanceResult(
                success=False,
                equation=ChemicalEquation(reactants=[], products=[], raw_text=equation if isinstance(equation, str) else ""),
                method=method,
                fail_reason="PARSE_ERROR",
                fail_message=str(e),
            )

    result = BalanceResult(success=False, equation=equation, method=method)

    try:
        ok, missing, extra = equation.check_element_conservation()
        if not ok:
            raise NoSolutionError(
                "反应物和产物元素集合不一致",
                missing_elements=missing,
                extra_elements=extra,
                hint=f"反应物独有元素: {extra}, 产物独有元素: {missing}",
            )

        actual_method = method
        if actual_method == BalanceMethod.AUTO:
            actual_method = BalanceMethod.MATRIX if _HAS_SYMPY else BalanceMethod.LCM
            result.method = actual_method

        if actual_method == BalanceMethod.MATRIX and _HAS_SYMPY:
            coefficients = _balance_matrix(equation, max_coef)
        else:
            coefficients = _balance_lcm(equation, max_coef)

        n_react = len(equation.reactants)
        balanced_reactants = [
            (f, abs(c)) for (f, _), c in zip(equation.reactants, coefficients[:n_react])
        ]
        balanced_products = [
            (f, abs(c)) for (f, _), c in zip(equation.products, coefficients[n_react:])
        ]
        result.balanced_eq = ChemicalEquation(
            reactants=balanced_reactants, products=balanced_products, raw_text=equation.raw_text
        )
        result.coefficients = coefficients
        result.success = True

        orig_reactant_coefs = [c for _, c in equation.reactants]
        orig_product_coefs = [c for _, c in equation.products]
        new_reactant_coefs = [c for _, c in balanced_reactants]
        new_product_coefs = [c for _, c in balanced_products]
        if orig_reactant_coefs != new_reactant_coefs or orig_product_coefs != new_product_coefs:
            if any(orig_reactant_coefs) or any(orig_product_coefs):
                pass

        return result

    except NoSolutionError as e:
        result.fail_reason = "NO_SOLUTION"
        result.fail_message = str(e)
        return result
    except InfiniteSolutionsError as e:
        result.fail_reason = "INFINITE_SOLUTIONS"
        result.fail_message = str(e)
        return result
    except ValidationError as e:
        result.fail_reason = "OVERFLOW"
        result.fail_message = str(e)
        return result
    except Exception as e:
        result.fail_reason = "UNKNOWN"
        result.fail_message = f"配平时发生意外错误: {e}"
        return result


def _balance_matrix(equation: ChemicalEquation, max_coef: int) -> List[int]:
    """
    矩阵消元法配平。

    构建元素矩阵 A (元素 × 物质), 其中反应物列取正、产物列取负,
    求解零空间 Ac = 0 的最小正整数解 c。
    """
    elements = sorted(equation.get_all_elements())
    all_compounds = equation.reactants + equation.products
    n_react = len(equation.reactants)
    n = len(all_compounds)
    m = len(elements)

    matrix_data = []
    for elem in elements:
        row = []
        for i, (formula, _) in enumerate(all_compounds):
            counts = parse_formula(formula)
            sign = 1 if i < n_react else -1
            row.append(sign * counts.get(elem, 0))
        matrix_data.append(row)

    if not matrix_data or not matrix_data[0]:
        raise NoSolutionError("空矩阵", hint="检查方程式内容是否完整")

    M = Matrix(matrix_data)
    nullspace = M.nullspace()

    if len(nullspace) == 0:
        raise NoSolutionError(
            "零空间为空, 该方程式无法配平",
            hint="请检查方程式是否违背质量守恒定律",
        )

    if len(nullspace) > 1:
        raise InfiniteSolutionsError(
            f"零空间维度 = {len(nullspace)}, 存在多组独立解",
            hint="该方程式可能是多步独立反应的组合, 建议拆分为单步反应分别配平",
        )

    solution = nullspace[0]
    ratios = []
    for x in solution:
        if hasattr(x, 'p') and hasattr(x, 'q'):
            ratios.append(Fraction(int(x.p), int(x.q)))
        else:
            ratios.append(Fraction(str(x)))

    if all(r == 0 for r in ratios):
        raise NoSolutionError("零空间只有零向量, 方程式无法配平")

    return _normalize_to_integers(ratios, max_coef)


def _balance_lcm(equation: ChemicalEquation, max_coef: int) -> List[int]:
    """
    最小公倍数法配平 (简单反应的备用方案)。

    按元素出现频率从低到高逐个配平, 最后验证所有元素守恒。
    仅适用于简单反应, 复杂反应可能失败。
    """
    all_compounds = equation.reactants + equation.products
    n_react = len(equation.reactants)
    n = len(all_compounds)
    coefs = [1] * n

    elem_to_cols: Dict[str, List[int]] = {}
    for j, (formula, _) in enumerate(all_compounds):
        for elem in parse_formula(formula).keys():
            elem_to_cols.setdefault(elem, []).append(j)

    element_frequency = sorted(elem_to_cols.keys(), key=lambda e: len(elem_to_cols[e]))

    for _ in range(3):
        for elem in element_frequency:
            reactant_total = 0
            product_total = 0
            for j in elem_to_cols[elem]:
                formula = all_compounds[j][0]
                c = parse_formula(formula).get(elem, 0) * coefs[j]
                if j < n_react:
                    reactant_total += c
                else:
                    product_total += c

            if reactant_total == 0 or product_total == 0:
                raise NoSolutionError(
                    f"元素 {elem} 仅出现在一侧",
                    hint="该元素在反应物或产物中缺失, 违反质量守恒",
                )

            if reactant_total != product_total:
                g = math.gcd(reactant_total, product_total)
                r_factor = product_total // g
                p_factor = reactant_total // g
                for j in range(n_react):
                    coefs[j] *= r_factor
                for j in range(n_react, n):
                    coefs[j] *= p_factor

        g = _gcd_list(coefs)
        if g > 1:
            coefs = [c // g for c in coefs]

    elements = sorted(equation.get_all_elements())
    for elem in elements:
        r_total = p_total = 0
        for j, (formula, _) in enumerate(all_compounds):
            c = parse_formula(formula).get(elem, 0) * coefs[j]
            if j < n_react:
                r_total += c
            else:
                p_total += c
        if r_total != p_total:
            raise NoSolutionError(
                f"LCM 法未能完全配平 (元素 {elem} 不守恒)",
                hint="该反应较复杂, 建议安装 sympy 使用矩阵法, 或手动检查",
            )

    if any(abs(c) > max_coef for c in coefs):
        raise ValidationError(f"系数超过上限 {max_coef}")

    return coefs
