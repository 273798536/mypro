import { useState, useMemo, useCallback } from 'react';
import type {
  LayerType,
  CollisionStatus,
  ViewState,
  CollisionResult,
} from './types';
import { calculateCollisions } from './data/mockData';
import { useApp } from './context/AppContext';
import CadCanvas from './components/CadCanvas';
import AttachmentPanel from './components/AttachmentPanel';
import AnalysisPanel from './components/AnalysisPanel';
import ViewControls from './components/ViewControls';
import CadDataEntry from './components/CadDataEntry';
import { generateMarkdownReport, downloadMarkdown } from './utils/report';
import {
  FileDown,
  Map,
  ClipboardList,
  Layers,
  FileText,
  RotateCcw,
  Database,
} from 'lucide-react';

type SidebarTab = 'analysis' | 'attachments' | 'entry' | 'views';

export default function App() {
  const { state, dispatch, getCurrentTime } = useApp();

  const [visibleLayers, setVisibleLayers] = useState<LayerType[]>([
    'corridor',
    'buildings',
    'towers',
    'mountains',
    'power_lines',
  ]);

  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  const [filterStatus, setFilterStatus] = useState<CollisionStatus[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(
    null
  );
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('analysis');

  const { corridors, objects, attachments, viewStates, selectedCorridorId } = state;

  const selectedCorridor = corridors.find((c) => c.id === selectedCorridorId);

  const collisionResults = useMemo((): CollisionResult[] => {
    if (!selectedCorridor) return [];
    return calculateCollisions(selectedCorridor, objects);
  }, [selectedCorridor, objects]);

  const getObjectStatus = useCallback(
    (objectId: string): string => {
      const result = collisionResults.find((r) => r.objectId === objectId);
      return result?.status || 'pending';
    },
    [collisionResults]
  );

  function handleSelectCorridor(id: string) {
    dispatch({ type: 'SELECT_CORRIDOR', payload: id });
  }

  function handleToggleLayer(layer: LayerType) {
    if (visibleLayers.includes(layer)) {
      setVisibleLayers(visibleLayers.filter((l) => l !== layer));
    } else {
      setVisibleLayers([...visibleLayers, layer]);
    }
  }

  function handleViewChange(newZoom: number, newPanX: number, newPanY: number) {
    setZoom(newZoom);
    setPanX(newPanX);
    setPanY(newPanY);
  }

  function handleSelectObject(id: string | null) {
    setSelectedObjectId(id);
    if (id) {
      const obj = objects.find((o) => o.id === id);
      if (obj) {
        setSelectedAttachmentId(obj.sourceAttachmentId);
      }
    }
  }

  function handleSelectAttachment(id: string) {
    setSelectedAttachmentId(id);
    setSidebarTab('attachments');
  }

  function handleHighlightObjects(objectIds: string[]) {
    if (objectIds.length > 0) {
      setSelectedObjectId(objectIds[0]);
    }
  }

  function handleFocusObject(objectId: string) {
    const obj = objects.find((o) => o.id === objectId);
    if (obj) {
      const targetX = -(obj.position.x - 400) * zoom;
      const targetY = -(obj.position.y - 200) * zoom;
      setPanX(targetX);
      setPanY(targetY);
    }
  }

  function handleSaveView(name: string) {
    const newView: ViewState = {
      id: `view-${Date.now()}`,
      name,
      zoom,
      panX,
      panY,
      visibleLayers: [...visibleLayers],
      filterStatus: [...filterStatus],
      selectedObjectId,
      createdAt: getCurrentTime(),
    };
    dispatch({ type: 'ADD_VIEW_STATE', payload: newView });
  }

  function handleLoadView(view: ViewState) {
    setZoom(view.zoom);
    setPanX(view.panX);
    setPanY(view.panY);
    setVisibleLayers([...view.visibleLayers]);
    setFilterStatus([...view.filterStatus]);
    setSelectedObjectId(view.selectedObjectId);
    if (view.selectedObjectId) {
      const obj = objects.find((o) => o.id === view.selectedObjectId);
      if (obj) {
        setSelectedAttachmentId(obj.sourceAttachmentId);
      }
    }
  }

  function handleDeleteView(viewId: string) {
    dispatch({ type: 'DELETE_VIEW_STATE', payload: viewId });
  }

  function handleResetDemo() {
    if (confirm('确定要重置为演示数据吗？所有自定义录入的数据将被清除。')) {
      dispatch({ type: 'RESET_TO_DEMO' });
      setZoom(1);
      setPanX(0);
      setPanY(0);
      setVisibleLayers(['corridor', 'buildings', 'towers', 'mountains', 'power_lines']);
      setFilterStatus([]);
      setSelectedObjectId(null);
      setSelectedAttachmentId(null);
    }
  }

  function generateConclusions(): string {
    const dangerResults = collisionResults.filter((r) => r.status === 'danger');
    const warningResults = collisionResults.filter((r) => r.status === 'warning');
    const lateAttachments = attachments.filter((a) => a.isLateArrival);
    const abnormalObjects = objects.filter((o) => o.isAbnormal);

    if (collisionResults.length === 0) {
      return '暂无障碍物数据，无法得出结论。请先在「数据录入」中添加航线走廊和障碍物对象。';
    }

    const parts: string[] = [];

    parts.push(
      `本航线走廊共检查 ${objects.length} 个障碍物，发现 ${dangerResults.length} 处严重冲突、${warningResults.length} 处风险点。`
    );

    if (lateAttachments.length > 0) {
      const lateNames = lateAttachments.map((a) => a.name).join('、');
      parts.push(
        `其中 ${lateAttachments.length} 份晚到附件（${lateNames}）为预审开始后提交，新增的对象需重点核实。`
      );
    }

    if (abnormalObjects.length > 0) {
      const abnormalNames = abnormalObjects
        .map((o) => `${o.name}（${o.abnormalReason || '异常'}）`)
        .join('；');
      parts.push(`异常对象共 ${abnormalObjects.length} 个：${abnormalNames}。`);
    }

    if (dangerResults.length > 0) {
      const firstDanger = dangerResults[0];
      parts.push(
        `最严重冲突为 ${firstDanger.objectName}，侵入走廊 ${firstDanger.overlapDistance.toFixed(1)} 米，建议立即处理。`
      );
    }

    if (dangerResults.length === 0 && warningResults.length === 0) {
      parts.push('所有障碍物与航线走廊距离安全，可正常通航。');
    }

    parts.push('建议：');
    if (dangerResults.length > 0) {
      parts.push('1. 对严重冲突对象，立即联系相关单位核实数据，评估调整航线或移除障碍的可行性；');
    }
    if (warningResults.length > 0) {
      parts.push('2. 对风险对象，纳入重点监控清单，定期复核状态；');
    }
    if (lateAttachments.length > 0 || abnormalObjects.length > 0) {
      parts.push('3. 对晚到附件和异常口径，追溯原始资料，确认数据真实性；');
    }
    parts.push('4. 所有处理措施记录在案，形成完整审计链条。');

    return parts.join('');
  }

  function handleExportReport() {
    if (!selectedCorridor) {
      alert('请先选择或创建一个航线走廊');
      return;
    }

    const dangerCount = collisionResults.filter(
      (r) => r.status === 'danger'
    ).length;
    const warningCount = collisionResults.filter(
      (r) => r.status === 'warning'
    ).length;
    const safeCount = collisionResults.filter(
      (r) => r.status === 'safe'
    ).length;
    const pendingCount = collisionResults.filter(
      (r) => r.status === 'pending'
    ).length;

    const overallStatus: CollisionStatus =
      dangerCount > 0 ? 'danger' : warningCount > 0 ? 'warning' : 'safe';

    const currentViewSnapshot: ViewState = {
      id: 'snapshot',
      name: '报告快照',
      zoom,
      panX,
      panY,
      visibleLayers: [...visibleLayers],
      filterStatus: [...filterStatus],
      selectedObjectId,
      createdAt: getCurrentTime(),
    };

    const report = {
      corridorName: selectedCorridor.name,
      reviewDate: new Date().toLocaleDateString('zh-CN'),
      reviewedBy: '林姐（教学审核）',
      overallStatus,
      totalObjects: objects.length,
      dangerCount,
      warningCount,
      safeCount,
      pendingCount,
      attachments,
      collisionResults,
      viewSnapshot: currentViewSnapshot,
      conclusions: generateConclusions(),
    };

    const markdown = generateMarkdownReport(report);
    const safeCorridorName = selectedCorridor.name.replace(/[\\/:*?"<>|]/g, '_');
    const filename = `碰撞预审报告_${safeCorridorName}_${new Date().toISOString().split('T')[0]}.md`;
    downloadMarkdown(filename, markdown);
  }

  if (!selectedCorridor && corridors.length === 0) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-left">
            <Map size={24} />
            <div>
              <div className="header-title">低空航线走廊碰撞预审</div>
              <div className="header-subtitle">
                Low-Altitude Corridor Collision Pre-Review
              </div>
            </div>
          </div>
        </header>
        <div className="empty-app">
          <Database size={64} color="#ccc" />
          <h2>还没有数据</h2>
          <p>请先录入航线走廊和材料附件，开始碰撞预审工作</p>
          <button
            className="btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => setSidebarTab('entry')}
          >
            开始录入数据
          </button>
          <button
            className="btn-secondary"
            style={{ marginTop: 8 }}
            onClick={handleResetDemo}
          >
            加载演示数据
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <Map size={24} />
          <div>
            <div className="header-title">低空航线走廊碰撞预审</div>
            <div className="header-subtitle">
              Low-Altitude Corridor Collision Pre-Review
            </div>
          </div>
        </div>
        <div className="header-right">
          <button className="header-btn" onClick={handleResetDemo} title="重置为演示数据">
            <RotateCcw size={16} />
            重置
          </button>
          <select
            className="corridor-select"
            value={selectedCorridorId || ''}
            onChange={(e) => handleSelectCorridor(e.target.value)}
          >
            {corridors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="export-btn" onClick={handleExportReport}>
            <FileDown size={16} />
            导出 Markdown 报告
          </button>
        </div>
      </header>

      {selectedCorridor && (
        <div className="info-bar">
          <div className="info-left">
            <div className="info-item">
              <span>当前航线：</span>
              <strong>{selectedCorridor.name}</strong>
            </div>
            <div className="info-item">
              <span>走廊宽度：</span>
              <strong>{selectedCorridor.width}m</strong>
            </div>
            <div className="info-item">
              <span>高度区间：</span>
              <strong>
                {selectedCorridor.minAltitude} - {selectedCorridor.maxAltitude}m
              </strong>
            </div>
            <div className="info-item">
              <span>对象总数：</span>
              <strong>{objects.length}</strong>
            </div>
            <div className="info-item">
              <span>附件数：</span>
              <strong>{attachments.length}</strong>
            </div>
          </div>
          <div className="info-right">
            <span style={{ color: '#888', fontSize: 12 }}>
              数据自动保存在本地浏览器
            </span>
          </div>
        </div>
      )}

      <div className="app-main">
        <aside className="sidebar">
          <div className="sidebar-tabs">
            <button
              className={`sidebar-tab ${sidebarTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setSidebarTab('analysis')}
            >
              <ClipboardList size={14} /> 分析结果
            </button>
            <button
              className={`sidebar-tab ${sidebarTab === 'attachments' ? 'active' : ''}`}
              onClick={() => setSidebarTab('attachments')}
            >
              <FileText size={14} /> 材料附件
            </button>
            <button
              className={`sidebar-tab ${sidebarTab === 'entry' ? 'active' : ''}`}
              onClick={() => setSidebarTab('entry')}
            >
              <Database size={14} /> 数据录入
            </button>
            <button
              className={`sidebar-tab ${sidebarTab === 'views' ? 'active' : ''}`}
              onClick={() => setSidebarTab('views')}
            >
              <Layers size={14} /> 视图控制
            </button>
          </div>

          <div className="sidebar-content">
            {sidebarTab === 'analysis' && selectedCorridor && (
              <AnalysisPanel
                results={collisionResults}
                objects={objects}
                attachments={attachments}
                filterStatus={filterStatus}
                onFilterChange={setFilterStatus}
                selectedResultId={selectedObjectId}
                onSelectResult={handleSelectObject}
                onFocusObject={handleFocusObject}
                onSelectAttachment={handleSelectAttachment}
              />
            )}

            {sidebarTab === 'attachments' && (
              <AttachmentPanel
                attachments={attachments}
                objects={objects}
                selectedAttachmentId={selectedAttachmentId}
                onSelectAttachment={setSelectedAttachmentId}
                onHighlightObjects={handleHighlightObjects}
              />
            )}

            {sidebarTab === 'entry' && (
              <CadDataEntry
                selectedCorridorId={selectedCorridorId}
                onSelectCorridor={handleSelectCorridor}
              />
            )}

            {sidebarTab === 'views' && (
              <ViewControls
                visibleLayers={visibleLayers}
                onToggleLayer={handleToggleLayer}
                viewStates={viewStates}
                currentView={{
                  zoom,
                  panX,
                  panY,
                  visibleLayers,
                  filterStatus,
                  selectedObjectId,
                }}
                onSaveView={handleSaveView}
                onLoadView={handleLoadView}
                onDeleteView={handleDeleteView}
                filterStatus={filterStatus}
              />
            )}
          </div>
        </aside>

        <main className="center-area">
          <div className="canvas-wrapper">
            {selectedCorridor ? (
              <CadCanvas
                corridor={selectedCorridor}
                objects={objects}
                visibleLayers={visibleLayers}
                selectedObjectId={selectedObjectId}
                onSelectObject={handleSelectObject}
                getObjectStatus={getObjectStatus}
                zoom={zoom}
                panX={panX}
                panY={panY}
                onViewChange={handleViewChange}
              />
            ) : (
              <div className="empty-canvas">
                <Map size={48} color="#ccc" />
                <p>请先选择或创建航线走廊</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
