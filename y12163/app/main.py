from fastapi import FastAPI
from app.database import init_db
from app.routers import measurements, temperature, participants, assessment

app = FastAPI(
    title="Ice Surface Load-Bearing Safety Estimation Service",
    version="1.0.0",
)

app.include_router(measurements.router)
app.include_router(temperature.router)
app.include_router(participants.router)
app.include_router(assessment.router)


@app.on_event("startup")
def startup():
    init_db()
