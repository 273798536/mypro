import { FileText, Pin, ShieldAlert, Stethoscope } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export default function DetailsTable() {
  const selectedImplantId = useAppStore((s) => s.selectedImplantId)
  const selectedAnnotationId = useAppStore((s) => s.selectedAnnotationId)
  const implants = useAppStore((s) => s.implants)
  const annotations = useAppStore((s) => s.annotations)
  const notes = useAppStore((s) => s.notes)
  const issues = useAppStore((s) => s.issues)

  const selectedImplant = implants.find((i) => i.id === selectedImplantId)
  const selectedAnnotation = annotations.find((a) => a.id === selectedAnnotationId)
  const relatedNotes = notes.filter(
    (n) =>
      (selectedImplantId && n.relatedImplantId === selectedImplantId) ||
      (selectedAnnotationId && n.relatedAnnotationId === selectedAnnotationId)
  )
  const relatedIssue = issues.find((i) => i.implantId === selectedImplantId)

  if (!selectedImplant && !selectedAnnotation) {
    return (
      <div className="text-center py-8 text-med-text-dim">
        <Pin className="w-5 h-5 mx-auto mb-2 opacity-40" />
        <p className="text-xs">点击3D模型或问题卡片查看详情</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 text-xs">
      {selectedImplant && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-med-blue">
            <Stethoscope className="w-3.5 h-3.5" />
            <span className="font-semibold">植入物</span>
          </div>
          <div className="panel-section p-2.5 space-y-0">
            <div className="detail-row">
              <span className="detail-label">型号</span>
              <span className="detail-value font-mono">{selectedImplant.modelNumber}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">名称</span>
              <span className="detail-value">{selectedImplant.name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">尺寸</span>
              <span className="detail-value font-mono">
                {selectedImplant.size} · {selectedImplant.length_mm}×{selectedImplant.width_mm}×{selectedImplant.thickness_mm}mm
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">侧别</span>
              <span className={`detail-value font-mono ${relatedIssue?.type === 'side_mismatch' ? 'text-med-purple font-semibold' : ''}`}>
                {selectedImplant.laterality === 'left' ? '左侧' : selectedImplant.laterality === 'right' ? '右侧' : '通用'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">材质</span>
              <span className="detail-value font-mono">{selectedImplant.material}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">厂商</span>
              <span className="detail-value">{selectedImplant.manufacturer}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">来源</span>
              <span className="detail-value text-med-text-dim font-mono text-[10px]">{selectedImplant.source}</span>
            </div>
          </div>
        </div>
      )}

      {selectedAnnotation && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-med-green">
            <Pin className="w-3.5 h-3.5" />
            <span className="font-semibold">CT标注</span>
          </div>
          <div className="panel-section p-2.5 space-y-0">
            <div className="detail-row">
              <span className="detail-label">标签</span>
              <span className="detail-value">{selectedAnnotation.label}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">类型</span>
              <span className="detail-value font-mono">
                {{ landmark: '解剖标志', tumor: '骨折/病变', nerve: '神经', vessel: '血管', forbidden_zone: '禁区' }[selectedAnnotation.type]}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">描述</span>
              <span className="detail-value leading-relaxed">{selectedAnnotation.description}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">半径</span>
              <span className="detail-value font-mono">{selectedAnnotation.radius_mm}mm</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">来源</span>
              <span className="detail-value text-med-text-dim font-mono text-[10px]">{selectedAnnotation.source}</span>
            </div>
          </div>
        </div>
      )}

      {relatedNotes.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-med-orange">
            <FileText className="w-3.5 h-3.5" />
            <span className="font-semibold">医生备注</span>
          </div>
          <div className="space-y-2">
            {relatedNotes.map((note) => (
              <div key={note.id} className="panel-section p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-med-text">{note.author}</span>
                  <span className="text-[10px] text-med-text-dim font-mono">{note.timestamp}</span>
                </div>
                <p className="text-med-text-dim leading-relaxed">{note.content}</p>
                <div className="mt-1.5 text-[10px] text-med-text-dim/60 font-mono">来源: {note.source}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {relatedIssue && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-med-red">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="font-semibold">碰撞检测结果</span>
          </div>
          <div className="panel-section p-2.5">
            <p className="text-med-text leading-relaxed mb-2">{relatedIssue.description}</p>
            <div className="bg-med-dark/60 rounded p-2">
              <span className="text-med-text font-medium">解释：</span>
              <span className="text-med-text-dim leading-relaxed">{relatedIssue.explanation}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
