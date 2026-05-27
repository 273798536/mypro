"""
参数预设和性能保护模块
"""
import time
import threading
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass, field


@dataclass
class FractalPreset:
    """分形预设配置"""
    name: str
    description: str
    fractal_type: str
    params: Dict[str, Any]
    color_scheme: str
    width: int = 800
    height: int = 600
    difficulty: str = "beginner"


PRESETS = [
    FractalPreset(
        name="入门: 经典Mandelbrot",
        description="最经典的Mandelbrot集合，适合初学者观察整体结构",
        fractal_type="mandelbrot",
        params={"max_iter": 100, "zoom": 1.0, "center_x": -0.5, "center_y": 0.0},
        color_scheme="rainbow",
        difficulty="beginner",
    ),
    FractalPreset(
        name="探索: Mandelbrot海马谷",
        description="放大到著名的海马谷区域，观察复杂的边界结构",
        fractal_type="mandelbrot",
        params={"max_iter": 200, "zoom": 20.0, "center_x": -0.743643887037151, "center_y": 0.131825904205330},
        color_scheme="inferno",
        difficulty="intermediate",
    ),
    FractalPreset(
        name="入门: 经典Julia",
        description="以c=-0.7+0.27015i为参数的经典Julia集合",
        fractal_type="julia",
        params={"max_iter": 100, "zoom": 1.0, "c_real": -0.7, "c_imag": 0.27015},
        color_scheme="ocean",
        difficulty="beginner",
    ),
    FractalPreset(
        name="探索: 螺旋Julia",
        description="参数调整后产生螺旋结构的Julia集合",
        fractal_type="julia",
        params={"max_iter": 150, "zoom": 1.5, "c_real": -0.835, "c_imag": -0.2321},
        color_scheme="plasma",
        difficulty="intermediate",
    ),
    FractalPreset(
        name="入门: Sierpinski三角形",
        description="递归深度6的经典谢尔宾斯基三角形",
        fractal_type="sierpinski",
        params={"depth": 6},
        color_scheme="grayscale",
        difficulty="beginner",
    ),
    FractalPreset(
        name="挑战: Sierpinski深度10",
        description="最大递归深度，观察极致细节（性能警告）",
        fractal_type="sierpinski",
        params={"depth": 10},
        color_scheme="forest",
        difficulty="advanced",
    ),
    FractalPreset(
        name="探索: 燃烧船",
        description="独特的燃烧船分形，形似漂浮的船只",
        fractal_type="burning_ship",
        params={"max_iter": 150, "zoom": 1.0, "center_x": -0.5, "center_y": -0.5},
        color_scheme="fire",
        difficulty="intermediate",
    ),
    FractalPreset(
        name="挑战: 高倍放大Mandelbrot",
        description="深度放大区域，需要高迭代次数（性能警告）",
        fractal_type="mandelbrot",
        params={"max_iter": 500, "zoom": 500.0, "center_x": -0.7436439, "center_y": 0.1318260},
        color_scheme="sunset",
        difficulty="advanced",
    ),
    FractalPreset(
        name="艺术: 霓虹Julia",
        description="霓虹色方案的Julia集合，适合创作艺术作品",
        fractal_type="julia",
        params={"max_iter": 200, "zoom": 1.2, "c_real": 0.355, "c_imag": 0.355},
        color_scheme="neon",
        difficulty="beginner",
    ),
    FractalPreset(
        name="艺术: 日落燃烧船",
        description="日落配色的燃烧船分形",
        fractal_type="burning_ship",
        params={"max_iter": 200, "zoom": 2.0, "center_x": -1.75, "center_y": -0.03},
        color_scheme="sunset",
        difficulty="intermediate",
    ),
]


class PerformanceGuard:
    """性能保护监控器"""

    def __init__(self, timeout_seconds: int = 30, memory_warning_mb: int = 500):
        self.timeout_seconds = timeout_seconds
        self.memory_warning_mb = memory_warning_mb
        self._start_time: Optional[float] = None
        self._cancel_event = threading.Event()

    def start(self):
        self._start_time = time.time()
        self._cancel_event.clear()

    def stop(self) -> float:
        if self._start_time is None:
            return 0.0
        elapsed = (time.time() - self._start_time) * 1000
        self._start_time = None
        return elapsed

    def check_timeout(self) -> bool:
        if self._start_time is None:
            return False
        elapsed = time.time() - self._start_time
        return elapsed > self.timeout_seconds

    def cancel(self):
        self._cancel_event.set()

    def is_cancelled(self) -> bool:
        return self._cancel_event.is_set()

    def estimate_render_time(self, fractal_type: str, max_iter: int, width: int, height: int) -> Dict[str, Any]:
        """预估渲染时间"""
        base_times = {
            "mandelbrot": 0.0001,
            "julia": 0.0001,
            "burning_ship": 0.00015,
            "sierpinski": 0.00001,
        }

        base_time = base_times.get(fractal_type, 0.0001)
        total_pixels = width * height

        if fractal_type == "sierpinski":
            estimated_ms = base_time * total_pixels * 0.1
        else:
            estimated_ms = base_time * total_pixels * max_iter

        warning = ""
        if estimated_ms > 10000:
            warning = "预计渲染时间超过10秒，建议降低参数"
        elif estimated_ms > 5000:
            warning = "预计渲染时间较长，请耐心等待"

        return {
            "estimated_ms": round(estimated_ms, 2),
            "warning": warning,
            "complexity": {
                "fractal_type": fractal_type,
                "pixels": total_pixels,
                "iterations": max_iter if fractal_type != "sierpinski" else None,
            },
        }

    def get_safe_params(self, fractal_type: str, params: Dict[str, Any], width: int, height: int) -> Dict[str, Any]:
        """获取安全的参数（自动降级以保证性能）"""
        safe_params = dict(params)
        total_pixels = width * height

        if fractal_type in ["mandelbrot", "julia", "burning_ship"]:
            max_iter = safe_params.get("max_iter", 100)

            estimated_ops = total_pixels * max_iter

            if estimated_ops > 500_000_000:
                safe_params["max_iter"] = min(max_iter, 200)
            elif estimated_ops > 200_000_000:
                safe_params["max_iter"] = min(max_iter, 500)

            zoom = safe_params.get("zoom", 1.0)
            if zoom > 10000:
                safe_params["zoom"] = 10000

        elif fractal_type == "sierpinski":
            depth = safe_params.get("depth", 6)
            if depth > 10:
                safe_params["depth"] = 10
            elif total_pixels > 2_000_000 and depth > 8:
                safe_params["depth"] = 8

        return safe_params


class ParameterPresetManager:
    """参数预设管理器"""

    def __init__(self):
        self.presets = PRESETS

    def list_presets(self, difficulty: Optional[str] = None) -> list:
        """列出预设"""
        if difficulty:
            return [p for p in self.presets if p.difficulty == difficulty]
        return self.presets

    def get_preset(self, name: str) -> Optional[FractalPreset]:
        """获取指定预设"""
        for preset in self.presets:
            if preset.name == name:
                return preset
        return None

    def get_recommended_preset(self, experience_level: str = "beginner") -> FractalPreset:
        """根据经验级别推荐预设"""
        for preset in self.presets:
            if preset.difficulty == experience_level:
                return preset
        return self.presets[0]

    def search_presets(self, keyword: str) -> list:
        """搜索预设"""
        keyword = keyword.lower()
        results = []
        for preset in self.presets:
            if (keyword in preset.name.lower() or 
                keyword in preset.description.lower() or
                keyword in preset.fractal_type.lower()):
                results.append(preset)
        return results
