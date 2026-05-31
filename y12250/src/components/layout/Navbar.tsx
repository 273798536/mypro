import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, PlayCircle, Upload, User } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { useState } from 'react';

export default function Navbar() {
  const location = useLocation();
  const { playerName, setPlayerName } = useGameStore();
  const [editing, setEditing] = useState(false);
  const [tempName, setTempName] = useState(playerName);

  const isActive = (path: string) => location.pathname === path;

  const handleSaveName = () => {
    if (tempName.trim()) {
      setPlayerName(tempName.trim());
    }
    setEditing(false);
  };

  return (
    <nav className="bg-defi-card border-b border-defi-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-defi-accent to-defi-purple flex items-center justify-center">
              <span className="text-defi-bg font-bold text-xl">D</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-defi-text">DeFi清算迷宫</h1>
              <p className="text-xs text-defi-text-muted">抵押率结算模拟器</p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isActive('/')
                  ? 'bg-defi-accent text-defi-bg'
                  : 'text-defi-text-muted hover:bg-defi-bg-light hover:text-defi-text'
              }`}
            >
              <Home size={18} />
              <span>关卡选择</span>
            </Link>
            <Link
              to="/leaderboard"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isActive('/leaderboard')
                  ? 'bg-defi-accent text-defi-bg'
                  : 'text-defi-text-muted hover:bg-defi-bg-light hover:text-defi-text'
              }`}
            >
              <Trophy size={18} />
              <span>排行榜</span>
            </Link>
            <Link
              to="/import"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isActive('/import')
                  ? 'bg-defi-accent text-defi-bg'
                  : 'text-defi-text-muted hover:bg-defi-bg-light hover:text-defi-text'
              }`}
            >
              <Upload size={18} />
              <span>导入数据</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="bg-defi-bg border border-defi-border rounded px-3 py-1 text-sm text-defi-text w-32"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') {
                      setTempName(playerName);
                      setEditing(false);
                    }
                  }}
                />
                <button
                  onClick={handleSaveName}
                  className="text-defi-accent text-sm hover:underline"
                >
                  保存
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 text-defi-text-muted hover:text-defi-text transition-colors"
              >
                <User size={18} />
                <span className="text-sm">{playerName}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="md:hidden border-t border-defi-border">
        <div className="flex justify-around py-2">
          <Link
            to="/"
            className={`flex flex-col items-center gap-1 p-2 rounded ${
              isActive('/') ? 'text-defi-accent' : 'text-defi-text-muted'
            }`}
          >
            <Home size={20} />
            <span className="text-xs">关卡</span>
          </Link>
          <Link
            to="/leaderboard"
            className={`flex flex-col items-center gap-1 p-2 rounded ${
              isActive('/leaderboard') ? 'text-defi-accent' : 'text-defi-text-muted'
            }`}
          >
            <Trophy size={20} />
            <span className="text-xs">排行</span>
          </Link>
          <Link
            to="/import"
            className={`flex flex-col items-center gap-1 p-2 rounded ${
              isActive('/import') ? 'text-defi-accent' : 'text-defi-text-muted'
            }`}
          >
            <Upload size={20} />
            <span className="text-xs">导入</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
