import numpy as np


class ErrorAnalyzer:
    """误差分析器

    术语通俗解释（写在代码旁边，月底忘不掉）：
    - 阈值：就像考试及格线，误差超过这个数就算"不合格"，需要留意。
    - 误差传播：就像传话游戏，第一步的小误差会往后传，越攒越大。
      步长越大，传得越快；方法越糙（比如欧拉法），传得越猛。
    - 外推越界：题目只问到 t=10，你硬算到 t=20，这叫外推。
      超出合理范围的外推结果可能完全不靠谱，需要特别标注。
    - 单位换算：比如把"米"换成"厘米"，数字会差 100 倍。
      如果题目给的单位和你算的单位对不上，误差再小也是错的。
    """

    def __init__(self, threshold=0.01, extrapolation_limit=None):
        """
        参数:
            threshold: 误差阈值（通俗说：及格线），超过就标记
            extrapolation_limit: 外推边界，超过这个 t 值就算越界
        """
        self.threshold = threshold
        self.extrapolation_limit = extrapolation_limit

    def absolute_error(self, t, y_approx, y_exact):
        """绝对误差 = |近似值 - 精确值|"""
        return t, np.abs(y_approx - y_exact)

    def relative_error(self, t, y_approx, y_exact):
        """相对误差 = |近似值 - 精确值| / |精确值|，精确值为 0 时返回 0"""
        with np.errstate(divide="ignore", invalid="ignore"):
            rel = np.abs(y_approx - y_exact) / np.abs(y_exact)
            rel[np.isnan(rel)] = 0.0
            rel[np.isinf(rel)] = 0.0
        return t, rel

    def max_absolute_error(self, t, y_approx, y_exact):
        """最大绝对误差——整段里最差的那一步"""
        _, err = self.absolute_error(t, y_approx, y_exact)
        idx = np.argmax(err)
        return t[idx], err[idx]

    def check_threshold(self, t, y_approx, y_exact):
        """检查哪些点超过了阈值（及格线）

        返回:
            list of dict: 每个超阈值点的信息
        """
        _, abs_err = self.absolute_error(t, y_approx, y_exact)
        _, rel_err = self.relative_error(t, y_approx, y_exact)

        violations = []
        for i in range(len(t)):
            if abs_err[i] > self.threshold:
                violations.append({
                    "index": i,
                    "t": float(t[i]),
                    "y_approx": float(y_approx[i]),
                    "y_exact": float(y_exact[i]),
                    "abs_error": float(abs_err[i]),
                    "rel_error": float(rel_err[i]),
                    "exceeds_threshold": True,
                })
        return violations

    def check_extrapolation(self, t, extrapolation_limit=None):
        """检查外推越界——算到了题目没问的范围

        参数:
            t: 时间点数组
            extrapolation_limit: 外推边界，默认用初始化时的值

        返回:
            dict: 越界信息，含放行条件字段
        """
        limit = extrapolation_limit or self.extrapolation_limit
        if limit is None:
            return {"has_extrapolation": False, "limit": None, "points_outside": 0}

        outside_mask = t > limit
        n_outside = int(np.sum(outside_mask))

        return {
            "has_extrapolation": n_outside > 0,
            "limit": limit,
            "points_outside": n_outside,
            "t_max": float(t[-1]),
            "release_conditions": [],
        }

    def annotate_extrapolation_release(self, extrapolation_info, conditions):
        """给外推越界加上放行条件说明

        这样以后别人看报告，就知道这条是特意放过的，不是普通样本。
        """
        extrapolation_info["released"] = True
        extrapolation_info["release_conditions"] = conditions
        return extrapolation_info

    def error_propagation_estimate(self, method, dt, t_end, Lipschitz_const=1.0):
        """误差传播粗略估计（给个量级概念，不是精确值）

        通俗说：告诉你误差大概会怎么"越攒越大"。
        欧拉法是线性累积，龙格-库塔是高阶累积。
        """
        if method == "euler":
            order = 1
            coeff = 0.5 * Lipschitz_const
        elif method == "improved_euler":
            order = 2
            coeff = 1.0 / 12.0
        elif method == "rk4":
            order = 4
            coeff = 1.0 / 720.0
        else:
            order = 1
            coeff = 1.0

        bound = coeff * (dt ** order) * (np.exp(Lipschitz_const * t_end) - 1) / Lipschitz_const
        return {
            "method": method,
            "order": order,
            "dt": dt,
            "estimated_bound": float(bound),
            "explanation": f"{method} 法是 {order} 阶方法，步长 {dt}，"
                           f"估计整体误差上界约 {bound:.2e}（量级参考，不是精确值）",
        }


def unit_convert(value, from_unit, to_unit):
    """单位换算（常用的几对，课堂够用）

    支持: m <-> cm, kg <-> g, s <-> ms
    """
    conversions = {
        ("m", "cm"): 100.0,
        ("cm", "m"): 0.01,
        ("kg", "g"): 1000.0,
        ("g", "kg"): 0.001,
        ("s", "ms"): 1000.0,
        ("ms", "s"): 0.001,
    }
    key = (from_unit, to_unit)
    if key not in conversions:
        raise ValueError(f"不支持的单位换算: {from_unit} -> {to_unit}")
    return value * conversions[key]
