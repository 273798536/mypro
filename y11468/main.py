#!/usr/bin/env python3
import uvicorn
import sys


def main():
    print("=" * 60)
    print("服装打版样衣验收回放链路服务")
    print("=" * 60)
    print()
    
    if len(sys.argv) > 1 and sys.argv[1] == "init":
        from app.database import init_db, SessionLocal
        from app.services import UserService
        init_db()
        db = SessionLocal()
        UserService.init_default_users(db)
        db.close()
        print("数据库初始化完成")
        return
    
    uvicorn.run(
        "app.api:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )


if __name__ == "__main__":
    main()
