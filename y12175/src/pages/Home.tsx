import { motion } from 'framer-motion';
import { Music, RefreshCw } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { DurationDashboard } from '@/components/dashboard/DurationDashboard';
import { TrackList } from '@/components/tracklist/TrackList';
import { ValidationPanel } from '@/components/validation/ValidationPanel';
import { RuleConfig } from '@/components/rules/RuleConfig';
import { VersionHistory } from '@/components/history/VersionHistory';
import { VersionCompare } from '@/components/compare/VersionCompare';
import { DataImport } from '@/components/import/DataImport';
import { calculateAndValidate } from '@/services/calculation';

export default function Home() {
  const { tracks, currentValidation, recalculate, compareMode } = useStore();

  const handleVerifyDeterminism = () => {
    const result1 = calculateAndValidate(
      useStore.getState().tracks,
      useStore.getState().ruleSet
    );
    const result2 = calculateAndValidate(
      useStore.getState().tracks,
      useStore.getState().ruleSet
    );

    const isSame = JSON.stringify(result1) === JSON.stringify(result2);
    alert(`重复性验证: ${isSame ? '✓ 通过 - 两次计算结果完全一致' : '✗ 失败 - 结果不一致'}`);
    console.log('Result 1:', result1);
    console.log('Result 2:', result2);
  };

  return (
    <div className="min-h-screen bg-indigo-950">
      <header className="sticky top-0 z-50 bg-indigo-950/95 backdrop-blur border-b border-indigo-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-450/20 rounded-lg">
                <Music className="w-6 h-6 text-amber-450" />
              </div>
              <div>
                <h1 className="font-serif text-xl font-bold text-amber-450">演出曲目时长控台</h1>
                <p className="text-xs text-gray-400">Concert Duration Control Center</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {currentValidation && (
                <button
                  onClick={handleVerifyDeterminism}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-800 hover:bg-indigo-700 rounded-lg text-sm transition-colors"
                  title="验证计算确定性"
                >
                  <RefreshCw className="w-4 h-4" />
                  验证重复
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {tracks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="font-serif text-3xl font-bold text-amber-450 mb-3">
                欢迎使用演出时长控台
              </h2>
              <p className="text-gray-400">
                精准管理演出曲目时长、版本差异和返场规则，确保演出完美按时进行
              </p>
            </div>
            <DataImport />
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <DurationDashboard />

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="xl:col-span-1">
                  <TrackList />
                </div>
                <div className="xl:col-span-1 space-y-6">
                  <ValidationPanel />
                  {compareMode && <VersionCompare />}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <DataImport />
              <RuleConfig />
              <VersionHistory />
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-indigo-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>演出曲目时长控台 v1.0</span>
            <span>边界样例：版本差异检测 · 返场超限 · 换场遗漏 · 确定性验证</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
