from setuptools import setup, find_packages

setup(
    name='anomaly-bucket',
    version='0.1.0',
    description='统计异常分桶CLI - 风控交易指标异常检测与分桶工具',
    packages=find_packages(where='src'),
    package_dir={'': 'src'},
    python_requires='>=3.9',
    install_requires=[
        'pandas>=1.5.0',
        'numpy>=1.23.0',
        'click>=8.1.0',
        'pyyaml>=6.0',
    ],
    entry_points={
        'console_scripts': [
            'anomaly-bucket=anomaly_bucket.cli:main',
        ],
    },
)
