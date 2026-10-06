import React from 'react';
import Navbar from './Navbar';

const PageContainer = ({ children, searchQuery, setSearchQuery, showNavbar = true, className = '' }) => {
  return (
    <div className="min-h-screen bg-white text-[#111111] flex flex-col font-sans">
      {showNavbar && <Navbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />}
      <main className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
        {children}
      </main>
      <footer className="bg-white border-t border-[#E5E5E5] py-6 text-center text-xs text-[#666666]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} AI Provenance</span>
          <div className="flex gap-4">
            <span className="hover:text-[#111111] cursor-pointer">Privacy</span>
            <span className="hover:text-[#111111] cursor-pointer">Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PageContainer;
