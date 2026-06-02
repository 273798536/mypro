import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Image,
  Plus,
  FileText,
  ChevronDown,
  ChevronRight,
  User,
  Clock
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { formatDateTime } from '../utils/format';
import type { Device } from '../../shared/types';

export const Devices: React.FC = () => {
  const { devices, loading, fetchDevices, addDeviceNote } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [imageModalDevice, setImageModalDevice] = useState<Device | null>(null);
  const [noteModalDevice, setNoteModalDevice] = useState<Device | null>(null);
  const [newNote, setNewNote] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('');

  useEffect(() => {
    if (devices.length === 0) fetchDevices();
  }, []);

  const filteredDevices = devices.filter(device => {
    const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || device.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleAddNote = async () => {
    if (!noteModalDevice || !newNote || !noteAuthor) return;
    const success = await addDeviceNote(noteModalDevice.id, newNote, noteAuthor);
    if (success) {
      setNoteModalDevice(null);
      setNewNote('');
      setNoteAuthor('');
    }
  };

  const currentImageIndex = imageModalDevice ? devices.findIndex(d => d.id === imageModalDevice.id) : 0;

  const navigateImage = (direction: 'prev' | 'next') => {
    if (!imageModalDevice) return;
    const currentIndex = devices.findIndex(d => d.id === imageModalDevice.id);
    let newIndex = direction === 'next'
      ? (currentIndex + 1) % devices.length
      : (currentIndex - 1 + devices.length) % devices.length;
    setImageModalDevice(devices[newIndex]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索设备名称、ID、分类..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-80"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-40"
            >
              <option value="all">全部状态</option>
              <option value="in_stock">在库</option>
              <option value="borrowed">借出中</option>
              <option value="damaged">损坏待修</option>
              <option value="anomaly">异常</option>
            </select>
          </div>
        </div>
        <div className="text-sm text-slate-500">
          共 {filteredDevices.length} 台设备
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="table-header w-10"></th>
              <th className="table-header">图片</th>
              <th className="table-header">设备ID</th>
              <th className="table-header">设备名称</th>
              <th className="table-header">分类</th>
              <th className="table-header">状态</th>
              <th className="table-header">当前借用人</th>
              <th className="table-header">最新备注</th>
              <th className="table-header text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDevices.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  暂无设备数据，请先导入样例数据
                </td>
              </tr>
            ) : (
              filteredDevices.map((device, index) => (
                <React.Fragment key={device.id}>
                  <tr
                    className="hover:bg-slate-50 transition-colors animate-stagger"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="table-cell">
                      <button
                        onClick={() => toggleExpand(device.id)}
                        className="p-1 hover:bg-slate-200 rounded"
                      >
                        {expandedId === device.id ? (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                    </td>
                    <td className="table-cell">
                      {device.imageUrl ? (
                        <button
                          onClick={() => setImageModalDevice(device)}
                          className="group relative"
                        >
                          <img
                            src={device.imageUrl}
                            alt={device.name}
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                          />
                          <div className="absolute inset-0 bg-slate-900/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Image className="w-4 h-4 text-white" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Image className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                    </td>
                    <td className="table-cell font-mono text-xs text-slate-500">{device.id}</td>
                    <td className="table-cell font-medium text-slate-900">{device.name}</td>
                    <td className="table-cell text-slate-600">{device.category}</td>
                    <td className="table-cell">
                      <StatusBadge type="device" value={device.status} />
                    </td>
                    <td className="table-cell">
                      {device.currentBorrower ? (
                        <span className="flex items-center gap-1.5 text-slate-700">
                          <User className="w-3.5 h-3.5" />
                          {device.currentBorrower}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="table-cell max-w-xs">
                      {device.notes.length > 0 ? (
                        <p className="text-sm text-slate-600 truncate">
                          {device.notes[device.notes.length - 1].content}
                        </p>
                      ) : (
                        <span className="text-slate-400">无备注</span>
                      )}
                    </td>
                    <td className="table-cell text-right">
                      <button
                        onClick={() => setNoteModalDevice(device)}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1 ml-auto"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        添加备注
                      </button>
                    </td>
                  </tr>
                  {expandedId === device.id && (
                    <tr>
                      <td colSpan={9} className="bg-slate-50 px-8 py-4">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary-600" />
                              备注历史（共 {device.notes.length} 条）
                            </h4>
                            {device.notes.length === 0 ? (
                              <p className="text-sm text-slate-500">暂无备注记录</p>
                            ) : (
                              <div className="space-y-3">
                                {[...device.notes].reverse().map((note) => (
                                  <div
                                    key={note.id}
                                    className="bg-white rounded-lg p-4 border border-slate-200"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="badge bg-primary-100 text-primary-800">
                                          版本 {note.version}
                                        </span>
                                        <span className="text-sm text-slate-600 flex items-center gap-1">
                                          <User className="w-3.5 h-3.5" />
                                          {note.author}
                                        </span>
                                      </div>
                                      <span className="text-xs text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDateTime(note.timestamp)}
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-700">{note.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={!!imageModalDevice}
        onClose={() => setImageModalDevice(null)}
        title={imageModalDevice?.name || ''}
        size="lg"
      >
        {imageModalDevice && (
          <div className="relative">
            <button
              onClick={() => navigateImage('prev')}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors z-10"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <img
              src={imageModalDevice.imageUrl}
              alt={imageModalDevice.name}
              className="w-full max-h-[60vh] object-contain rounded-lg"
            />
            <button
              onClick={() => navigateImage('next')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors z-10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="mt-4 text-center text-sm text-slate-500">
              {currentImageIndex + 1} / {devices.length} · {imageModalDevice.id}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!noteModalDevice}
        onClose={() => {
          setNoteModalDevice(null);
          setNewNote('');
          setNoteAuthor('');
        }}
        title={`添加备注 - ${noteModalDevice?.name}`}
        size="md"
      >
        <div className="space-y-4">
          {noteModalDevice && noteModalDevice.notes.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-1">当前最新备注（版本 {noteModalDevice.notes.length}）</p>
              <p className="text-sm text-slate-700">
                {noteModalDevice.notes[noteModalDevice.notes.length - 1].content}
              </p>
            </div>
          )}
          <div>
            <label className="label">备注内容</label>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="input min-h-[100px] resize-none"
              placeholder="请输入备注内容..."
              required
            />
          </div>
          <div>
            <label className="label">修改人</label>
            <input
              type="text"
              value={noteAuthor}
              onChange={(e) => setNoteAuthor(e.target.value)}
              className="input"
              placeholder="请输入您的姓名"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setNoteModalDevice(null);
                setNewNote('');
                setNoteAuthor('');
              }}
              className="btn btn-secondary"
            >
              取消
            </button>
            <button
              onClick={handleAddNote}
              disabled={loading || !newNote || !noteAuthor}
              className="btn btn-primary"
            >
              {loading ? '保存中...' : '保存备注'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
