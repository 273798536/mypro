# Ice Surface Load-Bearing Safety Estimation Service

## Start

```bash
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Service starts at `http://localhost:8000`, OpenAPI docs at `http://localhost:8000/docs`.

Data persists in `ice_safety.db` (SQLite), survives restarts.

## Sample Data

`seed.py` loads 5 zones with realistic scenarios:

| Zone | Points | Avg Thickness | Key Scenario |
|---|---|---|---|
| north-shore | 3 | ~18cm | Normal, safe |
| mid-lake | 2 | ~12cm | Moderate risk, sparse points |
| south-bay | 2 | ~4cm | Danger zone, thin ice |
| east-cove | 4 | ~22cm | Safe, well-measured |
| sparse-zone | 1 | 14cm | Only 1 measurement point, triggers sparse warning |

Temperature history shows a +11.5C rise over 24h, triggering temperature spike detection.

## Trigger Sparse Point Warning

A zone has sparse points when it has fewer than 3 measurement points. To trigger:

1. Create a zone with 1-2 measurements:
```bash
curl -X POST http://localhost:8000/api/measurements \
  -H "Content-Type: application/json" \
  -d '{"zone_name":"test-zone","ice_thickness_cm":10.0}'
# only 1 point -> sparse warning
```

2. Add more points until the warning clears:
```bash
curl -X POST http://localhost:8000/api/measurements \
  -H "Content-Type: application/json" \
  -d '{"zone_name":"test-zone","ice_thickness_cm":11.0,"x":10,"y":20}'
curl -X POST http://localhost:8000/api/measurements \
  -H "Content-Type: application/json" \
  -d '{"zone_name":"test-zone","ice_thickness_cm":12.0,"x":20,"y":30}'
# 3 points -> sparse warning clears on next assessment
```

## API Endpoints

### Measurements
- `POST /api/measurements` — add measurement point (triggers zone recalculation)
- `GET /api/measurements?zone_name=X` — list measurements
- `GET /api/measurements/{id}` — get one measurement
- `PATCH /api/measurements/{id}` — update measurement (triggers zone recalculation)
- `DELETE /api/measurements/{id}` — delete measurement (triggers zone recalculation)

### Temperature
- `POST /api/temperature` — add temperature record (triggers all-zone recalculation)
- `GET /api/temperature?hours=24` — list records
- `GET /api/temperature/spike-check` — check for temperature spike

### Participants
- `POST /api/participants` — add participant plan (triggers zone recalculation)
- `GET /api/participants?zone_name=X` — list plans
- `GET /api/participants/{zone_name}` — get plan for zone

### Assessment
- `POST /api/assessment/run` — recalculate all zones, return latest assessments
- `GET /api/assessment` — list latest assessment per zone
- `GET /api/assessment/{zone_name}` — get latest assessment for zone
- `GET /api/assessment/{zone_name}/history?limit=20` — assessment history

## Messy Data Handling

- All optional fields (`x`, `y`, `measured_at`, `notes`, `temperature_c`, `source`, `planned_at`) accept null
- Late-arriving participant plans: POST whenever ready, zone recalculates automatically
- Measurement notes stored as-is, not parsed
- Missing temperature values skip spike detection without crashing

## Cascade Updates

Every data change automatically triggers recalculation:
- Add/update/delete measurement -> recalculate that zone
- Add temperature record -> recalculate all zones
- Add participant plan -> recalculate that zone
- `POST /api/assessment/run` -> recalculate all zones manually

Risk level, warnings, and recommendations all update together — no stale state.
