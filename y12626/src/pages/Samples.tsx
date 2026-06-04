import React, { useState } from 'react';
import { Database, Play, AlertTriangle, FileWarning, FileQuestion, Palette, MapPin, Shuffle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { sampleScenarios } from '../data/samples';
import { formatDateTime } from '../utils/coordinate';

const Samples: React.FC = () => {
  const loadSampleData = useAppStore(state => state.loadSampleData);
  const setViewMode = useAppStore(state => state.setViewMode);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleLoadSample = async (sampleId: string) => {
    setLoadingId(sampleId);
    setTimeout(() => {
      loadSampleData(sampleId);
      setLoadingId(null);
      setViewMode('dashboard');
    }, 300);
  };

  const scenarioConfigs = [
    {
      id: 'old-table',
      icon: FileWarning,
      color: 'text-ochre-600',
      bgColor: 'bg-ochre-50',
      borderColor: 'border-ochre-300',
      description: '旧表数据混录，坐标精度不足、近似值混录问题',
      features: ['坐标精度保留位数不足', '近似值约等号混用', '新旧表格式混杂']
    },
    {
      id: 'supplementary',
      icon: FileQuestion,
      color: 'text-rattan-600',
      bgColor: 'bg-rattan-50',
      borderColor: 'border-rattan-300',
      description: '多人补录、备注格式不统一问题',
      features: ['多人接力补录', '备注格式混乱', '补录标识缺失', '时间戳不一致']
    },
    {
      id: 'missing-unit',
      icon: AlertTriangle,
      color: 'text-ochre-500',
      bgColor: 'bg-ochre-50',
      borderColor: 'border-ochre-300',
      description: '海拔单位缺失、公尺/米混用问题',
      features: ['单位缺失', '公尺/米混用', '数值单位写错']
    },
    {
      id: 'color-out-of-range',
      icon: Palette,
      color: 'text-cinnabar-600',
      bgColor: 'bg-cinnabar-50',
      borderColor: 'border-cinnabar-300',
      description: '颜色越界问题，荧光黄、纯黑、纯白等异常颜色',
      features: ['荧光黄#FFFF00', '纯黑#000000', '纯白#FFFFFF', '亮度过高/过低']
    },
    {
      id: 'boundary-misjudge',
      icon: MapPin,
      color: 'text-cinnabar-700',
      bgColor: 'bg-cinnabar-50',
      borderColor: 'border-cinnabar-400',
      description: '边界误判典型案例，核心区越界、吸附前后状态变化',
      features: ['核心区越界', '缓冲区边界点', '吸附前后对比']
    },
    {
      id: 'mixed-chaos',
      icon: Shuffle,
      color: 'text-ink-600',
      bgColor: 'bg-xuan-100',
      borderColor: 'border-ochre-400',
      description: '综合混乱场景，以上所有问题混合',
      features: ['所有问题类型', '真实工作场景', '训练员综合考核']
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="bg-xuan-50 border-2 border-ochre-400 rounded-lg shadow-card overflow-hidden">
        <div className="bg-xuan-100 border-b-2 border-ochre-400 px-6 py-4 flex items-center gap-3">
          <Database className="w-8 h-8 text-ochre-600" />
          <div>
            <h1 className="brush-font text-2xl text-ink-600">样例中心</h1>
            <p className="text-sm text-ochre-600 font-serif">
              选择典型问题场景，快速加载进行训练
            </p>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarioConfigs.map(config => {
              const sample = sampleScenarios.find(s => s.id === config.id);
              const Icon = config.icon;
              
              return (
                <div
                  key={config.id}
                  className={`border-2 ${config.borderColor} rounded-lg overflow-hidden hover:shadow-card transition-all hover:scale-105`}
                >
                  <div className={`${config.bgColor} px-4 py-3 border-b ${config.borderColor} border-opacity-50 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${config.color}`} />
                      <h3 className="font-serif text-ink-700">{sample?.name}</h3>
                    </div>
                    <span className="text-xs text-ochre-600">
                      {sample?.points.length || 0} 点
                    </span>
                  </div>
                  <div className="bg-white p-4">
                    <p className="text-sm text-ochre-600 mb-3">
                      {config.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {config.features.map((f, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-0.5 rounded ${config.bgColor} ${config.color}`}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-ochre-500">
                        <p>材料：{sample?.materials.length || 0} 份</p>
                        <p>创建：{sample ? formatDateTime(sample.batch.createTime) : '-'}</p>
                      </div>
                      <button
                        onClick={() => handleLoadSample(config.id)}
                        disabled={loadingId === config.id}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm text-white ${
                          loadingId === config.id
                            ? 'bg-ochre-300'
                            : 'bg-ochre-500 hover:bg-ochre-600'
                        } transition-colors`}
                      >
                        <Play className="w-3.5 h-3.5" />
                        {loadingId === config.id ? '加载中...' : '加载'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white border border-ochre-300 rounded-lg p-4">
        <h3 className="font-serif text-lg text-ink-600 mb-3">使用说明</h3>
        <div className="grid grid-cols-3 gap-4 text-sm text-ochre-600">
          <div className="flex items-start gap-2">
            <span className="w-6 h-6 bg-ochre-100 rounded flex items-center justify-center text-ochre-700 font-serif">1</span>
            <div>
              <p className="text-ink-600 font-serif">选择样例场景</p>
              <p className="text-xs">根据训练目标选择对应问题类型的样例</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-6 h-6 bg-ochre-100 rounded flex items-center justify-center text-ochre-700 font-serif">2</span>
            <div>
              <p className="text-ink-600 font-serif">查看分析结果</p>
              <p className="text-xs">系统自动检测边界碰撞、颜色越界等问题</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-6 h-6 bg-ochre-100 rounded flex items-center justify-center text-ochre-700 font-serif">3</span>
            <div>
              <p className="text-ink-600 font-serif">复核并导出报告</p>
              <p className="text-xs">标记修正，导出审计报告</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Samples;
