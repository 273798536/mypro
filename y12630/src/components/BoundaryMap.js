import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { Eye, ChevronDown } from 'lucide-react';

const getCenter = (coords) => {
  if (!coords || !coords.bottomLeft || !coords.topRight) return [32.3, 118.6];
  const { bottomLeft, topRight } = coords;
  return [(bottomLeft[1] + topRight[1]) / 2, (bottomLeft[0] + topRight[0]) / 2];
};

const getPolygonCoords = (coords) => {
  if (!coords) return [];
  const valid = (c) => c && Array.isArray(c) && c.length === 2;
  const pts = [
    valid(coords.bottomLeft) ? [coords.bottomLeft[1], coords.bottomLeft[0]] : null,
    valid(coords.bottomRight) ? [coords.bottomRight[1], coords.bottomRight[0]] : null,
    valid(coords.topRight) ? [coords.topRight[1], coords.topRight[0]] : null,
    valid(coords.topLeft) ? [coords.topLeft[1], coords.topLeft[0]] : null,
    valid(coords.bottomLeft) ? [coords.bottomLeft[1], coords.bottomLeft[0]] : null
  ].filter(Boolean);
  return pts;
};

const getStatusColor = (status) => {
  switch (status) {
    case 'success': return '#22c55e';
    case 'pending': return '#f59e0b';
    case 'error': return '#ef4444';
    default: return '#3b82f6';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'success': return '顺利通过';
    case 'pending': return '待确认';
    case 'error': return '数据异常';
    default: return '未知';
  }
};

const BoundaryMap = ({ record, allRecords = [], onSelectRecord, onClose }) => {
  const [mapKey, setMapKey] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    setMapKey(k => k + 1);
  }, [record]);

  const displayRecord = record || (allRecords.length > 0 ? allRecords[0] : null);
  const center = displayRecord ? getCenter(displayRecord.coordinates) : [32.3, 118.6];
  const zoom = displayRecord ? 15 : 10;

  const overviewBounds = useMemo(() => {
    if (!allRecords || allRecords.length === 0) return null;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    allRecords.forEach(r => {
      const corners = [r.coordinates?.bottomLeft, r.coordinates?.bottomRight, r.coordinates?.topLeft, r.coordinates?.topRight];
      corners.forEach(c => {
        if (c && Array.isArray(c) && c.length === 2) {
          const [lng, lat] = c;
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
        }
      });
    });
    if (!isFinite(minLat)) return null;
    const padLat = (maxLat - minLat) * 0.2 + 0.005;
    const padLng = (maxLng - minLng) * 0.2 + 0.005;
    return [[minLat - padLat, minLng - padLng], [maxLat + padLat, maxLng + padLng]];
  }, [allRecords]);

  return (
    <div className="panel">
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2>
          {displayRecord
            ? `地块位置查看 — ${displayRecord.fieldName}（${getStatusText(displayRecord.status)}）`
            : '地块位置查看'
          }
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {allRecords.length > 0 && (
            <div className="export-dropdown">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <Eye size={14} />
                选择地块查看
                <ChevronDown size={14} />
              </button>
              {showDropdown && (
                <div className="export-menu" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {allRecords.map(r => (
                    <button
                      key={r.id}
                      className="export-menu-item"
                      onClick={() => {
                        onSelectRecord && onSelectRecord(r);
                        setShowDropdown(false);
                      }}
                      style={displayRecord && displayRecord.id === r.id ? { background: '#eff6ff' } : {}}
                    >
                      <span
                        className="quality-dot"
                        style={{
                          background: getStatusColor(r.status),
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          marginRight: '0.5rem'
                        }}
                      />
                      <span>行号 {r.rowNumber} · {r.fieldName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {onClose && (
            <button className="btn btn-secondary" onClick={onClose}>
              关闭
            </button>
          )}
        </div>
      </div>
      <div className="panel-body">
        {displayRecord && (
          <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: '#f9fafb', borderRadius: '4px', fontSize: '0.8rem', color: '#4b5563' }}>
            <strong>底图来源：</strong>{displayRecord.sourceFile}
            {displayRecord.imageName && <> · <strong>关联图片：</strong>{displayRecord.imageName}</>}
            {displayRecord.sourceNote && <> · <strong>备注：</strong>{displayRecord.sourceNote}</>}
          </div>
        )}
        <div className="map-container">
          <MapContainer
            key={mapKey}
            center={center}
            zoom={zoom}
            bounds={!displayRecord ? overviewBounds : undefined}
            zoomControl={false}
            style={{ height: '100%', width: '100%' }}
          >
            <ZoomControl position="topright" />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© OpenStreetMap contributors'
            />

            {!displayRecord && allRecords.length > 0 && allRecords.map(r => {
              const basePts = getPolygonCoords(r.coordinates);
              const labelPts = getPolygonCoords(r.labelCoordinates);
              const color = getStatusColor(r.status);
              const c = getCenter(r.coordinates);
              return (
                <div key={r.id}>
                  {basePts.length > 0 && (
                    <Polygon
                      positions={basePts}
                      pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.15 }}
                      eventHandlers={{
                        click: () => onSelectRecord && onSelectRecord(r)
                      }}
                    >
                      <Popup>
                        <strong>{r.fieldName}</strong><br />
                        状态：{getStatusText(r.status)}<br />
                        匹配率：{r.hitDetection?.matchRate ?? '-'}%<br />
                        <span style={{ color: '#3b82f6', cursor: 'pointer' }}>点击聚焦到此地块</span>
                      </Popup>
                    </Polygon>
                  )}
                  {c && c[0] && (
                    <Marker position={c}>
                      <Popup>
                        <strong>{r.fieldName}</strong><br />
                        行号：{r.rowNumber}<br />
                        面积：{r.area} 亩<br />
                        状态：{getStatusText(r.status)}
                      </Popup>
                    </Marker>
                  )}
                </div>
              );
            })}

            {displayRecord && (
              <>
                {getPolygonCoords(displayRecord.coordinates).length > 0 && (
                  <Polygon
                    positions={getPolygonCoords(displayRecord.coordinates)}
                    pathOptions={{ color: '#3b82f6', weight: 3, fillColor: '#3b82f6', fillOpacity: 0.2 }}
                  >
                    <Popup>
                      <strong>底图边界</strong><br />
                      {displayRecord.fieldName}
                    </Popup>
                  </Polygon>
                )}
                {getPolygonCoords(displayRecord.labelCoordinates).length > 0 && (
                  <Polygon
                    positions={getPolygonCoords(displayRecord.labelCoordinates)}
                    pathOptions={{
                      color: '#ef4444',
                      weight: 3,
                      fillColor: '#ef4444',
                      fillOpacity: 0.2,
                      dashArray: '8, 4'
                    }}
                  >
                    <Popup>
                      <strong>标注边界</strong><br />
                      匹配率：{displayRecord.hitDetection?.matchRate ?? '-'}%<br />
                      偏差：{displayRecord.hitDetection?.deviation ?? '-'}
                    </Popup>
                  </Polygon>
                )}
                <Marker position={center}>
                  <Popup>
                    <strong>{displayRecord.fieldName}</strong><br />
                    面积：{displayRecord.area} 亩<br />
                    状态：{getStatusText(displayRecord.status)}<br />
                    匹配率：{displayRecord.hitDetection?.matchRate ?? '-'}%
                  </Popup>
                </Marker>
              </>
            )}
          </MapContainer>
        </div>
        <div className="legend">
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#3b82f6' }}></div>
            <span>底图边界（实线）</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ef4444' }}></div>
            <span>标注边界（虚线）</span>
          </div>
          {!displayRecord && (
            <>
              <div className="legend-item">
                <div className="legend-color" style={{ background: '#22c55e' }}></div>
                <span>顺利通过</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: '#f59e0b' }}></div>
                <span>待确认</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ background: '#ef4444' }}></div>
                <span>数据异常</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoundaryMap;
