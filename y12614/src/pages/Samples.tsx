import { mockSamples } from '@/data/mockSamples';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Calendar, FileText, Play, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Samples() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">样例管理</h1>
          <p className="text-gray-500 mt-1">管理训练样例，选择合适的样本进行病斑圈选训练</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockSamples.map((sample) => (
            <div
              key={sample.id}
              className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-video relative bg-gray-100">
                <img
                  src={sample.imageUrl}
                  alt={sample.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3">
                  <StatusBadge status={sample.status} type="sample" />
                </div>
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                  <Link
                    to="/"
                    className="px-4 py-2 bg-white rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium"
                  >
                    <Play className="w-4 h-4" />
                    开始训练
                  </Link>
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-gray-800">{sample.name}</h3>
                
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {sample.createdAt.toLocaleDateString('zh-CN')}
                  </div>
                  <div className="flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" />
                    {sample.baseCoordinates.width} x {sample.baseCoordinates.height}
                  </div>
                </div>

                {sample.manualNote && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-yellow-800 mb-1">人工备注</p>
                        <p className="text-xs text-yellow-700 leading-relaxed">{sample.manualNote}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <Link
                    to="/"
                    className="flex-1 py-2 text-center text-sm bg-[#2D5A27] text-white rounded-lg hover:bg-[#3d7336] transition-colors"
                  >
                    开始训练
                  </Link>
                  <button className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    预览
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-800 mb-3">样例说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="font-medium text-green-800">顺利样例</span>
              </div>
              <p className="text-green-700 text-xs">
                典型的病斑特征，边界清晰，颜色均匀。作为正面教学案例使用。
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="font-medium text-yellow-800">待确认样例</span>
              </div>
              <p className="text-yellow-700 text-xs">
                边界模糊、颜色渐变的复杂情况。需要仔细判断，用于提高辨识能力。
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="font-medium text-red-800">明显坏数据</span>
              </div>
              <p className="text-red-700 text-xs">
                图像模糊、有污渍或拍摄问题的数据。训练识别坏数据的能力。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
