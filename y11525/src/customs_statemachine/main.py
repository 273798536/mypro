from .api import app
from .database import init_db


def main():
    init_db()
    return app


if __name__ == "__main__":
    import uvicorn
    from .config import settings

    uvicorn.run(
        app,
        host=settings.API_HOST,
        port=settings.API_PORT
    )
