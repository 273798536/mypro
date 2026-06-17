from app.database import engine, Base
from app.models.models import (
    Batch, MaterialSource, Question, ChangeRecord,
    RoutingResult, ReviewRecord, RollbackLog
)


def init_db():
    Base.metadata.create_all(bind=engine)
    print("数据库表初始化完成")


if __name__ == "__main__":
    init_db()
