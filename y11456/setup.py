from setuptools import setup, find_packages

setup(
    name='aftersales-inspector',
    version='1.0.0',
    packages=find_packages(),
    include_package_data=True,
    install_requires=[
        'click>=8.0.0',
        'pandas>=1.5.0',
        'openpyxl>=3.0.0',
        'tabulate>=0.9.0',
        'python-dateutil>=2.8.0',
    ],
    entry_points={
        'console_scripts': [
            'aftersales=aftersales.cli:main',
        ],
    },
    author='Community团购团队',
    description='社区团购售后多源导入巡检 CLI 工具',
    python_requires='>=3.8',
)
