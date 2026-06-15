const express = require('express');
const db = require('../db');

const router = express.Router();

function normalizeLocation(originalText) {
  const alias = db.prepare(`
    SELECT la.*, l.standard_name, l.latitude, l.longitude, l.district, l.school_name
    FROM location_aliases la
    LEFT JOIN locations l ON la.location_id = l.id
    WHERE la.alias_name = ?
  `).get(originalText);

  if (alias) {
    return {
      matched: true,
      location_id: alias.location_id,
      standard_name: alias.standard_name,
      latitude: alias.latitude,
      longitude: alias.longitude,
      district: alias.district,
      school_name: alias.school_name,
      matched_alias: alias.alias_name,
      alias_source: alias.source
    };
  }

  const exactMatch = db.prepare(`
    SELECT * FROM locations WHERE standard_name = ?
  `).get(originalText);

  if (exactMatch) {
    return {
      matched: true,
      location_id: exactMatch.id,
      standard_name: exactMatch.standard_name,
      latitude: exactMatch.latitude,
      longitude: exactMatch.longitude,
      district: exactMatch.district,
      school_name: exactMatch.school_name,
      matched_alias: exactMatch.standard_name,
      alias_source: '标准名称'
    };
  }

  const likeMatch = db.prepare(`
    SELECT l.*, la.alias_name, la.source
    FROM locations l
    LEFT JOIN location_aliases la ON l.id = la.location_id
    WHERE l.standard_name LIKE ? OR la.alias_name LIKE ?
    LIMIT 5
  `).all(`%${originalText}%`, `%${originalText}%`);

  if (likeMatch.length > 0) {
    return {
      matched: false,
      suggestions: likeMatch.map(m => ({
        location_id: m.location_id || m.id,
        standard_name: m.standard_name,
        latitude: m.latitude,
        longitude: m.longitude,
        district: m.district,
        school_name: m.school_name,
        matched_alias: m.alias_name,
        alias_source: m.source
      }))
    };
  }

  return { matched: false, suggestions: [] };
}

router.get('/normalize', (req, res) => {
  const { text } = req.query;
  if (!text) {
    return res.status(400).json({ error: '缺少地点文本参数' });
  }

  const result = normalizeLocation(text);
  res.json(result);
});

router.get('/', (req, res) => {
  const { district, school_name } = req.query;
  
  let sql = `
    SELECT l.*, 
           GROUP_CONCAT(la.alias_name) as aliases,
           COUNT(DISTINCT c.id) as complaint_count
    FROM locations l
    LEFT JOIN location_aliases la ON l.id = la.location_id
    LEFT JOIN complaints c ON l.id = c.location_id
  `;
  
  const params = [];
  const where = [];
  
  if (district) {
    where.push('l.district = ?');
    params.push(district);
  }
  if (school_name) {
    where.push('l.school_name LIKE ?');
    params.push(`%${school_name}%`);
  }
  
  if (where.length > 0) {
    sql += ' WHERE ' + where.join(' AND ');
  }
  
  sql += ' GROUP BY l.id';
  
  const locations = db.prepare(sql).all(...params);
  
  locations.forEach(loc => {
    loc.aliases = loc.aliases ? loc.aliases.split(',') : [];
  });
  
  res.json(locations);
});

router.get('/:id', (req, res) => {
  const location = db.prepare(`
    SELECT l.*,
           GROUP_CONCAT(la.alias_name || '|' || COALESCE(la.source, '')) as aliases
    FROM locations l
    LEFT JOIN location_aliases la ON l.id = la.location_id
    WHERE l.id = ?
    GROUP BY l.id
  `).get(req.params.id);

  if (!location) {
    return res.status(404).json({ error: '地点不存在' });
  }

  location.aliases = location.aliases ? location.aliases.split(',').map(a => {
    const [name, source] = a.split('|');
    return { name, source };
  }) : [];

  const complaints = db.prepare(`
    SELECT c.*, 
           (SELECT COUNT(*) FROM complaints WHERE location_id = l.id AND is_duplicate = 1) as duplicate_count
    FROM complaints c
    LEFT JOIN locations l ON c.location_id = l.id
    WHERE c.location_id = ?
    ORDER BY c.created_at DESC
  `).all(req.params.id);

  res.json({ ...location, complaints });
});

router.post('/', (req, res) => {
  const { standard_name, latitude, longitude, district, school_name, aliases } = req.body;
  
  const result = db.prepare(`
    INSERT INTO locations (standard_name, latitude, longitude, district, school_name)
    VALUES (?, ?, ?, ?, ?)
  `).run(standard_name, latitude, longitude, district, school_name);

  const locationId = result.lastInsertRowid;

  if (aliases && aliases.length > 0) {
    const insertAlias = db.prepare(`
      INSERT INTO location_aliases (location_id, alias_name, source)
      VALUES (?, ?, ?)
    `);
    aliases.forEach(alias => {
      insertAlias.run(locationId, alias.name, alias.source || '手动添加');
    });
  }

  res.status(201).json({ id: locationId, standard_name });
});

router.post('/:id/aliases', (req, res) => {
  const { alias_name, source } = req.body;
  const locationId = req.params.id;

  const existing = db.prepare(`
    SELECT * FROM location_aliases WHERE location_id = ? AND alias_name = ?
  `).get(locationId, alias_name);

  if (existing) {
    return res.status(400).json({ error: '该别名已存在' });
  }

  db.prepare(`
    INSERT INTO location_aliases (location_id, alias_name, source)
    VALUES (?, ?, ?)
  `).run(locationId, alias_name, source || '手动添加');

  res.json({ success: true });
});

module.exports = { router, normalizeLocation };
