import { useState, useMemo, useCallback } from 'react';
import type {
  LayerType,
  CollisionStatus,
  ViewState,
} from './types';
import {
  mockCorridors,
  mockObjects,
  mockAttachments,
  mockViewStates,
  calculateCollisions,
} from './data/mockData';
import CadCanvas from './components/CadCanvas';
import AttachmentPanel from './components/AttachmentPanel';
import AnalysisPanel from './components/AnalysisPanel';
import ViewControls from './components/ViewControls';
import { generateMarkdownReport, downloadMarkdown } from './utils/report';
import { FileDown, Map, ClipboardList, Layers } from 'lucide-react';

type SidebarTab = 'analysis' | 'attachments' | 'views';

export default function App() {
  const [selectedCorridorId] = useState(mockCorridors[0].id);
  const [objects] = useState(mockObjects);
  const [attachments] = useState(mockAttachments);

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

  const [savedViews, setSavedViews] = useState<ViewState[]>(mockViewStates);

  const selectedCorridor = mockCorridors.find((c) => c.id === selectedCorridorId)!;

  const collisionResults = useMemo(() => {
    return calculateCollisions(selectedCorridor, objects);
  }, [selectedCorridor, objects]);

  const getObjectStatus = useCallback(
    (objectId: string): string => {
      const result = collisionResults.find((r) => r.objectId === objectId);
      return result?.status || 'pending';
    },
    [collisionResults]
  );

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
      const targetX = -(obj.position.x - 400) * zoom + 0;
      const targetY = -(obj.position.y - 200) * zoom + 0;
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
      createdAt: new Date().toLocaleString('zh-CN'),
    };
    setSavedViews([...savedViews, newView]);
  }

  function handleLoadView(view: ViewState) {
    setZoom(view.zoom);
    setPanX(view.panX);
    setPanY(view.panY);
    setVisibleLayers([...view.visibleLayers]);
    setFilterStatus([...view.filterStatus]);
    setSelectedObjectId(view.selectedObjectId);
  }

  function handleDeleteView(viewId: string) {
    setSavedViews(savedViews.filter((v) => v.id !== viewId));
  }

  function handleExportReport() {
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
      createdAt: new Date().toLocaleString('zh-CN'),
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
      conclusions:
        '本航线走廊共发现' +
        dangerCount +
        '处严重冲突、' +
        warningCount +
        '处风险点。其中高压输电线路P-7为晚到附件新增，需重点核实；山坡M-3因口径变更标高提高40米，已从安全变为风险。建议：1. 与电力公司确认P-7线路的准确位置和线高；2. 评估M-3山区段航线抬升可行性；3. 临时施工吊塔需确认施工周期，必要时调整飞行计划。',
    };

    const markdown = generateMarkdownReport(report);
    const filename = `碰撞预审报告_${selectedCorridor.name}_${new Date().toISOString().split('T')[0]}.md`;
    downloadMarkdown(filename, markdown);
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <Map size={24} />
          <div>
            <div className="header-title">低空航线走廊碰撞预审</div>
            <div className="header-subtitle">Low-Altitude Corridor Collision Pre-Review</div>
          </div>
        </div>
        <div className="header-right">
          <button className="export-btn" onClick={handleExportReport}>
            <FileDown size={16} />
            导出 Markdown 报告
          </button>
        </div>
      </header>

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
        </div>
        <div className="info-right">
          <span style={{ color: '#888', fontSize: 12 }}>
            提示：点击左侧面板切换功能
          </span>
        </div>
      </div>

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
              <FileDown size={14} /> 材料附件
            </button>
            <button
              className={`sidebar-tab ${sidebarTab === 'views' ? 'active' : ''}`}
              onClick={() => setSidebarTab('views')}
            >
              <Layers size={14} /> 视图控制
            </button>
          </div>

          <div className="sidebar-content">
            {sidebarTab === 'analysis' && (
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

            {sidebarTab === 'views' && (
              <ViewControls
                visibleLayers={visibleLayers}
                onToggleLayer={handleToggleLayer}
                viewStates={savedViews}
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
          </div>
        </main>
      </div>
    </div>
  );
}
