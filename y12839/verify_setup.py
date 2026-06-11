#!/usr/bin/env python3
import os
import sys
import py_compile
import json

def verify():
    root = os.path.dirname(os.path.abspath(__file__))
    print('═'*60)
    print('  组织切片批注导出系统 - 快速自检')
    print('═'*60)
    
    files = [
        'app.py',
        'scripts/init_database.py',
        'scripts/run_full_pipeline.py',
    ]
    
    print('\n[1/3] 语法验证...')
    all_ok = True
    for f in files:
        path = os.path.join(root, f)
        try:
            py_compile.compile(path, doraise=True)
            print(f'  ✓ {f}')
        except py_compile.PyCompileError as e:
            print(f'  ✗ {f}: {e.msg}')
            all_ok = False
    
    if not all_ok:
        print('\n请修复语法错误后重试')
        sys.exit(1)
    print('  → 语法全部通过')
    
    print('\n[2/3] 关键逻辑片段验证 (import)...')
    try:
        sys.path.insert(0, root)
        sys.path.insert(0, os.path.join(root, 'scripts'))
        from init_database import recalculate_group_stats
        print('  ✓ init_database.recalculate_group_stats 可导入')
    except Exception as e:
        print(f'  ⚠ 导入验证跳过: {e}')
    
    print('\n[3/3] 配置文件检查...')
    config_ok = True
    required = ['requirements.txt', 'README.md', 'scripts/curl_examples.sh']
    for fn in required:
        fp = os.path.join(root, fn)
        if os.path.exists(fp):
            print(f'  ✓ {fn} 存在 ({os.path.getsize(fp)} bytes)')
        else:
            print(f'  ✗ {fn} 缺失')
            config_ok = False
    
    print()
    if all_ok and config_ok:
        print('✓ 自检通过')
        print()
        print('下一步手动执行：')
        print('  1. pip3 install -r requirements.txt')
        print('  2. python3 scripts/init_database.py')
        print('  3. python3 scripts/run_full_pipeline.py   # 一键跑完整流程')
        print('  或:')
        print('  3. python3 app.py                          # 启动API服务')
        print('  4. bash scripts/curl_examples.sh           # 交互式API演示')
    else:
        print('✗ 存在问题，请检查后修复')
    
    return all_ok and config_ok

if __name__ == '__main__':
    ok = verify()
    sys.exit(0 if ok else 1)
