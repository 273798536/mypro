"""
分形图案生成器 - 核心算法模块
"""
import numpy as np
from typing import Tuple, Optional


class FractalBase:
    """分形基类"""
    name = "base"
    
    def __init__(self, width: int = 800, height: int = 600):
        self.width = width
        self.height = height
        self._validate_dimensions()

    def _validate_dimensions(self):
        if self.width <= 0 or self.height <= 0:
            raise ValueError("图像尺寸必须为正整数")
        if self.width > 4096 or self.height > 4096:
            raise ValueError("图像尺寸过大，最大支持4096x4096")

    def generate(self, **kwargs) -> np.ndarray:
        raise NotImplementedError("子类必须实现generate方法")


class MandelbrotSet(FractalBase):
    """Mandelbrot集合"""
    name = "mandelbrot"

    def generate(self, max_iter: int = 100, zoom: float = 1.0, 
                 center_x: float = -0.5, center_y: float = 0.0,
                 escape_radius: float = 2.0) -> Tuple[np.ndarray, np.ndarray]:
        max_iter = int(max_iter)
        if max_iter <= 0:
            raise ValueError("迭代次数必须为正整数")
        if max_iter > 10000:
            raise ValueError("迭代次数过大，最大支持10000")
        if zoom <= 0:
            raise ValueError("缩放倍数必须为正数")

        x_min = center_x - 3.0 / zoom
        x_max = center_x + 3.0 / zoom
        y_min = center_y - 2.25 / zoom
        y_max = center_y + 2.25 / zoom

        x = np.linspace(x_min, x_max, self.width)
        y = np.linspace(y_min, y_max, self.height)
        X, Y = np.meshgrid(x, y)
        c = X + 1j * Y
        z = np.zeros_like(c)
        iterations = np.zeros(c.shape, dtype=int)
        mask = np.ones(c.shape, dtype=bool)

        for i in range(max_iter):
            z[mask] = z[mask] ** 2 + c[mask]
            diverged = np.abs(z) > escape_radius
            iterations[diverged & mask] = i
            mask = mask & ~diverged

        return iterations, mask


class JuliaSet(FractalBase):
    """Julia集合"""
    name = "julia"

    def generate(self, max_iter: int = 100, zoom: float = 1.0,
                 center_x: float = 0.0, center_y: float = 0.0,
                 c_real: float = -0.7, c_imag: float = 0.27015,
                 escape_radius: float = 2.0) -> Tuple[np.ndarray, np.ndarray]:
        max_iter = int(max_iter)
        if max_iter <= 0:
            raise ValueError("迭代次数必须为正整数")
        if max_iter > 10000:
            raise ValueError("迭代次数过大，最大支持10000")
        if zoom <= 0:
            raise ValueError("缩放倍数必须为正数")

        x_min = center_x - 2.0 / zoom
        x_max = center_x + 2.0 / zoom
        y_min = center_y - 1.5 / zoom
        y_max = center_y + 1.5 / zoom

        x = np.linspace(x_min, x_max, self.width)
        y = np.linspace(y_min, y_max, self.height)
        X, Y = np.meshgrid(x, y)
        z = X + 1j * Y
        c = complex(c_real, c_imag)
        iterations = np.zeros(z.shape, dtype=int)
        mask = np.ones(z.shape, dtype=bool)

        for i in range(max_iter):
            z[mask] = z[mask] ** 2 + c
            diverged = np.abs(z) > escape_radius
            iterations[diverged & mask] = i
            mask = mask & ~diverged

        return iterations, mask


class SierpinskiTriangle(FractalBase):
    """Sierpinski三角形"""
    name = "sierpinski"

    def generate(self, depth: int = 6) -> np.ndarray:
        depth = int(depth)
        if depth <= 0:
            raise ValueError("递归深度必须为正整数")
        if depth > 10:
            raise ValueError("递归深度过大，最大支持10")

        size = 2 ** depth
        self.width = size
        self.height = size

        canvas = np.ones((size, size), dtype=np.uint8)
        
        def draw_triangle(x: int, y: int, s: int):
            if s == 1:
                return
            s //= 2
            canvas[y:y+s, x:x+s] = 0
            draw_triangle(x, y, s)
            draw_triangle(x + s, y, s)
            draw_triangle(x, y + s, s)

        draw_triangle(0, 0, size)
        iterations = canvas * 255
        mask = canvas.astype(bool)
        return iterations, mask


class BurningShip(FractalBase):
    """燃烧船分形"""
    name = "burning_ship"

    def generate(self, max_iter: int = 100, zoom: float = 1.0,
                 center_x: float = -0.5, center_y: float = -0.5,
                 escape_radius: float = 2.0) -> Tuple[np.ndarray, np.ndarray]:
        max_iter = int(max_iter)
        if max_iter <= 0:
            raise ValueError("迭代次数必须为正整数")
        if max_iter > 10000:
            raise ValueError("迭代次数过大，最大支持10000")
        if zoom <= 0:
            raise ValueError("缩放倍数必须为正数")

        x_min = center_x - 2.5 / zoom
        x_max = center_x + 1.0 / zoom
        y_min = center_y - 1.75 / zoom
        y_max = center_y + 1.0 / zoom

        x = np.linspace(x_min, x_max, self.width)
        y = np.linspace(y_min, y_max, self.height)
        X, Y = np.meshgrid(x, y)
        c = X + 1j * Y
        z = np.zeros_like(c)
        iterations = np.zeros(c.shape, dtype=int)
        mask = np.ones(c.shape, dtype=bool)

        for i in range(max_iter):
            z_real = np.abs(np.real(z[mask]))
            z_imag = np.abs(np.imag(z[mask]))
            z[mask] = (z_real + 1j * z_imag) ** 2 + c[mask]
            diverged = np.abs(z) > escape_radius
            iterations[diverged & mask] = i
            mask = mask & ~diverged

        return iterations, mask


FRACTAL_CLASSES = {
    'mandelbrot': MandelbrotSet,
    'julia': JuliaSet,
    'sierpinski': SierpinskiTriangle,
    'burning_ship': BurningShip,
}


def create_fractal(fractal_type: str, width: int = 800, height: int = 600) -> FractalBase:
    """工厂函数创建分形实例"""
    if fractal_type not in FRACTAL_CLASSES:
        raise ValueError(f"未知的分形类型: {fractal_type}。可用类型: {list(FRACTAL_CLASSES.keys())}")
    return FRACTAL_CLASSES[fractal_type](width, height)
