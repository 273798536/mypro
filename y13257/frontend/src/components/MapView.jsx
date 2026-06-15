import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';

function MapView({ latitude, longitude, standardName, supplementRecords = [] }) {
  if (!latitude || !longitude) {
    return (
      <div className="map-container" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f3f4f6',
        color: '#6b7280'
      }}>
        暂无地图点位数据
      </div>
    );
  }

  const position = [latitude, longitude];

  const oldPositions = supplementRecords
    .filter(r => r.changes?.action === 'update_point')
    .map(r => ({
      lat: r.changes.oldLatitude,
      lng: r.changes.oldLongitude,
      time: r.supplemented_at,
      distance: r.changes.distanceMeters
    }));

  return (
    <div className="map-container">
      <MapContainer 
        center={position} 
        zoom={16} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {oldPositions.map((pos, idx) => (
          <React.Fragment key={idx}>
            <Marker position={[pos.lat, pos.lng]} opacity={0.5}>
              <Popup>
                历史位置（{pos.distance}米外）<br/>
                调整时间：{new Date(pos.time).toLocaleString()}
              </Popup>
            </Marker>
            <Circle
              center={[pos.lat, pos.lng]}
              radius={5}
              color="#f59e0b"
              fillColor="#f59e0b"
              fillOpacity={0.3}
            />
          </React.Fragment>
        ))}

        <Marker position={position}>
          <Popup>
            <strong>{standardName}</strong><br/>
            当前定位
          </Popup>
        </Marker>
        <Circle
          center={position}
          radius={20}
          color="#3b82f6"
          fillColor="#3b82f6"
          fillOpacity={0.2}
        />
      </MapContainer>
    </div>
  );
}

export default MapView;
