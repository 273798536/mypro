import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  WifiOff,
  TrendingUp,
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  FileWarning,
  Download,
  Camera,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { AnomalyRecord, AnomalyType, SeverityLevel } from '../../types';

export function RightPanel() {
  const {
    rightPanelCollapsed,
    setRightPanelCollapsed,
    anomalies,
    selectedAnomalyId,
    setSelectedAnomalyId,
    selectedTab,
    setSelectedTab,
  } = useAppStore();

  if (rightPanelCollapsed) {
    return (
      <div className="h-full bg-slate-800 border-l border-slate-700 flex flex-col">
        <button
          onClick={() => setRightPanelCollapsed(false)}
          className="p-3 hover:bg-slate-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className="flex-1 flex flex-col items-center py-4 gap-2">
          <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold">
            {anomalies.length}
          </div>
          <span className="text-[10px] text-gray-400 transform -rotate-90 whitespace-nowrap mt-4">
            异常检测
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-800 border-l border-slate-700 flex flex-col w-80">
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-white font-bold text-sm">分析面板</h2>
        <button
          onClick={() => setRightPanelCollapsed(true)}
          className="p-1 hover:bg-slate-700 rounded transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      <div className="flex border-b border-slate-700">
        <TabButton
          label="异常检测"
          active={selectedTab === 'anomaly'}
          onClick={() => setSelectedTab('anomaly')}
          count={anomalies.length}
        />
        <TabButton
          label="报告导出"
          active={selectedTab === 'report'}
          onClick={() => setSelectedTab('report')}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {selectedTab === 'anomaly' && (
          <AnomalyTabContent
            anomalies={anomalies}
            selectedId={selectedAnomalyId}
            onSelect={setSelectedAnomalyId}
          />
        )}
        {selectedTab === 'report' && <ReportTabContent />}
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 px-3 text-xs font-medium transition-colors relative ${
        active
          ? 'text-blue-400 border-b-2 border-blue-400'
          : 'text-gray-400 hover:text-gray-300'
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </button>
  );
}

function AnomalyTabContent({
  anomalies,
  selectedId,
  onSelect,
}: {
  anomalies: AnomalyRecord[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [filter, setFilter] = useState<AnomalyType | 'all'>('all');

  const filteredAnomalies =
    filter === 'all' ? anomalies : anomalies.filter((a) => a.type === filter);

  const selectedAnomaly = anomalies.find((a) => a.id === selectedId);

  return (
    <div className="p-3">
      <div className="flex gap-1 mb-3">
        <FilterButton label="全部" active={filter === 'all'} onClick={() => setFilter('all')} />
        <FilterButton
          label="裂缝重复"
          active={filter === 'duplicate_crack'}
          onClick={() => setFilter('duplicate_crack')}
        />
        <FilterButton
          label="传感器"
          active={filter === 'sensor_offline'}
          onClick={() => setFilter('sensor_offline')}
        />
        <FilterButton
          label="水位突变"
          active={filter === 'water_level_spike'}
          onClick={() => setFilter('water_level_spike')}
        />
      </div>
      <div className="space-y-2 mb-4">
        {filteredAnomalies.map((anomaly) => (
          <AnomalyCard
            key={anomaly.id}
            anomaly={anomaly}
            isSelected={selectedId === anomaly.id}
            onClick={() => onSelect(selectedId === anomaly.id ? null : anomaly.id)}
          />
        ))}
      </div>
      {selectedAnomaly && selectedAnomaly.pathHistory && (
        <FailurePathVisualization path={selectedAnomaly.pathHistory} />
      )}
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-[10px] rounded transition-colors ${
        active ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-400 hover:bg-slate-600'
      }`}
    >
      {label}
    </button>
  );
}

function AnomalyCard({
  anomaly,
  isSelected,
  onClick,
}: {
  anomaly: AnomalyRecord;
  isSelected: boolean;
  onClick: () => void;
}) {
  const getTypeIcon = (type: AnomalyType) => {
    switch (type) {
      case 'duplicate_crack':
        return <Copy className="w-4 h-4" />;
      case 'sensor_offline':
        return <WifiOff className="w-4 h-4" />;
      case 'water_level_spike':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getSeverityStyle = (severity: SeverityLevel) => {
    switch (severity) {
      case 'low':
        return 'bg-yellow-900/50 text-yellow-400 border-yellow-700';
      case 'medium':
        return 'bg-orange-900/50 text-orange-400 border-orange-700';
      case 'high':
        return 'bg-red-900/50 text-red-400 border-red-700';
      case 'critical':
        return 'bg-red-950 text-red-300 border-red-600 animate-pulse';
      default:
        return 'bg-gray-700 text-gray-400';
    }
  };

  const getTypeLabel = (type: AnomalyType) => {
    switch (type) {
      case 'duplicate_crack':
        return '裂缝重复';
      case 'sensor_offline':
        return '传感器离线';
      case 'water_level_spike':
        return '水位突变';
      default:
        return '未知';
    }
  };

  const getSeverityLabel = (severity: SeverityLevel) => {
    switch (severity) {
      case 'low':
        return '低';
      case 'medium':
        return '中';
      case 'high':
        return '高';
      case 'critical':
        return '紧急';
      default:
        return '未知';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'bg-blue-900/30 border-blue-500'
          : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className={`p-1.5 rounded ${getSeverityStyle(anomaly.severity)}`}>
          {getTypeIcon(anomaly.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white text-xs font-medium">{getTypeLabel(anomaly.type)}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded border ${getSeverityStyle(
                anomaly.severity
              )}`}
            >
              {getSeverityLabel(anomaly.severity)}
            </span>
          </div>
          <p className="text-gray-400 text-[11px] mt-1 line-clamp-2">{anomaly.description}</p>
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-500">
            <Clock className="w-3 h-3" />
            {anomaly.timestamp.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

function FailurePathVisualization({ path }: { path: NonNullable<AnomalyRecord['pathHistory']> }) {
  return (
    <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
      <div className="flex items-center gap-2 mb-3">
        <FileWarning className="w-4 h-4 text-amber-400" />
        <span className="text-white text-xs font-bold">失败路径追踪</span>
      </div>
      <div className="relative">
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-600" />
        <div className="space-y-3">
          {path.map((node, idx) => (
            <div key={idx} className="relative flex gap-3">
              <div
                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                  node.result === 'success'
                    ? 'bg-green-600'
                    : node.result === 'failure'
                    ? 'bg-red-600'
                    : 'bg-yellow-600'
                }`}
              >
                {node.result === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : node.result === 'failure' ? (
                  <XCircle className="w-4 h-4 text-white" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-white text-xs font-medium">
                    步骤 {node.step}: {node.action}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {node.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p
                  className={`text-[11px] mt-1 ${
                    node.result === 'success'
                      ? 'text-green-400'
                      : node.result === 'failure'
                      ? 'text-red-400'
                      : 'text-yellow-400'
                  }`}
                >
                  {node.details}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportTabContent() {
  const handleExportReport = () => {
    const reportContent = generateReport();
    const blob = new Blob([reportContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `坝体渗流分析报告_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleScreenshot = () => {
    alert('截图功能：将当前3D视图导出为PNG图片');
  };

  return (
    <div className="p-3">
      <div className="space-y-3">
        <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
          <h3 className="text-white text-sm font-bold mb-2">报告预览</h3>
          <div className="space-y-2 text-xs text-gray-300">
            <div className="flex justify-between">
              <span>生成时间:</span>
              <span>{new Date().toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>分析对象:</span>
              <span>XX水库主坝</span>
            </div>
            <div className="flex justify-between">
              <span>风险等级:</span>
              <span className="text-orange-400 font-bold">⚠️ 警告</span>
            </div>
            <div className="flex justify-between">
              <span>异常数量:</span>
              <span className="text-red-400">4 项</span>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <button
            onClick={handleExportReport}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            导出分析报告
          </button>
          <button
            onClick={handleScreenshot}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Camera className="w-4 h-4" />
            导出当前视图截图
          </button>
        </div>
        <div className="p-3 bg-amber-900/30 border border-amber-700/50 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              <p className="font-medium mb-1">报告包含内容:</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-300">
                <li>所有异常记录及失败路径</li>
                <li>原始材料文件引用与校验</li>
                <li>风险热力图统计数据</li>
                <li>3D视图截图（可选）</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateReport(): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>坝体渗流分析报告</title>
    <style>
        body { font-family: -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
        h1 { color: #1e3a5f; border-bottom: 2px solid #2d9cdb; padding-bottom: 10px; }
        .section { margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 8px; }
        .anomaly { padding: 10px; margin: 10px 0; border-left: 4px solid #e74c3c; background: #fff5f5; }
        .critical { border-left-color: #c53030; background: #fff0f0; }
        .path-step { padding: 8px; margin: 5px 0; background: white; border-radius: 4px; }
        .success { border-left: 3px solid #27ae60; }
        .failure { border-left: 3px solid #e74c3c; }
        .warning { border-left: 3px solid #f39c12; }
    </style>
</head>
<body>
    <h1>水库坝体渗流分析报告</h1>
    <p><strong>生成时间:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>分析对象:</strong> XX水库主坝</p>
    
    <div class="section">
        <h2>一、风险评估</h2>
        <p><strong>总体风险等级:</strong> ⚠️ 警告 (Warning)</p>
        <p><strong>检测到异常:</strong> 4 项</p>
    </div>
    
    <div class="section">
        <h2>二、异常记录</h2>
        
        <div class="anomaly">
            <h3>1. 裂缝重复检测 - 中风险</h3>
            <p>检测到裂缝重复上报：crack-002与crack-001位置重叠（距离0.54m）</p>
            <p><strong>失败路径:</strong></p>
            <div class="path-step success">步骤1: 导入裂缝数据 - 成功导入5条裂缝记录</div>
            <div class="path-step warning">步骤2: 空间距离计算 - crack-002与crack-001距离小于阈值1m</div>
            <div class="path-step failure">步骤3: 特征匹配验证 - 长度、宽度、方向特征匹配度92%</div>
            <div class="path-step warning">步骤4: 标记为重复 - 已将crack-002标记为crack-001的重复记录</div>
        </div>
        
        <div class="anomaly critical">
            <h3>2. 多次重复上报 - 高风险</h3>
            <p>检测到多次重复上报：crack-005为第三次重复上报同一位置</p>
        </div>
        
        <div class="anomaly">
            <h3>3. 传感器离线 - 高风险</h3>
            <p>传感器P-02已离线超过72小时，最后数据更新于3天前</p>
        </div>
        
        <div class="anomaly critical">
            <h3>4. 水位突变 - 紧急</h3>
            <p>水位突变检测：W-01读数30分钟内激增230kPa，超出正常范围</p>
        </div>
    </div>
    
    <div class="section">
        <h2>三、原始材料校验</h2>
        <ul>
            <li>dam_model_v2.obj - MD5: a1b2c3d4e5f6</li>
            <li>crack_points_202401.xlsx - MD5: b2c3d4e5f6a1</li>
            <li>sensor_readings_jan.csv - MD5: c3d4e5f6a1b2</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>四、结论与建议</h2>
        <ol>
            <li><strong>紧急处理:</strong> 核查水位突变原因，确认是否为真实渗流异常</li>
            <li><strong>现场排查:</strong> 尽快安排人员检查离线传感器P-02</li>
            <li><strong>数据清理:</strong> 建议合并重复裂缝记录，统一数据来源</li>
            <li><strong>持续监测:</strong> 高风险区域A需增加巡检频率</li>
        </ol>
    </div>
    
    <p style="text-align: center; color: #666; margin-top: 40px;">
        --- 报告结束 ---<br>
        生成系统: 水库坝体渗流剖面3D交互式工作台
    </p>
</body>
</html>
  `;
}
