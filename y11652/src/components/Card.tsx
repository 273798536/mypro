import React from 'react';
import { FileText, Archive, Shield, Clock, UserCheck, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import type { Card } from '@/types';
import { CARD_SOURCE_LABELS, MATERIAL_TYPE_LABELS } from '@/types';

interface CardComponentProps {
  card: Card;
  showAnswer?: boolean;
  isCorrect?: boolean;
  className?: string;
}

const sourceIcons: Record<string, React.ReactNode> = {
  file_card: <FileText size={18} />,
  archive_box: <Archive size={18} />,
  security_tag: <Shield size={18} />,
  retention_tag: <Clock size={18} />,
  borrow_request: <UserCheck size={18} />,
  archive_report: <FileSpreadsheet size={18} />,
};

const sourceColors: Record<string, string> = {
  file_card: 'bg-blue-100 text-blue-700',
  archive_box: 'bg-amber-100 text-amber-700',
  security_tag: 'bg-red-100 text-red-700',
  retention_tag: 'bg-purple-100 text-purple-700',
  borrow_request: 'bg-green-100 text-green-700',
  archive_report: 'bg-gray-100 text-gray-700',
};

const typeColors: Record<string, string> = {
  contract: 'border-blue-500 bg-blue-50',
  invoice: 'border-green-500 bg-green-50',
  confidential: 'border-red-500 bg-red-50',
};

export const CardComponent: React.FC<CardComponentProps> = ({
  card,
  showAnswer = false,
  isCorrect,
  className = '',
}) => {
  return (
    <div
      className={`relative rounded-xl border-l-4 p-6 shadow-lg transition-all duration-300 ${
        showAnswer
          ? isCorrect
            ? 'border-l-green-500 bg-green-50'
            : 'border-l-red-500 bg-red-50 animate-pulse'
          : typeColors[card.materialType]
      } ${className}`}
    >
      {card.hasBorrowRequest && (
        <div className="absolute -right-2 -top-2 flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-xs font-medium text-white shadow-md">
          <UserCheck size={14} />
          借阅
        </div>
      )}

      <div className="mb-4 flex items-start justify-between">
        <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${sourceColors[card.source]}`}>
          {sourceIcons[card.source]}
          {CARD_SOURCE_LABELS[card.source]}
        </div>

        {showAnswer && (
          <div className={`rounded-full px-3 py-1 text-xs font-medium ${
            isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {isCorrect ? '✓ 正确' : '✗ 错误'}
          </div>
        )}
      </div>

      <h3 className="mb-3 text-lg font-bold text-gray-800">{card.title}</h3>
      
      <p className="mb-4 text-sm leading-relaxed text-gray-600 line-clamp-4">
        {card.content}
      </p>

      {card.hasBorrowRequest && (
        <div className="mb-4 rounded-lg bg-orange-50 p-3 text-xs text-orange-700">
          <div className="font-medium">借阅信息：</div>
          <div>借阅人：{card.borrower}</div>
          <div>借阅日期：{card.borrowDate}</div>
        </div>
      )}

      {showAnswer && (
        <div className="rounded-lg bg-white p-3 text-sm">
          <div className="mb-2 font-medium text-gray-700">正确答案：</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>分类：{MATERIAL_TYPE_LABELS[card.materialType]}</div>
            <div>保密级别：{card.correctSecurityLevel === 'internal' ? '内部' : 
              card.correctSecurityLevel === 'secret' ? '秘密' :
              card.correctSecurityLevel === 'confidential' ? '机密' :
              card.correctSecurityLevel === 'top_secret' ? '绝密' : '公开'}</div>
            <div>保管期限：{card.correctRetentionPeriod === 'permanent' ? '永久' : card.correctRetentionPeriod === '30years' ? '30年' : '10年'}</div>
            <div>借阅登记：{card.hasBorrowRequest ? '需要' : '不需要'}</div>
          </div>
        </div>
      )}

      {!showAnswer && (
        <div className="flex flex-wrap gap-2">
          {card.hints.slice(0, 2).map((hint, index) => (
            <div key={index} className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs text-gray-500">
              <AlertTriangle size={12} />
              {hint}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
