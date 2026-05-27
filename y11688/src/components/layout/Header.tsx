import React, { useState, useEffect } from 'react';
import {
  Camera,
  Download,
  History,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
} from 'lucide-react';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useSceneStore } from '@/store/useSceneStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { captureScreenshot, exportReport } from '@/services/exporter';
import { slopes } from '@/data/slopes';
import { accidents } from '@/data/accidents';
import { trajectories } from '@/data/trajectories';
import { patrolReports } from '@/data/patrols';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { validationErrors } = useSceneStore();
  const { currentVersionId, versions } = useHistoryStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const errorCount = validationErrors.filter((e) => e.severity === 'error').length;
  const warningCount = validationErrors.filter((e) => e.severity === 'warning').length;

  const handleScreenshot = () => {
    captureScreenshot('scene-container', 'ski-risk-map');
  };

  const handleExportReport = () => {
    exportReport(slopes, accidents, trajectories, patrolReports);
  };

  return (
    <header className="h-14 bg-slate-900/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm">雪山滑雪场 - 坡度风险图</h1>
            <p className="text-white/50 text-xs">实时风险监控系统</p>
          </div>
        </div>

        <div className="h-6 w-px bg-white/10" />

        <div className="flex items-center gap-2 text-xs">
          <Clock className="w-3.5 h-3.5 text-white/50" />
          <span className="text-white/70 font-mono">
            {currentTime.toLocaleString('zh-CN')}
          </span>
        </div>

        <Badge variant="default">
          版本 {currentVersionId}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        {validationErrors.length > 0 && (
          <div className="flex items-center gap-2 mr-2">
            {errorCount > 0 && (
              <Badge variant="error">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {errorCount} 错误
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="warning">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {warningCount} 警告
              </Badge>
            )}
          </div>
        )}

        {validationErrors.length === 0 && (
          <Badge variant="success" className="mr-2">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            数据正常
          </Badge>
        )}

        <IconButton
          icon={<History className="w-4 h-4" />}
          onClick={() => navigate('/history')}
          title="历史记录"
        />

        <IconButton
          icon={<Camera className="w-4 h-4" />}
          onClick={handleScreenshot}
          title="截图导出"
        />

        <Button
          variant="secondary"
          size="sm"
          onClick={handleExportReport}
          className="ml-2"
        >
          <Download className="w-4 h-4 mr-1.5" />
          导出报告
        </Button>
      </div>
    </header>
  );
};
