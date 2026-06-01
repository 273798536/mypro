import { useState } from 'react';
import { Link2, ArrowRight, FileText, Download, Clock, Database } from 'lucide-react';
import { 
  useAppStore, 
  useSelectedFlywheel, 
  useSelectedResult, 
  useFlywheelVelocities,
  useFlywheelErrors 
} from '../../store/useAppStore';
import { downloadReport } from '../../engine/reportGenerator';
import { formatTimestamp } from '../../utils/formatters';
import { formatInertia, formatTorque, formatOmega, formatAlpha } from '../../utils/unitConverter';

export function TraceabilityPanel() {
  const flywheel = useSelectedFlywheel();
  const result = useSelectedResult();
  const velocities = useFlywheelVelocities();
  const { samplingGaps } = useFlywheelErrors();
  const { reports, generateReport } = useAppStore();
  const [selectedVelocityId, setSelectedVelocityId] = useState<string | null>(null);
  
  const flywheelReports = reports.filter(r => r.flywheelId === flywheel?.id);
  
  const handleDownloadReport = (format: 'json' | 'csv') => {
    try {
      const report = generateReport();
      downloadReport(report, format);
    } catch (error) {
      alert('请先选择一个飞轮');
    }
  };
  
  if (!flywheel || !result) {
    return (
      <div className="p-4">
        <p className="text-industrial-500 text-sm">请选择一个飞轮查看详情</p>
      </div>
    );
  }
  
  const selectedVelocity = velocities.find(v => v.id === selectedVelocityId);
  const isVelocityUsed = selectedVelocity 
    ? result.calculationTrace.angularVelocityIds.includes(selectedVelocity.id)
    : false;
  
  const relevantReport = flywheelReports[flywheelReports.length - 1];
  const isVelocityInReport = selectedVelocity && relevantReport
    ? relevantReport.angularVelocityIds.includes(selectedVelocity.id)
    : false;
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-industrial-700">
        <div className="section-title flex items-center gap-2">
          <Link2 size={14} />
          数据追溯链路
        </div>
        <div className="text-xs text-industrial-400">
          飞轮: <span className="text-industrial-200 font-mono">{flywheel.name}</span>
          <span className="mx-2">|</span>
          批次: <span className="text-industrial-200 font-mono">{flywheel.batchNo}</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden flex">
        <div className="w-1/3 border-r border-industrial-700 flex flex-col">
          <div className="p-3 border-b border-industrial-800 bg-industrial-850">
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-tech-400" />
              <span className="text-xs font-mono text-industrial-300">角速度记录</span>
              <span className="ml-auto text-xs text-industrial-500">{velocities.length} 条</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {velocities.map((v, index) => (
              <div
                key={v.id}
                onClick={() => setSelectedVelocityId(v.id)}
                className={`p-2 border-b border-industrial-800 cursor-pointer transition-colors text-xs ${
                  selectedVelocityId === v.id
                    ? 'bg-tech-500/20 border-l-2 border-l-tech-500'
                    : 'hover:bg-industrial-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-industrial-400">
                    #{index + 1} {formatTimestamp(v.timestamp)}
                  </span>
                  {result.calculationTrace.angularVelocityIds.includes(v.id) && (
                    <span className="text-[10px] bg-alert-green/20 text-alert-green px-1 rounded-sm">已采用</span>
                  )}
                </div>
                <div className="font-mono text-industrial-200 mt-0.5">
                  ω={formatOmega(v.omega)} rad/s
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="w-1/3 border-r border-industrial-700 flex flex-col">
          <div className="p-3 border-b border-industrial-800 bg-industrial-850">
            <div className="flex items-center gap-2">
              <Database size={12} className="text-tech-400" />
              <span className="text-xs font-mono text-industrial-300">力矩计算过程</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="industrial-card p-3 mb-3">
              <div className="data-label">计算公式</div>
              <div className="data-value text-tech-400 font-mono text-sm">
                {result.calculationTrace.formula}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="data-label mb-2">计算步骤</div>
              {result.calculationTrace.steps.map((step, index) => (
                <div key={index} className="flex items-center gap-2 p-2 industrial-card text-xs">
                  <span className="w-5 h-5 rounded-sm bg-industrial-700 flex items-center justify-center font-mono text-industrial-400 text-[10px]">
                    {index + 1}
                  </span>
                  <ArrowRight size={10} className="text-industrial-600" />
                  <div className="flex-1">
                    <div className="text-industrial-400">{step.param}</div>
                    <div className="font-mono text-industrial-200">
                      {step.value.toFixed(4)}
                      <span className="text-industrial-500 ml-1 text-[10px]">[{step.source}]</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedVelocity && (
              <div className="mt-4 p-3 industrial-card border-tech-500/50">
                <div className="data-label mb-2">选中记录详情</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="data-label">角速度 ω:</span>
                    <div className="data-value">{formatOmega(selectedVelocity.omega)} rad/s</div>
                  </div>
                  <div>
                    <span className="data-label">角加速度 α:</span>
                    <div className="data-value">{formatAlpha(selectedVelocity.alpha)} rad/s²</div>
                  </div>
                  <div>
                    <span className="data-label">力矩 τ:</span>
                    <div className="data-value">{formatTorque(selectedVelocity.torque)} N·m</div>
                  </div>
                  <div>
                    <span className="data-label">状态:</span>
                    <div className={`data-value ${isVelocityUsed ? 'text-alert-green' : 'text-industrial-500'}`}>
                      {isVelocityUsed ? '已参与计算' : '未采用'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="w-1/3 flex flex-col">
          <div className="p-3 border-b border-industrial-800 bg-industrial-850">
            <div className="flex items-center gap-2">
              <FileText size={12} className="text-tech-400" />
              <span className="text-xs font-mono text-industrial-300">对应报告条目</span>
              <span className="ml-auto text-xs text-industrial-500">{flywheelReports.length} 份</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {flywheelReports.length === 0 ? (
              <p className="text-industrial-500 text-xs text-center py-8">
                暂无报告，请先生成
              </p>
            ) : (
              <div className="space-y-3">
                {flywheelReports.slice().reverse().map(report => (
                  <div key={report.id} className="industrial-card p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm text-tech-400">{report.reportNo}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-sm ${
                        report.status === 'final' 
                          ? 'bg-alert-green/20 text-alert-green'
                          : report.status === 'conflicting'
                          ? 'bg-alert-orange/20 text-alert-orange'
                          : 'bg-industrial-700 text-industrial-400'
                      }`}>
                        {report.status === 'final' ? '已确认' : report.status === 'conflicting' ? '数据冲突' : '草稿'}
                      </span>
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="data-label">报告日期:</span>
                        <span className="text-industrial-300">{report.reportDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="data-label">报告惯量:</span>
                        <span className="text-industrial-300 font-mono">
                          {formatInertia(report.reportedInertia)} {report.reportedUnit}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="data-label">关联记录:</span>
                        <span className="text-industrial-300 font-mono">
                          {report.angularVelocityIds.length} 条
                        </span>
                      </div>
                      {selectedVelocity && (
                        <div className="flex justify-between pt-1 border-t border-industrial-700 mt-1">
                          <span className="data-label">当前记录:</span>
                          <span className={`font-mono ${isVelocityInReport ? 'text-alert-green' : 'text-industrial-500'}`}>
                            {isVelocityInReport ? '已关联' : '未关联'}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => downloadReport(report, 'json')}
                        className="industrial-btn flex-1 flex items-center justify-center gap-1 py-1 text-xs"
                      >
                        <Download size={12} />
                        JSON
                      </button>
                      <button
                        onClick={() => downloadReport(report, 'csv')}
                        className="industrial-btn flex-1 flex items-center justify-center gap-1 py-1 text-xs"
                      >
                        <Download size={12} />
                        CSV
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 p-3 border-t border-industrial-700">
              <div className="section-title text-xs mb-2">导出当前数据</div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadReport('json')}
                  className="industrial-btn-primary flex-1 flex items-center justify-center gap-1 py-2 text-xs"
                >
                  <Download size={12} />
                  导出 JSON
                </button>
                <button
                  onClick={() => handleDownloadReport('csv')}
                  className="industrial-btn-primary flex-1 flex items-center justify-center gap-1 py-2 text-xs"
                >
                  <Download size={12} />
                  导出 CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
