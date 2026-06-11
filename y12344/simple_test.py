#!/usr/bin/env python3
import os
import sys

os.chdir('/Users/mac/pro/solo/workspaces/y12344')
sys.path.insert(0, 'src')

# 创建测试文件
with open('test_output.txt', 'w') as f:
    f.write('测试成功！\n')
    f.write(f'当前目录: {os.getcwd()}\n')
    f.write(f'Python 版本: {sys.version}\n')

# 测试导入
try:
    from projectile_estimator.cli import cli
    f.write('模块导入成功！\n')
except Exception as e:
    f.write(f'模块导入失败: {e}\n')

f.write('执行完成！\n')
print('测试完成，请查看 test_output.txt')
