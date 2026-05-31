import uvicorn
from concert_claim.api import app

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
