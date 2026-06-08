import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Edit3,
  History,
  Download,
  MapPin,
  Calendar,
  User,
  Images,
  X,
  Crosshair,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate, formatCoordinates } from '@/lib/format';
import type { VolcanoRecord, Screenshot } from '@shared/types';

export default function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<VolcanoRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeScreenshot, setActiveScreenshot] = useState<Screenshot | null>(null);
  const [jumpTarget, setJumpTarget] = useState<Screenshot | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadRecord = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.getRecord(id);
      setRecord(res.data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadRecord();
  }, [id, loadRecord]);

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await api.deleteRecord(id);
      navigate('/');
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      }
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  function handleJumpTo(screenshot: Screenshot) {
    setJumpTarget(screenshot);
    setTimeout(() => setJumpTarget(null), 2500);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-stone-500">加载中...</div>
    );
  }

  if (!record) {
    return (
      <div className="p-8 text-center text-stone-500">
        记录不存在
        <Link to="/" className="ml-3 text-orange-600 underline">返回列表</Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/"
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-stone-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-stone-800 truncate">
            {record.title}
          </h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-stone-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {record.location}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(record.timestamp)}
            </span>
            <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-xs font-mono">
              {record.batchId}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/record/${record.id}/edit`}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:shadow-md hover:shadow-orange-500/25 transition-all text-sm font-medium"
          >
            <Edit3 className="w-4 h-4" />
            修正结论
          </Link>
          <Link
            to={`/record/${record.id}/history`}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-lg hover:border-stone-300 hover:bg-stone-50 transition-all text-sm font-medium"
          >
            <History className="w-4 h-4" />
            历史版本
          </Link>
          <a
            href={api.getExportUrl('json', record.id)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-lg hover:border-stone-300 hover:bg-stone-50 transition-all text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            导出
          </a>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            title="删除记录"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {jumpTarget && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl flex items-center gap-3"
        >
          <Crosshair className="w-5 h-5 text-orange-600" />
          <div>
            <div className="font-medium text-orange-800">设备坐标定位</div>
            <div className="text-sm text-orange-600">
              已跳转至：{jumpTarget.description || '截图'} -{' '}
              {formatCoordinates(
                jumpTarget.deviceCoordinates.x,
                jumpTarget.deviceCoordinates.y,
                jumpTarget.deviceCoordinates.z
              )}
              <span className="text-orange-400 ml-2">（复盘时可直接关联到设备坐标数据）</span>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-semibold text-stone-800 flex items-center gap-2">
                <Images className="w-4.5 h-4.5 text-orange-500" />
                截图清单
                <span className="text-sm font-normal text-stone-400">
                  ({record.screenshots.length})
                </span>
              </h2>
            </div>
            <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
              {record.screenshots.map(ss => (
                <motion.div
                  key={ss.id}
                  whileHover={{ y: -2 }}
                  className="group relative rounded-lg overflow-hidden border border-stone-200 cursor-pointer hover:border-orange-400 transition-all"
                  onClick={() => setActiveScreenshot(ss)}
                >
                  <img
                    src={ss.url}
                    alt={ss.description}
                    className="w-full h-36 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <div className="text-white text-xs font-medium">
                      {ss.description}
                    </div>
                    <div className="text-white/80 text-xs mt-0.5 font-mono">
                      {formatCoordinates(
                        ss.deviceCoordinates.x,
                        ss.deviceCoordinates.y,
                        ss.deviceCoordinates.z
                      )}
                    </div>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleJumpTo(ss);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-500/80"
                    title="跳转至设备坐标"
                  >
                    <Crosshair className="w-3.5 h-3.5 text-white" />
                  </button>
                  <div className="p-2.5 bg-stone-50 border-t border-stone-100">
                    <div className="text-xs text-stone-600 truncate">
                      {ss.description || '未命名截图'}
                    </div>
                    <div className="text-[10px] text-stone-400 mt-0.5 font-mono">
                      {formatCoordinates(
                        ss.deviceCoordinates.x,
                        ss.deviceCoordinates.y,
                        ss.deviceCoordinates.z
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
              <h2 className="font-semibold text-stone-800">当前权威结论</h2>
              <span className="px-2 py-0.5 bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 text-xs font-medium rounded">
                v{record.history.length}
              </span>
            </div>
            <div className="p-5">
              <div className="text-stone-700 leading-relaxed whitespace-pre-wrap">
                {record.currentConclusion.content}
              </div>
              <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-stone-500">
                  <User className="w-3.5 h-3.5" />
                  {record.currentConclusion.author}
                </div>
                <div className="flex items-center gap-1.5 text-stone-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(record.currentConclusion.timestamp)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-stone-100">
              <h2 className="font-semibold text-stone-800">基础信息</h2>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">记录 ID</span>
                <span className="text-stone-700 font-mono text-xs">{record.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">批次号</span>
                <span className="text-stone-700 font-mono text-xs">{record.batchId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">截图数量</span>
                <span className="text-stone-700">{record.screenshots.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">历史版本</span>
                <span className="text-stone-700">{record.history.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">保存视角</span>
                <span className="text-stone-700">{record.perspectives?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">创建时间</span>
                <span className="text-stone-700">{formatDate(record.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">更新时间</span>
                <span className="text-stone-700">{formatDate(record.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activeScreenshot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
            onClick={() => setActiveScreenshot(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-w-4xl w-full"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setActiveScreenshot(null)}
                className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={activeScreenshot.url}
                alt={activeScreenshot.description}
                className="w-full rounded-xl shadow-2xl"
              />
              <div className="mt-4 bg-white/10 backdrop-blur-md rounded-xl p-4 text-white">
                <div className="font-medium text-lg">{activeScreenshot.description || '截图'}</div>
                <div className="mt-2 flex items-center justify-between text-sm text-white/80">
                  <span className="font-mono">
                    设备坐标：{formatCoordinates(
                      activeScreenshot.deviceCoordinates.x,
                      activeScreenshot.deviceCoordinates.y,
                      activeScreenshot.deviceCoordinates.z
                    )}
                  </span>
                  <span>{formatDate(activeScreenshot.timestamp)}</span>
                </div>
                <button
                  onClick={() => {
                    handleJumpTo(activeScreenshot);
                    setActiveScreenshot(null);
                  }}
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm transition-colors"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  跳转至设备坐标数据
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-8"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-stone-800">确认删除？</h3>
                  <p className="mt-1 text-stone-500 text-sm">
                    删除后将无法恢复，所有历史版本和截图数据都会一并删除。
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors text-sm"
                  disabled={deleting}
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                  disabled={deleting}
                >
                  {deleting ? '删除中...' : '确认删除'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
