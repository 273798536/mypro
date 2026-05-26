import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { Button } from '@/components/common/Button';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Play, Pause, SkipBack, SkipForward, Home, AlertTriangle, CheckCircle, Send, Settings } from 'lucide-react';

export const ReplayPage = () => {
  const navigate = useNavigate();
  const { actionHistory, report } = useGameStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  if (!report || actionHistory.length === 0) {
    navigate('/');
    return null;
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'dispatch': return <Send size={16} className="text-snow-blue-500" />;
      case 'equip': return <Settings size={16} className="text-purple-500" />;
      case 'rescue': return <CheckCircle size={16} className="text-green-500" />;
      case 'warning': return <AlertTriangle size={16} className="text-orange-500" />;
      case 'correction': return <CheckCircle size={16} className="text-blue-500" />;
      case 'game': return <Play size={16} className="text-gray-500" />;
      default: return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'dispatch': return 'border-snow-blue-300 bg-snow-blue-50';
      case 'equip': return 'border-purple-300 bg-purple-50';
      case 'rescue': return 'border-green-300 bg-green-50';
      case 'warning': return 'border-orange-300 bg-orange-50';
      case 'correction': return 'border-blue-300 bg-blue-50';
      case 'game': return 'border-gray-300 bg-gray-50';
      default: return 'border-gray-200 bg-white';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'dispatch': return '派遣';
      case 'equip': return '装备';
      case 'rescue': return '救援';
      case 'warning': return '警告';
      case 'correction': return '修正';
      case 'game': return '游戏';
      default: return type;
    }
  };

  const handlePlay = () => {
    if (currentIndex >= actionHistory.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  if (isPlaying && currentIndex < actionHistory.length - 1) {
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 800);
  } else if (currentIndex >= actionHistory.length - 1) {
    setIsPlaying(false);
  }

  const currentAction = actionHistory[currentIndex];

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => navigate('/result')}>
            <Home size={20} className="mr-2" />
            返回结果
          </Button>
          <h1 className="text-2xl font-bold text-gray-800 font-display">操作回放</h1>
          <div className="w-24" />
        </div>

        <Card variant="elevated" className="mb-6">
          <CardContent className="py-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">
                {currentIndex + 1} / {actionHistory.length}
              </span>
              <span className="text-lg font-mono text-gray-700">
                {formatTime(currentAction.timestamp)}
              </span>
            </div>

            <div className={`p-4 rounded-lg border-2 mb-6 ${getTypeColor(currentAction.type)}`}>
              <div className="flex items-center gap-3 mb-2">
                {getTypeIcon(currentAction.type)}
                <span className="text-xs font-medium uppercase text-gray-500">
                  {getTypeLabel(currentAction.type)}
                </span>
              </div>
              <p className="text-gray-800 font-medium">{currentAction.description}</p>
              {Object.keys(currentAction.details).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                    {JSON.stringify(currentAction.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-4">
              <Button
                variant="secondary"
                onClick={() => setCurrentIndex(0)}
                disabled={currentIndex === 0}
              >
                <SkipBack size={20} />
              </Button>
              <Button
                variant="secondary"
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
              >
                上一步
              </Button>
              {isPlaying ? (
                <Button onClick={handlePause}>
                  <Pause size={20} className="mr-2" />
                  暂停
                </Button>
              ) : (
                <Button onClick={handlePlay}>
                  <Play size={20} className="mr-2" />
                  播放
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setCurrentIndex(prev => Math.min(actionHistory.length - 1, prev + 1))}
                disabled={currentIndex === actionHistory.length - 1}
              >
                下一步
              </Button>
              <Button
                variant="secondary"
                onClick={() => setCurrentIndex(actionHistory.length - 1)}
                disabled={currentIndex === actionHistory.length - 1}
              >
                <SkipForward size={20} />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card variant="default">
          <CardHeader>
            <h3 className="font-semibold text-gray-800">完整时间线</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {actionHistory.map((action, index) => (
                <button
                  key={action.id}
                  onClick={() => {
                    setCurrentIndex(index);
                    setIsPlaying(false);
                  }}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    index === currentIndex
                      ? getTypeColor(action.type) + ' ring-2 ring-snow-blue-500'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getTypeIcon(action.type)}
                    <span className="text-xs text-gray-500 w-16 font-mono">
                      {formatTime(action.timestamp)}
                    </span>
                    <span className="flex-1 text-sm text-gray-700 truncate">
                      {action.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
