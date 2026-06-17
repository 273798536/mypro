import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Bot,
  Save,
  Plus,
  ToggleLeft,
  ToggleRight,
  Zap,
  Shield,
  Clock,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { promptApi } from '../utils/api';
import type { PromptVersion } from '../../shared/types';

export const Settings: React.FC = () => {
  const { promptVersions, activePrompt, fetchPromptVersions } = useStore();

  const [threshold, setThreshold] = useState(0.7);
  const [autoReview, setAutoReview] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('ai-team@company.com');
  const [maxTokens, setMaxTokens] = useState(4096);
  const [showNewPrompt, setShowNewPrompt] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [activatingId, setActivatingId] = useState('');

  useEffect(() => {
    fetchPromptVersions();
  }, [fetchPromptVersions]);

  const handleCreatePrompt = async () => {
    if (!newVersion.trim() || !newContent.trim()) return;

    setSaving(true);
    try {
      await promptApi.create({
        version: newVersion,
        content: newContent,
        description: newDescription,
        createdBy: '王工程师',
        isActive: false
      });
      await fetchPromptVersions();
      setShowNewPrompt(false);
      setNewVersion('');
      setNewContent('');
      setNewDescription('');
    } catch (error) {
      alert('创建失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleActivatePrompt = async (id: string) => {
    if (!confirm('确定要激活此提示词版本吗？激活后旧版本将自动停用。')) return;

    setActivatingId(id);
    try {
      await promptApi.activate(id);
      await fetchPromptVersions();
    } catch (error) {
      alert('激活失败，请重试');
    } finally {
      setActivatingId('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">配置管理</h1>
        <p className="text-gray-500 mt-1">系统配置、提示词版本管理和检测参数设置</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              检测参数
            </h3>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  漂移检测阈值
                  <span className="text-gray-400 font-normal ml-2">
                    当前: {Math.round(threshold * 100)}%
                  </span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>50% 宽松</span>
                  <span>95% 严格</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  当原始标注和AI预测的差异超过此阈值时，判定为意图漂移
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  最大处理 Token 数
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                />
                <p className="text-sm text-gray-500 mt-1">
                  超过此长度的对话会被自动截断，截断原因会记录到报告中
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">自动复核低风险项</p>
                  <p className="text-sm text-gray-500">自动通过置信度 {'>'}90% 的低风险漂移</p>
                </div>
                <button
                  onClick={() => setAutoReview(!autoReview)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {autoReview ? (
                    <ToggleRight className="w-10 h-10" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-gray-400" />
                  )}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Shield className="w-4 h-4 inline mr-1" />
                  告警通知邮箱
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="email@company.com"
                />
                <p className="text-sm text-gray-500 mt-1">
                  高风险漂移检测到时发送告警通知
                </p>
              </div>

              <button
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存配置
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-500" />
                提示词版本管理
              </h3>
              <button
                onClick={() => setShowNewPrompt(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                新建版本
              </button>
            </div>

            {showNewPrompt && (
              <div className="mb-6 p-6 bg-purple-50 border border-purple-200 rounded-xl">
                <h4 className="font-medium text-purple-900 mb-4">新建提示词版本</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">版本号</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={newVersion}
                      onChange={(e) => setNewVersion(e.target.value)}
                      placeholder="例如: v2.1.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">版本说明</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="简要说明此版本的改动"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">提示词内容</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none font-mono text-sm"
                      rows={6}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="请输入系统提示词..."
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowNewPrompt(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleCreatePrompt}
                      disabled={saving || !newVersion.trim() || !newContent.trim()}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {saving ? '创建中...' : '创建版本'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {promptVersions.map((pv) => (
                <div
                  key={pv.id}
                  className={`p-5 rounded-xl border transition-all ${
                    pv.isActive
                      ? 'bg-purple-50 border-purple-300'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900">{pv.version}</span>
                        {pv.isActive && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            当前激活
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{pv.description}</p>
                    </div>
                    {!pv.isActive && (
                      <button
                        onClick={() => handleActivatePrompt(pv.id)}
                        disabled={activatingId === pv.id}
                        className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                      >
                        {activatingId === pv.id ? '激活中...' : '激活此版本'}
                      </button>
                    )}
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                      {pv.content.slice(0, 200)}
                      {pv.content.length > 200 && '...'}
                    </pre>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <span>创建人: {pv.createdBy}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(pv.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-gray-500" />
              系统信息
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">系统版本</span>
                <span className="text-sm font-medium text-gray-900">v2.0.0</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">数据库</span>
                <span className="text-sm font-medium text-gray-900">SQLite</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">数据目录</span>
                <span className="text-sm font-mono text-gray-900">./data</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">提示词版本数</span>
                <span className="text-sm font-medium text-gray-900">{promptVersions.length}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-gray-600">当前激活版本</span>
                <span className="text-sm font-medium text-purple-600">
                  {activePrompt?.version || '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 mb-3">快速操作</h3>
            <div className="space-y-2">
              <a
                href="http://localhost:3001/api/stats/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-white rounded-lg text-sm text-blue-700 hover:bg-blue-50 border border-blue-100"
              >
                📊 查看 Dashboard API
              </a>
              <a
                href="http://localhost:3001/api/conversations"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-white rounded-lg text-sm text-blue-700 hover:bg-blue-50 border border-blue-100"
              >
                💬 查看会话列表 API
              </a>
              <a
                href="http://localhost:3001/api/prompt-versions"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-white rounded-lg text-sm text-blue-700 hover:bg-blue-50 border border-blue-100"
              >
                🤖 查看提示词版本 API
              </a>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-500" />
              脚本示例
            </h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-gray-900 rounded-lg">
                <p className="text-green-400 font-mono text-xs"># 初始化数据库</p>
                <p className="text-gray-300 font-mono text-xs">npx tsx scripts/init-db.ts</p>
              </div>
              <div className="p-3 bg-gray-900 rounded-lg">
                <p className="text-green-400 font-mono text-xs"># 导入样例数据</p>
                <p className="text-gray-300 font-mono text-xs">npx tsx scripts/seed-sample-data.ts</p>
              </div>
              <div className="p-3 bg-gray-900 rounded-lg">
                <p className="text-green-400 font-mono text-xs"># 启动开发服务器</p>
                <p className="text-gray-300 font-mono text-xs">npm run dev</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
