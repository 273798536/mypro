export default function JumpAnalysis({ analysis }) {
  if (!analysis?.has_jump) return null

  const reasonMap = {
    threshold: { text: '阈值调整', color: '#722ed1' },
    unit: { text: '单位变更', color: '#13c2c2' },
    late_attachment: { text: '晚到附件', color: '#eb2f96' },
    unknown: { text: '待查', color: '#999' }
  }

  const reason = reasonMap[analysis.reason] || reasonMap.unknown

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        background: '#fff1f0',
        color: '#ff4d4f',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500'
      }}
      title={analysis.description}
    >
      ⚡ 跳变（{reason.text}）
    </span>
  )
}
