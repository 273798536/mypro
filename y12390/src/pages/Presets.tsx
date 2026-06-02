import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Upload,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Clock,
  Tag,
  AlertCircle,
  UploadCloud,
  X,
  FolderOpen,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import PageContainer from '@/components/layout/PageContainer';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import type { Preset, PresetVersion } from '@/types';
import { cn } from '@/lib/utils';

interface VersionTreeProps {
  versions: PresetVersion[];
}

function VersionTree({ versions }: VersionTreeProps) {
  const sortedVersions = [...versions].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-2">
      {sortedVersions.map((version, index) => (
        <div key={version.id} className="relative pl-6">
          {index < sortedVersions.length - 1 && (
            <div className="absolute left-2 top-6 h-full w-px bg-border" />
          )}
          <div className="relative flex items-start gap-3 py-2">
            <div className="absolute -left-4 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
              <GitBranch className="h-3 w-3 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">v{version.versionNumber}</span>
                {version.isOverride && (
                  <Badge variant="warning">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    覆盖
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{version.name}</p>
              <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground/70">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(version.createdAt).toLocaleString()}
                </span>
                {version.sourceInfo.importedFrom && (
                  <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    来自 {version.sourceInfo.importedFrom}
                  </span>
                )}
              </div>
              {version.overrideReason && (
                <p className="mt-1 text-xs text-warning">
                  覆盖原因：{version.overrideReason}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface PresetCardProps {
  preset: Preset;
  versions: PresetVersion[];
  onClick: () => void;
}

function PresetCard({ preset, versions, onClick }: PresetCardProps) {
  const [expanded, setExpanded] = useState(false);
  const currentVersion = versions.find(v => v.id === preset.currentVersionId);

  return (
    <Card hover className="cursor-pointer" onClick={onClick}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{preset.name}</h3>
              <p className="text-sm text-muted-foreground">{preset.pluginName}</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="rounded-lg p-1 text-muted-foreground/70 hover:bg-accent hover:text-foreground"
          >
            {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="primary">{preset.category}</Badge>
          {preset.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="default">{tag}</Badge>
          ))}
          {preset.tags.length > 3 && (
            <Badge variant="default">+{preset.tags.length - 3}</Badge>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground/70">当前版本</p>
            <p className="font-medium text-foreground">
              {currentVersion ? `v${currentVersion.versionNumber}` : '-'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground/70">版本数量</p>
            <p className="font-medium text-foreground">{versions.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground/70">最近更新</p>
            <p className="font-medium text-foreground">
              {new Date(preset.updatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {expanded && versions.length > 0 && (
          <div
            className="mt-4 border-t border-border pt-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-sm font-medium text-foreground">版本历史</p>
            <VersionTree versions={versions} />
          </div>
        )}
      </div>
    </Card>
  );
}

export default function Presets() {
  const navigate = useNavigate();
  const { presets, presetVersions, addPreset, addPresetVersion } = useAppStore();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const presetId = await addPreset({
        name: selectedFile.name.replace(/\.[^/.]+$/, ''),
        description: '从文件导入的预设',
        pluginName: 'Unknown',
        category: '未分类',
        source: 'import',
        authorId: 'current-user',
        authorName: '当前用户',
        currentVersionId: '',
        tags: [],
      });

      await addPresetVersion({
        presetId,
        versionNumber: '1.0.0',
        name: '初始版本',
        description: '从文件导入',
        parameters: [],
        fileHash: 'mock-hash',
        fileSize: selectedFile.size,
        createdBy: 'current-user',
        sourceInfo: {
          type: 'upload',
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          uploadDate: Date.now(),
          importedFrom: '本地文件',
        },
        isOverride: false,
      });

      setImportModalOpen(false);
      setSelectedFile(null);
    } finally {
      setImporting(false);
    }
  };

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">预设管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理所有预设及其版本历史</p>
        </div>
        <Button leftIcon={<Upload className="h-4 w-4" />} onClick={() => setImportModalOpen(true)}>
          导入预设
        </Button>
      </div>

      <div className="animate-stagger">
        {presets.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {presets.map(preset => (
              <PresetCard
                key={preset.id}
                preset={preset}
                versions={presetVersions[preset.id] || []}
                onClick={() => navigate(`/presets/${preset.id}`)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FolderOpen className="h-8 w-8 text-muted-foreground/70" />}
            title="暂无预设"
            description="导入您的第一个预设文件开始使用"
            action={{
              label: '导入预设',
              onClick: () => setImportModalOpen(true),
            }}
          />
        )}
      </div>

      <Modal
        open={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setSelectedFile(null);
        }}
        title="导入预设"
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setImportModalOpen(false);
                setSelectedFile(null);
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleImport}
              loading={importing}
              disabled={!selectedFile}
            >
              导入
            </Button>
          </>
        }
      >
        {selectedFile ? (
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20">
                <UploadCloud className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="rounded-lg p-1 text-muted-foreground/70 hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-12 text-center',
              'hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer'
            )}
            onClick={() => document.getElementById('file-upload')?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <UploadCloud className="h-12 w-12 text-muted-foreground/70" />
            <p className="mt-4 font-medium text-foreground">拖拽文件到此处或点击上传</p>
            <p className="mt-1 text-sm text-muted-foreground">支持 .fxp, .nmsv, .vstpreset 等格式</p>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept=".fxp,.nmsv,.vstpreset"
              onChange={handleFileSelect}
            />
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
