import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Table2, 
  PlusCircle, 
  Save, 
  AlertCircle,
  CheckCircle2,
  Upload,
  FileText,
  Database,
  Tag,
  MessageSquare,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { TimeSeriesPoint } from '../types';
import { cn } from '../lib/utils';

type TabType = 'metric' | 'group' | 'note' | 'batch';

export default function DataEntry() {
  const navigate = useNavigate();
  const { records, addRecord, updateGroupField, updateEventNote, batchAddRecords } = useAnalysisStore();
  
  const [activeTab, setActiveTab] = useState<TabType>('metric');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [metricForm, setMetricForm] = useState({
    metricA: '',
    metricB: '',
    dataSource: '',
    timeSeriesText: '',
    sampleSize: 0,
  });
  
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [groupField, setGroupField] = useState('');
  const [eventNote, setEventNote] = useState('');
  
  const [batchText, setBatchText] = useState('');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  const showMessage = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      setSuccessMessage(message);
      setErrorMessage(null);
    } else {
      setErrorMessage(message);
      setSuccessMessage(null);
    }
    setTimeout(() => {
      setSuccessMessage(null);
      setErrorMessage(null);
    }, 3000);
  };

  const parseTimeSeries = (text: string): TimeSeriesPoint[] => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const data: TimeSeriesPoint[] = [];
    
    for (const line of lines) {
      const parts = line.split(/[,，\t\s]+/).map(p => p.trim());
      if (parts.length >= 3) {
        const date = parts[0];
        const valueA = parseFloat(parts[1]);
        const valueB = parseFloat(parts[2]);
        if (!isNaN(valueA) && !isNaN(valueB)) {
          data.push({ date, valueA, valueB });
        }
      }
    }
    
    return data;
  };

  const handleMetricSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!metricForm.metricA || !metricForm.metricB) {
      showMessage('error', '请填写指标名称');
      return;
    }
    
    const timeSeriesData = parseTimeSeries(metricForm.timeSeriesText);
    if (timeSeriesData.length < 2) {
      showMessage('error', '请输入至少2行有效的时间序列数据（日期,指标A值,指标B值）');
      return;
    }
    
    const sampleSize = metricForm.sampleSize > 0 ? metricForm.sampleSize : timeSeriesData.length;
    
    addRecord({
      metricA: metricForm.metricA,
      metricB: metricForm.metricB,
      dataSource: metricForm.dataSource || '手动录入',
      timeSeriesData,
      sampleSize,
    });
    
    showMessage('success', '分析记录已创建，系统已自动执行相关性计算和误判检测');
    setMetricForm({
      metricA: '',
      metricB: '',
      dataSource: '',
      timeSeriesText: '',
      sampleSize: 0,
    });
  };

  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRecordId) {
      showMessage('error', '请选择要补充分组字段的记录');
      return;
    }
    if (!groupField.trim()) {
      showMessage('error', '请输入分组字段');
      return;
    }
    
    updateGroupField(selectedRecordId, groupField.trim());
    showMessage('success', '分组字段已补充，原始判断结果未被覆盖');
    setGroupField('');
  };

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRecordId) {
      showMessage('error', '请选择要补充事件备注的记录');
      return;
    }
    if (!eventNote.trim()) {
      showMessage('error', '请输入事件备注');
      return;
    }
    
    updateEventNote(selectedRecordId, eventNote.trim());
    showMessage('success', '事件备注已补充，原始判断结果未被覆盖');
    setEventNote('');
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const lines = batchText.trim().split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      showMessage('error', '请输入至少2行数据');
      return;
    }
    
    const batchData: Array<{
      metricA: string;
      metricB: string;
      timeSeriesData: TimeSeriesPoint[];
      sampleSize: number;
      dataSource: string;
    }> = [];
    
    let currentRecord: any = null;
    
    for (const line of lines) {
      if (line.startsWith('##') || line.startsWith('# ')) {
        const parts = line.replace(/^#+\s*/, '').split(/[,，]/).map(p => p.trim());
        if (parts.length >= 2) {
          if (currentRecord) {
            batchData.push(currentRecord);
          }
          currentRecord = {
            metricA: parts[0],
            metricB: parts[1],
            dataSource: parts[2] || '批量导入',
            timeSeriesData: [],
            sampleSize: 0,
          };
        }
      } else if (currentRecord) {
        const parts = line.split(/[,，\t\s]+/).map(p => p.trim());
        if (parts.length >= 3) {
          const date = parts[0];
          const valueA = parseFloat(parts[1]);
          const valueB = parseFloat(parts[2]);
          if (!isNaN(valueA) && !isNaN(valueB)) {
            currentRecord.timeSeriesData.push({ date, valueA, valueB });
          }
        }
      }
    }
    
    if (currentRecord && currentRecord.timeSeriesData.length > 0) {
      batchData.push(currentRecord);
    }
    
    if (batchData.length === 0) {
      showMessage('error', '未解析到有效数据，请检查格式');
      return;
    }
    
    batchData.forEach(d => {
      d.sampleSize = d.timeSeriesData.length;
    });
    
    batchAddRecords(batchData);
    showMessage('success', `成功导入 ${batchData.length} 组数据，系统已自动执行分析`);
    setBatchText('');
  };

  const tabs = [
    { id: 'metric' as TabType, label: '指标数据录入', icon: Database },
    { id: 'group' as TabType, label: '分组字段补录', icon: Tag },
    { id: 'note' as TabType, label: '事件备注补录', icon: MessageSquare },
    { id: 'batch' as TabType, label: '批量导入', icon: Upload },
  ];

  const recordsWithoutGroup = records.filter(r => !r.groupField);
  const recordsWithoutNote = records.filter(r => !r.eventNote);

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Table2 className="w-6 h-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">数据录入</h1>
        </div>
        <p className="text-slate-400">分段录入，补充分组和备注时不覆盖已有判断结果</p>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-emerald-400">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{errorMessage}</p>
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg mb-6">
        <div className="flex border-b border-slate-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2',
                activeTab === tab.id
                  ? 'text-blue-400 border-blue-400'
                  : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-800/50'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {(tab.id === 'group' && recordsWithoutGroup.length > 0) && (
                <span className="px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                  {recordsWithoutGroup.length}
                </span>
              )}
              {(tab.id === 'note' && recordsWithoutNote.length > 0) && (
                <span className="px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                  {recordsWithoutNote.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'metric' && (
            <form onSubmit={handleMetricSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    指标A（原因/自变量）
                  </label>
                  <input
                    type="text"
                    value={metricForm.metricA}
                    onChange={(e) => setMetricForm({ ...metricForm, metricA: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="例如：广告投放额"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    指标B（结果/因变量）
                  </label>
                  <input
                    type="text"
                    value={metricForm.metricB}
                    onChange={(e) => setMetricForm({ ...metricForm, metricB: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="例如：订单转化量"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    数据来源
                  </label>
                  <input
                    type="text"
                    value={metricForm.dataSource}
                    onChange={(e) => setMetricForm({ ...metricForm, dataSource: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="例如：广告平台API"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  时间序列数据
                  <span className="text-slate-500 font-normal ml-2">
                    每行格式：日期,指标A值,指标B值（支持逗号、空格、制表符分隔）
                  </span>
                </label>
                <textarea
                  value={metricForm.timeSeriesText}
                  onChange={(e) => setMetricForm({ ...metricForm, timeSeriesText: e.target.value })}
                  rows={10}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                  placeholder={`2025-01-01,100,50
2025-01-02,110,55
2025-01-03,105,52
2025-01-04,120,60
...`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  样本量（可选，留空则使用数据行数）
                </label>
                <input
                  type="number"
                  value={metricForm.sampleSize || ''}
                  onChange={(e) => setMetricForm({ ...metricForm, sampleSize: parseInt(e.target.value) || 0 })}
                  className="w-48 px-4 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="例如：1250"
                />
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors inline-flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  创建分析记录
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/analysis')}
                  className="px-6 py-2 border border-slate-600 text-slate-300 hover:bg-slate-800 rounded-md transition-colors"
                >
                  查看分析结果
                </button>
              </div>
            </form>
          )}

          {activeTab === 'group' && (
            <form onSubmit={handleGroupSubmit} className="space-y-6">
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-400">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  补充分组字段时，系统不会覆盖之前的判断结果，仅追加新的证据到证据链中。
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  选择要补充分组字段的记录
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {records.length === 0 ? (
                    <p className="text-slate-500 text-sm py-4 text-center">暂无记录，请先在"指标数据录入"中创建</p>
                  ) : (
                    records.map((record) => (
                      <div
                        key={record.id}
                        onClick={() => setSelectedRecordId(record.id)}
                        className={cn(
                          'p-3 border rounded-lg cursor-pointer transition-all',
                          selectedRecordId === record.id
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-sm text-slate-300">{record.id}</span>
                            <p className="text-white">
                              <span className="text-blue-400">{record.metricA}</span>
                              <span className="text-slate-500 mx-1">→</span>
                              <span className="text-cyan-400">{record.metricB}</span>
                            </p>
                          </div>
                          {record.groupField ? (
                            <span className="px-2 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded">
                              已补充: {record.groupField}
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-amber-500/10 text-amber-400 rounded">
                              待补充
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  分组字段
                </label>
                <input
                  type="text"
                  value={groupField}
                  onChange={(e) => setGroupField(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="例如：投放渠道、用户分层、活动类型"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedRecordId}
                className={cn(
                  'px-6 py-2 rounded-md transition-colors inline-flex items-center gap-2',
                  selectedRecordId
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                )}
              >
                <Save className="w-4 h-4" />
                保存分组字段
              </button>
            </form>
          )}

          {activeTab === 'note' && (
            <form onSubmit={handleNoteSubmit} className="space-y-6">
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-400">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  补充事件备注时，系统不会覆盖之前的判断结果，仅追加新的证据到证据链中。
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  选择要补充事件备注的记录
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {records.length === 0 ? (
                    <p className="text-slate-500 text-sm py-4 text-center">暂无记录，请先在"指标数据录入"中创建</p>
                  ) : (
                    records.map((record) => (
                      <div key={record.id}>
                        <div
                          onClick={() => {
                            setSelectedRecordId(record.id);
                            setExpandedRecordId(expandedRecordId === record.id ? null : record.id);
                          }}
                          className={cn(
                            'p-3 border rounded-lg cursor-pointer transition-all',
                            selectedRecordId === record.id
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {expandedRecordId === record.id ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                              <div>
                                <span className="font-mono text-sm text-slate-300">{record.id}</span>
                                <p className="text-white">
                                  <span className="text-blue-400">{record.metricA}</span>
                                  <span className="text-slate-500 mx-1">→</span>
                                  <span className="text-cyan-400">{record.metricB}</span>
                                </p>
                              </div>
                            </div>
                            {record.eventNote ? (
                              <span className="px-2 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded">
                                已补充
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-amber-500/10 text-amber-400 rounded">
                                待补充
                              </span>
                            )}
                          </div>
                        </div>
                        {expandedRecordId === record.id && record.eventNote && (
                          <div className="mt-2 ml-7 p-3 bg-slate-800/50 border-l-2 border-slate-600 rounded-r-lg">
                            <p className="text-xs text-slate-500 mb-1">当前备注：</p>
                            <p className="text-sm text-slate-300">{record.eventNote}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  事件备注
                </label>
                <textarea
                  value={eventNote}
                  onChange={(e) => setEventNote(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="例如：期间有618大促活动、新用户注册送优惠券活动上线、系统版本V2.3发布等"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedRecordId}
                className={cn(
                  'px-6 py-2 rounded-md transition-colors inline-flex items-center gap-2',
                  selectedRecordId
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                )}
              >
                <Save className="w-4 h-4" />
                保存事件备注
              </button>
            </form>
          )}

          {activeTab === 'batch' && (
            <form onSubmit={handleBatchSubmit} className="space-y-6">
              <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                <p className="text-sm text-slate-300 mb-2">
                  <FileText className="w-4 h-4 inline mr-2" />
                  批量导入格式说明：
                </p>
                <pre className="text-xs text-slate-400 font-mono bg-slate-900 p-3 rounded overflow-x-auto">
{`## 指标A名称,指标B名称,数据来源
日期1,值A1,值B1
日期2,值A2,值B2
...

## 另一组指标A,另一组指标B
日期1,值A1,值B1
...`}
                </pre>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  批量数据
                </label>
                <textarea
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  rows={15}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                  placeholder={`## 广告投放额,订单转化量,广告平台API
2025-01-01,1000,50
2025-01-02,1200,60
2025-01-03,1100,55

## 活动曝光,用户注册,活动后台
2025-03-01,5000,20
2025-03-08,6000,25
...`}
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                批量导入并分析
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
