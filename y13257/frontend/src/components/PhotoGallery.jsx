import React, { useState } from 'react';
import { formatDate } from '../utils';

function PhotoGallery({ photos, onPhotoClick }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const inspectionPhotos = photos.filter(p => p.is_inspection);
  const supplementPhotos = photos.filter(p => p.is_supplement);
  const otherPhotos = photos.filter(p => !p.is_inspection && !p.is_supplement);

  const renderPhotoCard = (photo) => (
    <div 
      key={photo.id} 
      className={`photo-item ${photo.is_supplement ? 'supplement' : ''}`}
      onClick={() => {
        setSelectedPhoto(photo);
        onPhotoClick?.(photo);
      }}
      style={{ cursor: 'pointer' }}
    >
      <img 
        src={photo.file_path} 
        alt={photo.file_name}
        className="photo-img"
        onError={(e) => {
          e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="140"><rect fill="%23e5e7eb" width="200" height="140"/><text x="100" y="75" text-anchor="middle" fill="%239ca3af">图片</text></svg>';
        }}
      />
      <div className="photo-info">
        <div className="photo-name">{photo.file_name}</div>
        <div className="photo-meta">
          <span className="photo-version">v{photo.version}</span>
          {photo.is_supplement && (
            <span className="photo-supplement-tag">补录</span>
          )}
          {photo.parent_photo_name && (
            <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
              基于: {photo.parent_photo_name}
            </span>
          )}
        </div>
        <div className="photo-meta" style={{ marginTop: '0.3rem' }}>
          {photo.uploader_name} · {formatDate(photo.uploaded_at)}
        </div>
        {photo.supplement_note && (
          <div style={{ 
            marginTop: '0.4rem', 
            fontSize: '0.75rem', 
            color: '#92400e',
            background: '#fef3c7',
            padding: '0.2rem 0.4rem',
            borderRadius: '4px'
          }}>
            💡 {photo.supplement_note}
          </div>
        )}
        {photo.notes && photo.notes.length > 0 && (
          <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#6b7280' }}>
            📝 {photo.notes.length} 条备注
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      {inspectionPhotos.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.8rem', color: '#374151' }}>
            📷 巡检照片 ({inspectionPhotos.length})
          </h4>
          <div className="photos-grid">
            {inspectionPhotos.map(renderPhotoCard)}
          </div>
        </div>
      )}

      {supplementPhotos.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.8rem', color: '#92400e' }}>
            🔄 补录照片 ({supplementPhotos.length})
          </h4>
          <div className="photos-grid">
            {supplementPhotos.map(renderPhotoCard)}
          </div>
        </div>
      )}

      {otherPhotos.length > 0 && (
        <div>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.8rem', color: '#6b7280' }}>
            📎 历史截图/参考材料 ({otherPhotos.length})
          </h4>
          <div className="photos-grid">
            {otherPhotos.map(renderPhotoCard)}
          </div>
        </div>
      )}

      {selectedPhoto && (
        <div className="modal-overlay" onClick={() => setSelectedPhoto(null)}>
          <div className="modal photo-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedPhoto.file_name}</h3>
              <button className="modal-close" onClick={() => setSelectedPhoto(null)}>×</button>
            </div>
            <div className="modal-body">
              <img 
                src={selectedPhoto.file_path} 
                alt={selectedPhoto.file_name}
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%23e5e7eb" width="400" height="300"/><text x="200" y="150" text-anchor="middle" fill="%239ca3af">图片预览</text></svg>';
                }}
              />
              
              <div className="photo-notes">
                <h5 style={{ fontSize: '0.9rem', marginBottom: '0.6rem', color: '#374151' }}>
                  备注历史
                </h5>
                {selectedPhoto.notes && selectedPhoto.notes.length > 0 ? (
                  selectedPhoto.notes.map(note => (
                    <div 
                      key={note.id} 
                      className={`note-item ${!note.is_latest ? 'old-version' : ''}`}
                    >
                      <div className="note-meta">
                        <span>
                          v{note.version} · {note.creator_name}
                          {!note.is_latest && <span className="tag">历史版本</span>}
                        </span>
                        <span>{formatDate(note.created_at)}</span>
                      </div>
                      <div className="note-content">{note.content}</div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state" style={{ padding: '1rem' }}>
                    暂无备注
                  </div>
                )}
              </div>

              <div style={{ 
                marginTop: '1rem', 
                padding: '0.8rem', 
                background: '#f8fafc', 
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#6b7280'
              }}>
                <div>📅 上传时间：{formatDate(selectedPhoto.uploaded_at)}</div>
                <div>👤 上传人：{selectedPhoto.uploader_name}</div>
                <div>📌 版本：v{selectedPhoto.version}</div>
                {selectedPhoto.supplement_note && (
                  <div>💡 备注：{selectedPhoto.supplement_note}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PhotoGallery;
