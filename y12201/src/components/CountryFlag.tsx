const COUNTRY_FLAGS: Record<string, string> = {
  DE: '🇩🇪',
  FR: '🇫🇷',
  IT: '🇮🇹',
  ES: '🇪🇸',
  NL: '🇳🇱',
  BE: '🇧🇪',
  AT: '🇦🇹',
  PL: '🇵🇱',
  SE: '🇸🇪',
  PT: '🇵🇹',
  IE: '🇮🇪',
  DK: '🇩🇰',
  FI: '🇫🇮',
  CZ: '🇨🇿',
  HU: '🇭🇺',
}

interface CountryFlagProps {
  code: string
  showCode?: boolean
}

export default function CountryFlag({ code, showCode = true }: CountryFlagProps) {
  const flag = COUNTRY_FLAGS[code] || '🏳️'
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-base">{flag}</span>
      {showCode && <span className="text-sm font-medium text-navy-500">{code}</span>}
    </span>
  )
}
