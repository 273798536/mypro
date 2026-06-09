import React, { useState, useEffect, useRef } from 'react';
import { useRecordStore, usePlaybackStore, useViewStore } from '../store';
import type { ViewState } from '../types';

const PlaybackPanel: React.FC = () => {
  const { processRecords } = useRecordStore();
  const { 
    isPlaying, 
    playbackSpeed, 
    currentTime, 
    duration,
    setPlaying, 
    setSpeed, 
    setTime 
  } = usePlaybackStore();
  const { restoreView, viewHistory, saveView } = useViewStore();
  
  const [filteredRecords, setFilteredRecords] = useState(processRecords);
  const playbackRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (processRecords.length > 0) {
      const firstTime = processRecords[0].timestamp;
      const lastTime = processRecords[processRecords.length - 1].timestamp;
      setTime(0);
      usePlaybackStore.setState({ duration: lastTime - firstTime });
    }
  }, [processRecords, setTime]);

  useEffect(() => {
    if (isPlaying && processRecords.length > 0) {
      playbackRef.current = setInterval(() => {
        setTime(currentTime + 100 * playbackSpeed);
        
        if (currentTime >= duration) {
          setPlaying(false);
        }
      }, 100);
    } else {
      if (playbackRef.current) {
        clearInterval(playbackRef.current);
      }
    }

    return () => {
      if (playbackRef.current) {
        clearInterval(playbackRef.current);
      }
    };
  }, [isPlaying, currentTime, duration, playbackSpeed, setPlaying, setTime]);

  useEffect(() => {
    if (processRecords.length > 0) {
      const firstTime = processRecords[0].timestamp;
      const visibleRecords = processRecords.filter(
        r => r.timestamp >= firstTime + currentTime
      );
      setFilteredRecords(visibleRecords);
    }
  }, [currentTime, processRecords]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    setTime(newTime);
  };

  const handleRestoreView = (index: number) => {
    restoreView(index);
  };

  const handleRestoreViewFromRecord = (record: typeof processRecords[0]) => {
    const params = record.parameters as Record<string, unknown>;
    if (
      typeof params.viewX === 'number' && 
      typeof params.viewY === 'number' && 
      typeof params.zoom === 'number'
    ) {
      const view: ViewState = {
        x: params.viewX,
        y: params.viewY,
        zoom: params.zoom,
        timestamp: record.timestamp,
      };
      saveView(view);
    }
  };

  const isViewRecord = (record: typeof processRecords[0]) => {
    const params = record.parameters as Record<string, unknown>;
    return params.source === 'view_change' || 
           (typeof params.viewX === 'number' && typeof params.viewY === 'number');
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="playback-controls">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600' }}>⏱️ 时间回放</span>
          <select 
            value={playbackSpeed} 
            onChange={(e) => setSpeed(Number(e.target.value))}
            style={{ 
              padding: '4px 8px', 
              fontSize: '12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
            }}
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </div>

        <div className="playback-timeline" onClick={handleSeek}>
          <div className="playback-progress" style={{ width: `${progressPercent}%` }}></div>
        </div>

        <div className="playback-time">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="playback-buttons">
          <button 
            className="btn btn-secondary"
            onClick={() => setTime(0)}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            ⏮️ 开始
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setPlaying(!isPlaying)}
            style={{ padding: '6px 16px', fontSize: '12px' }}
          >
            {isPlaying ? '⏸️ 暂停' : '▶️ 播放'}
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => setTime(duration)}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            ⏭️ 结束
          </button>
        </div>

        <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
          📊 共 {filteredRecords.length} 条处理记录 | 其中视图记录 {filteredRecords.filter(isViewRecord).length} 条
          <br />
          <span style={{ color: 'var(--color-primary)' }}>💡 视角保存和时间回放共用同一批 processRecords</span>
        </div>
      </div>

      <div className="panel-header" style={{ background: 'var(--color-background)', padding: '12px 16px' }}>
        📜 处理记录 ({filteredRecords.length})
      </div>

      <div className="record-list" style={{ flex: 1, overflow: 'auto' }}>
        {filteredRecords.length === 0 ? (
          <div style={{ 
            padding: '40px 20px', 
            textAlign: 'center', 
            color: 'var(--color-text-secondary)',
            fontSize: '13px',
          }}>
            暂无记录
          </div>
        ) : (
          filteredRecords.map(record => (
            <div 
              key={record.id} 
              className="record-item"
              style={{ 
                borderLeft: isViewRecord(record) ? '3px solid var(--color-warning)' : undefined,
                background: isViewRecord(record) ? '#FFFBEB' : undefined,
              }}
            >
              <div className="record-time">
                {new Date(record.timestamp).toLocaleString('zh-CN')}
                {isViewRecord(record) && (
                  <span style={{ 
                    marginLeft: '8px', 
                    background: 'var(--color-warning)', 
                    color: 'white', 
                    padding: '1px 6px', 
                    borderRadius: '4px',
                    fontSize: '10px',
                  }}>
                    📷 视图
                  </span>
                )}
              </div>
              <div className="record-operation">{record.operation}</div>
              <div className="record-operator">
                👤 {record.operator} | 
                <span style={{ 
                  color: record.result === 'success' ? 'var(--color-success)' : 'var(--color-error)',
                  marginLeft: '4px',
                }}>
                  {record.result === 'success' ? '✓ 成功' : '✗ 失败'}
                </span>
              </div>
              {isViewRecord(record) && (
                <button
                  onClick={() => handleRestoreViewFromRecord(record)}
                  style={{
                    marginTop: '8px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    background: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                >
                  🔄 恢复此视图
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {viewHistory.length > 0 && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
            📷 视角历史
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {viewHistory.slice(-5).map((view, index) => (
              <button
                key={index}
                onClick={() => handleRestoreView(viewHistory.length - 5 + index)}
                style={{
                  padding: '4px 12px',
                  fontSize: '11px',
                  background: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                {formatTime(view.timestamp - viewHistory[0].timestamp)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaybackPanel;
