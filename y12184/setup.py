from setuptools import setup, find_packages

setup(
    name="audio-dedup",
    version="0.1.0",
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        "click>=8.1.0",
        "librosa>=0.10.0",
        "numpy>=1.24.0",
        "tabulate>=0.9.0",
        "PyYAML>=6.0",
        "pandas>=2.0.0",
    ],
    entry_points={
        "console_scripts": [
            "audio-dedup=audio_dedup.cli:cli",
        ],
    },
    author="Audio Dedup Team",
    description="Audio素材去重CLI工具 - 基于音频指纹的重复检测与引用追踪",
    python_requires=">=3.9",
)
