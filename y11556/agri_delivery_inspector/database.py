import os
from datetime import datetime
from .config import get_engine, DEFAULT_DB_PATH
from .models import Base


def init_database(db_path=None, force=False):
    if db_path is None:
        db_path = DEFAULT_DB_PATH
    
    db_exists = os.path.exists(db_path)
    
    if db_exists and not force:
        return {
            "success": False,
            "message": f"数据库已存在: {db_path}，使用 --force 强制重新初始化"
        }
    
    if db_exists and force:
        os.remove(db_path)
    
    engine = get_engine(db_path)
    Base.metadata.create_all(engine)
    
    return {
        "success": True,
        "message": f"数据库初始化完成: {db_path}",
        "db_path": db_path,
        "initialized_at": datetime.now().isoformat()
    }


def check_database_exists(db_path=None):
    if db_path is None:
        db_path = DEFAULT_DB_PATH
    return os.path.exists(db_path)


def get_database_info(db_path=None):
    if db_path is None:
        db_path = DEFAULT_DB_PATH
    
    if not os.path.exists(db_path):
        return {"exists": False}
    
    stat = os.stat(db_path)
    engine = get_engine(db_path)
    
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    return {
        "exists": True,
        "db_path": db_path,
        "size_bytes": stat.st_size,
        "size_mb": round(stat.st_size / 1024 / 1024, 2),
        "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
        "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "tables": tables,
        "table_count": len(tables)
    }
