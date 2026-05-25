import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Terminal, Database, Globe, Copy, Check } from 'lucide-react';
import { techViewApi } from '../services/api';

interface HttpLogRecord {
  id: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  requestBody?: string | null;
  responseBody?: string | null;
  createdAt: string;
}

interface SqlLogRecord {
  id: string;
  sql: string;
  params: string;
  duration: number;
  createdAt: string;
}

interface CommandLogRecord {
  id: string;
  command: string;
  output: string;
  exitCode: number;
  createdAt: string;
}

export const TechView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'http' | 'sql' | 'commands'>('http');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: httpLogs } = useQuery<HttpLogRecord[]>({
    queryKey: ['httpLogs'],
    queryFn: async () => {
      const result = await techViewApi.getHttpLogs();
      return result as HttpLogRecord[];
    },
  });

  const { data: sqlLogs } = useQuery<SqlLogRecord[]>({
    queryKey: ['sqlLogs'],
    queryFn: async () => {
      const result = await techViewApi.getSqlLogs();
      return result as SqlLogRecord[];
    },
  });

  const { data: commands } = useQuery<CommandLogRecord[]>({
    queryKey: ['commandLogs'],
    queryFn: async () => {
      const result = await techViewApi.getCommands();
      return result as CommandLogRecord[];
    },
  });

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const tabs = [
    { key: 'http', label: 'HTTP 请求', icon: Globe },
    { key: 'sql', label: 'SQL 语句', icon: Database },
    { key: 'commands', label: '命令脚本', icon: Terminal },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">技术视图</h1>
        <p className="text-sm text-gray-500">
          片区经理专用 - 查看底层技术实现细节
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Terminal className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">技术追踪说明</p>
            <p className="text-sm text-blue-700 mt-1">
              本页面展示系统底层的技术执行记录，包括HTTP请求响应、SQL执行语句、命令行脚本输出。
              所有数据与业务数据来自同一数据源，确保可追溯、可审计。
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-6 py-4 text-sm font-medium flex items-center border-b-2 ${
                  activeTab === tab.key
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'http' && (
            <div className="space-y-4">
              {httpLogs?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">暂无 HTTP 日志</div>
              ) : (
                httpLogs?.slice(0, 20).map((log: any) => (
                  <div
                    key={log.id}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center space-x-3">
                        <span
                          className={`px-2 py-0.5 text-xs font-mono rounded ${
                            log.statusCode >= 200 && log.statusCode < 300
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {log.method}
                        </span>
                        <span className="text-sm font-mono text-gray-700">
                          {log.url}
                        </span>
                        <span className="text-xs text-gray-500">
                          状态: {log.statusCode}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-gray-500">
                          {log.duration}ms
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(log.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                    </div>
                    {log.requestBody && (
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-500">
                            请求体
                          </span>
                          <button
                            onClick={() => copyToClipboard(log.id, log.requestBody)}
                            className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
                          >
                            {copiedId === log.id ? (
                              <Check className="w-3 h-3 mr-1" />
                            ) : (
                              <Copy className="w-3 h-3 mr-1" />
                            )}
                            {copiedId === log.id ? '已复制' : '复制'}
                          </button>
                        </div>
                        <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto font-mono">
                          {JSON.stringify(JSON.parse(log.requestBody), null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-4">
              {sqlLogs?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">暂无 SQL 日志</div>
              ) : (
                sqlLogs?.slice(0, 20).map((log: any) => (
                  <div
                    key={log.id}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs text-gray-500">
                        执行时间: {log.duration}ms
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500">
                          SQL 语句
                        </span>
                        <button
                          onClick={() => copyToClipboard(log.id, log.sql)}
                          className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
                        >
                          {copiedId === log.id ? (
                            <Check className="w-3 h-3 mr-1" />
                          ) : (
                            <Copy className="w-3 h-3 mr-1" />
                          )}
                          {copiedId === log.id ? '已复制' : '复制'}
                        </button>
                      </div>
                      <pre className="bg-blue-900 text-blue-100 p-3 rounded text-xs overflow-x-auto font-mono whitespace-pre-wrap">
                        {log.sql}
                      </pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'commands' && (
            <div className="space-y-4">
              {commands?.length === 0 ? (
                <div className="text-center py-8 text-gray-500">暂无命令记录</div>
              ) : (
                commands?.slice(0, 20).map((cmd: any) => (
                  <div
                    key={cmd.id}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <span
                        className={`px-2 py-0.5 text-xs font-mono rounded ${
                          cmd.exitCode === 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        退出码: {cmd.exitCode}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(cmd.createdAt).toLocaleString('zh-CN')}
                      </span>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-1">
                          命令
                        </span>
                        <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono">
                          $ {cmd.command}
                        </pre>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500 block mb-1">
                          输出
                        </span>
                        <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs font-mono max-h-40 overflow-y-auto">
                          {cmd.output || '(无输出)'}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
