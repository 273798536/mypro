import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Image, Clock, User, BookOpen } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import StatusBadge from '../components/record/StatusBadge';
import CalculationPanel from '../components/calculation/CalculationPanel';
import SpectrumChart from '../components/spectrum/SpectrumChart';
import AnnotationTimeline from '../components/annotation/AnnotationTimeline';
import StudentMask from '../components/record/StudentMask';

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const getRecordById = useAppStore((s) => s.getRecordById);
  const currentRole = useAppStore((s) => s.currentRole);

  const record = getRecordById(id || '');

  if (!record) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">未找到该记录</p>
        <button
          onClick={() => navigate('/')}
          className="text-lab-blue hover:underline"
        >
          返回列表
        </button>
      </div>
    );
  }

  const content = (
    <div className="animate-fade-up">
      {/* 顶部导航和信息 */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-lab-blue transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          返回记录列表
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="font-display text-3xl text-lab-blue font-bold">
                {record.sampleCode}
              </h2>
              <StatusBadge status={record.status} />
            </div>
            <p className="text-gray-600">{record.titrationType}</p>
          </div>

          <div className="flex items-center gap-2">
            <User size={14} className="text-gray-400" />
            <span className="text-sm text-gray-600">
              学生 <span className="font-medium">{record.student}</span>
              <span className="mx-1.5 text-gray-300">|</span>
              复核人 <span className="font-medium text-lab-blue">{record.reviewer}</span>
            </span>
          </div>
        </div>

        <div className="mt-4 p-4 bg-paper rounded-sm-plus italic text-gray-600 leading-relaxed border-l-4 border-lab-blue/30">
          {record.summary}
        </div>

        {currentRole === 'teacher' && record.teacherNote && (
          <div className="mt-4 p-4 bg-lab-yellow/10 rounded-sm-plus border border-lab-yellow/30">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={16} className="text-lab-yellow" />
              <span className="text-sm font-semibold text-lab-yellow">教师讲解</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: '"Source Sans 3", serif' }}>
              {record.teacherNote}
            </p>
          </div>
        )}
      </div>

      {/* 双栏：左配平计算，右谱图 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-3">
          <CalculationPanel steps={record.calculation} />
        </div>
        <div className="lg:col-span-2">
          <SpectrumChart spectrum={record.spectrum} />
        </div>
      </div>

      {/* 异常留痕时间线 */}
      <div className="mb-6">
        <AnnotationTimeline record={record} />
      </div>

      {/* 底部固定来源区 */}
      <div className="bg-paper-dark/50 rounded-sm-plus p-5 border border-paper-dark">
        <div className="text-xs font-semibold text-lab-blue mb-3 flex items-center gap-2">
          <FileText size={14} />
          原始来源引用（不可编辑）
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-gray-400" />
            <span className="text-gray-500">实验记录簿：</span>
            <span className="font-mono-chem text-gray-800">{record.source.notebookId}</span>
            <span className="text-gray-500">，第 </span>
            <span className="font-mono-chem font-bold text-lab-blue">
              {record.source.lineNumber}
            </span>
            <span className="text-gray-500"> 行</span>
          </div>
          <div className="flex items-center gap-2">
            <Image size={14} className="text-gray-400" />
            <span className="text-gray-500">谱图文件：</span>
            <span className="font-mono-chem text-gray-800">{record.source.spectrumFile}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-gray-400" />
            <span className="text-gray-500">采样时间：</span>
            <span className="font-mono-chem text-gray-800">{record.source.samplingTime}</span>
          </div>
        </div>
        {record.source.originalNote && (
          <div className="mt-3 text-xs text-gray-500 italic">
            备注："{record.source.originalNote}"
          </div>
        )}
      </div>
    </div>
  );

  if (currentRole === 'student') {
    return (
      <div className="p-8 max-w-[1400px] mx-auto">
        <StudentMask
          status={record.status}
          reviewer={record.reviewer}
          lineNumber={record.source.lineNumber}
        >
          {content}
        </StudentMask>
      </div>
    );
  }

  return <div className="p-8 max-w-[1400px] mx-auto">{content}</div>;
}
