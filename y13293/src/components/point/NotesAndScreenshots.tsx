import { useState } from 'react';
import type { Note, ScreenshotMeta } from '@/types';
import { ImagePlus, Send, X, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface NoteListProps {
  notes: Note[];
  onAdd: (content: string) => void;
}

export function NoteList({ notes, onAdd }: NoteListProps) {
  const [newNote, setNewNote] = useState('');
  const handleSubmit = () => {
    if (newNote.trim()) {
      onAdd(newNote.trim());
      setNewNote('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="输入人工备注，自动记录时间和操作人..."
          className="flex-1 px-3 py-2 border border-slate-300 rounded-sm text-sm resize-none h-20 focus:outline-none focus:border-slate-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
        />
        <Button onClick={handleSubmit} className="self-end">
          <Send size={14} />
        </Button>
      </div>
      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-sm">
            暂无备注
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="p-3 bg-slate-50 border border-slate-200 rounded-sm"
            >
              <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
                <span className="font-medium text-slate-700">{note.created_by}</span>
                <span>·</span>
                <span>{new Date(note.created_at).toLocaleString('zh-CN')}</span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {note.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface ScreenshotGalleryProps {
  screenshots: ScreenshotMeta[];
  onUpload: (file: File, desc: string) => void;
}

export function ScreenshotGallery({ screenshots, onUpload }: ScreenshotGalleryProps) {
  const [lightbox, setLightbox] = useState<ScreenshotMeta | null>(null);
  const [newDesc, setNewDesc] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file, newDesc || file.name);
      setNewDesc('');
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          placeholder="图片说明（可选）"
          className="flex-1 px-3 py-2 border border-slate-300 rounded-sm text-sm focus:outline-none focus:border-slate-500"
        />
        <label className="cursor-pointer">
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <Button variant="secondary" className="gap-2">
            <ImagePlus size={14} />
            上传截图
          </Button>
        </label>
      </div>
      {screenshots.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-sm">
          暂无截图附件
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {screenshots.map((ss) => (
            <div
              key={ss.id}
              className="group relative border border-slate-200 rounded-sm overflow-hidden bg-slate-100 aspect-square cursor-pointer"
              onClick={() => setLightbox(ss)}
            >
              {ss.data_url ? (
                <img
                  src={ss.data_url}
                  alt={ss.description}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                  暂无预览图
                </div>
              )}
              <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <ZoomIn size={24} className="text-white" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-slate-900/80 to-transparent">
                <p className="text-xs text-white truncate">{ss.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/90 flex items-center justify-center p-8"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-slate-300"
            onClick={() => setLightbox(null)}
          >
            <X size={24} />
          </button>
          <div className="max-w-5xl max-h-full" onClick={(e) => e.stopPropagation()}>
            {lightbox.data_url ? (
              <img
                src={lightbox.data_url}
                alt={lightbox.description}
                className="max-w-full max-h-[80vh] object-contain"
              />
            ) : (
              <div className="text-white text-center py-32">暂无图片</div>
            )}
            <p className="text-white text-sm mt-4 text-center">{lightbox.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}
