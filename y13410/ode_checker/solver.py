import numpy as np
from scipy.integrate import odeint


class ODESolver:
    """常微分方程数值求解器

    支持欧拉法、改进欧拉法、龙格-库塔法，以及 scipy 的精确解作为参考。
    """

    METHODS = ["euler", "improved_euler", "rk4", "scipy"]

    def __init__(self, f, y0, t_span, dt=0.01, method="rk4"):
        """
        参数:
            f: 微分方程右侧函数 f(t, y)
            y0: 初始值
            t_span: (t_start, t_end) 时间区间
            dt: 步长
            method: 求解方法
        """
        self.f = f
        self.y0 = y0
        self.t_start, self.t_end = t_span
        self.dt = dt
        self.method = method
        self._validate()

    def _validate(self):
        if self.method not in self.METHODS:
            raise ValueError(f"未知方法 {self.method}，可选: {self.METHODS}")
        if self.dt <= 0:
            raise ValueError("步长 dt 必须大于 0")
        if self.t_end <= self.t_start:
            raise ValueError("t_end 必须大于 t_start")

    def solve(self):
        """求解微分方程，返回 (t_array, y_array)"""
        n_steps = int(np.ceil((self.t_end - self.t_start) / self.dt)) + 1
        t = np.linspace(self.t_start, self.t_end, n_steps)

        if self.method == "scipy":
            y = odeint(lambda y, t: self.f(t, y), self.y0, t)
            y = y.flatten()
        elif self.method == "euler":
            y = self._euler(t)
        elif self.method == "improved_euler":
            y = self._improved_euler(t)
        elif self.method == "rk4":
            y = self._rk4(t)

        return t, y

    def _euler(self, t):
        y = np.zeros_like(t)
        y[0] = self.y0
        for i in range(len(t) - 1):
            dt = t[i + 1] - t[i]
            y[i + 1] = y[i] + dt * self.f(t[i], y[i])
        return y

    def _improved_euler(self, t):
        y = np.zeros_like(t)
        y[0] = self.y0
        for i in range(len(t) - 1):
            dt = t[i + 1] - t[i]
            k1 = self.f(t[i], y[i])
            y_pred = y[i] + dt * k1
            k2 = self.f(t[i + 1], y_pred)
            y[i + 1] = y[i] + dt * (k1 + k2) / 2
        return y

    def _rk4(self, t):
        y = np.zeros_like(t)
        y[0] = self.y0
        for i in range(len(t) - 1):
            dt = t[i + 1] - t[i]
            k1 = self.f(t[i], y[i])
            k2 = self.f(t[i] + dt / 2, y[i] + dt / 2 * k1)
            k3 = self.f(t[i] + dt / 2, y[i] + dt / 2 * k2)
            k4 = self.f(t[i + 1], y[i] + dt * k3)
            y[i + 1] = y[i] + dt * (k1 + 2 * k2 + 2 * k3 + k4) / 6
        return y
