import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileInput,
  Layers,
  Database,
  ThermometerSun,
  Plus,
  Trash2,
  Save,
  ArrowRight,
  AlertCircle,
  Edit3,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useCalculationStore } from '../store/useCalculationStore';
import { formatDate, formatWithUnit, generateId } from '../utils/formatters';
import { UNITS } from '../utils/constants';
import { WallConstruction, Material, ConstructionNode, MaterialLibrary, EnvironmentParams } from '../types';

export default function DataInput() {
  const navigate = useNavigate();
  const { currentCalculation, updateWallConstruction, updateMaterialLibrary, updateEnvironmentParams, createNewCalculation } = useCalculationStore();
  const [activeTab, setActiveTab] = useState<'construction' | 'materials' | 'environment'>('construction');
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<string | null>(null);

  if (!currentCalculation) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">当前没有选中的项目</h3>
            <p className="text-slate-500 mb-6">请先创建或选择一个分析项目</p>
            <Button onClick={() => createNewCalculation('新建热桥分析')}>
              <Plus className="w-4 h-4 mr-2" />
              新建项目
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAddNode = () => {
    const newNode: ConstructionNode = {
      id: generateId(),
      name: '新节点',
      type: 'linear',
      materialId: '',
      thickness: 0,
      length: 1,
      psiValue: 0,
      position: 'external',
      maintainedBy: '当前用户',
      lastUpdated: new Date(),
    };
    const updated: WallConstruction = {
      ...currentCalculation.wallConstruction,
      nodes: [...currentCalculation.wallConstruction.nodes, newNode],
      lastUpdated: new Date(),
    };
    updateWallConstruction(updated);
    setEditingNode(newNode.id);
  };

  const handleUpdateNode = (nodeId: string, updates: Partial<ConstructionNode>) => {
    const updatedNodes = currentCalculation.wallConstruction.nodes.map(node =>
      node.id === nodeId ? { ...node, ...updates, lastUpdated: new Date() } : node
    );
    const updated: WallConstruction = {
      ...currentCalculation.wallConstruction,
      nodes: updatedNodes,
      lastUpdated: new Date(),
    };
    updateWallConstruction(updated);
  };

  const handleDeleteNode = (nodeId: string) => {
    const updatedNodes = currentCalculation.wallConstruction.nodes.filter(node => node.id !== nodeId);
    const updated: WallConstruction = {
      ...currentCalculation.wallConstruction,
      nodes: updatedNodes,
      lastUpdated: new Date(),
    };
    updateWallConstruction(updated);
  };

  const handleAddMaterial = () => {
    const newMaterial: Material = {
      id: generateId(),
      name: '新材料',
      thermalConductivity: 0,
      density: 0,
      specificHeat: 0,
      category: 'insulation',
      maintainedBy: '当前用户',
      lastUpdated: new Date(),
    };
    const updated: MaterialLibrary = {
      ...currentCalculation.materialLibrary,
      materials: [...currentCalculation.materialLibrary.materials, newMaterial],
      lastUpdated: new Date(),
    };
    updateMaterialLibrary(updated);
    setEditingMaterial(newMaterial.id);
  };

  const handleUpdateMaterial = (materialId: string, updates: Partial<Material>) => {
    const updatedMaterials = currentCalculation.materialLibrary.materials.map(mat =>
      mat.id === materialId ? { ...mat, ...updates, lastUpdated: new Date() } : mat
    );
    const updated: MaterialLibrary = {
      ...currentCalculation.materialLibrary,
      materials: updatedMaterials,
      lastUpdated: new Date(),
    };
    updateMaterialLibrary(updated);
  };

  const handleDeleteMaterial = (materialId: string) => {
    const updatedMaterials = currentCalculation.materialLibrary.materials.filter(mat => mat.id !== materialId);
    const updated: MaterialLibrary = {
      ...currentCalculation.materialLibrary,
      materials: updatedMaterials,
      lastUpdated: new Date(),
    };
    updateMaterialLibrary(updated);
  };

  const handleUpdateEnvironment = (updates: Partial<EnvironmentParams>) => {
    const updated: EnvironmentParams = {
      ...currentCalculation.environmentParams,
      ...updates,
    };
    updateEnvironmentParams(updated);
  };

  const tabs = [
    { id: 'construction', label: '墙体构造', icon: Layers, count: currentCalculation.wallConstruction.nodes.length },
    { id: 'materials', label: '材料库', icon: Database, count: currentCalculation.materialLibrary.materials.length },
    { id: 'environment', label: '环境参数', icon: ThermometerSun, count: null },
  ];

  const getNodeTypeLabel = (type: string) => {
    switch (type) {
      case 'linear': return '线性热桥';
      case 'point': return '点状热桥';
      default: return type;
    }
  };

  const getMaterialCategoryLabel = (category: string) => {
    switch (category) {
      case 'concrete': return '混凝土';
      case 'masonry': return '砌体';
      case 'insulation': return '保温材料';
      case 'wood': return '木材';
      case 'metal': return '金属';
      case 'glass': return '玻璃';
      default: return category;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">数据输入</h1>
          <p className="text-slate-500 mt-1">
            项目：{currentCalculation.name} · 更新于 {formatDate(currentCalculation.updatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Save className="w-3 h-3" />
            自动保存
          </Badge>
          <Button onClick={() => navigate('/conflicts')}>
            下一步：冲突检测
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="font-medium">{tab.label}</span>
            {tab.count !== null && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                activeTab === tab.id ? 'bg-blue-100' : 'bg-slate-100'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'construction' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  {currentCalculation.wallConstruction.name}
                </CardTitle>
                <CardDescription>
                  维护人：{currentCalculation.wallConstruction.maintainedBy} · 更新于 {formatDate(currentCalculation.wallConstruction.lastUpdated)}
                </CardDescription>
              </div>
              <Button onClick={handleAddNode}>
                <Plus className="w-4 h-4 mr-2" />
                添加节点
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {currentCalculation.wallConstruction.nodes.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <Layers className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>暂无构造节点</p>
                    <p className="text-sm mt-1">点击"添加节点"开始录入墙体构造数据</p>
                  </div>
                ) : (
                  currentCalculation.wallConstruction.nodes.map((node) => (
                    <div key={node.id} className="p-4 hover:bg-slate-50">
                      {editingNode === node.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">节点名称</label>
                              <input
                                type="text"
                                value={node.name}
                                onChange={(e) => handleUpdateNode(node.id, { name: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">节点类型</label>
                              <select
                                value={node.type}
                                onChange={(e) => handleUpdateNode(node.id, { type: e.target.value as 'linear' | 'point' })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="linear">线性热桥</option>
                                <option value="point">点状热桥</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">关联材料ID</label>
                              <input
                                type="text"
                                value={node.materialId}
                                onChange={(e) => handleUpdateNode(node.id, { materialId: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">厚度 (m)</label>
                              <input
                                type="number"
                                step="0.001"
                                value={node.thickness}
                                onChange={(e) => handleUpdateNode(node.id, { thickness: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">长度 (m)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={node.length}
                                onChange={(e) => handleUpdateNode(node.id, { length: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">热桥系数 ψ (W/m·K)</label>
                              <input
                                type="number"
                                step="0.001"
                                value={node.psiValue}
                                onChange={(e) => handleUpdateNode(node.id, { psiValue: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">位置</label>
                              <select
                                value={node.position}
                                onChange={(e) => handleUpdateNode(node.id, { position: e.target.value as 'internal' | 'external' })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="internal">内部</option>
                                <option value="external">外部</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => setEditingNode(null)}>
                              完成
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => handleDeleteNode(node.id)}>
                              <Trash2 className="w-4 h-4 mr-1" />
                              删除
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                              <Layers className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{node.name}</p>
                              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                <Badge variant="secondary">{getNodeTypeLabel(node.type)}</Badge>
                                <span>厚度：{formatWithUnit(node.thickness, UNITS.thickness)}</span>
                                <span>长度：{formatWithUnit(node.length, UNITS.length)}</span>
                                <span>ψ：{formatWithUnit(node.psiValue, UNITS.psiValue)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditingNode(node.id)}>
                              <Edit3 className="w-4 h-4 mr-1" />
                              编辑
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  {currentCalculation.materialLibrary.name}
                </CardTitle>
                <CardDescription>
                  维护人：{currentCalculation.materialLibrary.maintainedBy} · 更新于 {formatDate(currentCalculation.materialLibrary.lastUpdated)}
                </CardDescription>
              </div>
              <Button onClick={handleAddMaterial}>
                <Plus className="w-4 h-4 mr-2" />
                添加材料
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {currentCalculation.materialLibrary.materials.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <Database className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>暂无材料数据</p>
                    <p className="text-sm mt-1">点击"添加材料"开始录入材料热工参数</p>
                  </div>
                ) : (
                  currentCalculation.materialLibrary.materials.map((material) => (
                    <div key={material.id} className="p-4 hover:bg-slate-50">
                      {editingMaterial === material.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">材料名称</label>
                              <input
                                type="text"
                                value={material.name}
                                onChange={(e) => handleUpdateMaterial(material.id, { name: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">类别</label>
                              <select
                                value={material.category}
                                onChange={(e) => handleUpdateMaterial(material.id, { category: e.target.value as Material['category'] })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="concrete">混凝土</option>
                                <option value="masonry">砌体</option>
                                <option value="insulation">保温材料</option>
                                <option value="wood">木材</option>
                                <option value="metal">金属</option>
                                <option value="glass">玻璃</option>
                                <option value="other">其他</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">导热系数 λ (W/m·K)</label>
                              <input
                                type="number"
                                step="0.001"
                                value={material.thermalConductivity}
                                onChange={(e) => handleUpdateMaterial(material.id, { thermalConductivity: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">密度 (kg/m³)</label>
                              <input
                                type="number"
                                step="1"
                                value={material.density}
                                onChange={(e) => handleUpdateMaterial(material.id, { density: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">比热容 (J/kg·K)</label>
                              <input
                                type="number"
                                step="1"
                                value={material.specificHeat}
                                onChange={(e) => handleUpdateMaterial(material.id, { specificHeat: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => setEditingMaterial(null)}>
                              完成
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => handleDeleteMaterial(material.id)}>
                              <Trash2 className="w-4 h-4 mr-1" />
                              删除
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded flex items-center justify-center">
                              <Database className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{material.name}</p>
                              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                <Badge variant="secondary">{getMaterialCategoryLabel(material.category)}</Badge>
                                <span>λ：{formatWithUnit(material.thermalConductivity, UNITS.thermalConductivity)}</span>
                                <span>密度：{formatWithUnit(material.density, UNITS.density)}</span>
                                <span>比热容：{formatWithUnit(material.specificHeat, UNITS.specificHeat)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditingMaterial(material.id)}>
                              <Edit3 className="w-4 h-4 mr-1" />
                              编辑
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'environment' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ThermometerSun className="w-5 h-5" />
                环境参数设置
              </CardTitle>
              <CardDescription>
                设置室内外温度和计算周期
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">室内温度 (°C)</label>
                  <div className="relative">
                    <ThermometerSun className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500" />
                    <input
                      type="number"
                      step="0.1"
                      value={currentCalculation.environmentParams.indoorTemperature}
                      onChange={(e) => handleUpdateEnvironment({ indoorTemperature: parseFloat(e.target.value) })}
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">°C</span>
                  </div>
                  <p className="text-xs text-slate-500">通常设置为 20-22°C</p>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">室外温度 (°C)</label>
                  <div className="relative">
                    <ThermometerSun className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
                    <input
                      type="number"
                      step="0.1"
                      value={currentCalculation.environmentParams.outdoorTemperature}
                      onChange={(e) => handleUpdateEnvironment({ outdoorTemperature: parseFloat(e.target.value) })}
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">°C</span>
                  </div>
                  <p className="text-xs text-slate-500">通常使用当地采暖期室外平均温度</p>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">计算周期 (天)</label>
                  <div className="relative">
                    <FileInput className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="number"
                      step="1"
                      value={currentCalculation.environmentParams.calculationPeriod}
                      onChange={(e) => handleUpdateEnvironment({ calculationPeriod: parseInt(e.target.value) })}
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">天</span>
                  </div>
                  <p className="text-xs text-slate-500">月度计算通常设为 30 天</p>
                </div>
              </div>

              <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">当前温差</h4>
                <div className="flex items-center gap-4">
                  <p className="text-3xl font-bold text-blue-700">
                    {(currentCalculation.environmentParams.indoorTemperature - currentCalculation.environmentParams.outdoorTemperature).toFixed(1)} °C
                  </p>
                  <p className="text-sm text-blue-600">
                    {currentCalculation.environmentParams.indoorTemperature}°C - {currentCalculation.environmentParams.outdoorTemperature}°C
                  </p>
                </div>
                {currentCalculation.environmentParams.indoorTemperature < currentCalculation.environmentParams.outdoorTemperature && (
                  <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    警告：室内温度低于室外温度，温差方向可能反向
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-slate-50">
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">
              已录入 <strong>{currentCalculation.wallConstruction.nodes.length}</strong> 个构造节点，
              <strong> {currentCalculation.materialLibrary.materials.length}</strong> 种材料参数
            </p>
            {currentCalculation.wallConstruction.nodes.length === 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                请至少添加一个构造节点才能继续
              </p>
            )}
          </div>
          <Button
            onClick={() => navigate('/conflicts')}
            disabled={currentCalculation.wallConstruction.nodes.length === 0}
          >
            下一步：冲突检测
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
