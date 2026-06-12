const { pointInPolygon, interpolateTide, findNearestTideStation, findWaveForecast } = require('./geo-utils');

class ViolationAnalyzer {
  constructor(db) {
    this.db = db;
  }

  getNoGoZones() {
    const zones = this.db.prepare(`
      SELECT id, name, description, zone_type, tide_sensitive, tide_threshold, tide_rule
      FROM no_go_zones
    `).all();

    for (const zone of zones) {
      const coords = this.db.prepare(`
        SELECT lon, lat FROM no_go_zone_coords
        WHERE zone_id = ? ORDER BY "order"
      `).all(zone.id);
      zone.polygon = coords.map(c => [c.lon, c.lat]);
    }

    return zones;
  }

  getTideStations(version = 'v1') {
    return this.db.prepare(`
      SELECT ts.id, ts.name, ts.lon, ts.lat, ts.reference_level,
             tp.pred_time, tp.height, tp.calc_version
      FROM tide_stations ts
      JOIN tide_predictions tp ON tp.station_id = ts.id
      WHERE tp.calc_version = ?
      ORDER BY ts.id, tp.pred_time
    `).all(version);
  }

  groupTideByStation(tideRows) {
    const stations = {};
    for (const row of tideRows) {
      if (!stations[row.id]) {
        stations[row.id] = {
          id: row.id,
          name: row.name,
          lon: row.lon,
          lat: row.lat,
          reference_level: row.reference_level,
          predictions: []
        };
      }
      stations[row.id].predictions.push({
        pred_time: row.pred_time,
        height: row.height,
        calc_version: row.calc_version
      });
    }
    return Object.values(stations);
  }

  getWaveForecasts() {
    return this.db.prepare(`
      SELECT * FROM wave_forecasts ORDER BY valid_time
    `).all();
  }

  getAquacultureLogs(dateStr) {
    return this.db.prepare(`
      SELECT * FROM aquaculture_logs WHERE log_date = ?
    `).all(dateStr);
  }

  getVesselTracks(vesselId = null, startTime = null, endTime = null) {
    let sql = `SELECT vt.*, v.name as vessel_name, v.mmsi
               FROM vessel_tracks vt
               JOIN vessels v ON v.id = vt.vessel_id`;
    const params = [];
    const conditions = [];

    if (vesselId) {
      conditions.push('vt.vessel_id = ?');
      params.push(vesselId);
    }
    if (startTime) {
      conditions.push('vt.track_time >= ?');
      params.push(startTime);
    }
    if (endTime) {
      conditions.push('vt.track_time <= ?');
      params.push(endTime);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY vt.vessel_id, vt.track_time';

    return this.db.prepare(sql).all(...params);
  }

  runAnalysis(runName, options = {}) {
    const {
      tideVersion = 'v1',
      referenceTime = null,
      checkAquaculture = true
    } = options;

    const insertRun = this.db.prepare(`
      INSERT INTO analysis_runs (run_name, tide_version, status, notes)
      VALUES (?, ?, 'running', ?)
    `);
    const runResult = insertRun.run(runName, tideVersion, options.notes || '');
    const runId = runResult.lastInsertRowid;

    const insertResult = this.db.prepare(`
      INSERT INTO analysis_results
        (run_id, vessel_id, track_point_id, zone_id, is_violation,
         violation_type, depth_at_point, tide_correction,
         wave_forecast_available, aquaculture_available,
         evidence_sources, confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertGap = this.db.prepare(`
      INSERT INTO data_gaps (run_id, gap_type, description, related_date, related_entity, impact_level)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const zones = this.getNoGoZones();
    const tideRows = this.getTideStations(tideVersion);
    const tideStations = this.groupTideByStation(tideRows);

    const tracks = this.getVesselTracks();
    const tracksByVessel = {};
    for (const t of tracks) {
      if (!tracksByVessel[t.vessel_id]) {
        tracksByVessel[t.vessel_id] = [];
      }
      tracksByVessel[t.vessel_id].push(t);
    }

    let effectiveRefTime = referenceTime;
    if (!effectiveRefTime && tracks.length > 0) {
      const allTimes = tracks.map(t => new Date(t.track_time).getTime());
      effectiveRefTime = new Date(Math.max(...allTimes)).toISOString();
    }
    const waveForecasts = this.getWaveForecasts();

    const aquaCheckDates = new Set();
    const allAquaLogs = {};
    const waveDelayedTracks = new Set();

    const tx = this.db.transaction(() => {
      for (const [vesselId, vesselTracks] of Object.entries(tracksByVessel)) {
        for (const track of vesselTracks) {
          const dateStr = track.track_time.split('T')[0];
          aquaCheckDates.add(dateStr);

          const nearestStation = findNearestTideStation(
            track.lon, track.lat, tideStations
          );

          let tideCorrection = 0;
          if (nearestStation && nearestStation.predictions.length > 0) {
            tideCorrection = interpolateTide(nearestStation.predictions, track.track_time);
          }

          let isViolation = 0;
          let violationType = null;
          let violatingZoneId = null;
          let confidence = 0;
          const evidenceSources = [];

          for (const zone of zones) {
            if (pointInPolygon(track.lon, track.lat, zone.polygon)) {
              let zoneViolation = true;

              if (zone.tide_sensitive && nearestStation && nearestStation.predictions.length > 0) {
                if (zone.tide_rule === 'low_tide_forbidden' && tideCorrection >= zone.tide_threshold) {
                  zoneViolation = false;
                } else if (zone.tide_rule === 'high_tide_forbidden' && tideCorrection <= zone.tide_threshold) {
                  zoneViolation = false;
                }
              }

              if (zoneViolation) {
                isViolation = 1;
                violatingZoneId = zone.id;
                violationType = `entry_${zone.zone_type}`;
                confidence = 0.9;
                evidenceSources.push(`no_go_zone:${zone.id}`);
                evidenceSources.push(`track_file:${track.source_file}`);
                if (zone.tide_sensitive) {
                  evidenceSources.push(`tide_rule:${zone.tide_rule}`);
                }
                break;
              }
            }
          }

          if (nearestStation && nearestStation.predictions.length > 0) {
            evidenceSources.push(`tide_station:${nearestStation.id}`);
          }

          const waveFcst = findWaveForecast(
            track.lon, track.lat, track.track_time, waveForecasts
          );
          const waveAvailable = waveFcst ? 1 : 0;
          if (waveFcst) {
            evidenceSources.push(`wave_forecast:${waveFcst.id}`);
            if (waveFcst.is_delayed && isViolation) {
              confidence = Math.max(0.5, confidence - 0.2);
              waveDelayedTracks.add(track.id);
            }
          } else {
            if (isViolation) {
              confidence = Math.max(0.3, confidence - 0.4);
            }
          }

          let aquaAvailable = 1;
          if (checkAquaculture && isViolation) {
            if (!allAquaLogs[dateStr]) {
              allAquaLogs[dateStr] = this.getAquacultureLogs(dateStr);
            }
            const dateLogs = allAquaLogs[dateStr];
            if (dateLogs.length === 0 || dateLogs.some(l => l.is_missing)) {
              aquaAvailable = 0;
              confidence = Math.max(0.4, confidence - 0.15);
            }
          }

          insertResult.run(
            runId,
            track.vessel_id,
            track.id,
            violatingZoneId,
            isViolation,
            violationType,
            track.depth,
            tideCorrection,
            waveAvailable,
            aquaAvailable,
            JSON.stringify(evidenceSources),
            confidence
          );
        }
      }

      if (checkAquaculture) {
        for (const dateStr of aquaCheckDates) {
          const logs = allAquaLogs[dateStr] || this.getAquacultureLogs(dateStr);
          const missing = logs.filter(l => l.is_missing);

          for (const m of missing) {
            insertGap.run(
              runId,
              'aquaculture_log_missing',
              `养殖日志缺失：${m.farm_name} ${dateStr}，文件${m.source_file}未上传`,
              dateStr,
              m.farm_name,
              'medium'
            );
          }
        }
      }

      if (waveDelayedTracks.size > 0) {
        const delayedWaves = waveForecasts.filter(w => w.is_delayed);
        const delayedTimes = [...new Set(delayedWaves.map(w => w.valid_time))].sort();
        insertGap.run(
          runId,
          'wave_forecast_delayed',
          `风浪预报晚到：${delayedWaves.length}条预报延迟到达，影响${waveDelayedTracks.size}个越界轨迹点`,
          delayedTimes[0],
          'wave_forecast_system',
          'medium'
        );
      }

      const updateRun = this.db.prepare(`
        UPDATE analysis_runs SET status = 'completed' WHERE id = ?
      `);
      updateRun.run(runId);
    });

    tx();

    return { runId, runName, tideVersion };
  }

  getAnalysisResult(runId) {
    const run = this.db.prepare(`SELECT * FROM analysis_runs WHERE id = ?`).get(runId);
    if (!run) return null;

    const violations = this.db.prepare(`
      SELECT ar.*, v.name as vessel_name, v.mmsi,
             nz.name as zone_name, nz.zone_type,
             vt.track_time, vt.lon, vt.lat, vt.speed, vt.source_file
      FROM analysis_results ar
      JOIN vessels v ON v.id = ar.vessel_id
      JOIN vessel_tracks vt ON vt.id = ar.track_point_id
      LEFT JOIN no_go_zones nz ON nz.id = ar.zone_id
      WHERE ar.run_id = ? AND ar.is_violation = 1
      ORDER BY vt.track_time
    `).all(runId);

    const gaps = this.db.prepare(`
      SELECT * FROM data_gaps WHERE run_id = ? ORDER BY impact_level DESC, id
    `).all(runId);

    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as total_points,
        SUM(is_violation) as violation_count,
        SUM(CASE WHEN wave_forecast_available = 0 THEN 1 ELSE 0 END) as no_wave_count,
        SUM(CASE WHEN aquaculture_available = 0 THEN 1 ELSE 0 END) as no_aqua_count
      FROM analysis_results WHERE run_id = ?
    `).get(runId);

    return {
      run,
      violations,
      gaps,
      stats
    };
  }

  compareRuns(runId1, runId2) {
    const result1 = this.getAnalysisResult(runId1);
    const result2 = this.getAnalysisResult(runId2);

    if (!result1 || !result2) return null;

    const violations1 = new Set(result1.violations.map(v => v.track_point_id));
    const violations2 = new Set(result2.violations.map(v => v.track_point_id));

    const onlyIn1 = result1.violations.filter(v => !violations2.has(v.track_point_id));
    const onlyIn2 = result2.violations.filter(v => !violations1.has(v.track_point_id));
    const inBoth = result1.violations.filter(v => violations2.has(v.track_point_id));

    const changedConfidence = [];
    const v2Map = {};
    for (const v of result2.violations) {
      v2Map[v.track_point_id] = v;
    }
    for (const v of inBoth) {
      const v2 = v2Map[v.track_point_id];
      if (Math.abs(v.confidence - v2.confidence) > 0.01) {
        changedConfidence.push({
          track_point_id: v.track_point_id,
          vessel_name: v.vessel_name,
          track_time: v.track_time,
          confidence_run1: v.confidence,
          confidence_run2: v2.confidence,
          tide_run1: v.tide_correction,
          tide_run2: v2.tide_correction
        });
      }
    }

    return {
      run1: result1.run,
      run2: result2.run,
      stats_run1: result1.stats,
      stats_run2: result2.stats,
      only_in_run1: onlyIn1,
      only_in_run2: onlyIn2,
      in_both: inBoth.length,
      confidence_changed: changedConfidence
    };
  }

  generateReport(runId, reportType = 'maritime') {
    const result = this.getAnalysisResult(runId);
    if (!result) return null;

    const content = {
      summary: {
        run_name: result.run.run_name,
        run_time: result.run.run_time,
        tide_version: result.run.tide_version,
        total_points: result.stats.total_points,
        violation_count: result.stats.violation_count,
        data_gaps: result.gaps.length
      },
      violations: [],
      evidence_chain: [],
      gaps: result.gaps
    };

    for (const v of result.violations) {
      const evidence = JSON.parse(v.evidence_sources || '[]');
      content.violations.push({
        id: v.id,
        vessel_name: v.vessel_name,
        mmsi: v.mmsi,
        time: v.track_time,
        position: { lon: v.lon, lat: v.lat },
        zone: v.zone_name,
        zone_type: v.zone_type,
        speed: v.speed,
        depth: v.depth_at_point,
        tide_correction: v.tide_correction,
        confidence: v.confidence,
        source_file: v.source_file,
        evidence_sources: evidence
      });

      content.evidence_chain.push({
        violation_id: v.id,
        materials: evidence.map(e => {
          const [type, id] = e.split(':');
          let desc = '';
          switch (type) {
            case 'no_go_zone':
              desc = `禁航区划定文件（${v.zone_name}）`;
              break;
            case 'track_file':
              desc = `船舶轨迹文件（${v.source_file}）`;
              break;
            case 'tide_station':
              desc = `潮汐计算数据（版本${result.run.tide_version}）`;
              break;
            case 'wave_forecast':
              desc = '风浪预报数据';
              break;
            default:
              desc = e;
          }
          return { type, id: id, description: desc };
        })
      });
    }

    const insertReport = this.db.prepare(`
      INSERT INTO reports (run_id, report_type, content, evidence_summary)
      VALUES (?, ?, ?, ?)
    `);

    const evidenceSummary = content.evidence_chain.length > 0
      ? `共${content.summary.violation_count}处越界，涉及${content.violations.length}艘船舶，证据链包含${content.evidence_chain[0].materials.length}类材料`
      : '本次分析未发现越界行为';

    const reportId = insertReport.run(
      runId, reportType,
      JSON.stringify(content),
      evidenceSummary
    ).lastInsertRowid;

    return { reportId, content, evidenceSummary };
  }
}

module.exports = ViolationAnalyzer;
