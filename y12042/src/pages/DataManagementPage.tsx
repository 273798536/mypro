import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, Database, AlertCircle, CheckCircle, Trash2, Eye, Filter, Download, FileSpreadsheet } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { cn } from '../lib/utils';
import { sampleFaultCardCSV, samplePowerMeterCSV, sampleBadRowCSV } from '../data/sampleFaults';
import { formatBadRowsForDisplay, getErrorTypeLabel, getErrorTypeColor, exportToCSV } from '../utils/csvParser';
import { getAnomalyTypeLabel, getAnomalyStats, groupAnomaliesByType } from '../utils/anomalyFilter';
import type { DataSource, BadRow, AnomalyType } from '../engine/types';

export const DataManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importSource, setImportSource] = useState<DataSource>('fault_card');
  const [activeTab, setActiveTab] = useState<'import' | 'bad_rows' | 'anomalies'>('import');
  const [anomalyFilter, setAnomalyFilter] = useState<AnomalyType | 'all'>('all');
  const [importResult, setImportResult] = useState<{ validRows: number; badRows: number; sourceName: string } | null>(null);

  const {
    importedData,
    badRows,
    gameState,
    importData,
    loadSampleData,
    clearImportedData,
    markAsReviewed,
    getFilteredAnomalies,
  } = useGameStore();

  const badRowGroups = useMemo(() => formatBadRowsForDisplay(badRows), [badRows]);
  const anomalyStats = useMemo(() => getAnomalyStats(gameState.anomalies), [gameState.anomalies]);

  const filteredAnomalies = useMemo(() => {
    if (anomalyFilter === 'all') return gameState.anomalies;
    return getFilteredAnomalies(anomalyFilter);
  }, [anomalyFilter, gameState.anomalies, getFilteredAnomalies]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportFile = async (file: File) => {
    try {
      const result = await importData(file, importSource);
      setImportResult({
        validRows: result.validRows.length,
        badRows: result.badRows.length,
        sourceName: file.name,
      });
      setTimeout(() => setImportResult(null), 3000);
    } catch (e) {
      console.error('Import failed:', e);
    }
  };

  const handleLoadSample = (type: 'fault_card' | 'power_meter' | 'bad_rows') => {
    let content = '';
    let source: DataSource = 'fault_card';
    
    switch (type) {
      case 'fault_card':
        content = sampleFaultCardCSV;
        source = 'fault_card';
        break;
      case 'power_meter':
        content = samplePowerMeterCSV;
        source = 'power_meter';
        break;
      case 'bad_rows':
        content = sampleBadRowCSV;
        source = 'fault_card';
        break;
    }
    
    const result = loadSampleData(source, content);
    setImportResult({
      validRows: result.validRows.length,
      badRows: result.badRows.length,
      sourceName: '示例数据',
    });
    setTimeout(() => setImportResult(null), 3000);
  };

  const handleExportBadRows = () => {
    if (badRows.length === 0) return;
    
    const exportData = badRows.map(row => ({
      row_index: row.rowIndex,
      error_type: getErrorTypeLabel(row.errorType),
      source: row.source,
      description: row.description,
      raw_content: row.rawContent,
    }));
    
    exportToCSV(exportData, `bad_rows_report_${Date.now()}.csv`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      handleImportFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-circuit-bg text-text-primary relative overflow-hidden py-8">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(77, 166, 255, 0.4) 1px, transparent 1px),
              linear-gradient(90deg, rgba(77, 166, 255, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-circuit-border bg-circuit-card/50 text-text-secondary hover:border-power-blue hover:text-power-blue transition-all font-mono text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            返回主菜单
          </button>

          <h1 className="font-display text-2xl">数据管理</h1>

          <div className="w-24" />
        </div>

        {importResult && (
          <div className="mb-6 p-4 bg-success-green/10 border border-success-green/50 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-success-green" />
              <span className="font-mono text-sm">
                导入成功: {importResult.sourceName} - 有效数据 {importResult.validRows} 行, 坏行 {importResult.badRows} 行
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('import')}
            className={cn(
              'px-4 py-2 rounded-lg font-mono text-sm transition-all flex items-center gap-2',
              activeTab === 'import'
                ? 'bg-power-blue/20 border border-power-blue/50 text-power-blue'
                : 'bg-circuit-card/50 border border-circuit-border text-text-secondary hover:text-power-blue'
            )}
          >
            <Upload className="w-4 h-4" />
            数据导入
          </button>
          <button
            onClick={() => setActiveTab('bad_rows')}
            className={cn(
              'px-4 py-2 rounded-lg font-mono text-sm transition-all flex items-center gap-2',
              activeTab === 'bad_rows'
                ? 'bg-warning-amber/20 border border-warning-amber/50 text-warning-amber'
                : 'bg-circuit-card/50 border border-circuit-border text-text-secondary hover:text-warning-amber'
            )}
          >
            <AlertCircle className="w-4 h-4" />
            坏行列表
            {badRows.length > 0 && (
              <span className="bg-warning-amber/30 px-1.5 py-0.5 rounded text-xs">
                {badRows.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('anomalies')}
            className={cn(
              'px-4 py-2 rounded-lg font-mono text-sm transition-all flex items-center gap-2',
              activeTab === 'anomalies'
                ? 'bg-danger-red/20 border border-danger-red/50 text-danger-red'
                : 'bg-circuit-card/50 border border-circuit-border text-text-secondary hover:text-danger-red'
            )}
          >
            <Database className="w-4 h-4" />
            异常记录
            {anomalyStats.unreviewed > 0 && (
              <span className="bg-danger-red/30 px-1.5 py-0.5 rounded text-xs">
                {anomalyStats.unreviewed}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'import' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-circuit-card/80 rounded-2xl border border-circuit-border p-6 backdrop-blur-sm">
              <h3 className="font-display text-lg mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-power-blue" />
                导入数据
              </h3>

              <div className="mb-4">
                <label className="text-xs text-text-secondary font-mono mb-2 block">选择数据源类型</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setImportSource('fault_card')}
                    className={cn(
                      'flex-1 py-2 px-4 rounded-lg border font-mono text-sm transition-all',
                      importSource === 'fault_card'
                        ? 'bg-power-blue/20 border-power-blue text-power-blue'
                        : 'bg-circuit-dark/50 border-circuit-border text-text-secondary hover:border-power-blue/50'
                    )}
                  >
                    故障卡
                  </button>
                  <button
                    onClick={() => setImportSource('power_meter')}
                    className={cn(
                      'flex-1 py-2 px-4 rounded-lg border font-mono text-sm transition-all',
                      importSource === 'power_meter'
                        ? 'bg-success-green/20 border-success-green text-success-green'
                        : 'bg-circuit-dark/50 border-circuit-border text-text-secondary hover:border-success-green/50'
                    )}
                  >
                    电量表
                  </button>
                </div>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-circuit-border rounded-xl p-8 text-center cursor-pointer hover:border-power-blue/50 transition-all group"
              >
                <Upload className="w-12 h-12 mx-auto mb-3 text-text-muted group-hover:text-power-blue transition-colors" />
                <p className="text-text-secondary font-mono mb-1">点击或拖拽CSV文件到此处</p>
                <p className="text-xs text-text-muted font-mono">
                  支持故障卡和电量表格式
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div className="mt-4">
                <p className="text-xs text-text-secondary font-mono mb-2">或加载示例数据:</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleLoadSample('fault_card')}
                    className="py-2 px-3 rounded-lg bg-circuit-dark/50 border border-circuit-border text-text-secondary hover:border-power-blue hover:text-power-blue transition-all font-mono text-xs"
                  >
                    故障卡示例
                  </button>
                  <button
                    onClick={() => handleLoadSample('power_meter')}
                    className="py-2 px-3 rounded-lg bg-circuit-dark/50 border border-circuit-border text-text-secondary hover:border-success-green hover:text-success-green transition-all font-mono text-xs"
                  >
                    电量表示例
                  </button>
                  <button
                    onClick={() => handleLoadSample('bad_rows')}
                    className="py-2 px-3 rounded-lg bg-circuit-dark/50 border border-circuit-border text-text-secondary hover:border-warning-amber hover:text-warning-amber transition-all font-mono text-xs"
                  >
                    坏行示例
                  </button>
                </div>
              </div>

              {(importedData.faultCards || importedData.powerMeters) && (
                <div className="mt-6 pt-4 border-t border-circuit-border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-display text-sm text-text-primary">已导入数据</h4>
                    <button
                      onClick={clearImportedData}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-mono text-danger-red hover:bg-danger-red/10 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      清空
                    </button>
                  </div>
                  
                  {importedData.faultCards && (
                    <div className="bg-circuit-dark/50 rounded-lg p-3 mb-2 border border-circuit-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-text-secondary">故障卡数据</span>
                        <span className="text-xs font-mono text-power-blue">
                          {importedData.faultCards.validRows.length} 有效行
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {importedData.powerMeters && (
                    <div className="bg-circuit-dark/50 rounded-lg p-3 border border-circuit-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-text-secondary">电量表数据</span>
                        <span className="text-xs font-mono text-success-green">
                          {importedData.powerMeters.validRows.length} 有效行
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-circuit-card/80 rounded-2xl border border-circuit-border p-6 backdrop-blur-sm">
              <h3 className="font-display text-lg mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-warning-amber" />
                数据格式说明
              </h3>

              <div className="space-y-4">
                <div className="bg-circuit-dark/50 rounded-lg p-4 border border-circuit-border">
                  <h4 className="font-mono text-sm text-power-blue mb-2">故障卡格式 (.csv)</h4>
                  <div className="text-xs text-text-secondary font-mono space-y-1">
                    <p>表头: <span className="text-text-primary">id,x,y,fault_type,severity,source</span></p>
                    <p className="text-text-muted mt-2">列说明:</p>
                    <ul className="list-disc list-inside text-text-muted space-y-0.5">
                      <li>id: 故障唯一标识</li>
                      <li>x, y: 网格坐标</li>
                      <li>fault_type: wire_damage/connection_loss/overload/insulation_failure</li>
                      <li>severity: low/medium/high</li>
                      <li>source: 数据来源</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-circuit-dark/50 rounded-lg p-4 border border-circuit-border">
                  <h4 className="font-mono text-sm text-success-green mb-2">电量表格式 (.csv)</h4>
                  <div className="text-xs text-text-secondary font-mono space-y-1">
                    <p>表头: <span className="text-text-primary">node_id,timestamp,power_voltage,power_current,consumption,source</span></p>
                    <p className="text-text-muted mt-2">列说明:</p>
                    <ul className="list-disc list-inside text-text-muted space-y-0.5">
                      <li>node_id: 节点ID</li>
                      <li>timestamp: 时间戳 (秒)</li>
                      <li>power_voltage: 电压 (V)</li>
                      <li>power_current: 电流 (A)</li>
                      <li>consumption: 功耗 (W)</li>
                      <li>source: 数据来源</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-warning-amber/10 rounded-lg p-4 border border-warning-amber/30">
                  <h4 className="font-mono text-sm text-warning-amber mb-2">⚠️ 注意事项</h4>
                  <ul className="text-xs text-text-secondary font-mono space-y-1 list-disc list-inside">
                    <li>空行会被自动识别并标记为坏行</li>
                    <li>#开头的行会被识别为备注行</li>
                    <li>列数不足或数据格式错误会被标记为坏行</li>
                    <li>坏行会单独列出，不会混入正常数据</li>
                    <li>短路扩散结果会单独存储，可在异常记录中筛选</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bad_rows' && (
          <div className="bg-circuit-card/80 rounded-2xl border border-circuit-border p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-warning-amber" />
                坏行列表
                <span className="text-xs text-text-muted font-mono ml-2">
                  共 {badRows.length} 条
                </span>
              </h3>
              {badRows.length > 0 && (
                <button
                  onClick={handleExportBadRows}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-power-blue/20 border border-power-blue/50 text-power-blue font-mono text-xs hover:bg-power-blue/30 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  导出坏行报告
                </button>
              )}
            </div>

            {badRows.length > 0 ? (
              <div className="space-y-4">
                {(Object.keys(badRowGroups) as (keyof typeof badRowGroups)[]).map(groupKey => {
                  const group = badRowGroups[groupKey];
                  if (group.length === 0) return null;
                  
                  const labels: Record<string, string> = {
                    empty: '空行',
                    comment: '备注行',
                    missingColumns: '缺列行',
                    invalidData: '数据无效行',
                  };
                  
                  const colors: Record<string, string> = {
                    empty: 'text-text-muted',
                    comment: 'text-text-secondary',
                    missingColumns: 'text-warning-amber',
                    invalidData: 'text-danger-red',
                  };

                  return (
                    <div key={groupKey}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn('font-mono text-sm', colors[groupKey])}>
                          {labels[groupKey]}
                        </span>
                        <span className="text-xs text-text-muted font-mono">
                          ({group.length} 条)
                        </span>
                      </div>
                      <div className="bg-circuit-dark/50 rounded-lg border border-circuit-border overflow-hidden">
                        <div className="max-h-60 overflow-y-auto">
                          {group.map((row, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 p-3 border-b border-circuit-border/50 last:border-b-0 hover:bg-circuit-dark/30 transition-colors"
                            >
                              <span className="text-xs font-mono text-text-muted min-w-[60px]">
                                第 {row.rowIndex} 行
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-mono text-text-primary truncate">
                                  {row.rawContent || '(空行)'}
                                </p>
                                <p className="text-xs text-text-muted font-mono mt-0.5">
                                  {row.description}
                                  {row.source !== 'unknown' && ` (来源: ${row.source})`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-text-secondary">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success-green" />
                <p className="font-mono">暂无坏行记录</p>
                <p className="text-xs text-text-muted font-mono mt-1">
                  导入包含空行、备注或格式错误的数据后，坏行会显示在这里
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'anomalies' && (
          <div className="bg-circuit-card/80 rounded-2xl border border-circuit-border p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-danger-red" />
                异常记录
                <span className="text-xs text-text-muted font-mono ml-2">
                  {anomalyStats.unreviewed} 条待复核 / 共 {anomalyStats.total} 条
                </span>
              </h3>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-text-muted" />
                <div className="flex gap-1">
                  <button
                    onClick={() => setAnomalyFilter('all')}
                    className={cn(
                      'px-2 py-1 rounded text-xs font-mono transition-all',
                      anomalyFilter === 'all'
                        ? 'bg-power-blue/20 text-power-blue border border-power-blue/50'
                        : 'text-text-secondary hover:text-power-blue'
                    )}
                  >
                    全部 ({anomalyStats.total})
                  </button>
                  <button
                    onClick={() => setAnomalyFilter('short_circuit')}
                    className={cn(
                      'px-2 py-1 rounded text-xs font-mono transition-all',
                      anomalyFilter === 'short_circuit'
                        ? 'bg-danger-red/20 text-danger-red border border-danger-red/50'
                        : 'text-text-secondary hover:text-danger-red'
                    )}
                  >
                    短路 ({anomalyStats.shortCircuit})
                  </button>
                  <button
                    onClick={() => setAnomalyFilter('low_power')}
                    className={cn(
                      'px-2 py-1 rounded text-xs font-mono transition-all',
                      anomalyFilter === 'low_power'
                        ? 'bg-warning-amber/20 text-warning-amber border border-warning-amber/50'
                        : 'text-text-secondary hover:text-warning-amber'
                    )}
                  >
                    电量 ({anomalyStats.lowPower})
                  </button>
                  <button
                    onClick={() => setAnomalyFilter('path_blocked')}
                    className={cn(
                      'px-2 py-1 rounded text-xs font-mono transition-all',
                      anomalyFilter === 'path_blocked'
                        ? 'bg-warning-amber/20 text-warning-amber border border-warning-amber/50'
                        : 'text-text-secondary hover:text-warning-amber'
                    )}
                  >
                    堵塞 ({anomalyStats.pathBlocked})
                  </button>
                </div>
              </div>
            </div>

            {filteredAnomalies.length > 0 ? (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredAnomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-lg border transition-all',
                      anomaly.isReviewed
                        ? 'bg-circuit-dark/30 border-circuit-border/50 opacity-60'
                        : 'bg-circuit-dark/50 border-circuit-border hover:border-power-blue/50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className={cn(
                        'text-xs px-2 py-1 rounded font-mono whitespace-nowrap',
                        anomaly.type === 'short_circuit'
                          ? 'bg-danger-red/20 text-danger-red'
                          : 'bg-warning-amber/20 text-warning-amber'
                      )}>
                        {getAnomalyTypeLabel(anomaly.type)}
                      </span>
                      <div>
                        <p className="text-sm text-text-primary">{anomaly.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-text-muted font-mono">
                            时间: {formatTime(anomaly.timestamp)}
                          </span>
                          <span className="text-xs text-text-muted font-mono">
                            来源: {anomaly.source === 'game' ? '游戏生成' : '数据导入'}
                          </span>
                          <span className="text-xs text-text-muted font-mono">
                            影响单元: {anomaly.cellIds.join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!anomaly.isReviewed ? (
                        <button
                          onClick={() => markAsReviewed(anomaly.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-green/20 border border-success-green/50 text-success-green font-mono text-xs hover:bg-success-green/30 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          标记已复核
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-mono text-success-green">
                          <CheckCircle className="w-3.5 h-3.5" />
                          已复核
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-text-secondary">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success-green" />
                <p className="font-mono">暂无异常记录</p>
                <p className="text-xs text-text-muted font-mono mt-1">
                  游戏中发生的短路、电量不足、路径堵塞等异常会显示在这里
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
