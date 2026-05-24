#!/usr/bin/env python3
import uvicorn
from src.config import API_HOST, API_PORT
from src.database import init_db

if __name__ == "__main__":
    init_db()
    uvicorn.run("src.main:app", host=API_HOST, port=API_PORT, reload=True)
