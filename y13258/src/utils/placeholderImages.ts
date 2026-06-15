export const placeholderImages = {
  busStop: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225">
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#e0f2fe"/>
          <stop offset="100%" style="stop-color:#bae6fd"/>
        </linearGradient>
        <linearGradient id="g2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#fef3c7"/>
          <stop offset="100%" style="stop-color:#fde68a"/>
        </linearGradient>
      </defs>
      <rect width="400" height="225" fill="url(#g1)"/>
      <rect x="0" y="160" width="400" height="65" fill="#64748b"/>
      <rect x="0" y="155" width="400" height="8" fill="#475569"/>
      <circle cx="60" cy="180" r="4" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>
      <circle cx="100" cy="180" r="4" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>
      <circle cx="140" cy="180" r="4" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>
      <circle cx="180" cy="180" r="4" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>
      <circle cx="220" cy="180" r="4" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>
      <circle cx="260" cy="180" r="4" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>
      <circle cx="300" cy="180" r="4" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>
      <circle cx="340" cy="180" r="4" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>
      <rect x="50" y="100" width="120" height="55" rx="4" fill="#f0fdfa" stroke="#0D7377" stroke-width="2"/>
      <rect x="55" y="105" width="110" height="20" fill="#0D7377"/>
      <text x="110" y="120" text-anchor="middle" fill="white" font-size="10" font-family="sans-serif" font-weight="bold">公交站点</text>
      <rect x="58" y="130" width="104" height="20" fill="white"/>
      <text x="110" y="144" text-anchor="middle" fill="#374151" font-size="8" font-family="sans-serif">阳光小学 东线</text>
      <rect x="220" y="120" width="60" height="35" rx="4" fill="url(#g2)" stroke="#d97706" stroke-width="1"/>
      <text x="250" y="142" text-anchor="middle" fill="#92400e" font-size="12" font-family="sans-serif" font-weight="bold">BUS</text>
      <rect x="300" y="135" width="20" height="20" fill="#059669"/>
      <rect x="305" y="140" width="10" height="5" fill="#10b981"/>
      <rect x="307" y="147" width="6" height="6" fill="#10b981"/>
      <circle cx="340" cy="80" r="25" fill="#fef3c7" stroke="#fbbf24" stroke-width="2"/>
      <circle cx="340" cy="80" r="12" fill="#fbbf24"/>
      <rect x="328" y="100" width="24" height="40" fill="#9ca3af"/>
      <rect x="324" y="138" width="32" height="5" fill="#6b7280"/>
    </svg>
  `),
  intersection: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225">
      <defs>
        <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#e0f2fe"/>
          <stop offset="100%" style="stop-color:#7dd3fc"/>
        </linearGradient>
      </defs>
      <rect width="400" height="225" fill="url(#sky)"/>
      <rect x="0" y="80" width="170" height="30" fill="#64748b"/>
      <rect x="230" y="80" width="170" height="30" fill="#64748b"/>
      <rect x="170" y="0" width="30" height="80" fill="#64748b"/>
      <rect x="170" y="145" width="30" height="80" fill="#64748b"/>
      <rect x="170" y="80" width="30" height="65" fill="#475569"/>
      <line x1="0" y1="95" x2="170" y2="95" stroke="#fbbf24" stroke-width="2" stroke-dasharray="8,8"/>
      <line x1="230" y1="95" x2="400" y2="95" stroke="#fbbf24" stroke-width="2" stroke-dasharray="8,8"/>
      <line x1="185" y1="0" x2="185" y2="80" stroke="#fbbf24" stroke-width="2" stroke-dasharray="8,8"/>
      <line x1="185" y1="145" x2="185" y2="225" stroke="#fbbf24" stroke-width="2" stroke-dasharray="8,8"/>
      <rect x="182" y="76" width="6" height="8" fill="#ef4444"/>
      <rect x="182" y="88" width="6" height="8" fill="#eab308"/>
      <rect x="182" y="100" width="6" height="8" fill="#22c55e"/>
      <circle cx="185" cy="80" r="4" fill="#ef4444" opacity="0.8"/>
      <rect x="60" y="20" width="50" height="50" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
      <rect x="65" y="25" width="40" height="15" fill="#0D7377"/>
      <rect x="65" y="42" width="18" height="23" fill="#94a3b8"/>
      <rect x="87" y="42" width="18" height="23" fill="#94a3b8"/>
      <rect x="290" y="30" width="60" height="40" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
      <rect x="295" y="35" width="50" height="12" fill="#0D7377"/>
      <rect x="295" y="50" width="22" height="15" fill="#94a3b8"/>
      <rect x="321" y="50" width="22" height="15" fill="#94a3b8"/>
      <rect x="200" y="10" width="40" height="60" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
      <text x="220" y="42" text-anchor="middle" fill="#92400e" font-size="10" font-family="sans-serif" font-weight="bold">注意</text>
      <text x="220" y="55" text-anchor="middle" fill="#92400e" font-size="7" font-family="sans-serif">红绿灯</text>
      <text x="220" y="65" text-anchor="middle" fill="#92400e" font-size="7" font-family="sans-serif">时长不足</text>
    </svg>
  `),
  construction: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225">
      <defs>
        <linearGradient id="sky2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#fef3c7"/>
          <stop offset="100%" style="stop-color:#fcd34d"/>
        </linearGradient>
      </defs>
      <rect width="400" height="225" fill="url(#sky2)"/>
      <rect x="0" y="150" width="400" height="75" fill="#64748b"/>
      <rect x="0" y="145" width="400" height="8" fill="#475569"/>
      <rect x="80" y="145" width="240" height="80" fill="#d4d4d4" opacity="0.7"/>
      <rect x="80" y="145" width="240" height="5" fill="#f59e0b"/>
      <rect x="80" y="220" width="240" height="5" fill="#f59e0b"/>
      <rect x="75" y="145" width="10" height="80" fill="#f59e0b" stroke="#92400e" stroke-width="1"/>
      <rect x="315" y="145" width="10" height="80" fill="#f59e0b" stroke="#92400e" stroke-width="1"/>
      <line x1="85" y1="160" x2="315" y2="160" stroke="#000" stroke-width="1" stroke-dasharray="3,3"/>
      <line x1="85" y1="180" x2="315" y2="180" stroke="#000" stroke-width="1" stroke-dasharray="3,3"/>
      <line x1="85" y1="200" x2="315" y2="200" stroke="#000" stroke-width="1" stroke-dasharray="3,3"/>
      <rect x="120" y="90" width="25" height="55" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>
      <rect x="118" y="85" width="29" height="8" fill="#92400e"/>
      <rect x="145" y="90" width="25" height="55" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>
      <rect x="143" y="85" width="29" height="8" fill="#92400e"/>
      <rect x="230" y="90" width="25" height="55" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>
      <rect x="228" y="85" width="29" height="8" fill="#92400e"/>
      <rect x="180" y="60" width="40" height="85" fill="#dc2626" stroke="#991b1b" stroke-width="2"/>
      <text x="200" y="80" text-anchor="middle" fill="white" font-size="10" font-family="sans-serif" font-weight="bold">施工</text>
      <text x="200" y="95" text-anchor="middle" fill="white" font-size="8" font-family="sans-serif">前方</text>
      <text x="200" y="110" text-anchor="middle" fill="white" font-size="8" font-family="sans-serif">危险</text>
      <text x="200" y="135" text-anchor="middle" fill="white" font-size="7" font-family="sans-serif">请绕行</text>
      <rect x="20" y="130" width="30" height="30" rx="4" fill="#16a34a"/>
      <circle cx="35" cy="140" r="6" fill="white"/>
      <rect x="33" y="148" width="4" height="8" fill="white"/>
      <rect x="28" y="158" width="14" height="2" fill="white"/>
      <circle cx="360" cy="60" r="20" fill="#9ca3af" stroke="#6b7280" stroke-width="2"/>
      <rect x="352" y="55" width="16" height="4" fill="#4b5563"/>
      <rect x="356" y="62" width="8" height="16" fill="#4b5563"/>
      <rect x="350" y="78" width="20" height="4" fill="#6b7280"/>
    </svg>
  `),
  generic: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 225">
      <defs>
        <linearGradient id="g3" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#f0fdfa"/>
          <stop offset="100%" style="stop-color:#99f6e4"/>
        </linearGradient>
      </defs>
      <rect width="400" height="225" fill="url(#g3)"/>
      <rect x="0" y="160" width="400" height="65" fill="#64748b"/>
      <rect x="0" y="155" width="400" height="8" fill="#475569"/>
      <circle cx="50" cy="180" r="4" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>
      <circle cx="100" cy="180" r="4" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>
      <circle cx="150" cy="180" r="4" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>
      <circle cx="200" cy="180" r="4" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>
      <circle cx="250" cy="180" r="4" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>
      <circle cx="300" cy="180" r="4" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>
      <circle cx="350" cy="180" r="4" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>
      <rect x="60" y="70" width="80" height="75" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
      <rect x="65" y="75" width="70" height="20" fill="#0D7377"/>
      <text x="100" y="90" text-anchor="middle" fill="white" font-size="10" font-family="sans-serif" font-weight="bold">学校</text>
      <rect x="68" y="100" width="30" height="40" fill="#94a3b8"/>
      <rect x="102" y="100" width="30" height="40" fill="#94a3b8"/>
      <rect x="180" y="90" width="80" height="55" fill="#fef9c3" stroke="#ca8a04" stroke-width="2"/>
      <text x="220" y="115" text-anchor="middle" fill="#713f12" font-size="14" font-family="sans-serif" font-weight="bold">接送点</text>
      <text x="220" y="135" text-anchor="middle" fill="#713f12" font-size="8" font-family="sans-serif">SCH. PICKUP</text>
      <rect x="300" y="100" width="50" height="45" rx="4" fill="#fafafa" stroke="#d1d5db" stroke-width="2"/>
      <circle cx="325" cy="118" r="10" fill="#0D7377"/>
      <rect x="315" y="130" width="20" height="10" fill="#0D7377"/>
      <rect x="40" y="40" width="30" height="30" fill="#059669"/>
      <rect x="45" y="45" width="20" height="15" fill="#10b981"/>
      <rect x="47" y="62" width="16" height="4" fill="#10b981"/>
      <circle cx="350" cy="50" r="20" fill="#fef3c7" stroke="#fbbf24" stroke-width="2"/>
      <circle cx="350" cy="50" r="10" fill="#fbbf24"/>
    </svg>
  `)
};

export const getPlaceholderImage = (type: 'busStop' | 'intersection' | 'construction' | 'generic' = 'generic') => {
  return placeholderImages[type];
};
