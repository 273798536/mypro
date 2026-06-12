import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Search, CheckCircle2, AlertCircle, Send, RefreshCw, User, Download } from 'lucide-react';
import { useTrackerStore } from '../store/useTrackerStore';
import type { DeliveryCard, DeliveryStatus } from '../types';
import { cn } from '../lib/utils';

interface HoverDetailProps {
  card: DeliveryCard;
  type: 'availableItems' | 'pendingItems' | 'recollectItems';
  label: string;
  icon: string;
}

function HoverDetail({ card, type, label, icon }: HoverDetailProps) {
  const items = card[type];
  if (items.length === 0) return null;
  return (
    <div className="mb-2 last:mb-0">
      <div className={cn('text-xs font-medium mb-1', icon)}>{label}（{items.length}）</div>
      <ul className="space-y-0.5 text-xs text-ocean-300">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start">
            <span className="text-ocean-500 mr-1">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface CardProps {
  card: DeliveryCard;
  status: DeliveryStatus;
  onToggle: (id: string, status: DeliveryStatus) => void;
  onExport?: (card: DeliveryCard) => void;
  onContact?: (card: DeliveryCard) => void;
}

function DeliveryCardItem({ card, status, onToggle, onExport, onContact }: CardProps) {
  const [hovered, setHovered] = useState(false);
  const isDirect = status === 'direct_use';
  const toggleTarget: DeliveryStatus = isDirect ? 'need_review' : 'direct_use';

  return (
    <div
      className={cn(
        'nautical-card relative p-4 transition-all duration-200',
        isDirect ? 'border-l-4 border-l-seaweed-500/60' : 'border-l-4 border-l-sand-500/60',
        'hover:shadow-lg hover:-translate-y-0.5'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-display text-lg text-ocean-100 font-semibold">
          {card.buoyName}
          <span className="ml-2 text-sm text-ocean-400 font-mono">{card.buoyCode}</span>
        </h3>
          <div className="text-xs text-ocean-400 mt-0.5">
            {dayjs(card.dataPeriod.start).format('MM-DD')} ～ {dayjs(card.dataPeriod.end).format('MM-DD')}
          </div>
        </div>
        <span className={cn('tag', isDirect ? 'tag-direct' : 'tag-review')}>
          {isDirect ? (
            <><CheckCircle2 className="w-3 h-3 mr-1" />可直接使用</>
          ) : (
            <><AlertCircle className="w-3 h-3 mr-1" />需复核</>
          )}
        </span>
      </div>

      <p className="text-sm text-ocean-300 mb-3 leading-relaxed">{card.shortDescription}</p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="tag tag-available">
          <CheckCircle2 className="w-3 h-3 mr-1" />可用 {card.availableItems.length}
        </span>
        <span className="tag tag-pending">
          <RefreshCw className="w-3 h-3 mr-1" />暂缓 {card.pendingItems.length}
        </span>
        <span className="tag tag-recollect">
          <AlertCircle className="w-3 h-3 mr-1" />重采 {card.recollectItems.length}
        </span>
      </div>

      {!isDirect && card.reviewer && (
        <div className="bg-ocean-800/60 rounded-md p-2.5 mb-3 border border-ocean-700/50">
          <div className="flex items-center text-xs text-ocean-400 mb-1">
            <User className="w-3 h-3 mr-1.5" />
            复核人：<span className="text-ocean-200">{card.reviewer}</span>
          </div>
          {card.reviewNote && (
            <div className="text-xs text-ocean-300 leading-relaxed">{card.reviewNote}</div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-ocean-800/60">
        <span className="text-xs text-ocean-500">
          交付于 {dayjs(card.deliveredAt).format('MM-DD HH:mm')}
        </span>
        <div className="flex gap-2">
          {isDirect ? (
            <button
              onClick={() => onExport?.(card)}
              className="nautical-btn-success text-xs px-3 py-1.5"
            >
              <Download className="w-3.5 h-3.5 mr-1" />导出数据
            </button>
          ) : (
            <button
              onClick={() => onContact?.(card)}
              className="nautical-btn-warn text-xs px-3 py-1.5"
            >
              <Send className="w-3.5 h-3.5 mr-1" />联系监测员
            </button>
          )}
          <button
            onClick={() => onToggle(card.id, toggleTarget)}
            className="nautical-btn text-xs px-3 py-1.5"
          >
            {isDirect ? '标记为需复核' : '标记为可直接使用'}
          </button>
        </div>
      </div>

      {hovered && (
        <div className="absolute left-full top-0 ml-3 w-72 z-20 nautical-card p-3 shadow-2xl animate-float-up">
          <div className="text-sm font-medium text-seafoam-300 mb-2 border-b border-ocean-700/50 pb-2">
            {card.buoyName} 数据详情
          </div>
          <HoverDetail card={card} type="availableItems" label="可用数据" icon="text-seaweed-300" />
          <HoverDetail card={card} type="pendingItems" label="暂缓数据" icon="text-sand-300" />
          <HoverDetail card={card} type="recollectItems" label="需重采数据" icon="text-coral-300" />
        </div>
      )}
    </div>
  );
}

export default function Delivery() {
  const deliveryCards = useTrackerStore((s) => s.deliveryCards);
  const updateDeliveryStatus = useTrackerStore((s) => s.updateDeliveryStatus);

  const [keyword, setKeyword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredCards = useMemo(() => {
    return deliveryCards.filter((c) => {
      if (keyword) {
        const kw = keyword.toLowerCase();
        if (!c.buoyName.toLowerCase().includes(kw) && !c.buoyCode.toLowerCase().includes(kw)) {
          return false;
        }
      }
      if (startDate) {
        if (dayjs(c.dataPeriod.end).isBefore(dayjs(startDate))) return false;
      }
      if (endDate) {
        if (dayjs(c.dataPeriod.start).isAfter(dayjs(endDate).endOf('day'))) return false;
      }
      return true;
    });
  }, [deliveryCards, keyword, startDate, endDate]);

  const directUseCards = filteredCards.filter((c) => c.status === 'direct_use');
  const needReviewCards = filteredCards.filter((c) => c.status === 'need_review');

  const handleExport = (card: DeliveryCard) => {
    const data = JSON.stringify(card, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${card.buoyCode}_delivery_${dayjs().format('YYYYMMDD')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleContact = (card: DeliveryCard) => {
    alert(`已向监测员发送联系通知：\n\n浮标：${card.buoyName}\n复核人：${card.reviewer ?? '未指派'}${card.reviewNote ? `\n备注：${card.reviewNote}` : ''}`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="nautical-card p-5">
        <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">结果交付视图</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ocean-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索浮标名称或编号..."
              className="input-nautical pl-9 w-64"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-nautical w-40"
            />
            <span className="text-ocean-400">至</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-nautical w-40"
            />
          </div>
        </div>
      </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="bg-seaweed-500/15 border border-seaweed-500/40 rounded-t-xl px-5 py-4 flex items-center justify-between">
            <h3 className="font-display text-2xl text-seaweed-300 font-bold flex items-center">
              <CheckCircle2 className="w-6 h-6 mr-3" />
              可直接使用
            </h3>
            <span className="bg-seaweed-500 text-ocean-950 font-bold px-4 py-1.5 rounded-full text-lg">
              {directUseCards.length}
            </span>
          </div>
          <div className="space-y-4 mt-4 min-h-[200px]">
            {directUseCards.length === 0 ? (
              <div className="nautical-card p-8 text-center text-ocean-500">暂无数据</div>
            ) : (
              directUseCards.map((card) => (
                <DeliveryCardItem
                  key={card.id}
                  card={card}
                  status="direct_use"
                  onToggle={updateDeliveryStatus}
                  onExport={handleExport}
                  onContact={handleContact}
                />
              ))
            )}
          </div>
        </div>

        <div>
          <div className="bg-sand-500/10 border-2 border-sand-500/50 rounded-t-xl px-5 py-4 flex items-center justify-between">
            <h3 className="font-display text-2xl text-sand-300 font-bold flex items-center">
              <AlertCircle className="w-6 h-6 mr-3" />
              需监测员复核
            </h3>
            <span className="bg-sand-500 text-ocean-950 font-bold px-4 py-1.5 rounded-full text-lg">
              {needReviewCards.length}
            </span>
          </div>
          <div className="space-y-4 mt-4 min-h-[200px]">
            {needReviewCards.length === 0 ? (
              <div className="nautical-card p-8 text-center text-ocean-500">暂无数据</div>
            ) : (
              needReviewCards.map((card) => (
                <DeliveryCardItem
                  key={card.id}
                  card={card}
                  status="need_review"
                  onToggle={updateDeliveryStatus}
                  onExport={handleExport}
                  onContact={handleContact}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
