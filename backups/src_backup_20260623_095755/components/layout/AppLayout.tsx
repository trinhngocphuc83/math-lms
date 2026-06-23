"use client";

import React from "react";
import Sidebar from "@/components/sidebar";
import { usePathname } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Hide sidebar on specific routes like login, register, or student view
  const hideSidebarRoutes = ['/login', '/register', '/student'];
  const shouldHideSidebar = hideSidebarRoutes.some(route => pathname?.startsWith(route));

  if (shouldHideSidebar) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">
        <div className="min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
