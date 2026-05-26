import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, BookOpen, Clock, Trophy, AlertTriangle, FileText, Archive, Shield, UserCheck, FileSpreadsheet, History } from 'lucide-react';
import type { Difficulty } from '@/types';
import { DIFFICULTY_LABELS } from '@/types';
import { DIFFICULTY_CONFIG } from '@/data/gameConfig';
import { useGameStore } from '@/store/useGameStore';

const difficultyInfo: Record<Difficulty, { description: string; color: string }> = {
  easy: {
    description: '8张卡牌，5分钟，适合新手入门',
    color: 'from-green-500 to-emerald-500',
  },
  normal: {
    description: '12张卡牌，6分钟，标准难度',
    color: 'from-blue-500 to-indigo-500',
  },
  hard: {
    description: '16张卡牌，7分钟，挑战模式',
    color: 'from-red-500 to-rose-500',
  },
};

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('normal');
  const [showRules, setShowRules] = useState(false);
  const startGame = useGameStore((state) => state.startGame);

  const handleStartGame = () => {
    startGame(selectedDifficulty);
    navigate('/game');
  };

  const handleViewHistory = () => {
    navigate('/history');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-12 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl">
              <Archive size={40} className="text-white" />
            </div>
          </div>
          <h1 className="mb-3 text-4xl font-bold text-white md:text-5xl">
            资料归档审计卡牌
          </h1>
          <p className="text-lg text-slate-400">
            通过卡牌分类游戏，掌握档案管理规则，提升归档准确率
          </p>
        </div>

        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
              <FileText className="text-blue-400" size={24} />
            </div>
            <h3 className="mb-2 font-semibold text-white">卡牌分类</h3>
            <p className="text-sm text-slate-400">
              将不同来源的材料正确分类为合同、发票或保密材料
            </p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/20">
              <Shield className="text-red-400" size={24} />
            </div>
            <h3 className="mb-2 font-semibold text-white">保密审核</h3>
            <p className="text-sm text-slate-400">
              正确设置保密级别，避免信息泄露风险
            </p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20">
              <UserCheck className="text-green-400" size={24} />
            </div>
            <h3 className="mb-2 font-semibold text-white">借阅管理</h3>
            <p className="text-sm text-slate-400">
              及时登记借阅信息，确保档案可追溯
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-white">选择难度</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {(Object.keys(difficultyInfo) as Difficulty[]).map((difficulty) => (
              <button
                key={difficulty}
                onClick={() => setSelectedDifficulty(difficulty)}
                className={`rounded-xl border-2 p-6 text-left transition-all ${
                  selectedDifficulty === difficulty
                    ? 'border-transparent bg-gradient-to-br ' + difficultyInfo[difficulty].color + ' text-white shadow-xl scale-105'
                    : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="mb-2 text-xl font-bold">{DIFFICULTY_LABELS[difficulty]}</div>
                <div className={`text-sm ${selectedDifficulty === difficulty ? 'text-white/80' : 'text-slate-500'}`}>
                  {difficultyInfo[difficulty].description}
                </div>
                <div className={`mt-4 flex items-center gap-4 text-xs ${selectedDifficulty === difficulty ? 'text-white/70' : 'text-slate-500'}`}>
                  <div className="flex items-center gap-1">
                    <FileSpreadsheet size={14} />
                    {DIFFICULTY_CONFIG[difficulty].cardCount} 张卡牌
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    {Math.floor(DIFFICULTY_CONFIG[difficulty].timeLimit / 60)} 分钟
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <button
            onClick={() => setShowRules(!showRules)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-left transition-colors hover:bg-slate-800"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="text-amber-400" size={20} />
              <span className="font-medium text-white">查看归档规则说明</span>
            </div>
            <span className="text-slate-400">{showRules ? '收起' : '展开'}</span>
          </button>

          {showRules && (
            <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
              <h3 className="mb-4 font-semibold text-white">归档分类标准</h3>
              <div className="space-y-4 text-sm text-slate-300">
                <div className="rounded-lg bg-blue-500/10 p-4">
                  <div className="mb-2 font-medium text-blue-400">📄 合同类材料</div>
                  <ul className="list-disc space-y-1 pl-5 text-slate-400">
                    <li>双方或多方签署的具有法律效力的文件</li>
                    <li>涉及经济往来、权利义务约定</li>
                    <li>保密级别范围：内部~机密</li>
                    <li>保管期限：永久或30年</li>
                  </ul>
                </div>
                <div className="rounded-lg bg-green-500/10 p-4">
                  <div className="mb-2 font-medium text-green-400">🧾 发票类材料</div>
                  <ul className="list-disc space-y-1 pl-5 text-slate-400">
                    <li>财务凭证、报销单据</li>
                    <li>包含税号、金额、开票日期</li>
                    <li>保密级别范围：内部~秘密</li>
                    <li>保管期限：30年或10年</li>
                  </ul>
                </div>
                <div className="rounded-lg bg-red-500/10 p-4">
                  <div className="mb-2 font-medium text-red-400">🔒 保密材料</div>
                  <ul className="list-disc space-y-1 pl-5 text-slate-400">
                    <li>标注保密字样的文件</li>
                    <li>涉及商业秘密、技术秘密</li>
                    <li>保密级别范围：秘密~绝密</li>
                    <li>保管期限：永久或30年</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="mb-2 flex items-center gap-2 font-medium text-amber-400">
                  <AlertTriangle size={16} />
                  常见错误提示
                </div>
                <ul className="space-y-2 text-sm text-amber-200/80">
                  <li>⚠️ 保密级别错误：所选级别与材料实际密级不符</li>
                  <li>⚠️ 保管期限错误：所选期限与材料类型不匹配</li>
                  <li>⚠️ 借阅未登记：有借阅记录但未进行登记</li>
                  <li>⚠️ 分类错误：将材料归为错误的大类</li>
                </ul>
              </div>

              <div className="mt-4 rounded-lg bg-slate-700/50 p-4">
                <div className="mb-2 font-medium text-white">📊 评分规则</div>
                <div className="grid gap-2 text-sm text-slate-300">
                  <div className="flex justify-between">
                    <span>正确分类</span>
                    <span className="text-green-400">+10分</span>
                  </div>
                  <div className="flex justify-between">
                    <span>保密级别正确</span>
                    <span className="text-green-400">+5分</span>
                  </div>
                  <div className="flex justify-between">
                    <span>保管期限正确</span>
                    <span className="text-green-400">+5分</span>
                  </div>
                  <div className="flex justify-between">
                    <span>借阅登记正确</span>
                    <span className="text-green-400">+5分</span>
                  </div>
                  <div className="flex justify-between">
                    <span>连击加成</span>
                    <span className="text-blue-400">每次+2分（最高+10分）</span>
                  </div>
                  <div className="border-t border-slate-600 pt-2">
                    <div className="flex justify-between">
                      <span>分类错误</span>
                      <span className="text-red-400">-10分，中断连击</span>
                    </div>
                    <div className="flex justify-between">
                      <span>其他错误</span>
                      <span className="text-red-400">-5分/项</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <button
            onClick={handleStartGame}
            className="flex flex-1 items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 active:scale-95"
          >
            <Play size={24} />
            开始游戏
          </button>
          <button
            onClick={handleViewHistory}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800/50 px-6 py-4 font-medium text-slate-300 transition-colors hover:bg-slate-700"
          >
            <History size={20} />
            历史记录
          </button>
        </div>
      </div>
    </div>
  );
};
