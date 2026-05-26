import { 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Pause, 
  OctagonAlert, 
  CheckCircle, 
  XCircle,
  PauseCircle,
  PlayCircle
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { CommandType, COMMAND_INFO } from '../types/game';
import { cn } from '../lib/utils';

interface CommandButtonProps {
  command: CommandType;
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'primary' | 'danger' | 'success' | 'warning';
  disabled?: boolean;
  onClick: () => void;
}

function CommandButton({ command, icon, label, variant = 'default', disabled, onClick }: CommandButtonProps) {
  const variantClasses = {
    default: 'bg-dark-700 hover:bg-dark-600 text-white border-dark-600',
    primary: 'bg-primary-600 hover:bg-primary-500 text-white border-primary-500',
    danger: 'bg-danger-600 hover:bg-danger-500 text-white border-danger-500',
    success: 'bg-success-600 hover:bg-success-500 text-white border-success-500',
    warning: 'bg-primary-600 hover:bg-primary-500 text-white border-primary-500',
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200",
        "hover:transform hover:-translate-y-0.5 hover:shadow-lg",
        "active:transform active:translate-y-0 active:shadow-none",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none",
        variantClasses[variant]
      )}
      title={COMMAND_INFO[command]?.description}
    >
      {icon}
      <span className="text-sm font-medium mt-2">{label}</span>
    </button>
  );
}

export default function ControlPanel() {
  const { 
    status, 
    executeCommand, 
    pauseGame, 
    resumeGame,
    activeRisks 
  } = useGameStore();
  
  const isPlaying = status === 'playing';
  const isPaused = status === 'paused';
  const hasActiveRisk = activeRisks.some(r => !r.resolved);
  
  const handleCommand = (command: CommandType) => {
    if (isPlaying) {
      executeCommand(command);
    }
  };
  
  return (
    <div className="bg-dark-800/80 backdrop-blur-sm rounded-xl p-5 border border-dark-700">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-white">指挥控制台</h3>
        <div className="flex items-center gap-2">
          {isPlaying && (
            <button
              onClick={pauseGame}
              className="flex items-center gap-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-white text-sm transition-colors"
            >
              <PauseCircle className="w-4 h-4" />
              暂停
            </button>
          )}
          {isPaused && (
            <button
              onClick={resumeGame}
              className="flex items-center gap-2 px-3 py-2 bg-success-600 hover:bg-success-500 rounded-lg text-white text-sm transition-colors"
            >
              <PlayCircle className="w-4 h-4" />
              继续
            </button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <CommandButton
          command="lift"
          icon={<ArrowUp className="w-6 h-6" />}
          label="起吊"
          variant="primary"
          disabled={!isPlaying}
          onClick={() => handleCommand('lift')}
        />
        <CommandButton
          command="lower"
          icon={<ArrowDown className="w-6 h-6" />}
          label="下放"
          variant="primary"
          disabled={!isPlaying}
          onClick={() => handleCommand('lower')}
        />
        <CommandButton
          command="move_left"
          icon={<ArrowLeft className="w-6 h-6" />}
          label="左移"
          disabled={!isPlaying}
          onClick={() => handleCommand('move_left')}
        />
        <CommandButton
          command="move_right"
          icon={<ArrowRight className="w-6 h-6" />}
          label="右移"
          disabled={!isPlaying}
          onClick={() => handleCommand('move_right')}
        />
        <CommandButton
          command="stop"
          icon={<Pause className="w-6 h-6" />}
          label="停止"
          variant="warning"
          disabled={!isPlaying}
          onClick={() => handleCommand('stop')}
        />
        <CommandButton
          command="emergency_stop"
          icon={<OctagonAlert className="w-6 h-6" />}
          label="紧急停止"
          variant="danger"
          disabled={!isPlaying}
          onClick={() => handleCommand('emergency_stop')}
        />
      </div>
      
      <div className="h-px bg-dark-700 my-4" />
      
      <h4 className="text-sm font-medium text-dark-400 mb-3">安全判定</h4>
      <div className="grid grid-cols-2 gap-3">
        <CommandButton
          command="confirm_safe"
          icon={<CheckCircle className="w-6 h-6" />}
          label="确认安全"
          variant="success"
          disabled={!isPlaying}
          onClick={() => handleCommand('confirm_safe')}
        />
        <CommandButton
          command="reject_lift"
          icon={<XCircle className="w-6 h-6" />}
          label="拒绝起吊"
          variant="danger"
          disabled={!isPlaying}
          onClick={() => handleCommand('reject_lift')}
        />
      </div>
      
      {hasActiveRisk && (
        <div className="mt-4 p-3 bg-danger-500/20 border border-danger-500/50 rounded-lg">
          <p className="text-danger-400 text-sm text-center font-medium">
            ⚠️ 检测到风险！请立即紧急停止或拒绝起吊
          </p>
        </div>
      )}
      
      <div className="mt-4 p-3 bg-dark-700/50 rounded-lg">
        <p className="text-dark-400 text-xs">
          <span className="font-medium text-dark-300">操作提示：</span>
          确认当前吊物重量和风速在安全范围内后，点击"确认安全"进入下一回合。如遇风险，请立即选择正确的应对措施。
        </p>
      </div>
    </div>
  );
}
