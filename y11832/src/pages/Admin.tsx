import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Megaphone, Settings, Plus, Edit2, Trash2, Save, X, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { Broadcast, BroadcastCategory, Gate, GateStatus } from '../types';
import { loadBroadcasts, saveBroadcasts, resetBroadcasts, defaultBroadcasts } from '../data/broadcasts';
import { loadGateConfig, saveGateConfig } from '../store/gameStore';
import { stationMaps, getStationMap } from '../data/stationMaps';
import { detectBroadcastChanges, detectGateChanges, saveChangeHistory } from '../engine/ChangeDetector';

const categoryConfig: Record<BroadcastCategory, { label: string; color: string }> = {
  evacuation: { label: '疏散', color: 'bg-metro-red' },
  diversion: { label: '分流', color: 'bg-metro-yellow' },
  lockdown: { label: '封控', color: 'bg-metro-orange' },
  reassurance: { label: '安抚', color: 'bg-metro-blue' },
};

const statusConfig: Record<GateStatus, { label: string; color: string }> = {
  normal: { label: '正常', color: 'bg-metro-green' },
  faulty: { label: '故障', color: 'bg-metro-red' },
  restricted: { label: '限流', color: 'bg-metro-yellow' },
  closed: { label: '关闭', color: 'bg-metro-textMuted' },
};

const triggerConditions = [
  { value: '', label: '无自动触发' },
  { value: 'gate_fault', label: '闸机故障时' },
  { value: 'exit_congestion', label: '出口拥堵时' },
  { value: 'lockdown_set', label: '设置封控时' },
  { value: 'fault_detected', label: '检测到故障时' },
  { value: 'high_stress', label: '高压力场景' },
];

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'broadcasts' | 'gates'>('broadcasts');
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [selectedMapId, setSelectedMapId] = useState(stationMaps[0]?.id || '');
  const [editingBroadcast, setEditingBroadcast] = useState<Broadcast | null>(null);
  const [isNewBroadcast, setIsNewBroadcast] = useState(false);
  const [editingGate, setEditingGate] = useState<Gate | null>(null);
  const [changeNotification, setChangeNotification] = useState<{ type: 'success' | 'warning'; message: string; affectedConclusions: string[] } | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedMapId]);

  const loadData = () => {
    setBroadcasts(loadBroadcasts());
    const savedGates = loadGateConfig(selectedMapId);
    const stationMap = getStationMap(selectedMapId);
    if (savedGates.length > 0) {
      setGates(savedGates);
    } else if (stationMap) {
      setGates(stationMap.gates);
    }
  };

  const handleSaveBroadcasts = () => {
    const oldBroadcasts = loadBroadcasts();
    const changes = detectBroadcastChanges(oldBroadcasts, broadcasts);
    
    if (changes.length > 0) {
      saveChangeHistory(changes);
      const affectedConclusions = changes.flatMap((c) => c.affectedConclusions);
      setChangeNotification({
        type: 'success',
        message: `已保存 ${changes.length} 项广播词变更`,
        affectedConclusions,
      });
    }
    
    saveBroadcasts(broadcasts);
    setEditingBroadcast(null);
    setIsNewBroadcast(false);

    setTimeout(() => setChangeNotification(null), 5000);
  };

  const handleSaveGates = () => {
    const oldGates = loadGateConfig(selectedMapId);
    const stationMap = getStationMap(selectedMapId);
    const baseGates = oldGates.length > 0 ? oldGates : stationMap?.gates || [];
    const changes = detectGateChanges(baseGates, gates);
    
    if (changes.length > 0) {
      saveChangeHistory(changes);
      const affectedConclusions = changes.flatMap((c) => c.affectedConclusions);
      setChangeNotification({
        type: 'success',
        message: `已保存 ${changes.length} 项闸机配置变更`,
        affectedConclusions,
      });
    }
    
    saveGateConfig(selectedMapId, gates);
    setEditingGate(null);

    setTimeout(() => setChangeNotification(null), 5000);
  };

  const handleResetBroadcasts = () => {
    if (confirm('确定要重置所有广播词为默认值吗？')) {
      const oldBroadcasts = loadBroadcasts();
      const newBroadcasts = resetBroadcasts();
      const changes = detectBroadcastChanges(oldBroadcasts, newBroadcasts);
      
      if (changes.length > 0) {
        saveChangeHistory(changes);
      }
      
      setBroadcasts(newBroadcasts);
      setChangeNotification({
        type: 'warning',
        message: '已重置为默认广播词',
        affectedConclusions: changes.flatMap((c) => c.affectedConclusions),
      });

      setTimeout(() => setChangeNotification(null), 5000);
    }
  };

  const handleAddBroadcast = () => {
    const newBroadcast: Broadcast = {
      id: `broadcast-${Date.now()}`,
      category: 'evacuation',
      title: '',
      content: '',
      cooldownSeconds: 30,
      relatedLocations: [],
      triggerCondition: '',
    };
    setEditingBroadcast(newBroadcast);
    setIsNewBroadcast(true);
  };

  const handleEditBroadcast = (broadcast: Broadcast) => {
    setEditingBroadcast({ ...broadcast });
    setIsNewBroadcast(false);
  };

  const handleDeleteBroadcast = (id: string) => {
    if (confirm('确定要删除这条广播吗？')) {
      const oldBroadcasts = [...broadcasts];
      const newBroadcasts = broadcasts.filter((b) => b.id !== id);
      const changes = detectBroadcastChanges(oldBroadcasts, newBroadcasts);
      
      if (changes.length > 0) {
        saveChangeHistory(changes);
      }
      
      setBroadcasts(newBroadcasts);
      saveBroadcasts(newBroadcasts);
    }
  };

  const handleUpdateBroadcast = (field: keyof Broadcast, value: unknown) => {
    if (!editingBroadcast) return;
    setEditingBroadcast({ ...editingBroadcast, [field]: value });
  };

  const handleSaveEditingBroadcast = () => {
    if (!editingBroadcast || !editingBroadcast.title || !editingBroadcast.content) {
      alert('请填写完整的广播信息');
      return;
    }

    let newBroadcasts: Broadcast[];
    if (isNewBroadcast) {
      newBroadcasts = [...broadcasts, editingBroadcast];
    } else {
      newBroadcasts = broadcasts.map((b) =>
        b.id === editingBroadcast.id ? editingBroadcast : b
      );
    }
    
    const oldBroadcasts = loadBroadcasts();
    const changes = detectBroadcastChanges(oldBroadcasts, newBroadcasts);
    
    if (changes.length > 0) {
      saveChangeHistory(changes);
      const affectedConclusions = changes.flatMap((c) => c.affectedConclusions);
      setChangeNotification({
        type: 'success',
        message: isNewBroadcast ? '已添加新广播' : '已更新广播',
        affectedConclusions,
      });
      setTimeout(() => setChangeNotification(null), 5000);
    }
    
    setBroadcasts(newBroadcasts);
    saveBroadcasts(newBroadcasts);
    setEditingBroadcast(null);
    setIsNewBroadcast(false);
  };

  const handleEditGate = (gate: Gate) => {
    setEditingGate({ ...gate });
  };

  const handleUpdateGate = (field: keyof Gate, value: unknown) => {
    if (!editingGate) return;
    setEditingGate({ ...editingGate, [field]: value });
  };

  const handleSaveEditingGate = () => {
    if (!editingGate) return;

    const newGates = gates.map((g) =>
      g.id === editingGate.id ? editingGate : g
    );
    
    const oldGates = loadGateConfig(selectedMapId);
    const changes = detectGateChanges(oldGates.length > 0 ? oldGates : gates, newGates);
    
    if (changes.length > 0) {
      saveChangeHistory(changes);
      const affectedConclusions = changes.flatMap((c) => c.affectedConclusions);
      setChangeNotification({
        type: 'success',
        message: '已更新闸机配置',
        affectedConclusions,
      });
      setTimeout(() => setChangeNotification(null), 5000);
    }
    
    setGates(newGates);
    saveGateConfig(selectedMapId, newGates);
    setEditingGate(null);
  };

  const stationMap = getStationMap(selectedMapId);
  const allLocations = [
    ...gates.map((g) => ({ id: g.id, name: g.name })),
    ...(stationMap?.exits.map((e) => ({ id: e.id, name: e.name })) || []),
  ];

  return (
    <div className="min-h-screen bg-metro-bg text-metro-text">
      <div className="fixed inset-0 grid-bg opacity-20 pointer-events-none" />

      <header className="relative border-b border-metro-border bg-metro-bgDark/80 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-3 py-2 bg-metro-bg hover:bg-metro-bgLight border border-metro-border rounded-lg transition-all"
              >
                <ArrowLeft size={18} />
                <span className="text-sm">返回首页</span>
              </button>
              <div>
                <h1 className="text-xl font-bold">管理后台</h1>
                <p className="text-xs text-metro-textMuted">广播词管理 · 闸机配置 · 变更追踪</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/changes')}
                className="flex items-center gap-2 px-4 py-2 bg-metro-orange hover:bg-orange-600 text-white rounded-lg transition-all"
              >
                <Zap size={18} />
                查看变更记录
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative container mx-auto px-6 py-8">
        {changeNotification && (
          <div className={`mb-6 p-4 rounded-lg border ${
            changeNotification.type === 'success' 
              ? 'bg-metro-green/10 border-metro-green/30' 
              : 'bg-metro-yellow/10 border-metro-yellow/30'
          }`}>
            <div className="flex items-start gap-3">
              {changeNotification.type === 'success' ? (
                <CheckCircle className="text-metro-green flex-shrink-0 mt-0.5" size={20} />
              ) : (
                <AlertTriangle className="text-metro-yellow flex-shrink-0 mt-0.5" size={20} />
              )}
              <div className="flex-1">
                <p className={`font-bold ${
                  changeNotification.type === 'success' ? 'text-metro-green' : 'text-metro-yellow'
                }`}>
                  {changeNotification.message}
                </p>
                {changeNotification.affectedConclusions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-metro-textMuted mb-1">站厅地图相关结论变更：</p>
                    <ul className="space-y-1">
                      {changeNotification.affectedConclusions.map((conclusion, idx) => (
                        <li key={idx} className="text-sm text-metro-text flex items-start gap-2">
                          <span className="text-metro-blue">•</span>
                          {conclusion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <button
                onClick={() => setChangeNotification(null)}
                className="p-1 hover:bg-metro-border rounded"
              >
                <X size={16} className="text-metro-textMuted" />
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('broadcasts')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
              activeTab === 'broadcasts'
                ? 'bg-metro-blue text-white'
                : 'bg-metro-bg text-metro-textMuted hover:bg-metro-bgLight'
            }`}
          >
            <Megaphone size={18} />
            广播词管理
          </button>
          <button
            onClick={() => setActiveTab('gates')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
              activeTab === 'gates'
                ? 'bg-metro-blue text-white'
                : 'bg-metro-bg text-metro-textMuted hover:bg-metro-bgLight'
            }`}
          >
            <Settings size={18} />
            闸机配置
          </button>
        </div>

        {activeTab === 'broadcasts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="metro-panel">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">广播词列表</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddBroadcast}
                      className="flex items-center gap-2 px-4 py-2 bg-metro-green hover:bg-green-600 text-white rounded-lg text-sm transition-all"
                    >
                      <Plus size={16} />
                      新增广播
                    </button>
                    <button
                      onClick={handleResetBroadcasts}
                      className="flex items-center gap-2 px-4 py-2 bg-metro-border hover:bg-metro-border/80 text-metro-text rounded-lg text-sm transition-all"
                    >
                      重置默认
                    </button>
                    <button
                      onClick={handleSaveBroadcasts}
                      className="flex items-center gap-2 px-4 py-2 bg-metro-blue hover:bg-blue-600 text-white rounded-lg text-sm transition-all"
                    >
                      <Save size={16} />
                      保存全部
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {broadcasts.map((broadcast) => (
                    <div
                      key={broadcast.id}
                      className={`p-4 bg-metro-bg rounded-lg border-2 transition-all cursor-pointer ${
                        editingBroadcast?.id === broadcast.id
                          ? 'border-metro-blue'
                          : 'border-transparent hover:border-metro-border'
                      }`}
                      onClick={() => handleEditBroadcast(broadcast)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs px-2 py-0.5 rounded text-white font-bold ${categoryConfig[broadcast.category].color}`}>
                              {categoryConfig[broadcast.category].label}
                            </span>
                            <span className="font-bold">{broadcast.title}</span>
                            <span className="text-xs text-metro-textMuted">
                              冷却: {broadcast.cooldownSeconds}s
                            </span>
                            {broadcast.triggerCondition && (
                              <span className="text-xs px-2 py-0.5 bg-metro-bgLight rounded text-metro-blue">
                                自动触发
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-metro-textMuted line-clamp-2">
                            {broadcast.content}
                          </p>
                          {broadcast.relatedLocations.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {broadcast.relatedLocations.map((locId) => {
                                const loc = allLocations.find((l) => l.id === locId);
                                return (
                                  <span key={locId} className="text-xs px-2 py-0.5 bg-metro-bgLight rounded text-metro-textMuted">
                                    {loc?.name || locId}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 ml-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditBroadcast(broadcast);
                            }}
                            className="p-2 hover:bg-metro-bgLight rounded transition-colors"
                          >
                            <Edit2 size={14} className="text-metro-blue" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBroadcast(broadcast.id);
                            }}
                            className="p-2 hover:bg-metro-red/10 rounded transition-colors"
                          >
                            <Trash2 size={14} className="text-metro-red" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              {editingBroadcast && (
                <div className="metro-panel">
                  <h3 className="font-bold mb-4">
                    {isNewBroadcast ? '新增广播' : '编辑广播'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-metro-textMuted mb-1">分类</label>
                      <select
                        value={editingBroadcast.category}
                        onChange={(e) => handleUpdateBroadcast('category', e.target.value as BroadcastCategory)}
                        className="w-full px-3 py-2 bg-metro-bg border border-metro-border rounded text-metro-text"
                      >
                        {(Object.keys(categoryConfig) as BroadcastCategory[]).map((cat) => (
                          <option key={cat} value={cat}>
                            {categoryConfig[cat].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-metro-textMuted mb-1">标题</label>
                      <input
                        type="text"
                        value={editingBroadcast.title}
                        onChange={(e) => handleUpdateBroadcast('title', e.target.value)}
                        placeholder="输入广播标题"
                        className="w-full px-3 py-2 bg-metro-bg border border-metro-border rounded text-metro-text"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-metro-textMuted mb-1">广播内容</label>
                      <textarea
                        value={editingBroadcast.content}
                        onChange={(e) => handleUpdateBroadcast('content', e.target.value)}
                        placeholder="输入广播内容"
                        rows={4}
                        className="w-full px-3 py-2 bg-metro-bg border border-metro-border rounded text-metro-text resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-metro-textMuted mb-1">冷却时间（秒）</label>
                      <input
                        type="number"
                        value={editingBroadcast.cooldownSeconds}
                        onChange={(e) => handleUpdateBroadcast('cooldownSeconds', parseInt(e.target.value) || 0)}
                        min="5"
                        max="120"
                        className="w-full px-3 py-2 bg-metro-bg border border-metro-border rounded text-metro-text"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-metro-textMuted mb-1">触发条件</label>
                      <select
                        value={editingBroadcast.triggerCondition || ''}
                        onChange={(e) => handleUpdateBroadcast('triggerCondition', e.target.value || undefined)}
                        className="w-full px-3 py-2 bg-metro-bg border border-metro-border rounded text-metro-text"
                      >
                        {triggerConditions.map((tc) => (
                          <option key={tc.value} value={tc.value}>
                            {tc.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-metro-textMuted mb-2">关联位置</label>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {allLocations.map((loc) => (
                          <label key={loc.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingBroadcast.relatedLocations.includes(loc.id)}
                              onChange={(e) => {
                                const newLocs = e.target.checked
                                  ? [...editingBroadcast.relatedLocations, loc.id]
                                  : editingBroadcast.relatedLocations.filter((id) => id !== loc.id);
                                handleUpdateBroadcast('relatedLocations', newLocs);
                              }}
                              className="w-4 h-4 rounded border-metro-border bg-metro-bg text-metro-blue"
                            />
                            <span className="text-sm">{loc.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleSaveEditingBroadcast}
                        className="flex-1 py-2 bg-metro-blue hover:bg-blue-600 text-white rounded font-bold transition-all"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => {
                          setEditingBroadcast(null);
                          setIsNewBroadcast(false);
                        }}
                        className="px-4 py-2 bg-metro-border hover:bg-metro-border/80 text-metro-text rounded transition-all"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!editingBroadcast && (
                <div className="metro-panel text-center py-12">
                  <Megaphone className="mx-auto text-metro-textMuted mb-3" size={48} />
                  <p className="text-metro-textMuted">选择一条广播进行编辑</p>
                  <p className="text-xs text-metro-textMuted mt-1">或点击"新增广播"按钮创建</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'gates' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="metro-panel">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <h3 className="font-bold text-lg">闸机配置</h3>
                    <select
                      value={selectedMapId}
                      onChange={(e) => setSelectedMapId(e.target.value)}
                      className="px-3 py-2 bg-metro-bg border border-metro-border rounded text-metro-text text-sm"
                    >
                      {stationMaps.map((map) => (
                        <option key={map.id} value={map.id}>
                          {map.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleSaveGates}
                    className="flex items-center gap-2 px-4 py-2 bg-metro-blue hover:bg-blue-600 text-white rounded-lg text-sm transition-all"
                  >
                    <Save size={16} />
                    保存配置
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-metro-border">
                        <th className="text-left py-3 px-2 text-sm font-bold text-metro-textMuted">闸机</th>
                        <th className="text-left py-3 px-2 text-sm font-bold text-metro-textMuted">状态</th>
                        <th className="text-left py-3 px-2 text-sm font-bold text-metro-textMuted">是否故障</th>
                        <th className="text-left py-3 px-2 text-sm font-bold text-metro-textMuted">通行能力</th>
                        <th className="text-left py-3 px-2 text-sm font-bold text-metro-textMuted">位置</th>
                        <th className="text-left py-3 px-2 text-sm font-bold text-metro-textMuted">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gates.map((gate) => (
                        <tr
                          key={gate.id}
                          className={`border-b border-metro-border/50 cursor-pointer hover:bg-metro-bg/50 transition-colors ${
                            editingGate?.id === gate.id ? 'bg-metro-blue/10' : ''
                          }`}
                          onClick={() => handleEditGate(gate)}
                        >
                          <td className="py-3 px-2">
                            <span className="font-bold">{gate.name}</span>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`text-xs px-2 py-1 rounded text-white font-bold ${statusConfig[gate.status].color}`}>
                              {statusConfig[gate.status].label}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`text-xs px-2 py-1 rounded font-bold ${
                              gate.isFaulty 
                                ? 'bg-metro-red/20 text-metro-red' 
                                : 'bg-metro-green/20 text-metro-green'
                            }`}>
                              {gate.isFaulty ? '是' : '否'}
                            </span>
                          </td>
                          <td className="py-3 px-2 font-mono">{gate.capacity} 人/分钟</td>
                          <td className="py-3 px-2 font-mono text-xs text-metro-textMuted">
                            ({gate.position.x}, {gate.position.y})
                          </td>
                          <td className="py-3 px-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditGate(gate);
                              }}
                              className="p-2 hover:bg-metro-bgLight rounded transition-colors"
                            >
                              <Edit2 size={14} className="text-metro-blue" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div>
              {editingGate && (
                <div className="metro-panel">
                  <h3 className="font-bold mb-4">编辑 {editingGate.name}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-metro-textMuted mb-1">初始状态</label>
                      <select
                        value={editingGate.status}
                        onChange={(e) => handleUpdateGate('status', e.target.value as GateStatus)}
                        className="w-full px-3 py-2 bg-metro-bg border border-metro-border rounded text-metro-text"
                      >
                        {(['normal', 'restricted', 'closed'] as GateStatus[]).map((status) => (
                          <option key={status} value={status}>
                            {statusConfig[status].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-metro-textMuted mb-1">是否故障</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={editingGate.isFaulty}
                            onChange={() => handleUpdateGate('isFaulty', true)}
                            className="w-4 h-4 text-metro-red"
                          />
                          <span className="text-sm">是（训练初始即故障）</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={!editingGate.isFaulty}
                            onChange={() => handleUpdateGate('isFaulty', false)}
                            className="w-4 h-4 text-metro-green"
                          />
                          <span className="text-sm">否</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-metro-textMuted mb-1">通行能力（人/分钟）</label>
                      <input
                        type="number"
                        value={editingGate.capacity}
                        onChange={(e) => handleUpdateGate('capacity', parseInt(e.target.value) || 0)}
                        min="10"
                        max="60"
                        className="w-full px-3 py-2 bg-metro-bg border border-metro-border rounded text-metro-text"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-metro-textMuted mb-1">X 坐标</label>
                        <input
                          type="number"
                          value={editingGate.position.x}
                          onChange={(e) => handleUpdateGate('position', {
                            ...editingGate.position,
                            x: parseInt(e.target.value) || 0,
                          })}
                          className="w-full px-3 py-2 bg-metro-bg border border-metro-border rounded text-metro-text"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-metro-textMuted mb-1">Y 坐标</label>
                        <input
                          type="number"
                          value={editingGate.position.y}
                          onChange={(e) => handleUpdateGate('position', {
                            ...editingGate.position,
                            y: parseInt(e.target.value) || 0,
                          })}
                          className="w-full px-3 py-2 bg-metro-bg border border-metro-border rounded text-metro-text"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-metro-textMuted mb-1">宽度</label>
                        <input
                          type="number"
                          value={editingGate.width}
                          onChange={(e) => handleUpdateGate('width', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-metro-bg border border-metro-border rounded text-metro-text"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-metro-textMuted mb-1">高度</label>
                        <input
                          type="number"
                          value={editingGate.height}
                          onChange={(e) => handleUpdateGate('height', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-metro-bg border border-metro-border rounded text-metro-text"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleSaveEditingGate}
                        className="flex-1 py-2 bg-metro-blue hover:bg-blue-600 text-white rounded font-bold transition-all"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingGate(null)}
                        className="px-4 py-2 bg-metro-border hover:bg-metro-border/80 text-metro-text rounded transition-all"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!editingGate && (
                <div className="metro-panel text-center py-12">
                  <Settings className="mx-auto text-metro-textMuted mb-3" size={48} />
                  <p className="text-metro-textMuted">选择一个闸机进行编辑</p>
                  <p className="text-xs text-metro-textMuted mt-1">修改后将影响后续训练结果</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
