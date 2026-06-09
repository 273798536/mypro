import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function PageContainer({ children }: Props) {
  return (
    <main className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-[1400px] mx-auto px-6 py-6">{children}</div>
    </main>
  );
}
