function pointInPolygon(lon, lat, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if (((yi > lat) !== (yj > lat)) &&
        (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function haversine(lon1, lat1, lon2, lat2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function interpolateTide(tideData, targetTime) {
  if (!tideData || tideData.length === 0) return 0;

  const target = new Date(targetTime).getTime();

  let before = null, after = null;
  for (const t of tideData) {
    const tTime = new Date(t.pred_time).getTime();
    if (tTime <= target) {
      before = t;
    } else if (tTime > target) {
      after = t;
      break;
    }
  }

  if (!before && !after) return 0;
  if (!before) return after.height;
  if (!after) return before.height;

  const beforeTime = new Date(before.pred_time).getTime();
  const afterTime = new Date(after.pred_time).getTime();
  const ratio = (target - beforeTime) / (afterTime - beforeTime);

  return before.height + (after.height - before.height) * ratio;
}

function findNearestTideStation(lon, lat, stations) {
  let nearest = null;
  let minDist = Infinity;
  for (const s of stations) {
    const dist = haversine(lon, lat, s.lon, s.lat);
    if (dist < minDist) {
      minDist = dist;
      nearest = s;
    }
  }
  return nearest;
}

function findWaveForecast(lon, lat, targetTime, forecasts) {
  if (!forecasts || forecasts.length === 0) return null;

  const target = new Date(targetTime).getTime();
  let nearest = null;
  let minDist = Infinity;

  for (const f of forecasts) {
    const validT = new Date(f.valid_time).getTime();
    const timeDiff = Math.abs(validT - target);
    const dist = haversine(lon, lat, f.lon, f.lat) * 1000 + timeDiff / 3600000 * 10;

    if (dist < minDist) {
      minDist = dist;
      nearest = f;
    }
  }

  return nearest;
}

function getPolygonBoundingBox(polygon) {
  let minLon = Infinity, maxLon = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;
  for (const [lon, lat] of polygon) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return { minLon, maxLon, minLat, maxLat };
}

module.exports = {
  pointInPolygon,
  haversine,
  interpolateTide,
  findNearestTideStation,
  findWaveForecast,
  getPolygonBoundingBox
};
