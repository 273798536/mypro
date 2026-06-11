import json
import math
import os
from datetime import datetime, timedelta
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from database import get_conn, init_db

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)


def haversine(lat1, lng1, lat2, lng2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlmb / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def point_in_polygon(lat, lng, polygon):
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        yi, xi = polygon[i]
        yj, xj = polygon[j]
        if ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def parse_date(s):
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d'):
        try:
            return datetime.strptime(s, fmt)
        except (ValueError, TypeError):
            continue
    return None


@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'db': os.path.exists(os.path.join(os.path.dirname(__file__), 'dive_visibility.db'))})


@app.route('/api/dive_sites', methods=['GET', 'POST'])
def dive_sites():
    conn = get_conn()
    if request.method == 'POST':
        data = request.json
        cur = conn.execute(
            'INSERT INTO dive_sites (name, lat, lng, radius_m) VALUES (?, ?, ?, ?)',
            (data['name'], data['lat'], data['lng'], data.get('radius_m', 100))
        )
        conn.commit()
        return jsonify({'id': cur.lastrowid})
    rows = conn.execute('SELECT * FROM dive_sites ORDER BY id').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/no_go_zones', methods=['GET', 'POST'])
def no_go_zones():
    conn = get_conn()
    if request.method == 'POST':
        data = request.json
        cur = conn.execute(
            'INSERT INTO no_go_zones (name, polygon, description) VALUES (?, ?, ?)',
            (data['name'], json.dumps(data['polygon']), data.get('description', ''))
        )
        conn.commit()
        return jsonify({'id': cur.lastrowid})
    rows = conn.execute('SELECT * FROM no_go_zones ORDER BY id').fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d['polygon'] = json.loads(d['polygon'])
        result.append(d)
    conn.close()
    return jsonify(result)


@app.route('/api/ships', methods=['GET', 'POST'])
def ships():
    conn = get_conn()
    if request.method == 'POST':
        data = request.json
        cur = conn.execute(
            'INSERT OR IGNORE INTO ships (name, mmsi) VALUES (?, ?)',
            (data['name'], data.get('mmsi'))
        )
        row = conn.execute('SELECT id FROM ships WHERE name = ?', (data['name'],)).fetchone()
        conn.commit()
        return jsonify({'id': row['id']})
    rows = conn.execute('SELECT * FROM ships ORDER BY id').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/ship_tracks', methods=['GET', 'POST'])
def ship_tracks():
    conn = get_conn()
    if request.method == 'POST':
        data_list = request.json if isinstance(request.json, list) else [request.json]
        ids = []
        for data in data_list:
            cur = conn.execute(
                '''INSERT INTO ship_tracks (ship_id, recorded_at, lat, lng, speed, heading, source, raw_data)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                (data['ship_id'], data['recorded_at'], data.get('lat'), data.get('lng'),
                 data.get('speed'), data.get('heading'), data.get('source', 'import'),
                 json.dumps(data) if data.get('_raw') else None)
            )
            ids.append(cur.lastrowid)
        conn.commit()
        return jsonify({'ids': ids, 'count': len(ids)})
    ship_id = request.args.get('ship_id')
    date = request.args.get('date')
    sql = 'SELECT * FROM ship_tracks WHERE 1=1'
    params = []
    if ship_id:
        sql += ' AND ship_id = ?'
        params.append(int(ship_id))
    if date:
        sql += ' AND date(recorded_at) = ?'
        params.append(date)
    sql += ' ORDER BY recorded_at'
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/ship_tracks/clean', methods=['POST'])
def clean_tracks():
    conn = get_conn()
    data = request.json or {}
    ship_id = data.get('ship_id')
    date = data.get('date')

    sql = 'SELECT * FROM ship_tracks WHERE is_clean = 0'
    params = []
    if ship_id:
        sql += ' AND ship_id = ?'
        params.append(int(ship_id))
    if date:
        sql += ' AND date(recorded_at) = ?'
        params.append(date)
    sql += ' ORDER BY ship_id, recorded_at'
    raw_rows = conn.execute(sql, params).fetchall()

    conn.execute('DELETE FROM ship_tracks_clean WHERE original_id IN (SELECT id FROM ship_tracks WHERE is_clean = 0)')

    cleaned = []
    bad = []
    by_ship = {}
    for r in raw_rows:
        by_ship.setdefault(r['ship_id'], []).append(r)

    for sid, tracks in by_ship.items():
        prev = None
        for r in tracks:
            reasons = []
            cur_lat, cur_lng = r['lat'], r['lng']
            cur_time = parse_date(r['recorded_at'])

            if cur_lat is None or cur_lng is None:
                reasons.append('坐标缺失')
            elif not (-90 <= cur_lat <= 90) or not (-180 <= cur_lng <= 180):
                reasons.append(f'坐标越界: ({cur_lat}, {cur_lng})')

            if cur_time is None:
                reasons.append('时间格式错误')

            prev_valid = (prev is not None and prev['lat'] is not None and prev['lng'] is not None
                          and -90 <= prev['lat'] <= 90 and -180 <= prev['lng'] <= 180
                          and parse_date(prev['recorded_at']) is not None)
            if prev_valid and cur_lat is not None and cur_lng is not None and cur_time is not None:
                prev_time = parse_date(prev['recorded_at'])
                if prev_time:
                    dist = haversine(prev['lat'], prev['lng'], cur_lat, cur_lng)
                    dt = (cur_time - prev_time).total_seconds()
                    if dt > 0:
                        speed_actual = dist / dt
                        if speed_actual > 30:
                            reasons.append(f'速度异常: {speed_actual:.1f} m/s (>{30*1.852:.1f}节)')

            if reasons:
                bad.append({'original_id': r['id'], 'reasons': reasons, 'raw': dict(r)})
            else:
                conn.execute(
                    '''INSERT INTO ship_tracks_clean (original_id, ship_id, recorded_at, lat, lng, speed, heading, clean_reason)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                    (r['id'], r['ship_id'], r['recorded_at'], r['lat'], r['lng'], r['speed'], r['heading'],
                     '正常通过' if not reasons else '; '.join(reasons))
                )
                conn.execute('UPDATE ship_tracks SET is_clean = 1 WHERE id = ?', (r['id'],))
                cleaned.append({'original_id': r['id'], 'raw': dict(r)})
                prev = r

    conn.commit()
    conn.close()
    return jsonify({
        'cleaned_count': len(cleaned),
        'bad_count': len(bad),
        'bad_records': bad,
        'cleaned_records_sample': cleaned[:5]
    })


@app.route('/api/ship_tracks_clean')
def get_clean_tracks():
    conn = get_conn()
    ship_id = request.args.get('ship_id')
    date = request.args.get('date')
    sql = 'SELECT * FROM ship_tracks_clean WHERE 1=1'
    params = []
    if ship_id:
        sql += ' AND ship_id = ?'
        params.append(int(ship_id))
    if date:
        sql += ' AND date(recorded_at) = ?'
        params.append(date)
    sql += ' ORDER BY recorded_at'
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/ship_tracks/compare/<int:track_id>')
def compare_track(track_id):
    conn = get_conn()
    raw = conn.execute('SELECT * FROM ship_tracks WHERE id = ?', (track_id,)).fetchone()
    clean = conn.execute('SELECT * FROM ship_tracks_clean WHERE original_id = ?', (track_id,)).fetchone()
    conn.close()
    return jsonify({
        'raw': dict(raw) if raw else None,
        'clean': dict(clean) if clean else None
    })


@app.route('/api/wind_wave_forecasts', methods=['GET', 'POST'])
def forecasts():
    conn = get_conn()
    if request.method == 'POST':
        data = request.json
        cur = conn.execute(
            '''INSERT INTO wind_wave_forecasts
               (site_id, forecast_for, issued_at, wind_speed, wind_direction, wave_height, wave_period, is_delayed, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (data.get('site_id'), data['forecast_for'], data['issued_at'],
             data.get('wind_speed'), data.get('wind_direction'),
             data.get('wave_height'), data.get('wave_period'),
             data.get('is_delayed', 0), data.get('status', 'pending'))
        )
        conn.commit()
        return jsonify({'id': cur.lastrowid})
    site_id = request.args.get('site_id')
    status = request.args.get('status')
    sql = 'SELECT * FROM wind_wave_forecasts WHERE 1=1'
    params = []
    if site_id:
        sql += ' AND site_id = ?'
        params.append(int(site_id))
    if status:
        sql += ' AND status = ?'
        params.append(status)
    sql += ' ORDER BY forecast_for DESC'
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/wind_wave_forecasts/<int:fid>/confirm', methods=['POST'])
def confirm_forecast(fid):
    conn = get_conn()
    data = request.json or {}
    conn.execute(
        '''UPDATE wind_wave_forecasts SET status = 'confirmed', confirmed_by = ?, confirmed_at = ? WHERE id = ?''',
        (data.get('confirmed_by', 'manual'), datetime.now().isoformat(), fid)
    )
    if data.get('update_data'):
        ud = data['update_data']
        if 'wave_height' in ud:
            conn.execute('UPDATE wind_wave_forecasts SET wave_height = ? WHERE id = ?', (ud['wave_height'], fid))
        if 'wind_speed' in ud:
            conn.execute('UPDATE wind_wave_forecasts SET wind_speed = ? WHERE id = ?', (ud['wind_speed'], fid))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})


@app.route('/api/inspection_photos', methods=['GET', 'POST'])
def photos():
    conn = get_conn()
    if request.method == 'POST':
        data = request.json
        cur = conn.execute(
            '''INSERT INTO inspection_photos (site_id, taken_at, photo_path, visibility_estimate, notes, uploaded_by)
               VALUES (?, ?, ?, ?, ?, ?)''',
            (data['site_id'], data['taken_at'], data.get('photo_path'),
             data.get('visibility_estimate'), data.get('notes'), data.get('uploaded_by'))
        )
        conn.commit()
        return jsonify({'id': cur.lastrowid})
    rows = conn.execute('SELECT * FROM inspection_photos ORDER BY taken_at DESC').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/aquaculture_logs', methods=['GET', 'POST'])
def aqua_logs():
    conn = get_conn()
    if request.method == 'POST':
        data = request.json
        cur = conn.execute(
            'INSERT INTO aquaculture_logs (site_id, log_date, water_temp, turbidity, notes) VALUES (?, ?, ?, ?, ?)',
            (data['site_id'], data['log_date'], data.get('water_temp'), data.get('turbidity'), data.get('notes'))
        )
        conn.commit()
        return jsonify({'id': cur.lastrowid})
    rows = conn.execute('SELECT * FROM aquaculture_logs ORDER BY log_date DESC').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/check_no_go_violations', methods=['POST'])
def check_no_go():
    conn = get_conn()
    data = request.json or {}
    ship_id = data.get('ship_id')
    date = data.get('date')

    zones = conn.execute('SELECT * FROM no_go_zones').fetchall()
    zones_list = []
    for z in zones:
        zd = dict(z)
        zd['polygon'] = json.loads(zd['polygon'])
        zones_list.append(zd)

    sql = 'SELECT * FROM ship_tracks_clean WHERE 1=1'
    params = []
    if ship_id:
        sql += ' AND ship_id = ?'
        params.append(int(ship_id))
    if date:
        sql += ' AND date(recorded_at) = ?'
        params.append(date)
    tracks = conn.execute(sql, params).fetchall()

    violations = []
    for t in tracks:
        for z in zones_list:
            if point_in_polygon(t['lat'], t['lng'], z['polygon']):
                violations.append({
                    'track_id': t['id'],
                    'ship_id': t['ship_id'],
                    'recorded_at': t['recorded_at'],
                    'lat': t['lat'],
                    'lng': t['lng'],
                    'zone_id': z['id'],
                    'zone_name': z['name']
                })

    conn.close()
    return jsonify({'violations': violations, 'count': len(violations)})


@app.route('/api/visibility/calculate', methods=['POST'])
def calc_visibility():
    conn = get_conn()
    data = request.json or {}
    site_id = data.get('site_id')
    record_date = data.get('record_date') or datetime.now().strftime('%Y-%m-%d')
    rerun = data.get('rerun', False)

    run = conn.execute(
        "INSERT INTO process_runs (run_type, status) VALUES (?, 'running')",
        ('visibility_calc',)
    )
    run_id = run.lastrowid

    if site_id:
        sites = conn.execute('SELECT * FROM dive_sites WHERE id = ?', (int(site_id),)).fetchall()
    else:
        sites = conn.execute('SELECT * FROM dive_sites').fetchall()

    zones = conn.execute('SELECT * FROM no_go_zones').fetchall()
    zones_list = []
    for z in zones:
        zd = dict(z)
        zd['polygon'] = json.loads(zd['polygon'])
        zones_list.append(zd)

    results = []
    missing_tracks_report = []
    processed = 0
    failed = 0

    for site in sites:
        sid = site['id']
        date_for = record_date
        sources = []
        visibility_components = []

        photos = conn.execute(
            'SELECT * FROM inspection_photos WHERE site_id = ? AND date(taken_at) = ?',
            (sid, date_for)
        ).fetchall()
        for p in photos:
            if p['visibility_estimate']:
                visibility_components.append(('photo', p['visibility_estimate'], 0.4))
                sources.append(f'photo:{p["id"]}')

        logs = conn.execute(
            'SELECT * FROM aquaculture_logs WHERE site_id = ? AND log_date = ?',
            (sid, date_for)
        ).fetchall()
        for lg in logs:
            if lg['turbidity'] is not None:
                est_vis = max(1.0, 20.0 - lg['turbidity'] * 2.0)
                visibility_components.append(('aqua', est_vis, 0.3))
                sources.append(f'aqua_log:{lg["id"]}')

        forecasts = conn.execute(
            '''SELECT * FROM wind_wave_forecasts
               WHERE (site_id = ? OR site_id IS NULL) AND date(forecast_for) = ? AND status = 'confirmed' ''',
            (sid, date_for)
        ).fetchall()
        unconfirmed_forecasts = conn.execute(
            '''SELECT * FROM wind_wave_forecasts
               WHERE (site_id = ? OR site_id IS NULL) AND date(forecast_for) = ? AND status != 'confirmed' ''',
            (sid, date_for)
        ).fetchall()

        for fc in forecasts:
            if fc['wave_height'] is not None:
                est_vis = max(1.0, 15.0 - fc['wave_height'] * 3.0)
                visibility_components.append(('forecast', est_vis, 0.3))
                sources.append(f'forecast:{fc["id"]}')

        ships = conn.execute('SELECT * FROM ships').fetchall()
        track_coverage = {}
        track_violations = []
        for ship in ships:
            tracks_clean = conn.execute(
                'SELECT * FROM ship_tracks_clean WHERE ship_id = ? AND date(recorded_at) = ?',
                (ship['id'], date_for)
            ).fetchall()
            tracks_raw = conn.execute(
                'SELECT * FROM ship_tracks WHERE ship_id = ? AND date(recorded_at) = ?',
                (ship['id'], date_for)
            ).fetchall()

            if len(tracks_raw) > 0 and len(tracks_clean) == 0:
                missing_tracks_report.append({
                    'ship_id': ship['id'],
                    'ship_name': ship['name'],
                    'date': date_for,
                    'raw_count': len(tracks_raw),
                    'clean_count': len(tracks_clean)
                })

            nearby = []
            for t in tracks_clean:
                dist = haversine(site['lat'], site['lng'], t['lat'], t['lng'])
                if dist <= site['radius_m'] * 3:
                    nearby.append((t, dist))
                for z in zones_list:
                    if point_in_polygon(t['lat'], t['lng'], z['polygon']):
                        track_violations.append({
                            'ship': ship['name'],
                            'zone': z['name'],
                            'time': t['recorded_at'],
                            'lat': t['lat'],
                            'lng': t['lng']
                        })

            track_coverage[ship['name']] = {'nearby_count': len(nearby), 'total_clean': len(tracks_clean)}

        if visibility_components:
            total_w = sum(w for _, _, w in visibility_components)
            vis = sum(v * w for _, v, w in visibility_components) / total_w

            confidence = min(1.0, len(visibility_components) * 0.35)

            needs_review = len(unconfirmed_forecasts) > 0 or len(track_violations) > 0
            review_parts = []
            if unconfirmed_forecasts:
                review_parts.append(f'{len(unconfirmed_forecasts)}条预报待确认')
            if track_violations:
                review_parts.append(f'{len(track_violations)}次禁航区越界')

            if rerun:
                conn.execute(
                    'DELETE FROM visibility_records WHERE site_id = ? AND record_date = ?',
                    (sid, date_for)
                )

            cur = conn.execute(
                '''INSERT INTO visibility_records
                   (site_id, record_date, visibility_m, confidence, sources, has_no_go_violation, no_go_details,
                    track_missing, track_missing_details, forecast_delayed, needs_review, review_notes, status, raw_calculation)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (sid, date_for, round(vis, 2), round(confidence, 2), json.dumps(sources),
                 1 if track_violations else 0, json.dumps(track_violations) if track_violations else None,
                 1 if missing_tracks_report else 0, json.dumps(missing_tracks_report) if missing_tracks_report else None,
                 1 if len(unconfirmed_forecasts) > 0 else 0,
                 1 if needs_review else 0,
                 '; '.join(review_parts) if review_parts else None,
                 'review' if needs_review else 'ok',
                 json.dumps({
                     'components': visibility_components,
                     'track_coverage': track_coverage
                 }))
            )
            results.append({
                'record_id': cur.lastrowid,
                'site_id': sid,
                'site_name': site['name'],
                'visibility_m': round(vis, 2),
                'confidence': round(confidence, 2),
                'status': 'review' if needs_review else 'ok',
                'no_go_violations': track_violations,
                'forecast_pending': len(unconfirmed_forecasts)
            })
            processed += 1
        else:
            if rerun:
                conn.execute(
                    'DELETE FROM visibility_records WHERE site_id = ? AND record_date = ?',
                    (sid, date_for)
                )
            cur = conn.execute(
                '''INSERT INTO visibility_records
                   (site_id, record_date, visibility_m, confidence, sources, needs_review, review_notes, status, track_missing, track_missing_details, forecast_delayed)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (sid, date_for, None, 0, json.dumps(sources),
                 1, '缺少数据（照片/养殖日志/预报均无）', 'data_missing',
                 1 if missing_tracks_report else 0,
                 json.dumps(missing_tracks_report) if missing_tracks_report else None,
                 1 if len(unconfirmed_forecasts) > 0 else 0)
            )
            results.append({
                'record_id': cur.lastrowid,
                'site_id': sid,
                'site_name': site['name'],
                'error': '缺少数据',
                'status': 'data_missing',
                'missing_tracks': missing_tracks_report,
                'forecast_pending': len(unconfirmed_forecasts)
            })
            failed += 1

    conn.execute(
        '''UPDATE process_runs SET finished_at = ?, status = ?, records_processed = ?, records_failed = ?, missing_tracks = ?
           WHERE id = ?''',
        (datetime.now().isoformat(), 'completed', processed, failed,
         json.dumps(missing_tracks_report) if missing_tracks_report else None, run_id)
    )
    conn.commit()
    conn.close()

    return jsonify({
        'run_id': run_id,
        'processed': processed,
        'failed': failed,
        'results': results,
        'missing_tracks': missing_tracks_report
    })


@app.route('/api/visibility_records')
def get_vis_records():
    conn = get_conn()
    site_id = request.args.get('site_id')
    status = request.args.get('status')
    sql = 'SELECT * FROM visibility_records WHERE 1=1'
    params = []
    if site_id:
        sql += ' AND site_id = ?'
        params.append(int(site_id))
    if status:
        sql += ' AND status = ?'
        params.append(status)
    sql += ' ORDER BY record_date DESC'
    rows = conn.execute(sql, params).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        for k in ('sources', 'no_go_details', 'track_missing_details', 'raw_calculation'):
            if d.get(k):
                try:
                    d[k] = json.loads(d[k])
                except (json.JSONDecodeError, TypeError):
                    pass
        result.append(d)
    conn.close()
    return jsonify(result)


@app.route('/api/visibility_records/<int:rid>/review', methods=['POST'])
def review_record(rid):
    conn = get_conn()
    data = request.json or {}
    conn.execute(
        '''UPDATE visibility_records SET status = ?, review_notes = ?, reviewed_by = ?, reviewed_at = ?, needs_review = 0
           WHERE id = ?''',
        (data.get('status', 'confirmed'), data.get('notes'), data.get('reviewer', 'teacher'),
         datetime.now().isoformat(), rid)
    )
    if data.get('visibility_override') is not None:
        conn.execute(
            'UPDATE visibility_records SET visibility_m = ? WHERE id = ?',
            (data['visibility_override'], rid)
        )
    conn.commit()
    conn.close()
    return jsonify({'ok': True})


@app.route('/api/process_runs')
def get_runs():
    conn = get_conn()
    rows = conn.execute('SELECT * FROM process_runs ORDER BY started_at DESC LIMIT 50').fetchall()
    result = []
    for r in rows:
        d = dict(r)
        if d.get('missing_tracks'):
            try:
                d['missing_tracks'] = json.loads(d['missing_tracks'])
            except (json.JSONDecodeError, TypeError):
                pass
        result.append(d)
    conn.close()
    return jsonify(result)


if __name__ == '__main__':
    if not os.path.exists(os.path.join(os.path.dirname(__file__), 'dive_visibility.db')):
        init_db()
    app.run(host='0.0.0.0', port=5001, debug=True)
