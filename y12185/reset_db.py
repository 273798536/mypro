#!/usr/bin/env python3
import os
from pathlib import Path

db_path = Path.home() / '.band_equipment' / 'equipment.db'
if db_path.exists():
    os.remove(db_path)
    print(f"✅ 已重置数据库: {db_path}")
else:
    print(f"ℹ️  数据库不存在: {db_path}")
