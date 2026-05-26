#!/usr/bin/env python3
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend import create_app
from backend.models import init_db
from backend.sample_data import seed_sample_data

if __name__ == '__main__':
    app = create_app()

    db_path = os.path.join(os.path.dirname(__file__), 'data', 'margin_system.db')
    if not os.path.exists(db_path):
        init_db()
        print("数据库已初始化")

    seed_sample_data()
    print("样例数据已载入")

    from backend.margin_engine import recalculate_all, generate_notifications, generate_daily_report
    recalculate_all()
    print("保证金已重算")
    generate_notifications()
    print("通知已生成")
    generate_daily_report()
    print("日报已生成")

    app.run(debug=True, host='127.0.0.1', port=5000)
