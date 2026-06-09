import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import FormulaInfoBar from './FormulaInfoBar';

export default function Layout() {
  return (
    <div className="h-full flex flex-col bg-industrial-900">
      <TopNav />
      <FormulaInfoBar />
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
