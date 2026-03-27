import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { useActivityTracker } from "@/hooks/useActivityTracker";

export function AppLayout({ children }: { children: ReactNode }) {
  useActivityTracker();
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <div className="print:hidden"><AppSidebar /></div>
      <div className="flex flex-1 flex-col min-w-0">
        <div className="print:hidden"><AppHeader /></div>
        <main className="flex-1 overflow-auto p-6 print:p-0 print:overflow-visible">{children}</main>
      </div>
    </div>
  );
}
