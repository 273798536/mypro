import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, UserCog, ShieldCheck, GitBranch } from 'lucide-react';
import type { AppRole } from '../../types';

/**
 * 顶部导航栏属性接口
 */
interface TopBarProps {
  /** 当前用户角色 */
  role: AppRole;
  /** 角色切换回调 */
  onRoleChange: (role: AppRole) => void;
  /** 当前版本标签 */
  versionLabel?: string;
}

/**
 * 顶部导航栏组件
 * 包含面包屑导航、角色切换下拉菜单、版本选择器
 */
export function TopBar({ role, onRoleChange, versionLabel = 'v2025.06.11-r3' }: TopBarProps) {
  const location = useLocation();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const versionDropdownRef = useRef<HTMLDivElement>(null);

  /** 路由路径与面包屑名称映射 */
  const pathToBreadcrumb: Record<string, string> = {
    '/': '投喂日历',
    '/samples': '样本管理',
    '/workflow': 'AI/ML 工作流',
    '/review': '复核报告',
  };

  /** 当前页面名称 */
  const currentPage = pathToBreadcrumb[location.pathname] || '首页';

  /** 模拟版本列表 */
  const versions = [
    'v2025.06.11-r3',
    'v2025.06.10-r2',
    'v2025.06.08-r1',
  ];

  /** 点击外部关闭下拉菜单 */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(false);
      }
      if (versionDropdownRef.current && !versionDropdownRef.current.contains(e.target as Node)) {
        setVersionDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-deep-ocean/10 flex items-center justify-between px-6">
      {/* 左侧：面包屑导航 */}
      <div className="flex items-center gap-2">
        <span className="text-deep-ocean/40 text-sm">首页</span>
        <span className="text-deep-ocean/30">/</span>
        <span className="text-deep-ocean font-medium text-sm">{currentPage}</span>
      </div>

      {/* 右侧：工具区 */}
      <div className="flex items-center gap-4">
        {/* 版本选择器 */}
        <div className="relative" ref={versionDropdownRef}>
          <button
            onClick={() => setVersionDropdownOpen(!versionDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-deep-ocean/15 hover:bg-paper-dark transition-colors"
          >
            <GitBranch size={16} className="text-deep-ocean/60" />
            <span className="text-sm text-deep-ocean font-mono">{versionLabel}</span>
            <ChevronDown size={16} className="text-deep-ocean/40" />
          </button>

          {versionDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-card border border-deep-ocean/10 py-1 z-20">
              {versions.map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setVersionDropdownOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    v === versionLabel
                      ? 'bg-deep-ocean/5 text-deep-ocean font-medium'
                      : 'text-deep-ocean/70 hover:bg-paper-dark'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 角色切换下拉菜单 */}
        <div className="relative" ref={roleDropdownRef}>
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-deep-ocean/15 hover:bg-paper-dark transition-colors"
          >
            {role === 'researcher' ? (
              <UserCog size={16} className="text-deep-ocean/60" />
            ) : (
              <ShieldCheck size={16} className="text-life-green" />
            )}
            <span className="text-sm text-deep-ocean">
              {role === 'researcher' ? '研究员' : '质控组'}
            </span>
            <ChevronDown size={16} className="text-deep-ocean/40" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-card border border-deep-ocean/10 py-1 z-20">
              <button
                onClick={() => {
                  onRoleChange('researcher');
                  setRoleDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                  role === 'researcher'
                    ? 'bg-deep-ocean/5 text-deep-ocean font-medium'
                    : 'text-deep-ocean/70 hover:bg-paper-dark'
                }`}
              >
                <UserCog size={16} />
                研究员
              </button>
              <button
                onClick={() => {
                  onRoleChange('qc');
                  setRoleDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
                  role === 'qc'
                    ? 'bg-deep-ocean/5 text-deep-ocean font-medium'
                    : 'text-deep-ocean/70 hover:bg-paper-dark'
                }`}
              >
                <ShieldCheck size={16} />
                质控组
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
