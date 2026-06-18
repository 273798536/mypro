#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys

BASE_DIR = os.path.dirname(__file__)
sys.path.insert(0, BASE_DIR)

from src.api_server import app


def main():
    print("=" * 60)
    print("  报表口径血缘追踪系统 - API服务")
    print("=" * 60)
    print("\n服务地址: http://localhost:5000")
    print("健康检查: curl http://localhost:5000/health")
    print("\n按 Ctrl+C 停止服务")
    print("=" * 60 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)


if __name__ == '__main__':
    main()
