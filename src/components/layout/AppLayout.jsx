import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNav from './MobileNav';

export const AppLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Background forensic aesthetic grid */}
      <div className="fixed inset-0 forensic-grid pointer-events-none opacity-40 z-0" />
      <div className="fixed inset-0 forensic-radial pointer-events-none z-0" />

      {/* Authenticated Desktop Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 min-w-0 z-10 ${
          isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        <Header onMobileMenuToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-12">
          <Outlet />
        </main>
      </div>

      {/* Mobile Navigation Dock */}
      <MobileNav />
    </div>
  );
};

export default AppLayout;
