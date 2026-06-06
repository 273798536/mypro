import { useState, useMemo } from 'react';
import { Download, BarChart3, Map, FileText, Wrench, Upload, RotateCcw, ChevronDown, Info } from 'lucide-react';
import Papa from 'papaparse';
import StatsCards from './components/StatsCards';
import BoundaryTable from './components/BoundaryTable';
import BoundaryMap from './components/BoundaryMap';
import { StatusChart, MatchRateChart } from './components/Charts';
import DetailModal from './components/DetailModal';
import EquipmentPanel from './components/EquipmentPanel';
import { boundaryRecords as defaultRecords, equipmentList, getStatusStats, getStatusChartData, getMatchRateChartData } from './data/sampleData';
import { performHitDetection, calculateArea, validateRecord } from './utils/hitDetection';
import { exportToCSV, exportReport, exportSummaryText } from './utils/exportUtils';

const parseCoordString = (str) => {
  if (!str || str === 'null' || str.trim() === '') return null;
  try {
    const cleaned = str.replace(/[\[\]\s]/g, '');
    const parts = cleaned.split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts;
    }
    return null;
  } catch {
    return null;
  }
};

const processImportedRow = (row, index) => {
  const rowNumber = parseInt(row['行号'] || row['rowNumber'] || index + 1, 10);
  const fieldName = row['地块名称'] || row['fieldName'] || `未命名地块_${rowNumber}`;
  const sourceFile = row['来源文件'] || row['sourceFile'] || '';
  const imageName = row['图片文件名'] || row['imageName'] || row['图片名'] || '';
  const sourceNote = row['来源备注'] || row['sourceNote'] || '';
  const operator = row['操作人'] || row['operator'] || '';
  const createdAt = row['检测时间'] || row['createdAt'] || row['时间'] || new Date().toLocaleString('zh-CN');
  const remarks = row['备注'] || row['remarks'] || '';
  const areaRaw = row['面积(亩)'] || row['area'];
  const area = areaRaw ? parseFloat(areaRaw) : null;

  const coordinates = {
    bottomLeft: parseCoordString(row['底图坐标(左下)'] || row['底图坐标_左下'] || row['base_bottomLeft']),
    bottomRight: parseCoordString(row['底图坐标(右下)'] || row['底图坐标_右下'] || row['base_bottomRight']),
    topLeft: parseCoordString(row['底图坐标(左上)'] || row['底图坐标_左上'] || row['base_topLeft']),
    topRight: parseCoordString(row['底图坐标(右上)'] || row['底图坐标_右上'] || row['base_topRight'])
  };

  const labelCoordinates = {
    bottomLeft: parseCoordString(row['标注坐标(左下)'] || row['标注坐标_左下'] || row['label_bottomLeft']),
    bottomRight: parseCoordString(row['标注坐标(右下)'] || row['标注坐标_右下'] || row['label_bottomRight']),
    topLeft: parseCoordString(row['标注坐标(左上)'] || row['标注坐标_左上'] || row['label_topLeft']),
    topRight: parseCoordString(row['标注坐标(右上)'] || row['标注坐标_右上'] || row['label_topRight'])
  };

  const hitDetection = performHitDetection(coordinates, labelCoordinates);
  const calculatedArea = area && !isNaN(area) ? area : calculateArea(coordinates);
  const validation = validateRecord({ rowNumber, fieldName, sourceFile, coordinates, labelCoordinates });

  return {
    id: `IMP_${Date.now()}_${index}`,
    rowNumber,
    fieldName,
    sourceFile,
    imageName,
    sourceNote,
    coordinates,
    labelCoordinates,
    createdAt,
    operator,
    remarks,
    hitDetection,
    area: calculatedArea,
    unit: '亩',
    status: hitDetection.status,
    validation
  };
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [records, setRecords] = useState(defaultRecords);
  const [highlightedRowId, setHighlightedRowId] = useState(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [importMessage, setImportMessage] = useState(null);

  const stats = useMemo(() => getStatusStats(records), [records]);
  const statusChartData = useMemo(() => getStatusChartData(records), [records]);
  const matchRateChartData = useMemo(() => getMatchRateChartData(records), [records]);

  const handleLocateOnMap = (record) => {
    setSelectedRecord(record);
    setActiveTab('map');
    setHighlightedRowId(record.id);
    setTimeout(() => setHighlightedRowId(null), 2000);
  };

  const handleRowClick = (record) => {
    setSelectedRecord(record);
    setHighlightedRowId(record.id);
    setTimeout(() => setHighlightedRowId(null), 2000);
  };

  const handleExportCSV = () => {
    exportToCSV(records);
    setExportMenuOpen(false);
  };

  const handleExportReport = () => {
    exportReport(records);
    exportSummaryText(records);
    setExportMenuOpen(false);
  };

  const handleResetData = () => {
    setRecords(defaultRecords);
    setImportMessage({ type: 'success', text: '已恢复为内置样例数据' });
    setTimeout(() => setImportMessage(null), 3000);
  };

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const imported = results.data
            .filter(row => Object.values(row).some(v => v && String(v).trim() !== ''))
            .map((row, idx) => processImportedRow(row, idx));

          if (imported.length === 0) {
            setImportMessage({ type: 'error', text: '未解析到有效数据，请检查 CSV 格式' });
          } else {
            setRecords(imported);
            setImportMessage({ type: 'success', text: `成功导入 ${imported.length} 条记录` });
          }
        } catch (err) {
          setImportMessage({ type: 'error', text: `导入失败：${err.message}` });
        }
        setTimeout(() => setImportMessage(null), 4000);
      },
      error: (err) => {
        setImportMessage({ type: 'error', text: `CSV 解析错误：${err.message}` });
        setTimeout(() => setImportMessage(null), 4000);
      }
    });

    e.target.value = '';
  };

  const handleStatCardClick = (status) => {
    setActiveTab('detail');
  };

  const handleChartSegmentClick = (status) => {
    const statusMap = {
      '顺利通过': 'success',
      '待确认': 'pending',
      '数据异常': 'error'
    };
    if (statusMap[status]) {
      setActiveTab('detail');
    }
  };

  const tabs = [
    { id: 'dashboard', label: '概览看板', icon: BarChart3 },
    { id: 'detail', label: '检测明细', icon: FileText },
    { id: 'map', label: '地图查看', icon: Map },
    { id: 'equipment', label: '设备清单', icon: Wrench }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div>
            <div className="student-legend">
              <div className="legend-title">
                <Info size={14} />
                <span>学生查看说明</span>
              </div>
              <div className="legend-items">
                <span className="student-hint success">🟢 绿色：顺利通过，可直接使用</span>
                <span className="student-hint pending">🟠 橙色：待确认，需找康复训练师复核</span>
                <span className="student-hint error">🔴 红色：数据异常，不可用</span>
              </div>
            </div>

            <StatsCards stats={stats} onCardClick={handleStatCardClick} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <StatusChart data={statusChartData} onSegmentClick={handleChartSegmentClick} />
              <MatchRateChart data={matchRateChartData} />
            </div>
            <BoundaryTable
              records={records}
              onViewDetail={setSelectedRecord}
              onRowClick={handleRowClick}
              highlightedRowId={highlightedRowId}
            />
          </div>
        );
      case 'detail':
        return (
          <div>
            <BoundaryTable
              records={records}
              onViewDetail={setSelectedRecord}
              onRowClick={handleRowClick}
              highlightedRowId={highlightedRowId}
            />
          </div>
        );
      case 'map':
        return (
          <div>
            <BoundaryMap
              record={selectedRecord}
              allRecords={records}
              onSelectRecord={setSelectedRecord}
            />
            {selectedRecord && (
              <button className="btn btn-secondary" onClick={() => { setSelectedRecord(null); }} style={{ marginTop: '1rem' }}>
                返回全部视图
              </button>
            )}
            {!selectedRecord && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0fdf4', borderRadius: '6px', color: '#166534', fontSize: '0.875rem' }}>
                💡 提示：在"检测明细"中点击某条记录的"详情"，再点击弹窗中的"在地图上查看"，可定位到具体地块并缩放查看底图与标注边界差异。
              </div>
            )}
          </div>
        );
      case 'equipment':
        return <EquipmentPanel equipment={equipmentList} />;
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div>
          <h1>农田地块边界修补系统</h1>
          <p>命中检测与导出复盘 —— 底图坐标 × 标注草稿 冲突比对</p>
        </div>
        <div className="header-actions">
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            <Upload size={16} />
            导入 CSV
            <input
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileImport}
            />
          </label>
          <button className="btn btn-secondary" onClick={handleResetData} title="恢复内置样例数据">
            <RotateCcw size={16} />
            重置数据
          </button>
        </div>
      </header>

      {importMessage && (
        <div className={`import-message ${importMessage.type}`}>
          {importMessage.text}
        </div>
      )}

      <main className="main-content">
        <div className="tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} style={{ marginRight: '0.5rem' }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-end" style={{ marginBottom: '1rem', position: 'relative' }}>
          <div className="export-dropdown">
            <button className="btn btn-secondary" onClick={() => setExportMenuOpen(!exportMenuOpen)}>
              <Download size={16} />
              导出数据
              <ChevronDown size={14} />
            </button>
            {exportMenuOpen && (
              <div className="export-menu">
                <button className="export-menu-item" onClick={handleExportCSV}>
                  <FileText size={14} />
                  导出完整 CSV（含检测结果）
                </button>
                <div className="export-menu-divider" />
                <button className="export-menu-item" onClick={handleExportReport}>
                  <FileText size={14} />
                  导出复盘报告（JSON + TXT）
                </button>
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={handleExportReport}>
            <Download size={16} />
            一键导出复盘
          </button>
        </div>

        {renderContent()}
      </main>

      {selectedRecord && (
        <DetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onLocateOnMap={handleLocateOnMap}
        />
      )}
    </div>
  );
}

export default App;
