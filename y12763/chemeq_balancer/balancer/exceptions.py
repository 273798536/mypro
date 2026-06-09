"""
配平工具异常类定义
"""


class BalancerError(Exception):
    """配平工具基础异常"""

    def __init__(self, message: str, hint: str = ""):
        super().__init__(message)
        self.message = message
        self.hint = hint

    def __str__(self):
        if self.hint:
            return f"{self.message}\n建议: {self.hint}"
        return self.message


class ParseError(BalancerError):
    """化学式或方程式解析错误"""

    def __init__(self, message: str, position: int = -1, raw_text: str = "", hint: str = ""):
        super().__init__(message, hint)
        self.position = position
        self.raw_text = raw_text

    def __str__(self):
        base = super().__str__()
        if self.position >= 0 and self.raw_text:
            pointer = " " * self.position + "^"
            return f"{base}\n{self.raw_text}\n{pointer}"
        return base


class NoSolutionError(BalancerError):
    """方程式无解 (质量不守恒或元素不匹配)"""

    def __init__(self, message: str, missing_elements: list = None, extra_elements: list = None, hint: str = ""):
        super().__init__(message, hint)
        self.missing_elements = missing_elements or []
        self.extra_elements = extra_elements or []


class InfiniteSolutionsError(BalancerError):
    """方程式有多组独立解 (可能是多步反应)"""

    def __init__(self, message: str, hint: str = ""):
        super().__init__(message, hint)


class ValidationError(BalancerError):
    """数据验证错误 (系数、化学式不合法等)"""

    def __init__(self, message: str, field: str = "", value: str = "", hint: str = ""):
        super().__init__(message, hint)
        self.field = field
        self.value = value
