import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, AlertTriangle, Clock, FileCheck, FlaskConical } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import type { ImportPayload } from '@/types/game';
import { cn } from '@/lib/utils';

const typeIcon: Record<ImportPayload['type'], React.ElementType> = {
  conditions: FileText,
  counterExamples: AlertTriangle,
  timer: Clock,
};

const typeLabel: Record<ImportPayload['type'], string> = {
  conditions: '条件',
  counterExamples: '反例',
  timer: '计时',
};

export default function ImportPanel() {
  const importMaterials = useGameStore((s) => s.importMaterials);
  const imports = useGameStore((s) => s.imports);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          const payload: ImportPayload = {
            type: json.type || 'conditions',
            metadata: {
              source: json.source || file.name,
              importedAt: Date.now(),
            },
            raw: json,
            processed: json,
          };
          importMaterials(payload);
        } catch {
          console.error('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    },
    [importMaterials]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      files.forEach(handleFile);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      files.forEach(handleFile);
      e.target.value = '';
    },
    [handleFile]
  );

  const rawItems = imports.filter((i) => i.metadata.importedAt > 0);
  const processedItems = imports;

  return (
    <div
      className={cn(
        'flex flex-col h-full rounded-lg border border-amber-800/40 overflow-hidden',
        'bg-gradient-to-b from-[#2a1a0e]/95 to-[#1a0f06]/95'
      )}
    >
      <div className="flex items-center gap-2 bg-gradient-to-r from-amber-900/80 via-amber-800/60 to-amber-900/80 px-3 py-2 border-b border-amber-700/30">
        <Upload className="h-4 w-4 text-amber-400" />
        <h2
          className="text-sm font-bold text-amber-200 tracking-wide"
          style={{ fontFamily: 'Playfair Display, serif' }}
        >
          材料导入
        </h2>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'm-2 rounded-md border-2 border-dashed p-4 text-center transition-colors',
          isDragOver
            ? 'border-amber-400 bg-amber-900/20'
            : 'border-amber-700/30 bg-amber-950/10 hover:border-amber-600/50'
        )}
      >
        <Upload
          className={cn(
            'h-8 w-8 mx-auto mb-2 transition-colors',
            isDragOver ? 'text-amber-300' : 'text-amber-700'
          )}
        />
        <p className="text-xs text-amber-500 mb-2">拖放 JSON 文件至此处</p>
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-800/50 text-amber-300 text-xs cursor-pointer hover:bg-amber-700/50 transition-colors border border-amber-600/30">
          <FileCheck className="h-3.5 w-3.5" />
          选择文件
          <input type="file" accept=".json" multiple onChange={handleInputChange} className="hidden" />
        </label>
      </div>

      {imports.length > 0 && (
        <div className="flex-1 overflow-y-auto px-2 pb-2 grid grid-cols-2 gap-2">
          <section>
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
              <FlaskConical className="h-3 w-3 text-amber-500" />
              <h3 className="text-[10px] font-semibold text-amber-500 tracking-wider">
                原始材料
              </h3>
            </div>
            <div className="space-y-1">
              <AnimatePresence>
                {rawItems.map((item, idx) => {
                  const Icon = typeIcon[item.type];
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-950/40 border border-amber-800/20"
                    >
                      <Icon className="h-3 w-3 text-amber-500 shrink-0" />
                      <span className="text-[10px] text-amber-300 truncate">
                        {typeLabel[item.type]}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
              <FileCheck className="h-3 w-3 text-emerald-500" />
              <h3 className="text-[10px] font-semibold text-emerald-500 tracking-wider">
                处理结果
              </h3>
            </div>
            <div className="space-y-1">
              <AnimatePresence>
                {processedItems.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-950/30 border border-emerald-800/20"
                  >
                    <span className="text-[10px] text-emerald-400">
                      {item.metadata.source.substring(0, 12)}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
