import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  ShieldCheck,
  Search,
  FolderLock
} from 'lucide-react';

export const MobileNav = () => {
  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Gallery', path: '/gallery', icon: Sparkles },
    { label: 'Register', path: '/register', icon: ShieldCheck, highlight: true },
    { label: 'Verify', path: '/verify', icon: Search },
    { label: 'My Assets', path: '/assets', icon: FolderLock }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c1220]/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl shadow-black">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all ${
                isActive
                  ? 'text-cyan-400'
                  : item.highlight
                  ? 'text-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    item.highlight
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : isActive
                      ? 'bg-slate-800 text-cyan-400'
                      : ''
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};

export default MobileNav;
