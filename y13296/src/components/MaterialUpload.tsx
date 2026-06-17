import { useState } from 'react';
import { Upload, FileText, MessageSquare, Paperclip, Plus, X, AlertCircle } from 'lucide-react';
import { MaterialType, Material, ComplaintRecord, ParsedData } from '../types';
import { parseMaterialContent, getMaterialTypeLabel } from '../services/dataParser';
import { Card, Button, Badge, Alert, SectionHeader } from './ui';

interface MaterialUploadProps {
  onMaterialsChange: (materials: Material[]) => void;
  onComplaintsChange: (complaints: ComplaintRecord[]) => void;
  materials: Material[];
  complaints: ComplaintRecord[];
}

const materialTypeConfig: Record<MaterialType, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  resident_feedback: {
    label: '居民反馈',
    icon: <MessageSquare className="w-5 h-5" />,
    color: 'bg-blue-100 text-blue-700',
    description: '居民通过微信群、电话等渠道提交的反馈',
  },
  attachment: {
    label: '附件材料',
    icon: <Paperclip className="w-5 h-5" />,
    color: 'bg-purple-100 text-purple-700',
    description: '现场照片、测量报告、统计表格等附件',
  },
  verbal_note: {
    label: '口头说明',
    icon: <FileText className="w-5 h-5" />,
    color: 'bg-orange-100 text-orange-700',
    description: '临时口头沟通的补充说明',
  },
};

export function MaterialUpload({ onMaterialsChange, onComplaintsChange, materials, complaints }: MaterialUploadProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<MaterialType>('resident_feedback');
  const [title, setTitle] = useState('');
  const [parkName, setParkName] = useState('');
  const [content, setContent] = useState('');
  const [uploader, setUploader] = useState('阿宁');
  const [isLateArrival, setIsLateArrival] = useState(false);
  const [parseErrors, setParseErrors] = useState<{ materialTitle: string; errors: ParsedData['parseErrors'] }[]>([]);

  const handleAddMaterial = () => {
    if (!title.trim() || !parkName.trim() || !content.trim()) {
      return;
    }

    const { material, parsedData } = parseMaterialContent(
      content,
      selectedType,
      title,
      parkName,
      uploader,
      undefined,
      isLateArrival
    );

    const newMaterials = [...materials, material];
    const newComplaints = [...complaints, ...parsedData.complaints];

    onMaterialsChange(newMaterials);
    onComplaintsChange(newComplaints);

    if (parsedData.parseErrors.length > 0) {
      setParseErrors(prev => [...prev, { materialTitle: title, errors: parsedData.parseErrors }]);
    }

    setTitle('');
    setContent('');
    setIsLateArrival(false);
    setShowForm(false);
  };

  const handleRemoveMaterial = (materialId: string) => {
    const newMaterials = materials.filter(m => m.id !== materialId);
    const newComplaints = complaints.filter(c => c.materialId !== materialId);
    onMaterialsChange(newMaterials);
    onComplaintsChange(newComplaints);
  };

  const loadExample = () => {
    setParkName('阳光小区口袋公园');
    setTitle('6月15日居民反馈汇总');
    setContent(`街道：阳光路
路口：春风路口
类型：座椅不足
描述：下午5点后老人孩子多，座椅不够坐
座椅数量：4
时间：2026-06-15 17:30
投诉人：张阿姨

街道：阳光路
路口：春风路口
类型：座椅损坏
描述：有2个座椅木板断裂，无法使用
座椅数量：2
时间：2026-06-15 10:20
投诉人：李师傅

街道：阳光路
路口：夏雨路口
类型：座椅不足
描述：晚饭后散步的人多，找不到座位
座椅数量：3
时间：2026-06-15 19:00
投诉人：王女士`);
  };

  return (
    <Card className="p-6">
      <SectionHeader
        title="材料上传"
        icon={<Upload className="w-5 h-5" />}
        description="上传居民反馈、附件材料和口头说明，支持多版本追踪"
        action={
          <Button onClick={() => setShowForm(!showForm)} size="sm">
            <Plus className="w-4 h-4" />
            {showForm ? '取消' : '添加材料'}
          </Button>
        }
      />

      {parseErrors.length > 0 && (
        <Alert severity="warning" title="部分数据解析失败" className="mb-4">
          {parseErrors.map((pe, idx) => (
            <div key={idx} className="mb-2">
              <div className="font-medium">{pe.materialTitle}：</div>
              {pe.errors.map((e, eIdx) => (
                <div key={eIdx} className="ml-4 text-sm">
                  第{e.line}行: {e.error} - "{e.content.slice(0, 30)}..."
                </div>
              ))}
            </div>
          ))}
          <button 
            className="text-blue-600 hover:underline text-sm mt-2"
            onClick={() => setParseErrors([])}
          >
            清除提示
          </button>
        </Alert>
      )}

      {showForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">材料类型</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(materialTypeConfig) as MaterialType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      selectedType === type
                        ? 'border-park-500 bg-park-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`inline-block p-2 rounded-lg mb-1 ${materialTypeConfig[type].color}`}>
                      {materialTypeConfig[type].icon}
                    </div>
                    <div className="text-sm font-medium">{materialTypeConfig[type].label}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">{materialTypeConfig[selectedType].description}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">公园名称</label>
                <input
                  type="text"
                  value={parkName}
                  onChange={e => setParkName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-park-500 focus:border-park-500"
                  placeholder="例如：阳光小区口袋公园"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">材料标题</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-park-500 focus:border-park-500"
                  placeholder="例如：6月15日居民反馈汇总"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">上传人</label>
                  <input
                    type="text"
                    value={uploader}
                    onChange={e => setUploader(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-park-500 focus:border-park-500"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-6">
                  <input
                    type="checkbox"
                    checked={isLateArrival}
                    onChange={e => setIsLateArrival(e.target.checked)}
                    className="w-4 h-4 text-park-600 rounded focus:ring-park-500"
                  />
                  <span className="text-sm text-orange-700 font-medium">标记为晚到附件</span>
                </label>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">材料内容</label>
              <button
                type="button"
                onClick={loadExample}
                className="text-xs text-park-600 hover:underline"
              >
                加载示例数据
              </button>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-park-500 focus:border-park-500 font-mono text-sm"
              placeholder="请按格式粘贴内容：&#10;街道：阳光路&#10;路口：春风路口&#10;类型：座椅不足&#10;描述：下午5点后老人孩子多&#10;座椅数量：4&#10;时间：2026-06-15 17:30&#10;投诉人：张阿姨"
            />
            <p className="text-xs text-gray-500 mt-1">
              支持格式：字段：内容，每条记录之间用空行分隔。系统会自动解析并提取投诉记录。
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              取消
            </Button>
            <Button 
              onClick={handleAddMaterial}
              disabled={!title.trim() || !parkName.trim() || !content.trim()}
            >
              添加材料
            </Button>
          </div>
        </div>
      )}

      {materials.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Upload className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="mb-2">还没有上传任何材料</p>
          <p className="text-sm">点击"添加材料"开始上传居民反馈、附件或口头说明</p>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map(material => (
            <div
              key={material.id}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${materialTypeConfig[material.type].color}`}>
                    {materialTypeConfig[material.type].icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{material.title}</h4>
                      <Badge severity="info">{getMaterialTypeLabel(material.type)}</Badge>
                      {material.versions.length > 1 && (
                        <Badge severity="warning">
                          v{material.currentVersion}（{material.versions.length}个版本）
                        </Badge>
                      )}
                      {material.versions.some(v => v.isLateArrival) && (
                        <Badge severity="error">
                          <AlertCircle className="w-3 h-3" />
                          含晚到附件
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {material.parkName} · 上传人：{material.versions[0].uploader} · 
                      版本数：{material.versions.length} · 标签：{material.tags.join('、')}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      原始数据：{material.versions[0].content.slice(0, 80)}...
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveMaterial(material.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
