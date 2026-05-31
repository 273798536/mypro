
import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Drones, RULES } from '@/constants';
import ViolationTag, { DataStatusTags } from '@/components/ViolationTag';
import { Search, Filter, Edit3, Save, X, Eye, Database, Clock, FileText, User, Calendar, Award, TrendingUp } from 'lucide-react';
import { FlightRecord } from '@/types';

export default function RecordsPage() {
  const { flightRecords, initializeMockData, updateFlightRecord, updateRemark, correctFlightData } = useGameStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<FlightRecord | null>(null);
  const [isEditingRemark, setIsEditingRemark] = useState(false);
  const [editRemarkText, setEditRemarkText] = useState('');
  const [isCorrectingData, setIsCorrectingData] = useState(false);
  const [correctField, setCorrectField] = useState('');
  const [correctValue, setCorrectValue] = useState('');
  const [correctReason, setCorrectReason] = useState('');

  useEffect(() => {
    if (flightRecords.length === 0) {
      initializeMockData();
    }
  }, [flightRecords.length, initializeMockData]);

  const filteredRecords = flightRecords.filter(record => {
    const matchesSearch = record.pilotName.includes(searchTerm) || 
                          record.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'all') return matchesSearch;
    if (filterType === 'has_violations') return matchesSearch && record.violations.length > 0;
    if (filterType === 'has_headwind') return matchesSearch && record.violations.some(v => v.type === 'headwind_ignored');
    if (filterType === 'missing_fields') return matchesSearch && record.hasMissingFields;
    if (filterType === 'late_entry') return matchesSearch && record.isLateEntry;
    
    return matchesSearch;
  });

  const getDroneName = (droneId: string) => {
    return Drones.find(d => d.id === droneId)?.name || '未知无人机';
  };

  const handleSaveRemark = () => {
    if (selectedRecord) {
      updateRemark(selectedRecord.id, editRemarkText);
      setSelectedRecord(prev => prev ? { ...prev, remark: editRemarkText, remarkModified: true } : null);
      setIsEditingRemark(false);
    }
  };

  const handleCorrectData = () => {
    if (selectedRecord && correctField && correctValue) {
      const fieldMap: Record<string, keyof FlightRecord> = {
        'endBattery': 'endBattery',
        'pilotName': 'pilotName',
        'remark': 'remark'
      };
      
      const fieldKey = fieldMap[correctField] as keyof FlightRecord;
      let parsedValue: any = correctValue;
      
      if (correctField === 'endBattery') {
        parsedValue = parseInt(correctValue);
      }
      
      correctFlightData(selectedRecord.id, {
        fieldName: correctField,
        oldValue: selectedRecord[fieldKey],
        newValue: parsedValue,
        reason: correctReason,
        correctedAt: new Date().toISOString(),
        affectedDetails: ['score', 'energyEfficiency', 'violations']
      });
      
      setIsCorrectingData(false);
      setCorrectField('');
      setCorrectValue('');
      setCorrectReason('');
      
      const updated = flightRecords.find(r => r.id === selectedRecord.id);
      if (updated) {
        setSelectedRecord({ ...updated, [fieldKey]: parsedValue });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">飞行记录中心</h1>
          <p className="text-slate-400">查看历史飞行数据、分析违规记录、补录数据</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-5">
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 mb-4">
              <div className="flex gap-3 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="搜索飞行员或记录ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-8 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 appearance-none"
                  >
                    <option value="all">全部记录</option>
                    <option value="has_violations">有违规</option>
                    <option value="has_headwind">逆风耗电</option>
                    <option value="missing_fields">缺字段</option>
                    <option value="late_entry">晚补</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredRecords.map(record => (
                  <div
                    key={record.id}
                    onClick={() => setSelectedRecord(record)}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      selectedRecord?.id === record.id
                        ? 'bg-cyan-500/20 border border-cyan-500/50'
                        : 'bg-slate-900/50 hover:bg-slate-700/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-cyan-400">{record.id}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            record.score >= 80 ? 'bg-green-500/20 text-green-400' :
                            record.score >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {record.score}分
                          </span>
                        </div>
                        <div className="text-sm text-slate-300 mt-1">
                          {record.pilotName || <span className="text-yellow-500">未填写飞行员</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">{record.startTime}</div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-2">
                      {record.violations
                        .filter(v => v.type === 'headwind_ignored')
                        .map(v => (
                          <ViolationTag key={v.id} type={v.type} highlighted={v.highlighted} small />
                        ))}
                    </div>
                    
                    <DataStatusTags
                      hasMissingFields={record.hasMissingFields}
                      isLateEntry={record.isLateEntry}
                      remarkModified={record.remarkModified}
                      lateEntryHours={record.lateEntryHours}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-7">
            {selectedRecord ? (
              <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white">飞行详情</h2>
                    <p className="text-cyan-400 font-mono">{selectedRecord.id}</p>
                  </div>
                  <div className={`text-3xl font-bold ${
                    selectedRecord.score >= 80 ? 'text-green-400' :
                    selectedRecord.score >= 60 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {selectedRecord.score}
                    <span className="text-sm text-slate-500 ml-1">分</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                      <User className="w-4 h-4" />
                      飞行员
                    </div>
                    <div className="text-white">
                      {selectedRecord.pilotName || <span className="text-yellow-500">未填写</span>}
                    </div>
                  </div>
                  
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                      <Database className="w-4 h-4" />
                      无人机
                    </div>
                    <div className="text-white">{getDroneName(selectedRecord.droneId)}</div>
                  </div>
                  
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                      <Calendar className="w-4 h-4" />
                      飞行时间
                    </div>
                    <div className="text-white text-sm">
                      {selectedRecord.startTime} ~ {selectedRecord.endTime || '进行中'}
                    </div>
                  </div>
                  
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                      <TrendingUp className="w-4 h-4" />
                      能耗情况
                    </div>
                    <div className="text-white text-sm">
                      {selectedRecord.startBattery} → {selectedRecord.endBattery || '?'} mAh
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    违规记录
                  </h3>
                  {selectedRecord.violations.length > 0 ? (
                    <div className="space-y-2">
                      {selectedRecord.violations.map(violation => {
                        const rule = RULES.find(r => r.id === violation.ruleReference);
                        return (
                          <div
                            key={violation.id}
                            className={`p-3 rounded-lg border ${
                              violation.highlighted
                                ? 'bg-red-500/10 border-red-500/50'
                                : 'bg-slate-900/50 border-slate-700/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <ViolationTag type={violation.type} highlighted={violation.highlighted} />
                              <span className="text-red-400 text-sm font-medium">-{violation.penalty}分</span>
                            </div>
                            <p className="text-sm text-slate-300">{violation.description}</p>
                            {rule && (
                              <p className="text-xs text-slate-500 mt-1">
                                规则参考: {rule.name} ({rule.id})
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-slate-500 text-sm py-4 text-center bg-slate-900/50 rounded-lg">
                      无违规记录，飞行表现优秀！
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      备注
                    </h3>
                    {!isEditingRemark && (
                      <button
                        onClick={() => {
                          setEditRemarkText(selectedRecord.remark);
                          setIsEditingRemark(true);
                        }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        编辑
                      </button>
                    )}
                  </div>
                  {isEditingRemark ? (
                    <div className="space-y-2">
                      <textarea
                        value={editRemarkText}
                        onChange={(e) => setEditRemarkText(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-cyan-500"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveRemark}
                          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" />
                          保存
                        </button>
                        <button
                          onClick={() => setIsEditingRemark(false)}
                          className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900/50 rounded-lg p-3 text-sm text-slate-300">
                      {selectedRecord.remark || '暂无备注'}
                    </div>
                  )}
                  
                  {selectedRecord.remarkHistory.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <p className="text-xs text-slate-500 mb-2">修改历史:</p>
                      <div className="space-y-2">
                        {selectedRecord.remarkHistory.map((history, idx) => (
                          <div key={idx} className="text-xs text-slate-400 bg-slate-900/30 p-2 rounded">
                            <span className="text-purple-400">{history.modifiedAt}</span>
                            <div className="mt-1">
                              <span className="text-slate-500">"{history.oldRemark}"</span>
                              <span className="mx-1">→</span>
                              <span className="text-slate-300">"{history.newRemark}"</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {selectedRecord.corrections.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      数据补录记录
                    </h3>
                    <div className="space-y-2">
                      {selectedRecord.corrections.map(corr => (
                        <div key={corr.id} className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-orange-400 font-medium">
                              {corr.fieldName} 数据补录
                            </span>
                            <span className="text-xs text-slate-500">{corr.correctedAt}</span>
                          </div>
                          <p className="text-xs text-slate-400">
                            {String(corr.oldValue)} → <span className="text-white">{String(corr.newValue)}</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-1">原因: {corr.reason}</p>
                          <p className="text-xs text-cyan-500 mt-1">
                            影响明细: {corr.affectedDetails.join(', ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      数据补录
                    </h3>
                    {!isCorrectingData && (
                      <button
                        onClick={() => setIsCorrectingData(true)}
                        className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        补录数据
                      </button>
                    )}
                  </div>
                  
                  {isCorrectingData && (
                    <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">选择字段</label>
                        <select
                          value={correctField}
                          onChange={(e) => setCorrectField(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                        >
                          <option value="">请选择...</option>
                          <option value="endBattery">结束电量</option>
                          <option value="pilotName">飞行员姓名</option>
                          <option value="remark">备注</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">修正值</label>
                        <input
                          type="text"
                          value={correctValue}
                          onChange={(e) => setCorrectValue(e.target.value)}
                          placeholder="输入修正值"
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">补录原因</label>
                        <input
                          type="text"
                          value={correctReason}
                          onChange={(e) => setCorrectReason(e.target.value)}
                          placeholder="说明补录原因"
                          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCorrectData}
                          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg flex items-center gap-1"
                        >
                          <Save className="w-3 h-3" />
                          确认补录
                        </button>
                        <button
                          onClick={() => {
                            setIsCorrectingData(false);
                            setCorrectField('');
                            setCorrectValue('');
                            setCorrectReason('');
                          }}
                          className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          取消
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-12 border border-slate-700/50 text-center">
                <Eye className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">选择一条飞行记录查看详情</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
