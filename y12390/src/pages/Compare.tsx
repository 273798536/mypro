import { useState, useMemo } from 'react';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import { mockPresetVersions } from '@/data/mockPresets';
import { getAnomaliesByEntityId } from '@/data/mockAnomalies';
import { calculateDifference, calculatePercentage, isSignificantChange, isOutOfBounds } from '@/utils/parameterUtils';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import { cn } from '@/lib/utils';
import type { PresetVersion, PresetParameter } from '@/types';

interface VersionSelectProps {
  label: string;
  value: string;
  versions: PresetVersion[];
  onChange: (value: string) => void;
}

function VersionSelect({ label, value, versions, onChange }: VersionSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedVersion = versions.find(v => v.id === value);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 border border-border rounded-lg bg-card hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <div className="text-left">
          {selectedVersion ? (
            <>
              <p className="font-medium text-foreground">{selectedVersion.name}</p>
              <p className="text-xs text-muted-foreground">v{selectedVersion.versionNumber}</p>
            </>
          ) : (
            <p className="text-muted-foreground">选择版本...</p>
          )}
        </div>
        <ChevronDown className={cn('h-5 w-5 text-muted-foreground/70 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {versions.map((version) => (
            <button
              key={version.id}
              type="button"
              onClick={() => {
                onChange(version.id);
                setIsOpen(false);
              }}
              className={cn(
                'w-full text-left px-4 py-3 hover:bg-accent border-b border-border last:border-b-0',
                value === version.id && 'bg-primary/10'
              )}
            >
              <p className="font-medium text-foreground">{version.name}</p>
              <p className="text-xs text-muted-foreground">v{version.versionNumber} · {new Date(version.createdAt).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface CellContentProps {
  param: PresetParameter | undefined;
  baselineValue: number;
  isFirst: boolean;
}

function CellContent({ param, baselineValue, isFirst }: CellContentProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!param) {
    return <span className="text-muted-foreground/70">-</span>;
  }

  const diff = isFirst ? 0 : calculateDifference(baselineValue, param.value);
  const percentage = isFirst ? 0 : calculatePercentage(baselineValue, param.value);
  const hasDiff = diff !== 0;
  const significant = isSignificantChange(percentage);
  const outOfBounds = isOutOfBounds(param.value, param.minValue, param.maxValue);

  const cellBg = outOfBounds
    ? 'bg-destructive/10'
    : hasDiff
    ? percentage > 0
      ? 'bg-destructive/5'
      : 'bg-success/5'
    : 'bg-card';

  return (
    <div
      className={cn('relative p-3 rounded-lg', cellBg)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-center justify-between">
        <span className={cn(
          'font-mono text-lg',
          significant && !isFirst && 'font-bold',
          outOfBounds ? 'text-destructive' : hasDiff ? (diff > 0 ? 'text-destructive' : 'text-success') : 'text-foreground'
        )}>
          {param.value.toFixed(2)}
        </span>
        {outOfBounds && (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        )}
      </div>
      <span className="text-xs text-muted-foreground">{param.unit}</span>

      {showTooltip && !isFirst && hasDiff && (
        <div className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-foreground text-card text-xs rounded-lg whitespace-nowrap">
          <div>差值: {diff > 0 ? '+' : ''}{diff.toFixed(4)}</div>
          <div>变化: {percentage > 0 ? '+' : ''}{percentage.toFixed(2)}%</div>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45" />
        </div>
      )}
    </div>
  );
}

export default function Compare() {
  const [version1, setVersion1] = useState('pv-serum-bass-100');
  const [version2, setVersion2] = useState('pv-serum-bass-110');
  const [version3, setVersion3] = useState('pv-serum-bass-200');
  const [versionCount, setVersionCount] = useState(3);

  const versions = useMemo(() => {
    const v1 = mockPresetVersions.find(v => v.id === version1);
    const v2 = mockPresetVersions.find(v => v.id === version2);
    const v3 = versionCount >= 3 ? mockPresetVersions.find(v => v.id === version3) : undefined;
    return [v1, v2, v3].filter(Boolean) as PresetVersion[];
  }, [version1, version2, version3, versionCount]);

  const allParamIds = useMemo(() => {
    const ids = new Set<string>();
    versions.forEach(v => {
      v.parameters.forEach(p => ids.add(p.id));
    });
    return Array.from(ids);
  }, [versions]);

  const anomalies = useMemo(() => {
    const result: ReturnType<typeof getAnomaliesByEntityId> = [];
    versions.forEach(v => {
      result.push(...getAnomaliesByEntityId(v.id));
    });
    return result;
  }, [versions]);

  const getParamForVersion = (paramId: string, version: PresetVersion) =>
    version.parameters.find(p => p.id === paramId);

  const getParamMinMax = (paramId: string) => {
    for (const v of versions) {
      const p = v.parameters.find(p => p.id === paramId);
      if (p) return { min: p.minValue, max: p.maxValue };
    }
    return { min: 0, max: 100 };
  };

  const hasAnyChanges = (paramId: string) => {
    const values = versions.map(v => {
      const p = getParamForVersion(paramId, v);
      return p?.value;
    }).filter(v => v !== undefined) as number[];
    if (values.length < 2) return false;
    return !values.every(v => v === values[0]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>版本对比</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={versionCount === 2 ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setVersionCount(2)}
              >
                2个版本
              </Button>
              <Button
                variant={versionCount === 3 ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setVersionCount(3)}
              >
                3个版本
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={cn('grid gap-4', versionCount === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
            <VersionSelect
              label="版本 1 (基线)"
              value={version1}
              versions={mockPresetVersions}
              onChange={setVersion1}
            />
            <VersionSelect
              label="版本 2"
              value={version2}
              versions={mockPresetVersions}
              onChange={setVersion2}
            />
            {versionCount >= 3 && (
              <VersionSelect
                label="版本 3"
                value={version3}
                versions={mockPresetVersions}
                onChange={setVersion3}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">参数对比表格</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 bg-muted font-medium text-foreground sticky left-0 z-10 min-w-[200px]">
                    参数名称
                  </th>
                  {versions.map((v, idx) => (
                    <th
                      key={v.id}
                      className="text-center px-4 py-4 bg-muted font-medium text-foreground min-w-[140px]"
                    >
                      <div>{v.name}</div>
                      <div className="text-xs text-muted-foreground font-normal">v{v.versionNumber}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allParamIds.map((paramId) => {
                  const params = versions.map(v => getParamForVersion(paramId, v));
                  const firstParam = params[0];
                  const baselineValue = firstParam?.value ?? 0;
                  const { min, max } = getParamMinMax(paramId);
                  const hasChanges = hasAnyChanges(paramId);
                  const paramName = firstParam?.name || params.find(p => p)?.name || paramId;
                  const paramPath = firstParam?.path || params.find(p => p)?.path || '';

                  return (
                    <tr
                      key={paramId}
                      className={cn(
                        'border-b border-border hover:bg-muted/50',
                        hasChanges && 'bg-muted/20'
                      )}
                    >
                      <td className="px-6 py-3 sticky left-0 bg-card z-10">
                        <div className="flex items-center gap-2">
                          <span className={cn('font-medium', hasChanges && 'font-semibold')}>
                            {paramName}
                          </span>
                          {hasChanges && (
                            <Badge variant="warning">已变化</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{paramPath}</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">范围: [{min}, {max}]</p>
                      </td>
                      {params.map((param, idx) => (
                        <td key={idx} className="px-4 py-3 text-center">
                          <CellContent
                            param={param}
                            baselineValue={baselineValue}
                            isFirst={idx === 0}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">异常汇总</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {anomalies.length > 0 ? (
            anomalies.map((anomaly) => (
              <Alert key={anomaly.id} anomaly={anomaly} />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/70" />
              <p>所选版本未检测到异常</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
