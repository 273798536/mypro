const Database = require('../lib/db');
const path = require('path');

async function check() {
  const db = new Database(path.join(__dirname, '..', 'data', 'classroom.db'));
  await db.init();
  
  console.log('=== 船舶轨迹时间范围 ===');
  for (const vid of [1,2,3]) {
    const v = db.prepare('SELECT name FROM vessels WHERE id = ?').get(vid);
    const t = db.prepare('SELECT MIN(track_time) as min, MAX(track_time) as max, COUNT(*) as cnt FROM vessel_tracks WHERE vessel_id = ?').get(vid);
    console.log('  ' + v.name + ': ' + t.min.slice(0,19) + ' 到 ' + t.max.slice(0,19) + ', 共' + t.cnt + '个点');
  }
  
  console.log('');
  console.log('=== 风浪预报 ===');
  const w = db.prepare('SELECT MIN(valid_time) as min, MAX(valid_time) as max, COUNT(*) as cnt FROM wave_forecasts').get();
  console.log('  有效时间: ' + w.min.slice(0,19) + ' 到 ' + w.max.slice(0,19) + ', 共' + w.cnt + '条');
  const d = db.prepare('SELECT COUNT(*) as cnt FROM wave_forecasts WHERE is_delayed = 1').get();
  console.log('  晚到预报: ' + d.cnt + '条');
  const dm = db.prepare('SELECT MIN(valid_time) as min FROM wave_forecasts WHERE is_delayed = 1').get();
  console.log('  晚到开始时间: ' + dm.min.slice(0,19));
  
  console.log('');
  console.log('=== 养殖日志缺失日期 ===');
  const gaps = db.prepare('SELECT log_date, farm_name FROM aquaculture_logs WHERE is_missing = 1').all();
  gaps.forEach(g => console.log('  ' + g.log_date + ' ' + g.farm_name));
  
  console.log('');
  console.log('=== 远顺号越界点时间 ===');
  const vios = db.prepare(`
    SELECT vt.track_time, ar.confidence, ar.wave_forecast_available, ar.aquaculture_available
    FROM analysis_results ar
    JOIN vessel_tracks vt ON vt.id = ar.track_point_id
    JOIN vessels v ON v.id = vt.vessel_id
    WHERE ar.run_id = 2 AND ar.is_violation = 1 AND v.name = '远顺号'
    ORDER BY vt.track_time
  `).all();
  vios.forEach(v => {
    console.log('  ' + v.track_time.slice(11,16) + ' 置信度=' + v.confidence.toFixed(2) + ' 风浪=' + v.wave_forecast_available + ' 养殖=' + v.aquaculture_available);
  });
  
  db.close();
}

check().catch(console.error);
