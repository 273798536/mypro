import { useEffect, useRef } from 'react';
import { useProjectStore } from '../store/projectStore';

const Sidebar = () => {
  const {
    currentTime,
    isPlaying,
    setCurrentTime,
    setIsPlaying,
    selectedFilters,
    toggleSoundType,
    toggleBuildingType,
    setShowWind,
    setShowHeatmap,
    windData,
    timeline,
    correctWindGap,
    generateReport,
    importData,
  } = useProjectStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        setCurrentTime(prev => {
          const next = prev + 0.1;
          if (next >= 24) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, setCurrentTime, setIsPlaying]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        importData(data);
      } catch (err) {
        console.error('Failed to parse data:', err);
      }
    };
    reader.readAsText(file);
  };

  const handleExportReport = () => {
    const report = generateReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `acoustic-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const soundTypes = [
    { key: 'stage', label: '舞台声源', color: '#ff6b6b' },
    { key: 'traffic', label: '交通噪声', color: '#ffd93d' },
    { key: 'wind', label: '风噪', color: '#6bcfff' },
    { key: 'complaint', label: '投诉点', color: '#ff4757' },
    { key: 'other', label: '其他', color: '#a29bfe' },
  ];

  const buildingTypes = [
    { key: 'residential', label: '居民楼', color: '#4a90d9' },
    { key: 'commercial', label: '商业楼', color: '#e74c3c' },
    { key: 'stage', label: '广场舞台', color: '#f39c12' },
    { key: 'other', label: '其他建筑', color: '#95a5a6' },
  ];

  const windGaps = windData.filter(w => w.gap);

  return (
    <div style={{
      width: '320px',
      background: 'linear-gradient(180deg, #16213e 0%, #1a1a2e 100%)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      borderLeft: '1px solid #2d3a4f',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #2d3a4f' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>城市风噪音乐广场</h2>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#8892b0' }}>声学规划工作台</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#ccd6f6' }}>数据导入</h3>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              padding: '10px',
              background: '#0f3460',
              border: '1px solid #2d3a4f',
              borderRadius: '6px',
              color: '#e94560',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            导入 JSON 数据
          </button>
          <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#5a6a8a' }}>
            支持空值和旧备注自动清洗
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#ccd6f6' }}>时段播放</h3>
          <div style={{
            background: '#0f3460',
            borderRadius: '8px',
            padding: '12px',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
            }}>
              <button
                onClick={() => setCurrentTime(0)}
                style={{
                  padding: '8px 12px',
                  background: '#16213e',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                ⏮
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                style={{
                  padding: '10px 20px',
                  background: '#e94560',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {isPlaying ? '⏸ 暂停' : '▶ 播放'}
              </button>
              <button
                onClick={() => setCurrentTime(24)}
                style={{
                  padding: '8px 12px',
                  background: '#16213e',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                ⏭
              </button>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#6bcfff' }}>
                {currentTime.toFixed(1)}
              </span>
              <span style={{ fontSize: '12px', color: '#8892b0', marginLeft: '4px' }}>时</span>
            </div>
            <input
              type="range"
              min="0"
              max="24"
              step="0.1"
              value={currentTime}
              onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#e94560' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#ccd6f6' }}>热力映射筛选</h3>
          <div style={{
            background: '#0f3460',
            borderRadius: '8px',
            padding: '12px',
          }}>
            <div style={{ marginBottom: '12px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#8892b0' }}>声源类型</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {soundTypes.map(type => (
                  <button
                    key={type.key}
                    onClick={() => toggleSoundType(type.key)}
                    style={{
                      padding: '6px 10px',
                      background: selectedFilters.soundTypes.includes(type.key)
                        ? type.color
                        : '#16213e',
                      border: 'none',
                      borderRadius: '4px',
                      color: selectedFilters.soundTypes.includes(type.key) ? '#fff' : '#8892b0',
                      cursor: 'pointer',
                      fontSize: '11px',
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#8892b0' }}>建筑类型</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {buildingTypes.map(type => (
                  <button
                    key={type.key}
                    onClick={() => toggleBuildingType(type.key)}
                    style={{
                      padding: '6px 10px',
                      background: selectedFilters.buildingTypes.includes(type.key)
                        ? type.color
                        : '#16213e',
                      border: 'none',
                      borderRadius: '4px',
                      color: selectedFilters.buildingTypes.includes(type.key) ? '#fff' : '#8892b0',
                      cursor: 'pointer',
                      fontSize: '11px',
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowWind(!selectedFilters.showWind)}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: selectedFilters.showWind ? '#6bcfff' : '#16213e',
                  border: 'none',
                  borderRadius: '4px',
                  color: selectedFilters.showWind ? '#000' : '#8892b0',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                🌬 风场
              </button>
              <button
                onClick={() => setShowHeatmap(!selectedFilters.showHeatmap)}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: selectedFilters.showHeatmap ? '#ff6b6b' : '#16213e',
                  border: 'none',
                  borderRadius: '4px',
                  color: selectedFilters.showHeatmap ? '#fff' : '#8892b0',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                🔥 热力图
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#ccd6f6' }}>事件时序</h3>
          <div style={{
            background: '#0f3460',
            borderRadius: '8px',
            padding: '12px',
            maxHeight: '200px',
            overflowY: 'auto',
          }}>
            {timeline.length === 0 ? (
              <p style={{ margin: 0, fontSize: '12px', color: '#5a6a8a', textAlign: 'center' }}>
                暂无事件数据
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...timeline].sort((a, b) => a.order - b.order).map(event => (
                  <div
                    key={event.id}
                    style={{
                      padding: '8px',
                      background: '#16213e',
                      borderRadius: '4px',
                      borderLeft: `3px solid ${
                        event.type === 'wind_gap' ? '#6bcfff' :
                        event.type === 'sound_overlap' ? '#ff6b6b' :
                        event.type === 'floor_occlusion' ? '#ffd93d' : '#ff4757'
                      }`,
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>
                        {event.order}. {event.description}
                      </span>
                      <span style={{ fontSize: '10px', color: '#8892b0' }}>
                        {event.timestamp.toFixed(1)}时
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#5a6a8a' }}>
                      类型: {
                        event.type === 'wind_gap' ? '风向缺口' :
                        event.type === 'sound_overlap' ? '声源重叠' :
                        event.type === 'floor_occlusion' ? '楼层遮挡' : '居民投诉'
                      }
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {windGaps.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#ffd93d' }}>
              ⚠️ 风向缺口 ({windGaps.length})
            </h3>
            <div style={{
              background: '#3d2e0f',
              borderRadius: '8px',
              padding: '12px',
            }}>
              {windGaps.map(wind => (
                <div
                  key={wind.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #5a4a1a',
                  }}
                >
                  <span style={{ fontSize: '12px' }}>
                    时间点 {wind.timestamp.toFixed(1)}时
                  </span>
                  <button
                    onClick={() => correctWindGap(wind.id)}
                    style={{
                      padding: '4px 8px',
                      background: '#ffd93d',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#000',
                      cursor: 'pointer',
                      fontSize: '11px',
                    }}
                  >
                    修正
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '16px', borderTop: '1px solid #2d3a4f' }}>
        <button
          onClick={handleExportReport}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(90deg, #e94560 0%, #ff6b6b 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          📄 导出评估报告
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
