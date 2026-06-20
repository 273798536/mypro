import { Outlet, NavLink } from 'react-router-dom';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <h1 className="app-title">向量索引异常回放</h1>
          <nav className="app-nav">
            <NavLink to="/" end className="nav-link">任务列表</NavLink>
          </nav>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
