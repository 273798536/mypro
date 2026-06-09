"""
从零初始化数据库和导入示例数据
用法: python init_db.py
"""
import os
import sys

from app import app
from models import db, Student, WrongQuestion, CorrectionLog, WalkPathNode, ImportBatch


def main():
    db_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
    if db_path.startswith('/'):
        full_path = db_path
    else:
        full_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), db_path)

    if os.path.exists(full_path):
        print(f"检测到已存在数据库: {full_path}")
        ans = input("是否删除并重建？(y/N): ").strip().lower()
        if ans == 'y':
            os.remove(full_path)
            print("已删除旧数据库")
        else:
            print("取消，退出。")
            sys.exit(0)

    with app.app_context():
        db.create_all()
        print(f"数据库已创建: {full_path}")
        print("表结构:")
        for t in ['students', 'wrong_questions', 'correction_logs', 'walk_path_nodes', 'import_batches']:
            print(f"  - {t}")

    print("\n下一步:")
    print("  1. 启动服务:  python app.py")
    print("  2. 运行演示:  bash examples/demo_curl.sh")
    print("             或 python examples/demo_python.py")


if __name__ == '__main__':
    main()
