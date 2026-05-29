export default function ColorLegend() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        background: 'rgba(10, 10, 30, 0.85)',
        borderRadius: 8,
        padding: '10px 14px',
        color: '#eee',
        fontFamily: 'sans-serif',
        fontSize: 12,
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 10,
      }}
    >
      <div style={{ marginBottom: 6, fontWeight: 600 }}>风速 (m/s)</div>
      <div
        style={{
          width: 160,
          height: 14,
          borderRadius: 3,
          background: 'linear-gradient(to right, #3B9EFF, #00D4FF, #FFD600, #FF3B3B)',
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 3,
          fontSize: 10,
          color: '#bbb',
        }}
      >
        <span>0</span>
        <span>3</span>
        <span>7</span>
        <span>10+</span>
      </div>
    </div>
  )
}
