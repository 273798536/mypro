import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  X,
  Package,
  Thermometer,
  Wind,
  Layers,
  AlertTriangle,
  MapPin,
  Zap,
  ListTodo,
  Link2,
  Download,
  Calendar,
  Target,
} from 'lucide-react';
import { useStore } from '../../store/useStore';

function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={14} className="text-cyan-400" />
      <span className="text-sm font-medium text-slate-200">{title}</span>
    </div>
  );
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-mono ${highlight ? 'text-cyan-400' : 'text-slate-300'}`}>
        {value}
      </span>
    </div>
  );
}

function EventDetail() {
  const { events, selection, setSelection, shelves, probes, fans, products } = useStore();
  const event = events.find((e) => e.id === selection.id);

  if (!event) return null;

  const getRelatedItem = (type: string, id: string) => {
    switch (type) {
      case 'shelf':
        return shelves.find((s) => s.id === id);
      case 'probe':
        return probes.find((p) => p.id === id);
      case 'fan':
        return fans.find((f) => f.id === id);
      case 'product':
        return products.find((p) => p.id === id);
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30">
        <SectionTitle icon={AlertTriangle} title="事件描述" />
        <p className="text-sm text-slate-300 mb-2">{event.description}</p>
        <div className="text-xs text-slate-500">
          发生时间: {event.timestamp}
        </div>
      </div>

      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <SectionTitle icon={Target} title="触发源" />
        <div className="bg-cyan-950/30 border border-cyan-500/30 rounded p-2">
          <span className="text-sm text-cyan-300">{event.triggerSource}</span>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <SectionTitle icon={MapPin} title="卡顿位置" />
        <div className="bg-amber-950/30 border border-amber-500/30 rounded p-2">
          <span className="text-sm text-amber-300">{event.blockPosition}</span>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <SectionTitle icon={ListTodo} title="下一步操作" />
        <div className="space-y-1.5">
          {event.nextAction.split('；').map((action, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              <span className="w-5 h-5 rounded bg-green-900/50 text-green-400 flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </span>
              <span className="text-slate-300 pt-0.5">{action.replace(/^\d+\.\s*/, '')}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <SectionTitle icon={Link2} title="关联线索" />
        <div className="space-y-2">
          {event.relatedClues.map((clue) => {
            const item = getRelatedItem(clue.type, clue.id);
            return (
              <button
                key={clue.id}
                onClick={() => setSelection(clue.type as any, clue.id)}
                className="w-full text-left p-2 rounded bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">{clue.name}</span>
                  <span className="text-[10px] text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded">
                    {clue.type === 'shelf' ? '货架' : clue.type === 'probe' ? '探头' : clue.type === 'fan' ? '风机' : '货品'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ShelfDetail() {
  const { shelves, selection, probes } = useStore();
  const shelf = shelves.find((s) => s.id === selection.id);
  if (!shelf) return null;

  const shelfProbes = probes.filter((p) => p.shelfId === shelf.id);

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <SectionTitle icon={Layers} title="货架信息" />
        <InfoRow label="货架编号" value={shelf.name} highlight />
        <InfoRow label="位置坐标" value={`(${shelf.position.join(', ')})`} />
        <InfoRow label="尺寸" value={`${shelf.dimensions.width}×${shelf.dimensions.height}×${shelf.dimensions.depth}`} />
        <InfoRow label="最后修改" value={shelf.lastModified} />
      </div>

      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <SectionTitle icon={Thermometer} title="关联探头" />
        <div className="space-y-2">
          {shelfProbes.map((probe) => (
            <div key={probe.id} className="flex items-center justify-between p-2 rounded bg-slate-700/30">
              <span className="text-xs text-slate-300">{probe.name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                probe.status === 'online' ? 'bg-green-950/50 text-green-400' :
                probe.status === 'offline' ? 'bg-red-950/50 text-red-400' :
                'bg-amber-950/50 text-amber-400'
              }`}>
                {probe.currentTemp.toFixed(1)}°C
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <SectionTitle icon={Calendar} title="对应关系记录" />
        <div className="text-xs text-slate-400 space-y-1">
          <p>• 货架 {shelf.name} → 关联 {shelfProbes.length} 个温度探头</p>
          <p>• 探头分布: 上层、中层、下层各位置</p>
          <p>• 校准周期: 每15天自动校准</p>
        </div>
      </div>
    </div>
  );
}

function ProbeDetail() {
  const { probes, selection, shelves } = useStore();
  const probe = probes.find((p) => p.id === selection.id);
  if (!probe) return null;

  const shelf = shelves.find((s) => s.id === probe.shelfId);

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <SectionTitle icon={Thermometer} title="探头信息" />
        <InfoRow label="探头编号" value={probe.name} highlight />
        <InfoRow
          label="状态"
          value={probe.status === 'online' ? '在线' : probe.status === 'offline' ? '离线' : '告警'}
        />
        <InfoRow label="当前温度" value={`${probe.currentTemp.toFixed(1)}°C`} highlight />
        <InfoRow label="安装位置" value={shelf?.name || '-'} />
        <InfoRow label="坐标" value={`(${probe.position.join(', ')})`} />
        <InfoRow label="上次校准" value={probe.lastCalibration} />
      </div>

      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <SectionTitle icon={Zap} title="温度历史" />
        <div className="space-y-1">
          {probe.history.slice(-6).map((record, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{record.timestamp.split(' ')[1]}</span>
              <span className={`font-mono ${
                record.temp < -18 ? 'text-green-400' :
                record.temp < -15 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {record.temp.toFixed(1)}°C
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <SectionTitle icon={Calendar} title="对应关系记录" />
        <div className="text-xs text-slate-400 space-y-1">
          <p>• 探头 {probe.name} → 安装于 {shelf?.name}</p>
          <p>• 检测区域: 货架 {shelf?.name} 周边</p>
          <p>• 报告中自动关联: 是</p>
        </div>
      </div>
    </div>
  );
}

function FanDetail() {
  const { fans, selection } = useStore();
  const fan = fans.find((f) => f.id === selection.id);
  if (!fan) return null;

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <SectionTitle icon={Wind} title="风机信息" />
        <InfoRow label="风机编号" value={fan.name} highlight />
        <InfoRow
          label="状态"
          value={fan.status === 'running' ? '运行中' : fan.status === 'stopped' ? '已停止' : '异常'}
        />
        <InfoRow label="转速" value={`${fan.speed}%`} />
        <InfoRow label="安装位置" value={`(${fan.position.join(', ')})`} />
      </div>

      {fan.status !== 'running' && (
        <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30">
          <SectionTitle icon={AlertTriangle} title="异常处理建议" />
          <ul className="text-xs text-slate-300 space-y-1">
            <li>1. 检查电源连接是否正常</li>
            <li>2. 清理风道杂物</li>
            <li>3. 检查电机温度</li>
            <li>4. 如无法恢复，请联系维修</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function ProductDetail() {
  const { products, selection, shelves } = useStore();
  const product = products.find((p) => p.id === selection.id);
  if (!product) return null;

  const shelf = shelves.find((s) => s.id === product.shelfId);

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <SectionTitle icon={Package} title="货品信息" />
        <InfoRow label="批次名称" value={product.name} highlight />
        <InfoRow
          label="温敏等级"
          value={
            product.temperatureSensitivity === 'high' ? '高敏感' :
            product.temperatureSensitivity === 'medium' ? '中敏感' : '低敏感'
          }
        />
        <InfoRow label="存放货架" value={shelf?.name || '-'} />
        <InfoRow label="存放位置" value={`(${product.position.join(', ')})`} />
        <InfoRow label="入库时间" value={product.storageTime} />
      </div>

      {product.isBlocking && (
        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30">
          <SectionTitle icon={AlertTriangle} title="遮挡告警" />
          <p className="text-xs text-amber-300">该货品可能遮挡温度探头，请调整位置</p>
        </div>
      )}

      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <SectionTitle icon={Calendar} title="对应关系记录" />
        <div className="text-xs text-slate-400 space-y-1">
          <p>• 货品 {product.name} → 存放于 {shelf?.name}</p>
          <p>• 温度要求: {product.temperatureSensitivity === 'high' ? '-18°C以下' : '-15°C以下'}</p>
          <p>• 报告导出时自动包含</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
        <Layers size={28} className="text-slate-600" />
      </div>
      <h3 className="text-sm font-medium text-slate-400 mb-2">未选中任何对象</h3>
      <p className="text-xs text-slate-500">
        点击 3D 场景中的货架、探头、风机或货品查看详情
      </p>
    </div>
  );
}

export function DetailPanel() {
  const { selection, detailPanelOpen, toggleDetailPanel } = useStore();

  const renderContent = () => {
    if (!selection.type || !selection.id) {
      return <EmptyState />;
    }

    switch (selection.type) {
      case 'event':
        return <EventDetail />;
      case 'shelf':
        return <ShelfDetail />;
      case 'probe':
        return <ProbeDetail />;
      case 'fan':
        return <FanDetail />;
      case 'product':
        return <ProductDetail />;
      default:
        return <EmptyState />;
    }
  };

  const getTitle = () => {
    if (!selection.type) return '详情面板';
    switch (selection.type) {
      case 'event':
        return '事件详情';
      case 'shelf':
        return '货架详情';
      case 'probe':
        return '探头详情';
      case 'fan':
        return '风机详情';
      case 'product':
        return '货品详情';
      default:
        return '详情面板';
    }
  };

  return (
    <AnimatePresence mode="wait">
      {detailPanelOpen ? (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 300, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="h-full bg-slate-900/95 border-l border-slate-700/50 flex flex-col"
        >
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-200">{getTitle()}</h2>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors">
                  <Download size={14} />
                </button>
                <button
                  onClick={toggleDetailPanel}
                  className="p-1.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {renderContent()}
          </div>
        </motion.div>
      ) : (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={toggleDetailPanel}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-slate-800/90 border border-l-0 border-slate-600/50 rounded-l-lg p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/90 transition-all"
        >
          <ChevronRight size={18} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
