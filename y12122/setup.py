from setuptools import setup, find_packages

setup(
    name="fourier-noise-filter",
    version="1.0.0",
    description="傅里叶噪声滤波器 - 音频噪声处理与质量分析工具",
    author="Music Tech Assistant",
    packages=find_packages(),
    install_requires=[
        "numpy>=1.21.0",
        "scipy>=1.7.0",
        "matplotlib>=3.4.0",
        "soundfile>=0.10.0",
        "librosa>=0.9.0",
        "pandas>=1.3.0",
        "click>=8.0.0",
        "tqdm>=4.62.0",
    ],
    entry_points={
        "console_scripts": [
            "fourier-filter=fourier_filter.cli:main",
        ],
    },
    python_requires=">=3.8",
)
