import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { SurfaceModel, SamplePoint, SurfaceResult } from './types';
import { sampleSurfaces } from './data/samples';
import { createNewVersion, analyzeSupplementImpact } from './utils/analysis';
import { SurfaceList } from './components/SurfaceList';
import { SurfaceViewer } from './components/SurfaceViewer';
import { InfoPanel } from './components/InfoPanel';
import { SupplementPanel } from './components/SupplementPanel';

function App() {
  const [surfaces, setSurfaces] = useState<SurfaceModel[]>(sampleSurfaces);
  const [selectedSurfaceId, setSelectedSurfaceId] = useState(sampleSurfaces[0].id);
  const [showBoundaries, setShowBoundaries] = useState(false);
  const [affectedSurfaces, setAffectedSurfaces] = useState<Array<{
    name: string;
    fluxChange: number;
    changeType: string;
  }>>([]);
  const mainViewRef = useRef<HTMLDivElement>(null);

  const selectedSurface = surfaces.find(s => s.id === selectedSurfaceId)!;

  const handleAddSample = (sampleData: Omit<SamplePoint, 'id'>) => {
    const newPoint: SamplePoint = {
      ...sampleData,
      id: `p_sup_${Date.now()}`
    };

    const results: SurfaceResult[] = analyzeSupplementImpact(newPoint, surfaces);

    setSurfaces(prev => prev.map(surface => {
      const latest = surface.versions[surface.versions.length - 1];
      const newSamples = [...latest.samplePoints, newPoint];
      const newVersion = createNewVersion(surface, newSamples);
      newVersion.notes = `补录采样点 (${newPoint.position.x.toFixed(2)}, ${newPoint.position.y.toFixed(2)})`;
      
      return {
        ...surface,
        versions: [...surface.versions, newVersion],
        currentVersion: newVersion.version
      };
    }));

    setAffectedSurfaces(results.map(r => ({
      name: surfaces.find(s => s.id === r.surfaceId)?.name || '',
      fluxChange: r.fluxChange,
      changeType: r.changeType
    })).filter(r => r.name));

    setTimeout(() => setAffectedSurfaces([]), 8000);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            if (Array.isArray(data)) {
              setSurfaces(prev => [...prev, ...data]);
            } else {
              setSurfaces(prev => [...prev, data]);
            }
          } catch (err) {
            alert('导入失败: 无效的 JSON 格式');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExport = async () => {
    if (!mainViewRef.current) return;
    try {
      const canvas = await html2canvas(mainViewRef.current, {
        backgroundColor: '#1a1a2e',
        scale: 2
      });
      const link = document.createElement('a');
      link.download = `surface_${selectedSurfaceId}_${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (err) {
      console.error('导出失败:', err);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0a1a' }}>
      <SurfaceList
        surfaces={surfaces}
        selectedId={selectedSurfaceId}
        onSelect={setSelectedSurfaceId}
        onImport={handleImport}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          padding: '12px 20px',
          background: '#16213e',
          borderBottom: '1px solid #0f3460',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h1 style={{ margin: 0, fontSize: '18px', color: '#4ecdc4' }}>
              🔬 3D 曲面视图
            </h1>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#eaeaea', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showBoundaries}
                onChange={(e) => setShowBoundaries(e.target.checked)}
              />
              显示边界参考
            </label>
          </div>
          <div style={{ fontSize: '12px', color: '#888' }}>
            💡 拖拽旋转 | 滚轮缩放 | 点击列表切换曲面
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }} ref={mainViewRef}>
          <div style={{ flex: 1, position: 'relative' }}>
            <SurfaceViewer
              surface={selectedSurface}
              showBoundaries={showBoundaries}
            />
            
            {selectedSurface.parameters && Object.keys(selectedSurface.parameters).length > 0 && (
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                padding: '12px 16px',
                background: 'rgba(255, 159, 67, 0.9)',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#000',
                maxWidth: '300px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  ⚠ 参数敏感提示
                </div>
                <div>
                  边界值受参数影响，请核对定义域范围:
                  <br />
                  X: [{selectedSurface.domain.xRange[0]}, {selectedSurface.domain.xRange[1]}]
                  <br />
                  Y: [{selectedSurface.domain.yRange[0]}, {selectedSurface.domain.yRange[1]}]
                </div>
              </div>
            )}

            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              padding: '8px 12px',
              background: 'rgba(22, 33, 62, 0.9)',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#888'
            }}>
              <span style={{ color: '#6bcb77' }}>●</span> 原始采样点 &nbsp;
              <span style={{ color: '#ffd93d' }}>●</span> 补录点 &nbsp;
              <span style={{ color: '#ff6b6b' }}>●</span> 边界点
            </div>
          </div>

          <div style={{ width: '340px' }}>
            <InfoPanel
              surface={selectedSurface}
              onExport={handleExport}
            />
          </div>
        </div>

        <SupplementPanel
          onAddSample={handleAddSample}
          affectedSurfaces={affectedSurfaces}
        />
      </div>
    </div>
  );
}

export default App;
