import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Upload,
  Database,
  Package,
  Truck,
  FileText,
  ShieldAlert,
  Trash2,
  Plus,
  Search,
} from 'lucide-react';
import { useMaterialStore } from '../store/materialStore';
import type { Material, MaterialType } from '../types';

export default function Admin() {
  const navigate = useNavigate();
  const { materials, loadMockData, getMaterialsByType, clearAll } = useMaterialStore();
  const [activeType, setActiveType] = useState<MaterialType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (materials.length === 0) {
      loadMockData();
    }
  }, [materials.length, loadMockData]);

  const filteredMaterials = materials.filter((m) => {
    const matchesType = activeType === 'all' || m.type === activeType;
    const matchesSearch = searchTerm
      ? JSON.stringify(m.data).toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    return matchesType && matchesSearch;
  });

  const typeStats = {
    container: materials.filter((m) => m.type === 'container').length,
    license_plate: materials.filter((m) => m.type === 'license_plate').length,
    booking_note: materials.filter((m) => m.type === 'booking_note').length,
    dangerous_mark: materials.filter((m) => m.type === 'dangerous_mark').length,
  };

  const typeLabels: Record<MaterialType, { label: string; icon: React.ReactNode }> = {
    container: { label: '集装箱', icon: <Package className="w-4 h-4" /> },
    license_plate: { label: '车牌', icon: <Truck className="w-4 h-4" /> },
    booking_note: { label: '预约单', icon: <FileText className="w-4 h-4" /> },
    dangerous_mark: { label: '危品标记', icon: <ShieldAlert className="w-4 h-4" /> },
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-black text-white">材料管理</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin/import')}
              className="btn-primary flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              导入数据
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="glass-panel p-4 cursor-pointer"
            onClick={() => setActiveType('all')}
          >
            <div className="flex items-center justify-between mb-2">
              <Database className="w-8 h-8 text-primary-300" />
              <span className="text-sm text-white/60">全部</span>
            </div>
            <p className="text-3xl font-bold text-white">{materials.length}</p>
          </motion.div>
          {(Object.keys(typeLabels) as MaterialType[]).map((type) => (
            <motion.div
              key={type}
              whileHover={{ scale: 1.02 }}
              className={`glass-panel p-4 cursor-pointer ${
                activeType === type ? 'ring-2 ring-primary-400' : ''
              }`}
              onClick={() => setActiveType(type)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-primary-300">{typeLabels[type].icon}</div>
                <span className="text-sm text-white/60">{typeLabels[type].label}</span>
              </div>
              <p className="text-3xl font-bold text-white">{typeStats[type]}</p>
            </motion.div>
          ))}
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索材料..."
              className="input-field pl-10"
            />
          </div>
          <button
            onClick={clearAll}
            className="px-4 py-3 rounded-lg bg-danger-500/20 text-danger-400 hover:bg-danger-500/30 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            清空全部
          </button>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              {activeType === 'all' ? '全部材料' : typeLabels[activeType].label}
            </h2>
            <span className="text-white/60">共 {filteredMaterials.length} 条</span>
          </div>

          {filteredMaterials.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              <Database className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>暂无材料数据</p>
              <button
                onClick={loadMockData}
                className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-400"
              >
                加载示例数据
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredMaterials.map((material, index) => (
                <motion.div
                  key={material.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          material.type === 'container'
                            ? 'bg-blue-500/20 text-blue-400'
                            : material.type === 'license_plate'
                            ? 'bg-green-500/20 text-green-400'
                            : material.type === 'booking_note'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {typeLabels[material.type].icon}
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {typeLabels[material.type].label}
                        </p>
                        <p className="text-sm text-white/60">
                          来源: {material.source} · {new Date(material.importTime).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <MaterialPreview material={material} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MaterialPreview({ material }: { material: Material }) {
  const data = material.data as unknown as Record<string, unknown>;
  
  switch (material.type) {
    case 'container':
      return (
        <p className="font-mono text-sm text-primary-300">
          {data.containerNumber as string}
        </p>
      );
    case 'license_plate':
      return (
        <p className="font-mono text-sm text-success-400">
          {data.plateNumber as string}
        </p>
      );
    case 'booking_note':
      return (
        <div>
          <p className="font-mono text-sm text-warning-400">
            {data.bookingNumber as string}
          </p>
          <p className="text-xs text-white/50">
            {data.containerNumber as string}
          </p>
        </div>
      );
    case 'dangerous_mark':
      return (
        <p className="text-sm text-danger-400 font-medium">
          等级 {data.classNumber as string}
        </p>
      );
    default:
      return null;
  }
}
