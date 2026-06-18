#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys

BASE_DIR = os.path.dirname(__file__)
sys.path.insert(0, BASE_DIR)

from src.db import init_database
from src.data_import import DataImporter

DATA_DIR = os.path.join(BASE_DIR, 'data')


def main():
    print("=" * 60)
    print("  报表口径血缘追踪系统 - 数据库初始化")
    print("=" * 60)
    
    print("\n[1/5] 创建数据库结构...")
    result = init_database()
    if result:
        print("  ✓ 数据库创建成功")
    else:
        print("  数据库已存在，跳过创建")
    
    importer = DataImporter()
    
    print("\n[2/5] 导入慢查询日志数据...")
    slow_logs_file = os.path.join(DATA_DIR, 'slow_query_logs.json')
    stats = importer.import_slow_query_logs(slow_logs_file, 'U001', mode='standard')
    print(f"  ✓ 导入完成: 总计{stats['total']}条, 成功{stats['success']}条, "
          f"脏数据{stats['dirty']}条, 跳过{stats['skipped']}条")
    
    print("\n[3/5] 导入数据字典...")
    dict_file = os.path.join(DATA_DIR, 'data_dictionary.json')
    stats = importer.import_data_dictionary(dict_file)
    print(f"  ✓ 导入完成: 总计{stats['total']}条, 新增{stats['imported']}条, 跳过{stats['skipped']}条")
    
    print("\n[4/5] 导入迁移脚本...")
    migrations_file = os.path.join(DATA_DIR, 'migrations.json')
    stats = importer.import_migrations(migrations_file)
    print(f"  ✓ 导入完成: 总计{stats['total']}条, 新增{stats['imported']}条, 跳过{stats['skipped']}条")
    
    print("\n[5/5] 导入权限配置...")
    permissions_file = os.path.join(DATA_DIR, 'permissions.json')
    stats = importer.import_permissions(permissions_file)
    print(f"  ✓ 导入完成: 总计{stats['total']}条, 新增{stats['imported']}条, 跳过{stats['skipped']}条")
    
    print("\n" + "=" * 60)
    print("  初始化完成！")
    print("=" * 60)
    print("\n接下来可以:")
    print("  1. 启动API服务: python run_server.py")
    print("  2. 运行完整示例: ./scripts/run_full_demo.sh")
    print("  3. 查看curl示例: cat scripts/curl_examples.sh")
    print("\n")


if __name__ == '__main__':
    main()
