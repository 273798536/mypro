"""
颜色方案和图像处理模块
"""
import numpy as np
from PIL import Image
from typing import Dict, Tuple, List, Optional
from colorsys import hsv_to_rgb


class ColorScheme:
    """颜色方案基类"""

    @staticmethod
    def apply(iterations: np.ndarray, mask: np.ndarray, max_iter: int) -> np.ndarray:
        raise NotImplementedError

    @staticmethod
    def _normalize(iterations: np.ndarray, mask: np.ndarray, max_iter: int) -> np.ndarray:
        norm = np.zeros_like(iterations, dtype=np.float64)
        if max_iter > 0:
            norm[mask] = iterations[mask] / max_iter
        return norm


class RainbowScheme(ColorScheme):
    """彩虹色方案"""
    name = "rainbow"

    @staticmethod
    def apply(iterations: np.ndarray, mask: np.ndarray, max_iter: int) -> np.ndarray:
        norm = ColorScheme._normalize(iterations, mask, max_iter)
        h, w = iterations.shape
        rgb = np.zeros((h, w, 3), dtype=np.uint8)

        for i in range(h):
            for j in range(w):
                if mask[i, j]:
                    n = norm[i, j]
                    hue = n * 6.0
                    x = int(hue) % 6
                    f = hue - int(hue)

                    r, g, b = 0.0, 0.0, 0.0
                    if x == 0:
                        r, g, b = 1.0, f, 0.0
                    elif x == 1:
                        r, g, b = 1.0 - f, 1.0, 0.0
                    elif x == 2:
                        r, g, b = 0.0, 1.0, f
                    elif x == 3:
                        r, g, b = 0.0, 1.0 - f, 1.0
                    elif x == 4:
                        r, g, b = f, 0.0, 1.0
                    elif x == 5:
                        r, g, b = 1.0, 0.0, 1.0 - f

                    rgb[i, j] = [int(r * 255), int(g * 255), int(b * 255)]
                else:
                    rgb[i, j] = [0, 0, 0]

        return rgb


class OceanScheme(ColorScheme):
    """海洋蓝方案"""
    name = "ocean"

    @staticmethod
    def apply(iterations: np.ndarray, mask: np.ndarray, max_iter: int) -> np.ndarray:
        norm = ColorScheme._normalize(iterations, mask, max_iter)
        h, w = iterations.shape
        rgb = np.zeros((h, w, 3), dtype=np.uint8)

        for i in range(h):
            for j in range(w):
                if mask[i, j]:
                    n = norm[i, j]
                    r = int(n * 50)
                    g = int(n * 150 + 50)
                    b = int(n * 200 + 55)
                    rgb[i, j] = [r, g, b]
                else:
                    rgb[i, j] = [0, 0, 40]

        return rgb


class FireScheme(ColorScheme):
    """火焰红方案"""
    name = "fire"

    @staticmethod
    def apply(iterations: np.ndarray, mask: np.ndarray, max_iter: int) -> np.ndarray:
        norm = ColorScheme._normalize(iterations, mask, max_iter)
        h, w = iterations.shape
        rgb = np.zeros((h, w, 3), dtype=np.uint8)

        for i in range(h):
            for j in range(w):
                if mask[i, j]:
                    n = norm[i, j]
                    if n < 0.5:
                        r = int(n * 2 * 255)
                        g = int(n * 2 * 100)
                        b = 0
                    else:
                        r = 255
                        g = int((n - 0.5) * 2 * 255)
                        b = int((n - 0.5) * 2 * 150)
                    rgb[i, j] = [r, g, b]
                else:
                    rgb[i, j] = [30, 0, 0]

        return rgb


class ForestScheme(ColorScheme):
    """森林绿方案"""
    name = "forest"

    @staticmethod
    def apply(iterations: np.ndarray, mask: np.ndarray, max_iter: int) -> np.ndarray:
        norm = ColorScheme._normalize(iterations, mask, max_iter)
        h, w = iterations.shape
        rgb = np.zeros((h, w, 3), dtype=np.uint8)

        for i in range(h):
            for j in range(w):
                if mask[i, j]:
                    n = norm[i, j]
                    r = int(n * 80 + 20)
                    g = int(n * 180 + 40)
                    b = int(n * 60 + 20)
                    rgb[i, j] = [r, g, b]
                else:
                    rgb[i, j] = [10, 30, 10]

        return rgb


class SunsetScheme(ColorScheme):
    """日落橙方案"""
    name = "sunset"

    @staticmethod
    def apply(iterations: np.ndarray, mask: np.ndarray, max_iter: int) -> np.ndarray:
        norm = ColorScheme._normalize(iterations, mask, max_iter)
        h, w = iterations.shape
        rgb = np.zeros((h, w, 3), dtype=np.uint8)

        for i in range(h):
            for j in range(w):
                if mask[i, j]:
                    n = norm[i, j]
                    r = int(255 - n * 50)
                    g = int(n * 180 + 50)
                    b = int(n * 150)
                    rgb[i, j] = [r, g, b]
                else:
                    rgb[i, j] = [80, 20, 0]

        return rgb


class NeonScheme(ColorScheme):
    """霓虹色方案"""
    name = "neon"

    @staticmethod
    def apply(iterations: np.ndarray, mask: np.ndarray, max_iter: int) -> np.ndarray:
        norm = ColorScheme._normalize(iterations, mask, max_iter)
        h, w = iterations.shape
        rgb = np.zeros((h, w, 3), dtype=np.uint8)

        neon_colors = [
            (0, 255, 255),
            (255, 0, 255),
            (0, 255, 0),
            (255, 255, 0),
            (0, 128, 255),
            (255, 128, 0),
        ]

        for i in range(h):
            for j in range(w):
                if mask[i, j]:
                    n = norm[i, j]
                    idx = int(n * (len(neon_colors) - 1))
                    color = neon_colors[idx]
                    intensity = 0.5 + 0.5 * np.sin(n * np.pi * 4)
                    rgb[i, j] = [
                        int(color[0] * intensity),
                        int(color[1] * intensity),
                        int(color[2] * intensity),
                    ]
                else:
                    rgb[i, j] = [0, 0, 0]

        return rgb


class GrayscaleScheme(ColorScheme):
    """灰度方案"""
    name = "grayscale"

    @staticmethod
    def apply(iterations: np.ndarray, mask: np.ndarray, max_iter: int) -> np.ndarray:
        norm = ColorScheme._normalize(iterations, mask, max_iter)
        h, w = iterations.shape
        rgb = np.zeros((h, w, 3), dtype=np.uint8)

        for i in range(h):
            for j in range(w):
                if mask[i, j]:
                    gray = int(norm[i, j] * 255)
                    rgb[i, j] = [gray, gray, gray]
                else:
                    rgb[i, j] = [0, 0, 0]

        return rgb


class InfernoScheme(ColorScheme):
    """地狱火方案"""
    name = "inferno"

    @staticmethod
    def apply(iterations: np.ndarray, mask: np.ndarray, max_iter: int) -> np.ndarray:
        norm = ColorScheme._normalize(iterations, mask, max_iter)
        h, w = iterations.shape
        rgb = np.zeros((h, w, 3), dtype=np.uint8)

        for i in range(h):
            for j in range(w):
                if mask[i, j]:
                    n = norm[i, j]
                    r, g, b = 0.0, 0.0, 0.0

                    if n < 0.25:
                        t = n / 0.25
                        r = t * 131 / 255
                        g = t * 56 / 255
                        b = t * 237 / 255
                    elif n < 0.5:
                        t = (n - 0.25) / 0.25
                        r = 131 / 255 + t * (82 - 131) / 255
                        g = 56 / 255 + t * (10 - 56) / 255
                        b = 237 / 255 + t * (238 - 237) / 255
                    elif n < 0.75:
                        t = (n - 0.5) / 0.25
                        r = 82 / 255 + t * (252 - 82) / 255
                        g = 10 / 255 + t * (223 - 10) / 255
                        b = 238 / 255 + t * (57 - 238) / 255
                    else:
                        t = (n - 0.75) / 0.25
                        r = 252 / 255 + t * (252 - 252) / 255
                        g = 223 / 255 + t * (255 - 223) / 255
                        b = 57 / 255 + t * (191 - 57) / 255

                    rgb[i, j] = [int(r * 255), int(g * 255), int(b * 255)]
                else:
                    rgb[i, j] = [0, 0, 0]

        return rgb


class ViridisScheme(ColorScheme):
    """青绿渐变方案"""
    name = "viridis"

    @staticmethod
    def apply(iterations: np.ndarray, mask: np.ndarray, max_iter: int) -> np.ndarray:
        norm = ColorScheme._normalize(iterations, mask, max_iter)
        h, w = iterations.shape
        rgb = np.zeros((h, w, 3), dtype=np.uint8)

        for i in range(h):
            for j in range(w):
                if mask[i, j]:
                    n = norm[i, j]
                    r, g, b = 0.0, 0.0, 0.0

                    if n < 0.25:
                        t = n / 0.25
                        r = t * 94 / 255
                        g = t * 79 / 255
                        b = t * 162 / 255
                    elif n < 0.5:
                        t = (n - 0.25) / 0.25
                        r = 94 / 255 + t * (122 - 94) / 255
                        g = 79 / 255 + t * (196 - 79) / 255
                        b = 162 / 255 + t * (208 - 162) / 255
                    elif n < 0.75:
                        t = (n - 0.5) / 0.25
                        r = 122 / 255 + t * (231 - 122) / 255
                        g = 196 / 255 + t * (221 - 196) / 255
                        b = 208 / 255 + t * (147 - 208) / 255
                    else:
                        t = (n - 0.75) / 0.25
                        r = 231 / 255 + t * (253 - 231) / 255
                        g = 221 / 255 + t * (236 - 221) / 255
                        b = 147 / 255 + t * (118 - 147) / 255

                    rgb[i, j] = [int(r * 255), int(g * 255), int(b * 255)]
                else:
                    rgb[i, j] = [0, 0, 0]

        return rgb


class PlasmaScheme(ColorScheme):
    """等离子方案"""
    name = "plasma"

    @staticmethod
    def apply(iterations: np.ndarray, mask: np.ndarray, max_iter: int) -> np.ndarray:
        norm = ColorScheme._normalize(iterations, mask, max_iter)
        h, w = iterations.shape
        rgb = np.zeros((h, w, 3), dtype=np.uint8)

        for i in range(h):
            for j in range(w):
                if mask[i, j]:
                    n = norm[i, j]
                    r = int(n * 255)
                    g = int(255 - abs(n - 0.5) * 2 * 255)
                    b = int((1 - n) * 255)
                    rgb[i, j] = [r, g, b]
                else:
                    rgb[i, j] = [0, 0, 0]

        return rgb


COLOR_SCHEMES = {
    'rainbow': RainbowScheme,
    'ocean': OceanScheme,
    'fire': FireScheme,
    'forest': ForestScheme,
    'sunset': SunsetScheme,
    'neon': NeonScheme,
    'grayscale': GrayscaleScheme,
    'inferno': InfernoScheme,
    'viridis': ViridisScheme,
    'plasma': PlasmaScheme,
}


def apply_color_scheme(iterations: np.ndarray, mask: np.ndarray, 
                        max_iter: int, scheme_name: str) -> np.ndarray:
    """应用颜色方案"""
    if scheme_name not in COLOR_SCHEMES:
        raise ValueError(f"未知的颜色方案: {scheme_name}")
    scheme = COLOR_SCHEMES[scheme_name]
    return scheme.apply(iterations, mask, max_iter)


def array_to_image(rgb_array: np.ndarray) -> Image.Image:
    """将numpy数组转换为PIL图像"""
    return Image.fromarray(rgb_array)


def save_image(image: Image.Image, path: str, format: str = 'PNG'):
    """保存图像到文件"""
    image.save(path, format=format)
