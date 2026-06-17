from setuptools import setup, find_packages

setup(
    name="context-window-budgeter",
    version="1.0.0",
    description="上下文窗口预算器 - AI/ML工作流工具",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "tiktoken>=0.5.0",
    ],
    entry_points={
        "console_scripts": [
            "cwb=context_window_budgeter.cli:main",
        ],
    },
)
