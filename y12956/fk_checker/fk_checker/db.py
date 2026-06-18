import pymysql
from dataclasses import dataclass
from typing import Optional, List, Dict, Any


@dataclass
class DBConfig:
    host: str = "localhost"
    port: int = 3306
    user: str = "root"
    password: str = ""
    database: str = ""
    charset: str = "utf8mb4"


class Database:
    def __init__(self, config: DBConfig):
        self.config = config
        self._conn = None

    def connect(self):
        if self._conn is None:
            self._conn = pymysql.connect(
                host=self.config.host,
                port=self.config.port,
                user=self.config.user,
                password=self.config.password,
                database=self.config.database,
                charset=self.config.charset,
                cursorclass=pymysql.cursors.DictCursor,
                autocommit=True,
            )
        return self._conn

    def close(self):
        if self._conn:
            self._conn.close()
        self._conn = None

    def execute(self, sql: str, params: tuple = None):
        conn = self.connect()
        with conn.cursor() as cursor:
            cursor.execute(sql, params or ())
            return cursor.fetchall()

    def execute_one(self, sql: str, params: tuple = None):
        conn = self.connect()
        with conn.cursor() as cursor:
            cursor.execute(sql, params or ())
            return cursor.fetchone()

    def commit(self):
        self._conn.commit()
