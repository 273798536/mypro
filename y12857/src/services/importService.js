const fs = require('fs');
const { parse } = require('csv-parse/sync');
const db = require('../models/db');
const batchService = require('./batchService');

const importAisCsv = (batchId, filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parse(content, { columns: true, skip_empty_lines: true });

  const insertStmt = db.prepare(`
    INSERT INTO ais_points (batch_id, mmsi, ship_name, timestamp, lon, lat, speed, course)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((points) => {
    for (const p of points) {
      insertStmt.run(
        batchId,
        p.mmsi || p.MMSI || '',
        p.ship_name || p.shipName || p.SHIP_NAME || '',
        p.timestamp || p.time || p.TIMESTAMP || '',
        parseFloat(p.lon || p.lng || p.LON || p.LNG || 0),
        parseFloat(p.lat || p.LAT || 0),
        parseFloat(p.speed || p.SPEED || 0),
        parseFloat(p.course || p.COURSE || 0)
      );
    }
  });

  insertMany(records);

  batchService.updateBatchStats(batchId, { total_ais_points: records.length });
  return { count: records.length, batchId };
};

const importWaterQualityCsv = (batchId, filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parse(content, { columns: true, skip_empty_lines: true });

  const insertStmt = db.prepare(`
    INSERT INTO water_quality (batch_id, station_id, timestamp, lon, lat, ph, dissolved_oxygen, turbidity, is_missing)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let missingCount = 0;

  const insertMany = db.transaction((records) => {
    for (const r of records) {
      const isMissing = !r.ph && !r.dissolved_oxygen && !r.turbidity ? 1 : 0;
      if (isMissing) missingCount++;
      insertStmt.run(
        batchId,
        r.station_id || r.stationId || r.STATION_ID || '',
        r.timestamp || r.time || r.TIMESTAMP || '',
        parseFloat(r.lon || r.lng || r.LON || r.LNG || 0),
        parseFloat(r.lat || r.LAT || 0),
        r.ph ? parseFloat(r.ph) : null,
        r.dissolved_oxygen ? parseFloat(r.dissolved_oxygen) : null,
        r.turbidity ? parseFloat(r.turbidity) : null,
        isMissing
      );
    }
  });

  insertMany(records);

  batchService.updateBatchStats(batchId, {
    total_water_records: records.length,
    water_gap_count: missingCount,
  });

  return { count: records.length, missingCount, batchId };
};

const createBatchWithFiles = async (name, aisFile, waterFile, notes = '') => {
  const batch = batchService.createBatch(name, notes);
  const batchId = batch.id;

  let aisResult = { count: 0 };
  let waterResult = { count: 0, missingCount: 0 };

  if (aisFile) {
    aisResult = importAisCsv(batchId, aisFile);
  }
  if (waterFile) {
    waterResult = importWaterQualityCsv(batchId, waterFile);
  }

  return {
    batch: batchService.getBatchById(batchId),
    ais: aisResult,
    water: waterResult,
  };
};

module.exports = {
  importAisCsv,
  importWaterQualityCsv,
  createBatchWithFiles,
};
