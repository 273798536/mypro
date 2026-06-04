import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Image, AlertTriangle, Eye } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { DataTable } from '../components/common/DataTable';
import { EquipmentStatusBadge, SeverityBadge, ColorBadge } from '../components/common/StatusBadge';

export default function EquipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const allEquipment = useAppStore((state) => state.equipment);
  const allSourceImages = useAppStore((state) => state.sourceImages);
  const allProcessings = useAppStore((state) => state.processings);
  const allAnomalies = useAppStore((state) => state.anomalies);
  const saveProcessing = useAppStore((state) => state.saveProcessing);
  const currentUser = useAppStore((state) => state.currentUser);

  const equipment = useMemo(
    () => (id ? allEquipment.find((e) => e.id === id) : undefined),
    [id, allEquipment]
  );

  const sourceImages = useMemo(
    () => (id ? allSourceImages.filter((img) => img.equipment_id === id) : []),
    [id, allSourceImages]
  );

  const anomalies = useMemo(() => {
    if (!id) return [];
    const imageIds = new Set(sourceImages.map((img) => img.id));
    const processingIds = new Set(
      allProcessings.filter((p) => imageIds.has(p.source_image_id)).map((p) => p.id)
    );
    return allAnomalies.filter((a) => processingIds.has(a.processing_id));
  }, [id, sourceImages, allProcessings, allAnomalies]);

  if (!equipment) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">设备不存在</p>
      </div>
    );
  }

  const handleStartProcessing = (imageId: string) => {
    const processingId = saveProcessing({
      source_image_id: imageId,
      zoom_level: 1,
      pan_offset: { x: 0, y: 0 },
      processed_by: currentUser,
      mode: 'browse',
    });
    navigate(`/annotate/${processingId}`);
  };

  const imageColumns = [
    {
      key: 'thumbnail',
      header: '缩略图',
      render: (row: any) => (
        <div className="w-16 h-12 rounded overflow-hidden border border-gray-200 bg-gray-100">
          {row.file_data ? (
            <img src={row.file_data} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Image className="w-5 h-5 text-gray-400" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'coordinates',
      header: '坐标',
      render: (row: any) => (
        <span className="font-mono text-sm">{row.coordinates}</span>
      ),
    },
    {
      key: 'batch',
      header: '批次号',
      render: (row: any) => row.batch_no,
    },
    {
      key: 'importTime',
      header: '导入时间',
      render: (row: any) =>
        new Date(row.import_time).toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
    },
    {
      key: 'action',
      header: '操作',
      render: (row: any) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleStartProcessing(row.id);
          }}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Eye className="w-3 h-3" />
          查看标注
        </button>
      ),
    },
  ];

  const anomalyColumns = [
    {
      key: 'time',
      header: '时间',
      render: (row: any) =>
        new Date(row.created_at).toLocaleDateString('zh-CN'),
    },
    {
      key: 'position',
      header: '位置',
      render: (row: any) =>
        `(${row.position_x.toFixed(1)}, ${row.position_y.toFixed(1)})`,
    },
    {
      key: 'severity',
      header: '严重程度',
      render: (row: any) => <SeverityBadge severity={row.severity} />,
    },
    {
      key: 'color',
      header: '颜色',
      render: (row: any) => <ColorBadge color={row.color_code} />,
    },
    {
      key: 'reason',
      header: '异常原因',
      render: (row: any) => (
        <span className="text-sm text-gray-600">{row.human_reason}</span>
      ),
    },
    {
      key: 'action',
      header: '操作',
      render: (row: any) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/trace/${row.id}`);
          }}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          追溯详情
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/equipment')}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-serif">{equipment.name}</h2>
          <p className="text-sm text-gray-500">{equipment.model}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <EquipmentStatusBadge status={equipment.status} />
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            <Edit className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">序列号</p>
          <p className="font-mono text-gray-900">{equipment.sn}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">位置</p>
          <p className="text-gray-900">{equipment.location}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">底图数量</p>
          <p className="text-gray-900 font-semibold">{sourceImages.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">异常总数</p>
          <p className="text-red-600 font-semibold">{anomalies.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 font-serif">关联底图</h3>
          </div>
        </div>
        <div className="p-4">
          <DataTable
            columns={imageColumns}
            data={sourceImages}
            onRowClick={(row) => handleStartProcessing(row.id)}
            emptyMessage="暂无底图，请先导入图像"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900 font-serif">历史异常</h3>
          </div>
        </div>
        <div className="p-4">
          <DataTable
            columns={anomalyColumns}
            data={anomalies}
            onRowClick={(row) => navigate(`/trace/${row.id}`)}
            emptyMessage="暂无异常记录"
          />
        </div>
      </div>
    </div>
  );
}
