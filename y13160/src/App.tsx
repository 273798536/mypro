import { Outlet } from 'react-router-dom';

export default function App() {
  return (
    <div className="min-h-screen w-full font-sans text-slate-200 antialiased">
      <Outlet />
    </div>
  );
}
