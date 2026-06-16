import { useState, useEffect, useRef } from 'react';
import { Save, Check } from 'lucide-react';

interface NoteEditorProps {
  complaintId: string;
  currentNote: string;
  onSave: (note: string) => void;
}

export default function NoteEditor({ complaintId, currentNote, onSave }: NoteEditorProps) {
  const [note, setNote] = useState(currentNote);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setNote(currentNote);
    setSaved(false);
  }, [currentNote, complaintId]);

  const isChanged = note !== currentNote;

  const handleSave = () => {
    if (!isChanged) return;
    onSave(note);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        maxLength={500}
        className="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-bg)',
        }}
        placeholder="添加备注..."
      />

      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {note.length} / 500
        </span>

        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-success)' }}>
              <Check size={12} />
              已保存
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!isChanged}
            className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Save size={14} />
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
