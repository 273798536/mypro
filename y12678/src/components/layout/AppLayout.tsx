import type { ReactNode } from "react";
import SidebarNav from "./SidebarNav";

interface Props {
  children: ReactNode;
}

export default function AppLayout({ children }: Props) {
  return (
    <div className="min-h-screen">
      <SidebarNav />
      <main className="pl-56 transition-all duration-300">
        <div className="min-h-screen">{children}</div>
      </main>
    </div>
  );
}
