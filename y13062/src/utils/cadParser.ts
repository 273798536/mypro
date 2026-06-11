export interface ParsedWell {
  id: string;
  name: string;
  x: number;
  y: number;
  depth?: number;
}

export interface ParsedObstacle {
  id: string;
  type: string;
  name?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  bufferZone?: number;
  depth?: { min: number; max: number };
  color?: string;
}

export interface ParsedLayer {
  name: string;
  wells: ParsedWell[];
  obstacles: ParsedObstacle[];
  source?: string;
  parsedAt: string;
  featureCount: { wells: number; obstacles: number };
}

export interface ParseResult {
  success: boolean;
  layer?: ParsedLayer;
  errors?: string[];
  warnings?: string[];
}

function normalizeId(name: string, prefix: string): string {
  return `${prefix}-${name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-').slice(0, 20)}`;
}

export function parseGeoJSON(content: string, layerName: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const data = JSON.parse(content);
    const wells: ParsedWell[] = [];
    const obstacles: ParsedObstacle[] = [];

    if (data.type !== 'FeatureCollection') {
      return {
        success: false,
        errors: ['文件格式错误：根节点必须是 FeatureCollection'],
      };
    }

    const features = data.features || [];

    features.forEach((feat: any, idx: number) => {
      const props = feat.properties || {};
      const geom = feat.geometry;

      if (!geom) {
        warnings.push(`第 ${idx + 1} 个要素缺少 geometry，已跳过`);
        return;
      }

      const featType = props.type || props['图层类型'] || props.featureType || '';

      if (featType.includes('监测井') || featType.includes('well') || props.wellId || props['井号']) {
        if (geom.type === 'Point' && geom.coordinates?.length >= 2) {
          const [x, y] = geom.coordinates;
          wells.push({
            id: props.wellId || props['井号'] || normalizeId(props.name || `well-${idx}`, 'W'),
            name: props.name || props['井名'] || `监测井-${idx + 1}`,
            x: typeof x === 'number' ? x : parseFloat(x),
            y: typeof y === 'number' ? y : parseFloat(y),
            depth: props.depth || props['埋深'] ? parseFloat(props.depth || props['埋深']) : undefined,
          });
        }
      } else if (
        featType.includes('障碍') ||
        featType.includes('管线') ||
        featType.includes('建筑') ||
        featType.includes('obstacle') ||
        props.obstacleType
      ) {
        let obstacle: ParsedObstacle | null = null;

        if (geom.type === 'Polygon' && geom.coordinates?.[0]?.length >= 4) {
          const coords = geom.coordinates[0];
          const xs = coords.map((c: number[]) => c[0]);
          const ys = coords.map((c: number[]) => c[1]);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);

          obstacle = {
            id: props.id || normalizeId(props.name || `obs-${idx}`, 'OBS'),
            type: props.obstacleType || props.type || props['障碍类型'] || '未知障碍',
            name: props.name || props['名称'],
            x: minX,
            y: minY,
            w: maxX - minX,
            h: maxY - minY,
            bufferZone: props.bufferZone || props['防护距离'] ? parseFloat(props.bufferZone || props['防护距离']) : undefined,
            color: props.color || '#FFB800',
          };
        } else if (geom.type === 'LineString' && geom.coordinates?.length >= 2) {
          const coords = geom.coordinates;
          const xs = coords.map((c: number[]) => c[0]);
          const ys = coords.map((c: number[]) => c[1]);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);

          obstacle = {
            id: props.id || normalizeId(props.name || `obs-${idx}`, 'OBS'),
            type: props.obstacleType || props.type || props['障碍类型'] || '管线',
            name: props.name || props['名称'],
            x: minX,
            y: minY,
            w: Math.max(maxX - minX, 2),
            h: Math.max(maxY - minY, 2),
            bufferZone: props.bufferZone || props['防护距离'] || 30,
            color: props.color || '#E94560',
          };
        } else if (geom.type === 'Point' && geom.coordinates?.length >= 2) {
          const [x, y] = geom.coordinates;
          obstacle = {
            id: props.id || normalizeId(props.name || `obs-${idx}`, 'OBS'),
            type: props.obstacleType || props.type || props['障碍类型'] || '点状障碍',
            name: props.name || props['名称'],
            x: x - 20,
            y: y - 20,
            w: 40,
            h: 40,
            bufferZone: props.bufferZone || props['防护距离'] || 50,
            color: props.color || '#FFB800',
          };
        }

        if (obstacle) {
          if (props['埋深范围'] || props.depthRange) {
            const dr = props['埋深范围'] || props.depthRange;
            if (typeof dr === 'string') {
              const match = dr.match(/([\d.]+)\s*[-~]\s*([\d.]+)/);
              if (match) {
                obstacle.depth = { min: parseFloat(match[1]), max: parseFloat(match[2]) };
              }
            } else if (dr && typeof dr.min === 'number') {
              obstacle.depth = dr;
            }
          }
          obstacles.push(obstacle);
        }
      }
    });

    if (wells.length === 0 && obstacles.length === 0) {
      warnings.push('未解析出任何监测井或障碍物，请检查文件格式或properties字段');
    }

    return {
      success: true,
      layer: {
        name: layerName,
        wells,
        obstacles,
        parsedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
        featureCount: { wells: wells.length, obstacles: obstacles.length },
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (e) {
    return {
      success: false,
      errors: [`JSON解析失败：${e instanceof Error ? e.message : String(e)}`],
    };
  }
}

export function parseSimpleJSON(content: string, layerName: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const data = JSON.parse(content);
    const wells: ParsedWell[] = [];
    const obstacles: ParsedObstacle[] = [];

    const wellSources = [data.wells, data.monitoringWells, data['监测井'], data.points];
    for (const source of wellSources) {
      if (Array.isArray(source)) {
        source.forEach((w: any, idx: number) => {
          const x = w.x ?? w.X ?? w.longitude ?? w.lng ?? w['x坐标'] ?? w['经度'];
          const y = w.y ?? w.Y ?? w.latitude ?? w.lat ?? w['y坐标'] ?? w['纬度'];
          if (x !== undefined && y !== undefined) {
            wells.push({
              id: w.id || w.wellId || w['井号'] || `W-SIM-${idx + 1}`,
              name: w.name || w['井名'] || w.wellName || `监测井-${idx + 1}`,
              x: parseFloat(x),
              y: parseFloat(y),
              depth: w.depth || w['埋深'] ? parseFloat(w.depth || w['埋深']) : undefined,
            });
          }
        });
      }
    }

    const obsSources = [data.obstacles, data['障碍物'], data.polygons, data.lines];
    for (const source of obsSources) {
      if (Array.isArray(source)) {
        source.forEach((o: any, idx: number) => {
          const hasRect = o.x !== undefined && o.y !== undefined && o.w !== undefined && o.h !== undefined;
          const hasCoords = o.coordinates || o.coords;

          let obstacle: ParsedObstacle | null = null;

          if (hasRect) {
            obstacle = {
              id: o.id || o.obsId || `OBS-${idx + 1}`,
              type: o.type || o['类型'] || o.obstacleType || '障碍',
              name: o.name || o['名称'],
              x: parseFloat(o.x),
              y: parseFloat(o.y),
              w: parseFloat(o.w),
              h: parseFloat(o.h),
              bufferZone: o.bufferZone || o['防护距离'] ? parseFloat(o.bufferZone || o['防护距离']) : undefined,
              color: o.color || '#FFB800',
            };
          } else if (hasCoords) {
            const coords = hasCoords;
            if (Array.isArray(coords) && coords.length >= 2) {
              const xs = coords.map((c: any) => parseFloat(c.x ?? c[0]));
              const ys = coords.map((c: any) => parseFloat(c.y ?? c[1]));
              if (xs.length >= 2) {
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);
                obstacle = {
                  id: o.id || `OBS-${idx + 1}`,
                  type: o.type || '障碍',
                  name: o.name,
                  x: minX,
                  y: minY,
                  w: Math.max(maxX - minX, 5),
                  h: Math.max(maxY - minY, 5),
                  bufferZone: o.bufferZone || 30,
                  color: o.color || '#FFB800',
                };
              }
            }
          }

          if (obstacle) {
            if (o.depthMin !== undefined || o['最小埋深'] !== undefined) {
              obstacle.depth = {
                min: parseFloat(o.depthMin ?? o['最小埋深'] ?? 0),
                max: parseFloat(o.depthMax ?? o['最大埋深'] ?? 10),
              };
            }
            obstacles.push(obstacle);
          }
        });
      }
    }

    if (wells.length === 0 && obstacles.length === 0) {
      warnings.push(
        '未解析出数据。请确保JSON包含 wells/obstacles 数组，或使用标准GeoJSON格式。',
      );
    }

    return {
      success: true,
      layer: {
        name: layerName,
        wells,
        obstacles,
        parsedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
        featureCount: { wells: wells.length, obstacles: obstacles.length },
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (e) {
    return {
      success: false,
      errors: [`解析失败：${e instanceof Error ? e.message : String(e)}`],
    };
  }
}

export function parseCadFile(content: string, filename: string): ParseResult {
  if (content.startsWith('data:')) {
    return {
      success: false,
      errors: [
        '文件内容格式错误：收到的是DataURL而非纯文本。请检查文件读取方式，JSON/GeoJSON文件应使用readAsText读取。',
      ],
    };
  }

  if (content && content.length > 0) {
    const firstChar = content.trim().charAt(0);
    if (firstChar !== '{' && firstChar !== '[' && firstChar !== '<' && !/^[a-zA-Z_]/.test(firstChar)) {
      return {
        success: false,
        errors: [
          `文件内容无效：首字符为"${firstChar}"，JSON/GeoJSON文件应以"{"或"["开头，CSV文件应包含标题行。`,
        ],
        warnings: [`文件前50字符：${content.slice(0, 50)}`],
      };
    }
  }

  const ext = filename.split('.').pop()?.toLowerCase();
  const layerName = filename.replace(/\.[^/.]+$/, '');

  if (ext === 'json' || ext === 'geojson') {
    try {
      const parsed = JSON.parse(content);
      if (parsed.type === 'FeatureCollection') {
        return parseGeoJSON(content, layerName);
      }
      return parseSimpleJSON(content, layerName);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      let position = '';
      const posMatch = msg.match(/position\s+(\d+)/i) || msg.match(/at\s+position\s+(\d+)/i);
      if (posMatch) {
        const pos = parseInt(posMatch[1]);
        const start = Math.max(0, pos - 20);
        const end = Math.min(content.length, pos + 20);
        position = `（附近内容：...${content.slice(start, end)}...）`;
      }
      return {
        success: false,
        errors: [`JSON解析失败：${msg}${position}`],
        warnings: ['请确认文件是有效的JSON格式，可使用https://jsonlint.com/校验'],
      };
    }
  }

  if (ext === 'csv' || content.startsWith('wellId,')) {
    return parseCSV(content, layerName);
  }

  return {
    success: false,
    errors: [
      `不支持的文件格式：.${ext}。请使用 .json / .geojson / .csv 格式的CAD图层数据。`,
    ],
    warnings: [
      'DWG/DXF等二进制CAD格式需先转换为GeoJSON或CSV后再上传。',
      '推荐格式说明：GeoJSON（最通用，支持点/线/面）、CSV（简单表格）',
    ],
  };
}

function parseCSV(content: string, layerName: string): ParseResult {
  try {
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
      return { success: false, errors: ['CSV文件至少需要标题行和一行数据'] };
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const wells: ParsedWell[] = [];
    const obstacles: ParsedObstacle[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => (row[h] = values[idx] || ''));

      if (row.wellId || row['井号'] || (row.x && row.y && row.name?.includes('井'))) {
        wells.push({
          id: row.wellId || row['井号'] || `W-CSV-${i}`,
          name: row.name || row['井名'] || `监测井-${i}`,
          x: parseFloat(row.x || row['x坐标'] || row.longitude || '0'),
          y: parseFloat(row.y || row['y坐标'] || row.latitude || '0'),
          depth: row.depth || row['埋深'] ? parseFloat(row.depth || row['埋深']) : undefined,
        });
      } else if (row.type || row['障碍类型'] || (row.x && row.w)) {
        obstacles.push({
          id: row.id || `OBS-CSV-${i}`,
          type: row.type || row['障碍类型'] || '障碍',
          name: row.name || row['名称'],
          x: parseFloat(row.x || '0'),
          y: parseFloat(row.y || '0'),
          w: parseFloat(row.w || row.width || '10'),
          h: parseFloat(row.h || row.height || '10'),
          bufferZone: row.bufferZone || row['防护距离'] ? parseFloat(row.bufferZone || row['防护距离']) : undefined,
          color: row.color || '#FFB800',
        });
      }
    }

    return {
      success: true,
      layer: {
        name: layerName,
        wells,
        obstacles,
        parsedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
        featureCount: { wells: wells.length, obstacles: obstacles.length },
      },
    };
  } catch (e) {
    return {
      success: false,
      errors: [`CSV解析失败：${e instanceof Error ? e.message : String(e)}`],
    };
  }
}

export function generateSampleLayerJSON(): string {
  const sample = {
    type: 'FeatureCollection',
    name: '示例图层 - 东坝南区补充数据',
    features: [
      {
        type: 'Feature',
        properties: {
          type: '监测井',
          wellId: 'W-DB-120',
          name: '东坝南井-120',
          depth: 15,
        },
        geometry: { type: 'Point', coordinates: [250, 450] },
      },
      {
        type: 'Feature',
        properties: {
          type: '障碍',
          obstacleType: '变电站',
          name: '东坝110kV变电站',
          bufferZone: 50,
          color: '#E94560',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[[350, 200], [430, 200], [430, 280], [350, 280], [350, 200]]],
        },
      },
    ],
  };
  return JSON.stringify(sample, null, 2);
}
