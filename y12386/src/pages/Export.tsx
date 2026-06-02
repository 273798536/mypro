import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileDown, FileSpreadsheet, FileText, Check, Filter, Music, Truck, MapPin, Link2, Calendar, Eye, Download } from 'lucide-react';
import useAppStore from '@/store/useAppStore';
import { exportToExcel, exportToPDF, downloadExport } from '@/utils/exporter';
import { formatDateTime } from '@/utils/dataMapper';
import type { ExportBatch, ExportConfig } from '@/store/types';

const Export = () => {
  const navigate = useNavigate();
  const { instruments, transports, citySchedules, traceRecords, photos, exportBatches, createExportBatch, getConflictsByInstrumentId, getTransportByInstrumentId, getScheduleByInstrumentId } = useAppStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [includeConflicts, setIncludeConflicts] = useState(true);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === instruments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(instruments.map(i => i.id));
    }
  };

  const handleExport = async () => {
    if (selectedIds.length === 0) {
      alert('请至少选择一项乐器');
      return;
    }

    setIsExporting(true);
    try {
      const batch = createExportBatch(selectedIds, {
        includeConflicts,
        includePhotos,
        format: exportFormat,
      });

      const selectedInstruments = instruments.filter(i => selectedIds.includes(i.id));
      const selectedTransports = transports.filter(t => selectedIds.includes(t.instrumentId));
      const selectedSchedules = citySchedules.filter(s => selectedIds.includes(s.instrumentId));
      const selectedTraces = traceRecords.filter(t => selectedIds.includes(t.instrumentId));
      const selectedPhotos = photos.filter(p => selectedIds.includes(p.instrumentId));

      const config: ExportConfig = {
        name: batch.name,
        format: batch.format,
        includeConflicts,
        includePhotos,
        filters: {},
      };

      let blob: Blob;
      if (exportFormat === 'excel') {
        blob = exportToExcel(
          selectedInstruments,
          selectedTransports,
          selectedSchedules,
          selectedTraces,
          selectedPhotos,
          config,
          batch.id,
          batch.exportTime
        );
      } else {
        blob = exportToPDF(
          selectedInstruments,
          selectedTransports,
          selectedSchedules,
          selectedTraces,
          config,
          batch.id,
          batch.exportTime
        );
      }

      downloadExport(blob, batch.name, batch.format);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const handleReExport = (batch: ExportBatch) => {
    const selectedInstruments = instruments.filter(i => batch.itemIds.includes(i.id));
    const selectedTransports = transports.filter(t => batch.itemIds.includes(t.instrumentId));
    const selectedSchedules = citySchedules.filter(s => batch.itemIds.includes(s.instrumentId));
    const selectedTraces = traceRecords.filter(t => batch.itemIds.includes(t.instrumentId));
    const selectedPhotos = photos.filter(p => batch.itemIds.includes(p.instrumentId));

    const config: ExportConfig = {
      name: batch.name,
      format: batch.format,
      includeConflicts: batch.options.includeConflicts,
      includePhotos: batch.options.includePhotos,
      filters: {},
    };

    let blob: Blob;
    if (batch.format === 'EXCEL') {
      blob = exportToExcel(
        selectedInstruments,
        selectedTransports,
        selectedSchedules,
        selectedTraces,
        selectedPhotos,
        config,
        batch.id,
        batch.exportTime
      );
    } else {
      blob = exportToPDF(
        selectedInstruments,
        selectedTransports,
        selectedSchedules,
        selectedTraces,
        config,
        batch.id,
        batch.exportTime
      );
    }

    downloadExport(blob, batch.name, batch.format);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-midnight-100 flex items-center gap-3">
          <div className="w-10 h-10 gold-gradient rounded-btn flex items-center justify-center">
            <FileDown className="w-5 h-5 text-white" />
          </div>
          导出清单
        </h1>
        <p className="text-midnight-400 mt-1">
          选择乐器导出完整清单，包含三者对应关系和冲突记录，用于复盘和复核
        </p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="xl:col-span-2 space-y-4"
        >
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="title-section mb-0 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                选择导出内容
              </h3>
              <button
                onClick={selectAll}
                className="text-sm text-amber-gold-400 hover:text-amber-gold-300"
              >
                {selectedIds.length === instruments.length ? '取消全选' : '全选'}
              </button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {instruments.map((instrument, index) => {
                const conflicts = getConflictsByInstrumentId(instrument.id);
                const transport = getTransportByInstrumentId(instrument.id);
                const schedule = getScheduleByInstrumentId(instrument.id);
                const isSelected = selectedIds.includes(instrument.id);
                const hasCritical = conflicts.some(c => c.severity === 'CRITICAL');

                return (
                  <motion.div
                    key={instrument.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => toggleSelect(instrument.id)}
                    className={`flex items-center gap-4 p-3 rounded-btn cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-gold-500/10 border border-amber-gold-500/50'
                        : 'bg-midnight-800/50 border border-midnight-700 hover:bg-midnight-700/50'
                    } ${hasCritical ? 'animate-pulse-red' : ''}`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? 'bg-amber-gold-500 border-amber-gold-500'
                        : 'border-midnight-500'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-amber-gold-400 flex-shrink-0" />
                        <span className="font-medium text-midnight-100">{instrument.name}</span>
                        {conflicts.length > 0 && (
                          <span className="badge-danger text-xs">{conflicts.length}冲突</span>
                        )}
                      </div>
                      <p className="text-xs text-midnight-400 mt-0.5">
                        {instrument.owner} · {instrument.serialNumber}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-1 text-xs">
                        <Truck className={`w-3 h-3 ${transport ? 'text-blue-400' : 'text-midnight-600'}`} />
                        <span className={transport ? 'text-blue-400' : 'text-midnight-600'}>
                          {transport ? transport.boxNumber : '无'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <MapPin className={`w-3 h-3 ${schedule ? 'text-purple-400' : 'text-midnight-600'}`} />
                        <span className={schedule ? 'text-purple-400' : 'text-midnight-600'}>
                          {schedule ? schedule.city : '无'}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/detail/${instrument.id}`);
                        }}
                        className="p-1.5 hover:bg-midnight-600 rounded transition-colors"
                      >
                        <Eye className="w-4 h-4 text-midnight-400" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="title-section mb-4 flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              导出说明
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-amber-gold-500/10 rounded-btn border border-amber-gold-500/30">
                <Music className="w-5 h-5 text-amber-gold-400 mb-2" />
                <p className="font-medium text-midnight-100 mb-1">乐器清单</p>
                <p className="text-xs text-midnight-400">完整的乐器主信息，包含ID用于复核</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-btn border border-blue-500/30">
                <Truck className="w-5 h-5 text-blue-400 mb-2" />
                <p className="font-medium text-midnight-100 mb-1">运输单</p>
                <p className="text-xs text-midnight-400">物流运输信息，包含箱号、保单号</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-btn border border-purple-500/30">
                <MapPin className="w-5 h-5 text-purple-400 mb-2" />
                <p className="font-medium text-midnight-100 mb-1">城市日程</p>
                <p className="text-xs text-midnight-400">演出日程安排，包含城市、时间</p>
              </div>
            </div>
            <p className="text-xs text-midnight-500 mt-4">
              导出时会自动冗余存储三者ID和完整数据快照，确保后续复核时可以追溯完整链路
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="card p-6 sticky top-6">
            <h3 className="title-section mb-6">导出配置</h3>

            <div className="mb-6">
              <p className="text-sm text-midnight-300 mb-3">导出格式</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setExportFormat('excel')}
                  className={`p-4 rounded-btn border-2 transition-all ${
                    exportFormat === 'excel'
                      ? 'border-amber-gold-500 bg-amber-gold-500/10'
                      : 'border-midnight-600 hover:border-midnight-500'
                  }`}
                >
                  <FileSpreadsheet className={`w-8 h-8 mx-auto mb-2 ${
                    exportFormat === 'excel' ? 'text-amber-gold-400' : 'text-midnight-400'
                  }`} />
                  <p className={`text-sm font-medium ${
                    exportFormat === 'excel' ? 'text-amber-gold-400' : 'text-midnight-300'
                  }`}>
                    Excel
                  </p>
                </button>
                <button
                  onClick={() => setExportFormat('pdf')}
                  className={`p-4 rounded-btn border-2 transition-all ${
                    exportFormat === 'pdf'
                      ? 'border-amber-gold-500 bg-amber-gold-500/10'
                      : 'border-midnight-600 hover:border-midnight-500'
                  }`}
                >
                  <FileText className={`w-8 h-8 mx-auto mb-2 ${
                    exportFormat === 'pdf' ? 'text-amber-gold-400' : 'text-midnight-400'
                  }`} />
                  <p className={`text-sm font-medium ${
                    exportFormat === 'pdf' ? 'text-amber-gold-400' : 'text-midnight-300'
                  }`}>
                    PDF
                  </p>
                </button>
              </div>
            </div>

            <div className="mb-6 space-y-3">
              <p className="text-sm text-midnight-300 mb-3">导出选项</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeConflicts}
                  onChange={(e) => setIncludeConflicts(e.target.checked)}
                  className="w-4 h-4 rounded border-midnight-600 bg-midnight-800 text-amber-gold-500 focus:ring-amber-gold-500"
                />
                <span className="text-sm text-midnight-200">包含冲突记录和留痕</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePhotos}
                  onChange={(e) => setIncludePhotos(e.target.checked)}
                  className="w-4 h-4 rounded border-midnight-600 bg-midnight-800 text-amber-gold-500 focus:ring-amber-gold-500"
                />
                <span className="text-sm text-midnight-200">包含照片留痕信息</span>
              </label>
            </div>

            <div className="mb-6 p-4 bg-midnight-700/50 rounded-btn">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-midnight-400">已选择</span>
                <span className="text-midnight-100 font-medium">{selectedIds.length} 项</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-midnight-400">预计导出</span>
                <span className="text-midnight-100 font-medium">
                  {exportFormat === 'excel' ? 'Excel 工作簿' : 'PDF 文档'}
                </span>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={selectedIds.length === 0 || isExporting}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  正在导出...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  导出 {selectedIds.length} 项清单
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {exportBatches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <h3 className="title-section mb-6 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            导出历史记录
          </h3>

          <div className="space-y-3">
            {exportBatches.slice(0, 5).map((batch, index) => (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                className="flex items-center justify-between p-4 bg-midnight-800/50 rounded-btn hover:bg-midnight-700/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-btn flex items-center justify-center ${
                    batch.format === 'EXCEL' ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    {batch.format === 'EXCEL' ? (
                      <FileSpreadsheet className="w-5 h-5 text-green-400" />
                    ) : (
                      <FileText className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-midnight-100">{batch.name}</p>
                    <p className="text-xs text-midnight-400">
                      {formatDateTime(batch.exportTime)} · {batch.itemCount} 项
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-midnight-500">
                        乐器ID: {batch.itemIds.slice(0, 3).join(', ')}
                        {batch.itemIds.length > 3 && '...'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleReExport(batch)}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  重新导出
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Export;
