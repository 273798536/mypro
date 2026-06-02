import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Calendar, Clock, AlertTriangle, CheckCircle2, FileText, Server, Thermometer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mockAlarms, mockRacks, mockVents } from '../data/mockData';
import { exportReport } from '../utils/reportGenerator';
import { useToastStore } from '../store/useToastStore';

export function ReportPage() {
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);
  const { showToast } = useToastStore();

  const criticalCount = mockAlarms.filter((a) => a.level === 'critical').length;
  const warningCount = mockAlarms.filter((a) => a.level === 'warning').length;
  const normalRacks = mockRacks.filter((r) => r.status === 'normal').length;
  const warningRacks = mockRacks.filter((r) => r.status === 'warning' || r.status === 'critical').length;

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      const result = await exportReport();
      if (result.success) {
        showToast('success', `报告已导出：${result.filename}`);
      } else {
        showToast('error', `导出失败：${result.error || '未知错误'}`);
      }
    } catch (error) {
      showToast('error', `导出失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">数据中心巡检报告</h1>
                <p className="text-sm text-gray-400">
                  生成时间: {new Date().toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  导出中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  导出报告
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-4 gap-4"
          >
            <StatCard
              icon={<AlertTriangle className="w-5 h-5" />}
              label="严重告警"
              value={criticalCount}
              color="text-red-400"
              bgColor="bg-red-500/20"
            />
            <StatCard
              icon={<AlertTriangle className="w-5 h-5" />}
              label="警告告警"
              value={warningCount}
              color="text-orange-400"
              bgColor="bg-orange-500/20"
            />
            <StatCard
              icon={<Server className="w-5 h-5" />}
              label="正常机柜"
              value={normalRacks}
              color="text-green-400"
              bgColor="bg-green-500/20"
            />
            <StatCard
              icon={<Server className="w-5 h-5" />}
              label="异常机柜"
              value={warningRacks}
              color="text-cyan-400"
              bgColor="bg-cyan-500/20"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6"
          >
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              一、巡检概述
            </h2>
            <div className="space-y-3 text-gray-300 text-sm">
              <p>
                本次巡检覆盖数据中心全部机柜、空调系统、线缆桥架及温度传感器。
                系统通过3D可视化技术实现全方位监控。
              </p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="text-xs text-gray-500">巡检范围</div>
                  <div className="text-gray-200">A区 + B区 冷热通道</div>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="text-xs text-gray-500">巡检时长</div>
                  <div className="text-gray-200">约 15 分钟</div>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="text-xs text-gray-500">机柜总数</div>
                  <div className="text-gray-200">{mockRacks.length} 台</div>
                </div>
                <div className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="text-xs text-gray-500">空调风口</div>
                  <div className="text-gray-200">{mockVents.length} 个</div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6"
          >
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              二、告警详情及处理建议
            </h2>
            <div className="space-y-4">
              {mockAlarms.map((alarm, index) => (
                <motion.div
                  key={alarm.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className={`p-4 rounded-xl border ${
                    alarm.level === 'critical'
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-orange-500/10 border-orange-500/30'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${
                      alarm.level === 'critical' ? 'bg-red-500/20' : 'bg-orange-500/20'
                    }`}>
                      <AlertTriangle className={`w-5 h-5 ${
                        alarm.level === 'critical' ? 'text-red-400' : 'text-orange-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{alarm.message}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          alarm.level === 'critical' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                        }`}>
                          {alarm.level === 'critical' ? '严重' : '警告'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 space-y-1">
                        <p className="flex items-center gap-2">
                          <FileText className="w-3 h-3" />
                          触发材料: {alarm.sourceMaterial}
                        </p>
                        <p className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          卡点位置: {alarm.blockPoint}
                        </p>
                      </div>
                      <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                        <div className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                          处理步骤
                        </div>
                        <div className="text-xs text-gray-400 whitespace-pre-line">
                          {alarm.nextStep}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {alarm.clues.map((clue) => (
                          <span
                            key={clue.id}
                            className="text-xs px-2 py-0.5 rounded bg-gray-700/50 text-gray-300"
                          >
                            {clue.description}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {new Date(alarm.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6"
          >
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-cyan-400" />
              三、3D可视化监控说明
            </h2>
            <div className="space-y-3 text-sm text-gray-300">
              <p>
                本系统采用 Three.js + React Three Fiber 技术栈实现数据中心3D可视化监控，
                主要功能包括：
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  <span className="text-cyan-400">实时3D展示</span>：支持旋转、缩放、平移操作
                </li>
                <li>
                  <span className="text-cyan-400">温场可视化</span>：以色温图形式展示各区域温度分布
                </li>
                <li>
                  <span className="text-cyan-400">告警联动</span>：点击告警自动定位至相关设备
                </li>
                <li>
                  <span className="text-cyan-400">多线索归并</span>：自动关联机柜、风口、桥架到同一事件
                </li>
                <li>
                  <span className="text-cyan-400">一键截图</span>：支持3D场景截图导出
                </li>
                <li>
                  <span className="text-cyan-400">筛选同步</span>：3D视图与侧边栏筛选条件实时同步
                </li>
              </ul>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6"
          >
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              四、巡检结论
            </h2>
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <p className="text-sm text-gray-300">
                本次巡检发现 <span className="text-red-400 font-medium">{criticalCount} 处严重问题</span>，
                <span className="text-orange-400 font-medium"> {warningCount} 处警告问题</span>。
                建议优先处理严重告警，确保数据中心安全稳定运行。
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <div>巡检员: 系统自动生成</div>
              <div>报告版本: v1.0</div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}

function StatCard({ icon, label, value, color, bgColor }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-4 bg-gray-900/50 rounded-xl border border-gray-800"
    >
      <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center mb-3`}>
        <span className={color}>{icon}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </motion.div>
  );
}
