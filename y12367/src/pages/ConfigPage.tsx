import * as React from 'react';
import { format } from 'date-fns';
import {
  Settings,
  Save,
  Plus,
  Trash2,
  Edit3,
  Thermometer,
  Zap,
  Gauge,
  Layers,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Checkbox } from '@/components/ui/Checkbox';
import { Modal } from '@/components/ui/Modal';
import { useAnalysisStore } from '@/stores/useAnalysisStore';
import { dataService } from '@/services/dataService';
import type { CaliberConfig, ThresholdConfig, WorkingConditionSegment } from '@/types';

export const ConfigPage: React.FC = () => {
  const { initialize, materials, segments, testBenches, adjustSegmentBoundary, recalculateAll } =
    useAnalysisStore();

  const [activeTab, setActiveTab] = React.useState('caliber');
  const [caliberConfigs, setCaliberConfigs] = React.useState<CaliberConfig[]>([]);
  const [thresholdConfigs, setThresholdConfigs] = React.useState<ThresholdConfig[]>([]);
  const [segmentScheme, setSegmentScheme] = React.useState<any>(null);
  const [showSegmentModal, setShowSegmentModal] = React.useState(false);
  const [editingSegment, setEditingSegment] = React.useState<WorkingConditionSegment | null>(null);
  const [segmentForm, setSegmentForm] = React.useState({
    name: '',
    speedMin: 0,
    speedMax: 0,
    torqueMin: 0,
    torqueMax: 0,
    color: '#3B82F6',
  });
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  React.useEffect(() => {
    initialize().then(() => {
      setCaliberConfigs(dataService.getCaliberConfigs());
      setThresholdConfigs(dataService.getThresholdConfigs());
      setSegmentScheme(dataService.getSegmentScheme());
    });
  }, [initialize]);

  const handleEditSegment = (segment: WorkingConditionSegment) => {
    setEditingSegment(segment);
    setSegmentForm({
      name: segment.name,
      speedMin: segment.speedRange[0],
      speedMax: segment.speedRange[1],
      torqueMin: segment.torqueRange[0],
      torqueMax: segment.torqueRange[1],
      color: segment.color,
    });
    setShowSegmentModal(true);
  };

  const handleSaveSegment = async () => {
    if (!editingSegment) return;

    await adjustSegmentBoundary(
      editingSegment.id,
      [segmentForm.speedMin, segmentForm.speedMax],
      [segmentForm.torqueMin, segmentForm.torqueMax]
    );

    setShowSegmentModal(false);
    setEditingSegment(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveCaliber = (config: CaliberConfig) => {
    const updated = caliberConfigs.map((c) => (c.id === config.id ? config : c));
    setCaliberConfigs(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveThreshold = (materialId: string, field: keyof ThresholdConfig, value: number) => {
    const updated = thresholdConfigs.map((t) =>
      t.materialId === materialId ? { ...t, [field]: value } : t
    );
    setThresholdConfigs(updated);
  };

  const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-industrial-text">配置管理</h1>
          <p className="text-industrial-text-muted mt-1">
            管理数据口径、阈值配置和工况分段方案
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" icon={<Save className="w-4 h-4" />} onClick={recalculateAll}>
            应用配置并重算
          </Button>
        </div>
      </div>

      {saveSuccess && (
        <Alert variant="success" title="保存成功">
          配置已保存，点击"应用配置并重算"使配置生效。
        </Alert>
      )}

      <Alert variant="info" title="重要提示">
        <p className="text-sm">
          系统严格遵循"不自动修改业务口径"原则。所有口径配置的变更需手动确认，变更后点击"应用配置并重算"按钮，系统将按新配置重新计算所有数据。
        </p>
      </Alert>

      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="px-4 pt-4">
              <TabsTrigger value="caliber">数据口径</TabsTrigger>
              <TabsTrigger value="threshold">阈值配置</TabsTrigger>
              <TabsTrigger value="segments">工况分段</TabsTrigger>
              <TabsTrigger value="testbenches">测试台管理</TabsTrigger>
            </TabsList>

            <TabsContent value="caliber" className="p-6">
              <div className="space-y-6">
                <Alert variant="info" title="口径一致性说明">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm">
                        数据口径定义了各类数据的计算方式和精度。系统将严格按照配置的口径进行计算，不会自动修正业务口径。
                      </p>
                      <p className="text-xs text-industrial-text-muted mt-2">
                        公式说明：U=电压, I=电流, φ=功率因数角, Pout=输出功率, Pin=输入功率
                      </p>
                    </div>
                  </div>
                </Alert>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>口径名称</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>计算公式</TableHead>
                      <TableHead>单位</TableHead>
                      <TableHead>精度</TableHead>
                      <TableHead>系统默认</TableHead>
                      <TableHead>说明</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {caliberConfigs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {config.type === 'voltage' && <Zap className="w-4 h-4 text-blue-400" />}
                            {config.type === 'current' && <Zap className="w-4 h-4 text-yellow-400" />}
                            {config.type === 'power' && <Zap className="w-4 h-4 text-green-400" />}
                            {config.type === 'temperature' && <Thermometer className="w-4 h-4 text-orange-400" />}
                            {config.type === 'efficiency' && <Gauge className="w-4 h-4 text-purple-400" />}
                            <span className="font-medium">{config.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">{config.type}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{config.formula}</TableCell>
                        <TableCell>{config.unit}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={config.precision}
                            onChange={(e) =>
                              handleSaveCaliber({ ...config, precision: parseInt(e.target.value) })
                            }
                            className="w-20"
                            min={0}
                            max={10}
                          />
                        </TableCell>
                        <TableCell>
                          {config.isSystemDefault ? (
                            <Badge variant="green">是</Badge>
                          ) : (
                            <Badge variant="default">自定义</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-industrial-text-muted max-w-xs">
                          {config.description}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" icon={<Edit3 className="w-4 h-4" />}>
                            编辑
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="threshold" className="p-6">
              <div className="space-y-6">
                <Alert variant="warning" title="阈值说明">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm">
                        阈值配置用于异常检测。温度超过限值、功率超出范围、转速采样间隔过长时，系统将产生异常记录。
                      </p>
                    </div>
                  </div>
                </Alert>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>材料</TableHead>
                      <TableHead>温度限值 (°C)</TableHead>
                      <TableHead>功率范围 (kW)</TableHead>
                      <TableHead>转速采样间隔 (ms)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {thresholdConfigs.map((config) => {
                      const material = materials.find((m) => m.id === config.materialId);
                      return (
                        <TableRow key={config.materialId}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{material?.code}</span>
                              <span className="text-industrial-text-muted">-</span>
                              <span className="text-industrial-text-muted">{material?.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={config.temperatureLimit}
                              onChange={(e) =>
                                handleSaveThreshold(
                                  config.materialId,
                                  'temperatureLimit',
                                  parseFloat(e.target.value)
                                )
                              }
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={config.powerMin}
                                onChange={(e) =>
                                  handleSaveThreshold(
                                    config.materialId,
                                    'powerMin',
                                    parseFloat(e.target.value)
                                  )
                                }
                                className="w-20"
                              />
                              <span className="text-industrial-text-muted">~</span>
                              <Input
                                type="number"
                                value={config.powerMax}
                                onChange={(e) =>
                                  handleSaveThreshold(
                                    config.materialId,
                                    'powerMax',
                                    parseFloat(e.target.value)
                                  )
                                }
                                className="w-20"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={config.speedSampleInterval}
                              onChange={(e) =>
                                handleSaveThreshold(
                                  config.materialId,
                                  'speedSampleInterval',
                                  parseInt(e.target.value)
                                )
                              }
                              className="w-24"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="segments" className="p-6">
              <div className="space-y-6">
                <Alert variant="info" title="工况分段说明">
                  <div className="flex items-start gap-3">
                    <Layers className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm">
                        工况分段将测试数据按转速和扭矩范围划分。分段调整后，系统将自动重新计算各段的效率和异常检测。
                      </p>
                      <p className="text-xs text-industrial-text-muted mt-2">
                        当前方案: {segmentScheme?.name || '默认方案'} | 创建人: {segmentScheme?.createdBy || '系统'}
                      </p>
                    </div>
                  </div>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {segments
                    .sort((a, b) => a.order - b.order)
                    .map((segment) => (
                      <Card
                        key={segment.id}
                        className="hover:border-opacity-80 transition-all"
                        style={{ borderColor: segment.color + '80' }}
                      >
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: segment.color }}
                              />
                              <span className="font-medium text-industrial-text">{segment.name}</span>
                            </div>
                            <Badge variant="default">#{segment.order + 1}</Badge>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-industrial-text-muted">转速范围</span>
                              <span className="font-mono">
                                {segment.speedRange[0]} - {segment.speedRange[1]} rpm
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-industrial-text-muted">扭矩范围</span>
                              <span className="font-mono">
                                {segment.torqueRange[0]} - {segment.torqueRange[1]} N·m
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            icon={<Edit3 className="w-4 h-4" />}
                            onClick={() => handleEditSegment(segment)}
                          >
                            编辑分段
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="testbenches" className="p-6">
              <div className="space-y-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>测试台编号</TableHead>
                      <TableHead>名称</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>最后更新</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testBenches.map((tb) => (
                      <TableRow key={tb.id}>
                        <TableCell className="font-mono">{tb.code}</TableCell>
                        <TableCell>{tb.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              tb.status === 'online'
                                ? 'green'
                                : tb.status === 'maintenance'
                                ? 'orange'
                                : 'default'
                            }
                          >
                            {tb.status === 'online'
                              ? '在线'
                              : tb.status === 'maintenance'
                              ? '维护中'
                              : '离线'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-industrial-text-muted">
                          {format(new Date(tb.lastUpdate), 'yyyy-MM-dd HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" icon={<Edit3 className="w-4 h-4" />}>
                              编辑
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Modal
        open={showSegmentModal}
        onClose={() => setShowSegmentModal(false)}
        title={`编辑分段 - ${editingSegment?.name}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="default" onClick={() => setShowSegmentModal(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleSaveSegment}>
              保存
            </Button>
          </div>
        }
      >
        {editingSegment && (
          <div className="space-y-4">
            <Input
              label="分段名称"
              value={segmentForm.name}
              onChange={(e) => setSegmentForm({ ...segmentForm, name: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="转速下限 (rpm)"
                type="number"
                value={segmentForm.speedMin}
                onChange={(e) =>
                  setSegmentForm({ ...segmentForm, speedMin: parseFloat(e.target.value) })
                }
              />
              <Input
                label="转速上限 (rpm)"
                type="number"
                value={segmentForm.speedMax}
                onChange={(e) =>
                  setSegmentForm({ ...segmentForm, speedMax: parseFloat(e.target.value) })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="扭矩下限 (N·m)"
                type="number"
                step="0.1"
                value={segmentForm.torqueMin}
                onChange={(e) =>
                  setSegmentForm({ ...segmentForm, torqueMin: parseFloat(e.target.value) })
                }
              />
              <Input
                label="扭矩上限 (N·m)"
                type="number"
                step="0.1"
                value={segmentForm.torqueMax}
                onChange={(e) =>
                  setSegmentForm({ ...segmentForm, torqueMax: parseFloat(e.target.value) })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-industrial-text-muted mb-2">
                标识颜色
              </label>
              <div className="flex gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                      segmentForm.color === color ? 'ring-2 ring-offset-2 ring-offset-industrial-bg ring-white' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSegmentForm({ ...segmentForm, color })}
                  />
                ))}
              </div>
            </div>

            <Alert variant="warning">
              修改分段边界后，系统将自动重新计算所有关联数据的分段归属、效率值和异常检测结果。
            </Alert>
          </div>
        )}
      </Modal>
    </div>
  );
};
