import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Volume2, Users, FileText, Loader2, AlertTriangle, Upload } from 'lucide-react';
import { useSoundscapeStore } from '@/store/useSoundscapeStore';
import type { Difficulty } from '../../shared/types';

const difficultyConfig: Record<Difficulty, { label: string; className: string }> = {
  easy: { label: '简单', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  medium: { label: '中等', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  hard: { label: '困难', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export default function LevelLobby() {
  const { levels, loading, error, fetchLevels, importPackage, fetchJudgments, judgments } = useSoundscapeStore();
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  const handleImport = async () => {
    if (!importJson.trim()) return;
    setImporting(true);
    setImportSuccess(false);
    try {
      const parsed = JSON.parse(importJson);
      const success = await importPackage(parsed);
      if (success) {
        setImportSuccess(true);
        setImportJson('');
        setTimeout(() => setImportSuccess(false), 3000);
      }
    } catch (err) {
      alert('JSON 解析失败，请检查格式');
    } finally {
      setImporting(false);
    }
  };

  const handleCardClick = async (levelId: string) => {
    await fetchJudgments(levelId);
  };

  const hasJudgmentsForLevel = (levelId: string) => {
    return judgments.some((j) => j.levelId === levelId);
  };

  if (loading && levels.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 text-center bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          城市声景混音局
        </h1>
        <p className="text-center text-[var(--text-secondary)] mb-8">
          选择关卡，开始你的声景审判之旅
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-300">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {levels.map((level) => {
            const config = difficultyConfig[level.difficulty];
            const hasJudgments = hasJudgmentsForLevel(level.id);

            return (
              <div
                key={level.id}
                className="bg-[var(--bg-secondary)] rounded-xl p-6 border border-white/10 hover:border-amber-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10"
              >
                <Link
                  to={`/level/${level.id}`}
                  onClick={() => handleCardClick(level.id)}
                  className="block"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                      {level.name}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${config.className}`}
                    >
                      {config.label}
                    </span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Volume2 className="w-4 h-4 text-amber-400" />
                      <span>{level.sourceCount} 个声源</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <Users className="w-4 h-4 text-green-400" />
                      <span>{level.emotionCount} 个居民情绪</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span>{level.reportCount} 份混音报告</span>
                    </div>
                  </div>

                  <div className="text-xs text-[var(--text-secondary)]">
                    夜间阈值：{level.nightThresholdDb} dB
                  </div>
                </Link>

                {hasJudgments && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <Link
                      to={`/report/${level.id}`}
                      className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      <FileText className="w-4 h-4" />
                      查看溯源报告
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-[var(--bg-secondary)] rounded-xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-amber-400" />
            导入关卡包
          </h2>
          <div className="space-y-4">
            <textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder="粘贴关卡 JSON 数据..."
              className="w-full h-32 bg-[var(--bg-primary)] border border-white/10 rounded-lg p-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-amber-500/50 resize-none"
            />
            <button
              onClick={handleImport}
              disabled={importing || !importJson.trim()}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {importing ? '导入中...' : '导入'}
            </button>
            {importSuccess && (
              <p className="text-green-400 text-sm">关卡导入成功！</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
