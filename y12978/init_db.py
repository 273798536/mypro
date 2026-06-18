from audit_tool.database import engine, Base
from audit_tool import models


def init_database():
    Base.metadata.create_all(bind=engine)
    print("数据库初始化完成: audit.db")
    print("已创建表: data_dictionary, source_record, process_log, audit_conclusion")


if __name__ == "__main__":
    init_database()
