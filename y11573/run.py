#!/usr/bin/env python3
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.api import create_app
from app.database import init_database

app = create_app()

if __name__ == '__main__':
    print("=" * 60)
    print("客服工单升级验收回放链路系统")
    print("Customer Service Ticket Playback System")
    print("=" * 60)
    
    init_database()
    print("Database initialized.")
    
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'true').lower() == 'true'
    
    print(f"Starting server on {host}:{port}...")
    print(f"Health check: http://localhost:{port}/health")
    print(f"API docs: See README.md for API documentation")
    print("=" * 60)
    
    app.run(host=host, port=port, debug=debug)
