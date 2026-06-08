export default function ColorLegend() {
  const levels = [
    { label: '< 5%', color: '#1B998B', desc: '轻微影响' },
    { label: '5-10%', color: '#1B998BCC', desc: '可接受' },
    { label: '10-15%', color: '#7BC950', desc: '需关注' },
    { label: '15-20%', color: '#E2B03A', desc: '警告' },
    { label: '> 20%', color: '#F46036', desc: '越界告警' },
  ];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 panel-card px-5 py-3 flex items-center gap-5 z-10">
      <span className="font-engineering text-sm text-sea-mist/80 whitespace-nowrap">尾流损失率</span>
      <div className="flex items-center gap-3">
        {levels.map((lv) => (
          <div key={lv.label} className="flex items-center gap-1.5">
            <span
              className="w-8 h-3 rounded-sm"
              style={{ background: lv.color, boxShadow: `0 0 8px ${lv.color}55` }}
            />
            <div className="flex flex-col">
              <span className="font-engineering text-[11px] text-sea-mist leading-none">
                {lv.label}
              </span>
              <span className="text-[9px] text-sea-mist/50 leading-none mt-0.5">
                {lv.desc}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
