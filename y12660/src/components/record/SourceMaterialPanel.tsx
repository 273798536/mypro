import type { SoundRecord } from '@/types';
import { SectionTitle } from '@/components/common/Badges';
import { formatDateTime, formatCoordinate } from '@/utils/formatters';
import { useParamLinkage } from '@/hooks/useParamLinkage';
import { Camera, AlertTriangle, MapPin } from 'lucide-react';

interface Props {
  record: SoundRecord;
  batchName?: string;
  batchDate?: string;
}

function Field({
  label,
  field,
  value,
  valueNode,
  mono,
}: {
  label: string;
  field: string;
  value?: string;
  valueNode?: React.ReactNode;
  mono?: boolean;
}) {
  const { highlightedField } = useParamLinkage();
  const active = highlightedField === field;
  return (
    <div
      className={`grid grid-cols-[90px_1fr] gap-3 py-2 px-2 rounded transition-colors ${
        active ? 'animate-flash-yellow' : ''
      }`}
    >
      <div className="text-[11px] text-hall-textMute pt-0.5">{label}</div>
      <div className={mono ? 'font-mono text-xs text-hall-text' : 'text-xs text-hall-text'}>
        {valueNode ?? value ?? '—'}
      </div>
    </div>
  );
}

export function SourceMaterialPanel({ record, batchName, batchDate }: Props) {
  const cameraLost = !record.cameraView || record.cameraView.isValid === false;

  return (
    <section className="card p-4">
      <SectionTitle>
        <span className="flex items-center gap-1.5">
          <MapPin size={13} /> 来源材料
        </span>
      </SectionTitle>
      <div className="divide-y divide-hall-border/60 -mx-2">
        <Field label="记录 ID" field="id" value={record.id} mono />
        <Field label="来源批次" field="batchId" value={batchName} />
        {batchDate && <Field label="导入时间" field="importedAt" value={formatDateTime(batchDate)} />}
        <Field label="设备编号" field="deviceCode" value={record.deviceCode} mono />
        <Field
          label="设备坐标"
          field="deviceCoordinates"
          valueNode={
            <div className="font-mono text-xs space-x-3">
              <span>
                <span className="text-hall-textMute">X:</span>{' '}
                <span className={record.deviceCoordinates.x === null ? 'text-status-unusable' : ''}>
                  {formatCoordinate(record.deviceCoordinates.x)}
                </span>
              </span>
              <span>
                <span className="text-hall-textMute">Y:</span>{' '}
                <span className={record.deviceCoordinates.y === null ? 'text-status-unusable' : ''}>
                  {formatCoordinate(record.deviceCoordinates.y)}
                </span>
              </span>
              <span>
                <span className="text-hall-textMute">Z:</span>{' '}
                <span className={record.deviceCoordinates.z === null ? 'text-status-unusable' : ''}>
                  {formatCoordinate(record.deviceCoordinates.z)}
                </span>
              </span>
            </div>
          }
        />
        <Field
          label="原始备注"
          field="rawRemark"
          valueNode={
            <div className="bg-hall-bg border border-hall-border rounded p-2 font-mono text-[11px] whitespace-pre-wrap break-all">
              {record.rawRemark || '—'}
            </div>
          }
        />
        <Field
          label="相机视角"
          field="cameraView"
          valueNode={
            <div className="flex items-center gap-2">
              <Camera size={13} className={cameraLost ? 'text-status-unusable' : 'text-hall-textDim'} />
              {cameraLost ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-status-unusable">
                  <AlertTriangle size={11} /> 视角丢失
                </span>
              ) : (
                <div className="font-mono text-[11px] text-hall-textDim">
                  pos({record.cameraView!.position.map((v) => v.toFixed(1)).join(', ')}) · target(
                  {record.cameraView!.target.map((v) => v.toFixed(1)).join(', ')}) · fov {record.cameraView!.fov}°
                </div>
              )}
            </div>
          }
        />
      </div>
    </section>
  );
}
