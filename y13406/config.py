import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    FLASK_APP = os.getenv("FLASK_APP", "app.py")
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    FLASK_PORT = int(os.getenv("FLASK_PORT", "5001"))
    LOG_LEVEL = os.getenv("LOG_LEVEL", "DEBUG")

    ALLOWED_EXTENSIONS = {"csv", "xlsx", "xls", "json"}
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024

    TERM_MAPPING = {
        "错题": "error_question",
        "错误题": "error_question",
        "错题库": "error_question",
        "学生": "student",
        "同学": "student",
        "学员": "student",
        "班级": "class",
        "班": "class",
        "备注": "remark",
        "说明": "remark",
        "后补": "remark_supplement",
        "后补说明": "remark_supplement",
    }

    REQUIRED_UNITS = {"score": ["分", "points", "分數"], "count": ["题", "道", "个"]}

    BOUNDARY_THRESHOLD = {"min_score": 0, "max_score": 150, "min_count": 1, "max_count": 200}
