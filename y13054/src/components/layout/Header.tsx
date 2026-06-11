import { NavLink, useLocation } from 'react-router-dom';
import { Wind, MapPin, BarChart3 } from 'lucide-react';

export default function Header() {
  const location = useLocation();

  const links = [
    { to: '/', label: '点位总览', icon: MapPin },
    { to: '/analysis', label: '方案分析', icon: BarChart3 },
  ];

  return (
    <header className="bg-deep-sea text-white shadow-lg">
      <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wind className="w-6 h-6 text-sea-mist" strokeWidth={1.8} />
          <h1 className="font-serif-cn text-lg font-semibold tracking-wide text-sea-mist">
            滨海步道风场方案比选
          </h1>
          <span className="text-xs text-sea-mist/60 ml-2 font-mono-data">v0.1</span>
        </div>
        <nav className="flex items-center gap-1 h-full">
          {links.map(({ to, label, icon: Icon }) => {
            const active =
              to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                className={`h-full px-4 flex items-center gap-2 text-sm font-medium transition-colors ${
                  active
                    ? 'text-white border-b-2 border-alert-orange bg-deep-sea-dark/60'
                    : 'text-sea-mist/70 hover:text-white hover:bg-deep-sea-dark/30'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
