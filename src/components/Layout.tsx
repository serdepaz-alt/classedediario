import { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-64 p-6">
        {children}
      </main>
    </div>
  );
};