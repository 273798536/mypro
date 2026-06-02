import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  GitBranch,
  Calendar,
  User,
  Tag,
  FolderOpen,
  FileAudio,
  AlertTriangle,
  Plus,
  Upload,
  Clock,
  HardDrive,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import ParameterCard from '@/components/ui/ParameterCard';
import { cn } from '@/lib/utils';
import type { PresetVersion, PresetParameter } from '@/types';

interface VersionNode {
  version: PresetVersion;
  children: VersionNode[];
}

function buildVersionTree(versions: PresetVersion[]): VersionNode[] {
  const versionMap = new Map<string, VersionNode>();
  const roots: VersionNode[] = [];

  versions.forEach((v) => {
    versionMap.set(v.id, { version: v, children: [] });
  });

  versions.forEach((v) => {
    const node = versionMap.get(v.id)!;
    if (v.parentVersionId && versionMap.has(v.parentVersionId)) {
      versionMap.get(v.parentVersionId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function sortVersionTree(nodes: VersionNode[]): VersionNode[] {
  return nodes
    .sort(
      (a, b) =>
        parseFloat(b.version.versionNumber) - parseFloat(a.version.versionNumber)
    )
    .map((node) => ({
      ...node,
      children: sortVersionTree(node.children),
    }));
}

interface VersionTreeNodeProps {
  node: VersionNode;
  level: number;
  selectedVersionId: string | null;
  onSelect: (version: PresetVersion) => void;
}

function VersionTreeNode({
  node,
  level,
  selectedVersionId,
  onSelect,
}: VersionTreeNodeProps) {
  const { version, children } = node;
  const isSelected = selectedVersionId === version.id;

  return (
    <div>
      <div
        onClick={() => onSelect(version)}
        className={cn(
          'relative cursor-pointer rounded-lg border-2 p-4 transition-all',
          isSelected
            ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
            : version.isOverride
            ? 'border-destructive/50 bg-destructive/10 hover:border-destructive/70'
            : 'border-border bg-card hover:border-border hover:bg-accent'
        )}
        style={{ marginLeft: level * 24 }}
      >
        {level > 0 && (
          <div className="absolute -left-6 top-1/2 h-0.5 w-6 bg-border -translate-y-1/2" />
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-primary">
                v{version.versionNumber}
              </span>
              {version.isOverride && (
                <Badge variant="danger" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  版本覆盖
                </Badge>
              )}
              <span className="font-medium text-foreground">{version.name}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{version.description}</p>

            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {version.createdBy}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(version.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <HardDrive className="h-3 w-3" />
                {version.sourceInfo.fileName}
              </span>
              <span className="text-muted-foreground/70">|</span>
              <span className="text-muted-foreground flex items-center gap-1">
                <Upload className="h-3 w-3" />
                {version.sourceInfo.fileType}
              </span>
              <span className="text-muted-foreground/70">|</span>
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(version.sourceInfo.uploadDate).toLocaleDateString()}
              </span>
            </div>
          </div>

          <ChevronRight
            className={cn(
              'h-5 w-5 flex-shrink-0 transition-transform',
              isSelected && 'rotate-90 text-primary'
            )}
          />
        </div>
      </div>

      {children.length > 0 && (
        <div className="relative mt-1">
          <div
            className="absolute left-0 top-0 bottom-0 w-0.5 bg-border"
            style={{ marginLeft: level * 24 + 12 }}
          />
          {children.map((child) => (
            <VersionTreeNode
              key={child.version.id}
              node={child}
              level={level + 1}
              selectedVersionId={selectedVersionId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ParameterGroupProps {
  title: string;
  parameters: PresetParameter[];
}

function ParameterGroup({ title, parameters }: ParameterGroupProps) {
  if (parameters.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <FolderOpen className="h-4 w-4" />
        {title}
        <span className="text-xs font-normal text-muted-foreground/70">
          ({parameters.length} 个参数)
        </span>
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {parameters.map((param) => (
          <ParameterCard key={param.id} parameter={param} />
        ))}
      </div>
    </div>
  );
}

export default function PresetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    presets,
    presetVersions,
    snapshots,
    assignments,
    setCurrentPreset,
    addPresetVersion,
  } = useAppStore();

  const [selectedVersion, setSelectedVersion] = useState<PresetVersion | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newVersionForm, setNewVersionForm] = useState({
    versionNumber: '',
    name: '',
    description: '',
    parentVersionId: '',
    fileName: '',
    fileType: 'fxp',
    isOverride: false,
    overrideReason: '',
  });

  const preset = useMemo(
    () => presets.find((p) => p.id === id) || null,
    [presets, id]
  );

  const versions = useMemo(() => {
    if (!id) return [];
    return presetVersions[id] || [];
  }, [presetVersions, id]);

  const versionTree = useMemo(() => {
    return sortVersionTree(buildVersionTree(versions));
  }, [versions]);

  const relatedSnapshots = useMemo(() => {
    const versionIds = versions.map((v) => v.id);
    return snapshots.filter((s) => versionIds.includes(s.presetVersionId));
  }, [versions, snapshots]);

  const relatedAssignments = useMemo(() => {
    const versionIds = versions.map((v) => v.id);
    return assignments.filter((a) => versionIds.includes(a.presetVersionId));
  }, [versions, assignments]);

  const groupedParameters = useMemo(() => {
    if (!selectedVersion) return {};
    const groups: Record<string, PresetParameter[]> = {
      Oscillators: [],
      Filters: [],
      Envelopes: [],
      LFOs: [],
      Effects: [],
    };

    selectedVersion.parameters.forEach((param) => {
      const topPath = param.path.split('/')[0];
      if (groups[topPath]) {
        groups[topPath].push(param);
      }
    });

    return groups;
  }, [selectedVersion]);

  useEffect(() => {
    if (preset) {
      setCurrentPreset(preset);
    }
    return () => setCurrentPreset(null);
  }, [preset, setCurrentPreset]);

  useEffect(() => {
    if (versions.length > 0 && !selectedVersion) {
      const current = versions.find(
        (v) => v.id === preset?.currentVersionId
      );
      setSelectedVersion(current || versions[0]);
    }
  }, [versions, preset, selectedVersion]);

  const handleCreateVersion = async () => {
    if (!preset || !newVersionForm.versionNumber || !newVersionForm.name) return;

    await addPresetVersion({
      presetId: preset.id,
      versionNumber: newVersionForm.versionNumber,
      parentVersionId: newVersionForm.parentVersionId || undefined,
      name: newVersionForm.name,
      description: newVersionForm.description,
      parameters: selectedVersion?.parameters || [],
      fileHash: Math.random().toString(36).substring(7),
      fileSize: 24576,
      createdBy: 'teacher-001',
      sourceInfo: {
        type: 'upload',
        fileName: newVersionForm.fileName || `${preset.name}_v${newVersionForm.versionNumber}.fxp`,
        fileType: newVersionForm.fileType,
        uploadDate: Date.now(),
        importedFrom: preset.pluginName,
      },
      isOverride: newVersionForm.isOverride,
      overrideReason: newVersionForm.isOverride
        ? newVersionForm.overrideReason
        : undefined,
    });

    setIsModalOpen(false);
    setNewVersionForm({
      versionNumber: '',
      name: '',
      description: '',
      parentVersionId: '',
      fileName: '',
      fileType: 'fxp',
      isOverride: false,
      overrideReason: '',
    });
  };

  if (!preset) {
    return (
      <EmptyState
        title="预设不存在"
        description="您访问的预设可能已被删除或不存在"
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{preset.name}</CardTitle>
              <CardDescription>{preset.description}</CardDescription>
            </div>
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setIsModalOpen(true)}
            >
              新建版本
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">插件名称</p>
              <p className="mt-1 font-medium text-foreground">
                {preset.pluginName}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">分类</p>
              <p className="mt-1 font-medium text-foreground">
                {preset.category}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">创建者</p>
              <p className="mt-1 font-medium text-foreground">
                {preset.authorName}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">创建时间</p>
              <p className="mt-1 font-medium text-foreground">
                {new Date(preset.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">更新时间</p>
              <p className="mt-1 font-medium text-foreground">
                {new Date(preset.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">版本数量</p>
              <p className="mt-1 font-medium text-foreground">
                {versions.length} 个版本
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {preset.tags.map((tag) => (
              <Badge key={tag} variant="primary" className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              版本历史
            </CardTitle>
            <CardDescription>
              树形结构展示所有版本，点击查看详细参数
            </CardDescription>
          </CardHeader>
          <CardContent>
            {versionTree.length > 0 ? (
              <div className="space-y-2">
                {versionTree.map((node) => (
                  <VersionTreeNode
                    key={node.version.id}
                    node={node}
                    level={0}
                    selectedVersionId={selectedVersion?.id || null}
                    onSelect={setSelectedVersion}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="暂无版本"
                description="该预设还没有创建任何版本"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileAudio className="h-5 w-5" />
              参数列表
              {selectedVersion && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  (v{selectedVersion.versionNumber})
                </span>
              )}
            </CardTitle>
            <CardDescription>
              按路径分组展示所有参数及其值
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedVersion ? (
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                <ParameterGroup
                  title="Oscillators (振荡器)"
                  parameters={groupedParameters.Oscillators || []}
                />
                <ParameterGroup
                  title="Filters (滤波器)"
                  parameters={groupedParameters.Filters || []}
                />
                <ParameterGroup
                  title="Envelopes (包络)"
                  parameters={groupedParameters.Envelopes || []}
                />
                <ParameterGroup
                  title="LFOs (低频振荡器)"
                  parameters={groupedParameters.LFOs || []}
                />
                <ParameterGroup
                  title="Effects (效果器)"
                  parameters={groupedParameters.Effects || []}
                />
              </div>
            ) : (
              <EmptyState
                title="请选择版本"
                description="从左侧版本历史中选择一个版本查看参数"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileAudio className="h-5 w-5" />
            关联快照
          </CardTitle>
          <CardDescription>
            使用该预设的所有学生快照 ({relatedSnapshots.length} 个)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {relatedSnapshots.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedSnapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  onClick={() => navigate(`/snapshots/${snapshot.id}`)}
                  className="cursor-pointer rounded-lg border border-border p-4 hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <h4 className="font-medium text-foreground">{snapshot.name}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {snapshot.creatorName} ·{' '}
                    {new Date(snapshot.createdAt).toLocaleDateString()}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {snapshot.comparisonResult && (
                      <>
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                            {snapshot.comparisonResult.modifiedCount} 处修改
                          </span>
                          {snapshot.comparisonResult.outOfBoundsCount > 0 && (
                            <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded">
                            {snapshot.comparisonResult.outOfBoundsCount} 处越界
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="暂无快照"
              description="该预设还没有被学生使用创建快照"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            关联作业
          </CardTitle>
          <CardDescription>
            关联的作业 ({relatedAssignments.length} 个)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {relatedAssignments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  onClick={() => navigate(`/assignments/${assignment.id}`)}
                  className="cursor-pointer rounded-lg border border-border p-4 hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <h4 className="font-medium text-foreground">
                    {assignment.title}
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {assignment.studentName} → {assignment.teacherName}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge
                      variant={
                        assignment.status === 'approved'
                          ? 'success'
                          : assignment.status === 'reviewing'
                          ? 'warning'
                          : assignment.status === 'submitted'
                          ? 'info'
                          : 'default'
                      }
                    >
                      {assignment.status === 'approved'
                        ? '已通过'
                        : assignment.status === 'reviewing'
                        ? '审核中'
                        : assignment.status === 'submitted'
                        ? '已提交'
                        : assignment.status}
                    </Badge>
                    {assignment.grade !== undefined && (
                      <span className="text-sm font-semibold text-primary">
                        {assignment.grade} 分
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="暂无作业"
              description="该预设还没有关联任何作业"
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="新建版本"
        size="lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              取消
            </Button>
            <Button onClick={handleCreateVersion}>创建版本</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                版本号 *
              </label>
              <input
                type="text"
                value={newVersionForm.versionNumber}
                onChange={(e) =>
                  setNewVersionForm({
                    ...newVersionForm,
                    versionNumber: e.target.value,
                  })
                }
                placeholder="例如: 1.2.0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                父版本
              </label>
              <select
                value={newVersionForm.parentVersionId}
                onChange={(e) =>
                  setNewVersionForm({
                    ...newVersionForm,
                    parentVersionId: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="">无（作为根版本）</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.versionNumber} - {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              版本名称 *
            </label>
            <input
              type="text"
              value={newVersionForm.name}
              onChange={(e) =>
                setNewVersionForm({
                  ...newVersionForm,
                  name: e.target.value,
                })
              }
              placeholder="简短描述此版本的主要内容"
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              版本描述
            </label>
            <textarea
              value={newVersionForm.description}
              onChange={(e) =>
                setNewVersionForm({
                  ...newVersionForm,
                  description: e.target.value,
                })
              }
              placeholder="详细描述此版本的变更内容"
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                文件名
              </label>
              <input
                type="text"
                value={newVersionForm.fileName}
                onChange={(e) =>
                  setNewVersionForm({
                    ...newVersionForm,
                    fileName: e.target.value,
                  })
                }
                placeholder="例如: preset_v1.2.0.fxp"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                文件类型
              </label>
              <select
                value={newVersionForm.fileType}
                onChange={(e) =>
                  setNewVersionForm({
                    ...newVersionForm,
                    fileType: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="fxp">FXP</option>
                <option value="nmsv">NMSV</option>
                <option value="fxb">FXB</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isOverride"
              checked={newVersionForm.isOverride}
              onChange={(e) =>
                setNewVersionForm({
                  ...newVersionForm,
                  isOverride: e.target.checked,
                })
              }
              className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
            />
            <label
              htmlFor="isOverride"
              className="text-sm font-medium text-foreground"
            >
              此版本覆盖现有版本
            </label>
          </div>

          {newVersionForm.isOverride && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                覆盖原因
              </label>
              <textarea
                value={newVersionForm.overrideReason}
                onChange={(e) =>
                  setNewVersionForm({
                    ...newVersionForm,
                    overrideReason: e.target.value,
                  })
                }
                placeholder="请说明为什么需要覆盖现有版本"
                rows={2}
                className="w-full px-3 py-2 border border-destructive/50 rounded-lg focus:ring-2 focus:ring-destructive focus:border-destructive"
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
