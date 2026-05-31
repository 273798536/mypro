import { useState, useRef } from 'react';
import { Upload, Plus, Trash2, UserPlus, Music, Gauge } from 'lucide-react';
import { v5 as uuidv5 } from 'uuid';
import { useStore } from '@/store';
import type { DrumScore, Measure, SpeedLadder } from '@/types';
import { generateSpeedTiers } from '@/engine/evaluate';

const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export default function SetupPage() {
  const {
    scores,
    ladders,
    samples,
    addScore,
    removeScore,
    addLadder,
    removeLadder,
    generateTiersForLadder,
    addSample,
    selectSample,
    selectedSampleId,
  } = useStore();

  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showLadderModal, setShowLadderModal] = useState(false);
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newScore, setNewScore] = useState({ name: '', totalMeasures: 16, beatsPerMeasure: 4 });
  const [newLadder, setNewLadder] = useState({
    name: '标准阶梯',
    startBpm: 60,
    endBpm: 140,
    interval: 10,
    jumpStrategy: 'stepwise' as 'stepwise' | 'custom',
    customTiers: '',
  });
  const [newSample, setNewSample] = useState({
    studentName: '',
    scoreId: '',
    ladderId: '',
  });

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const scoreId = uuidv5(file.name + Date.now(), UUID_NAMESPACE);
        const score: DrumScore = {
          id: scoreId,
          name: data.name || file.name.replace('.json', ''),
          totalMeasures: data.totalMeasures || 16,
          beatsPerMeasure: data.beatsPerMeasure || 4,
          metadata: data.metadata || {},
          createdAt: Date.now(),
        };
        const measures: Measure[] = (data.measures || []).map((m: any, i: number) => ({
          id: uuidv5(scoreId + ':' + i, UUID_NAMESPACE),
          scoreId,
          measureNumber: m.measureNumber || i + 1,
          beatPattern: m.beatPattern || [1, 0, 1, 0],
        }));
        if (measures.length === 0) {
          for (let i = 0; i < score.totalMeasures; i++) {
            measures.push({
              id: uuidv5(scoreId + ':' + i, UUID_NAMESPACE),
              scoreId,
              measureNumber: i + 1,
              beatPattern: [1, 0, 1, 0],
            });
          }
        }
        addScore(score, measures);
        setShowScoreModal(false);
      } catch (err) {
        alert('文件解析失败，请使用正确的 JSON 格式');
      }
    };
    reader.readAsText(file);
  };

  const handleCreateScore = () => {
    const scoreId = uuidv5(newScore.name + Date.now(), UUID_NAMESPACE);
    const score: DrumScore = {
      id: scoreId,
      name: newScore.name,
      totalMeasures: newScore.totalMeasures,
      beatsPerMeasure: newScore.beatsPerMeasure,
      metadata: {},
      createdAt: Date.now(),
    };
    const measures: Measure[] = [];
    for (let i = 0; i < score.totalMeasures; i++) {
      measures.push({
        id: uuidv5(scoreId + ':' + i, UUID_NAMESPACE),
        scoreId,
        measureNumber: i + 1,
        beatPattern: Array(score.beatsPerMeasure).fill(1),
      });
    }
    addScore(score, measures);
    setShowScoreModal(false);
    setNewScore({ name: '', totalMeasures: 16, beatsPerMeasure: 4 });
  };

  const handleCreateLadder = () => {
    const ladderId = uuidv5(newLadder.name + Date.now(), UUID_NAMESPACE);
    const ladder: SpeedLadder = {
      id: ladderId,
      name: newLadder.name,
      startBpm: newLadder.startBpm,
      endBpm: newLadder.endBpm,
      interval: newLadder.interval,
      customTiers:
        newLadder.jumpStrategy === 'custom' && newLadder.customTiers
          ? newLadder.customTiers.split(',').map((n) => parseInt(n.trim()))
          : null,
      jumpStrategy: newLadder.jumpStrategy,
    };
    addLadder(ladder);
    generateTiersForLadder(ladderId);
    setShowLadderModal(false);
    setNewLadder({
      name: '标准阶梯',
      startBpm: 60,
      endBpm: 140,
      interval: 10,
      jumpStrategy: 'stepwise',
      customTiers: '',
    });
  };

  const handleCreateSample = () => {
    if (!newSample.studentName || !newSample.scoreId || !newSample.ladderId) {
      alert('请填写完整信息');
      return;
    }
    const sampleId = uuidv5(newSample.studentName + Date.now(), UUID_NAMESPACE);
    addSample({
      id: sampleId,
      studentName: newSample.studentName,
      scoreId: newSample.scoreId,
      ladderId: newSample.ladderId,
      date: Date.now(),
    });
    setShowSampleModal(false);
    setNewSample({ studentName: '', scoreId: '', ladderId: '' });
  };

  const previewTiers = generateSpeedTiers({
    id: 'preview',
    name: '',
    startBpm: newLadder.startBpm,
    endBpm: newLadder.endBpm,
    interval: newLadder.interval,
    customTiers:
      newLadder.jumpStrategy === 'custom' && newLadder.customTiers
        ? newLadder.customTiers.split(',').map((n) => parseInt(n.trim()))
        : null,
    jumpStrategy: newLadder.jumpStrategy,
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">鼓谱与速度配置</h1>
          <p className="text-text-muted mt-1">导入鼓谱、配置速度阶梯、创建练习样本</p>
        </div>
        <button
          onClick={() => setShowSampleModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:shadow-glow transition-all"
        >
          <UserPlus className="w-5 h-5" />
          创建练习样本
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-bg-secondary rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-accent-primary" />
              <h2 className="text-lg font-semibold text-white">鼓谱列表</h2>
            </div>
            <button
              onClick={() => setShowScoreModal(true)}
              className="p-2 bg-accent-secondary/20 text-text-secondary rounded-lg hover:bg-accent-secondary/30 hover:text-white transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {scores.length === 0 ? (
              <div className="text-center py-8 text-text-muted">暂无鼓谱，点击上方按钮添加</div>
            ) : (
              scores.map((score) => (
                <div
                  key={score.id}
                  className="flex items-center justify-between p-3 bg-bg-panel/50 rounded-lg"
                >
                  <div>
                    <div className="text-white font-medium">{score.name}</div>
                    <div className="text-text-secondary text-sm">
                      {score.totalMeasures} 小节 • {score.beatsPerMeasure}/4
                    </div>
                  </div>
                  <button
                    onClick={() => removeScore(score.id)}
                    className="p-2 text-text-muted hover:text-accent-primary transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-bg-secondary rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-accent-primary" />
              <h2 className="text-lg font-semibold text-white">速度阶梯列表</h2>
            </div>
            <button
              onClick={() => setShowLadderModal(true)}
              className="p-2 bg-accent-secondary/20 text-text-secondary rounded-lg hover:bg-accent-secondary/30 hover:text-white transition-all"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {ladders.length === 0 ? (
              <div className="text-center py-8 text-text-muted">暂无阶梯，点击上方按钮添加</div>
            ) : (
              ladders.map((ladder) => (
                <div
                  key={ladder.id}
                  className="flex items-center justify-between p-3 bg-bg-panel/50 rounded-lg"
                >
                  <div>
                    <div className="text-white font-medium">{ladder.name}</div>
                    <div className="text-text-secondary text-sm">
                      {ladder.startBpm} → {ladder.endBpm} BPM • 间隔 {ladder.interval}
                    </div>
                  </div>
                  <button
                    onClick={() => removeLadder(ladder.id)}
                    className="p-2 text-text-muted hover:text-accent-primary transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-bg-secondary rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-accent-primary" />
          <h2 className="text-lg font-semibold text-white">练习样本列表</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {samples.map((sample) => {
            const score = scores.find((s) => s.id === sample.scoreId);
            const ladder = ladders.find((l) => l.id === sample.ladderId);
            return (
              <div
                key={sample.id}
                onClick={() => selectSample(sample.id)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  selectedSampleId === sample.id
                    ? 'bg-accent-primary/20 border-2 border-accent-primary shadow-glow-sm'
                    : 'bg-bg-panel/50 border-2 border-transparent hover:border-accent-secondary'
                }`}
              >
                <div className="text-white font-medium text-lg">{sample.studentName}</div>
                <div className="text-text-secondary text-sm mt-1">
                  鼓谱：{score?.name || '未知'}
                </div>
                <div className="text-text-secondary text-sm">
                  阶梯：{ladder?.name || '未知'} ({ladder?.startBpm}-{ladder?.endBpm} BPM)
                </div>
                <div className="text-text-muted text-xs mt-2">
                  {new Date(sample.date).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showScoreModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-bg-secondary rounded-xl p-6 w-full max-w-md animate-slide-in">
            <h3 className="text-xl font-bold text-white mb-4">添加鼓谱</h3>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFileUpload(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-accent-primary bg-accent-primary/10'
                  : 'border-accent-secondary/50 hover:border-accent-secondary'
              }`}
            >
              <Upload className="w-12 h-12 mx-auto text-text-muted mb-2" />
              <p className="text-text-secondary">拖拽 JSON 文件到此处或点击上传</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-accent-secondary/30" />
              <span className="text-text-muted text-sm">或手动创建</span>
              <div className="flex-1 h-px bg-accent-secondary/30" />
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-text-secondary mb-1 text-sm">鼓谱名称</label>
                <input
                  type="text"
                  value={newScore.name}
                  onChange={(e) => setNewScore({ ...newScore, name: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-panel rounded-lg text-white border border-accent-secondary/30 focus:border-accent-primary focus:outline-none"
                  placeholder="输入鼓谱名称"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-secondary mb-1 text-sm">小节数</label>
                  <input
                    type="number"
                    value={newScore.totalMeasures}
                    onChange={(e) =>
                      setNewScore({ ...newScore, totalMeasures: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 bg-bg-panel rounded-lg text-white border border-accent-secondary/30 focus:border-accent-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-text-secondary mb-1 text-sm">拍/小节</label>
                  <input
                    type="number"
                    value={newScore.beatsPerMeasure}
                    onChange={(e) =>
                      setNewScore({ ...newScore, beatsPerMeasure: parseInt(e.target.value) || 4 })
                    }
                    className="w-full px-4 py-2 bg-bg-panel rounded-lg text-white border border-accent-secondary/30 focus:border-accent-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowScoreModal(false)}
                className="flex-1 px-4 py-2 bg-accent-secondary/20 text-text-secondary rounded-lg hover:bg-accent-secondary/30 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleCreateScore}
                disabled={!newScore.name}
                className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {showLadderModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-bg-secondary rounded-xl p-6 w-full max-w-md animate-slide-in">
            <h3 className="text-xl font-bold text-white mb-4">添加速度阶梯</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-text-secondary mb-1 text-sm">阶梯名称</label>
                <input
                  type="text"
                  value={newLadder.name}
                  onChange={(e) => setNewLadder({ ...newLadder, name: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-panel rounded-lg text-white border border-accent-secondary/30 focus:border-accent-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-text-secondary mb-1 text-sm">阶梯模式</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewLadder({ ...newLadder, jumpStrategy: 'stepwise' })}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      newLadder.jumpStrategy === 'stepwise'
                        ? 'bg-accent-primary text-white'
                        : 'bg-bg-panel text-text-secondary'
                    }`}
                  >
                    等间隔
                  </button>
                  <button
                    onClick={() => setNewLadder({ ...newLadder, jumpStrategy: 'custom' })}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      newLadder.jumpStrategy === 'custom'
                        ? 'bg-accent-primary text-white'
                        : 'bg-bg-panel text-text-secondary'
                    }`}
                  >
                    自定义跳档
                  </button>
                </div>
              </div>
              {newLadder.jumpStrategy === 'stepwise' ? (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-text-secondary mb-1 text-sm">起始 BPM</label>
                    <input
                      type="number"
                      value={newLadder.startBpm}
                      onChange={(e) =>
                        setNewLadder({ ...newLadder, startBpm: parseInt(e.target.value) || 60 })
                      }
                      className="w-full px-4 py-2 bg-bg-panel rounded-lg text-white border border-accent-secondary/30 focus:border-accent-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-text-secondary mb-1 text-sm">终止 BPM</label>
                    <input
                      type="number"
                      value={newLadder.endBpm}
                      onChange={(e) =>
                        setNewLadder({ ...newLadder, endBpm: parseInt(e.target.value) || 140 })
                      }
                      className="w-full px-4 py-2 bg-bg-panel rounded-lg text-white border border-accent-secondary/30 focus:border-accent-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-text-secondary mb-1 text-sm">间隔</label>
                    <input
                      type="number"
                      value={newLadder.interval}
                      onChange={(e) =>
                        setNewLadder({ ...newLadder, interval: parseInt(e.target.value) || 10 })
                      }
                      className="w-full px-4 py-2 bg-bg-panel rounded-lg text-white border border-accent-secondary/30 focus:border-accent-primary focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-text-secondary mb-1 text-sm">
                    自定义 BPM 列表（逗号分隔）
                  </label>
                  <input
                    type="text"
                    value={newLadder.customTiers}
                    onChange={(e) => setNewLadder({ ...newLadder, customTiers: e.target.value })}
                    placeholder="60, 80, 100, 120, 140"
                    className="w-full px-4 py-2 bg-bg-panel rounded-lg text-white border border-accent-secondary/30 focus:border-accent-primary focus:outline-none"
                  />
                </div>
              )}
              <div className="p-3 bg-bg-panel/50 rounded-lg">
                <div className="text-text-secondary text-sm mb-2">阶梯预览</div>
                <div className="flex flex-wrap gap-2">
                  {previewTiers.map((tier) => (
                    <span
                      key={tier.order}
                      className="px-2 py-1 bg-accent-secondary/30 text-white rounded text-sm font-mono"
                    >
                      {tier.bpm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLadderModal(false)}
                className="flex-1 px-4 py-2 bg-accent-secondary/20 text-text-secondary rounded-lg hover:bg-accent-secondary/30 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleCreateLadder}
                disabled={!newLadder.name}
                className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {showSampleModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-bg-secondary rounded-xl p-6 w-full max-w-md animate-slide-in">
            <h3 className="text-xl font-bold text-white mb-4">创建练习样本</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-text-secondary mb-1 text-sm">学生姓名</label>
                <input
                  type="text"
                  value={newSample.studentName}
                  onChange={(e) => setNewSample({ ...newSample, studentName: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-panel rounded-lg text-white border border-accent-secondary/30 focus:border-accent-primary focus:outline-none"
                  placeholder="输入学生姓名"
                />
              </div>
              <div>
                <label className="block text-text-secondary mb-1 text-sm">选择鼓谱</label>
                <select
                  value={newSample.scoreId}
                  onChange={(e) => setNewSample({ ...newSample, scoreId: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-panel rounded-lg text-white border border-accent-secondary/30 focus:border-accent-primary focus:outline-none"
                >
                  <option value="">请选择鼓谱</option>
                  {scores.map((score) => (
                    <option key={score.id} value={score.id}>
                      {score.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-text-secondary mb-1 text-sm">选择速度阶梯</label>
                <select
                  value={newSample.ladderId}
                  onChange={(e) => setNewSample({ ...newSample, ladderId: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-panel rounded-lg text-white border border-accent-secondary/30 focus:border-accent-primary focus:outline-none"
                >
                  <option value="">请选择速度阶梯</option>
                  {ladders.map((ladder) => (
                    <option key={ladder.id} value={ladder.id}>
                      {ladder.name} ({ladder.startBpm}-{ladder.endBpm})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSampleModal(false)}
                className="flex-1 px-4 py-2 bg-accent-secondary/20 text-text-secondary rounded-lg hover:bg-accent-secondary/30 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleCreateSample}
                disabled={!newSample.studentName || !newSample.scoreId || !newSample.ladderId}
                className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
