import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';

export const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-cyan-500/20 selection:text-cyan-300">
      <div className="fixed inset-0 forensic-grid pointer-events-none opacity-30 z-0" />
      <div className="fixed inset-0 forensic-radial pointer-events-none z-0" />
      <PublicNavbar />
      <main className="flex-1 pt-20 z-10">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
};

export default PublicLayout;
