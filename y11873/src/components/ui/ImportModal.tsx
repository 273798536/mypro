import { useState, useCallback } from 'react';
import { X, Upload, Warehouse, Package, Route, Clock, FileJson } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { Warehouse as WarehouseType, Supply, Road as RoadType, ImportBatch } from '@/types';

const typeConfig = {
  warehouse: { color: '#4ecdc4', bg: 'bg-[#4ecdc4]/10', border: 'border-[#4ecdc4]/30', icon: Warehouse, label: '仓库数据' },
  supply: { color: '#00d68f', bg: 'bg-[#00d68f]/10', border: 'border-[#00d68f]/30', icon: Package, label: '物资数据' },
  road: { color: '#5b9bd5', bg: 'bg-[#5b9bd5]/10', border: 'border-[#5b9bd5]/30', icon: Route, label: '道路数据' },
};

function DropZone({
  type,
  onImport,
}: {
  type: 'warehouse' | 'supply' | 'road';
  onImport: (type: 'warehouse' | 'supply' | 'road', data: unknown[]) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const config = typeConfig[type];
  const Icon = config.icon;

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          const data = Array.isArray(json) ? json : [json];
          onImport(type, data);
        } catch {
          console.error('Failed to parse JSON file');
        }
      };
      reader.readAsText(file);
    },
    [type, onImport]
  );

  const sampleFormats: Record<string, string> = {
    warehouse: '{ "id", "name", "position", "elevation", "supplies", "serviceRadius", "status" }',
    supply: '{ "id", "type", "name", "quantity", "unit", "warehouseId" }',
    road: '{ "id", "name", "waypoints", "slopeAngle", "status", "connectedWarehouseIds" }',
  };

  return (
    <div
      className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
        dragOver
          ? `${config.border} ${config.bg}`
          : 'border-[#2e3548] hover:border-[#8b8fa3]/50 bg-[#1a1f2e]/40'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      onClick={() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) handleFile(file);
        };
        input.click();
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${config.color}20` }}
      >
        <Icon className="w-5 h-5" style={{ color: config.color }} />
      </div>
      <p className="text-sm font-medium text-[#e8eaed]">{config.label}</p>
      <div className="flex items-center gap-1.5 text-[#8b8fa3]">
        <Upload className="w-3 h-3" />
        <span className="text-xs">拖放或点击上传 JSON</span>
      </div>
      <p className="text-[10px] text-[#8b8fa3]/60 text-center leading-relaxed">
        {sampleFormats[type]}
      </p>
    </div>
  );
}

function TimelineEntry({
  batch,
  isFirstOfType,
}: {
  batch: ImportBatch;
  isFirstOfType: boolean;
}) {
  const config = typeConfig[batch.type];
  const Icon = config.icon;
  const time = new Date(batch.timestamp);
  const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

  return (
    <div className="flex items-start gap-3 relative">
      <div className="flex flex-col items-center">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
        </div>
        <div className="w-px flex-1 bg-[#2e3548] mt-1" />
      </div>
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8b8fa3] font-['Rajdhani']">{timeStr}</span>
          <span className="text-sm text-[#e8eaed] truncate">{batch.label}</span>
          {isFirstOfType && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold shrink-0"
              style={{ backgroundColor: `${config.color}20`, color: config.color }}
            >
              先到
            </span>
          )}
          {!isFirstOfType && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-[#8b8fa3] font-semibold shrink-0">
              后补
            </span>
          )}
        </div>
        <p className="text-xs text-[#8b8fa3] mt-0.5">{batch.dataCount} 条数据</p>
      </div>
    </div>
  );
}

export default function ImportModal() {
  const { importModalOpen, toggleImportModal, addWarehouses, addRoads, addSupplies, addImportBatch, importBatches } = useStore();

  const firstTypeSet = new Set<string>();
  const sortedBatches = [...importBatches].sort((a, b) => a.timestamp - b.timestamp);
  sortedBatches.forEach((b) => {
    if (!firstTypeSet.has(b.type)) firstTypeSet.add(b.type);
  });

  const handleImport = (type: 'warehouse' | 'supply' | 'road', data: unknown[]) => {
    if (type === 'warehouse') {
      addWarehouses(data as WarehouseType[]);
    } else if (type === 'supply') {
      const supplies = data as Supply[];
      if (supplies.length > 0 && supplies[0].warehouseId) {
        addSupplies(supplies[0].warehouseId, supplies);
      }
    } else {
      addRoads(data as RoadType[]);
    }

    const batch: ImportBatch = {
      id: `batch-${Date.now()}`,
      timestamp: Date.now(),
      type,
      label: typeConfig[type].label,
      dataCount: data.length,
    };
    addImportBatch(batch);
  };

  const loadDemoData = () => {
    const demoWarehouses: WarehouseType[] = [
      {
        id: 'w1',
        name: '城北应急仓库',
        position: [0, 0, 120],
        elevation: 120,
        supplies: [
          { id: 's1', type: '沙袋', name: '标准沙袋', quantity: 500, unit: '个', warehouseId: 'w1' },
          { id: 's2', type: '救生衣', name: '成人救生衣', quantity: 200, unit: '件', warehouseId: 'w1' },
          { id: 's3', type: '帐篷', name: '救灾帐篷', quantity: 50, unit: '顶', warehouseId: 'w1' },
        ],
        serviceRadius: 5,
        status: 'normal',
      },
      {
        id: 'w2',
        name: '江边储备仓库',
        position: [100, 50, 45],
        elevation: 45,
        supplies: [
          { id: 's4', type: '饮用水', name: '瓶装水', quantity: 1000, unit: '箱', warehouseId: 'w2' },
          { id: 's5', type: '食品', name: '应急食品包', quantity: 300, unit: '份', warehouseId: 'w2' },
          { id: 's6', type: '医疗物资', name: '急救箱', quantity: 100, unit: '个', warehouseId: 'w2' },
        ],
        serviceRadius: 8,
        status: 'isolated',
      },
      {
        id: 'w3',
        name: '西山物资站',
        position: [-80, 80, 280],
        elevation: 280,
        supplies: [
          { id: 's7', type: '发电机', name: '便携发电机', quantity: 20, unit: '台', warehouseId: 'w3' },
          { id: 's8', type: '照明设备', name: '应急照明灯', quantity: 150, unit: '个', warehouseId: 'w3' },
        ],
        serviceRadius: 4,
        status: 'overloaded',
      },
    ];

    const demoRoads: RoadType[] = [
      {
        id: 'r1',
        name: '北江大道',
        waypoints: [[0, 0, 120], [30, 15, 95], [65, 35, 60], [100, 50, 45]],
        slopeAngle: 12,
        status: 'open',
        connectedWarehouseIds: ['w1', 'w2'],
      },
      {
        id: 'r2',
        name: '西山盘山路',
        waypoints: [[0, 0, 120], [-20, 20, 160], [-50, 50, 210], [-80, 80, 280]],
        slopeAngle: 28,
        status: 'slope_limited',
        slopeLimitedReason: '坡度 28.0° 超过 25° 限行阈值',
        connectedWarehouseIds: ['w1', 'w3'],
      },
      {
        id: 'r3',
        name: '沿江路',
        waypoints: [[100, 50, 45], [60, 80, 50], [20, 100, 55], [-80, 80, 280]],
        slopeAngle: 8,
        status: 'interrupted',
        interruptReason: '山体滑坡阻塞道路',
        connectedWarehouseIds: ['w2', 'w3'],
      },
    ];

    addWarehouses(demoWarehouses);
    addRoads(demoRoads);

    const now = Date.now();
    addImportBatch({ id: `batch-${now}-1`, timestamp: now, type: 'warehouse', label: '仓库数据', dataCount: 3 });
    addImportBatch({ id: `batch-${now}-2`, timestamp: now + 100, type: 'road', label: '道路数据', dataCount: 3 });
  };

  if (!importModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={toggleImportModal} />
      <div className="relative w-full max-w-3xl bg-[#242938]/95 backdrop-blur-xl border border-[#2e3548] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2e3548]">
          <div className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-[#4ecdc4]" />
            <h2 className="text-lg font-semibold text-[#e8eaed] font-['Rajdhani']">数据导入</h2>
          </div>
          <button
            className="p-1.5 rounded-lg hover:bg-white/5 text-[#8b8fa3] hover:text-[#e8eaed] transition-colors"
            onClick={toggleImportModal}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="grid grid-cols-3 gap-4">
            <DropZone type="warehouse" onImport={handleImport} />
            <DropZone type="supply" onImport={handleImport} />
            <DropZone type="road" onImport={handleImport} />
          </div>
        </div>

        {importBatches.length > 0 && (
          <div className="px-6 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-[#8b8fa3]" />
              <h3 className="text-sm font-semibold text-[#8b8fa3] font-['Rajdhani']">导入记录</h3>
            </div>
            <div className="max-h-40 overflow-y-auto pr-2">
              {sortedBatches.map((batch) => (
                <TimelineEntry
                  key={batch.id}
                  batch={batch}
                  isFirstOfType={firstTypeSet.has(batch.type) && sortedBatches.findIndex((b) => b.type === batch.type) === sortedBatches.indexOf(batch)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="px-6 py-4 border-t border-[#2e3548] flex items-center gap-3">
          <button
            className="px-4 py-2 rounded-lg bg-[#4ecdc4]/15 border border-[#4ecdc4]/30 text-sm text-[#4ecdc4] hover:bg-[#4ecdc4]/25 transition-colors font-medium"
            onClick={loadDemoData}
          >
            加载演示数据
          </button>
          <div className="flex-1" />
          <button
            className="px-4 py-2 rounded-lg border border-[#2e3548] text-sm text-[#8b8fa3] hover:text-[#e8eaed] hover:border-[#8b8fa3]/50 transition-colors"
            onClick={toggleImportModal}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
