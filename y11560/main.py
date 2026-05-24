from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager

from app.database import init_db, get_db
from app.models import User, UserRole
from app.routers import batches, records, audit, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    
    db = next(get_db())
    seed_users(db)
    db.close()
    
    yield


def seed_users(db: Session):
    users_to_create = [
        ("admin", UserRole.SUPERVISOR),
        ("reviewer1", UserRole.REVIEWER),
        ("data_entry1", UserRole.DATA_ENTRY),
        ("viewer1", UserRole.READ_ONLY),
    ]
    
    for username, role in users_to_create:
        existing = db.query(User).filter(User.username == username).first()
        if not existing:
            user = User(username=username, role=role)
            db.add(user)
    
    db.commit()


app = FastAPI(
    title="酒店前台夜审异常回执状态机 API",
    description="从入住单、押金流水、换房记录开始建账，主管批注可追加，核心动作：批次创建、附件补传、复核改判、冻结结算、撤回归档",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(batches.router)
app.include_router(records.router)
app.include_router(audit.router)
app.include_router(users.router)


@app.get("/")
async def root():
    return {
        "message": "酒店前台夜审异常回执状态机 API",
        "version": "1.0.0",
        "docs": "/docs",
        "default_users": {
            "admin (主管)": 1,
            "reviewer1 (复核)": 2,
            "data_entry1 (录入)": 3,
            "viewer1 (只读)": 4
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
