import React, { useState } from 'react';
import { Waveform } from '../components/Waveform';
import { IssueList } from '../components/IssueList';
import { AudioFileList } from '../components/AudioFileList';
import { SegmentDetail } from '../components/SegmentDetail';
import { LoudnessChart } from '../components/LoudnessChart';
import { VersionCompare } from '../components/VersionCompare';
import { ReportViewer } from '../components/ReportViewer';
import { Play, Pause, ZoomIn, ZoomOut, GitCompare, FileText, Activity, Save } from 'lucide-react';
import { useAudioStore } from '../store/useAudioStore';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

type TabType = 'analysis' | 'compare' | 'report';

export default function Home() {
  const {
    selectedAudioFile,
    currentTime,
    isPlaying,
    viewStart,
    viewEnd,
    togglePlay,
    setViewRange,
    setZoomLevel,
    createVersion,
  } = useAudioStore();

  const [activeTab, setActiveTab] = useState<TabType>('analysis');
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionNote, setVersionNote] = useState('');

  const handleZoomIn = () => {
    if (!selectedAudioFile) return;
    const currentDuration = viewEnd - viewStart;
    const newDuration = Math.max(60, currentDuration * 0.7);
    const center = (viewStart + viewEnd) / 2;
    const newStart = Math.max(0, center - newDuration / 2);
    const newEnd = Math.min(selectedAudioFile.duration, center + newDuration / 2);
    setViewRange(newStart, newEnd);
  };

  const handleZoomOut = () => {
    if (!selectedAudioFile) return;
    const currentDuration = viewEnd - viewStart;
    const newDuration = Math.min(selectedAudioFile.duration, currentDuration * 1.4);
    const center = (viewStart + viewEnd) / 2;
    const newStart = Math.max(0, center - newDuration / 2);
    const newEnd = Math.min(selectedAudioFile.duration, center + newDuration / 2);
    setViewRange(newStart, newEnd);
  };

  const handleSaveVersion = () => {
    createVersion(versionNote || '手动保存版本');
    setVersionNote('');
    setShowVersionModal(false);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-gray-800 bg-[#161b22]">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">播客响度合规检查</h1>
              <p className="text-xs text-gray-400">专业音频问题定位与版本追踪工具</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowVersionModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
            >
              <Save className="w-4 h-4" />
              保存版本
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-gray-800 bg-[#161b22]">
        <div className="px-6 flex items-center gap-1">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'analysis'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            响度分析
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'compare'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <GitCompare className="w-4 h-4 inline mr-2" />
            版本对比
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'report'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            报告导出
          </button>
        </div>
      </div>

      {activeTab === 'analysis' && (
        <div className="p-6">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-2">
              <AudioFileList />
            </div>

            <div className="col-span-7 space-y-4">
              {selectedAudioFile && (
                <div className="bg-[#1a1f36] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={togglePlay}
                        className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center hover:bg-cyan-500/30 transition-colors"
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 text-cyan-400" />
                        ) : (
                          <Play className="w-5 h-5 text-cyan-400 ml-0.5" />
                        )}
                      </button>
                      <div>
                        <div className="text-2xl font-mono text-white">
                          {formatTime(currentTime)}
                        </div>
                        <div className="text-xs text-gray-500">
                          总时长: {formatTime(selectedAudioFile.duration)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleZoomOut}
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleZoomIn}
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewRange(0, selectedAudioFile.duration)}
                        className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-xs"
                      >
                        全景
                      </button>
                    </div>
                  </div>
                  <Waveform height={160} />
                </div>
              )}

              <LoudnessChart height={220} />

              <div className="grid grid-cols-2 gap-4">
                <IssueList />
                <SegmentDetail />
              </div>
            </div>

            <div className="col-span-3">
              <div className="bg-[#1a1f36] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">操作指南</h3>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="font-medium text-cyan-400 mb-1">1. 选择音频文件</div>
                    <p className="text-gray-400 text-xs">从左侧列表选择要检查的音频文件</p>
                  </div>
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="font-medium text-orange-400 mb-1">2. 查看问题</div>
                    <p className="text-gray-400 text-xs">点击问题列表可直接跳转到对应位置</p>
                  </div>
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="font-medium text-purple-400 mb-1">3. 人工修正</div>
                    <p className="text-gray-400 text-xs">在片段详情中可修改片段类型，系统会记录影响</p>
                  </div>
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="font-medium text-green-400 mb-1">4. 导出报告</div>
                    <p className="text-gray-400 text-xs">在报告页面导出完整的合规检查报告</p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="text-sm font-medium text-yellow-400 mb-1">⚠️ 示例数据说明</div>
                  <p className="text-xs text-gray-400">
                    当前使用模拟数据，包含：广告过响、静音段误判、采样率问题、人工修改痕迹等示例场景
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="p-6">
          <div className="max-w-5xl mx-auto">
            <VersionCompare />
          </div>
        </div>
      )}

      {activeTab === 'report' && (
        <div className="p-6">
          <div className="max-w-5xl mx-auto">
            <ReportViewer />
          </div>
        </div>
      )}

      {showVersionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#1a1f36] rounded-xl p-6 w-96 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">保存新版本</h3>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">版本备注</label>
              <textarea
                value={versionNote}
                onChange={(e) => setVersionNote(e.target.value)}
                placeholder="输入版本变更说明..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                rows={3}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowVersionModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveVersion}
                className="px-4 py-2 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
