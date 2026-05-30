import { useState } from 'react';
import { FileText, Database, Ship, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface SourceSectionProps {
  title: string;
  icon: React.ReactNode;
  filename: string;
  details: string[];
}

function SourceSection({ title, icon, filename, details }: SourceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center gap-3 bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
      >
        {icon}
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-slate-200">{title}</div>
          <div className="text-xs text-slate-400 font-mono">{filename}</div>
        </div>
        {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
      </button>

      {isExpanded && (
        <div className="p-3 bg-slate-900/50 border-t border-slate-700">
          <ul className="space-y-2">
            {details.map((detail, index) => (
              <li key={index} className="text-xs text-slate-400 flex items-start gap-2">
                <span className="text-blue-400">›</span>
                {detail}
              </li>
            ))}
          </ul>
          <button className="mt-3 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
            <ExternalLink size={12} />
            查看原始文件
          </button>
        </div>
      )}
    </div>
  );
}

export function SourcePanel() {
  const selectedRecord = useAppStore((state) => state.getSelectedRecord());

  if (!selectedRecord) return null;

  const source = selectedRecord.source;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-200">数据溯源</h3>
      
      <div className="space-y-2">
        <SourceSection
          title="船舶模型"
          icon={<Ship size={16} className="text-blue-400" />}
          filename={source.vesselModel}
          details={[
            '模型版本: v2.3',
            '主尺寸: 180m × 32m × 12m',
            '排水量: 45,000 DWT',
            '建模软件: AutoCAD 2024',
          ]}
        />

        <SourceSection
          title="压载水报告"
          icon={<Database size={16} className="text-cyan-400" />}
          filename={source.ballastReport}
          details={[
            '生成时间: 2026-05-29 14:00',
            '测量方法: 超声波液位计',
            '操作员: 张轮机长',
            '审核状态: 待审核',
          ]}
        />

        <SourceSection
          title="稳性计算书"
          icon={<FileText size={16} className="text-emerald-400" />}
          filename={source.stabilityReport}
          details={[
            '计算软件: NAPA 2024',
            '工况: 离港状态',
            '海水密度: 1.025 t/m³',
            '横摇周期: 12.5s',
          ]}
        />
      </div>

      <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
        <div className="text-xs text-slate-500 mb-2">数据校验</div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-slate-400">三份数据源时间戳一致</span>
        </div>
      </div>
    </div>
  );
}
