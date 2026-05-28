import { useState, useEffect } from 'react';
import { Edit, Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditableFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  isModified?: boolean;
  type?: 'text' | 'number' | 'date';
  unit?: string;
  className?: string;
}

export function EditableField({ label, value, onChange, isModified, type = 'text', unit, className }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));

  useEffect(() => {
    setEditValue(String(value));
  }, [value]);

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(String(value));
    setIsEditing(false);
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-600">{label}</label>
        {isModified && (
          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
            <AlertCircle className="h-3 w-3" />
            已修改
          </span>
        )}
      </div>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border-2 border-blue-500 rounded focus:outline-none bg-blue-50 font-mono"
            autoFocus
          />
          {unit && <span className="text-sm text-slate-500">{unit}</span>}
          <button
            onClick={handleSave}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={handleCancel}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-sm font-mono',
              isModified ? 'text-amber-700 font-semibold' : 'text-slate-800'
            )}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {unit && <span className="text-sm text-slate-500">{unit}</span>}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-slate-400 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
          >
            <Edit className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
