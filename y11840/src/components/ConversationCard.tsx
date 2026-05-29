import type { ConversationCard as ConversationCardType } from '@/types';
import { EmotionBadge } from './EmotionBadge';
import { IntentBadge } from './IntentBadge';
import { DirtyDataHint } from './DirtyDataHint';
import { MessageCircle, Bot, StickyNote, Clock, AlertCircle, History } from 'lucide-react';

interface ConversationCardProps {
  card: ConversationCardType;
  index: number;
  total: number;
  hint?: string | null;
}

export function ConversationCard({ card, index, total, hint }: ConversationCardProps) {
  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden animate-slide-in">
      <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
            {index + 1}
          </div>
          <div>
            <h3 className="text-white font-medium">会话 #{card.id.slice(-3).toUpperCase()}</h3>
            <p className="text-xs text-gray-400">第 {index + 1} / {total} 条</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EmotionBadge
            emotion={card.emotion}
            confidence={card.emotionConfidence}
          />
          <IntentBadge
            intent={card.intent}
            confidence={card.intentConfidence}
          />
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <MessageCircle className="w-4 h-4" />
            <span>客户消息</span>
          </div>
          <div className={`ml-6 p-4 rounded-xl ${card.customerMessage === '[客户消息为空]' ? 'bg-red-500/10 border border-red-500/30' : 'bg-slate-700/40'}`}>
            <p className={`text-base leading-relaxed ${card.customerMessage === '[客户消息为空]' ? 'text-red-400 italic' : 'text-white'}`}>
              {card.customerMessage}
            </p>
          </div>
        </div>

        {card.botReplyHistory.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <History className="w-4 h-4" />
              <span>历史机器人回复 ({card.botReplyHistory.length} 条)</span>
              {card.botReplyHistory.length >= 2 && card.botReplyHistory.every(h => h === card.botReplyHistory[0]) && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  重复回复
                </span>
              )}
            </div>
            <div className="ml-6 space-y-2">
              {card.botReplyHistory.slice(0, 3).map((reply, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-700/30 border border-slate-600/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Bot className="w-3 h-3 text-cyan-400" />
                    <span className="text-xs text-cyan-400">AI 回复 #{idx + 1}</span>
                  </div>
                  <p className="text-sm text-gray-300">{reply}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {card.botReply && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Bot className="w-4 h-4" />
              <span>当前机器人回复</span>
            </div>
            <div className="ml-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <p className="text-base text-cyan-100 leading-relaxed">{card.botReply}</p>
            </div>
          </div>
        )}

        {!card.botReply && card.botReplyHistory.length === 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-orange-400">
              <Bot className="w-4 h-4" />
              <span>机器人回复</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-orange-500/20 border border-orange-500/30">
                缺失
              </span>
            </div>
            <div className="ml-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
              <p className="text-sm text-orange-300 italic">
                ⚠️ 此问题超出AI知识库范围，无有效回复
              </p>
            </div>
          </div>
        )}

        {card.remarks && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-yellow-400">
              <StickyNote className="w-4 h-4" />
              <span>培训师备注</span>
            </div>
            <div className="ml-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-sm text-yellow-200">{card.remarks}</p>
            </div>
          </div>
        )}

        {card.isDirty && (
          <DirtyDataHint
            dirtyFields={card.dirtyFields}
            action={card.dirtyDataAction}
            customHint={hint || undefined}
          />
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
          <Clock className="w-3.5 h-3.5" />
          <span>创建于 {new Date(card.createdAt).toLocaleString('zh-CN')}</span>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-slate-700/50">
            难度: {card.difficulty === 'easy' ? '简单' : card.difficulty === 'medium' ? '中等' : '困难'}
          </span>
        </div>
      </div>
    </div>
  );
}
