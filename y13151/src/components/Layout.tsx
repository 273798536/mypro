import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

const Layout = () => {
  const location = useLocation()

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <TopBar pathname={location.pathname} />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
