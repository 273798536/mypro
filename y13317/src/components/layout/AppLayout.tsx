import Sidebar from './Sidebar';
import TopNav from './TopNav';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Sidebar />
      <TopNav />
      <main className="ml-[248px] mt-[64px] min-h-screen bg-[#FAFAF9]">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
};

export default AppLayout;
