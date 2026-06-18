import uvicorn
from app.database import engine, Base
from app.main import app

Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    uvicorn.run("run:app", host="0.0.0.0", port=8000, reload=True)
