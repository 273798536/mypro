import React from 'react';
import { FileText, Building2, CreditCard, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card as CardType } from '@/types';
import { cn } from '@/lib/utils';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  compact?: boolean;
}

const statusColors = {
  normal: 'border-emerald-500 bg-emerald-50',
  warning: 'border-amber-500 bg-amber-50',
  danger: 'border-red-500 bg-red-50',
  unknown: 'border-slate-300 bg-white',
};

const statusIcons = {
  normal: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-600" />,
  danger: <AlertTriangle className="w-4 h-4 text-red-600" />,
  unknown: null,
};

export const Card: React.FC<CardProps> = ({ card, onClick, compact = false }) => {
  const getCardIcon = () => {
    switch (card.type) {
      case 'invoice':
        return <FileText className="w-6 h-6" />;
      case 'customer':
        return <Building2 className="w-6 h-6" />;
      case 'payment':
        return <CreditCard className="w-6 h-6" />;
    }
  };

  const getCardTitle = () => {
    switch (card.type) {
      case 'invoice':
        return '发票';
      case 'customer':
        return '客户';
      case 'payment':
        return '付款';
    }
  };

  const getCardDetails = () => {
    switch (card.type) {
      case 'invoice':
        return (
          <>
            <div className="text-xs text-slate-500">发票号: {card.data.invoiceNo}</div>
            <div className="text-xs text-slate-500">金额: ¥{card.data.amount.toLocaleString()}</div>
            <div className="text-xs text-slate-500">日期: {card.data.date}</div>
          </>
        );
      case 'customer':
        return (
          <>
            <div className="text-xs text-slate-500 truncate">{card.data.companyName}</div>
            <div className="text-xs text-slate-500">
              {card.data.role === 'seller' ? '销方' : '购方'}
            </div>
          </>
        );
      case 'payment':
        return (
          <>
            <div className="text-xs text-slate-500">付款号: {card.data.paymentId}</div>
            <div className="text-xs text-slate-500">金额: ¥{card.data.amount.toLocaleString()}</div>
            <div className="text-xs text-slate-500">日期: {card.data.date}</div>
          </>
        );
    }
  };

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'p-2 rounded border-2 cursor-pointer transition-all duration-200 hover:shadow-md',
          statusColors[card.status],
          card.isSelected && 'ring-2 ring-amber-400 ring-offset-1'
        )}
      >
        <div className="flex items-center gap-2">
          {getCardIcon()}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-800">{getCardTitle()}</div>
            {getCardDetails()}
          </div>
          {statusIcons[card.status]}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1',
        statusColors[card.status],
        card.isSelected && 'ring-4 ring-amber-400 ring-offset-2'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {getCardIcon()}
          <span className="font-bold text-slate-800">{getCardTitle()}</span>
        </div>
        {statusIcons[card.status]}
      </div>
      <div className="space-y-1">{getCardDetails()}</div>
      {card.type === 'invoice' && (
        <div className="mt-2 pt-2 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            销方: {card.data.seller}
          </div>
          <div className="text-xs text-slate-500">
            购方: {card.data.buyer}
          </div>
        </div>
      )}
      {card.type === 'payment' && (
        <div className="mt-2 pt-2 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            关联发票: {card.data.relatedInvoice}
          </div>
        </div>
      )}
    </div>
  );
};
